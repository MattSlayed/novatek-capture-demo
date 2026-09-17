---
phase: 02-fixtures-types
plan: 07
subsystem: fixtures
tags: [fixture-version, content-hash, sha-256, crlf-normalisation, verify-gate, gitattributes]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: "02-04's server-only register and check-tokens.mjs's pinned-SHA-256 precedent; 02-06's signed docs/analysis/provenance-check.md, which made observations.ts a reviewed snapshot rather than a draft before this plan pinned it"
provides:
  - "lib/data/fixtures.ts — FIXTURE_VERSION (capture-fixtures/2026.09.1) and FIXTURE_CONTENT_SHA256, a CRLF-normalised SHA-256 over plant.ts, artisans.ts, orders.ts and observations.ts, cut after the FR-21a checkpoint signed off"
  - "scripts/check-fixture-hash.mjs — recomputes the digest on every verify run and fails, naming both digests, the moment fixture content and the pin disagree; imports the pin from the working directory under test, never a fixed path"
  - "scripts/check-fixture-hash.test.mjs — 7 fixtures, including the CRLF round-trip proof and the types.ts-is-outside-the-hash proof"
  - "scripts/verify.mjs's eighteen-step order — check-fixture-hash immediately after check-tokens, before check-governed"
  - ".gitattributes — text eol=lf entries for the four fixture files, defence in depth beside the script-side normalisation"
affects: ["09-p9-register-access (any P9 work reading a fixture snapshot should read FIXTURE_VERSION rather than assume content is static)", "any later phase that edits plant.ts/artisans.ts/orders.ts/observations.ts must re-pin FIXTURE_CONTENT_SHA256 and bump FIXTURE_VERSION in the same commit or verify fails"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A pinned-value module (lib/data/fixtures.ts) is imported by its own checker via a dynamic import() of a file:// URL built from process.cwd(), not a static import — this is what lets a fixture tree under test be checked against its own pin rather than the real repository's, closing off a vacuously-passing check (T-2-30)"
    - "The four fixture files' own hash is computed with the same normalising function documented inline as the checker uses (read as UTF-8, \\r\\n -> \\n before hashing) so the pin and the checker can never independently drift out of agreement (RESEARCH Pitfall 2, extending check-tokens.mjs's D-12 pinned-hash mechanism)"

key-files:
  created:
    - lib/data/fixtures.ts
    - scripts/check-fixture-hash.mjs
    - scripts/check-fixture-hash.test.mjs
  modified:
    - scripts/verify.mjs
    - scripts/verify.test.mjs
    - .gitattributes

key-decisions:
  - "FIXTURE_CONTENT_SHA256 computed once via a throwaway node -e script and hardcoded as a literal in lib/data/fixtures.ts, matching check-tokens.mjs's own pinned-constant precedent (a pin is written down, not computed at import time from the module that also verifies it)"
  - "check-fixture-hash.mjs imports lib/data/fixtures.ts with pathToFileURL(path.join(process.cwd(), ...)).href rather than a relative specifier, so every fixture-test invocation (cwd: dir) resolves the pin from that fixture's own tree, never this repository's"

patterns-established: []

requirements-completed: [REQ-FR-21a]

# Metrics
duration: ~20min
completed: 2026-09-17
---

# Phase 2 Plan 07: Fixture version and the content-hash pin Summary

**`lib/data/fixtures.ts` exports `FIXTURE_VERSION` (`capture-fixtures/2026.09.1`) beside a CRLF-normalised SHA-256 pin over the four fixture files, enforced on every `npm run verify` run by `scripts/check-fixture-hash.mjs` — the eighteenth and final step of Phase 2's build gate.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-17T07:15:21Z
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created source/script files, 1 created test file, 3 modified: verify.mjs, verify.test.mjs, .gitattributes)

## Accomplishments

- `lib/data/fixtures.ts` created: exactly two named exports, `FIXTURE_VERSION` (`capture-fixtures/2026.09.1`, in `plant.ts`'s `SCENE_VERSION` shape) and `FIXTURE_CONTENT_SHA256` (`3a4cdbb9f9552f4cd7c3fe2f205224c22ac6a6138e7b58bb32bd08be4c4f9717`), with a header comment naming D-13/D-14/D-15/AD-6, the hashing order, the normalisation applied, and the pin-cut date; no import, no reference to a deployment identifier
- `.gitattributes` gained `text eol=lf` entries for the four fixture files, with a comment distinguishing this from the existing `-text` entry (pinned-once-forever vs. actively-edited-and-re-pinned) and stating plainly that the entries are defence in depth, not the load-bearing mechanism
- `scripts/check-fixture-hash.mjs` created: recomputes the SHA-256 over the four files (CRLF normalised to LF) and compares against the pin imported dynamically from the working directory's own `lib/data/fixtures.ts` (never a fixed path); asserts `FIXTURE_VERSION`'s `capture-fixtures/YYYY.MM.N` shape; follows the `problems[]`/report-and-exit convention exactly; no flag or environment variable changes it
- `scripts/check-fixture-hash.test.mjs` created (7 tests): the real repository exits 0; a one-character change to `observations.ts` and to `plant.ts` each exit non-zero; all four files converted to CRLF with the pin untouched still exits 0 (the normalisation's own proof); a change to `types.ts` exits 0 (outside the hash); a malformed `FIXTURE_VERSION` exits non-zero; a missing fixture file exits non-zero naming it
- `scripts/verify.mjs` now runs eighteen steps: `check-fixture-hash` inserted immediately after `check-tokens` (its pinned-hash analog) and before `check-governed`
- `scripts/verify.test.mjs` updated: `EXPECTED_ORDER` (eighteen ids), the order test and header comment renamed to "eighteen", the four `resolveSteps` length assertions moved to 16/18, no leftover "seventeen"/"fifteen" reference
- `npm run verify` (all eighteen steps, 228 fixture-suite tests including the new 7) exits 0
- D-14's gate demonstrated live: a one-character change to `lib/data/orders.ts` (leaving the pin untouched) made `npm run verify` exit 1 at the `check-fixture-hash` step (the 5th step, immediately after `check-tokens`), reporting both digests and the re-cut instruction; the mutation was reverted and `git diff` confirmed a byte-identical restore before this task's commit

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/data/fixtures.ts with the version and the pinned hash, and add the .gitattributes entries** - `a20017e` (feat)
2. **Task 2: Write check-fixture-hash.mjs with its fixture test and wire it into verify** - `49c2cd8` (test)

## Files Created/Modified

- `lib/data/fixtures.ts` - `FIXTURE_VERSION` and `FIXTURE_CONTENT_SHA256`, the two exports this phase's success criterion 4 requires
- `scripts/check-fixture-hash.mjs` - the recompute-and-compare check (D-14), 116 lines
- `scripts/check-fixture-hash.test.mjs` - 7 fixtures proving the check's failure modes and its CRLF proof, 108 lines
- `scripts/verify.mjs` - one new `STEPS` entry, eighteen total
- `scripts/verify.test.mjs` - order contract, test names and length assertions updated for the new shape
- `.gitattributes` - `text eol=lf` entries for the four fixture files

## Decisions Made

- `FIXTURE_CONTENT_SHA256` was computed once with a throwaway `node -e` script reading the four files exactly as the FR-21a-reviewed `02-06` commit left them, then hardcoded as a literal — matching `check-tokens.mjs`'s own pinned-constant precedent rather than computing the expected value inside the checker at runtime
- `check-fixture-hash.mjs` resolves `lib/data/fixtures.ts` via `pathToFileURL(path.join(process.cwd(), "lib/data/fixtures.ts")).href` and a dynamic `import()`, so every fixture-test invocation (`{ cwd: dir }`) checks a fixture tree against that tree's own pin rather than this repository's — without this, every mutation test would pass vacuously (T-2-30)

## Deviations from Plan

None - plan executed exactly as written. Both tasks' actions, verify blocks and acceptance criteria were followed as specified.

## Issues Encountered

None. `npx tsc --noEmit`, `node scripts/check-tokens.mjs`, `node scripts/claims-audit.mjs`, `node scripts/check-fixture-hash.mjs`, `node --test scripts/check-fixture-hash.test.mjs`, `node --test scripts/verify.test.mjs` and the full `npm run verify` all passed on the first attempt with no auto-fix needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 (Fixtures & types) is now complete: all four data files, the register and its isolation gate, the FR-21a human provenance check, and the fixture version/content pin are in place, and `npm run verify` is green end-to-end at eighteen steps.
- Roadmap success criterion 4 ("the fixture version is a single named export, not the build id") is satisfied and machine-checked on every `verify` run.
- Any later phase that edits `plant.ts`, `artisans.ts`, `orders.ts` or `observations.ts` must recompute `FIXTURE_CONTENT_SHA256` and bump `FIXTURE_VERSION` in the same commit, or `npm run verify` fails at `check-fixture-hash` naming both digests.
- No blockers identified for Phase 3.

## Self-Check: PASSED

- FOUND: `lib/data/fixtures.ts`
- FOUND: `scripts/check-fixture-hash.mjs`
- FOUND: `scripts/check-fixture-hash.test.mjs`
- FOUND: commit `a20017e` (Task 1)
- FOUND: commit `49c2cd8` (Task 2)
- Verified: `npx tsc --noEmit`, `node scripts/check-tokens.mjs`, `node scripts/claims-audit.mjs` all exit 0
- Verified: `node scripts/check-fixture-hash.mjs` exits 0, prints `Problems: 0`
- Verified: `node --test scripts/check-fixture-hash.test.mjs` — 7/7 tests pass
- Verified: `node --test scripts/verify.test.mjs` — 28/28 tests pass
- Verified: `node -e "import('./scripts/verify.mjs').then(m=>console.log(m.STEPS.length))"` prints `18`, `check-fixture-hash` immediately after `check-tokens`
- Verified: `grep -n "seventeen\|fifteen" scripts/verify.test.mjs` returns no match
- Verified: `npm run verify` — all eighteen steps, 228 fixture-suite tests (227 pass, 1 suite-summary line), exits 0
- Verified: a one-character mutation to `lib/data/orders.ts` made `npm run verify` exit 1 at `check-fixture-hash`; reverted, `git diff` clean, re-run confirmed exit 0
- Verified: both commits carry the `Co-Authored-By` and `Claude-Session` trailers (`git log -1 --format=%B`)

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-17*
