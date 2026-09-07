---
phase: 01-scaffold-conventions
plan: 05
subsystem: ui
tags: [next-app-router, cache-components, server-components, honesty-surface, css-modules]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "01-01's next.config.ts (cacheComponents: true, build-id gate), 01-03's token layers and type roles, 01-04's lib/copy/governed.ts"
provides:
  - "components/shell/Ribbon.tsx + Ribbon.module.css — the permanent preview-disclosure landmark, rendered on every route"
  - "app/layout.tsx — font wiring into the inherited alias chain, viewport, <Ribbon /> above {children}"
  - "app/page.tsx — the statically prerendered shell with the searchParams reader behind Suspense (Partial Prerender), branching to the shell or the Limits surface"
  - "components/limits/Limits.tsx + Limits.module.css — the minimal Limits surface rendering all eight governed sentences plus the English-only limitation"
affects: [01-06, 01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global type-role class composed with a CSS Module class on the same element (e.g. className={`label ${styles.sentence}`}) rather than redefining the type role inside the module — keeps globals.css the single owner of family/size/weight/line-height/tracking"
    - "A link's ::after hit-area extension is positioned against an ancestor wrapper (position: relative on the wrapper, not the link and never the landmark section), so the landmark itself stays position: static as its contract requires"
    - "Object.entries(GOVERNED) render order is the module's own declaration order — no separate key-order array needed to satisfy the locked key order"

key-files:
  created:
    - components/shell/Ribbon.tsx
    - components/shell/Ribbon.module.css
    - app/layout.tsx
    - app/page.tsx
    - components/limits/Limits.tsx
    - components/limits/Limits.module.css
  modified: []

key-decisions:
  - "Fonts load into --font-syne/--font-dm-sans/--font-jetbrains (the sibling's variable names, not --font-display/--font-body/--font-mono directly), because app/styles/tokens.inherited.css already aliases those names into the three type-role variables (D-12, D-14) — matches the plan's explicit resolution of 01-PATTERNS.md's naming-deviation flag"
  - "The ribbon link's ::after hit-area is positioned against the text column (position: relative), never the section or the link itself, so the section computes to position: static as the Ribbon Contract and plan 01-06's WCAG check require"

requirements-completed: [REQ-FR-47, REQ-FR-48, REQ-NFR-9]

# Metrics
duration: 18min
completed: 2026-09-07
---

# Phase 1 Plan 5: Render the shell and the Limits surface Summary

**The ribbon (a permanent, non-dismissable preview-disclosure landmark rendered on every route from `app/layout.tsx`), the statically prerendered shell at `/` with a Partial-Prerender `searchParams` island, and the minimal Limits surface at `/?s=limits` rendering all eight governed sentences plus the English-only limitation — all copy sourced from `lib/copy/governed.ts`, never restated as a literal.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-07T21:02:00+02:00 (immediately after 01-04's commit)
- **Completed:** 2026-09-07T21:20:00+02:00
- **Tasks:** 3
- **Files modified:** 6 created (`components/shell/Ribbon.tsx`, `components/shell/Ribbon.module.css`, `app/layout.tsx`, `app/page.tsx`, `components/limits/Limits.tsx`, `components/limits/Limits.module.css`)

## Accomplishments

- `components/shell/Ribbon.tsx` is a Server Component rendering `GOVERNED.preview` inside a named `<section aria-label="Preview disclosure">`, with a decorative `aria-hidden` dot and a plain anchor to `/?s=limits` whose visible label is its accessible name. `components/shell/Ribbon.module.css` implements the exact 01-UI-SPEC.md Ribbon Contract values: `position: static`, `max-height: none`, the 44px `min-height`, the 5px dot, sentence-case text with the `<strong>` promoted to `--viewer-ink`, the uppercase link, and the `::after` hit-area extension positioned against the text column so the section itself never becomes positioned.
- `app/layout.tsx` loads Syne 600 / DM Sans 400 / JetBrains Mono 500 into `--font-syne`/`--font-dm-sans`/`--font-jetbrains` — the exact variable names `app/styles/tokens.inherited.css` already aliases to `--font-display`/`--font-body`/`--font-mono` — sets `viewport.themeColor`/`viewportFit`, and renders `<Ribbon />` immediately before `{children}` so every route carries the disclosure by construction.
- `app/page.tsx` follows RESEARCH.md Pattern 1: a non-async `Page` wraps an async `Screen` that awaits `searchParams` behind `<Suspense fallback={null}>`. `s === "limits"` renders `Limits`; otherwise a `<main aria-labelledby="screen-title">` with one `<h1 id="screen-title" className="screen-title">NOVATEK Capture</h1>` and nothing else. A production build confirms `/` renders as a Partial Prerender (◐) — statically prerendered shell with the streamed dynamic island, per D-11.
- `components/limits/Limits.tsx` owns its own labelled `<main>` and maps `Object.entries(GOVERNED)` — the module's own declaration order — to render all eight governed sentences in full, each with its load-bearing clause in `<strong>`, followed by the English-only limitation sentence verbatim, marked `[written here]` per D-19.
- A production build (`next build` with `CAPTURE_BUILD_ID` set to the current short SHA) and a `next start` smoke test both confirm: `/` renders the ribbon, the heading and `NOVATEK Capture`; `/?s=limits` renders `Preview limits`, `Designed preview.` (the first governed sentence's bolded clause) and the English-only sentence.
- `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `node scripts/check-tokens.mjs`, `node scripts/check-structure.mjs`, `npx tsc --noEmit` and `npx eslint .` all exit 0; full suite `npm test` passes 87/87.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the ribbon** — `892e58d` (feat)
   - Follow-up fix (found during Task 2's repo-wide eslint run): `5acd5e5` (fix)
2. **Task 2: Write the root layout and the shell route** — `6950239` (feat)
3. **Task 3: Write the minimal Limits surface** — `c20413c` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified

- `components/shell/Ribbon.tsx` — the preview disclosure landmark, rendering `GOVERNED.preview`
- `components/shell/Ribbon.module.css` — the exact Ribbon Contract styling (static position, no max-height, the dot, the hit-area extension)
- `app/layout.tsx` — font wiring into the inherited alias chain, viewport, `<Ribbon />` above `{children}`
- `app/page.tsx` — the statically prerendered shell with the `searchParams` reader behind `Suspense`
- `components/limits/Limits.tsx` — all eight governed sentences plus the English-only limitation
- `components/limits/Limits.module.css` — heading/list spacing only, no cards or panels

## Decisions Made

- Fonts load directly into the sibling's `--font-syne`/`--font-dm-sans`/`--font-jetbrains` variable names rather than `--font-display`/`--font-body`/`--font-mono`, per the plan's explicit resolution of the alias-chain question left open in 01-PATTERNS.md
- The ribbon link's `::after` hit-area is positioned relative to the text column, not the link or the section, so the section's own `position: static` (load-bearing per the WCAG check in plan 01-06) is never disturbed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Suppressed the `@next/next/no-html-link-for-pages` lint error on the D-11 locked plain anchor**
- **Found during:** Task 2, running `npx eslint .` across the whole repository per guardrail 10 after all three tasks' files existed
- **Issue:** The ribbon's `<a href="/?s=limits">` (written correctly per D-11/the Ribbon Contract, which locks a plain anchor with no `<Link>` and no `router.push` in this phase) trips `eslint-config-next`'s `no-html-link-for-pages` rule, which assumes every internal link should use `next/link`. Switching to `next/link` would violate the plan's explicit, cited lock.
- **Fix:** Added `// eslint-disable-next-line @next/next/no-html-link-for-pages` immediately above the anchor, with a comment citing D-11 and the Phase 4 replacement plan.
- **Files modified:** `components/shell/Ribbon.tsx`
- **Verification:** `npx eslint .` exits 0; `grep -c 'next/link'` and `grep -c 'router.push'` against the file both remain 0.
- **Committed in:** `5acd5e5` (a standalone fix commit, since the file was already committed by Task 1's `892e58d` before the repo-wide lint run in Task 2 surfaced the issue)

**2. [Rule 1 - Bug] Reworded two self-tripping comments before running acceptance-criteria greps**
- **Found during:** Task 1 (a comment referencing `"use client"` in prose) and Task 3 (a comment referencing `PLATFORM_413` in prose)
- **Issue:** `components/shell/Ribbon.tsx`'s original header comment explained the file has "no `use client`" — the literal substring `use client` in a comment would fail the acceptance criterion "does NOT contain `use client`" if any check or reviewer greps literally. `components/limits/Limits.tsx`'s original header comment said "Never `PLATFORM_413`" — the literal substring `PLATFORM_413` in a comment would fail the acceptance criterion "does NOT contain `PLATFORM_413`."
- **Fix:** Reworded both comments to describe the same constraint without the literal forbidden substring ("no client directive" instead of quoting `"use client"`; "the platform-refusal sentence is not rendered" instead of naming the export).
- **Files modified:** `components/shell/Ribbon.tsx`, `components/limits/Limits.tsx`
- **Verification:** `grep -c 'use client' components/shell/Ribbon.tsx` and `grep -c 'PLATFORM_413' components/limits/Limits.tsx` both return 0; all acceptance-criteria greps pass.
- **Committed in:** `892e58d` (Task 1) and `c20413c` (Task 3) — both caught before their respective task commits, so no separate fix commit was needed for this one.

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs found and corrected before or immediately after commit, no scope creep)
**Impact on plan:** Neither changes the rendered markup, the contract shapes, or the file list the plan specifies. Both keep every acceptance-criteria grep and the repo-wide lint gate green.

## Known Stubs

None. All four components/routes this plan's `must_haves` name are fully implemented per their contract: the ribbon renders on every route with no dismissal control, `/` renders one labelled `<main>` with one heading, `/?s=limits` renders all eight governed sentences in key order plus the English-only limitation, and the three fonts resolve through the inherited alias chain (confirmed by a production build and a `next start` smoke test rendering the actual bolded sentence text).

## Threat Flags

None. All new surface (the ribbon, the shell route, the Limits surface) is exactly what the plan's `<threat_model>` names — T-1-06, T-1-14, T-1-15, T-1-07 are the mitigations implemented (rendering from `GOVERNED` never a literal, the ribbon's construction-level placement and static/no-max-height/no-dismiss CSS, `searchParams.s` read only for a two-way branch and never interpolated, and token/type-role-only colours and sizes), not new surface.

## Issues Encountered

Beyond the two auto-fixed deviations above, none. `npx tsc --noEmit` was clean on first run for every new file; a full production build (`next build`) and a `next start` smoke test both succeeded on the first attempt, confirming `/` renders as a Partial Prerender and both surfaces render their expected copy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The ribbon, the shell route and the Limits surface are all in place and gated by `check-governed.mjs`, `claims-audit.mjs`, `check-tokens.mjs` and `check-structure.mjs`, all exiting 0 against the real repository
- Plan 01-06's WCAG/contrast check can now run against real, rendered HTML for both `/` and `/?s=limits` — the ribbon's `position: static`/`max-height: none` contract and the 44px link target are ready to be asserted by that check
- No blockers carried forward

## Self-Check: PASSED

All 6 created files confirmed present on disk (`components/shell/Ribbon.tsx`, `components/shell/Ribbon.module.css`, `app/layout.tsx`, `app/page.tsx`, `components/limits/Limits.tsx`, `components/limits/Limits.module.css`). All 4 commit hashes (`892e58d`, `5acd5e5`, `6950239`, `c20413c`) confirmed present in `git log --oneline --all`. `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `node scripts/check-tokens.mjs`, `node scripts/check-structure.mjs`, `npx tsc --noEmit` and `npx eslint .` all exit 0; full suite `npm test` reports `tests 87 / pass 87 / fail 0`.

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
