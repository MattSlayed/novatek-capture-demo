---
phase: 04-shell-gate-orders-clock-online
plan: 02
subsystem: copy
tags: [conflict-codes, refusal-copy, governed-sentences, closed-sets, typescript, node-test]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/copy/conflicts.ts's CONFLICT_COPY as Record<ConflictCode, RefusalCopy> with its provenance-marker comment convention, lib/data/types.ts's ConflictCode/CONFLICT_CODES closed set, lib/http/contract.ts's STATUS_BY_CODE as Record<WireErrorCode, number> plus its two pinned literal mirrors, lib/copy/governed.ts's PLATFORM_413 precedent for a named export outside the closed set of eight, and scripts/check-governed.mjs's before/strong/after shape sweep"
provides:
  - "already_open in the ConflictCode union, in CONFLICT_CODES and in CONFLICT_COPY — the sentence 'The clock was already running on this order, so the server added no second segment and nothing was lost.' with exactly one action, 'View time on this order' (D-05, AD-9 closed)"
  - "the note above ConflictCode in lib/data/types.ts rewritten: it records that already_open landed in P4 under D-05 with its copy in lib/copy/conflicts.ts, that nothing in P4 renders it, and that P6 reconciliation is its first rendering path — it no longer claims no code for it is introduced in this phase"
  - "the paired unit test in lib/copy/conflicts.test.mjs: an exact-string assertion on the sentence and a deepEqual on the one-member actions array, which is how UI-SPEC invariant D3's 'exactly one action' is proved at unit level"
  - "FR48A_DISPOSITION in lib/copy/governed.ts — the gate's long-form disposition sentence as a plain string export beside PLATFORM_413, one definition site, outside check-governed.mjs's closed set of eight and inside its duplicate-literal sweep and the claims audit's roots"
  - "already_open: 409 in lib/http/contract.ts's STATUS_BY_CODE with the provenance comment explaining why 409 is read from its neighbours rather than quoted from the seed's route table, plus the same key in lib/http/contract.test.mjs's pinned literal table and already_open in scripts/check-fixture-shape.test.mjs's pinned CONFLICT_CODES order (nine to ten)"
affects: [04-07, 04-08, 04-09, 04-10, 05, 06, 09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A tenth member of ConflictCode is a four-site change, not a two-site change: the union and CONFLICT_CODES in lib/data/types.ts, CONFLICT_COPY in lib/copy/conflicts.ts, STATUS_BY_CODE in lib/http/contract.ts (Record<WireErrorCode, number> — tsc fails without it), and the two pinned literal mirrors in lib/http/contract.test.mjs and scripts/check-fixture-shape.test.mjs"
    - "A copy string that is quoted from a source rather than authored here is marked [quoted] and names the source and the requirement, distinguishing it from the file's [written here] and [seed] markers"
    - "A sentence that needs one definition site but is not one of the eight governed sentences is exported as a plain string, not as a GovernedSentence triple — the triple is what check-governed.mjs's closed-set sweep matches, and it excepts PLATFORM_413 alone"

key-files:
  created: []
  modified:
    - lib/data/types.ts
    - lib/copy/conflicts.ts
    - lib/copy/conflicts.test.mjs
    - lib/copy/governed.ts
    - lib/http/contract.ts
    - lib/http/contract.test.mjs
    - scripts/check-fixture-shape.test.mjs

key-decisions:
  - "already_open sits immediately after not_open in both the union and CONFLICT_CODES, which keeps scripts/check-fixture-shape.test.mjs's existing D-06 assertion true (order_closed is still immediately followed by not_open) and puts the code where the note's own narrative puts it — the lists are declaration-order, not sorted"
  - "already_open: 409 in STATUS_BY_CODE, read from its conflict neighbours rather than quoted from a source: no source in the repository states a wire status for this code, because it is a queue code that is never emitted online (D-06's open is idempotent and returns 200 { clock }). The reason is recorded in a comment beside the entry, because the table's own header claims every status is quoted from the seed's route table"
  - "The FR-48a disposition sentence is marked [quoted] rather than [written here]: the neighbouring PLATFORM_413 is authored copy and carries [written here], but this sentence is EXPERIENCE.md's own wording (UJ-1 step 2) and the marker should say which it is"
  - "The full npm run verify gate was not run. The plan's own verification block names four commands, and the affected surfaces were covered by running every check and fixture suite that reads the seven changed files (identified with grep -rln), which is strictly more than the plan asked for and does not require a next build on this OneDrive path"

patterns-established:
  - "Pattern 1: a closed-set addition is verified by grep -rln for every mirror of the set before committing, because two of the three mirrors here are pinned literal lists in test files that tsc cannot catch"
  - "Pattern 2: a stale note in a type module is rewritten in the same commit as the change that falsifies it, so no commit leaves the file asserting something untrue"
  - "Pattern 3: [quoted] marks copy taken verbatim from a source document, beside the file's existing [seed] and [written here] markers"

requirements-completed: [REQ-FR-48a]

# Metrics
duration: 18min
completed: 2026-09-25
---

# Phase 4 Plan 2: The Copy Layer Summary

**`already_open` closed out AD-9 with the sentence "The clock was already running on this order, so the server added no second segment and nothing was lost." and exactly one next act, and the gate's FR-48a disposition sentence got its single definition site as a plain string beside `PLATFORM_413` — plus the three closed-list mirrors a tenth conflict code turned out to require.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-25T07:28:00Z (approximate — the first timestamp captured in-session was 07:29:52Z, a few tool calls in)
- **Completed:** 2026-09-25T07:45:58Z
- **Tasks:** 3 (Task 1 was a checkpoint resolved by the developer before this run began; Tasks 2 and 3 executed and committed)
- **Files modified:** 7

## Accomplishments

- **`already_open` exists end to end in the copy layer.** It is a member of the `ConflictCode` union and of `CONFLICT_CODES` in `lib/data/types.ts`, and `CONFLICT_COPY.already_open` in `lib/copy/conflicts.ts` carries the UI-SPEC's exact sentence with exactly one action, `View time on this order`. The entry's comment records the drafting reasoning the UI-SPEC asked to be kept: it names the actor (the server) and the mechanism (no second segment), which is FR-7's guarantee stated as a sentence; it says *nothing was lost* rather than the neighbours' *nothing was bound* because here the first open did land, so *nothing was bound* would be false; and it is the closed set's one benign entry, worded as neither a loss nor a decision because the server refused nothing.
- **The note in `lib/data/types.ts` stopped making a claim that had stopped being true.** It previously said AD-9's `already_open` remained on its stated P4 schedule with no code for it introduced in this phase. It now records that the code landed in P4 under D-05 with its sentence and its one next act in `lib/copy/conflicts.ts`, that nothing in P4 renders it, and that P6 reconciliation is its first rendering path. The `referral_evidence_missing` clause was left exactly as it stood.
- **The paired unit test landed in the shape of its `not_open` neighbour** — an exact-string assertion plus a `deepEqual` on the one-member actions array — and the file's pre-existing generic tests picked the new code up automatically (keys equal the code set, capital letter and full stop, non-empty actions, no exclamation mark).
- **`FR48A_DISPOSITION` is a plain string export beside `PLATFORM_413`**, carrying EXPERIENCE.md's own wording verbatim. `GOVERNED` still holds eight members, `GovernedKey` is unchanged, and `scripts/check-governed.mjs` was not touched — `git diff --name-only scripts/check-governed.mjs` prints nothing.

## Task Commits

1. **Task 1: Decide the disposition of the uncommitted third-party working-tree modifications** — resolved by the developer before this run; carried out by the orchestrator as `8fd0e0c` and `72ed6a7`. Not re-presented (see Task 1 below).
2. **Task 2: `already_open` — the three scoped edits to `types.ts`, the conflict entry, and its unit test** — `c1a756d` (feat)
3. **Task 3: the FR-48a disposition sentence as a plain-string export** — `95e8d78` (feat)

Both commits carry the session's `Co-Authored-By` and `Claude-Session` trailers, verified with `git log --format="%(trailers:key=...)"`. Neither commit deletes a tracked file (`git diff --diff-filter=D --name-only HEAD~2 HEAD` is empty).

## Task 1 — resolved by the developer, not re-presented

Task 1 was a `checkpoint:decision` with `gate="blocking"` about the uncommitted 2026-09-17 third-party modifications in `lib/data/types.ts` and `scripts/claims-audit.mjs`. **It was already answered when this run began, and this executor did not re-present it.**

The developer selected **option-b — "Commit both files as their own change first, with a message recording their provenance, then proceed"** — rather than reverting them. The orchestrator carried that out as commit **`8fd0e0c`** ("chore: commit the 2026-09-17 working-tree edits with their provenance"), and recorded the disposition in `.planning/STATE.md` as the `[SECURITY RESOLVED — disposition, orchestrator, 2026-09-25]` entry, committed as **`72ed6a7`**.

The consequence that mattered for this plan held: `git status --short` showed both files clean before Task 2 began, so this plan's edit to `lib/data/types.ts` is scoped to this plan's own change. `git diff lib/data/types.ts` after the edit showed only the three intended edits, all between lines 367 and 395, with no hunk touching `CitedFact` — which is what the checkpoint existed to guarantee. The commit made the third-party change attributable; it did not endorse it. Whether "Business Plan v3.1 D23" is a real programme decision, and what happens to the byte-identical uncommitted edits in the sibling repository `../ipv-demo`, remain open and remain the developer's, exactly as STATE.md records. This executor formed no view on either and touched neither `scripts/claims-audit.mjs` nor `../ipv-demo`.

One consequence worth noting for later plans: 04-01 declined to run the full `npm run verify` gate because doing so would have executed uncommitted, unattributable code in `scripts/claims-audit.mjs`. That reason is discharged by `8fd0e0c`. This plan still did not run the full gate, for the different and narrower reason given under Verification below.

## Files Created/Modified

- `lib/data/types.ts` — `| "already_open"` in the `ConflictCode` union and `"already_open",` in `CONFLICT_CODES`, both immediately after `not_open`; the note above the union rewritten so it records D-05's landing instead of denying it.
- `lib/copy/conflicts.ts` — `CONFLICT_COPY.already_open` with its sentence, its single action and the drafting-note comment in the file's established voice.
- `lib/copy/conflicts.test.mjs` — one new test, `CONFLICT_COPY.already_open carries D-05's exact sentence and its one action`.
- `lib/copy/governed.ts` — `export const FR48A_DISPOSITION` as a plain string beside `PLATFORM_413`, with a `[quoted]` provenance comment naming REQ-FR-48a and UI-SPEC Decision 4 and stating why it is not a `GovernedSentence`.
- `lib/http/contract.ts` — `already_open: 409` in `STATUS_BY_CODE`, with a four-line comment recording that it is the one code in the table with no row in the seed's route table and why 409 is read from its neighbours. **(deviation — see below)**
- `lib/http/contract.test.mjs` — `already_open: 409` in the pinned literal status table. **(deviation)**
- `scripts/check-fixture-shape.test.mjs` — `"already_open"` in the pinned `CONFLICT_CODES` order, and the test's own name updated from "the closed set of nine" to "the closed set of ten, order_closed immediately followed by not_open (D-06) and then already_open (D-05)". **(deviation)**

## Decisions Made

- **Placement.** `already_open` sits immediately after `not_open` in the union, in `CONFLICT_CODES` and in `CONFLICT_COPY`. The lists are declaration-order, not sorted, and this is where the note's own narrative puts the code. It also keeps `check-fixture-shape.test.mjs`'s existing D-06 assertion literally true: `order_closed` is still immediately followed by `not_open`.
- **`already_open: 409`.** No source in the repository states a wire status for this code — it is a queue code, never emitted online, because D-06 settled that a second online open returns `200 { clock }` with no new segment. 409 is what every other non-404, non-422 conflict code carries. Because `STATUS_BY_CODE`'s own header comment claims each status is quoted from `CAPTURE-PLAN-SEED.md`'s route table, the entry carries a comment saying this one is not, and why — the same practice the header uses for the `not_found` / `order_not_found` reconciliation rather than resolving it silently.
- **`[quoted]`, not `[written here]`.** `PLATFORM_413` beside it is authored copy and carries `[written here]`. The FR-48a disposition sentence is EXPERIENCE.md's own wording quoted verbatim, so the marker says so. The file already distinguishes `[seed]` from `[written here]` in `conflicts.ts`; this is the same distinction applied in `governed.ts`.
- **The module header in `conflicts.ts` was left alone.** Its Phase-3-scoped sentence about `lib/copy/governed.ts` not being edited by that plan is a record of what Phase 3 did, not a standing prohibition, and the plan was explicit that it must not be rewritten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] A tenth `ConflictCode` member requires three closed-list mirrors the plan's `files_modified` did not name**

- **Found during:** Task 2 (`already_open` — the three scoped edits), at the `npx tsc --noEmit` verification step.
- **Issue:** `lib/http/contract.ts` declares `STATUS_BY_CODE: Record<WireErrorCode, number>` where `WireErrorCode = ConflictCode | RejectCode | TransportErrorCode`. Adding `already_open` to the union made that record incomplete, and `tsc` failed with `lib/http/contract.ts(219,14): error TS2741: Property 'already_open' is missing in type ... but required in type 'Record<WireErrorCode, number>'`. Two further failures were latent behind it, both in pinned literal lists that `tsc` cannot see: `lib/http/contract.test.mjs`'s "STATUS_BY_CODE matches the literal status table exactly" test, and `scripts/check-fixture-shape.test.mjs`'s "CONFLICT_CODES is the closed set of nine" test, which asserts the array element by element. The plan's `files_modified` names four files and none of these three, so the addition could not have compiled or passed its own unit suite as scoped.
- **Fix:** Added `already_open: 409` to `STATUS_BY_CODE` (with the provenance comment described under Decisions Made), added the same key to the test's literal mirror, and added `"already_open"` to the pinned `CONFLICT_CODES` order with the test's name updated from nine to ten. Before editing, `grep -rn "CONFLICT_CODES"` and `grep -rn "clock_skew"` across `app/`, `lib/`, `components/` and `scripts/` were used to find every mirror of the closed set, so the fix is complete rather than incremental: the remaining consumers (`lib/http/contract.test.mjs`'s two all-codes loops and `lib/copy/conflicts.test.mjs`'s generic tests) derive from `CONFLICT_CODES` at runtime and needed no edit.
- **Files modified:** `lib/http/contract.ts`, `lib/http/contract.test.mjs`, `scripts/check-fixture-shape.test.mjs`
- **Verification:** `npx tsc --noEmit` exits 0 (it exited 2 before the fix — both logs are in `scripts/.check/`), and `node --test lib/http/contract.test.mjs scripts/check-fixture-shape.test.mjs lib/copy/conflicts.test.mjs` reports 55 tests, 55 pass, 0 fail.
- **Committed in:** `c1a756d` (the Task 2 commit, whose message names the three files and the rule under which they were added).

### Narrowings and wording differences, recorded

- **"Exactly three hunks" is three edits rendered as two hunks.** Task 2's acceptance criteria asked for exactly three hunks in `git diff lib/data/types.ts`. All three edits were made and nothing else in the file was touched, but git coalesced the note rewrite and the union insertion into one hunk because they are three lines apart. The diff is two hunks, both inside lines 367–395, and no hunk touches `CitedFact`.
- **`npx eslint` was run on the changed files, not on the tree.** The plan named `npx eslint lib/copy/conflicts.ts lib/data/types.ts`; the run covered those two plus the five other changed files. Exit 0 in both task runs.

---

**Total deviations:** 1 auto-fixed (1 blocking), plus 2 recorded wording narrowings.
**Impact on plan:** The blocking fix was the unavoidable consequence of the plan's own required union addition — without it the plan's central artifact does not type-check. It adds one wire-status entry and two pinned-list entries and changes no behaviour. No scope creep: nothing was refactored, no check script was widened, and `scripts/claims-audit.mjs`, `scripts/check-governed.mjs`, `docs/CAPTURE-PLAN-SEED.md` and every untracked path were left untouched.

## Verification

Every command below was run from the repository root in this session; output is logged under `scripts/.check/` (gitignored), prefixed `04-02-`.

| Command | Result |
|---|---|
| `node --test lib/copy/conflicts.test.mjs` | exit 0 — 9 tests, 9 pass, including the new `already_open` test |
| `node --test lib/http/contract.test.mjs scripts/check-fixture-shape.test.mjs lib/copy/conflicts.test.mjs` | exit 0 — 55 tests, 55 pass |
| `node scripts/check-governed.mjs` | exit 0 — `Problems: 0`, the set of eight still closed |
| `node scripts/claims-audit.mjs` | exit 0 — 27 rules, 0 hits, 0 live violations |
| `npx tsc --noEmit` | exit 0 (after the Rule 3 fix; exit 2 before it) |
| `npx eslint` on all seven changed files | exit 0 |
| `node -e` on `lib/data/types.ts` | `CONFLICT_CODES.includes('already_open')` is `true`, length 10 |
| `node -e` on `lib/copy/governed.ts` | prints `string 8` — a plain string, and `GOVERNED` still has eight keys |
| `git diff --name-only scripts/check-governed.mjs` | empty — the check was not modified |
| `node scripts/check-actor-field.mjs`, `node scripts/check-observations.mjs` | exit 0 — the two non-test checks that read `lib/data/types.ts` |
| `node --test scripts/check-governed.test.mjs scripts/check-fixture-hash.test.mjs scripts/check-observations.test.mjs` | exit 0 — 36 tests, 36 pass |
| `node --test scripts/check-deployment.test.mjs` | exit 0 — 7 tests, 7 pass (it reads `lib/copy/governed.ts`) |

**The full `npm run verify` gate was not run, for a different reason than 04-01's.** 04-01 declined it because it would have executed uncommitted, unattributable code; `8fd0e0c` discharged that. This plan declined it because the plan's own `<verification>` block names four commands, none of which is the gate, and the gate's later steps need a `next build` and a running server on this OneDrive path. Instead, every script that reads the seven changed files was identified with `grep -rln` and run, together with its `.test.mjs` sibling — the twelve rows above. The two consumers that could not be run without a server are `scripts/server/route-suite.proof.mjs` (reads `lib/copy/conflicts.ts`) and `scripts/server/route-assertions.mjs` (reads `lib/http/contract.ts`); neither asserts a conflict-code count or an enumeration, and both resolve sentences and statuses through `detailFor` and `STATUS_BY_CODE` at runtime rather than restating them. A later plan in this phase that runs the whole gate will cover them.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: wire-contract | `lib/http/contract.ts` | A tenth wire error code now has a status in `STATUS_BY_CODE`, the table that fixes the HTTP status of every refusal. The plan's threat register covers `lib/data/types.ts`, `scripts/claims-audit.mjs` and `CONFLICT_COPY.already_open`, but not this file. Benign as landed: 409 matches its conflict neighbours, no route emits the code (D-06's open is idempotent), and `fail()` reads the status from this table rather than from a call site. Flagged because it is a change at the request/response trust boundary that the plan did not anticipate, not because a defect was found. |

Nothing else in this plan introduces a network endpoint, an authentication path, a file-access pattern or a schema change at a trust boundary. `CONFLICT_COPY.already_open` satisfies T-04-10 as written: the sentence names the server and the mechanism and claims nothing about the artisan's device or account.

## Issues Encountered

- **Mixed line endings across the four target files.** `lib/data/types.ts`, `lib/copy/conflicts.ts`, `lib/http/contract.ts` and `lib/http/contract.test.mjs` are CRLF in the working tree; `lib/copy/conflicts.test.mjs`, `lib/copy/governed.ts` and `scripts/check-fixture-shape.test.mjs` are LF-only. A first edit script assuming CRLF matched nothing in the LF files and aborted on a match-count assertion rather than writing anything, which is why the edits were applied by a script that detects the file's convention and preserves it. No file's line endings were changed; `git diff` shows content changes only.

## Next Phase Readiness

- **AD-9 is closed for the conflict table.** `already_open` and `not_open` both carry a sentence and a next act, which is ROADMAP item 4 for this phase and the thing Phase 6 needed written before it begins. Nothing in Phase 4 renders `already_open`, by design; Phase 6 reconciliation is its first rendering path, and `lib/reconcile/apply.ts`'s close path still correctly declines to emit it.
- **04-07 (the gate) has its disposition sentence.** It imports `FR48A_DISPOSITION` from `lib/copy/governed.ts` rather than writing the sentence at the call site, and renders it at `prose` 16 px below `preview` inside the disclosure, per UI-SPEC Decision 4. `requirements-completed` lists REQ-FR-48a because this plan's frontmatter claims it, but only the sentence's definition site landed here — the two gate states, the `role="dialog"` disclosure and the reopen control are 04-07's, and the requirement is not observable until then.
- **04-08 (the conflict card) can render `already_open` from the record.** Its sentence and its one action resolve through `CONFLICT_COPY`, and `errorBody`/`detailFor` already route the code correctly.
- **Two things remain the developer's**, unchanged by this plan and recorded in STATE.md: whether "Business Plan v3.1 D23" is a real programme decision, and the sibling repository `../ipv-demo`, which still carries byte-identical uncommitted edits to both files while the rule's own comment says "if you change one, change both".

---
*Phase: 04-shell-gate-orders-clock-online*
*Completed: 2026-09-25*

## Self-Check: PASSED

All seven modified files and `04-02-SUMMARY.md` exist on disk; both task commits (`c1a756d`, `95e8d78`) and the two commits carrying the developer's Task 1 decision (`8fd0e0c`, `72ed6a7`) are present in `git log`; `already_open` is present in all six files that must carry it and `FR48A_DISPOSITION` in `lib/copy/governed.ts`.
