---
phase: 01-scaffold-conventions
fixed_at: 2026-09-08T12:00:22Z
review_path: .planning/phases/01-scaffold-conventions/01-REVIEW.md
iteration: 1
findings_in_scope: 17
fixed: 16
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-09-08T12:00:22Z
**Source review:** .planning/phases/01-scaffold-conventions/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 17 (1 Critical, 16 Warnings; `fix_scope: critical_warning`, so the 12 Info findings were not attempted)
- Fixed: 16
- Skipped: 1 (WR-16 — a conflict inside the approved UI-SPEC; needs a developer decision)

**Proof (project boundary 9), run in the isolated worktree on the final commit `cd27bc1`:**
- `npm test` — exit 0, 164 tests / 10 suites, 0 failed (run twice; both green). Baseline before any fix was 117 tests, so 47 fixtures were added.
- `npm run verify` — exit 0, "All steps exited 0." (all fifteen D-20 steps, including the real `next build`, `check-structure --build-output`, `check-contrast`, the axe self-test and the full axe scan: "Zero A/AA violations on both surfaces").
- No `node` server left running: nothing listening on 4311 (only TIME_WAIT sockets from the completed scan); the only `node.exe` processes are the developer's MCP servers and editor helpers.
- One earlier full `npm test` run (before `cd27bc1`) failed a single new check-governed fixture with an *empty child stdout* while its exit code was correctly non-zero — a starved/crashed child under the fully parallel run (12 files plus a concurrent `next build`), not a wrong verdict: the same suite passed 3/3 alone and inside verify's fixture-suite step. `cd27bc1` makes those assertions carry the child's stderr so any recurrence is diagnosable; the two full runs after it were green.

**Guardrails held:** `lib/copy/governed.ts`, `app/styles/tokens.inherited.css`, `vercel.json` and `next.config.ts` are untouched (`git diff main..HEAD` is empty for each). `engines.node` is still the exact string `"24"`. Every inherited claims-register entry and every inherited `RETIREMENT_MARKER` alternative is byte-identical (the sibling `../ipv-demo/scripts/claims-audit.mjs` was compared directly). No `docs/` path, `.env.local`, or developer-owned file appears in any fix commit; the developer's uncommitted `docs/` work and `.planning/STATE.md`/`config.json` changes were never staged. Every commit ends with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer (verified with `git log --format=%B` on all 17 commits).

## Fixed Issues

| Finding | Commit | Files |
|---|---|---|
| CR-01 | `26e7888` | `scripts/verify.mjs`, `scripts/verify.test.mjs` |
| WR-01 | `675e862` | `scripts/verify.mjs`, `scripts/verify.test.mjs` |
| WR-02 | `0888298` | `package.json`, `scripts/scaffold.test.mjs`, `README.md` |
| WR-03 | `c53366e` | `scripts/lib/fixtures.mjs`, `scripts/check-wcag.mjs`, `scripts/lib/support.test.mjs` |
| WR-04 | `204f70d` | `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs` |
| WR-05 | `245da6e` | `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs` |
| WR-06 | `884af9a` | `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs` |
| WR-07 | `40d3897` (+ `cd27bc1`) | `scripts/check-governed.mjs`, `scripts/check-governed.test.mjs` |
| WR-08 | `a7e753f` | `scripts/check-governed.mjs`, `scripts/check-governed.test.mjs` |
| WR-09 | `52f55e8` | `scripts/check-headers.mjs`, `scripts/check-headers.test.mjs` |
| WR-10 | `69c16d7` | `scripts/check-structure.mjs`, `scripts/check-structure.test.mjs`, `scripts/verify.mjs`, `scripts/verify.test.mjs` |
| WR-11 | `2c61f29` | `scripts/check-tokens.mjs`, `scripts/check-tokens.test.mjs` |
| WR-12 | `5547f69` | `scripts/check-contrast.mjs`, `scripts/check-contrast.test.mjs` |
| WR-13 | `c8a4ca7` | `package.json`, `package-lock.json`, `scripts/scaffold.test.mjs` |
| WR-14 | `23b14b0` | `scripts/verify.mjs`, `scripts/verify.test.mjs` |
| WR-15 | `76042e9` | `.github/workflows/verify.yml`, `scripts/verify.test.mjs` |

### CR-01: The gate resolves a signal-terminated step as exit 0

**Files modified:** `scripts/verify.mjs`, `scripts/verify.test.mjs`
**Commit:** `26e7888`
**Status:** fixed
**Applied fix:** `spawnStep` now reads `(code, signal)` on `close`; `code === null` writes `✖ step "<id>" was terminated by <signal> — treated as a failure` to stderr and resolves 1. `spawnStep` is exported with an optional test-only `onSpawn(child)` hook so a fixture can terminate the child by signal deterministically (a self-kill reports `code: 1` on Windows but `null` on POSIX; a parent `child.kill("SIGTERM")` reports `null` on both, verified on this machine). Fixtures: parent-killed child resolves non-zero and names the signal; self-killed child resolves non-zero; exit 7 passes through as 7; exit 0 stays 0. The existing source-grep test (no `warning`/`continue` branch) still passes.

### WR-01: `import.meta.main` guard is a silent no-op on Node 24.0 and 24.1

**Files modified:** `scripts/verify.mjs`, `scripts/verify.test.mjs`
**Commit:** `675e862`
**Status:** fixed
**Applied fix:** `engines.node` was left at the locked `"24"` (boundary 1). Added `isMainModule(meta, argv)`: returns `meta.main` when it is a boolean, otherwise compares `path.resolve(argv[1])` with `fileURLToPath(meta.url)` (case-insensitively on win32). The entry guard is `if (isMainModule(import.meta))`. Fixtures: boolean honoured; undefined falls back to the path comparison (true for self, false for another script, false with no entry script); source grep proves the guard goes through `isMainModule` and no bare `import.meta.main` guard remains.

### WR-02: `npm test` and the README command run 2 of 12 test files on a POSIX shell

**Files modified:** `package.json`, `scripts/scaffold.test.mjs`, `README.md`
**Commit:** `0888298`
**Status:** fixed
**Applied fix:** `"test": "node --test \"scripts/**/*.test.mjs\""`; `scaffold.test.mjs` asserts the new exact string (with the reason recorded); README lines 26 and 33 updated. Reproduced the defect on this machine's `sh` (`node ... scripts/**/*.test.mjs` unquoted expands to the two `lib/` files only; quoted, Node receives the literal and expands it itself), and confirmed `npm test` under cmd.exe runs all 164 tests. README line 47 (which describes `verify.mjs`'s unshelled argv, unchanged per boundary 10) was left as is.

### WR-03: The same `code ?? 0` fail-open in the fixture harness and the WCAG builder

**Files modified:** `scripts/lib/fixtures.mjs`, `scripts/check-wcag.mjs`, `scripts/lib/support.test.mjs`
**Commit:** `c53366e`
**Status:** fixed
**Applied fix:** both `collect()` and `runToCompletion()` resolve `{ code: code === null ? 1 : code, signal, stdout, stderr }`; `check-wcag.mjs` appends `(terminated by <signal>)` to its `next build exited` defect. `collect` is exported so the null branch is provable on every platform. Fixtures (`support.test.mjs`): `runCheck` of a self-killing script resolves non-zero; `collect` of a parent-killed child resolves `code 1, signal "SIGTERM"`; a real exit code (5) passes through with `signal: null`. `check-wcag.mjs --self-test` re-run green after the edit.

### WR-04: Plural and agent-noun forms of the line-91 prohibited word pass the audit

**Files modified:** `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs`
**Commit:** `204f70d`
**Status:** fixed: requires human verification
**Applied fix:** the inherited line-91 entry was NOT edited (boundary 3). A new D-18 extension entry was appended: `/\bsimulat(?!(?:e|es|ed|ion|ing)\b)/i` (`kind: "never"`, `allowQuoted: true`) — it catches every remaining form of the stem and excludes exactly the suffixes the inherited entry already covers, so a single occurrence is still reported exactly once (the existing "caught exactly once, not twice" fixture still passes). Fixtures assemble the stem at runtime so the test file never spells the word: plural noun trips with `Hits: 1`; agent noun trips with `Hits: 1`; singular still exactly once; "stimulating" passes; a word containing the stem past a word boundary passes; a quoted-to-retire use is excused. Rule count is now 27. **Please confirm** the SHEQ manager is content with an extension entry (rather than an edit to the inherited entry) as the register's way of closing this gap.

### WR-05: The `$`/`USD` branch of both cash-saving rules is unreachable

**Files modified:** `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs`
**Commit:** `245da6e`
**Status:** fixed: requires human verification
**Applied fix:** both patterns are D-18 additions (below the divider), so the reviewer's regexes were applied verbatim: `(?:\b(?:R|ZAR|USD)|\$)` guards the letter currencies with `\b` and leaves `$` unguarded. Probed directly before applying (22/22 cases as expected). Fixtures: "$5 million saved", "USD 1.2m saved" and "saves $40 000" trip; "Invoice $ 1024 is open." and the existing "Work order R 1024" pass. **Please confirm** the wider `$` reach is acceptable for TypeScript sources (a `$<digit>` within 40 characters of "saved/saving/savings/avoided" now trips; the real repository has 0 hits).

### WR-06: `RETIREMENT_MARKER` includes `no model`, which every honesty surface already contains

**Files modified:** `scripts/claims-audit.mjs`, `scripts/claims-audit.test.mjs`
**Commit:** `884af9a`
**Status:** fixed: requires human verification
**Applied fix:** compared the marker with the sibling's (`../ipv-demo/scripts/claims-audit.mjs` lines 123-124): every alternative up to `never claim` is inherited verbatim; `never as (a )?finding|no model` are Capture's additions. Only `no model` was removed (it is product copy, not a retirement note). `out of scope` and `rather than claimed`, which the reviewer also proposed removing, are **inherited** alternatives and were left untouched under boundary 3 — this residual conflict needs a developer decision (removing `out of scope` would also break two existing excused fixtures). Fixtures: an `allowQuoted` phrase two lines below "No model ran." is now reported (`live violations: 1`); the same phrase beside a genuine retirement note is still excused; the existing "no model ran" pass-case still exits 0. The real repository stays at 0 hits.

### WR-07: A governed field that is not a double-quoted literal silently drops out of the sweep

**Files modified:** `scripts/check-governed.mjs`, `scripts/check-governed.test.mjs`
**Commits:** `40d3897`, then `cd27bc1` (assertion messages carry the child's stderr)
**Status:** fixed
**Applied fix:** `extractField` now requires one double-quoted literal that is the whole value (`"..."` followed by `,` or `}`) and returns `null` otherwise — single quotes, template literals and concatenations all yield `null`. `needleFor(key, fields)` reports `has no extractable <fields>` for any null field and `is empty` for a sentence with no text, for the eight GOVERNED entries and PLATFORM_413 alike; the `?? ""` defaults are gone. Fixtures: single-quoted field, template literal, concatenation, single-quoted PLATFORM_413 and an all-empty entry each exit non-zero with the named message; the real module and the render fixture still exit 0.

### WR-08: The closed-set assertion only sees `lib/copy/governed.ts` and only `export const NAME = {`

**Files modified:** `scripts/check-governed.mjs`, `scripts/check-governed.test.mjs`
**Commit:** `a7e753f`
**Status:** fixed: requires human verification
**Applied fix:** new section 3 sweeps every `.ts`/`.tsx` under `app/`, `components/`, `lib/` for `/\bbefore\s*:[\s\S]{0,300}?\bstrong\s*:[\s\S]{0,300}?\bafter\s*:/` after blanking `type X = {...}` and `interface X {...}` blocks (they carry the field names, not a sentence); in `lib/copy/governed.ts` the GOVERNED and PLATFORM_413 object literals are blanked first (their spans are now returned as `ownedRanges`), so any other shape there — non-exported, frozen, nested — is a defect. The `export const` precondition is no longer load-bearing (the older named check remains for its clearer message). Fixtures: a second module under `lib/`, a non-exported const in `governed.ts`, an `Object.freeze(...)` export, and a shaped const inside a component each exit non-zero naming file and line; a `type`/`interface` carrying the three names with a component that destructures them exits 0. Header comment updated to state the wider guarantee. **Please confirm** the type-blanking heuristic (regex-located `type`/`interface` declarations, brace-balanced) is acceptable as the boundary between "field names" and "a sentence".

### WR-09: An empty `vercel.json` passes the header check

**Files modified:** `scripts/check-headers.mjs`, `scripts/check-headers.test.mjs`
**Commit:** `52f55e8`
**Status:** fixed
**Applied fix:** parse whenever the read succeeded (`readOk`), never only when the text is truthy; a parse result that is `null`, an array or a non-object is reported as `is not a JSON object`. An empty file now fails with `does not parse as JSON`. Fixtures: empty file, `null`, `[]` each exit non-zero with the named message.

### WR-10: Empty `next.config.ts` and empty build log both pass the structure check

**Files modified:** `scripts/check-structure.mjs`, `scripts/check-structure.test.mjs`, `scripts/verify.mjs`, `scripts/verify.test.mjs`
**Commit:** `69c16d7`
**Status:** fixed
**Applied fix:** `check-structure.mjs` asserts on read success (`!== null`) and reports `next.config.ts is empty` / `build output log ... is empty`. `verify.mjs`'s `spawnStep` is now `async`: it `rm`s any stale file at `step.capture` before spawning, and a capture that cannot be written resolves the step as 1 (when the child itself exited 0; a child's own non-zero code is never masked) with a stderr line naming the step. Fixtures: empty `next.config.ts` and empty `build.log` exit non-zero; `spawnStep` with an unwritable capture path resolves non-zero and names the failure; a stale log is replaced by this run's output; a stale log is removed even when the child is killed before writing.

### WR-11: A `null` exemption register passes the token check

**Files modified:** `scripts/check-tokens.mjs`, `scripts/check-tokens.test.mjs`
**Commit:** `2c61f29`
**Status:** fixed
**Applied fix:** a separate `parsed` flag is the sentinel; `JSON.parse("null")` now reaches the `Array.isArray` assertion and fails it. Fixtures: `null` and `{}` registers each exit non-zero with `is not an array`.

### WR-12: An empty or non-array pairs file passes the contrast check vacuously

**Files modified:** `scripts/check-contrast.mjs`, `scripts/check-contrast.test.mjs`
**Commit:** `5547f69`
**Status:** fixed
**Applied fix:** `pairs` must be a non-empty array, else `must be a non-empty array of ink/ground pairs` is a defect. The reviewer's further suggestion to pin the expected pair ids in the check was **not** applied: it would couple the check to a register that later phases extend, and the boundary asked only that the fail-open be closed. Fixtures: `[]`, `{}` and `null` each exit non-zero with the named message; the six real ratios still print and pass.

### WR-13: `axe-core` is imported but not declared in `package.json`

**Files modified:** `package.json`, `package-lock.json`, `scripts/scaffold.test.mjs`
**Commit:** `c8a4ca7`
**Status:** fixed
**Applied fix:** `"axe-core": "4.13.0"` added to `devDependencies` (exact, matching the already-resolved copy); `npm install` produced a one-line lockfile change (the root `devDependencies` entry only — no re-resolution). `scaffold.test.mjs` asserts the declared pin and the installed version. Committed together.

### WR-14: Build-log capture concatenates raw chunks, which can split the multibyte route glyphs

**Files modified:** `scripts/verify.mjs`, `scripts/verify.test.mjs`
**Commit:** `23b14b0`
**Status:** fixed
**Applied fix:** chunks are collected as Buffers and decoded once with `Buffer.concat(chunks).toString("utf8")` at close. Fixture: a child writes the first byte of `┌ ○ /` alone and the rest 200 ms later; the captured log contains the intact row and no U+FFFD. The same bytes decoded per chunk (the old code path) were shown to produce `��� ○ /`, so the fixture discriminates.

### WR-15: The production-aliasing job has no `timeout-minutes`

**Files modified:** `.github/workflows/verify.yml`, `scripts/verify.test.mjs`
**Commit:** `76042e9`
**Status:** fixed
**Applied fix:** `timeout-minutes: 20` on the `verify` job, with the reasoning in a YAML comment. Why 20: the gate itself takes about a minute here, and the hosted run adds `npm ci` and a Chromium install, so a healthy CI run is a few minutes; 20 is several times that margin while stopping any repeat of the recorded 46-minute hang well short of GitHub's six-hour default. The workflow test asserts the key is present and within 10-30 minutes.

## Skipped Issues

### WR-16: `<strong>` at weight 500 has no loaded face for the body family, so Limits' load-bearing clauses render unemphasised

**File:** `app/globals.css:113`, `app/layout.tsx:20-25`, `components/limits/Limits.tsx:22`
**Reason:** skipped: needs a developer decision — the finding is a conflict inside the approved design contract itself (project boundary 4). 01-UI-SPEC locks one weight per family and `<strong>` at weight 500 (never 700); DM Sans is loaded at `["400"]` only, so a requested 500 falls back to 400 with no synthesis and the eight `<strong>` clauses in the Limits body are visually identical to their sentences. Both reviewer remedies are out of scope for this fixer: loading a second weight breaks the one-weight-per-family lock, changing the weight breaks the `<strong>` lock, and a colour promotion for `.prose strong` is a design decision the UI-SPEC does not currently authorise. No code was changed for this finding.
**Original issue:** `strong { font-weight: 500 }` is the only emphasis rule for `.prose`; with DM Sans loaded at 400 only, CSS font matching selects 400 and does not synthesise (synthesis applies at 600+), so the honesty surface's stated intent ("wrap the load-bearing clause in `<strong>`") is preserved semantically but invisible on the surface where all eight sentences appear. The ribbon is unaffected because `.sentence strong` also changes colour.

## Residual notes for the developer

- WR-06: `out of scope` and `rather than claimed` remain in `RETIREMENT_MARKER` because they are inherited verbatim from ipv-demo; the reviewer's proposal to remove them (or to require the marker on the hit's own line) conflicts with boundary 3 and with two existing excused fixtures. Decide whether the sibling register should change first.
- WR-12: pair-id pinning was deliberately not added (see above).
- WR-16: needs the UI-SPEC decision recorded before any code changes.
- The 12 Info findings (IN-01 to IN-12) were outside `fix_scope: critical_warning` and were not attempted.

---

_Fixed: 2026-09-08T12:00:22Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
