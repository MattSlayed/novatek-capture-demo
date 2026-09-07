---
phase: 01-scaffold-conventions
plan: 03
subsystem: infra
tags: [css, design-tokens, contrast, node-test]

# Dependency graph
requires: ["01-01", "01-02"]
provides:
  - "app/styles/tokens.inherited.css — byte-identical, CI-pinned copy of ../ipv-demo's parent token layer (D-12)"
  - "app/styles/tokens.capture.css — the complete D-13 manifest (40 tokens) with measured contrast ratios in comments"
  - "app/globals.css — the two-layer import order, reset, nine D-15 type roles, focus ring, navy-deep ground with no light theme"
  - "scripts/check-tokens.mjs — inherited-layer byte identity, Capture-layer completeness/no-clash, decorative-exemption register shape"
  - "docs/design/decorative-exemptions.json — the contrast check's only source of permitted exceptions (D-16), exactly 4 entries"
  - "docs/design/dead-token-register.md — every DESIGN.md retirement with its reason"
affects: [01-04, 01-05, 01-06, 01-07, 01-08, 01-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "check-tokens.mjs follows the same problems[]/process.exit(1) report shape as check-headers.mjs/check-structure.mjs, extended across three assertions (inherited byte-identity, Capture manifest completeness, exemption-register shape) in one file per D-13's 'the whole set lands at once' requirement"
    - "A pinned-hash file that must survive a future checkout unchanged needs a .gitattributes -text entry alongside the pin, not just the pin itself — core.autocrlf will otherwise silently corrupt it on the next checkout"
    - "Explanatory comments inside a file a check script string-scans (e.g. '#000000', 'color-scheme') must avoid the literal substrings the check forbids, even when describing the rule in prose"

key-files:
  created:
    - app/styles/tokens.inherited.css
    - app/styles/tokens.capture.css
    - app/globals.css
    - scripts/check-tokens.mjs
    - scripts/check-tokens.test.mjs
    - docs/design/dead-token-register.md
    - docs/design/decorative-exemptions.json
    - .gitattributes
  modified:
    - scripts/check-structure.test.mjs

key-decisions:
  - "Added .gitattributes marking app/styles/tokens.inherited.css -text (Rule 2 — missing critical functionality): core.autocrlf=true on this machine would rewrite the file's line endings to CRLF on a future checkout, silently breaking the pinned SHA-256 the check asserts on every build"
  - "Reworded explanatory comments in tokens.capture.css and globals.css that originally contained the literal strings '#000000', 'color-scheme' and 'prefers-color-scheme' — check-tokens.mjs's own naive substring match was tripping on its own documentation (Rule 1 — self-inflicted bug)"
  - "Updated scripts/check-structure.test.mjs's 'the real repository fails today only on the missing app/globals.css' test to assert exit 0 now that app/globals.css exists — 01-02's SUMMARY explicitly anticipated this exact transition on 01-03 landing (Rule 1 fix)"
  - "docs/design/decorative-exemptions.json's ink for the eyebrow's ::after rule is --cobalt (the inherited token the sibling's analogous rule uses); the accept control's ground is written as descriptive text ('the accept control's own fill') rather than a token name, since no such token is declared in this phase (Phase 4 concern) and inventing one would violate claims discipline"

requirements-completed: [REQ-FR-65, REQ-NFR-5]

# Metrics
duration: 19min
completed: 2026-09-07
---

# Phase 1 Plan 3: Land the token layers, type roles and design registers Summary

**Two-layer CSS custom-property system (byte-pinned inherited layer + a 40-token Capture layer with measured contrast ratios in comments), globals.css's nine type roles and focus ring on a navy-deep ground with no light theme, and the two docs/design/ registers — all enforced by a single check-tokens.mjs that fails the build on any drift, redeclaration, missing token, or a fifth exemption entry.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-09-07T20:20:00+02:00
- **Completed:** 2026-09-07T20:39:19+02:00
- **Tasks:** 3
- **Files modified:** 8 created (`app/styles/tokens.inherited.css`, `app/styles/tokens.capture.css`, `app/globals.css`, `scripts/check-tokens.mjs`, `scripts/check-tokens.test.mjs`, `docs/design/dead-token-register.md`, `docs/design/decorative-exemptions.json`, `.gitattributes`), 1 modified (`scripts/check-structure.test.mjs`)

## Accomplishments
- `app/styles/tokens.inherited.css` is a byte-preserving `cp` of `../ipv-demo/app/styles/tokens.css` — 4956 bytes, SHA-256 `11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9`, independently re-verified against the sibling this session and pinned in `scripts/check-tokens.mjs`'s header alongside the parent commit (`8fd097a`, 2026-09-01)
- `app/styles/tokens.capture.css` declares the complete D-13 manifest (8 layer-2 overrides, 5 authored tokens, the 9-step 4px spacing scale, 15 measured phone tokens, 2 shadows, 1 radius — 40 names total) in one `:root` block, each override commented with its measured contrast ratio, ground then panel; only `--viewer-ink-dim` shadows an inherited declaration, matching 01-PATTERNS.md's load-bearing finding
- `app/globals.css` imports the two layers in the asserted order, carries the sibling's box-sizing reset and `.sr-only` utility, sets `html`/`body` to the navy-deep ground with no light-mode branch, defines all nine D-15 type roles (three rendered in Phase 1, six declared for later phases), `strong { font-weight: 500; }`, and the focus ring (`outline: 2px solid var(--cobalt-glow); outline-offset: 2px;`, no border-radius per D-15)
- `scripts/check-tokens.mjs` grew across the three tasks into a single script asserting: inherited byte-identity; Capture-manifest completeness with no undeclared extra name and no redeclaration of an inherited name other than the one permitted shadow; `--target-record` pinned at 130px; no literal black; and the decorative-exemption register's exact 4-entry shape — 10 fixture tests in `scripts/check-tokens.test.mjs`, all passing
- `docs/design/decorative-exemptions.json` holds exactly the four permitted contrast exceptions (1.33, 2.23/2.17, 1.905, 1.136) with their measured ratios, ink, ground and source section; the two forbidden pairs (the focus ring on `--record-fill`, `--rule-faint` on the panel) are deliberately absent, matching 01-UI-SPEC.md's "not exemptions" list
- `docs/design/dead-token-register.md` records every DESIGN.md retirement (the 3.05rem hero, the 8.5–11px sizes and 0.35em tracking, the 124px record target, the light-ground tokens and `color-scheme`, the `--good`/`--warn`/`--crit` text-ink tones) with its reason and its Capture-layer replacement, stating up front that no inherited token is ever deleted or edited
- Full suite (`npm test`) passes 49/49 across all `scripts/**/*.test.mjs`; `node scripts/check-tokens.mjs` and `node scripts/check-structure.mjs` both exit 0 against the real repository, closing the "app/globals.css does not exist yet" gap 01-02's SUMMARY flagged as outstanding

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy the inherited token layer and write the byte-identity check** - `a72354b` (feat)
2. **Task 2: Write the Capture token layer and globals.css** - `28682f4` (feat)
3. **Task 3: Write the dead-token register and the decorative-exemption register** - `81d3432` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `app/styles/tokens.inherited.css` - byte-identical copy of the parent design layer, unedited
- `app/styles/tokens.capture.css` - the complete D-13 override/authored/spacing/measured/shadow/radius token set
- `app/globals.css` - two-layer import order, reset, nine type roles, focus ring, navy-deep ground
- `scripts/check-tokens.mjs` - inherited byte-identity + Capture completeness/no-clash + exemption-register shape
- `scripts/check-tokens.test.mjs` - 10 fixture tests (D-23) across all three assertions
- `docs/design/dead-token-register.md` - every token retirement with its reason
- `docs/design/decorative-exemptions.json` - the contrast check's only source of permitted exceptions
- `.gitattributes` - marks the inherited token file `-text` so autocrlf cannot corrupt its pinned bytes
- `scripts/check-structure.test.mjs` - updated the 01-02 placeholder test now that `app/globals.css` exists

## Decisions Made
- Added `.gitattributes` for `app/styles/tokens.inherited.css` (`-text`) after `git add` warned that `core.autocrlf=true` would rewrite the file's line endings to CRLF on a future checkout — verified the git-index blob hash still matches the pinned SHA-256 after the fix
- Wrote the accept-control exemption entry's `ground` field as descriptive text rather than a token name, since no such token exists in this phase's manifest and none of the plan's source material names one
- Kept the decorative-exemption register's `source` field identical across all four entries (`01-UI-SPEC.md §Text Ink Permissions and Contrast Floors`) since that section's own table is where all four ratios are listed together

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `.gitattributes` to prevent autocrlf from corrupting the pinned inherited layer**
- **Found during:** Task 1, staging `app/styles/tokens.inherited.css`
- **Issue:** `git add` warned "LF will be replaced by CRLF the next time Git touches it" because `core.autocrlf=true` on this machine. A future checkout (fresh clone, branch switch, `git stash` cycle) would silently rewrite the file to CRLF, breaking the SHA-256 the check-tokens.mjs pins — everywhere except this already-checked-out working copy.
- **Fix:** Added `.gitattributes` marking `app/styles/tokens.inherited.css -text`, disabling all newline conversion for that one file.
- **Files modified:** `.gitattributes`
- **Verification:** `git check-attr text app/styles/tokens.inherited.css` reports `unset`; `git cat-file -p :app/styles/tokens.inherited.css | sha256sum` still matches the pinned digest after staging.
- **Committed in:** `a72354b` (Task 1 commit)

**2. [Rule 1 - Bug] Reworded self-tripping comments in tokens.capture.css and globals.css**
- **Found during:** Task 2, running `node scripts/check-tokens.mjs` against the real repository
- **Issue:** `tokens.capture.css`'s own explanatory comments contained the literal substring `#000000` (as a reminder never to use it), and `globals.css`'s comment named `prefers-color-scheme` literally — both tripped the check's own naive `includes()` guard against those same strings.
- **Fix:** Reworded both comments to describe the same rule without the literal forbidden substring (`"pure black"` instead of `"#000000"`; described the light-theme prohibition without naming the CSS media feature).
- **Files modified:** `app/styles/tokens.capture.css`, `app/globals.css`
- **Verification:** `node scripts/check-tokens.mjs` exits 0; `grep -c "color-scheme"` and `grep -c "prefers-color-scheme"` against `app/globals.css` both return 0.
- **Committed in:** `28682f4` (Task 2 commit)

**3. [Rule 1 - Bug] Updated the 01-02 placeholder test now that app/globals.css exists**
- **Found during:** Task 2, running `npm test` after writing `app/globals.css`
- **Issue:** `scripts/check-structure.test.mjs`'s test "the real repository fails today only on the missing app/globals.css" started failing, because `check-structure.mjs` now exits 0 against the real repository — the file it asserted was missing now exists and is correct. 01-02's own SUMMARY.md explicitly named this as the expected transition ("check-structure.mjs will then report 0 problems on its default invocation").
- **Fix:** Replaced the stale assertion with "the real repository exits 0 now that app/globals.css exists (01-03)", asserting `code === 0`.
- **Files modified:** `scripts/check-structure.test.mjs`
- **Verification:** `npm test` passes 49/49.
- **Committed in:** `28682f4` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 missing-critical, 2 bugs — one self-inflicted, one an anticipated cross-plan transition)
**Impact on plan:** All three are necessary for correctness and for a clean, green build; none change the token values, contract shapes, or file list the plan specifies. No scope creep.

## Known Stubs

None. All three files this plan's `must_haves` name (`tokens.inherited.css`, `tokens.capture.css`, `globals.css`, `check-tokens.mjs`, `decorative-exemptions.json`, `dead-token-register.md`) are fully implemented per their contract; no placeholder values.

## Threat Flags

None. All new surface (the two token layers, the check script, and the two registers) is exactly what the plan's `<threat_model>` names — T-1-07, T-1-11, T-1-12 are the mitigations implemented, not new surface. T-1-04 (the 13px floor / ink-permission list, enforced by review rather than a dedicated linter) is accepted per the plan, unchanged.

## Issues Encountered
None beyond the three auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The two-layer token system, the nine type roles, the focus ring, and both design registers are in place; plan 01-04 onward can style components against `app/globals.css`'s classes and `app/styles/tokens.capture.css`'s custom properties without inventing new token names
- `scripts/check-contrast.mjs` (a later plan) can read `docs/design/decorative-exemptions.json` directly as its only source of permitted exceptions, per this plan's `<interfaces>` contract
- No blockers carried forward

## Self-Check: PASSED

All 8 created files confirmed present on disk (`app/styles/tokens.inherited.css`, `app/styles/tokens.capture.css`, `app/globals.css`, `scripts/check-tokens.mjs`, `scripts/check-tokens.test.mjs`, `docs/design/dead-token-register.md`, `docs/design/decorative-exemptions.json`, `.gitattributes`). All 3 task commit hashes (`a72354b`, `28682f4`, `81d3432`) confirmed present in `git log --oneline --all`. Full suite `npm test` reports `tests 49 / pass 49 / fail 0`; `node scripts/check-tokens.mjs` and `node scripts/check-structure.mjs` both exit 0.

---
*Phase: 01-scaffold-conventions*
*Completed: 2026-09-07*
