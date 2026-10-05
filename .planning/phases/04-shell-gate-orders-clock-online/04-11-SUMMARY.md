---
phase: 04-shell-gate-orders-clock-online
plan: 11
subsystem: ui
tags: [nextjs, react, client-component, useSearchParams, history-state, focus-management, suspense]

# Dependency graph
requires:
  - phase: 04-07
    provides: the gate (Gate, onEntered)
  - phase: 04-08
    provides: the order list (OrderList, refusal, onSessionEnded)
  - phase: 04-09
    provides: order detail and the clock (OrderDetail, onRefused)
  - phase: 04-10
    provides: the time surface (TimeOnOrder, onRefused)
provides:
  - components/shell/Screen.tsx, the Client Component switcher on the one route (the one parse point, the session gate, the four-way branch, the focus effect, the refusal state)
  - components/shell/Header.tsx and Header.module.css, the 56px header with the account name and an optional Back control
  - app/page.tsx wrapping the switcher in the unchanged Suspense boundary; the Phase 1 shell surface retired
  - check-deployment.test.mjs's fixture describing the gate instead of the retired shell
affects: [04-12, phase-5, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-state session value (unresolved, none, session) set only from a definite GET /api/session answer"
    - "Screen-resolution effect keyed on the screen key: normalise an illegal URL in the body, set state only in the await continuation"
    - "Focus effect whose whole body is the focus call, keyed on screenKey and the session's resolved state"

key-files:
  created:
    - components/shell/Screen.tsx
    - components/shell/Header.tsx
    - components/shell/Header.module.css
  modified:
    - app/page.tsx
    - components/shell/Ribbon.tsx
    - scripts/check-deployment.test.mjs

key-decisions:
  - "The session is re-read on every legal screen change, not only on mount, so an expired session shows the gate at the next transition (D-03); only a definite answer changes the state"
  - "A refused or unanswered session read leaves the state where it was; on a cold load that means no <main> and no sentence until a later screen change or a reload"
  - "The refusal is also cleared on gate entry and on session end, so one account's order_not_found card can never be shown to the next account"
  - "Header's height is a floor (min-height at the header-height token), so the band grows at 200% text instead of clipping"

patterns-established:
  - "Header slot rule: back only where the caller passes an in-app target; Phase 6's two slots absent from the DOM"

requirements-completed: [REQ-FR-48a, REQ-FR-58, REQ-NFR-2, REQ-NFR-6]

# Metrics
duration: 25min
completed: 2026-10-05
---

# Phase 4 Plan 11: The switcher, the header, and the retirement of the Phase 1 shell Summary

**`/` now switches its four surfaces by history state through one Client Component that reads the query once, gates every surface on the server's own session answer, and moves focus to `#screen-title` on a key that includes the order id; the Phase 1 shell heading is gone and the 56px header carries the acting account's name.**

## Performance

- **Duration:** about 25 min
- **Started:** about 2026-10-05T05:27Z (estimated from the previous commit; no start stamp was captured)
- **Completed:** 2026-10-05T05:50Z
- **Tasks:** 3 of 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `components/shell/Screen.tsx` is the one importer of `parseSurface` and `parseId` (invariant A17 holds; `grep -rln parseSurface app components` lists only this file). It renders nothing until `GET /api/session` gives a definite answer, the gate at every value of `s` with no session, and the four surfaces with a session.
- `components/shell/Header.tsx` renders the implicit banner landmark with an `sr-only` "Acting as" qualifier before the account name, and a `SecondaryControl` reading "Back" only on order detail and the time surface.
- `app/page.tsx` keeps its non-async Server Component and `<Suspense fallback={null}>`, now around the Client Component switcher, with no route-segment config export and no page-level cookie read.

## Task Commits

1. **Task 1: Header.tsx and Header.module.css** - `4ce3fba` (feat)
2. **Task 2: Screen.tsx** - `2a00f03` (feat)
3. **Task 3: wire app/page.tsx, retire the shell, update the two dependent files** - `b7ab8d7` (feat)

**Plan metadata:** recorded in the docs commit that adds this file.

## Files Created/Modified

- `components/shell/Screen.tsx` (created, 218 lines): the switcher. Props: none (`export function Screen()`).
- `components/shell/Header.tsx` (created): `export type HeaderProps = { accountName: string; back?: { label: "Back"; onPress: () => void } };`
- `components/shell/Header.module.css` (created): layout and the name's ink only; the back control's size is the primitive's.
- `app/page.tsx` (modified): imports `Screen` from `components/shell/Screen.tsx`; the local async server `Screen` and the `searchParams` prop are gone.
- `components/shell/Ribbon.tsx` (modified, comment only): the stale promise that Phase 4 would replace the anchor is corrected; `href="/?s=limits"` is unchanged.
- `scripts/check-deployment.test.mjs` (modified, one line): `PASSING_BODY`'s `<main>` line is now `<main aria-labelledby="screen-title"><h1 id="screen-title" tabindex="-1">Choose an artisan</h1></main>`.

## How the switcher works

- **Session states.** `readSession()` returning `ok` with an account is a session; `ok` with `null` is no session (the gate renders); `refused` or `no-answer` changes nothing, so a cold load that gets one stays unresolved and renders no `<main>`.
- **Screen resolution.** One effect keyed on `[key, legal, surface]`. An illegal URL (absent or unknown `s`, or `order`/`time` with an id that fails the shape guard) is replaced to `?s=orders` in the effect body and the session is not read for it. A legal URL re-reads the session, and the await continuation clears the refusal when the surface is not the order list and sets the session on a definite answer.
- **Focus.** `useEffect(() => { document.getElementById("screen-title")?.focus(); }, [key, resolved]);` where `key = screenKey(surface ?? "", id ?? "")` and `resolved = session.kind`. It contains no `setState`.
- **Gate entry** re-reads the session, clears the refusal, sets the session and calls `replaceWith("orders")`. **Session end** clears the refusal and sets no session; the URL stays `?s=orders` because the gate is not an `s` value. **A refused deep link** stores the code and sentence and calls `replaceWith("orders")`.
- **Back** on order detail is `goTo("orders")`, and on the time surface it is `goTo("order", id)`. There are no `history.back` calls and no history listener of its own.

## Decisions Made

- **The session is re-read on each legal screen change.** The plan names a "screen-resolution effect" with an await continuation that clears the refusal. Keying that effect on the screen key and reading the session in it gives D-03's "or an expired one" at the next transition, at the cost of one `GET /api/session` per transition. A transition paints at once from the previous state, so the re-read never blanks a screen.
- **A non-definite session answer is not turned into "unresolved" after the first resolution.** Blanking a working screen because one session read got no answer would be worse than keeping it, and the surfaces' own reads handle their own failures.
- **No `key` on `OrderDetail`.** It already tracks an id change through its own `forId` field, so a remount would add nothing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] The refusal is also cleared on gate entry and on session end**
- **Found during:** Task 2
- **Issue:** The plan clears the refusal only when the current surface is not the order list. If an account ended its session while an `order_not_found` card was showing, the next persona would land on `?s=orders` with the previous account's card still in state.
- **Fix:** `enter()` and the session-end handler both call `setRefusal(null)`.
- **Files modified:** components/shell/Screen.tsx
- **Committed in:** `2a00f03`

**2. [Rule 3 - Blocking] `Page` drops its `searchParams` parameter, and the comment's typing note is rewritten**
- **Found during:** Task 3
- **Issue:** The plan says to stop threading `searchParams` into the child and also that lines 1 to 21 stay "in shape". Keeping the parameter after it stops being passed on would leave an unused binding, and the old comment's note about typing it as `Promise<{ s?: string }>` would describe a prop that no longer exists.
- **Fix:** `export default function Page()`. The non-async component, the `<Suspense fallback={null}>` boundary and its position are unchanged. The comment keeps its why-non-async paragraph and gains the Client Component explanation.
- **Files modified:** app/page.tsx
- **Committed in:** `b7ab8d7`

---

**Total deviations:** 2 auto-fixed (1 correctness, 1 blocking).
**Impact on plan:** both stay inside the plan's files and intent. No surface's or primitive's props were widened.

## Acceptance greps (literal counts, run before each commit)

- Header.tsx: `navigator\.onLine|online|offline|queue` 0; `sr-only` 1 (the qualifier reads `Acting as `); `rbac_tier|employee_no` 0.
- Header.module.css: `header-h` 1; `viewer-border` 1; `44px|target-min|:focus|transition|position: *(fixed|sticky)` 0.
- Screen.tsx: `next/link|useRouter|router\.push|useParams|addEventListener\("popstate"|export const instant` 0; `"use client"` 1; `screenKey` 2; `replaceWith` 4; `history.back` 0.
- Screen.tsx: `useSearchParams` is **2**, the import on line 4 and the one call on line 115. The plan's "is 1" is read the way the whole phase reads it, as "used once, never restated". There is no second call and no mention in a comment.
- `grep -rln parseSurface app components` lists only `components/shell/Screen.tsx`.
- app/page.tsx: `export const (instant|runtime|dynamic|revalidate|fetchCache)|cookies\(` 0; `Suspense` 5; `async function Screen` 0.
- check-deployment.test.mjs: `aria-label="Preview disclosure"` 3 before and 3 after; `href="/?s=limits"` 1 before and 1 after; `NOVATEK Capture` 1 before and 0 after.
- `git diff --stat components/shell/Ribbon.module.css` printed nothing, and the `Ribbon.tsx` diff is the one JSX comment.

## Verification run by this executor

All of these exited 0 and none hit a memory signature: `npx tsc --noEmit` (run after each task), `npx eslint components/shell app scripts/check-deployment.test.mjs`, `node scripts/check-primitives.mjs` (`Problems: 0`), `node scripts/check-governed.mjs`, `node scripts/claims-audit.mjs`, `node scripts/check-contrast.mjs`, and `node --test --test-concurrency=1 scripts/check-deployment.test.mjs` (7 tests, 7 pass, 0 fail). Logs are under the gitignored `scripts/.check/04-11-*.log`.

**Not run here, by the orchestrator's instruction:** this machine is short of memory, so `node scripts/verify.mjs`, `next build` and the whole test suite were left for the orchestrator's single gate run. The plan's Task 3 criteria that depend on them are **not yet discharged**: `next build` placing `/` at `○` or `◐`, `check-structure-build-output`, both `check-wcag` steps, and the full verify exit code. The Suspense boundary that `next build` requires around the query hook is present in `app/page.tsx`.

## Known Gaps (for the phase verifier)

1. **Limits' heading is not focusable, so `orders → limits` does not move focus.** `components/limits/Limits.tsx` line 15 renders `<h1 id="screen-title">` without `tabIndex={-1}`, and `focus()` on a non-focusable element does nothing. The order list's foot control reaches Limits with `goTo("limits")`, a history push, so after that transition focus stays on a control that has just been removed. The ribbon's own link is a full document load, where the browser's default focus applies. The fix is one attribute in a file outside this plan. 04-12's C6 matrix does not drive this transition.
2. **A cold deep link to `?s=order&id=…` with nothing cached does not move focus.** `OrderDetail` renders `null` until its `readOrder` answers, and the focus effect, keyed on the screen key and the resolved session, has already run before `#screen-title` exists. This happens only on a document load, where the browser's default focus applies. 04-12's C6 matrix never drives it, because each transition there starts from the order list, which caches each order's number and title, and `OrderDetail` falls back to those. `OrderDetail.tsx` was not edited. `TimeOnOrder` always renders its heading, so the gap is `OrderDetail`'s alone.
3. **An unresolved session stays unresolved with no retry.** If the first `GET /api/session` is refused or gets no answer, `/` shows only the ribbon until the next screen change (a browser back or forward) or a reload. The UI-SPEC's "transport failure with no error envelope" row is a recorded Phase 6 gap.
4. **The served HTML for `/` has no `<main>`.** The switcher renders nothing until the session read answers on the client, so the response body carries only the ribbon. The deployment fixture's `<main>` line shows the rendered gate, as the plan directs; `check-deployment.mjs` asserts nothing about `<main>`, only the ribbon landmark, the governed sentence and the absence of a dismiss-shaped control. This is also why the plan says `check-wcag` passing on `/` will not prove the gate conforms until 04-12 adds the `#screen-title` wait.

## Issues Encountered

None. No check needed a second run.

## User Setup Required

None. No external service configuration is required.

## Next Phase Readiness

- 04-12 can now point `check-wcag` at the five surfaces and drive the C6 transition matrix against the real switcher.
- The orchestrator's full `verify` run still has to confirm the build glyph for `/` and the `check-structure --build-output` pass.
- `REQUIREMENTS.md`, `STATE.md` and `ROADMAP.md` were not updated by this executor, per the orchestrator's instruction.

---
*Phase: 04-shell-gate-orders-clock-online*
*Completed: 2026-10-05*

## Self-Check: PASSED

All six plan files and this SUMMARY exist on disk, and commits `4ce3fba`, `2a00f03` and `b7ab8d7` are present in `git log`.

## Orchestrator addendum — the full gate, 2026-10-05

The orchestrator ran `node scripts/verify.mjs` once on `e9fb830`, after memory was freed
on this machine. **Steps 1–26 exited 0; step 27, `check-wcag`, exited 1.** So this plan's
Task 3 criterion that the full verify exits 0 with `check-wcag` passing on `/` and
`/?s=limits` is **not met**. It is open and assigned to plan 04-12.

Discharged by that run:
- `next-build` succeeded, and the route table shows `┌ ○ /`, a static route rather than `ƒ`.
- `check-structure-build-output`, `check-register-isolation-bundle`, `route-suite` (16/16),
  `fixture-suite` (339/339), `unit-suite` (225/225) and `check-contrast` all exited 0.

Not discharged — the three `check-wcag` defects, verbatim:
```
!  /: unexpected console/page error — Failed to load resource: the server responded with a status of 401 (Unauthorized)
!  /?s=limits: unexpected console/page error — Failed to load resource: the server responded with a status of 401 (Unauthorized)
!  /?s=limits: unexpected console/page error — Failed to load resource: the server responded with a status of 401 (Unauthorized)
```
No axe rule fired and no ribbon-contract defect was reported. The 401 is this plan working
as designed: with no session, the switcher's `GET /api/session` returns 401, the definite
"no session" answer D-03 requires, and Chromium logs every 4xx resource load as a console
error. The Phase 1 harness (`scripts/lib/harness.mjs`, `scripts/check-wcag.mjs`) counts
every console error outside favicon and DevTools noise as a defect, and it scans without a
session. Plan 04-12's plan text does not mention this 401. The orchestrator has briefed it
to add a narrow, named exemption: a 401 from `/api/session`, matched on the response or the
message's location rather than its text, and allowed only on scans made before the mint.
A 401 after the mint stays a defect.

`/` logged one 401 and `/?s=limits` logged two. Plan 04-12 is asked to count the
`GET /api/session` requests per load and explain any count above one, rather than leave
that to inference.

Gap 1 above (Limits' heading not focusable) was fixed by the orchestrator in `5f90cd1`.
Plan 04-12 adds `orders → limits` to its C6 transition matrix so the gate proves the fix.

**Discharged, 2026-10-05.** The full gate on `b677725`, after plan 04-12's harness, exited 0
at all 27 steps, `check-wcag` included. This plan's open Task 3 criterion is closed. See
04-12-SUMMARY.md, "Real runs 2 and 3, and the full gate".
