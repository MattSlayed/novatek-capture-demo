"use client";

import type { ReactNode } from "react";

import styles from "./SecondaryControl.module.css";

/* The 44px control — every non-record-binding control in Phase 4 is one of
   these (D-06, REQ-NFR-2): the three gate doors, Read the full disclosure,
   Back, Time on this order, the Limits entry at the foot of the order list,
   and the session-end control.

   It takes children rather than a label string because a gate door carries
   two lines of visible text — a name at the object-title role and a
   competency at the label role — and its accessible name must be computed
   from that text in DOM order. There is no aria-label anywhere here, so the
   name cannot drift from what is on screen.

   Case is left to the caller and to the caller's own module: an artisan's
   name is a proper name and is never uppercased, so this primitive declares
   no case rule (app/globals.css's type roles set none either). The module
   declares no focus rule: app/globals.css owns the build's only one
   (invariant A3). */

export type SecondaryControlProps = {
  onPress: () => void;
  children: ReactNode;
};

export function SecondaryControl({
  onPress,
  children,
}: SecondaryControlProps) {
  return (
    <button
      type="button"
      className={`label ${styles.control}`}
      onClick={onPress}
    >
      {children}
    </button>
  );
}
