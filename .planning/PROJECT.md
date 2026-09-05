# novatek-capture-demo — NOVATEK Capture, designed preview

## What This Is

A phone-first PWA preview of NOVATEK Capture, sibling of ipv-demo, for NOVATEK LLC (Pty) Ltd. An artisan enters as one of three personas, opens a work order already assigned to them, photographs and speaks at the asset, receives an authored verification and authored proposals drawn from the asset record, and accepts or rejects each proposal under their own name; the record is handed onward with accepted, rejected, open and referred sets kept distinct. The plant, the people and every record are synthetic; the artisan framing is a time-served artisan converting plant knowledge into a durable asset while remaining employed.

## Core Value

The preview is real where it claims to be real: every claim labelled enforced (work-order identity, the accept/reject gate, attribution, the offline queue) is enforced server-side and survives a hostile reviewer with devtools, and every claim that is authored (the verification, the observations) is labelled as authored at the point it is met.

## Requirements

### Validated

(None yet — ship to validate)

### Active

Full register with IDs and verification methods: `.planning/REQUIREMENTS.md` (105 v1 requirements: 79 FR, 13 NFR, 5 feature NFR, 8 success metrics). Summary by capability:

- [ ] Identity and the one seam — a session minted from a chosen persona; the work order is the only authorisation, decided in one accessor; unowned and unknown orders return byte-identical not-found on every route (FR-1–6, FR-57, NFR-F1)
- [ ] The clock — server-stamped segments that open, close and reopen; hours read-only and server-derived; device-claimed times clamped and their source recorded; the artisan reads their own record in full (FR-7–11, FR-58)
- [ ] Capture at the asset — camera and file-input paths, spoken note by runtime capability probe; only a fingerprint and bounded thumbnail leave the device for a photograph, and no audio ever leaves (FR-12–19, NFR-F2, NFR-F3)
- [ ] Proposals and the decision step — authored proposals with provenance and a human provenance check before they ship; server-derived unguessable proposal ids; accept and reject at parity; attribution stamped by the server only; a decision binds what was shown; every attempt retained; no path creates a finding (FR-20–28, FR-21a, FR-59–61)
- [ ] Referrals — report something outside the order: plate photograph before the typed tag, server-side resolution against the register, unresolved names retained, a flag written with its referral, no proposals and no decision step, no work order created or amended (FR-R1–R11)
- [ ] Working without signal — every write queued and durable before acknowledgement; connectivity verified by probe; deliberate-offline control; offline decisions re-validated on arrival; idempotent per-account reconciliation; every conflict stated with a code, a sentence and a next act; batches bounded by bytes and count (FR-29–39, FR-62, NFR-F4, NFR-F5)
- [ ] Installability and the offline shell — home-screen install, launch with no signal after one visit, application routes never cached, request-free screen changes, update offered never imposed, storage protection reported as the runtime returned it, the desktop frame carrying a reviewer to a handset, a stated platform floor (FR-40–46, FR-63, FR-64)
- [ ] The honesty surface — one definition per governed sentence, the non-dismissible ribbon, the gate's long-form disclosure, each claim labelled where made, the claims audit that blocks the build, one command running every build-time check, a handover shipped with the build (FR-47–51, FR-48a, FR-65, FR-66)
- [ ] The record handed onward — the payload for one order with its five distinct sets, server-derived arrival, explicit no-redaction and audio-never-left fields, a store that describes itself (FR-52–56)
- [ ] Field usability floor — 130 px record-binding controls, 44 px everything else, no gesture-only action, gloved confirmation by visible state alone, 7:1 text and 3:1 non-text contrast, reflow at 320 px and 200 %, thumb reach, WCAG 2.2 AA plus SC 2.5.5 and SC 1.4.6 in CI, gloved usability established by test, glove mode as a device requirement, no governing standard claimed (NFR-1–12, NFR-4a)
- [ ] Success metrics — a published hostile script passes against the public URL; every authored claim labelled before questioned; opens with no signal on real phones; nothing typed the system knows; the audit trips on no commit; labelling never reduced as polish improves; the offline path never smoother than online; accept and reject equally weighted (SM-1–5, SM-C1–C3)

### Out of Scope

- No model runs anywhere (vision, transcription, inference, OCR of the plate) — verification and observations are authored from fixtures; a named-package ban asserts it
- No redaction pass — stated above the shutter; in the product redaction is not optional
- No database — memory-only store per serving instance, discarded on cold start, and it says so
- No supervisor role, review queue, countersignature or second-person approval — all three personas are artisans; RBAC tier is display-only
- No hours dispute or correction path — stated as a preview limitation
- No claim of novelty, no cost, saving or ROI figure, no product-level readiness number — only the enforcement posture is claimable, per element
- No speaker identification, voice-print enrolment or diarisation — POPIA names voice recognition among biometrics; not a deferral
- No live plant data, no production identity (SSO, directory, revocation), no native wrapper, not a CMMS
- Deferred out of the preview, not the product: transcription of the spoken note, reading back an asset's history, any supervisor-side view, a coached checklist
- Addendum candidates dispositioned "not adopted" (luminance benchmark, ambient-contrast ranking, ISA-101 alignment, STT ingestion, iframe allow attribute, shift-start permission re-request, per-session telemetry, PDF/print renderings, signature-level tamper detection, audit export, prevent/detect column) — product-level or superseded; listed with disposition in REQUIREMENTS.md

## Context

- Ingested 2026-09-04 from nine documents: one locked architecture spine (ADR), four specs (DESIGN, EXPERIENCE, SPEC, epics), two PRDs (prd.md governs; addendum is candidates), the brief and the seed plan. Conflict report: 0 blockers, 1 acknowledged warning (citation-only cycle), 17 auto-resolved. Intel: `.planning/intel/`.
- Inherits from ipv-demo: the enforced/authored split, the claims register and its banned strings (owned by the SHEQ manager), uniform not-found, "a forgeable audit field is no audit field", "proposals queue; there is no offline inference", byte-identical inherited tokens, the synthetic plant vocabulary, RBAC 1:1 from BRIMIS with a recorded field-technician extension the parent programme should ratify before production.
- Repo `MattSlayed/novatek-capture-demo` (public), Vercel project Git-connected, `CAPTURE_SESSION_KEY` set on Production and Preview, region cpt1 confirmed, Node 24.x; framework preset becomes Next once `vercel.json` lands in P1. Still dashboard-only for the user: turn off Vercel Authentication on previews. BMAD 6.11.0 project-local produced the specs; GSD builds.
- The first deployment of a new project is a production deployment, whatever the flags — so the governed-sentence module and the ribbon ship before any other surface.
- Vocabulary is PRD §3 verbatim in code and copy alike: artisan, account, session, gate, work order, asset, capture, verification, observation, proposal, decision, finding, referral, asset register, flag, clock, queue, reconciliation, conflict, governed sentence. A synonym is a discipline violation. Finding means an asserted fact, which nothing in this system creates.
- Every bounded numeric value (media and thumbnail caps, note duration, batch ceilings, store caps and TTL, probe interval and staleness window, offline window, platform floor) is code in `lib/limits`, tuned in the phase that first needs it. Planning documents do not restate them.
- Verification posture: the curl suite A–H from a shell (P3), the phone walkthrough on a real iPhone and a real Android (P5, P7, P8), the Playwright harness that proves its own offline-ness (P6), and the published hostile script SM-1 (P8).
- Known gotchas carried from the seed: Turbopack only (no `webpack()` key); async request APIs; no `proxy.ts`; `useSearchParams` behind `<Suspense>` on a static `/`; `history.pushState` only between screens; React 19 strict effects double-invoke `getUserMedia`; service worker is production-only; `/sw.js` explicitly uncached; iOS one active capture at a time and separate storage for the installed app; the stateless cookie cannot revoke.

## Constraints

- **Tech stack (locked, D-STACK)**: Next.js 16.3.4 App Router, React 19.2.8, TypeScript 5.x (documented exception to 7), ESLint 10.9.1, Node.js 24, uqr 0.1.3 pinned, Playwright 1.62.1, Turbopack, plain CSS + CSS Modules with two token files, no CSS framework — the code owns these once `package.json` exists
- **Platform (locked, D-DEPLOY)**: Vercel region cpt1 only, no function-level failover, no availability target claimed; request and response bodies capped at 4.5 MB by a headerless platform 413 that is a named, disclosed exception; no Routing Middleware; Node runtime and dynamic rendering on every handler
- **Environments**: local `next dev --experimental-https`; `dev` branch → Preview; `main` → Production; one build command everywhere; a production build with an unresolved build id fails
- **Target devices**: installed PWA on iOS Safari and Android Chrome at the tested platform floor (value in `lib/limits`); approved-device list constrained to documented glove modes (NFR-11), decided in P7
- **Security posture**: stateless HMAC cookie `cap_session` (HttpOnly, SameSite=Lax, Secure in production) read in each handler; session key required in production; no feature flag may relax an invariant; `Permissions-Policy: camera=(self), microphone=(self)` asserted by the header check
- **Dependency direction (locked, D-DEP)**: `lib/data` imports neither store nor reconcile; `components/` imports none of access, reconcile, store or the register; the client reaches the server only over HTTP
- **Build gate (AD-15)**: one command, every check fails rather than warns, none skippable; FR-21a is the one human gate and is not lesser
- **Honesty surface (AD-22)**: eight governed sentences as a closed set, each rendered in full or not at all, ribbon in document flow, labelling only ever strengthened
- **Claims discipline**: the register's banned strings enforced by the claims audit over `app/`, `components/`, `lib/`; no performance, cost, turnaround or accuracy figure; no staffing-reduction framing; no present-tense claim for a capability that does not exist
- **Geometry (DESIGN.md governs)**: record-binding controls 130 CSS px, at most two per row, one primary record-binding action per screen; all other targets 44 px; 13 px type floor; the 34 px safe area charged once

## Key Decisions

<decisions>

All entries below are locked by the architecture spine (precedence 0) and are not re-litigated in any phase. Full text: `.planning/intel/decisions.md`.

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| D-0 Server-authoritative single-writer with a queue-first client projection | One mediating writer; the client decides nothing; the queue is the only path, online and offline alike | — Pending |
| D-INH Eight inherited invariants bind unchanged | A local contradiction is a conflict to surface, not an override | — Pending |
| AD-1 One write path (`lib/reconcile/apply.ts`) for online and reconciled writes; refusals do not escape the writer; nothing silently discards a queued item | A reconciliation path that validates less than the online route is the named failure | — Pending |
| AD-2 The work order is the only authorisation, checked in one accessor with a session-derived account; no Routing Middleware | A second seam is a second place to be wrong; middleware deploys to all regions | — Pending |
| AD-3 Attribution has exactly one producer; server-derived facts take no input from the body | A forgeable audit field is no audit field | — Pending |
| AD-4 Not-found is uniform; the single bounded exception is tag resolution on referrals, existence only | Ownership before state; no conflict code may separate unowned from nonexistent | — Pending |
| AD-5 Proposal id = HMAC over account, envelope client id and observation; validation reads nothing from the store | Re-derivable on any instance; unguessable without the key | — Pending |
| AD-6 A decision binds a snapshot of its context, copied in the same commit; `fixture_version_mismatch` is a state mark | Later fixture changes cannot alter what the decider was shown | — Pending |
| AD-7 The asset register is server-only; no client validation, autocomplete or lookup on a typed tag | The client neither holds nor consults the register | — Pending |
| AD-8 Authored results declare exactly `(assetId, fixtureSet)`; named-package ban on vision, OCR, inference, speech and voice-print libraries | No model runs, and the build proves it | — Pending |
| AD-9 Idempotency keyed `${account_id}:${client_id}`, compared by content through one canonicaliser; open/close idempotent by state; `already_open`/`not_open` closed in P4 | Cross-account replay impossible; a retry after timeout is a duplicate, not a card | — Pending |
| AD-10 Memory store per instance, TTL-swept, capped, boot-stamped; cold start and instance change silent; only eviction surfaced | No cross-instance state; no "server restarted" sentence exists | — Pending |
| AD-11 One responder stamps every response (no-store, `X-CAP-Store`, `X-CAP-Instance`); observability is the headers; the platform 413 is the disclosed exception | A reviewer reproduces any claim from a shell without reading a body | — Pending |
| AD-12 One definition per governed sentence; platform capability claims are runtime results; platform policy claims are cited and dated | No browser-name branch may select a wording | — Pending |
| AD-13 Every bounded quantity is one export in `lib/limits`, read by both sides | Values are code, not documentation; restatements are stale by construction | — Pending |
| AD-14 Screen changes issue zero requests; screen, order and asset are addressable state surviving an iOS relaunch; focus moves on every transition | The mechanism may change, the assertion may not | — Pending |
| AD-15 One build gate that fails rather than degrades; the full check list; FR-21a is the one human gate | No check warns, none is skippable; an unresolved build id fails production | — Pending |
| AD-16 One item envelope, one client id minted at enqueue, and every entity's own id is that value | One writer is not one shape; the missing half of AD-1 | — Pending |
| AD-17 One client projection is the sole reader and writer of cached server state; P4 builds against it before P6 supplies IndexedDB | Otherwise P4's store is rework | — Pending |
| AD-18 The queue envelope is versioned; the writer accepts every emitted version; a breaking change is a new kind | The offline claim must hold across deployments | — Pending |
| AD-19 No type, state, route or configuration value produces a finding; the enumeration ships with the handover | The differentiating claim is that the gate cannot be turned off | — Pending |
| AD-20 What leaves the device is enumerated: `{sha256, bytes, mime, duration_ms}` plus a bounded thumbnail, on every capture-bearing route | Asserted by a build rule and by a harness check on the actual request body | — Pending |
| AD-21 Device lifecycle bound and its limits told: originals deleted once recorded; cap with a degradation order; wholesale loss routes to the gate | Storage exhaustion is an expected path; the artisan is told what was dropped | — Pending |
| AD-22 The honesty surface may only be strengthened; eight sentences closed; render in full or not at all; the referral entry bar is the one fixed element | Polished-and-unlabelled is a failure | — Pending |
| AD-23 A flag is a stored record written in the same commit as its referral, id derived from the referral's, evicted with it | No dangling reference; no promotion to a finding | — Pending |
| D-DEP Dependency direction as graphed | Client reaches the server only over HTTP | — Pending |
| D-CONV Consistency conventions: glossary verbatim, id shapes, ISO-8601 UTC, base64-encoded byte sizes, error envelope, closed sets defined once, no flag relaxes an invariant | One vocabulary in code and copy | — Pending |
| D-STACK Next 16.3.4 / React 19.2.8 / TS 5.x / ESLint 10.9.1 / Node 24 / uqr 0.1.3 / Playwright 1.62.1 / Turbopack / Vercel cpt1 | Verified current at the 2026-08-31 sweep; the 16.2.x line is dead | — Pending |
| D-DEPLOY Three environments, one build command; first deploy is production; Git-connected build identity; no region failover claimed | P1 ships the labels before anything else | — Pending |
| D-ENT Core entities and their relations; a referral has no proposal, verification, decision or cited record | A flag records that a person raised something, not that a condition obtains | — Pending |
| D-MAP Capability → architecture map by phase P1–P9 | Which ADs govern which phase | — Pending |
| Referral proposes work; a named person raises it (PRD Q1, 2026-09-02) | No route creates or amends a work order | ✓ Good |
| Capture extends the inherited field-technician ceiling as a recorded extension (2026-08-31) | Retrievable attribution replaces the second signature; the parent programme should ratify before production | ⚠️ Revisit |

</decisions>

### Deferred decisions (not locked; each scheduled into a phase)

| Item | Scheduled | Note |
|------|-----------|------|
| Service worker: hand-rolled `public/sw.js` or `@serwist/turbopack` | P7 | Decided with a stated reason; AD-14's zero-request assertion and AD-15's worker guard bind either |
| IndexedDB layer: hand-rolled wrapper or `idb` | P6 | No invariant turns on it |
| Offline test strategy (Playwright ≥ 1.57 routes SW fetches through the context; the seed's stop-the-server fallback is likely over-engineered) | P6 / P7 | Offline-ness is proved by the harness, never assumed |
| Values of every bounded quantity in `lib/limits` | Per phase, first use | P3 media/thumbnail caps, store caps and TTL; P5 note duration; P6 probe interval, staleness window, batch ceilings, device cap; P7 offline window, platform floor |
| TypeScript 6/7 migration and ESLint 10 rule-cleanup scope | P1 (scope only) | Scheduled work, not architecture |
| Trigger for re-deciding the region posture | None | Re-decided only if shared cross-instance state is ever needed |
| Approved-device list | P7 | Constrained by NFR-11; luminance and ambient-contrast candidates are inputs; carries NFR-10's scheduling dependency |
| Route tree, file layout and component decomposition | P1 onward | The seed's shapes are a cold start; the code owns them |

### Open questions (gaps, not deferrals)

| Question | Scheduled | Note |
|----------|-----------|------|
| Outbound size budget below the platform 4.5 MB request-and-response limit, and truncation semantics before it | P6, before the batch ceiling is tuned | A blocker on the batch ceiling, not a preference |
| Which eviction case must be reachable in a walkthrough (PRD Q5) | P8 | Settled by EXPERIENCE: `store_evicted` has its own card; an instance change is silent. Demo-script question |
| Handover documentation matters: does the brief's "binds to nothing" wording still hold (Q3); is naming the SHEQ manager sufficient ownership evidence (Q4); label-placement evidence artefact (table vs automated check) | P8 | Owned by the handover; if automated, the placement check joins AD-15's gate |

---
*Last updated: 2026-09-04 after ingest (new-project-from-ingest)*
