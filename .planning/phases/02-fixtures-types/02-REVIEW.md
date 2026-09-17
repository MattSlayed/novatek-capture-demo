---
phase: 02-fixtures-types
reviewed: 2026-09-17T07:33:16Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - docs/analysis/provenance-check.md
  - lib/data/artisans.ts
  - lib/data/fixtures.ts
  - lib/data/observations.ts
  - lib/data/orders.ts
  - lib/data/plant.ts
  - lib/data/register.ts
  - lib/data/types.ts
  - scripts/check-fixture-hash.mjs
  - scripts/check-fixture-hash.test.mjs
  - scripts/check-fixture-shape.test.mjs
  - scripts/check-observations.mjs
  - scripts/check-observations.test.mjs
  - scripts/check-register-isolation.mjs
  - scripts/check-register-isolation.test.mjs
  - scripts/verify.mjs
  - scripts/verify.test.mjs
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 2: Fixtures & types Code Review Report

**Reviewed:** 2026-09-17T07:33:16Z
**Depth:** standard
**Files Reviewed:** 16 (one of the 17 listed files, `docs/analysis/provenance-check.md`, is a markdown document read for cross-checking, not a source file with lines to fix)
**Status:** issues_found

## Summary

Read all seventeen listed files against the phase's locked decisions (`02-CONTEXT.md` D-01..D-20) and the seven plans' threat models (T-2-01..T-2-31, T-2-SC). Cross-checked `docs/analysis/provenance-check.md` row-for-row against `lib/data/observations.ts` and `lib/data/plant.ts` (citations, quoted sentences, grades, relations all agree), verified `orders.ts`'s claimed "deduplicated, sorted union of governing_docs" by hand for all five orders, verified `artisans.ts` / `orders.ts` assignment symmetry, confirmed no TypeScript `enum`, no banned "simulation" wording, and no forbidden `lib/store`/`lib/reconcile`/`lib/access` imports anywhere under `lib/data/`. Ran the full fixture suite (63/63 passing) and `check-fixture-hash.mjs` (clean, hash matches the pin).

Despite the green suite, two reproducible defects were found by exercising the check scripts against controlled fixtures outside the repository (never modifying tracked files):

1. **`check-fixture-hash.mjs` silently passes if the pinned hash constant is removed from `lib/data/fixtures.ts`** — the exact failure mode D-14 exists to prevent. Reproduced below.
2. **`check-register-isolation.mjs`'s source-mode walk does not see a dynamic `import()`** of the register, so a client component that reaches `lib/data/register.ts` via `await import(...)` gets a clean "no module... reaches the register" report from this step, even though D-17 describes the walk as catching every transitive reach. Reproduced below.

Two lower-priority observations are also recorded for awareness (INFO).

## Critical Issues

### CR-01: `check-fixture-hash.mjs` exits 0 when the pinned `FIXTURE_CONTENT_SHA256` export is missing

**File:** `scripts/check-fixture-hash.mjs:66-104`
**Issue:**
The script checks `FIXTURE_VERSION` for absence explicitly (lines 66-72: `else if (FIXTURE_VERSION === undefined && problems.length === 0)`), but there is no equivalent absence check for `FIXTURE_CONTENT_SHA256`. The hash-comparison block only fires when `FIXTURE_CONTENT_SHA256 !== undefined` is true (lines 96-104):

```js
if (
  recomputed !== null &&
  FIXTURE_CONTENT_SHA256 !== undefined &&
  recomputed !== FIXTURE_CONTENT_SHA256
) {
  problems.push(`fixture content hash mismatch: ...`);
}
```

If `lib/data/fixtures.ts` no longer exports `FIXTURE_CONTENT_SHA256` (deleted by accident, or dropped during a merge/rebase, while `FIXTURE_VERSION` is left intact and valid), the import succeeds, `FIXTURE_CONTENT_SHA256` destructures to `undefined`, no problem is ever pushed for it, and the script prints `Problems: 0` and exits 0 — silently disabling the whole content-hash gate that D-14 exists to enforce ("Fixture content cannot change without this pin being re-cut"). This is precisely the "a check whose fixtures cannot fail"/"a check that warns, skips, or silently passes" failure class T-2-14/T-2-30 are meant to rule out, and it is not covered by any existing fixture in `check-fixture-hash.test.mjs` (which only tests a *wrong* pin value, a CRLF conversion, and one-character content drift with the pin *present* — never an *absent* pin).

**Reproduced** (against a disposable copy outside the repository, `lib/data/fixtures.ts` reduced to only `export const FIXTURE_VERSION = "capture-fixtures/2026.09.1";` with the four real fixture files unchanged):

```
FIXTURE HASH CHECK
========================================================================
Problems: 0

The recomputed content hash over plant.ts, artisans.ts, orders.ts and
observations.ts matches the pin in lib/data/fixtures.ts, and
FIXTURE_VERSION carries the expected shape.
```
Exit code: 0.

**Fix:** add the missing absence check, symmetric with the `FIXTURE_VERSION` one, and a fixture test proving it:

```js
if (FIXTURE_CONTENT_SHA256 === undefined && problems.length === 0) {
  problems.push("FIXTURE_CONTENT_SHA256 is absent from lib/data/fixtures.ts");
}
```

Add to `scripts/check-fixture-hash.test.mjs`:

```js
test("a missing FIXTURE_CONTENT_SHA256 export exits non-zero", async () => {
  const tree = await realTree();
  tree["lib/data/fixtures.ts"] = tree["lib/data/fixtures.ts"].replace(
    /export const FIXTURE_CONTENT_SHA256[\s\S]*$/,
    "",
  );
  await withFixture(tree, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-fixture-hash.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /FIXTURE_CONTENT_SHA256 is absent/);
  });
});
```

## Warnings

### WR-01: `check-register-isolation.mjs`'s source-mode walk cannot see a dynamic `import()`

**File:** `scripts/check-register-isolation.mjs:132-144`
**Issue:**
`extractSpecifiers` only recognizes two syntactic forms:

```js
const fromRe = /\bfrom\s*["']([^"']+)["']/g;               // static "from '...'" (incl. re-exports)
const bareImportRe = /(?:^|[;\n])\s*import\s*["']([^"']+)["']/g; // bare side-effect "import '...'"
```

Neither pattern matches `import("...")` (dynamic import). A client component that reaches the register via `await import("../lib/data/register")` (or the `@/` alias equivalent) is invisible to the source-mode walk, so `findViolation` never finds it and the step reports "No module under components/ or lib/client/ reaches the register, directly or transitively" — a false clean bill of health for exactly the transitive-reachability guarantee D-17 states this half of the check exists to prove.

**Reproduced** (disposable fixture tree, not the repository):
```
components/Leak.tsx:
  export async function getSize() {
    const mod = await import("../lib/data/register");
    return mod.REGISTER_BY_TAG.size;
  }
lib/data/register.ts:
  export const REGISTER_BY_TAG = new Map();
```
```
REGISTER ISOLATION CHECK
========================================================================
Problems: 0

No module under components/ or lib/client/ reaches the register, directly or transitively.
```
Exit code: 0.

In the real build this specific bypass is likely still caught downstream — `import "server-only"` at the top of the real `lib/data/register.ts` should still poison a Turbopack chunk that statically resolves a literal-string dynamic import, and the post-build sentinel scan (`check-register-isolation.mjs --bundle .next/static`) would still catch the sentinel if the module ends up in a client chunk regardless of how it was reached. But the *source-mode* step itself — which runs before `next-build` in `verify.mjs`'s `STEPS` and is the step a developer is most likely to run locally in isolation — gives an incorrect all-clear for this bypass, and none of the fixtures in `check-register-isolation.test.mjs` exercise a dynamic import at all (all four violation fixtures use static `from "..."` imports).

**Fix:** extend `extractSpecifiers` to also capture dynamic imports with a string-literal argument, and add a fixture proving it:

```js
const dynamicImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
while ((m = dynamicImportRe.exec(src))) specifiers.add(m[1]);
```

### WR-02: `loadAliasPrefix` silently supports only the first `"*"`-style path mapping

**File:** `scripts/check-register-isolation.mjs:105-130`
**Issue:** the loop over `Object.entries(paths)` returns on the *first* entry whose key ends in `/*` and whose value's first entry ends in `/*`. Today's `tsconfig.json` carries exactly one such mapping (`"@/*": ["./*"]`), so this is not presently wrong, but the function gives no indication that any additional alias entry added later (e.g. a narrower `"@/components/*"` mapping ahead of or alongside `"@/*"`) would be silently ignored by the isolation walk rather than flagged — an import written against a second alias would resolve to `null` in `resolveImport` and simply not be followed, which is the same "not this candidate → not followed" code path used for a legitimately unresolvable specifier. A future config change could quietly widen the isolation gate's blind spot with no warning from the tool itself.
**Fix:** either resolve every `"*"`-suffixed mapping (trying each until one resolves), or fail loudly in `loadAliasPrefix` when more than one such mapping exists, so the walker's coverage claim stays true of whatever `tsconfig.json` actually contains.

## Info

### IN-01: `lib/data/register.ts` cannot be loaded by a plain Node process, contrary to the validation command the phase's planning docs specify for it

**File:** `lib/data/register.ts:1`
**Issue:** `import "server-only"` throws outside Next's own `"react-server"` resolution condition. Confirmed directly:
```
$ node -e "import('./lib/data/register.ts').then(...)"
IMPORT FAILED: This module cannot be imported from a Client Component module. It should only be used from a Server Component.
```
No file in this review's scope actually attempts to import `register.ts` at runtime (neither `check-register-isolation.mjs`/`.test.mjs` nor `check-fixture-shape.test.mjs` do), so nothing in scope is broken by this today. It is worth flagging because it means `register.ts`'s own exports (`REGISTER_ENTRIES`, `REGISTER_BY_TAG`, `REGISTER_SENTINEL`) cannot be unit-tested the way `plant.ts`/`orders.ts`/`observations.ts` are — via `node --test` importing the module directly — and any later phase (P9's `lib/access/register.ts`) that tries to write a plain `node --test` against this module's runtime values will need a Next-aware harness or an `--experimental-...` workaround, not a bare dynamic `import()`. Purely informational: `server-only`'s behavior here is working as designed (D-16 chose it deliberately), this is a downstream-planning note, not a defect in the reviewed code.
**Fix:** none required in this phase; worth a one-line note in a later phase's plan (P9) that a runtime `node --test` against `lib/data/register.ts` needs the `--conditions=react-server` Node flag (or an equivalent shim) to succeed, or that its exports should be tested only through `check-register-isolation.mjs`'s text-based mechanisms as done here.

### IN-02: `check-fixture-hash.mjs`'s `problems.length === 0` re-use as a proxy condition is fragile

**File:** `scripts/check-fixture-hash.mjs:79`
**Issue:** `if (FIXTURE_CONTENT_SHA256 !== undefined || problems.length === 0)` uses "no problems recorded yet" as a stand-in for "the import succeeded and both exports are readable," which is what let CR-01 through unnoticed — `problems.length === 0` is also true in the legitimate "import succeeded, everything looks fine so far" case, so the branch that recomputes the digest runs regardless of whether `FIXTURE_CONTENT_SHA256` is actually present, and its result is then silently discarded by the `FIXTURE_CONTENT_SHA256 !== undefined` guard at the comparison site. This dual-purpose use of `problems.length` as both an error accumulator and a control-flow condition is what made CR-01 easy to introduce and hard to spot in review.
**Fix:** once CR-01 is fixed (an explicit absence check pushes to `problems` before this line runs), this condition becomes correct as a side effect, but consider making the intent explicit — e.g. gate the recompute on a named boolean (`const pinLooksUsable = FIXTURE_VERSION !== undefined && FIXTURE_CONTENT_SHA256 !== undefined;`) rather than the size of the shared `problems` array, so a future reviewer doesn't have to re-derive why the two are linked.

---

_Reviewed: 2026-09-17T07:33:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
