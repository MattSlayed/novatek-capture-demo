# Requirements: novatek-capture-demo

**Defined:** 2026-09-04 (ingest of prd.md, precedence 2, with addendum.md candidates dispositioned)
**Core Value:** The preview is real where it claims to be real — every enforced claim is enforced server-side and survives a hostile reviewer; every authored claim is labelled at the point it is met.

IDs keep the PRD's own numbering (`REQ-{PRD id}`). Each FR carries its verification method from the PRD's `[Verified by: …]` tag. Bounded numeric values (media caps, note duration, batch ceilings, store caps, TTL, probe interval, staleness window, offline window, platform floor) are code in `lib/limits` and are not restated here. Vocabulary is PRD §3 verbatim.

## v1 Requirements

### Identity and work-order access — the seam (PRD §4.1)

- [ ] **REQ-FR-1**: An unauthenticated visitor chooses one of three artisan personas at the gate and receives a session bound to that account: HttpOnly, SameSite=Lax cookie (Secure in production); unknown persona returns 404 with a stated reason; no identity value from the body is persisted. *[Verified by: test]*
- [ ] **REQ-FR-2**: A client can ask the server which account it is acting as and receives the account or 401. *[Verified by: test]*
- [ ] **REQ-FR-3**: An artisan can end the session; the cookie is cleared. Stated limitation (Limits screen + handover): the credential is stateless, so a copied credential remains valid until expiry; no revocation is claimed. *[Verified by: test]*
- [ ] **REQ-FR-4**: An artisan sees the work orders assigned to their account and no others, read through one named accessor taking the session-derived account as a non-optional argument; a build rule asserts no other module reads the order store. Negative set: B's and C's ids directly, `account` query parameter, `account` in body, `X-Account` header — no response contains an order not assigned to A; unauthenticated → 401; response carries the acting account in a header. *[Verified by: analysis (primary) + enumerated negative test set]*
- [ ] **REQ-FR-5**: An artisan can open a work order assigned to them and receive the order, its assets, its clock, and any verifications, proposals and decisions already recorded; server-only fields stripped. *[Verified by: test]*
- [ ] **REQ-FR-6**: A request for an order that belongs to another account returns exactly the response a nonexistent order returns — identical status, body and headers — on every route including reconciliation. Negative set: read, open, close, capture, decide and sync routes byte-identical for an unowned id and a fabricated id. *[Verified by: test]*
- [ ] **REQ-FR-57**: Authorisation is decided by work-order assignment alone, in a single named accessor invoked by every route; a written non-bypassability description enumerates every route; no route consults RBAC tier; no authorisation in framework middleware; the highest-tier persona reaches exactly their assigned orders. *[Verified by: analysis (primary) + inspection]*
- [ ] **REQ-NFR-F1**: Every response carries no-store caching, the store kind and the serving instance identifier, so a reviewer can attribute any observed behaviour to an instance. *[Verified by: test]*

### The clock (PRD §4.2)

- [ ] **REQ-FR-7**: Opening an assigned work order starts a server-stamped clock segment; opening an already-open order is idempotent and creates no second segment. *[Verified by: test]*
- [ ] **REQ-FR-8**: Closing an open order ends the current segment; closing a closed or unopened order returns a stated conflict. *[Verified by: test]*
- [ ] **REQ-FR-9**: Reopening a closed order appends a new segment; prior segments are retained. *[Verified by: test]*
- [ ] **REQ-FR-10**: Accrued hours are computed server-side from segments; the hours route accepts reads only (write → 405); every write route is enumerated against its accepted fields and none accepts an artisan-supplied duration or hour value. *[Verified by: test + inspection]*
- [ ] **REQ-FR-11**: A segment opened without signal records the device-claimed start, clamped no earlier than the session's issue time and the device's last server contact, marked device-reconciled rather than server-stamped; both the device-claimed time and the server-measured offset are retained; neither silently replaces the other. *[Verified by: test]*
- [ ] **REQ-FR-58**: An artisan can read their own accrued record in full — every segment, its source, any measured offset; nothing withheld. Stated limitation: no route to contest a segment. *[Verified by: demonstration]*

### Capture at the asset (PRD §4.3)

- [ ] **REQ-FR-12**: Photograph an asset with the camera: rear camera by preference; live video dimensions read at shutter time; the stored image re-encoded, bounded on its long edge, carrying no EXIF. *[Verified by: test + demonstration]*
- [ ] **REQ-FR-13**: Where the camera stream is unavailable or refused, capture through the platform file input with environment capture; the resulting flow is identical. *[Verified by: test + demonstration]*
- [ ] **REQ-FR-14**: Record a spoken note up to a bounded duration; container and codec negotiated at runtime by capability probe, no hardcoded format, format read back from the constructed recorder; duration by wall clock; where construction fails the artisan is told plainly that voice notes are unavailable in this browser. *[Verified by: test + demonstration]*
- [ ] **REQ-FR-15**: For a photograph only a hash of the full image, its size, its type and a bounded thumbnail leave the device; the request body contains no full-resolution image field; the thumbnail bound is enforced client- and server-side in encoded bytes. *[Verified by: test + inspection]*
- [ ] **REQ-FR-16**: A spoken note's request carries a hash, a size, a type and a duration and no audio — exactly the four declared fields; the governed sentence states exactly this and no more. *[Verified by: test + inspection]*
- [ ] **REQ-FR-17**: A verify-purpose capture returns a match drawn from the asset record, labelled authored / no model ran; one named module declares inputs `(assetId, fixtureSet)` and a build rule asserts the capture payload is neither a parameter nor reachable; negative set: differing images, no thumbnail, solid-colour thumbnail → byte-identical results; the dependency manifest contains no image-analysis, vision, OCR or inference library; a response header states the verification is authored; null confidence, authored extractor, no code path sets a confidence. *[Verified by: analysis (primary) + enumerated negative test set + inspection]*
- [ ] **REQ-FR-18**: A capture against an asset not on the artisan's order is refused with a stated reason; a referral is a different object, not a bypass. *[Verified by: test]*
- [ ] **REQ-FR-19**: Oversized media is refused with a stated reason and a sentence the artisan can act on. *[Verified by: test]*
- [ ] **REQ-NFR-F2**: On iOS only one capture is active at a time — camera tracks stopped before the recorder starts and vice versa; tracks re-acquired on return to visibility. *[Verified by: demonstration]*
- [ ] **REQ-NFR-F3**: Recording does not continue when the app is backgrounded; the recording is finalised on the visibility change and this is stated, not silently unsupported. *[Verified by: test + demonstration]*

### Proposals and the decision step (PRD §4.4)

- [ ] **REQ-FR-20**: A verify-purpose capture returns proposals each carrying observation text, grade, the record drawn from, and whether that record is evidence for or context around the statement; every cited record resolves to a real fixture record; grade from the closed set {inferred, ambiguous}; no authored observation carries the grade meaning *the record states this*; a header states the count and that the proposals are authored. *[Verified by: test]*
- [ ] **REQ-FR-21a**: Every authored observation passes a human provenance check before it ships: a person has read the record it cites and confirmed the wording is an inference that record supports or only situates it; the fixture file carries the cited record's own sentence in a comment beside each observation; the evidence-or-context relation records which was confirmed. Phase 2 does not close on referential integrity alone. *[Verified by: inspection]*
- [ ] **REQ-FR-21**: A proposal identifier is derived by the server from the account, the capture and the observation; a client cannot construct a valid one; identifiers are not sequential; a decision against a fabricated id and against another account's id return the same unknown-proposal response; derivation documented as reproducible by any instance without shared state. *[Verified by: test + analysis]*
- [ ] **REQ-FR-22**: An artisan can accept or reject one open proposal on an asset within their order, with an optional note; parity asserted in CI against the rendered card at 360 px (equal hit area, contrast, font size and weight; neither carries focus ring, autofocus or pre-selection; neither reachable by an interaction the other is not); neither is a default; no interaction accepts more than one proposal at a time. *[Verified by: test]*
- [ ] **REQ-FR-23**: Every actor field on every record is the acting account derived from the session, produced by one named function; a build rule asserts no other module assigns one and no route schema contains one; negative set across session, clock segment, capture, verification, decision, referral: a body naming a different artisan yields a record naming the acting account and the submitted value appears nowhere. *[Verified by: analysis (primary) + enumerated negative test set]*
- [ ] **REQ-FR-59**: Recording a decision persists the decision context (proposal text as rendered, grade, cited record, evidence-or-context relation, fixture version in force) bound before the decision is recorded; retrievable with the decision, in the record handed onward, surviving later fixture changes. *[Verified by: test]*
- [ ] **REQ-FR-60**: Every act on a proposal or referral — create, decide, refuse, conflict, reject, success and failure alike — produces a server-generated, time-stamped entry naming the acting account, event type and outcome; retained for the store's stated window; surfaced in the record handed onward; never obscures an earlier entry. *[Verified by: test]*
- [ ] **REQ-FR-61**: No route accepts client-supplied observation text, grade or provenance that becomes a proposal; every write route enumerated against accepted fields. *[Verified by: inspection]*
- [ ] **REQ-FR-24**: Every write to the record store passes through a single reconciliation module with no operation creating a finding; a build rule asserts nothing else writes; the non-bypassability analysis enumerates every interface and every configuration value (env vars, feature flags, build modes, fixture selection); for every write route the resulting state is from {open, accepted, rejected, superseded}. *[Verified by: analysis (primary) + enumerated negative test set]*
- [ ] **REQ-FR-25**: A rejected proposal is retained with its decision, decider and time, surfaced in the record handed onward; no operation deletes a rejection. *[Verified by: test]*
- [ ] **REQ-FR-26**: A superseded proposal remains retrievable with its prior state, the replacing state and the time of change, and appears in the record handed onward. *[Verified by: test]*
- [ ] **REQ-FR-27**: For a decision on a proposal that is unknown or not the artisan's, the response is identical and produced before any state comparison; no conflict response distinguishes another account's proposal from a nonexistent one. *[Verified by: test]*
- [ ] **REQ-FR-28**: An accept or reject is committed as one unit at the moment of the artisan's act, attribution bound then, committed separately from media upload. *[Verified by: test]*

### Referrals — observations outside the order (PRD §4.5; cross-cutting)

- [ ] **REQ-FR-R1**: Report something outside the order from a deliberate action alongside the assets, without leaving the order; distinct from asset selection; not reached via the FR-18 refusal. *[Verified by: demonstration]*
- [ ] **REQ-FR-R2**: The plate photograph is captured and durable before the typed tag is entered; the typed name is recorded as the artisan's claim, distinct from the server's resolution; no OCR runs; with no plate present or legible the referral proceeds with the tag unentered and is treated as unresolved. *[Verified by: test]*
- [ ] **REQ-FR-R3**: The server resolves the name against the register; the client neither holds nor consults the register; the response reveals existence only (nothing about zone, orders, assignment or history); a referral naming an asset on another artisan's order returns a response identical to one naming an unassigned asset. *[Verified by: test]*
- [ ] **REQ-FR-R4**: Where the named asset does not resolve, the referral is retained, attributed, marked as concerning an unidentified asset; observation, captures, author and time all retrievable; no path deletes a referral for failing to resolve. *[Verified by: test]*
- [ ] **REQ-FR-R5**: A referral carries captures under FR-12 through FR-16 and FR-19 unchanged: full photograph and recording stay on device; no redaction runs. *[Verified by: test]*
- [ ] **REQ-FR-R6**: The referral path invokes no proposal generation; raising a referral creates no proposal, verification or decision record. *[Verified by: inspection + test]*
- [ ] **REQ-FR-R7**: A referral is handed onward as a proposal that work be attached to an existing order or newly raised; no route creates or amends a work order; the work-order set is unchanged after a referral. *[Verified by: inspection + test]*
- [ ] **REQ-FR-R8**: A referral is attributed from the session by the server and never anonymous; a submitted attribution is ignored. *[Verified by: test]*
- [ ] **REQ-FR-R9**: Offline, an artisan can raise a referral, name the asset, capture and record; the interface states the named asset has not yet been confirmed to exist and nothing has been raised; the plate photograph is queued like any capture; device-claimed time clamped and its source recorded; on reconnect the server resolves the name and produces the work proposal. *[Verified by: test]*
- [ ] **REQ-FR-R11**: Where a named asset resolves, a flag is attached recording that an artisan reported something, written through FR-24's single mediating module and enumerated in its non-bypassability analysis; no operation promotes a flag into an asserted statement; the flag carries the referral, its author and its time, and appears in the record handed onward. *[Verified by: analysis + test]*
- [ ] **REQ-FR-R10**: Referrals appear in the record handed onward as their own set, distinct from accepted observations, retained rejections and open proposals, each with named asset, resolution state, captures, author and time. *[Verified by: test]*

### Working without signal (PRD §4.6)

- [ ] **REQ-FR-29**: Every write enters an ordered on-device queue and is flushed; when online a flush is triggered on enqueue; the interface acknowledges a write when durable on the device, never when the flush returns; no write route is reachable except through the queue. *[Verified by: test + inspection]*
- [ ] **REQ-FR-30**: Each capture, decision and clock event is committed to device storage as a completed transaction before the interface acknowledges it; an app killed mid-capture recovers the in-progress state on next load. *[Verified by: test]*
- [ ] **REQ-FR-62**: Online only when the browser reports a connection, the deliberate-offline control is off, and the most recent cacheless probe against the server succeeded within the staleness window (probe on load, on the online event, on an interval); on a network with no route to the server the app reports itself offline. *[Verified by: test]*
- [ ] **REQ-FR-31**: An artisan can work deliberately offline — a state in which the app makes no network requests, labelled as a preview control that blocks this app's own requests, with real airplane mode named as the alternative. *[Verified by: demonstration]*
- [ ] **REQ-FR-32**: A verify-purpose capture made without signal is queued as a draft with no verification and no proposals; no inference or matching code exists in the client bundle. *[Verified by: test + inspection]*
- [ ] **REQ-FR-33**: An offline decision is recorded as decided on this device, pending reconciliation; on arrival the server re-validates order assignment, asset membership, proposal state and timestamp before recording; never replayed unvalidated. *[Verified by: test]*
- [ ] **REQ-FR-34**: An item submitted twice is recorded once; the same identifier with different content from the same account is a conflict; identifiers are scoped per account; two accounts submitting the same client identifier produce no cross-account result. *[Verified by: test]*
- [ ] **REQ-FR-35**: Every conflict returns a defined code and a sentence and offers the appropriate choices; codes cover order unknown-or-unowned, order closed, asset not on order, account mismatch, proposal superseded, already recorded differently, clock skew (plus `already_open` / `not_open` from AD-9); none is resolved automatically. *[Verified by: test]*
- [ ] **REQ-FR-36**: Items queued under a different acting account conflict rather than reconcile; the artisan chooses discard or sync as the original artisan; locally cached orders are namespaced by account and foreign entries purged at the gate. *[Verified by: test]*
- [ ] **REQ-FR-37**: On session expiry mid-flush every item remains queued and the artisan is routed to re-enter as the same persona; no item discarded. *[Verified by: test]*
- [ ] **REQ-FR-38**: Reconciliation flushes on the online event, return to visibility, launch, and an explicit action; Background Sync is not depended upon; no sync-latency target is stated anywhere. *[Verified by: test]*
- [ ] **REQ-FR-39**: A batch is flushed when it approaches the byte ceiling or the item ceiling, whichever first (values in `lib/limits`; the outbound budget below the platform limit is decided in P6 first). *[Verified by: test]*
- [ ] **REQ-NFR-F4**: Storage exhaustion is an expected path — every device write handles quota exhaustion with a defined degradation order, and the artisan is told what was dropped. *[Verified by: test]*
- [ ] **REQ-NFR-F5**: The design assumes the entire origin's storage can disappear at once; the server is the system of record; wholesale loss routes to the gate. *[Verified by: test]*

### Installability and the offline shell (PRD §4.7)

- [ ] **REQ-FR-40**: Install to the home screen and launch standalone. *[Verified by: demonstration on a real iOS device and a real Android device]*
- [ ] **REQ-FR-41**: After one online visit the app launches without network to the orders screen with an offline indicator and no failed sub-resources; the shell is precached coherently (page, scripts, styles). *[Verified by: test]*
- [ ] **REQ-FR-42**: No API response is served from cache under any condition; a build check asserts the guard is present in the worker. *[Verified by: test + inspection]*
- [ ] **REQ-FR-43**: Moving between screens offline issues no document and no server-component requests; screens switched by history state; every pair of screens asserted. *[Verified by: test]*
- [ ] **REQ-FR-44**: A reload is offered only when a previous version was already controlling the page; the app never reloads itself except on that explicit action. *[Verified by: test]*
- [ ] **REQ-FR-45**: Persistent storage requested, the grant read back, the true state reported (persistent / best-effort / unsupported) with the available estimate where the call exists; no persistence guarantee implied; the platform eviction rule stated accurately. *[Verified by: test + demonstration]*
- [ ] **REQ-FR-63**: On WebKit, not installed: state that stored data is subject to the platform storage cap and that installing removes it; the offline claim is stated against the installed case; a maximum supported offline window is stated (value in `lib/limits`). *[Verified by: test]*
- [ ] **REQ-FR-64**: On a wide viewport the preview renders inline as a phone-sized surface beside a machine-readable link (QR) to the same URL; one document, one viewport. *[Verified by: demonstration]*
- [ ] **REQ-FR-46**: A supported floor names the platform versions tested against and claims nothing outside them (values in `lib/limits`; stated, not enforced). *[Verified by: inspection]*

### The honesty surface (PRD §4.8; built first)

- [x] **REQ-FR-47**: Each governed sentence is defined exactly once and imported wherever rendered; no duplicate literal anywhere in the build. *[Verified by: inspection]*
- [ ] **REQ-FR-48**: Every screen carries the `preview` sentence in document flow with no dismissal control. *[Verified by: test]*
- [ ] **REQ-FR-48a**: On first entry the gate states which claims are enforced server-side and which are authored, before any is met; on re-entry it shows `preview` plus a control that reopens the long form in full. *[Verified by: test]*
- [ ] **REQ-FR-49**: The seven sentences other than `preview` each appear at the point where their claim is made; a table mapping each sentence to its rendering location is maintained in the handover (evidence artefact — table vs automated placement check — decided in P8). *[Verified by: demonstration]*
- [x] **REQ-FR-50**: A build-time audit sweeps application surfaces against the claims register and fails the build on a violation; the register is inherited verbatim from the companion demo plus the seed's additions, copied into the audit script with version and inheritance date, owned by the SHEQ manager; banned claims enumerated by exact string (retired residency, inference sovereignty and funding claims, competitor names, any TRL claim for Capture as a product, modelled savings as cash, machine-driven reliability claims, uncited performance/cost/time/accuracy/adoption figures, staffing-reduction framing, present-tense claims for nonexistent capabilities). Stated limitation: a string sweep. *[Verified by: test]*
- [ ] **REQ-FR-51**: One screen presents all eight governed sentences with the live instance identifier and storage state, plus for each product claim its disposition (enforced / authored / not exercised) and for each enforced claim the check a reviewer can run. *[Verified by: demonstration]*
- [x] **REQ-FR-65**: One command runs every build-time check — at minimum the claims audit, single-writer rule, actor-field rule, fixture-inputs rule, worker-guard check, duplicate-literal check, accepted-field enumerations; AD-15 enumerates the full gate; each check is a deliverable. *[Verified by: test]*
- [ ] **REQ-FR-66**: A handover document ships with the build: the claims register as inherited and its owner; the sentence-to-location mapping; the enforced/authored/not-exercised table; the stated limitations of FR-3, FR-45, FR-50, FR-58, FR-63; a note telling a reviewer how to try to break it. *[Verified by: inspection]*

### The record handed onward (PRD §4.9)

- [ ] **REQ-FR-52**: The payload for one order is retrievable for an order the requester is entitled to; an order that is not theirs returns the same not-found as one that does not exist. *[Verified by: test]*
- [ ] **REQ-FR-53**: The payload carries accepted, rejected, open and referred sets distinctly (five with retained attempts); a referral is never presented as an accepted observation. *[Verified by: test]*
- [ ] **REQ-FR-54**: How a decision arrived is derived by the server from what it observed; the client's claim may be shown as a claim, never as fact. *[Verified by: test]*
- [ ] **REQ-FR-55**: The payload states that no redaction ran and that audio never left the device, as explicit fields. *[Verified by: test]*
- [ ] **REQ-FR-56**: Payload and health route state the store is memory-only, name the serving instance, and state the retention window. *[Verified by: test]*

### Cross-cutting non-functional requirements (PRD §4.10)

- [ ] **REQ-NFR-1**: Record-binding controls (shutter, record start/stop, accept, reject, submit) present at least 20 mm physical on each approved device, measured on device; design figure 130 CSS px. *[Verified by: on-device measurement + CI target-size check]*
- [ ] **REQ-NFR-2**: All other targets meet WCAG 2.2 SC 2.5.5 at 44 × 44 CSS px. *[Verified by: CI target-size check]*
- [ ] **REQ-NFR-3**: No path-based, multipoint or dragging gesture in the capture flow; accept and reject single-tap, never swipe-only. *[Verified by: inspection + test]*
- [ ] **REQ-NFR-4**: Every consequential control confirms within the 100 ms window NFR-4 sets through a visible state change and is idempotent; the change is legible around a gloved thumb resting on the control. *[Verified by: CI assertion at 360 px]*
- [ ] **REQ-NFR-4a**: Second channels are additive, never assumed: haptics where present; on iOS the visible change carries NFR-4 alone. *[Verified by: inspection]*
- [x] **REQ-NFR-5**: Body and label text 7:1 (SC 1.4.6), checked automatically in CI. *[Verified by: CI contrast check]*
- [ ] **REQ-NFR-6**: Control boundaries, focus indicators and proposal state 3:1 (SC 1.4.11); state never by colour alone. *[Verified by: CI contrast check + inspection]*
- [ ] **REQ-NFR-7**: Fully operable at 320 CSS px with no two-dimensional scrolling and at 200 % text, including at NFR-1 sizes; 130 px is the design figure; at most two record-binding targets per row; no screen carries more than one primary record-binding action. *[Verified by: CI reflow assertions]*
- [ ] **REQ-NFR-8**: Primary controls within one-handed thumb reach on each approved device; accept sits outside the incidental-brush region behind a deliberate in-place confirm. *[Verified by: on-device check + inspection]*
- [ ] **REQ-NFR-9**: WCAG 2.2 Level AA in full, plus SC 2.5.5 and SC 1.4.6; CI fails on any A or AA violation and on any breach of NFR-1 or NFR-2. *[Verified by: CI WCAG check]*
- [ ] **REQ-NFR-10**: Gloved usability established by test: at least five artisans across the three trades complete a full capture in their own working gloves on the approved devices; failures recorded; result written down whether it passed or not. Scheduling dependency, lands in P7. *[Verified by: test]*
- [ ] **REQ-NFR-11**: Glove mode is a device requirement; any approved-device list is constrained to devices whose manufacturer documents a glove mode. *[Verified by: inspection]*
- [ ] **REQ-NFR-12**: No governing standard exists for handheld field HMI, and the handover says so; requirements are assembled from accessibility standards, vendor guidance and one empirical study, each labelled. *[Verified by: inspection]*

### Success metrics (PRD §7; procedural)

- [ ] **REQ-SM-1**: Every enforced claim survives a published hostile attempt: the negative test sets of FR-4, FR-6, FR-23, FR-24, FR-27, FR-34 packaged as one script running against the deployed public URL from an ordinary shell with a standard HTTP client, printing pass/fail per attempt; script and output ship with the preview. *[Verified by: test]*
- [ ] **REQ-SM-2**: Every authored claim is labelled before it is questioned (validates FR-17, 20, 47, 48, 49). *[Verified by: demonstration]*
- [ ] **REQ-SM-3**: It opens with no signal, on a real phone, after one visit — real iOS and real Android, airplane mode, zero failed sub-resources. *[Verified by: demonstration]*
- [ ] **REQ-SM-4**: Nothing is typed that the system knows: across a walkthrough the only inputs are persona choice, shutter, record, accept, reject, an optional note, and the referral's tag. *[Verified by: demonstration]*
- [x] **REQ-SM-5**: No claim in the build trips the audit, on every commit. *[Verified by: test]*
- [ ] **REQ-SM-C1**: Counter-metric — labelling is not reduced as the preview gets more convincing; polished-and-unlabelled is a failure. *[Verified by: inspection]*
- [ ] **REQ-SM-C2**: Counter-metric — the offline path is not smoother than the online one; a queued decision always reads as pending rather than done. *[Verified by: demonstration]*
- [ ] **REQ-SM-C3**: Counter-metric — accept and reject stay equally weighted; a walkthrough in which nothing was rejected is a warning. *[Verified by: demonstration]*

## v2 Requirements

Deferred out of the preview, not the product (PRD §6.2). Tracked, not in the current roadmap.

- **DEF-01**: Transcription of the spoken note (audio retained on device only in v1)
- **DEF-02**: Reading back an asset's history (the product's payoff; brief success criterion 4)
- **DEF-03**: A supervisor-side view
- **DEF-04**: A coached checklist on the phone

## Out of Scope

| Feature | Reason |
|---------|--------|
| Any model (vision, transcription, inference, OCR of the plate) | Non-goal; verification and observations are authored from fixtures; named-package ban asserts it |
| Redaction pass | Stated above the shutter; in the product redaction is not optional |
| Database or shared cross-instance state | Memory-only store per instance that describes itself (AD-10) |
| Supervisor role, review queue, countersignature | All three personas are artisans; RBAC tier display-only |
| Hours dispute or correction path | Preview limitation stated on the Limits screen |
| Claim of novelty; cost, saving or ROI figure; product-level readiness number | Only the enforcement posture is claimable, per element |
| Speaker identification, voice-print enrolment, diarisation | POPIA names voice recognition among biometrics — not a deferral |
| Live plant data; production identity (SSO, directory, revocation); native wrapper; CMMS function | Preview scope |
| Any claim that a standard requires the gate | SPEC constraint 13 |
| REQ-ADD-NFR-DEV-02 luminance benchmark | Not adopted by prd.md; input to the P7 approved-device list |
| REQ-ADD-NFR-DEV-03 ambient-contrast ranking | Not adopted by prd.md; input to the P7 approved-device list |
| REQ-ADD-NFR-HMI-01 conditional ISA-101 alignment | Dropped by prd.md NFR-12: no governing standard is asserted |
| REQ-ADD-NFR-MEDIA-2 STT ingestion accepts AAC-in-MP4 | Not applicable: transcription is out of scope |
| REQ-ADD-NFR-SECURITY-2 iframe `allow="camera; microphone"` | Not applicable: the desktop frame renders inline; handover note candidate |
| REQ-ADD-NFR-PLATFORM-1 explicit shift-start permission re-request | Partially covered by FR-13 and the permission-refused state; not a prd.md requirement |
| REQ-ADD-NFR-OBSERVABILITY-1 per-session telemetry | Not adopted; AD-11 defines observability as response headers; FR-45/FR-51 surface storage state live |
| REQ-ADD-HUMAN-READABLE-MANIFESTATION PDF/print renderings | Product-level; preview renderings covered by decision state and payload |
| REQ-ADD-TAMPER-DETECTION signature-level integrity | Product-level; preview form is AD-9 content hashing plus FR-33 re-validation |
| REQ-ADD-AUDIT-AVAILABILITY export beyond the payload | Product-level; preview retention window stated per FR-56 |
| REQ-ADD-PREVENT-OR-DETECT explicit column | Handover candidate; PRD §6.3 states the check per invariant |
| Whether automatic hours accrual is consented worker monitoring | Product-level; must be answered before the record is used for pay, discipline or performance |

Addendum candidates adopted into prd.md (UI-01–08 as NFR-1–8, DEV-01 as NFR-11, TEST-01/02 as NFR-10/9, HMI-02 as NFR-12, STORAGE-1–6, SYNC-1/2, DURABILITY-1/2, MEDIA-1/3, SECURITY-1, PLATFORM-2, and the §3.1 audit-trail patterns) are covered by their v1 counterparts above and are not listed separately.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-FR-47 | Phase 1 | Complete |
| REQ-FR-48 | Phase 1 | Pending |
| REQ-FR-50 | Phase 1 | Complete |
| REQ-FR-65 | Phase 1 | Complete |
| REQ-NFR-5 | Phase 1 | Complete |
| REQ-NFR-9 | Phase 1 | Pending |
| REQ-SM-5 | Phase 1 | Complete |
| REQ-FR-21a | Phase 2 | Pending |
| REQ-FR-1 | Phase 3 | Pending |
| REQ-FR-2 | Phase 3 | Pending |
| REQ-FR-3 | Phase 3 | Pending |
| REQ-FR-4 | Phase 3 | Pending |
| REQ-FR-5 | Phase 3 | Pending |
| REQ-FR-6 | Phase 3 | Pending |
| REQ-FR-7 | Phase 3 | Pending |
| REQ-FR-8 | Phase 3 | Pending |
| REQ-FR-9 | Phase 3 | Pending |
| REQ-FR-10 | Phase 3 | Pending |
| REQ-FR-11 | Phase 3 | Pending |
| REQ-FR-15 | Phase 3 | Pending |
| REQ-FR-16 | Phase 3 | Pending |
| REQ-FR-17 | Phase 3 | Pending |
| REQ-FR-18 | Phase 3 | Pending |
| REQ-FR-19 | Phase 3 | Pending |
| REQ-FR-21 | Phase 3 | Pending |
| REQ-FR-23 | Phase 3 | Pending |
| REQ-FR-24 | Phase 3 | Pending |
| REQ-FR-27 | Phase 3 | Pending |
| REQ-FR-57 | Phase 3 | Pending |
| REQ-FR-61 | Phase 3 | Pending |
| REQ-NFR-F1 | Phase 3 | Pending |
| REQ-FR-48a | Phase 4 | Pending |
| REQ-FR-58 | Phase 4 | Pending |
| REQ-NFR-2 | Phase 4 | Pending |
| REQ-NFR-4 | Phase 4 | Pending |
| REQ-NFR-4a | Phase 4 | Pending |
| REQ-NFR-6 | Phase 4 | Pending |
| REQ-FR-12 | Phase 5 | Pending |
| REQ-FR-13 | Phase 5 | Pending |
| REQ-FR-14 | Phase 5 | Pending |
| REQ-FR-20 | Phase 5 | Pending |
| REQ-FR-22 | Phase 5 | Pending |
| REQ-FR-25 | Phase 5 | Pending |
| REQ-FR-26 | Phase 5 | Pending |
| REQ-FR-28 | Phase 5 | Pending |
| REQ-FR-59 | Phase 5 | Pending |
| REQ-FR-60 | Phase 5 | Pending |
| REQ-NFR-1 | Phase 5 | Pending |
| REQ-NFR-3 | Phase 5 | Pending |
| REQ-NFR-7 | Phase 5 | Pending |
| REQ-NFR-8 | Phase 5 | Pending |
| REQ-NFR-F2 | Phase 5 | Pending |
| REQ-NFR-F3 | Phase 5 | Pending |
| REQ-SM-C3 | Phase 5 | Pending |
| REQ-FR-29 | Phase 6 | Pending |
| REQ-FR-30 | Phase 6 | Pending |
| REQ-FR-31 | Phase 6 | Pending |
| REQ-FR-32 | Phase 6 | Pending |
| REQ-FR-33 | Phase 6 | Pending |
| REQ-FR-34 | Phase 6 | Pending |
| REQ-FR-35 | Phase 6 | Pending |
| REQ-FR-36 | Phase 6 | Pending |
| REQ-FR-37 | Phase 6 | Pending |
| REQ-FR-38 | Phase 6 | Pending |
| REQ-FR-39 | Phase 6 | Pending |
| REQ-FR-62 | Phase 6 | Pending |
| REQ-NFR-F4 | Phase 6 | Pending |
| REQ-NFR-F5 | Phase 6 | Pending |
| REQ-SM-C2 | Phase 6 | Pending |
| REQ-FR-40 | Phase 7 | Pending |
| REQ-FR-41 | Phase 7 | Pending |
| REQ-FR-42 | Phase 7 | Pending |
| REQ-FR-43 | Phase 7 | Pending |
| REQ-FR-44 | Phase 7 | Pending |
| REQ-FR-45 | Phase 7 | Pending |
| REQ-FR-46 | Phase 7 | Pending |
| REQ-FR-63 | Phase 7 | Pending |
| REQ-FR-64 | Phase 7 | Pending |
| REQ-NFR-10 | Phase 7 | Pending |
| REQ-NFR-11 | Phase 7 | Pending |
| REQ-NFR-12 | Phase 7 | Pending |
| REQ-SM-3 | Phase 7 | Pending |
| REQ-FR-49 | Phase 8 | Pending |
| REQ-FR-51 | Phase 8 | Pending |
| REQ-FR-52 | Phase 8 | Pending |
| REQ-FR-53 | Phase 8 | Pending |
| REQ-FR-54 | Phase 8 | Pending |
| REQ-FR-55 | Phase 8 | Pending |
| REQ-FR-56 | Phase 8 | Pending |
| REQ-FR-66 | Phase 8 | Pending |
| REQ-SM-1 | Phase 8 | Pending |
| REQ-SM-2 | Phase 8 | Pending |
| REQ-SM-4 | Phase 8 | Pending |
| REQ-SM-C1 | Phase 8 | Pending |
| REQ-FR-R1 | Phase 9 | Pending |
| REQ-FR-R2 | Phase 9 | Pending |
| REQ-FR-R3 | Phase 9 | Pending |
| REQ-FR-R4 | Phase 9 | Pending |
| REQ-FR-R5 | Phase 9 | Pending |
| REQ-FR-R6 | Phase 9 | Pending |
| REQ-FR-R7 | Phase 9 | Pending |
| REQ-FR-R8 | Phase 9 | Pending |
| REQ-FR-R9 | Phase 9 | Pending |
| REQ-FR-R10 | Phase 9 | Pending |
| REQ-FR-R11 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 105 total (79 FR, 13 NFR, 5 feature NFR, 8 success metrics)
- Mapped to phases: 105
- Unmapped: 0

Split-binding notes (a requirement bound to two phases in prd.md is mapped to the phase that delivers its observable behaviour; the other phase carries the prerequisite as a success criterion): FR-7/8/9 server half P3, client half P4 · FR-11 server clamp P3, offline segment exercised P6 · FR-15/16/17/21 server P3, client P5 · FR-20 fixture half P2, delivered P5 · FR-28 P5, device durability under FR-30 P6 · FR-43 P7, mechanism laid in P4 · FR-24 P3, re-asserted every phase · NFR-1–4a/6–8 split P4 (primitives, gate, orders, clock) and P5 (record-binding controls).

---
*Requirements defined: 2026-09-04*
*Last updated: 2026-09-04 after roadmap creation (traceability populated)*
