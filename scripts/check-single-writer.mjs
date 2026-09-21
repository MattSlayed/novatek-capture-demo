/* ================================================================
   SINGLE-WRITER CHECK (AD-1)

   Reuses scripts/check-register-isolation.mjs's helpers verbatim —
   the walk, the tsconfig "@/*" alias resolution, the specifier
   extraction, the BFS — and points them at a different forbidden
   target: not a file, but a named set of exports.

   Three assertions:
     1. Direct import — no file other than lib/reconcile/apply.ts may
        import a mutating export from lib/store/memory.ts.
     2. Transitive reach — no file under app/api may reach a mutating
        export through an intermediate helper, unless the chain passes
        through lib/reconcile/apply.ts (a permitted sink, never walked
        past).
     3. The responder's monopoly — no file other than
        lib/http/respond.ts may reference NextResponse or construct
        `new Response(`.

   WHAT IT CANNOT CATCH: the specifier extraction below is a regex,
   not a full parser — the same honest limitation
   check-register-isolation.mjs already states. A dynamic `import()`
   built from a runtime string is outside what a regex-over-source-
   text sweep can see. The namespace form (`import * as store from
   "…/memory.ts"`) and the re-export form (`export { writeCapture as w }
   from "…/memory.ts"`) were also outside it until this sweep learned
   to extract them; both are now edges, and a namespace edge to the
   store counts as reaching every mutating export at once.

     node scripts/check-single-writer.mjs

   Exit 0 = clean. Exit 1 = at least one defect. No flag, no
   environment variable, no skip.
   ================================================================ */

import { readdir, readFile, access } from "node:fs/promises";
import { join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CWD = process.cwd();

/**
 * The ten names lib/store/memory.ts exports as mutators, listed
 * explicitly rather than derived from a prefix: a prefix rule (e.g.
 * "starts with write") would let a differently-named mutator added
 * later slip through unnoticed. closeClockSegment carries none of
 * the write/stamp/record prefixes the other nine share — memory.ts's
 * own header flags it for exactly this reason, so it is listed here
 * by name rather than inferred.
 */
export const MUTATING_EXPORTS = [
  "writeCapture",
  "writeProposals",
  "writeDecision",
  "writeClockSegment",
  "closeClockSegment",
  "writeSeen",
  "writeAttempt",
  "stampLastContact",
  "recordEviction",
  "sweep",
];

/**
 * One entry. AD-1 is the reason there is exactly one: a second
 * permitted importer would be a second writer, which is the
 * architectural change this rule exists to prevent. Adding one is a
 * deliberate edit here, never a maintenance afterthought.
 */
const PERMITTED_IMPORTERS = ["lib/reconcile/apply.ts"];

const STORE_FILE = "lib/store/memory.ts";
const RESPOND_FILE = "lib/http/respond.ts";

const SOURCE_ROOTS = ["app/api", "lib"];
const EXTENSION_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const SOURCE_EXT = new Set([".ts", ".tsx"]);

const problems = [];

/* ---------------------------------------------------------------
   shared helpers — reused verbatim from check-register-isolation.mjs
   --------------------------------------------------------------- */

function toPosix(p) {
  return p.split(sep).join("/");
}

function toRel(absPath) {
  return toPosix(relative(CWD, absPath));
}

/** Every .ts/.tsx file under `dir`, recursively. A missing directory
    is "nothing to check", not an error. */
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
    fixture tree's own tsconfig.json governs the walk over it. */
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

/**
 * Every import or re-export edge in `src`, with the names it binds,
 * single- or multi-line alike (the character class below matches
 * across line breaks):
 *
 *   import { a, b } from "spec"     -> names ["a","b"]
 *   import type { a } from "spec"   -> names ["a"]
 *   export { a as b } from "spec"   -> names ["a"]
 *   import * as ns from "spec"      -> namespace: true
 *   export * from "spec"            -> namespace: true
 *   export * as ns from "spec"      -> namespace: true
 *
 * A `type ` prefix on an individual name and an `X as Y` rename are
 * both normalised to the real exported name — the local alias is
 * never what matters here.
 *
 * `namespace: true` is the form this sweep used to be blind to, and
 * it is the likelier mistake of the two the header used to list as
 * uncatchable: `import * as store from "…/lib/store/memory.ts"` in a
 * route is ordinary, valid TypeScript (the store has no default
 * export, so the mixed `import def, { … }` form is the only shape
 * `tsc` itself blocks), it names no mutator anywhere in the source
 * text, and it reaches every one of them. A caller enforcing a named
 * ban has to treat a namespace edge as reaching ALL the names, which
 * is what every consumer below does. `export … from` is now an edge
 * too, so a re-export — including one under a different local name,
 * which the header also used to list as uncatchable — is walked like
 * any other hop.
 *
 * A `type`-modified edge is deliberately NOT exempted: the named
 * branch has always reported `import type { writeCapture }` and this
 * keeps the two consistent, erring toward the conservative answer for
 * a rule that protects a load-bearing invariant.
 *
 * This is a regex, not a parser: a dynamic `import()` built from a
 * runtime string, and a bare `import "spec"` side-effect form, are
 * both outside it and it is not meant to see them.
 */
function extractImportEdges(src) {
  const results = [];

  const namedRe = /\b(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = namedRe.exec(src))) {
    const names = m[1]
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => entry.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim());
    results.push({ names, specifier: m[2], namespace: false });
  }

  const namespaceRe =
    /\b(?:import|export)\s+(?:type\s+)?\*\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*["']([^"']+)["']/g;
  while ((m = namespaceRe.exec(src))) {
    results.push({ names: [], specifier: m[1], namespace: true });
  }

  return results;
}

/** Resolves one import specifier from `fromFile` to an existing file
    on disk, trying .ts, .tsx, /index.ts, /index.tsx in that order. A
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

/* ---------------------------------------------------------------
   Assertion 1 — the direct import
   --------------------------------------------------------------- */

async function checkDirectImports(alias) {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  for (const file of files) {
    const rel = toRel(file);
    if (PERMITTED_IMPORTERS.includes(rel) || rel === STORE_FILE) continue;
    const src = await readFile(file, "utf8");
    for (const { names, specifier, namespace } of extractImportEdges(src)) {
      const resolved = await resolveImport(file, specifier, alias);
      if (!resolved || toRel(resolved) !== STORE_FILE) continue;
      // A namespace edge binds the store's whole export object, so
      // every mutator is reachable through it while none of them
      // appears in the source text. There is no read-only version of
      // this form to spare.
      if (namespace) {
        problems.push(
          `${rel} binds the whole of ${STORE_FILE} as a namespace — every mutating export is reachable through it, and only ${PERMITTED_IMPORTERS[0]} may reach one (AD-1)`,
        );
        continue;
      }
      // A file that imports only read-only accessors (BOOT_ID,
      // readClock, readCaptures, ...) is fine and must not be
      // reported: the responder needs BOOT_ID and every read-heavy
      // route needs the readers, and a rule that banned those would
      // be a rule nobody could keep.
      const mutatingHit = names.find((name) => MUTATING_EXPORTS.includes(name));
      if (mutatingHit) {
        problems.push(
          `${rel} imports "${mutatingHit}" directly from ${STORE_FILE} — only ${PERMITTED_IMPORTERS[0]} may reach a mutating export (AD-1)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 2 — the transitive reach

   BFS from every file under app/api, shortest chain first, per-root
   visited set so a cycle terminates. A permitted importer is a sink:
   once a chain reaches one, it is never expanded further, because
   whatever that module does with the store afterward is its own
   already-audited business (Assertion 1 already covers it directly).
   Only a chain that reaches a mutating export WITHOUT passing through
   a permitted importer is a violation.
   --------------------------------------------------------------- */

async function findMutatingReach(rootFile, alias) {
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
    for (const { names, specifier, namespace } of extractImportEdges(src)) {
      const resolved = await resolveImport(current, specifier, alias);
      if (!resolved) continue;
      const rel = toRel(resolved);
      if (PERMITTED_IMPORTERS.includes(rel)) continue; // a sink, never expanded
      if (rel === STORE_FILE) {
        if (namespace) {
          return { chain: [...chain, resolved], target: rel, name: "* (the whole module namespace)" };
        }
        const mutatingHit = names.find((name) => MUTATING_EXPORTS.includes(name));
        if (mutatingHit) {
          return { chain: [...chain, resolved], target: rel, name: mutatingHit };
        }
        continue; // read-only reach at this hop — not a violation
      }
      if (!visited.has(resolved)) {
        visited.add(resolved);
        queue.push([...chain, resolved]);
      }
    }
  }
  return null;
}

async function checkTransitiveReach(alias) {
  const rootFiles = await walkSourceFiles(join(CWD, "app/api"));
  for (const rootFile of rootFiles) {
    const rel = toRel(rootFile);
    if (PERMITTED_IMPORTERS.includes(rel)) continue;
    const violation = await findMutatingReach(rootFile, alias);
    if (violation) {
      const chainText = violation.chain.map(toRel).join(" -> ");
      problems.push(
        `${rel} reaches "${violation.name}" in ${violation.target} through a chain that never passes through ${PERMITTED_IMPORTERS[0]} (AD-1): ${chainText}`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 3 — the responder's monopoly (AD-4, AD-11)

   A naive substring count over a self-documenting file is
   self-invalidating — this file's own header, and every comment
   describing why a route does NOT construct a response, would trip a
   bare `includes("NextResponse")` sweep. Lines matching
   ^\s*(//|\*|/\*) are stripped before the sweep runs, for the same
   reason check-single-writer's own Assertion 3 spec calls for it.
   --------------------------------------------------------------- */

const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

async function checkResponderMonopoly() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  for (const file of files) {
    const rel = toRel(file);
    if (rel === RESPOND_FILE) continue;
    const src = await readFile(file, "utf8");
    const stripped = src
      .split("\n")
      .filter((line) => !COMMENT_LINE_RE.test(line))
      .join("\n");
    if (/\bNextResponse\b/.test(stripped)) {
      problems.push(`${rel} references NextResponse — only ${RESPOND_FILE} may construct a response (AD-4, AD-11)`);
    }
    if (/\bnew Response\(/.test(stripped)) {
      problems.push(`${rel} calls "new Response(" — only ${RESPOND_FILE} may construct a response (AD-4, AD-11)`);
    }
  }
}

/* ---------------------------------------------------------------
   run all three assertions and report — guarded so plan 03-15's
   scripts/check-non-bypassability.mjs can `import { MUTATING_EXPORTS }
   from "./check-single-writer.mjs"` (the two rules must agree on what
   a write is, so the list is imported there rather than restated) WITHOUT
   that import re-running this script's own checks or calling
   process.exit out from under the importer. isMainModule is duplicated
   from scripts/verify.mjs's identical helper rather than imported —
   this script stays independently runnable and importable with no
   dependency on verify.mjs, matching D-23's one-check-one-unit
   discipline. Node 24.0/24.1 leaves import.meta.main undefined, hence
   the entry-script-path fallback.
   --------------------------------------------------------------- */

function isMainModule(meta, argv = process.argv) {
  if (typeof meta.main === "boolean") return meta.main;
  if (typeof argv[1] !== "string" || argv[1].length === 0) return false;
  const entry = resolve(argv[1]);
  const self = fileURLToPath(meta.url);
  return process.platform === "win32"
    ? entry.toLowerCase() === self.toLowerCase()
    : entry === self;
}

if (isMainModule(import.meta)) {
  const alias = await loadAliasPrefix();
  await checkDirectImports(alias);
  await checkTransitiveReach(alias);
  await checkResponderMonopoly();

  console.log("SINGLE-WRITER CHECK");
  console.log("=".repeat(72));
  console.log(`Problems: ${problems.length}`);

  if (problems.length) {
    console.log("\nDEFECTS — more than one path reaches the store, or a response is hand-built:");
    for (const p of problems) console.log(`  !  ${p}`);
    process.exit(1);
  }

  console.log(
    "\nNothing but lib/reconcile/apply.ts reaches the store's mutating exports, directly or",
  );
  console.log("transitively, and nothing but lib/http/respond.ts constructs a response.");
}
