---
phase: 04-shell-gate-orders-clock-online
plan: 10
subsystem: ui
tags: [react, nextjs, css-modules, fr-58, provenance, accessibility]

# Dependency graph
requires:
  - phase: 04-03
    provides: lib/client/clock.ts (segmentRows, formatInstant, formatDuration, SourceMark/SourceWord)
  - phase: 04-04
    provides: lib/client/projection.ts (readHours, readOrder, cachedClock and the three-way Outcome)
  - phase: 04-05
    provides: components/marks/StateMark.tsx and components/rows/Row.tsx
  - phase: 04-06
    provides: scripts/check-primitives.mjs, the D-07 sweep this surface passes
provides:
  - "components/time/TimeOnOrder.tsx: Surface 4, the accrued record in full (clock-level block, time-zone statement, FR-58's limitation above the segments, one Row per segment, the empty state)"
  - "components/time/TimeOnOrder.module.css: wrapping term/value pairs and the segment rhythm"
affects: [04-11 switcher (renders TimeOnOrder with account, orderId, onRefused), 04-12 C3 reflow assertion, phase 6 sync screen (closes the no-answer and D-04 gaps)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Answer held with the id it was read for (forId), so an id-only transition never paints one order's record under another's"
    - "useEffectEvent wraps the parent's onRefused so a re-rendered parent cannot re-issue the reads"
    - "A refusal crosses to the switcher only when its code is a ConflictCode; a transport refusal renders the server's own detail sentence in place"

key-files:
  created:
    - components/time/TimeOnOrder.tsx
    - components/time/TimeOnOrder.module.css
  modified: []

key-decisions:
  - "READ AT renders only once this surface's own read has returned; it is absent from the cached paint because the cached anchor is a monotonic reading and converting it to a wall instant would drift across device sleep"
  - "A refusal whose code is not a ConflictCode (no_session) renders the envelope's detail sentence under the heading rather than calling onRefused, whose type admits only conflict codes"
  - "The segment row's 16 px padding budget is composed as the Row shell's --space-12 plus an inner --space-4 on the dl, as Row.module.css directs, without widening Row's props"

patterns-established:
  - "Provenance surface: render the clock module's pairs by value kind (mark, instant, figure, word) and re-derive nothing at the call site"

requirements-completed: [REQ-FR-58, REQ-NFR-6, REQ-NFR-2]

# Metrics
duration: 16min
completed: 2026-10-04
---

# Phase 4 Plan 10: The Time-on-Order Surface Summary

**Surface 4 renders an artisan's accrued record field by field from `segmentRows`: ACCRUED from the server's `elapsed_s`, FR-58's no-contest limitation above the list, one `Row` per segment with a SERVER-STAMPED filled square or a DEVICE-CLAIMED hollow-square-dot, device pairs only where the record carries them, and an empty sentence gated on the ownership read.**

## Performance

- **Duration:** about 16 min
- **Started:** 2026-10-04T20:13Z (approximate; HEAD was 85c3ae9 at 20:16Z when reading began)
- **Completed:** 2026-10-04T20:30Z
- **Tasks:** 2 of 2
- **Files created:** 2

## Accomplishments

- `components/time/TimeOnOrder.tsx` (273 lines) owns its `<main aria-labelledby="screen-title">` and one `<h1 id="screen-title" tabIndex={-1}>` reading "Time on this order", then the clock-level `<dl>` (ACCRUED through `formatDuration`, READ AT as a `<time>`), the time-zone statement at `label`, FR-58's stated limitation at `prose-sm`, and an `<ol>` of `Row as="li"` segment rows whose `<dl>` pairs come straight from `segmentRows`.
- Both reads run in one effect keyed on the order id, with every `setState` in the `await` continuation. `readOrder` decides whether the surface may speak about the id at all; the empty sentence renders only when that read answered `ok` and `readHours` answered `ok` with no matching clock (T-04-02).
- A `no-answer` from either read keeps the cached paint from `cachedClock(orderId)` and adds no sentence, which is the UI-SPEC's recorded gap for a transport failure with no envelope.
- `components/time/TimeOnOrder.module.css` lays each pair out with `display: flex; flex-wrap: wrap; gap: var(--space-8)`, separates segment rows with `var(--row-gap)` on one line, and carries the comment explaining why a two-column grid would force the horizontal scroll SC 1.4.10 forbids.

## Task Commits

1. **Task 1: TimeOnOrder.tsx, the record in full, the limitation above it, and the empty state** - `9b5d1f5` (feat)
2. **Task 2: TimeOnOrder.module.css, wrapping pairs that reflow rather than scroll sideways** - `625f0b1` (feat)

**Plan metadata:** recorded in the docs commit that adds this file.

## Files Created/Modified

- `components/time/TimeOnOrder.tsx` - Surface 4: the two reads, the refusal and no-answer paths, the clock-level block, the limitation, the segment rows and the empty state.
- `components/time/TimeOnOrder.module.css` - the `<main>` padding, the wrapping pair lines, the dt/dd inks, the section gaps and the composed segment-row padding.

## Verification

The executor stopped on a 600-second stream watchdog after both task commits had landed,
partway through writing this file. Everything below was measured by the orchestrator on
the tree at `2e7e859`, after all four wave-4 plans had committed. None of it is quoted from
the executor's log.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint components/time` (with every other wave-4 path) | exit 0 |
| `node scripts/check-primitives.mjs` (committed sweep) | `Problems: 0` |
| `check-governed`, `check-tokens`, `check-contrast`, `claims-audit` | all exit 0 |
| `node --test "lib/**/*.test.mjs"` | 225/225 |
| `node --test "scripts/**/*.test.mjs"` | 339/339 |

Every literal acceptance grep in the plan, as run:

| Criterion | Count |
|---|---|
| `next/link\|useRouter\|router\.push\|fetch\(` in the `.tsx` | 0 |
| `\{orderId\}\|\{props\.orderId\}` | 0 |
| `segmentRows` | 2 (import line plus one use; see below) |
| `getTime\(\)\|Date\.parse\|new Date\(.*\) *-` | 0 |
| `readOrder` | 2 (import line plus one use) |
| `onRefused` | 3 |
| `<time` | 1, and it carries `dateTime` |
| `flex-wrap: *wrap` in the module | 1 |
| `grid-template-columns` | 0 |
| `row-gap` | 1 |
| the banned-token grep, `@media` included | 0 |
| the hex / `rgb(` / `font-*` grep | 0 |

**The two "is 1" criteria read 2.** `grep -c` counts the import line, so a named import
plus one call site reads 2. All four wave-4 plans read these criteria the same way, as
the orchestrator directed: the name is used once and nothing is re-derived at the call
site. `segmentRows` is called once (line 240) and `readOrder` once (line 137). The one
`<time>` element sits in the `Moment` helper, so every rendered instant carries `dateTime`.

## Deviations from Plan

Two interpretations, neither of which narrows the plan:

1. **A refusal that is not a `ConflictCode` stays on this surface.** `onRefused`'s type
   admits only conflict codes, so a transport refusal such as `no_session` renders the
   envelope's own `detail` under the heading and does not cross to the switcher. A
   conflict refusal (`order_not_found`, `account_mismatch`) still goes through
   `onRefused`, so D-02's deep-link behaviour holds.
2. **READ AT is absent from the cached paint.** It renders only once this surface's own
   read has returned. The cached anchor is a monotonic reading, and turning it into a wall
   instant would drift across device sleep.

The segment row's 16 px padding is composed from the `Row` shell's `--space-12` plus an
inner `--space-4`, as `Row.module.css` directs. `Row`'s props were not widened.

## Issues Encountered

The executor's stream stalled after `625f0b1`, and three sibling executors in this wave
stalled the same way at different points. No project process was hung: every live
`node.exe` was an MCP server from an earlier session. The orchestrator completed this
file and ran the checks above. No code was changed after the executor's last commit.

## For the phase verifier

- **Segment pair order.** This surface renders whatever `segmentRows` returns: SOURCE,
  STARTED, DEVICE CLAIMED, MEASURED OFFSET, ENDED. That matches this plan's own interface
  block. The open question carried since 04-03 is between that order and UI-SPEC
  Decision 2's field table, which lists `closed_at` earlier. It is not a defect of this
  plan.
- **The ownership read gates the empty sentence (T-04-02).** If `readOrder` returns
  `no-answer` and the hours answer holds no clock for the id, the surface keeps the cached
  paint and says nothing. It never says "no time recorded" about an id the server has not
  confirmed.

## Next Phase Readiness

Plan 04-11's switcher can render `<TimeOnOrder orderId={...} onRefused={...} />` directly.
The surface owns its `<main>` and its `<h1 id="screen-title" tabIndex={-1}>`, so the
switcher's focus effect has a target.

## Self-Check: PASSED

Both task commits exist (`9b5d1f5`, `625f0b1`). Both files exist at the paths above. Every
check in the Verification table was re-run by the orchestrator on the committed tree.
