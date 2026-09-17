# Phase 3: Server seam - Research

**Researched:** 2026-09-17
**Domain:** Next.js 16.3.4 App Router Route Handlers on Vercel (Node runtime), stateless HMAC session auth, single-writer reconciliation, in-memory per-instance store
**Confidence:** HIGH (core mechanics verified empirically against this exact repository/version; a handful of live-deployment-only facts flagged LOW and logged below)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### The sync route and the walk route land whole (AD-1, AD-9, AD-16, D-MAP; curl E and F)
- **D-01:** *[reconciled here]* `POST /api/sync` ships complete in this phase, not as a stub: the `{ items: SyncItem[] }` envelope parser, per-item `SyncItemResult`s, HTTP 200 whenever the envelope parsed, and the four `X-CAP-Sync-{Recorded,Duplicate,Conflict,Rejected}` counters, with `applyItem` handling every kind that exists by P3 (`order_open`, `order_close`, `capture`, `decision`; `referral` is refused `unknown_kind` until P9 supplies it). Phase 6 adds only the client queue, the probe and the conflict cards; it does not reopen the route. Reason: curl F (`duplicate`, `already_recorded_differently`) and FR-6's byte-identity on the sync route are this phase's success criteria, and AD-1 says one writer serves both paths from the first commit.
- **D-02:** *[reconciled here]* A server-side batch ceiling lands now: `lib/limits` exports the sync route's item ceiling and encoded-byte ceiling (starting from the seed's 50 items / 3 MB, tuned here), and the route returns `413 batch_too_large` with a sentence above either. Phase 6's open question (the outbound budget below the platform 4.5 MB and its truncation semantics) decides the *client's* budget, a separate named export strictly below the server ceiling, exactly as AD-13 says a client target and a server ceiling are two exports. This phase does not decide the client budget.
- **D-03:** *[reconciled here]* `GET /api/walk/[orderId]` returns the full `WalkPayload` shape already fixed in `lib/data/types.ts`, populated by `lib/walk/payload.ts` written here: `schema`, `issued_at`, the store block (kind, instance, `ttl_s`, the `memoryStore` governed sentence as `statement`), `account`, `order`, `clock`, per-asset `verification`, `captures` with `thumb_present` and `audio_left_device: false`, `candidate_facts` with `accepted_by`/`accepted_at`/`arrived_via`, `rejected`, `open`, the redaction fields (`ran: false` and the `noRedaction` sentence), and `referrals: []` until P9. The `X-CAP-Walk-Facts: n` and `X-CAP-Redaction: none` headers ship with it. D-MAP places `lib/walk/` in P8; P8 adds the client screen, the disposition table and the handover, not the route. Reason: curl E is a P3 gate and the type is locked, so a partial payload would be rework by construction.
- **D-04:** FR-11's clamp is proved twice: a direct test of `applyItem` with a queued-flagged `order_open` (Epic 1.7's unit test), and a route test that posts the same item through `POST /api/sync` and reads the resulting segment back on `GET /api/hours` with `source: "device_reconciled"`, the device-claimed start and the measured offset both present. The end-to-end proof rides D-09's route suite; Phase 6's harness re-proves it from a real queue.

#### The clock (FR-7–11, FR-58; AD-3, AD-9; EXPERIENCE.md §State Patterns)
- **D-05:** *[reconciled here]* The clock gates the record. A verify, an evidence capture or a decision against an order whose clock has no running segment is refused `409 order_closed` with EXPERIENCE.md's sentence ("The order was closed before this arrived. Nothing was bound.") and Discard as the only act. No route closes a work order and every fixture order is `assigned`, so the clock is the only closed state that exists; this decision gives `order_closed` a reachable trigger (close, then capture) the curl suite and the P6 conflict card can both show. `WorkOrder.status` is fixture text and is not consulted by any access or state decision.
- **D-06:** *[reconciled here]* `not_open` joins `ConflictCode` in this phase, with its sentence and next act written here (Epic 1.6 already marks it *[written here]*), because FR-8 is a P3 requirement and the server must emit it: closing a closed or never-opened order returns `409 not_open`. `already_open` stays on AD-9's stated P4 schedule: in P3 a second open of a running order returns `200 { clock }` with no new segment on the online path (FR-7) and `duplicate` on `/api/sync`, whichever `client_id` it arrives under; no new code is introduced for it. The note in `types.ts` is amended to record that `not_open` landed in P3 and only `already_open` remains for P4. The sentence for `not_open` is a conflict sentence, not a governed sentence: it lives beside the code (module at Claude's discretion), passes the claims audit and the eight voice rules, and `check-governed` does not govern it.
- **D-07:** *[reconciled here]* The device's last server contact (FR-11) is a per-account `last_contact` value stamped in `lib/store` by every authenticated request, derived from the server's own clock and taking no input from the body (AD-3). The clamp floor for a queued `order_open` is the later of the session's `issued_at` and that value; after an instance change or a TTL sweep the value is absent and the floor is `issued_at` alone, silently, as AD-10 already permits for any cold start. The cookie is never re-issued to carry it; not-found responses stay byte-identical because nothing about the session changes on a response. Both the device-claimed start and the server-measured offset are retained on the segment; neither replaces the other.
- **D-08:** A running clock segment survives the end of a session. `DELETE /api/session` and cookie expiry take no implicit act on the record: the segment stays open, `elapsed_s` keeps accruing, and it ends only when an explicit `order_close` arrives from the same account. The clock is keyed by order and account, not by session id, so re-entry as the same persona resumes it. The hours route shows exactly this; the Limits screen's "no route to contest a segment" limitation (P4) covers the consequence.

#### Proof artefacts and validation strictness (AD-4, AD-15, FR-6, FR-24, FR-57; roadmap success criteria 1–3)
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

### Deferred Ideas (OUT OF SCOPE)
- `already_open` with its sentence and next act — P4, per AD-9's schedule (D-06 keeps it there).
- The client's outbound batch budget below the server ceiling, and truncation semantics before the platform 4.5 MB limit — P6 (the recorded open question; a blocker on the client value, not on D-02's server ceiling).
- `POST /api/referrals`, `lib/access/register.ts`, the `referral` kind in `applyItem`, and the sentences for `referral_evidence_missing` and `unknown_referral` — P9; `applyItem` refuses the kind `unknown_kind` until then.
- The walk screen, the Limits disposition table with the live instance id, and the handover's sentence-to-location table — P8 (the route and payload land here).
- Whether an eviction case (`store_evicted`) must be reachable in a walkthrough — P8 (PRD Q5).
- Packaging the negative sets into one hostile script that prints pass/fail against the public URL — P8 (SM-1); it grows from D-09's two artefacts.
- Re-issuing the cookie with a server-stamped last-seen value — declined (D-07); revisit only if a cross-instance floor is ever required, which AD-10 says it is not.
- Closing a running segment implicitly at session end — declined (D-08).

**Also locked (Phase Boundary, not re-quoted in full — see CONTEXT.md `<domain>`):** the complete file list this phase delivers (`app/api/**` except `POST /api/referrals`; `lib/session/cookie.ts`; `lib/attribution`; `lib/access/scope.ts`; `lib/store/memory.ts`; `lib/reconcile/{validate,apply}.ts`; `lib/http/respond.ts`; `lib/verify/authored.ts` and `lib/proposals/derive.ts`; `lib/walk/payload.ts`; `lib/limits`; the six new build rules; `docs/analysis/single-writer-non-bypassability.md`; the two proof artefacts; `types.ts`'s `not_open` and segment-field additions) and what is explicitly **not** in this phase (any component/screen, `lib/client/*`, `POST /api/referrals`, `lib/access/register.ts`, the `referral` kind's behaviour, the client queue/probe/outbound budget, the walk screen/Limits table/handover, `already_open`).
</user_constraints>

## Summary

Phase 3 builds seventeen route handlers and the `lib/{session,access,store,reconcile,http,walk,attribution,verify,proposals}` modules behind them, all as hand-rolled Next.js 16.3.4 code with zero new npm dependencies. The mechanics are well-precedented in this repository already: the sibling `../ipv-demo` supplies the HMAC-cookie and module-level-Map patterns verbatim, and `scripts/check-structure.mjs` / `scripts/check-register-isolation.mjs` supply the exact shape for the new build-time source assertions (single-writer rule, actor-field rule, fixture-inputs rule, named-package ban, accepted-field enumerations, non-bypassability check).

**The one finding that changes the plan's mechanics:** this project's `next.config.ts` already has `cacheComponents: true` (locked in Phase 1, itself asserted by a build rule). Empirically verified against this exact repo (Next.js 16.3.4) this session: exporting `export const runtime = "nodejs"` or `export const dynamic = "force-dynamic"` from **any** Route Handler under `cacheComponents: true` is a **hard build error** — `next build` fails with "Route segment config 'dynamic'/'runtime' is not compatible with `nextConfig.cacheComponents`. Please remove it." This directly contradicts the literal text repeated throughout CONTEXT.md, the seed, and epics.md ("Every handler: `runtime=\"nodejs\"`, `dynamic=\"force-dynamic\"`"). The *intent* behind that text — Node runtime, always executed fresh, never cached — is still fully achievable, and is simpler than the literal text: Route Handlers under `cacheComponents: true` are dynamic (`ƒ`, per-request, Node runtime) automatically the moment they call a Next.js Dynamic API (`request.cookies`, `cookies()`, `headers()`) or resolve a dynamic route segment (`[id]`). Every route in this phase does one or both of those already, because AD-2 requires every route to read the session cookie. The single exception is `GET`/`HEAD /api/health` (no cookie, no segment) — verified empirically that a "pure" handler with none of these IS eligible for build-time static prerendering under `cacheComponents`, which would freeze `boot_id`/`uptime_s` forever and break curl check H. The documented, maintainer-endorsed fix is `await connection()` from `next/server` as the first line of that one route. See Common Pitfalls §1 for the full evidence trail.

**Primary recommendation:** Omit `runtime`/`dynamic` segment-config exports from every route handler; let the mandatory session-cookie read (or the `[id]`/`[orderId]` segment) do the dynamic-marking work it already does for free; add `await connection()` only to `/api/health`. Build `lib/reconcile/apply.ts` as the sole writer with the fixed check order session → ownership → idempotency → shape → state, reusing the sibling's Map-eviction and caller-binding-before-state patterns verbatim. Build the route-proof suite as a new `node:test` file that reuses `scripts/lib/server.mjs` to `next start` (not rebuild) after the existing `next-build` STEP, with its own STEPS entry so it is never swept into the pre-build `fixture-suite` glob.

## Architectural Responsibility Map

This project is a single Next.js App Router application; there is no separate frontend-SSR tier and no external database service. "API/Backend" and "Database/Storage" below both execute inside the same Node.js process/instance — the store is a module-level `Map`, not a service (AD-10). This collapse is itself an architectural decision this phase implements, not an omission.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session mint/read/clear (`cap_session`) | API / Backend | Browser (cookie storage only) | HMAC signed and verified only in route handlers (`lib/session/cookie.ts`); browser just stores and resends the opaque cookie value |
| Order/asset authorisation (`ordersFor`, `orderOwned`, `assetInOrder`) | API / Backend | — | `lib/access/scope.ts`; the only place a decision is made; no middleware tier exists in this project (AD-2 explicitly forbids `proxy.ts`) |
| Clock accrual (open/close/reopen, `elapsed_s`) | API / Backend | Database/Storage (memory store) | Segments computed and summed server-side from stored state; client never posts a duration |
| Verification / proposal derivation | API / Backend | — | `lib/verify/authored.ts`, `lib/proposals/derive.ts`; fixture-only inputs, no capture bytes ever reach them (AD-8) |
| Decision recording, idempotency, conflict resolution | API / Backend | Database/Storage | `lib/reconcile/apply.ts` writes; `lib/store/memory.ts` holds state |
| `/api/sync` reconciliation | API / Backend | Database/Storage | Same writer, same store, as the online routes (AD-1, AD-16) |
| Response envelope, universal headers | API / Backend | — | `lib/http/respond.ts`; no CDN/edge tier participates (Vercel's `vercel.json` header rule is a parallel, redundant declaration — see Pitfall 3) |
| Record store (captures, proposals, decisions, clock segments, `seen` map) | Database/Storage | API / Backend | In-process `Map`s, not an external DB; per-instance, TTL-swept, capped (AD-10) |
| `GET /api/walk/[orderId]` payload assembly | API / Backend | — | Composed from the store and `lib/data` fixtures at request time |
| Static app shell (`/`, ribbon) | Browser / Frontend Server (SSR) | CDN / Static | Partially prerendered (`◐`) by Phase 1; Phase 3 does not touch it |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-FR-1 | Session mint via persona door; HttpOnly/SameSite=Lax/Secure(prod) cookie; unknown persona 404; body identity fields never persisted | `lib/session/cookie.ts` pattern (sibling `manifest.ts`); verified `Set-Cookie` shape via empirical `next start` probe; §Code Examples 1, 2 |
| REQ-FR-2 | `GET /api/session` returns account or 401 | Route Handler cookie-read pattern; §Code Examples 2 |
| REQ-FR-3 | `DELETE /api/session` clears cookie; stated non-revocation limitation | `response.cookies.delete()`/`maxAge:0`; verified empirically |
| REQ-FR-4 | Orders filtered by session account via one accessor; negative test set (ids, query, body, header) | `lib/access/scope.ts` pattern from sibling `store.ts`'s caller-binding-first ordering; §Architecture Patterns 2 |
| REQ-FR-5 | `GET /api/orders/[id]` returns order+assets+clock+…, server-only fields stripped | Route shape from Topic 9 / seed API contracts table |
| REQ-FR-6 | Byte-identical not-found for unowned vs fabricated id, every route incl. sync | AD-4; empirical header inventory (§Pitfall 3) feeds the exclusion list |
| REQ-FR-7 | Open idempotent; server-stamped segment | `OrderClock.segments`, AD-9 "idempotent by state" for open/close |
| REQ-FR-8 | Close ends segment; `not_open` conflict on closed/never-opened | D-06 sentence quoted verbatim in EXPERIENCE.md; `ConflictCode` already carries the slot |
| REQ-FR-9 | Reopen appends new segment, retains priors | `OrderClock.segments` array shape (already typed) |
| REQ-FR-10 | Hours GET-only, server-derived; `POST /api/hours` → 405 with full envelope | §Pitfall 2 — Next's auto-405 is headerless; must export an explicit `POST` |
| REQ-FR-11 | Device-reconciled clamp (session `issued_at` + last server contact); both claim and offset retained | D-07; `OrderClock.segments` needs new fields — §Open Questions 1 |
| REQ-FR-15 | Photo capture ships exactly `{sha256,bytes,mime}` + bounded thumbnail | AD-20 accepted-field enumeration; `lib/reconcile/validate.ts` |
| REQ-FR-16 | Voice capture ships exactly `{sha256,bytes,mime,duration_ms}` | Same as above |
| REQ-FR-17 | Authored match; fixture-inputs rule; named-package ban; null confidence | `lib/verify/authored.ts` declares `(assetId, fixtureSet)` only; AD-8; §Don't Hand-Roll |
| REQ-FR-18 | Asset-not-in-order refused `409 asset_not_in_order` | Curl check C; `assetInOrder` |
| REQ-FR-19 | Oversized media refused with actionable sentence | `lib/limits` cap + `413 media_too_large`; governed 413 sentence already exists for the platform case, a new one needed for this app-level case |
| REQ-FR-21 | Proposal id derived server-side, unguessable, reproducible without shared state | AD-5; §Code Examples 5 |
| REQ-FR-23 | One attribution producer; negative set (forged actor field appears nowhere) | AD-3; `lib/attribution`; build rule pattern from `check-register-isolation.mjs` |
| REQ-FR-24 | Single writer; non-bypassability enumeration; closed result-state set | AD-1, AD-19; `docs/analysis/single-writer-non-bypassability.md` |
| REQ-FR-27 | `unknown_proposal` identical for unknown/unowned, decided before state | AD-5's re-derive-then-compare check order |
| REQ-FR-57 | Authorisation via `scope.ts` only; no RBAC in access decisions; non-bypassability doc | AD-2; existing middleware-absence assertion already in `check-structure.mjs` |
| REQ-FR-61 | No route accepts client observation text/grade/provenance | Accepted-field enumeration per route (Topic 9 table is the source of truth) |
| REQ-NFR-F1 | Every response: no-store + store kind + instance id | AD-11; `lib/http/respond.ts`; verified empirically that Next adds no such headers itself on Route Handlers |

</phase_requirements>

## Standard Stack

### Core

No new runtime dependency is required or recommended. Every mechanism this phase needs is either already in `package.json` or is a Node.js 24 built-in module.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.3.4 (already installed) `[VERIFIED: npm view / npx next --version, this repo]` | Route Handlers, `NextRequest`/`NextResponse`, `next/headers` `cookies()`, `connection()` | Locked stack; confirmed exact version installed via `npx next --version` this session |
| `node:crypto` | Node 24 built-in `[VERIFIED: sibling pattern + Node docs]` | `createHmac('sha256')`, `timingSafeEqual`, `randomUUID` | HMAC session signing and derived proposal ids; the sibling's `manifest.ts` is the named, already-working pattern in this codebase |
| `node:test` + `node:assert/strict` | Node 24 built-in `[VERIFIED: this repo's scripts/*.test.mjs]` | The new route-proof suite | Already the project's sole test framework; zero config |
| `node:child_process`, `node:fs/promises` | Node 24 built-in | Reused via `scripts/lib/server.mjs`, `scripts/lib/fixtures.mjs` | Already written and battle-tested (process-group teardown, zombie detection) |

### Supporting

None. `server-only` (already a dependency from Phase 1/2) may be worth adding to `lib/data/register.ts`'s neighbours if any new server-only module needs the same guard, but no P3 module is imported from a client bundle (routes are server-only by construction), so `server-only` is not load-bearing here the way it is for `lib/data/register.ts`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled shape validation (`lib/reconcile/validate.ts`) | `zod`, `valibot` | Forbidden by this project's dependency-minimalism principle and by AD-15's spirit; the validated shape is small and fixed (UUID, 64-hex, ISO-8601, enum, positive int) and is cheaper hand-rolled than schema-library-learning-curve |
| `node:crypto` HMAC | `jsonwebtoken`, `jose` | JWT libraries solve problems this project does not have (multiple algorithms, key rotation, standard claims); a fixed-algorithm HMAC over a compact payload is ~15 lines and matches the sibling's precedent exactly |
| `node:test` | `vitest`, `jest` | Zero-config, already the project's only test runner, and the new suite has no need for anything those add (mocking, snapshot testing, watch mode) |

**Installation:**
```bash
# No new packages. This phase adds zero dependencies.
```

**Version verification:** `npx next --version` → `Next.js v16.3.4` confirmed directly against this repository's `node_modules` this session (matches the locked stack and `docs/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` §Stack exactly). `node --version` → `v24.19.0`. `npm --version` → `11.17.0`.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero external packages — every mechanism (HMAC signing, timing-safe comparison, UUID generation, the test runner, shape validation) is a Node.js 24 built-in or hand-rolled source, consistent with this project's stated dependency-minimalism principle ("prefer `node:crypto`, `node:test` and hand-rolled guards over new packages; any new dependency needs a stated reason"). No `npm install` step belongs in this phase's plan. If a future task in this phase is tempted to reach for a validation or JWT library, that is a deviation from CONTEXT.md's Claude's-Discretion note on module names/mechanism and should be flagged, not silently added.

**Packages removed due to slopcheck verdict:** none (nothing was installed to check).
**Packages flagged as suspicious:** none.

## Architecture Patterns

### System Architecture Diagram

```
   Client (curl / phone browser)
   sends Cookie: cap_session=<hmac>
              │  HTTP only — no proxy.ts, no Routing Middleware (AD-2)
              ▼
   ┌────────────────────────────────────────────────────┐
   │  app/api/**/route.ts   (transport only)              │
   │  reads request.cookies / cookies() in the handler;   │  ◄── /api/sync delivers the
   │  awaits params; Node runtime by default (no          │      SAME item shape from a
   │  runtime/dynamic export — see Pitfall 1)              │      client-side queue (P6)
   └───────────────────────┬──────────────────────────────┘
                            │ account, item
                            ▼
   ┌────────────────────────────────────────────────────┐
   │  lib/attribution                                     │  the ONE producer of every
   │  deriveAccount(session) → account_id                 │  actor field (AD-3)
   └───────────────────────┬──────────────────────────────┘
                            ▼
   ┌────────────────────────────────────────────────────┐
   │  lib/access/scope.ts                                 │  the ONLY authorisation
   │  ordersFor / orderOwned / assetInOrder (AD-2)         │  decision in the codebase
   └────────────┬─────────────────────┬────────────────────┘
      ownership OK                     ownership FAILS
                 │                     └────────────────► lib/http/respond.ts
                 ▼                                          notFound() — universal
   ┌────────────────────────────────────────────────────┐   headers only, byte-identical
   │  lib/reconcile/apply.ts — applyItem(account, item)    │   to an unknown id (AD-4)
   │  fixed check order:                                   │
   │  session → ownership → idempotency → shape → state    │
   │  (AD-1). A refusal is written as a retained attempt   │
   │  by this SAME function (FR-60), never bypassed.       │
   └──────┬───────────────────────────────┬────────────────┘
          │ reads/writes                   │ reads only
          ▼                                 ▼
   ┌─────────────────────┐     ┌──────────────────────────────┐
   │ lib/store/memory.ts   │     │ lib/data/* (fixtures)          │
   │ module-level Maps,     │     │ lib/verify/authored.ts         │
   │ BOOT_ID, TTL, caps     │     │ lib/proposals/derive.ts        │
   │ (AD-10)                │     │ declared inputs EXACTLY        │
   └─────────────────────┘     │ (assetId, fixtureSet) — AD-8    │
                                 └──────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────┐
   │  lib/http/respond.ts — the ONLY response constructor │
   │  Cache-Control: no-store, X-CAP-Store, X-CAP-Instance │
   │  every error body { error, detail } (AD-11)           │
   └───────────────────────┬──────────────────────────────┘
                            ▼
                    Response → client
```

### Recommended Project Structure
```
app/api/
├── session/route.ts              # POST mint, GET whoami, DELETE clear
├── orders/route.ts                # GET — filtered list
├── orders/[id]/route.ts           # GET — order detail, uniform 404
├── orders/[id]/open/route.ts      # POST — idempotent clock start
├── orders/[id]/close/route.ts     # POST — clock stop, not_open conflict
├── verify/route.ts                # POST — authored match + proposals
├── captures/route.ts              # POST — evidence capture
├── decisions/route.ts             # POST — accept/reject
├── sync/route.ts                  # POST — batch, same writer as above
├── hours/route.ts                 # GET server-derived; POST → 405
├── walk/[orderId]/route.ts        # GET — WalkPayload
└── health/route.ts                # GET/HEAD — probe target, connection()

lib/
├── session/cookie.ts              # mintSession / readSession / clearSession
├── attribution/index.ts           # deriveAccount(session) — Claude's discretion on filename
├── access/scope.ts                # ordersFor / orderOwned / assetInOrder
├── store/memory.ts                # module-level Maps, BOOT_ID, TTL sweep, caps
├── reconcile/validate.ts          # shape guards (UUID, hex, ISO-8601, enum, positive int)
├── reconcile/apply.ts             # applyItem(account, item) — the sole writer
├── verify/authored.ts             # (assetId, fixtureSet) → VerificationResult
├── proposals/derive.ts            # (assetId, fixtureSet) → Proposal[]
├── http/respond.ts                # ok() / fail() / notFound() — the sole responder
├── walk/payload.ts                # buildWalkPayload(account, order)
└── limits/index.ts                # every bounded quantity, one export each

scripts/
├── check-single-writer.mjs        # new — mirrors check-register-isolation.mjs's import walk
├── check-actor-field.mjs          # new — same shape, different forbidden-target set
├── check-fixture-inputs.mjs       # new — asserts authored.ts/derive.ts signatures + no capture import
├── check-named-packages.mjs       # new — package.json + lockfile string sweep
├── check-accepted-fields.mjs      # new — per-route schema vs Topic-9 table
├── check-non-bypassability.mjs    # new — extends check-structure.mjs's shape, or a sibling script
├── server/route-suite.test.mjs    # new — node:test; next start (not build) + fetch assertions
└── curl-suite.sh                  # new/rewritten — D-10's strict-shape curl A–H, human-run

docs/analysis/
└── single-writer-non-bypassability.md   # new — hand-written enumeration (D-12)
```

### Pattern 1: One writer, refusals included (AD-1)
**What:** Every mutation — online or via `/api/sync` — passes through `applyItem(account, item)` in a fixed order. A request refused at the session or ownership stage still calls `applyItem` with a refusal item, so the attempt is retained by the same function, never bypassed.
**When to use:** Every `POST` route and the sync loop.
**Example (shape, not literal code — module names are this repo's own convention):**
```typescript
// lib/reconcile/apply.ts
export async function applyItem(
  sessionResult: SessionResult,   // may be "no_session"
  item: SyncItem<unknown>,
): Promise<SyncItemResult> {
  if (!sessionResult.ok) {
    return recordRefusal(null, item, "no_session");           // still written
  }
  const account = sessionResult.account;
  const ownership = checkOwnership(account, item);             // AD-2, before any state read
  if (!ownership.ok) {
    return recordRefusal(account, item, ownership.code);       // uniform not_found (AD-4)
  }
  const dup = checkIdempotency(account, item);                 // AD-9
  if (dup) return dup;
  const shapeError = validate(item);                           // lib/reconcile/validate.ts
  if (shapeError) return recordRefusal(account, item, shapeError.code);
  return applyByKind(account, item);                            // state transition, {open,accepted,rejected,superseded}
}
```

### Pattern 2: Ownership-before-state, uniform not-found (AD-2, AD-4)
**What:** `lib/access/scope.ts` is the only place authorisation is decided. Every route calls it with the session-derived account as a non-optional first argument. An unowned id and an unknown id produce byte-identical responses because ownership is checked before any state (existence) comparison — mirroring the sibling's `resolve()` (`not_yours` checked before `already_resolved`).
**When to use:** Every route that takes an order/asset/proposal id.
**Source:** `../ipv-demo/lib/decision/store.ts` lines 160-171 (verified this session) — "Checked before state, so an attacker enumerating ids cannot use the difference between 'already resolved' and 'not yours' to map the register."

### Pattern 3: Derived, unguessable identity (AD-5)
**What:** `Proposal.id = HMAC(CAPTURE_SESSION_KEY, account_id · client_id · observation_id)`, base64url-encoded. No proposal is ever stored keyed by a server-minted sequential id; it is re-derived and compared on every decision. A decision naming a fabricated or another account's id fails the same way (HMAC mismatch → `unknown_proposal`), so FR-27's byte-identity is a structural consequence, not a second code path.
**When to use:** `lib/proposals/derive.ts`, and the re-derivation inside `lib/reconcile/validate.ts`/`apply.ts` for `POST /api/decisions`.
**Example:**
```typescript
// Source: node:crypto docs (HIGH confidence, stdlib) + ../ipv-demo/lib/rbac/manifest.ts pattern
import { createHmac, timingSafeEqual } from "node:crypto";

function key(): string {
  if (cachedKey === null) cachedKey = resolveSessionKey(); // lazy; never at module load
  return cachedKey;
}

export function deriveProposalId(accountId: string, clientId: string, observationId: string): string {
  return createHmac("sha256", key())
    .update(`${accountId} ${clientId} ${observationId}`)
    .digest("base64url");
}

export function proposalIdMatches(candidate: string, accountId: string, clientId: string, observationId: string): boolean {
  const expected = Buffer.from(deriveProposalId(accountId, clientId, observationId));
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```
Note the ` ` (NUL) field separator — a plain `·`/`:` join is ambiguous if any input field could itself contain that character; account ids and client ids are controlled formats here (`acc-<surname>`, UUID) so a simple separator is safe in practice, but a NUL byte is the cheap, unambiguous choice and costs nothing.

### Pattern 4: One responder, header table (AD-11)
**What:** `lib/http/respond.ts` is the only place a `Response`/`NextResponse` is constructed. It always stamps `Cache-Control: no-store`, `X-CAP-Store`, `X-CAP-Instance`; every error body is `{ error, detail }`. Route-specific `X-CAP-*` counters are added by the route through the responder, never bypassing it, and are documented in a table as universal-or-success-only so the not-found path never leaks one.
**When to use:** Every route, every branch, including the explicit `405` on `POST /api/hours`.
**Verified this session:** a plain `next start` Route Handler response carries **no** `Cache-Control` header of its own — Next.js does not add one to Route Handler responses (unlike page responses, which get `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` automatically). This confirms the architecture's premise: nothing but the responder will ever set `Cache-Control: no-store` for these routes under `next start`. `vercel.json`'s `/api/(.*)` rule is a second, platform-level declaration of the same value — see Pitfall 3.

### Pattern 5: Module-level memory store, per instance (AD-10)
**What:** `lib/store/memory.ts` holds plain `Map`s at module scope, stamped with a `BOOT_ID` minted once via `crypto.randomUUID()` at module load, swept on a TTL, capped per-account and globally, oldest-first eviction (`Map` preserves insertion order — the first key is the oldest).
**When to use:** Every record kind the store keeps (captures, decisions, proposals-are-derived-not-stored, clock segments, the `seen` idempotency map, attempt entries).
**Source:** `../ipv-demo/lib/decision/store.ts` lines 108-119 (verified this session) — the exact eviction idiom:
```typescript
while (REGISTER.size > REGISTER_LIMIT) {
  const oldest = REGISTER.keys().next();
  if (oldest.done) break;
  REGISTER.delete(oldest.value);
}
```
**Vercel Fluid Compute note (flagged, see Assumptions Log A1):** module scope persists across warm invocations within one instance; whether multiple *concurrent* invocations on one Fluid Compute instance share that module scope (they should, since Fluid Compute multiplexes requests onto the same Node.js process/isolate rather than spinning up separate processes) is stated in Vercel's own Fluid Compute documentation but was not independently re-verified against a live deployment in this session — treat AD-10's "per instance" framing as accurate for the *process*, and note that "per instance" and "per concurrently-handled request" are not the same guarantee if concurrency invariants ever matter (they do not appear to, here, since every store mutation goes through the single `applyItem` writer and JavaScript's single-threaded execution model means two `Map` mutations from concurrent requests on the same isolate cannot interleave mid-statement).

### Pattern 6: Route Handlers are dynamic by construction under `cacheComponents: true`
**What:** No route in this phase declares `runtime` or `dynamic`. Every route either reads the session cookie (a Next.js Dynamic API) or resolves a dynamic segment (`[id]`, `[orderId]`) — both of which are independently sufficient, verified this session, to make Next.js execute the handler fresh on every request with no caching. `GET`/`HEAD /api/health` is the one route with neither, and explicitly calls `await connection()` as its first statement.
**When to use:** Every route handler file in this phase.
**Full evidence:** see Common Pitfalls §1.

### Anti-Patterns to Avoid
- **`export const dynamic = "force-dynamic"` / `export const runtime = "nodejs"`:** hard build error under this project's locked `cacheComponents: true`. See Pitfall 1.
- **Comparing HMAC digests or derived ids with `===` or `Buffer.equals`:** timing side-channel (CWE-208). Always `timingSafeEqual` on equal-length buffers (guard the length check yourself — `timingSafeEqual` throws, does not return `false`, on mismatched lengths).
- **Reading identity from anywhere but the cookie inside the handler:** a body field, query parameter or header named `account`/`X-Account` must never be consulted for authorisation (FR-4's negative test set exists specifically to catch this).
- **A second not-found producer:** if any route hand-writes its own `404` instead of calling the one responder, AD-4's byte-identity guarantee is void by construction, not just by bug.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Constant-time secret comparison | A loop or `===`/`Buffer.equals` on an HMAC digest or derived proposal id | `node:crypto` `timingSafeEqual` | Variable-time comparison leaks how many leading bytes matched via response timing — the textbook CWE-208 mistake, and the one thing `node:crypto` exists specifically to prevent |
| Cookie attribute string assembly | Manually concatenating `Set-Cookie: name=value; HttpOnly; ...` | `NextResponse`'s `response.cookies.set({...})` or `next/headers` `cookies().set(...)` | Framework derives `Expires` from `maxAge` correctly and handles encoding; verified this session that `sameSite:"lax", maxAge:43200, secure:false` renders as `SameSite=lax; Max-Age=43200` with no `Secure` token when `secure:false`, exactly as needed for local dev vs production |
| UUID generation for `client_id` | A hand-rolled random-hex-with-dashes template | `crypto.randomUUID()` | Node 20+ built-in (present since 14.17 behind a flag, unconditional since 19), RFC 4122 v4 compliant, zero dependency |
| "Is this route dynamic?" detection | `export const dynamic = "force-dynamic"` | Read the Dynamic API the route needs anyway (`request.cookies`), or `await connection()` where none is needed | The segment-config export is not merely discouraged, it is a build error under this project's locked `cacheComponents: true` (verified empirically) |
| JSON canonicalisation for the idempotency hash | `JSON.stringify(rawBody)` | A hand-rolled sorted-key serialiser over an **enumerated, fixed field list per item kind** (still hand-rolled, per this project's own principle — just not over the raw, attacker-shaped body) | `JSON.stringify` preserves whatever key order the object happens to have; two logically-identical payloads with keys inserted in a different order hash differently, silently breaking AD-9's `duplicate` detection. See Code Example 7. |

**Key insight:** every item in this table is "use the Node.js standard library or the framework's own API correctly," never "add a package." This project's dependency-minimalism principle and its security requirements point the same direction here: the standard library primitives are both the minimal-dependency choice and the correct-by-construction choice.

## Common Pitfalls

### Pitfall 1: `runtime`/`dynamic` segment config is a build error under `cacheComponents: true` — **verified empirically this session**
**What goes wrong:** Following CONTEXT.md/the seed/epics.md's literal text and exporting `export const runtime = "nodejs"; export const dynamic = "force-dynamic";` from a route handler fails `next build` outright.
**Why it happens:** `next.config.ts` already sets `cacheComponents: true` (locked in Phase 1; `check-structure.mjs` itself fails the build if that line is removed, so disabling it is not an option). Under Cache Components, the legacy `dynamic`/`dynamicParams`/`fetchCache`/`revalidate`/`runtime` route-segment-config exports are superseded by automatic dynamic-detection plus the `'use cache'` directive, and Next.js's Turbopack transform rejects them outright rather than silently ignoring them.
**Evidence (this session, this exact repo, Next.js 16.3.4):**
```
$ npx next build
Error: Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`. Please remove it.
Error: Route segment config "runtime" is not compatible with `nextConfig.cacheComponents`. Please remove it.
```
Corroborated independently by a Next.js maintainer-adjacent GitHub discussion (vercel/next.js#84894, via WebSearch): *"all route handlers are dynamic by default when using Cache Components... Since route handlers are already dynamic by default when cacheComponents is enabled, you don't need to explicitly declare force-dynamic."* — and by vercel/next.js#85326 (fetched this session): a maintainer confirms `connection()` is the supported replacement and to "call `await connection` early... right before introducing any side-effects... so the rest is still verified during build."
**How to avoid:** Omit both exports from every route in this phase. Verified empirically that a handler which calls `request.cookies.get(...)` (or `await cookies()`) is *always* marked `ƒ (Dynamic)` and genuinely re-executes per request (not cached) — proven by observing a module-level counter increment across three successive calls on a running `next start` server. Verified equally that a route with a dynamic segment (`[id]`) and **no** cookie access is *also* always `ƒ` and re-executes per request with no per-id caching (proven by requesting the same id twice and observing a different `Date.now()` each time) — this matters because it rules out a cross-account cache-leak risk for `/api/orders/[id]` even before the ownership check runs. The **only** route in this phase's table with neither a dynamic segment nor a cookie read is `GET`/`HEAD /api/health`; verified that a route with neither is eligible for build-time static prerendering (marked `○`) and that a request-time value baked in at build time never changes on subsequent requests unless `await connection()` is the first statement in the handler, after which it is reliably `ƒ` again.
**Warning signs:** `next build` failing during `verify.mjs`'s `next-build` STEP with the exact "Route segment config ... is not compatible" message; or, more dangerously, `/api/health`'s `boot_id`/`uptime_s` never changing across requests (curl check H silently passing on a frozen build-time snapshot rather than genuinely proving liveness) if `connection()` is omitted there.

### Pitfall 2: Next.js's auto-generated `405` carries none of this project's required headers
**What goes wrong:** Relying on Next.js to auto-respond `405 Method Not Allowed` when `POST` isn't exported from `app/api/hours/route.ts` satisfies curl check G's status code but silently violates NFR-F1 (no `Cache-Control: no-store`, no `X-CAP-Store`, no `X-CAP-Instance`, and the body is plain text, not `{error, detail}`).
**Why it happens:** Next.js's own routing layer generates the `405` before the request ever reaches application code (confirmed via Context7: "If a request uses an unsupported method, Next.js will respond with a `405 Method Not Allowed` status" — this is framework-level, not something `lib/http/respond.ts` ever sees).
**How to avoid:** Export an explicit `POST` handler on `app/api/hours/route.ts` whose body is nothing but a call to the one responder's `fail(405, "method_not_allowed", "...")`, so the universal header set still applies. `POST` handlers are never subject to the static/dynamic caching question in Pitfall 1 (only `GET` is ever build-time-cacheable — confirmed via Context7's "This setting only applies to `GET` methods; other HTTP methods are not cached"), so no `connection()` call is needed there.
**Warning signs:** A response header diff on `POST /api/hours` showing a bare `Allow: GET, HEAD` and a plain-text or HTML body instead of the project's JSON error envelope.

### Pitfall 3: Local `next start` and the live Vercel platform do not add the same header set — the D-11 exclusion list needs live-deployment evidence too
**What goes wrong:** Writing the FR-6 byte-identity comparator's exclusion list purely from local `next start` observation (as this research did) risks missing headers Vercel's edge/proxy layer adds only on a real deployment (commonly `x-vercel-id`, `x-vercel-cache`, `server`), causing the comparator to either false-fail on a real Preview deployment or to be too permissive.
**Evidence gathered locally, verified this session (`next start`, no Vercel):**
- Present on every Route Handler response observed: `Date`, `Connection: keep-alive`, `Keep-Alive: timeout=5`, `Transfer-Encoding: chunked` (for a small JSON body — no `Content-Length` was observed on these routes locally), and — unexpectedly — `vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`. This `vary` header appeared identically on every Route Handler response tested (with or without cookies, with or without a body), so it does not break byte-identity comparisons (it is a constant string per route method, not request-varying) but it is a header the D-11 exclusion-list author should know about and explicitly allow-list or ignore, since it comes from the framework, not from `lib/http/respond.ts`.
- **Not** present on a plain JSON Route Handler response: `X-Powered-By`. Verified via Context7 that `poweredByHeader` (default `true`) only affects **HTML** responses — confirmed empirically: the `/` page response carried `X-Powered-By: Next.js`, but every `/api/*` JSON response tested did not. This means `poweredByHeader: false` in `next.config.ts` is unnecessary for this phase's API-route byte-identity requirement (it would only ever affect the single `/` page, which is outside FR-6's route list); recommend leaving it at its default unless a later phase's claims-audit finds `X-Powered-By` objectionable on `/` itself.
- `vercel.json`'s `/api/(.*)` → `Cache-Control: no-store` rule does **not** apply under local `next start` at all (`vercel.json` is interpreted only by Vercel's own build/deploy pipeline, never by the `next` CLI) — this is exactly why D-04 already requires the responder to stamp the header itself "so the header holds under `next start` too," and this session's empirical test confirms the responder is in fact the *only* source of that header locally.
**Not verified this session (no live deployment access in this sandbox) — logged as Assumptions Log A2:** whether Vercel's edge layer adds `x-vercel-id`, `x-vercel-cache`, `server`, or an `ETag` to a Route Handler response on an actual Preview/Production deployment, and whether `vercel.json`'s declared `Cache-Control: no-store` and the responder's own identical value merge cleanly or duplicate (`no-store, no-store`) when both apply on the real platform. CONTEXT.md's own D-11 exclusion list already anticipates `x-vercel-*` and a possible platform `etag`, which is consistent with ordinary Vercel behaviour reported in Vercel's own docs, but this project's own `scripts/check-headers.mjs` comment already admits the limit of static-file verification here: *"this reads `vercel.json`'s declared strings only... does not verify Vercel actually serves these headers from a live deployment."* The route suite (local, `node:test`) can prove byte-identity under the locally-observed header set; the human-run `scripts/curl-suite.sh` against a real Preview/Production deployment (D-09b) is what closes this gap, exactly as Phase 1's D-22 used a live falsification test to resolve an analogous open question.
**How to avoid:** Write the exclusion list to explicitly name `date`, `connection`, `keep-alive`, `transfer-encoding`, `content-length`, `vary`, and the `x-vercel-*` family with one-line reasons each (per D-11's own requirement), and treat the recorded curl-suite output against a real deployment as the source of truth for whether any of those actually differ in practice — don't assume the local list is complete.

### Pitfall 4: `next typegen` must run (and share the same resolved build-id env) before `tsc`, or dynamic-route param types are stale
**What goes wrong:** Using `RouteContext<'/api/orders/[id]'>` (the typegen-generated helper type) without `next typegen` having run first produces a `tsc` error the developer did not cause.
**Why it happens:** `next.config.ts`'s build-id gate throws under a production-like `NODE_ENV` (confirmed already exercised by this repo's own STEPS ordering — Phase 1's STATE.md records `next typegen` tripping this gate for exactly this reason) — `next typegen` loads `next.config.ts` the same way `next build` does.
**How to avoid:** This phase already inherits `verify.mjs`'s STEPS order (`next-typegen` before `tsc`), so this is only a risk if a new module bypasses that order (e.g., a standalone `tsc` invocation during manual development). Simpler and equally correct: type every route's `params` inline as `{ params: Promise<{ id: string }> }` (the seed's own stated preference — Risk #2 in Topic 16) rather than importing the generated `RouteContext` alias, which sidesteps the ordering dependency entirely for hand-written code (typegen still runs as part of the gate regardless, for Next's own internal correctness).

## Code Examples

### 1. Lazy-resolved HMAC session key (sibling pattern, verified to hold under 16.3.4)
```typescript
// Source: ../ipv-demo/lib/rbac/manifest.ts (verified against this repo's Next 16.3.4 this session
// — the pattern is framework-agnostic Node.js and needed no adaptation)
let signingKey: string | null = null;

function resolveSigningKey(): string {
  const fromEnv = process.env.CAPTURE_SESSION_KEY;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CAPTURE_SESSION_KEY is not set. Refusing to start in production without it.",
    );
  }
  return "capture-demo-dev-key-not-for-prod"; // committed dev fallback, per D-CONV
}

function key(): string {
  // Resolved on FIRST USE, never at module load — `next build` and `next typegen`
  // both import every route module under a production-like NODE_ENV (verified:
  // this repo's next.config.ts build-id gate already depends on exactly this
  // behaviour and it works today), so throwing at module scope would fail the
  // build on a machine with no business holding the production key.
  if (signingKey === null) signingKey = resolveSigningKey();
  return signingKey;
}
```

### 2. Reading the session cookie in the handler (never in middleware)
```typescript
// Source: Context7 /vercel/next.js v16.2.9 docs/01-app/03-api-reference/03-file-conventions/route.mdx
// "Read Cookies from NextRequest Object" — verified working this session against 16.3.4
import type { NextRequest } from "next/server";

export function readSessionCookie(request: NextRequest): string | undefined {
  return request.cookies.get("cap_session")?.value;
}
```
`request.cookies.get(...)` (synchronous, off the handler's own `NextRequest` parameter) is preferred over `await cookies()` from `next/headers` for *reading* here: every route handler already receives `request` as its first argument, so no extra `await` is needed, and it keeps `readSession(request)` trivially unit-testable with a hand-built `{ cookies: { get: () => ... } }` stub. Both were verified working and both independently trigger the Pattern-6 dynamic marking; `next/headers`'s `cookies()` is the natural choice for *writing* only if the recommended pattern below (route handler returns through `respond.ts`) needs it — otherwise prefer mutating the `NextResponse` the responder already built.

### 3. Minting and clearing the cookie
```typescript
// Source: Context7 v16.2.9 route.mdx + this session's empirical curl verification of the
// exact Set-Cookie string Next.js 16.3.4 renders for these options
import { NextResponse } from "next/server";

export function withSessionCookie(response: NextResponse, value: string, maxAgeSeconds: number) {
  response.cookies.set({
    name: "cap_session",
    value,
    httpOnly: true,
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
// Verified this session: this renders as
//   set-cookie: cap_session=<value>; Path=/; Expires=<derived>; Max-Age=43200; HttpOnly; SameSite=lax
// with NO "Secure" token when secure:false (local dev), and WITH one when true (production).

export function withClearedSessionCookie(response: NextResponse) {
  response.cookies.set({ name: "cap_session", value: "", httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
```

### 4. `/api/health` — the one route that needs `connection()`
```typescript
// Source: Context7 v16.2.9 docs/01-app/03-api-reference/04-functions/connection.mdx
// + this session's empirical build/run test confirming the alternative (no export, no
// dynamic API) gets frozen at build time under cacheComponents: true.
import { connection } from "next/server";

export async function GET() {
  await connection(); // MUST be first — forces per-request execution before touching store state
  const stats = storeStats(); // module-level state read AFTER connection()
  return respondOk({ ok: true, store: "memory", boot_id: BOOT_ID, uptime_s: uptimeSeconds(), counts: stats, ttl_s: TTL_SECONDS });
}

export async function HEAD() {
  await connection();
  return respondOk(null, { status: 200 }); // headers only, no body — verified HEAD works via curl -I
}
```

### 5. Deriving the proposal id and validating a decision against it
See Architecture Patterns §Pattern 3 above.

### 6. The single-writer build rule (mirrors `check-register-isolation.mjs` exactly)
```javascript
// Source: this repo's scripts/check-register-isolation.mjs (verified, read in full this session)
// The new check-single-writer.mjs reuses the identical shape:
//   - SOURCE_ROOTS = ["app/api", "lib"]  (everywhere a write COULD happen)
//   - FORBIDDEN target = the store's mutating export set, e.g. every named export from
//     lib/store/memory.ts EXCEPT read-only accessors, imported from anywhere other than
//     lib/reconcile/apply.ts itself
//   - Same BFS import-graph walk, same alias resolution via tsconfig.json's "@/*" mapping,
//     same "missing directory = nothing to check, missing --bundle dir = named failure" rule
// What it CANNOT catch (state honestly, per the claims-audit's own precedent): dynamic
// `import()` calls built from a runtime string, and any write reached through a
// re-exported binding under a different name that the specifier-extraction regex doesn't
// recognise (extractSpecifiers only matches `from "..."` and bare `import "..."`).
```

### 7. Canonical JSON for the idempotency hash (AD-9)
```typescript
// Hand-rolled, ~15 lines, no dependency. Source: this repo's own dependency-minimalism
// principle + standard "stable stringify" idiom (widely documented, MEDIUM confidence —
// this exact function is not copied from an official source, it is a standard technique).
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    // Pitfall: `undefined` inside an array becomes "null" via JSON.stringify; a MISSING
    // object key is simply omitted. Decide once, per item kind, which behaviour a given
    // optional field needs and be consistent — do not let this be accidental.
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort(); // stable key order
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function idempotencyHash(kind: SyncItemKind, payload: unknown): string {
  const fields = ENUMERATED_FIELDS[kind]; // per-kind fixed subset — never the raw payload
  const projected = Object.fromEntries(fields.map((f) => [f, (payload as Record<string, unknown>)[f]]));
  return createHash("sha256").update(canonicalize(projected)).digest("hex");
}
```
Pitfalls this must handle deliberately: **number formatting** (`JSON.stringify(1.0) === "1"` — not an issue since all numeric fields here are integers or fixed-precision, but worth a comment); **`undefined` vs missing** (a field absent from the payload and a field explicitly `undefined` both vanish under `JSON.stringify`, which is the desired behaviour here since the enumerated-fields projection already decides what's present); **unicode** (`JSON.stringify` escapes consistently regardless of normalisation form — if two clients could send the same string in different Unicode normalisation forms this would hash differently, which is a real but low-probability edge case for this project's controlled inputs — not worth solving now, worth a one-line comment).

### 8. UUID and hex shape guards (D-10's strict validation, hand-rolled)
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export function isUuidShaped(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && SHA256_HEX_RE.test(value);
}
```
`crypto.randomUUID()` always produces version-4 variant-1 UUIDs (the `4` and `[89ab]` positions above), so this regex is deliberately strict to that shape rather than a generic any-version UUID matcher — tightening it, not loosening it, matches D-10's "strict per D-CONV" instruction. The SHA-256 of an empty file (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`) is the seed's own suggested replacement for the retired `"00"` placeholder.

### 9. The route-proof suite's server lifecycle (reusing, not duplicating, existing scripts)
```javascript
// Pattern verified against this repo's scripts/check-wcag.mjs (build-then-start-then-
// assert-then-teardown shape), read in full this session, with two deliberate differences:
//   1. It does NOT run `next build` itself — verify.mjs's STEPS already ran `next-build`
//      earlier in the sequence, so this step only needs `next start` against the existing
//      .next output. (check-wcag.mjs builds its own because it is also runnable standalone
//      outside verify.mjs; the route suite, per D-09, is verify.mjs-only.)
//   2. childEnv must include CAPTURE_SESSION_KEY (a throwaway value) — verified this session
//      that `next start` runs under a production-like NODE_ENV the same way `next build`
//      does (this repo's own next.config.ts build-id gate already depends on that fact and
//      it holds), which means lib/session/cookie.ts's lazy key resolution WILL throw on
//      first request if CAPTURE_SESSION_KEY is absent from the child's environment.
import { startServer, stopServer } from "../lib/server.mjs";

const PORT = 4312; // a port not already used by check-wcag.mjs's 4311
const BASE_URL = `http://127.0.0.1:${PORT}`;
const childEnv = { ...process.env, CAPTURE_SESSION_KEY: process.env.CAPTURE_SESSION_KEY ?? "route-suite-throwaway-key-000000" };

// readiness: poll GET /api/health (not "/") since that IS the route under test and proves
// the exact thing curl check H needs — X-CAP-Instance boot_id, then compare after a
// stopServer()/startServer() cycle to prove it changes on restart.
```
**File naming, to avoid the `fixture-suite` glob:** `verify.mjs`'s `fixture-suite` STEP runs `node --test scripts/**/*.test.mjs` **before** `next-build` — any file matching that glob would be collected and executed at that point, when `.next` does not yet exist, and would fail for an unrelated reason (no server to start). Give the new suite its own STEPS entry with an explicit, non-globbed path (e.g. `scripts/server/route-suite.test.mjs` invoked directly as `{ command: process.execPath, args: ["--test", "scripts/server/route-suite.test.mjs"] }`) placed **after** the `next-build` STEP, exactly as D-09 requires, and exclude that same path from the glob if the glob would otherwise also match it a second time later (it will not re-match since `fixture-suite` only runs once, before `next-build`, but the new STEP must not accidentally reuse the glob's id or the `resolveSteps`/`runSteps` accounting in `scripts/verify.test.mjs` could double-count it — verify against that test file when writing the plan).

## State of the Art

| Old Approach (Next < 16 cacheComponents, and this repo's own planning documents) | Current Approach (Next.js 16.3.4 + `cacheComponents: true`, verified) | When Changed | Impact |
|--------------------------------------------------------------------------------|-------------------------------------------------------------------------|---------------|--------|
| `export const dynamic = "force-dynamic"` to guarantee a Route Handler is never cached | Omit the export; a Route Handler is dynamic automatically once it touches a Dynamic API or a dynamic segment; `connection()` for the rare route that touches neither | `cacheComponents` (evolution of the PPR/`experimental.dynamicIO` line); confirmed still true and a **hard build error** otherwise on 16.3.4 | Every `route.ts` in this phase is written without segment-config exports; this is *simpler* than the seed's literal instruction, not harder, but is a real deviation from repeatedly-stated text that the planner must not silently "fix" back to the old form |
| `export const runtime = "nodejs"` to pin the runtime away from Edge | Omit it; Node.js is the default runtime for Route Handlers on this project (no Edge routes exist anywhere in this app), confirmed via `Buffer` availability inside a running handler | Same as above | No behavioural loss — this project never wanted Edge |
| Next 15's rule "GET Route Handlers are no longer cached by default; opt in with `export const dynamic = 'force-static'`" | Superseded entirely for a `cacheComponents: true` app: opting into caching now goes through `'use cache'` in a helper function called by the handler (not directly in the handler body, per Context7 docs), never through the segment-config export | With `cacheComponents: true` specifically (this project's config since Phase 1) | Not used in this phase — no route needs caching — but worth knowing so a future phase doesn't reach for the Next-15-era `force-static` idiom either |

**Deprecated/outdated:** `dynamic`/`dynamicParams`/`fetchCache`/`revalidate`/`runtime` route-segment-config exports, for any file under `app/**` in this project, for as long as `cacheComponents: true` remains set (it is locked and build-asserted; removing it is out of this phase's scope and would itself require re-deciding AD-11's Partial-Prerender claim about `/`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel Fluid Compute shares one Node.js module scope across *concurrent* invocations on the same instance (not just sequential warm invocations), so `lib/store/memory.ts`'s `Map`s behave as a single shared store per instance under concurrent load the way AD-10 describes | Architecture Patterns §Pattern 5 | If false (each concurrent invocation somehow got an isolated module scope), the store would silently fragment under real concurrent traffic, and curl check H's "X-CAP-Instance constant across calls" would still pass (same boot id) while data consistency between concurrent requests would not hold — worth a live-deployment concurrency smoke test before relying on it under load, though nothing in this phase's curl suite would currently catch the failure mode |
| A2 | The exact header set a real Vercel Preview/Production deployment adds to a Route Handler response (`x-vercel-id`, `x-vercel-cache`, `server`, and whether an `ETag` is ever added) matches what CONTEXT.md's D-11 exclusion list already anticipates | Common Pitfalls §3 | If Vercel adds a header not in the exclusion list (or omits one this research assumed), the FR-6 byte-identity comparator either false-fails on a real deployment or is too permissive; D-09's human-run `scripts/curl-suite.sh` against a real deployment is the designed falsification point for exactly this, per this project's own established pattern (Phase 1 D-22) |
| A3 | `next start`'s child process runs under the same "production-like `NODE_ENV`" that `next build`/`next typegen` already demonstrably run under in this repo (STATE.md records this for build/typegen specifically) | Code Example 9 | If `next start` does NOT set a production-like `NODE_ENV`, the lazy session-key resolution in Code Example 1 would use the dev fallback key even when started via `next start`, which is actually the *safer* failure direction for local testing (it would still work, just not exercise the production-refusal branch) — but the route suite's explicit `CAPTURE_SESSION_KEY` env var removes any dependency on this assumption either way, so this is low-stakes |
| A4 | `vercel.json`'s `/api/(.*)` → `Cache-Control: no-store` rule, when it does apply on a live deployment, merges harmlessly with the responder's own identical value rather than producing a client-visible duplicate or conflicting header | Architecture Patterns §Pattern 4 | Low risk even if wrong: a duplicated `Cache-Control: no-store, no-store` is still correctly interpreted by every HTTP client as "do not cache," and would apply identically to both sides of every FR-6 comparison, so it would not break byte-identity even if unverified |

**If this table is empty:** N/A — four items logged above, all flagged for live-deployment falsification consistent with this project's existing pattern (Phase 1 D-22).

## Open Questions

1. **Exact new fields on `OrderClock.segments` for FR-11's retained device-claim + measured-offset**
   - What we know: `Decision` already carries a precedent field, `device_offset_s: number`, for the exact same "retain both the claim and the measured offset" requirement on the online path. `OrderClock.segments` currently has only `{ opened_at, closed_at, source }`.
   - What's unclear: whether the new fields should be named to mirror `Decision.device_offset_s` (e.g. `device_claimed_opened_at?: string; device_offset_s?: number`) or something else; CONTEXT.md explicitly marks this as Claude's discretion ("Extending the clock segment type in types.ts... shape is not content, so the fixture hash is unaffected").
   - Recommendation: mirror `Decision`'s naming for consistency (`device_offset_s`), add `device_claimed_opened_at?: string` alongside it, both optional (present only when `source: "device_reconciled"`), so `source: "server"` segments need no new fields and every existing fixture/type-check stays valid.

2. **Where exactly `docs/analysis/single-writer-non-bypassability.md`'s enumeration is regenerated vs hand-maintained**
   - What we know: D-12 requires it hand-written "in the voice the handover needs," while also requiring a build-time check that fails when any route/env-read/store-writer is *absent* from the document by name.
   - What's unclear: whether the check reads the document as a literal string-membership sweep (does `app/api/session/route.ts` appear anywhere in the file?) or something more structured (a table with defined columns the check parses).
   - Recommendation: literal string-membership sweep, matching `check-governed.mjs`'s and `claims-audit.mjs`'s established "sweep source as text" precedent in this codebase — simplest mechanism that still satisfies "every later phase that adds a route... must extend the document or the build fails."

3. **Whether `POST /api/hours`'s explicit 405 stub should check the session cookie before responding**
   - What we know: REQ-FR-10 only requires the 405 status and (per NFR-F1) the universal headers; the seed's route table shows no auth requirement listed for the 405 case specifically.
   - What's unclear: whether AD-1's "session → ownership → ..." check order is meant to apply even to a method-not-allowed response, or whether routing-level method rejection is understood to precede identity entirely (as Next's own auto-405 does).
   - Recommendation: skip the session check for this one response — return 405 unconditionally through the responder. It is simpler, matches how HTTP method negotiation conventionally precedes authentication, and nothing in the requirements or the curl suite exercises an unauthenticated `POST /api/hours`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything (route handlers, `node:crypto`, `node:test`) | ✓ | v24.19.0 (matches `package.json` `engines.node: "24"`) | — |
| npm | Dependency resolution, `npx` | ✓ | 11.17.0 | — |
| Next.js | Entire app | ✓ | 16.3.4 (`npx next --version`, matches locked stack exactly) | — |
| git | Build-id resolution (`git rev-parse --short HEAD`) | ✓ | 2.50.1.windows.1 | — |
| Playwright | `check-wcag.mjs` only — **not required** by this phase's route suite, which explicitly needs no browser (D-09) | ✓ | 1.62.1 (matches `package.json`) | — |
| Live Vercel Preview/Production deployment | `scripts/curl-suite.sh`'s recorded run (D-09b); confirming Assumptions Log A1/A2/A4 | Not reachable from this research sandbox | — | Human-run per D-09 after the plan ships; this research cannot substitute for it |

**Missing dependencies with no fallback:** none that block *implementation*. The live-deployment falsification items (A1, A2, A4) block *full verification* of the phase's success criteria but not the writing or local-testing of the code.

**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test` + `node:assert/strict`) — no config file, already the project's sole framework |
| Config file | none — invoked as `node --test <path-or-glob>`; `package.json`'s `test` script and `scripts/verify.mjs`'s `fixture-suite` STEP are the two existing invocations |
| Quick run command | `node --test lib/**/*.test.mjs` (proposed location for new unit tests of `applyItem`, `validate.ts`, `scope.ts`, `derive.ts`, `authored.ts` — no server, no build, sub-second) |
| Full suite command | `node scripts/verify.mjs` (the whole gate: source-assertion rules → `next-build` → the new route-suite STEP → contrast/WCAG) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-FR-1 | Session mint, cookie attrs, unknown-persona 404, body identity ignored | route (spawned server) | `node --test scripts/server/route-suite.test.mjs` | ❌ Wave 0 |
| REQ-FR-2 | `GET/DELETE /api/session` | route | same | ❌ Wave 0 |
| REQ-FR-3 | Cookie cleared on DELETE | route | same | ❌ Wave 0 |
| REQ-FR-4 | Orders filtered by account; negative set | route (enumerated negative cases) | same | ❌ Wave 0 |
| REQ-FR-5 | Order detail shape | route | same | ❌ Wave 0 |
| REQ-FR-6 | Byte-identity unowned vs fabricated, every route | route (shared comparator helper) | same | ❌ Wave 0 |
| REQ-FR-7 | Open idempotent, server-stamped | unit (`applyItem` direct) + route | `node --test lib/reconcile/apply.test.mjs` then route suite | ❌ Wave 0 |
| REQ-FR-8 | Close ends segment; `not_open` | unit + route | same | ❌ Wave 0 |
| REQ-FR-9 | Reopen appends, retains priors | unit + route | same | ❌ Wave 0 |
| REQ-FR-10 | Hours GET-only; POST → 405 with headers; accepted-field enumeration | route + build rule | route suite + `node scripts/check-accepted-fields.mjs` | ❌ Wave 0 (both) |
| REQ-FR-11 | Device-reconciled clamp, claim+offset retained | unit (`applyItem` with `arrived_via:"queued"`) + route (via `/api/sync`) | `node --test lib/reconcile/apply.test.mjs` + route suite | ❌ Wave 0 |
| REQ-FR-15 | Photo accepted-field enumeration | build rule | `node scripts/check-accepted-fields.mjs` | ❌ Wave 0 |
| REQ-FR-16 | Voice accepted-field enumeration | build rule | same | ❌ Wave 0 |
| REQ-FR-17 | Authored match; fixture-inputs rule; named-package ban; negative set | build rule + route (negative set) | `node scripts/check-fixture-inputs.mjs`, `node scripts/check-named-packages.mjs` + route suite | ❌ Wave 0 (all) |
| REQ-FR-18 | Asset-not-in-order refusal | route | route suite (curl check C equivalent) | ❌ Wave 0 |
| REQ-FR-19 | Oversized media refusal | route | route suite | ❌ Wave 0 |
| REQ-FR-21 | Proposal id derivation, reproducibility | unit (`derive.ts` direct, called twice, same input → same output) + analysis doc | `node --test lib/proposals/derive.test.mjs` | ❌ Wave 0 |
| REQ-FR-23 | Actor field single producer; forged-actor negative set | build rule + route | `node scripts/check-actor-field.mjs` + route suite | ❌ Wave 0 (both) |
| REQ-FR-24 | Single writer; non-bypassability; closed state set | build rule + analysis doc + route (negative set) | `node scripts/check-single-writer.mjs`, `node scripts/check-non-bypassability.mjs` + route suite | ❌ Wave 0 (all) |
| REQ-FR-27 | `unknown_proposal` identical, decided before state | route | route suite | ❌ Wave 0 |
| REQ-FR-57 | Authorisation via `scope.ts` only; no RBAC; non-bypassability | build rule + analysis doc + inspection | `node scripts/check-single-writer.mjs`-shaped scope-accessor variant | ❌ Wave 0 |
| REQ-FR-61 | No route accepts observation/grade/provenance | build rule | `node scripts/check-accepted-fields.mjs` | ❌ Wave 0 |
| REQ-NFR-F1 | Every response: no-store + store + instance | route (asserted on every request the suite makes, success and error alike) | route suite | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test lib/**/*.test.mjs` (fast, no build, no server — proves the pure logic in `apply.ts`/`validate.ts`/`scope.ts`/`derive.ts`/`authored.ts` in isolation)
- **Per wave merge:** `node scripts/verify.mjs` (full gate — build rules, `next-build`, the HTTP route suite, contrast/WCAG)
- **Phase gate:** Full suite green, then the human-run `scripts/curl-suite.sh` against a Preview deployment, recorded in `docs/analysis/` per D-09(b), before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/server/route-suite.test.mjs` — the HTTP-level proof for every REQ above marked "route"; needs a cookie-jar fetch helper (manual `Set-Cookie` capture → `Cookie` header on the next request) since `node:test` + `fetch` has no built-in cookie jar
- [ ] `lib/reconcile/apply.test.mjs`, `lib/reconcile/validate.test.mjs`, `lib/access/scope.test.mjs`, `lib/proposals/derive.test.mjs`, `lib/verify/authored.test.mjs` — unit-level proofs, none exist yet (the modules themselves don't exist yet either)
- [ ] `scripts/check-single-writer.mjs`, `scripts/check-actor-field.mjs`, `scripts/check-fixture-inputs.mjs`, `scripts/check-named-packages.mjs`, `scripts/check-accepted-fields.mjs`, `scripts/check-non-bypassability.mjs` — each needs its own `.test.mjs` fixture proof per this project's D-23 convention (a fixture that trips the rule, asserting non-zero exit)
- [ ] `docs/analysis/single-writer-non-bypassability.md` — hand-written, does not exist yet
- [ ] `scripts/curl-suite.sh` — rewritten per D-10 from the seed's example, does not exist yet
- [ ] Framework install: none — `node:test` is a Node 24 built-in, already in use

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Partial | No password/credential verification exists (persona selection from a closed set of three, not a secret) — V2's credential-strength controls are not applicable; general "authenticator" hygiene is covered under V3 below |
| V3 Session Management | Yes | Stateless HMAC-SHA256 signed cookie (`node:crypto`), `HttpOnly`, `SameSite=Lax`, `Secure` in production, bounded `Max-Age` (`lib/limits`), session invalidation is explicitly stated as *not* provided (FR-3's documented limitation, not a gap to silently fix) |
| V4 Access Control | Yes | Single accessor (`lib/access/scope.ts`); ownership decided strictly before any state comparison (AD-4); uniform not-found response defeats IDOR-style enumeration; RBAC tier is display-only and never read by an access decision (AD-2) |
| V5 Input Validation | Yes | Hand-rolled strict shape guards in `lib/reconcile/validate.ts` — UUID regex, 64-lowercase-hex SHA-256, ISO-8601 `Z` timestamps, enumerated MIME allowlist, positive-integer byte counts — no schema library, per this project's dependency-minimalism principle |
| V6 Cryptography | Yes | `node:crypto` `createHmac('sha256')` for both the session cookie and derived proposal ids; `timingSafeEqual` is mandatory for every comparison against a secret-derived value |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR via order/proposal id guessing or enumeration | Tampering / Information Disclosure | AD-4's uniform not-found (byte-identical unowned vs unknown, on every route including sync); AD-5's HMAC-derived, unguessable proposal ids (never sequential, never stored-and-leaked) |
| Forged actor/identity field in a request body (`decided_by`, `account`, etc.) | Spoofing | AD-3's single attribution producer; the accepted-field enumeration drops any unrecognised field at parse, before it ever reaches a record |
| Timing attack on the HMAC session signature or a derived proposal id | Information Disclosure | `crypto.timingSafeEqual`, never a variable-time `===`/`Buffer.equals` comparison — guard the length check yourself, since `timingSafeEqual` throws (does not return `false`) on mismatched-length buffers |
| Existence oracle via a header that differs between a 404 and a 200 | Information Disclosure | AD-11's universal-vs-success-only header table; the D-11 byte-identity comparator this phase must build, informed by this session's empirical header inventory (Pitfall 3) |
| Unbounded memory growth / DoS via store flooding or an oversized batch | Denial of Service | AD-10's per-account and global caps with oldest-first eviction; AD-13's batch item/byte ceilings and media/thumbnail caps, enforced with a `413` before the write path is ever reached |
| A `cacheComponents`-eligible route silently serving a build-time-frozen (or, worse, cross-request-shared) response for a route that should be per-user | Information Disclosure (cross-account data leak via unintended caching) | Verified this session that every route with a dynamic segment or a cookie read is safely per-request; the one exception (`/api/health`, which carries no account-specific data anyway) is explicitly forced dynamic with `connection()`. This is a genuine, non-hypothetical class of bug this exact investigation ruled out for this route set — see Pitfall 1 |
| Session cookie exposed to JavaScript or sent over plaintext | Information Disclosure / Spoofing | `HttpOnly` (blocks JS read), `Secure` in production (blocks plaintext transmission), `SameSite=Lax` (mitigates CSRF for state-changing cross-site navigations) |

## Sources

### Primary (HIGH confidence)
- Empirical `next build`/`next start` probes against this exact repository (Next.js 16.3.4, `cacheComponents: true`) — this session; every probe file created, tested, and fully removed, `git status` confirmed clean before and after
- Context7 `/vercel/next.js/v16.2.9` — `route.mdx` (Route Handlers, cookies, HTTP methods, dynamic segments), `connection.mdx`, `poweredByHeader.mdx`, `config-shared.ts`, `react_server_components.rs` (the cacheComponents/route-segment-config incompatibility source)
- This repository's own source, read in full this session: `scripts/verify.mjs`, `scripts/lib/server.mjs`, `scripts/lib/fixtures.mjs`, `scripts/check-structure.mjs`, `scripts/check-register-isolation.mjs`, `scripts/check-wcag.mjs` (relevant sections), `scripts/check-headers.mjs` (relevant sections), `scripts/check-structure.test.mjs`, `lib/data/types.ts`, `lib/copy/governed.ts`, `next.config.ts`, `vercel.json`, `package.json`, `.gitignore`
- `../ipv-demo/lib/rbac/manifest.ts` and `../ipv-demo/lib/decision/store.ts` — read in full this session, the named sibling patterns
- `.planning/phases/03-server-seam/03-CONTEXT.md` (read in full), `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json`
- `docs/planning-artifacts/architecture/architecture-novatek-capture-demo-2026-09-02/ARCHITECTURE-SPINE.md` (AD-1 through AD-23, Dependency direction, Consistency Conventions, Stack, Structural Seed, Capability→Architecture Map)
- `.planning/intel/decisions.md`, `.planning/intel/context.md` (Topics 9, 10, 15, 16)
- `docs/CAPTURE-PLAN-SEED.md` (Repo file tree, API contracts, Offline/sync semantics, Verification, Risks and gotchas)
- `docs/planning-artifacts/epics.md` (Stories 1.3–1.8, 2.3, 2.5–2.7)
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/EXPERIENCE.md` (State Patterns, Voice and Tone — the exact conflict/reject sentences)
- `.planning/phases/01-scaffold-conventions/01-CONTEXT.md`, `.planning/phases/02-fixtures-types/02-CONTEXT.md` (cited D-decisions)

### Secondary (MEDIUM confidence)
- WebSearch: `nextjs.org/blog/next-16-3` and related coverage (Next.js 16.3 changelog summary — Cache Components, instant navigations; no route-handler-breaking changes beyond the cacheComponents interaction already verified directly)
- WebSearch → github.com/vercel/next.js/discussions/84894 (community confirmation, paraphrased in search results, that `dynamic`/`force-dynamic` is incompatible with `cacheComponents` and unnecessary since route handlers are dynamic by default)
- WebFetch → github.com/vercel/next.js/discussions/85326 (maintainer-sourced guidance on `connection()` placement and build-time execution of "pure" route handlers under cacheComponents) — corroborates this session's own empirical finding rather than being the sole source of it
- WebSearch: Vercel `headers`/`vercel.json` documentation (general capability confirmed; exact live-deployment header behaviour on Route Handlers not independently reproduced — see Assumptions Log A2)

### Tertiary (LOW confidence)
- None presented as fact without the corroboration noted above; all LOW-confidence items are explicitly logged in the Assumptions Log rather than stated in the main body.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, versions confirmed directly against this repo's installed `node_modules`
- Architecture (single-writer, uniform not-found, derived ids, one responder, memory store): HIGH — directly sourced from the locked, adopted architecture spine and corroborated by working sibling code read in full
- The `cacheComponents`/`dynamic` finding: HIGH — empirically reproduced multiple times against this exact repository and version, cross-confirmed by two independent community/maintainer sources
- Live-deployment-only facts (Vercel platform headers, Fluid Compute concurrency): LOW — explicitly logged in Assumptions Log, flagged for the same live-deployment falsification pattern this project already used successfully in Phase 1 (D-22)
- Pitfalls: HIGH for Pitfalls 1, 2, 4 (verified or directly documented); MEDIUM for Pitfall 3's local-vs-live gap (local half verified, live half flagged)

**Research date:** 2026-09-17
**Valid until:** 14 days for the Next.js/`cacheComponents`-specific findings (fast-moving: this project's own architecture spine notes four 16.3.x patches shipped since 16.3.0 with none on the 16.2.x line — re-verify against whatever patch version is actually installed if this research is used after a `next` upgrade); 30 days for the codebase-pattern findings (sibling code, existing scripts), which change only when this repository's own Phase 1/2 output changes
