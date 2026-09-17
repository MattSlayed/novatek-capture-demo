---
phase: 02-fixtures-types
plan: 06
subsystem: fixtures
tags: [provenance, human-review, fixture-shape, fr-21a]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: "lib/data/observations.ts (twelve authored observations, drawn_from + // cites comments), scripts/check-observations.mjs (D-09/D-11 resolver), 02-05-SUMMARY.md's list of open judgments"
provides:
  - "docs/analysis/provenance-check.md — the signed FR-21a provenance check: twelve confirmed verdicts, the two referral rows marked not subject, reviewer Matthew Koeberg, date 2026-09-17"
  - "scripts/check-fixture-shape.test.mjs — a structural completeness guard (three tests) proving the signed file's row count, verdict closed-set membership and reviewer/date presence can never silently regress"
affects: ["02-VALIDATION.md (Manual-Only Verifications row is now discharged)", "any later phase reading REQUIREMENTS.md's FR-21a row as complete"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structural-guard-only test comment convention: a node:test appended to an existing fixture-shape file states plainly, in its own header comment, that it proves completeness and never substitutes for the human judgment it guards (AD-15, T-2-24)"

key-files:
  created: []
  modified:
    - docs/analysis/provenance-check.md
    - scripts/check-fixture-shape.test.mjs

key-decisions:
  - "All twelve main-table rows verdict 'confirmed' — the reviewer's own words ('all are quite accurate to the citations') settled every open judgment 02-05-SUMMARY.md flagged (the ap003-disc citation choice, the gs001-label and an001-screw dispute candidates, and the three kind judgment calls on aa601-weep, ac001-residue and bb001-stamp) as drafted, with no reword, re-cite or drop"
  - "lib/data/observations.ts and scripts/check-observations.mjs left untouched — D-04's reword/re-cite/drop machinery does not apply when every row is confirmed as drafted"
  - "The structural guard test parses the main table by locating the '## Main table' heading and splitting pipe-delimited rows, rather than a full markdown-table library, matching the file's own fixed eleven-column form"

patterns-established: []

requirements-completed: [REQ-FR-21a]

# Metrics
duration: 10min (Task 2 only; Task 1 was completed in a prior session on 2026-09-08)
completed: 2026-09-17
---

# Phase 2 Plan 06: FR-21a Human Provenance Check Summary

**The one build gate no command can run: a named person, Matthew Koeberg, read all twelve authored observations against their cited records and confirmed every one exactly as drafted, closing REQ-FR-21a with a signed, repeatable artefact.**

## Performance

- **Duration:** ~10 min for this continuation (Task 2); Task 1 (the draft review sheet) was completed and committed in a prior session on 2026-09-08
- **Started:** 2026-09-17 (continuation agent, resuming at the checkpoint)
- **Completed:** 2026-09-17
- **Tasks:** 2 (Task 1 completed in prior session; Task 2 completed this session)
- **Files modified:** 2 (this session)

## Accomplishments

- Presented the draft review sheet's twelve rows and the reviewer's response was unambiguous: "all are quite accurate to the citations" — confirmed, via a follow-up question, to mean every one of the twelve rows stands as drafted, with no row reworded, re-cited or dropped
- Signed `docs/analysis/provenance-check.md`: filled the Verdict column with `confirmed`, the Reviewer column with `Matthew Koeberg`, and the Date column with `2026-09-17` on all twelve main-table rows; removed the DRAFT banner; added a sign-off statement recording exactly what was confirmed; closed with `Recorded 2026-09-17.`
- Left the two referral rows (`m-aa605` resolved, `20HAD10AA610` unresolved) unchanged — still marked *not subject — a referral takes no `drawn_from`* — since Story 2.1's last criterion only requires they be visibly considered, not verdicted
- Appended a three-test structural completeness guard to `scripts/check-fixture-shape.test.mjs`: one row per `OBSERVATIONS` entry (matched by id or carrying `dropped`), every verdict cell is one of the four closed values, and every row carries a non-empty reviewer and date plus the closing `Recorded <date>.` line
- `node scripts/check-observations.mjs`, `node --test scripts/check-fixture-shape.test.mjs` (34/34 passing, including the three new tests), `npx tsc --noEmit`, `node scripts/claims-audit.mjs`, and the full seventeen-step `npm run verify` (221/221 fixture-suite tests) all exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate the review sheet — the draft with the verdict column empty** - `7674d2a` (docs, prior session)
2. **Task 2: The provenance check — apply verdicts, sign the file** - `6d6c325` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `docs/analysis/provenance-check.md` - signed with twelve `confirmed` verdicts, reviewer Matthew Koeberg, date 2026-09-17; DRAFT banner removed; sign-off statement and `Recorded 2026-09-17.` closing line added
- `scripts/check-fixture-shape.test.mjs` - added an `OBSERVATIONS` import and three tests forming the FR-21a structural completeness guard (row-count/id match, verdict closed-set membership, reviewer/date presence)

## Decisions Made

- **All twelve rows confirmed as drafted.** The reviewer's own words, given in the session, were "all are quite accurate to the citations." A follow-up question confirmed this covers every row without exception — no wording, citation or kind judgment call (the six flagged in 02-05-SUMMARY.md and 02-06's own Open Judgments section) was disputed. Per D-04, the executor never rewords or re-cites on its own initiative; since nothing was disputed, that machinery was never invoked.
- **`lib/data/observations.ts` and `scripts/check-observations.mjs` are unchanged.** A reword, re-cite or drop is the only path that edits the fixture file or its expected-count constant (D-04); confirmed rows never touch either.
- **No SHEQ counter-signature.** One reviewer, one name, one date — per D-01, the SHEQ manager is not involved in this phase and no second signature line was added.

## Deviations from Plan

None - plan executed exactly as written. Task 2's action, verify block and acceptance criteria were followed as specified; since every row was answered `confirmed`, the reword/re-cite/drop and re-presentation machinery in the plan's action section did not need to run.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- REQ-FR-21a is complete: `docs/analysis/provenance-check.md` is a signed, per-row artefact a second person can repeat without reading the code, with the reviewer's name and the date, and the two referral rows recorded as considered and not subject.
- `02-VALIDATION.md`'s Manual-Only Verifications row for this gate is discharged.
- Phase 2 (Fixtures & types) is not yet complete: `02-07-PLAN.md` (fixture versioning and the content-hash pin, wave 6, `depends_on: ["02-04", "02-06"]`) is the remaining plan, now unblocked by this plan's completion.
- `npm run verify` is green end-to-end with the signed file and its structural guard in place; no regression in any of the existing 218 fixture-suite tests.

## Self-Check: PASSED

- FOUND: docs/analysis/provenance-check.md
- FOUND: scripts/check-fixture-shape.test.mjs
- FOUND commit 7674d2a (docs(02-06): draft the FR-21a provenance review sheet)
- FOUND commit 6d6c325 (docs(02-06): sign the FR-21a provenance check)

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-17*
