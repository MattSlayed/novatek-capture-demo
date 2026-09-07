import { GOVERNED } from "@/lib/copy/governed";
import styles from "./Limits.module.css";

/* The minimal Limits surface, reached at /?s=limits. Owns its own
   <main> landmark (app/page.tsx renders this in place of the shell,
   never both). All eight governed sentences render in full, in the
   module's declaration order — Object.entries preserves it, so no
   separate order array is needed — followed by the one new sentence
   this phase authors. The platform-refusal sentence is not rendered
   in this phase (it first renders Phase 3+), nor is the disposition
   table, live instance id or storage tri-state (Phases 3, 5, 7, 8). */
export function Limits() {
  return (
    <main aria-labelledby="screen-title" className={styles.main}>
      <h1 id="screen-title" className={`screen-title ${styles.heading}`}>
        Preview limits
      </h1>
      <div className={styles.list}>
        {Object.entries(GOVERNED).map(([key, { before, strong, after }]) => (
          <p key={key} className="prose">
            {before}
            <strong>{strong}</strong>
            {after}
          </p>
        ))}
        {/* [written here] — D-10, D-19: new copy authored for this preview */}
        <p className="prose">
          This preview is in English only because no other language has been checked for it, and the product's language support is undecided.
        </p>
      </div>
    </main>
  );
}
