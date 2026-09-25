---
phase: 04-shell-gate-orders-clock-online
plan: 01
subsystem: ui
tags: [css-custom-properties, design-tokens, wcag, contrast, build-checks]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "app/styles/tokens.capture.css as the single layer-2 declaration site, scripts/check-tokens.mjs's bidirectional D13_MANIFEST closed list, scripts/check-contrast.mjs's ratio computation from resolved token values, and docs/design/decorative-exemptions.json's four-entry register"
provides:
  - "--tint-warn-head: #2D383C in tokens.capture.css — the resolved hex of 0.10 alpha --dk-warn over --panel-solid, declared resolved so the conflict card's tinted head carries one value over every ground"
  - "--dur-press: 90ms in tokens.capture.css under a new timing group banner — the record control's press transition, inside NFR-4's 100 ms completion budget"
  - "both names in scripts/check-tokens.mjs's D13_MANIFEST (authored tokens 5 -> 6, new timing group at 1), landed in the same commit as the declarations"
  - "fifteen new rows in scripts/check-contrast.pairs.json — 21 total, all computed clean, covering the --panel-solid column for the first time plus the clock control, the 44 px secondary control and both inks the new --tint-warn-head ground carries"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 05, 06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A token and its D13_MANIFEST entry land in one commit, because check-tokens.mjs is a closed list in both directions: an undeclared manifest name fails, and an unlisted declaration fails"
    - "A new token group gets a /* ---- name ---- */ banner in tokens.capture.css and a matching // name (count) comment in D13_MANIFEST, with the per-group count kept current"
    - "A tint over a known ground is declared as its resolved hex, not as an alpha, so it cannot drift with what is behind it — the precedent --control-border set"
    - "One ink/ground pair is one row however many elements render it; a second renderer extends the existing row's note rather than duplicating the row"

key-files:
  created: []
  modified:
    - app/styles/tokens.capture.css
    - scripts/check-tokens.mjs
    - scripts/check-contrast.pairs.json

key-decisions:
  - "--tint-warn-head was placed at the end of the layer-2 authored-tokens group, immediately after --surface-inset, so the two surface tokens sit together; its inline comment names --dk-warn as the source of the tint so the derivation stays legible"
  - "The new timing group was placed last in tokens.capture.css, after radius, and mirrored last in D13_MANIFEST — the manifest position matches the declaration position, which is what makes the closed list readable as a specification"
  - "--dk-good on --panel-solid is declared kind: \"text\" rather than non-text, taking the stricter 7:1 floor, which its computed 8.47:1 clears — the UI-SPEC marks it as both"
  - "--cobalt-glow-ink on --navy-deep was not re-declared; the existing ribbon-link row's note now names the Phase 4 section labels as its second renderer, which keeps ink/ground pairs unique"
  - "docs/design/decorative-exemptions.json was not touched. panel-tone (--panel-solid on --navy-deep) is below its 3:1 floor at a computed 1.14:1 and resolves against the existing panel-solid-tone register entry, so no fifth entry was needed and none was added"

patterns-established:
  - "Pattern 1: two tokens, one commit — the declaration and its manifest entry are a single atomic change (04-RESEARCH.md Pitfall 5)"
  - "Pattern 2: a contrast-pair row cites its spec section and the element that renders it in its note, so a later reader can tell which surface a ratio is protecting"
  - "Pattern 3: an inline token comment never places a colon directly after a token name, because check-tokens.mjs's declaration regex scans comment text as well as code and would read it as a phantom declaration outside the closed list"

requirements-completed: [REQ-NFR-4, REQ-NFR-6]

# Metrics
duration: 10min
completed: 2026-09-25
---

# Phase 4 Plan 1: Tokens and Contrast Pairs Summary

**The two tokens Phase 4 adds (`--dur-press: 90ms`, `--tint-warn-head: #2D383C`) declared with their `D13_MANIFEST` entries in one commit, and the fifteen new `check-contrast.pairs.json` rows that put every Phase 4 ink-on-ground pair under computation — twenty-one rows, all clean, the `--panel-solid` column measured for the first time.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-25T07:12:00Z (approximate — the plan's start was not timestamped before the first tool call)
- **Completed:** 2026-09-25T07:22:00Z
- **Tasks:** 2 of 2
- **Files modified:** 3

## Accomplishments

- `--tint-warn-head: #2D383C` and `--dur-press: 90ms` are each declared exactly once in `app/styles/tokens.capture.css` and named exactly once in `scripts/check-tokens.mjs`'s `D13_MANIFEST`, in a single commit. This is what `04-RESEARCH.md` Pitfall 5 requires: the manifest is a closed list in both directions, so a declaration without a manifest entry and a manifest entry without a declaration each fail the build.
- `--tint-warn-head`'s value was independently re-derived rather than copied on faith. Compositing `--dk-warn` (`#fbbf24`) at 0.10 alpha over `--panel-solid` (`#16293F`) with the same rounding `check-contrast.mjs` uses gives R 44.9 → 45 (`2D`), G 56.0 → 56 (`38`), B 60.3 → 60 (`3C`) — `#2D383C`, the hex `04-UI-SPEC.md` states.
- `scripts/check-contrast.pairs.json` now holds 21 rows. All fifteen new ratios were pre-computed before the edit and every one matched `04-UI-SPEC.md`'s stated figure to two decimal places, including the 7.22:1 the UI-SPEC computed in-document for `--dk-warn` on `--tint-warn-head`. No design figure in that table needed correcting.
- The `--panel-solid` column — the column DESIGN.md says governs conformance on the fourteen non-camera surfaces — is now computed rather than asserted, at seven inks: `--viewer-ink` (12.64:1), `--viewer-ink-dim` (7.03:1), `--cobalt-glow-ink` (7.59:1), `--control-border` (3.58:1), `--cobalt-glow` (5.80:1), `--dk-good` (8.47:1) and `--dk-warn` (8.84:1).
- The decorative-exemption register is untouched at four entries. `panel-tone` sits below its 3:1 floor at a computed 1.14:1 and resolves against the existing `panel-solid-tone` entry, whose `measured_ratio` of 1.136 rounds to the same two decimals the checker compares — so the fifth register entry that C-5 forbids was never needed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Declare `--dur-press` and `--tint-warn-head`, and add both to `D13_MANIFEST` in the same change** — `220f35e` (feat)
2. **Task 2: Add the fifteen new Phase 4 contrast pairs to the manifest** — `16fdd72` (feat)

**Plan metadata:** committed by the orchestrator with this summary.

## Files Created/Modified

- `app/styles/tokens.capture.css` — `--tint-warn-head: #2D383C` added at the end of the existing `layer-2 authored tokens` group, with an inline comment recording that it is the resolved hex of 0.10 alpha `--dk-warn` over `--panel-solid` and declared resolved for the same reason `--control-border` is. `--dur-press: 90ms` added under a new `/* ---- timing ---- */` banner placed last, after `radius`, with an inline comment recording that NFR-4 requires the transition to complete inside the 100 ms budget, not to begin at it.
- `scripts/check-tokens.mjs` — `"--tint-warn-head"` added to the authored-tokens group (its comment count updated from 5 to 6) and `"--dur-press"` added under a new `// timing (1)` group comment, each in the position its declaration occupies. No check logic was changed.
- `scripts/check-contrast.pairs.json` — fifteen rows added and the `ribbon-link` row's note extended. Each new row carries exactly `id`, `ink`, `ground`, `kind`, `note`, with the note citing `04-UI-SPEC.md §Phase 4 contrast-pairs manifest` and naming the element that renders the pair.

The fifteen new rows, with their computed ratios:

| id | ink | ground | kind | computed |
|---|---|---|---|---|
| `panel-body-ink` | `--viewer-ink` | `--panel-solid` | text | 12.64:1 |
| `panel-term-ink` | `--viewer-ink-dim` | `--panel-solid` | text | 7.03:1 |
| `panel-disclosure-heading` | `--cobalt-glow-ink` | `--panel-solid` | text | 7.59:1 |
| `panel-edge` | `--control-border` | `--panel-solid` | non-text | 3.58:1 |
| `panel-tone` | `--panel-solid` | `--navy-deep` | non-text | 1.14:1 (exempted) |
| `clock-control-label` | `--record-ink` | `--record-fill` | text | 7.75:1 |
| `clock-control-fill` | `--record-fill` | `--navy-deep` | non-text | 7.75:1 |
| `secondary-control-label` | `--viewer-ink` | `--surface-inset` | text | 15.84:1 |
| `secondary-control-border` | `--control-border` | `--surface-inset` | non-text | 4.49:1 |
| `focus-ring-on-panel` | `--cobalt-glow` | `--panel-solid` | non-text | 5.80:1 |
| `state-mark-good` | `--dk-good` | `--panel-solid` | text | 8.47:1 |
| `state-mark-warn` | `--dk-warn` | `--panel-solid` | non-text | 8.84:1 |
| `conflict-card-left-rule` | `--dk-warn` | `--navy-deep` | non-text | 10.04:1 |
| `conflict-head-name` | `--viewer-ink` | `--tint-warn-head` | text | 10.33:1 |
| `conflict-head-mark` | `--dk-warn` | `--tint-warn-head` | non-text | 7.22:1 |

## Decisions Made

- **`--tint-warn-head` sits after `--surface-inset`, not after `--dk-warn`.** Both positions are inside the authored-tokens group the plan named. Placing it beside `--surface-inset` keeps the two surface tokens adjacent, and its inline comment names `--dk-warn` explicitly so the derivation is not lost by the separation.
- **The timing group is last in the file and last in the manifest.** There was no timing group to join, and placing it after `radius` keeps the manifest's group order identical to the declaration order, which is the property that lets the closed list be read as a specification rather than as a lookup table.
- **`--dk-good` on `--panel-solid` is `kind: "text"`.** `04-UI-SPEC.md` marks the pair as text *and* non-text; the plan directs the stricter floor, and the computed 8.47:1 clears 7:1 with margin, so nothing is lost by taking it.
- **Row ids name the element, following the Phase 1 convention.** The six existing ids are element-oriented (`ribbon-sentence`, `ribbon-link-underline`), so the new ids name what renders each pair (`clock-control-label`, `conflict-head-mark`) rather than encoding the token names, which the `ink` and `ground` fields already carry.

## Deviations from Plan

None — plan executed exactly as written.

Both tasks were implemented as specified, with no auto-fixes required under deviation Rules 1–3 and no architectural questions raised under Rule 4. The plan's three prohibitions were all honoured and verified rather than assumed: `app/styles/tokens.inherited.css` is unmodified (`git diff --stat` on it prints nothing), `docs/design/decorative-exemptions.json` still parses to exactly four entries, and neither `--surface-inset` against `--navy-deep` nor against `--panel-solid` was declared as a pair.

## Issues Encountered

None that required problem-solving. Two things worth recording because they shaped how the work was done:

- **The ratios were pre-computed before any file was edited.** Committing the fifteen rows and then discovering a design figure was wrong would have meant either a broken commit or an unrecorded correction to the approved UI-SPEC. Re-deriving all fifteen ratios first, from the token hexes with `check-contrast.mjs`'s own luminance and compositing arithmetic, established that the UI-SPEC's table was exact before anything was written. It was.
- **`check-tokens.mjs`'s declaration regex, `/(--[a-zA-Z0-9-]+)\s*:/g`, is applied to the whole file including comment text.** Both new tokens carry inline comments that mention other token names (`--dk-warn`, `--panel-solid`, `--control-border`), so the comments were written so that no token name is ever followed by a colon. A comment reading `--dk-warn: 0.10 alpha` would have registered as a phantom declaration and failed the closed-list check from the other direction.

## Verification

The plan's `<verify><automated>` commands, run from the repository root after the final commit, with output captured to the gitignored `scripts/.check/` log directory:

- `node scripts/check-tokens.mjs` — exit 0, `Problems: 0`. Output: `scripts/.check/04-01-tokens.log`.
- `node scripts/check-contrast.mjs` — exit 0, `Problems: 0`, 21 rows reported (19 PASS, 2 EXEMPTED: `ribbon-bottom-border` and `panel-tone`). Output: `scripts/.check/04-01-contrast.log`.

Task-level acceptance criteria, all confirmed:

- `grep -n -- "--dur-press" app/styles/tokens.capture.css` returns one line (76), a declaration valued `90ms`.
- `grep -n -- "--tint-warn-head" app/styles/tokens.capture.css` returns one line (37), a declaration valued `#2D383C`.
- `grep -c -- '"--dur-press"' scripts/check-tokens.mjs` returns 1; the same for `"--tint-warn-head"`.
- `git diff --stat app/styles/tokens.inherited.css` prints nothing.
- `npx tsc --noEmit` exits 0.
- The pairs file parses to 21 rows, with no duplicated `ink|ground` pair and no duplicated `id`; every row carries exactly the five expected fields; all fifteen added rows have a non-empty `note` containing `04-UI-SPEC.md`.
- `docs/design/decorative-exemptions.json` parses to 4 entries and `git diff --stat` on it prints nothing.

Beyond the plan's two commands, the two fixture suites that read these files were run — `node --test scripts/check-tokens.test.mjs scripts/check-contrast.test.mjs`, 21 tests, 21 passing. That matters because `check-contrast.test.mjs`'s first case asserts the real repository still exits 0 *and* that the six Phase 1 ratios (`7.98`, `14.36`, `8.62`, `6.59`, `4.07`, `1.33`) still appear in the output, which is what proves the fifteen additions did not displace the Phase 1 rows.

The full `npm run verify` gate was **not** run, and this is a deliberate narrowing worth stating. The only other script that reads either edited file is `scripts/check-structure.mjs`, which asserts `app/globals.css` imports the two token files in cascade order and is unaffected by a token being added. Against that, `npm run verify` executes `scripts/claims-audit.mjs`, which is one of the two files carrying the uncommitted third-party modifications recorded as the open `[SECURITY]` blocker in `STATE.md` — running the whole gate would exercise tampered code and produce a result that could not be attributed cleanly to this plan. The targeted checks above cover every consumer of the three files this plan changed.

## Working Tree Discipline

`git status --short` after the final commit shows exactly the pre-existing state recorded in `STATE.md` and nothing of this plan's:

```
 M docs/CAPTURE-PLAN-SEED.md
 M lib/data/types.ts
 M scripts/claims-audit.mjs
?? .claude/agent-memory/
?? docs/ingest.yaml
?? docs/planning-artifacts/
?? docs/specs/
```

`lib/data/types.ts` and `scripts/claims-audit.mjs` were never read for edit, never staged, never reverted and never reformatted; their diffs are byte-for-byte as found (7 and 20 changed lines respectively). Threat T-04-07 is closed: both commits were staged file-by-file, and `git diff --diff-filter=D HEAD~1 HEAD` on each confirms neither deleted a tracked file. Threat T-04-SC is closed vacuously — no package manager was invoked, because this plan adds no dependency.

## Known Stubs

None. Both files this plan touches are declaration sites, not renderers: every token declared here has a stated consumer in a later Phase 4 plan, and every contrast row is computed by the build today rather than pending a renderer. `--record-fill-armed`'s Phase 1 precedent — a token declared and not exercised in its own phase — applies to `--dur-press` and `--tint-warn-head`, which is the intended shape of this plan rather than a stub.

## Threat Flags

None. Neither file introduces a network endpoint, an auth path, a file-access pattern or a schema at a trust boundary. The one security-relevant surface in scope, the decorative-exemption register, was left at four entries, which is what threat T-04-08 disposes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Every later plan in this phase now has a declared token to charge a value to and a manifest row that proves the value clears its floor:

- `--dur-press` is available to the record and clock controls' press transition. Note for whichever plan consumes it: `--ease-out-expo` and `--ease-out-quart` already exist in `app/styles/tokens.inherited.css` and must be consumed, never redeclared — `check-tokens.mjs` fails on shadowing an inherited name, and `tokens.inherited.css` is byte-pinned by SHA-256.
- `--tint-warn-head` is available to the conflict card's tinted head, with both inks it carries already computed and passing (`--viewer-ink` at 10.33:1, `--dk-warn` at 7.22:1). `--viewer-ink` is the only ink permitted there, per `04-UI-SPEC.md`.
- The `--panel-solid` column is under computation, so a later plan that renders a panel surface cannot silently fall below the floor.

Two follow-ups found, not fixed:

1. **`tokens.capture.css`'s header still says the file "declares the complete Capture override and authored-token set at once, so no later phase invents a token outside this file."** Phase 4 has now added two tokens, which is sanctioned by `04-UI-SPEC.md` but sits awkwardly against "at once". The sentence's real intent — that no token is ever declared outside this file — still holds exactly. Rewording it was outside this plan's scope and would have touched a file for a reason the plan did not name. Worth a one-line amendment whenever that file is next opened for substantive reasons.
2. **The `04-UI-SPEC.md` open question about where the tinted-callout border correction lives is unaffected by this plan and still open.** This plan declared the tint; it did not touch the 0.30-alpha border at 2.003:1, which `04-UI-SPEC.md` corrects at source to a 1 px `--control-border` and asks be carried back to DESIGN.md before Phase 6 renders twelve conflict cards.

## Self-Check: PASSED

- `app/styles/tokens.capture.css` — FOUND, contains `--dur-press` and `--tint-warn-head`.
- `scripts/check-tokens.mjs` — FOUND, `D13_MANIFEST` contains both names.
- `scripts/check-contrast.pairs.json` — FOUND, parses to 21 rows.
- Commit `220f35e` — FOUND in `git log`, with both attribution trailers intact.
- Commit `16fdd72` — FOUND in `git log`, with both attribution trailers intact.

---
*Phase: 04-shell-gate-orders-clock-online*
*Completed: 2026-09-25*
