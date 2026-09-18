---
phase: 03-server-seam
plan: 12
subsystem: build-gate
tags: [single-writer, actor-field, accepted-fields, build-rule, import-graph, node-test, fixture-proof]

# Dependency graph
requires:
  - phase: 03-server-seam
    provides: "lib/store/memory.ts's ten named mutating exports and its read-only accessors (03-02); lib/http/respond.ts as the only response constructor (03-02); lib/attribution/index.ts's deriveAccount, the one actor-field producer (03-03); lib/access/scope.ts's ORDER_IDS_BY_ARTISAN import and orderOwned (03-03); lib/reconcile/validate.ts's ACCEPTED_BODY_FIELDS/ACCEPTED_PAYLOAD_FIELDS enumerations (03-05); lib/reconcile/apply.ts as the sole writer (03-05); the twelve app/api routes and their pick()-against-ACCEPTED_BODY_FIELDS convention (03-07 through 03-11); scripts/check-register-isolation.mjs's import-graph-walk helpers and scripts/check-headers.mjs's expected-table comparison (Phase 1)"
provides:
  - "scripts/check-single-writer.mjs — AD-1's single-writer assertion (direct and transitive import-graph reach) plus AD-4/AD-11's responder monopoly"
  - "scripts/check-actor-field.mjs — AD-3's single-producer assertion, FR-23's route-schema ban, FR-61's enumeration ban, FR-57's RBAC companion sweep"
  - "scripts/check-accepted-fields.mjs — AD-20/FR-61's cross-checked accepted-field enumeration, FR-15/FR-16's capture-shape assertion"
  - "scripts/verify.mjs grown from twenty-one to twenty-four steps"
affects: ["any future plan or commit that modifies lib/store/memory.ts, lib/attribution/, lib/reconcile/, lib/access/scope.ts, or any app/api route — all three new gate steps run on every commit"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RHS-safety banlist (body/payload/request/raw/searchParams/a quoted literal) over an exact-string allowlist for a security-relevant assignment sweep, so a compound-but-safe expression (a ternary built from two safe primitives) does not self-trip the check"
    - "pick()-call-site detection, not bare POST-export presence, as the signal that a file is a write route requiring enumeration — a hand-written method-not-allowed refusal that accepts no field is correctly exempt"
    - "Two independent statements of the same accepted-field table, cross-checked in both directions (scripts/check-headers.mjs's declared-but-unexpected pattern, reused for AD-20)"

key-files:
  created:
    - scripts/check-single-writer.mjs
    - scripts/check-single-writer.test.mjs
    - scripts/check-actor-field.mjs
    - scripts/check-actor-field.test.mjs
    - scripts/check-accepted-fields.mjs
    - scripts/check-accepted-fields.test.mjs
  modified:
    - scripts/verify.mjs
    - scripts/verify.test.mjs

key-decisions:
  - "check-actor-field.mjs's PERMITTED_RHS is enforced as a banlist over unsafe sources (body/payload/request/raw/searchParams/a quoted literal), not exact-string equality against account.account_id/acting.account_id/null — the real lib/reconcile/apply.ts assigns account_id through a ternary (account ? account.account_id : null) that no single permitted string equals"
  - "check-actor-field.mjs's account_id member is not file-restricted to PERMITTED_ASSIGNERS (unlike captured_by/decided_by/raised_by) — it is a keying field legitimately constructed in lib/session/cookie.ts, lib/store/memory.ts, lib/walk/payload.ts and three app/api routes' fallback OrderClock literals, always copied from an already-derived account, never invented; RHS safety is the operative restriction for it everywhere"
  - "check-actor-field.mjs's route-schema sweep (Assertion 2) flags an actor field only when read from body/payload/raw/request or named as a bare quoted string, not any appearance at all — a bare sweep would flag the account.account_id property read that legitimately appears in nearly every route's response headers"
  - "check-accepted-fields.mjs's 'unenumerated write route' detection (Assertion 2) triggers on a pick(..., ACCEPTED_BODY_FIELDS.<key>) call site naming a key outside EXPECTED_ROUTES, not on bare POST-export presence — app/api/hours/route.ts's own hand-written 405 has a POST export but never calls pick(), by 03-08's own documented design, and accepts no field to enumerate"
  - "check-single-writer.mjs's specifier extraction is a new extractNamedImports helper rather than a verbatim reuse of check-register-isolation.mjs's extractSpecifiers — the single-writer rule must know which names crossed an import boundary (to tell a mutating export from a read-only accessor), a question extractSpecifiers's whole-module-only extraction cannot answer; toPosix/toRel/walkSourceFiles/loadAliasPrefix/resolveImport are reused verbatim"

requirements-completed: [REQ-FR-10, REQ-FR-15, REQ-FR-16, REQ-FR-23, REQ-FR-24, REQ-FR-57, REQ-FR-61]

# Metrics
duration: multi-session
completed: 2026-09-18
---

# Phase 3 Plan 12: Single-Writer, Actor-Field and Accepted-Fields Build Rules Summary

**Three new fail-fast build rules — one writer, one attribution producer, one accepted-field enumeration per route — turn AD-1/AD-3/AD-20 from analysis claims into gate steps, growing `npm run verify` from twenty-one to twenty-four steps, each shipped with a fixture proving it exits non-zero.**

## Performance

- **Duration:** multi-session — approx. 32 min of initial work (2026-09-18T00:02Z–00:34Z: all three tasks implemented, tested and committed) plus a short resume session after a Claude Code process restart (2026-09-18T17:30Z onward: re-verification, this SUMMARY, and state tracking)
- **Started:** 2026-09-18T00:02:04Z (approx.)
- **Completed:** 2026-09-18 (see final commit timestamp)
- **Tasks:** 3 completed
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- `scripts/check-single-writer.mjs`: reuses `check-register-isolation.mjs`'s `toPosix`/`toRel`/`walkSourceFiles`/`loadAliasPrefix`/`resolveImport` verbatim, paired with a new `extractNamedImports` helper that extracts which names crossed an import boundary (needed because this rule must distinguish a mutating export from a read-only accessor, a question the register-isolation check's whole-module extraction never had to answer). Three assertions: (1) no file other than `lib/reconcile/apply.ts` imports any of the store's ten named mutating exports directly; (2) no file under `app/api` reaches a mutating export transitively through a helper, proved by a BFS that treats `lib/reconcile/apply.ts` as a sink (never expanded past, since every route legitimately imports it); (3) no file other than `lib/http/respond.ts` references `NextResponse` or calls `new Response(`, swept with comment lines stripped so the check's own documentation cannot self-trip it. Eight fixture tests, including a read-only-reach-is-not-a-violation proof and a comment-only-mention proof.
- `scripts/check-actor-field.mjs`: sweeps `app/api` and `lib` (type/interface declarations and comment lines blanked first) for an object-literal assignment to `captured_by`, `decided_by`, `raised_by` or `account_id`. The first three are restricted by file to `lib/attribution/index.ts` and `lib/reconcile/apply.ts`; `account_id` is restricted everywhere by the safety of its own right-hand side (see Deviations — this departs from the plan's literal exact-string `PERMITTED_RHS`, for a reason verified against the real, already-shipped code before the departure was made). A second assertion sweeps `app/api` for an actor field read off the request itself; a third dynamically imports `lib/reconcile/validate.ts` and compares its two accepted-field records against `ACTOR_FIELDS` by whole name, documenting `claimed_account_id`/`capture_client_id`/`observation_id` as lookalikes that must pass; a fourth sweeps for `rbac_tier` outside a comment under `app/api`/`lib/access` and for any importer of `ORDER_IDS_BY_ARTISAN` other than `lib/access/scope.ts`. Twelve fixture tests, including one proving the real repository's own ternary-shaped assignment passes and one proving the AD-5 identity pair passes alongside a bare `account_id` failing in the same enumeration.
- `scripts/check-accepted-fields.mjs`: `EXPECTED_ROUTES` (file + accepted-body-fields per write route) and `EXPECTED_PAYLOADS` (accepted-payload-fields per `SyncItemKind`) are written as literals, independently of `lib/reconcile/validate.ts`, then dynamically imported and compared against that module's own `ACCEPTED_BODY_FIELDS`/`ACCEPTED_PAYLOAD_FIELDS` in both directions — a missing field and a declared-but-unexpected field are both failures. A second assertion requires every `EXPECTED_ROUTES` file to call `pick(...)` naming its own key, and flags any `pick(..., ACCEPTED_BODY_FIELDS.<key>)` call site under `app/api` whose key is not enumerated (see Deviations for why this is keyed off the `pick()` call site rather than POST-export presence). A third sweeps both real and expected tables for the forbidden vocabulary (actor fields, `observation`, `grade`, `provenance`, `elapsed_s`, `hours`, `duration_s`) by whole name; a fourth asserts the capture payload table's own shape. Ten fixture tests, all built from one shared "clean baseline" tree (all seven routes correctly wired) so each test mutates exactly one thing.
- `scripts/verify.mjs`: the three new steps join `STEPS` immediately after `check-named-packages` and before `next-build`, none `vercelExcluded`. `scripts/verify.test.mjs`: `EXPECTED_ORDER` carries the three new ids at that position (twenty-four total); the order test's name and header comment renamed from "twenty-one" to "twenty-four"; `resolveSteps` length assertions updated (`VERCEL: "1"`: 19→22; the three unset-or-distractor cases: 21→24). `STEPS.length` was 21 at the start of this plan, matching the interfaces block's stated baseline exactly — no reconciliation discrepancy to record.
- `npm run verify` run end-to-end twice (once before the process restart, once after, to confirm the on-disk state survived it unchanged): both runs exited 0 across all twenty-four steps, including `next build` (all thirteen routes correctly marked dynamic `ƒ`/static `○`/partial-prerender `◐`), `check-contrast` and the full `check-wcag` scan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/check-single-writer.mjs with its fixture test** - `a6e4850` (feat)
2. **Task 2: Write scripts/check-actor-field.mjs with its fixture test** - `38a6843` (feat)
3. **Task 3: Write scripts/check-accepted-fields.mjs, its fixture test, and wire all three rules into verify** - `9854cd3` (feat)

## Files Created/Modified

- `scripts/check-single-writer.mjs` - AD-1's single-writer assertion (direct + transitive) and AD-4/AD-11's responder monopoly
- `scripts/check-single-writer.test.mjs` - 8 tests, one per violation class plus the real repository
- `scripts/check-actor-field.mjs` - AD-3's single-producer assertion, FR-23/FR-61/FR-57's companion assertions
- `scripts/check-actor-field.test.mjs` - 12 tests, one per violation class plus the real repository
- `scripts/check-accepted-fields.mjs` - AD-20/FR-61's cross-checked enumeration, FR-15/FR-16's capture shape
- `scripts/check-accepted-fields.test.mjs` - 10 tests built from a shared clean-baseline fixture tree
- `scripts/verify.mjs` - three new gate steps, twenty-four total
- `scripts/verify.test.mjs` - `EXPECTED_ORDER`, naming and length assertions updated to match

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] check-actor-field.mjs's PERMITTED_RHS redesigned from an exact-string allowlist to an unsafe-source banlist**
- **Found during:** Task 2, before running the check against the real repository (a deliberate pre-commit grep of every `ACTOR_FIELDS` occurrence across `lib/` and `app/api`, following this project's own established discipline of grepping before finalizing a sweep — 03-06's precedent for the identical class of issue)
- **Issue:** the plan's literal `PERMITTED_RHS` (`account.account_id`, `acting.account_id`, `null`, checked by exact-string equality) would fail against the real, already-shipped `lib/reconcile/apply.ts`, whose `finalize()` assigns `account_id: account ? account.account_id : null` — a ternary combining two of the three permitted forms, equal to none of them as a whole string. Separately, `account_id` (unlike `captured_by`/`decided_by`/`raised_by`) is a keying field legitimately constructed outside `PERMITTED_ASSIGNERS` entirely: `lib/session/cookie.ts`'s `mintSession` (`account_id: accountId`), `lib/store/memory.ts`'s `writeClockSegment` (`account_id: account`), `lib/walk/payload.ts` and three `app/api` routes' fallback `OrderClock` literals (`account_id: account.account_id` each), and `lib/attribution/index.ts`'s own `deriveAccount` (`account_id: result.session.account_id` — the one producer AD-3 names, whose own right-hand side is not in the plan's literal three-item list either). A literal, file-restricted, exact-RHS-string implementation would report all of these, failing Task 2's own acceptance criterion that the check exit 0 against the real repository.
- **Fix:** `captured_by`/`decided_by`/`raised_by` remain file-restricted to `PERMITTED_ASSIGNERS` exactly as the plan specifies (zero legitimate uses elsewhere in this repository). `account_id` is not file-restricted; every assignment of any of the four `ACTOR_FIELDS` is instead checked by an "unsafe RHS" banlist (a reference to `body`/`payload`/`request`/`raw`/`searchParams`, or a quoted literal) rather than an exact-string allowlist. This catches the same concrete threat the plan's own fixture list names (`decided_by: body.decided_by`) without tripping on a compound-but-safe expression built only from safe primitives. Every real site named above was individually verified safe under this mechanism before it was adopted.
- **Files modified:** `scripts/check-actor-field.mjs`
- **Verification:** `node scripts/check-actor-field.mjs` exits 0 against the real repository (`Problems: 0`); the fixture suite includes a dedicated case proving the real repository's own ternary shape passes, alongside the plan's own required case proving `body.decided_by` still fails.
- **Committed in:** `38a6843` (Task 2 commit)

**2. [Rule 1 - Bug] check-actor-field.mjs's route-schema sweep (Assertion 2) narrowed from "any occurrence" to a request-source banlist**
- **Found during:** Task 2, same pre-commit verification pass
- **Issue:** the plan's literal text ("Sweep every file under `app/api` for any `ACTOR_FIELDS` member appearing at all outside a comment") would flag the `account.account_id` property read that appears in nearly every route in this phase (every `X-CAP-Account` header, every `claimed_account_id: account.account_id` assignment) — a bare word-boundary sweep for `account_id` cannot distinguish a safe read off the already-authenticated `ActingAccount` object from an unsafe read off the request body, and the former is pervasive and correct.
- **Fix:** Assertion 2 flags an actor field only when it appears to be read from the request itself (`body.FIELD`, `payload.FIELD`, `raw.FIELD`, `request.FIELD`, or a bare quoted `"FIELD"` string — matching the plan's own "no route schema contains one" framing) rather than any appearance whatsoever.
- **Files modified:** `scripts/check-actor-field.mjs`
- **Verification:** `node scripts/check-actor-field.mjs` exits 0 against the real repository; an additional fixture beyond the plan's own required list proves a route reading `body.decided_by` directly is still caught.
- **Committed in:** `38a6843` (Task 2 commit)

**3. [Rule 1 - Bug] check-accepted-fields.mjs's "unenumerated write route" detection scoped to a pick()-against-ACCEPTED_BODY_FIELDS call site, not bare POST-export presence**
- **Found during:** Task 3, before running the check against the real repository
- **Issue:** the plan's literal text flags "a file [that] exists under `app/api` with a `POST` export that is not in `EXPECTED_ROUTES` at all." `app/api/hours/route.ts` ships exactly this shape today: a deliberate, hand-written `POST` handler returning `fail("method_not_allowed")` without ever parsing a body or calling `pick()` (03-08-SUMMARY.md's own key-decision documents this as intentional). `hours` was never meant to be one of the plan's seven `EXPECTED_ROUTES` entries. A literal "any POST export" sweep would report this already-correct route as an unenumerated write route, failing Task 3's own acceptance criterion.
- **Fix:** the "new write route" half of Assertion 2 triggers on a `pick(body, ACCEPTED_BODY_FIELDS.<key>)` call site whose `<key>` is absent from `EXPECTED_ROUTES`, not on the mere presence of a `POST` export. A route that never calls `pick()` against the accepted-field enumeration accepts no field at all and has nothing to enumerate — exactly `hours/route.ts`'s own documented behaviour. Every other write route in this phase (all seven in `EXPECTED_ROUTES`) does call `pick()` this way, so the mechanism still fires for a genuinely new write surface.
- **Files modified:** `scripts/check-accepted-fields.mjs`
- **Verification:** `node scripts/check-accepted-fields.mjs` exits 0 against the real repository; the fixture suite includes both the plan's required `referrals` case (non-zero) and an added case proving `hours/route.ts`'s own shape (zero).
- **Committed in:** `9854cd3` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — each necessary for a check's own acceptance criterion, "exits 0 against the real repository," to actually hold against already-shipped, correct code; none weakens what the rule catches for a genuinely new violation, and none was discovered after a commit — all three were found and fixed during each script's own pre-commit verification pass, following this project's established discipline of grepping the real repository before finalizing a sweep).
**Impact on plan:** No file outside this plan's declared `files_modified` list was touched; no new library, export or architectural change was introduced. All three deviations reconcile a gap between the plan's prose (an exact-string allowlist; "any occurrence"; "any POST export") and the actual, already-correct shape the real codebase takes for a field or a route this plan's own read_first pointed at.

## Known Stubs

None — all three check scripts are complete, real, wired into the real gate; no placeholder logic, no mock data, no deferred implementation.

## Issues Encountered

- The Claude Code process running this executor restarted partway through the close-out steps, after all three task commits had already landed (confirmed via `git log` and `git status --porcelain` matching the orchestrator's own on-disk snapshot exactly before any further work resumed). No production code was affected; this SUMMARY, the state-tracking commit and the full `npm run verify` re-run were all completed in the resumed session. Recorded here for the same reason Phase 01 Plan 09's identical "multi-session" duration was recorded — visibility, not a defect in the plan's own execution.
- `scripts/check-actor-field.mjs` and `scripts/check-accepted-fields.mjs` both trigger Node's `MODULE_TYPELESS_PACKAGE_JSON` warning on their dynamic `import()` of `lib/reconcile/validate.ts` (no `"type"` field in `package.json`). This is the identical, pre-existing, non-fatal warning `scripts/check-fixture-hash.mjs` already produces for its own dynamic import of `lib/data/fixtures.ts` (02-07's precedent) — it goes to stderr, does not affect the exit code, and `npm run verify` passes with it present. Not fixed, since `package.json`'s module type is outside this plan's `files_modified` scope and changing it would risk the CommonJS/ESM interop this repository's scripts and Next.js build both depend on.
- Confirmed the pre-existing, unstaged modifications to `lib/data/types.ts`, `scripts/claims-audit.mjs` and `docs/CAPTURE-PLAN-SEED.md` (the `[SECURITY]` blocker recorded in STATE.md) are unchanged by this plan: `git status --porcelain` before, during and after this plan's three commits shows the same three files modified and the same three `docs/` paths untracked, none staged, edited or reverted here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `scripts/check-single-writer.mjs`, `scripts/check-actor-field.mjs` and `scripts/check-accepted-fields.mjs` all run inside `npm run verify` (twenty-four steps total), on every local run and in the GitHub Actions `verify` job — none carries `vercelExcluded`.
- All twelve `app/api` routes shipped in 03-07 through 03-11 pass every one of this plan's three new rules unmodified; no route file was edited by this plan.
- `npm run verify` passes end-to-end at twenty-four steps (confirmed twice, once before and once after the process restart); no blockers for 03-13 onward (the route-suite/curl proofs and the non-bypassability document this phase still names).

## Self-Check: PASSED

All `key-files.created` verified present on disk (`scripts/check-single-writer.mjs`, `scripts/check-single-writer.test.mjs`, `scripts/check-actor-field.mjs`, `scripts/check-actor-field.test.mjs`, `scripts/check-accepted-fields.mjs`, `scripts/check-accepted-fields.test.mjs`). All three task commit hashes (`a6e4850`, `38a6843`, `9854cd3`) verified present in `git log --oneline --all`, each carrying an intact `Co-Authored-By`/`Claude-Session` trailer (confirmed via `git log -3 --format=%H%n%B`). `npm run verify` re-run end-to-end after the process restart: exit 0, all twenty-four steps, zero problems reported by any check. `node -e "import('./scripts/verify.mjs').then(m=>console.log(m.STEPS.length))"` prints `24`; the slice from `check-named-packages` to `next-build` prints exactly `check-named-packages,check-single-writer,check-actor-field,check-accepted-fields`. `node --test scripts/check-single-writer.test.mjs scripts/check-actor-field.test.mjs scripts/check-accepted-fields.test.mjs scripts/verify.test.mjs` together: 59/59 pass. `grep -n "twenty-one" scripts/verify.test.mjs` returns no match.

---
*Phase: 03-server-seam*
*Completed: 2026-09-18*
