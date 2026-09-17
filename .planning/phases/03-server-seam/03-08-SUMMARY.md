---
phase: 03-server-seam
plan: 08
subsystem: api
tags: [nextjs-route-handler, single-writer, idempotent-clock, cache-components]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/reconcile/apply.ts's applyItem/noteContact and lib/reconcile/validate.ts's pick/ACCEPTED_BODY_FIELDS (03-05); lib/http/respond.ts's ok/fail/notFound and lib/http/contract.ts's HEADER_TABLE (03-02); lib/session/cookie.ts's readSession (03-03); lib/attribution/index.ts's deriveAccount and lib/access/scope.ts's orderOwned (03-03); lib/store/memory.ts's readClocksForAccount (03-02); lib/data/types.ts's SyncItem/SYNC_ITEM_SCHEMA_VERSIONS/OrderClock (03-01/03-02)"
provides:
  - "app/api/orders/[id]/open/route.ts — POST, idempotent clock start through applyItem, the one writer"
  - "app/api/orders/[id]/close/route.ts — POST, clock close carrying applyItem's own not_open conflict on a closed or never-opened order"
  - "app/api/hours/route.ts — GET, every segment readClocksForAccount holds, withholding nothing; POST, a hand-written 405 through lib/http/respond.ts"
affects: [03-09, 03-10, 03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Both write routes translate a request into a server-built SyncItem (client_id from the picked body is the only value the request contributes) and hand it to applyItem — the identical shape the online path and a future /api/sync both use, so there is one writer for the clock's state transitions"
    - "Ownership decided via orderOwned before the request body is ever parsed, so a malformed body on an order this account does not hold still resolves to the uniform not-found, never a bad_request that would distinguish the two"
    - "A read-only route (GET /api/hours) takes no query parameter and no body at all, so FR-10's 'no artisan-supplied duration or hour value' holds for lack of any reader, not by a rejected value"

key-files:
  created:
    - app/api/orders/[id]/open/route.ts
    - app/api/orders/[id]/close/route.ts
    - app/api/hours/route.ts
  modified: []

key-decisions:
  - "Guarded the open/close POST bodies against a parsed-but-non-object JSON value (array, string, number, null) before calling pick(), mirroring the identical Rule 1 fix 03-07 already made for POST /api/session — pick()'s Object.prototype.hasOwnProperty.call would throw on a null body otherwise, and the plan's own read_first pointed at that exact route as this phase's own established analog"
  - "A recorded/duplicate outcome's result.server?.clock is read with the same empty-clock fallback shape app/api/orders/[id]/route.ts's GET handler already uses, rather than a non-null assertion — applyByKind always attaches a clock to a recorded or duplicate order_open/order_close result in practice (it reads the clock back immediately after writing it), so the fallback is unreachable but keeps both routes provably total under strict null checks"
  - "outcome.code === null is narrowed with an explicit early return before the final fail() call, rather than a non-null assertion — ApplyOutcome's own type allows null only for the recorded/duplicate branch already handled above, so this is a type-safety accommodation, not a reachable path for an order_open or order_close item"

requirements-completed: [REQ-FR-7, REQ-FR-8, REQ-FR-9, REQ-FR-10, REQ-NFR-F1]

# Metrics
duration: 20min
completed: 2026-09-17
---

# Phase 3 Plan 8: Clock Open, Close and Hours Routes Summary

**Three thin route handlers — POST open/close translate a request into a server-built SyncItem for lib/reconcile/apply.ts's applyItem, and GET/POST /api/hours reads every stamped segment back while refusing a write by hand — with no route exporting `runtime`/`dynamic` and `npm run build` marking all three dynamic (`ƒ`).**

## Performance

- **Duration:** 20 min (approx.)
- **Started:** 2026-09-17T21:45:00Z (approx., continuing directly from 03-07)
- **Completed:** 2026-09-17T22:05:00Z
- **Tasks:** 2 completed
- **Files modified:** 3 (3 created, 0 modified)

## Accomplishments

- `app/api/orders/[id]/open/route.ts`: `POST` resolves the dynamic segment, derives the account (`fail("no_session")` on failure), stamps contact, and calls `orderOwned` before the body is ever parsed — a malformed body on an order this account does not hold still resolves `notFound()`. The body is parsed defensively and picked down to `client_id` alone through `ACCEPTED_BODY_FIELDS.orders_open`; every other field on the `SyncItem` handed to `applyItem` (`kind`, `schema_version`, `order_id`, `created_at`, `attempts`, `state`, `claimed_account_id`, an empty `payload`) is server-derived or a fixed enumerated value. A `recorded` or `duplicate` outcome renders as a plain `200 { clock }` with `X-CAP-Clock`/`X-CAP-Account` — D-06/FR-7's idempotent-open guarantee, since `applyItem` itself decides whether a second open is a new segment or the unchanged clock. Anything else routes through `fail(outcome.code, result.detail)`.
- `app/api/orders/[id]/close/route.ts`: the identical shape, deliberately duplicated rather than shared per the plan's own instruction, for `order_close`. A closed or never-opened order's `409 not_open` comes back exactly as `applyItem`/`lib/copy/conflicts.ts` wrote it — no route file quotes or paraphrases that sentence.
- `app/api/hours/route.ts`: `GET` derives the account, stamps contact, and returns `{ clocks: readClocksForAccount(account.account_id) }` — every segment, its source, and (where present) the device-claimed start and measured offset, withheld nothing (FR-58). The handler reads no query parameter and no body at all. `POST` is `return fail("method_not_allowed")` with no session read, so Next's headerless framework-level 405 (RESEARCH.md Pitfall 2) never answers this route and NFR-F1's universal headers still apply to the refusal.
- `npm run build` (with `CAPTURE_BUILD_ID` resolved from `git rev-parse --short HEAD`, per this project's own build-id gate) confirms all three new routes plus every existing route in the tree are marked dynamic (`ƒ`), none static or partially prerendered, and the build carries zero `runtime`/`dynamic` segment-config exports anywhere under `app/api/`.
- `npm run verify` run end-to-end after both tasks: **all steps exited 0** — fixture-suite and unit-suite (148 `lib/**/*.test.mjs` tests among them) pass, `next-build` marks all eight routes correctly, `check-structure`, `check-register-isolation(-bundle)`, `check-fixture-inputs`, `check-named-packages`, `check-contrast` and `check-wcag` all report zero problems.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the open and close routes** - `41f7526` (feat)
2. **Task 2: Write the hours route with its explicit 405** - `15a4e27` (feat)

## Files Created/Modified

- `app/api/orders/[id]/open/route.ts` - POST, idempotent clock start through `applyItem`
- `app/api/orders/[id]/close/route.ts` - POST, clock close carrying `applyItem`'s `not_open` conflict
- `app/api/hours/route.ts` - GET server-derived hours in full; POST an explicit 405

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarded open/close POST bodies against a non-object parsed value**

- **Found during:** Task 1 (`app/api/orders/[id]/open/route.ts`, `app/api/orders/[id]/close/route.ts`)
- **Issue:** `request.json()` can resolve to any valid JSON value, not only an object — a literal `null`, an array, a string or a number all parse without throwing. Passing such a value straight into `lib/reconcile/validate.ts`'s `pick()` (which calls `Object.prototype.hasOwnProperty.call(body, field)`) throws a `TypeError` when the value is `null`, crashing the request instead of refusing it — the exact class of bug 03-07-SUMMARY.md already documented and fixed for `POST /api/session`, and the plan's own `read_first` pointed at that same file's body-parse block as this route's analog.
- **Fix:** Narrowed the parsed value to a plain object (`typeof === "object" && !== null`) before calling `pick()`, defaulting to `{}` otherwise — identical to `app/api/session/route.ts`'s own guard.
- **Files modified:** `app/api/orders/[id]/open/route.ts`, `app/api/orders/[id]/close/route.ts`
- **Verification:** `npx tsc --noEmit`, `npx next build` and `npm run verify` all pass; reasoned through by hand against the established precedent, since neither route's own HTTP-level proof lives in this plan's scope (it rides plan 03-13's route suite, per 03-VALIDATION.md's routing map for this phase).
- **Committed in:** `41f7526` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 crash-on-non-object-input bug fix, applied identically to both write routes in the same commit).
**Impact on plan:** Necessary so the plan's own stated behavior (a picked body, never a crash) actually holds for every JSON value a caller could send, not only the well-formed ones the plan's prose describes. No scope creep — no file outside this plan's declared `files_modified` list was touched.

## Known Stubs

None — every field in every response is derived from a real call into `lib/reconcile/apply.ts`'s `applyItem` or `lib/store/memory.ts`'s `readClocksForAccount`; no hardcoded placeholder or empty-by-construction value reaches a response.

## Issues Encountered

- `next typegen` and `next build` both require `CAPTURE_BUILD_ID` (or one of the two Vercel env vars `next.config.ts` also accepts) to be set before they will run — this is `scripts/verify.mjs`'s own documented D-03 resolution (`git rev-parse --short HEAD` in the child environment only), not a new finding; noted here only because this plan's own manual pre-commit verification needed the same variable set by hand in the interactive shell, exactly as STATE.md's Phase 1 decisions already record.
- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts`, `scripts/claims-audit.mjs` and `docs/CAPTURE-PLAN-SEED.md` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --short` before and after both task commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here. `node scripts/claims-audit.mjs` (run as part of `npm run verify`) still exits 0 against the modified script.
- `lib/http/contract.ts`'s `HEADER_TABLE` entry for `X-CAP-Account` still lists only `["POST /api/session"]` in its `routes` field (03-07-SUMMARY.md already flagged this as stale after adding three more emitting routes); this plan's two write routes add `POST /api/orders/[id]/open` and `POST /api/orders/[id]/close` as two further emitters not named there. `ok()`'s runtime guard checks only whether the header name exists anywhere in `HEADER_TABLE`, not its `routes` field, so nothing fails at build or request time — carried forward as the same documentation-only staleness 03-07 logged, since `lib/http/contract.ts` is outside this plan's `files_modified` scope. Flagging again for whichever later plan next touches `HEADER_TABLE`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `app/api/orders/[id]/open/route.ts`, `app/api/orders/[id]/close/route.ts` and `app/api/hours/route.ts` are all in place, type-check clean, and build dynamic (`ƒ`); the eight routes shipped across 03-07 and 03-08 now cover every read/write-transition route this phase names except `verify`, `captures`, `decisions`, `sync` and `walk/[orderId]` (03-09 onward).
- `npm run verify` passes end-to-end (all steps exited 0); no blockers for 03-09.
- The HTTP-level proof of these three routes' actual behavior (curl checks A/B/G, FR-7's idempotent-open, FR-8/D-06's `not_open`, FR-9's reopen-retains-prior-segment, FR-58's full read-back) rides plan 03-13's `scripts/server/route-suite.proof.mjs`, per 03-VALIDATION.md's own routing map — this plan's own verification covers the type/build/static-analysis layer plus the already-shipped unit-level proof of the underlying state machine in `lib/reconcile/apply.test.mjs` (03-05).
- Carried forward from 03-07 and restated above: `HEADER_TABLE`'s `X-CAP-Account` entry's `routes` field is stale by two more routes as of this plan; still a documentation-only gap, still deferred to whichever plan next edits `lib/http/contract.ts`.

## Self-Check: PASSED

All `key-files.created` verified present on disk: `app/api/orders/[id]/open/route.ts` (127 lines), `app/api/orders/[id]/close/route.ts` (115 lines, both well above the plan's 55-line minimum), `app/api/hours/route.ts` (70 lines, above the plan's 55-line minimum). Both commit hashes (`41f7526`, `15a4e27`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -1 --format=%B` immediately after each commit). Neither commit shows any file deletion (`git diff --diff-filter=D` empty for both). `npm run verify` re-run end-to-end after Task 2: all steps exited 0. Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final files and passed exactly as specified: no `runtime`/`dynamic` export anywhere under `app/api/`; no `NextResponse`/`new Response(` in any of the three files; `orderOwned` precedes `request.json` in both open and close; `pick(` appears exactly once per write route (two matches total); `already_open` appears zero times outside comments in `open/route.ts`; neither `not_open` sentence literal appears in `close/route.ts`; exactly one `export async function` in `open/route.ts`; `hours/route.ts`'s `POST` is a match containing `fail("method_not_allowed")`; no `runtime`/`dynamic`/`connection(` literal, no `searchParams`/`request.json`/`await request`, and no `NextResponse`/`new Response(` anywhere in `hours/route.ts`.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
