/* ================================================================
   POST /api/orders/[id]/open — start the clock (FR-7, D-06)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — a dynamic
   segment already makes this handler dynamic by construction.

   The whole handler is a translation from a request into a
   server-built SyncItem, handed to lib/reconcile/apply.ts's
   applyItem — the one writer AD-1 names. Every field on that item is
   either read off the URL, derived from the session, or a fixed
   enumerated value; the only thing the request body may contribute
   is client_id, picked through ACCEPTED_BODY_FIELDS.orders_open, and
   even that is re-validated by applyItem's own shape step before it
   is trusted. This route never imports lib/store/memory.ts directly
   — applyItem is the only writer it ever calls.

   Ordered checks, each returning immediately: no acting account,
   then ownership, before the body is ever parsed — a malformed body
   on an order this account does not hold still resolves to the
   uniform not-found, never a bad_request that would tell the two
   apart (AD-4).
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail, notFound } from "../../../../../lib/http/respond.ts";
import { readSession } from "../../../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../../../lib/attribution/index.ts";
import { applyItem, noteContact } from "../../../../../lib/reconcile/apply.ts";
import { orderOwned } from "../../../../../lib/access/scope.ts";
import { pick, ACCEPTED_BODY_FIELDS } from "../../../../../lib/reconcile/validate.ts";
import { SYNC_ITEM_SCHEMA_VERSIONS } from "../../../../../lib/data/types.ts";
import type { SyncItem } from "../../../../../lib/data/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const sessionResult = readSession(request);
  const account = deriveAccount(sessionResult);
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  // Ownership before anything else the request carries: a malformed
  // body on an order this account does not hold must still resolve
  // to the same not-found an unknown id would, so the body is not
  // even parsed until this call proves ownership.
  if (!orderOwned(account, id)) {
    return notFound();
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return fail("bad_request");
  }
  // A body that parsed but is not itself a plain object (an array, a
  // string, a bare number, null) has no own property the field
  // enumeration below could ever find — treated the same as an
  // empty body, never a crash (the same guard app/api/session/
  // route.ts already needed).
  const raw: Record<string, unknown> =
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const body = pick(raw, ACCEPTED_BODY_FIELDS.orders_open);
  const clientId = typeof body.client_id === "string" ? body.client_id : "";

  // Every field below is server-derived or enumerated — client_id is
  // the one value the body supplies, and applyItem's own shape step
  // re-checks it before it is trusted. The online path and the sync
  // path hand applyItem the identical SyncItem shape, so there is
  // never a second writer for this state transition.
  const kind = "order_open" as const;
  const item: SyncItem<unknown> = {
    client_id: clientId,
    kind,
    schema_version: SYNC_ITEM_SCHEMA_VERSIONS[kind][0],
    order_id: id,
    created_at: new Date().toISOString(),
    attempts: 1,
    state: "sending",
    claimed_account_id: account.account_id,
    payload: {},
  };

  const outcome = await applyItem(sessionResult, item);
  const { result } = outcome;

  if (result.status === "recorded" || result.status === "duplicate") {
    /**
     * D-06/FR-7: a second open of a running order lands in this same
     * branch — applyItem answers "duplicate" with the clock
     * unchanged and no new segment, and this is rendered as a plain
     * 200, not an error. No conflict code exists for this case in
     * this phase; the mirror code for the write side is scheduled
     * for a later phase and is not introduced here.
     */
    const clock = result.server?.clock ?? {
      order_id: id,
      account_id: account.account_id,
      segments: [],
      elapsed_s: 0,
    };
    return ok(
      { clock },
      {
        headers: {
          "X-CAP-Clock": String(clock.segments.length),
          "X-CAP-Account": account.account_id,
        },
      },
    );
  }

  if (outcome.code === null) {
    // Unreachable for an order_open item in practice — every refusal
    // path applyItem can reach for this kind carries a real code.
    // Kept only so this line type-checks against ApplyOutcome's own
    // shape, which allows null for the branch already handled above.
    return fail("bad_request");
  }
  return fail(outcome.code, result.detail);
}
