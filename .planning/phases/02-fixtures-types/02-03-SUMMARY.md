---
phase: 02-fixtures-types
plan: 03
subsystem: data
tags: [typescript, fixtures, node-test, provenance, rbac]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: 02-01's lib/data/types.ts (Artisan/WorkOrder/Provenance types) and 02-02's lib/data/plant.ts (MACHINERY_BY_ID, ZONE_BY_ID, DOC_BY_CODE, PEOPLE) plus scripts/check-fixture-shape.test.mjs
provides:
  - lib/data/artisans.ts — the three doors (acc-mabaso, acc-naidoo, acc-vanwyk) with display-only rbac_tier and ORDER_IDS_BY_ARTISAN
  - lib/data/orders.ts — the five work orders WO-2026-0142/0151/0137/0129/0133 with internal wo-NNNN id and display number as two distinct fields
  - scripts/check-fixture-shape.test.mjs extended with account, order, referential-integrity, assignment-symmetry and display-only-tier assertions
  - Runtime proof that rbac_tier is carried and read by nothing under lib/data (D-20, AD-2, FR-57)
affects: [02-04, 02-05, 02-06, 02-07, 03-session-clock-store, 05-capture-decide]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Array-plus-derived-map convention (ARTISANS/ARTISAN_BY_ID, ORDERS/ORDER_BY_ID) extended from plant.ts's MACHINERY/MACHINERY_BY_ID shape to seed-authored fixture files"
    - "Assignment plane kept as two agreeing directions: ORDER_IDS_BY_ARTISAN (literal, beside the account) and each order's own assigned_to (literal, beside the order) — a shape test asserts the two never disagree, rather than deriving one from the other"
    - "Display-only field proved by source-text assertion with comments stripped (regex-based, no full parser), not merely documented by comment"

key-files:
  created:
    - lib/data/artisans.ts
    - lib/data/orders.ts
  modified:
    - scripts/check-fixture-shape.test.mjs

key-decisions:
  - "Reworded orders.ts's own header comment to describe the referral-only asset in prose ('the downstream header relief valve kept in plant.ts purely for the referral fixture') rather than naming it literally, since Task 1's own acceptance criterion greps orders.ts for that literal id and expects no match"
  - "governing_docs for each order is computed as the deduplicated, sorted union of its assets' own governing_docs codes read directly from plant.ts, not invented — verified against DOC_BY_CODE's six codes before writing"
  - "extractor_hash on each order's provenance is a literal, stable string (not computed via plant.ts's module-private prov()), since the plan explicitly forbids calling that helper from orders.ts"

patterns-established:
  - "A fixture file's own explanatory header comment must be checked against that same file's later acceptance-criteria greps before finalizing wording — the second time this exact class of self-tripping comment has been caught in this phase (plant.ts in 02-02, orders.ts here)"

requirements-completed: [REQ-FR-21a]

# Metrics
duration: ~25min
completed: 2026-09-08
---

# Phase 2 Plan 3: Artisans and orders Summary

**`lib/data/artisans.ts` and `lib/data/orders.ts` — the three doors and five work orders the preview's walkthrough runs on, with `rbac_tier` carried and proved read by nothing, and the fixture-shape test extended to prove every order resolves to a real account, zone, asset and document**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-08
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 extended)

## Accomplishments
- `lib/data/artisans.ts` created: `acc-mabaso`, `acc-naidoo`, `acc-vanwyk` with `ARTISAN_BY_ID` and `ORDER_IDS_BY_ARTISAN`; `acc-mabaso`'s name and competency are literal strings matching `PEOPLE.millwright` in `plant.ts`
- `lib/data/orders.ts` created: `wo-0142`/`WO-2026-0142` through `wo-0133`/`WO-2026-0133`, each with `id` and `number` as two distinct fields, `governing_docs` derived from the union of its own assets' codes, and a literal `Provenance` object with `grade: "EXTRACTED"` (a work order is a record the ERP states)
- `npx tsc --noEmit` and `npx eslint lib/data/artisans.ts lib/data/orders.ts` both exit 0; the node smoke-print acceptance criteria produce the exact expected strings
- `grep -n "m-aa605" lib/data/orders.ts` returns no match, `grep -n "rbac_tier" lib/data/orders.ts` returns no match, and `rbac_tier` in `artisans.ts` matches only the three record fields and the D-20 comment
- `scripts/check-fixture-shape.test.mjs` extended with 6 new tests (31 total, up from 25): accounts (ids/tiers in order, trade/tier membership, acc-mabaso identity vs `PEOPLE.millwright`), orders (ids/numbers in order, id≠number, no display number is an `ORDER_BY_ID` key, status/system_of_record), referential integrity (assigned_to/zone_id/asset_ids/governing_docs all resolve, the ten-asset union proves `m-aa605` is in the register and on no order), assignment symmetry (`ORDER_IDS_BY_ARTISAN` agrees with `ORDERS`' own `assigned_to`), and display-only tier (source-text assertion with comments stripped)
- Both required regression demonstrations run live and restored: an unknown `assigned_to` and an unregistered sixth `ORDERS` entry each turned the test suite non-zero
- `node scripts/claims-audit.mjs`, `node scripts/check-governed.mjs` and `npm run verify` (all 15 steps, 195+ tests) exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the three artisan accounts and the five work orders** - `6717eba` (feat)
2. **Task 2: Extend the fixture-shape test with the artisan and order integrity assertions** - `50476a3` (test)

## Files Created/Modified
- `lib/data/artisans.ts` - the three doors, `ARTISAN_BY_ID`, `ORDER_IDS_BY_ARTISAN` (68 lines)
- `lib/data/orders.ts` - the five work orders, `ORDER_BY_ID` (155 lines)
- `scripts/check-fixture-shape.test.mjs` - extended with 6 new tests over the artisan/order fixtures (193 lines added)

## Decisions Made
- Reworded `orders.ts`'s own header comment to describe the referral-only asset in prose rather than naming its id literally — Task 1's own acceptance criterion greps `orders.ts` for that literal id and expects zero matches, the same class of self-tripping comment already caught once in `02-02`'s `plant.ts` header
- Computed each order's `governing_docs` directly from its own assets' `governing_docs` arrays in the committed `plant.ts` (not invented), sorted, deduplicated, and confirmed every resulting code resolves in `DOC_BY_CODE`'s six entries before writing the literal arrays
- Used a literal, stable `extractor_hash` string per order's provenance rather than calling `plant.ts`'s `prov()`, per the plan's explicit instruction that helper is module-private and must not be called from this file
- The display-only-tier test strips `//` and block comments with a regex (no full parser) before counting `rbac_tier` occurrences, matching the plan's own instruction so the D-20 warning comment above `ARTISANS` cannot satisfy its own assertion

## Deviations from Plan

None — plan executed exactly as written. The header-comment rewording above is Claude's Discretion on wording, not a deviation from an instructed action (the plan's own acceptance criteria required exactly this grep-vs-prose interaction to be resolved, as it was in `02-02`).

## Issues Encountered
- `npm run verify`'s `next-build` step failed once with `EPERM: operation not permitted, unlink ...\.next\static\...` — a transient Windows/OneDrive file-lock on the `.next` build output directory, unrelated to any file this plan touched. Re-ran `npm run verify` immediately; all 15 steps passed clean on the second run. Noted per the project's timing-sensitive-test convention.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lib/data/artisans.ts` and `lib/data/orders.ts` are ready for `02-04`'s `observations.ts` to import: every asset id and account id an authored observation cites already resolves in these two files plus `plant.ts`
- `scripts/check-fixture-shape.test.mjs` is extended, not restructured — later plans in this phase continue appending to the same file per its own stated convention
- The FR-21a human provenance checkpoint remains the concern of the plan that writes `observations.ts` (roadmap success criterion 3), not yet reached
- No blockers identified for `02-04`

## Self-Check: PASSED

- FOUND: `lib/data/artisans.ts` (68 lines)
- FOUND: `lib/data/orders.ts` (155 lines)
- FOUND: `scripts/check-fixture-shape.test.mjs` (extended, 519 lines total)
- FOUND: commit `6717eba` (Task 1)
- FOUND: commit `50476a3` (Task 2)
- Verified: `npx tsc --noEmit`, `npx eslint lib/data/artisans.ts lib/data/orders.ts`, `node scripts/claims-audit.mjs`, `node scripts/check-governed.mjs` all exit 0
- Verified: `node --test scripts/check-fixture-shape.test.mjs` — 31/31 tests pass
- Verified: `npm run verify` (all 15 steps) exits 0 on the second run after a transient Windows/OneDrive file-lock on the first
- Verified: both commits carry the `Co-Authored-By` and `Claude-Session` trailers (`git log -1 --format=%B`)

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-08*
