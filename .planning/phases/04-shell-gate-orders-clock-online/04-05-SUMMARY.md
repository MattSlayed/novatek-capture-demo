---
phase: 04-shell-gate-orders-clock-online
plan: 05
subsystem: ui
tags: [css-modules, design-primitives, single-owner-declaration, haptics, wcag-target-size, closed-set, state-marks]

# Dependency graph
requires:
  - phase: 01-scaffold-conventions
    provides: "the nine type roles and the build's only focus rule in `app/globals.css`, the `Ribbon`/`Limits` component conventions, and `--target-record`, `--target-min`, `--radius-control`, `--record-fill`, `--surface-inset`, `--control-border`, `--panel-solid` in `app/styles/tokens.capture.css`"
  - phase: 04-01
    provides: "`--dur-press` 90ms and `--tint-warn-head`, plus the sixteen Phase 4 rows of `scripts/check-contrast.pairs.json` every tone bound here is taken from"
  - phase: 04-03
    provides: "`lib/client/clock.ts`'s `SourceMark` — the two-member subset of the mark names `StateMark` must keep accepting"
provides:
  - "`components/controls/RecordControl.module.css` — the build's only declaration of the 130px record-binding geometry and its only `transition` (invariants A1 and A8)"
  - "`components/controls/RecordControl.tsx` — all three variants of Primitive 2, and the build's only `navigator.vibrate` call site behind the literal `\"vibrate\" in navigator` feature test (A15)"
  - "`components/controls/SecondaryControl.{tsx,module.css}` — the 44px floor for every non-record-binding control, taking children so a gate door's two lines compute its accessible name"
  - "`components/rows/Row.{tsx,module.css}` — the row shell for all four row kinds, with `as` choosing div/li/button and `onClick` wired only in the button form"
  - "`components/marks/StateMark.{tsx,module.css}` — `MARKS`, the closed set of seven, with all seven geometries in one module and tones bound for the three Phase 4 renders"
affects: [04-06, 04-07, 04-08, 04-09, 04-10, 04-11, phase-05-capture-flow, phase-06-offline-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a single-owner CSS declaration: the module's header names the figure it owns, the invariant that holds it, and that a second declaration anywhere is a build failure rather than a style choice"
    - "a perimeter drawn with an inset box-shadow rather than a border, so a state change cannot move the box's measured size"
    - "a variant declared complete and instantiated by nothing, on `--record-fill-armed`'s own precedent, so a later phase consumes it rather than inventing it"
    - "a mark's geometry as one CSS rule with a gradient rather than a pseudo-element, so the single-owner count is one line per member"
    - "an unexercised shape drawn in `currentColor`, which declares the geometry while introducing no undeclared contrast pair"

key-files:
  created:
    - components/controls/RecordControl.tsx
    - components/controls/RecordControl.module.css
    - components/controls/SecondaryControl.tsx
    - components/controls/SecondaryControl.module.css
    - components/rows/Row.tsx
    - components/rows/Row.module.css
    - components/marks/StateMark.tsx
    - components/marks/StateMark.module.css
  modified: []

key-decisions:
  - "The press perimeter is an inset `box-shadow`, never a `border` and never the ring property `app/globals.css` owns: a border would change the measured box, and invariant C2 asserts exactly 130 x 130 in rest *and* pressed at both viewports and both text scales"
  - "The clock variant's rest boundary is declared as `inset 0 0 0 0` rather than omitted, because `none` does not interpolate and the 0 -> 4px run is half of NFR-4's two-property change"
  - "The armed ring is two layered inset shadows — the outer 3px band repaints the fill over a 6px ink band — which is the only construction that produces the source's stated 130 -> 118 visible field while the box and the hit area stay 130"
  - "The haptic runs for 90ms, `--dur-press`'s own figure, so the two channels are coincident and neither outlasts the other; the plan and the UI-SPEC state no duration, and this is the only timing figure the token layer declares"
  - "`SecondaryControl` declares no case rule: a gate door's first line is an artisan's proper name, so uppercasing at the primitive would corrupt the one string on that control that must not be transformed"
  - "The word's ink is not restated for two of the three exercised marks: `--viewer-ink` is the inherited ink on both grounds these render on and is a declared pair on each, so only the bound mark's `--dk-good` word needs a class"
  - "`.word` was dropped rather than given `white-space: nowrap`: a state word longer than its row must wrap and grow like everything else in this system, and a nowrap word is the one way a mark could force two-dimensional scrolling at 320px"
  - "The diamond uses `transform: rotate(45deg)`, the source's own wording, rather than a `clip-path` inscribed in 10px; it is static geometry with nothing animating it, and §Motion's prohibition is on things that move"

patterns-established:
  - "Single-owner declaration: every figure a later screen might re-declare is owned by one module whose header names the owning invariant, and the plan's grep is run literally before the commit rather than after"
  - "Comment discipline under a string sweep: a module never writes the literal a neighbouring invariant forbids — not `:focus`, not `outline`, not the hairline token's name, not another module's exempted token name — because a checker cannot tell an explanation from a declaration"
  - "A closed set is a const tuple plus a derived union, with each member's meaning and whether this phase renders it recorded beside it (Shared Pattern 7)"
  - "Every figure traces: 12px padding and 4px inner gaps are §Surface 1's door budget and §Surface 2's row budget, the 10px block and the 4px mark gap are §Surface 4's SOURCE-pair arithmetic, and the dot's 2px diameter is the heaviest stroke weight the mark set already carries"

requirements-completed: [REQ-NFR-2, REQ-NFR-4, REQ-NFR-4a, REQ-NFR-6]

# Metrics
duration: 18m
completed: 2026-09-25
---

# Phase 4 Plan 05: The four primitive modules Summary

**Four components and four CSS modules, each the single owner of the declaration it carries: `RecordControl` holds the only 130px record-binding geometry, the only `transition` and the only feature-tested `navigator.vibrate` call site; `SecondaryControl` and `Row` are the only two 44px owners beside the ribbon; and `StateMark` declares all seven shapes of the closed set with tones bound for the three this phase renders and `currentColor` for the four it does not.**

## Performance

- **Duration:** 18m from the first task commit to the last, on a fresh start after an earlier run stalled while reading the phase documents without writing anything.
- **Started:** 2026-09-25T17:17:19Z (Task 1 commit)
- **Completed:** 2026-09-25T17:40:00Z
- **Tasks:** 3 of 3
- **Files created:** 8 (517 lines); **files modified:** 0

## Accomplishments

- **The 130px geometry has exactly one declaration, and it cannot be moved by a state change.** The perimeter runs as an inset `box-shadow`, so the pressed state paints a 4px boundary inside a box that still measures 130 x 130 — which is what invariant C2 will assert in a browser at both viewports and both text scales. A `border` would have measured 138, and the ring property is reserved to `app/globals.css` by A3.
- **The press change is two properties, both completing inside `--dur-press`.** Boundary and radius move together (`box-shadow` and `border-radius`, 90ms, `--ease-out-expo`), which is the pair NFR-4 needs to stay legible around a gloved thumb resting on the control and which carries the confirmation alone on iOS (NFR-4a). The radius figure 10 -> 4px is the design source's; no radius step below `--radius-control` exists, so it is written as a literal with that stated.
- **The haptic is at one call site, additive, and provable in source.** `navigator` appears in exactly one `.tsx` in the build, the literal `"vibrate" in navigator` guard is in that file, and the component's own comment records why: headless Chromium reports the API as present, so no browser run can prove the feature test exists, and on iOS the API does not exist at all. The visible change is owned entirely by the CSS module's active-state rule and begins on pointer-down whether or not the handler runs — so the vibration cannot be mistaken for the confirmation.
- **Two variants and the armed state are declared complete and instantiated by nothing.** `accept` carries its 1px `--control-border` rest boundary and 1 -> 4px pressed run; `reject` carries `--surface-inset`, `--dk-crit` and `--dk-crit-edge`; `.armed` carries the ring as two layered inset shadows producing the source's 130 -> 118 visible field with the box and hit area unchanged. Phase 5 implements the behaviour and instantiates the two variants; the precedent for declaring and not using is `--record-fill-armed`'s own note in `tokens.capture.css`.
- **The 44px floor has exactly two new owners, and the ribbon's exempted name is still declared in one place.** `min-height: var(--target-min)` with no maximum, in `SecondaryControl.module.css` and `Row.module.css`; `--ribbon-link-min-h` appears in `Ribbon.module.css` and nowhere else, including in comments. No screen module will need a target size, so A2 is satisfiable by construction from here.
- **`SecondaryControl` takes children, and its case rule is the absence of one.** A gate door's accessible name is computed from its two visible lines in DOM order with no `aria-label`; its ink is `--viewer-ink` at 15.84:1 on `--surface-inset`, never `--cobalt-glow-ink`, which §Color states explicitly because an executor reading the accent list and one reading Primitive 3 must render the same ink. Declaring no `text-transform` is deliberate: an artisan's proper name is the first line of that control.
- **`Row` covers all four row kinds from one shell, and the non-interactive ones stay non-interactive.** `as` chooses `div`, `li` or `button` and nothing else changes; `onClick` is wired only in the button branch, so an asset row and a governing-document row cannot acquire a false affordance for screens that are Phase 5. The header records the Phase 5 seam: the asset row gains the button form and an act, and gains no border, tone or size.
- **All seven marks exist in one module, and four of them add no contrast pair.** The three Phase 4 renders bind tones from the manifest (`filled-square` in `--dk-good` with a `--dk-good` word, `filled-diamond` in `--dk-warn`, `hollow-square-dot` in `--dk-warn` with the inherited `--viewer-ink` word); the other four draw in `currentColor`, so their geometry is declared while no undeclared pair enters the build and the exemption register stays at four entries. `node scripts/check-contrast.mjs` and `node scripts/check-tokens.mjs` both confirm it.
- **The mark set is closed at seven, and its one existing mirror was checked first.** `grep` across `app/`, `components/`, `lib/` and `scripts/` for the mark names found exactly one other enumeration — `lib/client/clock.ts`'s `SourceMark`, a two-member subset whose literals are byte-identical to members of `MARKS`. `StateMark`'s header names that mirror and the requirement that it stay a subset, so the next executor to add a member knows where the second site is.
- **State is never carried by hue.** The block is `aria-hidden` and the word is not: the word is always present, always from the closed vocabulary, and readable with no colour perception whatever.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Task 3's first acceptance criterion cannot execute: Node cannot load a `.tsx` file**

- **Found during:** Task 3, before writing the component — the criterion was probed against a throwaway two-line `.tsx` file first.
- **Issue:** The criterion is `node -e "import('./components/marks/StateMark.tsx').then(m=>console.log(m.MARKS.length, m.MARKS.join(',')))"`. Node 24.19.0 refuses the file outright with `TypeError: Unknown file extension ".tsx"` — its type stripping registers `.ts` and `.mts` only, and JSX is not a transform it performs. Even with a loader it would then fail on `import styles from "./StateMark.module.css"`, which no Node resolver can satisfy. The criterion is unrunnable against any `.tsx` in this repository, not against this file in particular.
- **Fix:** Ran the equivalent assertion at source level instead, reading the `MARKS` tuple out of the file and printing the same two facts the criterion asks for: `node -e "const s=require('fs').readFileSync('components/marks/StateMark.tsx','utf8');const b=s.match(/export const MARKS = \[([\s\S]*?)\] as const;/)[1];const n=[...b.matchAll(/\"([a-z0-9-]+)\"/g)].map(x=>x[1]);console.log(n.length, n.join(','))"`. It prints `7 hollow-square-2px,half-filled-square,filled-square,filled-diamond,hollow-square-diagonal,hollow-square-1px,hollow-square-dot` — the count and the UI-SPEC's own order. The criterion's intent is met; only its mechanism changed. No source file was shaped around the substitution.
- **Files modified:** none beyond the task's own two files.
- **Committed in:** `a42e3f0`, whose message states the deviation and its reason.

### Narrowings and interpretations, recorded

- **My own comments tripped one acceptance grep, and the comments were reworded rather than the criterion weakened.** Task 2's second criterion requires `ribbon-link-min-h` to appear only in `Ribbon.module.css`; the first drafts of both new modules named that token while explaining which pre-existing name A2 exempts, so the grep listed three files. Both headers now say "Ribbon.module.css's own pre-existing link-target name" without the literal. Caught by running the criterion before staging. Four further literals were kept out of the new modules on the same reasoning — `:focus` (so A3's sweep stays clean), `outline` (same), the hairline token's name (A14), and `44px`/`target-min` inside `RecordControl.module.css` and `StateMark.module.css`.
- **`--rule-faint` is referred to by description, never by name.** A14 requires zero occurrences in any module, and a comment recording that its one named state-mark use was retired would itself be an occurrence. `StateMark.module.css` therefore says "the faint hairline token" and states the 2.80:1 reason.
- **The haptic duration is an interpretation.** Neither the plan nor the UI-SPEC gives one. It is `--dur-press`'s 90ms, carried as a named constant whose comment states that the figure is the token's and that the two channels are coincident by construction. This is a real seam: the value is duplicated in TypeScript rather than read from the cascade, so if `--dur-press` moves, `HAPTIC_MS` must move with it. The comment says so. Reading the token at runtime was rejected as more machinery than the fact deserves.
- **The dot's diameter is derived, not cited.** Primitive 5 gives the dot no size. 2px is the heaviest stroke weight the set already carries (the 2px hollow square), so the mark introduces no third figure. Recorded here because it is the one geometric value in the eight files with no direct source line.
- **`transform: rotate(45deg)` on the diamond is the source's own wording and is not motion.** §Motion says no transform renders in Phase 4; that sentence is about things that move, and the rotation is the static shape Primitive 5 specifies. Nothing transitions it. Noted because a reader sweeping for the word `transform` will find it.
- **`Row` declares `var(--space-12)` padding as the plan states, and the time surface's segment row charges `--space-16` by its own budget.** §Surface 4 gives the segment row 32px of padding; §Surface 2 gives the order row 24px. The shell carries the 12px step and `Row.module.css`'s header records that the segment-row consumer composes the step it needs over the shell rather than restating the shell — a seam plan 04-10 will land on.
- **`Row`'s `as` union excludes `dl`, as the plan's interface fixes it.** §Surface 4 describes the segment row as a `<dl>`; plan 04-10 renders a non-interactive `Row` *containing* a `<dl>`, which the `div` form serves. The interface was not widened.
- **`npx eslint` was run on directories and then on `components` entire, not on single files.** Exit 0 in every run.

---

**Total deviations:** 1 auto-fixed (1 blocking, in a verification command rather than in code). 7 narrowings and interpretations recorded above.
**Impact on plan:** None on scope, artifacts or behaviour. All eight files in `files_modified` were created, nothing outside it was touched, and `STATE.md` and `ROADMAP.md` were left to the orchestrator. `docs/CAPTURE-PLAN-SEED.md` and the four untracked paths (`.claude/agent-memory/`, `docs/ingest.yaml`, `docs/planning-artifacts/`, `docs/specs/`) are exactly as found.

## Issues Encountered

- **The one grep failure was my own explanatory comment, for the third time in this phase.** Plan 04-01 lost time to a colon in a comment and 04-03 to a header quoting `"use client"`; this plan's was two headers naming `--ribbon-link-min-h` while explaining the exemption it is not allowed to restate. The habit that caught it is cheap: run every criterion verbatim before staging, and assume the pattern is more literal than its prose gloss.
- **Nothing else required problem-solving.** No build was run and none was needed; no package was installed; Pitfall 3's two ESLint traps cannot fire in these four components because none holds state, a ref or an effect. The armed ring's two-shadow construction was the only piece that needed arithmetic, and it reproduces the source's stated 130 -> 118 field exactly.

## Verification

Every command was run from the repository root in this session; slower output is logged under the gitignored `scripts/.check/`, prefixed `04-05-`.

| Command | Result |
|---|---|
| `npx eslint components/controls` (Task 1), `components/controls components/rows` (Task 2), `components/marks` (Task 3), `components` (final) | exit 0, no output, in all four runs |
| `npx tsc --noEmit` | exit 0, run after each of the three tasks |
| `node scripts/check-contrast.mjs` | exit 0 after each task — every pair meets its 7:1/3:1 floor or is validly exempted |
| `node scripts/check-tokens.mjs` | exit 0 — the D-13 manifest is complete and the exemption register still has exactly its four entries |
| `node scripts/claims-audit.mjs` | exit 0 — the new comment prose trips no register entry |
| `node scripts/check-governed.mjs` | exit 0 — no new file duplicates a governed sentence |
| `grep -rn --include='*.module.css' -e '130px' -e 'target-record' app components` | `components/controls/RecordControl.module.css` only |
| `grep -rn --include='*.module.css' --include='globals.css' 'transition' app components` | `components/controls/RecordControl.module.css` only |
| `grep -rn --include='*.module.css' -e '44px' -e 'target-min' app components` | the two new owners plus `Ribbon.module.css:57`, the pre-existing comment the criterion names |
| `grep -rn --include='*.module.css' 'ribbon-link-min-h' app components` | `components/shell/Ribbon.module.css:49` only |
| `grep -rn --include='*.module.css' -e ':focus' app components` | no match |
| `grep -rn --include='*.module.css' 'outline' app components` | no match — the ring property stays in `app/globals.css` alone (A3) |
| `grep -rnE '#[0-9a-fA-F]{3,8}\|rgba?\(' --include='*.module.css' --include='globals.css' app components` | no match |
| `grep -rn -e 'position: *fixed' -e 'position: *sticky' app components` | no match |
| `grep -rn 'rule-faint' --include='*.module.css' app components` | no match |
| `grep -rnE 'font-(size\|family\|weight)' --include='*.module.css' app components` | no match — every type role comes from `app/globals.css` |
| `grep -rnE 'color: *var\(--(cobalt-glow\|record-fill\|dk-crit-edge\|rule-faint)\)' --include='*.module.css' --include='globals.css' app components` | no match (A13) |
| `grep -rn 'navigator' components app --include='*.tsx'` | `components/controls/RecordControl.tsx` only; `grep -c '"vibrate" in navigator'` on it returns 2 (the guard and the comment that names it) |
| `grep -c 'filled-diamond\|filled-square\|hollow-square' components/marks/StateMark.module.css` | `7` — one line per member, no mark name in any comment in that file |
| `grep -rln 'hollow-square-dot' app components --include='*.module.css'` | `components/marks/StateMark.module.css` only |
| `grep -c 'currentColor' components/marks/StateMark.module.css` | `6` (criterion: at least 4) |
| source-level `MARKS` read (see Deviation 1) | `7` and the seven names in the UI-SPEC's order |
| `git status --short` | only the pre-existing `M docs/CAPTURE-PLAN-SEED.md` and the four untracked paths |

**Narrowed deliberately, and what is therefore unproven.** `npm run verify` was not run, and this plan's `<verification>` block does not name it. Its gate includes `next build` and a live server, which is slow on this OneDrive path and prone to `EPERM: unlink .next/static/<id>`; more to the point, none of the server-dependent steps can reach these files yet — no route, no page and no screen imports any of the four components, which is the plan's own stated output ("they are not reachable from any screen yet"). The checks above are the subset that actually reads `app/` and `components/`, and all of them pass. `scripts/check-primitives.mjs` does not exist yet: plan 04-06 creates it next wave, and until then the greps in the table are the only enforcement of A1-A14 — which is why each was run literally rather than assumed.

**What cannot be proved at this point in the phase, by design.** C1 and C2 (every target at least 44 x 44, and the record control exactly 130 x 130 in rest and pressed at 360px and 320px, at 100% and 200%) are browser assertions on the `check-wcag.mjs` harness and need a screen that renders these components; the first is plan 04-07. C7's axe run is the same. The haptic's single call site is asserted in source here and can never be asserted in a browser, for the reason Pitfall 14 measured. The two unexercised variants and the armed geometry are declared and compile, and nothing renders them in this phase.

## Self-Check: PASSED

- `components/controls/RecordControl.tsx` — FOUND
- `components/controls/RecordControl.module.css` — FOUND
- `components/controls/SecondaryControl.tsx` — FOUND
- `components/controls/SecondaryControl.module.css` — FOUND
- `components/rows/Row.tsx` — FOUND
- `components/rows/Row.module.css` — FOUND
- `components/marks/StateMark.tsx` — FOUND
- `components/marks/StateMark.module.css` — FOUND
- commit `69e4e94` — FOUND in `git log`, both trailers present
- commit `afb8281` — FOUND in `git log`, both trailers present
- commit `a42e3f0` — FOUND in `git log`, both trailers present

## Known Stubs

None in the sense the check means: `grep -rnE "TODO|FIXME|placeholder|coming soon|not available" components/` returns nothing, no component returns a hardcoded empty value, and no prop is wired to mock data.

Three things are **declared and deliberately unexercised**, each with its reason in the code and each named in the plan as an output rather than a gap: `RecordControl`'s `accept` and `reject` variants and its `.armed` geometry (Phase 5 instantiates them), and four of `StateMark`'s seven marks (no Phase 4 state means *live*, *in hand*, *refused and retained* or *ended without binding*). Declaring them now is the point of building the primitives against DESIGN.md rather than under capture-flow pressure — the precedent is `--record-fill-armed`'s own "declared and unused in this phase" note.

## Threat Model

The plan's five registered threats are discharged as written. No new security-relevant surface was introduced: no endpoint, no auth path, no file access, no schema change, no network call, no storage. No threat flags.

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-04-12 (repudiation, `RecordControl`) | mitigated | The press change alters two properties — perimeter boundary and radius — inside `--dur-press` 90ms, wholly outside the region a thumb resting on the control occludes, and it is CSS-driven so it does not depend on the handler running. On iOS, where no haptic exists, it carries the confirmation alone (NFR-4a). |
| T-04-13 (information disclosure, `StateMark`) | mitigated | Every mark renders a shape from the closed set of seven *and* a word; the block is `aria-hidden` and the word is not, so no state is conveyed by hue to a reader who cannot perceive it. The set is closed at seven and its one other mirror is named in the header. |
| T-04-14 (tampering, the four CSS modules) | mitigated | Verified by the grep table above: no raw colour literal, no `outline`, no focus rule, no fixed or sticky position, no type property, no `--rule-faint`, and single owners for `130px`, `44px` and `transition`. Plan 04-06 turns each into a build failure next wave. |
| T-04-07 (tampering, this plan's commit) | mitigated | Eight new files, none of them the previously `[SECURITY]`-blocked pair. `git diff --name-only HEAD~3 HEAD` matches `files_modified` exactly; `git status --short` shows nothing of mine outstanding. |
| T-04-SC (tampering, npm installs) | mitigated | Zero packages added. The seven marks are authored CSS shapes — two borders, two gradients and one rotation — and no icon set or component library was reached for. |

## User Setup Required

None — no external service, no environment variable, no dashboard step, no package install.

## Next Phase Readiness

Wave 3 can build directly on these modules.

- **Plan 04-06** now has the real repository to assert against. A1, A2, A8, A9, A13, A14, A15, A5 and A6 are all true of the tree as committed, and the exact grep that proves each is in the verification table above — so `check-primitives.mjs` can be written to match measured facts rather than intent. A4's "closed at seven" has two sites to read: `MARKS` in `components/marks/StateMark.tsx` and the seven selector lines in `components/marks/StateMark.module.css`, which `grep -c` returns as exactly 7.
- **Plans 04-07 to 04-11** consume the props contract unchanged: `RecordControl { variant, label, onPress }`, `SecondaryControl { onPress, children }`, `Row { as?, onClick?, children }`, `StateMark { mark, word }`. Two things to know when doing so: a `Row` or `SecondaryControl` is a block-level flex box and fills its container's width, so a `Back` control belongs in a flex header row rather than a block; and the time surface's segment row composes `--space-16` padding over the shell's 12px, per §Surface 4's own budget.
- **Phase 5** inherits `accept`, `reject` and `.armed` already declared with their token bindings, and D-07's recorded risk stands: a contract written against one consumer may encode the wrong invariant, and Phase 5 is its first real test and may generalise it. That is expected, not a failure.
