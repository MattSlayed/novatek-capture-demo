---
phase: 03-server-seam
plan: 11
subsystem: api
tags: [nextjs-route-handler, order-access, walk-payload, single-writer, cache-components]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/copy/governed.ts's GOVERNED triples (Phase 1); lib/store/memory.ts's BOOT_ID/readClock/readCaptures/readProposalsForAsset/readDecisions (03-02); lib/access/scope.ts's assetsForOrder/orderOwned and lib/attribution/index.ts's ActingAccount (03-03); lib/verify/authored.ts's authoredMatch (03-04); lib/reconcile/apply.ts's noteContact (03-05); lib/limits/index.ts's STORE_TTL_SECONDS (03-01); lib/http/respond.ts's ok/fail/notFound and lib/http/contract.ts's HEADER_TABLE (03-02)"
provides:
  - "lib/walk/payload.ts — buildWalkPayload(account, order, nowMs?), the whole WalkPayload for one order assembled from store reads and fixtures alone, nothing mutated"
  - "app/api/walk/[orderId]/route.ts — GET, the record handed onward: session, noteContact, orderOwned as the single not-found decision point, buildWalkPayload, the two success-only headers"
affects: [03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildWalkPayload follows ../ipv-demo/lib/rbac/manifest.ts's buildManifest() shape: one function, local arrays, a per-entry loop and branch per asset, one big typed return — not a set of exported helpers"
    - "An asset with no verify-purpose capture gets a hand-built honest-empty VerificationResult rather than a call to authoredMatch(), which would otherwise report a real match for an asset that exists in the fixture set even though nothing was ever photographed"
    - "accepted/rejected/open proposal sets are disjoint by construction: a single filter on Proposal.state, never three separate queries that could drift apart"

key-files:
  created:
    - lib/walk/payload.ts
    - lib/walk/payload.test.mjs
    - app/api/walk/[orderId]/route.ts
  modified: []

key-decisions:
  - "accepted_at reads the decision's own decided_at field (not recorded_at) — the name pairs semantically with accepted_by/decided_by, and both are already-validated, server-recorded values by the time a route reads them back"
  - "The three proposal sets (candidate_facts/rejected/open) cover every proposal this phase's writer can produce: lib/reconcile/apply.ts's assertProposalState never assigns the closed set's fourth member (superseded), so filtering on state alone is exhaustive today — documented in a comment rather than silently assumed"
  - "A missing Decision for an accepted proposal falls back to accepted_by: null, accepted_at: null, arrived_via: \"immediate\" — a type-safety accommodation for a case AD-6 makes unreachable (a Decision is created in the same commit that flips a proposal to accepted), not a real path"

requirements-completed: [REQ-FR-5, REQ-FR-24, REQ-NFR-F1]

# Metrics
duration: 26min
completed: 2026-09-17
---

# Phase 3 Plan 11: Walk Payload and Route Summary

**One assembler (`buildWalkPayload`) turns the store and the fixtures into the whole `WalkPayload` for an order — disjoint accepted/rejected/open sets, an honest empty verification when nothing was captured, both governed statements assembled from their `GOVERNED` triple — served by a five-line-thin `GET /api/walk/[orderId]` that authorises once and never re-reads what the assembler already read.**

## Performance

- **Duration:** 26 min (approx.)
- **Started:** 2026-09-17T23:31:02Z (approx., continuing directly from 03-10)
- **Completed:** 2026-09-17T23:57:05Z
- **Tasks:** 2 completed
- **Files modified:** 3 (3 created, 0 modified)

## Accomplishments

- `lib/walk/payload.ts`: `buildWalkPayload(account, order, nowMs?)` assembles the full `WalkPayload` in one function, mirroring `../ipv-demo/lib/rbac/manifest.ts`'s `buildManifest()` shape — local arrays, a per-entry loop and branch for each asset, one big typed return at the end. Per asset: `verification` is the most-recent verify-purpose capture's authored match (via `authoredMatch`, `capture_id`/`verified_at` attached from that capture) or a hand-built honest-empty state when none exists — `authoredMatch` is deliberately never called for that case, since a known asset under the live fixture version would otherwise answer "matched" for a photograph that was never taken. `captures[]` carries every stored capture for the asset in this order, each extended with a derived `thumb_present` and the literal `audio_left_device: false`. `candidate_facts`/`rejected`/`open` are built from one filter on `Proposal.state`, so the three sets are disjoint by construction; `candidate_facts` entries read `accepted_by`/`accepted_at`/`arrived_via` off the matching `Decision` record, never off any value a client claimed. `store.statement` and `redaction.statement` are assembled from `GOVERNED.memoryStore`'s and `GOVERNED.noRedaction`'s triples — never a restated literal. `referrals: []` is P9's placeholder, stated as the honest present state. The module imports only read-only store accessors, nothing from `lib/reconcile`, nothing from `app/`, and never the server-only lookup module P9 introduces.
- `lib/walk/payload.test.mjs`: 16 tests, all state built through `applyItem` (never a direct store write) — every top-level key present on a fresh payload with one asset entry per `order.asset_ids`; `store.instance`/`store.ttl_s` match `BOOT_ID`/`STORE_TTL_SECONDS`; both statements equal their `GOVERNED` triple's concatenation; an untouched asset carries the honest-empty verification with no fabricated match; no asset entry carries `observation_ids`; a verify-purpose capture with a thumbnail yields `thumb_present: true` and one without yields `false`; every capture states `audio_left_device: false`; an accepted proposal lands in `candidate_facts` with a server-derived `accepted_by`/`accepted_at`/`arrived_via` and nowhere else; a rejected proposal lands in `rejected` and survives a later, wholly unrelated capture on a different asset (FR-25, curl E); the undecided third proposal remains in `open`; an explicit `nowMs` pins `issued_at`.
- `app/api/walk/[orderId]/route.ts`: `GET` awaits `context.params`, derives the account (`fail("no_session")` on failure), stamps contact, and calls `orderOwned` as the single not-found decision point — an unowned id and a fabricated id resolve through the identical `notFound()` call, restating FR-6 as FR-52. On success it calls `buildWalkPayload` once and responds through `ok()`, counting `X-CAP-Walk-Facts` off the payload just built (never a second store query, so the header and the body can never disagree) and stamping the literal `X-CAP-Redaction: none` alongside `X-CAP-Account`. No `runtime`/`dynamic` export; the route reads nothing the assembler already read.
- `npm run verify` run end-to-end after both task commits: **all steps exited 0** — 164 unit-suite tests (148 carried forward + 16 new), the fixture suite, `next build` (all twelve `app/api` routes, including `/api/walk/[orderId]`, marked dynamic `ƒ`), `check-governed`, `check-fixture-inputs`, `check-named-packages`, `check-register-isolation(-bundle)`, `check-contrast`, `check-wcag`, zero problems on every check.
- **Live smoke-tested against a running production server** (beyond the plan's own required checks, given curl check E's significance to this phase): minted a session for `acc-mabaso`, then confirmed — `GET /api/walk/wo-0142` returns 200 with the full payload shape, three asset entries, `redaction.ran: false`, `referrals: []`, and a `X-CAP-Walk-Facts` count that matches the body's own `candidate_facts` total exactly; `GET /api/walk/wo-0137` (another account's real order) and `GET /api/walk/wo-9999-does-not-exist` (fabricated) return byte-identical 404 bodies and headers outside the platform exclusion list, with neither success-only header present on either; a request with no session cookie returns 401. Server stopped cleanly afterward; port confirmed free.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write lib/walk/payload.ts and its unit test** - `a82161d` (feat)
2. **Task 2: Write the walk route** - `e0f8795` (feat)

## Files Created/Modified

- `lib/walk/payload.ts` - `buildWalkPayload`, the one assembler for the whole order record
- `lib/walk/payload.test.mjs` - 16 tests, state built exclusively through `applyItem`
- `app/api/walk/[orderId]/route.ts` - `GET`, auth + one assembler call + two headers + respond

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `lib/walk/payload.ts`'s `referrals: []` is a literal empty array on every payload this plan can produce. This is D-03's own explicit, intentional shape for Phase 3 ("`referrals: []` until P9") — not an omission this plan introduced — and it is resolved by Phase 9, which supplies both the referral route and the entries. Documented here for traceability, not as a gap blocking this plan's own goal.
- The honest-empty `VerificationResult` (`capture_id: ""`, `verified_at: ""`) that `lib/walk/payload.ts` returns for an asset with no verify-purpose capture is likewise intentional per the plan's own instruction ("the honest empty state when there is none... do not invent a verification that never ran"), proven by its own unit test, not a placeholder standing in for missing functionality.

## Issues Encountered

- Two drafting corrections caught during this plan's own acceptance-criteria verification loop, before either commit — the same class of self-tripping-comment issue this project has repeatedly logged (STATE.md's Phase 3 decisions for `lib/attribution`, `lib/access`, and the 03-02/03-09/03-10 summaries):
  1. `lib/walk/payload.ts`'s first draft described empty verification fields as "a fabricated id or timestamp" — the word "timestamp" contains "stamp" as a substring, which is one of the four literal strings Task 1's own acceptance criterion greps for (to prove no import from `lib/store/memory.ts`'s mutating set). Reworded to "a fabricated id or a fabricated moment in time" before running the acceptance checks; no incorrect version was ever committed.
  2. `app/api/walk/[orderId]/route.ts`'s first draft explained the `X-CAP-Redaction` header's distinction from the body's `redaction.statement` by naming `GOVERNED.noRedaction` directly — but Task 2's own acceptance criterion greps this exact file for the literal `GOVERNED` (to prove the route reads nothing the assembler already read) and would have failed against it. Reworded to describe the sentence as "already resolved by the assembler that built this payload," without naming the module, before running the acceptance checks; no incorrect version was ever committed.
- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts`, `scripts/claims-audit.mjs` and `docs/CAPTURE-PLAN-SEED.md` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --short` before and after both task commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here.
- Carried forward from every prior plan in this phase, unchanged: `lib/http/contract.ts`'s `HEADER_TABLE` entry for `X-CAP-Account` still lists its `routes` field as `["POST /api/session"]` only, now nine routes further stale (this plan's route emits it too, and `X-CAP-Walk-Facts`/`X-CAP-Redaction` were already correctly registered by 03-02 under `GET /api/walk/[orderId]`, since that plan anticipated this route by name). `ok()`'s runtime guard checks only a header name's presence in `HEADER_TABLE`, not its `routes` field, so nothing fails at build or request time. `lib/http/contract.ts` is outside this plan's `files_modified` scope; flagging again for whichever later plan next touches it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/walk/payload.ts` and `app/api/walk/[orderId]/route.ts` are both in place, type-check clean, unit-tested, live-smoke-tested, and build dynamic (`ƒ`). All twelve `app/api` routes this phase names are now shipped (03-07 through 03-11); only 03-12 through 03-16 (build rules, the non-bypassability document, and the route-suite/curl proofs) remain.
- `npm run verify` passes end-to-end (164 unit-suite tests, 246 fixture-suite tests carried forward, zero problems on every check); no blockers for 03-12.
- The reviewer-facing curl suite's check E (rejections retained in the walk route) and the full FR-6/FR-52 byte-identity comparator formally ride plan 03-13's `scripts/server/route-suite.proof.mjs`, per 03-VALIDATION.md's routing map — this plan's own committed verification covers the unit/type/build/static-analysis layer; the ad hoc live-server smoke test in Accomplishments (not part of the committed suite) additionally confirmed the wire-level behavior empirically ahead of that plan.
- Carried forward and restated above: `HEADER_TABLE`'s `X-CAP-Account` entry's `routes` field is stale by one more route as of this plan; still a documentation-only gap, still deferred to whichever plan next edits `lib/http/contract.ts`.

## Self-Check: PASSED

All `key-files.created` verified present on disk: `lib/walk/payload.ts` (202 lines, well above the plan's 140-line minimum), `lib/walk/payload.test.mjs`, `app/api/walk/[orderId]/route.ts` (63 lines, above the plan's 45-line minimum). Both commit hashes (`a82161d`, `e0f8795`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -1 --format=%B` immediately after each commit). Neither commit shows any file deletion (`git diff --diff-filter=D` empty for both). `npm run verify` re-run end-to-end after Task 2: all steps exited 0, 164 unit-suite tests, zero problems reported by any check. Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final files and passed exactly as specified. The plan's own full `<verification>` block was re-run directly: `node --test lib/walk/payload.test.mjs`, `npx next typegen && npx tsc --noEmit && npm run build`, and `node scripts/check-governed.mjs` all exit 0; `npm run verify` exits 0 end to end. Beyond the plan's own required checks, a live production-server smoke test (documented in Accomplishments) empirically confirmed the owned-order shape, the header/body fact-count agreement, the unowned-vs-fabricated byte-identity, and the no-session 401.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
