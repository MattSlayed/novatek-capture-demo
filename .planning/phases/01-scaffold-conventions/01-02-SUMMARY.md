---
phase: 01-scaffold-conventions
plan: 02
subsystem: infra
tags: [vercel, headers, service-worker, next-config, node-test]

# Dependency graph
requires: ["01-01"]
provides:
  - "vercel.json declaring region cpt1, the D-22 build command, and the full header policy (D-04)"
  - "scripts/check-headers.mjs — exact-string assertion of every vercel.json value"
  - "scripts/check-sw.mjs — the two-branch never-handle-/api/ worker contract (D-06)"
  - "scripts/check-structure.mjs — D-05 source assertions plus the --build-output D-11 static-marker mode"
  - "fixture tests (D-23) proving all three checks exit non-zero on a violation"
affects: [01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Every check script (check-headers.mjs, check-sw.mjs, check-structure.mjs) shares the banner / problems[] / process.exit(1) shape from check-model.mjs, never populating a warnings array in place of a failure (D-20)"
    - "check-structure.mjs's --build-output mode is additive: it runs the same source assertions and then adds one more, never replacing them — verify.mjs (01-07) will invoke it twice per build"
    - "The one test that needs a true env-var deletion (T-1-02/D-03) spawns node:child_process directly instead of lib/fixtures.mjs's runCommand, because runCommand documents that its env option is merged onto process.env and never replaces it"

key-files:
  created:
    - vercel.json
    - scripts/check-headers.mjs
    - scripts/check-headers.test.mjs
    - scripts/check-sw.mjs
    - scripts/check-sw.test.mjs
    - scripts/check-structure.mjs
    - scripts/check-structure.test.mjs
  modified: []

key-decisions:
  - "check-sw.mjs's never-handle-/api/ guard assertion is regex-based: a .pathname.startsWith(\"/api/\") test (either quote style), a bare `return;` within 200 characters after it, and no `respondWith` in between — matching the plan's literal wording rather than a full parse"
  - "check-structure.mjs's --build-output static-marker assertion parses route-table rows by matching a leading box-drawing character, a one-character glyph, then the path token; only a row whose path is exactly \"/\" is evaluated, so /_not-found and other routes never false-match"
  - "The T-1-02/D-03 test in check-structure.test.mjs spawns `npx next build` directly via node:child_process (not lib/fixtures.mjs's runCommand) so the three build-id variables and NODE_ENV can be genuinely absent from the child's env object, not merely overridden — runCommand's env option is documented to merge onto process.env and never replace it, which cannot express deletion"

patterns-established:
  - "check-structure.mjs is the one check script with a second, additive CLI mode (--build-output <path>); later check scripts that need a similar before/after build assertion should follow the same additive-not-replacing shape"

requirements-completed: [REQ-FR-65]

# Metrics
duration: 10min
completed: 2026-09-07
---

# Phase 1 Plan 2: Declare vercel.json and the three configuration checks Summary

**`vercel.json` locks region `cpt1`, the D-22 build command, and the full header policy including the relaxed `camera=(self), microphone=(self)` Permissions-Policy; three check scripts (headers, service worker, structure) each assert their contract by exact string/regex match and each ships a fixture test proving it exits non-zero on a violation.**

## Performance

- **Duration:** ~10 min for this continuation (Tasks 2-3); Task 1 was completed by a prior executor session
- **Started (Task 2):** 2026-09-07T20:08:57+02:00 (immediately after Task 1's commit)
- **Completed:** 2026-09-07T20:17:58+02:00
- **Tasks:** 3 (1 completed by prior executor, 2 completed this session)
- **Files modified:** 7 created (`vercel.json`, `scripts/check-headers.mjs`, `scripts/check-headers.test.mjs`, `scripts/check-sw.mjs`, `scripts/check-sw.test.mjs`, `scripts/check-structure.mjs`, `scripts/check-structure.test.mjs`)

## Accomplishments
- `vercel.json` declares `regions: ["cpt1"]`, `buildCommand: "node scripts/verify.mjs"`, and four header blocks (`/api/(.*)`, `/sw.js`, `/manifest.webmanifest`, `/(.*)`) carrying exactly the values D-04 names, including the relaxed `camera=(self), microphone=(self)` Permissions-Policy — the sibling's disabling `camera=(), microphone=()` is nowhere in the file
- `scripts/check-headers.mjs` exact-string-compares every declared value against `vercel.json`, plus a named problem if the literal disabling substrings ever appear anywhere in the file; 5 fixture tests prove each named violation fails
- `scripts/check-sw.mjs` implements D-06's two-branch contract: absent (`public/sw.js` missing) sweeps `app/`, `components/`, `lib/` for any `serviceWorker.register(` call; present validates the file is syntactically valid JS and that its fetch handler tests `.pathname.startsWith("/api/")`, returns bare within 200 characters, and never calls `respondWith` before that return; 5 fixture tests cover both branches and both outcomes
- `scripts/check-structure.mjs` asserts D-05's four conditions (no Routing Middleware at root/`app/`/`src/`, no `webpack(`, no `ignoreBuildErrors`, correct token import order) plus `cacheComponents: true` (D-11's companion requirement), and adds an additive `--build-output <path>` mode that parses a captured `next build` log for the `/` route's static-marker glyph; 8 fixture/real tests cover every assertion, both `--build-output` outcomes, and a real `next build` proving the unresolved-build-id failure (T-1-02/D-03)
- Full suite (`npm test`) passes 39/39 across all `scripts/**/*.test.mjs`, including Wave 1's 21

## Task Commits

Each task was committed atomically:

1. **Task 1: Write vercel.json and the exact-string header check** — `8180a6c` (feat) — completed by prior executor session
2. **Task 2: Write the worker check with its two-branch contract** — `809b99b` (feat)
3. **Task 3: Write the structure check and its build-output mode** — `63eaec6` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `vercel.json` - region, build command, and the four-block header policy (D-04)
- `scripts/check-headers.mjs` - exact-string assertion against `vercel.json`
- `scripts/check-headers.test.mjs` - 5 fixture tests (D-23)
- `scripts/check-sw.mjs` - never-handle-`/api/` worker contract, both branches (D-06)
- `scripts/check-sw.test.mjs` - 5 fixture tests covering both branches
- `scripts/check-structure.mjs` - D-05 source assertions + `cacheComponents` + `--build-output` D-11 static-marker mode
- `scripts/check-structure.test.mjs` - 8 fixture/real tests, including the T-1-02/D-03 real `next build` proof

## Decisions Made
- `check-sw.mjs`'s guard assertion is a 200-character-window regex check (pathname test → bare `return;` → no `respondWith` in between) rather than a full JS parse, matching the plan's literal specification and keeping the check dependency-free
- `check-structure.mjs`'s `--build-output` row match requires the path token to be exactly `/` (a box-drawing character, one glyph character, then `/` followed by whitespace or end-of-line), so `/_not-found` or any other route never satisfies the root-row match
- The T-1-02/D-03 test spawns `npx next build` directly via `node:child_process.spawn` instead of `lib/fixtures.mjs`'s `runCommand`, because `runCommand`'s `env` option is documented ("inherited and extended, never replaced") to merge onto `process.env` rather than replace it — which cannot express "these three variables are absent" if they were ever set in the parent shell. The direct spawn builds its own copy of `process.env` with `VERCEL_GIT_COMMIT_SHA`, `VERCEL_DEPLOYMENT_ID`, `CAPTURE_BUILD_ID` and `NODE_ENV` deleted from that copy only; the real parent environment is never touched. Verified in this environment that none of the three variables nor `NODE_ENV` were present in `process.env` or named as keys in `.env.local` beforehand (checked key names only, per the no-`.env.local`-value guardrail).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `lib/fixtures.mjs`'s `runCommand` cannot express environment-variable deletion for the T-1-02/D-03 test**
- **Found during:** Task 3, writing the final test in `scripts/check-structure.test.mjs`
- **Issue:** The plan's action text says to use `runCommand` to run `npx next build` "with … all explicitly deleted from the child environment." `runCommand`'s own doc comment states its `env` option is "inherited and extended, never replaced" — it spreads `{...process.env, ...opts.env}`, so any key present in `opts.env` is set, but a key *absent* from `opts.env` is not removed if it exists in `process.env`. This cannot achieve true deletion.
- **Fix:** Wrote the test to spawn `npx next build` directly via `node:child_process.spawn` (same `shell: true` pattern `runCommand` uses, since `npx` needs a shell on Windows) with an explicit `env` object built by copying `process.env` and deleting the three build-id keys plus `NODE_ENV` from that copy — genuine deletion, scoped to the child process only.
- **Files modified:** `scripts/check-structure.test.mjs`
- **Verification:** Test passes; manually confirmed beforehand that `npx next build` with those four keys deleted exits 1 and stderr names `CAPTURE_BUILD_ID` (~5.7s locally); confirmed via `node -e "... in process.env"` and a key-names-only grep of `.env.local` that none of the four were present in this environment before the fix, so the deviation is defensive correctness rather than a fix for an observed failure here.
- **Commit:** `63eaec6` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in a shared helper's applicability to this specific test, not a change to the shared helper itself)
**Impact on plan:** No scope creep. `scripts/lib/fixtures.mjs` was not modified — only this one test's invocation style changed, and it is documented inline in the test file's own comment as well as here.

## Known Stubs

None. All three check scripts implement their full asserted contract; no placeholder values or unwired data paths were introduced.

## Threat Flags

None. All new surface (the three check scripts and `vercel.json`) is exactly what the plan's `<threat_model>` names — T-1-01, T-1-05, T-1-08, T-1-02, T-1-04, T-1-10 are the mitigations implemented, not new surface.

## Issues Encountered
- `scripts/check-structure.mjs` reports exactly one problem against the real repository (`app/globals.css does not exist yet`), as the plan's own `<verification>` section predicts — this is expected and is closed by plan 01-03, not a defect of this plan.
- The `npx ... shell: true` invocation (both in the manual verification run and in the new test) prints Node's `DEP0190` deprecation warning about unescaped shell arguments. This is pre-existing in `lib/fixtures.mjs`'s own `runCommand` (same pattern, same warning) from plan 01-01, not introduced here; no action taken, logged for awareness only.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `vercel.json` and all three checks are in place for plan 01-07's `verify.mjs` to wire into a single gate; `check-structure.mjs`'s `--build-output` mode is ready to be invoked a second time, after a real `next build`, once that plan exists
- Plan 01-03 must create `app/globals.css` importing `./styles/tokens.inherited.css` before `./styles/tokens.capture.css` — `check-structure.mjs` will then report 0 problems on its default invocation
- No blockers carried forward

## Self-Check: PASSED

All 7 created files confirmed present on disk (`vercel.json`, `scripts/check-headers.mjs`, `scripts/check-headers.test.mjs`, `scripts/check-sw.mjs`, `scripts/check-sw.test.mjs`, `scripts/check-structure.mjs`, `scripts/check-structure.test.mjs`). All 3 task commit hashes (`8180a6c`, `809b99b`, `63eaec6`) confirmed present in `git log --oneline --all`. Full suite `npm test` reports `tests 39 / pass 39 / fail 0`.

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
