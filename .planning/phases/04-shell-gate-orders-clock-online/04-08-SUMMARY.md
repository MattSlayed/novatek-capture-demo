---
phase: 04-shell-gate-orders-clock-online
plan: 08
subsystem: ui
tags: [conflict-card, tinted-callout, order-list, d-02, refusal-slot, bottom-band]

# Dependency graph
requires:
  - phase: 04-03
    provides: "`lib/copy/conflicts.ts` with `CONFLICT_COPY` — the conflict table's own sentences, which the order list's refusal renders and never composes"
  - phase: 04-04
    provides: "`lib/client/projection.ts` — `cachedOrders`, `readOrders`, `endSession` and the three-way `Outcome<T>`"
  - phase: 04-05
    provides: "the `Row`, `SecondaryControl` and `StateMark` primitives, consumed with their props unchanged"
  - phase: 04-06
    provides: "`scripts/check-primitives.mjs`, the D-07 sweep both new modules are held to"
provides:
  - "`components/conflict/ConflictCard.tsx` + `.module.css` — the tinted-callout anatomy, two zones, no action row; consumed unchanged by plan 04-09's clock refusal"
  - "`components/orders/OrderList.tsx` + `.module.css` — Surface 2: the heading, the refusal slot, one row per order, the bottom band; rendered by plan 04-11's switcher"
affects: [04-09, 04-11, 04-12, phase-06-conflict-cards]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Paint `cachedOrders()` as the lazy initial state, then `readOrders()` in an effect whose setters run in the await continuation"
    - "One `.stack` rule carries `--row-gap` for every row list and button band on a surface, so the gap is declared once"
    - "A primitive with no `className` prop is spaced by a wrapper element in the consumer's module, never by widening its props"

key-files:
  created:
    - components/conflict/ConflictCard.tsx
    - components/conflict/ConflictCard.module.css
    - components/orders/OrderList.tsx
    - components/orders/OrderList.module.css
  modified: []

key-decisions:
  - "The conflict card is one bordered box: the 1 px --control-border surround, the 3 px full-tone --dk-warn left edge, the radius and the clip all sit on the box that holds both zones"
  - "The session-end control tells the switcher only on an ok outcome; a no-answer ended no session, so the gate is not shown over a credential still in force"
  - "A refused readOrders renders the envelope's own detail in the refusal slot; a no-answer keeps the cached paint and renders no sentence (the recorded Phase 6 gap)"

requirements-completed: [REQ-NFR-2, REQ-NFR-6]

# Metrics
duration: "about 4 minutes between the first and last task commit; the start time was not recorded"
completed: 2026-10-04
---

# Phase 4 Plan 08: the conflict card and the order list Summary

**A two-zone tinted-callout `ConflictCard` with its below-floor border corrected at source, and the order list that renders a refused deep link from the conflict table's own sentence above the artisan's own orders, each row a whole-area button carrying only number, title and status word.**

## Performance

- **Duration:** the three task commits span 20:25:56Z to 20:29:17Z on 2026-10-04; the plan's start time was not recorded in this run
- **Completed:** 2026-10-04 (task commits); this summary was written on 2026-10-05
- **Tasks:** 3 of 3
- **Files created:** 4

## Accomplishments

- `components/conflict/ConflictCard.tsx` renders the filled diamond and the conflict code (DOM text left as the code, uppercased by CSS) in a `--tint-warn-head` head, and the sentence it is given at `prose-sm` in an untinted `--panel-solid` body. It composes no sentence, has no action row, and puts `role="status"` on a wrapping slot only when `announce` is true. Its header comment states the general action-row rule Phase 6 consumes.
- `components/conflict/ConflictCard.module.css` draws the surround in `--control-border`, not the translucent tone border DESIGN.md still states. Its header records the 2.003:1 arithmetic, that the exemption register is closed at four entries, that the card is read by its 3 px full-tone left rule, and that the correction must be carried back into DESIGN.md before Phase 6 renders twelve of these cards.
- `components/orders/OrderList.tsx` is a client component that owns `<main aria-labelledby="screen-title">` with one `<h1 id="screen-title" tabIndex={-1}>` reading *Your work orders*. Directly after the heading it renders a `ConflictCard` (no `announce`) carrying `CONFLICT_COPY[refusal.code].sentence` whenever `refusal` is non-null. Each order is a `Row` in its button form whose press calls `goTo("order", order.id)`. The bottom band holds two `SecondaryControl`s: *Read the full preview limits*, which calls `goTo("limits")`, and *End this session and choose a different artisan*, which calls `endSession()`. Neither control has a second step.
- `components/orders/OrderList.module.css` declares `--row-gap` exactly once, on a shared `.stack` rule that both the row list and the band use. It sets `--space-24` after the heading, `--space-16` after the refusal, `--space-32` before the band and Limits' `<main>` padding figure, plus the row's inks: the number and status word in `--viewer-ink-dim`, the title in `--viewer-ink`, and the status uppercased.

## Task Commits

1. **Task 1: ConflictCard, the tinted-callout anatomy with the action row omitted.** Commit `37954e8` (feat).
2. **Task 2: OrderList.tsx, the artisan's own orders, the refusal slot and the bottom band.** Commit `7652f27` (feat).
3. **Task 3: OrderList.module.css, the row list, the one row-gap and the bottom band.** Commit `437c9b1` (feat).

The plan metadata commit is the one that adds this file.

## ConflictCard's props contract, verbatim, for plan 04-09

```ts
export type ConflictCardProps = {
  code: ConflictCode;
  sentence: string;
  announce?: boolean;
};

export function ConflictCard({ code, sentence, announce }: ConflictCardProps)
```

`ConflictCode` is imported as a type from `@/lib/data/types`. This matches the plan's `<interfaces>` block exactly. The component takes no `className`, so a consumer spaces it with a wrapper element in its own module, as `OrderList` does.

`OrderList`'s props are `{ account: Artisan; refusal: { code: ConflictCode; sentence: string } | null; onSessionEnded: () => void }`, also exactly as the plan's interface states.

## Verification

All of the following were run in this session on the committed files. Per the orchestrator's instruction, none was re-run while this summary was written.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint components/conflict components/orders` | exit 0, with no `react-hooks/set-state-in-effect` or `react-hooks/refs` finding |
| `node scripts/check-primitives.mjs` | exit 0, `Problems: 0`. On both the Task 1 run and the final run the sweep was committed: the last commit touching it was `41decc4`, and `git status --short scripts/` showed no change to it at the final run |
| `node scripts/check-contrast.mjs` | exit 0 |
| `node scripts/check-tokens.mjs` | exit 0 |
| `node scripts/check-governed.mjs` | exit 0 |
| `node scripts/claims-audit.mjs` | exit 0 |
| `node scripts/verify.mjs` | not run, per the orchestrator's instruction (the full gate runs after the wave) |

### Literal acceptance greps, with their counts

| File | Grep | Count | Required |
|---|---|---|---|
| ConflictCard.module.css | `0\.3\|alpha` | 0 | 0 |
| ConflictCard.module.css | `control-border` | 3 | at least 1 |
| ConflictCard.module.css | `overflow: *hidden` | 1 | 1 (see Deviation 1 for which rule carries it) |
| ConflictCard.tsx | `"[A-Z][a-z].*\."\|sentence:\s*"` | 0 | 0 |
| ConflictCard.tsx | `role="status"` | 1 | 1, conditional on `announce` |
| ConflictCard.tsx | `OK\|Dismiss\|Got it` | 0 | 0 |
| ConflictCard.tsx | `CONFLICT_COPY` (the key_link pattern) | 1 | present; it is in the header comment, and the component does not import the module |
| ConflictCard.module.css | `44px\|target-min\|130px\|target-record\|:focus\|transition\|position: *(fixed\|sticky)\|space-20\|space-40\|rule-faint` | 0 | 0 |
| ConflictCard.module.css | `#[0-9a-fA-F]{3,8}\|rgba?\(\|font-(size\|family\|weight)` | 0 | 0 |
| OrderList.tsx | `next/link\|useRouter\|router\.push\|fetch\(` | 0 | 0 |
| OrderList.tsx | `CONFLICT_COPY` | 2 | "1"; see the interpretation below |
| OrderList.tsx | `rbac_tier\|employee_no\|description\|priority\|due_by\|zone_id` | 0 | 0 |
| OrderList.tsx | `StateMark` | 0 | 0 |
| OrderList.tsx | `are you sure\|confirm` | 0 | 0 |
| OrderList.tsx | a string literal ending in a full stop (`"[^"]*\."`) | 0 lines | none outside a comment |
| OrderList.tsx | `readOrders` / `goTo` (key_link patterns) | 2 / 3 | present |
| OrderList.tsx | line count | 119 | at least 70 |
| OrderList.module.css | `row-gap` | 1 | 1 |
| OrderList.module.css | the forbidden-token grep above | 0 | 0 |
| OrderList.module.css | the colour and font grep above | 0 | 0 |

**How the `CONFLICT_COPY` count is read.** `grep -c "CONFLICT_COPY" components/orders/OrderList.tsx` returns 2. One line is the named import (`import { CONFLICT_COPY } from "@/lib/copy/conflicts";`) and the other is the single use, `CONFLICT_COPY[refusal.code].sentence`. All four wave-4 agents read the criterion the same way: the name is used once and the sentence is never restated. The comments deliberately say "the conflict table's own sentence" rather than the identifier, so the count is not inflated further.

## Decisions Made

- **The card is one box.** DESIGN.md's tinted-callout spec gives one box a border, a 3 px `border-left` and a radius. UI-SPEC's budget of 2 border + head 49 + body 79 = 130 px counts a single surround around both zones. So `.card` carries the `--control-border` surround, the 3 px `--dk-warn` left edge (which UI-SPEC measures against the page ground, 10.04:1), `--radius-card`, the clip and `--viewer-ink`. `.head` carries the tint, the 16 px padding and the uppercase. `.body` carries `--panel-solid` and the 16 px padding.
- **The code is the StateMark's word.** `StateMark` already renders its word at the `label` role and inherits the consumer's ink, so `<StateMark mark="filled-diamond" word={code} />` puts the code at `label` in `--viewer-ink`, and the head's `text-transform: uppercase` reaches the word through inheritance. No mark geometry is declared outside `StateMark.module.css`.
- **The session end waits for an answer.** `onSessionEnded()` is called in the await continuation only when `endSession()` returns `{ kind: "ok" }`. A no-answer means the DELETE never landed and the credential is still in force, so showing the gate would be false. The no-answer path renders no sentence, which is UI-SPEC's recorded Phase 6 gap.

## Deviations from Plan

### Interpretations and adjustments (no auto-fixed bugs)

**1. `overflow: hidden` sits on the card box, not on the head rule.**
- **Found during:** Task 1.
- **Issue:** the acceptance line reads "`overflow: *hidden` is 1, on the head". In the anatomy, though, the radius sits on the box that encloses both zones (see the one-box decision above). A clip declared on the head alone would round only the head's own box, not keep the tint inside the card's corners.
- **Resolution:** declared once on `.card`, the box that owns the radius, so the head's tint follows the top corners. The count is 1 as required.
- **Commit:** `37954e8`.

**2. `--space-4` between a row's lines is not restated in `OrderList.module.css`.**
- **Found during:** Task 3.
- **Issue:** the action lists "`--space-4` between the two lines inside a row". `components/rows/Row.module.css` already declares `gap: var(--space-4)` on the row shell, and Task 3's `read_first` names that module so that this one does not repeat it.
- **Resolution:** the gap comes from the row primitive. The three spans are flex items of the button's column, so each sits on its own line at that gap.
- **Commit:** `437c9b1`.

**3. The row list is a `div`, not a `ul`.**
- **Found during:** Task 2.
- **Issue:** `Row`'s `li` form is non-interactive, and a `<button>` nested inside an `<li>` shrinks to fit its content instead of filling the content width that UI-SPEC specifies.
- **Resolution:** the `Row` buttons are direct children of the `.stack` flex column, so they stretch to content width. The SecondaryControls in the band work the same way. No primitive props were widened.

**4. A refused `readOrders` renders the envelope's `detail` in a plain paragraph.**
- **Found during:** Task 2.
- **Issue:** the plan says "Where a response arrives, render its envelope's `detail`" but names no element for it. The refusal codes this read can return (for example `no_session`) are transport codes rather than `ConflictCode`s, so they cannot go through `ConflictCard`.
- **Resolution:** a `<p className="prose">` in the refusal slot, using the same `--space-16` margin, with no role. An empty `detail` renders nothing. On `no-answer`, the cached paint stays and no sentence renders.

**5. Two props are accepted but not rendered.**
- `account` is part of the contract, but the account name is the header's to render (plan 04-11), so `OrderList` does not destructure it.
- `refusal.sentence` is accepted, but the plan directs the card to carry `CONFLICT_COPY[refusal.code].sentence`, so the module's own sentence is what renders. By construction it equals the server's `order_not_found` detail.

**Total deviations:** five interpretations, none of which changes a props contract or adds an allowlist entry. **Impact:** none on scope.

## Issues Encountered

- `OrderList.module.css`'s first draft returned a `row-gap` count of 2, because its header comment used the token's name. The comment was reworded to "One gap between rows" before the Task 3 commit, and the count is 1.
- Commit `7652f27` (Task 2) imports `./OrderList.module.css`, which only landed in `437c9b1` (Task 3). `npx tsc --noEmit` passed at `7652f27` through the wildcard CSS-module typing, but `next build` at that single commit would not resolve the import. The tip of the plan is whole.

## Known Stubs

None. The two unauthored states, zero work orders and a transport failure with no envelope, are deliberate UI-SPEC decisions recorded in the component's header comment, not placeholders.

## Follow-ups (not fixed here)

- **The clock's announced card.** `ConflictCard` with `announce` puts `role="status"` on a slot that mounts together with its content. That is the plan's design, and plan 04-09 renders the card only on a refusal. A live region inserted with its content already present is announced inconsistently by some screen readers, so plan 04-12's rendered checks should confirm the clock refusal is actually spoken.
- **DESIGN.md correction.** The tinted-callout border correction still has to be carried back into DESIGN.md before Phase 6, as the module header and UI-SPEC both record.

## User Setup Required

None.

## Next Phase Readiness

- Plan 04-09 can import `ConflictCard` with the props type above and pass `announce` and the envelope's `detail`.
- Plan 04-11's switcher can render `<OrderList account={...} refusal={...} onSessionEnded={...} />`. It owns the header, the focus move to `#screen-title`, and the `replaceState` to `?s=orders` on a refused deep link.

## Self-Check: PASSED

- FOUND: `components/conflict/ConflictCard.tsx`, `components/conflict/ConflictCard.module.css`, `components/orders/OrderList.tsx`, `components/orders/OrderList.module.css`. All four were listed in `git log` for the task commits.
- FOUND: commits `37954e8`, `7652f27` and `437c9b1`, each shown by `git log -3 -- components/conflict components/orders` in this session.
