"use client";

import styles from "./RecordControl.module.css";

/* The record-binding control — all three variants of 04-UI-SPEC.md
   §Primitive 2 in one component (D-06). Phase 4 instantiates the clock
   variant on order detail and nothing else; accept and reject are declared
   here and in the module so a later screen consumes them rather than
   re-declaring a size or a tone locally (D-07). Nothing in this phase binds
   a record, which is the point: the control is designed against DESIGN.md
   here rather than under capture-flow pressure in Phase 5.

   The accessible name is the visible label and nothing else — no aria-label,
   so the name cannot drift from the text, and where the label swaps
   (OPEN -> CLOSE -> REOPEN) the name swaps with it (C-41). Nothing here is
   focused, autofocused or pre-selected on load, and the module declares no
   focus rule: app/globals.css owns the only one in the build (invariant A3).

   REQ-NFR-4's confirmation is the visible press change, and that change is
   owned entirely by the CSS module: it begins on pointer-down and completes
   inside --dur-press whether or not this handler runs. The vibration below
   is additive and never the confirmation itself. */

export type RecordVariant = "clock" | "accept" | "reject";

export type RecordControlProps = {
  variant: RecordVariant;
  label: string;
  onPress: () => void;
};

/* The vibration runs for --dur-press's own 90ms figure (DESIGN.md §Record
   control → Timing, C-17), so the two channels are coincident and neither
   outlasts the other. The number is the token's rather than a new one; if
   the token moves, this moves with it. */
const HAPTIC_MS = 90;

export function RecordControl({
  variant,
  label,
  onPress,
}: RecordControlProps) {
  function press() {
    /* The build's only navigator.vibrate call site, asserted in source by
       invariant A15 and never in a browser: headless Chromium reports
       "vibrate" in navigator as true, so a browser run cannot prove the
       feature test is present. On iOS the API does not exist at all and the
       visible change carries REQ-NFR-4 alone (REQ-NFR-4a). Never fired from
       a control that binds nothing. */
    if ("vibrate" in navigator) {
      navigator.vibrate(HAPTIC_MS);
    }
    onPress();
  }

  return (
    <button
      type="button"
      className={`${styles.control} ${styles[variant]}`}
      onClick={press}
    >
      <span className={`control-label ${styles.label}`}>{label}</span>
    </button>
  );
}
