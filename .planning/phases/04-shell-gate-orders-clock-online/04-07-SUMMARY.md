---
phase: 04-shell-gate-orders-clock-online
plan: 07
subsystem: ui
tags: [react, nextjs, fr-48a, gate, disclosure, local-storage, accessibility, css-modules]

# Dependency graph
requires:
  - phase: 04-02
    provides: FR48A_DISPOSITION as a plain string export in lib/copy/governed.ts
  - phase: 04-04
    provides: lib/client/projection.ts purge(), the single cache purge
  - phase: 04-05
    provides: SecondaryControl { onPress, children } with the target floor, fill, edge and 4 px inner gap
  - phase: 04-06
    provides: scripts/check-primitives.mjs (A10 no aria-modal, A12 no router, A16 no storage in app/components)
provides:
  - lib/client/disclosure.ts — hasSeenDisclosure(), markDisclosureSeen(), versioned DISCLOSURE_KEY
  - components/gate/Gate.tsx — Gate({ onEntered }), the no-session surface with both FR-48a states and three persona doors
  - components/gate/Gate.module.css — the gate's layout to the UI-SPEC Surface 1 budget
affects: [04-11 switcher (renders Gate and supplies onEntered), 04-12 rendered-behaviour assertions, phase 6 transport-failure copy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Device-held flag read in an effect, state written in an await continuation, long form as the pre-resolution paint"
    - "Persona choice posts exactly { persona_id }; on 201 purge, mark, onEntered in one continuation"
    - "Always-present role=status paragraph carries a server refusal sentence or nothing"

key-files:
  created:
    - lib/client/disclosure.ts
    - lib/client/disclosure.test.mjs
    - components/gate/Gate.tsx
    - components/gate/Gate.module.css
  modified: []

key-decisions:
  - "FR-48a flag lives in one versioned localStorage key (capture.fr48a-disclosure.v1); any absent, disabled or throwing store answers not seen, so the failure direction is the long form"
  - "The gate's refusal sentence renders in an always-present polite live region (role=status) after the doors, carrying the envelope's detail or nothing (C-41: polite live regions for state changes during a screen's life)"
  - "Re-entry spacing between the short-form preview and the Read the full disclosure control is --space-16 (UI-SPEC names no figure; reused the panel's sentence gap)"
  - "The 4 px gap between a door's two lines is SecondaryControl's own declaration and is not restated in Gate.module.css"

patterns-established:
  - "lib/client/disclosure.ts: browser storage touched only inside function bodies, wrapped in try/catch, so the module imports under plain Node"

requirements-completed: [REQ-FR-48a, REQ-NFR-2, REQ-NFR-6]

# Metrics
duration: 14min
completed: 2026-10-04
---

# Phase 4 Plan 07: The gate and the disclosure memory Summary

**The no-session gate now states FR-48a's enforced/authored split in full on first entry and collapses to the preview plus a reopen control on re-entry, driven by a single versioned device flag that defaults to the long form; a persona door mints a session, purges the client projection and hands off to the switcher.**

## Performance

- **Duration:** about 14 min
- **Started:** about 2026-10-04T20:15Z (start time not recorded precisely)
- **Completed:** 2026-10-04T20:29Z
- **Tasks:** 3 of 3
- **Files created:** 4

## Accomplishments

- `lib/client/disclosure.ts` holds the one fact Phase 4 keeps on the device. Its header records why re-showing the long form on a cleared browser, a private window or a second device is the correct behaviour, so a later phase does not "fix" it.
- `components/gate/Gate.tsx` renders both FR-48a states from one component. The first-entry disclosure is a `role="dialog"` block in document flow, named by its own `<h2>`. The re-entry state shows the preview sentence and **Read the full disclosure**, which reopens the long form in place and moves focus to the `<h2>`. There is no ARIA modal flag, no scroll lock, no close control and no acknowledge control.
- Choosing a door posts exactly `{ persona_id }` to `/api/session`. On a 201 it calls the projection's purge, then `markDisclosureSeen()`, then `onEntered()`, all in the handler's await continuation. On any other status it renders the error envelope's `detail` or nothing. When no response arrives it renders nothing, which is the gap UI-SPEC records for Phase 6 to close.
- `components/gate/Gate.module.css` lays the surface out to the Surface 1 budget using declared tokens only.

## Task Commits

Each task was committed atomically, with explicit pathspecs:

1. **Task 1: lib/client/disclosure.ts, the FR-48a first-entry flag** - `b064f9d` (feat)
2. **Task 2: components/gate/Gate.tsx, the two states, the three doors and the persona-choice act** - `6e544ae` (feat)
3. **Task 3: components/gate/Gate.module.css, the layout and the vertical rhythm** - `6566b4e` (feat)

**Plan metadata:** recorded in the docs commit that adds this file.

## Files Created/Modified

- `lib/client/disclosure.ts` - exports `DISCLOSURE_KEY` (`capture.fr48a-disclosure.v1`), `hasSeenDisclosure()` and `markDisclosureSeen()`. Storage is touched only inside function bodies, and every failure reads as not seen.
- `lib/client/disclosure.test.mjs` - six `node:test` cases over a stubbed `globalThis.localStorage`, restored after each test: fresh store, write then read, throwing `getItem`, throwing `setItem`, absent store, and a version-mismatched key that must not be read.
- `components/gate/Gate.tsx` - the `"use client"` gate surface, 205 lines. Props are `{ onEntered: () => void }`.
- `components/gate/Gate.module.css` - main padding copied from the Limits template, 24 px section steps, 16 px panel padding and sentence gaps, one 12 px door gap, and the opaque `--panel-solid` panel with a 1 px `--control-border` edge. The `<h2>` is the only `--cobalt-glow-ink` element on the surface.

## Verification Evidence

All of the following were run in this session, after the final task commit unless stated otherwise.

| Check | Result |
|---|---|
| `node --test lib/client/disclosure.test.mjs` | 6 tests, 6 pass, 0 fail |
| `node --test "lib/**/*.test.mjs"` | 225 tests, 225 pass, 0 fail |
| `node -e "import('./lib/client/disclosure.ts')..."` with no store present | prints `function false`, does not throw |
| `npx eslint components/gate lib/client/disclosure.ts lib/client/disclosure.test.mjs` | exit 0 |
| `npx tsc --noEmit` | exit 0. A mid-Task-2 run exited 2 on `components/time/TimeOnOrder.tsx(206,1)`, which is plan 04-10's in-flight file; the re-run after Task 3 exited 0 |
| `node scripts/check-primitives.mjs` | `Problems: 0`, exit 0. The sweep was committed at `41decc4` with a clean working copy when this was run |
| `node scripts/check-governed.mjs` | exit 0, `Problems: 0` |
| `node scripts/claims-audit.mjs` | exit 0 |
| `node scripts/check-contrast.mjs` | exit 0, `Problems: 0`; `panel-disclosure-heading` passes at 7.59:1 |
| `node scripts/check-tokens.mjs` | exit 0, `Problems: 0` |

Literal acceptance greps (comments included):

| Grep | Count |
|---|---|
| `grep -nE "^\s*(localStorage\|window\|document)\b" lib/client/disclosure.ts` | no lines |
| `grep -c "localStorage" lib/client/disclosure.ts` | 2 |
| `grep -rn "localStorage" app components` | no lines |
| `grep -c "aria-modal" components/gate/Gate.tsx` | 0 |
| `grep -c "overflow: *hidden" components/gate/Gate.tsx` | 0 |
| `grep -c "FR48A_DISPOSITION" components/gate/Gate.tsx` | **2**: the import line (8) and the single use (172). Read as "used once, never restated", per the orchestrator's shared interpretation |
| `grep -cE "rbac_tier\|employee_no" components/gate/Gate.tsx` | 0 |
| `grep -c "purge()" components/gate/Gate.tsx` | 1, at line 141, inside `choose()`, which also holds the `fetch("/api/session")` call (line 129) |
| `grep -cE "next/link\|useRouter\|router\.push\|history\.(push\|replace)State" components/gate/Gate.tsx` | 0 |
| `grep -cE "space-20\|space-40\|radius-panel\|shadow-\|backdrop-filter\|rule-faint" Gate.module.css` | 0 |
| `grep -cE "44px\|target-min\|130px\|target-record\|:focus\|transition\|position: *(fixed\|sticky)" Gate.module.css` | 0 |
| `grep -cE '#[0-9a-fA-F]{3,8}\|rgba?\(\|font-(size\|family\|weight)' Gate.module.css` | 0 |
| `grep -c "row-gap" Gate.module.css` | 1 |

## Decisions Made

- **The device key is versioned with a `.v1` suffix.** Bumping the suffix makes every earlier "seen" unreadable, and the test proves that values under `.v0`, `.v2` and the bare base key are all ignored.
- **The effect's state write sits after `await Promise.resolve(hasSeenDisclosure())`.** The storage read happens after the first commit, so the server render and the hydrating render agree. The setter runs in an await continuation, which is the shape `react-hooks/set-state-in-effect` permits, and it only fires when the answer is "seen", since the long form is already showing otherwise.
- **The refusal renders in an always-present `<p role="status">` after the doors.** UI-SPEC does not place the gate's refusal. C-41 reserves polite live regions for state changes during a screen's life, and a refusal after a door is chosen is one, so the region exists from the first render and is filled with the envelope's `detail` or left empty. `.refusal:not(:empty)` adds a 24 px top margin only when it carries a sentence, so the empty region costs nothing in the vertical budget.
- **A new door press clears any earlier refusal first** (`setRefusal(null)` in the handler), so an earlier server sentence never stays on screen beside a later attempt that got no response.
- **Re-entry gap.** The gap between the preview and the reopen control is `--space-16`, because UI-SPEC names no figure for it.
- **The 4 px gap between a door's two lines is not restated.** `SecondaryControl.module.css` already declares `gap: var(--space-4)`, and its header says that figure comes from the Surface 1 door budget. The gate module charges it once by not repeating it.

## Deviations from Plan

None of Rules 1 to 4 was triggered. Three readings of the plan are recorded here so the verifier can check them:

1. **Task 1 has six tests where the plan named five behaviours.** The sixth, "an absent store reports not seen and accepts a write without throwing", is the unit-level form of Task 1's own `node -e import(...)` acceptance line. It adds no behaviour.
2. **The plan's "--space-4 between a door's two lines" is met by the primitive, not by `Gate.module.css`.** Restating it would declare one figure in two modules.
3. **The refusal live region and its `.refusal` class were not named in the plan.** The plan says to render the server's `detail` and compose none; where and how was left open. The choice is recorded under Decisions Made.

## Issues Encountered

- `npx tsc --noEmit` failed once, mid-Task-2, on `components/time/TimeOnOrder.tsx(206,1): error TS1005`. That is plan 04-10's file and was being written by a sibling agent. It was not touched, and a re-run after Task 3 exited 0.
- When this plan started, `scripts/check-primitives.mjs` had uncommitted changes. Plan 04-06 then committed it at `41decc4`. Every primitives run reported `Problems: 0`, and the final run was against the committed sweep with a clean working copy.

## Known Stubs

None. `refusal` starts as `null` on purpose, because the live region is empty until the server refuses. A transport failure with no response rendering no sentence is UI-SPEC's recorded Phase 6 gap, not a stub.

## User Setup Required

None. No external service configuration is required.

## Next Phase Readiness

- Plan 04-11's switcher can render `<Gate onEntered={...} />` with no session, then read the session and replace to the order list. The gate performs no history write and keeps no requested-surface intent.
- The switcher's focus effect must place first-entry focus on `#screen-title`. The gate moves focus only to `#disclosure-title`, and only on reopen.
- Plan 04-12 can assert the rendered behaviour: long form on a fresh store; short form plus **Read the full disclosure** after a stored `capture.fr48a-disclosure.v1 = "seen"`; no ARIA modal attribute; the ribbon still reachable.
- The gate is not yet reachable in a browser, so nothing about its rendering has been observed in this plan.

---
*Phase: 04-shell-gate-orders-clock-online*
*Completed: 2026-10-04*

## Self-Check: PASSED

All four created files exist on disk, and the three task commits b064f9d, 6e544ae and 6566b4e are present in git log.
