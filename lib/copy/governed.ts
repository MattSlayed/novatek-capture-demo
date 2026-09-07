/* ================================================================
   GOVERNED SENTENCES

   The single definition of every governed sentence (AD-12). Each of
   the eight sentences below is declared exactly once, here, split
   into `before` / `strong` / `after` so a renderer can wrap the
   load-bearing clause in <strong> without restating the sentence. A
   second literal of any of these sentences anywhere under app/,
   components/ or lib/ fails the build — scripts/check-governed.mjs
   reads this module and sweeps every other file for a duplicate,
   including one split across lines or hidden in a comment.

   The honesty surface may only be strengthened, never softened or
   paraphrased (AD-22): a sentence exported here may gain emphasis or
   placement in a later phase, but its wording never changes and it
   is never suppressed, shortened or reduced to a chip.

   The set of eight is closed. Adding a ninth sentence requires this
   module AND scripts/check-governed.mjs's closed-set assertion to be
   changed in the same commit — the check fails the build otherwise.

   Do not put any of the eight sentences in a comment anywhere in this
   codebase. A commented copy is still a second literal.
   ================================================================ */

export type GovernedKey =
  | "preview"
  | "authoredVerification"
  | "authoredProposals"
  | "noRedaction"
  | "memoryStore"
  | "noOfflineInference"
  | "pendingReconciliation"
  | "mediaOnDevice";

export type GovernedSentence = {
  before: string;
  strong: string;
  after: string;
};

export const GOVERNED: Record<GovernedKey, GovernedSentence> = {
  preview: {
    before: "",
    strong: "Designed preview.",
    after:
      " Capture is specified, not yet built. The plant, the people and every record here are synthetic.",
  },
  authoredVerification: {
    before: "Matched to record — ",
    strong: "authored for this preview. No model ran.",
    after:
      " The match is drawn from the asset record, not from your photograph.",
  },
  authoredProposals: {
    before: "",
    strong: "Authored observations — no model observed this photograph.",
    after:
      " Each is drawn from the asset's own history so the accept/reject gate can be shown working.",
  },
  noRedaction: {
    before: "",
    strong: "No redaction runs in this preview.",
    after:
      " Faces, name boards and screens are not blurred. Photograph the plant, not people.",
  },
  memoryStore: {
    before: "The server keeps this ",
    strong: "in memory only",
    after:
      ", for a few hours at most, and discards it on cold start. There is no database behind this preview.",
  },
  noOfflineInference: {
    before: "Without signal, ",
    strong: "nothing is verified or observed on this phone.",
    after:
      " The capture is queued as a draft; the server does that work when you reconnect.",
  },
  pendingReconciliation: {
    before: "Decided on this phone at {time} — ",
    strong: "pending reconciliation.",
    after:
      " It binds only after the server confirms the order is still yours.",
  },
  mediaOnDevice: {
    before:
      "The full photograph stays on this phone; a small preview and a fingerprint leave it. ",
    strong:
      "The recording never leaves this phone; only its fingerprint and length do.",
    after: "",
  },
};

// [written here] — D-07, D-19: new copy authored for this preview
export const PLATFORM_413: GovernedSentence = {
  before:
    "The hosting platform refused this request before the preview server saw it, because the body was larger than the platform allows. The preview server recorded nothing. Send a smaller capture, or fewer items at once, and try again.",
  strong: "",
  after: "",
};
