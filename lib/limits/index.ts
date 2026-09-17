/* ================================================================
   LIMITS — every bounded quantity, one export each (AD-13)

   AD-13: every bounded quantity this project needs is one export
   here, read by both sides that need to agree on it. A value
   restated on one side and not the other is a cap that does not
   hold — this module is what makes a restatement a compile error
   (the import fails) rather than a silent drift. No planning
   document restates a value found here; a plan cites the export's
   name, not the number.

   Unit convention, stated once: byte ceilings are binary
   (1 KB = 1024 bytes, 1 MB = 1024 x 1024 bytes), durations are in
   seconds unless the name ends `_MS`, and every comment beside a
   byte export shows the arithmetic that produced the literal.

   This module imports nothing: it is source-of-truth, not
   configuration-of-truth, so no export here is read from an
   environment variable or computed from another export.
   ================================================================ */

/** Thumbnail server hard cap, in base64-encoded bytes: 64 KB = 64 * 1024. */
export const THUMB_MAX_ENCODED_BYTES = 65536;

/**
 * Thumbnail client target, in base64-encoded bytes: 40 KB = 40 * 1024.
 * AD-13's client-target-below-server-ceiling rule: this must stay
 * strictly less than `THUMB_MAX_ENCODED_BYTES` (asserted in this
 * module's own test, not just described here).
 */
export const THUMB_CLIENT_TARGET_ENCODED_BYTES = 40960;

/** Per-account capture cap (P3 starting value, from the seed). */
export const CAPTURES_PER_ACCOUNT_MAX = 200;

/** Per-account decision cap (P3 starting value, from the seed). */
export const DECISIONS_PER_ACCOUNT_MAX = 200;

/** Per-account clock-segment cap (P3 starting value, from the seed). */
export const CLOCK_SEGMENTS_PER_ACCOUNT_MAX = 20;

/** Per-account `seen` (idempotency) entry cap (P3 starting value, from the seed). */
export const SEEN_ENTRIES_PER_ACCOUNT_MAX = 500;

/**
 * Global store object cap across every account (P3 starting value,
 * from the seed). Must stay strictly greater than
 * `SEEN_ENTRIES_PER_ACCOUNT_MAX` — a per-account cap larger than the
 * global cap could never be reached.
 */
export const STORE_GLOBAL_OBJECT_MAX = 5000;

/** Store TTL: 6 h = 6 * 60 * 60 seconds. */
export const STORE_TTL_SECONDS = 21600;

/** Session cookie `Max-Age`: 12 h = 12 * 60 * 60 seconds. */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 43200;

/**
 * The online clock-offset window (D-07): how far the server's clock
 * and an online request's own timing may disagree before it matters.
 */
export const ONLINE_CLOCK_OFFSET_WINDOW_SECONDS = 60;

/**
 * The queued-item skew tolerance, future bound (D-07's clamp): a
 * queued `order_open` may claim a start up to 60 min = 60 * 60
 * seconds ahead of the clamp floor before it is clamped.
 */
export const QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS = 3600;

/**
 * The queued-item skew tolerance, the slack below `issued_at` (D-07's
 * clamp floor): 5 min = 5 * 60 seconds. Must stay strictly less than
 * `QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS` (asserted in this module's
 * own test) — the floor is a narrower allowance than the future bound.
 */
export const QUEUED_CLOCK_FLOOR_SLACK_SECONDS = 300;

/** The sync route's item ceiling (D-02; P3 starting value, from the seed). */
export const SYNC_MAX_ITEMS = 50;

/**
 * The sync route's encoded-byte ceiling (D-02; P3 starting value, from
 * the seed): 3 MB = 3 * 1024 * 1024 bytes. The client's own outbound
 * budget is a separate, strictly smaller export that P6 declares — see
 * the closing note below.
 */
export const SYNC_MAX_ENCODED_BYTES = 3145728;

/**
 * The ceiling on a capture's declared original `bytes` (Claude's
 * discretion, not in CONTEXT.md's table): 32 MiB = 32 * 1024 * 1024.
 * The thumbnail cap above bounds what the server stores; this bounds
 * what a client may claim the original was, so an absurd declared
 * size is refused `media_too_large` rather than recorded. P5 may
 * re-tune this against a real re-encode.
 */
export const CAPTURE_MAX_DECLARED_BYTES = 33554432;

/**
 * The bounded voice-note duration FR-14 names (Claude's discretion,
 * not in CONTEXT.md's table): 120 s = 120 * 1000 ms. It lands here
 * because `lib/reconcile/validate.ts` needs a ceiling to refuse
 * against in this phase; P5 owns the recorder and may re-tune it.
 */
export const VOICE_MAX_DURATION_MS = 120000;

/**
 * How many evicted proposal ids the store remembers per account
 * (Claude's discretion, not in CONTEXT.md's table), so `store_evicted`
 * is distinguishable from `unknown_proposal` after a sweep. Bounded so
 * the eviction record cannot itself become unbounded growth.
 */
export const EVICTION_RECORD_PER_ACCOUNT_MAX = 100;

/* ----------------------------------------------------------------
   Two decisions taken here, recorded rather than left implicit:

   1. `FIXTURE_VERSION` is NOT re-exported from this module (Phase 2
      D-15 left this open). It is not a bounded quantity, no client
      import needs it in this phase, and one definition (in
      lib/data/fixtures.ts) is worth more than one import site.

   2. The client's outbound batch budget is NOT declared here. D-02
      puts it in P6 as a separate named export strictly below
      `SYNC_MAX_ENCODED_BYTES`; declaring it now would be deciding
      P6's open question.
   ---------------------------------------------------------------- */
