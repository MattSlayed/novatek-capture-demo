import { StateMark } from "@/components/marks/StateMark";
import type { ConflictCode } from "@/lib/data/types";

import styles from "./ConflictCard.module.css";

/* The conflict card — 04-UI-SPEC.md Decision 5, C-21. One anatomy for every
   conflict this phase and Phase 6 render: the order list's refused deep link
   here, the clock's refusal in plan 04-09, and the queue's cards later, all
   consuming this component unchanged.

   Two zones. The tinted head carries the filled diamond, which means the
   server declined for a stated reason, and the conflict's code exactly as the
   closed set writes it, so what is on screen matches what is on the wire. The
   untinted body carries the sentence. There is no third zone.

   This component composes no sentence. It renders the one it is given, and
   the caller supplies either the conflict table's own CONFLICT_COPY[code]
   sentence from lib/copy/conflicts.ts or the server's own envelope detail —
   never a string written at a call site, so the wording a reviewer sees is
   the wording the server sends.

   The action row is omitted, by a general rule Phase 6 consumes unchanged: on
   an online surface a conflict card's action row is omitted when every action
   in the code's list is either a queue operation or a control already present
   on the screen. The actions themselves are never re-worded, never replaced
   by a dismissive acknowledgement, and never invented. order_not_found's one
   action is a queue operation with nothing queued, and the next act is the
   order list the card stands on; not_open's meaningful action is the record
   control directly beneath the clock's card. */

export type ConflictCardProps = {
  code: ConflictCode;
  sentence: string;
  announce?: boolean;
};

export function ConflictCard({ code, sentence, announce }: ConflictCardProps) {
  const card = (
    <div className={styles.card}>
      <div className={styles.head}>
        <StateMark mark="filled-diamond" word={code} />
      </div>
      <div className={styles.body}>
        <p className="prose-sm">{sentence}</p>
      </div>
    </div>
  );

  /* A live region populated at mount announces unreliably and would compete
     with the focus-to-heading announcement, so a card present at a screen's
     first render (the order list's refused deep link) carries no role and no
     landmark: it is reached by the heading move plus one step. A card that
     appears during a screen's life (the clock's refusal) asks for the polite
     status slot, which C-41 reserves for exactly that. */
  if (announce) {
    return <div role="status">{card}</div>;
  }

  return card;
}
