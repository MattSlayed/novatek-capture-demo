---
phase: 04-shell-gate-orders-clock-online
plan: 04
subsystem: client
tags: [client-projection, single-owner, instance-keyed-cache, idempotency-key, module-scope-state]

# Dependency graph
requires:
  - phase: 04-03
    provides: "`anchorFrom` and the `Anchor` type in `lib/client/clock.ts` — the projection stores an anchor, never an elapsed figure"
  - phase: 03-server-seam
    provides: "the six frozen route handlers this module is the only client of, and the universal `X-CAP-Instance` header it keys on"
provides:
  - "`lib/client/projection.ts` — the one module holding cached server state: `noteResponse`, `purge`, seven HTTP accessors, four synchronous cached readers"
  - "the `Outcome<T>` result shape every Phase 4 surface reads: ok / refused / no-answer, deliberately three-way"
---

# Plan 04-04 — the one client projection

**Status:** complete
**Commits:** `df7825b` (both tasks), plus this summary
**Executed:** 2026-09-28, inline by the orchestrator (see Deviations)

## What landed

`lib/client/projection.ts` (about 300 lines) and `lib/client/projection.test.mjs` (8 tests).

The module is the one place in the build that caches a server fact, which is what
Success Criterion 5 requires. Module scope is the lifetime: it survives every
client-side screen switch and empties only on a full document load — the same
event that tears down the document its cells describe.

- **`noteResponse(res)`** is the single write door. It reads `x-cap-instance`
  first, purges when the stored instance differs, then stores the seen value.
  The ordering is load-bearing and is commented as such: purging after the body
  was stored would discard the very datum that proved the instance changed.
- **`purge()`** takes no parameters at all, on the precedent of `notFound()` in
  `lib/http/respond.ts` — the absence of a parameter is the mechanism, because
  there is nothing a caller could pass to make the purge partial. It
  deliberately leaves `instance` set; `noteResponse` assigns the new value on the
  next line, and clearing it would make the following response read as a first
  contact rather than as the change it was.
- **Seven accessors, seven fetch call sites, no eighth.** Each passes its
  response through `noteResponse` before touching the body.
- **Clock writes carry exactly `client_id`**, fresh from `crypto.randomUUID()` on
  every call, because reusing one makes the second tap a `duplicate` rather than
  the idempotent success FR-7 describes.
- **No elapsed figure is stored anywhere.** Clock entries hold an anchor built by
  `clock.ts`'s `anchorFrom`; the elapsed value is rendered arithmetic (FR-10).

## Decisions worth carrying forward

**The result shape is three-way, not two-way.** `Outcome<T>` distinguishes `ok`,
`refused` (the server's own `{ error, detail }`, passed through unaltered) and
`no-answer` (a request that never reached a response). Collapsing the last two
would make an offline app look signed out, or a refused order look like a network
fault. A 401 from `readSession` is therefore `{ kind: "ok", value: null }` — a
definite no — while a rejected fetch is `no-answer`. The plan's wording was
"returns the account or null on a 401"; that is satisfied in substance, with the
null carried inside a definite answer rather than conflated with silence.

**No sentence is composed here.** Refusals return the server's `detail` as sent,
and the surface chooses between it and `CONFLICT_COPY`'s own sentence (UI-SPEC
Decision 5). Phase 4 authors no sentence for the no-answer case at all; Phase 6
owns connectivity.

**D-04's accepted cost is recorded in the module header**, where a later reader
meets it: until Phase 6, a restored order whose segments died with the instance
reads as *no time recorded* rather than *the record was discarded*.

## Deviations from plan

**One, and it is about how the work was done rather than what was built.** The
plan's protocol is one atomic commit per task; tasks 1 and 2 landed in a single
commit (`df7825b`).

Four successive executor agents stalled on this plan without writing anything —
three resumes of one agent and one fresh spawn, each dying in its reading phase
on this OneDrive path, with HEAD unmoved and no file created each time. Diagnosis
attempts found no cause in the artifacts: the plan carries no NUL bytes and its
longest line (328 characters) is shorter than several plans that read fine. The
orchestrator then executed the plan inline, writing both files in full before
running any check. Splitting that into two commits afterwards would have been a
fiction about how the work happened, so it is one commit whose message says why.

Nothing about the plan's content was narrowed. Every task action and every
acceptance criterion was carried out as written.

## Verification

All run on the current tree, output not quoted from a log:

| Check | Result |
|---|---|
| `node --test lib/client/projection.test.mjs` | 8/8 pass |
| `node --test "lib/**/*.test.mjs"` | 219/219 pass (211 before this plan) |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint lib/client` | exit 0 |
| `node scripts/check-register-isolation.mjs` | `Problems: 0` |

Every acceptance grep in the plan was run literally:

- forbidden imports from `lib/store`, `lib/access`, `lib/reconcile`, `lib/session`, `lib/http`: **0**
- `fetch(` call sites: **7** (one per accessor)
- `noteResponse(res)` call sites: **7**
- `.clear()` outside `purge`: **0**; `purge` defined once
- elapsed arithmetic (`elapsedS +` / `elapsed_s +`): **0**
- `"use client"`: **0** — this is a plain module

## Not proved here

- **The purge at the gate.** This module provides `purge()`; plan 04-07 calls it
  on persona choice, and plan 04-06's invariant A16 asserts that no cached server
  state lives outside this module. Neither is in this plan's scope.
- **The accessors against a live server.** Every test stubs `globalThis.fetch`.
  The route contracts they encode were read from the six frozen handlers this
  session, and plan 04-12's browser harness is where they meet a running server.
- **`crypto.randomUUID` on a plain-http origin.** It is a secure-context API,
  fine on `https` and `localhost` and absent on a plain-http LAN origin of the
  kind used for on-device testing. That is a deployment constraint for plan
  04-13's device pass, recorded in the module comment rather than worked around
  with a fallback this module has no business inventing.
