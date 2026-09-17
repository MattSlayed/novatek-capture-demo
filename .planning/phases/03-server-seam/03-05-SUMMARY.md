---
phase: 03-server-seam
plan: 05
subsystem: reconcile
tags: [single-writer, idempotency, state-machine, hmac, node-test, typescript]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/limits' bounded quantities and lib/copy/conflicts' refusal sentences (03-01); lib/store/memory's mutating/read exports (03-02); lib/session/cookie's SessionResult, lib/attribution's deriveAccount and lib/access/scope's orderOwned/assetInOrder (03-03); lib/verify/authored's authoredMatch and lib/proposals/derive's authoredProposals/deriveProposalId/proposalIdMatches (03-04)"
provides:
  - "lib/reconcile/validate.ts — strict D-CONV shape predicates, ACCEPTED_BODY_FIELDS/ACCEPTED_PAYLOAD_FIELDS (AD-20, FR-61), pick(), per-kind payload validators, canonicalize()/idempotencyHash() (AD-9), seenKey()"
  - "lib/reconcile/apply.ts — applyItem (the sole writer, session -> ownership -> idempotency -> shape -> state) and noteContact (D-07); applyByKind's full order_open/order_close/capture/decision state transitions"
  - "lib/store/memory.ts gained readUnattributedAttempts() — the one addition to an already-shipped module this plan needed"
affects: [03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed check order as guarded returns: session -> ownership -> idempotency -> shape -> state, every step returning through one finalize() choke point that writes the retained attempt and the seen entry (AD-1)"
    - "A decision's ownership is a pure HMAC re-derivation (proposalIdMatches) at the same position orderOwned occupies for every other kind, so an unowned id and a fabricated id take the identical path (AD-2, AD-5)"
    - "Records are built by explicit named-field assignment, never by spreading a payload — the mechanism that makes AD-20's drop-at-parse guarantee hold at the writer regardless of what a future route layer does or forgets to do"
    - "assertProposalState() as an executable guard on the closed {open,accepted,rejected,superseded} set (FR-24, AD-19), not just a comment"

key-files:
  created:
    - lib/reconcile/validate.ts
    - lib/reconcile/validate.test.mjs
    - lib/reconcile/apply.ts
    - lib/reconcile/apply.test.mjs
  modified:
    - lib/store/memory.ts

key-decisions:
  - "Task 2's own commit implements only order_open's immediate-path branch of applyByKind (enough for its own idempotency/attempt-writing proofs); Task 3's commit extends the same function with the queued clamp, order_close, capture and decision — matching the plan's own task split into two atomic commits"
  - "apply.ts never calls pick() itself: every written record (Capture, Decision, Proposal) is built by explicit named-field assignment, so an unlisted field can never be read or copied regardless of caller behaviour; pick() remains exported from validate.ts for a later plan's route-layer body parsing, and is exercised directly by idempotencyHash's own projection step"
  - "apply.ts does not call validate.ts's seenKey() directly: lib/store/memory.ts's readSeen/writeSeen already take account and client_id as two separate parameters, achieving the identical per-account separation structurally via its own nested Maps; seenKey remains exported and unit-tested from validate.ts as the documented statement of that scheme"
  - "A decision reaching an instance that never issued the proposal (readProposal returns null) is recorded outright, bypassing proposal_superseded/order_closed/clock_skew entirely — none of those checks has any local state to compare against, and EXPERIENCE.md's own stated behaviour for this case is unconditional recording, never a \"server restarted\" sentence"
  - "SyncItemResult.server has no singular proposal field, so a decision's one touched proposal (when a local copy exists) rides the existing plural `proposals` array as a single-element array, alongside `decision`"
  - "Decision.reconciled (a required field the plan's own action text does not address) is set to \"recorded\" on every constructed Decision, since apply.ts only ever builds one on the success path; the seed's \"pending\" value describes a client-side queue representation before the server ever sees the item, not anything this server-side writer would ever store"
  - "A photo/voice payload's declared bytes and a voice note's duration are refused media_too_large strictly above their lib/limits ceiling; the boundary value itself passes, proven by a one-character-either-side test on the thumbnail cap"

requirements-completed: [REQ-FR-7, REQ-FR-8, REQ-FR-9, REQ-FR-11, REQ-FR-15, REQ-FR-16, REQ-FR-19, REQ-FR-24, REQ-FR-61]

# Metrics
duration: 49min
completed: 2026-09-17
---

# Phase 3 Plan 5: The One Writer and Its Validator Summary

**lib/reconcile/validate.ts's strict D-CONV shapes and accepted-field enumerations behind lib/reconcile/apply.ts's single fixed-order writer — session, ownership, idempotency, shape, state — proving the clock's idempotent open/stated-conflict close/retained-reopen, the queued clamp, and a decision's re-derived, unstored proposal identity, all under `node --test lib/**/*.test.mjs` with no route or server anywhere.**

## Performance

- **Duration:** 49 min (approx.)
- **Started:** 2026-09-17T19:46:00Z (approx., continuing directly from 03-04)
- **Completed:** 2026-09-17T20:35:00Z
- **Tasks:** 3 completed
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `lib/reconcile/validate.ts`: four strict shape predicates (`isUuidShaped` tightened to `crypto.randomUUID()`'s own v4/variant-1 form, `isSha256Hex` lowercase-only, `isIsoUtcZ` with a `Date.parse` round-trip that catches a calendar rollover a bare regex would miss, `isPositiveInt`); `PHOTO_MIMES`/`VOICE_MIMES` compared on the base type before any `;` parameter; `ACCEPTED_BODY_FIELDS`/`ACCEPTED_PAYLOAD_FIELDS` as the single in-code statement of every write route's accepted fields (AD-20, FR-61), with AD-5's `capture_client_id`/`observation_id` pair enumerated by name on both surfaces; `pick()`; per-kind payload validators plus `validateEnvelopeItem`; `canonicalize()`/`idempotencyHash()` projecting onto the enumerated subset before hashing, so key order and stray fields cannot change it (AD-9); `seenKey()`.
- `lib/reconcile/apply.ts`: `applyItem` implements AD-1's fixed order as guarded returns through one `finalize()` choke point that writes a retained `AttemptEntry` on every path (success and failure alike, FR-60) and a `seen` entry on every terminal result but `duplicate`. A decision's ownership is `proposalIdMatches`'s HMAC re-derivation at the same position `orderOwned` occupies for every other kind. `applyByKind` implements every state transition: `order_open` idempotent-by-state with FR-11's queued clamp (device claim and measured offset both retained, neither replacing the other); `order_close` refusing `not_open` on a closed or never-opened order and appending cleanly on reopen; `capture` gated by asset membership and the clock (D-05), deriving and writing three open proposals for a verify-purpose capture on `m-ap003` and zero for `m-aa101`; `decision` refusing `unknown_proposal` identically for a fabricated id, another account's id, a wrong `observation_id` and a missing `capture_client_id` (FR-27), recording outright when the proposal is genuinely unknown to this instance, and retaining a rejected proposal alongside its decision (FR-25). `assertProposalState` guards the closed `{open,accepted,rejected,superseded}` set as an executable check, not a comment (FR-24, AD-19).
- `lib/store/memory.ts` gained one read-only export, `readUnattributedAttempts()` (see Deviations).
- 38 new unit tests (30 validate + 9 apply after Task 2, growing to 29 apply tests after Task 3 — 8 total net new apply tests were added on top of Task 2's 9, i.e. 20 more in Task 3) joined the `unit-suite` step. `npm run verify` passed end-to-end at all nineteen steps after Task 3 (`next build`, 229 fixture-suite tests, and the full `lib/**/*.test.mjs` run at 148 tests, zero problems on every check).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write lib/reconcile/validate.ts — strict shapes, accepted fields and the canonicaliser** - `7036570` (feat)
2. **Task 2: Write lib/reconcile/apply.ts — the fixed check order and the retained attempt** - `a488b2e` (feat)
3. **Task 3: Write applyByKind — the clock, the capture and the decision state transitions** - `4c834ba` (feat)

## Files Created/Modified

- `lib/reconcile/validate.ts` - strict shapes, accepted-field enumerations, `pick()`, the idempotency canonicaliser (D-10, AD-9, AD-20, FR-61)
- `lib/reconcile/validate.test.mjs` - 30 tests: every predicate's valid/refused boundary, `pick()`'s actor-field and content-field drops, the AD-5 identity-pair survival, `idempotencyHash`'s key-order/stray-field/enumerated-value behaviour, `seenKey`'s per-account separation
- `lib/reconcile/apply.ts` - `applyItem`/`noteContact`, the sole writer (AD-1); `applyByKind`'s four state transitions
- `lib/reconcile/apply.test.mjs` - 29 tests spanning the fixed check order, idempotency, every state transition, the FR-11 clamp, AD-5's re-derive-then-compare negative set, FR-25's retention and FR-23's actor-field negative set at the writer
- `lib/store/memory.ts` - added `readUnattributedAttempts()` (see Deviations)

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added lib/store/memory.ts's readUnattributedAttempts() export**
- **Found during:** Task 2
- **Issue:** Task 2's own test needs to verify that a `no_session` refusal (no acting account resolved) writes a retained `AttemptEntry` into the module-private `unattributedAttempts` ring — but `lib/store/memory.ts` (shipped complete in plan 03-02) exposed no reader for that ring; `readAttempts(account)` only ever reads a per-account ring. Without an accessor, FR-60's "every act produces a retained, readable entry" guarantee was unprovable for the one case that has no account to key a per-account read by.
- **Fix:** Added `readUnattributedAttempts(): AttemptEntry[]`, mirroring `readAttempts`'s own defensive-copy discipline (`structuredClone`), placed beside it in the module's READS section.
- **Files modified:** `lib/store/memory.ts`
- **Verification:** `lib/store/memory.test.mjs`'s existing 7 tests still pass unchanged; `lib/reconcile/apply.test.mjs`'s no-session test reads the ring back and finds the expected entry.
- **Committed in:** `a488b2e` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing-critical accessor, Rule 2).
**Impact on plan:** A minimal, additive, non-breaking export needed to make this plan's own test provable. No scope creep — no other export, behaviour or file in `lib/store/memory.ts` was touched.

## Known Stubs

None — `lib/reconcile/apply.ts`'s `applyByKind` fully implements all four reachable kinds (`order_open`, `order_close`, `capture`, `decision`); `referral` is refused `unknown_kind` at the shape step exactly as D-01 specifies pending P9, not stubbed silently.

## Issues Encountered

- One drafting correction caught during Task 3's own acceptance-criteria verification loop, before any commit: the D-04 clamp test's first draft claimed a device-opened time one hour before `issued_at`, which is outside `QUEUED_CLOCK_FLOOR_SLACK_SECONDS`' five-minute tolerance and correctly triggered `clock_skew` — the test's own fixture value was wrong, not the implementation. Corrected the claim to two minutes before `issued_at` (within tolerance) so the test demonstrates the clamp-to-floor behaviour it names. No incorrect code was ever committed; caught by the test run itself before Task 3's commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/reconcile/validate.ts` and `lib/reconcile/apply.ts` are both in place for the route plans later in this phase (03-07 through 03-11 for the online routes, 03-10 for `/api/sync`) to import — every route composes `deriveAccount`/`orderOwned` for its own not-found handling and then calls `applyItem` for the actual write, exactly as AD-1 requires.
- Plan 03-06's `scripts/check-fixture-inputs.mjs` and plan 03-12's `scripts/check-single-writer.mjs`/`check-actor-field.mjs`/`check-accepted-fields.mjs` should assert this plan's own guarantees (the single-writer import graph, the accepted-field enumerations, the actor-field ban) by source inspection exactly as this plan's own acceptance criteria already do by hand — nothing here anticipates or duplicates those build rules.
- `lib/reconcile/validate.ts`'s `pick()` and `ACCEPTED_BODY_FIELDS` are ready for the online routes' own body-parsing to import when 03-07 onward land; `apply.ts` itself never calls `pick()` on a body, only `idempotencyHash()` does on a payload, since every record apply.ts writes is built from explicit named fields already.
- `npm run verify` passes end-to-end at nineteen steps (229 fixture-suite tests, 148 `lib/**/*.test.mjs` tests); no blockers for 03-06.

## Self-Check: PASSED

All `key-files` verified present on disk: `lib/reconcile/validate.ts`, `lib/reconcile/validate.test.mjs`, `lib/reconcile/apply.ts`, `lib/reconcile/apply.test.mjs`, `lib/store/memory.ts`. All three task commit hashes (`7036570`, `a488b2e`, `4c834ba`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer. `npm run verify` re-run end-to-end after Task 3: exit 0, all nineteen steps, 229 fixture-suite tests and 148 `lib/**/*.test.mjs` tests, zero problems reported by any check. The plan's own full verification block (`node --test lib/reconcile/validate.test.mjs`, `node --test lib/reconcile/apply.test.mjs`, the single-writer grep across `lib app`, `check-governed.mjs`, `claims-audit.mjs`) was re-run directly and passed.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
