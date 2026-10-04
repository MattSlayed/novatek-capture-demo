"use client";

import { useEffect, useRef, useState } from "react";

import { SecondaryControl } from "@/components/controls/SecondaryControl";
import { hasSeenDisclosure, markDisclosureSeen } from "@/lib/client/disclosure";
import { purge } from "@/lib/client/projection";
import { FR48A_DISPOSITION, GOVERNED } from "@/lib/copy/governed";
import { ARTISANS } from "@/lib/data/artisans";
import styles from "./Gate.module.css";

/* The gate: the screen any surface shows when there is no session
   (REQ-FR-48a; D-03, D-04; 04-UI-SPEC Decision 4 and Surface 1). It
   owns its own <main> and <h1>, states FR-48a's enforced/authored
   split in full before any claim is met, and offers the three
   persona doors below it in both of its states.

   One component, two states. On first entry the long-form disclosure
   is the leading content of <main>. On re-entry it is closed, and in
   its slot sit the short form and one control that reopens the long
   form in full, in place, with focus moving to its heading. Which
   state applies is read from lib/client/disclosure in an effect,
   never during render, and the pre-resolution paint is the long
   form: the only possible error is then a returning artisan briefly
   seeing the full disclosure before it collapses, never a new reader
   meeting the short form first (T-04-17). The collapse is not
   animated; nothing on this surface moves.

   Two things a later reader must not undo:

   - No ARIA modal flag on the dialog. It hides everything outside the
     dialog from assistive technology, so the ribbon would stop being
     reachable by rotor on this screen — a breach of its
     reachable-on-every-screen contract (C-15, C-30). role="dialog"
     alone gives the role the sources name.
   - No document scroll lock. At 200 % text the disclosure alone runs
     to about 1025 px against a 398 px body, so a document overflow
     lock would clip a governed sentence, which the WCAG gate fails the
     build on (SC 1.4.4, NFR-9). The disclosure sits in flow above the
     doors and overlays nothing, so there is nothing behind it to lock.

   There is likewise no close control on the reopened disclosure and
   no acknowledge control on first entry. FR-48a requires the split to
   be stated, not acknowledged, and a forced dismissal is the shape of
   the dismiss the ribbon is forbidden.

   Choosing a door mints a session and nothing else: the switcher
   (plan 04-11) owns the replace to the order list, so this component
   performs no history write and keeps no requested-surface intent
   (D-03). The projection's single purge runs in the same continuation
   as the successful mint, before the switcher reads the new account,
   so no record of the previous account reaches the next one (D-04,
   T-04-03). The RBAC tier and the employee number render nowhere on
   this surface: the tier is display-only and read by nothing, and
   showing it would invite the reading that it is an access rule. */

/* [written here] — UI-SPEC Copywriting Contract string 1. Byte-identical
   to the first action of TRANSPORT_COPY's no_session and
   unknown_persona entries in lib/copy/conflicts.ts, by design: an
   artisan sent here by a refusal meets the same words. Declared locally
   anyway, because a screen heading may not depend on a refusal's action
   list. */
const HEADING = "Choose an artisan";

export type GateProps = {
  /** Called once POST /api/session has answered 201 and the purge has run. */
  onEntered: () => void;
};

/**
 * The refusal sentence from a non-201 answer, when the body is the
 * server's own `{ error, detail }` envelope. Anything else yields no
 * sentence: the gate renders the server's words or none, and composes
 * nothing of its own.
 */
async function envelopeDetail(res: Response): Promise<string | null> {
  try {
    const body: unknown = await res.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      return body.detail;
    }
  } catch {
    // Not a JSON envelope — no sentence to render.
  }
  return null;
}

export function Gate({ onEntered }: GateProps) {
  const { before, strong, after } = GOVERNED.preview;

  /* false until the device proves otherwise, so the first paint is the
     long form (Pattern 6). */
  const [seen, setSeen] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const disclosureHeading = useRef<HTMLHeadingElement>(null);

  /* The device read happens after the first commit, so the server
     render and the hydrating render agree (Pitfall 11). The state write
     sits in an await continuation rather than the effect body, which
     is the shape react-hooks/set-state-in-effect permits. */
  useEffect(() => {
    let live = true;
    (async () => {
      const seenBefore = await Promise.resolve(hasSeenDisclosure());
      if (live && seenBefore) setSeen(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  /* Focus moves to the disclosure's heading when, and only when, the
     artisan reopens it (C-41's in-place replacement). On first entry
     the switcher's own focus effect places focus on the <h1>. */
  useEffect(() => {
    if (reopened) disclosureHeading.current?.focus();
  }, [reopened]);

  async function choose(personaId: string) {
    setRefusal(null);
    let res: Response;
    try {
      res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona_id: personaId }),
      });
    } catch {
      /* No response arrived at all. Phase 4 authors no sentence for
         this: connectivity's three causes are FR-62's, and Phase 6
         closes the gap (UI-SPEC, Empty and error states). */
      return;
    }
    if (res.status === 201) {
      purge();
      markDisclosureSeen();
      onEntered();
      return;
    }
    setRefusal(await envelopeDetail(res));
  }

  const longForm = !seen || reopened;

  return (
    <main aria-labelledby="screen-title" className={styles.main}>
      <h1 id="screen-title" tabIndex={-1} className={`screen-title ${styles.heading}`}>
        {HEADING}
      </h1>

      {longForm ? (
        <div role="dialog" aria-labelledby="disclosure-title" className={styles.disclosure}>
          <h2
            id="disclosure-title"
            ref={disclosureHeading}
            tabIndex={-1}
            className={`label ${styles.disclosureHeading}`}
          >
            Enforced and authored
          </h2>
          <p className="prose">
            {before}
            <strong>{strong}</strong>
            {after}
          </p>
          <p className="prose">{FR48A_DISPOSITION}</p>
        </div>
      ) : (
        <div className={styles.shortForm}>
          <p className="prose">
            {before}
            <strong>{strong}</strong>
            {after}
          </p>
          <SecondaryControl onPress={() => setReopened(true)}>
            Read the full disclosure
          </SecondaryControl>
        </div>
      )}

      <div className={styles.doors}>
        {ARTISANS.map((artisan) => (
          <SecondaryControl key={artisan.id} onPress={() => void choose(artisan.id)}>
            <span className="object-title">{artisan.name}</span>
            <span className={`label ${styles.competency}`}>{artisan.competency}</span>
          </SecondaryControl>
        ))}
      </div>

      {/* A polite live region present from the first render, so a
          refusal after a door is chosen is announced as a state change
          during the screen's life (C-41). It carries the server's own
          sentence or nothing. */}
      <p role="status" className={`prose ${styles.refusal}`}>
        {refusal}
      </p>
    </main>
  );
}
