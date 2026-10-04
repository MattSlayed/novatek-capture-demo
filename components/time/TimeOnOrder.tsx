"use client";

/* ================================================================
   SURFACE 4 — TIME ON THIS ORDER (?s=time&id=<order_id>)
   (REQ-FR-58, REQ-NFR-6, REQ-NFR-2; 04-UI-SPEC Surface 4, Decision 2)

   The one screen whose entire purpose is the provenance of the
   instants in an artisan's accrued record. It renders exactly the
   fields `OrderClock` carries and no figure the phone derived, so
   FR-58's "nothing withheld" is provable rather than asserted: the
   field-by-field mapping is lib/client/clock.ts's segment mapping,
   unit-tested there, and this file renders what it returns without
   restating any part of it.

   The order of the screen is the argument. The artisan reads the
   total, then what they cannot do about it, then the segments:
   FR-58's stated limitation sits ABOVE the segment list, because a
   label goes before the thing it labels (SM-C1).

   No per-segment duration renders, deliberately. It is not a field
   of the record, and this surface does not mix server values with
   phone arithmetic; both instants of a segment render in full, so
   the interval can be read off them. ACCRUED renders because
   `elapsed_s` is a server field (FR-10) — the server's own sum.

   The header (Back, and the acting account's name) belongs to the
   switcher, which also owns parsing: the id arrives validated, and
   here it is a lookup key and nothing else. It is rendered as text
   nowhere, and every request goes through the client projection.
   ================================================================ */

import { useEffect, useEffectEvent, useState } from "react";

import { StateMark } from "@/components/marks/StateMark";
import { Row } from "@/components/rows/Row";
import {
  formatDuration,
  formatInstant,
  segmentRows,
  type Instant,
  type SegmentValue,
} from "@/lib/client/clock";
import { cachedClock, readHours, readOrder } from "@/lib/client/projection";
import {
  CONFLICT_CODES,
  type Artisan,
  type ConflictCode,
  type OrderClock,
} from "@/lib/data/types";

import styles from "./TimeOnOrder.module.css";

/* The switcher's contract for both id-bearing surfaces (plan 04-11).
   `account` is part of that contract; the account's name renders in
   the switcher's header (Decision 2 maps `account_id` there), so this
   surface reads nothing from it. */
export type TimeOnOrderProps = {
  account: Artisan;
  orderId: string;
  onRefused: (code: ConflictCode, sentence: string) => void;
};

/* What the two reads answered, held with the id they were issued
   for. An answer for a different id is never painted: on an id-only
   transition the surface renders as unanswered until its own reads
   return, rather than showing one order's record under another's
   arrival. */
type Answer =
  | { kind: "record"; clock: OrderClock; readAt: Instant }
  | { kind: "empty" }
  | { kind: "refused"; sentence: string | null };

type Held = { forId: string; answer: Answer };

/* A refusal's code is the server's own string. Only the conflict
   table's codes cross into the switcher's handler; a transport
   refusal (no session, for one) is not a statement about this order,
   so its own sentence renders here instead (C-31: the code and the
   sentence always ship). */
function isConflictCode(code: string): code is ConflictCode {
  return (CONFLICT_CODES as readonly string[]).includes(code);
}

/* Every instant on this surface: the machine value is the server's
   byte-exact string and the text is the local reading, both from the
   same field through `formatInstant`, so they cannot drift. One
   format always, never shortened when two instants share a day. */
function Moment({ instant }: { instant: Instant }) {
  return <time dateTime={instant.machine}>{instant.human}</time>;
}

/* A pair's value, rendered by kind. The meaning was chosen in
   lib/client/clock.ts; this only chooses an element for it. */
function Value({ value }: { value: SegmentValue }) {
  switch (value.kind) {
    case "mark":
      return <StateMark mark={value.mark} word={value.word} />;
    case "instant":
      return <Moment instant={value} />;
    case "figure":
      return <>{value.text}</>;
    case "word":
      return <>{value.word}</>;
  }
}

export function TimeOnOrder({ orderId, onRefused }: TimeOnOrderProps) {
  const [held, setHeld] = useState<Held | null>(null);

  /* The handler is the switcher's; reading it through an effect event
     keeps a re-rendered parent from re-issuing both reads. */
  const refuse = useEffectEvent((code: ConflictCode, sentence: string) => {
    onRefused(code, sentence);
  });

  /* Two reads, and why both. `GET /api/hours` answers for the whole
     account and says nothing about an id it does not carry: without
     the ownership read, an id missing from the hours answer would
     render the authored empty sentence, asserting that an order
     exists for an id the server has said nothing about. D-02 requires
     a deep link to an unowned or nonexistent order to land on the
     order list with the conflict table's own sentence — on this
     surface exactly as on order detail — so the ownership read decides
     whether this surface may say anything about the id at all, and
     the empty sentence renders only after it has answered yes
     (T-04-02).

     Every state change happens in the await continuation, never in
     the effect body. A read that never reached a response changes
     nothing: the cached paint stays and no sentence is added, which
     is 04-UI-SPEC's recorded gap for a transport failure with no
     envelope, closed by Phase 6. */
  useEffect(() => {
    let live = true;

    async function read() {
      const [owned, hours] = await Promise.all([readOrder(orderId), readHours()]);
      if (!live) return;

      if (owned.kind === "refused") {
        if (isConflictCode(owned.error)) {
          setHeld({ forId: orderId, answer: { kind: "refused", sentence: null } });
          refuse(owned.error, owned.detail);
        } else {
          setHeld({ forId: orderId, answer: { kind: "refused", sentence: owned.detail } });
        }
        return;
      }

      if (hours.kind === "refused") {
        setHeld({ forId: orderId, answer: { kind: "refused", sentence: hours.detail } });
        return;
      }

      if (hours.kind === "no-answer") return;

      const clock = hours.value.find((entry) => entry.order_id === orderId);
      if (clock !== undefined) {
        /* READ AT is the device's own instant at which this read
           returned, taken here and passed through the same formatter
           as every server instant. */
        const readAt = formatInstant(new Date().toISOString());
        setHeld({ forId: orderId, answer: { kind: "record", clock, readAt } });
        return;
      }

      if (owned.kind === "no-answer") return;

      setHeld({ forId: orderId, answer: { kind: "empty" } });
    }

    void read();
    return () => {
      live = false;
    };
  }, [orderId]);

  const answer = held !== null && held.forId === orderId ? held.answer : null;

  const heading = (
    <h1 id="screen-title" tabIndex={-1} className={`screen-title ${styles.heading}`}>
      Time on this order
    </h1>
  );

  if (answer !== null && answer.kind === "refused") {
    return (
      <main aria-labelledby="screen-title" className={styles.main}>
        {heading}
        {answer.sentence !== null && answer.sentence !== "" ? (
          <p className="prose">{answer.sentence}</p>
        ) : null}
      </main>
    );
  }

  /* Until this surface's own reads answer, it paints the record the
     projection already holds for the id. READ AT is absent from that
     paint rather than estimated: the cached anchor is a monotonic
     reading by design (lib/client/clock.ts), not a wall-clock
     instant, so the device instant of that earlier read is not
     known here and is not invented. */
  const clock =
    answer === null ? (cachedClock(orderId)?.clock ?? null) : answer.kind === "record" ? answer.clock : null;
  const readAt = answer !== null && answer.kind === "record" ? answer.readAt : null;

  return (
    <main aria-labelledby="screen-title" className={styles.main}>
      {heading}

      {clock !== null ? (
        <>
          <dl className={styles.pairs}>
            <div className={styles.pair}>
              <dt className="label">ACCRUED</dt>
              <dd className="figure">{formatDuration(clock.elapsed_s)}</dd>
            </div>
            {readAt !== null ? (
              <div className={styles.pair}>
                <dt className="label">READ AT</dt>
                <dd className="figure">
                  <Moment instant={readAt} />
                </dd>
              </div>
            ) : null}
          </dl>
          <p className={`label ${styles.zone}`}>Times read in this phone's time zone.</p>
        </>
      ) : null}

      {/* [written here] — 04-UI-SPEC copy #9, REQ-FR-58's stated
          limitation. A disclosed absence, not a refusal: no next act
          exists, so none is invented. */}
      <p className="prose-sm">
        There is no route in this preview to contest a segment. What the server recorded is what this surface shows.
      </p>

      {clock !== null ? (
        <ol className={styles.segments}>
          {segmentRows(clock).map((pairs, index) => (
            <Row key={index} as="li">
              <dl className={`${styles.pairs} ${styles.segment}`}>
                {pairs.map((pair) => (
                  <div key={pair.term} className={styles.pair}>
                    <dt className="label">{pair.term}</dt>
                    <dd className="figure">
                      <Value value={pair.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Row>
          ))}
        </ol>
      ) : null}

      {/* [written here] — 04-UI-SPEC copy #10, the empty state. It
          renders only once the ownership read has said this account
          may see the order and the hours read carries no clock for it.

          This is where D-04's accepted cost lands: a record whose
          segments died with the store instance reads as *no time
          recorded* rather than *the record was discarded*. The gap is
          deliberate, recorded in 04-CONTEXT.md D-04, and closed by
          Phase 6 — and no sentence is invented here to cover it. */}
      {answer !== null && answer.kind === "empty" ? (
        <p className={`prose ${styles.empty}`}>
          No time is recorded on this order yet. Opening it starts a segment.
        </p>
      ) : null}
    </main>
  );
}
