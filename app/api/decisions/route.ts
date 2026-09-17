/* ================================================================
   POST /api/decisions — accept or reject one proposal (FR-21, FR-23,
   FR-27, AD-5)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — reading the
   session cookie already makes this handler dynamic by construction.

   A decision's authorisation is not a work order: it is the proposal
   id's own re-derived digest, checked against the session's account
   at the ownership position inside lib/reconcile/apply.ts — the one
   writer AD-1 names. This route does not read the store, does not
   re-check the id itself and does not decide ownership a second
   time: all of that belongs to the writer, and a route that
   re-checked it would be a second decision site.

   AD-20/D-10: the accepted-field enumeration is applied at parse. A
   decided_by the body might carry is not merely ignored — it ceases
   to exist at that line, which is why FR-23's negative set has no
   code path here to defeat. AD-5's own two identity fields,
   capture_client_id and observation_id, are proposal identity rather
   than observation content (named here by their own terms, excluded
   from FR-61's ban by name): this route reads neither back out of
   the picked body, it only hands both to the writer as part of the
   payload, which reconstructs the proposal id from them together
   with the session's own account.

   Ordered checks, each returning immediately: no acting account,
   then the body is parsed. There is no separate ownership check to
   run before that parse here, unlike the capture routes — a
   decision's authorisation lives entirely inside the picked body
   itself (the two identity fields above), so it cannot be decided
   before the body exists.

   The one refusal this route can name by its own response producer:
   an unknown id and an id belonging to a different account leave
   here as the same bytes (FR-27), because the writer's own
   re-derive-then-compare step, not this route, is what tells them
   apart from anything else — which is to say it never does.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail, notFoundProposal } from "../../../lib/http/respond.ts";
import { readSession } from "../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../lib/attribution/index.ts";
import { applyItem, noteContact } from "../../../lib/reconcile/apply.ts";
import { pick, ACCEPTED_BODY_FIELDS } from "../../../lib/reconcile/validate.ts";
import { SYNC_ITEM_SCHEMA_VERSIONS } from "../../../lib/data/types.ts";
import type { SyncItem } from "../../../lib/data/types";

export async function POST(request: NextRequest) {
  const sessionResult = readSession(request);
  const account = deriveAccount(sessionResult);
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return fail("bad_request");
  }
  // A body that parsed but is not itself a plain object (an array, a
  // string, a bare number, null) has no own property pick() could
  // ever find — treated the same as an empty body, never a crash
  // (the same guard app/api/session/route.ts already needed).
  const raw: Record<string, unknown> =
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};

  // Everything outside this enumeration is gone before the next line
  // runs — see the header comment for decided_by and the two AD-5
  // identity fields. The picked object doubles as the SyncItem's own
  // payload below: its field set differs from the payload-only
  // enumeration by exactly one extra key (client_id, the envelope's
  // own field), which the shape validator never reads and the
  // idempotency hash never projects onto, so carrying it costs
  // nothing.
  const body = pick(raw, ACCEPTED_BODY_FIELDS.decisions);
  const clientId = typeof body.client_id === "string" ? body.client_id : "";

  const kind = "decision" as const;
  const item: SyncItem<unknown> = {
    client_id: clientId,
    kind,
    schema_version: SYNC_ITEM_SCHEMA_VERSIONS[kind][0],
    // A decision's authorisation is its proposal id's own re-derived
    // digest, decided inside the writer from the payload below
    // together with the session's account — there is no work order
    // to check here, and inventing one would add a second
    // authorisation site alongside the one that actually decides
    // this. The empty string is correct, never a placeholder for a
    // value this route forgot to look up.
    order_id: "",
    created_at: new Date().toISOString(),
    attempts: 1,
    state: "sending",
    claimed_account_id: account.account_id,
    payload: body,
  };

  const outcome = await applyItem(sessionResult, item);
  const { result } = outcome;

  if (result.status === "recorded" || result.status === "duplicate") {
    // AD-9: a retried client_id with an unchanged payload replays the
    // same successful result rather than erroring.
    const decision = result.server?.decision;
    const proposal = result.server?.proposals?.[0];
    // The writer records a decision reaching an instance that never
    // issued the proposal outright, with no local copy to update —
    // its own documented case. There is no local record to report a
    // resulting state from then, so the decision's own outcome names
    // the equivalent state instead.
    const decisionState = proposal?.state ?? (decision?.outcome === "accept" ? "accepted" : "rejected");
    // Echo only what the writer returned — never the request body,
    // and nothing account-identifying beyond decision.decided_by,
    // which the writer itself stamped from the session, never from
    // anything this route read off the request.
    return ok(
      { decision, proposal },
      {
        status: 201,
        headers: {
          "X-CAP-Decision-State": decisionState,
          "X-CAP-Account": account.account_id,
        },
      },
    );
  }

  if (outcome.code === "unknown_proposal") {
    // The one call site for this refusal, taking no parameter at
    // all — a fabricated id and an id belonging to a different
    // account both leave here as the same bytes (FR-27), because
    // there is nowhere on this call to pass anything that could tell
    // the two apart.
    return notFoundProposal();
  }

  if (outcome.code === null) {
    // Unreachable in practice — every refusal path applyItem can
    // reach for a decision item carries a real code. Kept only so
    // this line type-checks against ApplyOutcome's own shape, which
    // allows null for the recorded/duplicate branch already handled
    // above (mirrors app/api/orders/[id]/open/route.ts's identical
    // guard).
    return fail("bad_request");
  }
  return fail(outcome.code, result.detail);
}
