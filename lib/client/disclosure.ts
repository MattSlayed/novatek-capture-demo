/* ================================================================
   THE FR-48a FIRST-ENTRY FLAG — the one fact Phase 4 keeps on the
   device (REQ-FR-48a)

   FR-48a requires the gate to state which claims are enforced
   server-side and which are authored before any of them is met, and
   on re-entry to show the short form with a control that reopens the
   long one. Something has to remember "re-entry". This module is the
   only place that remembers it: one versioned key, one reader, one
   writer, and nothing at module scope.

   Why the device, and why that is the honest choice. No server-side
   mechanism exists. The store is memory-only (AD-10) and the session
   cookie is HttpOnly — verified unreadable from script after a mint
   — so the server cannot know whether this reader has seen the long
   form, and inventing a way would persist a per-reader fact the
   architecture says is not persisted.

   What this flag cannot know, stated so a later phase does not
   "repair" it. The claim "this reader has already seen the long
   form" is a claim about a person, and no client-side token can
   carry a claim about a person. A shared phone, a cleared browser, a
   private window and a second device are all readers who may not
   have seen it, and every one of them gets the long form again. That
   re-showing is not a defect. It is the mechanism admitting what it
   does not know, in the only direction that cannot under-disclose.
   Deliberate, not an oversight.

   The failure direction follows from the same rule. A store that is
   absent (plain Node, a server render), disabled, or that throws on
   access (some private modes) answers "not seen", and a write that
   throws is swallowed: the reader then meets the long form, which is
   the safe error. Neither function ever touches the store at module
   scope, so this file imports cleanly under Node and cannot cause a
   hydration mismatch; the gate calls the reader from an effect only
   (04-RESEARCH Pattern 6, Pitfall 11).

   The key carries a version suffix. If the disclosure's content ever
   changes in a way readers must meet again, bumping the suffix makes
   every earlier "seen" unreadable rather than silently honoured.
   ================================================================ */

/** The single key this module reads and writes. Versioned on purpose. */
export const DISCLOSURE_KEY = "capture.fr48a-disclosure.v1";

/** The one value that means "seen". Anything else reads as not seen. */
const SEEN = "seen";

/**
 * Whether this browser has recorded that the long form was shown.
 * Any failure — no store, a disabled store, a throwing read — answers
 * `false`, so the caller shows the long form.
 */
export function hasSeenDisclosure(): boolean {
  try {
    return globalThis.localStorage?.getItem(DISCLOSURE_KEY) === SEEN;
  } catch {
    return false;
  }
}

/**
 * Record that the long form has been shown. A store that refuses the
 * write leaves the flag unset, and the next entry shows the long form
 * again — the safe direction, so the failure is swallowed, not raised.
 */
export function markDisclosureSeen(): void {
  try {
    globalThis.localStorage?.setItem(DISCLOSURE_KEY, SEEN);
  } catch {
    // Deliberately empty: an unrecorded "seen" re-shows the long form.
  }
}
