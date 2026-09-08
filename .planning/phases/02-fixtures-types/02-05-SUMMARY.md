---
phase: 02-fixtures-types
plan: 05
subsystem: fixtures
tags: [typescript, node-test, provenance, citation-check, observations]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: "lib/data/types.ts (AuthoredObservation, closed sets), lib/data/plant.ts (MACHINERY_BY_ID, DEVIATION_BY_ID, CitedFact), scripts/lib/fixtures.mjs"
provides:
  - "lib/data/observations.ts — the seed's twelve authored observations with drafted wordings, kinds, grades, relations, drawn_from ids and citation comments"
  - "scripts/check-observations.mjs — the D-09/D-11 resolver and comment-fidelity check, wired into verify's existing fixture-suite step"
  - "scripts/check-observations.test.mjs — fixtures proving each violation class exits non-zero"
affects: ["02-06 (provenance checkpoint — reads this SUMMARY's open judgments to confirm or dispute each row)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bracket-generic findMatchingBracket (stack-based, handles both { and [ nesting) reused from check-governed.mjs's brace-balancer, extended to array literals"
    - "Live-module resolution (dynamic import of a file:// URL from process.cwd()) for the record side; source-text regex extraction only for the citation comment, which exists nowhere at runtime"

key-files:
  created:
    - lib/data/observations.ts
    - scripts/check-observations.mjs
    - scripts/check-observations.test.mjs
  modified: []

key-decisions:
  - "obs-aa601-weep's kind: chose gland_weep over leak_evidence for 'surface moisture below the bonnet' — a genuine judgment call the plan flagged; open for the reviewer at 02-06"
  - "obs-ac001-residue's kind: chose leak_evidence as the closest existing member to 'residue at tube-side flange' — flagged per plan; open for the reviewer"
  - "obs-bb001-stamp's kind: chose label_illegible for 'inspection stamp part-obscured' though a stamp is a marking rather than literally a label — flagged per plan; open for the reviewer"
  - "obs-gs001-label cites f-gs001-due (Protection test due) — dispute candidate: neither remaining gs001 fact is about a label"
  - "obs-an001-screw cites f-an001-due (Stroke test due) — the strongest dispute candidate in the set: no an001 fact is about physical hardware condition at all"
  - "obs-ap003-disc cites f-ap003-vib directly rather than ncr-0118 — both are citable under D-09 (the fact's own evidence chain names the NCR); kept the more specific fact citation, flagged so the reviewer can choose ncr-0118 instead if that is what the seed's phrase meant"
  - "Deviation citations quote a contiguous substring rather than requiring the full field value, per D-10's own ncr-0118.immediate_action example (which quotes only the trailing clause)"

patterns-established:
  - "check-observations.mjs's stack-based findMatchingBracket handles nested [ and { generically, reusable by any later check that needs to walk an array-of-objects TS literal"

requirements-completed: [REQ-FR-21a]

duration: 15min
completed: 2026-09-08
---

# Phase 2 Plan 05: Authored Observations & the Citation Check Summary

**Twelve authored observations with a fixed `// cites` citation comment each, and a check that re-verifies every id resolution and quote against the live `plant.ts` records on every `verify` run.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-08T19:56:24+02:00 (immediately after 02-04's completion commit)
- **Completed:** 2026-09-08T20:10:47+02:00
- **Tasks:** 2
- **Files modified:** 3 (all new)

## Accomplishments

- Authored `lib/data/observations.ts`: twelve `AuthoredObservation` rows across the seven cited assets, each with a drafted one-sentence wording (D-06/D-07), a resolvable `drawn_from`, and a `// cites` comment quoting the cited record's own field verbatim
- Built `scripts/check-observations.mjs`, which loads `observations.ts` and `plant.ts` as live, evaluated modules (never a second regex parse of the record side) and asserts: every `drawn_from` resolves (D-09), every comment pairs with and matches its record (D-10, D-11), the closed sets and D-08 exclusion list hold, and the count is exactly twelve
- Built `scripts/check-observations.test.mjs` with twelve tests: the real repository, D-11's three named classes (missing comment, unresolvable id, drifted quote), the two D-09 lookalike forms (a machinery id, the `NCR-2026-0118` display form), a missing unit, an unresolvable deviation field, a non-substring deviation quote, a mismatched comment/drawn_from pair, a D-08 violation, and an `EXTRACTED` grade
- `npm run verify` (all seventeen steps, including `next build` and the WCAG scan) exits 0 with the new files in place

## Task Commits

Each task was committed atomically:

1. **Task 1: Author lib/data/observations.ts** - `2bd75bf` (feat)
2. **Task 2: Write check-observations.mjs and its fixture test** - `e777eb7` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `lib/data/observations.ts` - the seed's twelve authored observations, each with wording, grade, relation, drawn_from and a citation comment
- `scripts/check-observations.mjs` - the D-09/D-11 resolver and comment-fidelity check (403 lines)
- `scripts/check-observations.test.mjs` - fixtures proving each violation class exits non-zero (192 lines)

## Decisions Made

**Every drafting judgment the reviewer must settle at 02-06's checkpoint, one line each with the reason it is open:**

| Row | Field | Choice made | Why it is open |
|---|---|---|---|
| `obs-ap003-disc` | cited record | `f-ap003-vib` (not `ncr-0118`) | The seed's phrase says "the NCR-2026-0118 vibration record"; the vibration fact's own `evidence` chain names that NCR, so both are citable under D-09. Kept the more specific fact citation; the reviewer may prefer re-citing `ncr-0118` instead (plan's own note). |
| `obs-gs001-label` | cited record | `f-gs001-due` (Protection test due) | Neither remaining `gs001` fact is about a label. This is the closest fact available, but the fit is weak — a dispute candidate named explicitly by the plan. |
| `obs-an001-screw` | cited record | `f-an001-due` (Stroke test due) | No `an001` fact is about physical hardware condition at all — the strongest dispute candidate in the set, anticipated by D-09 as the case where a record offers no fact that situates the observation. |
| `obs-aa601-weep` | kind | `gland_weep` (not `leak_evidence`) | "Surface moisture below the bonnet" plausibly fits either closed-set member; chose `gland_weep` for the spindle/gland area a torsion-bar relief valve's bonnet sits over. Genuine judgment call, flagged per the plan. |
| `obs-ac001-residue` | kind | `leak_evidence` | Closest existing member to "residue at tube-side flange" — no closed-set member says "residue" or "fouling" directly. Flagged per the plan. |
| `obs-bb001-stamp` | kind | `label_illegible` | An inspection stamp is a marking rather than literally a label; `label_illegible` is the closest existing member. Flagged per the plan. |

**D-05 deviation, restated for this plan's record** (decided at 02-01, carried here because this plan is the first to actually draw on it): the closed `ObservationKind` set is the seed's original eight plus `isolation_present` and `gauge_obscured`. Reason: `m-ap003`'s and `m-gs001`'s isolation-tag rows and `m-as001`'s fogged-gauge row have no honest fit among the seed's eight — dropping them would leave the electrician door with no evidence-grade observation and the millwright door without the isolation inference `ncr-0118` actually supports (D-05).

All other rows (`obs-ap003-guard`, `obs-as001-gauge`, `obs-gs001-iso`, `obs-aa601-seal`, `obs-aa601-corr`) follow the plan's citation and kind directly with no open judgment.

## Deviations from Plan

None - plan executed exactly as written. The judgment calls above were explicitly assigned to the executor by the plan itself (D-06, D-09's "genuine judgment call" rows), not discovered as gaps.

## Issues Encountered

- The header comment's own prose describing the `// cites` comment form initially used the literal `// cites` prefix as an example, which inflated `grep -c "// cites "` to 14 instead of 12 (the acceptance criterion). Reworded the header to describe the form without using the literal token, restoring the count to exactly 12 (Rule 1 fix, folded into Task 1's commit before it landed — no separate commit).
- `node -e "..."` one-liners that dynamically `import()` a `.ts` module and then `process.exit()` crashed with a Windows-specific libuv assertion (`UV_HANDLE_CLOSING`) unrelated to the fixture code; verified the same resolver logic instead via a short script file run with `node <file>.mjs`, which does not trip the bug. `check-observations.mjs` itself does not use `process.exit()` from inside a dynamically-imported context in the way that triggered it, and `node --test` (used for the actual fixture suite) is unaffected — confirmed by the clean `npm run verify` run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/data/observations.ts` and its check are in place for 02-06, which owns the human provenance sign-off (D-02): confirming or disputing each row above, and in particular the six flagged judgment calls.
- `npm run verify` is green with the new files; no regression in the existing 31 `check-fixture-shape.test.mjs` assertions, `claims-audit.mjs`, or `check-governed.mjs`.
- Nothing in this plan should be read as the provenance check itself — `check-observations.mjs`'s own header and this SUMMARY both say so explicitly, per the plan's T-2-20 mitigation.

## Self-Check: PASSED

- FOUND: lib/data/observations.ts
- FOUND: scripts/check-observations.mjs
- FOUND: scripts/check-observations.test.mjs
- FOUND commit 2bd75bf (feat(02-05): author lib/data/observations.ts)
- FOUND commit e777eb7 (feat(02-05): add check-observations and its fixture proof)

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-08*
