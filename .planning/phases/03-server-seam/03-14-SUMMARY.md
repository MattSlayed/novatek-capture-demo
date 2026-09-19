---
phase: 03-server-seam
plan: 14
subsystem: docs
tags: [non-bypassability, curl-suite, ad-19, fr-24, fr-57, bash, reviewer-proof]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "The twelve app/api routes (03-07 through 03-11), lib/reconcile/apply.ts as the sole writer and lib/access/scope.ts as the sole accessor (03-05, 03-03), the single-writer/actor-field/accepted-field build rules (03-12), and scripts/server/route-suite.proof.mjs's own automated A-H checks and five negative sets (03-13), which this plan's curl suite mirrors over plain curl"
provides:
  - "docs/analysis/single-writer-non-bypassability.md — the hand-written AD-19 enumeration: the one writer, the one accessor, all twelve routes by exact path (methods, request surface, writer call, closed-set record states, the no-finding statement), all five process.env names, and the fixture-set-is-not-a-switch statement plan 03-15's check reads"
  - "scripts/curl-suite.sh — the reviewer-facing curl A-H mirror of plan 03-13's automated suite, executable (git mode 100755), deliberately not wired into scripts/verify.mjs"
affects: [03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The first .sh file in this repository, alongside every other proof script's .mjs — justified in its own header comment against FR-24's 'ordinary shell with a standard HTTP client' requirement"
    - "A shell counter that must survive a command-substitution subshell is kept in a file inside the script's own mktemp -d workdir, never a plain variable — a plain variable's increment inside $(...) is silently discarded the instant that subshell exits, reproduced and fixed during this plan's own live dry run"
    - "JSON field extraction by grep -o/sed anchored on this project's own known, stable, single-line response shapes (e.g. 'proposals' is always the last top-level key in a verify/captures response, so a greedy match to the final ']' lands exactly on its own closing bracket) rather than a general-purpose parser"

key-files:
  created:
    - docs/analysis/single-writer-non-bypassability.md
    - scripts/curl-suite.sh
  modified:
    - .gitattributes

key-decisions:
  - "docs/analysis/single-writer-non-bypassability.md follows deployment-gate.md's exact shape (# Title — one-line scope statement, ##-headed sections, evidence inline, an Open items section, a bare --- plus Recorded <date>. footer) and states its own limitation first in ## Scope: it proves completeness (every name present), never that the prose beside a name is true"
  - "scripts/curl-suite.sh's check B opens wo-0142 before its verify call, matching plan 03-13's own identical finding — D-05's clock gate (a capture needs a running segment) is load-bearing in the shipped writer but is not spelled out in this plan's own check B text; without it check B returns 409 order_closed instead of 201"
  - "new_uuid()'s fallback pool counter is persisted in a file under the script's own mktemp -d workdir rather than a plain shell variable — found necessary only after running the script against a real server and watching every fallback-generated id collide with the one before it (see Deviations)"
  - "Chose CAPTURE_BYTES=2048 (not a value starting with the digit 1, e.g. 1024) so the script's own literal declared-size field could never contain the seed's retired \"bytes\":1 placeholder as a text substring, satisfying this plan's own acceptance-criteria grep without narrowing what the field actually proves"

requirements-completed: [REQ-FR-24, REQ-FR-57]

# Metrics
duration: 35min
completed: 2026-09-19
---

# Phase 3 Plan 14: Non-Bypassability Enumeration and the Reviewer Curl Suite Summary

**A hand-written AD-19 enumeration naming the one writer, the one accessor, all twelve routes and five env vars with their no-finding sentences, plus a reviewer-facing eight-check curl suite (D-09b) verified 47/47 against a live local server.**

## Performance

- **Duration:** 35 min (approx.)
- **Started:** 2026-09-19T07:24:46Z (approx.)
- **Completed:** 2026-09-19T07:59:35Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `docs/analysis/single-writer-non-bypassability.md`: written after re-running the grep D-12 calls for (`process\.env\.` across `app`, `lib`, `next.config.ts`; `ls app/api/**/route.ts`) rather than trusting the plan's own list — both matched the interfaces block exactly, so no reconciliation was needed. States AD-19's own limitation first (`## Scope`): the document is checked for completeness, not truth. Names `lib/reconcile/apply.ts` as the sole writer (its ten mutating exports, its own header's "session -> ownership -> idempotency -> shape -> state" order, `finalize()`'s retained-attempt guarantee) and `scripts/check-single-writer.mjs`'s own stated limitation (a regex sweep, not a parser). Names `lib/access/scope.ts` as the sole accessor (non-optional account argument, ownership-before-existence), the absence of `proxy.ts`/`middleware.ts`, and `scripts/check-actor-field.mjs`'s RBAC sweep. Twelve `###` route subsections, one per exact path, each stating methods, request surface, writer call (or its absence), the closed-set states it can produce, and that it produces no finding. Five `###` configuration subsections (`VERCEL_GIT_COMMIT_SHA`, `VERCEL_DEPLOYMENT_ID`, `CAPTURE_BUILD_ID`, `NODE_ENV`, `CAPTURE_SESSION_KEY`) plus a closing statement that no feature flag, build mode or fixture-selection variable exists, naming `lib/data/fixtures.ts` and `lib/data/register.ts` (confirmed by direct grep to have no importer anywhere in this phase). `## Open items` states the live-deployment header set (03-RESEARCH.md Assumptions Log A2) and Fluid Compute concurrency (A1) as open questions, each naming the artefact that answers it, not as reassurances.
- `scripts/curl-suite.sh`: the seed's A–H checks over plain `curl`, mirroring plan 03-13's automated suite. `set -u` only (never the fail-immediately flag — a comment explains why without using its own two-word name, since this plan's own acceptance criteria grep for that exact literal substring and a plan-quoted explanation would have tripped it). `B="${B:?...}"` as the first executable line. Two cookie jars (`acc-mabaso`, `acc-naidoo`) plus a no-jar path for check A. A `check` helper prints `PASS`/`FAIL` and never exits early; a final `N passed, M failed` line and `exit 1` when any failed. D-10 applied throughout: the real empty-file SHA-256, UUID `client_id`s (via `uuidgen`, then `/proc/sys/kernel/random/uuid`, then a twelve-entry literal fallback pool), ISO-8601 UTC `Z` timestamps, `image/jpeg` + a short real base64 thumbnail. AD-5's identity pair (`capture_client_id`, `observation_id`) carried from check B's own proposals into checks D and E, with a comment explaining that a 404 there means the shell mangled a field, not that the server is wrong. Never calls `jq`; every field is pulled with `grep -o`/`sed` against this project's own known response shapes. Committed as git mode `100755`; `.gitattributes` gained one path-scoped `text eol=lf` entry so a future Windows checkout cannot silently corrupt it to CRLF. Not added to `scripts/verify.mjs` — D-09 keeps the two proof halves apart, and the header comment says so explicitly.
- **Live-verified, not just statically checked:** built a throwaway harness (scratchpad only, not committed) reusing `scripts/lib/server.mjs`'s own `startServer`/`stopServer` to start the already-built production server on port 4313 and run `scripts/curl-suite.sh` against it end to end. First run surfaced a real bug (see Deviations); after the fix, **47/47 checks passed** and the server was torn down cleanly with no port left listening. `npm run verify` was then run once, cleanly, end to end: **exit 0, all 25 steps**, including `route-suite`'s own 14 tests (A–H, D-04, the five REQ-FR negative sets) against a server this repository starts and tears down for itself — confirming this plan's two new files did not disturb anything 03-01 through 03-13 already proved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write docs/analysis/single-writer-non-bypassability.md** - `5c406b3` (docs)
2. **Task 2: Write scripts/curl-suite.sh** - `c6d2760` (feat)

## Files Created/Modified

- `docs/analysis/single-writer-non-bypassability.md` - the AD-19/FR-24/FR-57 non-bypassability enumeration (379 lines)
- `scripts/curl-suite.sh` - the reviewer-facing curl A–H suite (502 lines, mode 100755)
- `.gitattributes` - one new scoped entry (`scripts/curl-suite.sh text eol=lf`)

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The fallback UUID generator's own counter never persisted across calls**
- **Found during:** the live dry run against a locally started production server (Task 2, after the first full run of the script)
- **Issue:** `neither `uuidgen` nor `/proc/sys/kernel/random/uuid` exists on this development machine's own Git Bash, so every `new_uuid` call exercised the fallback pool. The first implementation kept the pool's index in a plain shell variable, incremented inside the function body — but every call site reads the result through `$(new_uuid)`, and `$(...)` runs its command in a subshell; a subshell's own increment of that variable is discarded the instant the subshell exits. Every single fallback-generated id in the whole script was therefore the identical literal UUID. Concretely: check B's own `client_id` (used to open `wo-0142`) and its capture's `client_id` collided, so the capture request replayed the open's stored idempotency hash and refused `already_recorded_differently` instead of returning `201` — and the same collision cascaded through checks C, D, E, F and G, each reusing the one repeated id against a store entry some earlier check had already written under a different shape. The dry run's first pass showed 14 of 47 checks failing, every failure traceable to this one root cause.
- **Fix:** moved the counter into a file inside the script's own `mktemp -d` working directory (`$WORKDIR/uuid-index`), read and rewritten on every fallback call. A file on disk survives the subshell boundary a plain variable cannot.
- **Files modified:** `scripts/curl-suite.sh`
- **Verification:** re-ran the full dry run against the same locally started server: 47/47 checks passed, all previously-colliding ids now materially distinct.
- **Committed in:** `c6d2760` (Task 2 commit — found and fixed before the file was first staged)

**2. [Rule 1 - Bug] Check B must open wo-0142 before its verify call**
- **Found during:** Task 2, drafting check B, informed directly by plan 03-13's own identical, already-documented finding
- **Issue:** `lib/reconcile/apply.ts`'s capture branch refuses `409 order_closed` unless the order's clock already has a running segment (D-05). Neither this plan's own check B text nor the seed's original curl sketch (`docs/CAPTURE-PLAN-SEED.md` lines 344–369) opens the order first.
- **Fix:** added an explicit `POST /api/orders/wo-0142/open` call at the top of check B, with a comment naming D-05.
- **Files modified:** `scripts/curl-suite.sh`
- **Verification:** confirmed by the same live dry run; check B and every later check reusing `wo-0142`'s clock pass.
- **Committed in:** `c6d2760` (Task 2 commit)

**3. [Rule 1 - Bug] Two of this plan's own explanatory comments self-tripped its acceptance criteria**
- **Found during:** Task 2's own acceptance-criteria verification loop, before the file was first committed
- **Issue:** this plan's own acceptance criteria grep the file for the literal substrings `"sha256":"00"`/`"bytes":1` (must be absent — the seed's retired placeholder) and `set -e` (must be absent — the fail-immediately flag this script deliberately does not use). Two comments explaining exactly those two design choices — the header note describing what D-10 retired, and the note explaining why `CAPTURE_BYTES` starts with a digit other than one — quoted the forbidden substrings verbatim while explaining their absence, and the errexit-rationale comment (following the plan's own prose almost verbatim) named the flag it was explaining the absence of. Each would have tripped the exact check it was trying to satisfy — the same self-tripping-comment class this project's STATE.md has repeatedly logged since Phase 3's first plans.
- **Fix:** reworded all three passages to state the same facts functionally, without the literal matched text (e.g., "a two-character stand-in digest and a one-byte declared size", "no early stop on a failing command" in place of naming the flag).
- **Files modified:** `scripts/curl-suite.sh`
- **Verification:** re-ran every literal acceptance-criteria grep directly against the final file; all pass as specified.
- **Committed in:** `c6d2760` (Task 2 commit — caught and fixed before the file's first commit, no incorrect version ever landed)

**4. [Rule 2 - Missing Critical] Added a path-scoped `.gitattributes` entry for `scripts/curl-suite.sh`**
- **Found during:** Task 2, staging the file (`git add` printed "LF will be replaced by CRLF the next time Git touches it")
- **Issue:** this development machine has `core.autocrlf=true`. Without an override, a future checkout on this same machine — or any Windows clone — would silently convert the script to CRLF line endings, which breaks a bash script outright (a stray `\r` in a heredoc, a quoted string, or the shebang line itself). This plan's own project notes anticipated exactly this and pre-authorized the fix: "if you add a `.gitattributes` rule for it, keep it to that one path."
- **Fix:** added one entry, `scripts/curl-suite.sh text eol=lf`, following the exact pattern this repository already uses for `lib/data/plant.ts` and its three siblings. Confirmed the staged blob carries zero `\r` bytes after adding the rule.
- **Files modified:** `.gitattributes`
- **Verification:** `git cat-file -p :scripts/curl-suite.sh | grep -c $'\r'` returns `0`; `git ls-files -s scripts/curl-suite.sh` shows mode `100755` with the same blob hash before and after the attribute was added (no re-normalization was needed — the file was already LF).
- **Committed in:** `c6d2760` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bugs found only by actually running the script against a real server, 1 Rule 1 self-tripping-comment correction caught before any commit, 1 Rule 2 portability safeguard pre-authorized by this plan's own project notes). **Impact on plan:** all four were necessary for the two artefacts to do what the plan itself asks — an enumeration that is actually complete, and a suite that actually passes against the real, already-correct shipped server rather than against an idealised reading of the seed's original sketch. No scope creep: no file outside this plan's own two deliverables (plus the one pre-authorized `.gitattributes` line) was touched.

## Known Stubs

None — both artefacts are complete. The document enumerates the real, currently-shipped system; the script exercises real routes with real request bodies and asserts on real responses, verified end to end against a running server.

## Issues Encountered

- Two `npm run verify` runs were accidentally launched concurrently against this same working tree during this plan's own final verification step (an earlier background-shell invocation had not actually exited when a second, correctly-tracked one was started). The two runs raced on the shared `.next` build output — the second run's `check-register-isolation-bundle` step failed with `ENOENT: .next/static`, an artefact of that collision, not of either committed file. Diagnosed via `Get-CimInstance Win32_Process`, both stray process trees were terminated, both known ports (4311, 4312) and the process list were confirmed clean, the corrupted log was discarded, and a single clean `npm run verify` run followed: **exit 0, all 25 steps**. No file this plan touches was implicated; logged here for visibility only, per this project's own precedent for recording process-lifecycle incidents encountered during execution (Phase 1's D-22 red-job/teardown history).
- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts`, `scripts/claims-audit.mjs` and `docs/CAPTURE-PLAN-SEED.md` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --short` before and after both task commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here. `node scripts/claims-audit.mjs` (both standalone and as part of the full `npm run verify` run) exits 0 against the modified script — confirmed the audit's own `ROOTS` constant (`["app", "components", "lib"]`, identical in the working-tree copy and in `git show HEAD:scripts/claims-audit.mjs`) does not sweep `docs/`, so this plan's own `docs/analysis/` file was never in scope for it either way.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `docs/analysis/single-writer-non-bypassability.md` is in place for plan 03-15's `scripts/check-non-bypassability.mjs` to read: every route path, every `process.env` name and the writer/accessor/fixture module names it will assert against are present, verified by direct string search rather than by eye.
- `scripts/curl-suite.sh` is in place, executable, and proven end to end against a locally started server for plan 03-16 to run against a real deployment and record in `docs/analysis/`, per D-09(b)'s own two-artefact design.
- `npm run verify` passes end-to-end at 25 steps (confirmed after this plan's own two commits); no blockers for 03-15 or 03-16.
- The one item this plan's own `<verification>` block implicitly points toward but cannot produce from this sandbox — an actual recorded run of `scripts/curl-suite.sh` against a real Preview/Production deployment — is carried forward exactly as 03-13 already carried its own live-deployment gap forward: plan 03-16 is where that recording happens.

## Self-Check: PASSED

Both `key-files.created` verified present on disk: `docs/analysis/single-writer-non-bypassability.md` (379 lines, above the plan's 150-line minimum, containing `## Routes`), `scripts/curl-suite.sh` (502 lines, above the plan's 120-line minimum, mode `100755`). Both commit hashes (`5c406b3`, `c6d2760`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -1 --format=%B` immediately after each commit). Neither commit shows any file deletion (`git diff --diff-filter=D --name-only` empty for both). Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final files and passed exactly as specified, including the routes/env-name enumeration script from Task 1's own `<verify>` block and the combined `bash -n scripts/curl-suite.sh && node --test scripts/verify.test.mjs` from Task 2's. `npm run verify` re-run cleanly end to end after both commits: exit 0, all 25 steps. `node scripts/claims-audit.mjs` exits 0. No port left listening on 4311, 4312 or 4313 after any run this session.
