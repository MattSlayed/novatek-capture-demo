# Phase 4: Shell, gate, orders, clock (online) - Research

**Researched:** 2026-09-24
**Domain:** Next.js 16.3.4 App Router client rendering under `cacheComponents: true` — history-state screen switching on one route, a module-scope client projection over the frozen Phase 3 server seam, programmatic focus management, an interpolated server-anchored clock, and a source-side build rule for the five DESIGN.md primitives
**Confidence:** HIGH for every mechanism (each reproduced empirically against this exact repository and version this session); LOW and logged for three facts this harness cannot reproduce (real hardware back / iOS edge swipe, real background-tab timer throttling, real-device haptics)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### URL and screen encoding (SC-5; FR-4, FR-5, FR-48a)

- **D-01:** A surface and its argument are separate keys: `?s=<surface>&id=<order_id>`.
  `s` names the screen, `id` carries the argument, and both are validated at the one
  parse point inside the `Screen` component in `app/page.tsx` — never interpolated into
  markup, a URL or a header, extending P1's existing two-way branch on `s` rather than
  replacing it. This phase's values of `s`: `orders`, `order`, `time`, `limits`
  (already built). Rejected: `?s=order/wo-0142`, which needs splitting before
  validation and gives a malformed value two ways to be wrong; and `?order=wo-0142`,
  which leaves no single key naming the current screen.
- **D-02:** A deep link to an order id the acting account does not own, or that does not
  exist, lands on the **order list** carrying the conflict table's own `order_not_found`
  sentence. No sixteenth surface is added to the fifteen the IA enumerates. **The client
  must not undo AD-4 by how it renders:** the wording may not distinguish an unowned
  order from a nonexistent one, because the byte-identical refusal is the claim SM-1
  asks a reviewer to test.
- **D-03:** A deep link arriving with no session, or an expired one, shows the gate;
  after a persona is chosen the artisan always lands on the **order list**, and the
  requested surface is dropped. No requested-surface intent is stored across the gate,
  which keeps the single purge total and the replace-never-push semantics of the gate
  (EXPERIENCE.md, Navigation contract) trivially correct.
- **D-04:** The client projection tracks `X-CAP-Instance` and purges cached state
  whenever it changes — a projection outliving the instance it was read from is the one
  failure the single purge exists to prevent. This phase does **not** name the loss to
  the artisan: `memoryStore` and `store_evicted` render on the P6 sync screen.
  **Recorded cost:** until P6, a restored order whose segments died with the instance
  reads as *no time recorded* rather than *the record was discarded*. That is a known
  gap in this phase's honesty surface, accepted deliberately and closed by P6, not an
  oversight to rediscover.

#### The conflict table (AD-9 closure)

- **D-05:** `already_open` joins the sentences in `lib/copy/conflicts.ts` this phase as
  the closed set's **one benign entry**: it reports that the clock was already running
  and nothing was lost, with a single action, *View time on this order*. It is
  deliberately not worded as a loss or as a decision, because the server refused
  nothing — D-06 in P3 settled that a second online open returns `200 { clock }` with no
  new segment (FR-7) and that `/api/sync` returns `duplicate`. Nothing in P4 renders it;
  P6 reconciliation is its first rendering path, and the roadmap requires the sentence
  written before P6 begins. It is a conflict sentence, not a governed one: it lives
  beside the code, passes the claims audit and the eight voice rules, and
  `check-governed` does not govern it. The note in `types.ts` recording that only
  `already_open` remained for P4 is updated when it lands.

#### The primitives (scheduled closure)

- **D-06:** All five are built against DESIGN.md in this phase — ribbon (exists from
  P1), record control (130 px), secondary control (44 px), focus ring, state marks —
  even though nothing in P4 binds a record. The record control is designed against
  DESIGN.md here rather than under capture-flow pressure in P5.
- **D-07:** A `verify` step enforces them: later screens consume the primitives rather
  than re-declaring sizes, contrast or state marks locally, in the shape of the P1
  `check-governed` and duplicate-literal checks, which landed with barely any consumers
  and have held since. **Risk recorded:** a contract written against a single consumer
  can encode the wrong invariant. P5 is its first real test and may generalise it; that
  is expected, not a failure of this check.

### Claude's Discretion

Three areas were left to research and planning rather than decided here. Each carries
constraints that hold regardless of how it is resolved.

- **The internal shape of the client projection** — what it caches versus always
  refetches, its module boundary, and exactly what the single purge clears. Fixed
  regardless: one module, one purge operation at the gate, instance-keyed per D-04, and
  no cached server state anywhere outside it (SC-5). This module outlives the phase;
  every later screen reads through it.
- **The live tick of the clock** — client interpolation between server reads versus
  polling, and the re-anchoring rule that keeps a ticking display honest about a
  server-derived fact. Fixed regardless: hours are server-derived and no route accepts a
  duration (FR-10; a write to the hours route returns 405), and NFR-6 forbids carrying
  the server-stamped versus device-claimed distinction by hue alone.
- **FR-48a first-entry detection** — what persists the fact that the long form has been
  seen, given the server store is memory-only. Fixed regardless: first entry states
  which claims are enforced server-side and which are authored **before any is met**;
  re-entry shows `preview` plus a control reopening the long form in full. Worth deciding
  deliberately: a cleared browser showing the long form again may be correct behaviour or
  a false claim about the reader.

### Deferred Ideas (OUT OF SCOPE)

- **Resuming a requested surface across the gate** (stored intent, so a shared deep link
  survives persona choice) — rejected for this preview under D-03, because the chosen
  persona often cannot see the requested order anyway, which routes straight back into
  the D-02 line. Worth revisiting only if link-sharing between artisans becomes a goal.
- **Naming an instance change to the artisan** — the other half of D-04. Belongs with
  the P6 sync screen, where `memoryStore` and `store_evicted` already render, and where
  the currently proposal-worded `store_evicted` sentence can be generalised deliberately
  rather than widened mid-phase.
- **A dedicated not-found surface** naming `order_not_found` with its own control —
  rejected under D-02 as a sixteenth surface in an IA that deliberately enumerates
  fifteen.
</user_constraints>

## Summary

Phase 4 is the first phase in this repository that ships client-side React. Everything
it renders is already shipped and frozen behind six route handlers; the phase's whole
technical content is *how the client is shaped* — one module that holds cached server
state, one route whose screens are switched by history state, focus that moves on every
transition, and a clock that ticks honestly about a server-derived fact. The 897-line
approved UI-SPEC settles every appearance question and most of the interaction contract,
so this document deliberately researches mechanism only.

**The finding that changes the plan's mechanics, and it is the direct analogue of Phase
3's Pitfall 1:** `app/page.tsx`'s current `Screen` is an **async Server Component that
awaits `searchParams`**, and a Server Component's `searchParams` prop **does not update
on `history.pushState`**. Verified empirically this session against this exact repo: a
server island reading `await searchParams` stayed frozen at its first-render value across
every `pushState`, `replaceState` and `popstate`, with **zero RSC network requests** —
there is no server round trip at all. `useSearchParams()` in a Client Component updates
correctly in every one of those cases. So SC-5's "`useSearchParams` behind `<Suspense>`"
is not a stylistic preference; it is the only mechanism that works, and the Phase 1
`Screen` must become a Client Component. The build enforces this from the other side too:
`useSearchParams()` in a Client Component **outside** a `<Suspense>` boundary is a hard
`next build` error under this project's locked `cacheComponents: true`
(digest `CLIENT_HOOK_DYNAMIC`). SC-5 is mechanically gated, not review-gated.

Three further mechanisms were settled with evidence rather than argument. The **client
projection** is a plain module at `lib/client/` holding module-scope `Map`s with one
`purge()` — proved to survive every client-side screen switch and to reset only on a full
document load, with no library, no Context and no new dependency; `lib/client/` is
already a scanned source root in `check-register-isolation.mjs` and `lib/**/*.test.mjs`
is already a `verify.mjs` step, so the module needs no new build plumbing. **Focus-to-
heading** is a `useEffect` keyed on the *full* derived screen key — proved necessary,
because an `id`-only transition (`?s=order&id=A` → `?s=order&id=B`) does not re-run an
effect keyed on `s` alone, which would leave focus on a control that had just been
replaced. **The clock** interpolates from a server anchor rather than accumulating per
tick, because Chrome throttles hidden-tab timers to once per second and, after five
minutes hidden, to **once per minute** — an accumulating counter would silently
under-report by minutes, which is the one thing a surface about server-derived hours may
not do.

Finally, this project's ESLint config rejects the two most obvious implementations
outright. `eslint-plugin-react-hooks@7.1.1`'s `recommended-latest` carries the React
Compiler rules, and `npx eslint .` is the third step of `npm run verify`: reading or
writing `ref.current` during render is a hard error (`react-hooks/refs`) and calling
`setState` in an effect body is a hard error (`react-hooks/set-state-in-effect`). A clock
anchor held in a ref and read during render, and a "re-anchor then setState" effect, both
fail the gate. The shapes that pass were written and verified clean against `eslint` and
`tsc --noEmit` this session, and are given in §Code Examples.

**Primary recommendation:** Convert `app/page.tsx`'s `Screen` to a Client Component
behind the existing `<Suspense>`; keep every screen's cached server state in one
module-scope projection at `lib/client/projection.ts` fetched over HTTP and keyed on
`X-CAP-Instance`, with one exported `purge()`; switch screens with
`window.history.pushState`/`replaceState` and move focus in a `useEffect` keyed on
`` `${s}|${id}` ``; render the clock as `anchor.elapsed_s + elapsed-since-anchor`,
re-anchored on every response that carries a clock and on `visibilitychange`; and add one
new source-side `scripts/check-primitives.mjs` in the shape of `check-governed.mjs` for
invariant section A, extending `check-contrast.mjs` for B1 and `check-wcag.mjs` for
section C. Add no dependency of any kind.

## Architectural Responsibility Map

This phase adds the **Browser / Client** tier to a project that until now had only an
API tier and a static shell. The seam is strict and already locked by D-DEP
(`.planning/PROJECT.md` line 65): *"`components/` imports none of access, reconcile,
store or the register; the client reaches the server only over HTTP."* Every row below
respects it.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Screen identity (`s`, `id`) and switching | Browser / Client | CDN / Static (the prerendered shell) | `history.pushState` + `useSearchParams`; no server round trip occurs on a switch (verified: zero RSC requests) |
| Validating `s` and `id` | Browser / Client | — | D-01's one parse point. The server re-decides everything that matters; a bad `id` is a lookup key the API refuses, never a rendered string |
| Which screen is legal without a session (gate vs. order list) | API / Backend | Browser / Client | `GET /api/session` is the only authority. The client renders the answer it was given (D-03) |
| Cached orders, clocks and account | Browser / Client | API / Backend | The projection module. Server is the source; the projection is a read-through cache with one purge (D-04) |
| Cache validity across an instance change | API / Backend | Browser / Client | The server states the instance on every response (`X-CAP-Instance`, universal header); the client only compares and purges |
| Accrued hours | API / Backend | — | FR-10: server-derived, `POST /api/hours` → 405. The client never computes an hour figure it stores |
| The ticking display between server reads | Browser / Client | — | A rendering of `server elapsed + locally measured wall time`, disclosed in words as exactly that (UI-SPEC string #7) |
| Focus on a screen change | Browser / Client | — | A `pushState` fires no load event; nothing announces unless the app makes it (EXPERIENCE.md §Accessibility Floor) |
| Conflict and refusal wording | API / Backend | Browser / Client | The server's `detail` sentence, or `lib/copy/conflicts.ts` read directly. Never composed at a call site (D-02) |
| FR-48a "has seen the long form" | Browser / Client | — | The server store is memory-only and the session cookie is HttpOnly (verified: `document.cookie` is empty after a mint). No server-side mechanism exists |
| Primitive ownership (sizes, focus ring, marks) | Build tooling | — | A source-side sweep in `npm run verify`, not a runtime concern (D-07) |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-FR-48a | On first entry the gate states which claims are enforced server-side and which are authored, before any is met; on re-entry it shows `preview` plus a control that reopens the long form in full. *[Verified by: test]* | §Pattern 6 (first-entry persistence, `localStorage` read in an effect, defaulting to the long form so the only error direction is over-disclosure); §Pitfall 11 (hydration); UI-SPEC Decision 4 settles the rendering |
| REQ-FR-58 | An artisan can read their own accrued record in full — every segment, its source, any measured offset; nothing withheld. Stated limitation: no route to contest a segment. *[Verified by: demonstration]* | `GET /api/hours` returns `{ clocks }` for the whole account (read in full this session) — the time surface filters by the validated `id` client-side; no new route; UI-SPEC Decision 2 fixes the field-by-field mapping |
| REQ-NFR-2 | All other targets meet WCAG 2.2 SC 2.5.5 at 44 × 44 CSS px. *[Verified by: CI target-size check]* | §Validation Architecture C1 — assertable on the existing `check-wcag.mjs` Playwright harness at both viewports and both text scales; the secondary-control primitive owns `--target-min` (UI-SPEC A2) |
| REQ-NFR-4 | Every consequential control confirms within the 100 ms window through a visible state change and is idempotent; the change is legible around a gloved thumb. *[Verified by: CI assertion at 360 px]* | `--dur-press: 90ms` (a new token — verified absent from both token files today); both clock routes are idempotent server-side (read in full); §Pitfall 10 (both require a JSON body carrying a `client_id`) |
| REQ-NFR-4a | Second channels are additive, never assumed: haptics where present; on iOS the visible change carries NFR-4 alone. *[Verified by: inspection]* | `'vibrate' in navigator` is **true** in this project's headless Chromium harness (verified), so a CI assertion cannot rely on the API being absent — it must assert the feature test exists in source, at one call site (UI-SPEC Primitive 2) |
| REQ-NFR-6 | Control boundaries, focus indicators and proposal state 3:1; state never by colour alone. *[Verified by: CI contrast check + inspection]* | §Validation Architecture B1 extends `check-contrast.pairs.json` with the UI-SPEC's 16-row manifest; B2 (exactly four exemptions) is **already enforced** by `check-tokens.mjs` and must not be duplicated |
</phase_requirements>

## Standard Stack

### Core

**No new runtime or development dependency.** Every mechanism this phase needs is already
in `package.json` or is a browser built-in.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.3.4 (installed) `[VERIFIED: npx next --version, this repo]` | `useSearchParams` from `next/navigation`; `<Suspense>` interop under `cacheComponents: true` | Locked stack; confirmed this session |
| `react` / `react-dom` | 19.2.8 (installed) `[VERIFIED: package.json]` | `useState`, `useEffect`, `<Suspense>` | Locked stack |
| `window.history` (`pushState`/`replaceState`) | Browser built-in | Screen switching on the one route | Officially supported by the App Router and documented to synchronise with `usePathname`/`useSearchParams` `[CITED: nextjs.org/docs/app/getting-started/linking-and-navigating §Native History API]` |
| `crypto.randomUUID()` | Browser built-in (secure contexts) | The `client_id` both clock routes require | The routes' `ACCEPTED_BODY_FIELDS.orders_open` / `.orders_close` are exactly `["client_id"]` (read in full this session) |
| `performance.now()` | Browser built-in | The monotonic delta the clock interpolates over | Verified present and independent of `Date.now()`; immune to a device clock change |
| `playwright` + `@axe-core/playwright` | 1.62.1 / 4.13.0 (installed) | Invariant section C's CI assertions | Already the project's harness (`scripts/lib/harness.mjs`, `scripts/check-wcag.mjs`) |
| `node:test` | Node 24 built-in | Unit proofs for the projection and the new sweep | Already the project's only test framework; `lib/**/*.test.mjs` is already a `verify.mjs` step |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A module-scope `Map` projection | `zustand`, `jotai`, `@tanstack/react-query`, `swr` | Every one is a new dependency. `scripts/check-named-packages.mjs` already carries four entries (`zod`, `valibot`, `jsonwebtoken`, `jose`) banned on **this project's dependency-minimalism principle alone, not FR-17** — the precedent for refusing a library whose job is small and fixed is established in source. The projection's whole surface is `get`, `set`, `purge` and an instance comparison |
| A module-scope `Map` projection | React Context + a provider | A provider is a second place cached state can live, and it must sit *inside* the `<Suspense>` boundary (a provider above it would make the static shell a client boundary). It buys re-render propagation this phase does not need — the four surfaces are never mounted simultaneously. SC-5's "all cached server state lives in the one client projection module" is harder to assert against a Context than against a module with one exported `purge()` |
| A module-scope `Map` projection | `use(promise)` + Suspense for data | Still needs a promise cache keyed by request — i.e. the same `Map` — plus a second dynamic-hook surface interacting with the `CLIENT_HOOK_DYNAMIC` build rule. More machinery, same cache |
| Interpolation from a server anchor | Polling `GET /api/hours` every second | 60 requests/minute/artisan against a memory store for a figure that is arithmetic; and it does not solve backgrounding (a throttled poll is a stale figure exactly as a throttled accumulator is a wrong one). Interpolation plus re-anchoring is correct at any tick rate |
| `localStorage` for FR-48a | A non-HttpOnly companion cookie | A second cookie beside `cap_session` invites the reading that it is part of the session; it is sent on every request for no server purpose; and it is no more durable than `localStorage` |

**Installation:**
```bash
# No new packages. This phase adds zero dependencies.
```

**Version verification:** `npx next --version` → `Next.js v16.3.4`; `node --version` →
`v24.19.0`; `npm --version` → `11.17.0`. All confirmed against this repository's own
`node_modules` this session.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero external packages. `scripts/check-named-
packages.mjs` already fails the build on an unnamed direct dependency, so "no new
dependency" is enforced rather than asserted (UI-SPEC §Registry Safety states the same).
No `npm install` step belongs in this phase's plan. If a task is tempted to reach for a
state-management or data-fetching library, that is a deviation from CONTEXT.md's
Claude's-Discretion note and from D-DEP, and should be flagged rather than silently added.

**Packages removed due to a slopcheck verdict:** none (nothing was installed to check).
**Packages flagged as suspicious:** none.

## Architecture Patterns

### System Architecture Diagram

```
   Phone browser — ONE document, ONE route "/"
   ┌──────────────────────────────────────────────────────────────────┐
   │  app/layout.tsx  →  <Ribbon/>  (static, in flow, every surface)  │
   │  app/page.tsx    →  plain non-async Server Component  ◐ PPR      │
   │                     └── <Suspense fallback={null}>               │
   │                           └── <Screen/>   "use client"           │
   └───────────────────────────────┬──────────────────────────────────┘
                                   │ useSearchParams() → s, id
                                   │   (updates on push/replace/pop;
                                   │    a Server Component's
                                   │    searchParams prop does NOT)
                                   ▼
        ┌──────────────────────────────────────────────┐
        │  one parse point (D-01)                       │
        │  s ∈ {orders, order, time, limits} | else →   │
        │       replaceState("?s=orders")               │
        │  id: opaque lookup key, never rendered        │
        └───────┬───────────────────────────┬──────────┘
      no session│                           │session
                ▼                           ▼
        ┌───────────────┐        ┌────────────────────────────┐
        │  Gate         │        │  Orders │ Order │ Time      │
        │  3 doors      │        │  (header: name, Back)       │
        └───────┬───────┘        └──────────┬─────────────────┘
                │ choose persona            │ read
                │ POST /api/session         │
                │ purge() + replaceState    │
                ▼                           ▼
        ┌──────────────────────────────────────────────────────┐
        │  lib/client/projection.ts   THE ONE PROJECTION        │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ instance: string | null   ← X-CAP-Instance      │  │
        │  │ account:  Account | null                        │  │
        │  │ orders:   Map<order_id, WorkOrder>              │  │
        │  │ clocks:   Map<order_id, {clock, readAtMs}>      │  │
        │  │ details:  Map<order_id, OrderDetail>            │  │
        │  │ purge()   ← clears ALL of the above, at once    │  │
        │  └────────────────────────────────────────────────┘  │
        │  every response passes through noteInstance(res):     │
        │  instance changed → purge() BEFORE the body is stored │
        └──────────────────────────┬───────────────────────────┘
                                   │ fetch() only — D-DEP:
                                   │ the client reaches the
                                   │ server over HTTP alone
                                   ▼
   ═══════════════════ FROZEN SERVER SEAM (Phase 3) ═══════════════════
     GET    /api/session            → { account, session } | 401
     GET    /api/orders             → { orders, clocks }   + X-CAP-Account
     GET    /api/orders/[id]        → { order, assets, clock, … }
     POST   /api/orders/[id]/open   → { clock }   body: { client_id }
     POST   /api/orders/[id]/close  → { clock }   body: { client_id }
     GET    /api/hours              → { clocks }  (POST → 405)
     every response: Cache-Control: no-store · X-CAP-Store · X-CAP-Instance
```

### Recommended Project Structure

```
app/
├── page.tsx                       # unchanged shape: plain non-async Server
│                                  #   Component + <Suspense>; the child becomes
│                                  #   a Client Component (the one real change)
├── layout.tsx                     # unchanged
└── globals.css                    # unchanged except where a primitive needs it

components/
├── shell/Ribbon.tsx               # unchanged (Primitive 1)
├── shell/Screen.tsx               # "use client" — the one parse point + switcher
├── shell/Header.tsx               # back + account name (Surfaces 2–4)
├── controls/RecordControl.tsx     # Primitive 2 — the ONLY module declaring 130px
├── controls/SecondaryControl.tsx  # Primitive 3 — the ONLY module declaring 44px
├── marks/StateMark.tsx            # Primitive 5 — all seven shapes, closed set
├── gate/Gate.tsx                  # Surface 1 (+ Disclosure, PersonaDoor)
├── orders/OrderList.tsx           # Surface 2
├── order/OrderDetail.tsx          # Surface 3 (+ Clock)
├── time/TimeOnOrder.tsx           # Surface 4
├── conflict/ConflictCard.tsx      # the tinted-callout anatomy, both uses
└── limits/Limits.tsx              # unchanged

lib/client/                        # NEW directory — already a scanned source root
├── projection.ts                  #   in scripts/check-register-isolation.mjs:38
├── projection.test.mjs            #   already swept by verify.mjs's unit-suite
├── navigate.ts                    # pushState/replaceState + the screen-key derivation
└── navigate.test.mjs

lib/copy/conflicts.ts              # + already_open (D-05)
lib/copy/governed.ts               # + the FR-48a disposition sentence, as a PLAIN
                                   #   STRING export (see Pitfall 6)
lib/data/types.ts                  # + already_open in ConflictCode & CONFLICT_CODES
                                   #   ⚠ [SECURITY]-blocked file — see §Open Questions

app/styles/tokens.capture.css      # + --dur-press, --tint-warn-head
scripts/check-tokens.mjs           #   + both names in D13_MANIFEST, SAME COMMIT
scripts/check-primitives.mjs       # NEW — invariant section A
scripts/check-primitives.test.mjs  # NEW — its failing fixture (D-23 convention)
scripts/check-contrast.pairs.json  # + the UI-SPEC's 16-row manifest (B1)
scripts/check-wcag.mjs             # surface list re-pointed + section C assertions
scripts/verify.mjs                 # + one STEPS entry for check-primitives
scripts/check-deployment.test.mjs  # PASSING_BODY fixture string updated
```

### Pattern 1: The screen switcher is a Client Component, and it has to be

**What:** `app/page.tsx` stays a plain non-async Server Component with the existing
`<Suspense>`; the child it wraps becomes `"use client"` and reads `useSearchParams()`.

**Why it is not a choice.** Verified empirically this session against this repository at
Next.js 16.3.4 with `cacheComponents: true`:

| Reader | Value after `history.pushState("?s=b")` | RSC requests |
|---|---|---|
| async Server Component, `await searchParams` | **frozen** at its first-render value (`server:a:1790235746910` across every push, replace and pop) | **0** |
| Client Component, `useSearchParams()` | updated correctly on push, replace, back, forward and a no-query push | 0 |

Corroborated by the official reference: *"`useSearchParams` is a Client Component hook and
is **not supported** in Server Components to prevent stale values during partial
rendering … use the Page `searchParams` prop or the `useSearchParams` hook in a Client
Component, **which is re-rendered on the client with the latest `searchParams`**."*
`[CITED: nextjs.org/docs/app/api-reference/functions/use-search-params]`

**The route stays statically prerendered.** A probe route with exactly this shape built as
`◐ (Partial Prerender)` — the same glyph `/` carries today and the one
`check-structure.mjs --build-output` accepts.

**The first paint is correct on a deep link.** The resolved client markup, carrying the
right `s`, is present in the **first HTML response body**, inside React's
`<div hidden id="S:0">…</div>` resume container with its `$RC()` script — not only after
hydration. Measured directly: `<div hidden id="S:0"><div><p id="client-island">client:<!-- -->a<!-- -->:renders=<!-- -->1…`
So a deep link to `?s=time&id=wo-0142` does not flash a fallback.

> The published `useSearchParams` reference still says a prerendered route will
> "cause the Client Component tree up to the closest `Suspense` boundary to be
> client-side rendered." That phrasing predates Cache Components; the measurement above
> is from this exact version with `cacheComponents: true`, and it governs. Recorded
> because a reader of the docs alone would plan for a fallback flash that does not occur.

### Pattern 2: The one client projection — a plain module, module-scope Maps, one purge

**What:** `lib/client/projection.ts` holds the cache in module scope, exposes typed
read-through accessors, and exposes exactly one `purge()`.

**Why module scope is the right lifetime.** Verified: module-scope state survives every
client-side screen switch and resets only on a full document load. A probe incremented a
module `Map` across `?s=a → b → c&id=… → back → back → forward → replace`, reaching
`projSize=4`, then `page.goto()` reset it to `projSize=1`. That is precisely D-04's
required lifetime — a projection scoped to one document, torn down by the same event that
tears down the tab.

**Why `lib/client/`.** `scripts/check-register-isolation.mjs:38` already declares
`SOURCE_ROOTS = ["components", "lib/client"]` and treats a missing `lib/client/` as
"nothing to check" — the directory was anticipated by Phase 1 and inherits the register
rule the moment it exists. `verify.mjs`'s `unit-suite` STEP already runs
`node --test "lib/**/*.test.mjs"`, so `lib/client/projection.test.mjs` is collected with
no change to `verify.mjs`.

**What is cached versus always refetched:**

| Datum | Source | Cached? | Why |
|---|---|---|---|
| `account` (`{id, name, trade, competency, …}`) | `GET /api/session` | **Yes**, for the document's life | It is what the header renders on three surfaces and it cannot change without a gate transit, which purges |
| Order list (`orders`) | `GET /api/orders` | **Yes** | Fixture-backed and immutable within an instance |
| Order detail (`order`, `assets`) | `GET /api/orders/[id]` | **Yes** | Same |
| `clock` per order | `GET /api/orders` (`clocks`), `GET /api/orders/[id]`, `GET /api/hours`, `POST …/open`, `POST …/close` | **Cached with its read instant**, and **always refetched on entering order detail or the time surface** | It is the one datum that changes. Cached only so a screen can paint immediately; the fetch that re-anchors it is issued in the same effect |
| `elapsed_s` between reads | derived | **Never stored as a figure** | It is rendered arithmetic over `anchor.elapsed_s`, not a value the client holds. FR-10 |
| Conflict sentences | `lib/copy/conflicts.ts` / the response envelope's `detail` | n/a | Not server state; read directly from the module |

**How the purge is made total rather than best-effort.** Three things together:

1. **One clearing function.** `purge()` clears every `Map` and nulls every cell in the
   module. Nothing else in the module mutates state to empty, so there is no second,
   partial reset that can drift from it.
2. **One write door.** Every response body enters the projection through a single
   `noteResponse(res)` that reads `X-CAP-Instance` *first*, calls `purge()` if it
   differs from the stored instance, stores the new instance, and only then stores the
   body. Ordering matters: purging after the store would discard the very datum that
   proved the instance changed. `X-CAP-Instance` is a **universal** header on every
   response including a 404 (`lib/http/contract.ts` HEADER_TABLE), so no response can
   arrive without one, and it is readable from `fetch` in the browser (verified:
   `res.headers.get("x-cap-instance")` returned a real UUID same-origin).
3. **A build rule makes "no cached server state anywhere else" checkable.** SC-5's claim
   is only as strong as its enforcement. Add to `check-primitives.mjs`: no `*.tsx` under
   `components/` declares a module-scope `Map`, `Set`, `let` or mutable object literal at
   top level, and `sessionStorage`/`localStorage`/`indexedDB` appear in `lib/client/`
   only. This is a source sweep in the established shape and it is the only way the
   claim survives Phase 5.

**Ordinary invalidation (no instance change).** Entering order detail or the time surface
always issues its fetch; the cached clock is painted immediately and replaced when the
response lands. A `POST …/open` or `…/close` response carries `{ clock }`, which is
stored as the new anchor directly — the clock control never needs a follow-up read.

### Pattern 3: `history.pushState` / `replaceState`, and why `id` must stay in the query

**What:** `pushState` for a forward move, `replaceState` for the gate's entry and for
D-02's correction; nothing else. No `<Link>`, no `useRouter`, no `router.push` (SC-5,
invariant A12).

**Verified behaviours** (all this session, production build, this repo):

| Act | Result |
|---|---|
| `pushState` → new `?s=` | `useSearchParams()` updates; effect keyed on the screen key runs; focus moves; **0 RSC requests** |
| `pushState` → same `s`, different `id` | Same — but only an effect keyed on `s` **and** `id` re-runs (see Pattern 4) |
| `pushState` → a URL with no query at all | Works; `s` reads as absent; the effect runs |
| `replaceState` | Updates the hook; leaves **no** back entry (back skipped past it to the prior entry) |
| `replaceState` to the identical URL | A genuine no-op — no re-render, no effect. Idempotent navigation is free |
| Browser back / forward | `popstate` fires, the hook updates, the effect runs |
| `pushState(state, …)` with your own state object | Next **merges** its own keys in and preserves yours: `{"probe":1,"__NA":true,"__PRIVATE_NEXTJS_INTERNALS_TREE":{…,"renderedSearch":"?s=a"}}` |

**`id` must stay a query key, and this is a second reason beyond D-01's.** `useParams`
(dynamic route segments) is **not** updated by `pushState`/`replaceState` — an open
upstream issue, `vercel/next.js#80528`, reproduced and unresolved. Only `useSearchParams`
and `usePathname` participate in shallow routing. D-01's `?s=…&id=…` is therefore immune
by construction; had `id` been a path segment (`/order/wo-0142`), history-state
navigation would not have worked at all. Record this so a later phase does not "tidy" the
URL into segments.

**Android hardware back and iOS edge swipe.** Both are the platform's own `popstate` on
the same history entry; there is no separate API and no way for them to disagree with
`history.back()` unless the app adds a second listener that intercepts one of them.
Phase 4 adds none. This is reasoned, not measured — see Assumptions Log A1.

### Pattern 4: Focus moves on a key derived from the whole screen identity, never from `s`

**What:** one `useEffect`, keyed on `` `${s}|${id}` ``, whose entire body moves focus to
the new screen's `<h1 id="screen-title" tabindex="-1">`.

**Why not `s` alone — this was measured, and the naive version is wrong.** Driving
`?s=order&id=wo-0142` → `?s=order&id=wo-0151` with two effects side by side:

```
before:  sOnly=1  byKey=1   activeElement=screen-title
(focus deliberately moved to a button, then the id-only push)
after:   sOnly=1  byKey=2   activeElement=screen-title
```

The `s`-keyed effect **did not re-run**. Focus moved only because the key-keyed effect
did. With `s`-only keying, focus would have stayed on a control belonging to the previous
order — which is EXPERIENCE.md's named failure: *"never left on a control that has just
been removed from the DOM, which drops focus to `<body>` and sends VoiceOver and TalkBack
back to the top of the document."*

**The effect must contain no `setState`.** `react-hooks/set-state-in-effect` is an error
in this project's ESLint config (Pitfall 3). The focus move needs none.

**Coverage proved across every transition this phase has**, with `document.activeElement`
asserted after each: initial load, `pushState` with an `s` change, `pushState` with an
`id`-only change, `pushState` to a no-query URL, `replaceState`, `history.back()` twice,
and `history.forward()`. `activeElement` was `screen-title` in all eight cases, including
after focus was deliberately parked on a button first.

**A consequence to state rather than discover.** `element.focus()` scrolls the element
into view; a transition made from a scrolled position (`scrollY = 900`) landed at
`scrollY = 0`. That is the behaviour this phase wants going forward — a new screen starts
at its heading — but it also means **scroll position is not restored on back**.
EXPERIENCE.md states a focus rule and no scroll-restoration rule, so the focus rule wins;
`focus({ preventScroll: true })` is the opposite choice and must not be reached for
casually. Record it as a decision, not an accident.

### Pattern 5: The clock interpolates from a server anchor and re-anchors; it never accumulates

**What:**

```
displayed_elapsed_s = anchor.elapsed_s + floor((now − anchor.readAt) / 1000)
```

where `anchor` is the last `OrderClock` the server sent, together with the instant it was
received. Nothing increments a counter.

**Why not accumulate per tick.** Chrome throttles timers in hidden pages: *"The browser
will check timers in this group once per **second**"* under standard throttling, and
*"once per **minute**"* under intensive throttling, which activates when the page has been
hidden **more than 5 minutes** with a chain count ≥ 5 and no sound for 30 s.
`[CITED: developer.chrome.com/blog/timer-throttling-in-chrome-88]` A display that added
one second per tick would under-report by minutes after a phone spent ten minutes in a
pocket — a *wrong number about a server-derived fact*, which is the one failure this
surface may not have. A recomputed display is correct at any tick frequency: a throttled
tick only makes it update less often, and the first tick after return snaps it to the
truth.

**The re-anchoring rule, stated so a later phase inherits it:**

> The anchor is replaced by **every** server response that carries an `OrderClock` —
> `GET /api/orders` (`clocks`), `GET /api/orders/[id]` (`clock`), `GET /api/hours`
> (`clocks`), `POST /api/orders/[id]/open` and `POST /api/orders/[id]/close` (`clock`).
> It is additionally refreshed on `visibilitychange` → `visible`. It is **never**
> advanced by the tick, and the tick **never** writes to the projection.

**Measure the delta with `performance.now()`, not `Date.now()`.** Both are available
(verified). `performance.now()` is monotonic and unaffected by a device clock change; a
`Date.now()` delta would make the displayed elapsed figure jump if the phone's clock were
corrected mid-segment — and a clock display that jumps for a reason unrelated to the
record is a false statement about the record. Store the anchor's arrival as a
`performance.now()` reading, not a wall-clock instant. (The *instants* the time surface
renders are the server's own ISO strings, untouched — UI-SPEC Decision 2.)

**`role="timer"` and `aria-live`.** Confirmed from two authorities: the timer role is
*"a type of live region containing a numerical counter which indicates an elapsed time"*
`[CITED: w3.org/TR/wai-aria-1.2/#timer]`, and *"Elements with the role `timer` have an
implicit `aria-live` value of `off`"* `[CITED: developer.mozilla.org … Roles/timer_role]`.
MDN's own guidance matches the UI-SPEC exactly: do not set `aria-live` on a timer;
promote the role to `alert` only for a moment that must be announced (Phase 4 has none).

### Pattern 6: FR-48a first-entry persistence — default to the long form, downgrade on proof

**What:** a single versioned key in `localStorage`, read **in an effect**, with the gate
rendering the **long form** as its pre-resolution state.

**What is actually available** (verified in the harness): `localStorage` and
`sessionStorage` both work; `navigator.cookieEnabled` is true; **`document.cookie` is
empty after `POST /api/session`**, confirming the session cookie is `HttpOnly` and cannot
carry this. The server store is memory-only per AD-10 and the session is stateless, so
**no server-side mechanism exists**: the server genuinely cannot know whether this reader
has seen the long form, and inventing one would mean persisting a per-reader fact the
architecture says is not persisted.

**The options and their honest failure modes:**

| Mechanism | A cleared browser | Private mode | A second device | Verdict |
|---|---|---|---|---|
| `localStorage` | long form again | long form again (and not retained) | long form | **Recommended** |
| `sessionStorage` | long form again | long form again | long form | Also re-shows on every new tab of the *same* browser — noisier, no honesty gain |
| In-memory module flag | n/a | n/a | n/a | Re-shows on every reload. Rejected: a reload during one working session is common and this would read as the app forgetting |
| Non-HttpOnly cookie | long form again | long form again | long form | No durability gain; adds a second cookie beside `cap_session` that invites being read as part of the session |
| Server-side | — | — | — | Does not exist. AD-10 |

**The claim being made, and why re-showing is correct.** The disclosure's job is that the
split is stated *before any claim is met* (FR-48a). The claim "this reader has already
seen it" is a claim about a **person**, and no client-side token can carry it — a shared
phone, a cleared browser and a second device are all readers who have not seen it. So
re-showing the long form is not a defect; it is the mechanism admitting what it does not
know, in the only direction that cannot under-disclose. State this in the module's own
comment so a later phase does not "fix" it.

**The ordering rule that makes it safe.** Read the key in a `useEffect`, never during
render — reading storage during render produces a hydration mismatch (Pitfall 11). That
means there is one paint before the answer is known, and the gate must choose what that
paint shows. **It shows the long form.** Defaulting to first-entry means the only possible
error is a returning artisan briefly seeing the full disclosure before it collapses to the
short form. The opposite default would briefly show the short form to a reader who has
never seen the long one — which is FR-48a's exact prohibition, in the exact window the
requirement is about. The cost is a visible collapse on re-entry; record it, do not
animate it away (§Motion forbids the transition anyway).

**Rejected alternative:** rendering nothing in the disclosure slot until the read
resolves. That is an empty slot where a governed sentence must be, on the screen whose
purpose is the disclosure. Worse than the collapse.

### Pattern 7: The primitives check, in the shape of the existing sweeps

**What:** one new `scripts/check-primitives.mjs` for invariant section A, one new STEPS
entry, and its own `.test.mjs` with a failing fixture per the project's D-23 convention.

**Shape, copied from `check-governed.mjs` and `check-tokens.mjs` (both read in full):**

```
const ROOTS = ["app", "components"];
const problems = [];
async function walk(dir) { … }                 // identical to check-governed.mjs's
/* … one block per assertion, each pushing a sentence naming the file and the reason … */
console.log("PRIMITIVES CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);
if (problems.length) { for (const p of problems) console.log(`  !  ${p}`); process.exit(1); }
```

**The three scope sets become three file filters**, exactly as the UI-SPEC's preamble
defines them, and each assertion names the one it uses:

| Scope | Filter |
|---|---|
| `css-modules` | `**/*.module.css` under `app/` and `components/` |
| `css-all` | `css-modules` + `app/globals.css` (never the two token files) |
| `tsx` | `**/*.ts`, `**/*.tsx` under `app/` and `components/` |

**Where each invariant section lands, and what is already covered:**

| Section | Home | Note |
|---|---|---|
| A1–A14 | **new** `scripts/check-primitives.mjs` | A5 (`position: fixed` zero times) and A6 (`sticky` zero times) must match `fixed`/`sticky` specifically — `position: absolute` is legitimate and present today in `Ribbon.module.css` and `globals.css`'s `.sr-only` |
| B1 | extend `scripts/check-contrast.pairs.json` with the UI-SPEC's 16 rows | The check already exists and already composites alpha |
| **B2** | **already enforced — add nothing** | `check-tokens.mjs` already asserts `docs/design/decorative-exemptions.json` is an array of **exactly 4** entries with six non-empty string fields and a numeric `measured_ratio`. Duplicating it would create two owners of one rule |
| C1–C8 | extend `scripts/check-wcag.mjs` | It already owns the harness, the pinned 390×844 profile, the build/start/teardown lifecycle and `--self-test`. See §Validation Architecture for the one new capability it needs |
| D1 | **amend** `scripts/check-governed.mjs` | See Pitfall 6 — its closed-set sweep must not be tripped by the new sentence |
| D2 | `claims-audit.mjs`, unchanged | Its roots are already `app/`, `components/`, `lib/` |
| D3 | a new assertion, simplest in `check-primitives.mjs` | Reads `lib/data/types.ts` and `lib/copy/conflicts.ts` as text |

**Two new token names must join a closed list in the same commit.** `check-tokens.mjs`'s
`D13_MANIFEST` is a **closed** list — a token declared in `tokens.capture.css` that is not
in the manifest fails the build, and so does a missing one. Verified this session: the
manifest holds exactly 40 names, `tokens.capture.css` declares exactly those 40, and
neither `--dur-press` nor `--tint-warn-head` exists in either token file
(`grep -- "--dur" app/styles/ app/globals.css` returns nothing; `--ease-out-expo` and
`--ease-out-quart` **do** exist, in the byte-pinned `tokens.inherited.css` at lines 50–51,
and must be consumed rather than redeclared).

### Anti-Patterns to Avoid

- **Leaving `Screen` an async Server Component.** It cannot see a `pushState`. Verified.
- **`useSearchParams()` outside `<Suspense>`.** Hard `next build` error (Pitfall 2).
- **`export const instant = false`.** The build error's own second suggestion. It would
  make the route blocking and break `check-structure --build-output`'s `◐`/`○` assertion
  on `/` — and on 16.3.4 it did not build in any case (Pitfall 2).
- **Anything that makes `/` dynamic** — a `cookies()` read or a `searchParams` read
  outside a Suspense boundary at page level. `/` must stay `◐`.
- **An effect keyed on `s` alone.** Misses an `id`-only transition. Measured.
- **A ref read during render.** Hard ESLint error in this repo (Pitfall 3).
- **`setState` in an effect body.** Hard ESLint error in this repo (Pitfall 3).
- **Accumulating the clock by one second per tick.** Wrong after backgrounding.
- **Seeding the projection from storage during render.** Hydration mismatch (Pitfall 11).
- **Composing a refusal sentence at the call site.** D-02's claim depends on the wording
  coming from `conflicts.ts` or the server's own `detail`, never from the client.
- **Rendering the `id` from the URL as text.** It is a fetch path segment and nothing
  else; rendering it is how a deep link becomes an attacker-chosen string on screen.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Knowing the current screen after a `pushState` | A custom `popstate` listener plus a `useState` mirror of the URL | `useSearchParams()` | It already tracks push, replace **and** pop (all three verified). A hand-rolled mirror has to re-implement pop and will drift from the URL, which is addressable state (C-27) |
| A `client_id` for the clock routes | A random-hex-with-dashes template | `crypto.randomUUID()` | The routes validate UUID shape. Built-in, zero dependency. **Secure contexts only** — fine on `https` and `localhost`, absent on a plain-`http` LAN origin |
| Cache invalidation across a server restart | A TTL, a version stamp, or a heuristic | The `X-CAP-Instance` header the server already puts on **every** response | The server already answers this question authoritatively on every single response including 404s. A client-side heuristic would be a second, weaker answer to a question already answered |
| Measuring elapsed time across a background period | Counting ticks | `performance.now()` deltas against a stored anchor | Monotonic, unaffected by a device clock change, and correct regardless of how often the timer actually fired |
| Deriving the order list and its clocks | Two fetches | One `GET /api/orders` | It already returns `{ orders, clocks }` in one response (read in full this session) |
| A "session valid?" check | Decoding or inspecting the cookie client-side | `GET /api/session` | The cookie is `HttpOnly` (verified: `document.cookie` is empty after a mint) and HMAC-signed. The client cannot and must not evaluate it |
| The exemption-count assertion (B2) | A new check | `check-tokens.mjs`, which already does it | Two owners of one rule is how a rule gets half-removed later |

**Key insight:** every row is "use what the frozen server seam or the platform already
gives you." This phase's temptation is not to add a package — it is to re-derive
client-side something the server already states on the wire.

## Common Pitfalls

### Pitfall 1: A Server Component's `searchParams` prop does not update on `pushState` — the Phase 1 `Screen` cannot be the switcher

**What goes wrong:** the obvious reading of SC-5 is "widen `app/page.tsx`'s existing
branch on `s`," because D-01 says exactly that and the file already has the branch. Done
literally, against the *async Server Component* that holds it today, the screen never
changes: the URL updates, the back button works, and the body stays on the screen it
first rendered.

**Why it happens:** `history.pushState` performs no navigation and issues no request.
Next's App Router synchronises `usePathname` and `useSearchParams` with it in the client
router; it does not re-render the server tree, because there is nothing to re-render
against — no RSC payload is fetched.

**Evidence (this session, this repo, Next.js 16.3.4, `cacheComponents: true`):** a server
island rendering `server:{s}:{Date.now()}` was frozen at `server:a:1790235746910` across a
`pushState` to `?s=b`, a `pushState` to `?s=c&id=wo-0142`, a `replaceState`, and two
`history.back()` calls. A Playwright request listener filtering for `_rsc` and the
`RSC`/`next-router-state-tree` headers recorded **zero** requests throughout. A sibling
Client Component reading `useSearchParams()` tracked every one of those transitions
correctly in the same document.

**How to avoid:** make the child of the existing `<Suspense>` a Client Component that
reads `useSearchParams()`. `app/page.tsx` itself stays a plain non-async Server Component
and the `<Suspense>` stays exactly where it is.

**Warning signs:** the URL in the address bar disagrees with what is on screen; back
"works" (the URL changes) but nothing re-renders; a `console.log` in the screen branch
fires once per document load and never again.

### Pitfall 2: `useSearchParams()` outside `<Suspense>` is a hard `next build` error

**What goes wrong:** a Client Component that reads `useSearchParams()` without a
`<Suspense>` boundary above it fails `next build` outright — `verify.mjs`'s `next-build`
STEP goes red with a prerender error, and the route is not built.

**Why it happens:** under `cacheComponents: true` the value is only available at runtime,
so it cannot be part of the static prerender; Next refuses rather than silently
downgrading the route to dynamic.

**Evidence (reproduced this session):**

```
Error: Route "/probe2": Next.js encountered URL data `useSearchParams()` in a
Client Component outside of `<Suspense>`.

This blocks prerendering because the value is only available at runtime.

Ways to fix this:
  - [stream] Wrap the component in `<Suspense fallback={...}>` so the hook value
    streams in after prerendering
  - [block] Set `export const instant = false` to allow a blocking route

Learn more: https://nextjs.org/docs/messages/blocking-prerender-client-hook
  digest: 'CLIENT_HOOK_DYNAMIC'
```

**How to avoid:** take the first suggestion. The second, `export const instant = false`,
is **forbidden here on two counts**: it would make `/` a blocking route, which breaks
`check-structure.mjs --build-output`'s assertion that `/`'s route-table glyph is `○` or
`◐`; and when tried on 16.3.4 this session it did not build either, producing a bare
`Error occurred prerendering page "/probe2"` with no further detail.

**The upside, and it is worth naming:** this makes SC-5's Suspense requirement a build
gate rather than a review note. Nobody can remove the boundary and ship.

**Warning signs:** `next build` failing at "Generating static pages" with digest
`CLIENT_HOOK_DYNAMIC`; a plan task that introduces a second client component reading the
URL somewhere above or outside the existing boundary.

### Pitfall 3: This project's ESLint config rejects the two most obvious implementations

**What goes wrong:** `eslint-plugin-react-hooks@7.1.1`'s `recommended-latest` — loaded by
`eslint.config.mjs` and run as the **third** step of `npm run verify`, before any build —
carries the React Compiler rules. Two of them fail the code a competent developer would
write first for this phase's clock and projection.

**Evidence (all four errors reproduced this session on one probe component, exit 1):**

| Rule | Rejected shape | Message |
|---|---|---|
| `react-hooks/refs` | `renders.current += 1` in the component body | *Cannot update ref during render* |
| `react-hooks/refs` | `{renders.current}` in the returned JSX | *Cannot access ref value during render* |
| `react-hooks/set-state-in-effect` | `useEffect(() => { …; setN(x => x + 1); }, [s])` | *Avoid calling setState() directly within an effect* / *Calling setState synchronously within an effect can trigger cascading renders* |

**What this rejects concretely in this phase:**

- **A clock anchor held in a `useRef` and read during render to compute the displayed
  figure.** This is the natural shape — the anchor is not render state, it is a stored
  fact — and it is a hard error. The anchor must be `useState`.
- **A "re-anchor on screen change, then `setState`" effect.** Any effect whose body
  synchronously calls a setter fails. The setter must be in a **callback** — an interval
  handler, an event handler, or an `await` continuation — which the rule explicitly
  permits as "subscribe for updates from some external system."

**What is NOT rejected** (verified clean in the same run, which matters as much):

- Reading a **module-scope `Map`** during render (`PROJECTION.get(key)`) — no error.
  This is what makes the Pattern 2 projection viable at all.
- Writing to a module-scope `Map` inside an effect — no error.
- An async effect that `await`s a `fetch`, compares `X-CAP-Instance`, calls `purge()`,
  writes the projection and then calls `setState` in the continuation — no error.
- `setInterval(() => setNow(Date.now()), 1000)` inside an effect — no error.

The corrected component containing all of the permitted shapes passed both
`npx eslint` (exit 0) and `npx tsc --noEmit` (exit 0). It is reproduced verbatim in
§Code Examples 1.

**How to avoid:** write the shapes in §Code Examples. Run `npx eslint <file>` per task —
it takes seconds and it is the third gate, so a violation blocks the build before
anything slower runs.

**Warning signs:** `verify.mjs` failing at the `eslint` step with `react-hooks/refs` or
`react-hooks/set-state-in-effect`, long before `next-build`.

### Pitfall 4: An effect keyed on `s` alone silently skips an `id`-only transition

**What goes wrong:** focus does not move when the artisan goes from one order to another
without passing through a different surface, because the effect's dependency did not
change. The screen re-renders with new content while focus sits on an element from the
previous order — or on nothing, if that element was unmounted.

**Why it happens:** `s` is only half the screen identity. D-01 deliberately splits the
surface from its argument, which means two distinct screens can share an `s`.

**Evidence:** measured directly. Pushing `?s=order&id=wo-0142` → `?s=order&id=wo-0151`
with focus parked on a button left an `s`-keyed effect at `sOnly=1` while a
`` `${s}|${id}` ``-keyed effect went `byKey=1 → 2` and restored `activeElement` to
`screen-title`.

**How to avoid:** derive one `screenKey` string at the one parse point and key every
transition-sensitive effect on it. Do not key on the `searchParams` object either — it is
stable across unrelated re-renders (verified: identity changed 6 times across 17 renders,
exactly once per URL change) but keying on a derived string is explicit and survives a
future query key being added.

**Warning signs:** the CI assertion for C6 passing on `orders → order` and `order → time`
but never exercising `order(A) → order(B)`. Make sure the test covers it; this phase can
reach it through the list, but Phase 5 onward will produce direct id-to-id moves.

### Pitfall 5: `check-tokens.mjs`'s manifest is a closed list in both directions

**What goes wrong:** declaring `--dur-press` and `--tint-warn-head` in
`tokens.capture.css` without adding them to `D13_MANIFEST` fails the build
(*"declares X, which is not in the D-13 manifest"*); adding them to the manifest without
declaring them fails it the other way (*"is missing X"*). The two edits must land in the
same commit.

**Why it happens:** the check is deliberately bidirectional so the token layer cannot
drift from its own specification.

**Evidence:** `check-tokens.mjs` read in full; the manifest holds exactly 40 names and
`tokens.capture.css` declares exactly those 40 today. `grep -- "--dur"` across
`app/styles/` and `app/globals.css` returns nothing, confirming the UI-SPEC's scout.

**Also:** the same check forbids redeclaring any name that exists in
`tokens.inherited.css` (only `--viewer-ink-dim` may shadow). `--ease-out-expo`,
`--ease-out-quart`, `--radius-card`, `--radius-panel`, `--radius-full` and `--radius-chip`
all exist there (lines 50–51 and 61–66, verified) and must be **consumed, never
redeclared**. And `tokens.inherited.css` is byte-pinned by SHA-256 — editing it fails the
build by design.

### Pitfall 6: `check-governed.mjs`'s closed-set sweep will reject the FR-48a disposition sentence as written

**What goes wrong:** the UI-SPEC says the disposition sentence takes *"the same shape"* as
`PLATFORM_413` — "its own named export beside `PLATFORM_413`." `PLATFORM_413` is typed
`GovernedSentence`, i.e. a `{before, strong, after}` triple. Adding a **third** such
literal fails the build.

**Why it happens:** `check-governed.mjs`'s own header states the rule plainly — *"no other
object literal shaped like a GovernedSentence (before/strong/after) may exist anywhere
under app/, components/ or lib/ — exported or not, in this module or another, frozen,
re-exported or nested — other than PLATFORM_413. A ninth sentence, wherever it is added,
fails the build."* The script emits:
`"lib/copy/governed.ts exports <name>, an additional GovernedSentence-shaped binding — only PLATFORM_413 may hold before/strong/after outside GOVERNED (D-09)"`.

**How to avoid — the recommendation:** export the disposition sentence as a **plain
string**, not a triple. EXPERIENCE.md quotes it with no bold clause (*"The work-order
identity, the accept/reject gate and the offline queue are real and enforced server-side;
the verification and the observations are authored."*), so the triple buys nothing. A
plain `export const FR48A_DISPOSITION = "…"` is outside the shape the sweep matches,
stays inside the duplicate-literal sweep and the claims-audit roots, and needs **no edit
to `check-governed.mjs`**.

If a triple is wanted anyway, `check-governed.mjs`'s allowlist must be widened from
`PLATFORM_413` to two names **in the same commit**, and invariant D1's assertion (that the
new export is not a member of `GOVERNED`) written against it. That is strictly more work
for no gain.

### Pitfall 7: `useParams` does not participate in shallow routing — do not move `id` into a path segment

**What goes wrong:** a later tidy-up that turns `?s=order&id=wo-0142` into
`/order/wo-0142` breaks screen switching entirely, because `useParams` is not updated by
`pushState`/`replaceState`.

**Evidence:** open upstream issue `vercel/next.js#80528`, *"`useParams` is not updating
after window.history.pushState (shallow routing)"*, with a public reproduction. Only
`usePathname` and `useSearchParams` are documented to synchronise with the native history
API `[CITED: nextjs.org/docs/app/getting-started/linking-and-navigating §Native History API]`.

**How to avoid:** keep both `s` and `id` as query keys. D-01 already requires this for
validation reasons; record the navigation reason beside it so the decision does not look
like taste.

### Pitfall 8: Anything that makes `/` dynamic breaks a shipped build rule

**What goes wrong:** reading `cookies()` at page level (outside a Suspense boundary), or
otherwise forcing the route dynamic, changes `/`'s route-table glyph from `◐` to `ƒ` and
`check-structure.mjs --build-output` fails with *"route "/" is marked dynamic (glyph "ƒ")
… D-11's static claim does not hold."*

**Verified nuance the planner can use:** a Server Component that calls `await cookies()`
**inside** a `<Suspense>` boundary keeps the route at `◐` and answers **per request** —
tested directly: `absent` with no cookie, `present` with a minted `cap_session`, `absent`
again, on the same running server. So the session state *can* legitimately be resolved
server-side in the dynamic hole if a later phase wants the first paint to know it. Phase 4
does not need this (see §Open Questions 1), but it is a proven option rather than an
assumption.

### Pitfall 9: Two shipped files hard-code the Phase 1 shell that this phase retires

**What goes wrong:** `/` stops rendering `<h1>NOVATEK Capture</h1>` and two existing
checks break.

**Verified, with line numbers:**

- `scripts/check-wcag.mjs:303–304` — `scanSurface(page, "/", "/")` and
  `scanSurface(page, "/?s=limits", "/?s=limits")`. The list must be re-pointed and
  extended to the UI-SPEC's five surfaces.
- `scripts/check-deployment.test.mjs` — `PASSING_BODY` contains
  `<main><h1 id="screen-title">NOVATEK Capture</h1></main>` as a fixture string.

Both were named by the UI-SPEC and both are confirmed present at those locations.

### Pitfall 10: Both clock routes require a parseable JSON body carrying a `client_id`

**What goes wrong:** `fetch("/api/orders/wo-0142/open", { method: "POST" })` with no body
returns `400 bad_request`, not a clock. The control appears to do nothing and the refusal
renders for the wrong reason.

**Why it happens:** both handlers call `await request.json()` and return `fail("bad_request")`
on a parse failure, then `pick(raw, ACCEPTED_BODY_FIELDS.orders_open)` — which is exactly
`["client_id"]` — and `applyItem`'s shape step re-checks the UUID before trusting it.
Read in full this session.

**How to avoid:** every clock action sends `{ client_id: crypto.randomUUID() }` with
`content-type: application/json`. A **new** UUID per tap: reusing one makes the second tap
a `duplicate` rather than the idempotent `200 { clock }` FR-7 describes, and the
UI-SPEC's "the control stays tappable" contract depends on the latter.

**Note the ordering the server already guarantees:** ownership is checked *before* the
body is parsed, so a malformed body against an order the account does not hold still
returns the byte-identical not-found. The client cannot break AD-4 by sending a bad body.

### Pitfall 11: Seeding the projection (or the FR-48a flag) from storage during render is a hydration mismatch

**What goes wrong:** React logs a hydration error and may discard the server-rendered
markup for the subtree.

**Why it happens:** the dynamic hole is server-rendered — measured directly, the client
component's markup reached the first HTML response with `projSize=0` because module scope
on the server is empty and effects do not run during SSR. Reading `localStorage` or a
pre-populated cache **during render** on the client would produce different markup on the
two sides.

**Why the plain projection is nonetheless safe:** on a genuinely fresh document the
module-scope `Map` is empty on **both** sides, so reading it during render matches. The
probe recorded **zero console errors** across every transition with exactly this pattern.
The hazard is only introduced by seeding from a persistent store.

**How to avoid:** read `localStorage`/`sessionStorage` in an effect only, and let the
pre-resolution render be a deliberate, stated state (for FR-48a: the long form —
Pattern 6).

### Pitfall 12: `crypto.randomUUID()` is a secure-context API

`window.crypto.randomUUID` is undefined on a plain-`http` origin other than `localhost`.
Vercel Preview and Production are `https` and `next start` on `127.0.0.1` is a secure
context, so this does not bite in CI or in the shipped preview — but it does bite anyone
opening the dev server over a LAN IP on a real phone, which is exactly how this project
gets tested on a handset. Worth a one-line comment at the call site rather than a
mysterious failure during on-device testing.

### Pitfall 13: `element.focus()` scrolls, so scroll position is not restored on back

Measured: a transition made from `scrollY = 900` landed at `scrollY = 0`, and the focus
effect observed `scrollY = 0` when it ran. This is the wanted behaviour going forward — a
new screen starts at its heading — but it means back does not return the artisan to where
they were on a long screen (order detail scrolls ~450 px at 100%).

EXPERIENCE.md states a focus rule and no scroll-restoration rule, and the focus rule is
the one CI can fail on, so the focus rule wins. `focus({ preventScroll: true })` would
preserve scroll and is the wrong trade here — it would leave the heading focused but off
screen, announced to a screen-reader user and invisible to a sighted one. Record the
choice; do not let a later phase reverse it by accident.

### Pitfall 14: `'vibrate' in navigator` is **true** in this project's CI browser

A CI assertion of the form "haptics are feature-detected" cannot be written as "the API is
absent, so nothing fires." Verified: headless Chromium under `scripts/lib/harness.mjs`'s
pinned mobile profile reports `"vibrate" in navigator === true`. NFR-4a must therefore be
asserted **in source** — that `navigator.vibrate` appears in exactly one module, behind a
feature test (UI-SPEC Primitive 2's own wording) — which is a `tsx`-scope string sweep in
`check-primitives.mjs`, not a browser assertion.

## Code Examples

### 1. The shapes that pass — projection read, focus move, tick, re-anchor

Written and verified this session against this repository: `npx eslint <file>` exit 0 and
`npx tsc --noEmit` exit 0. Every rejected shape from Pitfall 3 has been replaced. This is
a **shape**, not a deliverable — module names, types and copy are the plan's.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Anchor = { elapsedS: number; readAtMs: number };

/* Module scope: survives every client-side screen switch, resets only
   on a full document load (verified). Empty during SSR and empty on a
   fresh client document, so reading it during render hydrates
   cleanly (Pitfall 11). */
const PROJECTION = new Map<string, Anchor>();
let INSTANCE: string | null = null;

function purge() {
  PROJECTION.clear();
}

export function Clock() {
  const sp = useSearchParams();
  const s = sp.get("s") ?? "none";
  const id = sp.get("id") ?? "";
  const screenKey = `${s}|${id}`;

  /* Reading a module-scope Map during render: lint-clean. */
  const cached = PROJECTION.get(screenKey) ?? null;

  /* The anchor is STATE, not a ref — react-hooks/refs forbids reading
     ref.current during render (Pitfall 3). */
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  /* Focus-to-heading: keyed on the FULL screen key (Pitfall 4), and
     containing no setState (react-hooks/set-state-in-effect). */
  useEffect(() => {
    document.getElementById("screen-title")?.focus();
  }, [screenKey]);

  /* The tick: setState in the interval CALLBACK, never in the effect
     body. Lint-clean; the rule's own permitted shape. */
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  /* The read + the instance-keyed purge. setState lives in an await
     continuation, which the rule permits. The instance is compared
     BEFORE the body is stored. */
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/hours", { signal: controller.signal });
        const instance = res.headers.get("x-cap-instance");
        if (INSTANCE !== null && INSTANCE !== instance) purge();
        INSTANCE = instance;
        const body: { clocks: { order_id: string; elapsed_s: number }[] } =
          await res.json();
        const clock = body.clocks.find((c) => c.order_id === id);
        const next: Anchor = {
          elapsedS: clock?.elapsed_s ?? 0,
          readAtMs: Date.now(),
        };
        PROJECTION.set(screenKey, next);
        setAnchor(next);
      } catch {
        /* aborted or no answer — Phase 6 owns the sentence (UI-SPEC
           §Empty and error states: a transport failure with no error
           envelope is a deliberate, recorded gap in Phase 4) */
      }
    })();
    return () => controller.abort();
  }, [screenKey, id]);

  const live = anchor ?? cached;
  const elapsed = live
    ? live.elapsedS + Math.max(0, Math.floor((nowMs - live.readAtMs) / 1000))
    : null;

  return (
    <p id="clock" role="timer">
      {elapsed === null ? "" : String(elapsed)}
    </p>
  );
}
```

> **One deliberate simplification above, for the planner to close.** The example measures
> the delta with `Date.now()` because it was written to test the lint rules. Pattern 5's
> recommendation is `performance.now()` for the delta — monotonic, and immune to a device
> clock correction mid-segment. The shape is identical: store
> `readAtMono: performance.now()` beside `elapsedS`, seed `nowMono` from
> `performance.now()`, and subtract those. Both APIs verified present.

### 2. The one parse point and the switcher

```tsx
// components/shell/Screen.tsx  — "use client"
// D-01: `s` names the screen, `id` carries the argument, and both are
// validated here and nowhere else. `id` is a fetch path segment; it is
// never rendered as text and never placed in a header.

const SURFACES = ["orders", "order", "time", "limits"] as const;
type Surface = (typeof SURFACES)[number];

function parseSurface(raw: string | null): Surface | null {
  return SURFACES.includes(raw as Surface) ? (raw as Surface) : null;
}

// ORDER_ID_RE is a shape guard, not an existence check — the server
// decides existence and ownership, byte-identically (AD-4).
const ORDER_ID_RE = /^wo-[0-9]{4}$/;

function parseId(raw: string | null): string | null {
  return raw !== null && ORDER_ID_RE.test(raw) ? raw : null;
}
```

```ts
// lib/client/navigate.ts
// SC-5 / invariant A12: no next/link, no useRouter, no router.push.

export function goTo(s: string, id?: string): void {
  const q = new URLSearchParams({ s, ...(id ? { id } : {}) });
  window.history.pushState(null, "", `/?${q}`);
}

/** The gate's entry, and D-02's correction: replace, never push, so the
    gate is never reachable backwards (EXPERIENCE.md §Navigation contract)
    and a refused deep link leaves no entry behind it. Verified: a
    replaceState leaves no back entry, and a replaceState to an identical
    URL is a genuine no-op — no re-render, no effect. */
export function replaceWith(s: string, id?: string): void {
  const q = new URLSearchParams({ s, ...(id ? { id } : {}) });
  window.history.replaceState(null, "", `/?${q}`);
}
```

### 3. The single write door into the projection

```ts
// lib/client/projection.ts
// D-04: the instance is compared FIRST. Purging after the store would
// discard the very datum that proved the instance changed.
// X-CAP-Instance is a universal header on every response, 404s
// included (lib/http/contract.ts HEADER_TABLE), and is readable from
// fetch same-origin (verified).

let instance: string | null = null;

export function noteResponse(res: Response): void {
  const seen = res.headers.get("x-cap-instance");
  if (seen === null) return;            // cannot happen against this seam
  if (instance !== null && instance !== seen) purge();
  instance = seen;
}

/** The ONE purge. Called by noteResponse on an instance change, and by
    the gate on persona choice. Every Map and every cell in this module
    is cleared here; nothing else in the module resets state, so there
    is no partial reset that can drift from this one. */
export function purge(): void {
  orders.clear();
  clocks.clear();
  details.clear();
  account = null;
  // `instance` is deliberately NOT cleared: noteResponse sets it to the
  // new value immediately after, and clearing it would make the next
  // response look like a first contact rather than a change.
}
```

### 4. The primitives sweep, in the established shape

```javascript
// scripts/check-primitives.mjs
// Shape copied from scripts/check-governed.mjs (walk, problems[],
// "Problems: n", process.exit(1)) — matching the existing sweeps
// matters more than a better structure (D-07).

const ROOTS = ["app", "components"];
const problems = [];

const isCssModule = (f) => f.endsWith(".module.css");
const isCssAll = (f) => isCssModule(f) || f === "app/globals.css";
const isTsx = (f) => f.endsWith(".ts") || f.endsWith(".tsx");

// A5 — the single most valuable assertion in the UI-SPEC. Matches
// `position: fixed` specifically: `position: absolute` is legitimate
// and present today in Ribbon.module.css (.link::after) and in
// globals.css (.sr-only), so a sweep for `position:` would fail on
// correct code.
for (const file of files.filter((f) => isCssAll(f) || isTsx(f))) {
  if (/position\s*:\s*fixed/.test(read(file))) {
    problems.push(`${file} declares position: fixed — Phase 4 has no fixed element; the referral bar is Phase 9 (UI-SPEC Decision 6)`);
  }
}
```

### 5. The CI assertion for C6 (focus on every transition)

The existing `check-wcag.mjs` harness already gives everything this needs; the assertion
below is the exact shape proved this session across eight transitions.

```javascript
const activeId = () => page.evaluate(() => document.activeElement?.id ?? "(none)");

async function assertFocusMoves(page, label, act) {
  // park focus somewhere else first, or the assertion passes vacuously
  await page.evaluate(() => document.querySelector("button")?.focus());
  await act();
  await page.waitForTimeout(150);
  const id = await activeId();
  if (id !== "screen-title") {
    problems.push(`${label}: focus is on "${id}" after the transition, not the new screen's <h1>`);
  }
}

// The six the UI-SPEC's C6 enumerates, plus the one it does not and must:
//   gate → order list (replace) · list → detail (push) · detail → time (push)
//   header back ×2 · history.back() · the disclosure reopen
//   + order(A) → order(B): the id-only transition Pitfall 4 is about
```

## State of the Art

| Old approach (and where this project's own documents still carry it) | Current approach, verified on 16.3.4 + `cacheComponents: true` | Impact |
|---|---|---|
| Widen `app/page.tsx`'s async Server Component branch on `s` (D-01's literal reading; the file's own comment) | The branch moves into a Client Component behind the same `<Suspense>`; the page file's shape is unchanged | The one real structural change this phase makes. D-01's *rule* is honoured exactly; only the component kind changes |
| `useSearchParams` "will cause the Client Component tree up to the closest `Suspense` boundary to be **client-side rendered**" (the published reference) | Under Cache Components the dynamic hole is **server-rendered and streamed**; the resolved client markup with the correct `s` is in the first HTML response | No fallback flash on a deep link. Planning does not need to design around one |
| `<Link>` / `router.push` for in-app navigation | Native `window.history.pushState` / `replaceState`, officially supported and documented to synchronise with `usePathname` and `useSearchParams` | SC-5's prohibition is the supported path, not a workaround |
| `useParams` for a route argument | Not updated by shallow routing (`vercel/next.js#80528`, open) | `id` stays a query key. Never a path segment |
| A ref for non-render state read during render | `react-hooks/refs` (React Compiler rules, `eslint-plugin-react-hooks@7.1.1`) makes it a build error | The clock anchor is `useState`. This is newer than most React guidance a planner will recall |
| `setState` inside an effect body to synchronise derived state | `react-hooks/set-state-in-effect` makes it a build error; the rule's own message points at *"You Might Not Need an Effect"* | Re-anchoring happens in an `await` continuation or an interval callback |

**Deprecated/outdated for this repository:** `runtime` / `dynamic` / `revalidate` /
`fetchCache` route-segment-config exports (Phase 3 Pitfall 1, still binding); and now also
`export const instant = false`, which the `CLIENT_HOOK_DYNAMIC` error suggests but which
would break `/`'s static claim and did not build here in any case.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Android's hardware/gesture back and iOS Safari's edge swipe pop the same history entry as `history.back()`, so EXPERIENCE.md's *"there is no screen where they disagree"* holds without any code | Pattern 3, §Validation Architecture C6 | Only `history.back()` was driven, through Playwright, on desktop headless Chromium. Both platform gestures are the browser's own `popstate` and this project adds no interceptor, so disagreement would require a browser bug — but it is **reasoned, not measured**. Falsifiable in two minutes on a real handset against the Preview URL; recommend it as a human-verification line in this phase's plan, in the shape Phase 3 used for the curl suite |
| A2 | Real background-tab timer throttling behaves as Chrome documents (1/s hidden, 1/min under intensive throttling), and the interpolated clock therefore snaps to the correct figure on return | Pattern 5 | **Not reproducible in this harness.** CDP `Page.setWebLifecycleState: "frozen"` did not throttle the interval (5 ticks in 5.2 s) and `visibilitychange` never fired in headless Chromium. The design is correct *by construction* — it recomputes rather than accumulates, so it cannot drift whatever the tick rate — which is precisely why the interpolation choice was made rather than tested. A real-device check (background the app 6+ minutes mid-segment, return, compare against `GET /api/hours`) would close it |
| A3 | `navigator.vibrate` behaves on a real Android handset as the feature test implies, and iOS Safari genuinely lacks it | Pattern 5 / §Phase Requirements NFR-4a | Headless Chromium reports `"vibrate" in navigator === true` (measured), so CI proves only that the call site is feature-tested, not that a phone buzzes. NFR-4a's own text already says the visible change carries NFR-4 alone on iOS, so the risk is confined to Android, where a silent no-op is a missing *second* channel, never a missing confirmation |
| A4 | `export const instant = false` is genuinely unusable on 16.3.4 rather than having been mis-specified in my probe | Pitfall 2 | The probe produced a bare `Error occurred prerendering page "/probe2"` with no detail, so the failure may have been my syntax rather than the feature. It does not matter for planning — the export is independently forbidden because it would break `check-structure --build-output`'s glyph assertion on `/` — but the claim "it does not work" is weaker than the claim "it must not be used" |
| A5 | Vercel's platform serves the `◐` PPR resume for `/` the same way `next start` does locally, so the first-paint behaviour measured here holds on the deployed preview | Pattern 1 | Everything in this document was measured against local `next start`. Phase 3's Assumptions Log A2 carries the same shape of gap for response headers and its designed falsification point is the human-run curl suite against a real Preview. The same run can check this one: fetch `/?s=time&id=wo-0142` with `curl` and confirm the resolved markup is in the body |
| A6 | The eight-transition focus proof generalises to a real screen reader moving focus, i.e. VoiceOver/TalkBack actually announce the heading when `document.activeElement` becomes it | Pattern 4 | `document.activeElement` is what CI can assert and is the mechanism EXPERIENCE.md names, but an assistive-technology announcement is a separate observable. No automated tool checks it (the same class of gap the UI-SPEC records for SC 2.2.2). A real-device VoiceOver pass belongs on the same human-verification line as A1 |

## Open Questions (RESOLVED — all three discharged by named plan tasks, 2026-09-24)

1. **What the gate shows in the instant before `GET /api/session` answers**
   - **RESOLVED — 04-11 Task 2.** The recommendation was taken: the switcher renders no `<main>`
     until `GET /api/session` has answered, with the ribbon carrying the document in the meantime.
     No `cookies()` read at page level, so no second reader of the credential enters the
     non-bypassability enumeration and no expired or forged session sees an order-list skeleton.
   - *What we know:* the body cannot know whether a session exists at first paint, because
     the authoritative answer is `GET /api/session` and the client must issue it. The
     ribbon is already on screen (it is in the layout and statically prerendered), so
     "nothing yet" means the ribbon alone — which is exactly UJ-1 step 1's own description:
     *"The page loads. The ribbon renders before anything else."*
   - *What is proven and available:* a Server Component reading `await cookies()` **inside**
     the `<Suspense>` boundary keeps `/` at `◐` and answers per request (verified:
     `absent` → `present` → `absent` against a live server). So a server-decided first
     paint is technically available.
   - *Why I do not recommend it:* it would put a session read outside the six enumerated
     route handlers, which is a new reader of the credential that
     `docs/analysis/single-writer-non-bypassability.md` would have to enumerate and
     `check-non-bypassability.mjs` would have to be satisfied about; and deciding from
     *cookie presence* alone (without validating the HMAC) would show the order-list
     skeleton to a reader whose session is expired or forged — a false claim in the one
     window FR-48a is about.
   - *Recommendation:* render the body only once `GET /api/session` has answered, with the
     ribbon carrying the screen in the meantime. Take this to the planner as a stated
     decision rather than an emergent one, since it is visible on every cold load.

2. **Whether the D-07 sweep should also assert "no cached server state outside the
   projection," and how**
   - **RESOLVED — 04-06 Task 2, invariant A16.** Yes, in the recommended split form: the storage
     half is asserted as absence of `localStorage`, `sessionStorage` and `indexedDB` from `app/`
     and `components/` (the sweep's two roots, so presence under `lib/client/` is not the
     assertable side); the mutable-module-state half matches a top-level `let`, `new Map(` or
     `new Set(` in `*.tsx` under those roots. The false-positive limitation is carried in the
     script's own header in the claims-audit's voice, naming `lib/client/projection.ts` and
     `lib/client/disclosure.ts` as the modules the rule pushes that state into.
   - *What we know:* SC-5 states it, and a claim with no check is the failure mode D-07
     was written to prevent. A source sweep can get most of the way: no top-level `Map`,
     `Set`, `let` or mutable object in `components/**/*.tsx`; `localStorage`,
     `sessionStorage` and `indexedDB` only under `lib/client/`.
   - *What's unclear:* whether that phrasing produces false positives on legitimate
     top-level constants (a frozen lookup table, a `const SURFACES = [...] as const`). It
     would need to distinguish mutable from frozen, which a string sweep does badly.
   - *Recommendation:* implement the storage half (unambiguous, high value) in this phase,
     and write the mutable-module-state half as a `let`-and-`new Map(`-only sweep with an
     explicit file allowlist naming `lib/client/projection.ts`. Record the limitation in
     the script's header in the claims-audit's own voice, as every other sweep in this
     repository does.

3. **Whether `already_open`'s edit to `lib/data/types.ts` can proceed at all**
   - **RESOLVED into a decision the developer owns — 04-02 Task 1.** The recommendation was taken
     on both halves: the edit is scoped to exactly three changes with an instruction to stop and
     surface any hunk the executor did not write, and the blocker itself is a **blocking
     `checkpoint:decision`** placed before that task rather than worked around. The plan states the
     consequence of deferring — `CONFLICT_COPY` is typed `Record<ConflictCode, RefusalCopy>` and
     would not type-check without the union member, so the phase stops. Still open at plan time;
     the answer is the developer's.
   - *What we know:* D-05 and UI-SPEC invariant D3 require `already_open` in
     `ConflictCode`, `CONFLICT_CODES` and `CONFLICT_COPY`. The first two live in
     `lib/data/types.ts` (verified: the union at lines 374–383, the array at 385–395), and
     **that file carries the uncommitted third-party modifications tracked as a
     `[SECURITY]` blocker in STATE.md** — unresolved since 2026-09-17, explicitly named in
     03-VERIFICATION.md's Open Items as needing a decision *"before Phase 4 begins."*
   - *What's unclear:* nothing technical. This is a human decision about the blocker.
   - *Recommendation:* the planner scopes the edit to exactly three changes (add the
     member to the union, add it to the array, update the note that records only
     `already_open` remained) and instructs the executor to stage, edit, revert and
     reformat nothing else in the file — the discipline 03-05 onward already used. But
     the blocker itself should be surfaced to the developer before the phase executes, not
     worked around silently. See §Security Domain.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v24.19.0 (matches `engines.node: "24"`) | — |
| npm | resolution, `npx` | ✓ | 11.17.0 | — |
| Next.js | the app | ✓ | 16.3.4 | — |
| Playwright + Chromium | invariant section C | ✓ | 1.62.1; browser launches and drives this repo's production build (exercised repeatedly this session) | — |
| `@axe-core/playwright` / `axe-core` | C7 | ✓ | 4.13.0 | — |
| git | `CAPTURE_BUILD_ID` resolution | ✓ | 2.50.1.windows.1 | — |
| `localStorage` / `sessionStorage` | FR-48a | ✓ | both writable and readable in the pinned mobile profile | — |
| `navigator.vibrate` | NFR-4a | ✓ present in CI — see Assumptions Log A3 | — | iOS: the visible change alone, per NFR-4a |
| `crypto.randomUUID` | the clock routes' `client_id` | ✓ (secure contexts) | — | none needed on `https`/`localhost`; see Pitfall 12 |
| A real Android handset and a real iOS handset | Assumptions Log A1, A2, A3, A6 | ✗ not reachable from this session | — | Human verification against the Preview URL, in the shape Phase 3 used for the curl suite |
| A live Vercel Preview deployment | Assumptions Log A5 | ✗ not reachable from this session | — | The same human run |

**Missing with no fallback:** none that block implementation. The four device-only
assumptions block *full* verification of NFR-4a and of the navigation contract's
"they never disagree" clause, not the writing or local testing of the code.

## Validation Architecture

### Test framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in runner (`node:test` + `node:assert/strict`) for source-side proofs; Playwright 1.62.1 via `scripts/lib/harness.mjs` for browser proofs. No new framework, no config file |
| Config file | none — `node --test <glob>`; `scripts/verify.mjs`'s `STEPS` is the one gate |
| Quick run (per task) | `npx eslint <file>` then `node --test lib/client/<module>.test.mjs` — seconds, no build, no browser. **`eslint` first**: it is verify.mjs's third step and Pitfall 3's rules fail there before anything slower runs |
| Full suite | `node scripts/verify.mjs` |

### Where each new proof lives

| Layer | Home | Already wired? |
|---|---|---|
| Projection and navigation unit proofs | `lib/client/*.test.mjs` | **Yes** — `verify.mjs`'s `unit-suite` STEP already runs `node --test "lib/**/*.test.mjs"`, and `package.json`'s `test` script covers the same glob. No `verify.mjs` change |
| Invariant section A | new `scripts/check-primitives.mjs` + `scripts/check-primitives.test.mjs` | No — **one new STEPS entry**, placed with the other source-side sweeps (after `check-non-bypassability`, before `next-build`), carrying **no** `vercelExcluded` so it runs on Vercel's build as well as in the GitHub job |
| Invariant B1 | `scripts/check-contrast.pairs.json` + the existing `check-contrast.mjs` | Yes — data-only change |
| Invariant B2 | **already enforced** by `check-tokens.mjs` | Yes — add nothing (see Pattern 7) |
| Invariants C1–C8 | `scripts/check-wcag.mjs` | Partly — see the gap below |
| Invariant D1, D2 | `check-governed.mjs` (or nothing, if the plain-string recommendation is taken) and `claims-audit.mjs` unchanged | Yes |
| Invariant D3 | `check-primitives.mjs`, as a text read of `types.ts` and `conflicts.ts` | With the new STEPS entry |

### The one real new capability the browser harness needs

`check-wcag.mjs` today scans two surfaces (`scanSurface(page, "/", "/")` and
`scanSurface(page, "/?s=limits", …)`, lines 303–304) and **has no cookie handling at
all**. Invariant C7 names five surfaces, three of which (`/?s=orders`,
`/?s=order&id=wo-0142`, `/?s=time&id=wo-0142`) require a session established by
`POST /api/session` first. The harness therefore needs a session-establishing step —
either a `page.request.post("/api/session", …)` before navigating (the Playwright context
shares its cookie jar with the page, which is the cheapest correct route) or an explicit
`context.addCookies` from a `Set-Cookie` captured over `fetch`. This is the phase's
largest test-infrastructure task and it should be a Wave 0 item, because C1, C3, C6 and
C8 all need the same authenticated surfaces.

### Phase requirements → test map

| Req ID | Behaviour | Test type | Automated command | Exists? |
|--------|-----------|-----------|-------------------|---------|
| REQ-FR-48a | First entry shows the long form before any claim is met; re-entry shows `preview` + a control that reopens it | browser (two visits, storage cleared between) | `node scripts/check-wcag.mjs` (extended) | ❌ Wave 0 |
| REQ-FR-48a | The disposition sentence is defined once and is not a member of `GOVERNED` | build rule | `node scripts/check-primitives.mjs` + `node scripts/check-governed.mjs` | ❌ Wave 0 (the first) |
| REQ-FR-58 | Every segment renders with its source, and the device pairs render only where the record carries them | unit (the mapping, against fixture `OrderClock`s) + browser | `node --test lib/client/projection.test.mjs`; extended WCAG scan | ❌ Wave 0 |
| REQ-FR-58 | The stated limitation renders above the segment list | browser | extended WCAG scan | ❌ Wave 0 |
| REQ-NFR-2 | Every interactive element ≥ 44 × 44 at 360 px and 320 px, 100 % and 200 % (C1) | browser | extended WCAG scan | ❌ Wave 0 |
| REQ-NFR-2 | `44px` / `var(--target-min)` declared in only three modules (A2) | build rule | `node scripts/check-primitives.mjs` | ❌ Wave 0 |
| REQ-NFR-4 | The clock control measures exactly 130 × 130 in rest and pressed at both viewports and text scales (C2) | browser | extended WCAG scan | ❌ Wave 0 |
| REQ-NFR-4 | `--dur-press` is declared, is in `D13_MANIFEST`, and is the only `transition` declaration (A8) | build rule | `node scripts/check-tokens.mjs`; `check-primitives.mjs` | ❌ Wave 0 (the second) |
| REQ-NFR-4 | Repeated taps are idempotent (open twice → one segment; close a closed order → a stated conflict) | route-level | already proven by `scripts/server/route-suite.proof.mjs` (Phase 3) | ✅ exists |
| REQ-NFR-4a | `navigator.vibrate` appears in exactly one module, behind a feature test | build rule (**not** browser — Pitfall 14) | `node scripts/check-primitives.mjs` | ❌ Wave 0 |
| REQ-NFR-6 | Every pair Phase 4 renders is in the manifest and clears its floor, or matches an exemption on ink AND ground AND ratio (B1) | build rule | `node scripts/check-contrast.mjs` | ✅ script exists, ❌ 16 rows to add |
| REQ-NFR-6 | The exemption register still holds exactly four entries (B2) | build rule | `node scripts/check-tokens.mjs` | ✅ **already enforced** |
| REQ-NFR-6 | No state by hue alone: every state carries a shape from the closed set of seven and a word | build rule (A4: seven shapes in one module, set closed) + inspection | `node scripts/check-primitives.mjs` | ❌ Wave 0 |
| SC-5 | No `next/link`, no `useRouter`, no `router.push` (A12) | build rule | `node scripts/check-primitives.mjs` | ❌ Wave 0 |
| SC-5 | `position: fixed` and `position: sticky` appear zero times (A5, A6) | build rule | `node scripts/check-primitives.mjs` | ❌ Wave 0 |
| SC-5 | Focus is on the new screen's `<h1>` after **every** transition, including an `id`-only one (C6) | browser | extended WCAG scan | ❌ Wave 0 |
| SC-5 | `/` is still statically prerendered after the switcher becomes a Client Component | build rule | `node scripts/check-structure.mjs --build-output scripts/.check/build.log` | ✅ exists — **verified this session that the shape keeps the `◐` glyph** |
| SC-1 | `X-CAP-Account` on the orders response matches the chosen persona | route-level | already proven by the Phase 3 route suite; re-assertable in the browser scan from `page.request` | ✅ exists |
| D-05 | `already_open` present in `ConflictCode`, `CONFLICT_CODES`, `CONFLICT_COPY`, non-empty sentence, exactly one action (D3) | build rule | `node scripts/check-primitives.mjs` | ❌ Wave 0 |

### Sampling rate

- **Per task commit:** `npx eslint <changed files>` then `node --test lib/client/*.test.mjs`
  — both sub-second, and `eslint` is where Pitfall 3 bites.
- **Per wave merge:** `node scripts/verify.mjs` — the whole gate. Never two at once: they
  race on `.next`.
- **Phase gate:** full suite green, then the device pass that closes Assumptions Log A1,
  A2, A3 and A6 on a real Android and a real iOS handset against the Preview URL,
  recorded in `docs/analysis/` with the build id — the shape Phase 3 used for the curl
  suite.

### Wave 0 gaps

- [ ] `scripts/check-primitives.mjs` + `scripts/check-primitives.test.mjs` (a fixture that
      trips each assertion and asserts a non-zero exit, per D-23) — carries A1–A14 and D3
- [ ] One new `STEPS` entry in `scripts/verify.mjs`; check it against
      `scripts/verify.test.mjs`'s `resolveSteps`/`runSteps` accounting, which asserts the
      step list
- [ ] Session establishment in `scripts/check-wcag.mjs` — **the largest test task in the
      phase**; C1, C3, C6, C7 and C8 all depend on it
- [ ] `scripts/check-wcag.mjs` surface list re-pointed from two surfaces to five
- [ ] C6's transition matrix, including the `order(A) → order(B)` case the UI-SPEC's C6
      does not enumerate but Pitfall 4 proves is the one that breaks
- [ ] `scripts/check-deployment.test.mjs`'s `PASSING_BODY` fixture string
- [ ] `scripts/check-contrast.pairs.json` — the UI-SPEC's 16 rows
- [ ] `scripts/check-tokens.mjs`'s `D13_MANIFEST` — `--dur-press`, `--tint-warn-head`, in
      the same commit that declares them
- [ ] `lib/client/projection.test.mjs` and `lib/client/navigate.test.mjs` — no framework
      install needed; the glob already runs them
- [ ] Framework install: **none**

## Security Domain

### Applicable ASVS categories (Level 1)

| Category | Applies | Control in this phase |
|---|---|---|
| V2 Authentication | No new surface | Persona choice posts to the frozen `POST /api/session`; the client adds no credential handling. The cookie is `HttpOnly` and unreadable from script (**verified**: `document.cookie` is empty immediately after a successful mint) |
| V3 Session Management | Yes, client half | The client never inspects, decodes or caches the credential. "Is there a session?" is `GET /api/session` and nothing else. `purge()` at the gate clears the previous account's cached records from the document |
| V4 Access Control | Yes, rendering half | The client re-decides nothing. D-02 is the rule: a refused deep link renders `conflicts.ts`'s own `order_not_found` sentence, never a composed one, so the copy cannot distinguish unowned from nonexistent any more than the wire can |
| V5 Input Validation | Yes | `s` against a four-member allowlist, `id` against a shape guard, at the one parse point (D-01). Neither is ever interpolated into markup, a URL or a header; `id` is a fetch path segment only |
| V6 Cryptography | No | The client generates a `client_id` with `crypto.randomUUID()`; that is an idempotency key, not a secret, and the server re-validates its shape |
| V7 Error Handling | Yes | The server's `detail` sentence renders as sent. Where no response arrives at all, Phase 4 authors no sentence — a deliberate, recorded gap closed by Phase 6 (UI-SPEC §Empty and error states) |

### Threat patterns this phase's client could introduce

| Pattern | STRIDE | Mitigation |
|---|---|---|
| Reflected XSS via a crafted `?id=` or `?s=` | Tampering | Neither is ever rendered as text. `s` is matched against a closed allowlist before it selects a component; `id` is validated and used only as a fetch path segment. React escapes by default, but the rule here is stronger: the value never reaches markup at all |
| A client-side existence oracle re-creating what AD-4 defeats on the wire | Information Disclosure | D-02, and the UI-SPEC's protection of it: one sentence from `conflicts.ts`, no branch on *why* the fetch failed, and `history.replaceState` to `?s=orders` so the URL does not assert a screen the app is not on |
| Cached records of a previous account surviving a persona switch | Information Disclosure | The single `purge()` at the gate, plus the instance-keyed purge. Making it *total* is the point of Pattern 2's third mechanism — a build rule asserting no cached server state lives outside the one module |
| A stale projection presenting a dead instance's records as current | Integrity | D-04. `X-CAP-Instance` is compared on **every** response before the body is stored, and it is a universal header present even on a 404 |
| A client-derived hour figure entering the record | Tampering | Structurally impossible: no route accepts a duration and `POST /api/hours` is 405 (Phase 3, proven). The displayed figure is arithmetic that is never sent anywhere |
| A ticking display quietly misstating a server fact after backgrounding | Integrity (of a claim, not of data) | Interpolation from a re-anchored server value rather than accumulation; and the authored disclosure line naming both actors and the mechanism, which is true under either implementation |
| Third-party working-tree modifications entering this phase's commits | Tampering | **Open.** `lib/data/types.ts` and `scripts/claims-audit.mjs` carry uncommitted, unexplained edits traced to a concurrent session in the sibling `../ipv-demo` repo (STATE.md, `[SECURITY]` + two follow-ups; 03-VERIFICATION.md Open Items). This phase **must** edit `types.ts` for `already_open`. See §Open Questions 3 |

## Sources

### Primary (HIGH confidence)

- **Empirical probes against this exact repository** (Next.js 16.3.4, React 19.2.8,
  `cacheComponents: true`), this session: five production builds; three Playwright drives
  of the production server covering initial load, `pushState` (`s` change, `id`-only
  change, no-query), `replaceState` (including a no-op repeat), `history.back()` ×3,
  `history.forward()`, `document.activeElement` after each, module-scope persistence
  across switches and across a full document load, scroll behaviour, 1 s interval
  accuracy over ~12 s, storage availability, `document.cookie` after a mint, and
  `X-CAP-Instance` readability from `fetch`; raw streamed HTML inspected for the PPR
  resume containers; two ESLint runs (one rejecting four shapes, one clean) and one
  `tsc --noEmit`. Every probe file created and **deleted**; `git status` confirmed
  identical to session start before and after. Logs retained under `scripts/.check/probe-*`
  (gitignored).
- **This repository's own source, read in full this session:** `app/page.tsx`,
  `app/layout.tsx`, `app/globals.css`, `app/styles/tokens.capture.css`,
  `app/styles/tokens.inherited.css` (relevant ranges), `components/shell/Ribbon.tsx` +
  `.module.css`, `components/limits/Limits.tsx`, `lib/copy/conflicts.ts`,
  `lib/copy/governed.ts`, `lib/data/artisans.ts`, `lib/data/register.ts` (header),
  `lib/data/types.ts` (read only — `ConflictCode`, `CONFLICT_CODES`, `OrderClock`),
  `lib/http/respond.ts`, `lib/http/contract.ts` (HEADER_TABLE),
  `lib/reconcile/validate.ts` (`ACCEPTED_BODY_FIELDS`), `app/api/session/route.ts`,
  `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`,
  `app/api/orders/[id]/open/route.ts`, `app/api/orders/[id]/close/route.ts`,
  `app/api/hours/route.ts`, `scripts/verify.mjs`, `scripts/check-tokens.mjs`,
  `scripts/check-structure.mjs`, `scripts/check-wcag.mjs`, `scripts/check-governed.mjs`
  (header + closed-set assertions), `scripts/check-register-isolation.mjs` (header +
  roots), `scripts/check-named-packages.mjs` (header + forbidden list),
  `scripts/check-non-bypassability.mjs` (header), `scripts/lib/harness.mjs`,
  `scripts/check-deployment.test.mjs` (fixture), `eslint.config.mjs`, `next.config.ts`,
  `tsconfig.json`, `package.json`.
- Context7 `/vercel/next.js/v16.2.9` — `01-app/01-getting-started/04-linking-and-navigating.mdx`
  §Native History API (`pushState`, `replaceState`, synchronisation with `usePathname`
  and `useSearchParams`) and `01-app/02-guides/single-page-applications.mdx` §Shallow
  routing.
- `[CITED: developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/timer_role]`
  — *"Elements with the role `timer` have an implicit `aria-live` value of `off`"*, plus
  the guidance not to set `aria-live` on a timer.
- `[CITED: w3.org/TR/wai-aria-1.2/#timer]` — the timer role definition and its live-region
  classification.
- `[CITED: developer.chrome.com/blog/timer-throttling-in-chrome-88]` — hidden-page timers
  checked once per second; intensive throttling to once per minute after 5 minutes hidden
  with chain count ≥ 5 and 30 s of silence; the exemption list.
- Phase inputs read in full: `04-CONTEXT.md`, `04-UI-SPEC.md` (all 899 lines),
  `.planning/REQUIREMENTS.md` (the six phase requirements and the traceability table),
  `.planning/STATE.md` (Blockers/Concerns, Deferred Items),
  `03-RESEARCH.md` (all 722 lines), `03-VERIFICATION.md` (frontmatter, Open Items, Gaps
  Summary, closure addendum), and `EXPERIENCE.md` §Information Architecture, §Navigation
  contract, §The Honesty Surface, §Voice and Tone, §Every conflict and reject code,
  §Online versus offline, §Interaction Primitives, §The write-acknowledgement contract,
  §Accessibility Floor, §Responsive & Platform, §UJ-1, §What this file settles.

### Secondary (MEDIUM confidence)

- `[CITED: nextjs.org/docs/app/api-reference/functions/use-search-params]` — *"a Client
  Component hook … not supported in Server Components to prevent stale values during
  partial rendering"* and *"the `useSearchParams` hook in a Client Component, which is
  re-rendered on the client with the latest `searchParams`."* Corroborates the empirical
  finding; its "client-side rendered during prerendering" sentence predates Cache
  Components and is contradicted by the measurement (recorded in Pattern 1).
- `vercel/next.js#80528` — `useParams` is not updated by `window.history.pushState`
  (open, with a public reproduction). Not reproduced here; the design avoids the API
  entirely, so the claim only has to be strong enough to justify keeping `id` in the
  query, which it is.
- `vercel/next.js#58256` — under Cache Components, client segments receive canonical
  rather than rewritten search params. Not applicable (no rewrites), noted so a later
  phase adding one knows.

### Tertiary (LOW confidence)

- None presented as fact. Every unverified item is in the Assumptions Log.

## Metadata

**Confidence breakdown:**

- **The navigation mechanism** (Server Component `searchParams` is frozen;
  `useSearchParams` updates on push/replace/pop; no-Suspense is a build error; the route
  stays `◐`; the first paint carries the right screen): **HIGH** — each reproduced
  directly, most of them several times, against this exact repository and version, and
  cross-confirmed by the official reference.
- **The projection shape** (module scope is the right lifetime; `lib/client/` is already
  wired; reading a module `Map` during render is lint-clean): **HIGH** — measured,
  including the negative case (a full document load resets it).
- **Focus keying** (the `s`-only effect misses an `id`-only transition): **HIGH** —
  measured side by side.
- **The ESLint rejections and the shapes that pass:** **HIGH** — both runs executed,
  exit 1 and exit 0 respectively, plus `tsc --noEmit`.
- **The clock's interpolation choice:** **HIGH** on the reasoning and the citation,
  **LOW** on the real-device behaviour that motivates it (Assumptions Log A2) — the
  design is deliberately correct-by-construction so that the untested half cannot make it
  wrong, only make it update less often.
- **FR-48a persistence:** **MEDIUM** — the mechanisms and their failure modes are
  verified, but "which failure mode is honest" is a judgment the planner or a discuss
  pass may want the developer to confirm, not a measured fact.
- **The build-rule shape:** **HIGH** — every claim about an existing check
  (`check-tokens`'s closed manifest and its four-entry exemption assertion,
  `check-governed`'s closed-set sweep, `check-register-isolation`'s roots,
  `check-wcag`'s surface list and its absence of cookie handling,
  `check-deployment.test.mjs`'s fixture) was read in the script's own source.

**Research date:** 2026-09-24
**Valid until:** 14 days for the Next.js / `cacheComponents` and `eslint-plugin-react-hooks`
findings (both fast-moving; re-verify after any `next` or `eslint-plugin-react-hooks`
upgrade — the React Compiler rule set in particular is still expanding); 30 days for the
repository-pattern findings, which change only when this repository's own source does.

