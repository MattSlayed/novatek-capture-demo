---
phase: 01-scaffold-conventions
plan: 01
subsystem: infra
tags: [nextjs, react, eslint, typescript, playwright, node-test]

# Dependency graph
requires: []
provides:
  - "package.json on the exact D-01 pins, installed and version-verified"
  - "tsconfig.json (strict, bundler resolution, @/* alias)"
  - "eslint.config.mjs — ESLint 10.9.1-safe flat config, never importing eslint-config-next's crashing default export"
  - "next.config.ts — build-id-throws-in-production contract (D-03) plus cacheComponents: true (D-11)"
  - "scripts/lib/fixtures.mjs — repoRoot, withFixture, runCheck, runCommand shared by every scripts/*.test.mjs (D-23)"
  - "scripts/lib/harness.mjs — pinned MOBILE_PROFILE, launch(), openMobilePage() (D-21)"
  - "scripts/scaffold.test.mjs and scripts/lib/support.test.mjs — the Wave-1 regression proofs"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: [next@16.3.4, react@19.2.8, react-dom@19.2.8, eslint@10.9.1, eslint-config-next@16.3.4, "@next/eslint-plugin-next@16.3.4", eslint-plugin-react-hooks@7.1.1, typescript@5.9.3, playwright@1.62.1, "@axe-core/playwright@4.13.0"]
  patterns:
    - "eslint.config.mjs composes @next/eslint-plugin-next + eslint-plugin-react-hooks flat config + eslint-config-next/typescript directly — never the eslint-config-next default export or /core-web-vitals subpath"
    - "Fixture directories always live under os.tmpdir() via withFixture, never under scripts/, so node --test never discovers them as tests"
    - "node --test must be invoked with a recursive glob (scripts/**/*.test.mjs), never a bare directory argument, on this Node/Windows combination"

key-files:
  created:
    - package.json
    - tsconfig.json
    - eslint.config.mjs
    - next.config.ts
    - scripts/scaffold.test.mjs
    - scripts/lib/fixtures.mjs
    - scripts/lib/harness.mjs
    - scripts/lib/support.test.mjs
  modified: []

key-decisions:
  - "Changed package.json's test script from the plan's literal `node --test scripts/` to `node --test scripts/**/*.test.mjs` because a bare directory argument fails with MODULE_NOT_FOUND on this Node 24.19.0 / Windows install (Rule 3 fix, verified reproducible outside this repo's own paths)"
  - "next.config.ts calls process.exit(1) before its throw in the unresolved-build-id branch, guaranteeing the non-zero exit synchronously rather than relying solely on Next's config-load error class (RESEARCH.md Assumptions Log A3)"

patterns-established:
  - "Pattern: every later check script imports withFixture/runCheck from scripts/lib/fixtures.mjs to prove its own failure mode from a throwaway directory (D-23)"
  - "Pattern: scripts/lib/harness.mjs is the single declaration point for the Playwright mobile launch profile; no other file may redeclare viewport/deviceScaleFactor values"

requirements-completed: [REQ-FR-65]

# Metrics
duration: 14min
completed: 2026-09-07
---

# Phase 1 Plan 1: Scaffold on the exact D-01 pins Summary

**Hand-written Next.js 16.3.4 / React 19.2.8 / ESLint 10.9.1 scaffold installed and version-verified, with an ESLint 10-safe flat config that avoids the crashing `eslint-config-next` default export, a `next.config.ts` that fails production builds on an unresolved build id, and the shared fixture/harness modules every later check script depends on.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-07T19:43:04+02:00
- **Completed:** 2026-09-07T19:57:15+02:00
- **Tasks:** 3
- **Files modified:** 8 created (package.json, package-lock.json, tsconfig.json, eslint.config.mjs, next.config.ts, scripts/scaffold.test.mjs, scripts/lib/fixtures.mjs, scripts/lib/harness.mjs, scripts/lib/support.test.mjs — 9 counting package-lock.json)

## Accomplishments
- Every D-01 pin declared in `package.json` and confirmed installed byte-for-byte (`next 16.3.4`, `react`/`react-dom 19.2.8`, `eslint 10.9.1`, `playwright 1.62.1`, `@axe-core/playwright 4.13.0`, `typescript 5.9.3`, `eslint-config-next`/`@next/eslint-plugin-next 16.3.4`, `eslint-plugin-react-hooks 7.1.1`), Chromium installed via `npx playwright install chromium`
- `eslint.config.mjs` runs green under ESLint 10.9.1 by composing `@next/eslint-plugin-next` directly, avoiding the reproduced crash in `eslint-config-next`'s default export / `/core-web-vitals` subpath
- `next.config.ts` throws (with a preceding `process.exit(1)`) when none of `VERCEL_GIT_COMMIT_SHA`, `VERCEL_DEPLOYMENT_ID`, `CAPTURE_BUILD_ID` resolve under `NODE_ENV=production`, and declares `cacheComponents: true`
- `scripts/lib/fixtures.mjs` and `scripts/lib/harness.mjs` give every later check script a shared, throwaway-directory fixture pattern (D-23) and a single pinned mobile Playwright profile (D-21)
- 21 `node:test` assertions across `scripts/scaffold.test.mjs` and `scripts/lib/support.test.mjs` pass, covering pins, installed versions, banned packages, the ESLint-config safety property, a real `npx eslint .` / `npx tsc --noEmit` run, `next.config.ts` content, Routing-Middleware absence, the fixture lifecycle, and the pinned mobile profile

## Task Commits

Each task was committed atomically:

1. **Task 1: Write package.json on the exact pins and install** - `294d4c7` (feat)
2. **Task 2: Write tsconfig, the ESLint 10 flat config and next.config.ts** - `8a015af` (feat)
3. **Task 3: Create the shared fixture harness and the Playwright launch profile** - `16ec4e3` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `package.json` - D-01 pins, engines.node 24, verify/test/lint entry points
- `package-lock.json` - committed lockfile for `npm ci` in CI
- `tsconfig.json` - strict TS config, `@/*` path alias, near-verbatim from `../ipv-demo`
- `eslint.config.mjs` - ESLint 10.9.1-safe flat config composing `@next/eslint-plugin-next` directly
- `next.config.ts` - build-id resolution/throw (D-03) plus `cacheComponents: true` (D-11)
- `scripts/scaffold.test.mjs` - pin, lint-chain, and Routing-Middleware-absence regression proof
- `scripts/lib/fixtures.mjs` - `repoRoot`, `withFixture`, `runCheck`, `runCommand`
- `scripts/lib/harness.mjs` - `MOBILE_PROFILE`, `launch`, `openMobilePage`
- `scripts/lib/support.test.mjs` - browser-free proof of both `lib/` modules

## Decisions Made
- Kept `next.config.ts`'s failure path as `console.error` + `process.exit(1)` + `throw`, in that order, so the non-zero exit is guaranteed synchronously (Assumptions Log A3) without producing unreachable-code warnings from ESLint or `tsc`
- `runCheck` in `fixtures.mjs` accepts either a repo-relative path or an already-absolute path (via `path.isAbsolute`), since fixture scripts created by `withFixture` live under `os.tmpdir()`, outside the repo root the interface otherwise resolves against — needed for `support.test.mjs` to exercise `runCheck` against real fixture scripts without touching the repository (D-23)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `node --test scripts/` fails on this Node/Windows install; switched to a recursive glob**
- **Found during:** Task 3 (running the plan's `<verification>` command `node --test scripts/` after creating the fixture harness)
- **Issue:** `node --test scripts/` (and `node --test scripts`, no trailing slash) throws `Error: Cannot find module '...\scripts'` / `MODULE_NOT_FOUND` instead of recursively discovering test files. Reproduced in a clean scratch directory with no spaces or special characters in its path, and via both Git Bash and native `cmd.exe` — ruling out a shell-quoting or repo-path artifact. Bare `node --test` (no path argument) works via its own default recursive discovery, and a quoted glob argument (`node --test "scripts/**/*.test.mjs"`) also works and finds both test files.
- **Fix:** Changed `package.json`'s `"test"` script from `"node --test scripts/"` to `"node --test scripts/**/*.test.mjs"`. Updated the corresponding exact-string assertion in `scripts/scaffold.test.mjs`.
- **Files modified:** `package.json`, `scripts/scaffold.test.mjs`
- **Verification:** `npm test` exits 0, runs both test files, reports `tests 21 / pass 21 / fail 0`
- **Committed in:** `16ec4e3` (Task 3 commit, since the failure only surfaced when Task 3's overall-suite verification ran)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for the `verify`/`test` entry point to function at all in this execution environment. No scope creep — the glob is functionally equivalent to the plan's intent (discover every `*.test.mjs` under `scripts/`, including `scripts/lib/`) and was verified to produce identical pass/fail results.

## Issues Encountered
- `npm install` produced the expected `ERESOLVE overriding peer dependency` warnings (RESEARCH.md Pitfall 1) — not a failure, no action taken, `npm ls` was never added as a gate step
- `eslint.config.mjs`'s own explanatory comment initially contained the literal banned substring `eslint-config-next/core-web-vitals` (inside a warning comment about not importing it), which tripped the acceptance criterion's exact-substring check against itself; reworded the comment to describe the same warning without the literal substring
- `next.config.ts`'s original `// eslint-disable-next-line no-console` produced an "Unused eslint-disable directive" ESLint warning, since `no-console` is not enabled by this config; removed the now-unnecessary disable comment

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The scaffold, lint chain, type-check chain, and shared test infrastructure are in place; plan 01-02 (structure, headers, tokens, governed sentences) can now write `.ts`/`.tsx` files that resolve through `@/*` and check scripts that import `scripts/lib/fixtures.mjs`
- `scripts/lib/harness.mjs`'s `launch()`/`openMobilePage()` path remains unexercised until plan 01-06 writes `scripts/check-wcag.mjs` against it — no blocker, this was deliberate per the plan (D-21's launch profile is declared, not yet driven)
- No blockers carried forward

## Self-Check: PASSED

All 9 created files confirmed present on disk (`package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `scripts/scaffold.test.mjs`, `scripts/lib/fixtures.mjs`, `scripts/lib/harness.mjs`, `scripts/lib/support.test.mjs`). All 3 task commit hashes (`294d4c7`, `8a015af`, `16ec4e3`) confirmed present in `git log --oneline --all`.

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
