/* ================================================================
   WALK PAYLOAD — the whole record for one order (D-03)

   One exported function, buildWalkPayload(), assembles one big typed
   WalkPayload from the store and the fixtures — local arrays, a
   per-entry loop and branch for each asset, one typed return at the
   end. Same shape as ../ipv-demo/lib/rbac/manifest.ts's
   buildManifest() (lines 144-202): not a set of exported helpers.

   This module only reads store state and the fixtures, then
   assembles a payload; no mutating call happens anywhere in it. It
   imports only the read-only accessors lib/store/memory.ts exports,
   nothing from lib/reconcile, nothing from app/, and never the
   server-only lookup module P9 introduces for referral resolution —
   the same exclusion lib/access/scope.ts's own header names for the
   same reason. That is what keeps this module outside the one path
   permitted to mutate the store.

   The store block's and the redaction block's `statement` fields
   below are assembled from lib/copy/governed.ts's GOVERNED triples —
   never restated as a literal, not even in a comment, since
   scripts/check-governed.mjs scans comments too.
   ================================================================ */

import { GOVERNED } from "../copy/governed.ts";
import { authoredMatch } from "../verify/authored.ts";
import { FIXTURE_VERSION } from "../data/fixtures.ts";
import { assetsForOrder } from "../access/scope.ts";
import { STORE_TTL_SECONDS } from "../limits/index.ts";
import {
  BOOT_ID,
  readClock,
  readCaptures,
  readProposalsForAsset,
  readDecisions,
} from "../store/memory.ts";
import type { ActingAccount } from "../attribution/index";
import type { WorkOrder, WalkPayload, VerificationResult, Proposal, Capture } from "../data/types";

/**
 * D-03: no verify-purpose capture has ever been recorded for this
 * asset in this order. authoredMatch() is deliberately NOT called
 * here — for an asset that genuinely exists in the current fixture
 * set it would answer "matched" even though nothing was ever
 * photographed, which is exactly the invented verification this
 * payload must never carry. capture_id and verified_at are empty
 * strings rather than a fabricated id or a fabricated moment in
 * time: an honest "nothing to report yet", not an approximation of
 * one.
 */
function noVerificationYet(assetId: string): VerificationResult {
  return {
    asset_id: assetId,
    capture_id: "",
    outcome: "pending",
    matched_tag: null,
    matched_serial: null,
    method: "authored",
    confidence: null,
    label: "authoredVerification",
    verified_at: "",
  };
}

/** The most recent of a set of captures, by recorded_at (the instant
    this module's own store recorded it), never captured_at, which is
    a device claim. `null` when the set is empty. */
function mostRecentCapture(captures: Capture[]): Capture | null {
  let best: Capture | null = null;
  for (const capture of captures) {
    if (!best || Date.parse(capture.recorded_at) > Date.parse(best.recorded_at)) {
      best = capture;
    }
  }
  return best;
}

/**
 * The whole of one order's record, assembled fresh on every call from
 * the store and the fixtures — nothing here is cached across calls.
 * `nowMs` defaults to Date.now() purely so a unit test can pin
 * `issued_at`; no route ever supplies it.
 */
export function buildWalkPayload(
  account: ActingAccount,
  order: WorkOrder,
  nowMs: number = Date.now(),
): WalkPayload {
  const clock = readClock(account.account_id, order.id) ?? {
    order_id: order.id,
    account_id: account.account_id,
    segments: [],
    elapsed_s: 0,
  };

  const orderCaptures = readCaptures(account.account_id).filter(
    (capture) => capture.order_id === order.id,
  );
  const decisions = readDecisions(account.account_id);

  const assets: WalkPayload["assets"] = [];
  for (const asset of assetsForOrder(order)) {
    const assetId = asset.id;
    // Only asset_id and tag cross into this record — every other
    // Machinery field, observation_ids above all (server-only, per
    // its own definition in lib/data/types.ts), stays behind: this
    // loop never spreads `asset` itself into the entry pushed below.
    const assetCaptures = orderCaptures.filter((capture) => capture.asset_id === assetId);
    const verifyCapture = mostRecentCapture(
      assetCaptures.filter((capture) => capture.purpose === "verify"),
    );
    const verification: VerificationResult = verifyCapture
      ? {
          ...authoredMatch(assetId, FIXTURE_VERSION),
          capture_id: verifyCapture.id,
          verified_at: verifyCapture.recorded_at,
        }
      : noVerificationYet(assetId);

    const assetProposals = readProposalsForAsset(account.account_id, assetId).filter(
      (proposal) => proposal.order_id === order.id,
    );

    // Filtering on `state` alone keeps the three sets disjoint by
    // construction (FR-53): a rejection can never also read back as
    // an open proposal, and neither can ever read back as an accepted
    // one. `superseded` is the closed set's fourth member, but
    // nothing in this phase's mutating path ever assigns it
    // (lib/reconcile/apply.ts's own assertProposalState only ever
    // assigns open, accepted or rejected — see that module's own
    // comment on the point), so every real proposal here lands in
    // exactly one of the three sets below.
    const candidateFacts: WalkPayload["assets"][number]["candidate_facts"] = [];
    const rejected: Proposal[] = [];
    const open: Proposal[] = [];
    for (const proposal of assetProposals) {
      if (proposal.state === "accepted") {
        // accepted_by, accepted_at and arrived_via are read off the
        // decision record itself, never off any claim a client made
        // (FR-54): a decision's own arrived_via is already derived
        // from the item's queued/immediate state, not from
        // decided_where_claimed, which is shown as a claim only.
        const decision = decisions.find((entry) => entry.proposal_id === proposal.id) ?? null;
        candidateFacts.push({
          ...proposal,
          // A Decision is created in the same commit that flips a
          // proposal to accepted (AD-6), so `decision` here is never
          // actually null — the fallback below is a type-safety
          // accommodation for an unreachable case, not a real path.
          accepted_by: decision ? decision.decided_by : null,
          accepted_at: decision ? decision.decided_at : null,
          arrived_via: decision ? decision.arrived_via : "immediate",
        });
      } else if (proposal.state === "rejected") {
        rejected.push(proposal);
      } else if (proposal.state === "open") {
        open.push(proposal);
      }
    }

    assets.push({
      asset_id: assetId,
      tag: asset.tag,
      verification,
      captures: assetCaptures.map((capture) => ({
        ...capture,
        thumb_present: typeof capture.thumb === "string" && capture.thumb.length > 0,
        // Literal false: no route in this preview accepts audio
        // bytes at all, so the record states the fact rather than
        // leaving a reader to infer it from an absent field.
        audio_left_device: false,
      })),
      candidate_facts: candidateFacts,
      rejected,
      open,
    });
  }

  return {
    schema: "novatek.capture.walk/1",
    issued_at: new Date(nowMs).toISOString(),
    store: {
      kind: "memory",
      instance: BOOT_ID,
      ttl_s: STORE_TTL_SECONDS,
      statement:
        GOVERNED.memoryStore.before + GOVERNED.memoryStore.strong + GOVERNED.memoryStore.after,
    },
    account: account.account_id,
    order,
    clock,
    assets,
    // P9 supplies both the route and the entries here; an empty array
    // is the honest present state of this preview, not a stand-in for
    // work not yet done.
    referrals: [],
    redaction: {
      ran: false,
      statement: GOVERNED.noRedaction.before + GOVERNED.noRedaction.strong + GOVERNED.noRedaction.after,
    },
  };
}
