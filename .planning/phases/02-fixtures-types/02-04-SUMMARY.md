---
phase: 02-fixtures-types
plan: 04
subsystem: data
tags: [server-only, next-turbopack, verify-gate, import-graph, fixture-test, node-test]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: 02-02's lib/data/plant.ts — MACHINERY (eleven records including m-aa605), MACHINERY_BY_ID, MACHINERY_BY_TAG, the derived-Map convention this plan's register.ts follows
provides:
  - lib/data/register.ts — the server-only tag-to-asset resolution table (REGISTER_SENTINEL, REGISTER_ENTRIES, REGISTER_BY_TAG) over all eleven plant.ts records, imported by nothing in this phase
  - scripts/check-register-isolation.mjs — D-17's two independent halves in one script: a transitive source import-graph walk over components/ and lib/client/ (relative specifiers and the tsconfig @/* alias), and a --bundle <dir> sentinel scan of built output
  - scripts/check-register-isolation.test.mjs — ten fixtures proving each half exits non-zero on a violation, including the transitive + @/-alias case and the not-yet-existing lib/access/register
  - scripts/verify.mjs's seventeen-step order — check-register-isolation before next-build, check-register-isolation-bundle after it, neither vercelExcluded
  - tsconfig.json's allowImportingTsExtensions — required for this project's first runtime (non-type-only) import between two .ts fixture modules
affects: [02-05, 02-06, 02-07, 09-p9-register-access]

# Tech tracking
tech-stack:
  added: ["server-only@0.0.1 (exact dependency)"]
  patterns:
    - "A .ts fixture module's runtime (value) import of another .ts fixture module must carry the literal .ts extension and tsconfig needs allowImportingTsExtensions — Node's native type-stripping loader does not do extension resolution for relative specifiers the way a bundler does, unlike the type-only imports every prior lib/data file used (those are erased before resolution ever runs, so the extension question never arose for them)"
    - "server-only's own package export map throws unconditionally under plain Node (no react-server condition set); testing it directly requires `node --conditions=react-server`, matching how Next itself resolves the module server-side"
    - "Two-invocation check script (source mode / --bundle <dir> mode) selected by an argv flag, following check-structure.mjs's --build-output precedent exactly"
    - "A defect message's own prose must be re-checked against that task's later acceptance-criteria greps for banned literal tokens before finalizing wording (recurring from 02-02's SUMMARY) — this plan's register.ts header first read '...no history (D-16)', which its own acceptance grep for the bare token 'history' would have failed"

key-files:
  created:
    - lib/data/register.ts
    - scripts/check-register-isolation.mjs
    - scripts/check-register-isolation.test.mjs
  modified:
    - scripts/verify.mjs
    - scripts/verify.test.mjs
    - package.json
    - package-lock.json
    - tsconfig.json

key-decisions:
  - "Added `allowImportingTsExtensions: true` to tsconfig.json (not in the plan's files_modified list) because register.ts's `import { MACHINERY } from \"./plant\"` is this project's first genuine runtime (value) import between two .ts fixture files — every prior internal import among lib/data/*.ts files was `import type`, erased entirely before Node's module resolution ever runs. Reproduced directly: a bare `node -e \"import('./lib/data/register.ts')...\"` throws ERR_MODULE_NOT_FOUND on the extensionless specifier; adding the literal `.ts` extension fixes the runtime import but then fails `tsc --noEmit` with TS5097 unless this compiler option is set. Rule 3 (blocking issue, minimal and additive) — confirmed this doesn't affect `next build`, `eslint .`, or any existing file"
  - "Reworded register.ts's header comment from '...no history (D-16)' to '...nothing about what came before (D-16)' — the plan's own Task 1 acceptance criterion `grep -n \"zone_id|order_id|assigned_to|history\" lib/data/register.ts` would otherwise match the bare word \"history\" inside the prose explaining that no history field exists (same class of issue as 02-02-SUMMARY's header-wording note)"
  - "The plan's Task 3 acceptance criterion predicted the demonstration import would fail `npm run verify` at the `check-register-isolation` step; observed instead that it fails at the earlier `fixture-suite` step, because that step runs `node --test scripts/**/*.test.mjs`, which discovers check-register-isolation.test.mjs's own 'the real repository exits 0 in source mode' test — and that test asserts against the same mutated repository before the dedicated `check-register-isolation` step (later in STEPS) is ever reached. Recorded as an observed fact, not treated as a defect: it is earlier, not weaker, detection"

patterns-established:
  - "The server-only marker's install buys tooling hygiene only; Next enforces the module boundary at the compiler level regardless (confirmed against node_modules/next/types/global.d.ts, per 02-PATTERNS.md), and the package's own throwing default export is itself proof the marker is live outside a react-server-conditioned resolver"

requirements-completed: [REQ-FR-21a]

# Metrics
duration: ~20min
completed: 2026-09-08
---

# Phase 2 Plan 4: Server-only register and its two-layer isolation gate Summary

**`lib/data/register.ts` — the server-only tag-to-asset table over all eleven plant.ts records — plus `scripts/check-register-isolation.mjs`'s source-graph walk and post-build sentinel scan, both wired into `npm run verify`'s new seventeen-step order**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-08T17:50:32Z
- **Tasks:** 3 completed
- **Files modified:** 7 (2 created data/script files, 1 created test file, 4 modified: verify.mjs, verify.test.mjs, package.json, package-lock.json, tsconfig.json)

## Accomplishments
- `lib/data/register.ts` created: `import "server-only";` as its first statement, `REGISTER_SENTINEL` (`"__CAPTURE_REGISTER_SENTINEL__"`), `REGISTER_ENTRIES` (eleven entries built from `MACHINERY`, `m-aa605` included), `REGISTER_BY_TAG` (derived `Map`) — no lookup function, no zone/order/assignment/history field, imported by nothing
- `server-only@0.0.1` installed as an exact `dependencies` entry; resolved and pinned in `package-lock.json`
- `scripts/check-register-isolation.mjs` created (279 lines): source mode transitively walks `components/` and `lib/client/`, resolving relative specifiers and the tsconfig `@/*` alias (read from `process.cwd()`, so a fixture's own `tsconfig.json` governs it), forbidding `lib/data/register.ts` and the not-yet-existing `lib/access/register.ts`; bundle mode (`--bundle <dir>`) scans every file under a given directory for the sentinel literal and treats a missing directory as a named failure
- `scripts/check-register-isolation.test.mjs` created (182 lines, 10 tests): the real repository in both modes, a direct import, a transitive import through an intermediate file via the `@/` alias, the not-yet-existing `lib/access/register`, a plant-only import that must not fire, a missing `lib/client/`, sentinel-present/absent bundle chunks, and a missing bundle directory — all pass
- `scripts/verify.mjs` now runs seventeen steps: `check-register-isolation` inserted after `check-structure`/before `next-build`, `check-register-isolation-bundle` (`--bundle .next/static`) inserted after `check-structure-build-output`/before `check-contrast`; neither carries `vercelExcluded`
- `scripts/verify.test.mjs` updated: `EXPECTED_ORDER` (seventeen ids), the order test and header comment renamed, the four `resolveSteps` length assertions moved to 15/17, a new test asserts both new steps are present, correctly positioned around `next-build`, and neither is `vercelExcluded`
- `npm run verify` (all seventeen steps, 206 `node --test` assertions across the fixture suite plus the register-isolation suite's own 10) exits 0
- D-17's gate demonstrated live: a temporary `@/lib/data/register` import added to `components/shell/Ribbon.tsx` made `npm run verify` fail — observed at the `fixture-suite` step (exit 1), not `check-register-isolation` as the plan's acceptance criterion anticipated (see Deviations); the import was reverted and `git diff` confirmed a clean restore before this task's commit

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the server-only register and add the server-only dependency** - `685d1a1` (feat)
2. **Task 2: Write check-register-isolation.mjs and its fixture test** - `2facbaf` (test)
3. **Task 3: Wire both halves into verify.mjs and update verify.test.mjs's order contract** - `6330fc7` (feat)

## Files Created/Modified
- `lib/data/register.ts` - the server-only tag-to-asset resolution table (63 lines)
- `scripts/check-register-isolation.mjs` - D-17's two-mode check script (279 lines)
- `scripts/check-register-isolation.test.mjs` - ten fixtures proving both halves (182 lines)
- `scripts/verify.mjs` - two new STEPS entries, seventeen total (288 lines)
- `scripts/verify.test.mjs` - order contract updated for the new shape (425 lines)
- `package.json` / `package-lock.json` - `server-only@0.0.1` exact dependency
- `tsconfig.json` - `allowImportingTsExtensions: true`

## Decisions Made
- `allowImportingTsExtensions: true` added to `tsconfig.json`, outside the plan's declared `files_modified` — see key-decisions above for the reproduced-fact rationale (Rule 3: blocking issue, minimal, additive, verified against `next build`/`eslint`/every existing file)
- `register.ts`'s header comment reworded to avoid the literal token `history`, which its own acceptance-criteria grep bans
- The Task 3 demonstration's observed failure point (`fixture-suite`, not `check-register-isolation`) is recorded as-observed rather than forced to match the plan's prediction — see key-decisions above

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `allowImportingTsExtensions: true` to tsconfig.json**
- **Found during:** Task 1 (creating `lib/data/register.ts`)
- **Issue:** `register.ts`'s `import { MACHINERY } from "./plant"` — the plan's own instruction to "build the array from MACHINERY by mapping each record" — is this project's first genuine runtime import between two `.ts` fixture modules. Node's native type-stripping loader requires an exact, extension-carrying specifier for a relative import to resolve at runtime (reproduced: `node -e "import('./lib/data/register.ts')..."` threw `ERR_MODULE_NOT_FOUND` on the extensionless specifier, in both this repository and a minimal scratch reproduction). The plan's own project convention ("the fixture modules' own internal imports stay extension-free") holds only for the `import type` internal imports every prior `lib/data/*.ts` file uses — those are erased entirely by TypeScript before any runtime resolution occurs, so the extension question never arose for them.
- **Fix:** Added the literal `.ts` extension to the specifier (`"./plant.ts"`) and added `allowImportingTsExtensions: true` to `tsconfig.json`'s `compilerOptions` (TypeScript's bundler resolution otherwise rejects a `.ts`-suffixed import path with TS5097).
- **Files modified:** `lib/data/register.ts`, `tsconfig.json`
- **Verification:** `npx tsc --noEmit` exits 0; `npx eslint .` exits 0; `npx next build` exits 0; `node --conditions=react-server -e "import('./lib/data/register.ts').then(m=>console.log(m.REGISTER_BY_TAG.size, m.REGISTER_SENTINEL))"` prints `11 __CAPTURE_REGISTER_SENTINEL__` (see Issues Encountered for why the `--conditions=react-server` flag is needed against the acceptance criterion's literal command)
- **Committed in:** `685d1a1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for the register module to actually run under Node as the plan's own acceptance criteria require; no scope creep — the change is additive to `tsconfig.json`'s `compilerOptions` and was verified not to affect `next build`, `eslint`, or any other existing file's compilation.

## Issues Encountered
- The plan's Task 1 acceptance criterion `node -e "import('./lib/data/register.ts').then(m=>console.log(m.REGISTER_BY_TAG.size, m.REGISTER_SENTINEL))"` prints `11 __CAPTURE_REGISTER_SENTINEL__`, run literally, throws instead: `server-only@0.0.1`'s package `exports` map resolves to `index.js` (which throws unconditionally: "This module cannot be imported from a Client Component module") under any resolution that does not set the `react-server` custom condition, and plain `node -e` sets no such condition. This is the package correctly doing its one job outside a server-conditioned resolver — proof the marker is live, not a defect. Verified the module's actual exports with `node --conditions=react-server -e "..."` (matching how Next resolves the module server-side), which prints the expected `11 __CAPTURE_REGISTER_SENTINEL__`. `npx tsc --noEmit`, `npx eslint .` and `npx next build` (which do not hit this throw — nothing imports register.ts, and Next's own build resolution differs from plain `node -e`) all confirmed green independently.
- The plan's Task 3 acceptance criterion anticipated the demonstration import would make `npm run verify` fail "at the `check-register-isolation` step." Observed instead: it fails at the earlier `fixture-suite` step (exit 1), because `fixture-suite` (`node --test scripts/**/*.test.mjs`, STEPS index 6) discovers and runs `check-register-isolation.test.mjs`'s own "the real repository exits 0 in source mode" test, which asserts against the same mutated repository before the dedicated `check-register-isolation` step (STEPS index 10) is ever reached. Not a defect — the fixture suite catches the same class of violation even earlier than the dedicated gate step, which is stronger defense-in-depth than the plan's prediction assumed. The import was reverted immediately after the observation; `git diff components/shell/Ribbon.tsx` confirmed a byte-identical restore, and a subsequent full `npm run verify` run confirmed all seventeen steps green again before this task's commit.
- A session rate limit did not interrupt this plan; all three tasks executed in one continuous pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lib/data/register.ts` exports `REGISTER_SENTINEL`, `REGISTER_ENTRIES`, `REGISTER_BY_TAG` — ready for P9's `lib/access/register.ts` and `POST /api/referrals` to import; nothing in this phase does
- `scripts/check-register-isolation.mjs` already forbids `lib/access/register.ts` even though it does not exist yet, so P9 inherits the rule rather than adding it
- `tsconfig.json`'s `allowImportingTsExtensions: true` is now available to any later `lib/data/*.ts` file that needs a genuine runtime import of another `.ts` fixture module (e.g. a future `observations.ts` importing `plant.ts` values, not just types) — the same extension-carrying specifier pattern applies
- No blockers identified for `02-05`

## Self-Check: PASSED

- FOUND: `lib/data/register.ts` (63 lines)
- FOUND: `scripts/check-register-isolation.mjs` (279 lines)
- FOUND: `scripts/check-register-isolation.test.mjs` (182 lines)
- FOUND: `.planning/phases/02-fixtures-types/02-04-SUMMARY.md`
- FOUND: commit `685d1a1` (Task 1)
- FOUND: commit `2facbaf` (Task 2)
- FOUND: commit `6330fc7` (Task 3)
- Verified: `npx tsc --noEmit`, `npx eslint .` both exit 0
- Verified: `node --test scripts/check-register-isolation.test.mjs` — 10/10 tests pass
- Verified: `node --test scripts/verify.test.mjs` — 28/28 tests pass
- Verified: `npm run verify` — all seventeen steps, 206 fixture-suite assertions, exits 0
- Verified: all three commits carry the `Co-Authored-By` and `Claude-Session` trailers (`git log -1 --format=%B`)

---
*Phase: 02-fixtures-types*
*Completed: 2026-09-08*
