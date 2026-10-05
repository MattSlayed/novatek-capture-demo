"use client";

/* The running clock on order detail — 04-UI-SPEC.md Decision 3, §Motion
   and §Accessibility Floor; 04-RESEARCH.md Pattern 5 and Pitfall 3.

   THE CONTRACT. The displayed figure is the last server-read elapsed value
   plus the time measured on this phone since that read. It is re-anchored
   on every response that carries a clock (the order read, both clock
   writes, the hours read) and on returning to a visible tab. It is never
   advanced by the tick, and the tick never writes to the projection: the
   tick only replaces a monotonic "now", and the figure is recomputed from
   the anchor on every render, so a throttled timer makes the display update
   less often and never makes it wrong. Every delta is a difference of two
   performance readings (monotonic readings only, never the wall clock), so
   a device clock correction mid-segment cannot move the figure. Only a
   running segment accrues on this phone: when no segment is running, the
   figure is the server's elapsed value exactly as sent.

   The freshest clock and its monotonic read instant are held in state, not
   a ref, because reading a ref during render is a hard lint error in this
   project (react-hooks/refs). Every setter runs in a callback: the interval
   callback, a visibility listener's await continuation, or a tap's await
   continuation — never synchronously in an effect body
   (react-hooks/set-state-in-effect). The read instant is the projection's
   own, taken when it stored the response, so there is one anchor per
   response rather than two readings microseconds apart.

   WHAT A SCREEN READER HEARS. The figure carries the timer role and no
   live-region attribute; the timer role's implicit politeness is off, which
   is correct for a numerical counter, and the role is partly there so
   nobody promotes it to polite. The tick announces nothing. The label swap
   announces, because the accessible name is the visible label and swaps
   with it (C-41).

   THE CONTROL. One record control in its clock variant: OPEN with no
   segments, CLOSE while a segment runs, REOPEN once segments exist and none
   runs. Single tap, no confirm step, no armed state. After the 90 ms press
   change completes, nothing interim renders between the tap and the
   server's answer, and the control stays tappable throughout: opening an
   open order is idempotent, and closing a closed one returns a stated
   conflict with nothing lost. The label swap arrives when the server
   answers, which is later than REQ-NFR-4's window; REQ-NFR-4 is carried by
   the press change alone. That is a deliberate, phase-bounded gap, closed
   by Phase 6's queue. A request that never reached a response changes
   nothing and adds no sentence (the UI-SPEC's recorded transport gap, also
   Phase 6's).

   A REFUSED TAP renders a conflict card with the polite announcement
   immediately above the control, carrying the code and the server's own
   envelope detail. Focus stays on the control, which is never removed from
   the DOM. No sentence is composed here and no action row is invented. A
   refusal whose error is not in the conflict table cannot take the card;
   its own detail sentence renders in the same slot, in the same polite
   status role, because it too appears in response to a tap.

   MOTION. No reduced-motion block exists for this block: the 90 ms press
   change is retained under Reduce Motion because it is confirmation rather
   than decoration, the tick is a value changing rather than an animation,
   and Phase 4 has nothing else that moves.

   SC 2.2.2 (Pause, Stop, Hide) is claimed under its "essential" exception.
   A paused or stopped display would show a figure that is false while the
   segment continues to run on the server, so there is no pause, stop, hide
   or frequency control. axe cannot detect this criterion, so this comment
   and the UI-SPEC are where the claim is held. */

import { useEffect, useState } from "react";

import { ConflictCard } from "@/components/conflict/ConflictCard";
import { RecordControl } from "@/components/controls/RecordControl";
import {
  anchorFrom,
  clockState,
  elapsedAt,
  formatDuration,
  type ClockState,
} from "@/lib/client/clock";
import { cachedClock, closeClock, openClock, readHours } from "@/lib/client/projection";
import { CONFLICT_CODES, type ConflictCode, type OrderClock } from "@/lib/data/types";

import styles from "./Clock.module.css";

/* What order detail supplies: the id, and the clock with the monotonic
   instant the projection stored it at (null when nothing is held yet). */
export type ClockProps = {
  orderId: string;
  clock: OrderClock | null;
  readAtMono: number | null;
};

/* A clock and the monotonic instant it arrived, wherever it came from. */
type Reading = { clock: OrderClock; readAtMono: number | null };

/* A clock this component received itself, held with the id it was
   received for, so one order's answer never paints under another's. */
type Held = { forId: string; clock: OrderClock; readAtMono: number };

/* A refused tap, held until the next answered one. `code` is null when
   the server's error is not in the conflict table. */
type Refusal = { forId: string; code: ConflictCode | null; sentence: string };

const LABELS: Record<ClockState, string> = {
  "no-segments": "OPEN",
  "segment-running": "CLOSE",
  "all-segments-closed": "REOPEN",
};

/* Authored in 04-UI-SPEC.md Decision 3 and quoted without rewording. It is
   true of interpolation and of polling alike. */
const DERIVATION =
  "The server stamped this segment's start; the seconds since are counted on this phone.";

function isConflictCode(code: string): code is ConflictCode {
  return (CONFLICT_CODES as readonly string[]).includes(code);
}

/* The freshest of the two sources: this component's own answer, or the
   props, compared by the instant each arrived. The props stand in until
   this component has received anything itself. */
function freshest(
  held: Held | null,
  clock: OrderClock | null,
  readAtMono: number | null,
): Reading | null {
  if (clock === null) return held;
  if (held !== null && (readAtMono === null || held.readAtMono >= readAtMono)) return held;
  return { clock, readAtMono };
}

/* The figure in seconds. All arithmetic is lib/client/clock.ts's. */
function secondsAt(reading: Reading | null, nowMono: number): number {
  if (reading === null) return 0;
  if (reading.readAtMono === null || clockState(reading.clock) !== "segment-running") {
    return reading.clock.elapsed_s;
  }
  return elapsedAt(anchorFrom(reading.clock, reading.readAtMono), nowMono);
}

export function Clock({ orderId, clock, readAtMono }: ClockProps) {
  const [held, setHeld] = useState<Held | null>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [nowMono, setNowMono] = useState(() => performance.now());

  /* The tick: once a second, the setter in the interval callback. */
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMono(performance.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /* The re-anchor on returning to a visible tab. The hours read stores
     every clock it carries in the projection; this order's entry is read
     back from there. A refused or unanswered re-read changes nothing. */
  useEffect(() => {
    let live = true;

    async function reanchor() {
      const outcome = await readHours();
      if (!live || outcome.kind !== "ok") return;
      const entry = cachedClock(orderId);
      if (entry === null) return;
      setHeld({ forId: orderId, clock: entry.clock, readAtMono: entry.anchor.readAtMono });
    }

    function onVisibility() {
      if (document.visibilityState === "visible") void reanchor();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [orderId]);

  /* One tap, one request, one fresh idempotency key (the projection mints
     it). The act is chosen from the label on screen at the moment of the
     tap, so a second tap before the answer repeats the first act: a
     repeated open is idempotent, and a repeated close returns not_open. */
  async function act(forId: string, closing: boolean) {
    const outcome = closing ? await closeClock(forId) : await openClock(forId);
    if (outcome.kind === "no-answer") return;
    if (outcome.kind === "refused") {
      setRefusal({
        forId,
        code: isConflictCode(outcome.error) ? outcome.error : null,
        sentence: outcome.detail,
      });
      return;
    }
    setRefusal(null);
    const entry = cachedClock(forId);
    if (entry !== null) {
      setHeld({ forId, clock: entry.clock, readAtMono: entry.anchor.readAtMono });
    }
  }

  const reading = freshest(held !== null && held.forId === orderId ? held : null, clock, readAtMono);
  const state: ClockState = reading === null ? "no-segments" : clockState(reading.clock);
  const shown = refusal !== null && refusal.forId === orderId ? refusal : null;

  return (
    <div className={styles.block}>
      <p className={`label ${styles.term}`}>ELAPSED</p>
      <p role="timer" className={`figure ${styles.figure}`}>
        {formatDuration(secondsAt(reading, nowMono))}
      </p>
      <p className={`label ${styles.derivation}`}>{DERIVATION}</p>
      {shown !== null && shown.code !== null ? (
        <div className={styles.refusal}>
          <ConflictCard code={shown.code} sentence={shown.sentence} announce />
        </div>
      ) : null}
      {shown !== null && shown.code === null && shown.sentence !== "" ? (
        <div role="status" className={styles.refusal}>
          <p className="prose">{shown.sentence}</p>
        </div>
      ) : null}
      <div className={styles.control}>
        <RecordControl
          variant="clock"
          label={LABELS[state]}
          onPress={() => {
            void act(orderId, state === "segment-running");
          }}
        />
      </div>
    </div>
  );
}
