import styles from "./StateMark.module.css";

/* The state marks — 04-UI-SPEC.md §The Five Primitives → Primitive 5, D-06.
   One component and one module declare all seven shapes of the closed set;
   no screen module declares a mark's geometry of its own (D-07).

   The set is closed at seven. An eighth mark is forbidden: there is no mark
   meaning a clock is running and none meaning a work order is assigned, and
   inventing one in the phase that establishes the primitive would break the
   set — a word carries those states instead, and a word has no colour
   channel at all. Adding a member here means adding its geometry to
   StateMark.module.css in the same commit; plan 04-06's sweep asserts the
   count and the single owner (invariant A4). lib/client/clock.ts's SourceMark
   is a two-member subset of the names below and must stay a subset.

   Stroke weight is part of the shape rather than a tone, so the 2px and the
   1px hollow squares are two different marks.

   The block never carries the state alone. The word beside it is always
   present, always from the closed vocabulary, and always readable with no
   colour perception whatever (REQ-NFR-6) — which is why the block itself is
   hidden from assistive technology and the word is not. */

/**
 * The closed set of seven, in the order 04-UI-SPEC.md Primitive 5 lists
 * them, with each mark's meaning and whether Phase 4 renders it:
 *
 *   hollow-square-2px       live, awaiting somebody                — no
 *   half-filled-square      in hand, not yet bound                 — no
 *   filled-square           bound                                  — yes
 *   filled-diamond          the server declined for a stated reason — yes
 *   hollow-square-diagonal  refused or rejected, and retained       — no
 *   hollow-square-1px       ended without binding                   — no
 *   hollow-square-dot       kept, and unresolved                    — yes
 */
export const MARKS = [
  "hollow-square-2px",
  "half-filled-square",
  "filled-square",
  "filled-diamond",
  "hollow-square-diagonal",
  "hollow-square-1px",
  "hollow-square-dot",
] as const;

export type MarkName = (typeof MARKS)[number];

export type StateMarkProps = {
  mark: MarkName;
  word: string;
};

export function StateMark({ mark, word }: StateMarkProps) {
  /* The bound mark is the one member whose word carries a tone of its own.
     Every other word inherits the consumer's ink, which is the only ink
     permitted on either ground these render on. */
  const wordClass =
    mark === "filled-square" ? `label ${styles.wordGood}` : "label";

  return (
    <span className={styles.root}>
      <span aria-hidden="true" className={`${styles.mark} ${styles[mark]}`} />
      <span className={wordClass}>{word}</span>
    </span>
  );
}
