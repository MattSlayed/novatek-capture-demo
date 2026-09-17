---
phase: 03-server-seam
plan: 09
subsystem: api
tags: [nextjs-route-handler, single-writer, ad-5, ad-20, cache-components]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/reconcile/apply.ts's applyItem/noteContact and lib/reconcile/validate.ts's pick/ACCEPTED_BODY_FIELDS/ACCEPTED_PAYLOAD_FIELDS (03-05); lib/http/respond.ts's ok/fail/notFound/notFoundProposal and lib/http/contract.ts's HEADER_TABLE (03-02); lib/session/cookie.ts's readSession (03-03); lib/attribution/index.ts's deriveAccount and lib/access/scope.ts's orderOwned (03-03); lib/verify/authored.ts's authoredMatch and lib/proposals/derive.ts's proposal derivation, reached only through the writer (03-04); lib/store/memory.ts's readCaptures (03-02)"
provides:
  - "app/api/verify/route.ts — POST, capture plus authored verification and its derived proposals"
  - "app/api/captures/route.ts — POST, evidence capture, no verification and no proposals"
  - "app/api/decisions/route.ts — POST, accept or reject one proposal, decided_by server-stamped"
affects: [03-10, 03-11, 03-12, 03-13, 03-14, 03-15, 03-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Both capture routes force `purpose` from the route itself (verify/evidence) rather than trusting the body's own value, so a body that disagrees with the URL it was sent to never wins"
    - "Neither capture route imports the verification-answer or proposal-derivation modules — only the writer (lib/reconcile/apply.ts) reaches them, keeping exactly one path from a request to an authored answer"
    - "A decision's authorisation lives entirely inside its own picked body (the AD-5 identity pair, capture_client_id plus observation_id) rather than a URL param or a second store read, so ownership is decided once, inside the writer's re-derive-then-compare step"
    - "applyItem's `duplicate` outcome (its own `code: null`) is dispatched through the same success branch as `recorded` in every route this plan adds, since AD-9's idempotency contract promises the identical response on a retried client_id"

key-files:
  created:
    - app/api/verify/route.ts
    - app/api/captures/route.ts
    - app/api/decisions/route.ts
  modified: []

key-decisions:
  - "Treated applyItem's `duplicate` outcome as a success alongside `recorded` in all three routes, rather than following the plan's literal `recorded -> ok(); anything else -> fail(outcome.code, ...)` text verbatim — a duplicate outcome's own `code` is `null` (lib/reconcile/apply.ts's finalize() passes `null` for that branch specifically), and `fail(null, ...)` would crash inside `detailFor()`'s property lookup. AD-9's own idempotency contract promises the identical response on a retried client_id, matching 03-08's identical precedent for the open/close routes."
  - "Reconstructed the `capture` object for verify's and captures' success bodies by reading it back from lib/store/memory.ts's readCaptures() rather than from `result.server` — `SyncItemResult.server`'s type carries `verification`/`proposals`/`decision`/`clock` but no `capture` field at all, so the plan's own 'from result.server' phrasing does not hold literally. Reading it back (keyed by item.client_id, which AD-16 guarantees is the capture's own id) is also the only way to get a byte-exact recorded_at on a duplicate replay, mirroring 03-07's identical precedent for reconstructing verifications from the store rather than approximating them."
  - "Derived X-CAP-Decision-State from the decision's own outcome (accept -> \"accepted\", reject -> \"rejected\") when no local Proposal copy exists to read a .state from — lib/reconcile/apply.ts's own documented case of a decision reaching an instance that never issued the proposal leaves `result.server.proposals` absent, so a bare `result.server.proposals[0].state` read would be undefined there."
  - "Wrote every comment describing why a route does not import or call a specific module/function (lib/verify/, lib/proposals/, proposalIdMatches, orderOwned, readProposal, authoredMatch, authoredProposals) without ever spelling out the literal banned identifier the acceptance criteria grep for — following the project's own established precedent for self-tripping comments (STATE.md's Phase 3 decisions log the identical class of issue for lib/attribution and lib/access)."

requirements-completed: [REQ-FR-15, REQ-FR-16, REQ-FR-17, REQ-FR-18, REQ-FR-19, REQ-FR-21, REQ-FR-23, REQ-FR-27, REQ-NFR-F1]

# Metrics
duration: 26min
completed: 2026-09-17
---

# Phase 3 Plan 9: Verify, Captures and Decisions Routes Summary

**Three capture-and-decision routes — verify returns an authored match plus its derived proposals, captures stays silent on both, decisions accepts/rejects through the one writer with a server-stamped decided_by — none importing the authored-verification or proposal-derivation modules directly.**

## Performance

- **Duration:** 26 min (approx.)
- **Started:** 2026-09-17T22:12:28Z (approx., continuing directly from 03-08)
- **Completed:** 2026-09-17T22:38:21Z
- **Tasks:** 2 completed
- **Files modified:** 3 (3 created, 0 modified)

## Accomplishments

- `app/api/verify/route.ts`: `POST` derives the account (`fail("no_session")` on failure), stamps contact, parses the body defensively, and picks it down to `ACCEPTED_BODY_FIELDS.verify`'s eleven fields — every actor-shaped field (`captured_by`, `account_id`) is gone at that line, structurally, before anything downstream could read one. `orderOwned` runs on the picked `order_id` before the capture's own shape is ever validated, so a malformed body on an order this account does not hold still resolves `notFound()`. The `SyncItem` handed to `applyItem` is built server-side with a payload picked against `ACCEPTED_PAYLOAD_FIELDS.capture` and `purpose` forced to `"verify"` regardless of what the body's own field said. On success, the response is `{ capture, verification, proposals }` with `X-CAP-Verification: "authored"` (the header's own literal, never a governed sentence), `X-CAP-Proposals` set to the proposal count, and `X-CAP-Account`. The route imports neither the verification-answer module nor the proposal-derivation module — only `lib/reconcile/apply.ts` reaches either, and a comment above the `applyItem` call documents, without naming the banned identifiers, why an `UnknownCitedRecordError` from that path is left to propagate unhandled rather than mapped to a client refusal (a fixture defect is a repository bug, not a caller mistake).
- `app/api/captures/route.ts`: the identical shape, forcing `purpose` to `"evidence"` instead. Success body is `{ capture }` alone; the route stamps neither the verification-method header nor the proposal-count header the sibling route carries — an evidence capture answers neither claim.
- `app/api/decisions/route.ts`: `POST` derives the account, stamps contact, parses the body, and picks it down to `ACCEPTED_BODY_FIELDS.decisions`'s eight fields in one call — a `decided_by` the body might carry ceases to exist at that line, and the picked object is handed straight through as the `SyncItem`'s own payload (the one extra key it carries over the payload-only enumeration, `client_id`, is never read by the shape validator or the idempotency hash). `order_id` is the empty string by design: a decision's authorisation is its proposal id's own re-derived digest, decided inside the writer from the AD-5 identity pair (`capture_client_id`, `observation_id`) together with the session's account, so there is no order id to check at the route and no second ownership site. On success the route echoes only `{ decision, proposal }` from the writer's own returned record, stamping `X-CAP-Decision-State` and `X-CAP-Account`. An `unknown_proposal` outcome reaches exactly one call site, `notFoundProposal()`, which takes no parameter — a fabricated id and another account's id leave here as the same bytes (FR-27). The route calls none of `proposalIdMatches`, `orderOwned` or `readProposal`: all three belong to the writer.
- `npx next typegen && npx tsc --noEmit` both exit 0; `npm run build` (with `CAPTURE_BUILD_ID` resolved from `git rev-parse --short HEAD`) marks all three new routes dynamic (`ƒ`) alongside the eight routes already shipped in this phase, with zero `runtime`/`dynamic` segment-config exports anywhere under `app/api/`. `node scripts/check-governed.mjs` and `node scripts/claims-audit.mjs` both exit 0. `npm run verify` run end-to-end after both task commits: **all 21 steps exited 0** — 246 fixture-suite tests and 148 unit-suite tests, zero problems on every check, including `check-fixture-inputs` ("Both authored modules declare exactly (assetId, fixtureSet), reach no capture payload through their import graph, and carry no capture-payload identifier in live code").
- Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final files and passed exactly as specified, including the two identifier-absence checks (`authored.ts|derive.ts|authoredMatch|authoredProposals` absent from verify/captures; `proposalIdMatches|orderOwned|readProposal` absent from decisions) and the header-absence check (`X-CAP-Verification|X-CAP-Proposals` absent from captures).

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the verify and captures routes** - `aeb23a2` (feat)
2. **Task 2: Write the decisions route** - `94eeec7` (feat)

## Files Created/Modified

- `app/api/verify/route.ts` - POST, capture plus authored verification and derived proposals
- `app/api/captures/route.ts` - POST, evidence capture, no verification/proposals headers
- `app/api/decisions/route.ts` - POST, accept or reject one proposal, decided_by server-stamped

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dispatched applyItem's `duplicate` outcome through the same success branch as `recorded`, in all three routes**
- **Found during:** Task 1 (`app/api/verify/route.ts`, `app/api/captures/route.ts`), carried into Task 2 (`app/api/decisions/route.ts`) for the identical reason
- **Issue:** The plan's own dispatch text reads "`recorded` -> `ok(...)`; anything else -> `fail(outcome.code, result.detail)`." `lib/reconcile/apply.ts`'s idempotency step (step 3 of AD-1's fixed order, generic across every `SyncItemKind`) can legitimately return a `duplicate` status for a retried `client_id` with an unchanged payload — a real, expected path for an online route, not only for `/api/sync` (AD-9 exists precisely so a network-retried request replays the original result rather than erroring). `finalize()` passes `code: null` for exactly that branch. A literal-only-`recorded` dispatch would route `duplicate` into `fail(outcome.code, result.detail)` with `outcome.code === null`, and `fail()`'s own `STATUS_BY_CODE[null]` lookup plus `detailFor(null)`'s property access on an undefined copy record would throw — the same class of gap 03-08 already found and fixed for the open/close routes' own dispatch.
- **Fix:** Changed the dispatch condition to `result.status === "recorded" || result.status === "duplicate"` in all three routes, so a retried request replays the identical successful body and headers rather than crashing.
- **Files modified:** `app/api/verify/route.ts`, `app/api/captures/route.ts`, `app/api/decisions/route.ts`
- **Verification:** `npx tsc --noEmit`, `npm run build` and `npm run verify` (21/21 steps) all pass; reasoned through by hand against `lib/reconcile/apply.test.mjs`'s own already-shipped idempotency proofs (03-05), since no HTTP-level route-suite test yet exists in this plan's own scope to exercise a literal retried request over the wire (that rides plan 03-13, per 03-VALIDATION.md's routing map for this phase's curl checks B, C and D).
- **Committed in:** `aeb23a2` (Task 1 commit), `94eeec7` (Task 2 commit)

**2. [Rule 1 - Bug] Reconstructed the `capture` object from the store rather than from `result.server`**
- **Found during:** Task 1 (`app/api/verify/route.ts`, `app/api/captures/route.ts`)
- **Issue:** The plan's action text says the verify route's success body is `{ capture, verification, proposals }` "from `result.server`" — but `lib/data/types.ts`'s `SyncItemResult.server` type carries only `verification`, `proposals`, `decision` and `clock`; it has no `capture` field at all, and `lib/reconcile/apply.ts`'s capture branch never attaches one. Without a fix, the `capture` field in the response would have nothing to read from `result.server` and the route could not produce the shape the plan itself specifies.
- **Fix:** Read the just-written (or, on a duplicate, previously-written) `Capture` back from the store via the already-exported `readCaptures(account.account_id)`, matched by `id === clientId` — safe because AD-16 guarantees `Capture.id` is exactly the envelope's own `client_id`. This is also the only way to get a byte-exact `recorded_at` on a duplicate replay, since `apply.ts` stamps that field from its own private `nowMs` at write time, which this route has no other way to reproduce. No change to `lib/store/memory.ts` or `lib/reconcile/apply.ts` — mirrors 03-07's identical precedent (reconstructing `verifications` for `GET /api/orders/[id]` from an existing store read rather than adding a new one) for the same class of gap between a plan's stated response shape and the actual shipped interface.
- **Files modified:** `app/api/verify/route.ts`, `app/api/captures/route.ts`
- **Verification:** `npx tsc --noEmit` confirms the read satisfies `Capture`'s full shape; `npm run verify` passes end-to-end.
- **Committed in:** `aeb23a2` (Task 1 commit)

**3. [Rule 1 - Bug] Derived `X-CAP-Decision-State` from the decision's own outcome when no local proposal copy exists**
- **Found during:** Task 2 (`app/api/decisions/route.ts`)
- **Issue:** The plan's action text names the header's value as "the proposal's new state," implying a read of `result.server.proposals[0].state`. `lib/reconcile/apply.ts`'s own documented case — a decision reaching an instance that never issued the proposal — records the decision but leaves `result.server.proposals` absent (there is no local `Proposal` object to update), so a bare index-and-property read would be `undefined` in exactly that reachable case.
- **Fix:** `const decisionState = proposal?.state ?? (decision?.outcome === "accept" ? "accepted" : "rejected");` — falls back to the equivalent state name derived from the decision's own recorded outcome, which is always present on the success path.
- **Files modified:** `app/api/decisions/route.ts`
- **Verification:** `npx tsc --noEmit` and `npm run verify` pass; reasoned through against `lib/reconcile/apply.ts`'s own source and `apply.test.mjs`'s existing cross-instance-decision test (03-05).
- **Committed in:** `94eeec7` (Task 2 commit)

**4. [Rule 1 - Bug] Wrote every module/function-absence comment without the literal identifier the acceptance criteria grep for**
- **Found during:** Task 1 and Task 2, before either file's first commit
- **Issue:** The plan's own action text asks for comments stating, in effect, "this route does not import lib/verify/authored.ts or lib/proposals/derive.ts" (Task 1) and "this route does not call proposalIdMatches, orderOwned or readProposal" (Task 2) — but the same tasks' acceptance criteria grep those exact literal strings for absence across the whole file, comments included. A comment written the plan's own literal way would trip the acceptance criterion it is explaining, the identical self-tripping-comment failure mode STATE.md already logs for `lib/attribution` and `lib/access` in this phase.
- **Fix:** Described each absent import or call functionally — by directory (`lib/verify/`, `lib/proposals/`) rather than filename, and by role ("the order-ownership check," "reading a proposal back from the store," "the re-derive-then-compare step") rather than function name — so the documentation's intent survives without repeating a banned literal. Verified every grep in both tasks' acceptance criteria directly after writing, before running any build step.
- **Files modified:** `app/api/verify/route.ts`, `app/api/captures/route.ts`, `app/api/decisions/route.ts`
- **Verification:** All four identifier-absence greps (`authored.ts|derive.ts|authoredMatch|authoredProposals` on verify/captures; `proposalIdMatches|orderOwned|readProposal` on decisions) return no match, run directly against the committed files.
- **Committed in:** `aeb23a2` (Task 1 commit), `94eeec7` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 1 — each necessary for the plan's own stated behavior or its own acceptance criteria to actually hold, none a scope expansion).
**Impact on plan:** No file outside this plan's declared `files_modified` list was touched; no new store export, library or architectural change was introduced. All four fixes reconcile a gap between the plan's prose and either the actual shipped interface (`SyncItemResult.server`'s real shape, `ApplyOutcome.code`'s `null` case) or the plan's own acceptance criteria (the identifier-absence greps).

## Known Stubs

None — every field in every response is derived from a real `applyItem` call or a real read of `lib/store/memory.ts`; no hardcoded placeholder or empty-by-construction value reaches a response.

## Issues Encountered

- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts`, `scripts/claims-audit.mjs` and `docs/CAPTURE-PLAN-SEED.md` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --short` before and after both task commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here. `node scripts/claims-audit.mjs` (run as part of `npm run verify`) still exits 0 against the modified script.
- Carried forward from 03-07 and 03-08, unchanged by this plan: `lib/http/contract.ts`'s `HEADER_TABLE` entry for `X-CAP-Account` still lists its `routes` field as `["POST /api/session"]` only, now six routes further stale (this plan's three routes all emit it too). `ok()`'s runtime guard checks only a header name's presence in `HEADER_TABLE`, not its `routes` field, so nothing fails at build or request time. `lib/http/contract.ts` is outside this plan's `files_modified` scope; flagging again for whichever later plan next touches it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `app/api/verify/route.ts`, `app/api/captures/route.ts` and `app/api/decisions/route.ts` are all in place, type-check clean, and build dynamic (`ƒ`); the eleven routes shipped across 03-07 through 03-09 now cover every route this phase names except `sync` and `walk/[orderId]` (03-10 onward).
- `npm run verify` passes end-to-end (21/21 steps, 246 fixture-suite tests, 148 unit-suite tests); no blockers for 03-10.
- The HTTP-level proof of these three routes' actual behavior (curl checks B, C and D; FR-17's authored-match negative set; FR-18's `asset_not_in_order`; FR-19's `media_too_large`; FR-23's actor-field negative set; FR-27's unknown-vs-unowned-proposal identity) rides plan 03-13's `scripts/server/route-suite.proof.mjs`, per 03-VALIDATION.md's own routing map — this plan's own verification covers the type/build/static-analysis layer plus the already-shipped unit-level proof of the underlying writer (`lib/reconcile/apply.test.mjs`, 03-05) and the authored/proposal modules (`lib/verify/authored.test.mjs`, `lib/proposals/derive.test.mjs`, 03-04).
- Carried forward from 03-07 and 03-08 and restated above: `HEADER_TABLE`'s `X-CAP-Account` entry's `routes` field is stale by three more routes as of this plan; still a documentation-only gap, still deferred to whichever plan next edits `lib/http/contract.ts`.

## Self-Check: PASSED

All `key-files.created` verified present on disk: `app/api/verify/route.ts` (153 lines, well above the plan's 70-line minimum), `app/api/captures/route.ts` (140 lines), `app/api/decisions/route.ts` (152 lines, well above the plan's 65-line minimum). Both commit hashes (`aeb23a2`, `94eeec7`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -1 --format=%B` immediately after each commit). Neither commit shows any file deletion (`git diff --diff-filter=D` empty for both). `npm run verify` re-run end-to-end after Task 2: all 21 steps exited 0. Every one of Task 1's and Task 2's own `<acceptance_criteria>` greps was re-run directly against the final files and passed exactly as specified: no `runtime`/`dynamic` export anywhere under `app/api/`; no `authored.ts`/`derive.ts`/`authoredMatch`/`authoredProposals` in verify/captures; `pick(` appears at least four times across verify/captures (4 real calls plus comment mentions); `orderOwned` precedes the `SyncItem` construction in verify; no `X-CAP-Verification`/`X-CAP-Proposals` in captures; `purpose: "verify"` assigned by the route in verify; no `NextResponse`/`new Response(` in any of the three files; `notFoundProposal()` appears exactly once in decisions; no `proposalIdMatches`/`orderOwned`/`readProposal` in decisions; `decided_by` appears only in comments in decisions, never as an assignment; `pick(` in decisions matches against `ACCEPTED_BODY_FIELDS.decisions`. The plan's own full `<verification>` block was re-run directly: `npx next typegen && npx tsc --noEmit && npm run build` all exit 0; the repo-wide `runtime`/`dynamic` grep across `app/api/` returns no match; `node scripts/check-governed.mjs` exits 0; `npm run verify` exits 0 end to end.

---
*Phase: 03-server-seam*
*Completed: 2026-09-17*
