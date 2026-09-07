---
phase: 01-scaffold-conventions
plan: 04
subsystem: honesty-surface
tags: [copy-governance, claims-audit, node-test]

# Dependency graph
requires: ["01-01"]
provides:
  - "lib/copy/governed.ts — the eight governed sentences plus PLATFORM_413, each split into before/strong/after, defined exactly once (AD-12)"
  - "scripts/check-governed.mjs — duplicate-literal sweep of app/, components/, lib/ plus the closed-set assertion (D-09)"
  - "scripts/claims-audit.mjs — the ipv-demo register inherited verbatim (D-17) plus NOVATEK Capture's own D-18 additions"
  - "fixture tests (D-23) proving both checks exit non-zero on a violation and 0 on a near-miss"
affects: [01-05, 01-06, 01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "check-governed.mjs parses lib/copy/governed.ts as text via a string-literal-aware brace balancer (skips braces inside quoted strings, needed for pendingReconciliation's {time} placeholder) rather than a full TS parser — sufficient because the module's shape is flat string fields, no nested objects"
    - "check-governed.mjs's needles are derived from the module itself (before+strong+after, whitespace-normalised) — the check never restates a governed sentence, so a fixture module only needs the same shape, not the real project's copy"
    - "claims-audit.mjs follows the sibling's exact walk()/sweep/live-quoted-report/process.exit(1) shape unchanged; only the header comment differs from the inherited file (D-17)"

key-files:
  created:
    - lib/copy/governed.ts
    - scripts/check-governed.mjs
    - scripts/check-governed.test.mjs
    - scripts/claims-audit.mjs
    - scripts/claims-audit.test.mjs
  modified: []

key-decisions:
  - "Rule 1's funding alternation (\\bfunded by this round\\b) extends the inherited entry's own pattern regex in place, rather than becoming a second array entry — matches CONTEXT.md intel's 'the claims audit adds funded by this round to rule 1' framing, and keeps that single entry as the sole owner of every funding-claim alternative"
  - "check-governed.mjs's closed-set assertion (exact 8 keys, locked order) is unconditional, so every fixture module in check-governed.test.mjs declares the full 8-key GOVERNED shape (not a 2-key stand-in) — a stand-in would trip the closed-set assertion on every fixture regardless of what the test is actually proving, which would make the exit-0 fixture (import-and-render) fail for the wrong reason"
  - "check-governed.mjs's extra-export detection (D-09's 'no additional exported binding holds a before/strong/after shape other than PLATFORM_413') scans every top-level `export const NAME = {...}` generically, rather than special-casing a hardcoded ninth name — so the ninth-sentence fixture just adds any new export and the check still catches it"

requirements-completed: [REQ-FR-47, REQ-FR-50, REQ-FR-65, REQ-SM-5]

# Metrics
duration: 23min
completed: 2026-09-07
---

# Phase 1 Plan 4: Define the honesty module and build its two gates Summary

**`lib/copy/governed.ts` defines the eight governed sentences and the platform-413 sentence exactly once, each split into `before`/`strong`/`after` so a renderer can bold the load-bearing clause; `check-governed.mjs` sweeps `app/`, `components/` and `lib/` for a second literal (including split-across-lines and commented copies) and asserts the set of eight is closed; `claims-audit.mjs` carries the ipv-demo register verbatim with a new version/inheritance/owner header and nine NOVATEK Capture-specific additions, each proved by a matched trip/pass/excused fixture triple.**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-09-07T20:39:19+02:00 (immediately after 01-03's commit)
- **Completed:** 2026-09-07T21:02:00+02:00
- **Tasks:** 3
- **Files modified:** 5 created (`lib/copy/governed.ts`, `scripts/check-governed.mjs`, `scripts/check-governed.test.mjs`, `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs`)

## Accomplishments

- `lib/copy/governed.ts` exports exactly `GovernedKey`, `GovernedSentence`, `GOVERNED`, `PLATFORM_413` — the eight sentences in the locked key order, each sentence's `before + strong + after` concatenation reproducing the 01-UI-SPEC.md text character for character, with `{time}` preserved literally in `pendingReconciliation` and `PLATFORM_413` marked `[written here]` per D-19. `npx tsc --noEmit` exits 0.
- `scripts/check-governed.mjs` reads that module as text (never restating a sentence) via a string-literal-aware brace balancer, derives its needles from the parsed `before`/`strong`/`after` fields, sweeps every other file under the three roots with the whole file whitespace-normalised (catching a sentence split across JSX lines or hidden in a comment), and enforces the closed-set assertion: exactly the eight locked keys in order, and no additional exported binding shaped like a `GovernedSentence` other than `PLATFORM_413`. 7 fixture tests cover the real repository, a literal duplicate, a three-line-split duplicate, a commented duplicate, a ninth export, a reordered key set, and an import-and-render pass case — all green.
- `scripts/claims-audit.mjs` is `../ipv-demo/scripts/claims-audit.mjs` copied in full per D-17, with only the header replaced (register version, `inherited from ipv-demo/HANDOVER.md §3 at 8fd097a (2026-09-01)`, `owner: the SHEQ manager`, and the string-sweep limitation restated). Nine D-18 entries are appended (findings-verb family, camera-detects family, two performance/turnaround figure patterns, server-persistence family, TRL claim, competitor-name register, two modelled-savings-as-cash patterns), `RETIREMENT_MARKER` gains `never as (a )?finding` and `no model`, and Rule 1's funding alternation gains `\bfunded by this round\b` in place.
- Three of D-18's named additions turned out to already be present verbatim in the inherited register — not the two 01-PATTERNS.md flagged ("simulation", "records never cross the border") but a **third**, found during this task: the staffing/headcount pattern `reduce(s|d)? (reliance on imported|headcount)` already exists at the same regex, character for character. All three are left unchanged with an inline comment recording that they satisfy D-18's requirement, rather than duplicated into a second finding per hit.
- 31 fixture tests in `scripts/claims-audit.test.mjs`: a must-trip and a must-pass near-miss for every D-18 addition (funding, findings-verb, camera-detects, both performance-figure patterns, staffing, server-persistence, TRL, competitor-name, both modelled-savings patterns), an excused fixture for every entry carrying `allowQuoted` (funding, findings-verb, TRL, competitor-name, and the two inherited overlaps), and a "caught exactly once, not twice" proof for the two 01-PATTERNS.md-flagged inherited overlaps.
- Full suite (`npm test`) passes 87/87 across all `scripts/**/*.test.mjs` (56 prior + 31 new); `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `npx tsc --noEmit`, and `npx eslint .` all exit 0 against the real repository.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write lib/copy/governed.ts** — `6c2e6e4` (feat)
2. **Task 2: Write the duplicate-literal check and its fixture test** — `311dae3` (feat)
3. **Task 3: Copy the claims audit verbatim, extend it, and fixture every addition** — `01e5c93` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified

- `lib/copy/governed.ts` — the eight governed sentences plus `PLATFORM_413`, defined exactly once (AD-12)
- `scripts/check-governed.mjs` — duplicate-literal sweep + closed-set assertion (D-09)
- `scripts/check-governed.test.mjs` — 7 fixture tests (D-23)
- `scripts/claims-audit.mjs` — inherited register (D-17) + D-18 additions
- `scripts/claims-audit.test.mjs` — 31 fixture tests (D-23), a trip/pass/excused triple per addition

## Decisions Made

- Rule 1's funding alternation (`\bfunded by this round\b`) extends the inherited entry's own regex in place — matches the intel note ("the claims audit adds funded by this round to rule 1") rather than becoming a fourteenth-plus separate array entry
- `check-governed.mjs`'s closed-set assertion is unconditional (always exactly 8 keys, locked order), so every fixture in `check-governed.test.mjs` declares the full 8-key shape rather than the "small two-key stand-in" the plan's action text suggested — a stand-in would fail the closed-set assertion on every fixture regardless of the scenario under test, making the exit-0 fixtures fail for the wrong reason
- `check-governed.mjs` detects an extra `GovernedSentence`-shaped export generically (scans every top-level `export const NAME = {...}` for `before`/`strong`/`after` fields) rather than hardcoding a specific ninth name, so any future accidental export is caught the same way

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A third D-18 addition was already present verbatim in the inherited register, undetected by 01-PATTERNS.md**
- **Found during:** Task 3, transcribing D-18's "Staffing framing: `reduce(s|d)? (reliance on imported|headcount)`" addition
- **Issue:** This regex is character-for-character identical to an entry already in `../ipv-demo/scripts/claims-audit.mjs`'s inherited `PROHIBITED` array (`kind: "never"`, note "Appears nowhere in the TIA Act or APP; headcount framing is politically fatal."). 01-PATTERNS.md's redundancy flag named only two overlaps ("simulation", "records never cross the border") and missed this third one.
- **Fix:** Applied the same pattern the plan uses for the other two overlaps: left the inherited entry's pattern/note/kind unchanged and added an inline comment recording that it satisfies D-18's staffing-framing requirement, instead of appending a duplicate array entry that would produce two findings per hit.
- **Files modified:** `scripts/claims-audit.mjs`
- **Verification:** `node scripts/claims-audit.mjs` exits 0 against the real repository; the "staffing framing: trips on 'reduces headcount'" fixture test confirms the entry still fires exactly as the plan's trip/pass pair describes.
- **Committed in:** `01e5c93` (Task 3 commit)

**2. [Rule 1 - Bug] A reworded comment self-tripped `grep -c 'simulat'`'s expected count of 1**
- **Found during:** Task 3, running the acceptance-criteria grep after adding inline redundancy comments beside the three overlapping inherited entries
- **Issue:** The first draft of the comment beside the inherited "simulation" entry quoted the word "simulation" in prose ("satisfies the seed's 'never write 'simulation' in any form' addition"), pushing `grep -c 'simulat'` to 2 matches instead of the 1 the acceptance criterion requires — the check's own comment tripped its own literal-count assertion, the same class of self-inflicted bug 01-03's SUMMARY documented for `check-tokens.mjs`.
- **Fix:** Reworded the comment to describe the same rule without repeating the literal substring ("satisfies the seed's ban on that prohibited word (its every grammatical form)").
- **Files modified:** `scripts/claims-audit.mjs`
- **Verification:** `grep -c 'simulat' scripts/claims-audit.mjs` reports exactly 1; `node --test scripts/claims-audit.test.mjs` still passes 31/31.
- **Committed in:** `01e5c93` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs found and corrected before commit, no scope creep)
**Impact on plan:** Neither changes the register's claim coverage, the check scripts' contracts, or the file list the plan specifies. Both keep the inherited register's promise ("carry every inherited entry unchanged") intact while still satisfying every D-18 addition and every acceptance-criteria grep.

## Known Stubs

None. `lib/copy/governed.ts`, `scripts/check-governed.mjs` and `scripts/claims-audit.mjs` each implement their full asserted contract; no placeholder values or unwired data paths were introduced. `PLATFORM_413` is deliberately unrendered in Phase 1 per the plan's own scope ("Not rendered in Phase 1") — not a stub, a scheduled Phase 3+ consumer.

## Threat Flags

None. All new surface (the governed-sentence module and its two gates) is exactly what the plan's `<threat_model>` names — T-1-03, T-1-06, T-1-13, T-1-04 are the mitigations implemented, not new surface.

## Issues Encountered

- Beyond the two auto-fixed deviations above, none. `npx tsc --noEmit` and `npx eslint .` were clean on the first run for both new script files and the new copy module.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/copy/governed.ts`'s `GOVERNED` and `PLATFORM_413` exports are ready for `components/shell/Ribbon.tsx` and `components/limits/Limits.tsx` (plan 01-05) to import and render — never restate — per the interface contract this plan's frontmatter locks
- `scripts/check-governed.mjs` and `scripts/claims-audit.mjs` are ready for `scripts/verify.mjs` (a later plan) to wire into the single build gate; both already exit 0 against the real repository and non-zero on every fixture violation this plan tests
- No blockers carried forward

## Self-Check: PASSED

All 5 created files confirmed present on disk (`lib/copy/governed.ts`, `scripts/check-governed.mjs`, `scripts/check-governed.test.mjs`, `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs`). All 3 task commit hashes (`6c2e6e4`, `311dae3`, `01e5c93`) confirmed present in `git log --oneline --all`. Full suite `npm test` reports `tests 87 / pass 87 / fail 0`; `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `npx tsc --noEmit` and `npx eslint .` all exit 0.

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
