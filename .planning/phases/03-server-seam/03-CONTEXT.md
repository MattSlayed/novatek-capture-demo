# Phase 3: Server seam - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 3` — three gray areas discussed with the user (sync and walk depth, clock gating and the close conflict, proof artefacts and validation strictness); a fourth (the bounded values) left to Claude's discretion. Everything locked upstream is cited; every reconciliation of an upstream gap is marked *[reconciled here]*.

<domain>
## Phase Boundary

Every enforced claim is enforced server-side and reproducible from a shell. Phase 3 delivers the whole server seam and nothing a phone renders:

- `app/api/**` — every route the seed's API contracts name except `POST /api/referrals` (P9): `session` (POST/GET/DELETE), `orders`, `orders/[id]`, `orders/[id]/open`, `orders/[id]/close`, `verify`, `captures`, `decisions`, `sync`, `hours` (GET only; POST → 405), `walk/[orderId]`, `health` (GET/HEAD). Every handler: `runtime = "nodejs"`, `dynamic = "force-dynamic"`, params awaited, cookie read in the handler, nothing identity-bearing read from a body.
- `lib/session/cookie.ts` — mint and read the stateless HMAC `cap_session` cookie under `CAPTURE_SESSION_KEY`; lazy key resolution; refuse in production without a key.
- `lib/attribution` — the one function that derives the acting account from the session; every actor field on every record is assigned from its return (AD-3).
- `lib/access/scope.ts` — `ordersFor(account)`, `orderOwned(account, id)`, `assetInOrder(order, assetId)`; the only place authorisation is decided (AD-2). No `proxy.ts`, no middleware.
- `lib/store/memory.ts` — module-level, per-instance, TTL-swept, capped, `BOOT_ID`-stamped; oldest-first eviction within the offending account first (AD-10).
- `lib/reconcile/validate.ts` and `lib/reconcile/apply.ts` — the one item envelope (AD-16) and the one writer (AD-1) for the online routes and `/api/sync` alike, check order session → ownership → idempotency → shape → state, refusals written as retained attempts, one canonicaliser for the idempotency hash (AD-9).
- `lib/http/respond.ts` — the only response constructors; `Cache-Control: no-store`, `X-CAP-Store`, `X-CAP-Instance` on every response; `{ error, detail }` on every error; the header table marking each `X-CAP-*` universal or success-only (AD-11).
- `lib/verify/authored.ts` and `lib/proposals/derive.ts` — the authored match and the authored proposals declared over exactly `(assetId, fixtureSet)` with the capture payload unreachable (AD-8); `Proposal.id` as the HMAC over account · envelope client id · observation id (AD-5); the `ObservationProvenance` tuple composed from the cited record.
- `lib/walk/payload.ts` — the full `WalkPayload` for one order (D-03 below).
- `lib/limits` — every bounded value first needed here, one export each, read by both sides (AD-13).
- The build rules joining `npm run verify`: single-writer rule, actor-field rule, fixture-inputs rule, named-package ban, accepted-field enumerations (FR-10, FR-61, AD-20), the non-bypassability document check (D-12), and the route-test step (D-09). The middleware-absence assertion already exists in `scripts/check-structure.mjs` (Phase 1 D-05).
- `docs/analysis/single-writer-non-bypassability.md` — every route, interface and configuration value enumerated (FR-24, FR-57, AD-19).
- The proofs: a node route suite inside `verify` and the reviewer-facing curl script A–H, with its output against a deployment recorded in `docs/analysis/`.
- `types.ts` gains `not_open` (D-06) and the segment fields FR-11 retains (Claude's discretion); no other fixture content changes. The claims audit stays clean over every new string under `lib/` and `app/`.

Requirements delivered: REQ-FR-1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 21, 23, 24, 27, 57, 61, NFR-F1. Split bindings (REQUIREMENTS.md): FR-7/8/9 server half here, client half P4; FR-11 clamp here, exercised offline in P6; FR-15/16/17/21 server here, client P5; FR-24 here and re-asserted every phase.

Not in this phase: any component or screen; `lib/client/*`; `POST /api/referrals`, `lib/access/register.ts` and the `referral` kind's behaviour (P9); the client queue, the connectivity probe and the client outbound budget (P6); the walk screen, the Limits disposition table and the handover (P8); `already_open` (P4, AD-9).

The repository currently holds the Phase 1 shell and gate and the Phase 2 fixtures: `lib/copy/governed.ts`, `lib/data/*` (types, plant subset, three artisans, five orders, twelve observations, `FIXTURE_VERSION`, the server-only register), the ribbon and Limits surface, and the eighteen-step `scripts/verify.mjs`. No route exists yet; `app/api/` does not exist.

</domain>

<decisions>
## Implementation Decisions

### The sync route and the walk route land whole (AD-1, AD-9, AD-16, D-MAP; curl E and F)
- **D-01:** *[reconciled here]* `POST /api/sync` ships complete in this phase, not as a stub: the `{ items: SyncItem[] }` envelope parser, per-item `SyncItemResult`s, HTTP 200 whenever the envelope parsed, and the four `X-CAP-Sync-{Recorded,Duplicate,Conflict,Rejected}` counters, with `applyItem` handling every kind that exists by P3 (`order_open`, `order_close`, `capture`, `decision`; `referral` is refused `unknown_kind` until P9 supplies it). Phase 6 adds only the client queue, the probe and the conflict cards; it does not reopen the route. Reason: curl F (`duplicate`, `already_recorded_differently`) and FR-6's byte-identity on the sync route are this phase's success criteria, and AD-1 says one writer serves both paths from the first commit.
- **D-02:** *[reconciled here]* A server-side batch ceiling lands now: `lib/limits` exports the sync route's item ceiling and encoded-byte ceiling (starting from the seed's 50 items / 3 MB, tuned here), and the route returns `413 batch_too_large` with a sentence above either. Phase 6's open question (the outbound budget below the platform 4.5 MB and its truncation semantics) decides the *client's* budget, a separate named export strictly below the server ceiling, exactly as AD-13 says a client target and a server ceiling are two exports. This phase does not decide the client budget.
- **D-03:** *[reconciled here]* `GET /api/walk/[orderId]` returns the full `WalkPayload` shape already fixed in `lib/data/types.ts`, populated by `lib/walk/payload.ts` written here: `schema`, `issued_at`, the store block (kind, instance, `ttl_s`, the `memoryStore` governed sentence as `statement`), `account`, `order`, `clock`, per-asset `verification`, `captures` with `thumb_present` and `audio_left_device: false`, `candidate_facts` with `accepted_by`/`accepted_at`/`arrived_via`, `rejected`, `open`, the redaction fields (`ran: false` and the `noRedaction` sentence), and `referrals: []` until P9. The `X-CAP-Walk-Facts: n` and `X-CAP-Redaction: none` headers ship with it. D-MAP places `lib/walk/` in P8; P8 adds the client screen, the disposition table and the handover, not the route. Reason: curl E is a P3 gate and the type is locked, so a partial payload would be rework by construction.
- **D-04:** FR-11's clamp is proved twice: a direct test of `applyItem` with a queued-flagged `order_open` (Epic 1.7's unit test), and a route test that posts the same item through `POST /api/sync` and reads the resulting segment back on `GET /api/hours` with `source: "device_reconciled"`, the device-claimed start and the measured offset both present. The end-to-end proof rides D-09's route suite; Phase 6's harness re-proves it from a real queue.

### The clock (FR-7–11, FR-58; AD-3, AD-9; EXPERIENCE.md §State Patterns)
- **D-05:** *[reconciled here]* The clock gates the record. A verify, an evidence capture or a decision against an order whose clock has no running segment is refused `409 order_closed` with EXPERIENCE.md's sentence ("The order was closed before this arrived. Nothing was bound.") and Discard as the only act. No route closes a work order and every fixture order is `assigned`, so the clock is the only closed state that exists; this decision gives `order_closed` a reachable trigger (close, then capture) the curl suite and the P6 conflict card can both show. `WorkOrder.status` is fixture text and is not consulted by any access or state decision.
- **D-06:** *[reconciled here]* `not_open` joins `ConflictCode` in this phase, with its sentence and next act written here (Epic 1.6 already marks it *[written here]*), because FR-8 is a P3 requirement and the server must emit it: closing a closed or never-opened order returns `409 not_open`. `already_open` stays on AD-9's stated P4 schedule: in P3 a second open of a running order returns `200 { clock }` with no new segment on the online path (FR-7) and `duplicate` on `/api/sync`, whichever `client_id` it arrives under; no new code is introduced for it. The note in `types.ts` is amended to record that `not_open` landed in P3 and only `already_open` remains for P4. The sentence for `not_open` is a conflict sentence, not a governed sentence: it lives beside the code (module at Claude's discretion), passes the claims audit and the eight voice rules, and `check-governed` does not govern it.
- **D-07:** *[reconciled here]* The device's last server contact (FR-11) is a per-account `last_contact` value stamped in `lib/store` by every authenticated request, derived from the server's own clock and taking no input from the body (AD-3). The clamp floor for a queued `order_open` is the later of the session's `issued_at` and that value; after an instance change or a TTL sweep the value is absent and the floor is `issued_at` alone, silently, as AD-10 already permits for any cold start. The cookie is never re-issued to carry it; not-found responses stay byte-identical because nothing about the session changes on a response. Both the device-claimed start and the server-measured offset are retained on the segment; neither replaces the other.
- **D-08:** A running clock segment survives the end of a session. `DELETE /api/session` and cookie expiry take no implicit act on the record: the segment stays open, `elapsed_s` keeps accruing, and it ends only when an explicit `order_close` arrives from the same account. The clock is keyed by order and account, not by session id, so re-entry as the same persona resumes it. The hours route shows exactly this; the Limits screen's "no route to contest a segment" limitation (P4) covers the consequence.

### Proof artefacts and validation strictness (AD-4, AD-15, FR-6, FR-24, FR-57; roadmap success criteria 1–3)
- **D-09:** *[reconciled here]* The proofs live in two places. (a) A node route suite (script name at Claude's discretion) joins `scripts/verify.mjs` STEPS after `next-build`: it starts the production server through `scripts/lib/server.mjs`, runs the curl suite's A–H assertions and the negative test sets of FR-4, FR-6, FR-23, FR-24 and FR-27 over `fetch`, and tears the server down. It needs no browser, so unlike the axe scan it carries no environment exclusion and runs on Vercel's build as well as in the GitHub `verify` job; it ships with a fixture proving it fails (Phase 1 D-23). (b) `scripts/curl-suite.sh` (name at Claude's discretion): the seed's A–H as plain `curl` against a `B=` base URL, labels A–H kept, printing pass/fail per check, that a reviewer runs by hand; its output against the Preview or Production deployment is recorded in `docs/analysis/` with the date and the build id as this phase's evidence. Phase 8's hostile script (SM-1) grows from both, not from scratch.
- **D-10:** *[reconciled here]* Shape validation in `lib/reconcile/validate.ts` is strict per D-CONV, and the curl suite is rewritten to match: `sha256` is exactly 64 lowercase hex characters; every `client_id` is UUID-shaped; timestamps are ISO-8601 UTC with `Z`; `bytes` is a positive integer; `mime` is from a small allowed list (photo: JPEG; voice: the containers the recorder can produce); `duration_ms` is present only on a voice capture; `schema_version` is in the emitted set for its kind. A refusal is `422 bad_shape` whose sentence names the offending field. The seed's `"sha256":"00","bytes":1` is retired; the suite uses real values (the SHA-256 of an empty file is fine). Every write route is enumerated against its accepted fields, and a field outside the enumeration — an actor field above all — is dropped at parse and appears nowhere (AD-3, AD-20).
- **D-11:** *[reconciled here]* FR-6's byte-identity test compares, for an unowned id and a fabricated id on every route (read, open, close, capture, decide, sync): the status, the exact body bytes, and every response header except a short exclusion list of per-response or platform-added names (`date`, `connection`, `keep-alive`, `server`, `x-vercel-*`, `etag` if the platform sets one), each entry carrying a one-line reason in the test. Anything not on the list must match, so a route-specific `X-CAP-*` counter leaking onto one not-found path fails the build, which is AD-4's rule that not-found carries the universal header set only. The same comparator serves FR-27 (`unknown_proposal` for an unknown and an unowned proposal id).
- **D-12:** *[reconciled here]* `docs/analysis/single-writer-non-bypassability.md` is written by hand, in the voice the handover needs, enumerating every route, the reconciliation function, the fixture module, every `process.env` read, every feature flag, build mode and fixture selection, and showing for each that it produces no finding and no record state outside `{ open, accepted, rejected, superseded }`. A structure check in `verify` (a new script or an extension of `check-structure.mjs`, at Claude's discretion) fails when any `app/api/**/route.ts`, any `process.env.<NAME>` read under `app/`, `lib/` or `next.config.ts`, or any module that writes to the store is absent from the document by path or name. Every later phase that adds a route or an env read must extend the document or the build fails, which is how AD-19's "enumeration produced by AD-15's command" is honoured without generating prose.

### Claude's Discretion
- **The bounded values first needed here** (AD-13; the fourth gray area, not discussed): adopt the seed's figures as the tuned P3 starting values and export each once from `lib/limits` — thumbnail server hard cap 64 KB and client target 40 KB, both in base64-encoded bytes; per-account caps 200 captures, 200 decisions, 20 clock segments, 500 `seen` entries; global cap 5 000 objects; TTL 6 h; cookie `Max-Age` 43 200 s; the online clock-offset window 60 s; the queued-item skew tolerance (future 60 min, floor `issued_at` − 5 min) as `clock_skew`'s bounds; the sync server ceilings (D-02). Which media quantities the server refuses `media_too_large` on is Claude's call: the thumbnail's encoded bytes always; a declared-original `bytes` ceiling and a `duration_ms` ceiling if the server needs them now, in which case the note-duration export lands here and P5 may re-tune it. No planning document restates a value.
- Whether `FIXTURE_VERSION` is re-exported from `lib/limits` for a single client import (Phase 2 D-15).
- Module and file names: the seed's tree (`lib/session/cookie.ts`, `lib/access/scope.ts`, `lib/store/memory.ts`, `lib/reconcile/{validate,apply}.ts`, `lib/http/respond.ts`, `lib/walk/payload.ts`) plus Epic 1.3's `lib/attribution` and Epic 2.7's `lib/verify/authored.ts` and `lib/proposals/derive.ts` are the defaults; the code owns them.
- The development session key: the sibling's `manifest.ts` pattern (a committed development fallback, refusal to serve under production without `CAPTURE_SESSION_KEY`, resolved lazily on first use so `next build` never throws) is the expected mechanism; whether the local `verify` run sets a throwaway key in the environment instead is Claude's call, provided production refuses.
- How `store_evicted` is detected given AD-5 (validation reads nothing from the store): a bounded per-account eviction record consulted only after the HMAC validates, or an equivalent; whether it is reachable in a walkthrough is P8's question (PRD Q5).
- The canonicaliser's enumerated field subset per item kind; the attempt entry's shape; where a refusal at session (no acting account) is recorded, given FR-60's entries name the acting account and AD-1 says refusals do not escape the writer.
- Extending the clock segment type in `types.ts` with the device-claimed start and the measured offset (FR-11 retains both) — shape is not content, so the fixture hash (Phase 2 D-14) is unaffected.
- The `/api/health` `counts` shape; the route suite's port and startup probe; the exact exclusion-list entries under D-11; whether the route suite is one `node --test` file riding the existing `fixture-suite` glob or its own STEPS entry (it must run after `next-build`, so a separate entry is the likely shape).
- Composing `ObservationProvenance` from a cited record's own `Provenance` with `confidence: null` and `extractor: "authored"`, and the `source_label` a proposal card will name.
- How the accepted-field enumerations, the single-writer rule and the actor-field rule are asserted: `scripts/check-register-isolation.mjs`'s import-graph walk and `check-structure.mjs`'s source assertions are the patterns; each rule ships with a failing fixture.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The locked architecture (precedence 0)
- `docs/planning-artifacts/architecture/architecture-novatek-capture-demo-2026-09-02/ARCHITECTURE-SPINE.md` — §AD-1 (one write path; check order; refusals retained), §AD-2 (the accessor; no middleware), §AD-3 (one attribution producer; server-derived facts), §AD-4 (uniform not-found; universal header set only), §AD-5 (derived proposal id; validation reads nothing from the store), §AD-9 (idempotency key and canonicaliser; open/close idempotent by state), §AD-10 (memory store; cold start silent; only eviction surfaced), §AD-11 (the responder; header table; the 413 exception), §AD-13 (bounded quantities), §AD-16 (one envelope, one client id), §AD-19 (no path creates a finding; the enumeration), §AD-20 (what leaves the device), §Dependency direction, §Consistency Conventions, §Capability → Architecture Map (P3 row)
- `.planning/intel/decisions.md` — the same ADs extracted, plus D-CONV (id shapes, ISO-8601 UTC `Z`, base64-encoded sizes, error envelope, `X-CAP-*`), D-DEP, D-MAP (P3 row: `app/api/**`, `lib/access/`, `lib/store/`, `lib/reconcile/`, `lib/http/` — AD-1, 2, 3, 4, 5, 9, 10, 11, 16, 19)
- `.planning/intel/constraints.md` — the C-numbered constraints the seam must hold

### Requirements and the phase
- `.planning/ROADMAP.md` §Phase 3 — goal, five success criteria (curl A–H; the negative sets; headers, envelope and the build rules; the writer and check order; `lib/limits` and the clamp), scheduled closures, the `bmad-code-review` gate
- `.planning/REQUIREMENTS.md` — REQ-FR-1–11, 15–19, 21, 23, 24, 27, 57, 61, NFR-F1 with their verification methods; the split-binding notes at the foot of §Traceability
- `docs/planning-artifacts/epics.md` — Story 1.3 (lines 627–673: session, responder, attribution, health), 1.4 (674–723: the seam and the negative set), 1.5 (724–754: order detail; not-found byte-identity), 1.6 (755–806: the envelope, the writer, the store, open/close, `not_open` [written here]), 1.7 (807–834: hours; the FR-11 clamp), 1.8 (835–863: the gate), 2.3 (946–984: authored verification), 2.5 (1017–1052: proposals and their derived ids), 2.6 (1053–1109: decisions; `unknown_proposal` before state; bound context), 2.7 (1110–1147: retention; the non-bypassability document; the build rules)
- `docs/planning-artifacts/prds/prd-novatek-capture-demo-2026-09-01/prd.md` §3 (vocabulary), §4.1–4.4 (the requirements as written), §6.3 (no-finding evidence)

### The seed (precedence 5; authoritative for routes, shapes and the suite)
- `docs/CAPTURE-PLAN-SEED.md` §Repo file tree lines 119–197 (`app/api/**`, `lib/{session,access,store,reconcile,http,walk}`), §API contracts lines 236–260 (the route table: bodies, statuses, error codes, headers; the writer's check order; the memory-store caps), §Offline and sync semantics lines 262–284 (the outcome table `applyItem` implements; clock-skew bounds), §Verification lines 344–369 (the curl suite A–H — to be rewritten under D-10), §Risks and gotchas lines 370–389 (async request APIs, params awaited, Node runtime, no `proxy.ts`)
- `.planning/intel/context.md` — Topic 9 (API contracts), Topic 10 (offline and sync semantics), Topic 15 (the curl suite as the P3 gate), Topic 16 (risks and gotchas)

### Design and experience contract (precedence 1)
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/EXPERIENCE.md` §State Patterns — *Every conflict and reject code* (the sentences and next acts for `order_not_found`, `order_closed`, `asset_not_in_order`, `account_mismatch`, `proposal_superseded`, `already_recorded_differently`, `clock_skew`, `bad_shape`, `media_too_large`, `unknown_proposal`, `store_evicted`; `not_open` is written here under D-06 in the same voice), §Voice and Tone (the eight rules every new sentence obeys)

### Phase 1 and Phase 2 artefacts this phase builds on
- `.planning/phases/01-scaffold-conventions/01-CONTEXT.md` — D-03 (build id and env resolution), D-04 (`vercel.json` headers incl. `/api/(.*)` no-store), D-05 (the structure check; middleware absence), D-07 (the 413 sentence in `governed.ts`), D-20–D-23 (the gate's shape; every check ships a failing fixture; the D-22 Vercel/GitHub split)
- `.planning/phases/02-fixtures-types/02-CONTEXT.md` — D-15 (`FIXTURE_VERSION` location), D-16/D-17 (register server-only; isolation rule), D-18–D-20 (the entity types; closed sets defined once; `rbac_tier` display-only)
- `lib/data/types.ts` — `Session`, `WorkOrder`, `OrderAsset` (`observation_ids` stripped), `Capture`, `VerificationResult`, `Proposal`, `Decision`, `OrderClock`, `SyncItem`, `SyncItemResult`, `WalkPayload`, `ConflictCode`, `RejectCode`, `SyncItemKind`, `SYNC_ITEM_SCHEMA_VERSIONS`
- `lib/data/artisans.ts`, `lib/data/orders.ts`, `lib/data/plant.ts`, `lib/data/observations.ts`, `lib/data/fixtures.ts` — what the accessor, the authored module and the walk payload read; `lib/data/register.ts` is not imported in this phase
- `lib/copy/governed.ts` — `memoryStore`, `noRedaction`, `authoredVerification`, `authoredProposals` keys the routes and the walk payload reference; the named 413 sentence
- `scripts/verify.mjs` — `STEPS`, where the new rules and the route-test step join; `scripts/lib/server.mjs` — `startServer`/`stopServer` for the production server; `scripts/lib/fixtures.mjs` — the fixture-test helper; `scripts/check-structure.mjs` and `scripts/check-register-isolation.mjs` — the source-assertion and import-graph patterns the new rules reuse; `scripts/check-wcag.mjs` — the existing build-then-start-then-assert shape
- `docs/analysis/` — where the non-bypassability document and the recorded curl output land beside `provenance-check.md`

### The sibling repository (patterns, not copies)
- `../ipv-demo/lib/rbac/manifest.ts` — HMAC signing with lazy key resolution and refuse-in-production without a key (the seed's named pattern for `cookie.ts`)
- `../ipv-demo/lib/decision/store.ts` — module-level Map, oldest-first eviction by insertion order, caller binding before state comparison (the seed's named pattern for `memory.ts` and the `unknown_proposal`-before-state ordering)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/server.mjs`: starts and stops a `next start` process with process-group teardown and a heartbeat liveness proof, hardened across GitHub Actions and Vercel's build container (Phase 1); the route suite (D-09) starts the server through it.
- `scripts/check-wcag.mjs`: the build-then-start-then-assert-then-teardown shape the route suite copies, minus the browser and minus the Vercel exclusion marker.
- `scripts/check-register-isolation.mjs`: an import-graph walk over source plus a bundle sentinel; the single-writer rule (nothing but `apply.ts` writes to the store) and the actor-field rule (nothing but `lib/attribution` assigns an actor) are the same shape.
- `scripts/check-structure.mjs`: source-inspection assertions with a fixture test; the non-bypassability document check (D-12) and the middleware-absence assertion (already present) belong here or beside it.
- `scripts/lib/fixtures.mjs`: runs a check against a temporary tree and asserts its exit code; every new rule's failing fixture uses it.
- `lib/data/*`: the accessor reads `artisans.ts` and `orders.ts`; the authored module reads `observations.ts`, `plant.ts` and `fixtures.ts`; `types.ts` already carries every entity and closed set the routes emit.
- `lib/copy/governed.ts`: `GOVERNED` and `GovernedKey`; the walk payload's `statement` fields and `VerificationResult.label` resolve through it, never restated.
- `../ipv-demo/lib/rbac/manifest.ts` and `../ipv-demo/lib/decision/store.ts`: the cookie-key and memory-store patterns; the sibling is absent on Vercel, so nothing is imported from it.

### Established Patterns
- Every check fails rather than warns, is not skippable, joins `verify.mjs` STEPS, and ships with a fixture proving it exits non-zero (Phase 1 D-20, D-23). The route suite and every new rule inherit this.
- The axe scan is excluded from Vercel's build by an explicit environment marker because Chromium cannot be installed there (Phase 1 D-22); the route suite needs no browser and carries no such marker.
- The claims audit sweeps `app/`, `components/` and `lib/` as text, comments included: every conflict sentence, every `detail` string and every code comment written here passes the inherited register plus the seed's additions, and the eight voice rules.
- `check-governed` fails on any governed sentence appearing as a literal outside `governed.ts`: the walk payload and the verification result import the sentence, never quote it.
- Bounded values are one export each in `lib/limits`, read by both sides; planning documents do not restate them (AD-13).
- Planning files under `.planning/` are CRLF UTF-8; edit with Node or the Edit tool, never `perl -pi`.
- Commits carry the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer; `gsd-sdk query commit` strips multi-line trailers, so executors verify and amend.
- `tsconfig.json` has `allowImportingTsExtensions` because `register.ts` imports `plant.ts` by value with its `.ts` extension (Phase 2); new `lib/` modules importing fixture values follow the same form.

### Integration Points
- `app/api/**` is new; `next typegen` in STEPS gains real route types; `vercel.json` already sends `Cache-Control: no-store` on `/api/(.*)` and the responder stamps it again so the header holds under `next start` too.
- `scripts/verify.mjs` STEPS: the single-writer, actor-field, fixture-inputs, named-package and accepted-field rules and the non-bypassability check are source-side entries before `next-build`; the route suite is a new entry after `next-build`.
- `lib/data/types.ts` gains `not_open` in `ConflictCode` and `CONFLICT_CODES` (D-06) and the segment fields FR-11 retains; the Phase 2 note about P4 is amended; `check-fixture-hash` is unaffected because `types.ts` is outside the hash.
- `lib/copy/governed.ts` is unchanged: no new governed sentence is introduced; conflict and refusal sentences live beside their codes.
- `docs/analysis/` gains the non-bypassability document and the recorded curl output; `docs/analysis/scheduled-work.md` is unchanged.
- P4's client reads `GET /api/orders`, `GET /api/orders/[id]`, the open/close routes and `/api/hours` exactly as shaped here; P5 posts to `/api/verify`, `/api/captures` and `/api/decisions`; P6 posts to `/api/sync` and probes `/api/health`; P8 reads `/api/walk/[orderId]`; P9 adds `/api/referrals` and the `referral` kind to `applyItem`.

</code_context>

<specifics>
## Specific Ideas

- The curl suite keeps the seed's A–H labels so the roadmap's success criterion 1 reads one-to-one against the script; only the bodies change under D-10 (a real 64-hex `sha256`, UUID `client_id`s).
- Reachable `order_closed`: the demonstration is close the clock, post a capture, read `409 order_closed`, "The order was closed before this arrived. Nothing was bound."
- `not_open`'s sentence follows the conflict-table voice: mechanism, the actor named, a next act (open the order, then close it), no euphemism.
- Not-found carries the universal header set only; success-only counters (`X-CAP-Order`, `X-CAP-Clock`, `X-CAP-Proposals`, `X-CAP-Walk-Facts` and the rest) never appear on a 404, and D-11's comparator is what proves it.
- The recorded curl output in `docs/analysis/` names the deployment URL, the build id and the date, the way `vercel-regions.md` and `deployment-gate.md` do.

</specifics>

<deferred>
## Deferred Ideas

- `already_open` with its sentence and next act — P4, per AD-9's schedule (D-06 keeps it there).
- The client's outbound batch budget below the server ceiling, and truncation semantics before the platform 4.5 MB limit — P6 (the recorded open question; a blocker on the client value, not on D-02's server ceiling).
- `POST /api/referrals`, `lib/access/register.ts`, the `referral` kind in `applyItem`, and the sentences for `referral_evidence_missing` and `unknown_referral` — P9; `applyItem` refuses the kind `unknown_kind` until then.
- The walk screen, the Limits disposition table with the live instance id, and the handover's sentence-to-location table — P8 (the route and payload land here).
- Whether an eviction case (`store_evicted`) must be reachable in a walkthrough — P8 (PRD Q5).
- Packaging the negative sets into one hostile script that prints pass/fail against the public URL — P8 (SM-1); it grows from D-09's two artefacts.
- Re-issuing the cookie with a server-stamped last-seen value — declined (D-07); revisit only if a cross-instance floor is ever required, which AD-10 says it is not.
- Closing a running segment implicitly at session end — declined (D-08).

</deferred>

---

*Phase: 03-server-seam*
*Context gathered: 2026-09-17*
