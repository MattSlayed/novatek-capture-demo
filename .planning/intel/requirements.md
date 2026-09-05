# Requirements — synthesized from PRD-typed sources

Repo root: `C:\Users\matth\OneDrive\Documents\NOVATEK LLC\04 KNOWLEDGE-BASE\Project-Scopes\Project Scope's\Business Brain\novatek-capture-demo`
All `source:` paths are repo-relative.

Two PRD-typed documents were ingested:

- **prd.md** — `docs/planning-artifacts/prds/prd-novatek-capture-demo-2026-09-01/prd.md` · precedence 2 · status final (2026-09-01, updated 2026-09-03). 79 functional requirements (FR-1–FR-66 incl. FR-21a and FR-48a, plus FR-R1–FR-R11), 13 cross-cutting NFRs (NFR-1–NFR-12 plus NFR-4a), 5 feature-specific NFRs, 5 success metrics, 3 counter-metrics, the nine build phases and their ordering constraints, the enforced-invariant register, non-goals, open questions, assumptions.
- **addendum.md** — `docs/planning-artifacts/prds/prd-novatek-capture-demo-2026-09-01/addendum.md` · precedence 3 · status **draft**. Candidate NFRs (§1.1, §2.1) and audit-trail patterns (§3.1) in SHALL form. Its §0/§x.2 trap lists are context, not requirements, and are not extracted. Per the manifest, where the addendum and prd.md diverge, prd.md governs; the addendum's numeric values are proposals, and every bounded value is owned by AD-13's code module (see decisions.md).

Index used: `docs/planning-artifacts/epics.md` §Requirements Inventory (a verbatim-faithful one-line-per-FR inventory of prd.md; verified against the PRD text during synthesis).

ID convention: `REQ-{source id}` so downstream artefacts keep the PRD's own numbering. Phase (P1–P9) is from prd.md §6.1; epic (E1–E6) is from epics.md §Epic List.

Vocabulary: prd.md §3 glossary terms are used verbatim (artisan, account, session, gate, work order, asset, zone, capture, verification, observation, proposal, decision, decision context, finding, referral, asset register, flag, clock, queue, reconciliation, conflict, governed sentence). A synonym downstream is a discipline violation.

---

## A. Functional requirements (prd.md §4)

### §4.1 Identity and work-order access — the seam (realizes UJ-1, UJ-4)

#### REQ-FR-1 — Mint a session from a chosen persona
- source: prd.md §4.1 FR-1 · phase P3 · epic E1 · verified by: test
- An unauthenticated visitor can choose one of three artisan personas at the gate and receive a session bound to that account. Acceptance: the response sets an HttpOnly, SameSite=Lax cookie (Secure in production); an unknown persona identifier returns 404 with a stated reason; no identity value from the request body is persisted.

#### REQ-FR-2 — Read the acting account
- source: prd.md §4.1 FR-2 · P3 · E1 · test
- A client can ask the server which account it is acting as, and receives the account or 401.

#### REQ-FR-3 — End a session
- source: prd.md §4.1 FR-3 · P3 · E1 · test
- An artisan can end the session; the cookie is cleared. **Stated limitation (Limits screen + handover):** the credential is stateless, so ending a session clears the cookie only; a copied credential remains valid until it expires; no server-side revocation is claimed.

#### REQ-FR-4 — List only the acting account's work orders
- source: prd.md §4.1 FR-4 · P3 · E1 · analysis (primary) + enumerated negative test set
- An artisan sees the work orders assigned to their account and no others. **Mediation:** the order collection is read through one named accessor taking the acting account as a non-optional session-derived argument; a build rule asserts no other module reads the order store directly. **Negative test set:** for persona A's session — request the list; request each of B's and C's order ids directly; with an appended `account` query parameter naming B, and again A; with `account` in the JSON body; with an `X-Account` header naming A — assert no response contains an order not assigned to A. Unauthenticated → 401. The response carries the acting account in a response header.

#### REQ-FR-5 — Open one work order
- source: prd.md §4.1 FR-5 · P3 · E1 · test
- An artisan can open a work order assigned to them and receive the order, its assets, its clock, and any verifications, proposals and decisions already recorded. Server-only fields are stripped.

#### REQ-FR-6 — Uniform not-found for unowned and unknown orders
- source: prd.md §4.1 FR-6 · P3 · E1 · test
- A request for an order that exists but belongs to another account returns exactly the response a nonexistent order returns — identical status, body and headers, on every route including reconciliation. **Negative test set:** on read, open, close, capture, decide and sync routes, assert byte-identical responses for an unowned id and a fabricated id.

#### REQ-FR-57 — The work order is the only authorisation, checked in one place
- source: prd.md §4.1 FR-57 · P3 · E1 · analysis (primary) + inspection
- Authorisation is decided by work-order assignment alone, in a single named accessor invoked by every route. **Non-bypassability analysis:** a written description enumerates every route deriving the acting account from the session and passing it to the accessor. **Inspection:** no route consults RBAC tier; no authorisation in framework middleware. **Negative test:** the highest-tier persona reaches exactly their assigned orders and no others.

- **Feature NFR (REQ-NFR-F1):** every response carries no-store caching, the store kind, and the serving instance identifier, so a reviewer can attribute any observed behaviour to an instance. (source: prd.md §4.1 feature-specific NFR)

### §4.2 The clock (realizes UJ-1)

#### REQ-FR-7 — Start the clock
- source: prd.md §4.2 FR-7 · P3 (client half P4) · E1 · test
- Opening an assigned work order starts a server-stamped clock segment. Opening an already-open order is idempotent and creates no second segment.

#### REQ-FR-8 — Stop the clock
- source: prd.md §4.2 FR-8 · P3/P4 · E1 · test
- Closing an open order ends the current segment. Closing a closed or unopened order returns a stated conflict.

#### REQ-FR-9 — Reopen appends rather than replaces
- source: prd.md §4.2 FR-9 · P3/P4 · E1 · test
- Reopening a closed order appends a new segment; prior segments are retained.

#### REQ-FR-10 — Hours are read-only and server-derived
- source: prd.md §4.2 FR-10 · P3 · E1 · test + inspection
- Accrued hours are computed server-side from segments. The hours route accepts reads only; a write attempt returns 405. **Inspection:** every write route enumerated against its accepted fields; none accepts an artisan-supplied duration or hour value.

#### REQ-FR-11 — Device-claimed times are bounded, and their source is recorded
- source: prd.md §4.2 FR-11 · P3/P6 · E1 · test
- A segment opened without signal records the device-claimed start, clamped no earlier than the session's issue time and the device's last server contact, marked device-reconciled rather than server-stamped. Both the device-claimed time and the server-measured offset are retained; neither silently replaces the other (addendum §3.1 TIME TRUST).

#### REQ-FR-58 — An artisan can read their own accrued record in full
- source: prd.md §4.2 FR-58 · P4 · E1 · demonstration
- Every segment, whether server-stamped or device-claimed, and any measured offset, is visible; nothing of the artisan's own record is withheld. **Stated limitation (§5 + Limits screen):** no route to contest a segment; the product position is undecided.

### §4.3 Capture at the asset (realizes UJ-2)

#### REQ-FR-12 — Photograph an asset with the camera
- source: prd.md §4.3 FR-12 · P5 · E2 · test + demonstration
- Rear camera requested by preference; live video dimensions read at shutter time; the stored image is re-encoded, bounded on its long edge, and carries no EXIF.

#### REQ-FR-13 — Photograph via the file-input path
- source: prd.md §4.3 FR-13 · P5 · E2 · test + demonstration
- Where the camera stream is unavailable or permission is refused, capture through the platform file input with environment capture; the resulting flow is identical.

#### REQ-FR-14 — Record a spoken note
- source: prd.md §4.3 FR-14 · P5 · E2 · test + demonstration
- Up to a bounded duration (value owned by AD-13's module). Container and codec negotiated at runtime by capability probe, no hardcoded format; where every probe reports false the recorder is constructed without a format and the format read back (addendum NFR-MEDIA-1). Duration measured by wall clock. Where construction fails the artisan is told plainly that voice notes are unavailable in this browser; no alternative is presented as equivalent when it is not.

#### REQ-FR-15 — Only a fingerprint and a thumbnail leave the device for a photograph
- source: prd.md §4.3 FR-15 · P3 (server) / P5 (client) · E2 · test + inspection
- The request carries a hash of the full image, its size, its type, and a bounded thumbnail; the full image is not transmitted. **Inspection:** the request body contains no full-resolution image field. The thumbnail bound is enforced client-side and server-side, in encoded bytes.

#### REQ-FR-16 — No audio leaves the device
- source: prd.md §4.3 FR-16 · P3/P5 · E2 · test + inspection
- A spoken note's request carries a hash, a size, a type and a duration, and no audio. **Negative test:** capture a note, inspect the outgoing request, assert absence of any audio payload and presence of exactly the four declared fields. The governed sentence must state exactly this and no more.

#### REQ-FR-17 — The match is drawn from the record, and no model runs
- source: prd.md §4.3 FR-17 · P3/P5 · E2 · analysis (primary) + enumerated negative test set
- A verify-purpose capture returns a match drawn from the asset record, labelled authored / no model ran. **Mediation:** one named module whose declared inputs are the asset identifier and the fixture set; a build rule asserts the capture payload (image bytes, thumbnail, hash) is neither a parameter nor reachable. **Negative test set:** two verify captures of the same asset with different images → byte-identical results; one with no thumbnail → same; one with a solid-colour thumbnail → same. **Inspection:** dependency manifest contains no image-analysis, vision, OCR or inference library (build rule). A response header states the verification is authored. An authored result carries null confidence and an authored extractor; no code path can set a confidence value.

#### REQ-FR-18 — An asset must belong to the order
- source: prd.md §4.3 FR-18 · P3 · E2 · test
- A capture against an asset not on the artisan's order is refused with a stated reason. (Branch point for §4.5: a referral is a different object, not a bypass.)

#### REQ-FR-19 — Media is bounded and refusal is explained
- source: prd.md §4.3 FR-19 · P3 · E2 · test
- Oversized media is refused with a stated reason and a sentence the artisan can act on.

- **Feature NFR (REQ-NFR-F2):** on iOS only one capture may be active at a time — camera tracks stopped before the recorder starts and vice versa; tracks re-acquired on return to visibility. (source: prd.md §4.3)
- **Feature NFR (REQ-NFR-F3):** recording does not continue when the app is backgrounded; the recording is finalised on the visibility change, stated rather than silently unsupported (addendum NFR-MEDIA-3). (source: prd.md §4.3)

### §4.4 Proposals and the decision step (realizes UJ-2, UJ-4)

#### REQ-FR-20 — Proposals are returned with their provenance
- source: prd.md §4.4 FR-20 · P2 (fixtures) + P5 · E2 · test
- A verify-purpose capture returns proposals, each carrying observation text, grade, the record it was drawn from, and whether that record is evidence for or context around the statement. Every cited record resolves to a real fixture record. Grade is from the closed set {inferred, ambiguous}; **no authored observation may carry the grade meaning *the record states this***. A header states the count and that the proposals are authored.

#### REQ-FR-21a — Every authored observation passes a human provenance check before it ships
- source: prd.md §4.4 FR-21a · P2 · E2 · inspection
- No authored observation enters the fixture set until a person has read the record it cites and confirmed the wording is an inference that record supports, or that it only situates it. The fixture file carries the cited record's own sentence in a comment beside each observation; the evidence-or-context relation records which was confirmed. This is the half automation cannot do; the failure has already occurred once (three seed rows mis-cited). **Phase 2 does not close on referential integrity alone.**

#### REQ-FR-21 — Proposals are server-derived and unguessable
- source: prd.md §4.4 FR-21 · P3/P5 · E2 · test + analysis
- A proposal identifier is derived by the server from the account, the capture and the observation; a client cannot construct a valid one; identifiers are not sequential. **Negative test:** a decision against a fabricated id and against another account's id both return the same unknown-proposal response. **Analysis:** derivation documented as reproducible by any instance without shared state and unguessable without the server key.

#### REQ-FR-22 — An artisan can accept or reject a proposal, with neither favoured
- source: prd.md §4.4 FR-22 · P5 · E2 · test
- Decide one open proposal on an asset within their order, with an optional note. Parity asserted in CI against the rendered card at 360 px: equal hit area (device-independent px), equal text contrast, equal font size and weight; neither carrying focus ring, autofocus or pre-selection on load; neither reachable by an interaction the other is not. Neither is a default; no interaction accepts more than one proposal at a time. (This FR is what SM-C3 measures.)

#### REQ-FR-23 — Attribution is stamped by the server, everywhere; a submitted attribution is ignored
- source: prd.md §4.4 FR-23 · P3 · E2 · analysis (primary) + enumerated negative test set
- Every actor field on every record is the acting account derived from the session. **Mediation:** one named function is the sole producer of every actor field; a build rule asserts no other module assigns one and no route schema contains one. **Negative test set:** for each of session, clock segment, capture, verification, decision, referral — submit a body naming a different artisan; assert the stored record names the acting account and the submitted value appears nowhere in record or response.

#### REQ-FR-59 — A decision binds what the decider was shown
- source: prd.md §4.4 FR-59 · P5 · E2 · test
- Recording a decision persists the decision context (proposal text as rendered, grade, cited record, evidence-or-context relation, fixture version in force) bound before the decision is recorded; retrievable with the decision; in the record handed onward; survives later fixture changes. **Negative test:** record a decision, alter the fixture, retrieve; context unchanged.

#### REQ-FR-60 — Every act on a proposal or referral is retained, including refused ones
- source: prd.md §4.4 FR-60 · P5 · E2 · test
- Each create, decide, refuse, conflict and reject — success and failure alike — produces a server-generated, time-stamped entry naming the acting account, event type and outcome; retained for the store's stated window; surfaced in the record handed onward; never obscures an earlier entry. (Makes SM-1 evidence rather than anecdote.)

#### REQ-FR-61 — No caller supplies observation content
- source: prd.md §4.4 FR-61 · P3 · E2 · inspection
- No route accepts client-supplied observation text, grade or provenance that becomes a proposal. **Inspection:** every write route enumerated against accepted fields. Does not constrain §4.5: a referral is the artisan's own statement, kept distinct per FR-R6.

#### REQ-FR-24 — No path creates a finding
- source: prd.md §4.4 FR-24 · P3 (every phase) · E2 · analysis (primary) + enumerated negative test set (supporting)
- Every write to the record store passes through a single reconciliation module that has no operation creating a finding. **Mediation:** one named module is the sole writer; build rule that nothing else writes. **Non-bypassability analysis:** enumerate every interface (routes, reconciliation, fixtures, administrative paths) **and every configuration value** (env vars, feature flags, build modes, fixture selection), showing none enables a finding. **Negative test set:** for every write route (session mint, order open, order close, capture, verify, decision, sync, referral, fixture seeding) assert the resulting state is from {open, accepted, rejected, superseded} and no request shape produces an asserted state. *The differentiating claim is not that a gate exists but that it cannot be turned off.*

#### REQ-FR-25 — Rejections are retained
- source: prd.md §4.4 FR-25 · P5 · E2 · test
- A rejected proposal is retained with its decision, decider and time, surfaced in the record handed onward; no operation deletes a rejection.

#### REQ-FR-26 — Recording does not obscure what preceded it
- source: prd.md §4.4 FR-26 · P5 · E2 · test
- A superseded proposal remains retrievable with its prior state, the replacing state and the time of change, and appears in the record handed onward. **Test:** decide, submit a newer verify capture that supersedes, retrieve the order; both states present.

#### REQ-FR-27 — Ownership is checked before state
- source: prd.md §4.4 FR-27 · P3 · E2 · test
- For a decision on a proposal that is unknown or not the artisan's, the response is identical and produced before any state comparison. **Negative test:** no conflict response can distinguish a proposal in another account from one that does not exist.

#### REQ-FR-28 — A decision is a single durable unit
- source: prd.md §4.4 FR-28 · P5/P6 · E2 · test
- An accept or reject is committed as one unit at the moment of the artisan's act, attribution bound then, committed separately from media upload (addendum §3.1 OFFLINE COMMIT POINT).

### §4.5 Referrals — observations outside the order (realizes UJ-5; cross-cutting: re-enters §4.1, §4.3, §4.6, §4.9)

#### REQ-FR-R1 — Report something outside the order
- source: prd.md §4.5 FR-R1 · P9 · E4 · demonstration
- From a deliberate action alongside the assets, without leaving the order; distinct from asset selection; not reached via the FR-18 refusal, which remains unchanged.

#### REQ-FR-R2 — Photograph the plate, then name the asset
- source: prd.md §4.5 FR-R2 · P9 · E4 · test
- The plate photograph is captured and durable **before** the typed tag is entered. The typed name is recorded as the artisan's claim, distinct from the server's resolution. No OCR runs. Where no plate is present or legible, the referral proceeds with the tag unentered and is treated as unresolved under FR-R4.

#### REQ-FR-R3 — The server resolves the name against the register
- source: prd.md §4.5 FR-R3 · P9 · E4 · test
- Resolution is server-side only; the client neither holds nor consults the register (in production the register is the client's system of record). **Deliberate, bounded exception to the uniform-response rule:** the response reveals existence only — nothing about zone, orders, assignment or history. **Negative test:** a referral naming an asset on another artisan's order returns a response identical to one naming an unassigned asset.

#### REQ-FR-R4 — An unresolved name does not discard the observation
- source: prd.md §4.5 FR-R4 · P9 · E4 · test
- Where the named asset does not resolve, the referral is retained, attributed, marked as concerning an unidentified asset. **Negative test:** observation, captures, author and time all retained and retrievable. No path deletes a referral for failing to resolve.

#### REQ-FR-R5 — A referral carries captures under the same rules
- source: prd.md §4.5 FR-R5 · P9 · E4 · test
- FR-12 through FR-16 and FR-19 apply unchanged: full photograph and recording stay on device; no redaction runs.

#### REQ-FR-R6 — A referral carries no proposals and has no decision step
- source: prd.md §4.5 FR-R6 · P9 · E4 · inspection + test
- **Inspection:** the referral path invokes no proposal generation. **Negative test:** raise a referral; assert no proposal, verification or decision record is created.

#### REQ-FR-R7 — A referral proposes work; it does not raise it
- source: prd.md §4.5 FR-R7 (decided 2026-09-02) · P9 · E4 · inspection + test
- Handed onward as a proposal that work be attached to an existing order or newly raised; this system creates no work order and modifies none. **Inspection:** no route creates or amends a work order. **Negative test:** raise a referral; assert the work-order set is unchanged.

#### REQ-FR-R8 — A referral is attributed and never anonymous
- source: prd.md §4.5 FR-R8 · P9 · E4 · test
- Acting account stamped by the server from the session; a submitted attribution is ignored, as in FR-23.

#### REQ-FR-R9 — A referral may be raised without signal; the system's half waits
- source: prd.md §4.5 FR-R9 · P9 (re-enters P6) · E4 · test
- Offline, an artisan can raise a referral, name the asset, capture and record. The interface states the named asset has not yet been confirmed to exist and nothing has been raised. The plate photograph is queued like any other capture. Device-claimed time clamped and its source recorded (FR-11). On reconnect the server resolves the name and produces the work proposal. Consistent with FR-32: what is withheld offline is the system's agreement, never the artisan's account.

#### REQ-FR-R11 — The flag is created through the same mediated write path
- source: prd.md §4.5 FR-R11 · P9 (re-enters P3, P8) · E4 · analysis + test
- Where a named asset resolves, a flag is attached recording that an artisan reported something, written through FR-24's single mediating module and enumerated in its non-bypassability analysis. **Negative test:** no operation promotes a flag into an asserted statement about the asset's condition. The flag carries the referral, its author and its time, and appears in the record handed onward.

#### REQ-FR-R10 — Referrals appear in the record handed onward as their own set
- source: prd.md §4.5 FR-R10 · P9 (re-enters P8) · E4 · test
- Handed onward distinctly from accepted observations, retained rejections and open proposals, each with named asset, resolution state, captures, author and time. Extends FR-53.

### §4.6 Working without signal (realizes UJ-3)

#### REQ-FR-29 — Every write is queued
- source: prd.md §4.6 FR-29 · P6 · E3 · test + inspection
- Writes enter an ordered on-device queue and are flushed; when online per FR-62 a flush is triggered on enqueue, in addition to FR-38's triggers. The interface acknowledges a write when durable on the device (FR-30), never when the flush returns. **Inspection:** no write route is reachable except through the queue.

#### REQ-FR-30 — A write is durable before it is acknowledged
- source: prd.md §4.6 FR-30 · P6 · E3 · test
- Each capture, decision and clock event is committed to device storage as a completed transaction before the interface acknowledges it. An app killed mid-capture recovers the in-progress state on next load (addendum NFR-DURABILITY-1/2).

#### REQ-FR-62 — Connectivity is verified, not assumed
- source: prd.md §4.6 FR-62 · P6 · E3 · test
- Online only when the browser reports a connection, the deliberate-offline control is off, **and** the most recent cacheless probe against the server succeeded within the staleness window (probe on load, on the online event, on an interval; window and interval values in AD-13's module). **Test:** attach to a network with no route to the server; the app reports itself offline.

#### REQ-FR-31 — An artisan can work deliberately offline
- source: prd.md §4.6 FR-31 · P6 · E3 · demonstration
- A state in which the app makes no network requests, labelled as a preview control that blocks this app's own requests, with real airplane mode named as the alternative.

#### REQ-FR-32 — Nothing is verified or observed on the device
- source: prd.md §4.6 FR-32 · P6 · E3 · test + inspection
- A verify-purpose capture made without signal is queued as a draft with no verification and no proposals. **Inspection:** no inference or matching code exists in the client bundle.

#### REQ-FR-33 — An offline decision is a claim, re-validated on arrival
- source: prd.md §4.6 FR-33 · P6 · E3 · test
- Recorded as decided on this device, pending reconciliation; on arrival the server re-validates order assignment, asset membership, proposal state and timestamp before recording; never replayed unvalidated.

#### REQ-FR-34 — Reconciliation is idempotent per account
- source: prd.md §4.6 FR-34 · P6 · E3 · test
- An item submitted twice is recorded once; same identifier with different content from the same account is a conflict; identifiers scoped per account. **Negative test:** two accounts submit the same client identifier; no cross-account result.

#### REQ-FR-35 — Every conflict is stated and none is resolved automatically
- source: prd.md §4.6 FR-35 · P6 · E3 · test
- Each conflict returns a defined code and a sentence; the artisan is offered the appropriate choices. Codes cover: order unknown-or-unowned, order closed, asset not on order, account mismatch, proposal superseded, already recorded differently, clock skew. (Sentences and actions: constraints.md, EXPERIENCE conflict table. AD-9 adds `already_open`/`not_open` in P4.)

#### REQ-FR-36 — A queue surviving a persona change is not silently applied
- source: prd.md §4.6 FR-36 · P6 · E3 · test
- Items queued under a different acting account conflict rather than reconcile; the artisan chooses discard or sync as the original artisan. Locally cached orders are namespaced by account and foreign entries purged at the gate.

#### REQ-FR-37 — An expired session loses nothing
- source: prd.md §4.6 FR-37 · P6 · E3 · test
- On session expiry mid-flush every item remains queued and the artisan is routed to re-enter as the same persona; no item discarded.

#### REQ-FR-38 — Reconciliation is foreground-driven
- source: prd.md §4.6 FR-38 · P6 · E3 · test
- Flush on the online event, return to visibility, launch, and an explicit action. Background Sync is not depended upon (Chromium-only); **no sync-latency target is stated anywhere**.

#### REQ-FR-39 — Batches are bounded by encoded bytes as well as count
- source: prd.md §4.6 FR-39 · P6 · E3 · test
- A batch is flushed when it approaches the byte ceiling or the item ceiling, whichever first (values in AD-13's module; the outbound budget below the platform 4.5 MB limit is an open P6 decision — see decisions.md open question 2).

- **Feature NFR (REQ-NFR-F4):** storage exhaustion is an expected path: every device write handles quota exhaustion with a defined degradation order, and the artisan is told what was dropped (addendum NFR-STORAGE-4). (source: prd.md §4.6)
- **Feature NFR (REQ-NFR-F5):** the design assumes the entire origin's storage can disappear at once, because eviction is all-or-nothing; the server is the system of record (addendum NFR-STORAGE-5). (source: prd.md §4.6)

### §4.7 Installability and the offline shell (realizes UJ-3, UJ-4)

#### REQ-FR-40 — Install to the home screen
- source: prd.md §4.7 FR-40 · P7 · E5 · demonstration on a real iOS device and a real Android device
- Install and launch standalone.

#### REQ-FR-41 — Open with no signal after one online visit
- source: prd.md §4.7 FR-41 · P7 · E5 · test
- Launches without network to the orders screen with an offline indicator and no failed sub-resources; the shell is precached coherently (page, scripts, styles). **Negative test:** load online, go offline, reload; zero failed sub-resource requests.

#### REQ-FR-42 — Application routes are never served from cache
- source: prd.md §4.7 FR-42 · P7 · E5 · test + inspection
- No API response served from cache under any condition. **Inspection:** a build check asserts the guard is present in the worker.

#### REQ-FR-43 — Screen changes make no requests
- source: prd.md §4.7 FR-43 · P4/P7 · E5 · test
- Moving between screens offline issues no document and no server-component requests; screens switched by history state. **Negative test:** offline, switch between every pair of screens; zero requests.

#### REQ-FR-44 — A new version is offered, never imposed
- source: prd.md §4.7 FR-44 · P7 · E5 · test
- Reload offered only when a previous version was already controlling the page; the app never reloads itself except on that explicit action.

#### REQ-FR-45 — Storage protection is requested, verified and reported honestly
- source: prd.md §4.7 FR-45 · P7 · E5 · test + demonstration
- Request persistent storage, read back the grant, report the true state (persistent / best-effort / unsupported) with the available estimate; no persistence guarantee implied; the platform eviction rule stated accurately (installed apps exempt from the seven-day cap, which counts days of browser *use*).

#### REQ-FR-63 — Installation is a precondition of the offline claim on WebKit
- source: prd.md §4.7 FR-63 · P7 · E5 · test
- On WebKit, not installed: state that stored data is subject to the platform storage cap and that installing removes it. The FR-41 offline claim is stated against the installed case. A maximum supported offline window is stated (value in AD-13's module) rather than indefinite retention implied.

#### REQ-FR-64 — The desktop frame carries a reviewer to a handset
- source: prd.md §4.7 FR-64 · P7 (epics group it in E6) · demonstration
- On a wide viewport the preview renders inline as a phone-sized surface beside a machine-readable link (QR) to the same URL; one document, one viewport. UJ-4, SM-1 and SM-2 depend on it.

#### REQ-FR-46 — A supported floor is stated
- source: prd.md §4.7 FR-46 · P7 · E5 · inspection
- Names the platform versions tested against; claims nothing outside them (values in AD-13's module; stated, not enforced — assumption).

### §4.8 The honesty surface (realizes UJ-4; **built first**)

The register (eight governed sentences, by key): `preview`, `authoredVerification`, `authoredProposals`, `noRedaction`, `memoryStore`, `noOfflineInference`, `pendingReconciliation`, `mediaOnDevice`. Exact text: context.md §Seed → honesty labels (verbatim) and constraints.md.

#### REQ-FR-47 — One definition, many renderings
- source: prd.md §4.8 FR-47 · P1 · E1 · inspection
- Each governed sentence defined exactly once and imported wherever rendered; no duplicate literal anywhere in the build.

#### REQ-FR-48 — The status ribbon is always present and cannot be dismissed
- source: prd.md §4.8 FR-48 · P1 · E1 · test
- Every screen carries the `preview` sentence, in document flow, with no dismissal control.

#### REQ-FR-48a — The gate carries the long-form disclosure on first entry
- source: prd.md §4.8 FR-48a · P4 · E1 · test
- On first entry the gate states which claims are enforced server-side and which are authored, before the person meets any of them; on re-entry it shows `preview` plus a control that reopens the long form in full. The only moment the distinction is stated *before* a claim is met.

#### REQ-FR-49 — Each claim is labelled where it is made
- source: prd.md §4.8 FR-49 · P8 · E6 · demonstration
- The seven sentences other than `preview` each appear at the point where their claim is made; a table mapping each sentence to its rendering location is maintained in the handover. (Evidence artefact — table vs automated placement check — see INGEST-CONFLICTS INFO.)

#### REQ-FR-50 — The claims audit blocks the build
- source: prd.md §4.8 FR-50 · P1 · E1 · test
- A build-time audit sweeps application surfaces against the claims register and fails the build on a violation. The register is inherited verbatim from the companion demo's handover §3 plus the seed's additions; copied into the audit script with version and inheritance date; **owned by the SHEQ manager**. Banned claims enumerated by exact string: retired residency claims, inference sovereignty, retired funding claims, competitor names, any TRL claim for Capture as a product, modelled savings as cash, machine-driven reliability claims; plus uncited performance/cost/time/accuracy/adoption figures, headcount-reduction framing, present-tense claims for nonexistent capabilities. **Stated limitation:** a string sweep.

#### REQ-FR-51 — One screen carries the whole disposition, claim by claim
- source: prd.md §4.8 FR-51 · P8 · E6 · demonstration
- A screen presenting all eight governed sentences with the live instance identifier and storage state, plus for each product claim its disposition (**enforced / authored / not exercised**) and for each enforced claim the check a reviewer can run. The eight sentences do not name enforced claims; the table does.

#### REQ-FR-65 — One command runs every build-time check
- source: prd.md §4.8 FR-65 · P1 · E1 · test
- At minimum: claims audit (FR-50), single-writer rule (FR-24), actor-field rule (FR-23), fixture-inputs rule (FR-17), worker-guard check (FR-42), duplicate-literal check (FR-47), accepted-field enumerations (FR-10, FR-61). Each check is a deliverable in its own right. (AD-15 enumerates the full gate.)

#### REQ-FR-66 — A handover document ships with the build
- source: prd.md §4.8 FR-66 · P8 · E6 · inspection
- At minimum: the claims register as inherited and its owner (SHEQ manager); the mapping of each governed sentence to where it renders; the enforced/authored/not-exercised table; the stated limitations of FR-3, FR-45, FR-50, FR-58, FR-63; a note telling a reviewer how to try to break it.

### §4.9 The record handed onward (realizes UJ-4)

#### REQ-FR-52 — Produce the payload for one order
- source: prd.md §4.9 FR-52 · P8 · E6 · test
- Retrievable for an order the requester is entitled to; an order that is not theirs returns the same not-found as one that does not exist.

#### REQ-FR-53 — The payload carries accepted, rejected, open and referred, distinctly
- source: prd.md §4.9 FR-53 · P8 · E6 · test
- Four distinct sets (five with retained attempts per FR-60/EXPERIENCE); a referral is never presented as an accepted observation.

#### REQ-FR-54 — Arrival is server-derived, not client-claimed
- source: prd.md §4.9 FR-54 · P8 · E6 · test
- How a decision arrived is derived by the server from what it observed; the client's claim may be shown as a claim, never as fact.

#### REQ-FR-55 — The payload states that no redaction ran, and that audio never left the device
- source: prd.md §4.9 FR-55 · P8 · E6 · test
- Both are explicit fields, not omissions.

#### REQ-FR-56 — The store describes itself
- source: prd.md §4.9 FR-56 · P8 · E6 · test
- Payload and health route state the store is memory-only, name the serving instance, and state the retention window.

---

## B. Cross-cutting non-functional requirements (prd.md §4.10)

Phase binding (prd.md §6.1): NFR-5 and NFR-9 → P1 (CI gates); NFR-1, 2, 3, 4, 4a, 6, 7, 8 → P4 and P5 (NFR-7 is a layout input to P5); NFR-10, 11, 12 → P7 (NFR-10 carries a scheduling dependency).

- **REQ-NFR-1 · Target size, record-binding controls.** Shutter, record start/stop, accept, reject, submit present ≥ 20 mm physical on each approved device, measured on device. Design figure **130 CSS px**. Source: Colle & Hiszem (2004), stated as a bare-handed floor. (prd.md §4.10; addendum NFR-UI-01)
- **REQ-NFR-2 · Target size, everything else.** All other targets meet WCAG 2.2 SC 2.5.5 at 44 × 44 CSS px (AAA; deliberately above the SC 2.5.8 AA floor of 24 × 24). (addendum NFR-UI-02)
- **REQ-NFR-3 · No gesture-only action.** No path-based, multipoint or dragging gesture in the capture flow; accept and reject single-tap, never swipe-only (SC 2.5.1; swipe-to-accept would also breach FR-22 parity). (addendum NFR-UI-03)
- **REQ-NFR-4 · Confirmation under gloves.** Every consequential control confirms within 100 ms through a visible state change and is idempotent; the change must be legible through a gloved thumb resting on the control — a change confined under the finger does not satisfy it. (addendum NFR-UI-04, refined)
- **REQ-NFR-4a · Second channels are additive, never assumed.** Haptics used in addition where present; the Vibration API is absent on iOS Safari and an audible cue is useless on a plant floor; on iOS the visible change carries NFR-4 alone.
- **REQ-NFR-5 · Text contrast.** Body and label text 7:1 (SC 1.4.6), for direct-sunlight washout; checked automatically in CI. (addendum NFR-UI-05)
- **REQ-NFR-6 · Non-text contrast and redundant state encoding.** Control boundaries, focus indicators and proposal state 3:1 (SC 1.4.11); state never by colour alone. (addendum NFR-UI-06)
- **REQ-NFR-7 · Reflow.** Fully operable at 320 CSS px with no two-dimensional scrolling (SC 1.4.10) and at 200 % text (SC 1.4.4), *including at NFR-1 sizes*. Device-measured: 20 mm is 101–131 CSS px across candidate handsets (130 iPhone 13 mini, 129 Pixel 8, 128 iPhone SE 3, 121 iPhone 15, 112 Galaxy S23, 106 Galaxy A54, 101 XCover 6 Pro); **130 CSS px is the design figure** (124 falls short on the three densest). A 360 px viewport with 16 px gutters leaves a 328 px content box fitting exactly **two** such targets per row (130 + 12 + 130 = 272); **no screen carries more than one primary record-binding action.** (supersedes addendum NFR-UI-07's four-actions cap)
- **REQ-NFR-8 · Reach and accidental activation.** Primary controls within one-handed thumb reach on each approved device; **accept** sits outside the incidental-brush region behind a deliberate confirm (the physical implementation of FR-22 and SM-C3). (addendum NFR-UI-08)
- **REQ-NFR-9 · Conformance target.** WCAG 2.2 Level AA in full, plus SC 2.5.5 and SC 1.4.6. CI fails on any A or AA violation and on any breach of NFR-1 or NFR-2. (addendum NFR-TEST-02)
- **REQ-NFR-10 · Gloved usability is established by test, not cited.** At least five artisans across the three trades complete a full capture in their own working gloves on the approved devices; failures recorded. **Scheduling dependency, lands in P7.** (addendum NFR-TEST-01)
- **REQ-NFR-11 · Glove mode is a device requirement.** No web interface controls high-sensitivity touch; any approved-device list is constrained to devices whose manufacturer documents a glove mode. (addendum NFR-DEV-01)
- **REQ-NFR-12 · No governing standard exists, and the PRD says so.** ISA-101 addresses process-automation HMI; EEMUA 201 is control-room guidance. Requirements are assembled from accessibility standards, vendor guidance and one empirical study, each labelled. (addendum NFR-HMI-02)

---

## C. Success metrics (prd.md §7) — procedural; the programme refuses invented figures

- **REQ-SM-1** Every enforced claim survives a *published* hostile attempt: the negative test sets of FR-4, FR-6, FR-23, FR-24, FR-27, FR-34 packaged as one script running against the deployed public URL from an ordinary shell with a standard HTTP client, printing pass/fail per attempt; script and output ship with the preview. Validates FR-4, 6, 23, 24, 27, 34, 66.
- **REQ-SM-2** Every authored claim is labelled before it is questioned. Validates FR-17, 20, 47, 48, 49.
- **REQ-SM-3** It opens with no signal, on a real phone, after one visit (real iOS + real Android, airplane mode, zero failed sub-resources). Validates FR-40, 41, 43.
- **REQ-SM-4** Nothing is typed that the system knows: across a walkthrough the only inputs are persona choice, shutter, record, accept, reject, an optional note (and the referral's tag). Validates FR-1, 4, 10, 23.
- **REQ-SM-5** No claim in the build trips the audit, on every commit. Validates FR-50.
- **REQ-SM-C1 (counter)** Do not reduce the labelling as the preview gets more convincing; polished-and-unlabelled is a failure even if every other metric passes.
- **REQ-SM-C2 (counter)** Do not make the offline path smoother than the online one; a queued decision always reads as pending rather than done.
- **REQ-SM-C3 (counter)** Do not raise the accept rate; accept and reject stay equally weighted; a walkthrough in which nothing was rejected is a warning.

---

## D. Build phases and ordering constraints (prd.md §6.1) — **the roadmap must follow these, not the §4 grouping**

| # | Phase | Delivers | FRs | Gate |
|---|---|---|---|---|
| P1 | Scaffold and honesty module | Project configuration, deployment headers, tokens, governed-sentence module, status ribbon, build-check command | FR-47, FR-48, FR-50, FR-65 (+ NFR-5, NFR-9) | Check command passes on an empty page; a public URL is labelled before it shows anything |
| P2 | Fixtures and types | Synthetic plant subset, artisans, orders, authored observations with cited records | FR-20 (shared with P5), **FR-21a** | Every citation resolves **and** a person has confirmed every wording against the record it cites |
| P3 | The server seam | Session, authorisation accessor, memory store, reconciliation module, response conventions, all routes | FR-1–FR-11, FR-15–FR-19, FR-57, FR-61 | Negative test sets of FR-4, FR-6, FR-23, FR-24, FR-27 pass from a shell |
| P4 | Shell, gate, orders, clock | Entry, persona choice, long-form disclosure, order list and detail, the clock | FR-48a, FR-58, plus the client half of P3 (+ NFR-1–4a, 6–8 begin) | Choosing a persona shows only that persona's orders, headed by a name never typed |
| P5 | Capture and the decision step | Camera, file-input path, voice, verification, proposals, decisions | FR-12–FR-14, FR-20, FR-21–FR-28 (excl. FR-21a), FR-59, FR-60 (+ NFR-7 as layout input) | On a real iPhone and a real Android: authored match labelled, one accept and one reject, both attributed |
| P6 | Offline | Device storage, queue, connectivity probe, deliberate-offline control, reconciliation, conflicts | FR-29–FR-39, FR-62 | Offline reload opens to orders with zero failed sub-resources; every conflict code reachable |
| P7 | Installability and desktop frame | Manifest, icons, service worker, install, update offer, the desktop frame | FR-40–FR-46, FR-63, FR-64 (+ NFR-10, 11, 12) | Installed on both platforms; airplane mode opens to orders; the frame carries a reviewer to a handset |
| P8 | The record handed onward, limits, documentation | Payload, limits screen, handover, harness, stills | FR-49, FR-51–FR-56, FR-66 | The phone walkthrough passes end to end |
| P9 | Referrals | Report-something-else flow, name resolution, flag, work proposal | FR-R1–FR-R11 | A referral raised offline reconciles; a mistyped tag is retained, not discarded |

**Ordering constraints, non-negotiable:** (1) honesty module and ribbon in P1, before any deployment — the first deployment is production; (2) P2 does not close on referential integrity alone — FR-21a closes it; (3) P3 completes before P5; (4) P9 is cross-cutting — it re-enters P3, P5, P6 and P8, and is last only because it is newest; (5) no phase ships a claim the honesty module does not yet carry.

**Epic → phase map (epics.md, confirmed by the orchestrator):** E1 = P1, P3, P4 · E2 = P2, P5 · E3 = P6 · E4 = P9 · E5 = P7 · E6 = P8 (FR-64 is grouped in E6 but lands in P7 per this table).

**Assumption (prd.md §9):** the nine phases map as tabulated; the roadmap may merge 1 and 2, or split 5.

---

## E. Enforced-invariant register (prd.md §6.3 — a summary; the FR is the specification)

| Invariant | FR | Method | The check, exactly |
|---|---|---|---|
| No path creates a finding | FR-24 | Analysis + negatives | One writer module; build rule; enumeration of every interface *and configuration value*; per-route state assertion |
| Attribution cannot be forged | FR-23 | Analysis + negatives | One actor-deriving function; no route schema accepts an actor field; six object kinds probed with a forged body |
| Unowned order indistinguishable from nonexistent | FR-6 | Test | Byte-identical responses across six routes |
| The order is the only authorisation | FR-57 | Analysis + inspection | One accessor; no tier consulted; no middleware authorisation |
| The order list cannot leak | FR-4 | Analysis + negatives | One accessor with non-optional account; enumerated shaping attempts |
| No model runs | FR-17 | Analysis + negatives | Fixture-only inputs; identical results for differing images; no vision library |
| No caller supplies observation content | FR-61 | Inspection | Every write route enumerated against accepted fields |
| A decision binds what was shown | FR-59 | Test | Alter fixture after deciding; context unchanged |
| Rejections and superseded states survive | FR-25, FR-26 | Test | Retrieve after supersession; both states present |
| Every attempt is recorded, including refused | FR-60 | Test | A forged attribution produces a retained entry |
| The honesty claims cannot drift | FR-47, FR-50, FR-65 | Test | One definition per sentence; enumerated banned strings; one command |

---

## F. Non-goals (prd.md §5 — not built, not claimed)

No model runs (no vision, transcription, inference; verification and observations authored from fixtures) · No redaction pass (stated above the shutter; in the product redaction is not optional) · No database (memory-only store discarded on cold start) · No supervisor role (no review queue, countersignature, second-person approval; all three personas are artisans; RBAC tier display-only) · No hours dispute or correction path (preview limitation) · No claim of novelty anywhere (only the enforcement posture is claimable) · No speaker identification, voice-print enrolment or diarisation (POPIA biometrics — not a deferral) · No live plant data · No production identity (no SSO, directory, revocation) · No native application (PWA, no wrapper) · Not a CMMS.

**Out of scope for the preview (prd.md §6.2, deferred not foreclosed):** transcription of the spoken note (audio retained on device only); reading back an asset's history (the product's payoff — brief success criterion 4); any supervisor-side view; a coached checklist on the phone.

---

## G. Open questions and assumptions (prd.md §8, §9)

- Q1 *(resolved 2026-09-02)* A referral proposes work; a named person raises it (FR-R7).
- Q2 How does an artisan name an asset in the field? — **settled by EXPERIENCE.md:** free text, typed after the plate is photographed, no client-side register (constraints.md).
- Q3 Does the brief's "binds to nothing" wording still hold now that a referral proposes work? Brief-update candidate.
- Q4 Is naming the SHEQ manager in the handover sufficient evidence of ownership? (Answerable in one line; blocks nothing.)
- Q5 Which eviction case must be reachable in a walkthrough — **settled by EXPERIENCE.md:** `store_evicted` gets its own card; a different serving instance is recorded silently and must not acquire a message.
- Q6/Q7 *(resolved 2026-09-01)* Bounded quantities carry no values in the PRD (architecture owns them); the FR-R3 existence disclosure is a wanted, bounded exception.
- Assumptions: stating the revocation limitation beats server-side session state (FR-3); tested platform floor stated not enforced (FR-46); a handover mapping table suffices as label-placement evidence (FR-49 — contested by EXPERIENCE, see INGEST-CONFLICTS); retaining audio without transcription is useful (§6.2); a 20 mm floor extrapolated from a bare-handed 2004 study, replaced by NFR-10's test (§4.10); nine phases as tabulated (§6.1); one real iOS and one real Android device suffice (SM-3).

---

## H. Addendum candidate requirements (addendum.md) — with disposition against prd.md

Reading rule from the addendum: these are **candidate** requirements (status draft; §1 and §3 self-rated medium confidence, §2 high). Disposition column states whether prd.md adopted the item, and where its value lives.

### H.1 Field touchscreen and device requirements (addendum §1.1)
- **REQ-ADD-NFR-UI-01** 20 mm × 20 mm physical hit area for record-binding controls, on-device measured. → **Adopted** as NFR-1.
- **REQ-ADD-NFR-UI-02** 44 × 44 CSS px for all other targets (SC 2.5.5 AAA). → **Adopted** as NFR-2.
- **REQ-ADD-NFR-UI-03** No gesture-only actions; accept/reject single-tap, never swipe-only. → **Adopted** as NFR-3.
- **REQ-ADD-NFR-UI-04** Confirmation within 100 ms through **at least two channels** (visible + haptic and/or audible); idempotent controls. → **Adopted in refined form** as NFR-4 + NFR-4a: the visible change alone must satisfy the requirement (no Vibration API on iOS; audible useless on a plant floor); haptics additive only. Divergent acceptance; prd.md governs (see INGEST-CONFLICTS INFO).
- **REQ-ADD-NFR-UI-05** 7:1 text contrast, CI-checked. → **Adopted** as NFR-5.
- **REQ-ADD-NFR-UI-06** 3:1 non-text; state by label and shape, never hue alone. → **Adopted** as NFR-6.
- **REQ-ADD-NFR-UI-07** Reflow at 320 px and 200 %; "no more than four such targets fit across the screen… cap the capture screen at four primary actions" (from a nominal 76 CSS px per 20 mm). → **Adopted in stricter, device-measured form** as NFR-7: 130 px, two per row maximum, one primary record-binding action per screen. prd.md governs (INFO).
- **REQ-ADD-NFR-UI-08** One-handed thumb zone; ACCEPT outside the incidental-brush region behind a deliberate, separated confirm. → **Adopted** as NFR-8 (EXPERIENCE settles the mechanic as an in-place second tap).
- **REQ-ADD-NFR-DEV-01** Approved devices only with a documented firmware glove touch mode. → **Adopted** as NFR-11; approved-device list itself deferred to P7 (decisions.md Deferred).
- **REQ-ADD-NFR-DEV-02** Approved devices ≥ 1000 cd/m² typical maximum luminance (procurement benchmark, not a standard). → **Not carried into prd.md**; an input to the P7 approved-device list decision.
- **REQ-ADD-NFR-DEV-03** Comparative ambient-contrast ranking (peak luminance / average reflectance); no pass/fail threshold. → **Not carried into prd.md**; input to the P7 approved-device list.
- **REQ-ADD-NFR-TEST-01** Gloved acceptance test: ≥ 5 artisans across millwright/electrician/boilermaker, own issued gloves, each approved device, outdoors in direct sun, one-handed; pass = 100 % completion without removing gloves, zero unintended ACCEPTs, mis-tap rate recorded; glove metadata logged. → **Adopted** as NFR-10 (P7); the addendum's pass criteria and metadata list are the fuller statement.
- **REQ-ADD-NFR-TEST-02** CI WCAG 2.2 check failing on any A/AA violation, plus a bespoke 20 mm / 44 px rule. → **Adopted** as NFR-9 (P1).
- **REQ-ADD-NFR-HMI-01** Conditional ISA-101.01-2015 alignment for abnormal-state colour conventions; gated on purchasing the standard, "or else drop". → **Dropped by prd.md** (NFR-12: no governing standard; none asserted).
- **REQ-ADD-NFR-HMI-02** Scope disclaimer: no binding standard governs handheld field HMI. → **Adopted** as NFR-12.

### H.2 PWA platform limits (addendum §2.1)
- **REQ-ADD-NFR-STORAGE-1** iOS Home Screen install is a prerequisite for offline capture; block or hard-warn when `display-mode: standalone` is false. → **Adopted (hard-warn form)** as FR-63 + FR-41's installed-case claim; the preview states, it does not block.
- **REQ-ADD-NFR-STORAGE-2** `persist()` requested at first run, `persisted()` read back, surfaced honestly; no requirement may depend on it succeeding. → **Adopted** as FR-45; AD-12 makes the tri-state runtime-derived.
- **REQ-ADD-NFR-STORAGE-3** No fixed device storage allowance; budget against `estimate()`; proposed working cap = lesser of 2 GB and 50 % of free quota, above which new capture is refused with a "sync now" instruction. → **Principle adopted** (AD-21 device-store cap with degradation order); **the proposed values are owned by AD-13's module**, not this document.
- **REQ-ADD-NFR-STORAGE-4** `QuotaExceededError` handling with a defined degradation order (proposed: purge synced media oldest-first, then refuse new photo capture while permitting audio and text). → **Adopted** as feature NFR-F4 / AD-21; order to be fixed in P6.
- **REQ-ADD-NFR-STORAGE-5** Eviction is all-or-nothing; server is the system of record; detect a wiped store on launch and re-hydrate. → **Adopted** as NFR-F5 / AD-21 ("wholesale loss routes to the gate").
- **REQ-ADD-NFR-STORAGE-6** State a maximum supported offline window (proposed 72 h); never promise indefinite retention. → **Adopted** as FR-63's stated window; **value owned by AD-13's module**.
- **REQ-ADD-NFR-SYNC-1** Foreground-driven reconciliation (online event, visibilitychange, launch, explicit "Sync now"); Background Sync only as a Chromium accelerator; acceptance: all sync tests pass with Background Sync stubbed out. → **Adopted** as FR-38.
- **REQ-ADD-NFR-SYNC-2** No sync-latency SLA derived from Background Sync. → **Adopted** as FR-38 ("no sync-latency target is stated anywhere").
- **REQ-ADD-NFR-DURABILITY-1** Durable IndexedDB commit before UI acknowledgement and before `visibilitychange`-hidden returns; no reliance on `beforeunload`/`unload`. → **Adopted** as FR-30.
- **REQ-ADD-NFR-DURABILITY-2** Check `document.wasDiscarded` on load; restore in-progress capture; verified by a kill-mid-capture test. → **Adopted** as FR-30 (recovery on next load).
- **REQ-ADD-NFR-MEDIA-1** Audio format negotiated at runtime via `isTypeSupported`; iOS path specified and tested as audio/mp4 AAC. → **Adopted** as FR-14 (AD-12 forbids hardcoding; the iOS format is read back, not assumed).
- **REQ-ADD-NFR-MEDIA-2** Speech-to-text ingestion must accept AAC-in-MP4; measure per-second byte cost on iOS. → **Not applicable to the preview** (transcription is out of scope, prd.md §6.2); product-level candidate.
- **REQ-ADD-NFR-MEDIA-3** Recording during backgrounding is unsupported; stop and finalise on `visibilitychange`-hidden. → **Adopted** as NFR-F3.
- **REQ-ADD-NFR-SECURITY-1** HTTPS on every environment; explicit secure-context precondition check with an operator-legible error. → **Adopted** via D-DEPLOY (all environments HTTPS; `next dev --experimental-https`); the legible-error check is a P5 detail.
- **REQ-ADD-NFR-SECURITY-2** If ever framed, the host must set `allow="camera; microphone"`. → **Not applicable to the preview** (the desktop frame renders inline, not in an iframe); handover note candidate.
- **REQ-ADD-NFR-PLATFORM-1** Android WebAPK hibernation resets permissions; re-request camera/microphone defensively each shift-start; treat denial as recoverable. → **Partially adopted** (FR-13 file-input path on refusal; EXPERIENCE permission-refused state); explicit shift-start re-request is not a prd.md requirement.
- **REQ-ADD-NFR-PLATFORM-2** Tested floor stated explicitly (proposed iOS/iPadOS 17.0+, Chrome for Android 55+/61+); iOS browsers all inherit WebKit limits. → **Adopted** as FR-46; **values owned by AD-13's module**.
- **REQ-ADD-NFR-OBSERVABILITY-1** Per-device per-session telemetry: `persisted()`, `estimate()` quota/usage, standalone yes/no, `wasDiscarded` count, `QuotaExceededError` count, cold-start-empty-store count, negotiated mimeType. → **Not adopted as telemetry**; the Limits and Sync screens surface storage state and instance live (FR-45, FR-51); AD-11 defines observability as response headers. Product-level candidate.

### H.3 Testable invariant and audit-trail patterns (addendum §3.1)
Vocabulary note: the addendum uses "Finding" for the record an accept commits. prd.md's glossary reserves **finding** for an asserted fact that nothing in this system creates (FR-24); the addendum's "Finding" reads in prd.md as *accepted observation / decision*. prd.md's vocabulary governs (INGEST-CONFLICTS INFO).
- **REQ-ADD-MEDIATION** All writes through one named module, CI-asserted as the only unit referencing the write interface. → **Adopted** as FR-24 / AD-1.
- **REQ-ADD-PRECONDITION** Commit only when authenticated, acting identity = assigned artisan, source proposal open, explicit accept; one positive + four negative tests. → **Adopted** across FR-22, FR-23, FR-27, FR-33 (the server re-validates assignment, membership, proposal state).
- **REQ-ADD-NAMED-HUMAN-AUTHORITY** Only the assigned artisan may accept; identified and recorded. → **Adopted** as FR-23 + FR-57.
- **REQ-ADD-NON-BYPASSABILITY** Written Acceptance Architecture Description enumerating every interface to the store. → **Adopted** as FR-24's non-bypassability analysis (+ configuration surface) and AD-19's enumeration shipped with the handover.
- **REQ-ADD-MACHINE-NON-AUTHORITY** The machine pipeline may create PROPOSAL only, never a Finding. → **Adopted** as FR-24 / AD-8 / AD-19.
- **REQ-ADD-ATTRIBUTION** Accepted record carries printed name, identifier, timestamp with zone, source proposal text, meaning of the act. → **Adopted** as FR-59 (decision context) + FR-23; timestamps ISO-8601 UTC per conventions.
- **REQ-ADD-HUMAN-READABLE-MANIFESTATION** Name, timestamp, meaning in every rendering incl. PDF export and printed work-order pack. → **Adopted for the preview's renderings** (decision state, payload); PDF/print are product-level, not preview.
- **REQ-ADD-AUDIT-TRAIL-GENERATION** Time-stamped entry for every create/modify/delete/accept/reject with actor, event type, outcome. → **Adopted** as FR-60.
- **REQ-ADD-NON-OBSCURING** Changes never overwrite prior information; superseded values retrievable. → **Adopted** as FR-26 (and FR-25).
- **REQ-ADD-PREVENT-OR-DETECT-DECLARATION** Per invariant, state PREVENTED or DETECTED with the detector named. → **Partially adopted**: prd.md §6.3 states the check per invariant; an explicit prevent/detect column is a handover candidate.
- **REQ-ADD-OFFLINE-COMMIT-POINT** Acceptance is one durable on-device unit at the act, separate from media upload and sync flush; device timestamp retained beside server receipt. → **Adopted** as FR-28 + FR-11.
- **REQ-ADD-TIME-TRUST** Record device-local and server receipt timestamps with a clock-trust indicator; never silently substitute. → **Adopted** as FR-11 + AD-3 (`device_offset_s`, `source`).
- **REQ-ADD-SIGNATURE-RECORD-BINDING** Attestation bound to its record "by ordinary means". → **Adopted in preview form**: server-stamped attribution + bound decision context (FR-23, FR-59); no cryptographic signature in the preview.
- **REQ-ADD-TAMPER-DETECTION-ON-RECONCILIATION** Verify integrity of each queued acceptance on reconnect; reject, retain and raise on error. → **Adopted in preview form** via AD-9 content hashing (`already_recorded_differently`) and FR-33 re-validation; signature-level integrity is product-level.
- **REQ-ADD-AUDIT-AVAILABILITY** Audit retained as long as the records it describes; exportable. → **Adopted within the preview's retention window** (FR-60 entries in the payload, FR-56 window stated); export beyond the payload is product-level.
- **REQ-ADD-VERIFICATION-METHOD-COLUMN** (process) Every requirement carries a verification method; invariants take analysis primary with an enumerated negative set. → **Adopted** throughout prd.md §4.
- **REQ-ADD-POSITIVE-PHRASING-RULE** (process) No bare "shall not" over an unbounded set; rewrite as mediation + enumerated negatives. → **Adopted** (FR-24 and peers are stated positively).
