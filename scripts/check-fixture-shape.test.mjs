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

// .ts extension required — this is a .mjs file, the entry point of
// the chain (Node 24 native TypeScript stripping). The modules' own
// internal imports stay extension-free.
import {
  OBSERVATION_KINDS,
  OBSERVATION_GRADES,
  OBSERVATION_RELATIONS,
  ARTISAN_TRADES,
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

test("CONFLICT_CODES is the closed set of eight, ending in referral_evidence_missing", () => {
  assert.deepStrictEqual(CONFLICT_CODES, [
    "order_not_found",
    "order_closed",
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
