---
phase: 03-server-seam
plan: 15
subsystem: build-gate
tags: [non-bypassability, ad-19, d-12, verify-gate, node-test, import-graph, string-sweep]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "the twelve app/api routes (03-07 through 03-11); lib/store/memory.ts's ten mutating exports and scripts/check-single-writer.mjs's own MUTATING_EXPORTS/PERMITTED_IMPORTERS and import-graph-walk helpers (03-02, 03-12); scripts/verify.mjs's twenty-five-step gate and scripts/verify.test.mjs's EXPECTED_ORDER/resolveSteps assertions (03-13); docs/analysis/single-writer-non-bypassability.md's hand-written enumeration naming every route, env var and writer module by exact string (03-14)"
provides:
  - "scripts/check-non-bypassability.mjs — the completeness sweep: every app/api/**/route.ts path, every process.env.<NAME> read in live source under app/, lib/ and next.config.ts, and every module importing a store-mutating export must be named in docs/analysis/single-writer-non-bypassability.md; the document's seven required sections must be present"
  - "scripts/check-non-bypassability.test.mjs — nine fixture tests: the real repository, a clean tree, a new route, a new env read, a comment-only env mention (exits 0), a second writer, a missing section, a missing document, and a route named only inside a fenced code block (exits 0)"
  - "scripts/check-single-writer.mjs now exports MUTATING_EXPORTS and guards its own check-and-report execution behind an isMainModule check, so importing that constant cannot re-run the check or exit the importer's process"
  - "scripts/verify.mjs grown from twenty-five to twenty-six steps — the last automated addition this phase makes — with check-non-bypassability inserted between check-accepted-fields and next-build"
affects: [03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A completeness sweep (asserts presence) ships as a new, sibling script to an absence sweep (check-structure.mjs), never an extension of it — the two failure messages read too differently for one fixture set to stay readable"
    - "A check script that a sibling check needs one constant from (not a duplicate) exports that constant and wraps its own execute-and-report block in an isMainModule guard, exactly as scripts/verify.mjs already does for the identical reason — importing a script for a value must never re-run that script's own side effects"
    - "Windows glob and directory-walk results carry backslashes; every path compared against a document's text is normalised to forward slashes first via one shared helper function, reused for both the route glob and the relative-path walk"

key-files:
  created:
    - scripts/check-non-bypassability.mjs
    - scripts/check-non-bypassability.test.mjs
  modified:
    - scripts/check-single-writer.mjs
    - scripts/verify.mjs
    - scripts/verify.test.mjs

key-decisions:
  - "check-non-bypassability.mjs imports MUTATING_EXPORTS from scripts/check-single-writer.mjs rather than restating the ten names, per the plan's own explicit instruction: the two rules must agree on what a write is, and two hand-kept lists would drift"
  - "That import required scripts/check-single-writer.mjs to export MUTATING_EXPORTS and wrap its own check-and-report execution in an isMainModule guard (duplicated from scripts/verify.mjs's identical helper) — without the guard, importing the constant would re-run check-single-writer's own three assertions and could call process.exit out from under the importing script"
  - "Sweep 2's environment-read walk (app/, lib/) is restricted to .ts/.tsx files, matching every other Phase 3 check script's SOURCE_EXT convention — a .test.mjs file's own process.env test-setup assignment (e.g. a fixed CAPTURE_SESSION_KEY for a unit test) is a test harness detail, not runtime configuration this document enumerates"
  - "Sweep 3 (store writers) checks direct imports only, mirroring check-single-writer.mjs's own Assertion 1, not its transitive-reach Assertion 2 — the goal here is enumeration for the document's completeness, not re-enforcing AD-1's single-writer invariant a second time, which is check-single-writer.mjs's own job"
  - "All three name sweeps (routes, env names, writer modules) are whole-document substring searches, never scoped to a specific ## section — matching 03-RESEARCH.md Open Questions 2's resolution of a literal string-membership sweep, and proved deliberately by a fixture where a route is named only inside a fenced code block and still passes"

requirements-completed: [REQ-FR-24, REQ-FR-57]

# Metrics
duration: 27min (approx.)
completed: 2026-09-19
---

# Phase 3 Plan 15: Non-Bypassability Completeness Check Summary

**A literal string-membership sweep proving every app/api route, every process.env name read in live source, and every store-writing module is named in docs/analysis/single-writer-non-bypassability.md — closing `npm run verify` at twenty-six steps, the last automated addition this phase makes.**

## Performance

- **Duration:** 27 min (approx.; STATE.md's own last-session timestamp is used as the start proxy, per this phase's established convention when no explicit start timestamp was captured at spawn)
- **Started:** 2026-09-19T08:05:07Z (approx.)
- **Completed:** 2026-09-19T08:31:52Z
- **Tasks:** 2 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `scripts/check-non-bypassability.mjs`: states its own limitation first, in the claims-audit's own voice — a literal string-membership sweep that proves every name is present, never that the sentence beside it is true. Four sweeps: (1) every `app/api/**/route.ts` path (enumerated via `globSync`, normalised to forward slashes) must appear in the document; (2) every `process.env.<NAME>` read in live, non-comment code under `app/`, `lib/` and `next.config.ts` must appear in the document; (3) every module importing a store-mutating export from `lib/store/memory.ts` — the export names imported from `scripts/check-single-writer.mjs`, not restated — must appear in the document, and so must `lib/store/memory.ts` itself; (4) the document's seven required sections (`## Scope`, `## The single writer`, `## The single accessor`, `## Routes`, `## Configuration`, `## What a reviewer can run`, `## Open items`) must all be present. A missing document is a named problem, never a silent pass. Exits 0 against the real repository with `Problems: 0`.
- `scripts/check-non-bypassability.test.mjs`: nine fixture tests built from one shared `BASELINE_FILES` tree (two routes, a `next.config.ts` reading one variable, a `lib/store/memory.ts` stub and its one permitted writer, and a document naming all of them), each mutating exactly one thing — the real repository, a clean fixture tree, a new route, a new env read, a comment-only env mention (exits 0, proving the comment filter), a second writer module, a document missing `## Configuration`, a missing document file, and a route named only inside a fenced code block (exits 0, proving the sweep is literal and markdown-blind by design).
- `scripts/check-single-writer.mjs` (deviation, see below): now exports `MUTATING_EXPORTS` and wraps its own three-assertion check-and-report block in an `isMainModule(import.meta)` guard, duplicated from `scripts/verify.mjs`'s identical helper.
- `scripts/verify.mjs`: `check-non-bypassability` inserted immediately after `check-accepted-fields` and before `next-build`, unshelled, not `vercelExcluded` — the sixth and last source-side rule this phase adds. `scripts/verify.test.mjs`: `EXPECTED_ORDER` carries the new id at that position (twenty-six ids); every `"twenty-five"` reference renamed to `"twenty-six"`; `resolveSteps` length assertions moved 23→24 (`VERCEL=1`) and 25→26 (the unset/distractor cases); one new closing test asserts all six of Phase 3's source-side build rules run before `next-build` and are not `vercelExcluded`, and that `route-suite` runs after it — roadmap success criterion 3, stated as a contract rather than left to memory.
- **Verified against the real repository, twice, end to end:** `npm run verify` with no `VERCEL` set: exit 0, all **26** steps, `route-suite` 14/14, fixture-suite 302/302, unit-suite 164/164. `VERCEL=1 npm run verify`, run separately and in full (not simulated): exit 0, exactly **24** steps, with the log's own exclusion lines confirming only `check-wcag-self-test` and `check-wcag` were removed — nothing this phase added was touched. No port left listening on 3000–3010, 4311 or 4312 after either run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/check-non-bypassability.mjs with its fixture test** - `7dce927` (feat)
2. **Task 2: Wire the rule into verify and close the step list** - `bbf6149` (feat)

## Files Created/Modified

- `scripts/check-non-bypassability.mjs` - the four-sweep completeness check over the non-bypassability document (338 lines)
- `scripts/check-non-bypassability.test.mjs` - nine fixture tests, one per incompleteness/edge-case class (179 lines)
- `scripts/check-single-writer.mjs` - exports `MUTATING_EXPORTS`; execution guarded behind `isMainModule` (deviation)
- `scripts/verify.mjs` - `check-non-bypassability`, the twenty-sixth and last step this phase adds
- `scripts/verify.test.mjs` - `EXPECTED_ORDER`, naming/length assertions, and one new closing contract test

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] scripts/check-single-writer.mjs needed an export and an isMainModule guard for the plan's own "import MUTATING_EXPORTS" instruction to work safely**
- **Found during:** Task 1, before writing check-non-bypassability.mjs's Sweep 3
- **Issue:** The plan explicitly instructs importing `MUTATING_EXPORTS` from `scripts/check-single-writer.mjs` rather than restating the ten names. But `check-single-writer.mjs` was written as a self-executing script: it declared `MUTATING_EXPORTS` as an unexported `const` and ran its own check-and-report logic (including a `process.exit(1)` on any problem) unconditionally at module top level, with no guard. A plain `import { MUTATING_EXPORTS } from "./check-single-writer.mjs"` would therefore either fail outright (the constant was not exported) or, once exported, silently re-run check-single-writer's own three assertions and print its own "SINGLE-WRITER CHECK" banner every time check-non-bypassability.mjs is imported or executed — and, in the pathological case, call `process.exit` out from under the importing script for a reason the importer never asked about.
- **Fix:** Added `export` to `MUTATING_EXPORTS`. Wrapped the existing check-and-report block in `if (isMainModule(import.meta)) { ... }`, using a helper duplicated verbatim from `scripts/verify.mjs`'s own `isMainModule` (Node 24.0/24.1 leaves `import.meta.main` undefined, hence the entry-script-path fallback) — duplicated rather than imported from `verify.mjs`, so `check-single-writer.mjs` stays independently runnable with no dependency on the orchestrating gate script, matching this codebase's own "each check script is its own unit" discipline.
- **Files modified:** `scripts/check-single-writer.mjs`
- **Verification:** Direct execution (`node scripts/check-single-writer.mjs`) still prints the identical banner and exits 0 against the real repository. All 8 of its own pre-existing fixture tests (`check-single-writer.test.mjs`, which spawn it as a subprocess) still pass unchanged. A standalone `import('./scripts/check-single-writer.mjs')` now resolves cleanly with `MUTATING_EXPORTS.length === 10` and prints nothing — confirmed no side effect fires on import.
- **Committed in:** `7dce927` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking, necessary for the plan's own explicit cross-script import instruction to be safe rather than a footgun). **Impact on plan:** Necessary for Task 1's own design to work as specified; no behavioural change to check-single-writer.mjs's own check when run directly, and no file outside this plan's declared scope plus this one necessitated file was touched.

## Issues Encountered

None. Both tasks' acceptance criteria passed on first implementation (after the one deviation above, found and fixed before check-non-bypassability.mjs's own tests were first run) — no false positive against the real, already-correct repository, and no retry needed on any fixture test.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm run verify` passes end to end at twenty-six steps (confirmed twice: once with `VERCEL` unset, once with `VERCEL=1`, both real runs, not simulated).
- All six of Phase 3's source-side build rules (`check-fixture-inputs`, `check-named-packages`, `check-single-writer`, `check-actor-field`, `check-accepted-fields`, `check-non-bypassability`) run before `next-build`, none is excluded on Vercel, and `route-suite` runs after it — roadmap success criterion 3 is now an assertion in `scripts/verify.test.mjs`, not folklore.
- `docs/analysis/single-writer-non-bypassability.md` (03-14) needed no edits: every route, every `process.env` name and the one writer/store module it already names were sufficient to pass Sweeps 1 through 3 against the real repository on the first run.
- Plan 03-16 — the human-run recorded `curl-suite.sh` execution against a real Preview deployment — is the phase's last plan and does not touch any file this plan modified.
- Every later phase that adds a route, a `process.env` read, or a second store writer must now extend `docs/analysis/single-writer-non-bypassability.md` or `npm run verify` fails at the `check-non-bypassability` step — AD-19's enumeration is now load-bearing, not aspirational.
- The pre-existing `[SECURITY]` blocker on `lib/data/types.ts` and `scripts/claims-audit.mjs` (recorded in STATE.md since 03-04) remains untouched by this plan: `git status --short` before and after both commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here.

## Self-Check: PASSED

Both `key-files.created` verified present on disk: `scripts/check-non-bypassability.mjs` (338 lines, ≥130 required), `scripts/check-non-bypassability.test.mjs` (179 lines, ≥110 required). Both commit hashes (`7dce927`, `bbf6149`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (`git log -1 --format=%B` immediately after each commit). `git diff --diff-filter=D --name-only 7dce927~1 bbf6149` is empty — no commit in this plan's range deletes a file. Every acceptance-criteria grep and command from both tasks was re-run directly against the final files and passed exactly as specified: `MUTATING_EXPORTS` imported (not restated); `cannot prove` present; the forward-slash path-normalisation call present; `STEPS.length` is `26`; the entry after `check-accepted-fields` is `check-non-bypassability`; all six source-side rules run before `next-build` with `route-suite` after it; `resolveSteps(STEPS,{VERCEL:'1'})` keeps 24 and removes exactly `check-wcag-self-test,check-wcag`; `node --test scripts/verify.test.mjs` passes 32/32 with no `"twenty-five"` remaining. `npm run verify` re-run end to end twice: exit 0 at 26 steps (VERCEL unset) and exit 0 at 24 steps (`VERCEL=1`), both real runs. No port left listening on 3000–3010, 4311 or 4312 after either run.

---
*Phase: 03-server-seam*
*Completed: 2026-09-19*
