---
phase: 03-server-seam
plan: 10
subsystem: api
tags: [nextjs-route-handler, single-writer, batch-reconciliation, idempotency, cache-components]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/reconcile/apply.ts's applyItem/noteContact and lib/reconcile/validate.ts's pick/ACCEPTED_BODY_FIELDS/validateEnvelopeItem/badShapeDetail (03-05); lib/http/respond.ts's ok/fail and lib/http/contract.ts's HEADER_TABLE (03-02); lib/session/cookie.ts's readSession (03-03); lib/attribution/index.ts's deriveAccount (03-03); lib/limits/index.ts's SYNC_MAX_ITEMS/SYNC_MAX_ENCODED_BYTES and lib/copy/conflicts.ts's TRANSPORT_COPY (03-01)"
provides:
  - "app/api/sync/route.ts — POST, the whole batch reconciliation route: the envelope parser, the 413 ceiling, the per-item loop through the one writer, and the four X-CAP-Sync-* counters"
affects: [03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The raw wire text is read once via request.text() and JSON.parse()d by the route itself, never request.json(), so the encoded-byte ceiling is measured against exactly what crossed the wire rather than a re-serialised approximation"
    - "Every item — well-formed or not — reaches the one writer (applyItem) unconditionally, except the single case where client_id itself is unusable, since both idempotency and the result's own caller-correlation key on that one field"
    - "A defensive try/catch around the one applyItem call site converts an item whose kind this server does not recognise (a queue-version skew, AD-18) into a local bad_shape refusal instead of letting an uncaught exception abort the whole batch and drop every other item's result with it"

key-files:
  created:
    - app/api/sync/route.ts
  modified: []

key-decisions:
  - "Gated whether an item reaches applyItem on validateEnvelopeItem(item).field === \"client_id\" rather than on the refusal's code — this reads as \"no usable client_id\" for both sub-cases the plan names (item is not an object at all; item is an object but client_id is not UUID-shaped), since validateEnvelopeItem checks client_id before any other field and returns on first failure, so a refusal on any other field structurally proves client_id already passed"
  - "The one exception item is rendered as a SyncItemResult with client_id: \"\" rather than being dropped from results[] — SyncItemResult.client_id is a non-nullable string, so an empty string is the concrete stand-in for \"no id to report,\" while still keeping every item represented in the response array"
  - "Added a try/catch around the single applyItem call site, converting any exception into a local rejected/bad_shape result naming the kind field, rather than letting it propagate — lib/reconcile/validate.ts's idempotencyHash() indexes ACCEPTED_PAYLOAD_FIELDS by item.kind and hands the result straight to pick()'s for...of; for any item.kind outside the five-member SyncItemKind union (the online routes never expose this because each hardcodes a literal kind, but /api/sync is the first caller that can hand the writer an attacker- or version-skew-controlled kind) this throws a TypeError before the writer's own shape step ever gets a chance to refuse it safely. See Deviations for the empirical proof."
  - "Per-item fields are passed through to applyItem unpicked (cast via `as SyncItem<unknown>`, not reconstructed field-by-field) — unlike the online routes, which synthesise a fresh SyncItem from a URL and a minimal body, /api/sync's job is to replay a client's own previously-queued SyncItem verbatim; lib/reconcile/apply.ts's own explicit-named-field record construction (never spreading a payload) is what actually keeps a rogue field from ever reaching a stored record, so no route-level enumeration of the envelope's own fields (as opposed to the payload's) exists anywhere in this codebase for this route to duplicate"

requirements-completed: [REQ-FR-11, REQ-FR-19, REQ-FR-24, REQ-NFR-F1]

# Metrics
duration: 47min
completed: 2026-09-17
---

# Phase 3 Plan 10: Sync Route Summary

**`POST /api/sync` ships whole: raw-text byte measurement before JSON.parse, a 413 ceiling checked before the loop, every item (refused or recorded) routed through the same `applyItem` the online routes use, and the four `X-CAP-Sync-*` counters tallied once after the loop — proven against a live server for the idempotent-open, queued-clamp (D-04), oversized-batch, unrecognised-kind and unowned-vs-fabricated-id cases.**

## Performance

- **Duration:** 47 min (approx.)
- **Started:** 2026-09-17T22:38:21Z (approx., continuing directly from 03-09)
- **Completed:** 2026-09-17T23:25:13Z
- **Tasks:** 2 completed
- **Files modified:** 1 (1 created, 0 modified)

## Accomplishments

- `app/api/sync/route.ts`: `POST` derives the account once at the envelope level (`fail("no_session")` on failure, never a per-item rendering of the same fact) and stamps contact. The body is read as raw text via `request.text()` and measured with `Buffer.byteLength(raw, "utf8")` before `JSON.parse()`, so the byte ceiling reflects exactly what crossed the wire. `pick(body, ACCEPTED_BODY_FIELDS.sync)` drops everything but `items`; a missing or non-array `items` is `bad_request`. `items.length > SYNC_MAX_ITEMS` or the measured bytes `> SYNC_MAX_ENCODED_BYTES` refuses `413 batch_too_large` with the app-level sentence (`TRANSPORT_COPY.batch_too_large`), distinct from the hosting platform's own governed 413 sentence — before a single item is read.
- The per-item loop iterates `items` in arrival order, one at a time (no concurrent dispatch, no `break`, no early `return`). `validateEnvelopeItem(item)` runs first; only when its refusal's field is `client_id` (item is not an object at all, or its `client_id` is not UUID-shaped) is the item refused locally without calling the writer — the one case where there is no id to key idempotency by or to name in a result. Every other item, however malformed otherwise, reaches `applyItem` — the exact same function every online route in this phase calls, so a duplicate, a conflict and a rejection collapse to the identical per-item shape `/api/verify`/`/api/decisions`/etc. already produce. A `referral` item reaches the writer and comes back `rejected unknown_kind` (P9 supplies real behaviour); the kind itself is never special-cased in this file.
- After the loop, `results` is tallied once by `status` into a `{recorded, duplicate, conflict, rejected}` object and stamped as `X-CAP-Sync-Recorded`/`-Duplicate`/`-Conflict`/`-Rejected` plus `X-CAP-Account`, all through a single `ok()` call carrying `{ server_time, results }` at `status: 200` — unconditionally, even when every item in the batch was refused.
- `npx next typegen && npx tsc --noEmit` both exit 0 after each task; `npm run build` marks `/api/sync` dynamic (`ƒ`) alongside the eleven routes already shipped in this phase, with zero `runtime`/`dynamic` segment-config exports anywhere under `app/api/`. `node scripts/check-governed.mjs` and `node scripts/claims-audit.mjs` both exit 0.
- `npm run verify` run end-to-end after both task commits: **all steps exited 0** — 246 fixture-suite tests and 148 unit-suite tests, zero problems on every check.
- Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final file and passed exactly as specified — including the two "no numeric restatement" and "no PLATFORM_413/no unknown_kind-in-code" checks — with one documented exception: the literal `grep -n "applyItem"` command matches two lines (the import specifier and the one real call site), since the pattern has no way to distinguish an import from an invocation; the acceptance criterion's own prose ("exactly one call site, inside the loop") is satisfied by inspection, matching this project's established precedent for the identical ambiguity already resolved in 03-09's self-check for `notFoundProposal()` and `pick(`.
- **Live smoke-tested against a running production server** (beyond the plan's own required checks, given the loop's added complexity): minted a session, then exercised — a batch of three items (owned `order_open` → `recorded`; no-`client_id` item → `rejected bad_shape` with `client_id: ""`; unowned `order_open` → `conflict order_not_found`), with counters `{recorded:1, duplicate:0, conflict:1, rejected:1}` matching exactly; a replay of the first item → `duplicate` (AD-9); `GET /api/hours` reading the recorded segment back; a 51-item batch → `413 batch_too_large`; a `referral` item → `rejected unknown_kind` through the writer's own referral branch; an item with a kind outside `SYNC_ITEM_KINDS` entirely, valid `client_id`, and a real owned `order_id` → the defensive catch fired exactly as designed (`rejected bad_shape`, field `kind`) rather than crashing; a queued `order_open` with `device_claimed_opened_at` three minutes in the past → recorded and read back on `GET /api/hours` with `source: "device_reconciled"`, `device_claimed_opened_at` and `device_offset_s: 180` both present (D-04, confirmed empirically); and an unowned order id vs. a fabricated order id in the same batch → byte-identical `status`/`code`/`detail` (FR-6).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the envelope, the ceiling and the session gate** - `499b8ca` (feat)
2. **Task 2: Write the per-item loop and the four counters** - `0433e04` (feat)

## Files Created/Modified

- `app/api/sync/route.ts` - POST, the whole batch reconciliation route (envelope, 413 ceiling, per-item loop, four counters)

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added a defensive catch around the one `applyItem` call site for an item whose kind is not recognised**

- **Found during:** Task 2, while designing the per-item loop
- **Issue:** `lib/reconcile/apply.ts`'s `applyItem` calls `lib/reconcile/validate.ts`'s `idempotencyHash(item.kind, item.payload)` at its idempotency step (step 3), before its own shape step (step 4, which calls `validateEnvelopeItem` and would otherwise refuse an unrecognised kind safely) ever runs. `idempotencyHash` indexes `ACCEPTED_PAYLOAD_FIELDS[kind]` — typed `Record<SyncItemKind, readonly string[]>`, so TypeScript assumes the lookup always succeeds — and hands the result straight to `pick()`'s `for (const field of fields)`. Every existing caller of `applyItem` (the seven online routes shipped in 03-07 through 03-09) hardcodes a literal, always-valid `kind`, so this path was never reachable before this plan: `/api/sync` is the first and only caller that can hand the writer an `item.kind` taken directly from an attacker- or version-skew-controlled wire value. For any `kind` outside the five-member `SyncItemKind` union, `ACCEPTED_PAYLOAD_FIELDS[kind]` is `undefined` at runtime, and `pick()`'s `for...of` over `undefined` throws a `TypeError` — uncaught, this aborts the whole `POST` handler and drops every other item's result in the same batch along with it, directly violating this plan's own must-have ("the loop never stops early: every item gets a SyncItemResult... because the batch is not a transaction") and its own threat register's T-3-50 mitigation ("every item produces a SyncItemResult... so a dropped item would change the counters and be visible"). This is also a foreseeable, non-adversarial case: AD-18 states "the writer accepts every emitted version; a breaking change is a new kind," meaning a real deployment can plausibly see an older or newer client's queued item carrying a `kind` this particular server build does not recognise.
- **Fix:** Wrapped the single `await applyItem(sessionResult, item)` call in a `try`/`catch`; on any exception, the item is refused locally as `{ status: "rejected", code: "bad_shape", detail: badShapeDetail("kind") }`, using the item's own `client_id` when it is a string. This does not special-case `kind` in the sense the plan's own comment forbids (no `if (item.kind === ...)` branch) — it is a generic safety net around the one call site, for any exception, not a kind-aware code path. `lib/reconcile/apply.ts` and `lib/reconcile/validate.ts` were not modified: both are explicitly out of this plan's `files_modified` scope ("No new library logic — every decision it renders was already made and unit-tested in `lib/reconcile/apply.ts`"), and the fix stays entirely inside the route file.
- **Files modified:** `app/api/sync/route.ts`
- **Verification:** Empirically reproduced and confirmed fixed against a live server (see Accomplishments): a batch item with `kind: "bogus_kind_not_recognised"`, a valid UUID `client_id`, and a real order id owned by the caller's own account returned `200 { results: [{ status: "rejected", code: "bad_shape", detail: "...The field was kind." }] }` rather than crashing the request. `npx tsc --noEmit`, `npm run build` and `npm run verify` (all steps, 246 + 148 tests) all pass.
- **Committed in:** `0433e04` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a crash reachable only through this plan's own new code path, not a pre-existing issue in `lib/reconcile/apply.ts` itself).
**Impact on plan:** Necessary for the plan's own explicit must-have ("the loop never stops early") to hold under adversarial or version-skewed input, not only under well-formed input. No scope creep: the fix is a generic try/catch inside the one route file this plan owns; no library file was touched, and the kind is not special-cased in code (confirmed by the plan's own acceptance-criteria grep: `unknown_kind` appears only in a comment).

## Known Stubs

None — every field in the response comes from a real `applyItem` call (the same writer every online route in this phase already uses) or, for the one no-writer exception, directly from `validateEnvelopeItem`'s own already-tested refusal. No hardcoded placeholder or empty-by-construction value reaches a response.

## Issues Encountered

- One drafting correction caught during Task 2's own acceptance-criteria verification loop, before the commit: an early draft of the loop's header comment used the literal phrase "never Promise.all," which the task's own acceptance criterion (`grep -n "break;\|Promise.all"` returns no match) greps for and would have failed against — the same class of self-tripping-comment issue this project has repeatedly logged (STATE.md's Phase 3 decisions for `lib/attribution`, `lib/access`, and 03-09's four routes). Reworded to "no concurrent dispatch of the whole array" before running the acceptance checks; no incorrect version was ever committed.
- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts`, `scripts/claims-audit.mjs` and `docs/CAPTURE-PLAN-SEED.md` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --short` before and after both task commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here. `node scripts/claims-audit.mjs` (run as part of `npm run verify`) still exits 0 against the modified script.
- Carried forward from 03-07 through 03-09, now one route further stale: `lib/http/contract.ts`'s `HEADER_TABLE` entry for `X-CAP-Account` still lists its `routes` field as `["POST /api/session"]` only; this plan's route is the seventh emitter not named there (the four `X-CAP-Sync-*` headers, by contrast, are already correctly registered with `routes: ["POST /api/sync"]`, since 03-02 anticipated this route by name). `ok()`'s runtime guard checks only a header name's presence in `HEADER_TABLE`, not its `routes` field, so nothing fails at build or request time. `lib/http/contract.ts` is outside this plan's `files_modified` scope; flagging again for whichever later plan next touches it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `app/api/sync/route.ts` is in place, type-check clean, builds dynamic (`ƒ`), and is live-smoke-tested for the idempotent-open, queued-clamp/D-04, oversized-batch, malformed-kind, referral, and unowned-vs-fabricated-id cases. All twelve routes this phase names except `walk/[orderId]` are now shipped (03-07 through 03-10).
- `npm run verify` passes end-to-end (all steps, 246 fixture-suite tests, 148 unit-suite tests); no blockers for 03-11.
- Plan 03-11 (`app/api/walk/[orderId]`, `lib/walk/`) runs next on this same tree and does not touch `app/api/sync/route.ts` or any file this plan modified.
- The reviewer-facing curl suite's checks E and F (idempotency: same item twice → `duplicate`; same id, different outcome → `already_recorded_differently`) and the full FR-6 byte-identity comparator ride plan 03-13's `scripts/server/route-suite.proof.mjs`, per 03-VALIDATION.md's routing map — this plan's own verification covers the type/build/static-analysis layer, the already-shipped unit-level proof of the underlying writer (`lib/reconcile/apply.test.mjs`, 03-05), and an ad hoc live-server smoke test (see Accomplishments) that is not itself part of the committed test suite.
- Carried forward from 03-07 through 03-09 and restated above: `HEADER_TABLE`'s `X-CAP-Account` entry's `routes` field is stale by one more route as of this plan; still a documentation-only gap, still deferred to whichever plan next edits `lib/http/contract.ts`.

## Self-Check: PASSED

All `key-files.created` verified present on disk: `app/api/sync/route.ts` (181 lines, well above the plan's 110-line minimum). Both commit hashes (`499b8ca`, `0433e04`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -1 --format=%B` immediately after each commit). Neither commit shows any file deletion (`git diff --diff-filter=D` empty for both). `npm run verify` re-run end-to-end after Task 2: all steps exited 0, 246 fixture-suite tests and 148 unit-suite tests, zero problems reported by any check. Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final file and passed exactly as specified (see Accomplishments for the one documented call-site-vs-import counting note). The plan's own full `<verification>` block was re-run directly: `npx next typegen && npx tsc --noEmit && npm run build` all exit 0; the repo-wide `runtime`/`dynamic` grep across `app/api/` returns no match; `npm run verify` exits 0 end to end. Beyond the plan's own required checks, a live production-server smoke test (documented in Accomplishments) empirically confirmed the idempotent-open, D-04 queued-clamp, 413-ceiling, defensive-catch, referral, and FR-6 byte-identity behaviors.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
