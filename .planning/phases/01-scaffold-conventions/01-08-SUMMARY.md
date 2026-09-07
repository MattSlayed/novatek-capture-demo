---
phase: 01-scaffold-conventions
plan: 08
subsystem: infra
tags: [deployment, fetch, node-test, toolchain, documentation]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "01-01's scripts/lib/fixtures.mjs; 01-02's vercel.json and check-headers.mjs; 01-05's Ribbon.tsx; 01-07's scripts/verify.mjs (deliberately not extended by this plan)"
provides:
  - "scripts/check-deployment.mjs — a live-URL probe asserting public reachability, the five declared headers on the wire, and the undismissable ribbon (REQ-FR-48, roadmap success criterion 2)"
  - "scripts/check-deployment.test.mjs — fixture proof of every named failure mode against a local node:http server"
  - "docs/analysis/scheduled-work.md — the TypeScript 6/7 migration and ESLint 10 rule-cleanup scheduled closures, dated and sourced"
  - "README.md rewritten to describe the labelled shell, the one command, and the deployment topology"
affects: [01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "check-deployment.mjs follows the same banner/problems[]/process.exit(1) shape as every other check script, but reads a live URL over the wire (fetch, redirect: follow) instead of a local file — the one check in the repository that crosses the public-internet trust boundary"
    - "Deployment Protection detection is path-based (pathname.includes('_vercel/sso')) as well as host-based (hostname.endsWith('vercel.com')), so a fixture test can prove the failure mode on a local server without an actual cross-host redirect"
    - "HSTS is asserted only when the final URL's scheme is https, so the same probe can be pointed at a plain-http local fixture server for every other assertion"

key-files:
  created:
    - scripts/check-deployment.mjs
    - scripts/check-deployment.test.mjs
    - docs/analysis/scheduled-work.md
  modified:
    - README.md

key-decisions:
  - "check-deployment.mjs is not added to verify.mjs's STEPS, per the plan's own interface contract — it needs a live deployment, and D-20's gate is build-time only; scripts/verify.test.mjs's step-count/order assertions were left untouched and still pass"
  - "The ribbon's dismiss-control check only runs when the aria-label landmark was actually found, avoiding a second, confusingly-worded problem when the landmark itself is missing"
  - "README.md paraphrases rather than quotes any governed sentence (e.g. 'Capture itself is a specification, not a build' instead of reusing the preview sentence's own clause), per the plan's threat-model note that README is outside the claims audit's ROOTS but a literal quote would still be a second copy of AD-12-governed text"

requirements-completed: [REQ-FR-48, REQ-FR-65, REQ-SM-5]

# Metrics
duration: 25min
completed: 2026-09-07
---

# Phase 01 Plan 08: Live-deployment probe, scheduled closures, README rewrite Summary

**A `--url`-driven deployment probe proving public reachability, wire headers and the undismissable ribbon; the TypeScript 6/7 and ESLint 10 closures dated and sourced; README.md rewritten from "nothing built yet" to the labelled shell and its one command.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-07
- **Tasks:** 3 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `scripts/check-deployment.mjs` gives the checkpoint plan (01-09) a real, scriptable proof of roadmap success criterion 2's shell-provable half: a live URL is publicly reachable (no Deployment Protection redirect), carries the same five header values `check-headers.mjs` asserts in `vercel.json`'s source but now on the wire, and serves the ribbon with no dismissal control.
- `docs/analysis/scheduled-work.md` records both toolchain closures (TypeScript 6/7, ESLint 10 rule cleanup) as a dated artefact with the sourced reason for each, not prose scattered across other documents.
- `README.md` no longer says "repository seeded; nothing built yet" — it now describes the two surfaces, the ribbon, the honesty module, the full ordered `npm run verify` step list, and the deployment topology (GitHub Actions `verify` job, Vercel's build with the axe step excluded, Deployment Checks, `dev`/`main` branches, region `cpt1`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the live-deployment probe and its fixture test** - `9e2372b` (feat)
2. **Task 2: Record the toolchain scheduled closures** - `129abb9` (docs)
3. **Task 3: Update README.md to describe the labelled shell** - `70095d9` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `scripts/check-deployment.mjs` - live-URL probe: reachability, host-match / Deployment Protection detection, the five wire headers, the ribbon landmark and sentence, no-dismiss-control assertion
- `scripts/check-deployment.test.mjs` - 7 fixture tests against a local `node:http` server (pass case, missing header, disabling policy, `_vercel/sso` redirect, missing ribbon landmark, dismiss-labelled control, no `--url`)
- `docs/analysis/scheduled-work.md` - dated toolchain-closure artefact: TypeScript 6/7 migration and ESLint 10 rule cleanup, each with reason, closing condition, and the `npm ls`/`ELSPROBLEMS` standing note
- `README.md` - full rewrite: what the project is, what Phase 1 delivers, how to run it, the ordered `npm run verify` step list, deployment topology, and the two next-artefact pointers

## Decisions Made

- `check-deployment.mjs` stays outside `verify.mjs`'s `STEPS` — confirmed by re-running the full fixture suite for `verify.test.mjs` (still green, step count and order unchanged) after adding the new script and test file to the `scripts/**/*.test.mjs` glob.
- README's copy paraphrases the `preview` governed sentence's meaning rather than reusing its wording, keeping the phase's "one definition per governed sentence" discipline even outside the claims audit's swept roots.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes were needed for any of the three tasks; every acceptance criterion and the plan's own `<verification>` block passed on the first run of each task's automated command.

## Issues Encountered

None beyond the deviations already noted (there were none). `npx eslint .` and `npx tsc --noEmit` were clean on first run for the new script and test file; `node --test scripts/**/*.test.mjs` passed 116/116 (109 prior + 7 new) on first run; the full `npm run verify` (all 15 steps, including a real `next build` and the full axe A/AA scan) exited 0 on first run after all three tasks landed. No server process was left running afterward (confirmed via `tasklist`, showing no `node.exe`, and `netstat`, showing only `TIME_WAIT` entries on port 4311).

## User Setup Required

None - no external service configuration required. (Turning off Vercel Deployment Protection and confirming System Environment Variables access remain plan 01-09's manual-only steps, per `01-VALIDATION.md`.)

## Next Phase Readiness

- `scripts/check-deployment.mjs` is ready for plan 01-09's checkpoint tasks to invoke against the real production URL once it exists
- `docs/analysis/scheduled-work.md` closes the D-25 scheduled-closures requirement for the toolchain half; the Vercel-regions half of D-25 remains plan 01-09's to record
- `README.md` reflects the repository's actual current state and can absorb Phase 2+ additions without another "nothing built yet" rewrite
- No blockers carried forward

## Self-Check: PASSED

- FOUND: scripts/check-deployment.mjs
- FOUND: scripts/check-deployment.test.mjs
- FOUND: docs/analysis/scheduled-work.md
- FOUND: README.md (modified)
- FOUND commit 9e2372b in git log
- FOUND commit 129abb9 in git log
- FOUND commit 70095d9 in git log

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
