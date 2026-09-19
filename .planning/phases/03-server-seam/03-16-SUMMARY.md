---
phase: 03-server-seam
plan: 16
subsystem: docs
tags: [curl-suite, header-exclusions, byte-identity, preview-deployment, vercel, verification, d-09b]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "scripts/curl-suite.sh (03-14); scripts/server/route-assertions.mjs's HEADER_EXCLUSIONS and the D-11 byte-identity comparator (03-13); docs/analysis/single-writer-non-bypassability.md (03-14); the twenty-six-step npm run verify gate (03-15)"
provides:
  - "docs/analysis/server-seam-verification.md — the dated D-09b record: exact command, Preview deployment identity, the complete pasted curl-suite output (47/47, A-H all present), three captured header blocks, the HEADER_EXCLUSIONS reconciliation table, and what the run does not prove"
  - "Two new scripts/server/route-assertions.mjs HEADER_EXCLUSIONS entries (age, x-robots-tag) evidenced by a real deployment"
  - "The closing of 03-13-SUMMARY.md's carried-forward gap: the observed Vercel build-log route-suite line"
affects: [phase-8-hostile-script-SM-1]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When curl's file-based cookie jar (-b/-c) returns an empty jar in this shell, read the session mint's own Set-Cookie header value directly and replay it as a literal Cookie header instead of debugging the jar mechanism further"

key-files:
  created:
    - docs/analysis/server-seam-verification.md
  modified:
    - docs/analysis/single-writer-non-bypassability.md
    - scripts/server/route-assertions.mjs

key-decisions:
  - "Recorded plainly, in the new document's own '## What was run' section, that the orchestrator agent — not the developer personally — executed every mechanical step (push to dev, reading the Preview URL and deployment id, confirming reachability, running the curl suite, capturing the header blocks) at the developer's explicit instruction; D-09b's and this plan's own T-3-78 threat-register entry describe a person running the checks, and an agent running them at a person's direction is a related but different claim this project's own honesty surface should not blur"
  - "X-Matched-Path is a Vercel platform-added header not anticipated by HEADER_EXCLUSIONS, but every existing D-11 comparator invocation compares two requests to the identical route (an unowned id vs. a fabricated id on the same endpoint), so its value is identical on both sides of every comparison this suite performs today — decided to let the byte-identity comparison hold rather than add an exclusion"
  - "age and x-robots-tag added to HEADER_EXCLUSIONS, each citing this run as evidence, only after confirming both are absent from this repository's own code (next.config.ts has no headers() rule, vercel.json's headers array does not name either, lib/http/respond.ts and lib/http/contract.ts reference neither)"
  - "Captured a third header block beyond the plan's two literal curl commands — the same not-found id under an acc-mabaso session — because a session-less request to /api/orders/wo-9999 returns 401 (no_session), not the order_not_found not-found path the acceptance criteria calls for; the authenticated 404 is the genuine not-found evidence, and both are recorded rather than only one"

requirements-completed: [REQ-FR-6, REQ-FR-24, REQ-NFR-F1]

# Metrics
duration: ~15min
completed: 2026-09-19
---

# Phase 3 Plan 16: Server Seam Verification — Preview Deployment Curl Suite Summary

**The reviewer-facing curl suite A-H ran clean (47/47, all eight letters present) against a live Vercel Preview deployment, and the byte-identity header-exclusion list was reconciled against the platform's real response headers: two new exclusions (`age`, `x-robots-tag`) and one deliberate non-exclusion (`x-matched-path`).**

## Performance

- **Duration:** ~15 min (post-checkpoint continuation; the checkpoint itself was satisfied earlier the same day)
- **Started:** 2026-09-19T19:48:00Z (approx., per this session's first header capture)
- **Completed:** 2026-09-19T20:03:04Z
- **Tasks:** 1 completed (the plan's single checkpoint task, its four post-checkpoint steps)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Read the developer-reported (agent-run) curl-suite output against `scripts/curl-suite.sh`'s own labels: all eight letters A through H present exactly once each, every line `PASS`, summary `47 passed, 0 failed` — matching the script's own `PASS_COUNT`/`FAIL_COUNT` accounting exactly (13+6+2+3+6+7+7+3 = 47).
- Captured three real header blocks directly from the Preview deployment rather than transcribing: `/api/health` (200, no session), `/api/orders/wo-9999` (401, no session — the plan's own literal command), and the same route authenticated as `acc-mabaso` (404, the genuine not-found path).
- Reconciled `scripts/server/route-assertions.mjs`'s `HEADER_EXCLUSIONS` against the observed set: `x-vercel-*` and `server` confirmed present exactly as anticipated; `date`, `connection`, `keep-alive`, `transfer-encoding`, `content-length`, `vary` and `etag` needed no change (several — `vary`, `connection`, `keep-alive`, `etag` — were not even observed on this deployment's responses at all); `age` and `x-robots-tag` added as two new entries, confirmed absent from this repository's own code first; `x-matched-path` deliberately left un-excluded.
- Wrote `docs/analysis/server-seam-verification.md` in `deployment-gate.md`'s voice with all four required sections (`## What was run`, `## Result`, `## Headers the platform added`, `## What this run does not prove`), naming the Preview URL, the Vercel deployment id, the commit, and the date, and closing 03-13-SUMMARY.md's own carried-forward gap (the observed Vercel build-log `route-suite` line) along the way.
- Pointed `docs/analysis/single-writer-non-bypassability.md`'s `## What a reviewer can run` section at the new document by name and resolved its first `## Open items` entry (the header-set question) with a struck-through, dated resolution; left the second (`Assumptions Log A1`, Fluid Compute concurrency) exactly as it was, since this run does not close it.
- Re-ran `node --test scripts/server/route-assertions.test.mjs` (14/14 pass — the generic `HEADER_EXCLUSIONS` shape test needed no update), `node scripts/check-non-bypassability.mjs` (0 problems) and the full `npm run verify` (exit 0, "All steps exited 0" across all twenty-six steps, including `route-suite`'s own 14/14), confirming the exclusion-list edit introduced no regression anywhere.

## Task Commits

Each task was committed atomically:

1. **Task 1: Run the curl suite against a Preview deployment and record the result (post-checkpoint steps 1-4)** - `5a2c775` (docs)

**Plan metadata:** (this SUMMARY's own commit, recorded after this file is written)

## Files Created/Modified

- `docs/analysis/server-seam-verification.md` - the dated D-09b record: command, deployment identity, the complete pasted per-check output, three captured header blocks, the reconciliation table, and stated limitations
- `docs/analysis/single-writer-non-bypassability.md` - pointer to the new document and one resolved Open item
- `scripts/server/route-assertions.mjs` - two new `HEADER_EXCLUSIONS` entries (`age`, `x-robots-tag`) citing this run, plus an updated top comment summarising the reconciliation

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

None - plan executed exactly as written. The judgment calls this task's own `<action>` explicitly asked for — deciding, per header, whether it is "an exclusion with a reason, or... something the byte-identity comparison should hold" — are recorded under Decisions Made above, not as deviations: the plan itself names this as the task's own work, not a departure from it.

## Issues Encountered

- **Who actually ran the verification steps.** Per the resume instructions for this continuation, the push to `dev`, the Preview URL/deployment-id lookup, the reachability confirmation and the curl-suite run itself were all performed by the orchestrator agent at the developer's explicit instruction, not typed by the developer's own hands. This is recorded plainly in `docs/analysis/server-seam-verification.md`'s own `## What was run` section rather than described as a human run, because D-09b's design intent, and this plan's own `T-3-78` threat-register entry, describe *a person* running the checks. The HTTP evidence captured is identical either way, but the provenance is a different claim from the one the phase's threat model states, and this SUMMARY does not let that blur.
- **The Preview needed a fix commit before it would build.** The first push of this phase's work to `dev` failed both the GitHub `verify` job (run 35464494701) and the Vercel build (`dpl_E7ApbZuSVZRquusGaRwJkbEcwLvZ`) on `scripts/verify.test.mjs:276` ("spawnStep resolves non-zero when the capture file cannot be written"): the fixture's `rm(path, { force: true })` only swallows `ENOENT`, and Linux reports `ENOTDIR` when a path component is a file where a directory is expected — Windows reports `ENOENT` for the identical condition, so every local run on this project's development machine had passed. `main`'s own CI had in fact been red since `2f8e222` (2026-09-08, one commit after Phase 1 review fix `69c16d7` introduced the stale-capture `rm`), undetected until this plan's own live-deployment requirement forced a real GitHub Actions run to happen. Fix commit `2babfd8` ("fix(03): tolerate ENOTDIR when clearing a stale capture path so the fixture-suite passes on Linux") — applied and pushed by the orchestrator agent, not part of this plan's own `files_modified` list — is the commit both `main` and `dev` now carry and the commit the recorded Preview was built from. Full account in `docs/analysis/server-seam-verification.md`'s `## What was run`.
- **curl's file-based cookie jar came back empty in this shell.** Minting a session with `-c "$JAR"` and reading it back with `-b "$JAR"` on two separate attempts left `$JAR` empty and the follow-up request unauthenticated (401 rather than the expected 404), even though `scripts/curl-suite.sh`'s own jar-based runs — using the identical `-b`/`-c` flags — demonstrably worked throughout the 47-check suite. Not further diagnosed; worked around by reading the mint response's own `Set-Cookie` header value directly and passing it back as a literal `Cookie` header, which reached the identical account and the identical not-found response either way. Documented inline in the new document's own header-capture section.

## User Setup Required

None - no external service configuration required. (The `user_setup` block this plan's frontmatter declared — `CAPTURE_SESSION_KEY` on Preview, Vercel Authentication off — was confirmed already satisfied before this run, per the pre-flight checks recorded in `docs/analysis/server-seam-verification.md`'s `## What was run`.)

## Next Phase Readiness

- Phase 3 (Server seam) is now fully proved on a real deployment as well as locally: roadmap success criteria 1 (curl A-H against a deployment) and 3 (universal headers on a real deployment) are both closed with recorded evidence; `npm run verify` passes end-to-end at twenty-six steps.
- `docs/analysis/single-writer-non-bypassability.md`'s remaining `## Open items` entry (Assumptions Log A1, Fluid Compute concurrency across concurrent invocations) is still open and unscheduled — carried forward exactly as before, for whichever later phase or plan first needs it (a live-deployment concurrency smoke test would close it; none is yet scheduled).
- Phase 8's hostile script (SM-1) can now cite this recorded run alongside `scripts/curl-suite.sh` and `scripts/server/route-suite.proof.mjs` as the two proof artefacts D-09 describes it as growing from.
- This was the last plan in Phase 3 (wave 8 of 8, plan 16 of 16); Phase 3 is complete pending the STATE/ROADMAP/REQUIREMENTS updates this SUMMARY's own commit carries.
- The `[SECURITY]` blocker recorded in STATE.md (unexplained, uncommitted modifications to `lib/data/types.ts` and `scripts/claims-audit.mjs`, traced to a concurrent `ipv-demo` session) remains open and untouched by this plan — confirmed unchanged by `git status --short` before and after this plan's one commit. Still the user's call before Phase 4 begins.

## Self-Check: PASSED

All three `key-files` verified present on disk (`docs/analysis/server-seam-verification.md`, `docs/analysis/single-writer-non-bypassability.md`, `scripts/server/route-assertions.mjs`). Commit `5a2c775` verified present in `git log --oneline --all`, carrying an intact `Co-Authored-By`/`Claude-Session` trailer pair (confirmed via `git log -1 --format=%B` immediately after committing — no amend was needed since this commit used plain `git commit`, not `gsd-sdk query commit`). The commit shows no file deletions (`git diff --diff-filter=D --name-only HEAD~1 HEAD` empty). Every acceptance criterion from Task 1 was re-run directly against the final files: all four required `##` headings present in `docs/analysis/server-seam-verification.md` (count 4); `grep -c "^PASS  [A-H]"` on that file returns 47; `grep -n "X-CAP-Instance"` returns multiple matches; the file's last line is exactly `Recorded 2026-09-19.`; `scripts/server/route-assertions.mjs` gained two new `HEADER_EXCLUSIONS` entries citing this run; `docs/analysis/single-writer-non-bypassability.md`'s `## What a reviewer can run` section now names `docs/analysis/server-seam-verification.md` explicitly. `node --test scripts/server/route-assertions.test.mjs` (14/14), `node scripts/check-non-bypassability.mjs` (0 problems) and `npm run verify` (exit 0, twenty-six steps, "All steps exited 0") were all re-run after the edits and pass. No port left listening on 3000-3010, 4311 or 4312 after the verify run (only harmless `TIME_WAIT` entries on 4311).

---
*Phase: 03-server-seam*
*Completed: 2026-09-19*
