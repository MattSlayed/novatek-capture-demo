---
phase: 02-fixtures-types
plan: 01
subsystem: data
tags: [typescript, types, closed-sets, provenance]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: lib/copy/governed.ts (GovernedKey, the closed governed-sentence set); the npm run verify gate
provides:
  - lib/data/types.ts — the single definition site for every closed set later phases key off
  - The fourteen sibling names (D-18) copied verbatim at 8fd097a, byte-faithful with their doc comments
  - Eleven closed sets (D-19): ObservationKind, ObservationGrade, ObservationRelation, ArtisanTrade, ProposalState, ReconciledState, QueueItemState, ConflictCode, RejectCode, ReferralResolution, SyncItemKind (+ SYNC_ITEM_SCHEMA_VERSIONS)
  - The seed's eighteen new entity types (Artisan, Session, WorkOrder, OrderAsset, AuthoredObservation, ObservationProvenance, Capture, VerificationResult, Proposal, Decision, Referral, Flag, OrderClock, SyncItem, SyncItemResult, WalkPayload, plus ConflictCode/RejectCode from the closed-set list)
  - ObservationGrade unconstructible with EXTRACTED (REQ-FR-21a half)
affects: [02-02, 03-session-clock-store, 05-capture-decide]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closed set = string-literal union + typed member array beside it (RbacTier/RBAC_ORDER shape), never a TypeScript enum — carried from lib/copy/governed.ts's GovernedKey/GOVERNED convention"
    - "A field that must exclude a sibling grade value gets its own narrower union rather than reusing/widening the sibling's type (ObservationGrade vs ExtractionGrade)"

key-files:
  created:
    - lib/data/types.ts
  modified: []

key-decisions:
  - "Copied only the sixteen named exports plus their directly-attached JSDoc comments from the sibling; the sibling's organisational /* section banner */ comments (which reference IPV's 3D scene/overlay) were not carried, since they are not doc comments of a single named export and several mix excluded content (e.g. the ANCHORS + MACHINERY banner covers the excluded Anchor type)"
  - "Split the single-file plan into two atomic commits along the Task 1/Task 2 boundary (closed sets vs entity types) by writing the full file once, then temporarily truncating to the Task 1 portion for the first commit before restoring the Task 2 content for the second"
  - "AD-5's Decision-identity comment quotes capture_client_id/observation_id verbatim per the plan text, even though those are not literal field names on Decision (they map to id/proposal_id) — documented as the narrowing's own vocabulary, not as additional fields"

patterns-established:
  - "Doc-comment fidelity boundary for future sibling copies: JSDoc attached directly to a declaration or field is copied verbatim; multi-declaration section banners are re-derived or omitted"

requirements-completed: [REQ-FR-21a]

# Metrics
duration: ~15min
completed: 2026-09-08
---

# Phase 2 Plan 1: Data types Summary

**`lib/data/types.ts` — the fourteen sibling types copied verbatim at `8fd097a`, eleven D-19 closed sets, and the seed's eighteen new entity types, with `ObservationGrade` its own two-member union so `EXTRACTED` is unconstructible on an authored observation**

## Performance

- **Duration:** ~15 min (estimated — start time not captured precisely at session start)
- **Completed:** 2026-09-08T15:28:13Z
- **Tasks:** 2 completed
- **Files modified:** 1 (712 lines)

## Accomplishments
- `lib/data/types.ts` created as the single definition site for every closed set the later phases need: `tsc --noEmit` clean, 55 top-level exports, zero `enum` constructs
- `ObservationGrade` is its own two-member union (`INFERRED | AMBIGUOUS`); `EXTRACTED` does not appear on its declaration lines — the roadmap's grade-unconstructibility requirement (REQ-FR-21a, D-12) is met in the type system
- `GovernedKey` is imported type-only from `lib/copy/governed.ts`; no governed sentence is restated (`check-governed.mjs` exits 0)
- All eighteen of the seed's new entity types are declared, each referencing Task 1's closed sets by name, with the AD-2/D-20, AD-3, AD-5, AD-8, AD-13, AD-18 and AD-19 narrowings recorded as comments beside the fields they constrain
- `npm run verify` (all 15 steps, 164 tests) exits 0 with this file present

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy the sibling's fourteen names verbatim and define the eleven closed sets** - `5a1531e` (feat)
2. **Task 2: Add the seed's eighteen new entity types with the AD narrowings** - `ce0fb07` (feat)

_Note: both commits touch the same file — Task 1's portion was staged and committed first by temporarily truncating the already-written full file to the Task 1 boundary, then the full content was restored for Task 2's commit, so each commit's diff matches its task's scope exactly._

## Files Created/Modified
- `lib/data/types.ts` - the fourteen copied sibling types, eleven closed sets, and eighteen new entity types (712 lines)

## Decisions Made
- Copied only the sixteen D-18 names and their directly-attached JSDoc comments verbatim from the sibling; skipped the sibling's multi-declaration `/* section banner */` comments (e.g. the "ANCHORS + MACHINERY" and "A CITED FACT" banners), since "doc comments" was read as the attached JSDoc convention rather than the file's organisational dividers, and at least one banner mixes in an excluded name (`Anchor`)
- `WorkOrder.priority`, `raised_on`, `due_by` and similar untyped seed fields are typed as `string` (ISO date / free text) — no closed set or narrower type was specified for them anywhere in CONTEXT.md, RESEARCH.md or the seed
- `VerificationResult.matched_tag` / `matched_serial` typed as `string | null` (nullable, since a `pending` outcome has no match yet) — reasonable engineering completion of an underspecified field, not a narrowing that conflicts with any locked decision
- `WalkPayload`'s `order`/`clock` fields render the seed's "the order-and-clock block" as two separate typed fields (`order: WorkOrder`, `clock: OrderClock`) rather than an untyped blob

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria and the plan's own `<verify>` commands were run and passed for both tasks; no Rule 1/2/3 fixes were needed and no architectural question arose.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lib/data/types.ts` is ready for `02-02` to import: `plant.ts`, `artisans.ts`, `orders.ts`, `observations.ts`, `fixtures.ts` and `register.ts` all depend on the types and closed sets defined here
- The human provenance checkpoint (FR-21a's second half, D-01/D-02) is `02-02`'s concern, not this plan's — this plan only made the grade unconstructible in the type system
- No blockers identified for `02-02`

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-08*
