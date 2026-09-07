---
phase: 01-scaffold-conventions
plan: 07
subsystem: infra
tags: [ci-cd, github-actions, node-test, vercel, fail-fast-gate]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "01-01's package.json verify entry point and fixture harness; 01-02's check-headers/check-sw/check-structure; 01-03's check-tokens; 01-04's check-governed/claims-audit; 01-06's check-contrast/check-wcag"
provides:
  - "scripts/verify.mjs — the one gate (AD-15): STEPS (D-20's fifteen-step order), resolveSteps (the single VERCEL-marked exclusion, D-22), runSteps (fail-fast runner), guarded by import.meta.main"
  - "scripts/verify.test.mjs — fixture proof of the order, the fail-fast contract, the VERCEL exclusion and the absence of any skip flag or warning-in-place-of-failure branch"
  - ".github/workflows/verify.yml — the CI job named verify that runs the full unmodified gate on every push, which the Vercel Deployment Check plan 01-09 registers depends on"
affects: [01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "verify.mjs shells out to each check (never imports it) via node:child_process.spawn — shell: true only for npx-resolved binaries (next, tsc, eslint), unshelled for every node scripts/*.mjs invocation, so exit codes are exact"
    - "A step's env is a plain object merged onto process.env for that child only; the module-level buildEnv computed once from resolveBuildEnv() is shared by both next-typegen and next-build, since both load next.config.ts under a production-like NODE_ENV"
    - "resolveSteps(steps, env) is the sole VERCEL-reading surface — it never touches argv, so no developer-facing flag can ever change the step list; it is deliberately not folded into runSteps, which stays a pure fail-fast iterator over whatever step list it is given"

key-files:
  created:
    - scripts/verify.mjs
    - scripts/verify.test.mjs
    - .github/workflows/verify.yml
  modified:
    - scripts/check-structure.mjs
    - scripts/check-structure.test.mjs

key-decisions:
  - "The fixture-suite step invokes node --test scripts/**/*.test.mjs as a single unshelled argv entry (Node's own glob resolution), not the plan's literal directory form node --test scripts/, which reproducibly throws MODULE_NOT_FOUND on this Node 24.19.0/Windows install — the same failure 01-01's SUMMARY already documented and fixed in package.json's own test script"
  - "next typegen's child environment carries the same resolved CAPTURE_BUILD_ID as next build — reproduced directly: next typegen alone throws next.config.ts's D-03 build-id error on this repository, because it loads the config under a production-like NODE_ENV exactly as next build does"
  - "scripts/check-structure.mjs's --build-output assertion now accepts either the fully-static glyph (○) or the Partial Prerender glyph (◐) for the / route, not ○ alone — D-11's actual, already-implemented shape (a statically prerendered shell whose searchParams reader sits behind Suspense, with cacheComponents: true) builds as a Partial Prerender, which the original assertion was incorrectly failing"
  - "scripts/verify.mjs exports resolveSteps as a third surface alongside STEPS and runSteps — not named in the plan's interfaces block, but needed to test the VERCEL exclusion and its reporting from a fixture without mutating the real process.env or spawning a step"

requirements-completed: [REQ-FR-65, REQ-SM-5, REQ-NFR-5, REQ-NFR-9]

# Metrics
duration: 22min
completed: 2026-09-07
---

# Phase 1 Plan 07: The One Gate Summary

**`scripts/verify.mjs` orchestrates all fifteen build-time checks (typegen through the WCAG scan) in D-20's fixed fail-fast order, proven from fixtures and run on every push by `.github/workflows/verify.yml`'s `verify` job.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-07T19:46:00Z
- **Completed:** 2026-09-07T20:08:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified outside this plan's own file list — see Deviations)

## Accomplishments
- `scripts/verify.mjs` runs every check this phase built, in D-20's exact order, stopping at the first non-zero exit; `npm run verify` exits 0 against the real repository, including a real `next build` and the full axe A/AA scan on both surfaces
- The single environment-marked exclusion (D-22): the two `check-wcag` steps are removed only when `process.env.VERCEL === "1"`, reported by name when it happens, and no other variable or argv flag changes the step list — proved by iterating six distractor env vars and four plausible skip flags
- `scripts/verify.test.mjs` proves the order, the fail-fast contract (from synthetic steps, never a real check), the exclusion, and — by scanning `verify.mjs`'s own source — the absence of any branch that turns a failing step into a passing one
- `.github/workflows/verify.yml` runs the identical, unmodified `npm run verify` (with Chromium installed first) on every push, under the job id `verify` that plan 01-09 registers as a Vercel Deployment Check
- Manually confirmed the gate actually fails: reversing `app/globals.css`'s token import order made `npm run verify` exit non-zero at the fixture-suite step (surfacing `check-structure.mjs`'s real detection), then restored the file (`git status`/`git diff` confirm no residual change)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/verify.mjs** - `ca1ddde` (feat)
2. **Task 2: Prove the fail-fast contract from fixtures** - `3b401f4` (test)
3. **Task 3: Add the GitHub Actions verify workflow** - `9906336` (feat)

**Plan metadata:** committed alongside this SUMMARY (see final commit below)

## Files Created/Modified
- `scripts/verify.mjs` - the one gate: `STEPS`, `resolveSteps`, `runSteps`, guarded by `import.meta.main`
- `scripts/verify.test.mjs` - fixture proof of order, fail-fast, exclusion and no-warning-substitution
- `.github/workflows/verify.yml` - the CI job `verify`, running the full unmodified gate on every push
- `scripts/check-structure.mjs` - widened the `--build-output` static-marker assertion to accept the Partial Prerender glyph (Rule 1 fix, see Deviations)
- `scripts/check-structure.test.mjs` - added a fixture proving the Partial Prerender case passes

## Decisions Made
See `key-decisions` in frontmatter — the fixture-suite glob invocation, the shared `next typegen`/`next build` build-id environment, the widened static-marker glyph set, and the additional `resolveSteps` export are the four load-bearing calls made during execution, each verified against the real repository rather than assumed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The fixture-suite step cannot use the plan's literal directory-form `node --test scripts/`**
- **Found during:** Task 1, first `npm run verify` run
- **Issue:** The plan's action text specifies `node --test scripts/` for step 7, citing identical behaviour on Windows and Ubuntu. Reproduced directly on this Node 24.19.0/Windows install: `node --test scripts/` and `node --test scripts` both throw `Error: Cannot find module '...\scripts'` / `MODULE_NOT_FOUND` and exit 1 — the exact failure 01-01's SUMMARY already documented for `package.json`'s own `test` script (fixed there to a glob).
- **Fix:** Step 7 (`fixture-suite`) invokes `node --test scripts/**/*.test.mjs` as a single unshelled argv entry (no shell involved — `shell` is left `false`/default on this step, matching every other `node scripts/*.mjs`-shaped invocation), letting Node's own bundled glob resolution discover the files. Verified this exact form resolves and passes 93+ tests with exit 0, both standalone and inside the full gate.
- **Files modified:** `scripts/verify.mjs`
- **Verification:** `npm run verify`'s `fixture-suite` step passes (109/109 once Task 2's own test file joined the glob); `node --test scripts/verify.test.mjs`'s order assertion confirms the step still occupies D-20's position 7.
- **Committed in:** `ca1ddde` (Task 1 commit)

**2. [Rule 1 - Bug] `next typegen` also needs the resolved `CAPTURE_BUILD_ID`, not just `next build`**
- **Found during:** Task 1, first `npm run verify` run — step 1 (`next-typegen`) failed with D-03's own error message before any check had run
- **Issue:** `next typegen` loads `next.config.ts` under a production-like `NODE_ENV`, exactly as `next build` does, so D-03's build-id gate throws on typegen alone when none of the three build-id variables is set. This is not named in the plan's per-step description, which only specifies the build-id resolution for step 11 (`next build`).
- **Fix:** Computed `resolveBuildEnv()` once at module load and reused the same object for both `next-typegen` and `next-build` steps' `env` fields.
- **Files modified:** `scripts/verify.mjs`
- **Verification:** `npm run verify` now passes step 1 without a build-id error; re-ran `npm run verify` to completion, exit 0.
- **Committed in:** `ca1ddde` (Task 1 commit)

**3. [Rule 1 - Bug] `check-structure.mjs`'s `--build-output` assertion rejected D-11's own actual, already-implemented shape**
- **Found during:** Task 1, first `npm run verify` run — step 12 (`check-structure-build-output`) failed against the real repository
- **Issue:** `scripts/check-structure.mjs` (written in plan 01-02, before `app/page.tsx` existed) asserted the `/` route's build-output glyph must be exactly `"○"` (fully static). 01-05's own SUMMARY records that `/` was deliberately built as a Partial Prerender (`"◐"`) — "a statically prerendered shell whose searchParams reader sits behind `<Suspense>`" is precisely what `cacheComponents: true` marks as `◐`, not `○`. The check was failing the real, correctly-implemented repository, not catching a defect.
- **Fix:** Widened the accepted glyph set to `{○, ◐}` in `scripts/check-structure.mjs`; anything else (e.g. `ƒ`, absent) still fails. Updated the file's header comment to explain why. Added a new fixture test (`scripts/check-structure.test.mjs`) proving a Partial Prerender build log passes, alongside the existing static-glyph and dynamic-glyph fixtures (D-23).
- **Files modified:** `scripts/check-structure.mjs`, `scripts/check-structure.test.mjs` (both outside this plan's own `files_modified` list, but the bug was a direct blocker to this plan's own acceptance criterion — `npm run verify` exits 0 — and is a genuine defect in a check script this phase itself wrote)
- **Verification:** `node --test scripts/check-structure.test.mjs` passes 9/9 including the new fixture; `npm run verify`'s `check-structure-build-output` step now passes against the real repository; `npx eslint .` and `npx tsc --noEmit` remain clean.
- **Committed in:** `ca1ddde` (Task 1 commit, since the defect was found and fixed before that commit was made)

---

**Total deviations:** 3 auto-fixed, all Rule 1 (bugs found while proving Task 1's own acceptance criterion against the real repository, none changing the plan's file list intent or scope)
**Impact on plan:** All three were necessary for `npm run verify` to exit 0 at all on this repository. None change the step order, the check contracts, or the honesty-surface guarantees; the third fix corrects a check script's assertion to match a design (D-11's Partial Prerender shape) that was already locked and implemented two plans earlier. No scope creep.

## Issues Encountered
Beyond the three auto-fixed deviations above, none. `npx eslint .` and `npx tsc --noEmit` were clean on first run for both new script files. The manual `<verification>` step (reversing `app/globals.css`'s import order to confirm the gate actually fails) worked on the first attempt and was cleanly restored.

## User Setup Required
None - no external service configuration required. (Registering the `verify` job as a Vercel Deployment Check is plan 01-09's manual-only step, per `01-VALIDATION.md`.)

## Next Phase Readiness
- `npm run verify` and `vercel.json`'s `buildCommand` both point at the same, now-complete `scripts/verify.mjs`; `.github/workflows/verify.yml` runs the identical command on every push
- Plan 01-08 can deploy against this gate as-is; plan 01-09 registers `.github/workflows/verify.yml`'s `verify` job as the Vercel Deployment Check and falsifies the Pitfall 2 assumption (whether Vercel's build container can run `playwright install --with-deps`) by pushing a deliberate governed-literal duplicate on a branch
- No server process was left running after any run in this plan (confirmed via `tasklist`/`netstat` showing no `node.exe` and only `TIME_WAIT` entries on port 4311)
- No blockers carried forward

## Self-Check: PASSED

- FOUND: `scripts/verify.mjs`
- FOUND: `scripts/verify.test.mjs`
- FOUND: `.github/workflows/verify.yml`
- FOUND: commit `ca1ddde` (Task 1)
- FOUND: commit `3b401f4` (Task 2)
- FOUND: commit `9906336` (Task 3)

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
