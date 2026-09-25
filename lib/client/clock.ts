/* ================================================================
   CLOCK — every arithmetic and every formatting decision the clock
   control and the time-on-order surface make
   (FR-58, FR-10, REQ-NFR-6; UI-SPEC Decisions 2 and 3)

   This module owns the whole of it: how a server anchor becomes a
   displayed elapsed figure, how an integer second count becomes
   `H:MM:SS`, how a server ISO instant becomes the two halves a
   `<time>` element needs, and how an `OrderClock` becomes the rows
   FR-58 requires. No component performs date or duration
   arithmetic at a call site.

   What breaks if a second place does any of this job:

     - Two derivations of the same figure can disagree, and a clock
       that disagrees with itself is a wrong number about a
       server-derived fact. That is the one failure this surface may
       not have, because the artisan's accrued hours are what the
       record is for.
     - A second segment mapping is how the obvious missing column
       gets added later. `segmentRows` below states, in its own
       comment, why there is no per-segment duration — so that the
       absence reads as a decision and not as an oversight.

   Every reading of the monotonic timer is a PARAMETER of the
   function that needs it. This module calls no browser global,
   holds no state and starts no timer, so `node --test` imports it
   directly and drives all six exports with plain values.

   The record's shape is imported, never restated: `OrderClock` is
   the only description of what a clock record carries, and its own
   optional fields are what FR-58's present-fields-versus-absences
   discipline is read from.
   ================================================================ */

import type { OrderClock } from "../data/types";

/* ---------------------------------------------------------------
   the anchor, and the one piece of arithmetic that uses it
   --------------------------------------------------------------- */

/**
 * The last elapsed figure the server sent, together with the
 * monotonic reading at which it arrived. `readAtMono` is a
 * `performance.now()` value — deliberately not a wall-clock instant
 * (see `elapsedAt`).
 */
export type Anchor = {
  elapsedS: number;
  readAtMono: number;
};

/**
 * Build an anchor from a server record and the monotonic reading at
 * which that record arrived.
 *
 * `elapsed_s` is taken as given: FR-10 makes accrued hours a
 * server-side computation, so this module never sums segments to
 * arrive at its own total. The anchor is replaced by every response
 * that carries an `OrderClock` — the order list's `clocks`, the
 * order detail's `clock`, `GET /api/hours`, and the answers to open
 * and close — and is never advanced by a tick.
 */
export function anchorFrom(clock: OrderClock, nowMono: number): Anchor {
  return { elapsedS: clock.elapsed_s, readAtMono: nowMono };
}

/**
 * The displayed elapsed figure: the anchor's own seconds plus the
 * whole seconds measured since it arrived.
 *
 *     displayed = anchor.elapsedS + floor((nowMono - readAtMono) / 1000)
 *
 * RECOMPUTED, NEVER ACCUMULATED, and this is the decided point
 * rather than a preference. Chrome throttles timers in a hidden page
 * to once a second, and — after the page has been hidden more than
 * five minutes — to once a minute. A display that added one second
 * per tick would under-report by minutes after a phone spent ten
 * minutes in a pocket, which is a wrong number about a
 * server-derived fact. A recomputed display is correct at any tick
 * frequency: a throttled tick only makes it update less often, and
 * the first tick after the page becomes visible again snaps it to
 * the truth.
 *
 * The delta is measured monotonically — the caller passes a reading
 * from `performance.now()`, not `Date.now()` — so a device clock
 * correction mid-segment cannot make the figure jump for a reason
 * that has nothing to do with the record. A clock display that
 * moves for an unrelated reason is a false statement about the
 * record. (The instants the time surface renders are a separate
 * matter: those are the server's own strings, untouched — see
 * `formatInstant`.)
 *
 * The delta is floored and clamped at zero, so a reading that
 * arrives before the anchor's own can never show less time accrued
 * than the server already counted.
 */
export function elapsedAt(anchor: Anchor, nowMono: number): number {
  const sinceAnchorS = Math.floor((nowMono - anchor.readAtMono) / 1000);
  return anchor.elapsedS + Math.max(0, sinceAnchorS);
}

/* ---------------------------------------------------------------
   the two rendering formats (UI-SPEC Decision 2)
   --------------------------------------------------------------- */

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * `H:MM:SS`, with the hour field unpadded and uncapped — `0:03:12`
 * for 192 seconds, `25:00:00` for 90000. No `d` field and no
 * rollover: a 25-hour accrual reads as twenty-five hours.
 *
 * A base-60 regrouping of an integer second count is lossless and
 * reversible, so this is a rendering and not a claim: the reader can
 * recover the exact server figure from what is on screen. That is
 * why the one surface whose purpose is provenance is allowed to
 * regroup at all.
 *
 * Used for the clock-level ACCRUED figure (`elapsed_s`, a server
 * field), for the live figure `elapsedAt` returns, and for MEASURED
 * OFFSET (`device_offset_s`, also a server field).
 */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 3600)}:${pad(Math.floor((whole % 3600) / 60), 2)}:${pad(whole % 60, 2)}`;
}

/**
 * Both halves of one instant, from one field.
 *
 * `machine` is the server's own ISO string returned byte-unmodified
 * — it is what goes in `<time datetime="…">`, so a reviewer can
 * compare the rendered screen against the network panel character
 * for character, which is what C-32 and C-54 ask of every reviewer
 * surface. `human` is `YYYY-MM-DD HH:MM:SS` in the device's own
 * zone, which is the reading an artisan wants.
 *
 * Both come from the same field, so they cannot drift.
 *
 * ONE FORMAT ALWAYS, never conditional on whether two instants
 * share a calendar day: the shortened form that omits a repeated
 * date is exactly the form that hides a day boundary, and a segment
 * that crossed midnight is a fact the artisan is entitled to read.
 */
export type Instant = {
  machine: string;
  human: string;
};

export function formatInstant(iso: string): Instant {
  const at = new Date(iso);
  const date = `${pad(at.getFullYear(), 4)}-${pad(at.getMonth() + 1, 2)}-${pad(at.getDate(), 2)}`;
  const time = `${pad(at.getHours(), 2)}:${pad(at.getMinutes(), 2)}:${pad(at.getSeconds(), 2)}`;
  return { machine: iso, human: `${date} ${time}` };
}

/* ---------------------------------------------------------------
   the three clock states (UI-SPEC Decision 3)
   --------------------------------------------------------------- */

/**
 * The three states the clock control has, named for the fact about
 * the record rather than for the label, so a component switches on
 * one of these and re-derives nothing:
 *
 *   "no-segments"         → label OPEN    → POST …/open
 *   "segment-running"     → label CLOSE   → POST …/close
 *   "all-segments-closed" → label REOPEN  → POST …/open
 *
 * `REOPEN` is a distinct label from `OPEN` because reopening
 * APPENDS a new segment and retains the prior ones (FR-9); it does
 * not resume anything. The name above says the same thing, which is
 * why it is not called "paused".
 */
export type ClockState =
  | "no-segments"
  | "segment-running"
  | "all-segments-closed";

export function clockState(clock: OrderClock): ClockState {
  if (clock.segments.length === 0) return "no-segments";
  const running = clock.segments.some((segment) => segment.closed_at === null);
  return running ? "segment-running" : "all-segments-closed";
}

/* ---------------------------------------------------------------
   FR-58's segment mapping (UI-SPEC Decision 2)
   --------------------------------------------------------------- */

/**
 * The two state marks this surface uses, from C-33's closed set of
 * seven. A filled square means BOUND, and a server-stamped segment
 * is recorded. The hollow square with a centred dot means KEPT, AND
 * UNRESOLVED — what differs about a device-claimed segment is not
 * the binding but the provenance of the instant, which is known
 * only within the measured offset. No eighth mark is invented
 * (invariant A4), and the mark is never the only channel: the SOURCE
 * pair carries a word as well, and a word has no colour channel at
 * all (REQ-NFR-6).
 */
export type SourceMark = "filled-square" | "hollow-square-dot";

export type SourceWord = "SERVER-STAMPED" | "DEVICE-CLAIMED";

export type SegmentTerm =
  | "SOURCE"
  | "STARTED"
  | "DEVICE CLAIMED"
  | "MEASURED OFFSET"
  | "ENDED";

/**
 * A pair's value, discriminated so the component chooses a
 * rendering rather than a meaning. `instant` renders as `<time>`
 * with both halves; `figure` is an already-regrouped `H:MM:SS`
 * string; `word` is the one case where a term has no value from the
 * record because the record's value is `null`.
 */
export type SegmentValue =
  | { kind: "mark"; mark: SourceMark; word: SourceWord }
  | { kind: "instant"; machine: string; human: string }
  | { kind: "figure"; text: string }
  | { kind: "word"; word: "RUNNING" };

export type SegmentPair = {
  term: SegmentTerm;
  value: SegmentValue;
};

/**
 * Every segment of the record, mapped to an ordered list of
 * term/value pairs. One inner array per segment, in the record's own
 * order.
 *
 * The mapping is field-by-field and total, which is how FR-58's
 * "nothing withheld" is provable rather than asserted: `source`,
 * `opened_at`, `device_claimed_opened_at`, `device_offset_s` and
 * `closed_at` are the whole of what a segment carries, and each one
 * appears below exactly once.
 *
 * THE TWO DEVICE PAIRS ARE ABSENT, NOT EMPTY, where the record does
 * not carry them. `OrderClock` marks both fields optional, so their
 * absence is itself the fact — rendering an empty row would state a
 * field the record does not have. This is FR-55's
 * present-fields-versus-absences discipline read the right way
 * round. They sit between STARTED and ENDED because both of them
 * qualify the START: what the device claimed, and by how much the
 * server measured it to differ. FR-11 keeps both rather than
 * letting either silently replace the other.
 *
 * NO PER-SEGMENT DURATION IS EMITTED, DELIBERATELY. It is not a
 * field of `OrderClock` — it would be arithmetic the phone performed
 * on two instants — and the one surface whose entire purpose is the
 * provenance of instants does not mix server values with phone
 * arithmetic. Both instants render in full, so an artisan can read
 * the interval off them. The clock-level ACCRUED figure renders
 * because `elapsed_s` IS a server field (FR-10). A later phase must
 * not add the obvious missing column here: adding it would make this
 * surface state one number it did not get from the record, which is
 * the only kind of claim it is not allowed to make.
 */
export function segmentRows(clock: OrderClock): SegmentPair[][] {
  return clock.segments.map((segment) => {
    const pairs: SegmentPair[] = [
      {
        term: "SOURCE",
        value:
          segment.source === "server"
            ? { kind: "mark", mark: "filled-square", word: "SERVER-STAMPED" }
            : { kind: "mark", mark: "hollow-square-dot", word: "DEVICE-CLAIMED" },
      },
      { term: "STARTED", value: { kind: "instant", ...formatInstant(segment.opened_at) } },
    ];

    if (segment.device_claimed_opened_at !== undefined) {
      pairs.push({
        term: "DEVICE CLAIMED",
        value: { kind: "instant", ...formatInstant(segment.device_claimed_opened_at) },
      });
    }

    if (segment.device_offset_s !== undefined) {
      pairs.push({
        term: "MEASURED OFFSET",
        value: { kind: "figure", text: formatDuration(segment.device_offset_s) },
      });
    }

    pairs.push({
      term: "ENDED",
      value:
        segment.closed_at === null
          ? { kind: "word", word: "RUNNING" }
          : { kind: "instant", ...formatInstant(segment.closed_at) },
    });

    return pairs;
  });
}
