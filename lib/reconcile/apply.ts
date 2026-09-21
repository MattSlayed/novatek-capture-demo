/* ================================================================
   APPLY — the sole writer, online and reconciled alike (AD-1)

   This is the only module in the repository that imports
   lib/store/memory.ts's mutating exports. Plan 03-12's
   scripts/check-single-writer.mjs asserts that over the import
   graph. AD-1's order is fixed, stated here so a later reader cannot
   reorder it by accident: session -> ownership -> idempotency ->
   shape -> state.

   Every step returns immediately on refusal — nothing here
   accumulates refusals and picks one at the end. Every path, success
   and failure alike, writes a retained AttemptEntry through the same
   finalize() choke point below, because a refusal that escaped this
   writer would be exactly the failure AD-1 exists to prevent.
   ================================================================ */

import { deriveAccount, type ActingAccount } from "../attribution/index.ts";
import type { SessionResult } from "../session/cookie.ts";
import { orderOwned, assetInOrder } from "../access/scope.ts";
import { proposalIdMatches, deriveProposalId, authoredProposals } from "../proposals/derive.ts";
import { authoredMatch } from "../verify/authored.ts";
import { FIXTURE_VERSION } from "../data/fixtures.ts";
import {
  readSeen,
  writeSeen,
  writeAttempt,
  stampLastContact,
  readClock,
  writeClockSegment,
  closeClockSegment,
  writeCapture,
  writeProposals,
  writeDecision,
  readProposal,
  wasEvicted,
  readLastContact,
} from "../store/memory.ts";
import { CONFLICT_COPY, REJECT_COPY, TRANSPORT_COPY } from "../copy/conflicts.ts";
import type { WireErrorCode } from "../http/contract.ts";
import {
  ONLINE_CLOCK_OFFSET_WINDOW_SECONDS,
  QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS,
  QUEUED_CLOCK_FLOOR_SLACK_SECONDS,
} from "../limits/index.ts";
import {
  idempotencyHash,
  validateEnvelopeItem,
  validateCapturePayload,
  validateDecisionPayload,
  validateClockPayload,
  type ShapeRefusal,
} from "./validate.ts";
import type { SyncItem, SyncItemResult, Capture, Decision, Proposal, ProposalState, VerificationResult } from "../data/types";

/**
 * `result` is always a well-formed SyncItemResult, so /api/sync can
 * put it straight into its results[]. `code` is the wire error code
 * an online route maps to a status through lib/http/respond.ts's
 * fail() — null on `recorded` and `duplicate`. The two are kept
 * separate because the sync route returns HTTP 200 whenever the
 * envelope parsed (D-01): the transport status belongs to the
 * caller, not to this writer.
 */
export type ApplyOutcome = { result: SyncItemResult; code: WireErrorCode | null };

/**
 * `noteContact` lives here, not in lib/store or lib/attribution,
 * because it is a write and AD-1 says every write goes through this
 * module. It calls stampLastContact(account.account_id) and nothing
 * else. Every route calls this immediately after attribution
 * succeeds, so D-07's last_contact is stamped by every authenticated
 * request from the server's own clock alone.
 */
export function noteContact(account: ActingAccount): void {
  stampLastContact(account.account_id);
}

/** Coerces a possibly-absent, possibly-wrongly-typed payload field to
    a string without throwing, so a missing or malformed AD-5
    identity field reaches proposalIdMatches() as a value that simply
    fails to match, rather than crashing the request. A real derived
    id is never the empty string, so this coercion cannot manufacture
    a false match. */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function payloadRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * The one exit point every step of applyItem returns through. Writes
 * the retained attempt (FR-60: success and failure alike), then
 * writes `seen` for a `recorded` result and for nothing else —
 * lib/store/memory.ts's own account-keyed Maps already give this the
 * per-account separation lib/reconcile/validate.ts's `seenKey`
 * states and tests conceptually; this call passes the account id and
 * client id from the item itself, not a pre-joined string.
 *
 * AD-9's text is "a retried client_id with an unchanged payload
 * replays the same SUCCESSFUL result". A refusal is not a success and
 * must never be memoised: a `conflict` or `rejected` entry written
 * here would be replayed by step 3 as `duplicate` with `code: null`,
 * which every online route renders as a 2xx — a refused close,
 * capture or decision retried under its own client id would come back
 * a false success, and the state the refusal was about would still be
 * whatever it was. Restricting this to `recorded` has a second
 * consequence worth stating: the `already_recorded_differently` branch
 * of step 3 no longer reaches this call at all, so a changed replay
 * can never overwrite the stored hash of a record that really exists
 * and turn the original, unchanged item into a conflict.
 *
 * An unrecorded item therefore leaves no idempotency trace. Retrying
 * it re-runs every step — which is the point: the refusal is recomputed
 * against current state rather than remembered, so an item refused for
 * a reason that has since been resolved is applied on its retry.
 */
function finalize(
  account: ActingAccount | null,
  item: SyncItem<unknown>,
  result: SyncItemResult,
  code: WireErrorCode | null,
): ApplyOutcome {
  writeAttempt({
    account_id: account ? account.account_id : null,
    event: item.kind,
    outcome: result.status,
    code: result.code ?? null,
    client_id: item.client_id,
    // Total over an unshaped envelope on purpose. AD-1 runs ownership
    // and idempotency before shape, so this choke point is reached by
    // items whose order_id has not been proved to be a string yet;
    // reading `.length` off an absent one threw a TypeError out of the
    // writer, which retained no attempt at all and reached /api/sync's
    // catch-all as a mislabelled bad_shape naming the wrong field.
    order_id: typeof item.order_id === "string" && item.order_id.length > 0 ? item.order_id : null,
  });
  if (result.status === "recorded" && account) {
    writeSeen(
      account.account_id,
      item.client_id,
      idempotencyHash(item.kind, item.payload, {
        order_id: item.order_id,
        schema_version: item.schema_version,
      }),
      result,
    );
  }
  return { result, code };
}

/**
 * FR-24/AD-19: no operation in this module ever creates a fifth
 * state — a finding. This is the executable proof, not just a
 * comment: every proposal state this module writes passes through
 * here first, and there is no fifth member to create one with.
 */
const TERMINAL_STATES: ProposalState[] = ["open", "accepted", "rejected", "superseded"];

function assertProposalState(state: ProposalState): ProposalState {
  if (!TERMINAL_STATES.includes(state)) {
    throw new Error(`applyByKind: "${state}" is not a member of the closed proposal-state set`);
  }
  return state;
}

/** Whole-second difference between the server's own clock and a
    device-claimed or client-claimed instant — used for both
    order_open's device_offset_s and Decision.device_offset_s, so the
    two records measure the same quantity the same way. */
function wholeSecondOffset(nowMs: number, claimedMs: number): number {
  return Math.round((nowMs - claimedMs) / 1000);
}

/**
 * Reached only after session, ownership, idempotency and shape have
 * all passed for a kind other than `referral` (shape already refuses
 * that one `unknown_kind`). `arrived_via` is derived from the item's
 * own `state`, never read from a body: an item whose state marks it
 * as having been queued is "queued", everything else is "immediate".
 */
function applyByKind(account: ActingAccount, item: SyncItem<unknown>): SyncItemResult {
  const arrivedVia: "immediate" | "queued" = item.state === "queued" ? "queued" : "immediate";
  const payload = payloadRecord(item.payload);
  const nowMs = Date.now();

  if (item.kind === "order_open") {
    const existing = readClock(account.account_id, item.order_id);
    const openSegment = existing?.segments.find((segment) => segment.closed_at === null);
    if (openSegment) {
      // D-06/FR-7: a second open of a running order is duplicate, no
      // second segment — whichever client_id it arrived under.
      return {
        client_id: item.client_id,
        status: "duplicate",
        detail: "",
        server: existing ? { clock: existing } : undefined,
      };
    }

    if (arrivedVia === "immediate") {
      const openedAt = new Date(nowMs).toISOString();
      writeClockSegment(account.account_id, item.order_id, { opened_at: openedAt, source: "server" });
    } else {
      // D-04/D-07/FR-11: the queued clamp. `claimed` is the device's
      // own word; `floor` is the later of the session's issued_at and
      // the account's last server contact, and is issued_at alone
      // when contact is absent — silently, as AD-10 already permits
      // for any cold start. Both the claim and the measured offset
      // are retained; neither replaces the other.
      const claimedRaw = payload.device_claimed_opened_at;
      const claimedMs = typeof claimedRaw === "string" ? Date.parse(claimedRaw) : NaN;
      const issuedAtMs = Date.parse(account.session.issued_at);
      const lastContactMs = readLastContact(account.account_id);
      const floorMs = lastContactMs !== null ? Math.max(issuedAtMs, lastContactMs) : issuedAtMs;
      const tooEarly = claimedMs < floorMs - QUEUED_CLOCK_FLOOR_SLACK_SECONDS * 1000;
      const tooLate = claimedMs > nowMs + QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS * 1000;
      if (!Number.isFinite(claimedMs) || tooEarly || tooLate) {
        return {
          client_id: item.client_id,
          status: "conflict",
          code: "clock_skew",
          detail: CONFLICT_COPY.clock_skew.sentence,
        };
      }
      const openedAtMs = Math.max(claimedMs, floorMs);
      writeClockSegment(account.account_id, item.order_id, {
        opened_at: new Date(openedAtMs).toISOString(),
        source: "device_reconciled",
        device_claimed_opened_at: claimedRaw as string,
        device_offset_s: wholeSecondOffset(nowMs, claimedMs),
      });
    }
    const clock = readClock(account.account_id, item.order_id);
    return {
      client_id: item.client_id,
      status: "recorded",
      detail: "",
      server: clock ? { clock } : undefined,
    };
  }

  if (item.kind === "order_close") {
    const closed = closeClockSegment(account.account_id, item.order_id);
    if (!closed) {
      // D-06: closed already, or never opened — the same refusal
      // either way, and no `already_open`-shaped code is introduced.
      return {
        client_id: item.client_id,
        status: "conflict",
        code: "not_open",
        detail: CONFLICT_COPY.not_open.sentence,
      };
    }
    const clock = readClock(account.account_id, item.order_id);
    return {
      client_id: item.client_id,
      status: "recorded",
      detail: "",
      server: clock ? { clock } : undefined,
    };
  }

  if (item.kind === "capture") {
    const order = orderOwned(account, item.order_id);
    const assetId = String(payload.asset_id);
    if (!order || !assetInOrder(order, assetId)) {
      return {
        client_id: item.client_id,
        status: "conflict",
        code: "asset_not_in_order",
        detail: CONFLICT_COPY.asset_not_in_order.sentence,
      };
    }
    const clock = readClock(account.account_id, item.order_id);
    const hasOpenSegment = clock?.segments.some((segment) => segment.closed_at === null) ?? false;
    if (!hasOpenSegment) {
      // D-05: the clock gates the record — WorkOrder.status is
      // fixture text and is consulted by nothing here.
      return {
        client_id: item.client_id,
        status: "conflict",
        code: "order_closed",
        detail: CONFLICT_COPY.order_closed.sentence,
      };
    }

    // AD-16: the item's own client id is the capture's own id.
    const capture: Capture = {
      id: item.client_id,
      order_id: item.order_id,
      asset_id: assetId,
      kind: payload.kind as "photo" | "voice",
      purpose: payload.purpose as "verify" | "evidence",
      captured_at: String(payload.captured_at),
      mime: String(payload.mime),
      bytes: Number(payload.bytes),
      sha256: String(payload.sha256),
      captured_by: account.account_id,
      recorded_at: new Date(nowMs).toISOString(),
      ...(payload.duration_ms !== undefined ? { duration_ms: Number(payload.duration_ms) } : {}),
      ...(payload.thumb !== undefined ? { thumb: String(payload.thumb) } : {}),
    };
    writeCapture(account.account_id, capture);

    if (payload.purpose !== "verify") {
      return { client_id: item.client_id, status: "recorded", detail: "" };
    }

    const match = authoredMatch(assetId, FIXTURE_VERSION);
    const verification: VerificationResult = {
      ...match,
      capture_id: capture.id,
      verified_at: new Date(nowMs).toISOString(),
    };
    const authored = authoredProposals(assetId, FIXTURE_VERSION);
    const proposals: Proposal[] = authored.map((entry) => ({
      ...entry,
      id: deriveProposalId(account.account_id, item.client_id, entry.observation_id),
      capture_id: capture.id,
      order_id: item.order_id,
      issued_at: new Date(nowMs).toISOString(),
      state: assertProposalState("open"),
    }));
    writeProposals(account.account_id, proposals);

    return {
      client_id: item.client_id,
      status: "recorded",
      detail: "",
      server: { verification, proposals },
    };
  }

  // item.kind === "decision" (the only remaining member of
  // SYNC_ITEM_KINDS — referral was already refused unknown_kind at
  // the shape step).
  const proposalId = String(payload.proposal_id);

  // AD-5: validation reads nothing from the store — this consult
  // happens only after the HMAC already validated at the ownership
  // position (applyItem's own step 2, above).
  if (wasEvicted(account.account_id, proposalId)) {
    return {
      client_id: item.client_id,
      status: "rejected",
      code: "store_evicted",
      detail: REJECT_COPY.store_evicted.sentence,
    };
  }

  const proposal = readProposal(account.account_id, proposalId);
  const decidedAtRaw = String(payload.decided_at);
  const decidedAtMs = Date.parse(decidedAtRaw);

  // A missing proposal means this instance never shared state with
  // whichever instance issued it. AD-5's HMAC match already proved
  // this decision is legitimate, and there is no local state left to
  // gate it against, so it is recorded outright — never a "server
  // restarted" sentence anywhere for this case (EXPERIENCE.md).
  if (proposal) {
    if (proposal.state !== "open") {
      return {
        client_id: item.client_id,
        status: "conflict",
        code: "proposal_superseded",
        detail: CONFLICT_COPY.proposal_superseded.sentence,
      };
    }
    const clock = readClock(account.account_id, proposal.order_id);
    const hasOpenSegment = clock?.segments.some((segment) => segment.closed_at === null) ?? false;
    if (!hasOpenSegment) {
      return {
        client_id: item.client_id,
        status: "conflict",
        code: "order_closed",
        detail: CONFLICT_COPY.order_closed.sentence,
      };
    }

    let withinBounds: boolean;
    if (arrivedVia === "immediate") {
      withinBounds =
        Number.isFinite(decidedAtMs) &&
        Math.abs(nowMs - decidedAtMs) <= ONLINE_CLOCK_OFFSET_WINDOW_SECONDS * 1000;
    } else {
      const issuedAtMs = Date.parse(account.session.issued_at);
      const lastContactMs = readLastContact(account.account_id);
      const floorMs = lastContactMs !== null ? Math.max(issuedAtMs, lastContactMs) : issuedAtMs;
      withinBounds =
        Number.isFinite(decidedAtMs) &&
        decidedAtMs >= floorMs - QUEUED_CLOCK_FLOOR_SLACK_SECONDS * 1000 &&
        decidedAtMs <= nowMs + QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS * 1000;
    }
    if (!withinBounds) {
      return {
        client_id: item.client_id,
        status: "conflict",
        code: "clock_skew",
        detail: CONFLICT_COPY.clock_skew.sentence,
      };
    }
  }

  const decision: Decision = {
    id: item.client_id,
    proposal_id: proposalId,
    outcome: payload.outcome as "accept" | "reject",
    decided_at: decidedAtRaw,
    decided_where_claimed: payload.decided_where_claimed as "online" | "on_device",
    arrived_via: arrivedVia,
    decided_by: account.account_id,
    recorded_at: new Date(nowMs).toISOString(),
    device_offset_s: Number.isFinite(decidedAtMs) ? wholeSecondOffset(nowMs, decidedAtMs) : 0,
    reconciled: "recorded",
    ...(payload.note !== undefined ? { note: String(payload.note) } : {}),
  };
  writeDecision(account.account_id, decision);

  // FR-25: a rejected proposal is retained with its decision, never
  // deleted. There is no singular "proposal" slot on SyncItemResult's
  // server shape, so the one proposal this decision touches (when a
  // local copy exists) rides the same plural `proposals` field a
  // capture's verify-purpose result uses.
  let updatedProposals: Proposal[] | undefined;
  if (proposal) {
    const updated: Proposal = {
      ...proposal,
      state: assertProposalState(payload.outcome === "accept" ? "accepted" : "rejected"),
    };
    writeProposals(account.account_id, [updated]);
    updatedProposals = [updated];
  }

  return {
    client_id: item.client_id,
    status: "recorded",
    detail: "",
    server: { decision, ...(updatedProposals ? { proposals: updatedProposals } : {}) },
  };
}

export async function applyItem(
  sessionResult: SessionResult,
  item: SyncItem<unknown>,
): Promise<ApplyOutcome> {
  // 1. session — deriveAccount(sessionResult) is the one producer of
  // the acting account (AD-3). A refusal here is written by this
  // same writer, never escaping it (AD-1), with no account to
  // attribute the attempt to.
  const account = deriveAccount(sessionResult);
  if (!account) {
    return finalize(
      null,
      item,
      { client_id: item.client_id, status: "rejected", detail: TRANSPORT_COPY.no_session.sentence },
      "no_session",
    );
  }

  // 2. ownership — decided before any other state is read (AD-2,
  // AD-4). A decision item's ownership is the proposal's own:
  // re-derive the HMAC from the session's account plus the item's
  // own two identity fields (AD-5), never parsed out of the
  // submitted id. Every other kind is owned through the work order
  // itself, so an unowned order and a fabricated order id fail
  // identically before any state is read.
  if (item.kind === "decision") {
    const payload = payloadRecord(item.payload);
    const matches = proposalIdMatches(
      asString(payload.proposal_id),
      account.account_id,
      asString(payload.capture_client_id),
      asString(payload.observation_id),
    );
    if (!matches) {
      return finalize(
        account,
        item,
        {
          client_id: item.client_id,
          status: "rejected",
          code: "unknown_proposal",
          detail: REJECT_COPY.unknown_proposal.sentence,
        },
        "unknown_proposal",
      );
    }
  } else {
    // asString(), not item.order_id directly: an envelope that never
    // carried an order id at all must reach the SAME order_not_found a
    // fabricated one gets, decided here at the ownership position.
    // Hoisting the whole envelope check above this point instead would
    // turn an unowned-order-plus-bad-field into bad_shape, which AD-4
    // forbids — so steps 1-3 are made total over an unshaped envelope
    // rather than reordered.
    const owned = orderOwned(account, asString(item.order_id));
    if (!owned) {
      return finalize(
        account,
        item,
        {
          client_id: item.client_id,
          status: "conflict",
          code: "order_not_found",
          detail: CONFLICT_COPY.order_not_found.sentence,
        },
        "order_not_found",
      );
    }
  }
  // claimed_account_id is compared, never trusted (types.ts's own
  // comment on the field): a mismatch is a conflict, not a silent
  // reattribution to whichever account is actually signed in.
  if (item.claimed_account_id && item.claimed_account_id !== account.account_id) {
    return finalize(
      account,
      item,
      {
        client_id: item.client_id,
        status: "conflict",
        code: "account_mismatch",
        detail: CONFLICT_COPY.account_mismatch.sentence,
      },
      "account_mismatch",
    );
  }

  // 3. idempotency — seen is keyed per account (lib/store/memory.ts's
  // own account-keyed Maps), so one persona's retry can never
  // short-circuit into another's stored result, and two accounts
  // submitting the same client_id produce two independent results
  // (FR-34's server half).
  // The envelope enters the digest alongside the projected payload, so
  // a client_id reused across two kinds or two orders is caught by
  // already_recorded_differently rather than answered as a duplicate
  // carrying the other item's stored result.
  const hash = idempotencyHash(item.kind, item.payload, {
    order_id: item.order_id,
    schema_version: item.schema_version,
  });
  const seenEntry = readSeen(account.account_id, item.client_id);
  if (seenEntry) {
    if (seenEntry.payload_hash === hash) {
      const duplicateResult: SyncItemResult = { ...seenEntry.result, status: "duplicate" };
      return finalize(account, item, duplicateResult, null);
    }
    return finalize(
      account,
      item,
      {
        client_id: item.client_id,
        status: "conflict",
        code: "already_recorded_differently",
        detail: CONFLICT_COPY.already_recorded_differently.sentence,
      },
      "already_recorded_differently",
    );
  }

  // 4. shape — the envelope first, then the kind-specific payload.
  // referral is a member of the closed kind set but has no payload
  // validator until P9; the refusal here is honest rather than a
  // silent drop (D-01).
  const envelopeRefusal = validateEnvelopeItem(item);
  if (envelopeRefusal) {
    return finalize(
      account,
      item,
      { client_id: item.client_id, status: "rejected", code: envelopeRefusal.code, detail: envelopeRefusal.detail },
      envelopeRefusal.code,
    );
  }
  if (item.kind === "referral") {
    return finalize(
      account,
      item,
      {
        client_id: item.client_id,
        status: "rejected",
        code: "unknown_kind",
        detail: REJECT_COPY.unknown_kind.sentence,
      },
      "unknown_kind",
    );
  }
  let payloadRefusal: ShapeRefusal | null;
  if (item.kind === "capture") {
    payloadRefusal = validateCapturePayload(item.payload);
  } else if (item.kind === "decision") {
    payloadRefusal = validateDecisionPayload(item.payload);
  } else {
    payloadRefusal = validateClockPayload(item.payload, item.kind);
  }
  if (payloadRefusal) {
    return finalize(
      account,
      item,
      { client_id: item.client_id, status: "rejected", code: payloadRefusal.code, detail: payloadRefusal.detail },
      payloadRefusal.code,
    );
  }

  // 5. state — every check above passed; delegate to applyByKind.
  const result = applyByKind(account, item);
  return finalize(account, item, result, result.code ?? null);
}
