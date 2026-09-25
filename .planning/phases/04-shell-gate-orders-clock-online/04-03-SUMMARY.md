---
phase: 04-shell-gate-orders-clock-online
plan: 03
subsystem: ui
tags: [client-module, url-validation, history-api, shallow-routing, clock-interpolation, node-test, performance-now]

# Dependency graph
requires:
  - phase: 01-foundation-shell
    provides: "`?s=` as the screen key, the `limits` surface, and the type roles the clock's figure and the instants render at"
  - phase: 02-record-fixtures
    provides: "`OrderClock` and its two optional device fields in `lib/data/types.ts` — the record shape `segmentRows` maps"
  - phase: 03-routes-refusals
    provides: "the five endpoints that carry an `OrderClock`, and AD-4's byte-identical refusal that `parseId` deliberately does not pre-empt"
  - phase: 04-02
    provides: "`already_open` in the conflict table — the clock control's refusal copy resolves through it"
provides:
  - "`lib/client/` as a directory, populated and collected by `verify.mjs`'s existing `unit-suite` glob with no build plumbing added"
  - "`SURFACES`/`Surface` — the closed set of four surfaces, declared once"
  - "`parseSurface` and `parseId` — the only two guards between a crafted URL and a fetch"
  - "`screenKey` — the whole screen identity, so an id-only transition is a different screen"
  - "`hrefFor`, `goTo`, `replaceWith` — the only two writes to the history stack, push and replace"
  - "`anchorFrom`/`elapsedAt` — the recompute-from-anchor rule, with the monotonic reading as a parameter"
  - "`formatDuration`/`formatInstant` — the two rendering formats UI-SPEC Decision 2 fixes"
  - "`clockState` — the three clock states under names a component switches on"
  - "`segmentRows` — FR-58's field-by-field segment mapping, device pairs present only where the record carries them"
  - "32 new unit assertions (12 navigate, 20 clock); the lib suite is 211 tests, 211 pass"
affects: [04-04, 04-05, 04-06, 04-07, "components/shell/Screen.tsx", "components/order/TimeOnOrder", "components/order/ClockControl", "the gate", "phase-06-offline-queue"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a pure client module under lib/client/ that touches no browser global at module scope, so node --test imports it directly"
    - "a browser global destructured inside a function body, never read at module scope"
    - "a monotonic timer reading passed in as a parameter rather than read by the module"
    - "a discriminated value union (mark/instant/figure/word) so a component chooses a rendering, not a meaning"

key-files:
  created:
    - lib/client/navigate.ts
    - lib/client/navigate.test.mjs
    - lib/client/clock.ts
    - lib/client/clock.test.mjs
  modified: []

key-decisions:
  - "`window` is destructured inside each function body (`const { history } = window`) rather than written as `window.history.pushState`, which satisfies the plan's own no-module-scope-global grep while keeping the literal `history.pushState`/`history.replaceState` call the plan's key_links names"
  - "The segment pair order is SOURCE, STARTED, DEVICE CLAIMED, MEASURED OFFSET, ENDED — the plan's enumeration, not the UI-SPEC field table's order — because both device pairs qualify the START, so grouping them after STARTED keeps the start's provenance together and leaves ENDED last where a reader expects it"
  - "`ClockState` members are named for the record (`no-segments`, `segment-running`, `all-segments-closed`) rather than for the label, so REOPEN's append (FR-9) is never mistaken for a resume; `paused` was rejected for exactly that reason"
  - "`segmentRows` returns a discriminated `SegmentValue` (`mark` | `instant` | `figure` | `word`), so the component picks a rendering primitive and re-derives no meaning; `figure` is the UI-SPEC's own type-role name, which also keeps the word `duration` out of the value vocabulary"
  - "`formatInstant` returns `{ machine, human }` from one field, so the `<time datetime>` value and its text cannot drift"
  - "`screenKey` takes `string`, not `Surface`, because a screen with no valid surface still has an identity that must be distinguishable"
  - "The two history writes are proved in the browser harness, not here: a unit test of `pushState` would assert against a stub history and prove nothing about the real stack"

patterns-established:
  - "lib/client module: banner header naming what it owns, the decision ids, and what breaks if a second module does the job; no browser global at module scope; no client directive"
  - "A closed set is a const tuple plus a derived union, with a unit assertion pinning membership and declaration order (Shared Pattern 7)"
  - "A clock reading is always a parameter, never read by the module under test"
  - "Test names state the claim being proved, not the function being called"

requirements-completed: [REQ-FR-58, REQ-NFR-6]

# Metrics
duration: 5h 9m wall clock (first task commit to summary)
completed: 2026-09-25
---

# Phase 4 Plan 03: Client navigation and clock rules Summary

**Two pure, unit-proved client modules: `navigate.ts` fixes the closed set of four surfaces, the anchored `wo-NNNN` shape guard, the whole-screen key and the only push/replace pair; `clock.ts` derives the displayed figure by recomputing from a server anchor against a monotonic reading passed in, and maps `OrderClock` to FR-58's rows with the device pairs absent rather than empty and no per-segment duration.**

## Performance

- **Duration:** 5h 9m wall clock between the first task commit and this summary. That span is elapsed time, not effort — the only slow steps were two full `npx tsc --noEmit` runs on this OneDrive path; every other command in the verification table below returns in seconds.
- **Started:** 2026-09-25T08:00:05Z (Task 1 commit)
- **Completed:** 2026-09-25T13:09:00Z
- **Tasks:** 2 of 2
- **Files created:** 4 (812 lines); **files modified:** 0

## Accomplishments

- **`lib/client/` exists and was collected for free.** `scripts/verify.mjs` is untouched: its `unit-suite` step already globs `lib/**/*.test.mjs`, and `scripts/check-register-isolation.mjs` already declared `lib/client` a scanned source root. That check now exits 0 with the root present and populated rather than passing vacuously over a missing directory.
- **The URL's two values are validated in one importable place, and neither is ever rendered.** `parseSurface` refuses `order/wo-0142` outright rather than splitting it (D-01's rejected encoding), and `parseId` is an anchored `^wo-[0-9]{4}$` guard whose own comment states that it is a shape check and not an existence check — the server keeps existence and ownership, byte-identically (AD-4), which is what keeps D-02's refusal the one a reviewer can test.
- **The screen key is the whole identity.** `screenKey("order","wo-0142") !== screenKey("order","wo-0151")` is asserted, which is Pitfall 4's measured failure closed before any component keys an effect: an `s`-only key does not re-run on an id-only transition, and focus is left on a control that has just been replaced.
- **The clock recomputes; it never accumulates.** `elapsedAt` is `anchor.elapsedS + max(0, floor((nowMono − readAtMono) / 1000))`, with both reasons in its own comment: Chrome throttles a hidden page's timers to 1/s and, past five minutes hidden, to 1/min, so an accumulator under-reports by minutes; and the delta is monotonic, so a device clock correction mid-segment cannot move the figure. A test drives it at 1-minute and 10-minute gaps and shows the full elapsed figure, not an increment.
- **FR-58's mapping is proved field by field.** A `source: "server"` segment yields exactly SOURCE, STARTED, ENDED; a `device_reconciled` segment carrying both optional fields yields five pairs; one carrying only `device_claimed_opened_at` omits only MEASURED OFFSET. The absences are the assertion — `OrderClock` marks both fields optional, so the record's own optionality is the fact, and an empty row would state a field the record does not carry.
- **No per-segment duration is emitted, and the reason is in the code.** `segmentRows`' comment records that it is not a field of `OrderClock`, that it would be phone arithmetic on two instants, and that the one surface whose purpose is the provenance of instants does not mix the two — so a later phase reads the absence as a decision. A test walks all four segment shapes and asserts the term set is closed.
- **`formatDuration`'s regrouping is proved reversible.** Ten second-counts are rendered, re-parsed and summed back to the input, which is what makes `H:MM:SS` a rendering rather than a claim.

## Task Commits

1. **Task 1: `lib/client/navigate.ts` — the validation rules, the screen key and the two history writes** — `95a24cc` (feat)
2. **Task 2: `lib/client/clock.ts` — the anchor arithmetic, the two rendering formats and FR-58's segment mapping** — `f4b97de` (feat)

**Plan metadata:** this summary, committed separately.

Neither commit deleted a tracked file (`git diff --diff-filter=D HEAD~1 HEAD` empty for both), and `git diff --name-only HEAD~2 HEAD` is exactly the plan's four `files_modified` entries and nothing else.

## Files Created/Modified

- `lib/client/navigate.ts` (170 lines) — `SURFACES` and its derived `Surface` union; `parseSurface`; `parseId` with `ORDER_ID_RE`; `screenKey`; `hrefFor`; `goTo` (push); `replaceWith` (replace). The header states the three things the module owns and the three distinct failures a second owner produces.
- `lib/client/navigate.test.mjs` (95 lines, 12 assertions) — the closed set pinned in declaration order; every member parses to itself; six refusals for `parseSurface`; seven for `parseId` plus three anchoring cases; the two `screenKey` distinctions; `hrefFor`'s omitted-versus-present `id` key; and a query-not-segment assertion naming Pitfall 7.
- `lib/client/clock.ts` (302 lines) — `Anchor`, `anchorFrom`, `elapsedAt`, `formatDuration`, `Instant`, `formatInstant`, `ClockState`, `clockState`, `SourceMark`, `SourceWord`, `SegmentTerm`, `SegmentValue`, `SegmentPair`, `segmentRows`. `OrderClock` is a type-only import; no local copy of the record shape exists.
- `lib/client/clock.test.mjs` (245 lines, 20 assertions) — hand-built `OrderClock` stubs in `lib/access/scope.test.mjs`'s style, covering all nine behaviours the plan names plus the anchor, the reversibility proof, the shared-calendar-day case, segment order, and the empty record.

## Decisions Made

All seven are in the frontmatter's `key-decisions`; the three that a later phase is most likely to trip over:

- **`const { history } = window` inside each function body.** The plan's own acceptance criterion requires `grep -nE "^\s*(window|document|localStorage|sessionStorage)\b" lib/client/navigate.ts` to return nothing, and `\s*` matches indentation — so the literal statement `window.history.pushState(...)` inside a function body would have tripped it. Destructuring `window` inside the body satisfies the grep, keeps `window` out of module scope (which is the criterion's actual intent), and leaves the call written as `history.pushState(...)` / `history.replaceState(...)`, which is the pattern the plan's `key_links` block asserts.
- **Pair order puts ENDED last.** UI-SPEC Decision 2's field table lists `closed_at` before the two device fields; the plan's action text enumerates SOURCE, STARTED, DEVICE CLAIMED, MEASURED OFFSET, ENDED, and the plan's own test criteria are written against that order. The plan's order was implemented, and it has an independent reason: both device pairs qualify the *start*, so keeping them beside STARTED groups the start's provenance and leaves the segment's end at the end.
- **`SegmentValue`'s `figure` kind rather than a `duration` kind.** MEASURED OFFSET is a regrouped server field, so a value tag was needed for an already-formatted `H:MM:SS` string. `figure` is the UI-SPEC's own type-role name for exactly this text, which is better vocabulary than `duration` and also keeps the word out of the value union, where it could be misread as licence for the per-segment duration the surface deliberately omits.

## Deviations from Plan

### Auto-fixed Issues

None. No bug, no missing critical functionality and no blocking issue arose — nothing was broken to fix, no package was installed, and no architectural question was reached. Both tasks were implemented as written and passed their acceptance criteria on the first verification run.

### Narrowings and interpretations, recorded

- **Two acceptance criteria are satisfied literally, which constrained how the code is written.** The `^\s*window\b` grep (Task 1) forced the destructuring described under Decisions Made. The `grep -c '"use client"' lib/client/navigate.ts` → 0 criterion forced the header not to *quote* the directive when explaining why the file carries none; the header now says so without the literal, on the same "a quoted copy is still a second literal" reasoning `lib/copy/governed.ts` applies to its eight sentences. Both are recorded because in each case the natural phrasing fails a check that is testing for something else.
- **Nine type exports beyond the plan's `exports` lists.** The plan's `artifacts` block names the value exports (`SURFACES`, the five functions; `anchorFrom` and the five clock functions). The modules additionally export `Surface`, `Anchor`, `Instant`, `ClockState`, `SourceMark`, `SourceWord`, `SegmentTerm`, `SegmentValue` and `SegmentPair`. These are the types a consuming component needs in order to switch on a state or render a pair without restating a shape — `Surface` in particular is the union the plan's own text asks to be derived from `SURFACES`. No runtime surface was added.
- **`import type { OrderClock } from "../data/types"` is extensionless.** The plan wrote the path as `lib/data/types.ts`. Every existing type-only import in this repository is extensionless (`lib/copy/conflicts.ts:23`, `lib/access/scope.ts:26`, `lib/http/contract.ts:25`) while value imports carry `.ts`; the repo convention was followed. The import is type-only either way, so it erases under Node's type stripping and the `.mjs` tests import the module cleanly.
- **The plan's expected baseline assertion count was stale.** Task 2's criteria say the suite is "the existing 164 assertions plus the new ones". The measured baseline is **179** (`node --test` on the thirteen non-`lib/client` test files), and the new total is **211**. The gap is work landed since the figure was written, including plan 04-02's additions. The criterion as intended — the full suite passes — is met; only the arithmetic in it was out of date.
- **`npx eslint` was run on the directory, not on single files.** Task 1's criterion names `npx eslint lib/client/navigate.ts`; the run covered that file plus its test file, and Task 2's run covered `lib/client` entire. Exit 0 in both.

---

**Total deviations:** 0 auto-fixed. 5 narrowings and interpretations recorded above.
**Impact on plan:** None on scope or behaviour. Every file the plan named was created, no file outside `files_modified` was touched, and `scripts/verify.mjs` was not modified. `docs/CAPTURE-PLAN-SEED.md` and every untracked path (`.claude/agent-memory/`, `docs/ingest.yaml`, `docs/planning-artifacts/`, `docs/specs/`) were left exactly as found.

## Issues Encountered

- **My own header comment tripped the plan's `"use client"` grep.** The first draft of `navigate.ts`'s header explained the absent directive by quoting it, which made `grep -c '"use client"' lib/client/navigate.ts` return 1 where the criterion requires 0. Caught by running the criterion rather than assuming it, and fixed before the commit by rewriting the paragraph to state the point without the literal. This is the same class of trap as plan 04-01's `check-tokens.mjs` comment finding — a checker that reads comment text does not distinguish an explanation from a declaration.
- **Nothing else required problem-solving.** The two ESLint traps 04-RESEARCH.md Pitfall 3 documents (`react-hooks/refs` on a ref read during render, `react-hooks/set-state-in-effect` on a re-anchor effect) could not fire here: neither module contains a hook, a ref or a component. They are the *consumer's* problem, and the shapes that pass are in §Code Examples 1 waiting for whichever plan builds `Screen.tsx` and the clock control.

## Verification

Every command was run from the repository root in this session; output is logged under the gitignored `scripts/.check/`, prefixed `04-03-`.

| Command | Result |
|---|---|
| `node --test lib/client/navigate.test.mjs` | exit 0 — 12 tests, 12 pass |
| `node --test lib/client/clock.test.mjs` | exit 0 — 20 tests, 20 pass |
| `node --test "lib/**/*.test.mjs"` | exit 0 — **211 tests, 211 pass, 0 fail** (baseline 179 + 32 new) |
| `npx eslint lib/client` | exit 0, no output |
| `npx tsc --noEmit` | exit 0 (run after each task) |
| `node scripts/check-register-isolation.mjs` | exit 0 — `Problems: 0`, and the `lib/client` source root is now populated rather than absent |
| `node -e "import('./lib/client/navigate.ts')…"` | prints `orders,order,time,limits` — no browser global at module scope |
| `node -e "import('./lib/client/clock.ts')…formatDuration(192)"` | prints `0:03:12` |
| `grep -nE "^\s*(window\|document\|localStorage\|sessionStorage)\b" lib/client/navigate.ts` | no match |
| `grep -nE "^\s*(window\|document\|performance)\b" lib/client/clock.ts` | no match |
| `grep -c '"use client"' lib/client/navigate.ts` | `0` |
| `grep -n "duration" lib/client/clock.ts` | two lines, both comment prose (the header's ownership statement and the no-per-segment-duration note); `formatDuration` does not match the lowercase pattern, and `segmentRows` emits no such term |
| `git diff --name-only HEAD~2 HEAD` | exactly the four files in `files_modified` |
| `node scripts/check-actor-field.mjs`, `check-fixture-inputs.mjs`, `check-governed.mjs`, `check-non-bypassability.mjs`, `check-single-writer.mjs`, `check-sw.mjs`, `check-structure.mjs`, `check-headers.mjs` | all exit 0, `Problems: 0` — the source-scanning checks that could see a new `lib/` module |
| `node scripts/claims-audit.mjs` | exit 0 |

**Narrowed deliberately, and what is therefore unproven.** `npm run verify` was not run. Its gate includes `next build` and a live server, which is slow on this OneDrive path and prone to `EPERM: unlink .next/static/<id>`, and this plan's four files are reachable by none of the server-dependent steps: they are pure modules with no route, no component and no markup. The ten source-scanning checks above are the subset that actually reads `lib/`, and all ten pass. `scripts/check-deployment.mjs` exits 1 without a `--url` argument — that is its documented contract for a local run, not a regression.

**What is not proved here, by design.** `goTo` and `replaceWith` are not unit-tested: asserting `pushState` against a stub history would prove the stub, not the history stack. The behaviours they depend on were measured in 04-RESEARCH.md Pattern 3 against a production build of this repository (replace leaves no back entry; a replace to an identical URL is a genuine no-op), and the browser harness is where a later plan's C6 focus assertions will exercise them for real. `formatInstant`'s human half is asserted for shape and for byte-identity of the machine half, not against a fixed zone — pinning a zone would make the test depend on the runner's `TZ` rather than on the mapping.

## Self-Check: PASSED

- `lib/client/navigate.ts` — FOUND
- `lib/client/navigate.test.mjs` — FOUND
- `lib/client/clock.ts` — FOUND
- `lib/client/clock.test.mjs` — FOUND
- commit `95a24cc` — FOUND in `git log`, trailers present
- commit `f4b97de` — FOUND in `git log`, trailers present

## Known Stubs

None. `grep -nE "TODO|FIXME|placeholder|coming soon|not available" lib/client/*.ts` returns nothing, no export returns a hardcoded empty value, and every function is driven by a unit assertion over real inputs.

## Threat Model

The plan's five registered threats are all discharged as written, and no new security-relevant surface was introduced — no endpoint, no auth path, no file access, no schema change. No threat flags.

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-04-01 (tampering, `parseSurface`/`parseId`) | mitigated | Four-member allowlist and anchored `^wo-[0-9]{4}$`, both unit-proved including `../../etc/passwd`, `wo-0142/../wo-0151` and an embedded-newline case. `parseId`'s comment states the value is a fetch path segment only; it reaches no markup, so React escaping is not relied on. |
| T-04-05 (tampering, `elapsedAt`) | mitigated | The figure is derived from a server field and is sent nowhere; no export of either module writes anything. |
| T-04-06 (integrity, `elapsedAt`/`anchorFrom`) | mitigated | Recompute-from-anchor with the monotonic reading as a parameter, asserted non-decreasing for a reading behind the anchor and correct at 1-minute and 10-minute gaps. |
| T-04-07 (tampering, this commit) | mitigated | Four new files; `git diff --name-only HEAD~2 HEAD` matches `files_modified` exactly. Neither of the previously `[SECURITY]`-blocked files was touched. |
| T-04-SC (supply chain) | mitigated | Zero packages added. `node:test`, `node:assert/strict`, `URLSearchParams` and `Date` are the whole toolchain. |

## User Setup Required

None — no external service, no environment variable, no dashboard step.

## Next Phase Readiness

Wave 2's remaining plans can build against these modules directly:

- **A component plan** imports `SURFACES`, `parseSurface`, `parseId` and `screenKey` for the one parse point and the focus-move key, and `goTo`/`replaceWith` for every transition — which is how SC-5's no-`next/link`, no-`useRouter` prohibition is satisfied without any component reaching for the framework's router.
- **The clock control and the time surface** import `clockState` for the three-way label swap, `elapsedAt` + `formatDuration` for the ticking figure, and `segmentRows` + `formatInstant` for FR-58's rows. The one thing a consumer still owns is the React shape around them, and 04-RESEARCH.md §Code Examples 1 has the verified lint-clean forms: the anchor in `useState` and never a ref, `setState` only in an interval callback or an `await` continuation, and the effect keyed on `screenKey`.
- **04-VALIDATION.md's FR-58 unit row is discharged** by `lib/client/clock.test.mjs`. What remains for FR-58 is the demonstration row — the rendered surface — which needs a component.

One concern to carry forward, not a blocker: `REQ-FR-58` and `REQ-NFR-6` are marked complete on the strength of the mapping and the colour-independent SOURCE word being defined and proved here. Both also have a rendering half — the contrast pairs and the mark shapes on screen — that only a component plan and `check-contrast.mjs`/`check-wcag.mjs` can close.

---
*Phase: 04-shell-gate-orders-clock-online*
*Completed: 2026-09-25*
