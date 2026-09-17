/* ================================================================
   GET /api/walk/[orderId] — the record handed onward (D-03, FR-52)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — the dynamic
   segment already makes this handler dynamic by construction.

   The route authorises, calls the one assembler, stamps two headers
   and responds — it assembles nothing itself. orderOwned() is the
   single not-found decision point: an id belonging to another
   account and an id belonging to no account leave here as the same
   bytes, through the one call, because there is no parameter that
   could tell the two apart (FR-6, restated here as FR-52).
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail, notFound } from "../../../../lib/http/respond.ts";
import { readSession } from "../../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../../lib/attribution/index.ts";
import { noteContact } from "../../../../lib/reconcile/apply.ts";
import { orderOwned } from "../../../../lib/access/scope.ts";
import { buildWalkPayload } from "../../../../lib/walk/payload.ts";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  const account = deriveAccount(readSession(request));
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  const order = orderOwned(account, orderId);
  if (!order) {
    return notFound();
  }

  const payload = buildWalkPayload(account, order);

  // Counted off the payload this call just built, never by a second
  // query against the store, so the header and the body can never
  // disagree with each other.
  const factCount = payload.assets.reduce(
    (total, asset) => total + asset.candidate_facts.length,
    0,
  );

  return ok(payload, {
    headers: {
      "X-CAP-Walk-Facts": String(factCount),
      // The wire value, literal and fixed — not a sentence. The
      // sentence lives once, inside the body, as
      // payload.redaction.statement, already resolved by the
      // assembler that built this payload. This header must never
      // grow into a second copy of that sentence.
      "X-CAP-Redaction": "none",
      "X-CAP-Account": account.account_id,
    },
  });
}
