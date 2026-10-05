---
phase: 04-shell-gate-orders-clock-online
plan: 09
subsystem: ui
tags: [react, nextjs, css-modules, clock, nfr-4, accessibility, sc-2.2.2]

# Dependency graph
requires:
  - phase: 04-03
    provides: lib/client/clock.ts (anchorFrom, elapsedAt, formatDuration, clockState)
  - phase: 04-04
    provides: lib/client/projection.ts (readOrder, readHours, openClock, closeClock, cachedOrder, cachedOrders, cachedClock and the three-way Outcome)
  - phase: 04-05
    provides: components/controls/RecordControl.tsx, components/controls/SecondaryControl.tsx, components/rows/Row.tsx
  - phase: 04-06
    provides: scripts/check-primitives.mjs, the D-07 sweep both modules pass
  - phase: 04-08
    provides: components/conflict/ConflictCard.tsx (code, sentence, announce)
provides:
  - "components/order/Clock.tsx: the ELAPSED figure with the timer role, the permanent derivation line, the 130 px clock control labelled OPEN / CLOSE / REOPEN, the 1 Hz tick and the re-anchor"
  - "components/order/Clock.module.css: the clock block's internal spacing and fixed-width numerals"
  - "components/order/OrderDetail.tsx: Surface 3 — one heading naming the order, the clock, the Time on this order control, the asset rows and the governing-document rows, nothing pinned"
  - "components/order/OrderDetail.module.css: the vertical budget of a scrolling surface"
affects: [04-11 switcher (renders OrderDetail with account, orderId, onRefused), 04-12 C2 geometry and refusal-announcement assertions, 04-13 device pass (hidden tab, haptic), phase 5 (asset row becomes a control), phase 6 (closes the label-swap and no-answer gaps), phase 9 (referral bar)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Displayed elapsed figure = server elapsed_s + monotonic time since the projection stored it; recomputed every render, never accumulated, and only while a segment is running"
    - "The freshest clock is chosen between props and the component's own answer by the projection's monotonic arrival instant"
    - "Every setter runs in an interval callback, a visibility listener's await continuation or a tap's await continuation"
    - "Clock props are passed as a typed object spread, so the order id never appears as an interpolated JSX expression"

key-files:
  created:
    - components/order/Clock.tsx
    - components/order/Clock.module.css
    - components/order/OrderDetail.tsx
    - components/order/OrderDetail.module.css
  modified: []

key-decisions:
  - "The figure adds local time only while a segment is running; with no running segment it is the server's elapsed_s exactly as sent, because elapsedAt itself adds time unconditionally"
  - "A tap refusal whose error is not a ConflictCode renders its envelope detail in a role=status wrapper in the card's slot above the control, so it is announced like the card"
  - "A refused order read outside the conflict table renders its detail under the heading instead of calling onRefused, whose type admits only conflict codes (the 04-08 / 04-10 pattern)"
  - "Order detail takes the order's identity from cachedOrders() when no full read is held, so the heading exists when focus lands on the list-to-detail path; the asset and governing-document sections render only once a full read is held"
  - "The clock block uses --space-8 between ELAPSED and the figure, as the plan directs, where the UI-SPEC's Surface 3 budget charges 4 px"

patterns-established:
  - "A clock surface holds { forId, clock, readAtMono } in state, read back from cachedClock after each ok answer, so there is one monotonic anchor per response"

requirements-completed: [REQ-NFR-4, REQ-NFR-4a, REQ-NFR-6, REQ-NFR-2]

# Metrics
duration: about 16 min
completed: 2026-10-05
---

# Phase 4 Plan 09: Order Detail and the Clock Summary

**Order detail now names the order in one heading and carries a clock whose figure is the server's elapsed value plus monotonic time since that read, ticking once a second behind a single-tap OPEN / CLOSE / REOPEN record control, with the derivation disclosed permanently and nothing pinned to the viewport.**

## Performance

- **Duration:** about 16 minutes. The start time was not recorded; the figure runs from HEAD `eb55d0a` (07:09 local) to the last task commit `b22eaaa` (07:24 local).
- **Completed:** 2026-10-05
- **Tasks:** 3 of 3
- **Files created:** 4 (538 lines in total)

## Accomplishments

- `components/order/Clock.tsx` renders ELAPSED, the `H:MM:SS` figure with `role="timer"` and no live-region attribute, and the derivation line quoted from the UI-SPEC without rewording. The figure is recomputed on every render from the freshest anchor, so a throttled timer only slows the updates and never makes the number wrong.
- The clock re-anchors from every clock-carrying answer it receives (its own open and close, the hours read on a visible tab) and from the props order detail passes from `cachedClock`. Every delta is a difference of `performance.now()` readings.
- One `RecordControl` in its `clock` variant carries OPEN, CLOSE or REOPEN from `clockState`. Nothing interim renders between the tap and the answer, the control stays tappable, and a repeated tap before the answer repeats the act on screen at that moment, so a double CLOSE reaches `not_open` (ROADMAP SC-3).
- A refused tap renders `ConflictCard` with `announce` immediately above the control. The control is never unmounted, so focus stays on it.
- `components/order/OrderDetail.tsx` renders the heading (number in a `figure` run, then the title, as one string), the clock, the Time on this order control (`goTo("time", orderId)`), and non-interactive `Row as="li"` lists for the assets (tag at `tag`, description at `object-title`) and the governing documents (code at `figure`). There is no referral bar, no Limits duplicate, no capture mark and no prompting copy.

## Task Commits

1. **Task 1: Clock.tsx and Clock.module.css** — `94207a0` (feat)
2. **Task 3: OrderDetail.module.css** — `817b810` (feat). Committed before Task 2 so that no commit imports a module that does not exist yet.
3. **Task 2: OrderDetail.tsx** — `b22eaaa` (feat)

## Files Created/Modified

- `components/order/Clock.tsx` (231 lines): the clock component and its `ClockProps`.
- `components/order/Clock.module.css` (48 lines): `--space-8` inside the block, `--space-16` above the control and the refusal slot, `--row-gap` below the block, fixed-width numerals on the figure.
- `components/order/OrderDetail.tsx` (194 lines): Surface 3 and its `OrderDetailProps`.
- `components/order/OrderDetail.module.css` (65 lines): `<main>` padding with no `--safe-b`, `--space-24` / `--space-32` / `--space-12` steps, one between-rows rule shared by both lists, section labels in `--cobalt-glow-ink`, `overflow-wrap: anywhere` on the code.

## Props contracts (verbatim, for plan 04-11)

```ts
export type ClockProps = {
  orderId: string;
  clock: OrderClock | null;
  readAtMono: number | null;
};

export type OrderDetailProps = {
  account: Artisan;
  orderId: string;
  onRefused: (code: ConflictCode, sentence: string) => void;
};
```

## Verification

The commands below were all run after the final task commit's content was in place.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint components/order` | exit 0; neither `react-hooks/refs` nor `react-hooks/set-state-in-effect` fires |
| `node scripts/check-primitives.mjs` | exit 0, `Problems: 0` |
| `node scripts/check-governed.mjs` | exit 0 |
| `node scripts/claims-audit.mjs` | exit 0 |
| `node scripts/check-contrast.mjs` | exit 0 |
| `node scripts/check-tokens.mjs` | exit 0 |

`node scripts/verify.mjs` was not run, at the orchestrator's direction; the orchestrator runs the full gate once after this plan.

Every acceptance grep, run verbatim, with its literal count:

| Criterion | Count | Required |
|---|---|---|
| `grep -c 'aria-live' Clock.tsx` | 0 | 0 |
| `grep -c 'role="timer"' Clock.tsx` | 1 | 1 |
| `grep -cE 'useRef' Clock.tsx` | 0 | 0 |
| `grep -c 'performance.now()' Clock.tsx` | 2 | at least 1 |
| `grep -c 'Date.now()' Clock.tsx` | 0 | 0 |
| `grep -cE 'disabled\|aria-busy\|spinner\|Saving\|Loading' Clock.tsx` | 0 | 0 |
| `grep -cE '130px\|target-record\|@media' Clock.module.css` | 0 | 0 |
| `grep -c 'tabular-nums' Clock.module.css` | 1 | 1 |
| `grep -cE "position: *fixed\|sticky-bar-h\|Report something else" OrderDetail.tsx` | 0 | 0 |
| `grep -cE "\{orderId\}\|\{props\.orderId\}\|\{id\}" OrderDetail.tsx` | 0 | 0 |
| `grep -cE "<button\|onClick" OrderDetail.tsx` | 0 | no handler on an asset or document row |
| `grep -cE "Read the full preview limits" OrderDetail.tsx` | 0 | 0 |
| `grep -cE "verifications\|proposals\|decisions" OrderDetail.tsx` | 0 | 0 |
| `grep -c "row-gap" OrderDetail.module.css` | 1 | 1 |
| `grep -c "overflow-wrap" OrderDetail.module.css` | 1 | 1 |
| banned-token grep on OrderDetail.module.css (`44px` … `@media`) | 0 | 0 |
| `grep -cE '#[0-9a-fA-F]{3,8}\|rgba?\(\|font-(size\|family\|weight)' OrderDetail.module.css` | 0 | 0 |

The key-link patterns are each present in `Clock.tsx`: `elapsedAt` 2 lines, `openClock` 2 lines, `RecordControl` 2 lines. Each count is the import line plus one use. No criterion in this plan counts an imported name against "is 1"; under the phase's reading of that phrase ("used once, never restated"), each of the three names is used exactly once.

## Deviations from Plan

### Orchestrator-directed

**1. Task order in the commits.** Task 3's module (`817b810`) was committed before Task 2's component (`b22eaaa`), so that no commit carries a `.tsx` that imports a module arriving one commit later. The content of each task is unchanged.

**2. Comment wording.** The four facts the plan asks the Clock comment to record are worded without the tokens the plan's own greps forbid. Two examples: "nothing interim renders between the tap and the server's answer, and the control stays tappable throughout", and "no live-region attribute; the timer role's implicit politeness is off".

### Refusals outside the conflict table (the 04-08 / 04-10 pattern)

**3. Clock, a refused tap whose error is not a ConflictCode** (for example `no_session`). `ConflictCard` admits only a `ConflictCode`. The envelope's own `detail` renders in a `<p className="prose">` in the card's slot above the control, wrapped in `<div role="status">`. **For plan 04-12: this refusal is announced.** It takes the same polite status role the card takes with `announce`, mounted together with its content in the same way. An empty `detail` renders nothing.

**4. OrderDetail, a refused read whose error is not a ConflictCode.** The plan says to render no refusal on this surface. `onRefused` admits only a `ConflictCode`, so a `no_session` refusal cannot cross to the switcher. Its `detail` renders in a `<p className="prose">` under the heading, and the clock and both lists are not rendered. The heading appears only if the order's identity is already cached; otherwise `<main>` carries no `aria-labelledby`, so it never points at a missing id. A conflict-table refusal (`order_not_found`) still calls `onRefused` and renders nothing, as the plan directs.

### Auto-fixed

**5. [Rule 1 - Bug] The figure would climb on a closed clock.** `elapsedAt` adds the time since the anchor unconditionally. The clock interpolates only while `clockState` is `segment-running`. Otherwise the figure is the server's `elapsed_s` exactly as sent. Without this, a REOPEN-state order would show time accruing that the server is not recording. Fixed in `Clock.tsx` before its commit (`94207a0`).

**6. [Rule 2 - Missing critical functionality] The heading did not exist on arrival.** `cachedOrder(id)` reads only the full-read map, which `readOrder` alone fills, so on the ordinary list-to-detail path it is empty until the read answers, and the element focus must land on would not exist. Order detail now falls back to `cachedOrders()` (the order list's read) for the number and title only. The asset and governing-document sections render only once a full read is held, so no empty ASSETS label ever stands for an empty list. That cache holds only orders the account owns, so painting from it reveals nothing about an unowned id. Commit `b22eaaa`.

## Assumptions and interpretations

- **Asset name.** `OrderAsset` is `Machinery & { observation_ids }` and has no `name` field. The asset row's `object-title` renders `description` (for example "Transfer set C — standby").
- **Tag case.** The KKS tag renders byte-exact from the record. The fixture tags are already uppercase, so no `text-transform` is declared.
- **Spacing between ELAPSED and the figure.** The plan directs `--space-8`, and the UI-SPEC §Spacing Scale licenses `--space-8` inside a block. The UI-SPEC's Surface 3 budget table charges 4 px at that point (`17 + 4 + 17 + 8 + 51 …`). The plan was followed, so **plan 04-12 should expect a clock block of 303 px rather than the table's 299 px.**
- **Freshest anchor.** The clock prefers whichever of its own answer and the props arrived later, by the projection's monotonic instant. The props stand in until the clock has answered anything itself.
- **Refusal lifetime.** A tap refusal stays until the next answered tap, which clears it. A tap that gets no answer leaves the screen unchanged.
- **Re-anchor answers.** A refused or unanswered re-anchor read on a visible tab changes nothing and adds no sentence.
- **Section labels** are `<h2 className="label …">`, following the Gate's precedent for a `label`-role heading.

## For plan 04-11 (the switcher)

- On a cold deep link with nothing cached, OrderDetail renders `null` until `readOrder` answers, so `#screen-title` appears only after that read. The switcher's focus-to-heading move must run once the heading exists, not only on the screen-key change.
- OrderDetail renders its own `<main aria-labelledby="screen-title">`. The `<header>` with Back and the account name (Surface 3 item 1) is the switcher's to render.

## Follow-ups found, not fixed

- **Status regions mounted with their content.** `ConflictCard` with `announce` (from 04-08) mounts `<div role="status">` together with its content, and Clock's non-conflict refusal follows the same shape. Some screen readers do not announce content that arrives together with a new live region. Plan 04-13's device pass should confirm the announcement on VoiceOver and TalkBack. This is not changed here because the card's props may not be widened. It is recorded only in this SUMMARY, because the plan's file list does not include `deferred-items.md`.
- **A repeated identical refusal is not re-announced.** The text does not change, so tapping CLOSE twice on a closed order announces `not_open` only once.

## Issues Encountered

- `components/order/` did not exist, and the first write failed until the directory was created. There were no other problems: every check passed on its first run.

## Known Stubs

None. Every rendered value comes from the projection or the server's answer.

## State updates

At the orchestrator's direction, this run did not modify `.planning/STATE.md` or `.planning/ROADMAP.md`, and did not mark the requirements complete in `REQUIREMENTS.md`. The orchestrator owns those updates.

## Next Phase Readiness

Both surfaces compile, lint clean and pass the primitives sweep, but neither is reachable yet. Plan 04-11's switcher renders OrderDetail with `{ account, orderId, onRefused }`. Rendered geometry, the 130 × 130 rest-and-pressed measurement and the refusal announcement are plan 04-12's to assert. The hidden-tab re-anchor and the haptic are plan 04-13's device pass.

## Self-Check: PASSED

All four created files and this SUMMARY exist on disk, and commits `94207a0`, `817b810` and `b22eaaa` are present in `git log`.
