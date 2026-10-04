---
phase: 04-shell-gate-orders-clock-online
plan: 06
subsystem: testing
tags: [build-rule, source-sweep, design-primitives, single-owner-declaration, closed-set, verify-gate, fixture-proof]

# Dependency graph
requires:
  - phase: 04-02
    provides: "`already_open` in `ConflictCode`, `CONFLICT_CODES` and `CONFLICT_COPY`, and `FR48A_DISPOSITION` as a plain-string export outside `GOVERNED` — the two facts D3 and D1 assert"
  - phase: 04-05
    provides: "the four primitive modules (`RecordControl`, `SecondaryControl`, `Row`, `StateMark`) whose single ownership A1, A2, A4, A8 and A15 assert"
  - phase: 03-server-seam
    provides: "`scripts/verify.mjs`'s STEPS list with `check-non-bypassability` immediately before `next-build`, and `scripts/lib/fixtures.mjs`'s `withFixture` / `runCheck`"
provides:
  - "`scripts/check-primitives.mjs` — invariants A1-A10, A12-A17, D1 and D3 of 04-UI-SPEC's D-07 list as one source sweep in check-governed.mjs's report shape"
  - "`scripts/check-primitives.test.mjs` — the real-repository-exits-0 proof, a clean BASE fixture, one fixture per violation class and six self-invalidation guards"
  - "`check-primitives` as the 27th `verify` step, after `check-non-bypassability` and before `next-build`, not `vercelExcluded`"
affects: [04-07, 04-08, 04-09, 04-10, 04-11, 04-12, phase-05, phase-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Block-comment spans blanked to newlines before the line-comment filter, so a JSX or CSS comment's prose continuation lines are never read as code and defect line numbers stay the source's own"
    - "CSS assertions run over parsed declarations (selector, property, value, line), so a rule names the property it forbids rather than sweeping a word"
    - "Token names matched whole with a trailing `(?![\\w-])`, so `--cobalt-glow` never matches `--cobalt-glow-ink` and `--record-fill` never matches `--record-fill-armed`"
    - "Fixture tests start from a BASE tree that satisfies every presence assertion, so each violation fixture adds exactly one defect"

key-files:
  created:
    - scripts/check-primitives.mjs
    - scripts/check-primitives.test.mjs
  modified:
    - scripts/verify.mjs
    - scripts/verify.test.mjs

key-decisions:
  - "A4 identifies a state-mark shape by class name (a `hollow-`/`half-`/`filled-` prefix, or `square`/`diamond` in the name); the owner's shape classes must equal the seven in source order, and any shape class in another module fails"
  - "A1, A3, A4 and A15 assert their owner's presence as well as everyone else's absence, so a parse that silently found nothing fails rather than passes"
  - "A16's module-state half reads brace depth zero of a comment-blanked .tsx, ignoring strings, because an apostrophe in JSX text would derail a string-aware scanner"
  - "PHASE_3_SOURCE_RULES in verify.test.mjs was deliberately not extended — it names Phase 3's six rules; check-primitives gets its own placement test"

patterns-established:
  - "A sweep that strips comments must blank block spans first; check-actor-field.mjs's line filter alone misreads continuation lines"
  - "Every allowlist is a named constant with its reason and the note that a new entry is an architectural change"

requirements-completed: [REQ-NFR-2, REQ-NFR-4, REQ-NFR-4a, REQ-NFR-6, REQ-FR-48a]

# Metrics
duration: 18min
completed: 2026-10-04
---

# Phase 4 Plan 06: The Primitives Check Summary

**Eighteen D-07 invariants (A1-A10, A12-A17, D1, D3) are now one source sweep that fails the build on each violation class and on none of the repository's correct code, and it runs as the 27th `verify` step on Vercel's build as well as in the GitHub job.**

## Performance

- **Duration:** about 18 min
- **Started:** 2026-10-04T20:11:21Z
- **Completed:** 2026-10-04T20:28:51Z
- **Tasks:** 3 of 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `node scripts/check-primitives.mjs` prints `Problems: 0` against the real repository, including after wave 4's in-flight screens (`components/gate/`, `components/orders/`, `components/time/`) landed, and exits 1 naming the file, line, offending text and invariant id on every injected violation.
- `node --test scripts/check-primitives.test.mjs` passes 31 of 31: the real-repository test first, a clean BASE fixture, 23 violation fixtures and six self-invalidation guards.
- `STEPS` has 27 entries; `resolveSteps` keeps 25 under `VERCEL=1` and 27 otherwise; `check-primitives` sits after `check-non-bypassability`, before `next-build`, and is not `vercelExcluded`.
- `node --test scripts/verify.test.mjs` passes 33 of 33, and `node --test "scripts/**/*.test.mjs"` passes 339 of 339.

## Task Commits

1. **Task 1: the CSS-scope assertions A1-A9, A13 and A14** - `85c3ae9` (feat)
2. **Task 2: the tsx-scope assertions A10, A12, A15, A16, A17 and the D1, D3 copy assertions** - `41decc4` (feat)
3. **Task 3: the fixture proof, the STEPS entry and the step-list reconciliation** - `afbb2f9` (test)

## Files Created/Modified

- `scripts/check-primitives.mjs` (918 lines) - the sweep. Header enumerates every assertion by number, states that A11 (moved to C8) and B2 (owned by check-tokens.mjs) are deliberately absent, and carries a WHAT IT CANNOT CATCH paragraph.
- `scripts/check-primitives.test.mjs` (385 lines) - the D-23 fixture proof.
- `scripts/verify.mjs` - one new STEPS entry with a block comment in the file's voice.
- `scripts/verify.test.mjs` - `check-primitives` inserted into `EXPECTED_ORDER`; `twenty-six` became `twenty-seven` at the header, the order test's name and the VERCEL-unset test's name; `kept.length, 24` became 25; the three `kept.length, 26` became 27; one new placement test.

## Acceptance Grep Results (run literally)

- `grep -c "process.exit(1)" scripts/check-primitives.mjs` = 1
- `grep -c "already_open" scripts/check-primitives.mjs` = 10 (at least 1 required)
- `grep -c "FR48A_DISPOSITION" scripts/check-primitives.mjs` = 8 (at least 1 required)
- `grep -c "decorative-exemptions" scripts/check-primitives.mjs` = 0
- `grep -c "aria-hidden" scripts/check-primitives.mjs` = 0
- `grep -c "WHAT IT CANNOT CATCH" scripts/check-primitives.mjs` = 1
- `grep -c "twenty-six" scripts/verify.test.mjs` = 0; `grep -n "26" scripts/verify.test.mjs` returns no lines; no `kept.length, 24` or `kept.length, 26` survives.

## Decisions Made

- **A3** requires `app/globals.css` to hold exactly one rule whose selector contains `:focus`, that it is `:focus-visible`, and that it declares both `outline` and `outline-offset` and nothing else. `outline` elsewhere inside `globals.css` is not swept, matching the plan's wording ("appear only in `app/globals.css`").
- **A1** sweeps `width`, `height` and their `min-`/`max-` forms; **A2** sweeps `min-height`/`min-width` only, as written.
- **A8** sweeps `transition` and every `transition-*` longhand.
- **A15** accepts the feature test in either quote style (`"vibrate"` or `'vibrate'`).
- **A17** also flags a namespace import of `lib/client/navigate` in a file that accesses `.parseSurface` or `.parseId`; a dynamic `import()` is listed as a blind spot.
- **D1** reports three distinct defects: the export is absent; it is not a plain string (named as a triple when `before`, `strong` and `after` keys are all present); or `FR48A_DISPOSITION` is named inside, or declared inside, `GOVERNED`'s object literal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's comment filter misreads this repository's block comments**
- **Found during:** Task 1 (measured by the orchestrator before execution, confirmed here)
- **Issue:** The plan says to strip comments with check-actor-field.mjs's `^\s*(//|\*|/\*)` line filter, which only catches lines that start with a comment marker. Three real files have block comments whose continuation lines start with prose: `components/shell/Ribbon.tsx:22-24` (a JSX comment whose line 23 begins `router.push.`), `components/controls/RecordControl.module.css:1-6` (`130px` on line 4 and `transition` on line 5) and `components/controls/RecordControl.tsx:44-49` (`navigator.vibrate` and `"vibrate" in navigator`).
- **Fix:** `stripComments` first replaces every block-comment span with the same number of newlines, so line numbers survive, then applies the line filter. A comment marker in the middle of a line is left alone because it may be a URL in a string. The header's WHAT IT CANNOT CATCH paragraph records the consequence of doing this with a regex: a string literal containing the two characters that open a block comment swallows the code after it.
- **Proof:** a scratch copy of the sweep with the span blanking removed reports `components/shell/Ribbon.tsx:23 uses router.push` against the real tree; the shipped sweep reports `Problems: 0`. The fixture test "router.push on an unstarred continuation line of a JSX block comment exits 0" is the permanent form.
- **Files modified:** scripts/check-primitives.mjs, scripts/check-primitives.test.mjs
- **Commits:** `85c3ae9`, `afbb2f9`

### Orchestrator-directed changes

**2. The full `node scripts/verify.mjs` run was not performed.** Midway through Task 2 the orchestrator reported that wave 4 is running in parallel and that `next build` / `tsc` over half-written files would fail for reasons unrelated to this plan; it directed that the full gate be skipped and run by the orchestrator after wave 4. So there is no `scripts/.check/04-06-verify.log`, and Task 3's last acceptance criterion (the verify run exits 0) is **unverified by this plan**. Every other criterion was run, including the three `node -e` STEPS checks and `node --test "scripts/**/*.test.mjs"`.

**3. Commits used explicit pathspecs** (`git commit -- <paths>`) because the git index was shared with three other agents. `git show --stat` confirms each 04-06 commit contains only its own files.

### Scope notes

- **Extra fixtures beyond the plan's list.** The plan asks for one test per violation class and lists 19. The sweep also enforces four classes the list omits, so each got a fixture: a `box-shadow` inside `globals.css`'s `:focus-visible` block (A3), a ribbon `max-height` other than `none` (A7), a second `transition` (A8), and `--viewer-border` on a non-border property (A13). Two guards were added beyond the four the plan requires: the Ribbon.tsx shape (asked for by the orchestrator) and `color: var(--cobalt-glow-ink)`, the real `Ribbon.module.css:52` shape, which proves token names are matched whole.
- **`PHASE_3_SOURCE_RULES` (`verify.test.mjs:165-172`) not extended.** `git grep` for `check-non-bypassability` and `next-build` outside `.planning` found this second list of step ids. It names Phase 3's six rules, so adding a Phase 4 step would mislabel it; the new placement test covers `check-primitives` instead. `docs/analysis/server-seam-verification.md`'s historical step counts were left unchanged as instructed.

## Issues Encountered

- **The Bash tool collapses `\\` to `\`, even inside a quoted heredoc.** Two RegExps built from template literals in Task 1 lost their escapes (`\s` became a literal `s`), so A5 silently matched nothing. The plan's own temporary `position: fixed` proof caught it before the commit. Both were rewritten as regex literals, after which the proof exits 1 naming `components/limits/Limits.module.css:21`. The temporary edit was reverted with `git checkout -- components/limits/Limits.module.css`.
- **Two transient tool failures on this OneDrive path:** one `npx eslint` crashed with `UNKNOWN: unknown error, open ...node_modules/.../semver/functions/inc.js`, and one run of the scripts glob failed its `npx eslint . exits 0` test while other agents were writing files. Both passed on immediate re-run (`npx eslint .` exits 0 with four pre-existing warnings in `lib/reconcile/*.test.mjs` and `scripts/check-actor-field.mjs`; the glob passed 339 of 339).

## Known Stubs

None. The plan creates build scripts only.

## Next Phase Readiness

- Every remaining Phase 4 screen plan is gated by this sweep as it is written. A screen module that declares `min-height: 44px`, a focus rule, a mark class, a raw colour, a `transition`, or a fixed or sticky position fails `verify`.
- Phase 9 raises A5 from zero to exactly one by adding a file allowlist that names the referral bar's module; the defect message says so.
- Phase 5 may generalise A1 and A4 when `accept` and `reject` are instantiated. D-07's recorded risk expects that.

## Self-Check: PASSED

- FOUND: scripts/check-primitives.mjs
- FOUND: scripts/check-primitives.test.mjs
- FOUND: commit 85c3ae9
- FOUND: commit 41decc4
- FOUND: commit afbb2f9
