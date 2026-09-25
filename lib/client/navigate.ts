/* ================================================================
   NAVIGATE — what a legal screen is, how a screen is identified,
   and the only two writes to the history stack
   (D-01, D-02, D-03; SC-5 / invariant A12)

   This module owns three things, and nothing else in the codebase
   owns any of them:

     1. The closed set of surfaces this phase has, and the two
        guards that decide whether a URL names one. `s` and `id`
        arrive from a link anyone can craft, so they are validated
        here — D-01's "one parse point", written as a module rather
        than as a few lines inside a component, so the rule is
        importable and provable before any pixel exists.
     2. The identity of a screen: `screenKey`. Two screens that
        share a surface but not an id are two different screens.
     3. The two history writes. `goTo` pushes, `replaceWith`
        replaces, and there is no third door.

   What breaks if a second module does any of this job:

     - A second surface list drifts from this one, and the drift
       shows up as a URL that validates in one place and not the
       other: a blank screen with no refusal, because nothing
       refused.
     - A second history write escapes D-02's replace-never-push
       rule, which is the only thing keeping the gate off the back
       stack and keeping a refused deep link from leaving an entry
       behind it.
     - A second screen-key derivation is 04-RESEARCH.md Pitfall 4
       all over again: an effect keyed on `s` alone does not re-run
       on an id-only transition, so focus is left on a control that
       has just been replaced.

   SC-5 / invariant A12: no next/link, no useRouter, no
   router.push. `window.history` is used directly, which is the
   framework's own documented path for shallow routing — the
   prohibition is satisfied by the supported route, not by a
   workaround.

   This file carries no client directive, deliberately, and does not
   quote one anywhere — a quoted copy in a comment is still a second
   literal, and this module is asserted free of it. It is a plain
   module, not a component: it renders nothing, so the directive
   would only enlist it in a component graph it has no place in.
   Nothing here touches a browser global at module scope either, so
   `node --test` imports it directly and drives every exported
   function with plain values.
   ================================================================ */

/**
 * The surfaces this phase has. A `const` tuple with the union
 * derived from it — `lib/copy/governed.ts`'s shape for its own
 * closed set (04-PATTERNS.md Shared Pattern 7). `limits` is
 * already built; the other three are this phase's.
 *
 * A fifth surface is a change to this line AND to
 * `navigate.test.mjs`'s closed-set assertion, in the same commit.
 * The duplication is the check.
 */
export const SURFACES = ["orders", "order", "time", "limits"] as const;

export type Surface = (typeof SURFACES)[number];

/**
 * `raw` is whatever `?s=` carried, including nothing at all.
 * Anything that is not literally a member of `SURFACES` is null,
 * and the caller renders what a null selects rather than guessing
 * at an intention.
 *
 * `order/wo-0142` is therefore null, not `order`: D-01 rejected
 * that encoding precisely because it has to be split before it can
 * be validated, which gives one malformed value two ways to be
 * wrong. Nothing in this module splits anything.
 */
export function parseSurface(raw: string | null): Surface | null {
  return SURFACES.includes(raw as Surface) ? (raw as Surface) : null;
}

/**
 * A shape guard, not an existence check — and the distinction is
 * the whole of D-02. The server decides existence and ownership,
 * and decides them byte-identically (AD-4), so a well-formed id
 * for an order this account does not own passes here and is
 * refused there. Deciding ownership on the client would put a
 * second, weaker answer in front of the one SM-1 asks a reviewer
 * to test.
 *
 * The value this returns is only ever a fetch path segment. It is
 * never rendered as text, never interpolated into markup and never
 * placed in a header — so React's escaping is not what makes it
 * safe: it does not reach markup at all.
 */
const ORDER_ID_RE = /^wo-[0-9]{4}$/;

export function parseId(raw: string | null): string | null {
  return raw !== null && ORDER_ID_RE.test(raw) ? raw : null;
}

/**
 * The identity of a screen: the surface and its argument joined by
 * a single `|`. Both halves, always, even when the surface takes no
 * argument.
 *
 * Why the whole identity and never `s` alone. Measured in
 * 04-RESEARCH.md Pattern 4: on `?s=order&id=wo-0142` →
 * `?s=order&id=wo-0151`, an effect keyed on `s` did not re-run
 * while the one keyed on this value did. With `s`-only keying,
 * focus would have stayed on a control belonging to the previous
 * order — which drops focus to `<body>` when that control leaves
 * the DOM, and sends VoiceOver and TalkBack back to the top of the
 * document. Takes `string` rather than `Surface` on purpose: a
 * screen with no valid surface still has an identity, and it must
 * be distinguishable from every other one.
 */
export function screenKey(s: string, id: string): string {
  return `${s}|${id}`;
}

/**
 * The URL a surface lives at. `id` is a query key and stays one:
 * D-01 requires it for validation reasons, and Pitfall 7 gives the
 * second, independent reason — `useParams` is not updated by
 * `pushState`/`replaceState` (vercel/next.js#80528), so had `id`
 * been a path segment, history-state navigation would not have
 * worked at all. A later "tidy-up" into `/order/wo-0142` breaks
 * screen switching entirely.
 *
 * With no id the key is omitted entirely rather than written empty:
 * `?s=orders&id=` would put a value in the URL that `parseId`
 * refuses, which is a URL this module both writes and rejects.
 */
export function hrefFor(s: Surface, id?: string): string {
  const q = new URLSearchParams({ s, ...(id ? { id } : {}) });
  return `/?${q.toString()}`;
}

/**
 * A forward move: the new screen gets a back entry, so browser
 * back, Android hardware back and the iOS edge swipe all return to
 * the screen the artisan came from. Used for list → detail and
 * detail → time.
 *
 * `window` is destructured inside the body, never read at module
 * scope, so this module imports cleanly under plain Node.
 */
export function goTo(s: Surface, id?: string): void {
  const { history } = window;
  history.pushState(null, "", hrefFor(s, id));
}

/**
 * The gate's entry, and D-02's correction: replace, never push.
 *
 * Replacing is what keeps the gate off the back stack — it is
 * never reachable backwards (EXPERIENCE.md §Navigation contract) —
 * and what makes a refused deep link leave no entry behind it: the
 * URL that was refused is gone, not one back-press away from being
 * refused again. D-03's "the requested surface is dropped" is only
 * safe because of this.
 *
 * Verified in 04-RESEARCH.md Pattern 3: a `replaceState` leaves no
 * back entry, and a `replaceState` to an identical URL is a genuine
 * no-op — no re-render, no effect. Idempotent navigation is free,
 * so a caller never has to compare the current URL first.
 */
export function replaceWith(s: Surface, id?: string): void {
  const { history } = window;
  history.replaceState(null, "", hrefFor(s, id));
}
