/* ================================================================
   POST /api/orders/[id]/close — end the current segment (FR-8, D-06)

   Same shape as ../open/route.ts, deliberately duplicated rather
   than shared: this pair is the whole of the D-06 delta between the
   two verbs. Open is idempotent by state (a repeat is a plain 200);
   close is not — a closed or never-opened order is a stated
   conflict, resolved entirely inside lib/reconcile/apply.ts's
   applyItem. The conflict's wording is never restated here; it is
   read back from the result applyItem returns.

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — a dynamic
   segment already makes this handler dynamic by construction.
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

  // Ownership before anything else the request carries — see
  // ../open/route.ts for the full reasoning; the same order applies
  // here unchanged.
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
  const body = pick(raw, ACCEPTED_BODY_FIELDS.orders_close);
  const clientId = typeof body.client_id === "string" ? body.client_id : "";

  // Every field below is server-derived or enumerated — client_id is
  // the one value the body supplies, and applyItem's own shape step
  // re-checks it before it is trusted. The online path and the sync
  // path hand applyItem the identical SyncItem shape, so there is
  // never a second writer for this state transition.
  const kind = "order_close" as const;
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

  // A closed or never-opened order refuses here with the conflict
  // applyItem's own state step returns for this kind — the sentence
  // for it is defined once, beside its code, and is never repeated
  // in this file.
  if (outcome.code === null) {
    // Unreachable for an order_close item in practice — every
    // refusal path applyItem can reach for this kind carries a real
    // code. Kept only so this line type-checks against ApplyOutcome's
    // own shape, which allows null for the branch already handled
    // above.
    return fail("bad_request");
  }
  return fail(outcome.code, result.detail);
}
