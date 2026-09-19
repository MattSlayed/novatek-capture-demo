---
phase: 03-server-seam
plan: 13
subsystem: testing
tags: [route-suite, node-test, byte-identity-comparator, curl-suite, next-start, verify-gate, cookie-jar]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "The twelve app/api routes (03-07 through 03-11); lib/http/contract.ts's HEADER_TABLE/STATUS_BY_CODE (03-02); lib/copy/conflicts.ts's CONFLICT_COPY/TRANSPORT_COPY (03-01); lib/limits (03-01); scripts/lib/server.mjs's startServer/stopServer (Phase 1); lib/data/artisans.ts's ORDER_IDS_BY_ARTISAN and lib/data/orders.ts's five work orders (Phase 2); scripts/verify.mjs's twenty-four-step gate (03-12)"
provides:
  - "scripts/server/route-assertions.mjs — the pure D-11 comparator, the NFR-F1 universal-header assertion, the AD-4 success-only guard, a cookie jar and a response snapshot helper; no server, no fetch of its own"
  - "scripts/server/route-assertions.test.mjs — the Phase 1 D-23 fixture proof, riding the pre-build fixture-suite glob"
  - "scripts/server/route-suite.proof.mjs — the curl suite's A-H checks, the D-04 device-reconciled clamp proof, and the REQ-FR-4/6/23/24/27 negative sets, all run over fetch against a spawned production server"
  - "scripts/verify.mjs's twenty-fifth STEPS entry (route-suite), after check-register-isolation-bundle and before check-contrast, not vercelExcluded"
affects: [03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "capFetch wraps the global fetch and auto-asserts NFR-F1's three universal headers on every response the suite ever sees, either called directly or handed to cookieJar() as its own fetchImpl, so a check cannot forget the assertion"
    - "A GET request that must carry a body goes through node:http directly — fetch's own Request constructor throws \"Request with GET/HEAD method cannot have body\" (confirmed empirically this session), so REQ-FR-4's one such negative case cannot go through fetch at all"
    - "A response body's own fresh, per-request timestamp (POST /api/sync's server_time field) is stripped before a byte-identity comparison, for the identical reason D-11's header-level exclusion list already excludes Date — handled once in the test file, not by widening the comparator's generic contract"

key-files:
  created:
    - scripts/server/route-assertions.mjs
    - scripts/server/route-assertions.test.mjs
    - scripts/server/route-suite.proof.mjs
  modified:
    - scripts/verify.mjs
    - scripts/verify.test.mjs

key-decisions:
  - "route-suite.proof.mjs resolves its own CAPTURE_BUILD_ID via git rev-parse --short HEAD in the child environment, mirroring scripts/verify.mjs's D-03 resolution — next start reloads next.config.ts's build-id gate exactly as next build does, reproduced empirically this session; the plan's own Code Example 9 named only the session key, not the build id"
  - "Task 2's check B opens wo-0142 before its verify call — D-05's clock gate (a capture requires a running segment) is not spelled out in the plan's own check B text but is load-bearing in the shipped writer; without it check B returns 409 order_closed, not the 201 the plan requires"
  - "The five REQ-FR negative-set tests are placed before check H in file-definition order, not appended after it — H restarts the server and AD-10 empties every store Map on a cold start, which would destroy the state FR-23/FR-27 read back (checkBState's proposals) and FR-24 reads (wo-0142's accumulated candidate_facts/rejected sets)"
  - "REQ-FR-6's POST /api/sync sub-case omits assertNoSuccessOnlyHeaders on the envelope itself — unlike the other five routes, /api/sync always returns 200 with X-CAP-Account and the four X-CAP-Sync-* counters present even when every item in the batch was refused (03-10's own documented, intentional design), so a literal application of that check would fail against already-correct code on every run; the compareResponses call immediately above it already proves no header value differs between the unowned and fabricated attempts, and a separate raw-text comparison of the per-item result objects proves the one place ownership could leak is byte-identical too"
  - "REQ-FR-6's sync envelope comparison strips the response body's own server_time field before comparing — a fresh per-response timestamp embedded in the body, not a header D-11's exclusion list could ever remove, handled locally in the test rather than by widening route-assertions.mjs's own generic comparator contract"
  - "REQ-FR-6's decisions-route pair and REQ-FR-27's unowned-proposal pair each open wo-0137 under acc-naidoo's own jar and verify a fresh asset there — the online decisions route names no order id at all, so the only way to exercise \"legitimately derived for a different account\" is a real verify performed as that account"

requirements-completed: [REQ-FR-1, REQ-FR-2, REQ-FR-3, REQ-FR-4, REQ-FR-5, REQ-FR-6, REQ-FR-7, REQ-FR-8, REQ-FR-9, REQ-FR-10, REQ-FR-11, REQ-FR-18, REQ-FR-19, REQ-FR-23, REQ-FR-24, REQ-FR-27, REQ-NFR-F1]

# Metrics
duration: ~43min (resumed after a prior attempt stalled with no progress on disk; this session's three task commits span 28 min)
completed: 2026-09-19
---

# Phase 3 Plan 13: Route Suite — Curl A-H, D-04 Clamp and Five Negative Sets Summary

**A node:test suite starts the already-built production server through scripts/lib/server.mjs, proves the seed's eight lettered curl checks plus D-04's device-reconciled clamp over fetch, and adds a twenty-fifth npm run verify gate step running the REQ-FR-4/6/23/24/27 byte-identity negative sets — 14/14 tests green, 25/25 gate steps green.**

## Performance

- **Duration:** ~43 min (resumed session; the coordinator's state check at 2026-09-19T06:37Z found no 03-13 commits and a clean tree — the three task commits below span 2026-09-19T06:50Z-07:19Z)
- **Started:** 2026-09-19T06:37:00Z (approx., per the resume instruction's own state verification)
- **Completed:** 2026-09-19T07:24:00Z (approx.)
- **Tasks:** 3 completed
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- `scripts/server/route-assertions.mjs`: pure helpers only — `HEADER_EXCLUSIONS` (nine entries: `date`, `connection`, `keep-alive`, `transfer-encoding`, `content-length`, `vary`, `server`, `etag`, and the `x-vercel-` prefix family, each with a one-line reason); `assertUniversalHeaders`/`assertNoSuccessOnlyHeaders` (work against either a live `Response`'s `Headers` or a `snapshot()`'s plain lowercased object, via one shared `headerValue` helper); `compareResponses` (D-11's comparator — status, exact body bytes, then the header maps with every excluded name removed, reporting the first differing header by name and both values on failure); `cookieJar(fetchImpl)` (captures every `set-cookie` into a name→value map via the response's own `getSetCookie()`, replays it as one `Cookie` header, drops a name on a `Max-Age=0` clear); `snapshot(response)`.
- `scripts/server/route-assertions.test.mjs`: 14 tests, all synthetic records built by hand — three cases proving `assertUniversalHeaders` throws (missing `X-CAP-Instance`, missing `X-CAP-Store`, `Cache-Control: private, no-cache`), `assertNoSuccessOnlyHeaders` passing/throwing, `compareResponses` passing across the excluded-header set and throwing on a differing `X-CAP-Order`/status/one-byte body difference (with its failure message asserted to name the header), `HEADER_EXCLUSIONS`'s own shape, and `cookieJar` driven with a stub fetch (never a real one) through capture → replay → clear.
- `scripts/server/route-suite.proof.mjs`: `test.before`/`test.after` start and stop the server once for the file (chosen over a single wrapping `test` + `try/finally` so each lettered check stays its own named `test()`, reading one-to-one against the roadmap's success criterion). Port 4312. `capFetch` wraps `fetch` and calls `assertUniversalHeaders` automatically; every request in the suite goes through it directly or via `cookieJar(capFetch)`. Checks A-H run the seed's curl suite over `fetch` (A: identity/filtering/401/cross-account 404; B: authored verification, `X-CAP-Proposals: 3`, `confidence: null`/`method: "authored"`, every proposal's `observation_id` non-empty; C: `409 asset_not_in_order` matching `CONFLICT_COPY` exactly; D: `decided_by` ignored, `acc-vanwyk` absent from raw text; E: rejection retained in the walk payload's `rejected` set, acceptance in `candidate_facts`; F: sync idempotency — `recorded` → `duplicate` → `already_recorded_differently`; G: hours accrue and `POST /api/hours` returns 405 with the full envelope; H: `X-CAP-Instance` constant across three calls, then changed after an explicit `stopServer`/`startServer` cycle). A named `D-04` test proves the queued-clamp end to end. Five further named tests (`REQ-FR-4`, `REQ-FR-6`, `REQ-FR-23`, `REQ-FR-24`, `REQ-FR-27`) implement the plan's five negative sets, placed before check H for the reason in Deviations.
- `scripts/verify.mjs`: `route-suite` joins `STEPS` immediately after `check-register-isolation-bundle` and before `check-contrast`, with no `shell: true` and no `vercelExcluded`. `scripts/verify.test.mjs`: `EXPECTED_ORDER` carries `route-suite` at that position (twenty-five ids); the order test's name and header comment read "twenty-five"; `resolveSteps` length assertions moved 22→23 (`VERCEL: "1"`) and 24→25 (the three unset-or-distractor cases); two new tests assert the placement contract (`route-suite` not `vercelExcluded`, its index greater than `next-build`'s) and the glob-exclusion contract (`route-suite`'s path named in exactly one `STEPS` entry's `args`, and the pre-build fixture-suite glob never matches it).
- `STEPS.length` was exactly 24 before this plan started (confirmed directly against `scripts/verify.mjs`), matching the interfaces block's stated baseline — no reconciliation discrepancy to record.
- `npm run verify` run end to end after Task 3: **exit 0, all 25 steps** — 292 fixture-suite tests (276 carried forward + 14 new `route-assertions.test.mjs` + 2 new `verify.test.mjs` placement tests), 164 unit-suite tests (unchanged), 14 `route-suite` tests, zero problems on every other check (contrast, both WCAG steps, structure, register isolation, fixture-inputs, named-packages, single-writer, actor-field, accepted-fields). No port left listening on 4311 or 4312 after any run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/server/route-assertions.mjs and its self-test** - `6a25e34` (feat)
2. **Task 2: Write the route suite's server lifecycle and the A-H checks** - `af7549d` (feat)
3. **Task 3: Write the five negative sets and wire the route suite into verify** - `1b0fb1f` (feat)

## Files Created/Modified

- `scripts/server/route-assertions.mjs` - the pure D-11 comparator, universal/success-only header assertions, cookie jar, snapshot helper
- `scripts/server/route-assertions.test.mjs` - the Phase 1 D-23 fixture proof, 14 tests
- `scripts/server/route-suite.proof.mjs` - curl A-H, D-04's clamp, and the five negative sets against a spawned production server
- `scripts/verify.mjs` - `route-suite`, the twenty-fifth gate step
- `scripts/verify.test.mjs` - `EXPECTED_ORDER`, naming/length assertions, and two new placement-contract tests

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `next start` also needs a resolved `CAPTURE_BUILD_ID`, not only `CAPTURE_SESSION_KEY`**
- **Found during:** Task 2, first run of the route suite against a real server
- **Issue:** The suite's server never actually answered `/api/health`: `next start` reloads `next.config.ts`'s own build-id gate exactly as `next build`/`next typegen` do (empirically confirmed — the started process printed "Ready in 550ms" and then "CAPTURE_BUILD_ID unresolved: set VERCEL_GIT_COMMIT_SHA, VERCEL_DEPLOYMENT_ID, or CAPTURE_BUILD_ID before a production build."). The plan's own Code Example 9 in 03-RESEARCH.md named only `CAPTURE_SESSION_KEY` for the child environment, not the build id.
- **Fix:** Added `resolveCaptureBuildId()` to `route-suite.proof.mjs`, mirroring `scripts/verify.mjs`'s own `resolveBuildEnv()` exactly (checks `VERCEL_GIT_COMMIT_SHA`/`VERCEL_DEPLOYMENT_ID`/`CAPTURE_BUILD_ID` first, falls back to `git rev-parse --short HEAD` in the child environment only), merged into `startCaptureServer()`'s `childEnv` alongside the throwaway session key.
- **Files modified:** `scripts/server/route-suite.proof.mjs`
- **Verification:** All 9 (then 14) tests pass; confirmed the server answers `/api/health` immediately after this fix, both standalone and inside the full `npm run verify` run.
- **Committed in:** `af7549d` (Task 2 commit)

**2. [Rule 1 - Bug] Check B must open `wo-0142` before its verify call — D-05's clock gate is load-bearing but not named in the plan's own check B text**
- **Found during:** Task 2, drafting check B
- **Issue:** `lib/reconcile/apply.ts`'s capture branch refuses `409 order_closed` unless the order's clock already has a running segment (D-05). The plan's check B text describes posting a verify-purpose capture and asserting `201` directly, with no mention of opening the order first.
- **Fix:** Added an explicit `POST /api/orders/wo-0142/open` call at the top of check B's own test body, with a comment naming D-05 and explaining the gap between the plan's prose and the shipped writer.
- **Files modified:** `scripts/server/route-suite.proof.mjs`
- **Verification:** Check B (and every later check reusing `wo-0142`'s now-open clock) passes.
- **Committed in:** `af7549d` (Task 2 commit)

**3. [Rule 3 - Blocking] REQ-FR-4's "GET with a body" sub-case cannot go through `fetch`**
- **Found during:** Task 3, drafting the FR-4 negative set
- **Issue:** Confirmed empirically this session: `new Request(url, { method: "GET", body: ... })` throws `TypeError: Request with GET/HEAD method cannot have body` — the Fetch API refuses to construct such a request at all, so the plan's literal "send it as a GET with a body" instruction cannot be satisfied through `fetch`, which every other request in this suite uses.
- **Fix:** Added `rawGetWithBody()`, a small `node:http`-based helper that sends a real GET request carrying a JSON body and a `Cookie` header, returning the same `{ status, bodyText, headers }` shape `route-assertions.mjs` already expects (so it slots into `compareResponses`/`assertUniversalHeaders` unchanged). `GET /api/orders`'s own handler never reads a body at all, so the body's presence has no effect either way — this only had to be provable, not consequential.
- **Files modified:** `scripts/server/route-suite.proof.mjs`
- **Verification:** REQ-FR-4's test passes, including this sub-case's own `compareResponses` and `assertUniversalHeaders` calls.
- **Committed in:** `1b0fb1f` (Task 3 commit)

**4. [Rule 1 - Bug] The five negative sets must run before check H, not appended after it**
- **Found during:** Task 3, before writing the negative sets
- **Issue:** Check H (Task 2) restarts the server mid-test to prove `X-CAP-Instance` changes across a cold start. AD-10 empties every per-instance store `Map` on that restart. REQ-FR-23 and REQ-FR-27 read `checkBState.proposals` (issued in check B, before any restart), and REQ-FR-24 reads `wo-0142`'s accumulated `candidate_facts`/`rejected` sets (built up across checks B, D and E) — appending the five negative sets strictly after check H, as a naive reading of "Task 3 adds tests to the file Task 2 wrote" might suggest, would have them read from a freshly-booted, empty store and fail or silently pass against the wrong state.
- **Fix:** Inserted all five `REQ-FR-*` tests immediately before `test("H — ...")` in file-definition order (`node:test` runs a file's tests in definition order), with a comment at the insertion point explaining why.
- **Files modified:** `scripts/server/route-suite.proof.mjs`
- **Verification:** All 14 tests pass in a single run with the server never restarted before the five negative sets complete.
- **Committed in:** `1b0fb1f` (Task 3 commit)

**5. [Rule 1 - Bug] REQ-FR-6's `POST /api/sync` sub-case omits `assertNoSuccessOnlyHeaders` on the envelope**
- **Found during:** Task 3, first run of the extended suite (`AssertionError: REQ-FR-6 sync real: success-only header "X-CAP-Account" must not be present, got "acc-mabaso"`)
- **Issue:** The plan's text asks for `assertNoSuccessOnlyHeaders` on "every one of the twelve responses" across the six FR-6 route pairs, which literally includes the two sync responses. `POST /api/sync` is designed (03-10, D-01) to always return `200` with `X-CAP-Account` and the four `X-CAP-Sync-*` counters present, even when every item in the batch was refused — there is no `fail()`/not-found response shape for this route at all, unlike the other five. A literal application of this check would therefore fail against already-correct, already-shipped code on every run, not only a genuinely broken one.
- **Fix:** Removed the two `assertNoSuccessOnlyHeaders` calls on the sync envelope, with a comment explaining why and noting that the `compareResponses` call immediately above (which diffs the full header map, not just success-only names) and the separate per-item raw-text comparison already prove the one place ownership could leak is unaffected.
- **Files modified:** `scripts/server/route-suite.proof.mjs`
- **Verification:** REQ-FR-6 passes; `assertNoSuccessOnlyHeaders`'s overall call count in the file remains 15, still above the plan's own twelve-call floor.
- **Committed in:** `1b0fb1f` (Task 3 commit)

**6. [Rule 1 - Bug] REQ-FR-6's sync envelope comparison strips `server_time` before comparing**
- **Found during:** Task 3, same drafting pass as #5, before the first run
- **Issue:** `POST /api/sync`'s response body always carries a fresh `server_time: new Date().toISOString()`, which legitimately differs between two separate requests issued moments apart — a literal byte-for-byte `compareResponses` call on the raw envelopes would be flaky (occasionally passing, occasionally failing, depending on whether both requests land in the same millisecond), which is not the kind of proof this suite exists to produce.
- **Fix:** Added `stripServerTime()`, parsing each snapshot's body, deleting `server_time`, and re-serialising before handing both to `compareResponses` — the identical reasoning D-11's own header-level exclusion list already applies to `Date`, applied here to a body-embedded timestamp instead, and kept local to this one test rather than widening `route-assertions.mjs`'s generic contract.
- **Files modified:** `scripts/server/route-suite.proof.mjs`
- **Verification:** REQ-FR-6 passes deterministically across multiple runs.
- **Committed in:** `1b0fb1f` (Task 3 commit)

---

**Total deviations:** 6 auto-fixed (2 Rule 3 blocking issues necessary for the suite to run at all; 4 Rule 1 bugs necessary for the plan's own stated checks to hold against the real, already-correct shipped system rather than against an idealised one). **Impact on plan:** No file outside this plan's declared `files_modified` list was touched; no new library, architectural change or route was introduced. Every deviation reconciles a gap between the plan's prose and either the actual shipped interface (`next start`'s own build-id gate; `/api/sync`'s always-200 design) or a Fetch API restriction this session confirmed empirically (GET cannot carry a body) or a consequence of the plan's own design (H's restart) that the file's physical ordering had to respect.

## Known Stubs

None — every check in `route-suite.proof.mjs` exercises a real request against a real spawned server and asserts a real response; no hardcoded placeholder or mocked network call exists anywhere in the committed suite (the one stub-driven test, `cookieJar`'s own fixture in `route-assertions.test.mjs`, is explicitly a unit test of the jar mechanism itself, using a stub fetch by design per the plan's own instruction, never standing in for a real route).

## Issues Encountered

- **Live-deployment half of the plan's own `<verification>` block could not be run from this sandbox:** "confirm the route-suite step also ran on the Vercel build log and record the observed line in the SUMMARY" requires a live Vercel Preview/Production deployment or a GitHub Actions run, neither reachable from this environment — consistent with this project's own established pattern for exactly this class of gap (03-RESEARCH.md's Assumptions Log A1/A2/A4; Phase 1's D-22 live-falsification precedent). Locally confirmed instead: `npm run verify` exits 0 at 25 steps with `route-suite` visibly running between `check-register-isolation-bundle` and `check-contrast` in the captured log (`scripts/.check/full-verify-run1.log`). The next real push (GitHub Actions `verify` job) or Vercel build is what closes this gap, per D-09's own two-artefact design — plan 03-16 (or whichever plan next runs a live deployment check) is the natural place to record the observed line.
- A prior attempt at this same plan stalled with no progress reaching disk (per the coordinator's resume instructions); this execution restarted Task 1 from scratch. No half-written state from that attempt was found on disk or in git history — `git log --grep="(03-13)"` was empty and the working tree was clean apart from the pre-existing, out-of-scope modifications to `docs/CAPTURE-PLAN-SEED.md`, `lib/data/types.ts` and `scripts/claims-audit.mjs` (the `[SECURITY]` blocker recorded in STATE.md, confirmed unchanged by `git status --short` before and after all three of this plan's commits — none staged, edited or reverted here).
- `scripts/server/route-assertions.mjs`'s static import of `lib/http/contract.ts` triggers Node's `MODULE_TYPELESS_PACKAGE_JSON` warning (no `"type"` field in `package.json`) — the identical, pre-existing, non-fatal warning `scripts/check-fixture-hash.mjs` and 03-12's three check scripts already produce for their own imports of a `.ts` module from a `.mjs` file; goes to stderr, never affects the exit code. Not fixed, since `package.json`'s module type is outside this plan's `files_modified` scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three of this plan's files are in place, self-tested, and proven against a real spawned production server; `npm run verify` passes end to end at 25 steps (292 fixture-suite, 164 unit-suite, 14 route-suite tests), locally, with clean port teardown confirmed after every run.
- Roadmap success criteria 1 (curl A-H) and 2 (the five negative sets, byte-identical for an unowned vs. a fabricated id on read/open/close/capture/decide/sync) are now proven automatically on every build. Success criterion 3 (NFR-F1's universal headers) is asserted on every request the suite makes via `capFetch`'s automatic wrapper.
- `git log --grep="(03-13)"` now returns all three task commits; none shows a file deletion (`git diff --diff-filter=D --name-only 6a25e34~1 1b0fb1f` is empty).
- Plan 03-14 runs next on this same tree (per this plan's own project notes) and does not touch any file this plan modified.
- The one item this plan's own `<verification>` block asks for that this sandbox cannot produce — the observed `route-suite` line from a live GitHub Actions or Vercel build log — is carried forward; see Issues Encountered.

## Self-Check: PASSED

All `key-files.created`/`modified` verified present on disk: `scripts/server/route-assertions.mjs` (249 lines, ≥160 required), `scripts/server/route-assertions.test.mjs` (198 lines), `scripts/server/route-suite.proof.mjs` (989 lines, ≥320 required), `scripts/verify.mjs`, `scripts/verify.test.mjs`. All three commit hashes (`6a25e34`, `af7549d`, `1b0fb1f`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (`git log -1 --format=%B <hash> | grep -c` returned 2 for each). No commit across the plan's range shows a file deletion. `npm run verify` re-run end to end after Task 3: exit 0, all 25 steps, 292 + 164 + 14 tests, zero problems on every other check. Every acceptance-criteria grep from all three tasks was re-run directly against the final files and passed exactly as specified: `HEADER_EXCLUSIONS` carries a reason on every entry and no `x-cap-` name; the pre-build glob collects `route-assertions.test.mjs` and excludes `route-suite.proof.mjs`; `4312` present, `4311` absent, `"next build"`/`next", "build"` absent, the three numeric literals (`65536`/`43200`/`21600`) absent and the two banned sentence fragments absent from `route-suite.proof.mjs`; `REQ-FR-` (36), `compareResponses` (14) and `assertNoSuccessOnlyHeaders` (15) all clear their required floors; `STEPS.length` is 25 with `route-suite` after `next-build` and not `vercelExcluded`; `scripts/verify.test.mjs` contains no `"twenty-four"` and its own 31 tests all pass. No port left listening on 4311 or 4312 after any run this session.

---
*Phase: 03-server-seam*
*Completed: 2026-09-19*
