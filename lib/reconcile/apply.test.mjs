import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Pinned before any signing happens (lazy-resolved on first call, per
// lib/session/key.ts) so mintSession/verifySessionValue exercise a
// real, known key rather than the committed dev fallback.
process.env.CAPTURE_SESSION_KEY = "apply-test-signing-key-0000000000";

const { mintSession, verifySessionValue } = await import("../session/cookie.ts");
const { applyItem, noteContact } = await import("./apply.ts");
const { readAttempts, readUnattributedAttempts, readLastContact, readClock } = await import(
  "../store/memory.ts"
);

function sessionFor(accountId) {
  const { value } = mintSession(accountId);
  return verifySessionValue(value);
}

/** A well-shaped order_open SyncItem<unknown>, with sensible defaults
    a test overrides only where its own assertion needs to. `state`
    defaults to "sending" (not "queued") so these tests exercise the
    immediate path once a later commit adds arrived_via detection. */
function makeItem(accountId, overrides = {}) {
  return {
    client_id: randomUUID(),
    kind: "order_open",
    schema_version: 1,
    order_id: "wo-0142",
    created_at: new Date().toISOString(),
    attempts: 0,
    state: "sending",
    claimed_account_id: accountId,
    payload: {},
    ...overrides,
  };
}

function withoutClientId(result) {
  const { client_id: _drop, ...rest } = result;
  return rest;
}

/* ----------------------------------------------------------------
   1. session
   ---------------------------------------------------------------- */

test("an unresolved session yields no_session, a rejected result, and one entry in the unattributed attempt ring", async () => {
  const item = makeItem("acc-mabaso");
  const before = readUnattributedAttempts().length;

  const outcome = await applyItem({ ok: false, reason: "absent" }, item);

  assert.equal(outcome.code, "no_session");
  assert.equal(outcome.result.status, "rejected");
  const after = readUnattributedAttempts();
  assert.equal(after.length, before + 1);
  const last = after[after.length - 1];
  assert.equal(last.account_id, null);
  assert.equal(last.client_id, item.client_id);
  assert.equal(last.outcome, "rejected");
});

/* ----------------------------------------------------------------
   2. ownership
   ---------------------------------------------------------------- */

test("an unowned order and a fabricated order id yield deep-equal results (FR-6's unit half)", async () => {
  const session = sessionFor("acc-mabaso");
  const unownedItem = makeItem("acc-mabaso", { order_id: "wo-0137" }); // real order, owned by acc-naidoo
  const fabricatedItem = makeItem("acc-mabaso", { order_id: "wo-9999" }); // no such order anywhere

  const unowned = await applyItem(session, unownedItem);
  const fabricated = await applyItem(session, fabricatedItem);

  assert.equal(unowned.code, "order_not_found");
  assert.equal(fabricated.code, "order_not_found");
  assert.deepEqual(withoutClientId(unowned.result), withoutClientId(fabricated.result));
});

test("an item whose claimed_account_id names another account yields account_mismatch", async () => {
  const session = sessionFor("acc-mabaso");
  const item = makeItem("acc-mabaso", { order_id: "wo-0142", claimed_account_id: "acc-naidoo" });

  const outcome = await applyItem(session, item);

  assert.equal(outcome.code, "account_mismatch");
  assert.equal(outcome.result.status, "conflict");
});

/* ----------------------------------------------------------------
   3. idempotency
   ---------------------------------------------------------------- */

test("the same client_id with the same payload twice yields recorded then duplicate, and writes no second segment", async () => {
  const session = sessionFor("acc-mabaso");
  const clientId = randomUUID();
  const item = makeItem("acc-mabaso", { client_id: clientId, order_id: "wo-0151" });

  const first = await applyItem(session, item);
  assert.equal(first.result.status, "recorded");
  assert.equal(first.code, null);

  const second = await applyItem(session, item);
  assert.equal(second.result.status, "duplicate");
  assert.equal(second.code, null);

  const clock = readClock("acc-mabaso", "wo-0151");
  assert.equal(clock.segments.length, 1);
});

test("the same client_id with a changed enumerated field yields already_recorded_differently", async () => {
  const session = sessionFor("acc-vanwyk");
  const clientId = randomUUID();
  const first = await applyItem(
    session,
    makeItem("acc-vanwyk", { client_id: clientId, order_id: "wo-0133", payload: {} }),
  );
  assert.equal(first.result.status, "recorded");

  const second = await applyItem(
    session,
    makeItem("acc-vanwyk", {
      client_id: clientId,
      order_id: "wo-0133",
      payload: { device_claimed_opened_at: "2026-01-01T00:00:00Z" },
    }),
  );
  assert.equal(second.result.status, "conflict");
  assert.equal(second.code, "already_recorded_differently");
});

test("the same client_id under two different accounts yields two independent recorded results", async () => {
  const clientId = randomUUID();
  const mabasoOutcome = await applyItem(
    sessionFor("acc-mabaso"),
    makeItem("acc-mabaso", { client_id: clientId, order_id: "wo-0142" }),
  );
  const naidooOutcome = await applyItem(
    sessionFor("acc-naidoo"),
    makeItem("acc-naidoo", { client_id: clientId, order_id: "wo-0137" }),
  );

  assert.equal(mabasoOutcome.result.status, "recorded");
  assert.equal(naidooOutcome.result.status, "recorded");
  assert.equal(readClock("acc-mabaso", "wo-0142").segments.length, 1);
  assert.equal(readClock("acc-naidoo", "wo-0137").segments.length, 1);
});

/* ----------------------------------------------------------------
   4. shape
   ---------------------------------------------------------------- */

test("a referral item yields unknown_kind", async () => {
  const session = sessionFor("acc-vanwyk");
  const item = makeItem("acc-vanwyk", { order_id: "wo-0129", kind: "referral" });

  const outcome = await applyItem(session, item);

  assert.equal(outcome.code, "unknown_kind");
  assert.equal(outcome.result.status, "rejected");
});

/* ----------------------------------------------------------------
   Every path retains an attempt (FR-60)
   ---------------------------------------------------------------- */

test("an attempt entry is written on the success path as well as on every refusal path", async () => {
  const session = sessionFor("acc-mabaso");

  // wo-0151 already has an open segment from an earlier test in this
  // file, so this is applyByKind's own business-level duplicate — a
  // terminal, successful outcome, not a refusal.
  const beforeSuccess = readAttempts("acc-mabaso").length;
  const successOutcome = await applyItem(session, makeItem("acc-mabaso", { order_id: "wo-0151" }));
  assert.equal(successOutcome.result.status, "duplicate");
  assert.equal(readAttempts("acc-mabaso").length, beforeSuccess + 1);

  const beforeRefusal = readAttempts("acc-mabaso").length;
  const refusalOutcome = await applyItem(session, makeItem("acc-mabaso", { order_id: "wo-9999" }));
  assert.equal(refusalOutcome.result.status, "conflict");
  assert.equal(readAttempts("acc-mabaso").length, beforeRefusal + 1);
});

/* ----------------------------------------------------------------
   noteContact (D-07)
   ---------------------------------------------------------------- */

test("noteContact takes exactly one parameter and moves readLastContact from null to a number", () => {
  assert.equal(noteContact.length, 1);
  assert.equal(readLastContact("acc-naidoo"), null);

  noteContact({ account_id: "acc-naidoo", artisan: null, session: null });

  const after = readLastContact("acc-naidoo");
  assert.equal(typeof after, "number");
});
