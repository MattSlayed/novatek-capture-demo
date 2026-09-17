/* ================================================================
   CONFLICT AND REJECT COPY — unit tests (D-06)

   Plain node:test assertions, no build and no server, discovered by
   scripts/verify.mjs's "unit-suite" step.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { CONFLICT_COPY, REJECT_COPY, TRANSPORT_COPY } from "./conflicts.ts";
import { CONFLICT_CODES, REJECT_CODES } from "../data/types.ts";
import { GOVERNED, PLATFORM_413 } from "./governed.ts";

const TRANSPORT_CODES = [
  "no_session",
  "unknown_persona",
  "bad_request",
  "method_not_allowed",
  "batch_too_large",
];

// The two P9 gaps (Task 3's explicit, empty placeholders) are exempt
// from the "every sentence is non-empty" and "every actions array is
// non-empty" checks below — they carry no sentence on purpose.
const P9_PLACEHOLDERS = new Set(["referral_evidence_missing", "unknown_referral"]);

function allEntries() {
  return [
    ...Object.entries(CONFLICT_COPY),
    ...Object.entries(REJECT_COPY),
    ...Object.entries(TRANSPORT_COPY),
  ];
}

test("Object.keys(CONFLICT_COPY) is exactly the CONFLICT_CODES set", () => {
  assert.deepStrictEqual(Object.keys(CONFLICT_COPY).sort(), [...CONFLICT_CODES].sort());
});

test("Object.keys(REJECT_COPY) is exactly the REJECT_CODES set", () => {
  assert.deepStrictEqual(Object.keys(REJECT_COPY).sort(), [...REJECT_CODES].sort());
});

test("Object.keys(TRANSPORT_COPY) is exactly the five TransportErrorCode members", () => {
  assert.deepStrictEqual(Object.keys(TRANSPORT_COPY).sort(), [...TRANSPORT_CODES].sort());
});

test("every sentence other than the two P9 placeholders is non-empty, begins with a capital letter and ends with a full stop", () => {
  for (const [code, copy] of allEntries()) {
    if (P9_PLACEHOLDERS.has(code)) continue;
    assert.ok(copy.sentence.length > 0, `${code} must have a non-empty sentence`);
    assert.match(copy.sentence, /^[A-Z]/, `${code}'s sentence must begin with a capital letter`);
    assert.match(copy.sentence, /\.$/, `${code}'s sentence must end with a full stop`);
  }
});

test("every actions array is non-empty for every code with a sentence", () => {
  for (const [code, copy] of allEntries()) {
    if (P9_PLACEHOLDERS.has(code)) continue;
    assert.ok(copy.actions.length > 0, `${code} must carry at least one next act`);
  }
});

test("no sentence contains an exclamation mark (voice rule 6)", () => {
  for (const [code, copy] of allEntries()) {
    assert.ok(!copy.sentence.includes("!"), `${code}'s sentence must carry no exclamation mark`);
  }
});

test("CONFLICT_COPY.not_open carries D-06's exact sentence and actions", () => {
  assert.equal(
    CONFLICT_COPY.not_open.sentence,
    "This order is not open, so there was nothing to close and nothing was bound. Open the order, then close it.",
  );
  assert.deepEqual(CONFLICT_COPY.not_open.actions, ["Discard", "Open the order"]);
});

test("no sentence in CONFLICT_COPY, REJECT_COPY or TRANSPORT_COPY is a substring of any assembled governed sentence", () => {
  const governedSentences = [
    ...Object.values(GOVERNED).map((g) => `${g.before}${g.strong}${g.after}`),
    `${PLATFORM_413.before}${PLATFORM_413.strong}${PLATFORM_413.after}`,
  ];
  for (const [code, copy] of allEntries()) {
    if (!copy.sentence) continue;
    for (const governed of governedSentences) {
      assert.ok(
        !governed.includes(copy.sentence),
        `${code}'s sentence must not be a substring of a governed sentence`,
      );
    }
  }
});
