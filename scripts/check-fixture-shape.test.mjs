/* ================================================================
   FIXTURE SHAPE CHECK — closed-set and plant-subset assertions (D-19)

   A plain node:test file, not a check script — the existing
   fixture-suite step (node --test over every scripts/*.test.mjs file)
   already discovers it, no scripts/verify.mjs entry needed.

   Proves two things with a runtime assertion, so neither can drift
   without a red test:

   1. Every closed set lib/data/types.ts defines (D-19) has its exact
      membership asserted here — a member cannot be added or dropped
      from any of the eleven sets without this file failing.
   2. The plant.ts subset Task 1 copied and trimmed is exactly the
      eleven kept records, the four zones, the six docs and the three
      deviations it should be, with no dangling zone, deviation or
      document reference left by the trim, and the anchor/
      session-provenance surface fully absent from the module.

   Later plans in this phase extend this same file.

     node --test scripts/check-fixture-shape.test.mjs

   Exit 0 = every assertion held. Exit 1 = at least one moved.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./lib/fixtures.mjs";

// .ts extension required — this is a .mjs file, the entry point of
// the chain (Node 24 native TypeScript stripping). The modules' own
// internal imports stay extension-free.
import {
  OBSERVATION_KINDS,
  OBSERVATION_GRADES,
  OBSERVATION_RELATIONS,
  ARTISAN_TRADES,
  RBAC_ORDER,
  PROPOSAL_STATES,
  RECONCILED_STATES,
  QUEUE_ITEM_STATES,
  CONFLICT_CODES,
  REJECT_CODES,
  REFERRAL_RESOLUTIONS,
  SYNC_ITEM_KINDS,
  SYNC_ITEM_SCHEMA_VERSIONS,
} from "../lib/data/types.ts";

import * as Plant from "../lib/data/plant.ts";
import {
  MACHINERY_BY_ID,
  MACHINERY_BY_TAG,
  ZONE_BY_ID,
  DEVIATION_BY_ID,
  PEOPLE,
  DOC_BY_CODE,
  SCENE_VERSION,
} from "../lib/data/plant.ts";

import { ARTISANS, ARTISAN_BY_ID, ORDER_IDS_BY_ARTISAN } from "../lib/data/artisans.ts";
import { ORDERS, ORDER_BY_ID } from "../lib/data/orders.ts";
import { OBSERVATIONS } from "../lib/data/observations.ts";

/* ---------------------------------------------------------------
   Closed-set assertions (D-19) — one test per set, exact contents,
   in order.
   --------------------------------------------------------------- */

test("OBSERVATION_KINDS is the closed set of ten, in order (D-05)", () => {
  assert.deepStrictEqual(OBSERVATION_KINDS, [
    "corrosion_visible",
    "gland_weep",
    "guard_damaged",
    "seal_absent",
    "leak_evidence",
    "label_illegible",
    "fixing_missing",
    "discolouration",
    "isolation_present",
    "gauge_obscured",
  ], "OBSERVATION_KINDS moved");
});

test("OBSERVATION_GRADES is INFERRED and AMBIGUOUS, and never includes EXTRACTED (D-12)", () => {
  assert.deepStrictEqual(OBSERVATION_GRADES, ["INFERRED", "AMBIGUOUS"], "OBSERVATION_GRADES moved");
  assert.ok(
    !OBSERVATION_GRADES.includes("EXTRACTED"),
    "OBSERVATION_GRADES must never include EXTRACTED — D-12 makes 'the record states this' unconstructible on an authored observation",
  );
});

test("OBSERVATION_RELATIONS is evidence and context, in order (D-09/D-10)", () => {
  assert.deepStrictEqual(OBSERVATION_RELATIONS, ["evidence", "context"], "OBSERVATION_RELATIONS moved");
});

test("ARTISAN_TRADES is millwright, electrician, boilermaker, in order", () => {
  assert.deepStrictEqual(ARTISAN_TRADES, ["millwright", "electrician", "boilermaker"], "ARTISAN_TRADES moved");
});

test("PROPOSAL_STATES is the closed set of four — no fifth 'decided, pending' member (RESEARCH Pitfall 3)", () => {
  assert.deepStrictEqual(
    PROPOSAL_STATES,
    ["open", "accepted", "rejected", "superseded"],
    "PROPOSAL_STATES moved — EXPERIENCE.md's 'decided, pending' row is a derived rendering state, never a fifth member here",
  );
});

test("RECONCILED_STATES is recorded, pending, conflict, rejected, in order", () => {
  assert.deepStrictEqual(
    RECONCILED_STATES,
    ["recorded", "pending", "conflict", "rejected"],
    "RECONCILED_STATES moved",
  );
});

test("QUEUE_ITEM_STATES is the closed set of six, in order", () => {
  assert.deepStrictEqual(
    QUEUE_ITEM_STATES,
    ["queued", "sending", "recorded", "conflict", "rejected", "discarded"],
    "QUEUE_ITEM_STATES moved",
  );
});

test("CONFLICT_CODES is the closed set of nine, order_closed immediately followed by not_open (D-06), ending in referral_evidence_missing", () => {
  assert.deepStrictEqual(CONFLICT_CODES, [
    "order_not_found",
    "order_closed",
    "not_open",
    "asset_not_in_order",
    "account_mismatch",
    "proposal_superseded",
    "already_recorded_differently",
    "clock_skew",
    "referral_evidence_missing",
  ], "CONFLICT_CODES moved");
});

test("REJECT_CODES is the closed set of six, including unknown_referral", () => {
  assert.deepStrictEqual(REJECT_CODES, [
    "bad_shape",
    "media_too_large",
    "unknown_kind",
    "unknown_proposal",
    "unknown_referral",
    "store_evicted",
  ], "REJECT_CODES moved");
});

test("REFERRAL_RESOLUTIONS is pending, resolved, unresolved, in order", () => {
  assert.deepStrictEqual(
    REFERRAL_RESOLUTIONS,
    ["pending", "resolved", "unresolved"],
    "REFERRAL_RESOLUTIONS moved",
  );
});

test("SYNC_ITEM_KINDS is the closed set of five, in order", () => {
  assert.deepStrictEqual(
    SYNC_ITEM_KINDS,
    ["order_open", "order_close", "capture", "decision", "referral"],
    "SYNC_ITEM_KINDS moved",
  );
});

test("SYNC_ITEM_SCHEMA_VERSIONS maps each of the five kinds to [1] (AD-18)", () => {
  assert.deepStrictEqual(SYNC_ITEM_SCHEMA_VERSIONS, {
    order_open: [1],
    order_close: [1],
    capture: [1],
    decision: [1],
    referral: [1],
  }, "SYNC_ITEM_SCHEMA_VERSIONS moved");
});

/* ---------------------------------------------------------------
   Plant-subset assertions — one test per group.
   --------------------------------------------------------------- */

const KEPT_IDS = [
  "m-ap003",
  "m-aa101",
  "m-aa102",
  "m-aa601",
  "m-aa602",
  "m-aa605",
  "m-as001",
  "m-bb001",
  "m-ac001",
  "m-gs001",
  "m-an001",
];

const TAG_BY_ID = {
  "m-ap003": "20LAC10AP003",
  "m-aa101": "20LAC10AA101",
  "m-aa102": "20LAC10AA102",
  "m-aa601": "20HAD10AA601",
  "m-aa602": "20HAD10AA602",
  "m-aa605": "20LBA10AA605",
  "m-as001": "20LAC30AS001",
  "m-bb001": "20GHC10BB001",
  "m-ac001": "20GHC20AC001",
  "m-gs001": "20BFA10GS001",
  "m-an001": "20LAC10AN001",
};

test("MACHINERY_BY_ID's sorted key list is exactly the eleven kept ids", () => {
  const ids = [...MACHINERY_BY_ID.keys()].sort();
  assert.deepStrictEqual(ids, [...KEPT_IDS].sort(), "MACHINERY_BY_ID's key set moved");
});

test("MACHINERY_BY_TAG resolves each of the eleven kept tags to its record", () => {
  assert.equal(MACHINERY_BY_TAG.size, 11, "MACHINERY_BY_TAG has the wrong number of entries");
  for (const id of KEPT_IDS) {
    const tag = TAG_BY_ID[id];
    const record = MACHINERY_BY_TAG.get(tag);
    assert.ok(record, `MACHINERY_BY_TAG has no entry for ${tag} (${id})`);
    assert.equal(record.id, id, `MACHINERY_BY_TAG[${tag}] does not resolve to ${id}`);
  }
});

test("ZONE_BY_ID has exactly z01 through z04, and no z05", () => {
  const ids = [...ZONE_BY_ID.keys()].sort();
  assert.deepStrictEqual(ids, ["z01", "z02", "z03", "z04"], "ZONE_BY_ID's key set moved — z05 must not be present");
});

test("DEVIATION_BY_ID has exactly ncr-0118, ncr-0104, ncr-0091", () => {
  const ids = [...DEVIATION_BY_ID.keys()].sort();
  assert.deepStrictEqual(ids, ["ncr-0091", "ncr-0104", "ncr-0118"], "DEVIATION_BY_ID's key set moved");
});

test("PEOPLE has exactly the four referenced keys", () => {
  assert.deepStrictEqual(
    Object.keys(PEOPLE).sort(),
    ["millwright", "ndt", "qc", "test"],
    "PEOPLE's key set moved — reliability, supervisor and planner were referenced only by the excluded surface",
  );
});

test("DOC_BY_CODE has six entries", () => {
  assert.equal(DOC_BY_CODE.size, 6, "DOC_BY_CODE should carry all six governing documents, untrimmed");
});

test("SCENE_VERSION equals the copied plant's own version", () => {
  assert.equal(SCENE_VERSION, "ref-plant/2026.07.3", "SCENE_VERSION moved");
});

/* ---------------------------------------------------------------
   Fact-id assertions — every kept record's sorted fact ids, exactly.
   --------------------------------------------------------------- */

const EXPECTED_FACT_IDS = {
  "m-ap003": ["f-ap003-hours", "f-ap003-last", "f-ap003-next", "f-ap003-status", "f-ap003-vib"],
  "m-aa101": ["f-aa101-last", "f-aa101-next", "f-aa101-seat"],
  "m-aa102": ["f-aa102-last", "f-aa102-state"],
  "m-aa601": ["f-aa601-cert", "f-aa601-last", "f-aa601-next", "f-aa601-seal"],
  "m-aa602": ["f-aa602-cert", "f-aa602-last", "f-aa602-next", "f-aa602-trevi"],
  "m-aa605": ["f-aa605-cert", "f-aa605-next"],
  "m-as001": ["f-as001-clean", "f-as001-dp"],
  "m-bb001": ["f-bb001-insp", "f-bb001-mawp", "f-bb001-next"],
  "m-ac001": ["f-ac001-clean", "f-ac001-duty"],
  "m-gs001": ["f-gs001-due", "f-gs001-iso", "f-gs001-test"],
  "m-an001": ["f-an001-due", "f-an001-stroke"],
};

test("every kept record's sorted fact ids match RESEARCH's per-record map", () => {
  let total = 0;
  for (const [id, expected] of Object.entries(EXPECTED_FACT_IDS)) {
    const record = MACHINERY_BY_ID.get(id);
    assert.ok(record, `MACHINERY_BY_ID is missing ${id}`);
    const actual = record.facts.map((f) => f.id).sort();
    assert.deepStrictEqual(actual, expected, `${id}'s fact ids moved`);
    total += actual.length;
  }
  assert.equal(total, 32, "the subset should define exactly thirty-two facts across the eleven records");
});

test("f-aa605-cert's value is exactly 'Certified' — the referral fixture's cited row", () => {
  const record = MACHINERY_BY_ID.get("m-aa605");
  const fact = record.facts.find((f) => f.id === "f-aa605-cert");
  assert.ok(fact, "m-aa605 is missing f-aa605-cert");
  assert.equal(fact.value, "Certified", "f-aa605-cert's value drifted from the source it will be quoted against");
});

/* ---------------------------------------------------------------
   Exclusion assertions (RESEARCH Pitfall 1) — the anchor and
   session-provenance surface must be fully absent from the module.
   --------------------------------------------------------------- */

test("the anchor and session-provenance surface is absent from plant.ts (RESEARCH Pitfall 1)", () => {
  assert.equal(Plant.ANCHORS, undefined, "ANCHORS must not be exported — it binds to the excluded Anchor type");
  assert.equal(Plant.ANCHOR_BY_MACHINERY, undefined, "ANCHOR_BY_MACHINERY must not be exported");
  assert.equal(Plant.anchorsInZone, undefined, "anchorsInZone must not be exported");
  assert.equal(Plant.CAPTURE_SESSIONS, undefined, "CAPTURE_SESSIONS must not be exported — it binds to the excluded CaptureSession type");
});

/* ---------------------------------------------------------------
   Referential-integrity assertions — the trim left no dangling
   reference.
   --------------------------------------------------------------- */

test("every kept record's zone_id resolves in ZONE_BY_ID", () => {
  for (const record of MACHINERY_BY_ID.values()) {
    assert.ok(
      ZONE_BY_ID.has(record.zone_id),
      `${record.id}'s zone_id (${record.zone_id}) does not resolve in ZONE_BY_ID — the trim left a dangling zone reference`,
    );
  }
});

test("every id in every kept record's deviations[] resolves in DEVIATION_BY_ID", () => {
  for (const record of MACHINERY_BY_ID.values()) {
    for (const deviationId of record.deviations) {
      assert.ok(
        DEVIATION_BY_ID.has(deviationId),
        `${record.id}'s deviation ${deviationId} does not resolve in DEVIATION_BY_ID — the trim left a dangling deviation reference`,
      );
    }
  }
});

test("every code in every kept record's governing_docs[] resolves in DOC_BY_CODE", () => {
  for (const record of MACHINERY_BY_ID.values()) {
    for (const code of record.governing_docs) {
      assert.ok(
        DOC_BY_CODE.has(code),
        `${record.id}'s governing doc ${code} does not resolve in DOC_BY_CODE — the trim left a dangling document reference`,
      );
    }
  }
});

/* ---------------------------------------------------------------
   Accounts — the three doors (D-20).
   --------------------------------------------------------------- */

test("ARTISANS is the closed set of three doors, in order, with display-only rbac_tier (D-20)", () => {
  assert.deepStrictEqual(
    ARTISANS.map((a) => a.id),
    ["acc-mabaso", "acc-naidoo", "acc-vanwyk"],
    "ARTISANS' id order moved",
  );
  assert.deepStrictEqual(
    ARTISANS.map((a) => a.rbac_tier),
    ["field_technician", "site_supervisor", "field_technician"],
    "ARTISANS' rbac_tier order moved — K. Naidoo alone must carry site_supervisor (D-20)",
  );
  for (const artisan of ARTISANS) {
    assert.ok(
      ARTISAN_TRADES.includes(artisan.trade),
      `${artisan.id}'s trade (${artisan.trade}) is not a member of ARTISAN_TRADES`,
    );
    assert.ok(
      RBAC_ORDER.includes(artisan.rbac_tier),
      `${artisan.id}'s rbac_tier (${artisan.rbac_tier}) is not a member of RBAC_ORDER`,
    );
  }
  const mabaso = ARTISAN_BY_ID.get("acc-mabaso");
  assert.ok(mabaso, "ARTISAN_BY_ID is missing acc-mabaso");
  assert.equal(
    mabaso.name,
    PEOPLE.millwright.name,
    "acc-mabaso's name has drifted from PEOPLE.millwright — the account and the plant record must agree",
  );
  assert.equal(
    mabaso.competency,
    PEOPLE.millwright.competency,
    "acc-mabaso's competency has drifted from PEOPLE.millwright — the account and the plant record must agree",
  );
});

/* ---------------------------------------------------------------
   Orders — the five work orders, id and number as two fields
   (D-CONV).
   --------------------------------------------------------------- */

test("ORDERS is the closed set of five, in order, with id and number as two distinct fields (D-CONV)", () => {
  assert.deepStrictEqual(
    ORDERS.map((o) => o.id),
    ["wo-0142", "wo-0151", "wo-0137", "wo-0129", "wo-0133"],
    "ORDERS' id order moved",
  );
  assert.deepStrictEqual(
    ORDERS.map((o) => o.number),
    ["WO-2026-0142", "WO-2026-0151", "WO-2026-0137", "WO-2026-0129", "WO-2026-0133"],
    "ORDERS' number order moved",
  );
  for (const order of ORDERS) {
    assert.notEqual(
      order.id,
      order.number,
      `${order.id}'s id equals its own number — the two-field discipline (D-CONV) has collapsed`,
    );
    assert.ok(
      !ORDER_BY_ID.has(order.number),
      `${order.number} is a key of ORDER_BY_ID — the display number must never be usable as the internal id`,
    );
    assert.equal(order.status, "assigned", `${order.id}'s status is not "assigned"`);
    assert.equal(
      order.provenance.system_of_record,
      "ERP",
      `${order.id}'s provenance.system_of_record is not "ERP" — a work order is a record the ERP states`,
    );
  }
});

/* ---------------------------------------------------------------
   Referential integrity — every order resolves to real accounts,
   zones, assets and documents.
   --------------------------------------------------------------- */

test("every order's assigned_to, zone_id, asset_ids and governing_docs resolve in the fixture set", () => {
  for (const order of ORDERS) {
    assert.ok(
      ARTISAN_BY_ID.has(order.assigned_to),
      `${order.id}'s assigned_to (${order.assigned_to}) does not resolve in ARTISAN_BY_ID`,
    );
    assert.ok(
      ZONE_BY_ID.has(order.zone_id),
      `${order.id}'s zone_id (${order.zone_id}) does not resolve in ZONE_BY_ID`,
    );
    for (const assetId of order.asset_ids) {
      assert.ok(
        MACHINERY_BY_ID.has(assetId),
        `${order.id}'s asset_ids entry (${assetId}) does not resolve in MACHINERY_BY_ID`,
      );
    }
    for (const code of order.governing_docs) {
      assert.ok(
        DOC_BY_CODE.has(code),
        `${order.id}'s governing_docs entry (${code}) does not resolve in DOC_BY_CODE`,
      );
    }
  }
});

test("the union of all five orders' asset_ids is exactly the ten assigned assets, and the referral target is on none of them", () => {
  const union = new Set(ORDERS.flatMap((o) => o.asset_ids));
  assert.deepStrictEqual(
    [...union].sort(),
    [
      "m-aa101",
      "m-aa102",
      "m-aa601",
      "m-aa602",
      "m-ac001",
      "m-an001",
      "m-ap003",
      "m-as001",
      "m-bb001",
      "m-gs001",
    ],
    "the union of every order's asset_ids moved",
  );
  assert.ok(MACHINERY_BY_ID.has("m-aa605"), "m-aa605 must be present in MACHINERY_BY_ID");
  assert.ok(
    !union.has("m-aa605"),
    "m-aa605 must appear in no order's asset_ids — it is the referral fixture's own target, on nobody's order",
  );
});

/* ---------------------------------------------------------------
   Assignment symmetry — ORDER_IDS_BY_ARTISAN and each order's own
   assigned_to must agree.
   --------------------------------------------------------------- */

test("ORDER_IDS_BY_ARTISAN agrees with each order's own assigned_to", () => {
  for (const artisan of ARTISANS) {
    const fromOrders = ORDERS.filter((o) => o.assigned_to === artisan.id)
      .map((o) => o.id)
      .sort();
    const fromMap = [...(ORDER_IDS_BY_ARTISAN[artisan.id] ?? [])].sort();
    assert.deepStrictEqual(
      fromMap,
      fromOrders,
      `${artisan.id}'s ORDER_IDS_BY_ARTISAN entry disagrees with ORDERS' own assigned_to`,
    );
  }
});

/* ---------------------------------------------------------------
   Display-only tier — rbac_tier is read by nothing under lib/data
   (D-20, AD-2, FR-57), proved from source text with comments
   stripped so the warning comment above ARTISANS cannot satisfy its
   own assertion.
   --------------------------------------------------------------- */

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("rbac_tier is carried only as a record field in artisans.ts, and is absent entirely from orders.ts (display-only tier)", async () => {
  const root = repoRoot();
  const artisansSource = stripComments(
    await readFile(path.join(root, "lib/data/artisans.ts"), "utf8"),
  );
  const ordersSource = stripComments(
    await readFile(path.join(root, "lib/data/orders.ts"), "utf8"),
  );

  const artisansMatches = artisansSource.match(/rbac_tier/g) ?? [];
  assert.equal(
    artisansMatches.length,
    3,
    "artisans.ts should mention rbac_tier exactly three times with comments stripped — once per record field — not as part of any function",
  );
  assert.ok(
    !/function[^{]*\{[^}]*rbac_tier/.test(artisansSource) &&
      !/=>\s*\{[^}]*rbac_tier/.test(artisansSource),
    "a function or arrow-function body in artisans.ts appears to read rbac_tier — the field must be carried, never read (D-20, AD-2, FR-57)",
  );

  assert.ok(
    !ordersSource.includes("rbac_tier"),
    "orders.ts must not mention rbac_tier at all — the assignment plane never carries the display-only tier",
  );
});

/* ---------------------------------------------------------------
   FR-21a provenance check — structural completeness guard (D-02,
   D-03, D-04, AD-15, T-2-24).

   This is a STRUCTURAL guard only: it proves the signed file cannot
   silently lose a verdict, gain an unaccounted row, or lose its
   reviewer/date, on a later edit. It is never a substitute for the
   judgment recorded in the verdict cells themselves — that judgment
   is the human provenance check's, performed once at plan 02-06's
   checkpoint and never re-run by a machine.
   --------------------------------------------------------------- */

const VALID_VERDICTS = ["confirmed", "reworded", "re-cited", "dropped"];

function parseMainTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.startsWith("## Main table"));
  assert.ok(startIndex !== -1, "provenance-check.md is missing its '## Main table' heading");

  const rows = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) break; // next section
    if (!line.startsWith("|")) continue;
    if (/^\|[\s-]*\|/.test(line) && line.includes("---")) continue; // header separator
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells[0] === "Observation id") continue; // header row itself
    rows.push(cells);
  }
  return rows;
}

test("provenance-check.md's main table has one row per OBSERVATIONS entry, matched by id (FR-21a structural guard)", async () => {
  const root = repoRoot();
  const markdown = await readFile(path.join(root, "docs/analysis/provenance-check.md"), "utf8");
  const rows = parseMainTable(markdown);

  assert.equal(
    rows.length,
    OBSERVATIONS.length,
    `provenance-check.md's main table has ${rows.length} rows; OBSERVATIONS has ${OBSERVATIONS.length}`,
  );

  const observationIds = new Set(OBSERVATIONS.map((o) => o.id));
  for (const cells of rows) {
    const observationId = cells[0];
    const verdict = cells[8];
    const isKnownId = observationIds.has(observationId);
    const isDropped = verdict === "dropped";
    assert.ok(
      isKnownId || isDropped,
      `row '${observationId}' matches no id in OBSERVATIONS and does not carry the verdict 'dropped'`,
    );
  }
});

test("every row of provenance-check.md's main table carries one of the four verdicts (FR-21a structural guard)", async () => {
  const root = repoRoot();
  const markdown = await readFile(path.join(root, "docs/analysis/provenance-check.md"), "utf8");
  const rows = parseMainTable(markdown);

  assert.ok(rows.length > 0, "provenance-check.md's main table has no rows to check");
  for (const cells of rows) {
    const observationId = cells[0];
    const verdict = cells[8];
    assert.ok(
      VALID_VERDICTS.includes(verdict),
      `row '${observationId}' carries verdict '${verdict}', not one of ${VALID_VERDICTS.join(", ")}`,
    );
  }
});

test("provenance-check.md carries a non-empty reviewer name and date on every row (FR-21a structural guard)", async () => {
  const root = repoRoot();
  const markdown = await readFile(path.join(root, "docs/analysis/provenance-check.md"), "utf8");
  const rows = parseMainTable(markdown);

  assert.ok(rows.length > 0, "provenance-check.md's main table has no rows to check");
  for (const cells of rows) {
    const observationId = cells[0];
    const reviewer = cells[9];
    const date = cells[10];
    assert.ok(reviewer && reviewer.length > 0, `row '${observationId}' has no reviewer name`);
    assert.ok(date && date.length > 0, `row '${observationId}' has no date`);
  }

  assert.match(
    markdown,
    /Recorded \d{4}-\d{2}-\d{2}\./,
    "provenance-check.md is missing its closing 'Recorded <date>.' line",
  );
});
