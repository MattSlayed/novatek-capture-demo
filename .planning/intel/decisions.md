# Decisions — synthesized from ADR-typed sources

Repo root: `C:\Users\matth\OneDrive\Documents\NOVATEK LLC\04 KNOWLEDGE-BASE\Project-Scopes\Project Scope's\Business Brain\novatek-capture-demo`
All `source:` paths below are repo-relative.

One ADR-typed document was ingested. It is a multi-decision architecture spine, so each AD-n is extracted as its own decision. Frontmatter `status: final` is treated as Accepted; the manifest marks the document LOCKED at precedence 0. Everything under *Invariants & Rules*, *Consistency Conventions*, *Stack* and *Structural Seed* is locked. Everything under *Deferred*, *Open questions* and *Conflicts surfaced* is explicitly NOT locked and is carried in the last three sections of this file.

- source: docs/planning-artifacts/architecture/architecture-novatek-capture-demo-2026-09-02/ARCHITECTURE-SPINE.md
- type: ADR (manifest override) · locked: true · precedence: 0 · status: final (2026-09-02, updated 2026-09-03)
- binds: build phases P1–P9
- companions the ADR names as governing measured UI figures: DESIGN.md, EXPERIENCE.md (see constraints.md)

---

## D-0 — Design paradigm (locked)

- source: ARCHITECTURE-SPINE.md §Design Paradigm
- status: locked
- scope: whole build
- decision: **Server-authoritative single-writer with a queue-first client projection.** Three commitments: (1) one mediating writer — every write to the record store, online or reconciled, passes through one function; (2) the client is a projection — it captures, queues and renders, and decides nothing (not identity, authorisation, match, observation, or whether a tag exists); nothing it claims about itself is stored as fact; (3) the queue is the only path — online, flush runs immediately, so the online path *is* the queue path, and a write is acknowledged when durable on the device, never when the server answers.
- layer table (what may decide): Transport `app/api/**` — nothing (parse, delegate, respond) · Access boundary `lib/access/` — who may touch what · Mediating writer `lib/reconcile/` — recorded, conflict, or reject · Record store `lib/store/` — retention, caps, self-description · Authored plane `lib/data/` — nothing (read-only fixture truth plus the server-only register) · Disclosure plane `lib/copy/` — nothing (one sentence per claim) · Client projection `components/`, `lib/client/` — when to enqueue, what to render · Build gates `scripts/` — whether the build ships.

## D-INH — Inherited invariants (bind unchanged; a local contradiction is a conflict to surface, not an override)

- source: ARCHITECTURE-SPINE.md §Inherited Invariants
- status: locked (inherited)
- "The demo must be real where it claims to be real; a client-side fake of a server-side control is disproved with devtools in eight seconds" (ipv-demo/HANDOVER.md §1) → the enforced/authored split; every AD.
- The claims register and its banned strings, owned by the SHEQ manager (ipv-demo/HANDOVER.md §3) → AD-12, AD-15.
- Uniform not-found for unowned-and-unknown; caller binding checked before state (ipv-demo/lib/store.ts ordering) → AD-4.
- "A forgeable audit field is no audit field" (ipv-demo §4A #2) → AD-3; server-derived arrival (FR-54).
- "Proposals queue; there is no offline inference", and the named anti-pattern *auto-executing queued offline proposals* (IPV-ARCHITECTURE.md) → AD-1, AD-8.
- `tokens.inherited.css` is a byte-identical copy of the parent's tokens, CI-asserted (DESIGN.md Brand & Style) → the two-file token split is not re-litigated.
- The synthetic plant vocabulary, and RBAC tier as a display-only attribute (ipv-demo/lib/data/plant.ts) → fixtures; AD-2 forbids reading tier in any access decision.
- RBAC inherited 1:1 from BRIMIS (Field Technician upload-only, Site Supervisor read/upload, Management, NOVATEK Admin; anchor bindings carry `placed_by` and `confirmed_by`) → extended here for the field technician, not overridden; surfaced under *Conflicts surfaced* below.

---

## AD-1 — One write path, for online and reconciled writes alike

- source: ARCHITECTURE-SPINE.md §AD-1
- status: locked
- binds: FR-24, FR-28, FR-29, FR-30, FR-33, FR-60, FR-R11; P3, P6, P9
- prevents: a reconciliation path that validates less than the online route; a store with more than one writer; a client surface that writes around the queue; a refusal that never reaches the writer.
- decision: `lib/reconcile/apply.ts` exports `applyItem(account, item)` and is the sole writer to the store. Every online write route and `/api/sync` call it with the same item shape (AD-16); neither carries a validation branch the other lacks. Check order is fixed and identical on both: **session → ownership → idempotency → shape → state**; for acts idempotent by state (AD-9) the state check recognises the duplicate. **A refusal does not escape the writer:** a request refused at session or ownership calls `applyItem` with a refusal item, so FR-60's retained attempts are written by the one writer; a refusal entry records nothing the uniform not-found withheld (AD-4). On the client every write is `enqueue()` then `flush()`; no surface calls a write route directly and none waits on a response before acknowledging. **Nothing silently discards a queued item:** only a recorded server outcome or an explicit artisan act removes an item; an authentication failure during flush discards nothing, re-mints the same persona and leaves every item `queued`. A build rule asserts no module other than the writer writes to the store and no write route is reachable except through the queue.

## AD-2 — [ADOPTED] The work order is the only authorisation, and it is checked in one accessor

- source: ARCHITECTURE-SPINE.md §AD-2
- status: locked
- binds: FR-4, FR-5, FR-18, FR-52, FR-57, FR-R1; all routes
- decision: `lib/access/scope.ts` is the only place authorisation is decided: `ordersFor(account)`, `orderOwned(account, id)`, `assetInOrder(order, assetId)`. The account is a non-optional first argument derived from the session, never from a body, query parameter or header. **No Routing Middleware (`proxy.ts`) exists in this deployment** — it would be a second seam, and Vercel deploys Routing Middleware to all regions regardless of the project's region setting. No access decision reads an RBAC tier.

## AD-3 — Attribution has exactly one producer

- source: ARCHITECTURE-SPINE.md §AD-3
- status: locked
- binds: FR-1, FR-23, FR-54, FR-60, FR-R8; the six attributed object kinds
- decision: One function derives the acting account from the session, and every actor field — on session, clock segment, capture, verification, decision, referral and flag — is assigned from its return and nowhere else. No route's accepted-field schema contains an actor field; a submitted one is dropped at parse and appears in neither the record nor the response. Every server-derived fact (arrival mode, measured clock offset) takes no input from the request body and enumerates its inputs in code beside its derivation: `arrived_via` is derived from server-observed values only (arrival over `/api/sync` *is* the observation); `item.attempts` — a client-maintained counter — enters no derivation. A client claim about itself may be stored only as a claim and rendered as one; where a server-side bound exists it is applied (FR-11: offline segment start clamped no earlier than the session's issue time and the device's last server contact, both claim and measured offset retained). Build rules assert both halves.

## AD-4 — [ADOPTED] Not-found is uniform, and there is exactly one bounded exception

- source: ARCHITECTURE-SPINE.md §AD-4
- status: locked
- binds: FR-6, FR-27, FR-35, FR-52, FR-R3; every route including sync
- decision: One producer emits the not-found response; unowned and unknown are byte-identical in status, body and headers on every route, reconciliation included. Ownership is decided before any state comparison, so no conflict or reject code can separate *exists but is not yours* from *does not exist*. **The single exception is tag resolution on `POST /api/referrals`**: it discloses whether a typed tag resolves in the register, bounded to existence alone (nothing about zone, orders, assignment or history), and a tag on another artisan's order returns byte-for-byte what an unassigned tag returns. The order id in that same request keeps the uniform response. The exception lives in `lib/access/register.ts`, never in `scope.ts`. **The not-found response carries the universal header set only** — no route-specific `X-CAP-*` counter — so byte-identity holds across routes; AD-11's counter table marks each header universal or success-only.

## AD-5 — Proposal identity is derived, not stored

- source: ARCHITECTURE-SPINE.md §AD-5
- status: locked
- binds: FR-21, FR-33, FR-34; P3, P5, P6
- decision: `Proposal.id = HMAC(CAPTURE_SESSION_KEY, account_id · item.client_id · observation_id)` — deterministic, non-sequential, unguessable without the key, re-derivable by any instance with no shared state. `item.client_id` is the envelope's, minted once at enqueue (AD-16); there is no `capture.client_id` and no second id on the payload. **Validating a proposal reads nothing from the store.** The decision item carries exactly two identity fields — `capture_client_id` and `observation_id` — from which the triple is reconstructed with the session's account, never by enumerating store candidates. These two fields are proposal identity, not observation content, so FR-61's accepted-field enumeration excludes them by name. **A decision arriving at an empty instance is recorded.** A proposal is refused only when the re-derived HMAC does not equal the submitted id — reject `unknown_proposal`, whose sentence names the record and never the instance. No copy anywhere names an instance change.

## AD-6 — A decision binds a snapshot, not a reference

- source: ARCHITECTURE-SPINE.md §AD-6
- status: locked
- binds: FR-59, FR-25, FR-26, FR-53; P2, P5, P8
- decision: The decision context — proposal text as rendered, grade, cited record id, evidence-or-context relation, and the fixture version in force — is **copied into the decision record inside the same commit, before the decision is recorded**. Every read path returns the stored copy; none reads the live fixture set. Per field: *grade*, *cited record id* and *relation* are server-composed from `lib/data` at write time (no client value accepted); *proposal text as rendered* is a client claim, stored marked as claimed beside the server's own rendering under the version it holds; *fixture version* is two values — the client's rendered-under version (claim) and the serving instance's own. Where they differ the decision is recorded with both and carries state mark `fixture_version_mismatch` — a closed-set member with a sentence and a next act, not a conflict and not a reject. The fixture version's source is a single named export from AD-13's module, bumped only when fixture content changes — **not** the build id. The same five fields accompany each accepted observation and each retained rejection in the record handed onward; a superseded proposal carries its prior state, the replacing state and the time of change (FR-26) in card and payload alike.

## AD-7 — [ADOPTED] The asset register is server-only

- source: ARCHITECTURE-SPINE.md §AD-7
- status: locked
- binds: FR-R2, FR-R3, FR-R4; P9
- decision: `lib/data/register.ts` and `lib/access/register.ts` are imported from server code only; a build rule asserts no client module reaches either and no register content appears in a client bundle. The client performs no validation, no autocomplete and no lookup on a typed tag. A referral response carries the resolution state and, where resolved, the flag — nothing else about the asset. The typed tag is retained as the artisan's claim and never overwritten by what the server resolved.

## AD-8 — [ADOPTED] Authored results take no capture input, and no inference code ships

- source: ARCHITECTURE-SPINE.md §AD-8
- status: locked
- binds: FR-17, FR-20, FR-32, FR-61; P2, P5, P6
- decision: The module producing verification and proposals declares exactly `(assetId, fixtureSet)`; capture bytes, thumbnail and hash are neither parameters nor reachable from it (build rule). Every authored result carries a null confidence and an authored extractor; no code path can set a confidence value. Grade is drawn from the closed set {INFERRED, AMBIGUOUS}; the grade meaning *the record states this* (EXTRACTED) is unconstructible. No route accepts observation text, grade or provenance that becomes a proposal. The dependency manifest contains **no vision, OCR, inference, speech-recognition, speaker-identification/voice-print, or diarisation library**, asserted by a build rule as a **named-package ban** (not a manifest-size assertion, so a second bundler's dependencies may legitimately enter in P7). The audio classes are not a scope cut: voice recognition is named in the POPIA definition of biometrics.

## AD-9 — Idempotency is keyed per account and compared by content

- source: ARCHITECTURE-SPINE.md §AD-9
- status: locked
- binds: FR-34, FR-36, FR-37; P6 (with two codes closed in P4)
- decision: The idempotency key is `${account_id}:${item.client_id}` (the envelope's id, AD-16). Same key + same payload hash → `duplicate`, treated as recorded. Same key + different hash → conflict `already_recorded_differently`. Every `client_id` is UUID-shaped, asserted before keying. A queued item carries the account it was created under; that value is compared and never trusted. **One hash domain, one canonicaliser:** one function in one module takes one enumerated field subset per item kind and returns the bytes hashed; envelope fields (`created_at`, `attempts`, `claimed_account_id`, `schema_version`) are excluded by construction; every write route and `/api/sync` hash the canonicalised payload, never the request body as received. **Acts idempotent by state, not by key: order open and order close.** A second open makes no second segment (FR-7) whichever `client_id` it arrives under. Two conflict codes close the remainder, **in P4, before P6**: `already_open` (an open against a segment opened under a different item) and `not_open` (a close with no running segment), each with a sentence and a next act.

## AD-10 — [ADOPTED] The store is memory-per-instance, and it says so

- source: ARCHITECTURE-SPINE.md §AD-10
- status: locked
- binds: FR-35, FR-44, FR-56, NFR of PRD §4.1; P3, P6, P8
- decision: The record store is module-level, per serving instance, TTL-swept, capped, and stamped with a boot id. **A cold start and a change of serving instance are ordinary and silent** — no message exists for either and none may be added. The only surfaced absence is eviction, a reject (`store_evicted`) carrying its own sentence and a re-verify act. Every response and the health route state the store kind, the instance and the retention window. No feature may depend on cross-instance shared state; AD-5 exists so the load-bearing path does not.

## AD-11 — One responder stamps every response

- source: ARCHITECTURE-SPINE.md §AD-11
- status: locked
- binds: FR-4, FR-17, FR-20, FR-56, SM-1; every route
- decision: `lib/http/respond.ts` exposes the only response constructors. Every response carries `Cache-Control: no-store`, `X-CAP-Store` and `X-CAP-Instance`. Every error body is `{ error: snake_case, detail: "A sentence." }` — code for the reviewer, sentence for the artisan, **both always ship**. Route-specific `X-CAP-*` counters are declared in one table beside the responder, each marked **universal or success-only**; the same table carries document-level policy headers, `Permissions-Policy: camera=(self), microphone=(self)` among them. **Observability is the response headers**: a reviewer reproduces any claim from a shell without reading a body; console output is not an observability channel. **Boundary:** Vercel emits `413 FUNCTION_PAYLOAD_TOO_LARGE` for a request *or response* body over 4.5 MB before any application code runs, so it carries neither headers nor a sentence; it is a **named, disclosed exception** — its sentence lives in `governed.ts` and the client renders it when a 413 arrives **without `X-CAP-Instance`** (the header's absence is the discriminator). AD-13's batch ceiling sits strictly below 4.5 MB minus base64 (~⅓) and JSON-envelope overhead.

## AD-12 — [ADOPTED] One definition per governed sentence, and a platform claim is a runtime result

- source: ARCHITECTURE-SPINE.md §AD-12
- status: locked
- binds: FR-14, FR-45, FR-47, FR-49, FR-51, FR-62, FR-63; P1 and every surface after it
- decision: `lib/copy/governed.ts` defines each governed sentence exactly once; every rendering imports it; a build rule fails on a duplicate literal anywhere in `app/`, `components/` or `lib/`. Two clauses for platform claims: **(a) Platform capability — runtime-derived, no exceptions.** The sentence renders the value the runtime returned: storage tri-state from `persist()`/`persisted()`; the quota figure from `estimate()` (its own tri-state, rendering no figure when the call is absent — `estimate()` is Safari 17 while `persist()` is 15.2); audio format from `isTypeSupported` plus the constructed recorder's read-back; connectivity from the probe; the update offer from whether a previous worker was already controlling the page; installed-vs-browser from the display-mode fact. No browser-name branch, user-agent test or compile-time assumption may select a wording; a tri-state reports *unsupported* only when the call is absent or throws. **(b) Platform policy — documented behaviour with no runtime probe** (e.g. WebKit's seven-day script-writable-storage eviction window) is permitted and necessary, **cited to its source and dated in `governed.ts` beside the sentence**, re-checked at each phase gate, never inferred from a browser name. FR-63's sentence is of this kind.

## AD-13 — Every bounded quantity has one definition, and both sides read it

- source: ARCHITECTURE-SPINE.md §AD-13
- status: locked
- binds: FR-15, FR-19, FR-39, FR-45, FR-46, FR-62, FR-63; PRD §0 *On numbers*
- decision: One module (`lib/limits`) exports every bounded quantity — media and thumbnail caps in **encoded** bytes, note duration, batch item and byte ceilings, store caps and TTL, probe interval and staleness window, the supported offline window, and the tested platform floor. Where a client target and a server ceiling differ for the same quantity they are two named exports in that module, never two literals in two files. Nothing else declares one. **These values are code, not documentation.** No other document restates them; where one already does (EXPERIENCE.md's note-duration cap; the seed's figures; the addendum's proposals) that restatement is stale by construction and the module governs. Values are tuned in the phase that first needs each one (see *Deferred*).

## AD-14 — [ADOPTED] Screen changes are request-free

- source: ARCHITECTURE-SPINE.md §AD-14
- status: locked
- binds: FR-41, FR-43, FR-64; P4, P7
- decision: Two assertions are the invariant: **(a) a screen change issues zero requests** — the offline check asserts zero document and zero `_rsc` requests across every pair of screens; **(b) screen, current order and current asset are addressable state that survives an iOS standalone relaunch**, read back from the query string, with pending capture intent stashed on device. Current mechanism: one route `/`, switched by `history.pushState`, no `<Link>`, no `router.push`, no server-component fetch between screens; fallback is a `history.state`-only switcher bypassing the router. **The mechanism may change, the assertion may not.** Consequences: `/` stays a statically prerendered Server Component with the search-params reader behind `<Suspense>` (the worker's coherent-shell precache parses its HTML); and because `pushState` fires no load event, focus moves to the new screen's heading or labelled `<main>` on **every** transition, including the in-place replacement of the accept/reject pair by the decision state.

## AD-15 — One build gate, and it fails rather than degrades

- source: ARCHITECTURE-SPINE.md §AD-15
- status: locked
- binds: FR-10, FR-17, FR-21a, FR-22, FR-23, FR-24, FR-42, FR-47, FR-50, FR-61, FR-65; NFR-7, NFR-8, NFR-9; every phase
- decision: One project command runs typegen, the type check, the claims audit, the single-writer rule, the actor-field rule, the fixture-inputs rule, the register-isolation rule, the manifest ban (AD-8), the worker `/api/` guard, the **middleware-absence assertion**, the duplicate-literal check, the accepted-field enumerations (AD-16, AD-20), the **header check** (document-level policy headers incl. `camera=(self), microphone=(self)`), the contrast check, the target-size check, **FR-22's rendered accept/reject parity at 360 px**, the **reflow assertions at 320 px and 200 %**, the **WCAG A/AA check**, lint and build — and exits non-zero on any one. **No check warns and no check is skippable**; `typescript.ignoreBuildErrors` is never set. A production build whose build id does not resolve from a deployment-provided value **fails**; it never falls through to a constant. Deployment runs the same command as a developer. The header check is not hygiene: the sibling repo ships `camera=()`, which makes `getUserMedia` reject regardless of the artisan's answer. **DESIGN.md's decorative-exemption register is a required input to the contrast check.** The claims audit's roots stay `app/`, `components/`, `lib/` deliberately, and it is a string sweep with stated limits. **One gate is not automated and is not lesser:** FR-21a is a human provenance check — each authored observation read against the record it cites, the cited sentence carried in a fixture comment so a second person can repeat it — and **phase 2 does not close without it**.

## AD-16 — One item envelope, one client id

- source: ARCHITECTURE-SPINE.md §AD-16
- status: locked
- binds: FR-15, FR-16, FR-33, FR-34, FR-36, FR-37, FR-61; P3, P5, P6, P9
- decision: The queue item type is defined **once**, in one module, and is the **only shape any write route accepts**; a route parses a body into that envelope and does nothing else. `client_id` is the envelope's, UUID-shaped, **minted once at enqueue**, and **every entity's own id is that value** — `Capture.id`, the decision's id and the rest — so there is not a second UUID anywhere in a write. AD-9's key and AD-5's derivation both name this one field. A queued item carries the account it was created under; compared, never trusted. This is the missing half of AD-1: one writer is not one shape.

## AD-17 — One client projection

- source: ARCHITECTURE-SPINE.md §AD-17
- status: locked
- binds: FR-36, FR-41, FR-43; P4, P6, P7
- decision: One module is the **sole client-side reader and writer of cached server state**. The network is a write-through into it; no surface reads a second copy, and no component holds its own copy of anything the server returned. The gate's purge is **one operation** on that module and clears every namespace it holds. **P4 builds against this module even though P6 supplies the durable (IndexedDB) backing**, or P4's store is rework.

## AD-18 — The queue envelope is versioned

- source: ARCHITECTURE-SPINE.md §AD-18
- status: locked
- binds: FR-41, FR-44, FR-63; P6, P7, P9
- decision: Every queue item carries the **schema version it was written under**. The writer **accepts every version this project has emitted** and upgrades on arrival; the emitted set is enumerated in code beside the item type (AD-16); a version outside it is refused with `unknown_kind`, whose sentence already covers this skew. **A breaking payload change requires a new `kind`, never a widened one.** Without this the offline claim is true only within a single deployment.

## AD-19 — No path creates a finding

- source: ARCHITECTURE-SPINE.md §AD-19
- status: locked
- binds: FR-24; PRD §6.3 row 1 and §5's first non-goal; every phase
- decision: **No type, no record state, no route and no configuration value produces a finding.** No member of any closed set means *the record states this*. No entity exists whose semantics are a finding — a flag records that a person raised something, not that a condition obtains, and no operation promotes one (AD-23). The evidence PRD §6.3 asks for is an **enumeration of every interface and every configuration value**, produced by AD-15's command and shipped with the handover. A single write path (AD-1) is not the same property as no path.

## AD-20 — What leaves the device is enumerated

- source: ARCHITECTURE-SPINE.md §AD-20
- status: locked
- binds: FR-15, FR-16, FR-61; SM-1; P5, P6, P9
- decision: The accepted-field enumeration for **every capture-bearing route** is exactly `{ sha256, bytes, mime, duration_ms }` plus a thumbnail bounded by AD-13. **No route accepts a full-resolution image field and no route accepts any audio payload** — not online, not through `/api/sync`, not on a referral. No client module posts an original or an audio blob. Both halves are asserted: a build rule over route schemas and client modules, and a harness assertion on the **actual request body** of `POST /api/captures` (the reviewer's own network-panel check).

## AD-21 — The device's lifecycle is bound, and its limits are told

- source: ARCHITECTURE-SPINE.md §AD-21
- status: locked
- binds: FR-45, FR-63, the FR-R series; NFR of PRD §4.1; P5, P6, P7, P9
- decision: Device retention is stated per artefact and enforced in one module. An original is held only until its capture is recorded server-side, then deleted. The audio corpus and the queue are held until a recorded server outcome or an explicit artisan act (AD-1) — never longer, never silently shorter. The device store has a **cap exported from AD-13's module** and a **defined degradation order**; storage exhaustion is an expected path, and **the artisan is told what was dropped, never silently**. Eviction risk is stated at the point it applies under AD-12: install status is a runtime capability fact; WebKit's seven-day script-writable-storage window (IndexedDB, Cache API and the SW registration together; home-screen install effectively exempt) is a cited, dated policy claim. Wholesale loss of the origin's storage routes to the gate.

## AD-22 — The honesty surface may only be strengthened

- source: ARCHITECTURE-SPINE.md §AD-22
- status: locked
- binds: FR-47, FR-49, FR-51, FR-65; SM-C1; every phase after P1
- decision: **Labelling gets stronger as the visuals improve.** The labelling floor is never traded against polish; a change that reduces a governed sentence's prominence is a defect. The **eight governed sentences are a closed set**; a ninth costs a sentence and a next act. **A sentence renders in full or not at all** — never truncated, summarised, iconised, behind a *read more*; no responsive branch shortens one, no scroll state hides one, no animation delays one; `authoredVerification` never renders beside a confidence value. **A sticky action bar is permitted for a control and forbidden for a governed sentence:** the ribbon has no `max-height`, no `position: fixed`, and stays in document flow. There is exactly one fixed element in the build (the referral entry bar). `noRedaction` holds the slot immediately above the shutter in both states of the photograph screen and on the referral plate shot.

## AD-23 — A flag is stored, and it is stored with its referral

- source: ARCHITECTURE-SPINE.md §AD-23
- status: locked
- binds: FR-R2, FR-R11; P8, P9
- decision: A flag is a **stored record**, written through the mediating writer in the **same commit as its referral** (FR-R11). Its id is **derived from the referral's**, never minted (no second client id, AD-16). It is **evicted with its referral and never separately**; no record in the store may hold a reference to an object that can be swept independently of it. A flag carries no independent state, and no operation promotes one into a finding (AD-19).

---

## D-DEP — Dependency direction (locked)

- source: ARCHITECTURE-SPINE.md §Dependency direction
- Nothing in `lib/data` imports `lib/store` or `lib/reconcile`. Nothing under `components/` imports `lib/access`, `lib/reconcile`, `lib/store` or `lib/data/register`. The client reaches the server only over HTTP. Graph: `scripts/` asserts over `app`; `app/api` → `lib/access`, `lib/reconcile`, `lib/http`, `lib/copy`; `reconcile` → `access`, `store`, `data`, `limits`; `access` → `data`; `components/ + lib/client` → `copy`, `limits`, and HTTP-only → `app`.

## D-CONV — Consistency conventions (locked)

- source: ARCHITECTURE-SPINE.md §Consistency Conventions
- Naming — entities: PRD §3 glossary terms verbatim, in code as in copy; a synonym is a discipline violation.
- Naming — identifiers: accounts `acc-<surname>`; orders `wo-NNNN` with display `WO-2026-NNNN`; assets `m-<tag-suffix>`; KKS tags uppercase, never abbreviated; client-generated ids are UUIDs.
- Naming — files: components PascalCase inside lowercase domain directories; `lib` modules lowercase; one governed-sentence key per camelCase export.
- Data & formats: timestamps ISO-8601 UTC with `Z`; hashes lowercase hex SHA-256 over the full blob; **every size measured in base64-encoded bytes**; error envelope `{ error: snake_case, detail: "A sentence." }`; headers `X-CAP-*`.
- Closed sets: proposal states, conflict codes, reject codes, referral resolution states, state marks, queue item kinds and their emitted schema versions (AD-18), and the eight governed sentences (AD-22) are defined once in the types module; adding a member requires a sentence and a next act (EXPERIENCE.md), never code alone.
- Mutation: every write through the queue on the client and the mediating writer on the server (AD-1); records appended, never obscured.
- Errors: a refusal always carries a code, a sentence and a next act; conflicts are never auto-resolved.
- Logging & observability: response headers (AD-11), not console output.
- Config: read at the edge, fail fast; session key required under production; unresolved build id fails the build (AD-15); **no feature flag may relax an invariant**.
- Auth: stateless HMAC cookie `cap_session`, HttpOnly, SameSite=Lax, Secure in production; read in each handler, never in middleware (AD-2).
- Styling: two token files (`tokens.inherited.css` byte-identical and CI-asserted; `tokens.capture.css` overriding only what a measured floor forced); plain CSS plus CSS Modules; no CSS framework.
- Target geometry: `DESIGN.md` governs measured figures. Record-binding controls are **130 px** (the PRD's 124 px figure is retired at source: 19.1 mm on the densest approved handset); all other targets 44 px.

## D-STACK — Stack (locked; the code owns these once `package.json` exists)

- source: ARCHITECTURE-SPINE.md §Stack (verified current at 2026-08-31 sweep)
- Next.js **16.3.4** — the 16.2.x line is dead (four 16.3.x patches and four 15.5.x backports since 16.3.0, zero 16.2.x). 16.3 turns on the TypeScript CLI path by default: `next build` shells out to project-local `tsc`, type-checks the complete tsconfig project including tests, and emits neither Next's code frames nor its error rewriting.
- React / React DOM **19.2.8**.
- TypeScript **5.x** — documented deliberate exception: TypeScript 7 does not provide the JavaScript compiler API the unskippable gate's tooling depends on; revisit when it lands.
- ESLint **10.9.1** — 9 reached end of life 2026-08-06 and it gates the verify command.
- Node.js **24** (Vercel runtime).
- uqr **0.1.3** — pinned deliberately (silent SVG/XML-injection fix in `renderSVG`, no advisory).
- Playwright **1.62.1** (dev).
- Bundler: Turbopack (Next default; no `webpack()` key anywhere).
- Styling: plain CSS + CSS Modules, two token files.
- Platform: Vercel, region **`cpt1`** (Cape Town), confirmed live; **request *and response* body limit 4.5 MB** enforced by a platform 413 (AD-11); region count is plan-gated.

## D-DEPLOY — Deployment and environments (locked posture)

- source: ARCHITECTURE-SPINE.md §Structural Seed → Deployment and environments
- Three environments, one build command: local `next dev --experimental-https` (camera, `getUserMedia`, `crypto.subtle`, the service worker are secure-context gated); push to `dev` → Vercel Preview (Deployment Protection OFF, or a phone meets a Vercel login); merge to `main` → Vercel Production, `cpt1`. `CAPTURE_SESSION_KEY` is set on Production **and** Preview. Real iPhone and real Android test against both.
- **The first deployment of a new project is a production deployment**, whatever the flags — so P1 ships the governed-sentence module and the ribbon before any other surface.
- **Region and failover:** one region `cpt1`, no function-level failover (Enterprise feature not on this plan); CDN rerouting during a regional incident is documented platform behaviour, neither configured nor claimed; a second region would multiply the memory store (AD-10), not share it. **No availability target is claimed anywhere.** Re-read the live region list at P1.
- **Build identity:** the project is Git-connected (CLI deploys carry no git metadata); the build id resolves from a deployment-provided variable and the production build fails otherwise (AD-15); requires System Environment Variables access on.
- **Runtime posture:** Node runtime and dynamic rendering on every handler; no Routing Middleware (AD-2); `/api/*` never served from cache by the worker; `/sw.js` never cached by the CDN.
- **Cold start:** a cold instance serves an empty store and says so through its boot id; sessions and proposals still validate; nothing surfaces a message; only genuine eviction is surfaced.

## D-ENT — Core entities (locked shape)

- source: ARCHITECTURE-SPINE.md §Structural Seed → Core entities
- ACCOUNT mints SESSION; ACCOUNT is assigned WORK_ORDER; WORK_ORDER accrues one ORDER_CLOCK; WORK_ORDER lists ASSETs; CAPTURE is taken against ASSET and scoped to WORK_ORDER; CAPTURE yields 0..1 VERIFICATION and 0..n PROPOSAL; PROPOSAL is decided by 0..1 DECISION; DECISION binds exactly one DECISION_CONTEXT; OBSERVATION is the authored source of PROPOSAL; WORK_ORDER raises REFERRAL; REFERRAL attaches 0..1 FLAG when resolved; ASSET carries FLAGs; ASSET_REGISTER resolves a typed tag to ASSET; ACCOUNT names ATTEMPT_ENTRY.
- A referral has no proposal, no verification, no decision and no cited record. A flag records that a person raised something, not that a condition obtains, and no operation promotes one.
- Source shape (cold start, not a contract): `app/` (one page + route handlers), `components/` (client projection by domain), `lib/` (access · reconcile · store · data · copy · http · client · limits), `public/` (SW, icons), `scripts/` (build gates + device harness), `docs/`.

## D-MAP — Capability → architecture map (locked; phase → modules → governing ADs)

- source: ARCHITECTURE-SPINE.md §Capability → Architecture Map
- P1 Scaffold and honesty module — `lib/copy/`, `scripts/`, `app/layout`, `vercel.json` — AD-11, AD-12, AD-15, AD-22
- P2 Fixtures and types — `lib/data/` — AD-6 (fixture version), AD-7, AD-8, AD-15 (FR-21a), AD-19
- P3 The server seam — `app/api/**`, `lib/access/`, `lib/store/`, `lib/reconcile/`, `lib/http/` — AD-1, AD-2, AD-3, AD-4, AD-5, AD-9, AD-10, AD-11, AD-16, AD-19
- P4 Shell, gate, orders, clock — `components/{shell,gate,orders}`, `lib/client/{api,nav,store}` — AD-3, AD-9 (`already_open`, `not_open`), AD-12, AD-14, AD-17, AD-22
- P5 Capture and the decision step — `components/{asset,capture,proposals}`, `lib/client/media` — AD-5, AD-6, AD-8, AD-12, AD-13, AD-20, AD-21
- P6 Offline — `lib/client/{db,queue,online}`, `app/api/sync`, `components/sync` — AD-1, AD-9, AD-10, AD-13, AD-16, AD-17, AD-18, AD-20, AD-21
- P7 Installability and desktop frame — `public/sw.js`, `components/{pwa,frame}`, `app/manifest` — AD-12, AD-14, AD-15, AD-18, AD-21
- P8 The record handed onward, limits, docs — `lib/walk/`, `components/{walk,limits}` — AD-3, AD-6, AD-10, AD-11, AD-19, AD-23
- P9 Referrals — `lib/data/register`, `lib/access/register`, `app/api/referrals`, `components/referral` — AD-1, AD-3, AD-4, AD-7, AD-16, AD-20, AD-22, AD-23

---

## Deferred — decisions the ADR explicitly does NOT make (not locked)

- source: ARCHITECTURE-SPINE.md §Deferred
- **Service worker: hand-rolled `public/sw.js` or `@serwist/turbopack`.** The seed's premise (Serwist needs webpack) has expired; hand-rolled may still be right (~90 lines, bespoke coherent-shell precache, two open Serwist issues on this deployment shape). **Decided in P7, with a stated reason.** AD-14's zero-request assertion and AD-15's worker guard bind whichever is chosen.
- **The IndexedDB layer: hand-rolled wrapper or `idb`.** No invariant turns on it.
- **The offline test strategy.** SW fetches became routable through the browser context in Playwright 1.57; the seed's heavy fallback (stopping the server) is likely over-engineered; `setOffline` still does not reach them. A P6/P7 call. Offline-ness is proved by the harness, never assumed.
- **The values of every bounded quantity.** Owned by AD-13's module; tuned in the phase that first needs each.
- **TypeScript 6/7 migration and ESLint 10 rule-cleanup scope.** Scheduled work, not architecture.
- **The trigger for re-deciding the region posture.** Posture decided (one region); re-decided only if shared cross-instance state is ever needed.
- **The approved-device list.** Constrained by NFR-11 (documented glove mode); delivered in P7; carries NFR-10's scheduling dependency.
- **Route tree, file layout and component decomposition.** The seed's shapes are a cold start; the code owns them.

## Open questions recorded in the ADR (gaps, not deferrals; not locked)

- source: ARCHITECTURE-SPINE.md §Open questions
1. *(Resolved 2026-09-02.)* A referral proposes work; a named person raises it. No route creates or amends a work order; the negative test asserting the work-order set is unchanged is the check.
2. **The outbound size budget is bounded by the platform only.** Vercel's 4.5 MB limit covers response bodies, so `/api/sync` results and `/api/walk` payloads are capped by a headerless, sentenceless platform 413. **Decide in P6, before the batch ceiling is tuned:** what project budget sits below 4.5 MB, and the truncation semantics before it is reached. **This is a blocker on the batch ceiling.**
3. Which eviction case must be reachable in a walkthrough (PRD §8.1 Q5) is a demo-script question; codes, sentences and next acts are settled. PRD §8.1 Q3 and Q4 are documentation matters owned by the handover.

## Conflicts surfaced by the ADR itself (recorded, not decided by the ADR)

- source: ARCHITECTURE-SPINE.md §Conflicts surfaced (each is also carried in `.planning/INGEST-CONFLICTS.md`)
- **Referral-specific queue codes** (`referral_evidence_missing`, `unknown_referral`) are in the seed's type but absent from EXPERIENCE.md's closed sets. Not a spine decision; **P9 closes this with UX** — the codes gain sentences and next acts, or leave the type. AD-9's `already_open` / `not_open` are the same defect class, closed in P4.
- **The label-placement check has two answers:** PRD §9 assumes a handover mapping table suffices; EXPERIENCE.md states an automated placement check asserts it. AD-22 fixes the placement either way; which artefact proves it is owned by the handover; AD-15's enumeration currently implies the PRD's answer.
- **The record-binding target figure:** DESIGN.md governs — 130 px; the PRD's 124 px is stale (the current PRD text already carries 130).
- **Capture extends the inherited field-technician ceiling** as a recorded extension, not an override: a field technician may assert an observation against an asset in a work order assigned to them, with retrievable attribution (AD-3, AD-6) replacing the second signature. Narrower than it reads because `placed_by`/`confirmed_by` governs spatial anchor placement, which Capture does not do. Decided with the user 2026-08-31; **the parent programme should ratify before production.**
- **The seed's version pins and its `persist()` claim are superseded** — pins by *Stack*, the browser-capability claim by AD-12.
