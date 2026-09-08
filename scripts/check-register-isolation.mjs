/* ================================================================
   REGISTER ISOLATION CHECK

   D-17's two independent halves, mirroring exactly how
   check-structure.mjs already runs twice (once source-only, once
   --build-output-gated after `next build`):

   1. Source mode (no flag) — walks every .ts/.tsx file under
      components/ and lib/client/ and follows their imports
      transitively (relative specifiers and the tsconfig "@/*" alias),
      failing if any reachable path is lib/data/register.ts or
      lib/access/register.ts — the second does not exist yet and is
      still forbidden, so a later phase inherits the rule rather than
      adding it.
   2. Bundle mode (--bundle <dir>) — reads every file under the given
      directory recursively and fails if any contains the literal
      REGISTER_SENTINEL. Scoped to whatever directory it is given
      (verify.mjs points it at .next/static only) — the sentinel
      legitimately appears under .next/server, where register.ts's
      own server code lands, and this mode must never be pointed
      there.

   Neither half warns or skips. A missing lib/client/ is "nothing to
   check" (it does not exist yet); a missing --bundle directory is a
   named failure, since the scan proved nothing.

     node scripts/check-register-isolation.mjs
     node scripts/check-register-isolation.mjs --bundle <dir>

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readdir, readFile, access } from "node:fs/promises";
import { join, dirname, resolve, relative, sep } from "node:path";

const CWD = process.cwd();

const SOURCE_ROOTS = ["components", "lib/client"];
const FORBIDDEN = ["lib/data/register.ts", "lib/access/register.ts"];
const EXTENSION_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const SOURCE_EXT = new Set([".ts", ".tsx"]);

/* Mirrors lib/data/register.ts's own REGISTER_SENTINEL. This script
   and that module are the sentinel's only two homes. */
const REGISTER_SENTINEL = "__CAPTURE_REGISTER_SENTINEL__";

const problems = [];

/* ---------------------------------------------------------------
   shared helpers
   --------------------------------------------------------------- */

function toPosix(p) {
  return p.split(sep).join("/");
}

/** Repo/fixture-root-relative path, forward-slashed, for messages and
    the FORBIDDEN comparison. */
function toRel(absPath) {
  return toPosix(relative(CWD, absPath));
}

/** Every .ts/.tsx file under `dir`, recursively. A missing directory
    is "nothing to check", not an error — lib/client/ does not exist
    in this repository yet. */
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

/** Every file under `dir`, recursively — including binaries, which
    are read as text and simply won't match the sentinel. Unlike
    walkSourceFiles, a missing top-level directory must surface as a
    defect (the bundle scan proved nothing), so this throws instead of
    swallowing the error — the one call site below catches it once. */
async function walkAllFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walkAllFiles(p)));
    } else {
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
    bare package specifier, or one that resolves to nothing (a CSS/
    asset import, a specifier with no matching file), returns null and
    is simply not followed. */
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
      if (FORBIDDEN.includes(rel)) {
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
   mode selection
   --------------------------------------------------------------- */

const bundleFlagIndex = process.argv.indexOf("--bundle");
const bundleDir = bundleFlagIndex !== -1 ? process.argv[bundleFlagIndex + 1] : null;

if (bundleDir) {
  /* ---- bundle mode — D-17's second half --------------------------- */
  const resolvedBundleDir = resolve(CWD, bundleDir);
  let files = null;
  try {
    files = await walkAllFiles(resolvedBundleDir);
  } catch (e) {
    problems.push(
      `could not read bundle directory ${bundleDir} — the scan proved nothing and must not pass: ${e.message}`,
    );
  }
  if (files) {
    for (const file of files) {
      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }
      if (text.includes(REGISTER_SENTINEL)) {
        problems.push(
          `${toRel(file)} contains ${REGISTER_SENTINEL} — the register reached the client bundle (D-17)`,
        );
      }
    }
  }
} else {
  /* ---- source mode — D-17's first half ---------------------------- */
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
        `${toRel(rootFile)} reaches ${violation.target} — no module under components/ or lib/client/ may reach the register, directly or transitively (D-17): ${chainText}`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("REGISTER ISOLATION CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the register is reachable where it must not be:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  bundleDir
    ? `\nNo file under ${bundleDir} contains the register sentinel.`
    : "\nNo module under components/ or lib/client/ reaches the register, directly or transitively.",
);
