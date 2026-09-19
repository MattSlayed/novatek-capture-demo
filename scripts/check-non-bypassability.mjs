/* ================================================================
   NON-BYPASSABILITY CHECK (AD-19, D-12, FR-24, FR-57)

   A NEW script, not an extension of check-structure.mjs: that script
   asserts things are ABSENT (no proxy.ts, no webpack( key). This one
   asserts things are PRESENT (every route, every process.env name and
   every store-writing module named in the enumeration). The two
   failure messages read very differently to whoever is debugging a
   red build, and a new script keeps each one's own fixture set
   readable. D-12 leaves the choice open; this is the choice.

   THE LIMITATION, STATED FIRST, IN THE CLAIMS-AUDIT'S OWN VOICE: this
   is a literal string-membership sweep over
   docs/analysis/single-writer-non-bypassability.md's own text. It
   proves every route, every environment read and every store-writing
   module is NAMED in the document — a substring search, nothing more.
   It cannot prove the sentence beside a name is TRUE, and it never
   claims to: that different kind of claim is carried by the tests the
   document cites under each entry and by a reviewer's own reading, not
   by this check's exit code (03-RESEARCH.md Open Questions 2's own
   recommendation, taken as written).

   Four sweeps:
     1. Every route.ts file under app/api (any depth) must appear in
        the document.
     2. Every process.env.<NAME> read in live (non-comment) code under
        app/, lib/ and next.config.ts must appear in the document.
     3. Every module that imports a store-mutating export from
        lib/store/memory.ts must appear in the document, and so must
        lib/store/memory.ts itself. The set of mutating export names is
        imported from scripts/check-single-writer.mjs rather than
        restated here: the two rules must agree on what a write is, and
        two hand-kept lists would drift out of step with each other
        (AD-1).
     4. The document's own required sections must all be present — a
        document that lost a section has lost the structure the three
        sweeps above assume a reviewer can navigate by.

     node scripts/check-non-bypassability.mjs

   Exit 0 = every name present. Exit 1 = at least one is missing, or
   the document itself does not exist — a missing enumeration is the
   loudest possible failure of AD-19, never a silent pass. No flag, no
   environment variable, no skip.
   ================================================================ */

import { readFile, readdir, access } from "node:fs/promises";
import { globSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { MUTATING_EXPORTS } from "./check-single-writer.mjs";

const CWD = process.cwd();
const DOC_PATH = "docs/analysis/single-writer-non-bypassability.md";
const STORE_FILE = "lib/store/memory.ts";
const SOURCE_EXT = new Set([".ts", ".tsx"]);
const SOURCE_ROOTS = ["app", "lib"];
const EXTENSION_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/* Sweep 4's required sections — a document missing any one of these has
   lost the structure a reviewer needs to find what the other sweeps
   below prove is named. */
const REQUIRED_SECTIONS = [
  "## Scope",
  "## The single writer",
  "## The single accessor",
  "## Routes",
  "## Configuration",
  "## What a reviewer can run",
  "## Open items",
];

const problems = [];

/* ---------------------------------------------------------------
   Path normalisation. Windows' own glob and directory-walk results
   carry backslashes; the document is a UTF-8 text file swept for a
   forward-slash string on every platform, so every path compared
   against it is normalised first — this repository has already been
   bitten by exactly this Windows/Linux separator mismatch elsewhere
   (scripts/verify.test.mjs's own route-suite-glob assertion carries
   the identical normalisation for the identical reason).
   --------------------------------------------------------------- */

function toForwardSlashes(p) {
  return p.replace(/\\/g, "/");
}

function toRel(absPath) {
  return toForwardSlashes(relative(CWD, absPath));
}

/* ---------------------------------------------------------------
   shared walk/import helpers, duplicated rather than imported from
   scripts/check-single-writer.mjs — matching this codebase's own
   established convention for these small helpers (see 03-12-SUMMARY.md:
   each new check script keeps its own copy so it stays independently
   runnable). MUTATING_EXPORTS is the one deliberate exception: see the
   header comment above for why that one list is imported, not copied.
   --------------------------------------------------------------- */

async function walkSourceFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // a missing directory is nothing to check, not an error
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

function extractNamedImports(src) {
  const results = [];
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const names = m[1]
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => entry.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim());
    results.push({ names, specifier: m[2] });
  }
  return results;
}

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
   0. read the document once — a missing file is a named problem,
      never "nothing to check". The remaining sweeps still run against
      an empty string so every name they were going to require is also
      individually reported, rather than swallowed into one message.
   --------------------------------------------------------------- */

let docText = "";
try {
  docText = await readFile(DOC_PATH, "utf8");
} catch {
  problems.push(
    `${DOC_PATH} does not exist — a missing enumeration is a failure, not "nothing to check" (D-12, AD-19)`,
  );
}

/* ---------------------------------------------------------------
   Sweep 1 — every route
   --------------------------------------------------------------- */

const routeFiles = globSync("app/api/**/route.ts").map(toForwardSlashes);
for (const route of routeFiles) {
  if (!docText.includes(route)) {
    problems.push(
      `${route} is not named in ${DOC_PATH} — add a "###" entry under "## Routes" (D-12)`,
    );
  }
}

/* ---------------------------------------------------------------
   Sweep 2 — every process.env.<NAME> read in live source, comment
   lines stripped first so a source-code comment that merely mentions
   a variable cannot manufacture a documentation requirement that
   nothing actually reads.
   --------------------------------------------------------------- */

const ENV_NAME_RE = /process\.env\.([A-Z0-9_]+)/g;
const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

async function collectEnvNames() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  const nextConfigPath = join(CWD, "next.config.ts");
  try {
    await access(nextConfigPath);
    files.push(nextConfigPath);
  } catch {
    /* a fixture tree may have no next.config.ts at all */
  }

  const names = new Set();
  for (const file of files) {
    const src = await readFile(file, "utf8");
    const stripped = src
      .split("\n")
      .filter((line) => !COMMENT_LINE_RE.test(line))
      .join("\n");
    let m;
    ENV_NAME_RE.lastIndex = 0;
    while ((m = ENV_NAME_RE.exec(stripped))) {
      names.add(m[1]);
    }
  }
  return names;
}

const envNames = await collectEnvNames();
for (const name of envNames) {
  if (!docText.includes(name)) {
    problems.push(
      `process.env.${name} is read in source but not named anywhere in ${DOC_PATH} (D-12)`,
    );
  }
}

/* ---------------------------------------------------------------
   Sweep 3 — every module reaching a store-mutating export, plus the
   store module itself. Direct-import detection only (mirroring
   check-single-writer.mjs's own Assertion 1): the goal here is
   enumeration for the document, not enforcing AD-1's single-writer
   invariant a second time — that is check-single-writer.mjs's own job,
   and importing its MUTATING_EXPORTS list keeps both rules agreeing on
   what counts as a write.
   --------------------------------------------------------------- */

async function collectWriterModules(alias) {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  const writers = [];
  for (const file of files) {
    const rel = toRel(file);
    if (rel === STORE_FILE) continue;
    const src = await readFile(file, "utf8");
    for (const { names, specifier } of extractNamedImports(src)) {
      const resolved = await resolveImport(file, specifier, alias);
      if (!resolved || toRel(resolved) !== STORE_FILE) continue;
      if (names.some((name) => MUTATING_EXPORTS.includes(name))) {
        writers.push(rel);
      }
    }
  }
  return writers;
}

const alias = await loadAliasPrefix();
const writerModules = await collectWriterModules(alias);
for (const writer of writerModules) {
  if (!docText.includes(writer)) {
    problems.push(
      `${writer} imports a store-mutating export and is not named anywhere in ${DOC_PATH} (D-12, AD-1)`,
    );
  }
}

let storeFileExists = true;
try {
  await access(join(CWD, STORE_FILE));
} catch {
  storeFileExists = false;
}
if (storeFileExists && !docText.includes(STORE_FILE)) {
  problems.push(`${STORE_FILE} itself is not named anywhere in ${DOC_PATH} (D-12)`);
}

/* ---------------------------------------------------------------
   Sweep 4 — the document's own required sections
   --------------------------------------------------------------- */

for (const heading of REQUIRED_SECTIONS) {
  if (!docText.includes(heading)) {
    problems.push(`${DOC_PATH} is missing the "${heading}" section (D-12)`);
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("NON-BYPASSABILITY CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the enumeration is incomplete:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery route, every process.env name read in live source and every store-writing module is",
);
console.log(`named in ${DOC_PATH}, and every required section is present.`);
