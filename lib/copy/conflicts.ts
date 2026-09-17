/* ================================================================
   CONFLICT AND REJECT COPY (D-06)

   Every refusal sentence the server sends resolves through one of
   the three records below. No module in this phase may write a
   refusal sentence as a literal at its call site: the curl suite's
   expected string and the server's actual string are then the same
   string, by construction, rather than two hand-typed copies that
   can drift apart.

   This is NOT a governed module. D-06 says a conflict sentence is
   not a governed sentence; scripts/check-governed.mjs's closed set
   of eight does not cover it, and lib/copy/governed.ts is not edited
   by this plan or any plan in this phase.

   Sentences marked [seed] are quoted verbatim from EXPERIENCE.md's
   offline-semantics table (itself quoting the seed). Sentences
   marked [written here] are new, authored to the same eight voice
   rules EXPERIENCE.md's "Voice and Tone" section states, and to the
   claims register scripts/claims-audit.mjs enforces.
   ================================================================ */

import type { ConflictCode, RejectCode } from "../data/types";

export interface RefusalCopy {
  sentence: string;
  actions: string[];
}

/**
 * The five transport-level refusals a request can hit before any
 * order, capture or decision exists to attach a ConflictCode or
 * RejectCode to. New to this phase — no seed table covers them.
 */
export type TransportErrorCode =
  | "no_session"
  | "unknown_persona"
  | "bad_request"
  | "method_not_allowed"
  | "batch_too_large";

export const CONFLICT_COPY: Record<ConflictCode, RefusalCopy> = {
  // [written here, otherwise] — EXPERIENCE.md's persona-switch case
  // for this code is the account_mismatch card below, not a second
  // order_not_found string: FR-6 requires one and only one not-found
  // sentence, so an unowned id and a fabricated id cannot be told
  // apart by their prose.
  order_not_found: {
    sentence: "This order is not on your card. Nothing was bound.",
    actions: ["Discard"],
  },
  // [seed] + [written here] — the seed's own sentence elided the
  // clause EXPERIENCE.md spells out; the combined sentence below is
  // the one D-05 names as this code's reachable-trigger wording.
  order_closed: {
    sentence: "The order was closed before this arrived. Nothing was bound.",
    actions: ["Discard"],
  },
  // [written here] — D-06
  not_open: {
    sentence:
      "This order is not open, so there was nothing to close and nothing was bound. Open the order, then close it.",
    actions: ["Discard", "Open the order"],
  },
  // [written here] — the referral hand-off this refusal used to
  // offer is deliberately withdrawn: FR-R1 forbids reaching a
  // referral from this refusal, and offering it here would teach the
  // artisan to provoke an error to find the door.
  asset_not_in_order: {
    sentence:
      "That asset is not on this work order. Nothing was bound. Discard this and capture the assets on your card.",
    actions: ["Discard"],
  },
  // [written here] — EXPERIENCE.md's table describes this card
  // rather than quoting a sentence for it. Names the mechanism
  // without naming a persona: the acting account is a runtime value,
  // and a sentence that interpolated one would be a second literal.
  account_mismatch: {
    sentence:
      "This item was queued under a different account than the one now signed in, so nothing was bound under this session. Discard it, or sign in as the account that queued it.",
    actions: ["Discard", "Sign in as the account that queued it"],
  },
  // [written here]
  proposal_superseded: {
    sentence:
      "A newer verification replaced this proposal before your decision arrived. Nothing was bound.",
    actions: ["Re-decide"],
  },
  // [written here]
  already_recorded_differently: {
    sentence:
      "This decision was already recorded, and it was recorded differently. Nothing was changed.",
    actions: ["Discard", "Re-decide"],
  },
  // [seed]
  clock_skew: {
    sentence:
      "This phone's clock disagrees with the server by 3 h 12 m. Check the phone's time and decide again.",
    actions: ["Discard", "Decide again"],
  },
  // P9 supplies this sentence. Kept as an explicit, empty gap rather
  // than inferred, so the Record<> below stays total and a reader
  // can see the two gaps instead of guessing at them.
  referral_evidence_missing: {
    sentence: "",
    actions: [],
  },
};

export const REJECT_COPY: Record<RejectCode, RefusalCopy> = {
  // [written here]
  bad_shape: {
    sentence:
      "The server could not read this item — a field was missing or malformed, and nothing was bound. Capture it again.",
    actions: ["Discard", "Capture again"],
  },
  // [written here]
  media_too_large: {
    sentence:
      "This photograph is larger than the demo server accepts, so nothing was bound. The demo server caps the size it will store — retake it and a fresh frame is sent.",
    actions: ["Discard", "Retake"],
  },
  // [written here]
  unknown_kind: {
    sentence:
      "The server does not recognise what this item is — an older preview queued it and a newer one is running. Reload, then capture it again.",
    actions: ["Discard", "Reload and capture again"],
  },
  // [written here]
  unknown_proposal: {
    sentence:
      "The server cannot derive this proposal from any record it holds, so your decision bound nothing. Re-verify the asset and decide again.",
    actions: ["Re-verify"],
  },
  // P9 supplies this sentence — see referral_evidence_missing above.
  unknown_referral: {
    sentence: "",
    actions: [],
  },
  // [seed]
  store_evicted: {
    sentence:
      "The demo server's memory store made room and this proposal was dropped — re-verify the asset.",
    actions: ["Re-verify"],
  },
};

export const TRANSPORT_COPY: Record<TransportErrorCode, RefusalCopy> = {
  // [written here]
  no_session: {
    sentence:
      "This request carried no session, so the server has no account to act as and nothing was bound. Choose an artisan at the gate, then try again.",
    actions: ["Choose an artisan"],
  },
  // [written here]
  unknown_persona: {
    sentence:
      "That persona is not one of the three this preview carries, so no session was minted.",
    actions: ["Choose an artisan"],
  },
  // [written here]
  bad_request: {
    sentence:
      "The server could not read this request as JSON, so nothing was bound. Send it again as JSON.",
    actions: ["Discard", "Send it again"],
  },
  // [written here]
  method_not_allowed: {
    sentence:
      "This route does not accept that method, so nothing was bound and nothing was changed. Use the method this route documents.",
    actions: ["Read it instead"],
  },
  // [written here] — the app-level batch ceiling in lib/limits. This
  // is a different refusal from lib/copy/governed.ts's PLATFORM_413:
  // that one is the hosting platform refusing before the preview
  // server ever saw the body. Two different refusals, two different
  // sentences, and neither is imported in place of the other.
  batch_too_large: {
    sentence:
      "This batch is larger than the demo server accepts, so nothing in it was bound. The demo server caps how many items and how many bytes it will take at once — send fewer items.",
    actions: ["Discard", "Send fewer items"],
  },
};
