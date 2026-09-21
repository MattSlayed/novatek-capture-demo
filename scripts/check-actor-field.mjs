/* ================================================================
   ACTOR-FIELD CHECK (AD-3, FR-23, FR-57)

   Reuses check-single-writer.mjs's report-and-exit convention and
   walk helpers. Four assertions:
     1. The assignment sweep — no module other than lib/attribution's
        producer and lib/reconcile/apply.ts's writer may assign an
        actor field, and even those two may only assign it from a
        safe, traceable source.
     2. The route schemas — no file under app/api may read an actor
        field off the request body, or name one as a bare quoted
        schema field, in live code.
     3. The enumerations — neither of lib/reconcile/validate.ts's two
        accepted-field records may carry an actor field, compared by
        whole name.
     4. The RBAC companion sweep (FR-57) — no route consults
        rbac_tier, and no module other than lib/access/scope.ts
        imports ORDER_IDS_BY_ARTISAN.

   WHAT IT CANNOT CATCH: this is a text sweep plus an import walk, not
   a parser. An actor field assigned through a computed key
   (`{[field]: value}`) or a spread (`{...maliciousObject}`) is
   outside what a regex over source text can see.
   ================================================================ */

import { readdir, readFile, access } from "node:fs/promises";
import { join, dirname, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const CWD = process.cwd();

const ACTOR_FIELDS = ["captured_by", "decided_by", "raised_by", "account_id"];

/**
 * Two entries, with the reason: lib/attribution produces the acting
 * account and lib/reconcile/apply.ts is the one writer that stamps it
 * onto a record. A third entry is an architectural change, never a
 * maintenance edit.
 */
const PERMITTED_ASSIGNERS = ["lib/attribution/index.ts", "lib/reconcile/apply.ts"];

/**
 * Documented as the exact right-hand-side forms lib/reconcile/apply.ts
 * may use when assigning captured_by/decided_by: account.account_id,
 * acting.account_id and null. This is not enforced as exact-string
 * equality below, for a reason worth stating plainly: the real,
 * already-shipped apply.ts wraps one of these in a ternary
 * (`account ? account.account_id : null`, inside finalize()'s own
 * AttemptEntry construction) — a shape this list does not name
 * verbatim but is built entirely from the forms it does name. The
 * operative check (isSafeRhs below) is therefore a banlist over
 * unsafe SOURCES (body, payload, request, a quoted literal) rather
 * than an allowlist of exact RHS strings: it catches the same
 * concrete threat (`decided_by: body.decided_by`) without tripping
 * on a compound-but-safe expression built only from these
 * primitives.
 */
const PERMITTED_RHS = ["account.account_id", "acting.account_id", "null"];

/**
 * The fields AD-5 excludes from FR-61's ban by name, recorded here so
 * the reason travels with the code: claimed_account_id is compared
 * and never trusted (lib/data/types.ts's own comment on the field)
 * and never becomes an actor field on a record; capture_client_id and
 * observation_id are AD-5's proposal identity pair, carried by a
 * decision item so the server can re-derive the proposal id from them
 * and the session's account. Under the whole-name comparison
 * Assertion 3 uses below, none of the three could trip ACTOR_FIELDS
 * anyway — claimed_account_id, capture_client_id and observation_id
 * are none of them equal to account_id, captured_by, decided_by or
 * raised_by as whole strings. This list is therefore not load-bearing
 * for Assertion 3's own pass/fail outcome; it records the complete
 * set of fields allowed by decision rather than by accident. A fourth
 * entry is an architectural change, exactly as a third
 * PERMITTED_ASSIGNERS entry is.
 */
const ALLOWED_IDENTITY_FIELDS = ["claimed_account_id", "capture_client_id", "observation_id"];

const VALIDATE_FILE = "lib/reconcile/validate.ts";
const ARTISANS_FILE = "lib/data/artisans.ts";
const SCOPE_FILE = "lib/access/scope.ts";
const ORDER_IDS_EXPORT = "ORDER_IDS_BY_ARTISAN";

const SOURCE_ROOTS = ["app/api", "lib"];
const SOURCE_EXT = new Set([".ts", ".tsx"]);
const EXTENSION_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

const problems = [];

/* ---------------------------------------------------------------
   shared helpers
   --------------------------------------------------------------- */

function toPosix(p) {
  return p.split(sep).join("/");
}

function toRel(absPath) {
  return toPosix(relative(CWD, absPath));
}

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

/** Reused verbatim from check-single-writer.mjs, which documents every
    form it extracts and why a namespace edge counts as reaching every
    name at once. The three import sweeps must see the same graph. */
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

async function resolveImport(fromFile, specifier, alias) {
  let base;
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = join(dirname(fromFile), specifier);
  } else if (alias && specifier.startsWith(alias.sourcePrefix)) {
    base = join(CWD, alias.targetPrefix, specifier.slice(alias.sourcePrefix.length));
  } else {
    return null;
  }
  const candidates = /\.(ts|tsx)$/.test(base) ? [base] : EXTENSION_SUFFIXES.map((s) => base + s);
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

const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

function stripCommentLines(src) {
  return src
    .split("\n")
    .filter((line) => !COMMENT_LINE_RE.test(line))
    .join("\n");
}

/** Index of the "}" that closes the "{" at `openIndex`, skipping
    braces inside string literals — reused from check-governed.mjs's
    identical helper. */
function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = null;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Overwrite [start, end] (inclusive) with spaces, keeping every
    other offset — so a reported line number still lines up. */
function blankRange(text, start, end) {
  return text.slice(0, start) + " ".repeat(end + 1 - start) + text.slice(end + 1);
}

/**
 * Blank every `type X = { ... }` and `interface X { ... }` block, so
 * a field's TYPE declaration (e.g. `captured_by: string | null;`
 * inside `interface Capture`) is never mistaken for an object-literal
 * VALUE assignment. Reused from check-governed.mjs's identical
 * technique, applied here for the same reason it is applied there.
 */
function blankTypeDeclarations(text) {
  let out = text;
  const re =
    /\b(?:type\s+[A-Za-z_$][A-Za-z0-9_$]*\s*(?:<[^>]*>)?\s*=|interface\s+[A-Za-z_$][A-Za-z0-9_$]*(?:\s+extends\s+[^{]+)?)/g;
  let m;
  while ((m = re.exec(out))) {
    const open = out.indexOf("{", m.index + m[0].length);
    if (open === -1 || out.slice(m.index + m[0].length, open).trim() !== "") continue;
    const close = findMatchingBrace(out, open);
    if (close === -1) continue;
    out = blankRange(out, m.index, close);
    re.lastIndex = close + 1;
  }
  return out;
}

/**
 * A right-hand side is unsafe when it could plausibly carry
 * client-supplied content: a reference to body/payload/request/raw
 * (this project's own consistent names for a parsed-but-unvalidated
 * request value) or searchParams, or any quoted string literal (a
 * hardcoded fake id is exactly as forgeable as a body field). Every
 * real assignment in this repository — account.account_id,
 * acting.account_id, result.session.account_id, a bare accountId or
 * account identifier, null, and the ternary
 * `account ? account.account_id : null` — contains none of these,
 * so this banlist is the mechanism that lets a compound-but-safe
 * expression pass without enumerating every shape it could take.
 */
const UNSAFE_RHS_RE = /\b(body|payload|request|raw|searchParams)\b|["'`]/;

function isSafeRhs(rhs) {
  return !UNSAFE_RHS_RE.test(rhs);
}

/* ---------------------------------------------------------------
   Assertion 1 — the assignment sweep
   --------------------------------------------------------------- */

/**
 * Matches `field:` not immediately preceded by a `.` — the guard that
 * keeps a property READ inside a ternary or a template
 * (`decision.decided_by : null`, wherea `:` is really the ternary's
 * separator, not an object-literal colon) from being mistaken for an
 * assignment. `\s*:` requires the colon; the RHS is everything up to
 * the next top-level `,` or `}`, which is enough for every shape this
 * repository's own assignments take (none nests a `,` or `{`/`}`
 * inside the value itself).
 */
function findAssignments(strippedText, field) {
  const re = new RegExp(`(?<!\\.)\\b${field}\\s*:\\s*([^,}]+?)\\s*[,}]`, "g");
  const hits = [];
  let m;
  while ((m = re.exec(strippedText))) {
    hits.push(m[1].trim());
  }
  return hits;
}

async function checkAssignmentSweep() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  for (const file of files) {
    const rel = toRel(file);
    const raw = await readFile(file, "utf8");
    const noTypes = blankTypeDeclarations(raw);
    const stripped = stripCommentLines(noTypes);
    const permitted = PERMITTED_ASSIGNERS.includes(rel);

    for (const field of ACTOR_FIELDS) {
      for (const rhs of findAssignments(stripped, field)) {
        const isNameRestrictedField = field !== "account_id";

        if (isNameRestrictedField && !permitted) {
          // captured_by / decided_by / raised_by have no legitimate
          // use outside the two permitted assigners in this
          // repository — flagged regardless of the RHS.
          problems.push(
            `${rel} assigns "${field}:" outside the permitted assigners (AD-3): ${field}: ${rhs}`,
          );
          continue;
        }

        // account_id is a keying field on several unrelated shapes
        // (Session, OrderClock, AttemptEntry) that legitimately get
        // constructed across many files, always by copying an
        // already-derived value — so it is not file-restricted here.
        // Both it and a permitted assigner's captured_by/decided_by/
        // raised_by are instead restricted by the safety of their own
        // right-hand side.
        if (!isSafeRhs(rhs)) {
          problems.push(
            `${rel} assigns "${field}:" from an unsafe source (AD-3): ${field}: ${rhs}`,
          );
        }
      }
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 2 — the route schemas

   A route may mention an actor field in prose explaining it is
   dropped at parse (comments are already stripped by the time this
   runs); it may not read one off the request, and may not name one as
   a bare quoted schema field either.
   --------------------------------------------------------------- */

function unsafeReadPattern(field) {
  return new RegExp(
    `\\b(?:body|payload|raw|request)\\s*(?:\\.\\s*${field}\\b|\\[\\s*["']${field}["']\\s*\\])|["']${field}["']`,
  );
}

async function checkRouteSchemas() {
  const files = await walkSourceFiles(join(CWD, "app/api"));
  for (const file of files) {
    const rel = toRel(file);
    const raw = await readFile(file, "utf8");
    const stripped = stripCommentLines(raw);
    for (const field of ACTOR_FIELDS) {
      if (unsafeReadPattern(field).test(stripped)) {
        problems.push(
          `${rel} names "${field}" as if reading it from the request — no route schema may contain an actor field (FR-23)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 3 — the enumerations

   Dynamic import of a file:// URL built from process.cwd(), never a
   fixed path — the same reason scripts/check-fixture-hash.mjs already
   states: a check that imported its expected value from a fixed
   location would pass every fixture and prove nothing.
   --------------------------------------------------------------- */

async function checkEnumerations() {
  let ACCEPTED_BODY_FIELDS;
  let ACCEPTED_PAYLOAD_FIELDS;
  try {
    const url = pathToFileURL(join(CWD, VALIDATE_FILE)).href;
    ({ ACCEPTED_BODY_FIELDS, ACCEPTED_PAYLOAD_FIELDS } = await import(url));
  } catch (e) {
    problems.push(`could not import ${VALIDATE_FILE}: ${e.message}`);
    return;
  }

  const tables = [
    ["ACCEPTED_BODY_FIELDS", ACCEPTED_BODY_FIELDS],
    ["ACCEPTED_PAYLOAD_FIELDS", ACCEPTED_PAYLOAD_FIELDS],
  ];
  for (const [tableName, table] of tables) {
    if (!table || typeof table !== "object") continue;
    for (const [routeKey, fields] of Object.entries(table)) {
      if (!Array.isArray(fields)) continue;
      for (const field of fields) {
        // Whole-name comparison only: claimed_account_id contains
        // "account_id" as a substring and must pass (see
        // ALLOWED_IDENTITY_FIELDS above) — a substring test here
        // would fail the repository as it stands.
        if (ACTOR_FIELDS.includes(field)) {
          problems.push(
            `${VALIDATE_FILE}'s ${tableName}.${routeKey} contains the actor field "${field}" (AD-3, FR-23)`,
          );
        }
      }
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 4 — the RBAC companion sweep (FR-57)
   --------------------------------------------------------------- */

async function checkRbacSweep() {
  const roots = ["app/api", "lib/access"];
  const files = [];
  for (const root of roots) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  for (const file of files) {
    const rel = toRel(file);
    const stripped = stripCommentLines(await readFile(file, "utf8"));
    if (/\brbac_tier\b/.test(stripped)) {
      problems.push(`${rel} names "rbac_tier" outside a comment — authorisation is decided in lib/access/scope.ts alone (FR-57)`);
    }
  }
}

async function checkOrderIdsImporter(alias) {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    files.push(...(await walkSourceFiles(join(CWD, root))));
  }
  for (const file of files) {
    const rel = toRel(file);
    if (rel === SCOPE_FILE) continue;
    const src = await readFile(file, "utf8");
    for (const { names, specifier, namespace } of extractImportEdges(src)) {
      const resolved = await resolveImport(file, specifier, alias);
      if (!resolved || toRel(resolved) !== ARTISANS_FILE) continue;
      // Resolved before the name test, not after, so a namespace edge
      // — which names nothing in the source text yet reaches
      // ORDER_IDS_BY_ARTISAN like any other export — is seen at all.
      if (namespace) {
        problems.push(
          `${rel} binds the whole of ${ARTISANS_FILE} as a namespace — ${ORDER_IDS_EXPORT} is reachable through it, and only ${SCOPE_FILE} may reach it (FR-57)`,
        );
        continue;
      }
      if (names.includes(ORDER_IDS_EXPORT)) {
        problems.push(
          `${rel} imports ${ORDER_IDS_EXPORT} from ${ARTISANS_FILE} — only ${SCOPE_FILE} may (FR-57)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   run all four assertions and report
   --------------------------------------------------------------- */

const alias = await loadAliasPrefix();
await checkAssignmentSweep();
await checkRouteSchemas();
await checkEnumerations();
await checkRbacSweep();
await checkOrderIdsImporter(alias);

console.log("ACTOR-FIELD CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — an actor field or an RBAC decision escaped its one producer:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery actor field is assigned in one of two named places from a safe source, no route",
);
console.log("schema or enumeration carries one, and authorisation stays inside lib/access/scope.ts.");
