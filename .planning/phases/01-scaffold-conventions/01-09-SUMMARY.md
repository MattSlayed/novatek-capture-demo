---
phase: 01-scaffold-conventions
plan: 09
subsystem: infra
tags: [vercel, deployment-checks, deployment-protection, ci-cd, phone-verification]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "01-07's .github/workflows/verify.yml and scripts/verify.mjs; 01-08's scripts/check-deployment.mjs probe"
provides:
  - "Vercel project settings confirmed (Deployment Protection off, System Environment Variables exposed, CAPTURE_SESSION_KEY on both environments), dated in docs/analysis/vercel-regions.md (D-25)"
  - "The Vercel Deployment Check registered on the GitHub job verify, with a red-job demonstration and its honest scope recorded in docs/analysis/deployment-gate.md (D-22, REQ-SM-5)"
  - "The D-22 browser-install assumption falsified directly: Vercel's build container cannot run apt-get, so the GitHub Actions / Vercel split for browser-dependent steps is required, not optional"
  - "The first production deployment (cpt1) opened on an iPhone and an Android with no Vercel login, ribbon-first, undismissable, present on the Limits surface, and unaffected by 200% text size (REQ-FR-48, roadmap Phase 1 success criterion 2)"
  - "Two Rule 1 fixes to scripts/lib/server.mjs (process-group teardown, heartbeat-file liveness proof) found and closed while producing the Task 2 evidence"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "scripts/lib/server.mjs now kills its spawned dev server by process group (detached: true, POSIX process-group signal or win32 taskkill /T /F), never by the shell's own pid, and proves teardown with a heartbeat file plus a zombie-aware /proc/<pid>/stat check rather than a bare process.kill(pid, 0) probe — the latter passes on a reaping CI runner and fails on Vercel's non-reaping build container"

key-files:
  created: []
  modified:
    - docs/analysis/vercel-regions.md
    - docs/analysis/deployment-gate.md
    - scripts/lib/server.mjs
    - scripts/lib/server.test.mjs
    - scripts/check-wcag.mjs

key-decisions:
  - "The Deployment Check was found and registered via Vercel's 'Show All Checks' path, not the dashboard's default 'configured checks' flow, because that flow expects a vercel/repository-dispatch/actions/status@v1 step this project does not use — recorded in deployment-gate.md for a future reader"
  - "The red-job demonstration is recorded with an honest scope note: a branch deployment is never aliased to production, so Task 2 shows the red job and an unchanged production, not a held promotion in the strict sense — the hold itself is only observable on main after a red commit there, which this plan does not do"
  - "The Install Command falsification is recorded as resolving RESEARCH.md Assumptions Log A1 against the assumption: Vercel's build container has no apt-get, so Playwright's browser install fails there and the GitHub Actions / Vercel split stands"

requirements-completed: [REQ-FR-48, REQ-SM-5, REQ-FR-65]

# Metrics
duration: unavailable (multi-session checkpoint plan; see Performance)
completed: 2026-09-08
---

# Phase 01 Plan 09: Vercel settings, Deployment Check, production merge and phone check Summary

**Deployment Protection off and System Environment Variables exposed, a Vercel Deployment Check bound to the GitHub `verify` job with a red-job demonstration, the D-22 browser-install assumption falsified against the build container's missing `apt-get`, and the first production deployment (`cpt1`) confirmed ribbon-first and undismissable on a real iPhone and Android.**

## Performance

- **Started:** 2026-09-08 (Task 1 checkpoint)
- **Completed:** 2026-09-08 (Task 3 checkpoint approved)
- **Tasks:** 3 completed (all three are checkpoints; every task paused for a developer action before the agent's verification step)
- **Files modified:** 5 (`docs/analysis/vercel-regions.md`, `docs/analysis/deployment-gate.md`, `scripts/lib/server.mjs`, `scripts/lib/server.test.mjs`, `scripts/check-wcag.mjs`)

## Accomplishments

- The three dashboard-only Vercel settings D-24 required are confirmed and dated: Deployment Protection off, System Environment Variables exposed, `CAPTURE_SESSION_KEY` present on Production and Preview (value never recorded).
- The Vercel Deployment Check is registered against the GitHub job `verify`; a deliberate governed-literal duplicate on a throwaway branch produced a red Actions run and a Vercel deployment that was created but not aliased to production — the mechanism REQ-SM-5 depends on is demonstrated, with its honest scope (branch, not `main`) recorded rather than overstated.
- The one MEDIUM-confidence assumption behind D-22 — that Vercel's build container might be able to run a full browser install — was tested directly and falsified: the container has no `apt-get`, so Playwright's dependency install fails there. The GitHub Actions / Vercel split for browser-dependent steps stands.
- The phone check closes roadmap Phase 1 success criterion 2: the first production deployment (region `cpt1`) opens on a real iPhone and a real Android with no Vercel login, the ribbon renders first in document flow with no dismissal control, it scrolls with the page, its link opens the Limits surface (all eight governed sentences plus the English-only sentence) with the ribbon still present, and nothing hides or truncates at 200% text size.

## Task Commits

Each checkpoint's artefact was committed after the developer's reported action and the agent's own verification:

1. **Task 1: Confirm the Vercel project settings, then push dev for a Preview** — `88619a7` (docs) — records the region list re-read, the three settings confirmations, and both Preview probe passes (after one failed probe on a wrong team-slug hostname, corrected and re-run clean)
2. **Task 2: Register the Deployment Check, prove a red job holds promotion, falsify the browser-install assumption** — `50a246c` (docs, artefact `docs/analysis/deployment-gate.md`); two Rule 1 deviation fixes found while producing this evidence: `293fa89` and `5335c56` (see Deviations below)
3. **Task 3: Merge to main and open the production URL on a phone** — `b121b3d` (docs) — appends the production section to `vercel-regions.md`; also closes Task 2's outstanding branch-deletion open item in `deployment-gate.md`, confirmed deleted by the time this task ran

**Plan metadata:** (this commit)

## Files Created/Modified

- `docs/analysis/vercel-regions.md` — dated D-25 artefact: the live Vercel region list re-read with `cpt1`/`af-south-1` confirmed, the three project settings confirmations, both Preview probe results (one failed on a wrong hostname, two passed), and the Task 3 production section (URL, region evidence, promotion facts, the re-run probe, and the developer's phone-check report)
- `docs/analysis/deployment-gate.md` — dated artefact: which D-22 path is live, the Deployment Check registration evidence, the red-job demonstration with its honest scope note, the Install Command falsification's build-log evidence, the two Rule 1 deviation fixes, the production-promotion facts, and the now-closed branch-deletion open item
- `scripts/lib/server.mjs` — `startServer`/`stopServer` rewritten to spawn without a shell and kill by process group (Rule 1 fix, see Deviations)
- `scripts/lib/server.test.mjs` — fixture proof of grandchild teardown via a heartbeat file and zombie-aware liveness check (Rule 1 fix, see Deviations)
- `scripts/check-wcag.mjs` — updated to use the reworked `startServer`/`stopServer` contract

## Decisions Made

- The Deployment Check was registered via Vercel's "Show All Checks" path rather than the default "configured checks" flow, because that flow's own UI expects a `vercel/repository-dispatch/actions/status@v1` step this project's `verify.yml` does not use. Recorded in `deployment-gate.md` as a note for a future reader who goes looking for the check and doesn't find it where the dashboard first points.
- Task 2's red-job demonstration is recorded with its true scope: a branch deployment is never aliased to production regardless of check status, so what was shown is the red job plus an unchanged production deployment — not a held *promotion* on `main` in the strict sense. That stronger claim was not tested and is not asserted.
- The Install Command falsification result (failure — no `apt-get` in Vercel's build container) resolves RESEARCH.md's Assumptions Log A1 against the assumption it was testing, confirming the GitHub Actions / Vercel split for browser-dependent steps (`check-wcag-self-test`, `check-wcag`) is required rather than a convenience.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `scripts/lib/server.mjs` killed only the shell, not the server process, hanging CI for 46 minutes**
- **Found during:** Task 2 (producing the red-job/falsification evidence, which required repeated `check-wcag` server start/stop cycles under scrutiny)
- **Issue:** `startServer` spawned `npx next start` with `shell: true`, so `serverProcess.pid` was the shell's pid. `stopServer`'s `process.kill(pid)` ended only that shell; the orphaned `next start` process kept running and kept its piped stdout open, which held GitHub Actions run 34196058170 open for 46 minutes after `check-wcag` had already printed "Problems: 0".
- **Fix:** Rewrote `startServer`/`stopServer` in `scripts/lib/server.mjs` to spawn without a shell and with `detached: true`, then terminate the whole process group — SIGTERM then SIGKILL on POSIX via the negative pid, `taskkill /T /F` on win32 — plus a new fixture test in `scripts/lib/server.test.mjs`.
- **Files modified:** `scripts/lib/server.mjs`, `scripts/lib/server.test.mjs`
- **Verification:** GitHub Actions run 34201360044 (success, 1m09s, "All steps exited 0")
- **Committed in:** `293fa89`

**2. [Rule 1 - Bug] The grandchild-teardown fixture assertion passed on GitHub but failed on Vercel's non-reaping build container**
- **Found during:** Task 2, immediately after fix 1 above — Vercel deployment `8FN8Kb43W` of `dev`@`293fa89` failed in 21 s
- **Issue:** The fixture proved teardown by asserting `process.kill(pid, 0)` throws for the killed grandchild process. GitHub's runner reaps zombie processes, so the assertion held there; Vercel's build container has no reaping init, so the killed grandchild remained a zombie that still answered signal 0, and the assertion failed only in that environment.
- **Fix:** Replaced the pid-probe assertion with a heartbeat-file proof (the child stops writing to a heartbeat file once genuinely terminated) plus a zombie-aware `isAlive` check reading `/proc/<pid>/stat` state directly, which correctly reports a zombie as not alive for the fixture's purpose.
- **Files modified:** `scripts/lib/server.mjs`, `scripts/lib/server.test.mjs`
- **Verification:** GitHub run 34206298478 (success) and Vercel's rebuild of `5335c56` going Ready in 47 s once the Install Command (overridden for the separate D-22 falsification, see below) was restored to default
- **Committed in:** `5335c56`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in the shared test-server harness surfaced by running the same fixture across two different process-reaping environments)
**Impact on plan:** Both fixes were necessary for `npm run verify` to be trustworthy in both CI environments this phase's gate depends on (GitHub Actions and Vercel's build). No scope creep — both are corrections to infrastructure this same plan was actively exercising, not new features.

## Issues Encountered

- The first Preview probe in Task 1 failed with `DEPLOYMENT_NOT_FOUND` because the hostname used the wrong team slug (`mattslayed` instead of the linked project's actual slug, `matthew-ks-projects-ab449c33`). Not a real deployment failure — corrected by re-running against the right hostname, which probed clean. No artefact was written from the failed attempt; recorded in `vercel-regions.md` for the record.
- Two dashboard redeploys of the seed commit (`ddfdabe`) sat at "Running Checks" indefinitely because no `verify` check exists for that commit (the workflow was added after it); the developer cancelled both. Recorded in `deployment-gate.md`, not treated as a defect in the gate itself.
- The throwaway branch `throwaway/red-check-demo` (commit `9884a9a`) remained present on GitHub past the point `deployment-gate.md` was first written, which that artefact recorded as an open item. By the time this plan's Task 3 ran, the branch was confirmed deleted (`gh api .../branches/throwaway%2Fred-check-demo` now returns 404) and never merged; the open item is closed in this plan's commit.

## Checkpoint History

- **Task 1** (`checkpoint:human-action`): developer confirmed the three Vercel settings and pushed `dev`; agent's first probe against a wrong-team-slug hostname failed with `DEPLOYMENT_NOT_FOUND` (no artefact written), the corrected hostname probed clean (exit 0), and `vercel-regions.md` was written with the region list, settings confirmations and both probe results.
- **Task 2** (`checkpoint:human-action`): developer registered the Deployment Check via Vercel's "Show All Checks" dialog path, ran the deliberate governed-literal duplicate on a throwaway branch, confirmed the resulting Actions run went red and the deployment was created but not aliased to production, then ran the Install Command override and reported the build-log failure (no `apt-get`). Two Rule 1 fixes (above) were made while gathering this evidence, both proven green in both environments before the task closed. `deployment-gate.md` was written recording all of the above, with the branch-deletion item left open pending the developer's follow-through.
- **Task 3** (`checkpoint:human-verify`): developer merged `dev` to `main`, waited for `verify` to go green and Vercel to alias production, then checked the production URL on an iPhone and an Android in private/signed-out browser sessions and replied "approved, checked on iPhone and Android." The developer confirmed, on both handsets: the ribbon renders above the link before any other content; nothing in the ribbon can be dismissed; the ribbon scrolls with the page; the link opens the Limits surface with all nine sentences (eight governed plus the English-only sentence), ribbon still present; and at 200% text size nothing hides or truncates. No handset model or OS version was reported and none is recorded beyond "iPhone" and "Android." The agent then re-ran the production probe (exit 0), corroborated the region as `cpt1` via `X-Vercel-Id`, ran an independent Playwright pass at the project's mobile viewport confirming ribbon geometry and content on `/` and `/?s=limits`, appended the production section to `vercel-regions.md`, and closed the Task 2 branch-deletion open item in `deployment-gate.md` (confirmed deleted, never merged).

## User Setup Required

None remaining. All three dashboard-only Vercel settings (Deployment Protection, System Environment Variables, the Deployment Check registration) are confirmed and dated; the merge to `main` is the developer's completed action.

## Next Phase Readiness

- Phase 1 success criterion 2 (roadmap) is closed: the first production deployment opens on a phone without a Vercel login, ribbon-first, undismissable, before any other surface.
- The Deployment Check mechanism (REQ-SM-5, D-22) is demonstrated on a branch; a stronger demonstration on `main` itself was not performed and is not required by this plan's acceptance criteria.
- `scripts/lib/server.mjs`'s process-group teardown and heartbeat-based liveness proof are now the shared contract every future check script using a spawned dev server should rely on.
- No blockers carried forward from this plan. Phase 1's own outstanding blocker (Vercel Deployment Protection needing to stay off for future previews) remains recorded in STATE.md as a standing concern, not a defect of this plan.

## Self-Check: PASSED

- FOUND: docs/analysis/vercel-regions.md
- FOUND: docs/analysis/deployment-gate.md
- FOUND: scripts/lib/server.mjs
- FOUND: scripts/lib/server.test.mjs
- FOUND: scripts/check-wcag.mjs
- FOUND commit 88619a7 in git log
- FOUND commit 50a246c in git log
- FOUND commit 293fa89 in git log
- FOUND commit 5335c56 in git log
- FOUND commit b121b3d in git log

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-08*
