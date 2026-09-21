import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Pinned before any signing happens (lazy-resolved on first call, per
// lib/session/key.ts) so mintSession/verifySessionValue exercise a
// real, known key rather than the committed dev fallback.
process.env.CAPTURE_SESSION_KEY = "apply-test-signing-key-0000000000";

const { mintSession, verifySessionValue } = await import("../session/cookie.ts");
const { applyItem, noteContact } = await import("./apply.ts");
const {
  readAttempts,
  readUnattributedAttempts,
  readLastContact,
  readClock,
  readProposal,
  readDecisions,
} = await import("../store/memory.ts");
const { deriveProposalId } = await import("../proposals/derive.ts");
const { CONFLICT_COPY, REJECT_COPY } = await import("../copy/conflicts.ts");

const SHA256_EXAMPLE = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".slice(0, 64);

function sessionFor(accountId) {
  const { value } = mintSession(accountId);
  return verifySessionValue(value);
}

function sessionForAt(accountId, nowMs) {
  const { value } = mintSession(accountId, nowMs);
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

/* ================================================================
   Task 3 — applyByKind: the clock, the capture and the decision
   state transitions. wo-0129 (acc-vanwyk) is untouched by the tests
   above; every other order was opened once above, so tests below
   that need a genuinely fresh clock close it first.
   ================================================================ */

/* ----------------------------------------------------------------
   order_open / order_close (FR-7, FR-8, FR-9, D-06)
   ---------------------------------------------------------------- */

test("open on a fresh order records one segment with source: server", async () => {
  const session = sessionFor("acc-vanwyk");
  const outcome = await applyItem(session, makeItem("acc-vanwyk", { order_id: "wo-0129" }));
  assert.equal(outcome.result.status, "recorded");
  const clock = readClock("acc-vanwyk", "wo-0129");
  assert.equal(clock.segments.length, 1);
  assert.equal(clock.segments[0].source, "server");
});

test("a second open under a different client_id returns duplicate and leaves one segment (FR-7, D-06)", async () => {
  const session = sessionFor("acc-vanwyk");
  const outcome = await applyItem(session, makeItem("acc-vanwyk", { order_id: "wo-0129" }));
  assert.equal(outcome.result.status, "duplicate");
  assert.equal(outcome.code, null);
  const clock = readClock("acc-vanwyk", "wo-0129");
  assert.equal(clock.segments.length, 1);
});

test("close with no open segment returns not_open", async () => {
  const session = sessionFor("acc-mabaso");
  const firstClose = await applyItem(
    session,
    makeItem("acc-mabaso", { order_id: "wo-0151", kind: "order_close" }),
  );
  assert.equal(firstClose.result.status, "recorded");

  const secondClose = await applyItem(
    session,
    makeItem("acc-mabaso", { order_id: "wo-0151", kind: "order_close" }),
  );
  assert.equal(secondClose.code, "not_open");
  assert.equal(secondClose.result.detail, CONFLICT_COPY.not_open.sentence);
});

test("close, then open, appends a second segment and the first is unchanged (FR-9)", async () => {
  const session = sessionFor("acc-mabaso");
  const before = readClock("acc-mabaso", "wo-0151");
  const firstSegment = before.segments[0];

  const outcome = await applyItem(session, makeItem("acc-mabaso", { order_id: "wo-0151" }));
  assert.equal(outcome.result.status, "recorded");

  const after = readClock("acc-mabaso", "wo-0151");
  assert.equal(after.segments.length, 2);
  assert.deepEqual(after.segments[0], firstSegment);
});

test("close ends the segment and elapsed_s is the sum over segments (FR-8)", async () => {
  const session = sessionFor("acc-naidoo");
  const before = readClock("acc-naidoo", "wo-0137"); // opened once, earlier in this file
  assert.equal(before.segments[0].closed_at, null);

  const outcome = await applyItem(
    session,
    makeItem("acc-naidoo", { order_id: "wo-0137", kind: "order_close" }),
  );
  assert.equal(outcome.result.status, "recorded");

  const after = readClock("acc-naidoo", "wo-0137");
  assert.notEqual(after.segments[0].closed_at, null);
  assert.equal(after.elapsed_s, outcome.result.server.clock.elapsed_s);
  assert.ok(after.elapsed_s >= 0);
});

/* ----------------------------------------------------------------
   The queued clamp (D-04, D-07, FR-11)
   ---------------------------------------------------------------- */

test("D-04: a queued order_open whose claim is before issued_at is clamped to the floor, with both device_claimed_opened_at and device_offset_s present", async () => {
  // acc-vanwyk has never had noteContact called on it yet in this file.
  assert.equal(readLastContact("acc-vanwyk"), null);
  await applyItem(sessionFor("acc-vanwyk"), makeItem("acc-vanwyk", { order_id: "wo-0133", kind: "order_close" }));

  const issuedAtMs = Date.now();
  const session = sessionForAt("acc-vanwyk", issuedAtMs);
  const claimedIso = new Date(issuedAtMs - 120_000).toISOString(); // 2 min before issued_at, within the 5-min floor slack

  const outcome = await applyItem(
    session,
    makeItem("acc-vanwyk", {
      order_id: "wo-0133",
      state: "queued",
      payload: { device_claimed_opened_at: claimedIso },
    }),
  );
  assert.equal(outcome.result.status, "recorded");

  const clock = readClock("acc-vanwyk", "wo-0133");
  const segment = clock.segments[clock.segments.length - 1];
  assert.equal(segment.source, "device_reconciled");
  assert.equal(segment.device_claimed_opened_at, claimedIso);
  assert.equal(typeof segment.device_offset_s, "number");
  // clamped to the floor (issued_at), not the earlier device claim
  assert.equal(segment.opened_at, new Date(issuedAtMs).toISOString());
});

test("a queued order_open clamps to last_contact when it is later than issued_at", async () => {
  await applyItem(sessionFor("acc-vanwyk"), makeItem("acc-vanwyk", { order_id: "wo-0133", kind: "order_close" }));

  const issuedAtMs = Date.now() - 10_000;
  const session = sessionForAt("acc-vanwyk", issuedAtMs);
  noteContact({ account_id: "acc-vanwyk", artisan: null, session: null });
  const lastContactMs = readLastContact("acc-vanwyk");
  assert.ok(lastContactMs > issuedAtMs);

  const claimedIso = new Date(issuedAtMs - 60_000).toISOString(); // before issued_at

  const outcome = await applyItem(
    session,
    makeItem("acc-vanwyk", {
      order_id: "wo-0133",
      state: "queued",
      payload: { device_claimed_opened_at: claimedIso },
    }),
  );
  assert.equal(outcome.result.status, "recorded");

  const clock = readClock("acc-vanwyk", "wo-0133");
  const segment = clock.segments[clock.segments.length - 1];
  assert.equal(segment.opened_at, new Date(lastContactMs).toISOString());
});

test("with no last_contact stamped, the floor is issued_at alone and the attempt entry carries no message about it", async () => {
  // acc-mabaso has never had noteContact called on it in this file.
  assert.equal(readLastContact("acc-mabaso"), null);
  await applyItem(sessionFor("acc-mabaso"), makeItem("acc-mabaso", { order_id: "wo-0142", kind: "order_close" }));

  const issuedAtMs = Date.now();
  const session = sessionForAt("acc-mabaso", issuedAtMs);
  const claimedIso = new Date(issuedAtMs - 120_000).toISOString(); // within the floor slack

  const outcome = await applyItem(
    session,
    makeItem("acc-mabaso", {
      order_id: "wo-0142",
      state: "queued",
      payload: { device_claimed_opened_at: claimedIso },
    }),
  );
  assert.equal(outcome.result.status, "recorded");

  const clock = readClock("acc-mabaso", "wo-0142");
  const segment = clock.segments[clock.segments.length - 1];
  assert.equal(segment.opened_at, new Date(issuedAtMs).toISOString());

  // AttemptEntry has no field to carry a message in at all — this
  // asserts the recorded entry stays a plain success, nothing more.
  const attempts = readAttempts("acc-mabaso");
  const last = attempts[attempts.length - 1];
  assert.equal(last.code, null);
  assert.equal(last.outcome, "recorded");
});

test("a claim far in the past and a claim far in the future both return clock_skew", async () => {
  await applyItem(sessionFor("acc-mabaso"), makeItem("acc-mabaso", { order_id: "wo-0142", kind: "order_close" }));

  const issuedAtMs = Date.now();
  const session = sessionForAt("acc-mabaso", issuedAtMs);

  const pastOutcome = await applyItem(
    session,
    makeItem("acc-mabaso", {
      order_id: "wo-0142",
      state: "queued",
      payload: { device_claimed_opened_at: new Date(issuedAtMs - 100 * 3600_000).toISOString() },
    }),
  );
  assert.equal(pastOutcome.code, "clock_skew");

  const futureOutcome = await applyItem(
    session,
    makeItem("acc-mabaso", {
      order_id: "wo-0142",
      state: "queued",
      payload: { device_claimed_opened_at: new Date(issuedAtMs + 100 * 3600_000).toISOString() },
    }),
  );
  assert.equal(futureOutcome.code, "clock_skew");
});

/* ----------------------------------------------------------------
   capture (FR-15, FR-16, FR-17, FR-18, D-05)
   ---------------------------------------------------------------- */

test("a capture against an asset not on the order returns asset_not_in_order", async () => {
  const session = sessionFor("acc-mabaso");
  const item = makeItem("acc-mabaso", {
    order_id: "wo-0142",
    kind: "capture",
    payload: {
      asset_id: "m-aa601", // real asset, but on wo-0129 (acc-vanwyk), not wo-0142
      kind: "photo",
      purpose: "evidence",
      captured_at: new Date().toISOString(),
      sha256: SHA256_EXAMPLE,
      bytes: 10,
      mime: "image/jpeg",
    },
  });
  const outcome = await applyItem(session, item);
  assert.equal(outcome.code, "asset_not_in_order");
});

test("a capture against a closed clock returns order_closed with EXPERIENCE.md's sentence (D-05)", async () => {
  // wo-0129 currently has one open segment; close it to demonstrate
  // the reachable trigger D-05 describes: close, then capture.
  await applyItem(sessionFor("acc-vanwyk"), makeItem("acc-vanwyk", { order_id: "wo-0129", kind: "order_close" }));

  const session = sessionFor("acc-vanwyk");
  const item = makeItem("acc-vanwyk", {
    order_id: "wo-0129",
    kind: "capture",
    payload: {
      asset_id: "m-aa601",
      kind: "photo",
      purpose: "evidence",
      captured_at: new Date().toISOString(),
      sha256: SHA256_EXAMPLE,
      bytes: 10,
      mime: "image/jpeg",
    },
  });
  const outcome = await applyItem(session, item);
  assert.equal(outcome.code, "order_closed");
  assert.equal(outcome.result.detail, CONFLICT_COPY.order_closed.sentence);
});

let m_ap003_proposals = [];
let m_ap003_client_id = null;

test("a verify-purpose capture on m-ap003 returns three proposals, each open, each carrying the observation_id its id was derived from", async () => {
  // wo-0142 is currently closed (from the queued-clamp tests above);
  // reopen it so the clock gate for this capture passes.
  const reopen = await applyItem(sessionFor("acc-mabaso"), makeItem("acc-mabaso", { order_id: "wo-0142" }));
  assert.equal(reopen.result.status, "recorded");

  const session = sessionFor("acc-mabaso");
  const clientId = randomUUID();
  const item = makeItem("acc-mabaso", {
    client_id: clientId,
    order_id: "wo-0142",
    kind: "capture",
    payload: {
      asset_id: "m-ap003",
      kind: "photo",
      purpose: "verify",
      captured_at: new Date().toISOString(),
      sha256: SHA256_EXAMPLE,
      bytes: 10,
      mime: "image/jpeg",
    },
  });
  const outcome = await applyItem(session, item);

  assert.equal(outcome.result.status, "recorded");
  assert.equal(outcome.result.server.verification.outcome, "matched");
  const proposals = outcome.result.server.proposals;
  assert.equal(proposals.length, 3);
  for (const proposal of proposals) {
    assert.equal(proposal.state, "open");
    assert.ok(proposal.observation_id);
    assert.equal(proposal.id, deriveProposalId("acc-mabaso", clientId, proposal.observation_id));
  }

  m_ap003_proposals = proposals;
  m_ap003_client_id = clientId;
});

test("a verify-purpose capture on m-aa101 returns a match and zero proposals", async () => {
  const session = sessionFor("acc-mabaso");
  const item = makeItem("acc-mabaso", {
    order_id: "wo-0142",
    kind: "capture",
    payload: {
      asset_id: "m-aa101",
      kind: "photo",
      purpose: "verify",
      captured_at: new Date().toISOString(),
      sha256: SHA256_EXAMPLE,
      bytes: 10,
      mime: "image/jpeg",
    },
  });
  const outcome = await applyItem(session, item);
  assert.equal(outcome.result.status, "recorded");
  assert.equal(outcome.result.server.verification.outcome, "matched");
  assert.deepEqual(outcome.result.server.proposals, []);
});

/* ----------------------------------------------------------------
   decision (FR-21, FR-23, FR-25, FR-27, AD-5)
   ---------------------------------------------------------------- */

/** A decision SyncItem<unknown>. `order_id` is empty: a decision's
    authorisation is the proposal id, not the order (AD-5). */
function makeDecisionItem(accountId, payloadOverrides = {}, itemOverrides = {}) {
  return makeItem(accountId, {
    order_id: "",
    kind: "decision",
    payload: {
      proposal_id: "replace-me",
      capture_client_id: m_ap003_client_id,
      observation_id: "replace-me",
      outcome: "accept",
      decided_at: new Date().toISOString(),
      decided_where_claimed: "online",
      ...payloadOverrides,
    },
    ...itemOverrides,
  });
}

let unknownProposalShape = null;

test("a fabricated proposal_id and a valid id derived under another account return deep-equal unknown_proposal results (FR-27)", async () => {
  const session = sessionFor("acc-mabaso");
  const proposal = m_ap003_proposals[0];

  const fabricatedOutcome = await applyItem(
    session,
    makeDecisionItem("acc-mabaso", {
      proposal_id: "fabricated-not-a-real-digest",
      observation_id: proposal.observation_id,
    }),
  );

  const otherAccountId = deriveProposalId("acc-naidoo", m_ap003_client_id, proposal.observation_id);
  const otherAccountOutcome = await applyItem(
    session,
    makeDecisionItem("acc-mabaso", {
      proposal_id: otherAccountId,
      observation_id: proposal.observation_id,
    }),
  );

  assert.equal(fabricatedOutcome.code, "unknown_proposal");
  assert.equal(otherAccountOutcome.code, "unknown_proposal");
  assert.deepEqual(withoutClientId(fabricatedOutcome.result), withoutClientId(otherAccountOutcome.result));

  unknownProposalShape = withoutClientId(fabricatedOutcome.result);
});

test("a wrong observation_id and a missing capture_client_id produce results deep-equal to the fabricated and other-account cases", async () => {
  const session = sessionFor("acc-mabaso");
  const proposal = m_ap003_proposals[0];
  const validId = deriveProposalId("acc-mabaso", m_ap003_client_id, proposal.observation_id);

  const wrongObservationOutcome = await applyItem(
    session,
    makeDecisionItem("acc-mabaso", {
      proposal_id: validId,
      observation_id: "not-the-real-observation-id",
    }),
  );

  const missingCaptureClientPayload = {
    proposal_id: validId,
    observation_id: proposal.observation_id,
    outcome: "accept",
    decided_at: new Date().toISOString(),
    decided_where_claimed: "online",
  };
  delete missingCaptureClientPayload.capture_client_id; // never set, but explicit for the reader
  const missingItem = makeItem("acc-mabaso", { order_id: "", kind: "decision", payload: missingCaptureClientPayload });
  const missingOutcome = await applyItem(session, missingItem);

  assert.equal(wrongObservationOutcome.code, "unknown_proposal");
  assert.equal(missingOutcome.code, "unknown_proposal");
  assert.deepEqual(withoutClientId(wrongObservationOutcome.result), unknownProposalShape);
  assert.deepEqual(withoutClientId(missingOutcome.result), unknownProposalShape);
});

test("a decision naming a valid proposal_id with both identity fields correct is recorded", async () => {
  const session = sessionFor("acc-mabaso");
  const proposal = m_ap003_proposals[1];
  const validId = deriveProposalId("acc-mabaso", m_ap003_client_id, proposal.observation_id);

  const outcome = await applyItem(
    session,
    makeDecisionItem("acc-mabaso", { proposal_id: validId, observation_id: proposal.observation_id }),
  );

  assert.equal(outcome.result.status, "recorded");
  assert.equal(outcome.result.server.decision.outcome, "accept");
  assert.equal(outcome.result.server.decision.decided_by, "acc-mabaso");
  assert.equal(outcome.result.server.proposals[0].state, "accepted");
});

test("a decision on an accepted proposal returns proposal_superseded", async () => {
  const session = sessionFor("acc-mabaso");
  const proposal = m_ap003_proposals[1]; // now accepted, from the previous test
  const validId = deriveProposalId("acc-mabaso", m_ap003_client_id, proposal.observation_id);

  const outcome = await applyItem(
    session,
    makeDecisionItem("acc-mabaso", {
      proposal_id: validId,
      observation_id: proposal.observation_id,
      outcome: "reject",
    }),
  );

  assert.equal(outcome.code, "proposal_superseded");
});

test("a rejected proposal is still readable with its decision after the decision is recorded (FR-25)", async () => {
  const session = sessionFor("acc-mabaso");
  const proposal = m_ap003_proposals[2];
  const validId = deriveProposalId("acc-mabaso", m_ap003_client_id, proposal.observation_id);
  const clientId = randomUUID();

  const outcome = await applyItem(
    session,
    makeDecisionItem(
      "acc-mabaso",
      { proposal_id: validId, observation_id: proposal.observation_id, outcome: "reject" },
      { client_id: clientId },
    ),
  );

  assert.equal(outcome.result.status, "recorded");
  assert.equal(outcome.result.server.proposals[0].state, "rejected");

  const stored = readProposal("acc-mabaso", validId);
  assert.equal(stored.state, "rejected");
  assert.equal(
    readDecisions("acc-mabaso").some((d) => d.id === clientId),
    true,
  );
});

test("a submitted decided_by value appears nowhere in the stored record or the attempt entry (FR-23's negative set at the writer)", async () => {
  const session = sessionFor("acc-mabaso");
  const proposal = m_ap003_proposals[0]; // never successfully decided above — every earlier attempt against it was unknown_proposal
  const validId = deriveProposalId("acc-mabaso", m_ap003_client_id, proposal.observation_id);
  const clientId = randomUUID();

  const outcome = await applyItem(
    session,
    makeDecisionItem(
      "acc-mabaso",
      {
        proposal_id: validId,
        observation_id: proposal.observation_id,
        decided_by: "acc-vanwyk", // attacker-supplied; must be dropped
      },
      { client_id: clientId },
    ),
  );

  assert.equal(outcome.result.status, "recorded");
  assert.equal(outcome.result.server.decision.decided_by, "acc-mabaso");

  const storedDecision = readDecisions("acc-mabaso").find((d) => d.id === clientId);
  assert.equal(JSON.stringify(storedDecision).includes("acc-vanwyk"), false);

  const attemptEntry = readAttempts("acc-mabaso").find((a) => a.client_id === clientId);
  assert.equal(JSON.stringify(attemptEntry).includes("acc-vanwyk"), false);
});

/* ----------------------------------------------------------------
   FR-24: the closed result-state set
   ---------------------------------------------------------------- */

test("every proposal state written across this file is a member of {open, accepted, rejected, superseded} (FR-24)", () => {
  const closedSet = ["open", "accepted", "rejected", "superseded"];
  const observedStates = m_ap003_proposals
    .map((proposal) => readProposal("acc-mabaso", deriveProposalId("acc-mabaso", m_ap003_client_id, proposal.observation_id)))
    .filter(Boolean)
    .map((proposal) => proposal.state);

  assert.ok(observedStates.length > 0);
  for (const state of observedStates) {
    assert.ok(closedSet.includes(state), `"${state}" is not in the closed proposal-state set`);
  }
});

/* ----------------------------------------------------------------
   AD-9: only a SUCCESS is memoised

   These run last because they rebuild wo-0137's clock from the state
   the close test above left it in (one closed segment, nothing
   running) rather than from a fresh order.
   ---------------------------------------------------------------- */

test("a refused item retried after its refusal's cause is resolved is applied, never replayed as duplicate (AD-9)", async () => {
  const session = sessionFor("acc-naidoo");
  const closeItem = makeItem("acc-naidoo", { order_id: "wo-0137", kind: "order_close" });

  // wo-0137 has no running segment here, so this close is refused.
  const refused = await applyItem(session, closeItem);
  assert.equal(refused.result.status, "conflict");
  assert.equal(refused.code, "not_open");

  // The artisan opens the order, then the queue retries the very same
  // close item — same client_id, same payload.
  const opened = await applyItem(session, makeItem("acc-naidoo", { order_id: "wo-0137" }));
  assert.equal(opened.result.status, "recorded");

  const retried = await applyItem(session, closeItem);
  assert.equal(retried.result.status, "recorded");
  assert.equal(retried.code, null);

  // The refusal really was recomputed rather than remembered: the
  // segment the open created is now closed.
  const clock = readClock("acc-naidoo", "wo-0137");
  assert.equal(
    clock.segments.every((segment) => segment.closed_at !== null),
    true,
  );
});

test("a changed replay never clobbers a recorded item's stored result (AD-9)", async () => {
  const session = sessionFor("acc-naidoo");
  const clientId = randomUUID();
  const original = makeItem("acc-naidoo", { client_id: clientId, order_id: "wo-0137", payload: {} });
  const changed = makeItem("acc-naidoo", {
    client_id: clientId,
    order_id: "wo-0137",
    payload: { device_claimed_opened_at: "2026-01-01T00:00:00Z" },
  });

  const recorded = await applyItem(session, original);
  assert.equal(recorded.result.status, "recorded");

  const changedFirst = await applyItem(session, changed);
  assert.equal(changedFirst.code, "already_recorded_differently");

  // The stored entry still belongs to the item that was actually
  // recorded, so the original replays as a duplicate carrying a real
  // server block — not a relabelled refusal with nothing in it.
  const replay = await applyItem(session, original);
  assert.equal(replay.result.status, "duplicate");
  assert.equal(replay.code, null);
  assert.ok(replay.result.server.clock);

  // And the changed item conflicts every time it is sent, rather than
  // becoming a duplicate of itself on its second arrival.
  const changedSecond = await applyItem(session, changed);
  assert.equal(changedSecond.code, "already_recorded_differently");
});

/* ----------------------------------------------------------------
   AD-1's first three steps are total over an unshaped envelope

   Ownership and idempotency run before shape, so both must survive an
   envelope whose fields have not been proved yet — a throw here
   retains no attempt at all (FR-60) and escapes the one writer AD-1
   says every refusal is decided inside.
   ---------------------------------------------------------------- */

test("an item carrying no order_id at all refuses order_not_found and retains an attempt, never throwing", async () => {
  const session = sessionFor("acc-mabaso");
  const item = makeItem("acc-mabaso", { order_id: "wo-0142" });
  delete item.order_id;

  const before = readAttempts("acc-mabaso").length;
  const outcome = await applyItem(session, item);

  // The same refusal a fabricated order id gets — decided at the
  // ownership position, not turned into a bad_shape naming a field the
  // caller never sent.
  assert.equal(outcome.code, "order_not_found");
  assert.equal(outcome.result.status, "conflict");
  assert.equal(outcome.result.detail, CONFLICT_COPY.order_not_found.sentence);

  const attempts = readAttempts("acc-mabaso");
  assert.equal(attempts.length, before + 1);
  assert.equal(attempts[attempts.length - 1].order_id, null);
});

test("an item whose kind is outside the closed set reaches step 4 and is refused unknown_kind", async () => {
  const session = sessionFor("acc-mabaso");
  // wo-0142 is acc-mabaso's own, so ownership passes and the item
  // really does reach the idempotency step with an unknown kind.
  const item = makeItem("acc-mabaso", { order_id: "wo-0142", kind: "nonsense" });

  const before = readAttempts("acc-mabaso").length;
  const outcome = await applyItem(session, item);

  assert.equal(outcome.code, "unknown_kind");
  assert.equal(outcome.result.status, "rejected");
  assert.equal(outcome.result.detail, REJECT_COPY.unknown_kind.sentence);
  assert.equal(readAttempts("acc-mabaso").length, before + 1);
});

/* ----------------------------------------------------------------
   AD-9: a `seen` entry answers "is this the same ITEM?"

   The digest covers the envelope, not the projected payload alone, so
   a client_id reused across two kinds or two orders is a conflict
   rather than a replay of whichever item was recorded first.
   ---------------------------------------------------------------- */

test("a client_id reused across two kinds conflicts instead of replaying the other kind's result", async () => {
  const session = sessionFor("acc-naidoo");
  // Start from a clock with nothing running, so the open below is a
  // genuine `recorded` rather than applyByKind's own duplicate branch.
  await applyItem(session, makeItem("acc-naidoo", { order_id: "wo-0137", kind: "order_close" }));

  const clientId = randomUUID();
  const opened = await applyItem(
    session,
    makeItem("acc-naidoo", { client_id: clientId, order_id: "wo-0137", kind: "order_open" }),
  );
  assert.equal(opened.result.status, "recorded");

  // Same client_id, same (empty) projected payload, different kind.
  const closed = await applyItem(
    session,
    makeItem("acc-naidoo", { client_id: clientId, order_id: "wo-0137", kind: "order_close" }),
  );
  assert.equal(closed.result.status, "conflict");
  assert.equal(closed.code, "already_recorded_differently");

  // And nothing was closed behind that refusal.
  const clock = readClock("acc-naidoo", "wo-0137");
  assert.equal(clock.segments[clock.segments.length - 1].closed_at, null);
});

test("a client_id reused against a different order conflicts instead of returning the other order's clock", async () => {
  const session = sessionFor("acc-mabaso");
  for (const orderId of ["wo-0142", "wo-0151"]) {
    await applyItem(session, makeItem("acc-mabaso", { order_id: orderId, kind: "order_close" }));
  }

  const clientId = randomUUID();
  const opened = await applyItem(
    session,
    makeItem("acc-mabaso", { client_id: clientId, order_id: "wo-0142" }),
  );
  assert.equal(opened.result.status, "recorded");

  const otherOrder = await applyItem(
    session,
    makeItem("acc-mabaso", { client_id: clientId, order_id: "wo-0151" }),
  );
  assert.equal(otherOrder.code, "already_recorded_differently");

  // wo-0151 is untouched — no segment was opened on it, and no clock
  // belonging to wo-0142 was handed back under its name.
  const otherClock = readClock("acc-mabaso", "wo-0151");
  assert.equal(
    otherClock.segments.every((segment) => segment.closed_at !== null),
    true,
  );
});
