# Phase 4: Shell, gate, orders, clock (online) - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

An artisan enters as a persona, sees only their orders headed by a name they never
typed, opens one, and watches the clock tick — on the one client projection every later
screen will use.

**Delivers:** the gate (persona choice and FR-48a's disclosure); the order list; order
detail with the clock control; the time-on-order surface reading the accrued record in
full (FR-58); the one client projection module with a single purge at the gate; screens
switched by history state on the one route `/`; the five DESIGN.md primitives with the
build check that holds later screens to them; `already_open`'s conflict entry (AD-9).

**Not in this phase:** any camera, verify result, spoken note, proposals or decision
surface (P5); the client queue, connectivity probe, sync screen, offline states and the
rendering of `memoryStore` / `store_evicted` (P6); the desktop frame and its QR (FR-64,
P7); the walk payload screen, the Limits disposition table and the handover (P8); the
referral entry and its screens (P9). The server seam is complete and frozen — this phase
consumes it and changes no route.

</domain>

<decisions>
## Implementation Decisions

### URL and screen encoding (SC-5; FR-4, FR-5, FR-48a)

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

### The conflict table (AD-9 closure)

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

### The primitives (scheduled closure)

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents read these before planning or implementing.**

### Design and experience contracts

> Warning: both files live under `docs/planning-artifacts/`, which is **untracked in
> git**. Read them from the working tree, do not stage them, and do not assume a
> committed copy exists.

- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/EXPERIENCE.md`
  — Information Architecture (the fifteen surfaces, each with its FRs) and the
  Navigation contract (back in the header, the gate entered forwards only, back never
  discards, modal depth one); The Honesty Surface (where each of the eight sentences
  renders and what may never be done to it); State Patterns, including the full conflict
  table with sentences and actions; Interaction Primitives (the one pinned element, the
  in-place swap, the write-acknowledgement contract); Accessibility Floor (focus moves to
  the heading of the new screen on **every** transition, 200 % behaviour, state never by
  hue alone); and UJ-1, opening an order that is already yours.
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/DESIGN.md`
  — Components (ribbon, sticky action bar, panel, eyebrow, record control: the
  primitives D-06 builds); Colors (the four grounds and every stated ratio); Focus;
  Typography (the 13 px floor and the 200 % behaviour of the two control labels); Layout
  and Spacing (the arithmetic, three bands of reach, safe area).

### Phase inputs

- `.planning/ROADMAP.md`, Phase 4 — the goal, the five Success Criteria, and the
  scheduled closures this context discharges.
- `.planning/REQUIREMENTS.md` — REQ-FR-48a, REQ-FR-58, REQ-NFR-2, REQ-NFR-4,
  REQ-NFR-4a, REQ-NFR-6, with their verification methods.
- `.planning/phases/03-server-seam/03-CONTEXT.md`, The clock — D-06, which held
  `already_open` for this phase and settled the idempotent online open D-05 rests on.
- `.planning/phases/01-scaffold-conventions/01-UI-SPEC.md` — the approved P1 design
  contract for the ribbon, tokens and registers this phase extends.

### The server contract these screens consume (shipped and frozen)

- `app/api/session/route.ts`, `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`,
  `app/api/orders/[id]/open/route.ts`, `app/api/orders/[id]/close/route.ts`,
  `app/api/hours/route.ts` — the six routes this phase calls.
- `lib/http/respond.ts` — the one Response constructor and the universal header set,
  including the `X-CAP-Instance` value D-04 keys the projection on.
- `.planning/phases/03-server-seam/03-VERIFICATION.md` — what the seam proves versus
  what is authored, including the closure addendum statement of coverage.
- `docs/analysis/server-seam-verification.md` — the live curl-suite runs against real
  Preview deployments, including which build each one attested.

### Code this phase extends

- `app/page.tsx` — the static Server Component plus `<Suspense>` boundary and the
  existing `s` branch D-01 generalises.
- `components/shell/Ribbon.tsx` and `components/limits/Limits.tsx` — built in P1.
- `lib/copy/governed.ts` (the eight sentences, defined once) and
  `lib/copy/conflicts.ts` (the conflict sentences D-05 adds to).
- `app/styles/tokens.inherited.css`, `app/styles/tokens.capture.css`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `app/page.tsx` is already the exact shape SC-5 requires: a plain non-async Server
  Component so `/` prerenders statically, with only the `Screen` child reading
  `searchParams` behind `<Suspense>` (which needs `cacheComponents: true`, already set).
  D-01 widens its branch; the pattern does not change.
- `components/shell/Ribbon.tsx` and `Ribbon.module.css`: in document flow,
  non-dismissible, rendered by the layout above the page — so it is already on every
  screen this phase adds, with no per-screen work.
- `components/limits/Limits.tsx`: the `s=limits` surface, reachable already.
- `lib/copy/governed.ts`: the eight sentences as before/strong/after triples, with a
  build check forbidding duplicate literals. The FR-48a copy at the gate draws `preview`
  from here rather than restating it.
- `lib/copy/conflicts.ts`: 21 codes, each with a sentence and an actions list.
  `order_not_found` (D-02) is already present; `already_open` (D-05) is the one addition.

### Established Patterns

- Every enforced claim is enforced server-side and re-provable from a shell; the client
  renders the answer the server gave and never re-decides it. D-02 is that pattern
  applied to rendering.
- Build rules carry the invariants, not review: `check-governed`, the duplicate-literal
  check, `check-single-writer`, `check-actor-field`, `check-accepted-fields`. D-07 adds
  the primitives check in the same shape, and `npm run verify` remains the one gate.
- Narrowings and accepted costs are recorded where a later reader will hit them rather
  than quietly absorbed — the honesty gap in D-04 follows that practice.

### Integration Points

- `X-CAP-Instance` on every response (`lib/http/respond.ts`) is the cache key of the
  projection, per D-04.
- `GET /api/session` returns the acting account or 401 — the re-entry check at the gate
  and the never-typed name in the header both read it.
- `POST /api/orders/[id]/open` is idempotent and returns `200 { clock }` on a second
  open, which is why the D-05 entry is benign.
- `GET /api/hours` is read-only (405 on write), so the time-on-order surface is a pure
  read and FR-58 needs no new route.

</code_context>

<specifics>
## Specific Ideas

- The `order_not_found` line on the order list must be worded so that an unowned order
  and a nonexistent one are indistinguishable in the copy as well as on the wire. A
  reviewer testing the boundary should find the refusal visible and the cause invisible.
- `already_open` is the only benign entry in the closed set, and saying so in its own
  comment is worth doing — it is the one code whose outcome requires nothing of the
  artisan.
- The cost recorded in D-04 is stated in the phase record rather than left implicit,
  because the gap is real between this phase and P6.

</specifics>

<deferred>
## Deferred Ideas

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

</deferred>

---

*Phase: 4-Shell, gate, orders, clock (online)*
*Context gathered: 2026-09-23*
