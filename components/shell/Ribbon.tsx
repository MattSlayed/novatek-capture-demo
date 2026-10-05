import { GOVERNED } from "@/lib/copy/governed";
import styles from "./Ribbon.module.css";

/* The permanent preview disclosure, rendered by app/layout.tsx above
   {children} so every route carries it by construction (D-08,
   REQ-FR-48). A plain Server Component: no state, no event handler,
   no client directive. The sentence renders from
   lib/copy/governed.ts — never a literal — so this file and the
   module can never drift. */
export function Ribbon() {
  const { before, strong, after } = GOVERNED.preview;

  return (
    <section aria-label="Preview disclosure" className={styles.ribbon}>
      <span aria-hidden="true" className={styles.dot} />
      <div className={styles.column}>
        <p className={`label ${styles.sentence}`}>
          {before}
          <strong>{strong}</strong>
          {after}
        </p>
        {/* A plain anchor, kept on purpose (D-11). The ribbon is
            Primitive 1 and Phase 4 holds it unchanged (04-UI-SPEC.md
            §The Five Primitives), so this link is not a history-state
            move: a Limits visit through the ribbon is a full document
            load, which the screen switcher then resolves as s=limits.
            That is the right trade. The build's one permanent landmark
            stays a plain Server Component with no state and no event
            handler, and the client projection is scoped to the
            document by design and rebuilds from the server on its next
            read, so a full load costs a re-read and nothing else. The
            URL contract is unchanged. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/?s=limits" className={`label ${styles.link}`}>
          Read the full preview limits
        </a>
      </div>
    </section>
  );
}
