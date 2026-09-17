# Phase 3: Server seam - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-17
**Phase:** 3-server-seam
**Areas discussed:** Sync and walk depth in P3, Clock gating and the close conflict, Proof artefacts and validation strictness

Four gray areas were offered; the user selected three. "The bounded values first needed here" was not selected and went to Claude's discretion.

---

## Sync and walk depth in P3

### How much of `POST /api/sync` ships in Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Full server route now (Recommended) | Envelope parser, per-item results, the four `X-CAP-Sync-*` counters, `applyItem` handling every kind that exists by P3; Phase 6 adds only the client queue | ✓ |
| Minimal route now | Accept an items array and run each through `applyItem`; no ceiling, no counters until Phase 6 | |
| You decide | Claude's discretion | |

**User's choice:** Full server route now
**Notes:** Curl F and FR-6 byte-identity on the sync route are P3 success criteria; AD-1 says one writer serves both paths from the start.

### Does a server-side batch ceiling land in Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Server ceiling now, client budget in P6 (Recommended) | `lib/limits` exports the server's item and encoded-byte ceilings now (from the seed's 50 items / 3 MB) with `413 batch_too_large`; Phase 6 adds the client budget strictly below | ✓ |
| No ceiling until P6 | The route accepts any parseable envelope in P3 | |
| You decide | Claude's discretion | |

**User's choice:** Server ceiling now, client budget in P6
**Notes:** AD-13 already says a client target and a server ceiling are two named exports.

### How much of `GET /api/walk/[orderId]` ships in Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Full payload now, P8 adds the screen (Recommended) | `lib/walk/payload.ts` populates the whole `WalkPayload` shape; `referrals: []` until P9; P8 adds the screen, disposition table and handover | ✓ |
| Minimal payload now, P8 completes it | Only what curl E reads | |
| You decide | Claude's discretion | |

**User's choice:** Full payload now, P8 adds the screen
**Notes:** The type is locked in `types.ts` and curl E is a P3 gate.

### How is the FR-11 offline clock clamp proved in Phase 3?

| Option | Description | Selected |
|--------|-------------|----------|
| Unit test plus a sync-route test (Recommended) | Direct `applyItem` test with a queued-flagged `order_open`, plus a route test through `POST /api/sync` read back on `/api/hours` | ✓ |
| Unit test only | End-to-end waits for Phase 6's harness | |
| You decide | Claude's discretion | |

**User's choice:** Unit test plus a sync-route test
**Notes:** Roadmap success criterion 5 names the clamp; the route is live, so the end-to-end proof is cheap.

---

## Clock gating and the close conflict

### What does `order_closed` mean on the verify, capture and decision routes?

| Option | Description | Selected |
|--------|-------------|----------|
| Clock must be running (Recommended) | No open segment → `409 order_closed` with EXPERIENCE's sentence; reachable via close-then-capture | ✓ |
| Clock never gates captures or decisions | `order_closed` fires only on `WorkOrder.status === "closed"`, which no fixture carries | |
| You decide | Claude's discretion | |

**User's choice:** Clock must be running
**Notes:** All five fixture orders are `assigned` and no route closes a work order, so the clock is the only closed state that exists.

### Which close codes join the closed set now?

| Option | Description | Selected |
|--------|-------------|----------|
| `not_open` now, `already_open` in P4 (Recommended) | `not_open` with sentence and next act written in P3 for FR-8; `already_open` stays on AD-9's P4 schedule | ✓ |
| Both codes now | Add both in P3; deviates from AD-9's schedule | |
| Neither; close-on-closed returns `order_closed` | Reuse the existing code; contradicts Epic 1.6 and the seed | |

**User's choice:** `not_open` now, `already_open` in P4
**Notes:** Reconciles FR-8 (a P3 requirement) with the `types.ts` note that deferred both codes to P4; the note is amended.

### How does the server know the device's last contact for the FR-11 clamp?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-account last-contact in the memory store (Recommended) | Every authenticated request stamps `last_contact`; floor is the later of `issued_at` and that value; falls back to `issued_at` after instance change or TTL | ✓ |
| Re-issue the cookie with a server-stamped `last_seen` | Signed, survives instance change; Set-Cookie on every response and care for not-found byte-identity | |
| You decide | Claude's discretion; a client-supplied value was not offered (AD-3) | |

**User's choice:** Per-account last-contact in the memory store
**Notes:** Fits AD-10's silent cold start; no cookie churn.

### What happens to a running segment at session end or expiry?

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it running; only an explicit close ends it (Recommended) | The server takes no implicit act; clock keyed by order and account survives re-entry | ✓ |
| Close it at session end | `DELETE /api/session` ends the segment; expiry cannot do the same, so the paths diverge | |
| You decide | Claude's discretion | |

**User's choice:** Leave it running; only an explicit close ends it

---

## Proof artefacts and validation strictness

### Where do the Phase 3 proofs live?

| Option | Description | Selected |
|--------|-------------|----------|
| Route tests in `verify` plus a reviewer shell script (Recommended) | node:test route suite against a spawned `next start` inside `verify` (no browser, runs on Vercel too), plus a curl script A–H recorded in `docs/analysis/` | ✓ |
| Curl script only | Run by hand and recorded; nothing in `verify` exercises a live route | |
| Route tests only | The shell script waits for Phase 8's SM-1 packaging | |

**User's choice:** Route tests in `verify` plus a reviewer shell script

### How strict is shape validation?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict per D-CONV; rewrite the curl suite (Recommended) | 64 lowercase hex `sha256`, UUID `client_id`, ISO-8601 UTC `Z`, positive-integer `bytes`, `mime` allow-list, `duration_ms` only on voice; `422 bad_shape` names the field | ✓ |
| Loose as the seed shows | Presence and JSON type only; the seed's `sha256: "00"` passes | |
| You decide | Claude's discretion | |

**User's choice:** Strict per D-CONV; rewrite the curl suite

### What does the FR-6 byte-identity test compare?

| Option | Description | Selected |
|--------|-------------|----------|
| Full header set minus a named exclusion list (Recommended) | Status, exact body bytes, every header except a documented list (`date`, `connection`, `keep-alive`, `server`, `x-vercel-*`, `etag`) with a reason per entry | ✓ |
| Only the headers this app sets | `Cache-Control`, `Content-Type`, `Content-Length`, `X-CAP-*` | |
| You decide | Claude's discretion | |

**User's choice:** Full header set minus a named exclusion list

### How is the non-bypassability enumeration kept true?

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-written doc, checked by the gate (Recommended) | `docs/analysis/single-writer-non-bypassability.md` by hand; a structure check fails when any route, `process.env` read or store writer is absent | ✓ |
| Generated from source | A script emits the enumeration each build; the reviewer's prose has nowhere to live | |
| Hand-written doc, reviewed by a person | No automated tie to the source | |

**User's choice:** Hand-written doc, checked by the gate

---

## Claude's Discretion

- The bounded values first needed here (the unselected gray area): adopt the seed's figures as the tuned starting values; which media quantities the server refuses on.
- `FIXTURE_VERSION` re-export from `lib/limits`; module and file names; the development session-key mechanism; `store_evicted` detection; the canonicaliser's field subsets and the attempt-entry shape; the clock segment's retained fields in `types.ts`; the health `counts` shape; the route suite's port, startup probe and STEPS placement; the exact exclusion-list entries; `ObservationProvenance` composition; how the build rules are asserted.

## Deferred Ideas

- `already_open` — P4 (AD-9).
- Client outbound batch budget and truncation semantics — P6.
- `POST /api/referrals`, `lib/access/register.ts`, the `referral` kind — P9.
- Walk screen, Limits disposition table, handover — P8.
- Eviction case reachable in a walkthrough — P8 (PRD Q5).
- SM-1 hostile-script packaging — P8.
- Cookie re-issue with `last_seen` — declined.
- Implicit segment close at session end — declined.
