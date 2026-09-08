---
phase: 02-fixtures-types
plan: 02
subsystem: data
tags: [typescript, fixtures, closed-sets, node-test, provenance]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: 02-01's lib/data/types.ts — the fourteen sibling names, eleven D-19 closed sets, and the seed's eighteen entity types
provides:
  - lib/data/plant.ts — the trimmed ipv-demo plant subset (11 machinery records, 4 zones, 6 docs, 3 deviations, 4 people, prov()/erpFact() helpers, the *_BY_ID maps), byte-faithful to ../ipv-demo at 8fd097a for every kept record
  - scripts/check-fixture-shape.test.mjs — runtime membership assertions over all eleven D-19 closed sets and the copied plant subset, riding the existing fixture-suite verify step with no wiring
  - Referential-integrity proof that the trim left no dangling zone, deviation or document reference
affects: [02-03, 02-04, 02-05, 02-06, 02-07, 03-session-clock-store, 05-capture-decide]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Whole-record deletion trim: a kept record in a copied fixture file is byte-faithful to its source commit; only entire array entries are removed, never re-typed or reformatted"
    - "Shared infrastructure (an import type line) is edited in the same pass as the code it serves, even under a 'deletion only' trim rule — the import line is not itself a record"
    - "Fixture-shape test convention: one node:test per closed set asserting exact membership and order, plus module-namespace import (import * as X) to assert specific names are undefined for exclusion proofs"

key-files:
  created:
    - lib/data/plant.ts
    - scripts/check-fixture-shape.test.mjs
  modified: []

key-decisions:
  - "Left the sibling's zone-section banner comments (e.g. the Z-01 'four identical transfer sets' comment) untouched even though only one of four Z-01 pump records survives the trim — the plan's instruction enumerated exactly what to delete (nine machinery records, z05, three PEOPLE keys, the anchor/session surface, two import names) and did not list banner comments; touching them would be re-typing beyond the authorized scope, and they carry no governed or audited claim"
  - "Reworded plant.ts's own header comment to avoid the literal substrings 'Anchor', 'CaptureSession', 'ANCHOR_POSITIONS', 'anchorsInZone' and 'CAPTURE_SESSIONS' — the plan's own acceptance-criteria grep for those tokens would otherwise match the header's description of what was deleted, so the header describes the excluded surface in prose ('the 3D placement surface', 'the session-provenance export') instead of naming it verbatim"
  - "MACHINERY_BY_ID's actual JS .sort() order (m-ac001 before m-an001) differs from the literal id sequence quoted in both tasks' acceptance-criteria prose (m-an001 before m-ac001, which is not standard lexicographic order) — the fixture-shape test asserts against the real, verified .sort() output rather than transcribing the plan's prose order verbatim, since matching runtime behavior is what the criterion is actually for"

patterns-established:
  - "A copied-and-trimmed fixture file's own header comment must be checked against that file's later acceptance-criteria greps for banned-token strings before finalizing wording, not just against tsc/eslint"

requirements-completed: [REQ-FR-21a]

# Metrics
duration: ~35min
completed: 2026-09-08
---

# Phase 2 Plan 2: Plant fixtures and shape test Summary

**`lib/data/plant.ts` — the ipv-demo reference plant trimmed by whole-record deletion to the eleven assets the five work orders touch plus `m-aa605`, and `scripts/check-fixture-shape.test.mjs` asserting every D-19 closed set and the copied subset at runtime**

## Performance

- **Duration:** ~35 min (session resumed once after a rate-limit interruption mid-read; no work had reached disk at the interruption point)
- **Completed:** 2026-09-08T17:10:48Z
- **Tasks:** 2 completed
- **Files modified:** 2 (652 + 325 lines)

## Accomplishments
- `lib/data/plant.ts` created: 11 machinery records (`m-ap003`, `m-aa101`, `m-aa102`, `m-aa601`, `m-aa602`, `m-aa605`, `m-as001`, `m-bb001`, `m-ac001`, `m-gs001`, `m-an001`) byte-faithful to `../ipv-demo/lib/data/plant.ts` at `8fd097a`, plus 4 zones (`z01`–`z04`), 6 governing docs, 3 deviations, 4 `PEOPLE` keys, and the `prov()`/`erpFact()` helpers
- The anchor/session-provenance surface (`ANCHOR_POSITIONS`, `ANCHORS`, `ANCHOR_BY_MACHINERY`, `anchorsInZone`, `CAPTURE_SESSIONS`) is fully absent, and `Anchor`/`CaptureSession` are gone from the file's own `import type` line — `tsc --noEmit` exits 0 (RESEARCH Pitfall 1 avoided)
- `node scripts/claims-audit.mjs` and `node scripts/check-governed.mjs` both exit 0 over the copied surface
- `scripts/check-fixture-shape.test.mjs` created: 25 tests covering all eleven D-19 closed sets (exact membership, in order), the plant subset (ids, tags, zones, deviations, people, docs, `SCENE_VERSION`), all 32 fact ids across the 11 records, `f-aa605-cert`'s value (`"Certified"`, the referral fixture's cited row), the anchor/session exclusion, and referential integrity (every `zone_id`, `deviations[]` id and `governing_docs[]` code resolves inside the trimmed subset)
- D-19's gate demonstrated live: deleting `isolation_present` from `OBSERVATION_KINDS` in `lib/data/types.ts` turned the new test red (`deepStrictEqual` failure showing the missing member); `types.ts` was restored via `git checkout --` before committing
- `npm run verify` (all 15 steps, 189 tests) exits 0 with both new files present

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy plant.ts and trim it by whole-record deletion** - `a1fa062` (feat)
2. **Task 2: Add scripts/check-fixture-shape.test.mjs with the closed-set and plant-subset assertions** - `42e3349` (test)

## Files Created/Modified
- `lib/data/plant.ts` - the trimmed ipv-demo plant subset (652 lines)
- `scripts/check-fixture-shape.test.mjs` - closed-set and plant-subset runtime assertions (325 lines)

## Decisions Made
- Zone-section banner comments in the sibling's `MACHINERY` array (e.g. "Z-01 Pump Hall — the four identical transfer sets") were left verbatim even though the trim removed three of the four Z-01 pump records — the plan's deletion list was exhaustive and did not name these comments, and editing them would exceed the "whole-record deletion only, never re-type" instruction
- `plant.ts`'s new header comment describes the excluded anchor/capture-session surface in prose rather than by literal identifier name, since the plan's own Task 1 acceptance criteria grep for those exact tokens (`Anchor`, `CaptureSession`, `ANCHOR_POSITIONS`, `anchorsInZone`, `CAPTURE_SESSIONS`) and a header quoting them verbatim would have failed that check
- The fixture-shape test's `MACHINERY_BY_ID` sorted-key assertion uses the actual verified `Array.prototype.sort()` output rather than the id sequence quoted in the plan's prose (which places `m-an001` before `m-ac001`, not standard lexicographic order) — confirmed directly via `node -e` that `.sort()` produces `m-ac001` before `m-an001`, and the test asserts that real behavior

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria and the plan's own `<verify>` commands were run and passed for both tasks. The two decisions above are Claude's Discretion calls explicitly reserved by `02-CONTEXT.md` ("how much of the sibling's surrounding structure is carried" and "trimmed by deletion of whole records only ... or re-typed") and by the acceptance-criteria/header-wording interaction, not deviations from an instructed action.

## Issues Encountered
- A session rate limit interrupted the agent mid-read of `../ipv-demo/lib/data/plant.ts` before any file reached disk. Resumed cleanly from the coordinator's message with no partial state to reconcile (`git status` showed no new files, `HEAD` unchanged) — both tasks were executed fresh from the start.
- The plant.ts header comment's first draft included the literal identifier names being removed (`Anchor`, `CaptureSession`, `ANCHOR_POSITIONS`, `anchorsInZone`, `CAPTURE_SESSIONS`) in its prose, which caused the plan's own acceptance-criteria grep for those tokens to find a match in the header itself. Reworded to describe the excluded surface without using the literal tokens; re-verified the grep returns no match.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lib/data/plant.ts` is ready for `02-03`/`02-04` (`artisans.ts`, `orders.ts`) and later `observations.ts` to import: `MACHINERY_BY_ID`, `MACHINERY_BY_TAG`, `ZONE_BY_ID`, `DEVIATION_BY_ID`, `DOC_BY_CODE`, `PEOPLE`, `SCENE_VERSION` are all present and referentially consistent
- `scripts/check-fixture-shape.test.mjs` is explicitly designed for later plans in this phase to extend with additional assertions (per the plan's own note); no new plan needs to create a sibling test file for closed-set or subset checks
- The FR-21a human provenance checkpoint remains the concern of the plan that writes `observations.ts` (roadmap success criterion 3), not yet reached
- No blockers identified for `02-03`

## Self-Check: PASSED

- FOUND: `lib/data/plant.ts` (652 lines)
- FOUND: `scripts/check-fixture-shape.test.mjs` (325 lines)
- FOUND: `.planning/phases/02-fixtures-types/02-02-SUMMARY.md`
- FOUND: commit `a1fa062` (Task 1)
- FOUND: commit `42e3349` (Task 2)
- Verified: `npx tsc --noEmit`, `npx eslint lib/data/plant.ts`, `node scripts/claims-audit.mjs`, `node scripts/check-governed.mjs` all exit 0
- Verified: `node --test scripts/check-fixture-shape.test.mjs` — 25/25 tests pass
- Verified: `npm run verify` (all 15 steps, 189/189 tests) exits 0
- Verified: both commits carry the `Co-Authored-By` and `Claude-Session` trailers (`git log -1 --format=%B`)

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-08*
