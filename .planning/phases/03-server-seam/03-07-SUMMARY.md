---
phase: 03-server-seam
plan: 07
subsystem: api
tags: [nextjs-route-handler, session-cookie, order-access, connection-api, cache-components]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/http/respond.ts's ok/fail/notFound/setCookie and lib/http/contract.ts's HEADER_TABLE (03-02); lib/store/memory.ts's BOOT_ID/storeStats/uptimeSeconds/readClock/readClocksForAccount/readCaptures/readProposalsForAsset/readDecisions (03-02); lib/session/cookie.ts's mintSession/readSession/sessionCookieOptions/clearedSessionCookieOptions (03-03); lib/attribution/index.ts's deriveAccount and lib/access/scope.ts's ordersFor/orderOwned/assetsForOrder (03-03); lib/verify/authored.ts's authoredMatch (03-04); lib/reconcile/apply.ts's noteContact and lib/reconcile/validate.ts's pick/ACCEPTED_BODY_FIELDS (03-05); lib/data/artisans.ts's ARTISAN_BY_ID and lib/limits/index.ts's STORE_TTL_SECONDS (03-01)"
provides:
  - "app/api/health/route.ts — GET/HEAD probe target calling connection() first, so boot_id/uptime_s never freeze at build time"
  - "app/api/session/route.ts — POST mint / GET whoami / DELETE clear for the stateless cap_session cookie"
  - "app/api/orders/route.ts — GET the acting account's own order list, filtered through ordersFor alone"
  - "app/api/orders/[id]/route.ts — GET the order detail with observation_ids stripped, its clock, re-derived verifications, and its proposals/decisions, with a uniform not-found for an unowned or fabricated id"
affects: [03-08, 03-09, 03-10, 03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route handlers compose lib/session, lib/attribution, lib/access, lib/reconcile (noteContact only) and lib/store's read-only exports directly; no route constructs its own Response — every response goes through lib/http/respond.ts"
    - "await connection() as the literal first statement is the one route-level idiom that defeats build-time static prerendering under cacheComponents: true, used only where a route has neither a cookie read nor a dynamic segment"
    - "A route re-derives a value with no persisted store of its own (VerificationResult) by calling the exact same pure function the writer used, rather than adding new stored state outside this plan's file scope"

key-files:
  created:
    - app/api/health/route.ts
    - app/api/session/route.ts
    - app/api/orders/route.ts
    - app/api/orders/[id]/route.ts
  modified: []

key-decisions:
  - "Reconstructed GET /api/orders/[id]'s verifications array from stored verify-purpose Captures via authoredMatch(assetId, FIXTURE_VERSION), since lib/store/memory.ts persists no VerificationResult at all and AD-8 makes persisting one unnecessary (a pure function of assetId+fixtureSet, per authoredMatch's own documented contract that a calling route attaches capture_id/verified_at)"
  - "GET /api/orders/[id]'s Decision-to-order join goes through the order's own Proposal set (a Decision carries no order_id field of its own) — the only join available between the two record types"
  - "app/api/session/route.ts treats a parsed-but-non-object JSON body (array, string, number, null) as an empty object before calling pick(), rather than letting a bare Object.prototype.hasOwnProperty.call on a non-object value throw"
  - "X-CAP-Account is stamped on GET /api/session, GET /api/orders and GET /api/orders/[id], not only POST /api/session, per this plan's own literal instruction — see Issues Encountered for the resulting HEADER_TABLE metadata note"

requirements-completed: [REQ-FR-1, REQ-FR-2, REQ-FR-3, REQ-FR-4, REQ-FR-5, REQ-FR-57, REQ-NFR-F1]

# Metrics
duration: 28min
completed: 2026-09-17
---

# Phase 3 Plan 7: Health, Session, Orders List and Order Detail Routes Summary

**Four transport-only routes — health probe, session mint/whoami/clear, filtered orders list, order detail — composing the already-tested 03-02/03-03/03-04/03-05 lib modules with no segment-config export anywhere; `npm run build` marks all four dynamic (`ƒ`).**

## Performance

- **Duration:** 28 min (approx.)
- **Started:** 2026-09-17T21:10:20Z (approx., continuing directly from 03-06)
- **Completed:** 2026-09-17T21:38:11Z
- **Tasks:** 2 completed
- **Files modified:** 4 (4 created, 0 modified)

## Accomplishments

- `app/api/health/route.ts`: `GET`/`HEAD` both call `connection()` (awaited) as the literal first statement, before `BOOT_ID`/`storeStats()`/`uptimeSeconds()` are read — the one route in the phase with neither a cookie read nor a dynamic segment, so without it the route would be eligible for build-time static prerendering and curl check H would pass against a frozen snapshot. Neither handler reads the cookie, derives an account, or stamps last-contact: it is an unauthenticated probe target.
- `app/api/session/route.ts`: `POST` parses the body defensively, picks only `persona_id` through `ACCEPTED_BODY_FIELDS.session`, resolves it through `ARTISAN_BY_ID` (refusing `unknown_persona` on a miss), mints the session, and attaches the cookie via `setCookie`/`sessionCookieOptions` on the response `ok()` already built. `GET` reads the cookie, derives the account (`fail("no_session")` on failure), stamps contact, and returns the artisan record. `DELETE` clears the cookie unconditionally, carrying FR-3's stated limitation and D-08's "no clock segment touched here" as comments.
- `app/api/orders/route.ts`: `GET` derives the account, stamps contact, and returns `{ orders, clocks }` from `ordersFor`/`readClocksForAccount` alone — the handler never reads a query string, a body, or any header beyond the session cookie, so FR-4's negative set (account query parameter, body field, `X-Account` header) has no reader to exploit.
- `app/api/orders/[id]/route.ts`: `GET` resolves `context.params`, derives the account, stamps contact, and calls `orderOwned(account, id)` as the single not-found decision point — an unowned id and a fabricated id both resolve through the same `notFound()` call site. On success it assembles `{ order, assets, clock, verifications, proposals, decisions }`: assets have `observation_ids` stripped by building a new object per entry; a missing clock falls back to a zero-segment shape; proposals/decisions are read per asset and joined back to this order; verifications are re-derived per recorded verify-purpose capture (see Deviations).
- `npm run verify` run end-to-end after both tasks: exit 0 across all 21 steps — 246 fixture-suite tests, 148 unit-suite tests, zero problems on every check, including `next build` (all four new routes plus `/api/session` marked `ƒ`), `check-structure-build-output`, `check-register-isolation-bundle`, `check-contrast` and `check-wcag`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write app/api/health/route.ts and app/api/session/route.ts** - `76b46d0` (feat)
2. **Task 2: Write app/api/orders/route.ts and app/api/orders/[id]/route.ts** - `86bd513` (feat)

## Files Created/Modified

- `app/api/health/route.ts` - GET/HEAD probe target, `connection()`-first, no cookie/account touch
- `app/api/session/route.ts` - POST mint / GET whoami / DELETE clear for `cap_session`
- `app/api/orders/route.ts` - GET the session account's own orders and clocks
- `app/api/orders/[id]/route.ts` - GET the order detail, server-only field stripped, uniform not-found

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No persisted `VerificationResult` store to read "verifications" from**
- **Found during:** Task 2 (`app/api/orders/[id]/route.ts`)
- **Issue:** The plan's action text says "`verifications`, `proposals` and `decisions` are read from the store for this account and filtered to this order," but `lib/store/memory.ts` (shipped complete in 03-02, extended only with `readUnattributedAttempts()` in 03-05) exposes no `verifications` map and no reader for one — 03-02-SUMMARY.md's own Next Phase Readiness note anticipated exactly this: "If a later route plan needs a read this module does not yet expose... that is that plan's own addition, not a gap here." A `VerificationResult` is never persisted anywhere; `lib/reconcile/apply.ts` only ever returns one transiently inside a sync response.
- **Fix:** Reconstructed the `verifications` array inside the route itself from Captures already persisted with `purpose === "verify"` for this order (`Capture` carries `order_id` and `asset_id` directly), calling the exact same pure `authoredMatch(assetId, FIXTURE_VERSION)` the writer used, and attaching `capture_id`/`verified_at` exactly as `authoredMatch`'s own header comment documents ("capture_id and verified_at are the two VerificationResult fields a calling route attaches once authoredMatch() returns"). `verified_at` is taken from the capture's own `recorded_at`, which was stamped from the identical `nowMs` value the original verification's `verified_at` used inside `applyByKind`, so the reconstruction is byte-exact, not an approximation. No change to `lib/store/memory.ts`, `lib/reconcile/apply.ts`, or any file outside this plan's declared `files_modified` list.
- **Files modified:** `app/api/orders/[id]/route.ts` (authored fresh; no other file touched)
- **Verification:** `npx tsc --noEmit` confirms the constructed object satisfies `VerificationResult`'s full shape; `npm run verify` passes end-to-end (246 fixture-suite + 148 unit-suite tests, zero problems). Functional correctness of the reconstructed values over the wire rides plan 03-13's route suite, per 03-VALIDATION.md's own note that 3-07-02's route half "rides 03-13."
- **Committed in:** `86bd513` (Task 2 commit)

**2. [Rule 1 - Bug] Guarded `POST /api/session` against a non-object parsed body**
- **Found during:** Task 1 (`app/api/session/route.ts`)
- **Issue:** `request.json()` can resolve to any valid JSON value, not only an object — a literal `null`, an array, a string or a number all parse without throwing. Passing such a value straight into `lib/reconcile/validate.ts`'s `pick()` (which calls `Object.prototype.hasOwnProperty.call(body, field)`) throws a `TypeError` when `body` is `null`, crashing the request instead of refusing it — the "crashes on null input" case named directly in the deviation-rule edge-case guide.
- **Fix:** Narrowed the parsed value to a plain object (`typeof === "object" && !== null`) before calling `pick()`, defaulting to `{}` otherwise — mirroring `lib/reconcile/apply.ts`'s own private `payloadRecord()` helper's identical defensive pattern for the same class of input.
- **Files modified:** `app/api/session/route.ts`
- **Verification:** `npx tsc --noEmit` and `npm run verify` pass; reasoned through by hand, since no route-suite test yet exists in this plan's own scope to exercise a literal `null` body over the wire (that lives in 03-13).
- **Committed in:** `76b46d0` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking-gap fill using only existing pure functions, 1 crash-on-null-input bug fix).
**Impact on plan:** Both were necessary for the plan's own stated response shape (verifications present, no crash on a malformed body) to actually hold. No scope creep — no file outside this plan's declared `files_modified` list was touched, and no new stored state or library was introduced.

## Known Stubs

None — every field in every response is derived from a real store read or a real, already-tested pure function; no hardcoded placeholder or empty-by-construction value reaches a response.

## Issues Encountered

- `lib/http/contract.ts`'s `HEADER_TABLE` (03-02) documents `X-CAP-Account`'s `routes` field as `["POST /api/session"]` and its `reason` text says the header "only ever accompanies the 201 it was minted for." This plan's own literal action text requires stamping `X-CAP-Account` on `GET /api/session`, `GET /api/orders` and `GET /api/orders/[id]` as well, per FR-4's "the acting account is carried in a response header" theme. `ok()`'s runtime guard only checks a header name's presence in `HEADER_TABLE`, not its `routes` field, so nothing fails at build or request time — but that field and its reason text are now stale documentation. Left unchanged since `lib/http/contract.ts` is outside this plan's `files_modified` scope; flagging for whichever later plan next touches `HEADER_TABLE`.
- `npm run verify`'s `eslint` step reported 2 pre-existing warnings (`'_drop' is assigned a value but never used`) in `lib/reconcile/apply.test.mjs` and `lib/reconcile/validate.test.mjs` — both files predate this plan (03-05) and neither was touched here; `eslint .` has no `--max-warnings` flag, so a warning does not fail the step. Logged for visibility, not fixed, per the scope boundary.
- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts` and `scripts/claims-audit.mjs` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --short` before and after both task commits shows the same two files modified and the same three `docs/` paths untracked, none staged, edited or reverted here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `app/api/health/route.ts`, `app/api/session/route.ts`, `app/api/orders/route.ts` and `app/api/orders/[id]/route.ts` are all in place, type-check clean, and build dynamic (`ƒ`); plan 03-08 continues with `app/api/orders/[id]/open` and `close`.
- `npm run verify` passes end-to-end at 21 steps (246 fixture-suite tests, 148 unit-suite tests); no blockers for 03-08.
- The HTTP-level proof of these four routes' actual behavior (curl checks A and H, FR-4's negative set, FR-6's byte-identity, the reconstructed `verifications` array's real content) rides plan 03-13's `scripts/server/route-suite.proof.mjs`, per 03-VALIDATION.md's own routing map (3-07-01/3-07-02 marked "route half rides 03-13") — this plan's own verification covers the type/build/static-analysis layer only.
- Flag for 03-12/03-13 (or whichever plan next edits `lib/http/contract.ts`): `X-CAP-Account`'s `HEADER_TABLE` metadata should be widened to name all four routes that now emit it (see Issues Encountered).

## Self-Check: PASSED

All `key-files.created` verified present on disk: `app/api/health/route.ts` (48 lines), `app/api/session/route.ts` (93 lines, ≥90 required), `app/api/orders/route.ts` (46 lines), `app/api/orders/[id]/route.ts` (103 lines, ≥70 required). Both commit hashes (`76b46d0`, `86bd513`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -1 --format=%B` immediately after each commit). Neither commit shows any file deletion (`git diff --diff-filter=D` empty for both). `npm run verify` re-run end-to-end after Task 2: exit 0, all 21 steps, 246 fixture-suite tests and 148 unit-suite tests, zero problems reported by any check. All of Task 1's and Task 2's own `<acceptance_criteria>` greps re-run directly against the final files and passed exactly as specified (`export const runtime`/`dynamic` absent repo-wide; `connection()` exactly twice in health, each the first statement; `noteContact`/`readSession`/`cookies` absent from health; `X-CAP-Account` twice in session; `pick(` present against `ACCEPTED_BODY_FIELDS.session`; `NextResponse`/`new Response(` absent from all four files; `params: Promise<{ id: string }>` present and `RouteContext` absent in the `[id]` route; `observation_ids` present and `delete ` absent; `notFound()` called exactly once).

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
