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
import { orderOwned } from "../access/scope.ts";
import { proposalIdMatches } from "../proposals/derive.ts";
import {
  readSeen,
  writeSeen,
  writeAttempt,
  stampLastContact,
  readClock,
  writeClockSegment,
} from "../store/memory.ts";
import { CONFLICT_COPY, REJECT_COPY, TRANSPORT_COPY } from "../copy/conflicts.ts";
import type { WireErrorCode } from "../http/contract.ts";
import {
  idempotencyHash,
  validateEnvelopeItem,
  validateCapturePayload,
  validateDecisionPayload,
  validateClockPayload,
  type ShapeRefusal,
} from "./validate.ts";
import type { SyncItem, SyncItemResult } from "../data/types";

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
 * writes `seen` for every terminal result other than `duplicate` —
 * lib/store/memory.ts's own account-keyed Maps already give this the
 * per-account separation lib/reconcile/validate.ts's `seenKey`
 * states and tests conceptually; this call passes the account id and
 * client id from the item itself, not a pre-joined string.
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
    order_id: item.order_id.length > 0 ? item.order_id : null,
  });
  if (result.status !== "duplicate" && account) {
    writeSeen(account.account_id, item.client_id, idempotencyHash(item.kind, item.payload), result);
  }
  return { result, code };
}

/**
 * Reached only after session, ownership, idempotency and shape (step
 * 4, below) have all passed for a kind other than `referral` (shape
 * already refuses that one `unknown_kind`). This commit implements
 * only order_open's immediate-path branch — enough for this task's
 * own idempotency and attempt-writing proofs. A later commit in this
 * same plan extends this function with order_open's queued clamp,
 * order_close, capture and decision.
 */
function applyByKind(account: ActingAccount, item: SyncItem<unknown>): SyncItemResult {
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
    const openedAt = new Date().toISOString();
    writeClockSegment(account.account_id, item.order_id, { opened_at: openedAt, source: "server" });
    const clock = readClock(account.account_id, item.order_id);
    return {
      client_id: item.client_id,
      status: "recorded",
      detail: "",
      server: clock ? { clock } : undefined,
    };
  }

  // order_close, capture and decision are extended onto this
  // function by a later commit in this same plan (Task 3). Nothing
  // in this task's own tests reaches this branch — Task 3 replaces
  // it before writing its own state-transition tests.
  throw new Error(`applyByKind: "${item.kind}" is not yet implemented`);
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
    const owned = orderOwned(account, item.order_id);
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
  const hash = idempotencyHash(item.kind, item.payload);
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
