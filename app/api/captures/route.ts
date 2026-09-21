/* ================================================================
   POST /api/captures — evidence capture, no verification and no
   proposals (FR-15, FR-16, FR-18, FR-19)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — reading the
   session cookie already makes this handler dynamic by construction.

   Sibling of app/api/verify/route.ts, sharing the identical
   translation from a request into a server-built SyncItem handed to
   lib/reconcile/apply.ts's applyItem — the one writer AD-1 names.
   This route never imports lib/store/memory.ts's mutating exports,
   lib/verify/ or lib/proposals/: an evidence capture answers no
   verification and holds no proposal, so there is nothing for either
   module to contribute here even in principle.

   AD-20/D-10: the accepted-field enumeration is applied at parse.
   Every key outside it — captured_by and account_id named among
   them — is gone before the SyncItem is ever built, structurally,
   not by later review.

   Ordered checks, each returning immediately: no acting account,
   then the body is parsed, then ownership — before anything about
   the capture's own shape is checked, so a malformed body on an
   order this account does not hold still resolves to the uniform
   not-found (AD-4, AD-1's own order). This route forces `purpose` to
   "evidence" rather than trusting the body's own value: the route is
   the purpose, and a body that disagrees with the URL it was sent to
   does not get to decide which one wins. app/api/verify/route.ts
   makes the identical decision for "verify".

   This route stamps neither the verification-method header nor the
   proposal-count header the sibling route carries: an evidence
   capture produces no verification and no proposals, and a header
   claiming otherwise would be the kind of quiet overclaim this
   project exists to avoid.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail, notFound } from "../../../lib/http/respond.ts";
import { readSession } from "../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../lib/attribution/index.ts";
import { applyItem, noteContact } from "../../../lib/reconcile/apply.ts";
import { orderOwned } from "../../../lib/access/scope.ts";
import { pick, ACCEPTED_BODY_FIELDS, ACCEPTED_PAYLOAD_FIELDS } from "../../../lib/reconcile/validate.ts";
import { readCaptures } from "../../../lib/store/memory.ts";
import { CAPTURE_BODY_MAX_ENCODED_BYTES } from "../../../lib/limits/index.ts";
import { SYNC_ITEM_SCHEMA_VERSIONS } from "../../../lib/data/types.ts";
import type { SyncItem } from "../../../lib/data/types";

export async function POST(request: NextRequest) {
  const sessionResult = readSession(request);
  const account = deriveAccount(sessionResult);
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  // D-02's idiom, borrowed from /api/sync: the raw wire text is read
  // once and measured directly, rather than via a parsed-then-
  // re-serialised object, because the ceiling is about what actually
  // crossed the wire. This route and its /api/verify sibling are the
  // only online routes whose body can legitimately be large — a
  // capture body carries a base64 thumbnail, while every other write
  // route in this phase takes a handful of identifiers.
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return fail("bad_request");
  }
  if (Buffer.byteLength(rawText, "utf8") > CAPTURE_BODY_MAX_ENCODED_BYTES) {
    return fail("media_too_large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return fail("bad_request");
  }
  // A body that parsed but is not itself a plain object (an array, a
  // string, a bare number, null) has no own property pick() could
  // ever find — treated the same as an empty body, never a crash
  // (the same guard app/api/session/route.ts already needed).
  const raw: Record<string, unknown> =
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};

  // AD-20, structural: every key outside this enumeration —
  // captured_by and account_id included — is gone after this line.
  const body = pick(raw, ACCEPTED_BODY_FIELDS.captures);
  const clientId = typeof body.client_id === "string" ? body.client_id : "";
  const orderId = typeof body.order_id === "string" ? body.order_id : "";

  // Ownership before shape (AD-1, AD-4): a malformed body on an order
  // this account does not hold must still resolve to the same
  // not-found an unknown order id would.
  if (!orderOwned(account, orderId)) {
    return notFound();
  }

  // The route is the purpose: this endpoint forces "evidence"
  // regardless of what the body's own purpose field said.
  const payload: Record<string, unknown> = {
    ...pick(body, ACCEPTED_PAYLOAD_FIELDS.capture),
    purpose: "evidence" as const,
  };

  const kind = "capture" as const;
  const item: SyncItem<unknown> = {
    client_id: clientId,
    kind,
    schema_version: SYNC_ITEM_SCHEMA_VERSIONS[kind][0],
    order_id: orderId,
    created_at: new Date().toISOString(),
    attempts: 1,
    state: "sending",
    claimed_account_id: account.account_id,
    payload,
  };

  // An evidence capture never reaches the writer's own
  // proposal-derivation step (purpose is forced above, and that step
  // only ever runs for a verify-purpose item) — the sibling verify
  // route's note on the one error that step can throw does not apply
  // to this file at all, for a path this route can never take.
  const outcome = await applyItem(sessionResult, item);
  const { result } = outcome;

  if (result.status === "recorded" || result.status === "duplicate") {
    // AD-9: a retried client_id with an unchanged payload replays the
    // same successful result rather than erroring. SyncItemResult's
    // own server shape carries no capture field, so the record itself
    // is re-read from the store by the id AD-16 guarantees is its own
    // (item.client_id) — never rebuilt here, since apply.ts stamps
    // its own server-side recorded_at that this route has no other
    // way to reproduce byte-exact, especially on a replay.
    const capture = readCaptures(account.account_id).find((entry) => entry.id === clientId);
    if (!capture) {
      // A `seen` entry outlives its own capture: the store's
      // per-account idempotency cap (500) is larger than its capture
      // cap (200), so an account that has captured enough can still
      // hold the entry that makes this a replay after the record it
      // points at has been evicted. Answering 201 anyway would send
      // `{}` — JSON drops the undefined key entirely — under an
      // X-CAP-Capture header naming a record this server no longer
      // has, which is a success header for something that does not
      // exist. Refusing says what actually happened.
      return fail("store_evicted");
    }
    return ok(
      { capture },
      {
        status: 201,
        headers: { "X-CAP-Capture": clientId, "X-CAP-Account": account.account_id },
      },
    );
  }

  if (outcome.code === null) {
    // Unreachable in practice — every refusal path applyItem can
    // reach for a capture item carries a real code. Kept only so
    // this line type-checks against ApplyOutcome's own shape, which
    // allows null for the recorded/duplicate branch already handled
    // above (mirrors app/api/orders/[id]/open/route.ts's identical
    // guard).
    return fail("bad_request");
  }
  return fail(outcome.code, result.detail);
}
