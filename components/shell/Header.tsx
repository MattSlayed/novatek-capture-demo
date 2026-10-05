import { SecondaryControl } from "@/components/controls/SecondaryControl";
import styles from "./Header.module.css";

/* The header — 04-UI-SPEC.md §Surface 2's slot table and §Decision 1,
   C-28 and C-29. Rendered by components/shell/Screen.tsx between the ribbon
   and a surface's <main>, on the order list, order detail and time on this
   order. The gate renders none: it has no acting account (that is what the
   gate is for) and no in-app back target. Limits renders none either; it is
   the Phase 1 surface, unchanged.

   A <header> outside any sectioning element, so it is the page's implicit
   banner landmark. It carries two things.

   The back control, only where the caller passes one. Back is explicit and
   it is in the header (C-29), and its act is the caller's own in-app target:
   the order list has none, because back from the order list exits the app
   and a control whose act is to leave the app is not one this product
   offers.

   The acting account's name, at the object-title role: the name the
   artisan never typed, which the server attached to the session. A visually
   hidden qualifier precedes it so a screen reader hears "Acting as S.
   Mabaso" rather than a bare name; the visible text adds no claim.

   Phase 6's two slots are absent from the DOM, not empty. A connectivity
   badge would have nothing true to report in this phase: one that reads the
   browser's own network flag is the lie C-37 names, because in a plant an
   attached access point with no uplink is the common case. A count of
   pending captures would count something that does not exist until Phase 6.
   EXPERIENCE.md's rule for a surface that is not there is absence (FR-R6).
   The 56px height is kept regardless (Header.module.css records why).

   The account's display-only tier is rendered nowhere: no requirement in
   this phase asks for it, and showing it invites the reading that it is an
   access rule, which authorisation by assignment forbids (D-20, FR-57).

   No client directive and no state. The only handler is the caller's,
   passed through to the secondary control, which owns its own boundary. */

export type HeaderProps = {
  accountName: string;
  back?: { label: "Back"; onPress: () => void };
};

export function Header({ accountName, back }: HeaderProps) {
  return (
    <header className={styles.header}>
      {back ? (
        <SecondaryControl onPress={back.onPress}>{back.label}</SecondaryControl>
      ) : null}
      <p className={`object-title ${styles.name}`}>
        <span className="sr-only">Acting as </span>
        {accountName}
      </p>
    </header>
  );
}
