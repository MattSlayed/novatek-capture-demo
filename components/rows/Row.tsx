"use client";

import type { ReactNode } from "react";

import styles from "./Row.module.css";

/* The row shell every row list in Phase 4 sits on (D-06): the order row on
   the order list, the asset row and the governing-document row on order
   detail, and the segment row on the time surface. One geometry, one fill,
   one edge — so no screen module declares a target size, a panel tone or a
   radius of its own (D-07).

   The `as` prop chooses the element and nothing else changes: `div` by
   default, `li` inside a list, `button` where the whole row is the target
   (C-40, the order row). `onClick` is wired only in the button form —
   an asset row and a governing-document row are non-interactive in Phase 4
   because the screens they would open are Phase 5, and a row that looks
   tappable and is not is the false affordance this product avoids.

   Phase 5 seam: the asset row becomes a control with no change to its
   geometry and no change to its content. It gains the button form and an
   act; it gains no border, no tone and no size.

   The module declares no focus rule: app/globals.css owns the build's only
   one (invariant A3). */

export type RowProps = {
  as?: "div" | "li" | "button";
  onClick?: () => void;
  children: ReactNode;
};

export function Row({ as = "div", onClick, children }: RowProps) {
  if (as === "button") {
    return (
      <button type="button" className={styles.row} onClick={onClick}>
        {children}
      </button>
    );
  }

  if (as === "li") {
    return <li className={styles.row}>{children}</li>;
  }

  return <div className={styles.row}>{children}</div>;
}
