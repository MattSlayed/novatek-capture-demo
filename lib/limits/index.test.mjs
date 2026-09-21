/* ================================================================
   LIMITS — unit tests (AD-13)

   The project's first unit-suite file under lib/, discovered by
   scripts/verify.mjs's new "unit-suite" step (node --test over every
   lib-scoped test file). Plain node:test assertions, no build and no
   server: fast enough to run early, before next-build.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import * as limits from "./index.ts";

/** Enumerated by name so a new export cannot land without joining
    this list — the closed-set discipline this project uses
    everywhere else (CONFLICT_CODES, REJECT_CODES, ...) applied to a
    config module instead of a data module. */
const EXPORT_NAMES = [
  "THUMB_MAX_ENCODED_BYTES",
  "THUMB_CLIENT_TARGET_ENCODED_BYTES",
  "CAPTURES_PER_ACCOUNT_MAX",
  "DECISIONS_PER_ACCOUNT_MAX",
  "CLOCK_SEGMENTS_PER_ACCOUNT_MAX",
  "SEEN_ENTRIES_PER_ACCOUNT_MAX",
  "STORE_GLOBAL_OBJECT_MAX",
  "STORE_TTL_SECONDS",
  "SESSION_COOKIE_MAX_AGE_SECONDS",
  "ONLINE_CLOCK_OFFSET_WINDOW_SECONDS",
  "QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS",
  "QUEUED_CLOCK_FLOOR_SLACK_SECONDS",
  "SYNC_MAX_ITEMS",
  "SYNC_MAX_ENCODED_BYTES",
  "CAPTURE_MAX_DECLARED_BYTES",
  "VOICE_MAX_DURATION_MS",
  "MIME_MAX_CHARS",
  "NOTE_MAX_CHARS",
  "CAPTURE_BODY_MAX_ENCODED_BYTES",
  "EVICTION_RECORD_PER_ACCOUNT_MAX",
];

test("every export is a positive, finite, integer Number, enumerated by name", () => {
  for (const name of EXPORT_NAMES) {
    const value = limits[name];
    assert.equal(typeof value, "number", `${name} should be a number`);
    assert.ok(Number.isFinite(value), `${name} should be finite`);
    assert.ok(Number.isInteger(value), `${name} should be an integer`);
    assert.ok(value > 0, `${name} should be positive`);
  }
});

test("THUMB_CLIENT_TARGET_ENCODED_BYTES is strictly less than THUMB_MAX_ENCODED_BYTES (AD-13)", () => {
  assert.ok(limits.THUMB_CLIENT_TARGET_ENCODED_BYTES < limits.THUMB_MAX_ENCODED_BYTES);
});

test("QUEUED_CLOCK_FLOOR_SLACK_SECONDS is strictly less than QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS", () => {
  assert.ok(limits.QUEUED_CLOCK_FLOOR_SLACK_SECONDS < limits.QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS);
});

test("SEEN_ENTRIES_PER_ACCOUNT_MAX is strictly less than STORE_GLOBAL_OBJECT_MAX", () => {
  assert.ok(limits.SEEN_ENTRIES_PER_ACCOUNT_MAX < limits.STORE_GLOBAL_OBJECT_MAX);
});

test("CAPTURE_BODY_MAX_ENCODED_BYTES leaves room above THUMB_MAX_ENCODED_BYTES (AD-13)", () => {
  // A capture body at the thumbnail ceiling still carries its own
  // identifiers, timestamps and digest, so the body ceiling must be
  // strictly greater than the thumbnail one — and strictly below the
  // batch ceiling, which covers up to SYNC_MAX_ITEMS of them at once.
  assert.ok(limits.CAPTURE_BODY_MAX_ENCODED_BYTES > limits.THUMB_MAX_ENCODED_BYTES);
  assert.ok(limits.CAPTURE_BODY_MAX_ENCODED_BYTES < limits.SYNC_MAX_ENCODED_BYTES);
});

test("the module exports nothing whose name is not in the enumerated list", () => {
  const actual = Object.keys(limits).sort();
  const expected = [...EXPORT_NAMES].sort();
  assert.deepStrictEqual(actual, expected);
});
