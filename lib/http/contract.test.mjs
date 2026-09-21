/* ================================================================
   HTTP CONTRACT — unit tests (AD-11)

   Plain node:test assertions, no build and no server. Imports
   nothing from "next" — this is the whole point of splitting the
   pure contract from lib/http/respond.ts's constructors.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import * as contract from "./contract.ts";
import { CONFLICT_CODES, REJECT_CODES } from "../data/types.ts";
import { CONFLICT_COPY, TRANSPORT_COPY } from "../copy/conflicts.ts";

// TransportErrorCode has no exported runtime array (it is a type only,
// lib/copy/conflicts.ts, 03-01) — TRANSPORT_COPY is a complete
// Record<TransportErrorCode, RefusalCopy>, so its own keys ARE the
// closed set, exactly as CONFLICT_CODES/REJECT_CODES are for the other
// two closed sets.
const TRANSPORT_ERROR_CODES = Object.keys(TRANSPORT_COPY);

// The two P9 placeholders: no sentence exists yet for either (see
// lib/copy/conflicts.ts's own comment on both). Named here, not
// inferred, so a reader sees the two gaps instead of guessing at them.
const P9_PLACEHOLDER_CODES = ["referral_evidence_missing", "unknown_referral"];

test("STATUS_BY_CODE has exactly one entry per member of CONFLICT_CODES, REJECT_CODES and TRANSPORT_ERROR_CODES, no extra key", () => {
  const expectedKeys = [...CONFLICT_CODES, ...REJECT_CODES, ...TRANSPORT_ERROR_CODES].sort();
  const actualKeys = Object.keys(contract.STATUS_BY_CODE).sort();
  assert.deepEqual(actualKeys, expectedKeys);
});

test("STATUS_BY_CODE matches the literal status table exactly, so a status cannot move silently", () => {
  assert.deepEqual(contract.STATUS_BY_CODE, {
    no_session: 401,
    unknown_persona: 404,
    bad_request: 400,
    method_not_allowed: 405,
    batch_too_large: 413,
    order_not_found: 404,
    order_closed: 409,
    not_open: 409,
    asset_not_in_order: 409,
    account_mismatch: 409,
    proposal_superseded: 409,
    already_recorded_differently: 409,
    clock_skew: 422,
    referral_evidence_missing: 409,
    bad_shape: 422,
    media_too_large: 413,
    unknown_kind: 422,
    unknown_proposal: 404,
    unknown_referral: 404,
    store_evicted: 409,
  });
});

test("HEADER_TABLE contains no duplicate name", () => {
  const names = contract.HEADER_TABLE.map((entry) => entry.name);
  assert.equal(new Set(names).size, names.length);
});

test("every HEADER_TABLE entry other than X-CAP-Store and X-CAP-Instance is success-only (AD-4)", () => {
  const universal = new Set(["X-CAP-Store", "X-CAP-Instance"]);
  const others = contract.HEADER_TABLE.filter(
    (entry) => entry.name.startsWith("X-CAP-") && !universal.has(entry.name),
  );
  assert.ok(others.length > 0, "there should be at least one success-only X-CAP- header to check");
  for (const entry of others) {
    assert.equal(entry.scope, "success-only", `${entry.name} should be success-only`);
  }
});

test("HEADER_TABLE's two universal entries are exactly X-CAP-Instance and X-CAP-Store", () => {
  const universalNames = contract.HEADER_TABLE.filter((entry) => entry.scope === "universal")
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(universalNames, ["X-CAP-Instance", "X-CAP-Store"]);
});

test("errorBody('not_open') deep-equals the envelope built from CONFLICT_COPY", () => {
  assert.deepEqual(contract.errorBody("not_open"), {
    error: "not_open",
    detail: CONFLICT_COPY.not_open.sentence,
  });
});

test("errorBody returns a non-empty detail for every wire error code except the two P9 placeholders", () => {
  const allCodes = [...CONFLICT_CODES, ...REJECT_CODES, ...TRANSPORT_ERROR_CODES];
  for (const code of allCodes) {
    const body = contract.errorBody(code);
    assert.equal(body.error, code);
    if (P9_PLACEHOLDER_CODES.includes(code)) {
      // P9 fills these two sentences; empty is the honest, explicit
      // placeholder lib/copy/conflicts.ts itself ships (03-01).
      assert.equal(body.detail, "", `${code} is a P9 placeholder and is expected to be empty`);
    } else {
      assert.ok(body.detail.length > 0, `${code} should resolve to a non-empty sentence`);
    }
  }
});

test("detailFor and errorBody agree, and every code resolves through exactly one of the three copy records", () => {
  for (const code of [...CONFLICT_CODES, ...REJECT_CODES, ...TRANSPORT_ERROR_CODES]) {
    assert.equal(contract.errorBody(code).detail, contract.detailFor(code));
  }
});

test("errorBody accepts an explicit detail override", () => {
  const body = contract.errorBody("bad_request", "A custom sentence for this call only.");
  assert.deepEqual(body, { error: "bad_request", detail: "A custom sentence for this call only." });
});

test("UNIVERSAL_HEADERS carries the two fixed-value universal headers and is frozen", () => {
  assert.deepEqual(contract.UNIVERSAL_HEADERS, {
    "Cache-Control": "no-store",
    "X-CAP-Store": contract.STORE_KIND,
  });
  assert.ok(Object.isFrozen(contract.UNIVERSAL_HEADERS));
});

/* ----------------------------------------------------------------
   HEADER_TABLE.routes, against what the routes actually emit

   lib/http/respond.ts reads only `name` and `scope`, so `routes` and
   `reason` were free text that nothing checked — and `routes`
   drifted: X-CAP-Account was listed against POST /api/session alone
   while ten routes emitted it, with a reason ("this route has no
   ownership check to leak around") that was false for most of them.
   These are the only tests in this file that read source off disk
   rather than proving a pure value. They still start no server and
   import nothing from "next": every route.ts under app/api is read
   as text, which is what makes the claim checkable at all.
   ---------------------------------------------------------------- */

const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

async function collectRouteFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectRouteFiles(full)));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

/** app/api/orders/[id]/open/route.ts -> /api/orders/[id]/open */
function routePathOf(file) {
  const segments = relative(process.cwd(), file).split(sep);
  segments.pop(); // route.ts
  return `/${segments.slice(1).join("/")}`; // drop the leading "app"
}

test("every X-CAP-* literal a route emits is listed in HEADER_TABLE against an entry that names that route", async () => {
  const files = await collectRouteFiles(join(process.cwd(), "app", "api"));
  assert.ok(files.length > 0, "app/api must hold at least one route.ts");

  for (const file of files) {
    const routePath = routePathOf(file);
    // Comment lines are stripped for the same reason
    // check-single-writer.mjs strips them: this project documents its
    // headers in prose beside the code that emits them, and a prose
    // mention is not an emission.
    const live = (await readFile(file, "utf8"))
      .split("\n")
      .filter((line) => !COMMENT_LINE_RE.test(line))
      .join("\n");

    for (const name of new Set(live.match(/X-CAP-[A-Za-z-]+/g) ?? [])) {
      const entry = contract.HEADER_TABLE.find((candidate) => candidate.name === name);
      assert.ok(entry, `${routePath} emits "${name}", which is in no HEADER_TABLE entry`);
      // The method is not compared: a file may export several
      // handlers and emit a header from only one of them, which a
      // text sweep cannot tell apart. The path is what caught the
      // drift this test exists for.
      const covered =
        entry.routes.includes("*") ||
        entry.routes.some((declared) => declared.endsWith(` ${routePath}`));
      assert.ok(
        covered,
        `${routePath} emits "${name}", but that entry's routes are ${JSON.stringify(entry.routes)}`,
      );
    }
  }
});

test("every HEADER_TABLE entry declares a non-empty routes list and a reason", () => {
  for (const entry of contract.HEADER_TABLE) {
    assert.ok(Array.isArray(entry.routes) && entry.routes.length > 0, `${entry.name} declares no routes`);
    assert.ok(entry.reason.length > 0, `${entry.name} declares no reason`);
  }
});
