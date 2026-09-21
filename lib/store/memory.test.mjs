/* ================================================================
   MEMORY STORE — unit tests (AD-10)

   Plain node:test assertions, no build and no server — joins
   scripts/verify.mjs's "unit-suite" step (03-01) alongside
   lib/limits and lib/copy. Imports nothing from "next".

   Tests run in registration order (node:test's default, no
   concurrency requested), which matters here: this file shares one
   in-process copy of the store's module-level Maps across every test
   below, exactly as multiple requests within one running instance
   would. The cross-account flood test deliberately pushes the global
   object count up to STORE_GLOBAL_OBJECT_MAX and is placed LAST for
   exactly that reason — every other test needs the count to stay
   comfortably below the ceiling so its own small writes are never
   mistaken for the overage that triggers an eviction pass.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import * as store from "./memory.ts";
import {
  CAPTURES_PER_ACCOUNT_MAX,
  CLOCK_SEGMENTS_PER_ACCOUNT_MAX,
  STORE_GLOBAL_OBJECT_MAX,
  EVICTION_RECORD_PER_ACCOUNT_MAX,
} from "../limits/index.ts";

function makeCapture(id, overrides = {}) {
  return {
    id,
    order_id: "wo-test",
    asset_id: "asset-test",
    kind: "photo",
    purpose: "evidence",
    captured_at: new Date().toISOString(),
    mime: "image/jpeg",
    bytes: 1024,
    sha256: "0".repeat(64),
    captured_by: "acc-test",
    recorded_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeProposal(id) {
  return {
    id,
    capture_id: `cap-for-${id}`,
    asset_id: "asset-test",
    order_id: "wo-test",
    observation_id: `obs-for-${id}`,
    observation: "Test observation, not read for its wording here.",
    provenance: {
      source_uri: "fixture://test",
      source_version: "v1",
      extracted_at: new Date().toISOString(),
      confidence: null,
      grade: "EXTRACTED",
      source_label: "Test Fixture",
      system_of_record: "ERP",
      extractor: "authored",
    },
    issued_at: new Date().toISOString(),
    state: "open",
  };
}

test("BOOT_ID is a v4 UUID and is the same value across two reads in one process", () => {
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.ok(uuidV4.test(store.BOOT_ID), "BOOT_ID should be a v4 UUID");
  const firstRead = store.BOOT_ID;
  const secondRead = store.BOOT_ID;
  assert.equal(firstRead, secondRead);
});

test("writing more than CAPTURES_PER_ACCOUNT_MAX captures leaves exactly that many, survivors are the most recent", () => {
  const account = "acc-capture-eviction";
  const overshootBy = 5;
  const total = CAPTURES_PER_ACCOUNT_MAX + overshootBy;
  for (let i = 0; i < total; i += 1) {
    store.writeCapture(account, makeCapture(`cap-${i}`));
  }
  const captures = store.readCaptures(account);
  assert.equal(captures.length, CAPTURES_PER_ACCOUNT_MAX);
  const ids = new Set(captures.map((c) => c.id));
  for (let i = 0; i < overshootBy; i += 1) {
    assert.ok(!ids.has(`cap-${i}`), `cap-${i} should have been evicted (oldest-first)`);
  }
  assert.ok(ids.has(`cap-${total - 1}`), "the most recently written capture should survive");
});

test("readLastContact is null before stampLastContact, a number after; stampLastContact takes no time argument", () => {
  const account = "acc-last-contact";
  assert.equal(store.readLastContact(account), null);
  assert.equal(store.stampLastContact.length, 1, "stampLastContact must declare exactly one parameter");
  store.stampLastContact(account);
  const at = store.readLastContact(account);
  assert.equal(typeof at, "number");
  assert.ok(at > 0);
});

test("reads return defensive copies: mutating a returned value does not change what the next read sees", () => {
  const account = "acc-defensive-copy";
  store.writeCapture(account, makeCapture("cap-defensive"));
  const first = store.readCaptures(account);
  first[0].sha256 = "f".repeat(64);
  first.push(makeCapture("injected-by-the-test"));
  const second = store.readCaptures(account);
  assert.equal(second.length, 1);
  assert.equal(second[0].id, "cap-defensive");
  assert.notEqual(second[0].sha256, "f".repeat(64));
});

test("storeStats returns all seven keys and total is the sum of the six counts", () => {
  const stats = store.storeStats();
  assert.deepEqual(
    Object.keys(stats).sort(),
    ["attempts", "captures", "clock_segments", "decisions", "proposals", "seen", "total"],
  );
  const sum =
    stats.captures + stats.proposals + stats.decisions + stats.clock_segments + stats.seen + stats.attempts;
  assert.equal(stats.total, sum);
});

test("the eviction record itself is bounded at EVICTION_RECORD_PER_ACCOUNT_MAX, oldest-first", () => {
  const account = "acc-eviction-ledger-bound";
  const overshootBy = 20;
  const total = EVICTION_RECORD_PER_ACCOUNT_MAX + overshootBy;
  for (let i = 0; i < total; i += 1) {
    store.recordEviction(account, `evicted-${i}`);
  }
  for (let i = 0; i < overshootBy; i += 1) {
    assert.equal(store.wasEvicted(account, `evicted-${i}`), false, `evicted-${i} should have fallen off the ledger`);
  }
  for (let i = overshootBy; i < total; i += 1) {
    assert.equal(store.wasEvicted(account, `evicted-${i}`), true, `evicted-${i} should still be on the ledger`);
  }
});

test("clock segments are bounded at CLOCK_SEGMENTS_PER_ACCOUNT_MAX across the account's orders, oldest-closed-first", () => {
  const account = "acc-clock-segment-cap";
  const orderId = "wo-segment-cap";
  const cycles = CLOCK_SEGMENTS_PER_ACCOUNT_MAX + 20;

  // Open/close the SAME order repeatedly — one order, many segments.
  // This is the growth the cap is named for and used to miss entirely,
  // because it was compared against the clocks map's size (order
  // count), which never exceeds the orders an account holds.
  for (let i = 0; i < cycles; i += 1) {
    store.writeClockSegment(account, orderId, { opened_at: new Date().toISOString(), source: "server" });
    store.closeClockSegment(account, orderId);
  }

  const clock = store.readClock(account, orderId);
  assert.ok(clock, "the clock must still be present");
  assert.ok(
    clock.segments.length <= CLOCK_SEGMENTS_PER_ACCOUNT_MAX,
    `expected at most ${CLOCK_SEGMENTS_PER_ACCOUNT_MAX} segments, got ${clock.segments.length}`,
  );

  // A running segment is never the one evicted: open once more and
  // keep it running while the cap is already reached.
  store.writeClockSegment(account, orderId, { opened_at: new Date().toISOString(), source: "server" });
  const withRunning = store.readClock(account, orderId);
  assert.ok(
    withRunning.segments.length <= CLOCK_SEGMENTS_PER_ACCOUNT_MAX,
    "the cap still holds once a running segment is added",
  );
  assert.equal(
    withRunning.segments.filter((segment) => segment.closed_at === null).length,
    1,
    "the running segment must survive the eviction pass",
  );
  assert.equal(
    withRunning.segments[withRunning.segments.length - 1].closed_at,
    null,
    "and it must still be the most recent segment",
  );

  // The global counter sees segments now, so this growth is visible in
  // the same number STORE_GLOBAL_OBJECT_MAX bounds.
  assert.ok(store.storeStats().total >= withRunning.segments.length);

  store.closeClockSegment(account, orderId);
});

// Global-cap enforcement, cross-account safety, and wasEvicted are all one
// scenario and share one test for a deliberate reason: once any test pushes
// the store's total to STORE_GLOBAL_OBJECT_MAX, EVERY later write anywhere
// in this file becomes "the write that overflowed the cap" and triggers an
// eviction pass — so only ONE test in this file is allowed to fill the
// store to the brim, and it is this one, placed LAST. Splitting the
// single-item-eviction assertion and the cross-account assertion into two
// separate tests would leave the store sitting at capacity between them,
// and the second test's own unrelated write would be evicted before the
// flood it was trying to isolate ever ran.
test("global cap: eviction is scoped to the offending account, oldest-first, and wasEvicted reflects it", () => {
  const victim = "acc-flood-victim";
  const flooder = "acc-flood-source";

  // The victim's own record, written while every earlier test in this file
  // has only added a small, bounded number of objects — there is still
  // comfortable headroom below STORE_GLOBAL_OBJECT_MAX at this point.
  store.writeCapture(victim, makeCapture("victim-cap-1"));
  assert.equal(
    store.readCaptures(victim).length,
    1,
    "the victim's capture must survive its own, unpressured insert",
  );

  // Flood a DIFFERENT account past the global cap in one call.
  const priorTotal = store.storeStats().total;
  const room = STORE_GLOBAL_OBJECT_MAX - priorTotal;
  const overshootBy = 25;
  const items = [];
  for (let i = 0; i < room + overshootBy; i += 1) items.push(makeProposal(`flood-${i}`));
  store.writeProposals(flooder, items);

  // The victim's single, unrelated capture is untouched by the flood.
  const victimCaptures = store.readCaptures(victim);
  assert.equal(victimCaptures.length, 1, "the victim account's single capture must survive the flood");
  assert.equal(victimCaptures[0].id, "victim-cap-1");

  // The flood evicted its own oldest entries (oldest-first, within the
  // offending account only) rather than merely refusing to grow.
  assert.equal(store.wasEvicted(flooder, "flood-0"), true, "the oldest flood item should have been evicted");
  assert.equal(
    store.wasEvicted(flooder, `flood-${overshootBy}`),
    false,
    "the oldest-surviving flood item should not be marked evicted",
  );
  assert.ok(store.storeStats().total <= STORE_GLOBAL_OBJECT_MAX, "the global cap itself must hold");
});
