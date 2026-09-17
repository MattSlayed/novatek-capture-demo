---
phase: 03-server-seam
plan: 04
subsystem: verification
tags: [hmac, node-test, typescript, authored-verification, proposals, ad-5, ad-8]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/session/key.ts's signingKey() and the Proposal.observation_id field added in 03-01"
provides:
  - "lib/verify/authored.ts — authoredMatch(assetId, fixtureSet), the whole of the verification answer (AD-8, REQ-FR-17)"
  - "lib/proposals/derive.ts — authoredProposals(assetId, fixtureSet), deriveProposalId, proposalIdMatches, UnknownCitedRecordError (AD-5, AD-8, REQ-FR-21, REQ-FR-27)"
affects: [03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Declared-inputs discipline for authored content: exactly (assetId, fixtureSet), asserted by source-inspection unit tests (and, later, plan 03-06's build rule) rather than by convention alone"
    - "AD-5 derived identity: HMAC-SHA256 over NUL-joined inputs, re-derived and compared via timingSafeEqual behind an explicit length guard — never stored, never parsed, following ../ipv-demo/lib/rbac/manifest.ts's signZone/verifyZoneSignature shape exactly"

key-files:
  created:
    - lib/verify/authored.ts
    - lib/verify/authored.test.mjs
    - lib/proposals/derive.ts
    - lib/proposals/derive.test.mjs
  modified: []

key-decisions:
  - "Excluded \"capture\" from authored.test.mjs's banned-substring sweep and \"sha256\" from derive.test.mjs's — both substrings are unavoidable inside plan-mandated literal code (Omit's \"capture_id\" type argument; createHmac's \"sha256\" algorithm name) and cannot be reworded without breaking the required code; each test file documents this inline"
  - "resolveCitedRecord in derive.ts scopes CitedFact resolution to the observation's own asset (MACHINERY_BY_ID.get(assetId).facts) rather than searching every asset's facts, verified directly against plant.ts that every fact-cited observation in the fixture set cites a fact on its own asset"
  - "Fixed 3 raw NUL bytes a Write call embedded in derive.ts's first draft in place of the intended escape-sequence text for the NUL field separator, using a Node script built from character codes rather than typing the escape sequence a second time"

requirements-completed: [REQ-FR-17, REQ-FR-21, REQ-FR-27]

# Metrics
duration: 31min
completed: 2026-09-17
---

# Phase 3 Plan 4: Authored Verification and Derived Proposal Identity Summary

**authoredMatch(assetId, fixtureSet) and authoredProposals(assetId, fixtureSet) declare AD-8's whole input surface; deriveProposalId/proposalIdMatches make a proposal's id an unstored HMAC-SHA256 digest any instance can re-derive and compare.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-09-17T18:59:56Z (approx., continuing directly from 03-03)
- **Completed:** 2026-09-17T19:31:08Z
- **Tasks:** 2 completed
- **Files modified:** 4 (4 created, 0 modified)

## Accomplishments

- `lib/verify/authored.ts`: `authoredMatch(assetId, fixtureSet)` is the whole of the verification answer (AD-8) — it resolves `assetId` through `MACHINERY_BY_ID` and only returns `outcome: "matched"` when the asset resolves and `fixtureSet` equals the live `FIXTURE_VERSION`; otherwise `pending`, with both matched fields `null`. `confidence` is `null` unconditionally and `label` resolves through `GOVERNED`'s `authoredVerification` key via a single module constant, never a restated sentence. No third parameter exists through which a capture's own bytes could reach this function.
- `lib/proposals/derive.ts` carries two separate concerns, kept apart on purpose: `authoredProposals(assetId, fixtureSet)` (the same AD-8 declared-inputs discipline, returning one entry per `OBSERVATIONS_BY_ASSET` row with `provenance` composed from the cited record's own `Provenance` — resolved against `DEVIATION_BY_ID` first, then the asset's own `CitedFact[]`, throwing a named `UnknownCitedRecordError` rather than falling back silently) and the AD-5 identity pair `deriveProposalId`/`proposalIdMatches` (one bare HMAC-SHA256 digest over account, client id and observation id, NUL-separated; re-derived and compared via `timingSafeEqual` behind an explicit length guard, never inspecting the candidate's structure since a digest has none to inspect).
- 29 new unit tests (9 authored + 20 derive) joined the `unit-suite` step, growing it from 60 to 89. Every acceptance criterion from both tasks was run directly (signature/arity by source inspection, the `timingSafeEqual` length-guard grep, the `u0000` grep, the `parseProposalId`-absence grep, `tsc --noEmit`, `eslint`, `check-governed.mjs`, `claims-audit.mjs`) before each commit, and `npm run verify` passed end-to-end at all nineteen steps afterward (`next build`, `next typegen`, 229 fixture-suite tests, 89 unit-suite tests, zero problems on every check).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write lib/verify/authored.ts and its unit test** - `5af4649` (feat)
2. **Task 2: Write lib/proposals/derive.ts and its unit test** - `c2122ef` (feat)

**Plan metadata:** (this commit) `docs: complete authored verification and proposal identity plan`

## Files Created/Modified

- `lib/verify/authored.ts` - the authored verification answer, declared over `(assetId, fixtureSet)` (AD-8, REQ-FR-17)
- `lib/verify/authored.test.mjs` - 9 tests: signature/arity, matched/pending cases, determinism, the confidence-null invariant, the capture-field negative set
- `lib/proposals/derive.ts` - authored proposals plus AD-5's derived, unstored proposal identity (REQ-FR-21, REQ-FR-27)
- `lib/proposals/derive.test.mjs` - 20 tests: signatures/arity, both citation-resolution paths, id determinism/non-sequentiality/opacity, REQ-FR-27's unit half (fabricated id and another account's id fail identically)

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Excluded "capture" from lib/verify/authored.test.mjs's banned-substring sweep**
- **Found during:** Task 1, while drafting the unit test's source-level negative-set assertion
- **Issue:** Task 1's `<action>` asks the unit test to assert the module's source contains none of `sha256, bytes, thumb, mime, duration_ms, capture, payload`. The same task's `<action>` also mandates, verbatim, `export type AuthoredMatch = Omit<VerificationResult, "capture_id" | "verified_at">`, which necessarily contains the substring "capture" as the real field name being omitted. The two instructions are mutually exclusive: the acceptance-criteria grep (`sha256|thumb|duration_ms|payload`) does not include "capture", "bytes" or "mime" at all, which shows the acceptance criterion is the authoritative gate and the test-writing prose's fuller list was written more expansively than the mandated code allows.
- **Fix:** Wrote the test's banned-word list as `["sha256", "thumb", "duration_ms", "payload", "bytes", "mime"]` — matching the acceptance-criteria grep plus two additions that do not conflict with anything — and excluded "capture", with an inline code comment in the test file explaining why.
- **Files modified:** `lib/verify/authored.test.mjs`
- **Verification:** `node --test lib/verify/authored.test.mjs` passes; `grep -in "sha256\|thumb\|duration_ms\|payload" lib/verify/authored.ts` (the actual acceptance criterion) returns no match.
- **Committed in:** `5af4649` (Task 1 commit)

**2. [Rule 1 - Bug] Excluded "sha256" from lib/proposals/derive.test.mjs's banned-substring sweep**
- **Found during:** Task 2, while drafting the unit test's source-level negative-set assertion
- **Issue:** Task 2's `<action>` asks the unit test to assert the module's source contains none of `sha256, thumb, duration_ms, payload`. The same task's `<action>` mandates, verbatim (quoting RESEARCH.md §Pattern 3), `createHmac("sha256", signingKey())` as `deriveProposalId`'s implementation — the same literal algorithm identifier already committed in `lib/session/cookie.ts`'s identical `createHmac("sha256", signingKey())` call from plan 03-03. A hash-algorithm name and a capture envelope's own sha256 hash field are different things that a plain-text substring grep cannot distinguish.
- **Fix:** Wrote the test's banned-word list as `["thumb", "duration_ms", "payload"]`, excluding "sha256", with an inline code comment in the test file explaining why and pointing at the precedent already in `lib/session/cookie.ts`.
- **Files modified:** `lib/proposals/derive.test.mjs`
- **Verification:** `node --test lib/proposals/derive.test.mjs` passes; `npx tsc --noEmit` and `node scripts/claims-audit.mjs` both exit 0.
- **Committed in:** `c2122ef` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed 3 raw NUL bytes embedded in lib/proposals/derive.ts's first draft**
- **Found during:** Task 2, immediately after the first Write of `lib/proposals/derive.ts`, before running any test or acceptance check against it
- **Issue:** The file's header comment and `deriveProposalId`'s join template both needed the literal six-character escape-sequence text for a NUL byte. Typing that text directly in Write tool content caused an intermediate layer to decode it into three real NUL control bytes (0x00) instead of leaving the six printable characters in the source — the exact failure mode this project's own MEMORY.md already records for subagent-written files.
- **Fix:** Diagnosed with a Node script reading the file as a raw `Buffer` and counting `0x00` bytes (found exactly 3, at the 3 intended locations); repaired with a second Node script that rebuilds the replacement text from `String.fromCharCode(92)` concatenated with the plain string `"u0000"`, so the fix script itself never contains a literal backslash-u sequence that could be reinterpreted the same way.
- **Files modified:** `lib/proposals/derive.ts` (fixed before it was ever staged or committed — the committed version at `c2122ef` was already clean)
- **Verification:** Re-scanned the file for `0x00` bytes (0 found) and for the literal 6-character escape-sequence text (3 found, at the 3 correct locations) before writing or running the test file; `grep -n "u0000" lib/proposals/derive.ts` returns 2 matches (the comment and the join template).
- **Committed in:** `c2122ef` (Task 2 commit) — no separate fix commit needed since the correction landed before the first commit of this file.

---

**Total deviations:** 3 auto-fixed (2 self-tripping plan bugs, Rule 1; 1 tooling encoding bug, Rule 1).
**Impact on plan:** All three were necessary for the plan's own literal, mandated code to compile and run correctly while still satisfying every check that does not itself conflict with that code. No scope creep — no file outside `lib/verify/` and `lib/proposals/` was touched, and every acceptance criterion in both tasks' `<acceptance_criteria>` blocks was run and passed, including the two grep checks whose parallel test-file assertions were narrowed.

## Known Stubs

None — both modules are complete, pure functions with no placeholder data, no mock wiring and no deferred implementation.

## Issues Encountered

None beyond the NUL-byte encoding issue documented above as a deviation, which was caught and fixed before any test ran or any commit was made.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/verify/authored.ts` and `lib/proposals/derive.ts` are both in place for the route plans later in this wave to import — `authoredMatch`/`authoredProposals` for the verify route, `deriveProposalId`/`proposalIdMatches` for the decisions route's re-derive-then-compare check.
- Plan 03-06's `scripts/check-fixture-inputs.mjs` (not yet written) should assert both modules' declared-inputs discipline by source inspection exactly as this plan's own acceptance criteria already do by hand; nothing here anticipates or duplicates that script.
- `deriveProposalId`/`proposalIdMatches` sign under the same `lib/session/key.ts` resolver `lib/session/cookie.ts` (03-03) already uses — no second key resolver was introduced.
- `npm run verify` passes end-to-end at nineteen steps (229 fixture-suite tests, 89 unit-suite tests); no blockers for 03-05.

## Self-Check: PASSED

All `key-files.created` verified present on disk (`lib/verify/authored.ts`, `lib/verify/authored.test.mjs`, `lib/proposals/derive.ts`, `lib/proposals/derive.test.mjs`). Both task commit hashes (`5af4649`, `c2122ef`) verified present in `git log --oneline --all`, each with an intact `Co-Authored-By`/`Claude-Session` trailer. `npm run verify` re-run end-to-end after Task 2: exit 0, all nineteen steps, 229 fixture-suite tests and 89 unit-suite tests, zero problems reported by any check.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
