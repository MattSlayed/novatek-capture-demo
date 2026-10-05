---
phase: 04-shell-gate-orders-clock-online
plan: 12
subsystem: testing
tags: [playwright, axe-core, wcag, focus-management, session, check-wcag]

# Dependency graph
requires:
  - phase: 04-shell-gate-orders-clock-online
    provides: "04-11's switcher (components/shell/Screen.tsx), which wires the gate, order list, order detail, time surface and Limits onto `/`; 5f90cd1's focusable Limits heading"
provides:
  - "scripts/check-wcag.mjs mints a session through page.request.post and scans the five C7 surfaces: / before the mint, the other four after it"
  - "a heading-text wait on #screen-title before axe runs, naming expected and found headings on mismatch"
  - "PRE_MINT_EXPECTED_401_PATHS: a one-entry, URL-matched, pre-mint-only exemption for the switcher's by-design GET /api/session 401, with a non-vacuity assertion"
  - "per-load GET /api/session counts in the run output"
  - "C1 (44 x 44 at 390/360/320 px), C2 (exact 130 x 130 at rest and pressed), C3 (one-axis scroll at 320 px), C5 (one h1#screen-title, labelled main), C8 (ribbon ancestry walk)"
  - "the C6 focus matrix: twelve driven transitions with focus parked first, including order(A) -> order(B), orders -> limits and the disclosure reopen's h2"
  - "the SC-1 X-CAP-Account assertion on GET /api/orders"
affects: [phase-04-verification, phase-05-armed-accept, check-wcag]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session establishment through page.request, whose cookie jar the page shares; no Set-Cookie parsing"
    - "Console-error exemptions matched on ConsoleMessage.location().url, never on message text alone, scoped to a named phase of the run"
    - "Focus assertions park focus on a rendered button (or the body) before driving the transition"

key-files:
  created: []
  modified:
    - scripts/check-wcag.mjs

key-decisions:
  - "The 401 exemption lives in check-wcag.mjs, not harness.mjs: a second console listener records text plus location URL, and each exempt record pardons exactly one identical harness entry"
  - "Console errors are now checked per scan (sliced from the scan's start), not from the never-cleared harness array, which is why the old run reported /'s 401 again under /?s=limits"
  - "C1 runs at three widths (the pinned 390 px, plus the 360 px and 320 px UI-SPEC C1 names) because the plan's Task 2 text says 390 and 320 while its must_haves and the UI-SPEC say 360 and 320"
  - "C6 runs in its own fresh browser context so it starts with no session and no disclosure flag; it asserts focus only, not console errors"
  - "The order(A) -> order(B) transition is driven by history.pushState from the page, the same call lib/client/navigate.ts's goTo makes, because no Phase 4 control moves directly between two orders"

patterns-established:
  - "A scan proves which screen it is on (heading text) before any count-based assertion runs, and skips the rest when it is on the wrong screen"
  - "Every new assertion was proved to fire by injecting a violation into a synthetic page and running the real function text against it"

requirements-completed: []  # pending the orchestrator's real run; the plan's set is REQ-NFR-2, REQ-NFR-4, REQ-NFR-6, REQ-FR-48a, REQ-FR-58

# Metrics
duration: 16min
completed: 2026-10-05
---

# Phase 4 Plan 12: check-wcag session, five surfaces and invariants C1-C8 Summary

**`scripts/check-wcag.mjs` now mints an acc-mabaso session through `page.request.post`, scans all five C7 surfaces once each has rendered its own heading, and asserts target size, the exact 130 px clock box, one-axis reflow, heading structure, ribbon ancestry and focus after twelve driven transitions. The real run is pending the orchestrator.**

## Status of the real run

This plan's real-run criteria have **not** been run by this executor, by the orchestrator's instruction (long, memory-heavy, and at risk of the 600-second stream watchdog). They are pending the orchestrator's run:

- `timeout 900 node scripts/check-wcag.mjs > scripts/.check/04-12-wcag.log 2>&1` exits 0 and the log names all five surfaces (Task 1, Task 2).
- The grouping-break experiment exits non-zero and names the heading mismatch (Task 1; the exact edit is below).
- `timeout 1200 node scripts/verify.mjs > scripts/.check/04-12-verify.log 2>&1` exits 0 (Task 3).
- axe reporting zero A/AA violations on all five surfaces, and every C1/C2/C3/C5/C6/C8 assertion holding on the real build.

What this executor did run, with results seen in this session: `node scripts/check-wcag.mjs --self-test` exited 0 after each task; `npx eslint scripts/check-wcag.mjs scripts/lib/harness.mjs` exited 0 after each task; `npx tsc --noEmit` exited 0 after each task; every literal acceptance grep (below); and synthetic-page probes for each new assertion (below).

## Performance

- **Duration:** about 16 min
- **Started:** 2026-10-05T06:07:29Z
- **Completed:** 2026-10-05T06:23:30Z
- **Tasks:** 3 of 3 written and committed
- **Files modified:** 1

## Accomplishments

- **Session and surfaces (Task 1).** `/` is scanned alone before the mint. The mint is an inline `page.request.post` to `/api/session` with exactly `{ persona_id: "acc-mabaso" }`; anything but 201 pushes a problem naming the status and skips the four authenticated scans. After it, `/?s=orders`, `/?s=order&id=wo-0142`, `/?s=time&id=wo-0142` and `/?s=limits` are scanned. Each scan waits for `#screen-title` to carry that surface's heading ("Choose an artisan", "Your work orders", the order's number and title from `GET /api/orders`, "Time on this order", "Preview limits") before axe runs, and on a mismatch it reports the expected and found heading and skips the surface's other assertions.
- **The 401 exemption.** `PRE_MINT_EXPECTED_401_PATHS = ["/api/session"]` is matched on the URL Chromium attaches to the console message (`location().url`), with the 401 status taken from Chromium's own message wording, the origin required to be the scanned server, and only on the pre-mint scan. The pre-mint scan also asserts at least one `GET /api/session` answered 401 was observed. Every scan prints its load's `GET /api/session` count and statuses.
- **Geometry (Task 2).** C1 measures every rendered `button`, `a`, `[role="button"]` and `[role="link"]` against 44 x 44 at 390, 360 and 320 px and fails if a surface has nothing to measure. C2 holds a pointer press on the clock control (`OPEN`/`CLOSE`/`REOPEN`), checks it really is `:active`, measures after 150 ms (longer than `--dur-press`), and releases off the control so no click fires; rest and pressed must equal 130 exactly, and a label change after the press is reported as the harness changing server state. C3 compares `document.scrollingElement.scrollWidth` with the client width at 320 px, after checking the client width really is 320. The header states the 200 % text-scale limit and names the device pass, 04-VALIDATION.md's Manual-Only Verifications row 4, as its owner.
- **Headings, ancestry and focus (Task 3).** C5 requires exactly one `h1#screen-title` and one `main[aria-labelledby="screen-title"]`. C8 walks from the ribbon's section up to the root and reports any `aria-hidden` on the way. C6 drives the matrix below in a fresh context. The orders response's `X-CAP-Account` header must equal `acc-mabaso`.

### The C6 transition matrix as implemented

Each step parks focus on the first rendered button (or the body when there is none), drives the transition, waits for the new screen's heading text, then waits up to 2 s for `document.activeElement.id` to be the target. A wrong screen stops the matrix; a focus miss is reported and the matrix continues.

1. gate -> order list (the persona door, a replace)
2. order list -> order detail (a push), on `wo-0142`
3. order detail -> time on this order (a push)
4. header back: time on this order -> order detail
5. header back: order detail -> order list
6. `history.back()`: order list -> order detail
7. order(A) -> order(B): `wo-0142` -> the second order `GET /api/orders` lists, only the id changes (a push via `history.pushState`)
8. header back: order detail -> order list
9. order list -> Limits (the foot control, a push). **Added beyond the plan's enumeration**, at the orchestrator's request, to prove 5f90cd1's fix.
10. `history.back()`: Limits -> order list
11. order list -> gate (ending the session). **Added**: it is a transition this phase has, and it is the only way back to the gate in the short form that the reopen needs.
12. the gate's disclosure reopen; focus must land on `#disclosure-title` (the `<h2>`), not the `<h1>`

## Task Commits

1. **Task 1: Session establishment and the five-surface list** - `ae36152` (feat)
2. **Task 2: C1, C2 and C3** - `5892200` (feat)
3. **Task 3: C5, C6 and C8** - `b4d6a52` (feat)

## Files Created/Modified

- `scripts/check-wcag.mjs` - session mint, five-surface scan list, heading wait, the pre-mint 401 exemption, per-load session-read counts, and C1, C2, C3, C5, C6, C8 plus the SC-1 header assertion. `scripts/lib/harness.mjs` was not modified.

## Literal acceptance greps (final file, run after Task 3)

| Pattern | Count | Criterion |
|---|---|---|
| `page.request.post` | 1 | at least 1, names `/api/session` (line 812) |
| `scanSurface(` | 6 | five call sites plus the definition |
| order of `scanSurface(` / `page.request.post` | `/` at 807, mint at 812, `/?s=limits` at 874 | `/` before the mint, `/?s=limits` after |
| `screen-title` | 19 | at least 1, used as the wait before axe |
| `process.exit(problems.length > 0 ? 1 : 0)` | 1 | still exactly 1 |
| `44` | 8 | width and height both compared (`r.width < min \|\| r.height < min`, min = 44) |
| `130` | 3 | exact equality (`m.w !== RECORD_BOX_PX \|\| m.h !== RECORD_BOX_PX`) |
| `scrollWidth` | 4 | at least 1 |
| `320` | 5 | the second width used by C1 and C3 |
| `activeElement` | 4 | at least 1, preceded by `parkFocus` |
| `aria-hidden` | 8 | an upward walk (`el = el.parentElement`) |
| `x-cap-account` (case-insensitive) | 4 | compared against `PERSONA_ID` (`acc-mabaso`) |
| `aria-labelledby` | 4 | at least 1 |

## The grouping-break experiment (for the orchestrator to run)

Move this line, currently line 874 inside the mint's success branch:

```js
        await scanSurface(page, rec, { path: "/?s=limits", heading: "Preview limits" });
```

to directly after line 807 (the `/` scan) and before the `/* The mint (T-04-26)` comment, at six spaces of indent. Then run `timeout 900 node scripts/check-wcag.mjs`. Expected: exit 1, with `/?s=limits: expected the #screen-title heading "Preview limits", found "Choose an artisan" — the surface did not render, or was scanned in the wrong session state; its other assertions were not run`, and also an unexempted `/?s=limits: unexpected console/page error — Failed to load resource: ... 401`, because that call does not carry `preMint: true`. Revert with `git checkout -- scripts/check-wcag.mjs`.

## Session reads per load

The run prints one line per scan, for example `/?s=limits: N GET /api/session on this load (statuses)`. From reading `components/shell/Screen.tsx` (not edited), each load should read the session **once**. For `/`, the resolution effect's first run sees no `s`, so it only replaces the URL to `?s=orders` and returns without reading; the key change then re-runs it once with a legal surface, and that run makes the one read. For `/?s=limits` and the other legal URLs, the first run reads once. React's development-only double effect run does not happen under `next start`.

The "two 401s on `/?s=limits`" in the orchestrator's earlier run came from the harness, not from `Screen.tsx`. The old scan read `page.__captureErrors` in full on every scan, and that array is never cleared, so the `/?s=limits` scan reported `/`'s 401 again alongside its own. Each scan now reads only the entries added during its own load. If the real run prints a count above one for any load, that would contradict this reading and is a question for 04-11, which owns `Screen.tsx`.

## Decisions Made

- The exemption is done inside `check-wcag.mjs`. A second `console` listener records each error's text plus `location().url`, and the scan pardons one identical `page.__captureErrors` entry per exempt record. A scratch probe in this session confirmed both mechanisms against a local server: a `Secure` cookie minted by `page.request.post` is sent by the page over `http://127.0.0.1`, and Chromium's 401 console message carries `location().url` = `http://127.0.0.1:<port>/api/session` while the harness's text has no URL.
- C1, C3, C5 and C8 run on all five scanned surfaces, Limits included. The UI-SPEC names "the four surfaces" for C3 and C8, and one loop over every scan is simpler than special-casing Limits. A Limits failure would be a real REQ-NFR-2 or REQ-NFR-7 defect anyway.
- A `networkidle` settle (bounded at 10 s, and not an assertion) runs after the heading wait so axe and the measurements see the surface's populated data, for example the order rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A narrow, named exemption for the by-design pre-mint 401**
- **Found during:** Task 1. The orchestrator measured this on `e9fb830`; the plan text did not anticipate it.
- **Issue:** With no session the switcher's `GET /api/session` answers 401. That is D-03's definite "no session" answer, and the route is frozen. Chromium logs every 4xx resource load as a console error, so the scan failed on `/` and `/?s=limits`.
- **Fix:** `PRE_MINT_EXPECTED_401_PATHS`, matched on the message's located URL, pre-mint scan only, with an assertion that at least one `GET /api/session` answered 401 was observed. After the mint, a 401 from any URL stays a defect.
- **Files modified:** `scripts/check-wcag.mjs` only. `harness.mjs` was not needed.
- **Committed in:** `ae36152`

**2. [Rule 1 - Bug] Console errors were re-reported on every later scan**
- **Found during:** Task 1
- **Issue:** The old scan read the whole never-cleared `page.__captureErrors` array, so one load's error was reported again on every later scan.
- **Fix:** Each scan slices from the array's length when its load started.
- **Committed in:** `ae36152`

**3. [Orchestrator-directed addition] `orders -> limits` in the C6 matrix** (step 9 above), proving 5f90cd1. Committed in `b4d6a52`.

**4. [Scope reading] C1 widths.** Task 2's action says 390 and 320 px; the plan's must_haves, the UI-SPEC's C1 and 04-VALIDATION.md say 360 and 320. All three widths are measured. Committed in `5892200`.

**5. [Addition] `order list -> gate (ending the session)`** in the C6 matrix (step 11 above). It is a transition this phase has, and the reopen needs it. Committed in `b4d6a52`.

**Total deviations:** 2 auto-fixed (one Rule 3, one Rule 1), 1 orchestrator-directed addition, 1 scope reading, 1 matrix addition.
**Impact on plan:** No surface file was touched. The exemption is the narrowest form the orchestrator specified.

## Issues Encountered

- The working-tree copy of `scripts/check-wcag.mjs` was CRLF (`core.autocrlf=true`, index LF), which Git Bash's `grep` hides. The first scripted edit matched nothing. Then a stale snippet from a failed command chain spliced the wrong replacement into the header. I restored the file with `git checkout -- scripts/check-wcag.mjs` (no other edits existed yet), made the splice helper line-ending aware, and redid both edits. A later `sed -i` normalised the working copy to LF; the index is LF, so commits are unaffected.
- The verification method for every new assertion: I extracted the real function text from the file and ran it against synthetic pages with injected faults. C1 caught a 40 x 40 button at all three widths. C3 caught a 600 px-wide element at 320 px. C2 caught a pressed box growing to 134 px and a 131 px rest box, and a page whose `onclick` would change the label proved the off-target release fires no click. C5 caught a duplicate `h1#screen-title` and an unlabelled `main`. C8 caught `aria-hidden` on the ribbon's parent. C6 caught a transition that left focus behind even when focus had started on the heading, which the parking step is what makes catchable, and stopped on a wrong screen. I deleted the probes afterwards; none is committed.

## Surface defects found by code-reading

None. The narrowest control on any surface is the header's "Back", which has 12 px of padding on each side, a 1 px border and its label, so it is wider than 44 px. No `<a>` exists outside the ribbon. The real run is where any axe, target-size, reflow or focus finding will appear. Route each one by the plan's table: 04-07 gate, 04-08 order list, 04-09 order detail and clock, 04-10 time surface, 04-11 switcher, header and focus effect.

## Known gaps, not defects of this harness

- A cold deep link to an order with nothing cached does not move focus. The C6 matrix starts from the order list, so it never drives that path.
- The served HTML for `/` has no `<main>` until the client's session read answers, which is why every scan waits on `#screen-title`.
- 200 % text scale is not emulated; the header assigns it to the device pass.

## User Setup Required

None. No external service configuration is required.

## Next Phase Readiness

The harness is complete pending the orchestrator's real `check-wcag` and `verify` runs. If either fails, the defect output goes back to this executor for harness defects, or to the owning surface plan for surface defects.

---
*Phase: 04-shell-gate-orders-clock-online*
*Completed: 2026-10-05 (real run pending)*

## Self-Check: PASSED

Both files exist (`scripts/check-wcag.mjs`, this SUMMARY) and all three task commits (`ae36152`, `5892200`, `b4d6a52`) are present in `git log`. The real `check-wcag` and `verify` runs are not part of this self-check; they are pending the orchestrator.

## Real run 1 (orchestrator, on 4a5addf): exit 1, fixed in fe37f5f

The orchestrator ran `node scripts/check-wcag.mjs` on `4a5addf`. It exited 1 with this output, verbatim:

```
Scanning (GET /api/session counts are the page's own reads):
  /: 1 GET /api/session on this load (401)
  /?s=orders: 1 GET /api/session on this load (200)
  /?s=order&id=wo-0142: 0 GET /api/session on this load (none)
  /?s=time&id=wo-0142: 1 GET /api/session on this load (200)
  /?s=limits: 1 GET /api/session on this load (200)

Problems: 3
  !  GET /api/orders answered 401 after the mint, not 200
  !  /?s=order&id=wo-0142: no expected heading — GET /api/orders did not list the order this surface shows, so the scan cannot prove what rendered
  !  C6: GET /api/orders listed 0 order(s) for acc-mabaso; the focus matrix needs wo-0142 and a second order to drive order(A) -> order(B), so it was not driven
```

**What it confirmed.** The pre-mint 401 exemption held, and so did its non-vacuity assertion. Every load that waited for its heading made exactly one `GET /api/session`, which confirms that the earlier double 401 came from the harness, not from `Screen.tsx`. No axe, C1, C3, C5 or C8 defect fired on the four scans that ran. C2 and C6 did not run.

**The one cause, which was in the harness.** The harness read the orders with `page.request.get`. The session cookie is `Secure` under `next start` (`lib/session/cookie.ts:154`). Playwright's request context does not send a `Secure` cookie over plain `http://127.0.0.1`, while the page does. So the page's own session reads answered 200 after the `page.request.post` mint, but the harness's own orders read answered 401. A scratch server reproduced it in this session: after the mint, `page.request.get` answered 401 and the page's `fetch` answered 200. My first probe had tested only the page half.

**Why order detail showed 0 reads.** The scan did navigate: `page.goto` runs before the heading check. With no expected heading it skipped the heading wait and counted reads at `domcontentloaded`, before the client had issued its session read. With the orders read fixed, the heading is known, the wait runs, and the count should be 1 like the others.

**The fix (`fe37f5f`).**
- The orders now come from the order list's own `GET /api/orders`. `page.waitForResponse` is registered before the `/?s=orders` scan navigates, and the body is read as soon as the response lands, while the page is still on the list.
- SC-1's `X-CAP-Account` comparison against `acc-mabaso` now runs on the very response the app rendered from. A non-200 after the mint is still reported as `GET /api/orders answered <status> after the mint, not 200`.
- A missing response is reported as its own problem.
- `page.request.post` remains the mint, and no route or cookie changed.

This departs from Task 3's wording ("read the two order ids from GET /api/orders through page.request"), at the orchestrator's direction.

**Checks after the fix, all run in this session.**
- A toy-server probe ran the committed capture text and returned `{status: 200, actingAccount: "acc-mabaso", orders: [...]}` when the page fetched, and `null` when it did not.
- `--self-test` exited 0, eslint exited 0 and `tsc --noEmit` exited 0.
- The literal greps are unchanged except for line numbers (`page.request.post` 1, `scanSurface(` 6, the exit line 1, and `page.request.get` now 0).
- The next real run is the orchestrator's.

## Real runs 2 and 3, and the full gate (orchestrator, on b677725)

All three runs below were made by the orchestrator on `b677725` (with `fe37f5f`'s fix). The
output is quoted from the captured logs under the gitignored `scripts/.check/`, not
paraphrased. An earlier attempt at run 2 was stopped mid-run by Claude Code because the
machine ran critically low on memory. It produced no result and is not counted. The
`next start` server it left on port 4311 was stopped before the next run.

**Real run 2 — `node scripts/check-wcag.mjs`: exit 0, `Problems: 0`.**
```
  /: 1 GET /api/session on this load (401)
  /?s=orders: 1 GET /api/session on this load (200)
  /?s=order&id=wo-0142: 1 GET /api/session on this load (200)
  /?s=time&id=wo-0142: 1 GET /api/session on this load (200)
  /?s=limits: 1 GET /api/session on this load (200)
Focus matrix (C6): 12 of 12 transitions landed focus on their target
```
Every load makes exactly one session read, including order detail now that its heading
wait runs. All twelve C6 transitions passed, among them `order(A) -> order(B)` (wo-0142 ->
wo-0151) and `order list -> Limits`, which proves the orchestrator's `5f90cd1` fix.

**Real run 3 — the grouping-break experiment: exit 1, as required.** The `/?s=limits` scan
was moved directly after the `/` scan, ahead of the mint. The run named the mismatch rather
than passing with five labels:
```
!  /?s=limits: expected the #screen-title heading "Preview limits", found "Choose an artisan" — the surface did not render, or was scanned in the wrong session state; its other assertions were not run
!  /?s=limits: unexpected console/page error — Failed to load resource: the server responded with a status of 401 (Unauthorized)
```
The second line shows the exemption holding its scope: that scan did not carry `preMint`,
so its 401 was reported, not excused. The edit was reverted with `git checkout --
scripts/check-wcag.mjs`, and `git diff` printed nothing afterwards.

**The full gate — `node scripts/verify.mjs`: exit 0, "All steps exited 0."** All 27 steps
ran: fixture-suite 339/339, unit-suite 225/225 and route-suite 16/16, and both `check-wcag`
steps passed, with 12 of 12 C6 transitions.

Every criterion that the "Status of the real run" section above marked pending is now
discharged.
