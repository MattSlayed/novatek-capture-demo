---
phase: 03-server-seam
plan: 01
subsystem: api
tags: [hmac, node-test, typescript, config, copy]

# Dependency graph
requires:
  - phase: 02-fixtures-types
    provides: "lib/data/types.ts's ConflictCode/CONFLICT_CODES and RejectCode/REJECT_CODES closed sets, and the fixture-suite gate step this plan's unit-suite step joins"
provides:
  - "lib/limits/index.ts — 17 named exports for every bounded quantity the server seam needs (AD-13), each with its AD-13 relationship asserted as an executable test"
  - "lib/session/key.ts — one lazily-resolved HMAC signingKey(), refusing to serve in production without CAPTURE_SESSION_KEY"
  - "lib/data/types.ts additions — not_open in the conflict closed set (D-06), OrderClock.segments' retained device-claim/measured-offset pair (FR-11), Proposal.observation_id (AD-5)"
  - "lib/copy/conflicts.ts — CONFLICT_COPY, REJECT_COPY, TRANSPORT_COPY: one sentence and next-act list per refusal code, typed so a new code cannot ship without copy"
  - "scripts/verify.mjs's nineteenth step, unit-suite, running lib/**/*.test.mjs right after fixture-suite"
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One bounded quantity = one named export in lib/limits, read by both sides (AD-13); no computed values, no environment reads, no grouping object"
    - "Lazy HMAC key resolution into a module-level cache, refuse in production when absent (../ipv-demo/lib/rbac/manifest.ts pattern) — reused for every module that signs with CAPTURE_SESSION_KEY"
    - "Closed-set copy modules: Record<Code, RefusalCopy> so TypeScript refuses an incomplete set, mirrored by a key-equality unit test against the type's own closed-set array"
    - "Environment-case unit tests spawn a fresh child process per case when the module under test caches a module-level value, so an earlier assertion's cache cannot mask a later one"

key-files:
  created:
    - lib/limits/index.ts
    - lib/limits/index.test.mjs
    - lib/session/key.ts
    - lib/session/key.test.mjs
    - lib/copy/conflicts.ts
    - lib/copy/conflicts.test.mjs
  modified:
    - lib/data/types.ts
    - scripts/check-fixture-shape.test.mjs
    - scripts/verify.mjs
    - scripts/verify.test.mjs
    - package.json
    - scripts/scaffold.test.mjs

key-decisions:
  - "Adopted the seed's P3 starting bounded values verbatim per CONTEXT.md's Claude's-discretion bullet (64 KB/40 KB thumbnail caps, 200/200/20/500 per-account caps, 5000 global cap, 6 h TTL, 12 h cookie Max-Age, 60 s online clock window, 60 min/5 min queued skew tolerance, 50 items/3 MB sync ceilings), plus three additional exports named by the plan (CAPTURE_MAX_DECLARED_BYTES 32 MiB, VOICE_MAX_DURATION_MS 120000 ms, EVICTION_RECORD_PER_ACCOUNT_MAX 100)"
  - "account_mismatch's sentence names the mechanism (queued under a different account) without interpolating a persona name, since the acting account is a runtime value and an interpolated sentence would be a second literal per module"
  - "clock_skew's EXPERIENCE.md [seed] sentence was copied character-for-character per the plan's literal-copy instruction, including its illustrative '3 h 12 m' figure — flagged in Next Phase Readiness for whichever later plan actually emits a clock_skew response"

requirements-completed: [REQ-FR-8, REQ-FR-11, REQ-FR-19]

# Metrics
duration: 28min
completed: 2026-09-17
---

# Phase 3 Plan 1: Server Seam Foundations Summary

**Bounded-value config (lib/limits), one shared HMAC session-key resolver, three additive type-closed-set edits, and per-refusal-code copy — plus a nineteen-step lib/ unit-suite gate that cannot pass while matching nothing.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-17T17:02:00Z (approx.)
- **Completed:** 2026-09-17T17:30:33Z
- **Tasks:** 3 completed
- **Files modified:** 12 (6 created, 6 modified)

## Accomplishments

- `lib/limits/index.ts`: 17 named exports for every bounded quantity the server seam needs — thumbnail/media caps, per-account and global store caps, TTL, cookie `Max-Age`, clock-offset windows, sync ceilings — each with its own rationale comment and, where AD-13 names a relationship (client target below server ceiling, skew floor below skew ceiling, per-account cap below global cap), that relationship is asserted as an executable test rather than described in prose.
- `lib/session/key.ts`: one lazily-resolved HMAC signing key (`signingKey()`), resolved on first call into a module-level cache and never at module load — `next build`/`next typegen` import every route module under a production-like `NODE_ENV`, so a throw at module scope would fail the build. Refuses to serve in production without `CAPTURE_SESSION_KEY`; returns a committed development fallback otherwise. This is the one resolver plans 03-03 (cookie) and 03-04 (proposal-id derivation) will both import.
- `lib/data/types.ts`: three additive edits, each verified against a running acceptance check —
  - `not_open` joins `ConflictCode`/`CONFLICT_CODES` immediately after `order_closed` (D-06); only `already_open` remains on AD-9's P4 schedule.
  - `OrderClock.segments` gains two optional fields, `device_claimed_opened_at` and `device_offset_s`, present only on `device_reconciled` segments, so FR-11's "neither silently replaces the other" holds.
  - `Proposal` gains a required `observation_id`, so a decision item can carry `capture_client_id` plus `observation_id` and any instance can reconstruct AD-5's triple.
- `lib/copy/conflicts.ts`: `CONFLICT_COPY`, `REJECT_COPY` and `TRANSPORT_COPY`, each typed `Record<Code, RefusalCopy>` so a new code cannot ship without a sentence and a next act. `not_open`'s sentence and actions match D-06's exact wording. Five new `TRANSPORT_COPY` sentences cover refusals that can occur before any order/capture/decision exists. Not a governed module — `lib/copy/governed.ts` is untouched.
- `scripts/verify.mjs` grew from eighteen to nineteen steps: `unit-suite` (`node --test lib/**/*.test.mjs`) runs immediately after `fixture-suite`, before `check-headers`. `scripts/verify.test.mjs`'s order, count and naming assertions all moved in lockstep, plus a new test proving the glob is non-empty rather than a vacuous pass.
- `npm run verify` was run end-to-end after all three tasks: exit 0, all nineteen steps reported, zero problems on every check (contrast, WCAG, structure, register isolation, governed-sentence, claims-audit, fixture-hash).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write lib/limits and lib/session/key with their unit tests** - `7587089` (feat)
2. **Task 2: Add not_open, the retained segment fields and the proposal's observation id to types.ts, update the closed-set test, and wire the unit-suite gate step** - `077af5c` (feat)
3. **Task 3: Write lib/copy/conflicts.ts — one sentence and one next act per refusal code** - `b5e0e5e` (feat)

## Files Created/Modified

- `lib/limits/index.ts` - 17 bounded-quantity exports (AD-13)
- `lib/limits/index.test.mjs` - asserts every export's shape and AD-13's three named relationships
- `lib/session/key.ts` - `signingKey()`, lazy HMAC key resolution, production refusal
- `lib/session/key.test.mjs` - four environment cases, each in a fresh child process
- `lib/data/types.ts` - `not_open`, `OrderClock.segments`' two optional fields, `Proposal.observation_id`
- `scripts/check-fixture-shape.test.mjs` - `CONFLICT_CODES` closed-set test updated to nine members
- `scripts/verify.mjs` - new `unit-suite` step (nineteenth of nineteen)
- `scripts/verify.test.mjs` - order/count/naming assertions updated; new glob non-emptiness test
- `package.json` - `test` script runs both `scripts/` and `lib/` globs
- `scripts/scaffold.test.mjs` - stale literal-script assertion updated (see Deviations)
- `lib/copy/conflicts.ts` - `CONFLICT_COPY`, `REJECT_COPY`, `TRANSPORT_COPY`
- `lib/copy/conflicts.test.mjs` - closed-set, voice-rule and governed-sentence-disjointness assertions

## Decisions Made

- Adopted the seed's P3 starting bounded values verbatim per CONTEXT.md's Claude's-discretion bullet, plus the three additional exports the plan names outright (`CAPTURE_MAX_DECLARED_BYTES`, `VOICE_MAX_DURATION_MS`, `EVICTION_RECORD_PER_ACCOUNT_MAX`) — no value was invented outside what CONTEXT.md or the plan itself specified.
- `account_mismatch`'s sentence (no quoted sentence exists in EXPERIENCE.md's table) names the mechanism without naming a persona, since the acting account is a runtime value.
- `clock_skew`'s `[seed]` sentence, including its illustrative "3 h 12 m" figure, was copied character-for-character per the plan's explicit instruction — see Next Phase Readiness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a stale literal-value assertion in scripts/scaffold.test.mjs**
- **Found during:** Task 2 (after editing package.json's `test` script)
- **Issue:** `scripts/scaffold.test.mjs`'s "scripts block matches exactly" test (from Phase 1) asserted the exact pre-03-01 literal value of `package.json`'s `test` script. Task 2's required edit (adding the `lib/**/*.test.mjs` glob) made this pre-existing, previously-passing test fail — a regression this task's own change caused, not a pre-existing issue.
- **Fix:** Updated the assertion to the new two-glob value, with a comment explaining the Phase 3 addition.
- **Files modified:** `scripts/scaffold.test.mjs`
- **Verification:** `npm test` and `npm run verify` both exit 0 with the fix in place.
- **Committed in:** `077af5c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug, Rule 1).
**Impact on plan:** Necessary consequence of the plan's own required `package.json` edit. No scope creep — no file outside what Task 2's change directly broke was touched.

## Issues Encountered

None beyond ordinary drafting corrections caught by the plan's own acceptance-criteria gate before each commit (a block-comment closed early on an embedded `lib/**/*.test.mjs` glob string; a header comment's own prose tripped the `process.env` grep; a new JSDoc comment tripped the `observation_ids` grep). All three were caught and fixed during Task 1/Task 2's acceptance-criteria verification loop, before the corresponding commit — no incorrect code was ever committed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/limits`, `lib/session/key.ts`, the three `types.ts` additions and `lib/copy/conflicts.ts` are all in place for 03-02 onward to import.
- Whichever later plan in this phase first emits a real `clock_skew` response (`lib/reconcile/validate.ts` or `lib/reconcile/apply.ts`, per D-07's clamp discussion) should treat `CONFLICT_COPY.clock_skew.sentence`'s "3 h 12 m" as EXPERIENCE.md's illustrative example, not a literal to reuse verbatim if a real computed skew needs to be reported — this plan copied it character-for-character per its own instruction and did not wire it into any route (no routes exist yet in this phase).
- `referral_evidence_missing` and `unknown_referral` carry explicit, empty placeholder entries in `lib/copy/conflicts.ts` (`sentence: ""`, `actions: []`) — intentional per the plan, resolved when P9 supplies their sentences.
- `npm run verify` passes end-to-end at nineteen steps; no blockers for 03-02.

## Self-Check: PASSED

All key-files.created verified present on disk (`lib/limits/index.ts`, `lib/limits/index.test.mjs`, `lib/session/key.ts`, `lib/session/key.test.mjs`, `lib/copy/conflicts.ts`, `lib/copy/conflicts.test.mjs`). All three task commit hashes (`7587089`, `077af5c`, `b5e0e5e`) verified present in `git log --oneline --all`. `npm run verify` re-run end-to-end after Task 3: exit 0, nineteen steps, zero problems reported by any check.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
