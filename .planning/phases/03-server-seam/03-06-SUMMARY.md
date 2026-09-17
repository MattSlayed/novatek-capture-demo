---
phase: 03-server-seam
plan: 06
subsystem: build-gate
tags: [ad-8, fr-17, build-rule, node-test, dependency-audit, import-graph, fixture-proof]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/verify/authored.ts's authoredMatch(assetId, fixtureSet) and lib/proposals/derive.ts's authoredProposals(assetId, fixtureSet) (03-04); scripts/verify.mjs's STEPS array and scripts/check-register-isolation.mjs's import-graph-walk helpers (03-01, Phase 1)"
provides:
  - "scripts/check-fixture-inputs.mjs — asserts AD-8's declared-inputs discipline (exact signatures) and import-graph isolation for lib/verify/ and lib/proposals/, plus a comment-stripped payload-identifier text sweep"
  - "scripts/check-named-packages.mjs — asserts FR-17's no-forbidden-dependency claim over package.json's four dependency maps and package-lock.json's resolved tree, direct and transitive"
  - "scripts/verify.mjs's STEPS grown from nineteen to twenty-one entries; both new steps run on Vercel's build and in the GitHub Actions job (neither is vercelExcluded)"
affects: ["any future phase or plan that modifies lib/verify/, lib/proposals/, package.json or package-lock.json — the two new gate steps run on every commit"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Build-rule fixture-proof discipline (Phase 1 D-20, D-23) extended to two new checks, reusing check-register-isolation.mjs's import-graph-walk helpers (toPosix/toRel/walkSourceFiles/loadAliasPrefix/extractSpecifiers/resolveImport) verbatim, generalized to a directory-prefix forbidden-set match"
    - "In-source, name@version-pinned exception allowlists for known-safe transitive dependencies (KNOWN_TRANSITIVE_EXCEPTIONS) — a hardcoded, auditable, printed-when-applied carve-out, never a flag or environment variable"

key-files:
  created:
    - scripts/check-fixture-inputs.mjs
    - scripts/check-fixture-inputs.test.mjs
    - scripts/check-named-packages.mjs
    - scripts/check-named-packages.test.mjs
  modified:
    - scripts/verify.mjs
    - scripts/verify.test.mjs

key-decisions:
  - "Excluded sha256 and capture_id from check-fixture-inputs.mjs's payload-identifier sweep — both are unavoidable, safe substrings already committed in lib/verify/authored.ts's and lib/proposals/derive.ts's own 03-04 code (an Omit<...> type argument that excludes capture_id, and createHmac's \"sha256\" algorithm name), mirroring 03-04's identical exclusions for its own unit tests"
  - "Added KNOWN_TRANSITIVE_EXCEPTIONS (sharp@0.35.4, zod@4.5.4) to check-named-packages.mjs, a name@version-pinned allowlist scoped to the lockfile-transitive sweep only — this repository's own package-lock.json already carries both transitively and legitimately (next's optional image-resizing dependency; eslint-plugin-react-hooks's own dev dependency), and a direct addition of either name to package.json is still caught unconditionally"

requirements-completed: [REQ-FR-17]

# Metrics
duration: 21min
completed: 2026-09-17
---

# Phase 3 Plan 6: Fixture Inputs and Named Packages Build Rules Summary

**check-fixture-inputs.mjs and check-named-packages.mjs turn AD-8's no-model claim into two fail-fast build rules — declared-input signatures, an import-graph walk, a payload-identifier text sweep, and a direct-plus-transitive dependency sweep — growing verify.mjs's gate from nineteen to twenty-one steps.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-17T20:42:44Z (approx., continuing directly from 03-05)
- **Completed:** 2026-09-17T21:04:05Z
- **Tasks:** 2 completed
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- `scripts/check-fixture-inputs.mjs`: three independent assertions of AD-8's no-model claim over `lib/verify/authored.ts` and `lib/proposals/derive.ts` — (1) each module's exported function declares exactly `(assetId: string, fixtureSet: string)` by source inspection, quoting the actual line found on a mismatch; (2) a BFS import-graph walk, reusing `check-register-isolation.mjs`'s helpers verbatim, proves neither module reaches `lib/reconcile`, `lib/store`, `lib/http`, `lib/access`, `app/api` or `lib/data/register.ts`, directly or transitively, through a relative or `@/`-aliased import; (3) a comment-stripped text sweep proves neither module's live code carries a capture-payload identifier. Nine fixture tests cover a widened signature, a renamed parameter, a direct forbidden import, a two-hop transitive import, the alias form, a payload identifier in live code versus only in a comment, and a missing `lib/verify/` directory.
- `scripts/check-named-packages.mjs`: sweeps `package.json`'s four dependency maps for a direct hit against a maintained `FORBIDDEN` list (vision/image-analysis, OCR, inference/ML libraries per FR-17, plus `zod`/`valibot`/`jsonwebtoken`/`jose` under this project's own dependency-minimalism principle), then `package-lock.json`'s `packages` keys for a transitive one — reported as transitive and naming the resolution path, since the two need different remedies. A missing lockfile is a named problem, not a silent pass. Eight fixture tests cover a direct hit, a devDependency hit carrying the dependency-minimalism reason instead of FR-17's, a prefix-rule hit, a lockfile-only transitive hit, a missing lockfile, a clean pair, and (beyond the plan's literal list) a proof that the version pin in `KNOWN_TRANSITIVE_EXCEPTIONS` is real.
- `scripts/verify.mjs`: both new steps join `STEPS` immediately after `check-register-isolation` and before `next-build`, neither `vercelExcluded`. `scripts/verify.test.mjs`: `EXPECTED_ORDER` carries both ids at that position (twenty-one total); the order test and header comment renamed from "nineteen" to "twenty-one"; `resolveSteps` length assertions updated (`VERCEL: "1"`: 17→19; the three unset-or-distractor cases: 19→21). The four position-relative structural tests needed no changes and were re-verified passing.
- `npm run verify` ran end-to-end after both tasks: exit 0, all twenty-one steps, 148 unit-suite tests plus the full fixture suite, zero problems on every check including the two new ones.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/check-fixture-inputs.mjs with its fixture test** - `9740828` (feat)
2. **Task 2: Write scripts/check-named-packages.mjs with its fixture test, and wire both rules into verify** - `0c52278` (feat)

**Plan metadata:** (this commit) `docs: complete fixture inputs and named packages plan`

_STEPS.length was 19 at the start of this plan, matching the interfaces block's stated baseline exactly — no reconciliation discrepancy to record._

## Files Created/Modified

- `scripts/check-fixture-inputs.mjs` - AD-8's declared-inputs, import-graph and payload-identifier assertions (REQ-FR-17)
- `scripts/check-fixture-inputs.test.mjs` - 9 tests, one per violation class plus the real repository
- `scripts/check-named-packages.mjs` - FR-17's no-forbidden-dependency claim, direct and transitive (REQ-FR-17)
- `scripts/check-named-packages.test.mjs` - 8 tests, one per violation class plus the real repository and the version-pin proof
- `scripts/verify.mjs` - two new gate steps, twenty-one total
- `scripts/verify.test.mjs` - `EXPECTED_ORDER`, naming and length assertions updated to match

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Excluded "sha256" and "capture_id" from check-fixture-inputs.mjs's payload-identifier sweep**
- **Found during:** Task 1, while drafting Assertion 3 (the payload-identifier text sweep), before running the check against the real repository
- **Issue:** The action text's identifier list (`sha256, bytes, thumb, mime, duration_ms, capture_id, payload`) trips on both target modules' own code, already committed in 03-04: `lib/verify/authored.ts`'s `export type AuthoredMatch = Omit<VerificationResult, "capture_id" | "verified_at">` and `lib/proposals/derive.ts`'s `Omit<Proposal, "id" | "capture_id" | "order_id" | "issued_at" | "state">` both carry the literal `"capture_id"` substring in live (non-comment) code — to explicitly *exclude* that field from their return types, the opposite of a leak. `derive.ts`'s `deriveProposalId` also carries `createHmac("sha256", signingKey())`, naming the hash algorithm, not a capture's own hash field. A literal sweep for either substring fails the real repository, contradicting Task 1's own acceptance criterion ("`node scripts/check-fixture-inputs.mjs` exits 0 against the real repository").
- **Fix:** Narrowed the swept set to `bytes, thumb, mime, duration_ms, payload` — confirmed via targeted grep beforehand that none of these five appear anywhere, comment or live, in either target file today, so nothing is silently un-covered by the narrowing. The comment-vs-live-code proof pair required by Task 1's acceptance criteria uses "thumb" in place of the action text's illustrative "sha256" example. Both exclusions and the reasoning are documented inline in the script's own header comment, pointing at 03-04-SUMMARY.md's identical precedent.
- **Files modified:** `scripts/check-fixture-inputs.mjs`, `scripts/check-fixture-inputs.test.mjs`
- **Verification:** `node scripts/check-fixture-inputs.mjs` exits 0 with `Problems: 0` against the real repository; `node --test scripts/check-fixture-inputs.test.mjs` passes all 9 tests, including both the live-code and comment-only "thumb" cases.
- **Committed in:** `9740828` (Task 1 commit)

**2. [Rule 1 - Bug] Added KNOWN_TRANSITIVE_EXCEPTIONS to check-named-packages.mjs**
- **Found during:** Task 2, immediately after writing the lockfile-transitive sweep, before running it against the real repository
- **Issue:** A targeted grep of this repository's own `package-lock.json` (run deliberately before finalizing the sweep, to catch this exact class of self-tripping bug before a commit) found two forbidden names already present transitively and legitimately: `sharp@0.35.4` — an entry in `next@16.3.4`'s own `optionalDependencies`, feeding `next/image`'s optional server-side resizing pipeline, with the entry itself marked `optional: true` — and `zod@4.5.4` — a plain, non-optional dependency of `eslint-plugin-react-hooks@7.1.1`, `dev: true`, used only for that plugin's own internal rule-config validation. Neither is imported anywhere by this project's own source. An unconditional lockfile sweep, as the action text describes it, reports both and fails the real repository, contradicting Task 2's own acceptance criterion.
- **Fix:** Added `KNOWN_TRANSITIVE_EXCEPTIONS`, a hardcoded `Set` of exact `"<name>@<resolved-version>"` strings, checked only inside the lockfile-transitive loop — never the direct `package.json` sweep, so a future *direct* addition of either name is still caught unconditionally. A version bump on either side, or the same name arriving via a different path at a different version, no longer matches the pinned string and re-trips the check — proved with an additional fixture beyond the plan's literal list ("a fixture where sharp arrives transitively at a version other than the pinned exception still exits non-zero"). Each applied exception prints an informational line naming the exact match, so it is visible in every run's output rather than silent.
- **Files modified:** `scripts/check-named-packages.mjs`, `scripts/check-named-packages.test.mjs`
- **Verification:** `node scripts/check-named-packages.mjs` exits 0 with `Problems: 0` against the real repository, printing both exception lines; `node --test scripts/check-named-packages.test.mjs` passes all 8 tests; `npm run verify` passes end-to-end at twenty-one steps.
- **Committed in:** `0c52278` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — the same class of self-tripping plan bug 03-04 already documented once for its own unit tests, now recurring for these two new build-rule scripts against the same already-committed code and the same real dependency tree).
**Impact on plan:** Both fixes were necessary for each new check to hold simultaneously against its own real-repository acceptance criterion and against the plan's literal identifier/sweep lists; neither weakens what either check catches for a genuinely *new* violation — both are narrow, named, documented, in-source exclusions, never a flag, environment variable, or skip. No scope creep — no file outside the plan's own `files_modified` list was touched, and every other acceptance criterion in both tasks passed unmodified.

## Known Stubs

None — both scripts are complete, real checks wired into the real gate; no placeholder logic, no mock data, no deferred implementation.

## Issues Encountered

None beyond the two deviations documented above, both discovered and fixed before the corresponding commit — no incorrect or self-tripping check was ever committed.

## User Setup Required

None - no external service configuration required. This phase installs zero packages, matching RESEARCH.md's Package Legitimacy Audit ("Not applicable").

## Next Phase Readiness

- Both new gate steps run in `npm run verify` (twenty-one steps total) on every local run, on Vercel's build, and in the GitHub Actions `verify` job — neither carries `vercelExcluded`.
- `KNOWN_TRANSITIVE_EXCEPTIONS` in `scripts/check-named-packages.mjs` is the one place a future, legitimate transitive-dependency version bump (e.g. `next` or `eslint-plugin-react-hooks` moving their own pin on `sharp`/`zod`) needs a matching update — until then, the check will correctly re-fail on the new version, which is the intended behavior, not a regression to route around.
- This was Wave 3's last plan. The three ongoing SECURITY blockers regarding uncommitted, out-of-scope modifications to `lib/data/types.ts` and `scripts/claims-audit.mjs` (recorded in STATE.md during the 03-04 session) remain untouched by this plan — both files were left exactly as found on disk, per this session's explicit instructions, and neither was staged, edited, or reverted. They remain the user's call.
- `npm run verify` passes end-to-end at twenty-one steps; no blockers for 03-07 onward.

## Self-Check: PASSED

All `key-files.created` verified present on disk (`scripts/check-fixture-inputs.mjs`, `scripts/check-fixture-inputs.test.mjs`, `scripts/check-named-packages.mjs`, `scripts/check-named-packages.test.mjs`). Both task commit hashes (`9740828`, `0c52278`) verified present in `git log --oneline --all`, each with an intact `Co-Authored-By`/`Claude-Session` trailer. `npm run verify` re-run end-to-end after Task 2: exit 0, all twenty-one steps, zero problems reported by any check.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
