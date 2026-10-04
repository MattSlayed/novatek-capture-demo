"use client";

import { useEffect, useState } from "react";

import { ConflictCard } from "@/components/conflict/ConflictCard";
import { SecondaryControl } from "@/components/controls/SecondaryControl";
import { Row } from "@/components/rows/Row";
import { goTo } from "@/lib/client/navigate";
import { cachedOrders, endSession, readOrders } from "@/lib/client/projection";
import { CONFLICT_COPY } from "@/lib/copy/conflicts";
import type { Artisan, ConflictCode, WorkOrder } from "@/lib/data/types";

import styles from "./OrderList.module.css";

/* Surface 2, the order list (?s=orders) — 04-UI-SPEC.md §Surface 2 and
   Decision 5, D-02, C-29. The screen an artisan lands on after the gate.
   It owns its own <main> and its single <h1>, like Limits.tsx; the header
   above it, with the account name the artisan never typed, is the
   switcher's (plan 04-11), as is the focus move to the heading.

   DOM order is visual order: the heading, the refusal where a deep link was
   refused, one row per order, then the bottom band. Nothing on this surface
   is read from the URL. A refused order id is a lookup key that already
   failed, and it never becomes text here.

   Every server read goes through lib/client/projection.ts. The cached list
   paints at once — the module is empty on both sides of a fresh document,
   so the first render hydrates cleanly — and the one read for both the
   orders and their clocks is issued in an effect whose setters run in the
   await continuation, never in the effect body.

   Two states are deliberately not authored. An account with zero work
   orders is unreachable with the shipped fixtures (each of the three
   accounts holds at least one order), and a sentence for an unreachable
   state is a placeholder. A request that never reached a response keeps
   what was painted from the cache and renders no sentence: connectivity
   is Phase 6's, and a sentence written now is one Phase 6 would have to
   generalise mid-phase. Where a response does arrive refused, its own
   envelope sentence renders, because the code and the sentence always ship
   together (C-31). */

export type OrderListProps = {
  account: Artisan;
  refusal: { code: ConflictCode; sentence: string } | null;
  onSessionEnded: () => void;
};

export function OrderList({ refusal, onSessionEnded }: OrderListProps) {
  const [orders, setOrders] = useState<WorkOrder[]>(cachedOrders);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const outcome = await readOrders();
      if (outcome.kind === "ok") {
        setOrders(outcome.value.orders);
        setRefused(null);
      } else if (outcome.kind === "refused") {
        setRefused(outcome.detail);
      }
    })();
  }, []);

  /* C-29: this control replaces rather than pushes and discards nothing.
     Queued items keep their claimed account, and the cache purge happens at
     the next gate entry, so there is no second step, no sheet, and nothing
     that asks the artisan to be certain. The switcher is told only once the
     server has answered: a request that never landed ended no session, and
     saying otherwise would put the gate over a credential still in force. */
  async function endThisSession() {
    const outcome = await endSession();
    if (outcome.kind === "ok") onSessionEnded();
  }

  return (
    <main aria-labelledby="screen-title" className={styles.main}>
      <h1 id="screen-title" tabIndex={-1} className={`screen-title ${styles.heading}`}>
        Your work orders
      </h1>

      {/* D-02's claim. The sentence is the conflict table's own, never
          composed here and never chosen by why the read failed, so an order
          on another account's card and an order that does not exist read
          identically in the copy, exactly as they do on the wire. No
          announce: the card is present at first render and reached by the
          heading move plus one step. */}
      {refusal === null ? null : (
        <div className={styles.refusal}>
          <ConflictCard code={refusal.code} sentence={CONFLICT_COPY[refusal.code].sentence} />
        </div>
      )}

      {refused ? <p className={`prose ${styles.refusal}`}>{refused}</p> : null}

      {/* Three fields and no more: the number, the title and the status as a
          word. No mark from the closed set of seven sits on a row, because
          none of the seven means a clock is running or an order is assigned,
          and a word carries the status with no colour channel at all. */}
      <div className={styles.stack}>
        {orders.map((order) => (
          <Row key={order.id} as="button" onClick={() => goTo("order", order.id)}>
            <span className={`figure ${styles.number}`}>{order.number}</span>
            <span className={`object-title ${styles.title}`}>{order.title}</span>
            <span className={`label ${styles.status}`}>{order.status}</span>
          </Row>
        ))}
      </div>

      <div className={`${styles.stack} ${styles.band}`}>
        <SecondaryControl onPress={() => goTo("limits")}>
          Read the full preview limits
        </SecondaryControl>
        <SecondaryControl onPress={() => void endThisSession()}>
          End this session and choose a different artisan
        </SecondaryControl>
      </div>
    </main>
  );
}
