import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Pinned before any signing happens (lazy-resolved on first call, per
// lib/session/key.ts), mirroring lib/reconcile/apply.test.mjs's own
// setup for the identical reason.
process.env.CAPTURE_SESSION_KEY = "walk-payload-test-signing-key-000";

const { mintSession, verifySessionValue } = await import("../session/cookie.ts");
const { applyItem } = await import("../reconcile/apply.ts");
const { deriveAccount } = await import("../attribution/index.ts");
const { orderOwned } = await import("../access/scope.ts");
const { buildWalkPayload } = await import("./payload.ts");
const { BOOT_ID } = await import("../store/memory.ts");
const { STORE_TTL_SECONDS } = await import("../limits/index.ts");
const { GOVERNED } = await import("../copy/governed.ts");

const SHA256_EXAMPLE = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".slice(0, 64);

// wo-0142 is acc-mabaso's own order, asset_ids m-ap003/m-aa101/m-aa102
// — the identical fixture lib/reconcile/apply.test.mjs already
// exercises. m-ap003 is the one asset whose fixture observations
// authoredProposals() turns into three open proposals on a
// verify-purpose capture; m-aa101 and m-aa102 have none.
const ACCOUNT_ID = "acc-mabaso";
const ORDER_ID = "wo-0142";

function sessionFor(accountId) {
  const { value } = mintSession(accountId);
  return verifySessionValue(value);
}

/** A well-shaped SyncItem<unknown>, defaults to an order_open on this
    file's own order — every other kind overrides `kind`/`payload`.
    `state` stays "sending" (never "queued") so every item here takes
    the immediate path, matching lib/reconcile/apply.test.mjs's own
    convention. */
function makeItem(overrides = {}) {
  return {
    client_id: randomUUID(),
    kind: "order_open",
    schema_version: 1,
    order_id: ORDER_ID,
    created_at: new Date().toISOString(),
    attempts: 0,
    state: "sending",
    claimed_account_id: ACCOUNT_ID,
    payload: {},
    ...overrides,
  };
}

function makeDecisionItem(payloadOverrides = {}) {
  return makeItem({
    order_id: "",
    kind: "decision",
    payload: {
      outcome: "accept",
      decided_at: new Date().toISOString(),
      decided_where_claimed: "online",
      ...payloadOverrides,
    },
  });
}

const session = sessionFor(ACCOUNT_ID);
const account = deriveAccount(session);
assert.ok(account, "fixture setup: acc-mabaso must derive a real account");
const order = orderOwned(account, ORDER_ID);
assert.ok(order, "fixture setup: wo-0142 must be owned by acc-mabaso");

/* ----------------------------------------------------------------
   1. Shape, before anything is recorded for this order
   ---------------------------------------------------------------- */

test("every top-level key is present on a freshly built payload, with one asset entry per order.asset_ids member", () => {
  const payload = buildWalkPayload(account, order);

  assert.equal(payload.schema, "novatek.capture.walk/1");
  assert.equal(typeof payload.issued_at, "string");
  assert.ok(payload.store);
  assert.equal(payload.account, account.account_id);
  assert.deepEqual(payload.order, order);
  assert.ok(payload.clock);
  assert.equal(payload.assets.length, order.asset_ids.length);
  assert.deepEqual(payload.referrals, []);
  assert.ok(payload.redaction);
});

test("store.instance equals BOOT_ID and store.ttl_s equals STORE_TTL_SECONDS", () => {
  const payload = buildWalkPayload(account, order);
  assert.equal(payload.store.kind, "memory");
  assert.equal(payload.store.instance, BOOT_ID);
  assert.equal(payload.store.ttl_s, STORE_TTL_SECONDS);
});

test("store.statement and redaction.statement each equal the concatenation of their own GOVERNED triple, and neither is empty", () => {
  const payload = buildWalkPayload(account, order);
  const memoryStoreSentence =
    GOVERNED.memoryStore.before + GOVERNED.memoryStore.strong + GOVERNED.memoryStore.after;
  const noRedactionSentence =
    GOVERNED.noRedaction.before + GOVERNED.noRedaction.strong + GOVERNED.noRedaction.after;

  assert.equal(payload.store.statement, memoryStoreSentence);
  assert.equal(payload.redaction.statement, noRedactionSentence);
  assert.ok(payload.store.statement.length > 0);
  assert.ok(payload.redaction.statement.length > 0);
});

test("redaction.ran is false and referrals is an empty array", () => {
  const payload = buildWalkPayload(account, order);
  assert.equal(payload.redaction.ran, false);
  assert.deepEqual(payload.referrals, []);
});

test("an asset with nothing recorded carries the honest empty verification state, never a fabricated match", () => {
  const payload = buildWalkPayload(account, order);
  const untouched = payload.assets.find((entry) => entry.asset_id === "m-aa102");
  assert.ok(untouched);
  assert.equal(untouched.verification.outcome, "pending");
  assert.equal(untouched.verification.matched_tag, null);
  assert.equal(untouched.verification.matched_serial, null);
  assert.equal(untouched.verification.capture_id, "");
  assert.equal(untouched.verification.verified_at, "");
  assert.equal(untouched.verification.label, "authoredVerification");
  assert.deepEqual(untouched.captures, []);
  assert.deepEqual(untouched.candidate_facts, []);
  assert.deepEqual(untouched.rejected, []);
  assert.deepEqual(untouched.open, []);
});

test("no asset entry carries an observation_ids key", () => {
  const payload = buildWalkPayload(account, order);
  for (const entry of payload.assets) {
    assert.equal(Object.hasOwn(entry, "observation_ids"), false);
  }
});

/* ----------------------------------------------------------------
   2. Build real state through applyItem — never a direct store write
   ---------------------------------------------------------------- */

let mAp003ClientId;
let mAp003Proposals;

test("opening the clock, then a verify-purpose capture with a thumbnail on m-ap003, yields three open proposals", async () => {
  const openOutcome = await applyItem(session, makeItem());
  assert.equal(openOutcome.result.status, "recorded");

  mAp003ClientId = randomUUID();
  const captureOutcome = await applyItem(
    session,
    makeItem({
      client_id: mAp003ClientId,
      kind: "capture",
      payload: {
        asset_id: "m-ap003",
        kind: "photo",
        purpose: "verify",
        captured_at: new Date().toISOString(),
        sha256: SHA256_EXAMPLE,
        bytes: 1024,
        mime: "image/jpeg",
        thumb: "data:image/jpeg;base64,AAAA",
      },
    }),
  );

  assert.equal(captureOutcome.result.status, "recorded");
  mAp003Proposals = captureOutcome.result.server.proposals;
  assert.equal(mAp003Proposals.length, 3);
  for (const proposal of mAp003Proposals) {
    assert.equal(proposal.state, "open");
  }
});

test("an evidence-purpose capture with no thumbnail on m-aa101 records with no proposals", async () => {
  const outcome = await applyItem(
    session,
    makeItem({
      kind: "capture",
      payload: {
        asset_id: "m-aa101",
        kind: "photo",
        purpose: "evidence",
        captured_at: new Date().toISOString(),
        sha256: SHA256_EXAMPLE,
        bytes: 512,
        mime: "image/jpeg",
      },
    }),
  );
  assert.equal(outcome.result.status, "recorded");
  assert.equal(outcome.result.server?.proposals, undefined);
});

test("thumb_present is true for the capture that carried a thumbnail and false for the one that did not", () => {
  const payload = buildWalkPayload(account, order);
  const mAp003 = payload.assets.find((entry) => entry.asset_id === "m-ap003");
  const mAa101 = payload.assets.find((entry) => entry.asset_id === "m-aa101");

  assert.equal(mAp003.captures.length, 1);
  assert.equal(mAp003.captures[0].thumb_present, true);

  assert.equal(mAa101.captures.length, 1);
  assert.equal(mAa101.captures[0].thumb_present, false);
});

test("every capture in the payload states audio_left_device: false", () => {
  const payload = buildWalkPayload(account, order);
  const allCaptures = payload.assets.flatMap((entry) => entry.captures);
  assert.ok(allCaptures.length >= 2);
  for (const capture of allCaptures) {
    assert.equal(capture.audio_left_device, false);
  }
});

test("m-ap003's verification now reports a real authored match tied to the recorded capture, never an invented one", () => {
  const payload = buildWalkPayload(account, order);
  const mAp003 = payload.assets.find((entry) => entry.asset_id === "m-ap003");

  assert.equal(mAp003.verification.outcome, "matched");
  assert.equal(mAp003.verification.capture_id, mAp003ClientId);
  assert.equal(mAp003.verification.verified_at, mAp003.captures[0].recorded_at);
  assert.notEqual(mAp003.verification.matched_tag, null);
  assert.notEqual(mAp003.verification.matched_serial, null);
});

/* ----------------------------------------------------------------
   3. Accept, reject, and the one left open
   ---------------------------------------------------------------- */

test("accepting a proposal moves it into candidate_facts with a server-derived accepted_by/accepted_at/arrived_via, and out of rejected/open", async () => {
  const toAccept = mAp003Proposals[0];
  const outcome = await applyItem(
    session,
    makeDecisionItem({
      proposal_id: toAccept.id,
      capture_client_id: mAp003ClientId,
      observation_id: toAccept.observation_id,
      outcome: "accept",
    }),
  );
  assert.equal(outcome.result.status, "recorded");

  const payload = buildWalkPayload(account, order);
  const mAp003 = payload.assets.find((entry) => entry.asset_id === "m-ap003");

  assert.equal(mAp003.candidate_facts.length, 1);
  const accepted = mAp003.candidate_facts[0];
  assert.equal(accepted.id, toAccept.id);
  assert.equal(accepted.accepted_by, account.account_id);
  assert.notEqual(accepted.accepted_at, null);
  assert.equal(accepted.arrived_via, outcome.result.server.decision.arrived_via);

  assert.equal(mAp003.rejected.some((proposal) => proposal.id === toAccept.id), false);
  assert.equal(mAp003.open.some((proposal) => proposal.id === toAccept.id), false);
});

let rejectedProposalId;

test("rejecting a second proposal moves it into rejected and out of the other two sets", async () => {
  const toReject = mAp003Proposals[1];
  rejectedProposalId = toReject.id;
  const outcome = await applyItem(
    session,
    makeDecisionItem({
      proposal_id: toReject.id,
      capture_client_id: mAp003ClientId,
      observation_id: toReject.observation_id,
      outcome: "reject",
    }),
  );
  assert.equal(outcome.result.status, "recorded");

  const payload = buildWalkPayload(account, order);
  const mAp003 = payload.assets.find((entry) => entry.asset_id === "m-ap003");

  assert.equal(mAp003.rejected.length, 1);
  assert.equal(mAp003.rejected[0].id, rejectedProposalId);
  assert.equal(mAp003.candidate_facts.some((proposal) => proposal.id === rejectedProposalId), false);
  assert.equal(mAp003.open.some((proposal) => proposal.id === rejectedProposalId), false);
});

test("the rejection is still present after a later unrelated write — nothing deletes a rejection (FR-25, curl E)", async () => {
  // A capture on a different asset in the same order: unrelated to
  // the proposal or the decision above, touches neither.
  const outcome = await applyItem(
    session,
    makeItem({
      kind: "capture",
      payload: {
        asset_id: "m-aa102",
        kind: "photo",
        purpose: "evidence",
        captured_at: new Date().toISOString(),
        sha256: SHA256_EXAMPLE,
        bytes: 256,
        mime: "image/jpeg",
      },
    }),
  );
  assert.equal(outcome.result.status, "recorded");

  const payload = buildWalkPayload(account, order);
  const mAp003 = payload.assets.find((entry) => entry.asset_id === "m-ap003");
  assert.equal(mAp003.rejected.length, 1);
  assert.equal(mAp003.rejected[0].id, rejectedProposalId);
});

test("the third, undecided proposal remains in open", () => {
  const stillOpen = mAp003Proposals[2];
  const payload = buildWalkPayload(account, order);
  const mAp003 = payload.assets.find((entry) => entry.asset_id === "m-ap003");

  assert.equal(mAp003.open.length, 1);
  assert.equal(mAp003.open[0].id, stillOpen.id);
});

/* ----------------------------------------------------------------
   4. nowMs — a test's own pin, never a route's
   ---------------------------------------------------------------- */

test("an explicit nowMs pins issued_at, for a test's own use only", () => {
  const pinnedMs = Date.parse("2026-01-01T00:00:00.000Z");
  const payload = buildWalkPayload(account, order, pinnedMs);
  assert.equal(payload.issued_at, new Date(pinnedMs).toISOString());
});
