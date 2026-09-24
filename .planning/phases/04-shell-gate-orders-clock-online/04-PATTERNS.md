# Phase 4: Shell, gate, orders, clock (online) - Pattern Map

**Mapped:** 2026-09-24
**Files analyzed:** 28 (10 component families, 4 `lib/client/` modules, 14 modified or new build/copy files)
**Analogs found:** 26 / 28 with a concrete in-repo precedent; 2 rows carry a precedent for their *structure* only (see §No Analog Found)

**The one framing fact this map exists to state.** `grep -rn "use client" app components lib` returns nothing and `grep -rln "useState|useEffect|useSearchParams" app components lib` returns nothing: **this repository contains no Client Component, no React hook and no `lib/client/` directory today.** So for every new file there are two halves, and they have different precedents:

- **The file's shape in this repository** — its header comment, its imports, its CSS-module conventions, its token references, its test structure, its exit-code contract. Every one of these has a real analog, named below with line numbers.
- **The React client behaviour** — hooks, effects, the tick, the fetch, the instance-keyed purge. No analog exists in this codebase. Its precedent is 04-RESEARCH.md §Code Examples 1–3, which were written and verified `eslint`-clean and `tsc --noEmit`-clean against this exact repository. Copy those verbatim rather than inventing a shape; Pitfall 3 records that the two most natural implementations are hard ESLint errors here.

---

## File Classification

| New/Modified file | N/M | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|---|
| `components/shell/Screen.tsx` | N | component (switcher, `"use client"`) | URL-state → in-place swap | `app/page.tsx:23-47` (the existing `s` branch) | role-match (the branch, not the component kind) |
| `components/shell/Header.tsx` + `Header.module.css` | N | component (chrome) | read-through (projection) | `components/shell/Ribbon.tsx` + `Ribbon.module.css` | exact |
| `components/controls/RecordControl.tsx` + `.module.css` | N | component (primitive) | event → request-response | `components/shell/Ribbon.module.css:46-69` (the only control geometry in the build) | partial (geometry only; no control component exists) |
| `components/controls/SecondaryControl.tsx` + `.module.css` | N | component (primitive) | event → navigation | `Ribbon.tsx:26-28` + `Ribbon.module.css:46-55` (`.link`, the build's only 44 px target) | role-match |
| `components/marks/StateMark.tsx` + `.module.css` | N | component (primitive, closed set) | presentational | `lib/copy/governed.ts:26-42` (closed-set-as-a-typed-record) + `Ribbon.module.css:17-24` (`.dot`, the only non-text mark) | partial |
| `components/gate/Gate.tsx` + `.module.css` | N | component (surface) | request-response (`POST /api/session`) | `components/limits/Limits.tsx` + `Limits.module.css` | role-match |
| `components/orders/OrderList.tsx` + `.module.css` | N | component (surface) | read-through (`GET /api/orders`) | `components/limits/Limits.tsx` | role-match |
| `components/order/OrderDetail.tsx` (+ `Clock`) + `.module.css` | N | component (surface) | read-through + streaming tick | `components/limits/Limits.tsx` (shape); 04-RESEARCH.md §Code Examples 1 (behaviour) | partial |
| `components/time/TimeOnOrder.tsx` + `.module.css` | N | component (surface) | read-only (`GET /api/hours`) | `components/limits/Limits.tsx:19-25` (map-a-record-to-rows) | role-match |
| `components/conflict/ConflictCard.tsx` + `.module.css` | N | component (shared anatomy) | presentational over `CONFLICT_COPY` | `components/limits/Limits.tsx` (reads copy from a module, never a literal) | role-match |
| `lib/client/projection.ts` | N | service (the one cache) | read-through cache + purge | `lib/store/memory.ts` (module-scope `Map`s, one owner) + `lib/http/respond.ts` (the "one module owns this" header comment) | exact |
| `lib/client/projection.test.mjs` | N | test | unit | `lib/access/scope.test.mjs`, `lib/copy/conflicts.test.mjs` | exact |
| `lib/client/navigate.ts` | N | utility | URL-state write | `lib/http/respond.ts:120-138` (no-parameter functions whose absence of a parameter is the mechanism) | role-match |
| `lib/client/navigate.test.mjs` | N | test | unit | `lib/copy/conflicts.test.mjs` | exact |
| `app/page.tsx` | M | route entry (Server Component) | static shell + streamed hole | itself, `app/page.tsx:1-21` — the outer half is unchanged | exact |
| `lib/copy/conflicts.ts` | M | copy module (closed set) | n/a | itself, `lib/copy/conflicts.ts:48-64` (`order_not_found`, `not_open`) | exact |
| `lib/copy/conflicts.test.mjs` | M | test | unit | itself, `lib/copy/conflicts.test.mjs:69-75` (the per-code exact-string test) | exact |
| `lib/copy/governed.ts` | M | copy module | n/a | itself, `lib/copy/governed.ts:94-100` (`PLATFORM_413`, the one named export beside `GOVERNED`) | exact |
| `lib/data/types.ts` | M **[SECURITY-blocked]** | model (type union + array) | n/a | itself, `lib/data/types.ts:368-395` | exact |
| `app/styles/tokens.capture.css` | M | config (token declaration site) | n/a | itself, `tokens.capture.css:18-36` | exact |
| `scripts/check-tokens.mjs` | M | build rule | source sweep | itself, `check-tokens.mjs:78-126` (`D13_MANIFEST`) | exact |
| `scripts/check-primitives.mjs` | N | build rule | source sweep | `scripts/check-governed.mjs` (walk + report) + `scripts/check-actor-field.mjs` (multi-assertion layout) | exact |
| `scripts/check-primitives.test.mjs` | N | test (fixture proof, D-23) | process spawn | `scripts/check-single-writer.test.mjs` | exact |
| `scripts/check-contrast.pairs.json` | M | data manifest | n/a | itself, `check-contrast.pairs.json:1-29` | exact |
| `scripts/check-wcag.mjs` | M | build rule (browser) | Playwright | itself, `check-wcag.mjs:220-239` + `303-304`; `scripts/lib/harness.mjs:22-41` | exact |
| `scripts/verify.mjs` | M | config (the one gate) | n/a | itself, `verify.mjs:70-190` (`STEPS`) | exact |
| `scripts/verify.test.mjs` | M | test | unit | itself, `verify.test.mjs:55-64` (`EXPECTED_ORDER`) | exact |
| `scripts/check-deployment.test.mjs` | M | test fixture string | n/a | itself, `check-deployment.test.mjs:40-46` (`PASSING_BODY`) | exact |

---

## Pattern Assignments

### Every new component: `components/**/*.tsx` + `*.module.css`

**Analogs:** `components/shell/Ribbon.tsx` (32 lines) + `components/shell/Ribbon.module.css` (69 lines); `components/limits/Limits.tsx` (33 lines) + `components/limits/Limits.module.css` (19 lines). These are the only two components in the build; **every new component must match their conventions exactly**, because the D-07 sweep in this phase turns several of those conventions into build failures.

**Imports and file order** (`Ribbon.tsx:1-2`) — the copy module first through the `@/` alias, then the CSS module as a default import named `styles`. No barrel files exist in `components/`; there is no index module to extend.

```tsx
import { GOVERNED } from "@/lib/copy/governed";
import styles from "./Ribbon.module.css";
```

**The header comment carries the contract, not just a description** (`Ribbon.tsx:3-9`). Every new component's header should name the requirement it discharges, the decision id, and the thing a later reader must not undo:

```tsx
/* The permanent preview disclosure, rendered by app/layout.tsx above
   {children} so every route carries it by construction (D-08,
   REQ-FR-48). A plain Server Component: no state, no event handler,
   no client directive. The sentence renders from
   lib/copy/governed.ts — never a literal — so this file and the
   module can never drift. */
```

**Copy is read from a module, never written at the call site** (`Ribbon.tsx:11`, `Limits.tsx:19-25`). This is the pattern `ConflictCard` and `OrderList` must reproduce for D-02's `order_not_found` sentence:

```tsx
export function Ribbon() {
  const { before, strong, after } = GOVERNED.preview;
```

```tsx
{Object.entries(GOVERNED).map(([key, { before, strong, after }]) => (
  <p key={key} className="prose">
    {before}
    <strong>{strong}</strong>
    {after}
  </p>
))}
```

**Class names combine a global type role with a local module class** (`Ribbon.tsx:18`, `Limits.tsx:15-16`). The type role (`label`, `prose`, `prose-sm`, `figure`, `object-title`, `control-label`, `tag`, `screen-title`) is a global class declared once in `app/globals.css:41-111`; the module class carries only layout and colour. New components must not redeclare a type role locally.

```tsx
<p className={`label ${styles.sentence}`}>
<h1 id="screen-title" className={`screen-title ${styles.heading}`}>
```

**The surface owns its own `<main>` landmark** (`Limits.tsx:14-16`) — the switcher renders the surface, never a wrapping `<main>`:

```tsx
<main aria-labelledby="screen-title" className={styles.main}>
  <h1 id="screen-title" className={`screen-title ${styles.heading}`}>
    Preview limits
  </h1>
```

> Phase 4 adds `tabindex={-1}` to that `<h1>` (UI-SPEC §Phase 4 Surfaces, global constraint 3) so the focus effect can reach it. Nothing else in this shape changes.

**CSS module conventions** (`Limits.module.css:1-19`, the whole file — this is the template):

```css
/* No cards, no panels, no rules between sentences in this phase — the
   panel primitive is Phase 4/5. Sits directly on the --navy-deep page
   ground, like the shell surface. */

.main {
  display: flex;
  flex-direction: column;
  padding: var(--space-16) var(--safe-x) var(--space-48);
}

.heading {
  margin-bottom: var(--space-32);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}
```

Every value is a `var(--token)`; there is no raw hex, no `rgb()`, no bare pixel figure except the 5 px dot and the 2 px nudge in `Ribbon.module.css:18-23,50`. Invariant A9 turns "every colour is a token" into a build failure, and A1/A2 turn a locally-declared `130px` or `44px` into one.

**The load-bearing-declaration comment** (`Ribbon.module.css:1-3`) — the pattern for the record control's 130 px and the secondary control's 44 px, both of which become single-owner declarations under A1 and A2:

```css
/* Ribbon contract — 01-UI-SPEC.md §Ribbon Contract. position: static and
   max-height: none are load-bearing (asserted by plan 01-06's WCAG
   check): the ribbon is never fixed, never sticky, never capped. */
```

**Two existing declarations the A5/A6 sweep must tolerate**, and the reason the sweep matches `fixed`/`sticky` specifically rather than `position:`: `Ribbon.module.css:30` (`position: relative`), `Ribbon.module.css:64` (`position: absolute`, the link's hit-area extension) and `app/globals.css:129` (`.sr-only { position: absolute; }`).

**The 44 px hit-area precedent** (`Ribbon.module.css:46-69`) — `SecondaryControl` inherits this shape, including the `::after` overlay technique if a row's target must exceed its visual box:

```css
.link {
  display: inline-flex;
  align-items: center;
  min-height: var(--ribbon-link-min-h);
  margin-top: 2px;
  text-transform: uppercase;
  color: var(--cobalt-glow-ink);
  text-decoration: none;
  border-bottom: 1px solid var(--control-border);
}
```

> `--ribbon-link-min-h` is the pre-existing name invariant A2 exempts by name. The new secondary control declares `min-height: var(--target-min)` and is the only other module permitted to.

---

### `components/shell/Screen.tsx` (component, URL-state → in-place swap) — **the one structural change**

**Analog:** `app/page.tsx:23-47`. The branch survives; the component kind does not.

**What exists today** (`app/page.tsx:23-47`):

```tsx
async function Screen({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;

  /* The only untrusted input in Phase 1: read for a two-way branch
     only, never interpolated into markup, a URL or a header. */
  if (s === "limits") {
    return <Limits />;
  }
  ...
}
```

**What stays untouched** (`app/page.tsx:1-21`) — the outer Server Component and its `<Suspense>` boundary, including the comment explaining why it is non-async. Do not edit this half beyond the import list:

```tsx
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}
```

**What replaces the inner half:** 04-RESEARCH.md §Code Examples 2, verbatim — `"use client"`, `useSearchParams()`, the `SURFACES` allowlist, `ORDER_ID_RE`, and the derived `` `${s}|${id}` `` screen key. There is no in-repo precedent for a Client Component; take the research's shape rather than deriving one.

**The comment in `Ribbon.tsx:19-21` is an explicit forward reference to this task** and should be updated in the same change:

```tsx
{/* D-11 locks a plain anchor in this phase — no <Link>, no
    router.push. Phase 4 replaces it with a history.pushState
    switcher without changing the URL contract. */}
{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
<a href="/?s=limits" className={`label ${styles.link}`}>
```

---

### `lib/client/projection.ts` (service, read-through cache with one purge)

**Analogs, two, each for a different half.**

**1. `lib/store/memory.ts` — the module-scope-state shape.** This is the server-side twin of what the projection is on the client: module-level `Map`s, no class, no service, an explicit statement of lifetime. Its header (`lib/store/memory.ts:1-19`) is the model for the projection's own:

```
/* ================================================================
   MEMORY STORE — the whole of the record (AD-10)

   Module-level Maps, keyed by account so a per-account cap and a
   per-account eviction pass are both expressible. This is server
   memory, not a service: no class, no external resource, nothing
   that outlives this running process. A cold start empties every
   Map, mints a fresh BOOT_ID below, and says nothing about it —
   AD-10 marks that silence as correct.
   ...
```

Its declaration block (`lib/store/memory.ts:117-158`) is the shape the projection's `orders` / `clocks` / `details` / `account` cells take — plain `const x = new Map<K, V>()` at module scope, each with the reason on the line above. Note `BOOT_ID` at `memory.ts:62`: it is minted here and is the **value the client compares** through `X-CAP-Instance`, so the two modules are the two ends of D-04.

**2. `lib/http/respond.ts` — the "one module owns this, and here is what breaks if a second one appears" header.** This is the voice the projection's header must be written in, because SC-5 makes the same kind of claim (`lib/http/respond.ts:1-11`):

```
/* ================================================================
   RESPOND — the only module that builds a framework response (AD-11)

   Every response this phase ever sends is built here, and nowhere
   else. State the consequence plainly: if any route hand-writes its
   own 404 instead of calling notFound() below, AD-4's byte-identity
   guarantee is void by construction, not by bug — there would be a
   second place a not-found response could be assembled, and two
   places can drift apart. Plan 03-12's scripts/check-single-writer.mjs
   asserts no app/api/** file constructs a response object itself;
   this file is the one module the rule excepts.
```

Two things to copy from that paragraph into `projection.ts`: it names the *build rule* that enforces the claim (here: the new `check-primitives.mjs` storage sweep), and it names the *failure mode* rather than the rule.

**The instance-compare-then-purge body** is 04-RESEARCH.md §Code Examples 3, verbatim. The ordering comment there ("purging after the store would discard the very datum that proved the instance changed") is load-bearing and should survive into the file.

**One more precedent worth copying from `respond.ts:120-129`** — a function whose *absence of a parameter* is the mechanism. `purge()` is the same kind of function: it takes nothing and clears everything, so no caller can perform a partial purge.

```ts
/**
 * Exactly `fail("order_not_found")` — no parameters at all. The
 * absence of a parameter IS the mechanism (FR-6): there is nothing a
 * caller could pass to this function that would make one unowned
 * response differ from one fabricated response, because there is
 * nowhere to pass it.
 */
export function notFound(): NextResponse {
  return fail("order_not_found");
}
```

---

### `lib/client/*.test.mjs` (tests, unit)

**Analogs:** `lib/copy/conflicts.test.mjs` (91 lines) and `lib/access/scope.test.mjs`. Both are discovered by `verify.mjs`'s `unit-suite` step (`verify.mjs:92`, `node --test lib/**/*.test.mjs`) with **no change to `verify.mjs`** — the glob already covers `lib/client/`.

**Header and imports** (`lib/copy/conflicts.test.mjs:1-12`) — note the explicit `.ts` extension on the source import, which is how these run under a bare `node --test` with no build:

```js
/* ================================================================
   CONFLICT AND REJECT COPY — unit tests (D-06)

   Plain node:test assertions, no build and no server, discovered by
   scripts/verify.mjs's "unit-suite" step.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { CONFLICT_COPY, REJECT_COPY, TRANSPORT_COPY } from "./conflicts.ts";
import { CONFLICT_CODES, REJECT_CODES } from "../data/types.ts";
```

**Hand-built stubs rather than a fixture harness** (`lib/access/scope.test.mjs:14-31`) — the pattern for a projection test that needs a `Response`-like object with an `x-cap-instance` header, or a fixture `OrderClock`:

```js
function stubAccount(accountId) {
  return {
    account_id: accountId,
    artisan: { id: accountId, name: "Test Artisan", trade: "millwright", ... },
    session: { sid: "test-sid", account_id: accountId, ... },
  };
}
```

**A test name states the claim, not the function** (`lib/access/scope.test.mjs:37,44`; `conflicts.test.mjs:35,47`):

```js
test("ordersFor returns an empty array, never throws, for an account id outside the fixture set", () => {
test("Object.keys(CONFLICT_COPY) is exactly the CONFLICT_CODES set", () => {
```

---

### `lib/copy/conflicts.ts` — adding `already_open` (D-05)

**Analog:** the file itself. The addition goes in `CONFLICT_COPY` (opens at `lib/copy/conflicts.ts:42`), in the shape of its neighbours (`conflicts.ts:43-64`). Every entry carries a provenance marker (`[seed]`, `[written here]`, or both) and, where the wording is load-bearing, the reason:

```ts
export const CONFLICT_COPY: Record<ConflictCode, RefusalCopy> = {
  // [written here, otherwise] — EXPERIENCE.md's persona-switch case
  // for this code is the account_mismatch card below, not a second
  // order_not_found string: FR-6 requires one and only one not-found
  // sentence, so an unowned id and a fabricated id cannot be told
  // apart by their prose.
  order_not_found: {
    sentence: "This order is not on your card. Nothing was bound.",
    actions: ["Discard"],
  },
  ...
  // [written here] — D-06
  not_open: {
    sentence:
      "This order is not open, so there was nothing to close and nothing was bound. Open the order, then close it.",
    actions: ["Discard", "Open the order"],
  },
```

**The entry to add** (UI-SPEC §`already_open`): sentence *"The clock was already running on this order, so the server added no second segment and nothing was lost."*, actions exactly `["View time on this order"]`. The comment must carry the UI-SPEC's drafting note — that *nothing was lost* is deliberately not the neighbours' *nothing was bound*, because the first open did land.

**The module's own header already anticipates this file's role** (`conflicts.ts:11-14`) and should not be contradicted:

```
   This is NOT a governed module. D-06 says a conflict sentence is
   not a governed sentence; scripts/check-governed.mjs's closed set
   of eight does not cover it, and lib/copy/governed.ts is not edited
   by this plan or any plan in this phase.
```

> That last clause is Phase-3-scoped. Phase 4 *does* edit `governed.ts` (the plain-string FR-48a export) — a separate module, and the sentence above is about `conflicts.ts`'s own plan, not a standing prohibition. Do not rewrite it; it is a record of what Phase 3 did.

**The paired test** goes in `lib/copy/conflicts.test.mjs`, in the shape of its `not_open` test (`conflicts.test.mjs:69-75`) — an exact-string assertion plus the actions array, which is also how UI-SPEC invariant D3's "exactly one action" is proved at unit level:

```js
test("CONFLICT_COPY.not_open carries D-06's exact sentence and actions", () => {
  assert.equal(
    CONFLICT_COPY.not_open.sentence,
    "This order is not open, so there was nothing to close and nothing was bound. Open the order, then close it.",
  );
  assert.deepEqual(CONFLICT_COPY.not_open.actions, ["Discard", "Open the order"]);
});
```

The generic tests at `conflicts.test.mjs:35-67` (keys equal the code set; capital letter and full stop; non-empty actions; no exclamation mark) pick up `already_open` automatically once the union and the array carry it.

---

### `lib/data/types.ts` — **three edits, nothing else** [SECURITY-blocked file]

**Analog:** the file itself, `lib/data/types.ts:368-395`, read this session. The file carries uncommitted third-party modifications tracked as a `[SECURITY]` blocker (STATE.md; 03-VERIFICATION.md Open Items; 04-RESEARCH.md §Open Questions 3). **Do not stage, reformat, revert or reorder anything in it.** The three edits are exactly:

1. `lib/data/types.ts:374-383` — add `| "already_open"` to the `ConflictCode` union.
2. `lib/data/types.ts:385-395` — add `"already_open",` to `CONFLICT_CODES`.
3. `lib/data/types.ts:368-373` — update the note. It currently reads:

```ts
/**
 * `not_open` landed in P3 under D-06, with its sentence and next act
 * defined in `lib/copy/conflicts.ts`. AD-9's `already_open` remains on
 * its stated P4 schedule — no code for it is introduced in this
 * phase. `referral_evidence_missing` still has no sentence until P9.
 */
export type ConflictCode =
  | "order_not_found"
  | "order_closed"
  | "not_open"
  ...
```

The union and array are declaration-order lists, not sorted; `already_open` should sit where the note's narrative puts it (beside `not_open`), and the note itself must stop claiming no code for it exists.

---

### `lib/copy/governed.ts` — the FR-48a disposition sentence as a **plain string**

**Analog:** `lib/copy/governed.ts:94-100`, `PLATFORM_413` — the only named export beside `GOVERNED`, and the model for a second one:

```ts
// [written here] — D-07, D-19: new copy authored for this preview
export const PLATFORM_413: GovernedSentence = {
  before:
    "The hosting platform refused this request before the preview server saw it, ...",
  strong: "",
  after: "",
};
```

**Copy the placement and the `// [written here]` marker; do not copy the type.** `check-governed.mjs` fails the build on any third `{before, strong, after}`-shaped literal anywhere under `app/`, `components/` or `lib/` (its own header states the rule; the assertion runs at `check-governed.mjs:373-386`). Export the disposition sentence as `export const FR48A_DISPOSITION = "…"` — a plain string, outside the shape the sweep matches, requiring no edit to `check-governed.mjs`. 04-RESEARCH.md Pitfall 6 has the full reasoning.

The module's own header (`governed.ts:18-20`) states the closed-set rule the new export must not trip:

```
   The set of eight is closed. Adding a ninth sentence requires this
   module AND scripts/check-governed.mjs's closed-set assertion to be
   changed in the same commit — the check fails the build otherwise.
```

---

### `scripts/check-primitives.mjs` (build rule, source sweep) — **NEW**

**Analogs, two, for two different halves.**

**1. `scripts/check-governed.mjs` — the walk, the `problems[]` accumulator and the report/exit block.** Its walk (`check-governed.mjs:29-72`) is the one to copy; the comment says so explicitly (*"directory walk (unchanged shape from claims-audit.mjs)"*), which is the convention: a new sweep reuses the previous sweep's walk rather than writing a new one.

```js
import { readdir, readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".css", ".md"]);

const problems = [];

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await walk(p)));
    } else if (EXT.has(extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}
```

> `ROOTS` for `check-primitives.mjs` is `["app", "components"]` (UI-SPEC §Scope), and `EXT` must admit `.css` as well as `.ts`/`.tsx`, since sections A1–A9 and A13–A14 are CSS sweeps.

The report block (`check-governed.mjs:395-412`) is the exact contract every check in this repo honours — a titled banner, a 72-character rule, a `Problems: n` line, `!  ` per defect, `process.exit(1)`, and a closing sentence stating what was proved when clean:

```js
console.log("GOVERNED-SENTENCE CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the honesty surface does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery governed sentence is defined once, the set of eight is closed, and",
);
console.log("no second literal was found under app/, components/ or lib/.");
```

**2. `scripts/check-actor-field.mjs` — the multi-assertion layout**, which is what a 15-assertion sweep (A1–A14 + D3) needs. Four things to copy:

- The header enumerates the assertions by number and then states **what the check cannot catch** (`check-actor-field.mjs:1-24`). 04-RESEARCH.md §Open Questions 2 asks for exactly this paragraph on the mutable-module-state half of the SC-5 sweep:

```js
/* ================================================================
   ACTOR-FIELD CHECK (AD-3, FR-23, FR-57)

   Reuses check-single-writer.mjs's report-and-exit convention and
   walk helpers. Four assertions:
     1. The assignment sweep — ...
   WHAT IT CANNOT CATCH: this is a text sweep plus an import walk, not
   a parser. An actor field assigned through a computed key
   (`{[field]: value}`) or a spread (`{...maliciousObject}`) is
   outside what a regex over source text can see.
   ================================================================ */
```

- Each assertion is its own `async function check…()` under a banner comment (`check-actor-field.mjs:279-282, 346-353, 377-384, 420-422`), and all of them are awaited in one block at the bottom (`check-actor-field.mjs:473-478`):

```js
const alias = await loadAliasPrefix();
await checkAssignmentSweep();
await checkRouteSchemas();
await checkEnumerations();
await checkRbacSweep();
await checkOrderIdsImporter(alias);
```

- **Allowlists are named constants with the reason attached, and the comment says a new entry is an architectural change** (`check-actor-field.mjs:34-40`). This is exactly how A1/A2's single-owner module lists and A5's future Phase 9 allowlist should be written:

```js
/**
 * Two entries, with the reason: lib/attribution produces the acting
 * account and lib/reconcile/apply.ts is the one writer that stamps it
 * onto a record. A third entry is an architectural change, never a
 * maintenance edit.
 */
const PERMITTED_ASSIGNERS = ["lib/attribution/index.ts", "lib/reconcile/apply.ts"];
```

- **Comments are stripped before a text sweep** (`check-actor-field.mjs:193-200`), which matters for A8 and A13 where the UI-SPEC records real prose hits in route files and a token header comment:

```js
const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

function stripCommentLines(src) {
  return src
    .split("\n")
    .filter((line) => !COMMENT_LINE_RE.test(line))
    .join("\n");
}
```

- A defect message names the file, the offending text and the decision id (`check-actor-field.mjs:323-326, 433-435`):

```js
problems.push(
  `${rel} assigns "${field}:" outside the permitted assigners (AD-3): ${field}: ${rhs}`,
);
```

**A third assertion in `check-primitives.mjs` reads two modules as text** (invariant D3, `already_open` present in three places). The precedent for importing rather than regexing is `check-actor-field.mjs:386-395` — a dynamic import of a `file://` URL built from `process.cwd()`, never a fixed path, with the reason stated:

```js
async function checkEnumerations() {
  let ACCEPTED_BODY_FIELDS;
  try {
    const url = pathToFileURL(join(CWD, VALIDATE_FILE)).href;
    ({ ACCEPTED_BODY_FIELDS, ACCEPTED_PAYLOAD_FIELDS } = await import(url));
  } catch (e) {
    problems.push(`could not import ${VALIDATE_FILE}: ${e.message}`);
    return;
  }
```

> `lib/data/types.ts` and `lib/copy/conflicts.ts` are TypeScript; a bare `node` import of a `.ts` file works under Node 24 here (the `lib/**/*.test.mjs` suite does it at `conflicts.test.mjs:10-11`), so either technique is available. A text read is what 04-RESEARCH.md recommends for D3.

---

### `scripts/check-primitives.test.mjs` (fixture proof, D-23) — **NEW**

**Analog:** `scripts/check-single-writer.test.mjs` (212 lines, read in full), which is the cleanest example of the D-23 convention. Three things it establishes:

**1. The first test always proves the real repository is clean** (`check-single-writer.test.mjs:32-35`) — otherwise a check that crashes early would "pass" every fixture:

```js
test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-single-writer.mjs");
  assert.equal(code, 0, stdout + stderr);
});
```

**2. One test per violation class, each from a throwaway directory, asserting a non-zero exit AND the message content** (`check-single-writer.test.mjs:37-53`):

```js
test("a fixture where app/api/captures/route.ts imports writeCapture from lib/store/memory.ts exits non-zero and names the file", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/captures/route.ts": `import { writeCapture } from "../../../lib/store/memory.ts";
export function POST() { writeCapture(); return null; }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/captures\/route\.ts/);
      assert.match(stdout, /writeCapture/);
    },
  );
});
```

**3. At least one negative test proving the sweep does not over-fire** — the "self-invalidation guard" (`check-single-writer.test.mjs:186-199`), a fixture where the banned token appears only in a comment and the check must still exit 0. `check-primitives.mjs` needs several of these: `position: relative` and `position: absolute` must pass A5/A6; `--rule-faint`'s declaration in `tokens.capture.css` must pass A14; `transition` in the two route files' prose must pass A8.

```js
test("a fixture where NextResponse appears only inside a comment exits 0 — the self-invalidation guard", async () => {
```

**The helpers are already built** (`scripts/lib/fixtures.mjs:40-93`): `withFixture(files, fn)` creates and removes a temp directory under `os.tmpdir()` (never under `scripts/`, because `node --test scripts/**/*.test.mjs` would discover fixture files as tests), and `runCheck(scriptRelPath, { cwd, args, env })` spawns the script with **no shell** so the exit code is exact. Import both from `./lib/fixtures.mjs`.

---

### `scripts/verify.mjs` + `scripts/verify.test.mjs` — one new STEPS entry

**Analog:** `verify.mjs:70-190`. Source-side sweeps are plain `process.execPath` entries with no `shell` and no `vercelExcluded`; the block comment above a group states why the group runs where it does (`verify.mjs:118-123`):

```js
  /* Plan 03-12's three remaining architectural claims turned into
     build rules: one writer, one attribution producer, one
     accepted-field enumeration per route (AD-1, AD-3, AD-20). All
     three are source-side, need no browser and no build output, so
     none carries vercelExcluded — they run on Vercel's build as well
     as in the GitHub job. */
  {
    id: "check-single-writer",
    command: process.execPath,
    args: ["scripts/check-single-writer.mjs"],
  },
```

The new entry goes after `check-non-bypassability` and before `next-build` (04-RESEARCH.md §Validation Architecture), in exactly that object shape.

**`scripts/verify.test.mjs` must change in the same commit.** It asserts the full step list by name and count (`verify.test.mjs:55-64`) — an `EXPECTED_ORDER` array ending `["check-wcag-self-test", "check-wcag"]`, and a test whose *name* states the count:

```js
test("STEPS carries D-20's twenty-six ids in the exact order", () => {
  assert.deepEqual(
    STEPS.map((s) => s.id),
    EXPECTED_ORDER,
  );
});
```

Adding a step means editing `EXPECTED_ORDER`, the position of `check-primitives` within it, and the number word in that test's name.

---

### `app/styles/tokens.capture.css` + `scripts/check-tokens.mjs` — two tokens, one commit

**Analog:** the two files as they stand. The declaration site (`tokens.capture.css:18-36`) groups tokens under `/* ---- … ---- */` banners and carries the measured ratio or the reason inline:

```css
:root {
  /* ---- layer-2 overrides ---------------------------------------- */
  --viewer-ink-dim: #AAB4C0; /* 7.98:1 ground / 7.03:1 panel — the tightest pass in the system */
  --rule-faint: #606D7E; /* 3.18:1 ground / 2.80:1 panel — non-text, hairline on --navy-deep only */
  --record-fill: #7DB3FB;
  --record-fill-armed: #93C5FD; /* declared and unused in this phase */
  ...
  /* ---- layer-2 authored tokens ------------------------------------ */
  --dk-good: #4ade80;
```

`--record-fill-armed`'s comment is the precedent UI-SPEC Primitive 2 cites for declaring a value the phase does not exercise.

The manifest (`check-tokens.mjs:78-126`) is a closed list grouped by the same banners, each group's count in the comment — so adding two names means updating two counts as well:

```js
const D13_MANIFEST = [
  // layer-2 overrides (8) — only --viewer-ink-dim shadows an
  // inherited declaration
  "--viewer-ink-dim",
  ...
  // layer-2 authored tokens (5)
  "--dk-good",
  ...
  // radius (1)
  "--radius-control",
];
```

`--tint-warn-head` belongs in the authored-tokens group (count 5 → 6); `--dur-press` needs a new group banner (there is no timing group today). The check is bidirectional (`check-tokens.mjs:143-150`): a manifest name with no declaration fails, and a declaration with no manifest entry fails.

---

### `scripts/check-contrast.pairs.json` — 16 rows

**Analog:** the file itself, `check-contrast.pairs.json:1-29`. Each row is an object with exactly `id`, `ink`, `ground`, `kind` (`"text"` | `"non-text"`) and `note`, where the note cites the spec section that requires the pair:

```json
  {
    "id": "ribbon-sentence",
    "ink": "--viewer-ink-dim",
    "ground": "--navy-deep",
    "kind": "text",
    "note": "The ribbon sentence (01-UI-SPEC.md §Ribbon Contract)."
  },
  {
    "id": "ribbon-dot",
    "ink": "--cobalt-glow",
    "ground": "--navy-deep",
    "kind": "non-text",
    "note": "The ribbon's 5x5px dot."
  },
```

Phase 4's 16 rows carry `04-UI-SPEC.md §Phase 4 contrast-pairs manifest` as their note source. `docs/design/decorative-exemptions.json` stays at four entries (invariant B2, already enforced by `check-tokens.mjs` — add nothing there).

---

### `scripts/check-wcag.mjs` — surfaces, session, and the C-section assertions

**Analog:** the file itself. The per-surface scan function (`check-wcag.mjs:220-239`) is the unit the five surfaces plug into; it already does axe, the ribbon contract and a console-error sweep:

```js
async function scanSurface(page, path, label) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const violation of results.violations) {
    const firstTarget = violation.nodes[0]?.target?.join(", ") ?? "(no node)";
    problems.push(
      `${label}: axe rule "${violation.id}" (impact: ${violation.impact}) at ${firstTarget}`,
    );
  }

  await assertRibbonContract(page, label);
  ...
}
```

The two call sites to re-point and extend (`check-wcag.mjs:303-304`), inside the build/start/teardown `finally` block:

```js
      browser = await launch();
      const { context, page } = await openMobilePage(browser);
      await scanSurface(page, "/", "/");
      await scanSurface(page, "/?s=limits", "/?s=limits");
      await context.close();
```

**The session-establishing step lands here**, between `openMobilePage` and the first authenticated `scanSurface`. `scripts/lib/harness.mjs:40-41` returns the Playwright `context` alongside the page, and the context's cookie jar is shared with `page.request` — so `await page.request.post(\`${BASE_URL}/api/session\`, {...})` before the first authenticated navigation is the cheapest correct route. There is **no cookie handling in this file today**; this is genuinely new capability, not an extension of an existing helper.

The report block differs from the source-side sweeps in one way worth copying exactly (`check-wcag.mjs:320-338`): it does not `process.exit(1)` inline, it falls through to a single explicit `process.exit(problems.length > 0 ? 1 : 0)` with a comment explaining that no lingering handle may keep the event loop alive.

---

### `scripts/check-deployment.test.mjs` — the retired-shell fixture string

**Analog / target:** `check-deployment.test.mjs:40-46`. `PASSING_BODY` hard-codes the Phase 1 shell that this phase retires and is reused by four tests (`:51, :66, :82, :112`) plus two `.replace()` mutations (`:112, :126`), so the replacement string must keep the ribbon `<section aria-label="Preview disclosure">` and the `<a href="/?s=limits">` anchor those mutations target:

```js
const PASSING_BODY = `<!doctype html><html><body>
<section aria-label="Preview disclosure">
<p><span>Designed preview.</span> Capture is specified, not yet built.</p>
<a href="/?s=limits">Read the full preview limits</a>
</section>
<main><h1 id="screen-title">NOVATEK Capture</h1></main>
</body></html>`;
```

Only the `<main>` line changes — to whatever `/` renders once the shell surface is retired (the gate, with no session).

---

## Shared Patterns

### 1. Module header states the contract, the decision id, and the failure mode

**Sources:** `lib/http/respond.ts:1-29`, `lib/store/memory.ts:1-44`, `lib/copy/governed.ts:1-24`, `scripts/check-actor-field.mjs:1-24`, `components/shell/Ribbon.tsx:3-9`.
**Apply to:** every new file in this phase, without exception. Every single source file read this session opens with one. The pattern is: what this module owns → the decision or requirement id → what breaks if a second module does the same job → (for sweeps) what the check cannot catch.

### 2. Copy is imported, never written at a call site

**Source:** `components/shell/Ribbon.tsx:1,11`, `components/limits/Limits.tsx:1,19-25`, `lib/copy/conflicts.ts:4-9`.
**Apply to:** `ConflictCard`, `OrderList` (D-02's `order_not_found` sentence), `Gate` (`GOVERNED.preview` and `FR48A_DISPOSITION`), `OrderDetail` and `TimeOnOrder` (any refusal `detail`).

```
   Every refusal sentence the server sends resolves through one of
   the three records below. No module in this phase may write a
   refusal sentence as a literal at its call site: the curl suite's
   expected string and the server's actual string are then the same
   string, by construction, rather than two hand-typed copies that
   can drift apart.
```

**One documented exception** (UI-SPEC §one-definition note): the gate heading *"Choose an artisan"* is byte-identical to `TRANSPORT_COPY.no_session.actions[0]` and must be declared locally with a comment naming the coincidence — a screen heading may not depend on a refusal's action list.

### 3. Type role from `globals.css`, layout from the CSS module

**Source:** `app/globals.css:41-111` declares `.screen-title`, `.object-title`, `.prose`, `.prose-sm`, `.control-label`, `.tag`, `.eyebrow`, `.label`, `.figure`; `Ribbon.tsx:18` and `Limits.tsx:15-16` show the composition.
**Apply to:** every new component. A module that redeclares a font-size or a font-family is a defect, not a style choice — `globals.css:31-37` says each family carries exactly one weight and that the type roles set no `text-transform`, so uppercase is applied locally (`Ribbon.module.css:51`).

### 4. The focus ring lives in exactly one place

**Source:** `app/globals.css:119-122`.
**Apply to:** every new CSS module — by *not* writing a `:focus` or `:focus-visible` rule at all (invariant A3).

```css
:focus-visible {
  outline: 2px solid var(--cobalt-glow);
  outline-offset: 2px;
}
```

### 5. A build rule's report-and-exit contract

**Source:** `scripts/check-governed.mjs:395-412`; identical shape in `scripts/check-actor-field.mjs:480-493`.
**Apply to:** `scripts/check-primitives.mjs`. Banner in caps, `"=".repeat(72)`, `Problems: n`, a `DEFECTS —` heading, `  !  ` per line, `process.exit(1)`, and a closing two-line statement of what was proved.

### 6. Every check script has a `.test.mjs` sibling that trips it (D-23)

**Source:** `scripts/check-single-writer.test.mjs`, `scripts/check-actor-field.test.mjs`, and the shared helpers at `scripts/lib/fixtures.mjs:40-93`.
**Apply to:** `scripts/check-primitives.test.mjs`. Real-repo-exits-0 test first, one fixture per violation class, and at least one negative fixture proving the sweep does not over-fire.

### 7. A closed set is declared once and asserted closed

**Source:** `lib/copy/governed.ts:26-34` (`GovernedKey` union) + `check-governed.mjs:34-43` (`LOCKED_ORDER`); `lib/data/types.ts:374-395` (union + array, in the same order).
**Apply to:** `StateMark`'s seven shapes (invariant A4) and `SURFACES` in `Screen.tsx`. The established shape is a TypeScript union, a companion array in the same order, and a build rule holding the two together.

---

## No Analog Found

Two things this phase builds have no in-repo precedent. For both, the precedent is 04-RESEARCH.md, which measured them against this exact repository this session; the planner should cite the research section rather than asking the executor to invent a shape.

| Thing | Role | Data flow | Evidence there is no analog | Use instead |
|---|---|---|---|---|
| Any Client Component at all — hooks, `useSearchParams`, effects, the interval tick, the fetch-and-re-anchor | component (client) | streaming / event-driven | `grep -rn "use client" app components lib` → no matches; `grep -rln "useState\|useEffect\|useSearchParams" app components lib` → no matches | 04-RESEARCH.md §Code Examples 1 (the lint-clean shapes: anchor in `useState` not `useRef`; `setState` only in a callback or an `await` continuation; effect keyed on `` `${s}|${id}` ``) and §Code Examples 2 (the parse point) |
| `lib/client/` as a directory | — | — | `ls lib/client` → no such file or directory. It is nonetheless **already wired**: `scripts/check-register-isolation.mjs:38` declares `SOURCE_ROOTS = ["components", "lib/client"]`, and `verify.mjs:92` already globs `lib/**/*.test.mjs` | Create it; no build plumbing changes. `lib/store/memory.ts` is the module-scope-state analog and `lib/access/scope.ts` the one-module-owns-this analog |

**Partial-match rows worth flagging to the planner.** `RecordControl` and `StateMark` have no component analog — the build contains no control component and no non-text mark other than `Ribbon.module.css:17-24`'s 5 px dot. Their *file shape* follows `Ribbon.tsx` + `Ribbon.module.css`; their *geometry and token bindings* come from 04-UI-SPEC.md Primitives 2 and 5, which specify both completely.

---

## Metadata

**Analog search scope:** `app/` (page, layout, globals.css, styles/), `components/` (both components and both CSS modules), `lib/` (all 13 subdirectories listed; `copy/`, `http/`, `store/`, `access/`, `data/types.ts` read), `scripts/` (39 files listed; `check-governed.mjs`, `check-actor-field.mjs`, `check-single-writer.mjs` + its `.test.mjs`, `check-tokens.mjs`, `check-wcag.mjs`, `check-contrast.pairs.json`, `check-deployment.test.mjs`, `verify.mjs`, `verify.test.mjs`, `lib/fixtures.mjs`, `lib/harness.mjs` read).

**Files read in full or in cited ranges this session:** `app/page.tsx`, `app/layout.tsx`, `app/globals.css` (1-45, 100-138), `app/styles/tokens.capture.css` (1-40), `components/shell/Ribbon.tsx`, `components/shell/Ribbon.module.css`, `components/limits/Limits.tsx`, `components/limits/Limits.module.css`, `lib/copy/governed.ts` (1-60, 76-100), `lib/copy/conflicts.ts` (1-70, 164-193), `lib/copy/conflicts.test.mjs`, `lib/http/respond.ts`, `lib/access/scope.ts` (1-70), `lib/access/scope.test.mjs` (1-45), `lib/store/memory.ts` (1-90 + declaration index), `lib/data/types.ts` (360-400), `scripts/check-actor-field.mjs`, `scripts/check-single-writer.test.mjs`, `scripts/check-governed.mjs` (1-140, 368-412), `scripts/check-tokens.mjs` (78-150), `scripts/check-wcag.mjs` (200-262, 280-338), `scripts/check-contrast.pairs.json` (1-29), `scripts/check-deployment.test.mjs` (35-55), `scripts/check-register-isolation.mjs` (25-60), `scripts/verify.mjs` (55-200), `scripts/verify.test.mjs` (55-70), `scripts/lib/fixtures.mjs`, `scripts/lib/harness.mjs` (export index).

**Not consulted, deliberately:** `.claude/skills/` (third-party BMad packs, not project conventions). No filesystem-wide scan was run; every search was rooted at `app/`, `components/`, `lib/` or `scripts/`.

**Read-only:** nothing in the repository was modified. `lib/data/types.ts` and `scripts/claims-audit.mjs` were read but not edited, staged or reverted.

**Pattern extraction date:** 2026-09-24
