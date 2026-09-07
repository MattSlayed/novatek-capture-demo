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
        {/* D-11 locks a plain anchor in this phase — no <Link>, no
            router.push. Phase 4 replaces it with a history.pushState
            switcher without changing the URL contract. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/?s=limits" className={`label ${styles.link}`}>
          Read the full preview limits
        </a>
      </div>
    </section>
  );
}
