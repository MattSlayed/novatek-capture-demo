/* ================================================================
   ACCEPTED-FIELDS CHECK (AD-20, FR-10, FR-15, FR-16, FR-61)

   Analog: scripts/check-headers.mjs's {source, headers} shape,
   replaced by {routeKey, file, fields} — including its
   "declared-but-not-expected is also a problem" half (D-04's own
   header rule, reused verbatim here for AD-20).

   EXPECTED_ROUTES and EXPECTED_PAYLOADS below are a SECOND, literal
   statement of what lib/reconcile/validate.ts's ACCEPTED_BODY_FIELDS
   and ACCEPTED_PAYLOAD_FIELDS declare — written independently of that
   module, never imported from it: a check that imported its own
   expected value from the module it checks would pass every fixture
   and prove nothing (the lesson scripts/check-fixture-hash.mjs
   already records for FIXTURE_VERSION). Two independent statements of
   the same table, cross-checked in both directions, is the mechanism.

   Four assertions:
     1. Both directions — every field EXPECTED_ROUTES/EXPECTED_PAYLOADS
        names must be in the module's own array, and every field the
        module declares must be in the expected table (AD-20's
        declared-but-unexpected half).
     2. The route uses its own key — every EXPECTED_ROUTES file must
        call pick(...) naming its own key, and no pick(...) call
        anywhere under app/api may name a key EXPECTED_ROUTES does not
        carry — a new write route must join this table or fail the
        build.
     3. The forbidden vocabulary — no array in either record, or
        either expected table, may carry an actor field, an
        observation/grade/provenance field, or an artisan-supplied
        duration or hour value, compared by whole name.
     4. The capture enumerations — this check's own capture payload
        table carries exactly the media fields FR-15/FR-16 name.

     node scripts/check-accepted-fields.mjs

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const CWD = process.cwd();
const VALIDATE_FILE = "lib/reconcile/validate.ts";

const problems = [];

/* ---------------------------------------------------------------
   The expected tables — one per write surface, independent of
   lib/reconcile/validate.ts's own arrays.
   --------------------------------------------------------------- */

const CAPTURE_BODY_FIELDS = [
  "client_id",
  "order_id",
  "asset_id",
  "kind",
  "purpose",
  "captured_at",
  "sha256",
  "bytes",
  "mime",
  "duration_ms",
  "thumb",
];

const EXPECTED_ROUTES = {
  session: { file: "app/api/session/route.ts", fields: ["persona_id"] },
  orders_open: { file: "app/api/orders/[id]/open/route.ts", fields: ["client_id"] },
  orders_close: { file: "app/api/orders/[id]/close/route.ts", fields: ["client_id"] },
  verify: { file: "app/api/verify/route.ts", fields: CAPTURE_BODY_FIELDS },
  captures: { file: "app/api/captures/route.ts", fields: CAPTURE_BODY_FIELDS },
  decisions: {
    file: "app/api/decisions/route.ts",
    fields: [
      "client_id",
      "proposal_id",
      "capture_client_id",
      "observation_id",
      "outcome",
      "decided_at",
      "decided_where_claimed",
      "note",
    ],
  },
  sync: { file: "app/api/sync/route.ts", fields: ["items"] },
};

const EXPECTED_PAYLOADS = {
  order_open: ["device_claimed_opened_at"],
  order_close: ["device_claimed_closed_at"],
  capture: ["asset_id", "kind", "purpose", "captured_at", "sha256", "bytes", "mime", "duration_ms", "thumb"],
  decision: [
    "proposal_id",
    "capture_client_id",
    "observation_id",
    "outcome",
    "decided_at",
    "decided_where_claimed",
    "note",
  ],
  referral: [],
};

/**
 * FR-23 (no actor field), FR-61 (no client-supplied observation,
 * grade or provenance) and FR-10 (no artisan-supplied duration or
 * hour value). Compared with Array.prototype.includes — whole field
 * names, never a substring test: observation_id contains
 * "observation" and must pass, because it is AD-5's identity field
 * and not observation content, so a substring comparison here would
 * fail the repository as it stands. Two deliberate distinctions this
 * list does NOT catch by design: duration_ms on a voice capture is a
 * media duration and is accepted, while duration_s on a clock is not
 * (and is listed here); capture_client_id and observation_id are
 * AD-5's proposal identity pair, excluded from this ban by name
 * because they are identity rather than observation content — their
 * absence from EXPECTED_PAYLOADS/EXPECTED_ROUTES would be an
 * Assertion 1 failure like any other missing field, not a pass here.
 */
const FORBIDDEN_VOCAB = [
  "captured_by",
  "decided_by",
  "raised_by",
  "account_id",
  "observation",
  "grade",
  "provenance",
  "elapsed_s",
  "hours",
  "duration_s",
];

/* ---------------------------------------------------------------
   shared helpers
   --------------------------------------------------------------- */

function toPosix(p) {
  return p.split(sep).join("/");
}

function toRel(absPath) {
  return toPosix(relative(CWD, absPath));
}

const SOURCE_EXT = new Set([".ts", ".tsx"]);

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
    } else if (SOURCE_EXT.has(extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}

/* ---------------------------------------------------------------
   Assertion 1 — both directions

   Dynamic import of a file:// URL built from process.cwd(), never a
   fixed path (scripts/check-fixture-hash.mjs's own precedent): a
   fixture tree under test is checked against its own
   lib/reconcile/validate.ts, not this repository's.
   --------------------------------------------------------------- */

async function loadValidateExports() {
  try {
    const url = pathToFileURL(join(CWD, VALIDATE_FILE)).href;
    return await import(url);
  } catch (e) {
    problems.push(`could not import ${VALIDATE_FILE}: ${e.message}`);
    return null;
  }
}

function checkBothDirections(tableName, actual, expected) {
  const actualObj = actual && typeof actual === "object" ? actual : {};
  for (const [key, expectedFields] of Object.entries(expected)) {
    const actualFields = Array.isArray(actualObj[key]) ? actualObj[key] : [];
    for (const field of expectedFields) {
      if (!actualFields.includes(field)) {
        problems.push(
          `${VALIDATE_FILE}'s ${tableName}.${key} is missing "${field}" (expected by this check's own table)`,
        );
      }
    }
    for (const field of actualFields) {
      if (!expectedFields.includes(field)) {
        problems.push(
          `${VALIDATE_FILE}'s ${tableName}.${key} declares "${field}", which this check's own table does not carry — a declared-but-unexpected field is a failure as much as a missing one (AD-20)`,
        );
      }
    }
  }
  for (const key of Object.keys(actualObj)) {
    if (!Object.prototype.hasOwnProperty.call(expected, key)) {
      problems.push(
        `${VALIDATE_FILE}'s ${tableName} declares "${key}", which is not in this check's own expected table — a new write route or kind must join it or fail the build`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 2 — the route uses its own key
   --------------------------------------------------------------- */

async function checkRouteUsesOwnKey() {
  // Part A: every EXPECTED_ROUTES entry's own file must call pick(...)
  // naming its own key from ACCEPTED_BODY_FIELDS.
  for (const [routeKey, entry] of Object.entries(EXPECTED_ROUTES)) {
    const absPath = join(CWD, entry.file);
    let src;
    try {
      src = await readFile(absPath, "utf8");
    } catch {
      problems.push(`${entry.file} does not exist — required by EXPECTED_ROUTES.${routeKey}`);
      continue;
    }
    const usesOwnKey = new RegExp(
      `pick\\([^)]*ACCEPTED_BODY_FIELDS(?:\\.${routeKey}\\b|\\[["']${routeKey}["']\\])`,
    );
    if (!usesOwnKey.test(src)) {
      problems.push(
        `${entry.file} does not call pick(..., ACCEPTED_BODY_FIELDS.${routeKey}) — every write route must use its own enumerated key (AD-20)`,
      );
    }
  }

  // Part B: any pick(..., ACCEPTED_BODY_FIELDS.<key>) call anywhere
  // under app/api whose <key> is not in EXPECTED_ROUTES at all is a
  // new, unenumerated write route. A POST handler that never calls
  // pick() against ACCEPTED_BODY_FIELDS — app/api/hours/route.ts's
  // own hand-written 405 is the one example this repository ships —
  // accepts no field at all and has nothing to enumerate, so it is
  // not swept here; this check follows the accepted-field mechanism
  // itself, not the mere presence of a POST export.
  const files = await walkSourceFiles(join(CWD, "app/api"));
  const pickCallRe = /pick\(\s*[^,]+,\s*ACCEPTED_BODY_FIELDS(?:\.(\w+)|\[["'](\w+)["']\])/g;
  for (const file of files) {
    const rel = toRel(file);
    const src = await readFile(file, "utf8");
    let m;
    while ((m = pickCallRe.exec(src))) {
      const routeKey = m[1] ?? m[2];
      if (!Object.prototype.hasOwnProperty.call(EXPECTED_ROUTES, routeKey)) {
        problems.push(
          `${rel} calls pick(..., ACCEPTED_BODY_FIELDS.${routeKey}) but "${routeKey}" is not in EXPECTED_ROUTES — a new write route must join the table or fail the build`,
        );
      } else if (EXPECTED_ROUTES[routeKey].file !== rel) {
        problems.push(
          `${rel} calls pick(..., ACCEPTED_BODY_FIELDS.${routeKey}) but EXPECTED_ROUTES.${routeKey} names ${EXPECTED_ROUTES[routeKey].file} instead`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 3 — the forbidden vocabulary
   --------------------------------------------------------------- */

function sweepForbidden(tableName, table) {
  const obj = table && typeof table === "object" ? table : {};
  for (const [key, fields] of Object.entries(obj)) {
    if (!Array.isArray(fields)) continue;
    for (const field of fields) {
      if (FORBIDDEN_VOCAB.includes(field)) {
        problems.push(`${tableName}.${key} contains the forbidden field "${field}" (FR-10, FR-23, FR-61)`);
      }
    }
  }
}

/* ---------------------------------------------------------------
   Assertion 4 — the capture enumerations (FR-15, FR-16)
   --------------------------------------------------------------- */

function checkCaptureShape() {
  const fields = EXPECTED_PAYLOADS.capture;
  for (const required of ["sha256", "bytes", "mime", "duration_ms", "thumb"]) {
    if (!fields.includes(required)) {
      problems.push(`EXPECTED_PAYLOADS.capture is missing "${required}" (FR-15, FR-16)`);
    }
  }
  const imageish = fields.filter((f) => /image|photo|full[-_]?res|original/i.test(f));
  if (imageish.length) {
    problems.push(
      `EXPECTED_PAYLOADS.capture carries a field suggesting a full-resolution image: ${imageish.join(", ")} (FR-15, FR-16)`,
    );
  }
}

/* ---------------------------------------------------------------
   run all four assertions and report
   --------------------------------------------------------------- */

const mod = await loadValidateExports();
if (mod) {
  checkBothDirections(
    "ACCEPTED_BODY_FIELDS",
    mod.ACCEPTED_BODY_FIELDS,
    Object.fromEntries(Object.entries(EXPECTED_ROUTES).map(([k, v]) => [k, v.fields])),
  );
  checkBothDirections("ACCEPTED_PAYLOAD_FIELDS", mod.ACCEPTED_PAYLOAD_FIELDS, EXPECTED_PAYLOADS);
  sweepForbidden("ACCEPTED_BODY_FIELDS", mod.ACCEPTED_BODY_FIELDS);
  sweepForbidden("ACCEPTED_PAYLOAD_FIELDS", mod.ACCEPTED_PAYLOAD_FIELDS);
}
sweepForbidden("EXPECTED_ROUTES", Object.fromEntries(Object.entries(EXPECTED_ROUTES).map(([k, v]) => [k, v.fields])));
sweepForbidden("EXPECTED_PAYLOADS", EXPECTED_PAYLOADS);
checkCaptureShape();
await checkRouteUsesOwnKey();

console.log("ACCEPTED-FIELDS CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — an accepted-field enumeration does not match its independent statement:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery write route's accepted fields match this check's own independent table in both",
);
console.log("directions, every route uses its own enumerated key, and no forbidden field is enumerated.");
