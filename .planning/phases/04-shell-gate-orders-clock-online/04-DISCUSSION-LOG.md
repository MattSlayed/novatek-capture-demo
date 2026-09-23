# Phase 4: Shell, gate, orders, clock (online) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-23
**Phase:** 4-shell-gate-orders-clock-online
**Areas discussed:** URL and screen encoding; already_open sentence and next act (AD-9
scheduled closure); DESIGN.md primitives scope (scheduled closure)

**Areas offered but not selected:** client projection shape; the ticking clock; gate
first-versus-re-entry detection. All three are recorded as Claude's discretion in
CONTEXT.md with the constraints that bind them regardless.

---

## URL and screen encoding

### Q1 — How should a surface that needs an order id be encoded in the URL?

| Option | Description | Selected |
|--------|-------------|----------|
| `?s=order&id=wo-0142` | Separate key per argument, extending the existing `s` convention; each value validated independently at the one parse point | ✓ |
| `?s=order/wo-0142` | One key carries surface and argument, slash-delimited; needs splitting before validation | |
| `?order=wo-0142` | Surface implied by which key is present; no single key names the current screen | |

**User's choice:** `?s=order&id=wo-0142`
**Notes:** Time-on-order becomes `?s=time&id=wo-0142`. Keeps P1's discipline that the
untrusted value is read for a branch only, never interpolated into markup, a URL or a
header.

### Q2 — A cold deep link to an order the account does not own (or that does not exist)

| Option | Description | Selected |
|--------|-------------|----------|
| Order list, with a stated line | Land on the list and state it using the conflict table's own `order_not_found` sentence; no new surface | ✓ |
| A not-found screen naming the code | Dedicated surface with a control back to the list; adds a sixteenth surface to an IA that enumerates fifteen | |
| Silent redirect to the order list | Leaks nothing, but leaves a reviewer no evidence the refusal happened | |

**User's choice:** Order list, with a stated line
**Notes:** The wording may not distinguish an unowned order from a nonexistent one — the
byte-identical refusal is the claim SM-1 asks a reviewer to test, and the client must not
undo AD-4 by how it renders.

### Q3 — A deep link arrives with no session; where does the artisan land after the gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Always the order list | Requested surface dropped; nothing stored across the gate, so the purge stays total | ✓ |
| Resume the requested surface | Friendlier for a shared link, but needs stored intent that must itself be purged | |
| Order list, and say the link was dropped | Most transparent, but names a mechanism the artisan did not act on | |

**User's choice:** Always the order list
**Notes:** The chosen persona often cannot see the requested order anyway, which would
route straight back into Q2's line.

### Q4 — A restored URL after the server cold-started

| Option | Description | Selected |
|--------|-------------|----------|
| Purge silently, name it in Phase 6 | Track `X-CAP-Instance` and purge on change; naming waits for the sync screen where `memoryStore` and `store_evicted` already render | ✓ |
| Purge and state it now | Most honest, but needs a reworded or new entry in the closed conflict set, since `store_evicted` is proposal-worded today | |
| Do not track the instance here | Least code, but the projection could then serve cached orders from a dead instance | |

**User's choice:** Purge silently, name it in Phase 6
**Notes:** Accepted cost recorded in CONTEXT.md D-04 — a restored order reads as *no time
recorded* rather than *the record was discarded* until P6 closes the gap.

---

## already_open sentence and next act (AD-9 scheduled closure)

| Option | Description | Selected |
|--------|-------------|----------|
| Report it, no act required | Says the clock was already running and nothing was lost; the only benign entry in the set | ✓ |
| A conflict with a required next act | Consistent in shape with its neighbours, but implies a loss or a decision where there is neither | |
| Write the sentence, decide the act in Phase 6 | Honest about what is unknown, but ships a closed-set entry no path can exercise | |

**User's choice:** Report it, no act required
**Notes:** Actions list carries only *View time on this order*. Grounded in P3 D-06: a
second online open returns `200 { clock }` with no new segment, and `/api/sync` returns
`duplicate`, so the server refused nothing. First rendering path is P6 reconciliation.

---

## DESIGN.md primitives scope (scheduled closure)

| Option | Description | Selected |
|--------|-------------|----------|
| Build them and land the check | A verify step stops later screens re-declaring sizes, contrast or state marks locally, in the shape of P1's `check-governed` | ✓ |
| Build them, enforce in Phase 5 | Lower risk of the wrong invariant, but nothing prevents the next phase bypassing the primitives | |
| Only what Phase 4 renders | Smallest surface, but drops the record control the roadmap named here | |

**User's choice:** Build them and land the check
**Notes:** All five built against DESIGN.md — ribbon (exists), record control (130 px),
secondary control (44 px), focus ring, state marks — even though nothing in P4 binds a
record. Risk recorded in CONTEXT.md D-07: a contract written against a single consumer can
encode the wrong invariant, and P5 may generalise it.

---

## Claude's Discretion

Offered as gray areas, not selected for discussion, and recorded in CONTEXT.md with the
constraints that hold regardless:

- **The internal shape of the client projection** — what is cached versus refetched, the
  module boundary, and exactly what the single gate purge clears.
- **The live tick of the clock** — interpolation versus polling, and the re-anchoring rule
  that keeps a ticking display honest about a server-derived fact.
- **FR-48a first-entry detection** — what persists the fact that the long form was seen,
  given a memory-only server store.

## Deferred Ideas

- Resuming a requested surface across the gate (stored intent) — revisit only if
  link-sharing between artisans becomes a goal.
- Naming an instance change to the artisan — belongs with the P6 sync screen, where the
  proposal-worded `store_evicted` sentence can be generalised deliberately.
- A dedicated not-found surface — rejected as a sixteenth surface in a fifteen-surface IA.
