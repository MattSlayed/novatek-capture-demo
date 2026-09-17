/* ================================================================
   GET /api/orders/[id] — the order detail (FR-5, FR-6)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — a dynamic
   segment already makes this handler dynamic by construction.

   Ordered checks, each returning immediately: no acting account, then
   ownership. `orderOwned()` is the one call this route makes to
   decide whether the id names an order it may see at all — an id
   belonging to another account and an id belonging to no account
   leave here as the same bytes, through the same not-found producer,
   because there is only one call site and it takes no parameter that
   could tell the two apart (FR-6).

   No `VerificationResult` is ever persisted anywhere in this project
   — `lib/store/memory.ts` has no store for one, and AD-8 makes that
   unnecessary: an authored answer is a pure function of `(assetId,
   fixtureSet)` and nothing else. So the `verifications` field below
   is re-derived, per already-recorded verify-purpose capture, through
   the exact same `authoredMatch()` the write path itself calls —
   never through a second, hand-rolled answer. `capture_id` and
   `verified_at` are the two fields a calling route attaches once
   `authoredMatch()` returns, by that function's own documented
   contract; `verified_at` is taken from the capture's own
   `recorded_at`, which was stamped from the identical instant the
   original verification result was.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail, notFound } from "../../../../lib/http/respond.ts";
import { readSession } from "../../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../../lib/attribution/index.ts";
import { noteContact } from "../../../../lib/reconcile/apply.ts";
import { orderOwned, assetsForOrder } from "../../../../lib/access/scope.ts";
import {
  readClock,
  readCaptures,
  readProposalsForAsset,
  readDecisions,
} from "../../../../lib/store/memory.ts";
import { authoredMatch } from "../../../../lib/verify/authored.ts";
import { FIXTURE_VERSION } from "../../../../lib/data/fixtures.ts";
import type { VerificationResult } from "../../../../lib/data/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const account = deriveAccount(readSession(request));
  if (!account) {
    return fail("no_session");
  }
  const { id } = await context.params;
  noteContact(account);

  const order = orderOwned(account, id);
  if (!order) {
    return notFound();
  }

  // Server-only: observation_ids is dropped by building a new object
  // per asset, never by deleting a key from assetsForOrder()'s own
  // record, which is shared, fixture-backed module state.
  const assets = assetsForOrder(order).map((entry) => {
    const { observation_ids: _observationIds, ...asset } = entry;
    void _observationIds;
    return asset;
  });

  const clock = readClock(account.account_id, order.id) ?? {
    order_id: order.id,
    account_id: account.account_id,
    segments: [],
    elapsed_s: 0,
  };

  // A Proposal carries its own order_id; a Decision carries none, so
  // a decision is matched by whether it names a proposal already
  // known to belong to this order's own set — the only join
  // available, since nothing else on Decision ties it back to an
  // order.
  const orderProposals = order.asset_ids
    .flatMap((assetId) => readProposalsForAsset(account.account_id, assetId))
    .filter((proposal) => proposal.order_id === order.id);
  const orderProposalIds = new Set(orderProposals.map((proposal) => proposal.id));
  const orderDecisions = readDecisions(account.account_id).filter((decision) =>
    orderProposalIds.has(decision.proposal_id),
  );

  const verifications: VerificationResult[] = readCaptures(account.account_id)
    .filter((capture) => capture.order_id === order.id && capture.purpose === "verify")
    .map((capture) => ({
      ...authoredMatch(capture.asset_id, FIXTURE_VERSION),
      capture_id: capture.id,
      verified_at: capture.recorded_at,
    }));

  return ok(
    { order, assets, clock, verifications, proposals: orderProposals, decisions: orderDecisions },
    { headers: { "X-CAP-Order": order.id, "X-CAP-Account": account.account_id } },
  );
}
