---
phase: 01-scaffold-conventions
plan: 06
subsystem: testing
tags: [wcag, axe-core, playwright, contrast, accessibility, next-metadata]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "01-01's scripts/lib/harness.mjs and scripts/lib/fixtures.mjs; 01-03's app/styles/tokens.inherited.css, app/styles/tokens.capture.css and docs/design/decorative-exemptions.json; 01-05's rendered Ribbon, shell and Limits surfaces"
provides:
  - "scripts/check-contrast.mjs + scripts/check-contrast.pairs.json + scripts/check-contrast.test.mjs — WCAG relative-luminance contrast computed from the resolved token values, gated at 7:1 text / 3:1 non-text, with the four-entry decorative-exemption register as the only exception source"
  - "scripts/check-wcag.mjs — axe-core A/AA scan against the production build on `/` and `/?s=limits` at the pinned 390x844 mobile profile, plus a direct assertion of the ribbon's REQ-FR-48 contract and a startup guard against a lost wcag22aa tag"
affects: [01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A generic check-script parses a stylesheet's first :root block into a flat token map with brace-depth matching (not a full CSS parser), then merges two layers with the later map's keys winning — reusable anywhere a later phase needs the resolved cascade, not the source declarations"
    - "check-wcag.mjs asserts the ribbon's undismissable/static/uncapped contract directly against computed styles and the accessibility tree, rather than relying on an axe rule to catch it — axe has no rule for 'this landmark must never grow a dismiss control'"
    - "A short axe self-test (deliberately inaccessible inline page, no build, no server) is the per-task feedback command; the full build-and-scan pipeline runs at wave close and again as verify.mjs's own step, never as the fast per-commit signal"

key-files:
  created:
    - scripts/check-contrast.mjs
    - scripts/check-contrast.pairs.json
    - scripts/check-contrast.test.mjs
    - scripts/check-wcag.mjs
  modified:
    - app/layout.tsx

key-decisions:
  - "check-contrast.mjs follows a single level of var(--other) indirection and composites an rgba() ink over its pair's opaque ground before computing luminance, exactly reproducing the exemption register's --viewer-border measurement (rgba(96, 165, 250, 0.16) over --navy-deep resolves to #193455)"
  - "A below-floor pair passes only when an exemption entry matches on ink AND ground AND its measured_ratio agrees with the computed ratio to two decimal places (string comparison via toFixed(2), not float equality) — disagreement is a defect, not a warning"
  - "check-wcag.mjs derives CAPTURE_BUILD_ID from git rev-parse --short HEAD only in the spawned child's environment, and only when none of the three env vars next.config.ts checks are already set, so the parent shell's environment is never touched"
  - "The server (next start on port 4311) is always torn down in a finally, using taskkill /pid <pid> /T /F on win32 so the whole process tree dies, never a bare process.kill on that platform"

requirements-completed: [REQ-FR-48, REQ-FR-65, REQ-NFR-5, REQ-NFR-9]

# Metrics
duration: 19min
completed: 2026-09-07
---

# Phase 1 Plan 6: Accessibility gates — contrast and WCAG A/AA Summary

**Two build gates computed from real inputs rather than asserted by inspection: `scripts/check-contrast.mjs` derives WCAG contrast ratios from the resolved token cascade (7.98, 14.36, 8.62, 6.59, 4.07, 1.33 for the six Phase 1 pairs), and `scripts/check-wcag.mjs` runs axe-core against the actual production build on both surfaces at 390x844, catching and fixing a real missing-`<title>` defect on first run.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-09-07T21:20:00+02:00 (immediately after 01-05's commit)
- **Completed:** 2026-09-07T21:39:16+02:00
- **Tasks:** 2
- **Files modified:** 4 created (`scripts/check-contrast.mjs`, `scripts/check-contrast.pairs.json`, `scripts/check-contrast.test.mjs`, `scripts/check-wcag.mjs`), 1 modified (`app/layout.tsx`)

## Accomplishments

- `scripts/check-contrast.pairs.json` lists the six Phase 1 ink-on-ground pairs from 01-UI-SPEC.md's manifest, three `text` and three `non-text`.
- `scripts/check-contrast.mjs` parses `app/styles/tokens.inherited.css` then `app/styles/tokens.capture.css` into one merged token map (later file wins), resolves each pair with a single level of `var()` indirection, composites any `rgba()` ink over its ground, and computes the W3C relative-luminance ratio verbatim from Technique G18. Against the real repository it prints exactly the six expected ratios (7.98, 14.36, 8.62, 6.59, 4.07, 1.33:1) and exits 0 — the sixth, `--viewer-border` at 1.33:1, passes only because it is named in `docs/design/decorative-exemptions.json` with an agreeing measured ratio.
- `scripts/check-contrast.test.mjs` proves: the real repository's six ratios; a below-floor `--viewer-ink-dim` override with no exemption fails; an added text pair with no exemption entry fails; an exemption register that omits the `--viewer-border` entry fails; an exemption entry whose `measured_ratio` disagrees with the computed value fails; and the raw formula gets `#ffffff` on `#000000` = 21.00 and a colour against itself = 1.00.
- `scripts/check-wcag.mjs` asserts `axe.getRules(["wcag22aa"]).length >= 1` at startup (RESEARCH.md Open Question 1's resolution), then in its default mode builds the production bundle, starts it on port 4311, scans `/` and `/?s=limits` with `AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"])`, and separately asserts the ribbon's REQ-FR-48 contract (exactly one `section[aria-label="Preview disclosure"]`, never `aria-hidden`, `position: static`, `max-height: none`, a >=44px link named exactly "Read the full preview limits", no button-shaped control, no dismiss/close/hide-named element) — tearing the server down in a `finally` with `taskkill /pid <pid> /T /F` on Windows. `--self-test` skips the build and server, runs the same tag guard and scan against a deliberately inaccessible inline page (no `lang`, no `alt`), and completed in ~2.7s reporting 2 violations.
- The first real run of the full scan found a genuine defect — `document-title` (WCAG 2.4.2, Level A) failing on both surfaces because `app/layout.tsx` exported no metadata — fixed per Rule 2 below. The second run is clean: `Problems: 0` on both surfaces.
- Full suite: `node --test scripts/**/*.test.mjs` reports 93/93 passing (up from 87 after Task 1's six new tests); `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `node scripts/check-tokens.mjs`, `node scripts/check-structure.mjs`, `npx eslint .` and `npx tsc --noEmit` all exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the contrast check, its pairs manifest and its fixture test** — `e0e7a8b` (feat)
2. **Task 2: Write the WCAG A/AA check** — `98d1a8b` (feat, includes the Rule 2 `app/layout.tsx` fix)

**Plan metadata:** (this commit, following)

## Files Created/Modified

- `scripts/check-contrast.mjs` — W3C relative-luminance contrast computation over the resolved token cascade, gated at 7:1/3:1 with the decorative-exemption register as the only exception source
- `scripts/check-contrast.pairs.json` — the six Phase 1 ink-on-ground pairs manifest
- `scripts/check-contrast.test.mjs` — six fixture/unit tests proving the real repository's ratios and four distinct below-floor failure modes
- `scripts/check-wcag.mjs` — the axe A/AA scan, the startup tag guard, and the ribbon's REQ-FR-48 assertions, with `--self-test` as its additive smoke mode
- `app/layout.tsx` — added `export const metadata: Metadata = { title: "NOVATEK Capture" }` (Rule 2 fix, see Deviations)

## Decisions Made

- The four `key-decisions` above (var() indirection depth, exemption-match rule, CAPTURE_BUILD_ID scoping, server-teardown mechanism) are the load-bearing implementation choices this plan made beyond what the plan text specified verbatim.
- `document.title` reuses the already-locked shell heading string ("NOVATEK Capture") rather than authoring new copy — it is HTML document metadata, not one of the eight governed sentences, so it does not route through `lib/copy/governed.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added a document `<title>` to `app/layout.tsx`**
- **Found during:** Task 2, the first real run of `node scripts/check-wcag.mjs` (the full scan, not `--self-test`) against the actual production build
- **Issue:** `app/layout.tsx` (written in plan 01-05) exported no `metadata`, so neither `/` nor `/?s=limits` rendered a `<title>` element. axe's `document-title` rule (WCAG 2.4.2 Page Titled, Level A, inside the `wcag2a` tag this check scans) correctly failed on both surfaces with impact `serious`. This is a real accessibility defect the check is supposed to catch, not a false positive.
- **Fix:** Added `import type { Metadata, Viewport } from "next"` and `export const metadata: Metadata = { title: "NOVATEK Capture" }` to `app/layout.tsx`, reusing the name already locked as the shell `<h1>` (01-UI-SPEC.md §Copywriting Contract) rather than inventing new copy.
- **Files modified:** `app/layout.tsx`
- **Verification:** Re-ran `node scripts/check-wcag.mjs` (full scan): `Problems: 0` on both surfaces. `npx tsc --noEmit`, `npx eslint .`, and the full `node --test scripts/**/*.test.mjs` (93/93) all still exit 0 afterward.
- **Committed in:** `98d1a8b` (part of Task 2's commit, since the defect was found and fixed before that commit was made)

**2. [Rule 1 - Bug] Reworded a self-tripping comment before running the acceptance-criteria grep**
- **Found during:** Task 2, before committing, running the acceptance-criteria grep for the forbidden literal `wcag22a"` (with trailing quote) against `scripts/check-wcag.mjs`
- **Issue:** The header comment originally read `no "wcag22a" tag exists at all` — a literal quoted `wcag22a"` inside an explanatory comment, which would fail the acceptance criterion "does NOT contain `wcag22a\"`" under a literal grep, even though the comment was correctly describing the resolved Open Question and no functional tag array was wrong.
- **Fix:** Reworded to `no plain wcag22a (single trailing a) tag exists at all`, removing the trailing-quote substring while preserving the same meaning.
- **Files modified:** `scripts/check-wcag.mjs`
- **Verification:** `grep -n 'wcag22a"' scripts/check-wcag.mjs` returns no match; the functional `TAGS` array still contains only `"wcag22aa"` (never `"wcag22a"`).
- **Committed in:** `98d1a8b` (caught before the task commit, no separate fix commit needed)

---

**Total deviations:** 2 auto-fixed (1 Rule 2 — a genuine missing accessibility requirement the check itself surfaced; 1 Rule 1 — a self-tripping comment, no functional change)
**Impact on plan:** The Rule 2 fix is exactly the kind of defect this plan's gate exists to catch and is the only change to a file outside this plan's own file list; it does not touch the Ribbon, the Limits surface, or any governed sentence. No scope creep.

## Known Stubs

None. Both scripts implement their full contract: `check-contrast.mjs` computes every declared pair from the real token cascade with no bypass flag; `check-wcag.mjs` runs the real axe scan against the real production build in its default mode, with `--self-test` as a strictly additive smoke mode that never substitutes for the full scan (enforced by the plan's own wording and confirmed by both modes passing independently in this run).

## Threat Flags

None. The two scripts implement exactly the mitigations the plan's `<threat_model>` names for T-1-07, T-1-14, T-1-16, T-1-04 and T-1-17 (contrast floors with the exemption register as sole exception path, the ribbon's direct-assertion contract, the `wcag22aa` startup guard, `--self-test` as additive-only, and the `finally`-scoped server teardown with a fixed port and 60s budget) — no new network surface, auth path, or schema was introduced.

## Issues Encountered

Beyond the two auto-fixed deviations above, none. Both `next build` and `next start` succeeded on the first attempt once `CAPTURE_BUILD_ID` was resolved into the child environment; the pinned port (4311) was free on this machine; no server process was left listening after either run (confirmed via `netstat -ano` showing only `TIME_WAIT` entries and `tasklist` showing no lingering `node.exe`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both accessibility gates (`check-contrast.mjs`, `check-wcag.mjs`) are real, run against the actual repository, and are ready for `scripts/verify.mjs` (plan 01-07) to wire in as ordered steps — `check-wcag.mjs --self-test` for the fast per-commit signal, `check-wcag.mjs` (full) excluded only on Vercel's own `VERCEL` system variable
- `docs/design/decorative-exemptions.json`'s four entries are now load-bearing for two independent checks (`check-tokens.mjs`'s shape assertion and `check-contrast.mjs`'s exception-matching) — any future edit to that file must keep both green
- No blockers carried forward

## Self-Check: PASSED

All 4 created files confirmed present on disk (`scripts/check-contrast.mjs`, `scripts/check-contrast.pairs.json`, `scripts/check-contrast.test.mjs`, `scripts/check-wcag.mjs`); `app/layout.tsx` confirmed modified. Both commit hashes (`e0e7a8b`, `98d1a8b`) confirmed present in `git log --oneline --all`. `node scripts/check-contrast.mjs` exits 0 with ratios 7.98/14.36/8.62/6.59/4.07/1.33; `node scripts/check-wcag.mjs --self-test` exits 0 in ~2.7s; `node scripts/check-wcag.mjs` (full scan) exits 0 with zero A/AA violations on both surfaces; `node --test scripts/**/*.test.mjs` reports 93/93 passing; `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `node scripts/check-tokens.mjs`, `node scripts/check-structure.mjs`, `npx eslint .` and `npx tsc --noEmit` all exit 0.

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
