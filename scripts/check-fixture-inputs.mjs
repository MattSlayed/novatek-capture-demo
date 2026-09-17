/* ================================================================
   FIXTURE INPUTS CHECK

   AD-8's no-model claim, in three independent assertions, because no
   one of them alone is enough: a signature can be right while the
   module reaches a capture payload through an import, and an import
   graph can be clean while the signature quietly grew a third
   parameter.

   1. The declared inputs. lib/verify/authored.ts's authoredMatch and
      lib/proposals/derive.ts's authoredProposals must each declare
      exactly `(assetId: string, fixtureSet: string)` — no third
      parameter, no renamed parameter. A missing target file is
      nothing to check (it does not exist yet), the same convention
      check-register-isolation.mjs applies to a missing source root.

   2. The import graph. Reused verbatim from
      check-register-isolation.mjs: `toPosix`/`toRel`,
      `walkSourceFiles`, `loadAliasPrefix` (the tsconfig "@/*"
      mapping), `extractSpecifiers` and `resolveImport`. Only the
      roots and the forbidden set differ: SOURCE_ROOTS is
      lib/verify and lib/proposals; the forbidden set is the
      directories a capture payload could reach one of these modules
      from (lib/reconcile, lib/store, lib/http, lib/access, app/api),
      matched by prefix since each names a whole directory, plus the
      one forbidden file lib/data/register.ts, matched exactly. Same
      BFS, shortest-chain-first walk; same "a missing directory is
      nothing to check" rule.

      WHAT THIS CANNOT CATCH, stated as honestly as
      check-register-isolation.mjs states it of itself: the specifier
      extraction is a regex, not a full parser, so a dynamic import()
      built from a runtime string, and an import reached through a
      re-exported binding under a different name, are both outside
      what this walk can see.

   3. The payload identifiers. A text sweep of both target modules
      for the capture-payload field names themselves, comment lines
      stripped first (matching `^\s*(//|\*|/\*)`) so the rule's own
      documentation cannot trip it — a naive substring count over a
      file that documents itself in prose is self-invalidating, which
      is why the filter is there.

      "sha256" and "capture_id" are deliberately absent from the
      swept set below. Both target modules' own `Omit<...>` type
      arguments carry the literal "capture_id" string to explicitly
      EXCLUDE that field from their returned types — the opposite of
      a leak — and lib/proposals/derive.ts names "sha256" as
      createHmac's algorithm argument, not a capture's own hash
      field. Plan 03-04's own unit tests excluded these same two
      substrings from their banned-word sweeps for the identical
      reason (see 03-04-SUMMARY.md, Deviations 1 and 2, and this
      plan's own 03-06-SUMMARY.md). A substring count cannot tell an
      algorithm name, or a type argument that omits a field, from
      that field appearing live in a return value — this is that same
      lesson, applied here.

     node scripts/check-fixture-inputs.mjs

   Exit 0 = clean. Exit 1 = at least one defect. No flag, no
   environment variable, no skip.
   ================================================================ */

import { readdir, readFile, access } from "node:fs/promises";
import { join, dirname, relative, sep } from "node:path";

const CWD = process.cwd();

const SOURCE_ROOTS = ["lib/verify", "lib/proposals"];
const FORBIDDEN_DIRS = ["lib/reconcile", "lib/store", "lib/http", "lib/access", "app/api"];
const FORBIDDEN_FILES = ["lib/data/register.ts"];
const EXTENSION_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const SOURCE_EXT = new Set([".ts", ".tsx"]);

const SIGNATURE_TARGETS = [
  {
    file: "lib/verify/authored.ts",
    fnName: "authoredMatch",
    expected: "export function authoredMatch(assetId: string, fixtureSet: string)",
  },
  {
    file: "lib/proposals/derive.ts",
    fnName: "authoredProposals",
    expected: "export function authoredProposals(assetId: string, fixtureSet: string)",
  },
];

/* sha256 and capture_id excluded from the sweep — see the header
   comment's assertion 3 for why. */
const PAYLOAD_IDENTIFIERS = ["bytes", "thumb", "mime", "duration_ms", "payload"];
const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

const problems = [];

/* ---------------------------------------------------------------
   shared helpers — reused verbatim from check-register-isolation.mjs
   --------------------------------------------------------------- */

function toPosix(p) {
  return p.split(sep).join("/");
}

/** Repo/fixture-root-relative path, forward-slashed, for messages and
    the forbidden-set comparison. */
function toRel(absPath) {
  return toPosix(relative(CWD, absPath));
}

/** Every .ts/.tsx file under `dir`, recursively. A missing directory
    is "nothing to check", not an error — matches
    check-register-isolation.mjs's own convention. */
async function walkSourceFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await walkSourceFiles(p)));
    } else if (SOURCE_EXT.has(p.slice(p.lastIndexOf(".")))) {
      out.push(p);
    }
  }
  return out;
}

/** The tsconfig.json "@/*"-style alias mapping, read from CWD so a
    fixture tree's own tsconfig.json governs the walk over it. Returns
    null if there is no such mapping to read. */
async function loadAliasPrefix() {
  let raw;
  try {
    raw = await readFile(join(CWD, "tsconfig.json"), "utf8");
  } catch {
    return null;
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const paths = json?.compilerOptions?.paths;
  if (!paths || typeof paths !== "object") return null;
  for (const [key, values] of Object.entries(paths)) {
    if (!key.endsWith("/*") || !Array.isArray(values) || values.length === 0) continue;
    const value = values[0];
    if (typeof value !== "string" || !value.endsWith("/*")) continue;
    return { sourcePrefix: key.slice(0, -1), targetPrefix: value.slice(0, -1) };
  }
  return null;
}

/** Every import/export specifier string literal in `src`, via
    from "..." and the bare import "..." side-effect form — the same
    text-extraction discipline check-governed.mjs uses, not a full
    parser. */
function extractSpecifiers(src) {
  const specifiers = new Set();
  const fromRe = /\bfrom\s*["']([^"']+)["']/g;
  let m;
  while ((m = fromRe.exec(src))) specifiers.add(m[1]);
  const bareImportRe = /(?:^|[;\n])\s*import\s*["']([^"']+)["']/g;
  while ((m = bareImportRe.exec(src))) specifiers.add(m[1]);
  return [...specifiers];
}

/** Resolves one import specifier from `fromFile` to an existing file
    on disk, trying .ts, .tsx, /index.ts, /index.tsx in that order (or
    the specifier's own extension if it already carries .ts/.tsx). A
    bare package specifier, or one that resolves to nothing, returns
    null and is simply not followed. */
async function resolveImport(fromFile, specifier, alias) {
  let base;
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = join(dirname(fromFile), specifier);
  } else if (alias && specifier.startsWith(alias.sourcePrefix)) {
    base = join(CWD, alias.targetPrefix, specifier.slice(alias.sourcePrefix.length));
  } else {
    return null;
  }

  const candidates = /\.(ts|tsx)$/.test(base)
    ? [base]
    : EXTENSION_SUFFIXES.map((suffix) => base + suffix);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* not this candidate */
    }
  }
  return null;
}

/** True when `rel` (repo/fixture-root-relative, forward-slashed) is
    the one forbidden file or sits under one of the forbidden
    directories — a prefix match, not an exact one, since most of
    AD-8's forbidden set names a whole directory a capture payload
    could reach one of these modules from. */
function isForbidden(rel) {
  if (FORBIDDEN_FILES.includes(rel)) return true;
  return FORBIDDEN_DIRS.some((dir) => rel === dir || rel.startsWith(`${dir}/`));
}

/** Breadth-first transitive walk from one root file. Returns
    { chain, target } for the first forbidden file reached (shortest
    chain first), or null if the root's whole reachable graph is
    clean. Each root gets its own visited set, so a cycle terminates
    the walk rather than looping forever. */
async function findViolation(rootFile, alias) {
  const visited = new Set([rootFile]);
  const queue = [[rootFile]];
  while (queue.length) {
    const chain = queue.shift();
    const current = chain[chain.length - 1];
    let src;
    try {
      src = await readFile(current, "utf8");
    } catch {
      continue;
    }
    for (const specifier of extractSpecifiers(src)) {
      const resolved = await resolveImport(current, specifier, alias);
      if (!resolved) continue;
      const rel = toRel(resolved);
      if (isForbidden(rel)) {
        return { chain: [...chain, resolved], target: rel };
      }
      if (!visited.has(resolved)) {
        visited.add(resolved);
        queue.push([...chain, resolved]);
      }
    }
  }
  return null;
}

/* ---------------------------------------------------------------
   assertion 1 — the declared inputs
   --------------------------------------------------------------- */

for (const target of SIGNATURE_TARGETS) {
  let src;
  try {
    src = await readFile(join(CWD, target.file), "utf8");
  } catch {
    continue; /* nothing to check — the module does not exist yet */
  }
  if (!src.includes(target.expected)) {
    const foundLine = src
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.includes(`function ${target.fnName}(`));
    problems.push(
      `${target.file} does not declare "${target.expected}" (AD-8) — ${
        foundLine
          ? `found instead: ${foundLine}`
          : `no "${target.fnName}" function declaration found at all`
      }`,
    );
  }
}

/* ---------------------------------------------------------------
   assertion 2 — the import graph
   --------------------------------------------------------------- */

const alias = await loadAliasPrefix();
const rootFiles = [];
for (const root of SOURCE_ROOTS) {
  rootFiles.push(...(await walkSourceFiles(join(CWD, root))));
}
for (const rootFile of rootFiles) {
  const violation = await findViolation(rootFile, alias);
  if (violation) {
    const chainText = violation.chain.map(toRel).join(" -> ");
    problems.push(
      `${toRel(rootFile)} reaches ${violation.target} — no module under lib/verify/ or lib/proposals/ may reach a capture payload, directly or transitively (AD-8): ${chainText}`,
    );
  }
}

/* ---------------------------------------------------------------
   assertion 3 — the payload identifiers
   --------------------------------------------------------------- */

for (const target of SIGNATURE_TARGETS) {
  let src;
  try {
    src = await readFile(join(CWD, target.file), "utf8");
  } catch {
    continue; /* nothing to check — the module does not exist yet */
  }
  const liveText = src
    .split(/\r?\n/)
    .filter((line) => !COMMENT_LINE_RE.test(line))
    .join("\n");
  for (const identifier of PAYLOAD_IDENTIFIERS) {
    if (liveText.includes(identifier)) {
      problems.push(
        `${target.file} contains the capture-payload identifier "${identifier}" in live code — no capture-payload field may reach an authored module (AD-8)`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("FIXTURE INPUTS CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — AD-8's no-model claim does not hold:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nBoth authored modules declare exactly (assetId, fixtureSet), reach no capture payload through their import graph, and carry no capture-payload identifier in live code.",
);
