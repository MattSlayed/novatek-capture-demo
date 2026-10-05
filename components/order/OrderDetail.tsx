"use client";

/* Order detail — 04-UI-SPEC.md §Surface 3, Decision 6 and §"Empty and
   error states Phase 4 does not author"; 04-CONTEXT.md D-02.

   ONE HEADING, NAMING THE ORDER COMPLETELY. The heading is the element
   focus lands on, so it carries the order number in a figure-role run
   followed by the order title, as one accessible string: a number alone
   is not a name and a title alone is not an identity. Two type runs inside
   one element follow the ribbon's own precedent.

   THE READ. The surface paints what the projection already holds at once —
   the full order read if one is held, otherwise the order's identity from
   the order list's read, so the heading exists when focus arrives — and
   issues one order read keyed on the id, replacing its state only in the
   await continuation. A read that never reached a response changes
   nothing and adds no sentence (the UI-SPEC's recorded transport gap,
   closed by Phase 6). The read's Phase 5 fields are not touched here.

   A REFUSED READ. When the server's error is in the conflict table, the
   code and the server's own sentence go to the switcher's handler and this
   surface renders nothing further: the switcher replaces the URL with the
   order list and the list renders the card (D-02). The wording therefore
   never distinguishes an unowned order from a nonexistent one, because the
   server's refusal is byte-identical for both. A refusal outside the
   conflict table (no session, for one) is not a statement about this order
   and cannot cross into that handler, so its own envelope sentence renders
   in place (C-31: the code and the sentence always ship).

   The id is a fetch path segment and nothing else: it is never rendered as
   text, never placed in a link and never echoed into a sentence (T-04-01).

   TOP TO BOTTOM: the heading; the clock (the elapsed figure, its
   derivation line and the record control); the Time on this order control
   in the row beneath the record control; the assets; the governing
   documents. Asset rows and governing-document rows are not buttons and
   not links in Phase 4: the verification and proposal screens they would
   open are Phase 5's, and a row that looks tappable and is not is a false
   affordance. Phase 5 turns the asset row into a control with no change to
   its geometry or its content. There is no capture mark, no empty
   illustration and no prompting copy for an order with no captures (C-39).

   NO REFERRAL ENTRY BAR — not a disabled one, not a placeholder. A
   disabled target announces itself and refuses, which is a false
   affordance; the referral bar is Phase 9's. The consequence for this
   phase's arithmetic is that this surface's scrollable viewport is the
   full body height (562 px at 100 % text) rather than the figure measured
   with the bar (502 px), and nothing on it is pinned to the viewport.
   There is no Limits duplicate here either: the ribbon link is the entry,
   and a scrolling screen has no bottom band to put one in.

   `account` is part of the switcher's contract for both id-bearing
   surfaces; the account's name renders in the switcher's header, so this
   surface reads nothing from it. */

import { useEffect, useEffectEvent, useState } from "react";

import { SecondaryControl } from "@/components/controls/SecondaryControl";
import { Row } from "@/components/rows/Row";
import { goTo } from "@/lib/client/navigate";
import {
  cachedClock,
  cachedOrder,
  cachedOrders,
  readOrder,
  type OrderDetail as OrderRead,
} from "@/lib/client/projection";
import { CONFLICT_CODES, type Artisan, type ConflictCode } from "@/lib/data/types";

import { Clock, type ClockProps } from "./Clock";
import styles from "./OrderDetail.module.css";

/* The switcher's contract for both id-bearing surfaces (plan 04-11). */
export type OrderDetailProps = {
  account: Artisan;
  orderId: string;
  onRefused: (code: ConflictCode, sentence: string) => void;
};

/* What the order read answered, held with the id it was issued for, so
   one order's answer is never painted under another's id. A refusal sent
   to the switcher holds no sentence; one rendered here holds its own. */
type Answer =
  | { kind: "read"; detail: OrderRead }
  | { kind: "refused"; sentence: string | null };

type Held = { forId: string; answer: Answer };

function isConflictCode(code: string): code is ConflictCode {
  return (CONFLICT_CODES as readonly string[]).includes(code);
}

export function OrderDetail({ orderId, onRefused }: OrderDetailProps) {
  const [held, setHeld] = useState<Held | null>(null);

  /* The handler is the switcher's; reading it through an effect event
     keeps a re-rendered parent from re-issuing the read. */
  const refuse = useEffectEvent((code: ConflictCode, sentence: string) => {
    onRefused(code, sentence);
  });

  useEffect(() => {
    let live = true;

    async function read() {
      const outcome = await readOrder(orderId);
      if (!live || outcome.kind === "no-answer") return;

      if (outcome.kind === "refused") {
        if (isConflictCode(outcome.error)) {
          setHeld({ forId: orderId, answer: { kind: "refused", sentence: null } });
          refuse(outcome.error, outcome.detail);
        } else {
          setHeld({ forId: orderId, answer: { kind: "refused", sentence: outcome.detail } });
        }
        return;
      }

      setHeld({ forId: orderId, answer: { kind: "read", detail: outcome.value } });
    }

    void read();
    return () => {
      live = false;
    };
  }, [orderId]);

  const answer = held !== null && held.forId === orderId ? held.answer : null;
  const refusal = answer !== null && answer.kind === "refused" ? answer : null;
  if (refusal !== null && refusal.sentence === null) return null;

  const detail = answer !== null && answer.kind === "read" ? answer.detail : cachedOrder(orderId);
  const order = detail?.order ?? cachedOrders().find((entry) => entry.id === orderId) ?? null;

  /* Nothing names the order yet: nothing is painted until the read answers. */
  if (order === null && refusal === null) return null;

  const entry = cachedClock(orderId);
  const clockProps: ClockProps = {
    orderId,
    clock: entry?.clock ?? null,
    readAtMono: entry?.anchor.readAtMono ?? null,
  };

  const heading =
    order === null ? null : (
      <h1 id="screen-title" tabIndex={-1} className={`screen-title ${styles.heading}`}>
        <span className={`figure ${styles.number}`}>{order.number}</span>{" "}
        {order.title}
      </h1>
    );

  if (refusal !== null) {
    return (
      <main aria-labelledby={heading === null ? undefined : "screen-title"} className={styles.main}>
        {heading}
        {refusal.sentence !== "" ? <p className="prose">{refusal.sentence}</p> : null}
      </main>
    );
  }

  return (
    <main aria-labelledby="screen-title" className={styles.main}>
      {heading}
      <Clock {...clockProps} />
      <SecondaryControl onPress={() => goTo("time", orderId)}>Time on this order</SecondaryControl>
      {detail !== null ? (
        <>
          <section className={styles.block}>
            <h2 className={`label ${styles.sectionLabel}`}>ASSETS</h2>
            <ul className={styles.rows}>
              {detail.assets.map((asset) => (
                <Row key={asset.id} as="li">
                  <span className="tag">{asset.tag}</span>
                  <span className="object-title">{asset.description}</span>
                </Row>
              ))}
            </ul>
          </section>
          <section className={styles.block}>
            <h2 className={`label ${styles.sectionLabel}`}>GOVERNING DOCS</h2>
            <ul className={styles.rows}>
              {detail.order.governing_docs.map((code) => (
                <Row key={code} as="li">
                  <span className={`figure ${styles.code}`}>{code}</span>
                </Row>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
