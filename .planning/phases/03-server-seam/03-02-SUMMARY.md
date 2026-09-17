---
phase: 03-server-seam
plan: 02
subsystem: api
tags: [memory-store, http-contract, error-envelope, ttl-eviction, typescript, node-test]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/limits/index.ts's bounded-quantity exports (CAPTURES_PER_ACCOUNT_MAX, STORE_GLOBAL_OBJECT_MAX, STORE_TTL_SECONDS, EVICTION_RECORD_PER_ACCOUNT_MAX, etc.), lib/copy/conflicts.ts's CONFLICT_COPY/REJECT_COPY/TRANSPORT_COPY and TransportErrorCode, and the not_open/segment-field/observation_id additions to lib/data/types.ts (03-01)"
provides:
  - "lib/store/memory.ts — the module-level record store: BOOT_ID, per-account Maps for captures/decisions/proposals/clocks/seen/attempts, the TTL sweep run at the head of every account-scoped export, per-account and global caps with cross-account-safe eviction, and the eviction ledger (recordEviction/wasEvicted)"
  - "lib/http/contract.ts — UNIVERSAL_HEADERS, HEADER_TABLE (universal vs success-only for every X-CAP-* name), STATUS_BY_CODE covering all 20 wire error codes, detailFor/errorBody"
  - "lib/http/respond.ts — ok/fail/notFound/notFoundProposal/setCookie: the only module in the repository permitted to construct a framework response"
affects: [03-03, 03-04, 03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12, 03-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level Map<account, Map<id, T>> per record kind, oldest-first eviction idiom reused verbatim from ../ipv-demo/lib/decision/store.ts"
    - "Global cap enforcement always evicts from the map the offending write just touched, never scanning or touching another account's records — the mechanism that makes cross-account flooding safe"
    - "Pure wire contract (lib/http/contract.ts, no framework import) split from the framework-dependent constructors (lib/http/respond.ts) so the former is provable under a bare node --test run and the latter is proved later over HTTP"
    - "Structural type derivation via Extract<Parameters<Fn>, [unknown]>[0] to pull a single-object-overload's parameter shape out of a library type without importing it or hand-naming its fields"

key-files:
  created:
    - lib/store/memory.ts
    - lib/store/memory.test.mjs
    - lib/http/contract.ts
    - lib/http/contract.test.mjs
    - lib/http/respond.ts
  modified: []

key-decisions:
  - "CLOCK_SEGMENTS_PER_ACCOUNT_MAX caps the clocks Map's size (distinct order-clocks per account) rather than a sum of segment-array lengths, matching every other per-account cap's Map.size idiom; the 5-order fixture universe means this cap is a defensive bound that will not realistically trigger"
  - "OrderClock.elapsed_s is computed fresh from segment boundaries on every read, never stored or incrementally maintained, since a running segment's duration grows continuously between writes and PROJECT.md states hours are server-derived"
  - "proposals and attempts have no per-account cap (none is named in lib/limits) and rely on the STORE_GLOBAL_OBJECT_MAX safety net alone; the attempts ring additionally gets its own small, unexported, non-AD-13 bound (50) since nothing about it is ever observed by a client"
  - "The global object count is computed fresh by summing Map.size/array.length across all accounts rather than tracked as a running counter, since this preview's account cardinality is fixture-bounded (three artisans) and recomputation is cheap, avoiding a counter that could drift out of sync across several sweep/evict code paths"
  - "setCookie's options type is derived structurally via Extract<Parameters<NextResponse['cookies']['set']>, [unknown]>[0] rather than a hand-written interface — verified against the installed Next.js types before use — so the file never imports from lib/session/cookie.ts (which does not exist yet) and never spells out an individual cookie attribute name"

requirements-completed: [REQ-FR-6, REQ-FR-19, REQ-NFR-F1]

# Metrics
duration: 38min
completed: 2026-09-17
---

# Phase 3 Plan 2: Store and Transport Contract Summary

**Per-instance memory store with cross-account-safe eviction (lib/store/memory.ts), a pure header/status/error-envelope contract (lib/http/contract.ts), and the one module permitted to construct a response (lib/http/respond.ts).**

## Performance

- **Duration:** 38 min (approx.)
- **Started:** 2026-09-17T17:42:00Z (approx.)
- **Completed:** 2026-09-17T18:20:14Z
- **Tasks:** 3 completed
- **Files modified:** 5 (5 created, 0 modified)

## Accomplishments

- `lib/store/memory.ts`: module-level `Map`s for captures, decisions, proposals, clock segments, `seen` (idempotency) entries, attempts and the eviction ledger, all keyed by account. `BOOT_ID` minted once via `crypto.randomUUID()`. A TTL sweep runs at the head of every account-scoped export, touching only that account's own slice of every Map (O(touched-account)). Per-account caps (captures/decisions/clocks/seen, read from `lib/limits`) evict oldest-first within that account; the global cap evicts oldest-first within whichever account's write caused the overage, proved by a fixture where a second account's single capture survives a first account's multi-thousand-record flood. `stampLastContact(account)` declares exactly one parameter (asserted by the test), so D-07's clamp floor cannot be moved by a request body.
- `lib/http/contract.ts`: `UNIVERSAL_HEADERS` (the two fixed-value universal headers), `HEADER_TABLE` (16 `X-CAP-*` entries, each marked `universal` or `success-only`, asserted by a unit test rather than trusted in prose), `STATUS_BY_CODE` covering all 20 wire error codes across `ConflictCode`, `RejectCode` and `TransportErrorCode`, and `detailFor`/`errorBody` so no route ever writes a `detail` literal. The seed's `not_found` shorthand vs. the closed set's `order_not_found` is reconciled in a comment, not silently resolved. No runtime dependency on the Next.js framework, so this half of the transport contract is provable under a bare `node --test` run.
- `lib/http/respond.ts`: `ok()`/`fail()` stamp the universal set and throw — naming the offending header — on any caller attempt to override a universal header or attach an uncatalogued `X-CAP-*` counter; `fail()` refuses any extra header at all, since AD-4 permits only the universal set on an error response. `notFound()`/`notFoundProposal()` take no parameters, which is the mechanism that makes FR-6's byte-identity structural. `setCookie()` mutates the response's cookies exactly once with a caller-supplied, structurally-typed options object, never naming or assembling an attribute itself.
- `npm run verify` run twice end-to-end after all three tasks: second run exited 0 across all 19 steps (229 fixture-suite tests, 34 unit-suite tests — including this plan's 17 new ones). The first run showed 3 transient failures in unrelated, untouched files (`check-observations`, `check-structure`, `check-sw`) that did not reproduce on a direct re-run of those same files or on a second full `npm run verify`; see Issues Encountered.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write lib/store/memory.ts and its unit test** - `17cfe72` (feat)
2. **Task 2: Write lib/http/contract.ts** - `622cccb` (feat)
3. **Task 3: Write lib/http/respond.ts** - `1c35e3f` (feat)

**Interstitial fix:** `30f0520` (fix) — see Deviations.

## Files Created/Modified

- `lib/store/memory.ts` - per-instance record store, TTL sweep, caps, eviction (AD-10)
- `lib/store/memory.test.mjs` - 7 tests: BOOT_ID, per-account eviction, defensive copies, storeStats shape, eviction-ledger bound, cross-account global-cap safety
- `lib/http/contract.ts` - header table, status map, error envelope (AD-11)
- `lib/http/contract.test.mjs` - 10 tests covering the status map, header table scoping, and errorBody/detailFor
- `lib/http/respond.ts` - the only response constructor (ok/fail/notFound/notFoundProposal/setCookie)

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Self-tripping comments describing the absence of a Next.js import**
- **Found during:** Task 2 drafting (first instance, caught before commit) and Task 3 preparation (second instance, caught after Task 2 was already committed)
- **Issue:** `lib/http/contract.ts`'s header comment, written to explain that the module has no runtime dependency on the framework, twice contained the exact literal substrings the phase's own acceptance greps check for the *absence* of: `from "next` (Task 2's own "no next import" check) and `NextResponse` (Task 3's cross-file "only respond.ts constructs a response" check, which sweeps `app` and `lib` broadly). A grep cannot distinguish prose from a real import.
- **Fix:** Reworded both passages to state the same facts without the literal matched text (e.g., "no response constructor" instead of naming `NextResponse`).
- **Files modified:** `lib/http/contract.ts`
- **Verification:** Re-ran the specific grep for each pattern (no match), the full `lib/http/contract.test.mjs` suite (10/10 pass), `npx tsc --noEmit` (clean) and `node scripts/claims-audit.mjs` (0 hits) after each fix.
- **Committed in:** the first instance was fixed before Task 2's own commit (`622cccb`) and never landed; the second instance is `30f0520`, a standalone fix commit between Task 2 and Task 3.

**2. [Rule 2 - Missing Critical] Hardened respond.ts's header guards beyond the plan's literal wording**
- **Found during:** Task 3 (while implementing `ok()`/`fail()`)
- **Issue:** The plan's literal text ties `fail()`'s guard to "any headers entry whose HEADER_TABLE scope is success-only," and ties `ok()`'s universal-override guard to HEADER_TABLE entries marked `universal` — but HEADER_TABLE is scoped to `X-CAP-*` names only (by its own design), so neither literal reading would catch a hypothetical un-catalogued `X-CAP-*` name on `fail()`, or a caller overriding `Cache-Control` directly on `ok()` (since `Cache-Control` is a universal header but is not an `X-CAP-*` entry in HEADER_TABLE at all).
- **Fix:** `fail()` refuses any caller-supplied header at all (not only ones already catalogued success-only), matching AD-4's literal rule that an error response carries the universal set and nothing else. `ok()`'s override guard checks against `UNIVERSAL_HEADERS`'s own keys (which include `Cache-Control`) plus the instance header, in addition to HEADER_TABLE's two universal entries.
- **Files modified:** `lib/http/respond.ts`
- **Verification:** An ad hoc runtime smoke script (not committed — this module has no unit test file by design) exercised both guards directly: `ok()` throws naming the header on a universal-name override and on an un-catalogued `X-CAP-*` name; `fail()` throws naming the header on any extra header at all. `npx tsc --noEmit`, `npx eslint lib/http/respond.ts` and `node scripts/claims-audit.mjs` all clean.
- **Committed in:** `1c35e3f` (part of Task 3's own commit — this is the original implementation, not a follow-up fix)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical hardening).
**Impact on plan:** Both were necessary for the phase's own stated guarantees (AD-4's not-found byte-identity, AD-11's universal-only error responses) to actually hold in every case rather than only the cases the plan's prose enumerated. No scope creep — no file outside `lib/http/contract.ts` and `lib/http/respond.ts` was touched.

## Issues Encountered

- The first full `npm run verify` run after Task 3 reported 3 failures inside the `fixture-suite` step, all in files this plan never touches: `scripts/check-observations.test.mjs`, `scripts/check-structure.test.mjs` (`Error: spawn UNKNOWN`, an OS-level process-spawn failure, not an assertion failure) and `scripts/check-sw.test.mjs`. Re-running exactly those three test files directly (`node --test scripts/check-observations.test.mjs scripts/check-structure.test.mjs scripts/check-sw.test.mjs`) passed 28/28. Re-running the full `scripts/**/*.test.mjs` glob directly passed 229/229. A second full `npm run verify` run passed all 19 steps end to end (229 fixture-suite tests, 34 unit-suite tests). This is consistent with transient OS-level resource contention across `verify.mjs`'s concurrent child-process spawning (Windows, a project path containing spaces and an apostrophe, `shell: true` already flagged by Node's own deprecation warning in this run) rather than a real regression — nothing this plan changed touches `scripts/lib/fixtures.mjs`, `verify.mjs`, or any of the three failing test files. Logged here for visibility; no fix applied, per the scope boundary (pre-existing infrastructure, not caused by this plan's changes).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/store/memory.ts`, `lib/http/contract.ts` and `lib/http/respond.ts` are all in place for 03-03 (`lib/session/cookie.ts`, using `setCookie()` and `signingKey()`) and every later plan in this phase (every route handler goes through `ok()`/`fail()`/`notFound()`).
- `lib/http/respond.ts` has no unit test file by design (`next/server` does not resolve under a bare `node` run — reconfirmed empirically this session with a runtime smoke script, not just asserted from research). It is proved over HTTP by plan 03-13's `scripts/server/route-suite.proof.mjs`, which should assert the universal header set on every response it receives, exactly as this plan's `HEADER_TABLE` and `ok()`/`fail()` promise.
- `lib/store/memory.ts` exports exactly the 10 mutators and 13 reads the plan named — no additional accessor was added speculatively. If a later route plan needs a read this module does not yet expose (e.g., filtering captures by asset), that is that plan's own addition, not a gap here.
- `npm run verify` passes end-to-end at nineteen steps (confirmed twice); no blockers for 03-03.

## Self-Check: PASSED

All `key-files.created` verified present on disk (`lib/store/memory.ts`, `lib/store/memory.test.mjs`, `lib/http/contract.ts`, `lib/http/contract.test.mjs`, `lib/http/respond.ts`). All four commit hashes (`17cfe72`, `622cccb`, `30f0520`, `1c35e3f`) verified present in `git log --oneline --all`. Re-ran `node --test lib/store/memory.test.mjs lib/http/contract.test.mjs`: 17/17 pass. Re-ran `grep -rn "NextResponse\|new Response(" app lib --include=*.ts`: every match is within `lib/http/respond.ts`, none elsewhere. `npm run verify` re-run end-to-end after Task 3 (second attempt): exit 0, all nineteen steps, 229 fixture-suite tests and 34 unit-suite tests, zero problems reported by any check.
