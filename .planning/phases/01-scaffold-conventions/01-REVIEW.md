---
phase: 01-scaffold-conventions
reviewed: 2026-09-08T11:00:00Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - .github/workflows/verify.yml
  - README.md
  - app/globals.css
  - app/layout.tsx
  - app/page.tsx
  - app/styles/tokens.capture.css
  - app/styles/tokens.inherited.css
  - components/limits/Limits.module.css
  - components/limits/Limits.tsx
  - components/shell/Ribbon.module.css
  - components/shell/Ribbon.tsx
  - docs/analysis/deployment-gate.md
  - docs/analysis/scheduled-work.md
  - docs/analysis/vercel-regions.md
  - docs/design/dead-token-register.md
  - docs/design/decorative-exemptions.json
  - eslint.config.mjs
  - lib/copy/governed.ts
  - next.config.ts
  - package.json
  - scripts/check-contrast.mjs
  - scripts/check-contrast.pairs.json
  - scripts/check-contrast.test.mjs
  - scripts/check-deployment.mjs
  - scripts/check-deployment.test.mjs
  - scripts/check-governed.mjs
  - scripts/check-governed.test.mjs
  - scripts/check-headers.mjs
  - scripts/check-headers.test.mjs
  - scripts/check-structure.mjs
  - scripts/check-structure.test.mjs
  - scripts/check-sw.mjs
  - scripts/check-sw.test.mjs
  - scripts/check-tokens.mjs
  - scripts/check-tokens.test.mjs
  - scripts/check-wcag.mjs
  - scripts/claims-audit.mjs
  - scripts/claims-audit.test.mjs
  - scripts/lib/fixtures.mjs
  - scripts/lib/harness.mjs
  - scripts/lib/server.mjs
  - scripts/lib/server.test.mjs
  - scripts/lib/support.test.mjs
  - scripts/scaffold.test.mjs
  - scripts/verify.mjs
  - scripts/verify.test.mjs
  - tsconfig.json
  - vercel.json
findings:
  critical: 1
  warning: 16
  info: 12
  total: 29
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-09-08T11:00:00Z
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found

## Summary

Reviewed the Phase 1 scaffold: the Next.js 16.3.4 app shell (`app/`, `components/`, `lib/copy/governed.ts`), the two-layer token system, the eleven check scripts and their fixture suite under `scripts/`, the `verify.mjs` gate, the CI workflow, and the dated analysis docs. Locked decisions (`vercel.json` headers and region, `next.config.ts` failing without a build id, `shell: true` for `npx` invocations) were treated as settled and are not reported.

The app surface itself is small and mostly sound: no untrusted input reaches markup, the ribbon and Limits surfaces render from the governed module, and the token/contrast/structure discipline is genuinely enforced. The defects are concentrated in the gate and check scripts, which is where the project puts its trust. The pattern that recurs is **fail-open on an unexpected input shape**: a signal-killed child resolves as exit 0 in the gate runner (CR-01); an empty `vercel.json`, an empty `next.config.ts`, an empty build log, a `null` exemption register and an empty pairs file all pass their respective checks; a governed sentence written with single quotes silently drops out of the duplicate sweep; and the gate's own entry guard (`import.meta.main`) is a silent no-op on the Node 24.0/24.1 releases that `engines` still admits. Two register regexes in `claims-audit.mjs` have provable gaps (a dead `$` branch and unmatched plural/agent-noun forms of the line-91 word), and the documented `npm test` command runs 2 of 12 test files on a POSIX shell.

Every Critical and Warning below was traced against the source and, where a regex or shell behaviour was in question, executed directly on this machine (Node v24.19.0, Git Bash `sh`).

## Critical Issues

### CR-01: The gate resolves a signal-terminated step as exit 0

**File:** `scripts/verify.mjs:181-191`
**Issue:** `spawnStep` resolves `code ?? 0` from the child's `close` event. When a step is killed by a signal (OOM `SIGKILL` on Vercel or GitHub, a `SIGTERM` from a runner cancellation, a crash that surfaces as a signal), Node reports `code === null` and `signal !== null`. The gate then treats that step as a pass and continues to the next one. This directly contradicts the file's own contract ("Never converts a non-zero result into 0", line 146) and `verify.test.mjs:176-188`, which asserts by source grep that no such branch exists but does not catch this one. A `tsc`, `eslint`, or any `check-*` step killed mid-run would print no failure and the run would end with "All steps exited 0". The same expression appears in the fixture harness and the WCAG builder (see WR-03).
**Fix:**
```js
child.on("close", async (code, signal) => {
  if (step.capture) { /* unchanged */ }
  if (code === null) {
    process.stderr.write(
      `\n✖ step "${step.id}" was terminated by ${signal ?? "an unknown signal"} — treated as a failure\n`,
    );
    resolveSpawn(1);
    return;
  }
  resolveSpawn(code);
});
```
Add a `runSteps`/`spawnStep` fixture in `verify.test.mjs` that spawns a child which kills itself with `process.kill(process.pid, "SIGTERM")` and asserts the resolved code is non-zero.

## Warnings

### WR-01: `import.meta.main` guard is a silent no-op on Node 24.0 and 24.1

**File:** `scripts/verify.mjs:211` (and `package.json:5-7`)
**Issue:** `import.meta.main` was added in Node 24.2.0. On 24.0.x/24.1.x it is `undefined`, so `if (import.meta.main)` is false, nothing runs, and `node scripts/verify.mjs` exits 0 having checked nothing. `engines.node` is `"24"`, which admits those releases, and `scaffold.test.mjs:83-85` pins that exact string. The hosted runners currently resolve to a late 24.x, so the exposure today is a developer machine, but the failure mode is a green gate that ran zero steps.
**Fix:** Either tighten `engines.node` to `">=24.2 <25"` (and update `scaffold.test.mjs:84` accordingly), or make the guard fail closed:
```js
if (import.meta.main === undefined) {
  console.error("verify.mjs requires Node >= 24.2 (import.meta.main is unsupported)");
  process.exit(1);
}
if (import.meta.main) { /* ... */ }
```

### WR-02: `npm test` and the README command run 2 of 12 test files on a POSIX shell

**File:** `package.json:13`, `README.md:26,33`
**Issue:** `node --test scripts/**/*.test.mjs` is passed to the shell unquoted. npm runs scripts through `sh` on Linux/macOS, where `**` is a plain `*` (no globstar), so the pattern expands to `scripts/lib/server.test.mjs scripts/lib/support.test.mjs` only — verified with `sh -c 'echo scripts/**/*.test.mjs'` on this machine's Git Bash. The ten top-level `scripts/*.test.mjs` files are never run by `npm test` there. On Windows, cmd.exe does not expand globs, so Node receives the literal and expands it itself, which is why this passed locally. The `verify.mjs` fixture-suite step is unaffected (it passes the glob unshelled), but the README presents the shell form as "the fast fixture suite alone".
**Fix:** Quote the glob so Node, not the shell, expands it on every platform:
```json
"test": "node --test \"scripts/**/*.test.mjs\""
```
Update `scaffold.test.mjs:97` and the two README lines to match.

### WR-03: The same `code ?? 0` fail-open in the fixture harness and the WCAG builder

**File:** `scripts/lib/fixtures.mjs:60`, `scripts/check-wcag.mjs:210`
**Issue:** Both `collect()` and `runToCompletion()` resolve `code ?? 0`. In `fixtures.mjs` this means every "the real repository exits 0" test passes if the check script is signal-killed. In `check-wcag.mjs` a signal-killed `next build` is treated as success, and the scan proceeds to `next start` against whatever `.next/` happened to be on disk (a stale build from the earlier `next-build` step), scanning an artefact that is not the one just built.
**Fix:** Resolve `code === null ? 1 : code` in both places, and surface the signal in the returned object so the test assertion message shows it:
```js
child.on("close", (code, signal) =>
  resolve({ code: code === null ? 1 : code, signal, stdout, stderr }),
);
```

### WR-04: Plural and agent-noun forms of the line-91 prohibited word pass the audit

**File:** `scripts/claims-audit.mjs:91`
**Issue:** The pattern ends its `(e|es|ed|ion|ing)` alternation with `\b`. The plural noun form (stem + `ions`) and the agent noun (stem + `or`) therefore do not match — confirmed by running the regex directly: both return `false`. The inline note says the register bans "its every grammatical form"; this one does not.
**Fix:** Drop the trailing word boundary and let the stem carry the ban:
```js
pattern: /\bsimulat/i,
```
Add a MUST-TRIP fixture for the plural form to `claims-audit.test.mjs`.

### WR-05: The `$`/`USD` branch of both cash-saving rules is unreachable

**File:** `scripts/claims-audit.mjs:186,191`
**Issue:** Both patterns open with `\b(R|ZAR|\$|USD)`. `\b` requires a word character on one side; `$` is a non-word character and is almost always preceded by a space, so `\b\$` never matches in prose. Verified: `"about $5 million saved"` returns `false` against rule 186, while `"about R5 million saved"` returns `true`. Any dollar-denominated saving claim passes the audit.
**Fix:** Move the boundary inside the alternation so it only guards the letter forms:
```js
/(?:\b(?:R|ZAR|USD)|\$)\s?\d[\d ,.]*\s*(k|m|bn|million|billion)?\b.{0,40}\b(saved|saving|savings|avoided)\b/i
/\b(saves?|saving|savings)\b.{0,30}(?:\b(?:R|ZAR|USD)|\$)\s?\d/i
```
Add `$` fixtures to the existing modelled-savings tests.

### WR-06: `RETIREMENT_MARKER` includes `no model`, which every honesty surface already contains

**File:** `scripts/claims-audit.mjs:197-198`
**Issue:** The excuse marker is tested over a seven-line window around any `allowQuoted` hit. `lib/copy/governed.ts:49-60` contains both "No model ran." and "no model observed"; `components/limits/Limits.tsx` renders all eight sentences within a few lines of each other. Any `allowQuoted` prohibited phrase (funding, residency, sovereignty, load-shedding, TRL, competitor names, the findings-verb family, the line-91 word) placed near a governed sentence is therefore auto-excused as "quoted to retire". `out of scope` and `rather than claimed` are similarly generic. The marker was meant to recognise a retirement note, not ordinary product copy.
**Fix:** Remove `no model`, `out of scope` and `rather than claimed` from the marker (or require them in the same line as the hit rather than the window), and add a MUST-TRIP fixture that places an `allowQuoted` phrase two lines below a sentence containing "no model".

### WR-07: A governed field that is not a double-quoted literal silently drops out of the sweep

**File:** `scripts/check-governed.mjs:140-144,238-244`
**Issue:** `extractField` only matches `field: "..."`. A field written with single quotes, a template literal, or a concatenation (`"a" + "b"`) returns `null`, becomes `""`, and at line 240 an empty sentence is skipped without recording a problem. Nothing in the lint chain enforces double quotes. The effect is that one edit to quote style removes that sentence's duplicate protection while the check still prints "Every governed sentence is defined once". `PLATFORM_413` at line 254-261 has the same hole.
**Fix:** Treat an empty extracted sentence for any locked key as a defect:
```js
if (sentence.length === 0) {
  problems.push(`${GOVERNED_PATH} entry "${entry.key}" has no extractable before/strong/after — fields must be double-quoted string literals (D-09)`);
  continue;
}
```

### WR-08: The closed-set assertion only sees `lib/copy/governed.ts` and only `export const NAME = {`

**File:** `scripts/check-governed.mjs:157-207`
**Issue:** The header (lines 15-19) promises "A ninth sentence, wherever it is added, fails the build". The implementation reads one file and only recognises `export const X = {`. A ninth `GovernedSentence` in `lib/copy/more.ts`, a non-exported `const` in the same file, an `export { X }` re-export, `Object.freeze({...})`, or an array of sentences is never examined. The TS type `Record<GovernedKey, ...>` protects `GOVERNED` itself; nothing protects the module boundary.
**Fix:** Sweep every `.ts`/`.tsx` file under `ROOTS` for the `before`/`strong`/`after` shape (`/\bbefore\s*:[\s\S]{0,300}?\bstrong\s*:[\s\S]{0,300}?\bafter\s*:/`) and fail on any occurrence outside `GOVERNED` and `PLATFORM_413` in `lib/copy/governed.ts`; drop the `export const` precondition inside that file.

### WR-09: An empty `vercel.json` passes the header check

**File:** `scripts/check-headers.mjs:59-75`
**Issue:** `readFile` of a zero-byte file succeeds with `raw = ""`. `if (raw)` is false, so no JSON parse is attempted, `config` stays `null`, no problem is pushed, and the script exits 0 announcing "every declared header match D-04 exactly".
**Fix:** Parse unconditionally once the read succeeded, and treat a non-object result as a defect:
```js
let config = null;
if (readOk) {
  try { config = JSON.parse(raw); } catch (e) { problems.push(...); }
  if (config === null || typeof config !== "object") problems.push(`${VERCEL_JSON} is empty or not a JSON object`);
}
```

### WR-10: Empty `next.config.ts` and empty build log both pass the structure check

**File:** `scripts/check-structure.mjs:68-89,134-143` (and `scripts/verify.mjs:181-189`)
**Issue:** Two `if (text)` gates skip every assertion when the file is empty. (a) A zero-byte `next.config.ts` passes checks 2, 3 and 5 (`cacheComponents: true` is never asserted). (b) In `--build-output` mode, an empty `build.log` passes the D-11 static-marker assertion. (b) compounds with `verify.mjs:186-188`, which prints a message and continues when writing `build.log` fails — leaving a previous run's log on disk to be parsed as if it were this build's.
**Fix:** In `check-structure.mjs`, assert on read success rather than truthiness (`if (nextConfigSrc !== null)`, `if (logText !== null)`), and push a problem when the string is empty. In `verify.mjs`, make a failed capture write resolve the step as non-zero, and delete any stale `build.log` before spawning the `next-build` step.

### WR-11: A `null` exemption register passes the token check

**File:** `scripts/check-tokens.mjs:203-211`
**Issue:** `JSON.parse("null")` yields `null`, which the code uses as its "parse failed" sentinel. The `if (exemptions !== null)` guard therefore skips the array/count/shape assertions without recording a problem, and the check reports "the decorative-exemption register has exactly its four entries".
**Fix:** Use a separate `parsed` flag, or check `Array.isArray` unconditionally after a successful parse:
```js
let parsed = false, exemptions;
try { exemptions = JSON.parse(exemptionsRaw); parsed = true; } catch (e) { problems.push(...); }
if (parsed && !Array.isArray(exemptions)) problems.push(`${EXEMPTIONS_PATH} is not an array`);
```

### WR-12: An empty or non-array pairs file passes the contrast check vacuously

**File:** `scripts/check-contrast.mjs:240`
**Issue:** `Array.isArray(pairs) ? pairs : []` iterates nothing when `check-contrast.pairs.json` is `[]`, `{}`, or `null`, and the script exits 0 with "Every ink-on-ground pair meets its floor". Deleting the pairs is the easiest way to silence a contrast defect, and the register-only-source-of-exceptions promise in the header does not cover it.
**Fix:** Require a non-empty array and, since Phase 1's surfaces are fixed, pin the expected pair ids:
```js
if (!Array.isArray(pairs) || pairs.length === 0) problems.push(`${PAIRS_PATH} must be a non-empty array`);
```

### WR-13: `axe-core` is imported but not declared in `package.json`

**File:** `scripts/check-wcag.mjs:50` (and `package.json:21-32`)
**Issue:** `import axe from "axe-core"` resolves only because npm hoists `@axe-core/playwright`'s transitive dependency. It is not in `devDependencies`, so a lockfile regeneration or a nested install layout breaks the startup guard, and the guard at line 77 may inspect a different `axe-core` copy than the one `@axe-core/playwright` actually runs, making the wcag22aa tag assertion prove the wrong package.
**Fix:** Add `"axe-core": "4.13.0"` to `devDependencies` (matching the pinned `@axe-core/playwright`), and extend `scaffold.test.mjs`'s installed-version assertions to it.

### WR-14: Build-log capture concatenates raw chunks, which can split the multibyte route glyphs

**File:** `scripts/verify.mjs:172-180`
**Issue:** `combined += chunk` implicitly calls `Buffer#toString()` on each chunk. The characters `check-structure --build-output` parses (`┌`, `├`, `└`, `○`, `◐`) are three-byte UTF-8 sequences; a chunk boundary inside one produces U+FFFD in the captured log, and the route row regex at `check-structure.mjs:147` then fails to match, failing the gate for a reason unrelated to the build.
**Fix:** Collect `Buffer`s and decode once:
```js
const chunks = [];
child.stdout?.on("data", (c) => { process.stdout.write(c); if (step.capture) chunks.push(c); });
// on close:
await writeFile(step.capture, Buffer.concat(chunks).toString("utf8"), "utf8");
```

### WR-15: The production-aliasing job has no `timeout-minutes`

**File:** `.github/workflows/verify.yml:9-18`
**Issue:** This job is registered as the Vercel Deployment Check that holds production aliasing. `docs/analysis/deployment-gate.md:106-115` records a 46-minute hang in exactly this job (run 34196058170) before the orphan-server fix. With no `timeout-minutes`, any future hang (an unanswered `fetch` loop, a browser that never closes, a stuck `npx` prompt) holds production for GitHub's default six hours before the check resolves.
**Fix:**
```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
```
`verify.test.mjs:206-224` should assert the key is present.

### WR-16: `<strong>` at weight 500 has no loaded face for the body family, so Limits' load-bearing clauses render unemphasised

**File:** `app/globals.css:113`, `app/layout.tsx:20-25`, `components/limits/Limits.tsx:22`
**Issue:** `strong { font-weight: 500 }` is the only emphasis rule for `.prose`. DM Sans is loaded via `next/font/google` at `weight: ["400"]` only. CSS font matching for a requested 500 with only 400 available selects 400 and does not synthesise (synthesis applies at 600+), so in the Limits body the eight `<strong>` clauses are visually identical to the surrounding sentence. The ribbon is unaffected because `.sentence strong` also changes colour. The honesty surface's stated intent (`governed.ts:6-7`, "wrap the load-bearing clause in `<strong>`") is preserved semantically but invisible on the surface where all eight sentences appear.
**Fix:** Either give `.prose strong` a colour promotion like the ribbon (`color: var(--viewer-ink)` is already the `.prose` colour, so choose a distinct permitted ink) or load DM Sans at `["400", "500"]` and update the single-weight-per-family note. Confirm the choice against 01-UI-SPEC's type-role lock before changing weights.

## Info

### IN-01: `searchParams` typed narrower than Next's runtime shape

**File:** `app/page.tsx:14,26`
**Issue:** Next delivers `string | string[] | undefined` per key; `?s=limits&s=x` arrives as an array and the `=== "limits"` branch silently falls to the shell. Harmless today, but the type invites a future `s.startsWith(...)` that would throw.
**Fix:** Type as `Promise<{ s?: string | string[] }>` and normalise with `Array.isArray(s) ? s[0] : s`.

### IN-02: `themeColor` duplicates `--navy-deep` as a literal

**File:** `app/layout.tsx:45`
**Issue:** `#0c1e35` is restated outside the token files; the token check cannot see drift here.
**Fix:** Add a comment naming the token it mirrors, or derive it from a shared constant module also consumed by the CSS build.

### IN-03: `--safe-x` uses only the left safe-area inset for both horizontal paddings

**File:** `app/styles/tokens.capture.css:64`, `components/limits/Limits.module.css:8`
**Issue:** `max(env(safe-area-inset-left), 16px)` is applied as both left and right padding. In landscape with a right-side notch the right inset is ignored.
**Fix:** Declare `--safe-r: max(env(safe-area-inset-right), 16px)` if landscape is ever in scope; otherwise note the portrait-only assumption next to the token.

### IN-04: Dismiss-word regex matches "disclosure"

**File:** `scripts/check-wcag.mjs:148-158`
**Issue:** `/dismiss|close|hide/i` matches "dis**close**ure" and "en**close**d". The section's own `aria-label="Preview disclosure"` is excluded only because the locator searches descendants; any descendant that inherits that label text would false-positive.
**Fix:** Use word boundaries: `/\b(dismiss|close|hide)\b/i`.

### IN-05: Fixed port and any-response readiness in the WCAG scan

**File:** `scripts/check-wcag.mjs:63,279-288`
**Issue:** Port 4311 is hard-coded and the readiness loop accepts any `fetch` that does not throw. A leftover server (or any process) on 4311 is scanned in place of the freshly built one.
**Fix:** Bind `next start -p 0` is not supported, so probe that 4311 is free before starting (`net.createServer().listen`) and fail if it is not; require a 200 with the ribbon landmark in the readiness body.

### IN-06: `--build-output` with no path argument silently degrades to source-only mode

**File:** `scripts/check-structure.mjs:129-133`
**Issue:** `process.argv[i + 1]` is `undefined` when the flag is last; the script runs the five source assertions and exits 0 as if the build-output mode had passed.
**Fix:** `if (buildOutputFlagIndex !== -1 && !buildOutputPath) { problems.push("--build-output requires a path"); }`.

### IN-07: Service-worker registration sweep is a single exact substring

**File:** `scripts/check-sw.mjs:69`
**Issue:** `serviceWorker.register(` misses `serviceWorker?.register(`, `serviceWorker.register (`, `["register"](`, and a registration issued from an inline `<Script>` string.
**Fix:** `/serviceWorker\s*\??\.\s*register\s*\(|\["register"\]\s*\(/`.

### IN-08: Exemption lookup ignores `kind`; ground alpha is ignored

**File:** `scripts/check-contrast.mjs:162-169,266-268`
**Issue:** An exemption keyed on ink+ground exempts both a text pair and a non-text pair sharing those tokens. `compositeOverGround` composites the ink only; a ground with alpha is used as if opaque.
**Fix:** Add `kind` to exemption entries and to the match; reject (or composite over `--navy-deep`) a ground whose parsed `a < 1`.

### IN-09: README, `docs/`, and `public/` sit outside both sweeps

**File:** `scripts/claims-audit.mjs:34`, `scripts/check-governed.mjs:29`
**Issue:** `ROOTS` are `app`, `components`, `lib`. README and the docs are reviewer-facing; `public/manifest.webmanifest` (a later phase) will carry a name/description. All were run against the register during this review (copied under a fixture `lib/`) and are clean today, but nothing keeps them so.
**Fix:** Add `README.md`, `docs`, and `public` to the claims audit's roots (with `.json`/`.webmanifest` in `EXT`), keeping check-governed's roots as they are.

### IN-10: Workflow has no `permissions:` block and actions are tag-pinned

**File:** `.github/workflows/verify.yml:12-13`
**Issue:** The job needs read access only; the default token may be write. `actions/checkout@v4` / `setup-node@v4` float on a mutable tag.
**Fix:** Add `permissions: { contents: read }` at the top level and pin the two actions to commit SHAs.

### IN-11: The `strong` clause alone is not swept for duplicates

**File:** `scripts/check-governed.mjs:239-243,279-285`
**Issue:** The needle is the whole `before+strong+after` string. A standalone restatement of just the `strong` clause (the load-bearing wording) passes. This may be by design; if so, say so in the header, which currently reads as covering "any of these sentences".
**Fix:** Add `strong` alone as a second needle where `strong.length > 12`, or document the scope.

### IN-12: DEP0190 exposure on `shell: true` with an args array

**File:** `scripts/verify.mjs:167-171`, `scripts/lib/fixtures.mjs:92-96`, `scripts/check-wcag.mjs:205`, `scripts/scaffold.test.mjs:37`, `scripts/check-structure.test.mjs:191-195`
**Issue:** Node 24 emits DEP0190 for `spawn(cmd, args, { shell: true })`. Deliberate here for Windows `npx` resolution; noted only so a future Node major that turns the deprecation into an error is anticipated.
**Fix:** No change now. When it becomes an error, join into a single command string for the shelled calls.

---

_Reviewed: 2026-09-08T11:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
