# Roadmap: novatek-capture-demo

## Overview

Nine phases, 1:1 with the seed's build order and PRD §6.1. The labels ship first, because the first deployment of a new project is a production deployment; the fixtures and their human provenance check follow; then the server seam that every enforced claim rests on, verified from a shell before any screen exists. The client is built on top of that seam in three slices — entry and orders, capture and the decision step, then the offline queue — each proved on a real iPhone and a real Android. Installability and the desktop frame make the preview reachable; the record handed onward, the Limits screen and the handover make it reviewable; referrals land last only because they are newest, re-entering the seam, the capture flow, the queue and the payload as a cross-cutting slice. Every bounded numeric value is code in `lib/limits`, tuned in the phase that first needs it; no phase ships a claim the honesty module does not yet carry.

**Ordering constraints (non-negotiable):** (1) honesty module and ribbon in Phase 1, before any deployment; (2) Phase 2 does not close on referential integrity alone — FR-21a closes it; (3) Phase 3 completes before Phase 5; (4) Phase 9 is cross-cutting — it re-enters Phases 3, 5, 6 and 8; (5) no phase ships a claim the honesty module does not yet carry.

**Review gates:** `bmad-code-review` (with `bmad-review-adversarial-general`) closes Phases 3, 5, 6 and 9 — the seam, the write path, the offline queue, and the one deliberate breach of the uniform not-found.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Scaffold & conventions** - Project configuration, deployment headers, tokens, the governed-sentence module, the ribbon and the one build-check command, so the first (production) deploy is already labelled
- [ ] **Phase 2: Fixtures & types** - The synthetic plant subset, artisans, orders and authored observations with cited records, closed by the human provenance check
- [ ] **Phase 3: Server seam** - Session, the one authorisation accessor, memory store, the one mediating writer, the one responder, every route; proved by the curl suite A–H
- [ ] **Phase 4: Shell, gate, orders, clock (online)** - Entry, persona choice, long-form disclosure, order list and detail, the clock, on the one client projection
- [ ] **Phase 5: Camera → verify → capture → proposals → decisions (online)** - Camera, file-input path, voice note, authored verification, authored proposals, accept/reject at parity, on real phones
- [ ] **Phase 6: Offline** - Device storage, the queue, the connectivity probe, the deliberate-offline control, reconciliation and every conflict card
- [ ] **Phase 7: PWA & desktop frame** - Manifest, icons, service worker, install, update offer, storage truth, the desktop frame, the approved-device list and the gloved test
- [ ] **Phase 8: Walk payload, limits, docs, stills, deploy** - The record handed onward, the Limits screen, handover, harness, stills, the hostile script, and the production merge
- [ ] **Phase 9: Referrals** - Report something else: plate photograph then tag, server-side resolution, the flag, the work proposal, offline and in the payload

## Phase Details

### Phase 1: Scaffold & conventions

**Goal**: A public URL is labelled before it has anything to label, and one command runs every build-time check and exits zero
**Depends on**: Nothing (first phase)
**Requirements**: REQ-FR-47, REQ-FR-48, REQ-FR-50, REQ-FR-65, REQ-NFR-5, REQ-NFR-9, REQ-SM-5
**Success Criteria** (what must be TRUE):

  1. `npm run verify` runs typegen, the type check, the claims audit, the header check, the worker check, lint and build, and exits zero on an empty page — and non-zero when any one check fails; no check warns and none is skippable
  2. The first deployment (Production, `cpt1`) opens on a phone without a Vercel login and shows the `preview` sentence in document flow with no dismissal control, before any other surface exists
  3. Every governed sentence is defined once in `lib/copy/governed.ts`; the duplicate-literal check fails the build on a second literal anywhere in `app/`, `components/` or `lib/`
  4. The claims audit carries the inherited register with version and inheritance date, its owner named, its additions tested against the copied surfaces; the contrast check (7:1 text, with DESIGN.md's decorative-exemption register as input) and the WCAG A/AA check are wired into the same command
  5. `tokens.inherited.css` is byte-identical to the parent's and CI-asserted; `vercel.json` sets region, `Permissions-Policy: camera=(self), microphone=(self)` and the uncached `/sw.js`; a production build with an unresolved build id fails

**Scheduled closures**: Re-read the live Vercel region list; scope the TypeScript 6/7 and ESLint 10 cleanup as scheduled work; confirm the Vercel project settings (Deployment Protection off for previews, System Environment Variables on)
**Plans**: 9 plans in 7 waves

Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Scaffold, pins and the shared check/test harness (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — vercel.json and the header, worker and structure checks (wave 2)
- [ ] 01-03-PLAN.md — The two token layers, globals.css and the design registers (wave 2)
- [ ] 01-04-PLAN.md — The governed sentences, the duplicate-literal check and the claims audit (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-05-PLAN.md — The ribbon, the layout, the shell and the Limits surface (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-06-PLAN.md — The contrast check and the WCAG A/AA check (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-07-PLAN.md — verify.mjs, its fail-fast proof and the CI gate (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-08-PLAN.md — The deployment probe, the toolchain closures and README (wave 6)

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 01-09-PLAN.md — Vercel settings, the Deployment Check, the production merge and the phone check (wave 7)

**UI hint**: yes

### Phase 2: Fixtures & types

**Goal**: The synthetic plant subset, artisans, orders and authored observations exist with cited records, and a person has confirmed every wording against the record it cites
**Depends on**: Phase 1
**Requirements**: REQ-FR-21a
**Success Criteria** (what must be TRUE):

  1. `tsc` is clean over `lib/data/types.ts`, `plant.ts`, `artisans.ts`, `orders.ts`, `observations.ts` and the closed sets (proposal states, conflict and reject codes, referral resolution states, state marks, queue item kinds with emitted schema versions, the eight governed sentences) defined once in the types module
  2. Every `drawn_from` on every authored observation resolves to a real fixture record id; every grade is from {inferred, ambiguous}; no grade meaning *the record states this* is constructible
  3. A named person has read each authored observation against the record it cites and confirmed it is an inference that record supports or only situates it; the fixture file carries the cited record's own sentence in a comment beside each observation and the evidence-or-context relation records which was confirmed — the phase does not close without this
  4. The claims audit is clean over the copied surfaces; the fixture version is a single named export (not the build id); the register (`lib/data/register.ts`) is typed as server-only and the register-isolation rule is wired into the verify command

**Scheduled closures**: FR-21a human provenance check (the one gate no command can run); the fixture-version export; RBAC tier carried as a display-only attribute
**Plans**: TBD

### Phase 3: Server seam

**Goal**: Every enforced claim is enforced server-side and reproducible from a shell: identity from the session, the work order as the only authorisation, uniform not-found, one writer, one attribution producer, one responder, and no path that creates a finding
**Depends on**: Phase 2
**Requirements**: REQ-FR-1, REQ-FR-2, REQ-FR-3, REQ-FR-4, REQ-FR-5, REQ-FR-6, REQ-FR-7, REQ-FR-8, REQ-FR-9, REQ-FR-10, REQ-FR-11, REQ-FR-15, REQ-FR-16, REQ-FR-17, REQ-FR-18, REQ-FR-19, REQ-FR-21, REQ-FR-23, REQ-FR-24, REQ-FR-27, REQ-FR-57, REQ-FR-61, REQ-NFR-F1
**Success Criteria** (what must be TRUE):

  1. The curl suite A–H passes against a deployment from an ordinary shell: A identity from session and orders filtered by it (another persona's jar and no jar both refused); B verification authored and saying so in a header; C asset must belong to the order; D `decided_by` in the body ignored and the acting account stamped; E rejections retained in the walk route; F sync idempotency (`duplicate`, `already_recorded_differently`); G hours accrue server-side and a write to the hours route returns 405; H `X-CAP-Instance` constant across calls and changed after restart
  2. The negative test sets of FR-4, FR-6, FR-23, FR-24 and FR-27 pass: no shaping attempt returns an unowned order; unowned and fabricated ids are byte-identical on read, open, close, capture, decide and sync; a forged actor field appears nowhere; every write route's resulting state is from {open, accepted, rejected, superseded}; ownership is decided before state
  3. Every response carries `Cache-Control: no-store`, `X-CAP-Store` and `X-CAP-Instance`; every error body is `{ error, detail }`; no `proxy.ts` exists and the middleware-absence assertion, single-writer rule, actor-field rule, fixture-inputs rule, named-package ban and accepted-field enumerations (FR-10, FR-61, AD-20) all run inside `npm run verify`
  4. `lib/reconcile/apply.ts` is the sole writer for online routes and `/api/sync` alike, with the check order session → ownership → idempotency → shape → state; refusals are written as retained attempts by the same writer; every capture-bearing route accepts exactly `{sha256, bytes, mime, duration_ms}` plus a bounded thumbnail
  5. Media and thumbnail caps, store caps and TTL are exported from `lib/limits` and read by the server; the offline clock segment is clamped no earlier than the session's issue time and the device's last server contact, with claim and measured offset both retained

**Scheduled closures**: `lib/limits` values first needed here (media and thumbnail caps in encoded bytes, store caps, TTL); the non-bypassability description enumerating every route and every configuration value; the seed's API contracts as the route shapes
**Review gate**: `bmad-code-review` on the seam
**Plans**: TBD

### Phase 4: Shell, gate, orders, clock (online)

**Goal**: An artisan enters as a persona, sees only their orders headed by a name they never typed, opens one, and watches the clock tick — on the one client projection every later screen will use
**Depends on**: Phase 3
**Requirements**: REQ-FR-48a, REQ-FR-58, REQ-NFR-2, REQ-NFR-4, REQ-NFR-4a, REQ-NFR-6
**Success Criteria** (what must be TRUE):

  1. Choosing a persona at the gate shows only that persona's work orders, headed by a name the artisan never typed; opening one starts the clock and it ticks; `X-CAP-Account` on the orders response matches the chosen persona
  2. On first entry the gate states which claims are enforced server-side and which are authored before any is met; on re-entry it shows `preview` plus a control that reopens the long form in full; the ribbon stays in flow on every screen
  3. The artisan reads their own accrued record in full — every segment with its server-stamped or device-claimed source and any measured offset; close ends the segment, reopen appends, and closing a closed order shows its stated conflict
  4. `already_open` and `not_open` carry a sentence and a next act in the conflict table, written to EXPERIENCE.md's rules, before Phase 6 begins
  5. Screens are switched by history state on the one route `/` (no `<Link>`, no `router.push`, `useSearchParams` behind `<Suspense>` on a static Server Component), focus moves to the new screen's heading on every transition, and all cached server state lives in the one client projection module with a single purge operation at the gate; every non-record-binding target is 44 px, non-text contrast is 3:1, no state is encoded by hue alone, and every consequential control confirms by a visible state change within NFR-4's window

**Scheduled closures**: `already_open` / `not_open` sentences and next acts (AD-9); the primitives every later screen measures against (ribbon, record control, secondary control, focus ring, state marks) built against DESIGN.md
**Plans**: TBD
**UI hint**: yes

### Phase 5: Camera → verify → capture → proposals → decisions (online)

**Goal**: At the asset, an artisan photographs, records a spoken note, receives an authored match and authored proposals labelled as such, and accepts one and rejects one under their own name — on a real iPhone and a real Android
**Depends on**: Phase 4 (and Phase 3 complete — ordering constraint 3)
**Requirements**: REQ-FR-12, REQ-FR-13, REQ-FR-14, REQ-FR-20, REQ-FR-22, REQ-FR-25, REQ-FR-26, REQ-FR-28, REQ-FR-59, REQ-FR-60, REQ-NFR-1, REQ-NFR-3, REQ-NFR-7, REQ-NFR-8, REQ-NFR-F2, REQ-NFR-F3, REQ-SM-C3
**Success Criteria** (what must be TRUE):

  1. On a Vercel preview (or `next dev --experimental-https`) from a real iPhone and a real Android: the artisan photographs anything, the authored match renders with `authoredVerification` beside no confidence value, proposals render under `authoredProposals` each naming the record it was drawn from, and the voice note records on both platforms with the format read back from the recorder
  2. The artisan accepts one proposal and rejects one; both are recorded and attributed to the acting account; the decision state replaces the accept/reject pair in place; the rejection and any superseded state survive and are retrievable with prior state, replacement and time
  3. The network panel shows `POST /api/captures` carrying `{sha256, bytes, mime, duration_ms}` and a bounded thumbnail for a photograph and no audio payload for a note; `noRedaction` holds the slot immediately above the shutter in both photograph-screen states; `mediaOnDevice` renders at the photo grid and the voice note
  4. Accept and reject are at parity in CI at 360 px (hit area, contrast, size, weight; neither pre-selected, focused or reachable by an interaction the other is not); accept's confirm is an in-place second tap; reject is single-tap; no gesture-only action exists; the reflow assertions hold at 320 px and 200 % with 130 px record-binding controls, at most two per row and one primary record-binding action per screen
  5. Where the camera stream is refused, the file-input path completes the identical flow; on iOS only one capture is active at a time; a recording is finalised on backgrounding and says so; altering the fixture after a decision leaves the bound context unchanged; every attempt including a refused one is a retained entry

**Scheduled closures**: `lib/limits` note-duration value; the secure-context precondition check with an operator-legible error; real-device testing budgeted here
**Review gate**: `bmad-code-review` on the write path
**Plans**: TBD
**UI hint**: yes

### Phase 6: Offline

**Goal**: Every write is durable on the device before it is acknowledged, nothing is verified or observed on the phone, the queue reconciles idempotently per account on reconnect, and every conflict is stated with a code, a sentence and a next act — never resolved automatically
**Depends on**: Phase 5
**Requirements**: REQ-FR-29, REQ-FR-30, REQ-FR-31, REQ-FR-32, REQ-FR-33, REQ-FR-34, REQ-FR-35, REQ-FR-36, REQ-FR-37, REQ-FR-38, REQ-FR-39, REQ-FR-62, REQ-NFR-F4, REQ-NFR-F5, REQ-SM-C2
**Success Criteria** (what must be TRUE):

  1. `scripts/check-offline.mjs` passes, including its own offline-ness probe (a page-context fetch to a never-cached same-origin URL rejects after `setOffline`), the zero-`_rsc` and zero-document assertion across every pair of screens, and the recovery of an in-progress capture after the app is killed mid-capture
  2. Offline, a verify capture queues as a draft with no verification and no proposals under `noOfflineInference`; an offline decision reads as `pendingReconciliation` and never as done; on reconnect decisions become recorded and attributed and the draft returns with observations; the app reports itself offline on a network with no route to the server
  3. Every conflict and reject code in the closed set (`order_not_found`, `order_closed`, `asset_not_in_order`, `account_mismatch`, `proposal_superseded`, `already_recorded_differently`, `clock_skew`, `already_open`, `not_open`; `store_evicted`, `bad_shape`, `media_too_large`, `unknown_kind`, `unknown_proposal`) is reachable with its sentence and its next act; re-entering as a different persona with an item queued shows the `account_mismatch` card offering discard or sync as the original artisan
  4. An item submitted twice is recorded once; the same id with different content conflicts; two accounts with the same client id produce no cross-account result; session expiry mid-flush discards nothing and re-mints the same persona; the platform 413 arriving without `X-CAP-Instance` renders its disclosed sentence
  5. The outbound size budget below the platform 4.5 MB request-and-response limit, and the truncation semantics before it, are decided and recorded before the batch ceiling is tuned; batches flush by encoded bytes or item count, whichever first; storage exhaustion follows a defined degradation order and the artisan is told what was dropped; wholesale loss of the origin's storage routes to the gate

**Scheduled closures**: Outbound size budget and truncation semantics (blocker on the batch ceiling); the degradation order (AD-21); the IndexedDB layer choice (hand-rolled or `idb`); the offline test strategy; `lib/limits` values for probe interval, staleness window, batch item and byte ceilings, device-store cap; the versioned queue envelope (AD-18) with its emitted set enumerated
**Review gate**: `bmad-code-review` on the offline queue
**Plans**: TBD
**UI hint**: yes

### Phase 7: PWA & desktop frame

**Goal**: The preview installs on both platforms, opens with no signal after one visit with zero failed sub-resources, tells the truth about storage as the runtime returned it, and carries a reviewer from a laptop to a handset
**Depends on**: Phase 6
**Requirements**: REQ-FR-40, REQ-FR-41, REQ-FR-42, REQ-FR-43, REQ-FR-44, REQ-FR-45, REQ-FR-46, REQ-FR-63, REQ-FR-64, REQ-NFR-10, REQ-NFR-11, REQ-NFR-12, REQ-SM-3
**Success Criteria** (what must be TRUE):

  1. Installed to the home screen on a real iOS device and a real Android device; in airplane mode each launches standalone to the orders screen with the offline badge and zero failed sub-resource requests; the shell is precached coherently; screen changes offline issue zero requests
  2. The service-worker choice (hand-rolled `public/sw.js` or `@serwist/turbopack`) is recorded with a stated reason; the worker never serves `/api/` from cache and the build check asserts the guard; a reload is offered only when a previous worker was already controlling the page and the app never reloads itself otherwise
  3. Storage state renders as the runtime returned it — persistent, best-effort or unsupported — with the quota figure omitted where the call is absent; on WebKit not installed, the platform storage-cap sentence renders, cited and dated, with install named as what removes it; the maximum supported offline window and the tested platform floor are read from `lib/limits`
  4. On a wide viewport the preview renders inline as a phone-sized surface beside a scannable QR link (`uqr`) to the same URL — one document, one viewport
  5. The approved-device list is recorded, constrained to devices with a manufacturer-documented glove mode; the gloved test has run — at least five artisans across the three trades, own gloves, on the approved devices — and its result is written down whether it passed or not; the handover states that no binding standard governs handheld field HMI

**Scheduled closures**: Service-worker choice with a stated reason; approved-device list (NFR-11; luminance and ambient-contrast candidates as inputs); gloved test with its scheduling dependency (NFR-10); the seed's SW design (coherent-shell precache, navigation timeout, update-offer rule) as the design either choice must satisfy; `lib/limits` values for the offline window and platform floor; the named-package ban re-checked if a second bundler's dependencies enter
**Plans**: TBD
**UI hint**: yes

### Phase 8: Walk payload, limits, docs, stills, deploy

**Goal**: The record handed onward is retrievable with its five distinct sets, every claim's disposition is on one screen with the check a reviewer can run, the handover and the hostile script ship with the build, and the production deployment is live from `main`
**Depends on**: Phase 7
**Requirements**: REQ-FR-49, REQ-FR-51, REQ-FR-52, REQ-FR-53, REQ-FR-54, REQ-FR-55, REQ-FR-56, REQ-FR-66, REQ-SM-1, REQ-SM-2, REQ-SM-4, REQ-SM-C1
**Success Criteria** (what must be TRUE):

  1. `CAPTURE_SESSION_KEY` is verified set on Production and on Preview; `dev` is merged to `main` and the Git-connected production deployment is live at `cpt1`; the phone walkthrough passes end to end against it (ribbon before the gate → install → enter as the fitter → two orders headed by a name never typed → clock starts → authored match → photo and voice with chips saying what leaves the phone → airplane mode reload from cache → one accept, one reject pending → draft queued → reconnect → recorded and attributed → "What Walk receives" → persona switch → `account_mismatch`)
  2. "What Walk receives" for one order shows accepted observations, retained rejections, open proposals, referrals and retained attempts as distinct sets, with the decision context on each, arrival server-derived with any client claim shown as a claim, `redaction.ran: false` and `audio_left_device: false` as explicit fields, and the store's kind, instance and retention window; an order that is not the requester's returns the same not-found as a nonexistent one
  3. The Limits screen renders all eight governed sentences with the live `X-CAP-Instance` and storage state, and for each product claim its disposition (enforced / authored / not exercised) with the reviewer's check for each enforced one; the seven non-ribbon sentences each render at the point their claim is made, and the chosen evidence artefact (handover table or automated placement check, recorded in P8; if automated, added to the verify gate) proves it
  4. The hostile script (negative sets of FR-4, FR-6, FR-23, FR-24, FR-27, FR-34) runs against the public URL from an ordinary shell with a standard HTTP client, prints pass/fail per attempt, and ships with its output; the handover names the claims register and its owner, the sentence-to-location mapping, the enforced/authored/not-exercised table, the stated limitations of FR-3, FR-45, FR-50, FR-58 and FR-63, the enumeration of every interface and configuration value (AD-19), and how to try to break it
  5. Across the walkthrough the only inputs are persona choice, shutter, record, accept, reject and an optional note; no governed sentence has lost prominence since Phase 1; the stills are captured by the harness; README ships

**Scheduled closures**: Label-placement evidence artefact (table vs automated check) decided and recorded; handover including PRD Q3 (brief's "binds to nothing" wording) and Q4 (SHEQ manager as ownership evidence); which eviction case the demo script reaches (`store_evicted` card; instance change silent); the website link follow-up
**Plans**: TBD
**UI hint**: yes

### Phase 9: Referrals

**Goal**: An artisan on an open order reports something on an asset they were not sent for, without leaving the order: the plate photograph exists before the tag is typed, the server resolves the tag and flags the asset in the same commit, an unresolved tag is retained, no proposal or decision is created, no work order is created or amended, and it all works offline and lands in the payload
**Depends on**: Phase 8 (cross-cutting: re-enters Phases 3, 5, 6 and 8)
**Requirements**: REQ-FR-R1, REQ-FR-R2, REQ-FR-R3, REQ-FR-R4, REQ-FR-R5, REQ-FR-R6, REQ-FR-R7, REQ-FR-R8, REQ-FR-R9, REQ-FR-R10, REQ-FR-R11
**Success Criteria** (what must be TRUE):

  1. From inside an open order, via the one fixed referral entry bar and never via the asset-not-on-order refusal, an artisan raises a referral: the plate photograph is captured and durable before the tag field appears; `noRedaction` holds the slot above the plate shot; the typed tag is retained as the artisan's claim and never overwritten by the resolution
  2. A tag that resolves attaches a flag to the asset in the same commit as the referral, through the one mediating writer, with an id derived from the referral's; a tag that does not resolve leaves the referral retained with its plate photograph, author and time, marked as concerning an unidentified asset; a referral with no tag entered proceeds and is unresolved; nothing offers delete
  3. Raising a referral creates no proposal, verification or decision record; the work-order set is unchanged; the referral response reveals existence only, and a tag on another artisan's order returns byte-for-byte what an unassigned tag returns while the order id in the same request keeps the uniform not-found
  4. A referral raised offline queues with its plate photograph, states that the named asset has not yet been confirmed to exist and nothing has been raised, and reconciles both halves on reconnect with the device-claimed time clamped and its source recorded; the referral-specific queue codes (`referral_evidence_missing`, `unknown_referral`) either carry a sentence and a next act in EXPERIENCE.md's rules or leave the type
  5. Referrals appear in "What Walk receives" as their own set — named asset, resolution state, captures, author, time, and the flag where resolved — never as an accepted observation; the register reaches no client bundle (register-isolation rule); the referral route's accepted fields are exactly the capture set plus the tag

**Scheduled closures**: Referral-specific queue codes closed with UX (sentences and next acts, or removed from the type); the `referral` queue kind and its schema version added to the emitted set; the hostile script and the non-bypassability enumeration extended to the referral route and the flag
**Review gate**: `bmad-code-review` on the breach specifically (the one bounded exception to the uniform not-found)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold & conventions | 0/TBD | Not started | - |
| 2. Fixtures & types | 0/TBD | Not started | - |
| 3. Server seam | 0/TBD | Not started | - |
| 4. Shell, gate, orders, clock (online) | 0/TBD | Not started | - |
| 5. Camera → verify → capture → proposals → decisions (online) | 0/TBD | Not started | - |
| 6. Offline | 0/TBD | Not started | - |
| 7. PWA & desktop frame | 0/TBD | Not started | - |
| 8. Walk payload, limits, docs, stills, deploy | 0/TBD | Not started | - |
| 9. Referrals | 0/TBD | Not started | - |

## Coverage

105 of 105 v1 requirements mapped to exactly one phase (79 FR, 13 NFR, 5 feature NFR, 8 success metrics); 0 orphaned; 0 duplicated. Per phase: P1 7 · P2 1 · P3 23 · P4 6 · P5 17 · P6 15 · P7 13 · P8 12 · P9 11. Split-binding placements are recorded under Traceability in `.planning/REQUIREMENTS.md`.

---
*Roadmap created: 2026-09-04 from ingest (new-project-from-ingest)*
