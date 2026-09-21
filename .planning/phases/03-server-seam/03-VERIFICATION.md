---
phase: 03-server-seam
verified: 2026-09-21T12:45:00Z
status: human_needed
score: 5/6 must-haves verified (1 process must-have requires a human decision)
overrides_applied: 0
requirements_coverage: 23/23 satisfied
human_verification:
  - test: "Decide whether the 03-16 must-have \"a person ran the checks\" is satisfied by the recorded run, or personally re-run `B=<preview-url> bash scripts/curl-suite.sh` from your own shell to close it literally."
    expected: "Either an explicit acceptance (an override recorded in this file's frontmatter) or a fresh curl-suite.sh run executed by the developer's own hands, with output appended to docs/analysis/server-seam-verification.md."
    why_human: "This is not a programmatically verifiable fact about the codebase — it is a provenance/policy judgment about who is permitted to discharge a human-verification checkpoint on the developer's behalf. The artifact itself (docs/analysis/server-seam-verification.md, \"## What was run\") states plainly that the orchestrator agent, not the developer's own hands, executed the push, the dashboard lookups and the curl-suite.sh run — at the developer's explicit instruction (\"run it from this shell\"). The HTTP evidence captured is real and independently reproducible either way; only the identity of who typed the commands is in question, and only the developer can decide whether their own instruction to the agent discharges plan 03-16's literal must-have."
---

# Phase 3: Server seam Verification Report

**Phase Goal:** Every enforced claim is enforced server-side and reproducible from a shell: identity from the session, the work order as the only authorisation, uniform not-found, one writer, one attribution producer, one responder, and no path that creates a finding (ROADMAP.md §Phase 3).
**Verified:** 2026-09-21T12:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification (no prior `03-VERIFICATION.md` existed; the previous attempt was cut off by a session rate limit before any file was written)

## Method

Goal-backward, adversarial: for every claim below I read the actual source (not just the SUMMARY prose describing it), and where the claim was mechanically checkable I re-ran the check myself against the live working tree rather than trusting a logged result. Concretely, in this pass I:

- Read ROADMAP.md §Phase 3 in full (Goal, 5 Success Criteria, Depends-on) and REQUIREMENTS.md's 23 named requirement entries plus the Traceability table.
- Read 03-CONTEXT.md in full (Decisions D-01–D-12, Claude's-Discretion items, Deferred Ideas) and 03-RESEARCH.md's §Common Pitfalls and §Assumptions Log.
- Read both human-facing analysis artifacts (`docs/analysis/server-seam-verification.md`, `docs/analysis/single-writer-non-bypassability.md`) in full.
- Read every one of the 16 PLAN.md files' `must_haves` frontmatter (truths, artifacts, key_links) and every one of the 16 SUMMARY.md files' Deviations-from-Plan sections in full.
- Read, in full, every production module the phase ships: all 12 `app/api/**/route.ts` files, `lib/http/{respond,contract}.ts`, `lib/access/scope.ts`, `lib/session/{cookie,key}.ts`, `lib/attribution/index.ts`, `lib/store/memory.ts`, `lib/reconcile/{apply,validate}.ts`, `lib/proposals/derive.ts`, `lib/verify/authored.ts`, `lib/walk/payload.ts`, `lib/limits/index.ts`, `lib/copy/conflicts.ts`, `scripts/check-single-writer.mjs`, `scripts/check-actor-field.mjs`, `scripts/verify.mjs`, `scripts/curl-suite.sh`, `scripts/server/route-suite.proof.mjs`, `next.config.ts`, `vercel.json`, `.github/workflows/verify.yml`.
- Ran, live, myself, against the current working tree (not the log file): `check-single-writer.mjs`, `check-actor-field.mjs`, `check-accepted-fields.mjs`, `check-fixture-inputs.mjs`, `check-named-packages.mjs`, `check-non-bypassability.mjs`, `check-structure.mjs`, `check-register-isolation.mjs`, `check-headers.mjs`, `check-governed.mjs`, `claims-audit.mjs`, `check-fixture-hash.mjs`, `check-tokens.mjs` — all exited 0 with `Problems: 0`.
- Ran, live, myself: `node --test "lib/**/*.test.mjs"` (164/164 pass) and `node --test "scripts/**/*.test.mjs"` (302/302 pass) — 466 total, matching the orchestrator's claimed `npm test` gate exactly.
- Per the orchestrator's explicit guardrail, did **not** run `npm run verify` or start a production server myself (it would spawn `next build` + `next start`, taking minutes and risking a stray listener). For the one proof that requires a running server — `route-suite.proof.mjs`'s curl A–H + five negative sets — I instead read its full 989-line source and confirmed the local `scripts/.check/03-16-verify.log` (26/26 steps, "All steps exited 0") names the identical 14 test titles this source defines, in the identical order, and cross-checked that against the independently-produced GitHub Actions run (35464913133) and Vercel Preview build log excerpts quoted verbatim in `docs/analysis/server-seam-verification.md`.
- Cross-referenced every `requirements:` ID declared across all 16 plans against REQUIREMENTS.md's own text and its §Traceability table.
- Scanned every phase-owned file for debt markers (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`) and stub patterns (`return null`/`return {}`/empty arrow functions) — zero debt markers found; every `return null`/empty-return hit traced to a legitimate, non-stub code path (documented per-hit below).
- Confirmed `git log`, `git status`, and `git diff` on the two known out-of-scope files against HEAD, per the orchestrator's brief.

## Goal Achievement

### Observable Truths

| # | Truth (source) | Status | Evidence |
|---|------|--------|----------|
| 1 | **SC1** — The curl suite A–H passes against a deployment from an ordinary shell | ✓ VERIFIED | `docs/analysis/server-seam-verification.md` records a live run against Vercel Preview `dpl_Bv8xHd9B8kknPQ3jM2thTZ8bivPT` (commit `2babfd8`): "47 passed, 0 failed," every check A–H present. `scripts/curl-suite.sh` (502 lines, read in full) genuinely issues real HTTP requests with real 64-hex sha256/UUID bodies — not a stub. The identical eight checks are independently implemented in `scripts/server/route-suite.proof.mjs` (989 lines, read in full); the local log (`scripts/.check/03-16-verify.log`) shows all 14 named tests (A, B, C, D, E, F, D-04, G, the five REQ-FR negative sets, H) passing, matching this source file's `test()` names one-to-one. Independently corroborated: GitHub Actions run 35464913133 and the Vercel build log both show `route-suite ... tests 14 / pass 14 / fail 0`. |
| 2 | **SC2** — The negative test sets of FR-4, FR-6, FR-23, FR-24, FR-27 pass | ✓ VERIFIED | Read each test in `route-suite.proof.mjs`: FR-4 (query param / `X-Account` header / raw-GET-with-body / combined — all four leave `x-cap-account: acc-mabaso` unchanged, unauthenticated → 401); FR-6 (byte-identical unowned-vs-fabricated across order-read, open, close, verify, decisions, sync, via `compareResponses`); FR-23 (forged `captured_by`/`decided_by`/`account_id` = `"acc-vanwyk"` asserted absent from capture/decision/open/sync/walk/hours response text); FR-24 (every proposal state ∈ {open,accepted,rejected,superseded}; ownership-before-state proven via a sync item naming an unowned order **and** a fabricated proposal, which resolves `unknown_proposal`, not `order_not_found`); FR-27 (unknown / unowned / wrong-observation decisions produce byte-identical `unknown_proposal` responses). All present in the local log as passing. |
| 3 | **SC3** — Universal headers, `{error,detail}` envelope, no `proxy.ts`, and the named build rules all run inside `npm run verify` | ✓ VERIFIED | `lib/http/respond.ts` (`withUniversalHeaders`) stamps `Cache-Control: no-store`, `X-CAP-Store`, `X-CAP-Instance` on every `ok()`/`fail()` response, and `fail()` refuses any caller header at all. `scripts/verify.mjs`'s `STEPS` array (read in full) contains exactly 26 entries including `check-structure` (middleware-absence, ×2), `check-single-writer`, `check-actor-field`, `check-fixture-inputs`, `check-named-packages`, `check-accepted-fields`, `check-non-bypassability` — all six ran live by me just now with `Problems: 0`. `find . -name "proxy.ts"` / `check-structure.mjs`'s own forbidden-file sweep confirm none exists. |
| 4 | **SC4** — `lib/reconcile/apply.ts` is the sole writer for online routes and `/api/sync` alike, check order session→ownership→idempotency→shape→state, refusals retained, capture fields exactly `{sha256,bytes,mime,duration_ms}` + bounded thumbnail | ✓ VERIFIED | Read `apply.ts` (563 lines) top to bottom: `applyItem()`'s five numbered steps run in exactly that order; every exit path (including the no-session case, `account_id: null`) funnels through `finalize()`, which calls `writeAttempt()` unconditionally (FR-60). `check-single-writer.mjs` (run live, 0 problems) proves no other file imports any of `lib/store/memory.ts`'s ten mutating exports, directly or transitively. `ACCEPTED_PAYLOAD_FIELDS.capture` = exactly `[asset_id,kind,purpose,captured_at,sha256,bytes,mime,duration_ms,thumb]` — no image/audio byte field anywhere. |
| 5 | **SC5** — Media/thumbnail/store caps and TTL exported from `lib/limits`; offline clock segment clamped to `max(issued_at, last_contact)`, claim and measured offset both retained | ✓ VERIFIED | `lib/limits/index.ts` (129 lines, read in full) exports `THUMB_MAX_ENCODED_BYTES`, `CAPTURE_MAX_DECLARED_BYTES`, `VOICE_MAX_DURATION_MS`, `STORE_TTL_SECONDS`, `STORE_GLOBAL_OBJECT_MAX`, all five per-account caps, both queued-clock tolerances. `apply.ts`'s `order_open` queued branch computes `floorMs = lastContactMs !== null ? max(issuedAtMs,lastContactMs) : issuedAtMs`, clamps `openedAtMs = max(claimedMs, floorMs)`, and writes both `device_claimed_opened_at` and `device_offset_s` — neither replaces the other. The route-suite's "D-04" test (present in the local log as passing) round-trips this through `POST /api/sync` and reads it back via `GET /api/hours` with `source: "device_reconciled"`. |
| 6 | **Plan 03-16 process must-have** — "The phase does not close on the automated suite alone — **a person ran the checks** and wrote down what happened" | ✗ **FAILED (as literally written) — escalated to human** | `docs/analysis/server-seam-verification.md`'s own "## What was run" section states, unprompted and in its own voice: *"Both mechanical steps that produced this record... were carried out by the orchestrator agent, from a Git Bash shell on Windows, at the developer's explicit instruction... not typed by a person's own hands."* Taken literally, a person did not run the checks; an agent did, under explicit human direction. The document itself flags this as a different claim from D-09b's and its own `T-3-78` threat-register entry's "a person" framing, and says so rather than letting it blur — which is itself a point in the project's favour (the honesty module the project is about did not fail here), but it does not make the literal must-have true. See **Human Verification Required** below — this is the one item this report asks the developer to resolve. |

**Score:** 5/6 truths verified programmatically. The 6th is a process/provenance question no amount of source-reading can settle, by construction.

### Required Artifacts

All 32 artifacts declared across the 16 plans' `must_haves.artifacts` blocks exist and clear their declared `min_lines` floor by a wide margin (2×–5× typical). Levels 1–2 (exists, substantive) verified by direct read for every `lib/`, `app/api/`, and the human-facing `docs/analysis/` files; Levels 1–2 for the remaining `scripts/check-*.mjs` files verified by direct execution against the real repository (all exited 0, `Problems: 0`) plus source read of the two most structurally important ones (`check-single-writer.mjs`, `check-actor-field.mjs`). Level 3 (wired) verified via `check-single-writer.mjs`'s own import-graph walk (0 problems) and by direct inspection of every route's import list.

| Artifact | Plan | Min lines | Actual | Status |
|---|---|---|---|---|
| `lib/limits/index.ts` | 03-01 | 60 | 129 | ✓ VERIFIED |
| `lib/session/key.ts` | 03-01 | 30 | 51 | ✓ VERIFIED |
| `lib/copy/conflicts.ts` | 03-01 | — | 184 | ✓ VERIFIED |
| `lib/store/memory.ts` | 03-02 | 180 | 686 | ✓ VERIFIED |
| `lib/http/contract.ts` | 03-02 | 90 | 262 | ✓ VERIFIED |
| `lib/http/respond.ts` | 03-02 | 70 | 151 | ✓ VERIFIED |
| `lib/session/cookie.ts` | 03-03 | 110 | 171 | ✓ VERIFIED |
| `lib/attribution/index.ts` | 03-03 | 40 | 51 | ✓ VERIFIED |
| `lib/access/scope.ts` | 03-03 | 80 | 97 | ✓ VERIFIED |
| `lib/verify/authored.ts` | 03-04 | 60 | 86 | ✓ VERIFIED |
| `lib/proposals/derive.ts` | 03-04 | 100 | 200 | ✓ VERIFIED |
| `lib/reconcile/validate.ts` | 03-05 | 200 | 445 | ✓ VERIFIED |
| `lib/reconcile/apply.ts` | 03-05 | 280 | 563 | ✓ VERIFIED |
| `scripts/check-fixture-inputs.mjs` | 03-06 | 150 | 331 | ✓ VERIFIED (ran live, 0 problems) |
| `scripts/check-named-packages.mjs` | 03-06 | 90 | 226 | ✓ VERIFIED (ran live, 0 problems) |
| `app/api/health/route.ts` | 03-07 | contains `connection` | present | ✓ VERIFIED |
| `app/api/session/route.ts` | 03-07 | 90 | 93 | ✓ VERIFIED |
| `app/api/orders/[id]/route.ts` | 03-07 | 70 | 103 | ✓ VERIFIED |
| `app/api/orders/[id]/open/route.ts` | 03-08 | 55 | 127 | ✓ VERIFIED |
| `app/api/hours/route.ts` | 03-08 | 55 | 70 | ✓ VERIFIED |
| `app/api/verify/route.ts` | 03-09 | 70 | 153 | ✓ VERIFIED |
| `app/api/decisions/route.ts` | 03-09 | 65 | 152 | ✓ VERIFIED |
| `app/api/sync/route.ts` | 03-10 | 110 | 181 | ✓ VERIFIED |
| `lib/walk/payload.ts` | 03-11 | 140 | 202 | ✓ VERIFIED |
| `app/api/walk/[orderId]/route.ts` | 03-11 | 45 | 63 | ✓ VERIFIED |
| `scripts/check-single-writer.mjs` | 03-12 | 150 | 364 | ✓ VERIFIED (ran live, 0 problems) |
| `scripts/check-actor-field.mjs` | 03-12 | 150 | 473 | ✓ VERIFIED (ran live, 0 problems) |
| `scripts/check-accepted-fields.mjs` | 03-12 | 130 | 339 | ✓ VERIFIED (ran live, 0 problems) |
| `scripts/server/route-assertions.mjs` | 03-13 | 160 | 269 | ✓ VERIFIED |
| `scripts/server/route-suite.proof.mjs` | 03-13 | 320 | 989 | ✓ VERIFIED |
| `docs/analysis/single-writer-non-bypassability.md` | 03-14 | 150 | 390 | ✓ VERIFIED |
| `scripts/curl-suite.sh` | 03-14 | 120 | 502 | ✓ VERIFIED |
| `scripts/check-non-bypassability.mjs` | 03-15 | 130 | 338 | ✓ VERIFIED (ran live, 0 problems) |
| `scripts/check-non-bypassability.test.mjs` | 03-15 | 110 | 179 | ✓ VERIFIED (part of the 302-test live run) |
| `docs/analysis/server-seam-verification.md` | 03-16 | contains `X-CAP-Instance` | present, many times | ✓ VERIFIED |

`app/api/orders/route.ts` and `app/api/orders/[id]/close/route.ts` are declared in 03-07's/03-08's `files_modified` but not separately listed under `artifacts:` — both were read in full regardless and are substantive, correctly-wired, non-stub route handlers.

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Every `app/api/**/route.ts` write handler | `lib/reconcile/apply.ts` | `applyItem(sessionResult, item)` | ✓ WIRED | Confirmed by direct import-list read of all 7 write routes plus `check-single-writer.mjs` Assertion 1/2 (0 problems). |
| `lib/reconcile/apply.ts` | `lib/store/memory.ts` (mutators) | direct import of 10 named exports | ✓ WIRED, EXCLUSIVE | `check-single-writer.mjs` proves no other file reaches them, directly or transitively. |
| Every route | `lib/http/respond.ts` | `ok()`/`fail()`/`notFound()` | ✓ WIRED, EXCLUSIVE | `check-single-writer.mjs` Assertion 3: no other file references `NextResponse` or `new Response(`. |
| Every route | `lib/session/cookie.ts` → `lib/attribution/index.ts` | `deriveAccount(readSession(request))` | ✓ WIRED | Read directly in all 12 route files. |
| `lib/session/cookie.ts`, `lib/proposals/derive.ts` | `lib/session/key.ts` | `signingKey()` | ✓ WIRED, SHARED | One resolver, confirmed by import in both files. |
| `app/api/decisions/route.ts` | `lib/proposals/derive.ts` (via `apply.ts`) | `proposalIdMatches` re-derives the HMAC at the ownership step | ✓ WIRED | Route itself never imports `derive.ts` directly (by design — `apply.ts` is the sole caller), confirmed via `check-fixture-inputs.mjs` import-graph check (0 problems). |
| `scripts/curl-suite.sh` | `docs/analysis/server-seam-verification.md` | recorded output of one run against a named deployment | ✓ WIRED | 47/0 pass output pasted verbatim in the doc, cross-checked against the script's own `PASS`/`FAIL` line format. |
| `docs/analysis/server-seam-verification.md` | `scripts/server/route-assertions.mjs` (`HEADER_EXCLUSIONS`) | reconciliation against observed platform headers | ✓ WIRED | Confirmed both `age` and `x-robots-tag` entries exist in `route-assertions.mjs` today, each citing the recorded run, matching the doc's own reconciliation table. |
| Every route/env-read/store-writer | `docs/analysis/single-writer-non-bypassability.md` | literal string-membership sweep | ✓ WIRED | `check-non-bypassability.mjs` ran live, 0 problems. |

### Data-Flow Trace (Level 4)

This phase is a pure server/API layer (no rendering component consumes this data yet — that is Phase 4/5), so the traditional "hardcoded prop" failure mode does not apply. The applicable question is whether each route's response is built from a real store/fixture read rather than a static or empty stand-in.

| Route | Data source | Produces real data | Status |
|---|---|---|---|
| `GET /api/orders` | `ordersFor(account)` + `readClocksForAccount` | Yes — fixture-backed, per-account; route-suite check A confirms `acc-mabaso` gets exactly `["wo-0142","wo-0151"]`, `acc-naidoo` gets `["wo-0137"]` | ✓ FLOWING |
| `POST /api/verify` | `authoredMatch()` + `authoredProposals()` over real observation fixtures | Yes — check B confirms 3 real proposals with non-empty `observation_id`s | ✓ FLOWING |
| `GET /api/hours` | `readClocksForAccount` → `computeElapsedSeconds` (recomputed every read, never a stored stale value) | Yes — check G confirms `elapsed_s >= 1` after a real 1.1s wait | ✓ FLOWING |
| `GET /api/walk/[orderId]` | `buildWalkPayload` — pure function over store + fixtures | Yes — check E confirms an accepted and a rejected proposal both read back correctly partitioned | ✓ FLOWING |
| `GET /api/health` | `storeStats()`, `uptimeSeconds()`, `BOOT_ID` | Yes — check H confirms `X-CAP-Instance` changes after an actual process restart | ✓ FLOWING |

No route returns a static `[]`/`{}` where a real value belongs; the one intentionally-empty field (`WalkPayload.referrals: []`) is explicitly scoped to Phase 9 by D-03 and documented as such in 03-11-SUMMARY.md, not a disguised gap.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Single-writer rule holds against real repo | `node scripts/check-single-writer.mjs` | `Problems: 0` | ✓ PASS |
| Actor-field rule holds against real repo | `node scripts/check-actor-field.mjs` | `Problems: 0` | ✓ PASS |
| Accepted-field enumerations hold | `node scripts/check-accepted-fields.mjs` | `Problems: 0` | ✓ PASS |
| No-model / declared-inputs rule holds | `node scripts/check-fixture-inputs.mjs` | `Problems: 0` | ✓ PASS |
| No forbidden package names | `node scripts/check-named-packages.mjs` | `Problems: 0` (2 documented transitive exceptions: `sharp`, `zod`) | ✓ PASS |
| Non-bypassability enumeration complete | `node scripts/check-non-bypassability.mjs` | `Problems: 0` | ✓ PASS |
| No middleware/proxy, structure holds | `node scripts/check-structure.mjs` | `Problems: 0` | ✓ PASS |
| Register isolation holds | `node scripts/check-register-isolation.mjs` | `Problems: 0` | ✓ PASS |
| Declared headers match D-04 | `node scripts/check-headers.mjs` | `Problems: 0` | ✓ PASS |
| No second governed-sentence literal | `node scripts/check-governed.mjs` | `Problems: 0` | ✓ PASS |
| No prohibited claim strings | `node scripts/claims-audit.mjs` | `Hits: 0` | ✓ PASS |
| Fixture content hash holds | `node scripts/check-fixture-hash.mjs` | `Problems: 0` | ✓ PASS |
| Full `lib/` unit suite | `node --test "lib/**/*.test.mjs"` | 164/164 pass | ✓ PASS |
| Full `scripts/` fixture suite | `node --test "scripts/**/*.test.mjs"` | 302/302 pass | ✓ PASS |

Not run by me (would require `next build` + a listening server, against explicit orchestrator instruction): `route-suite.proof.mjs` and `curl-suite.sh` themselves. Their pass/fail is evidenced instead by full source read + the local log's 26/26 step result + independent GitHub Actions/Vercel corroboration, all cited above.

### Probe Execution

Not applicable. No `scripts/*/tests/probe-*.sh` convention exists in this project and none is declared in any Phase 3 plan or summary — this is not a migration/tooling phase. **Step 7c: SKIPPED (no probes declared or found).**

### Requirements Coverage

All 23 requirement IDs the phase declares are accounted for; REQUIREMENTS.md's own §Traceability table maps the identical 23 IDs to Phase 3 and none other — **no orphaned requirements**.

| Requirement | Source Plan(s) | Status | Evidence |
|---|---|---|---|
| REQ-FR-1 | 03-03, 03-07 | ✓ SATISFIED | `sessionCookieOptions()` sets HttpOnly/SameSite=Lax/Secure-in-prod; `POST /api/session` refuses an unresolved `persona_id` with `unknown_persona` (404); `pick()` admits only `persona_id`. |
| REQ-FR-2 | 03-07 | ✓ SATISFIED | `GET /api/session` → account or `fail("no_session")` (401). |
| REQ-FR-3 | 03-07 | ✓ SATISFIED | `DELETE` clears unconditionally; statelessness limitation documented at `cookie.ts`'s own definition. |
| REQ-FR-4 | 03-03, 03-07, 03-13 | ✓ SATISFIED | `ordersFor(account)` is the sole lookup; route-suite's REQ-FR-4 test proves query-param/header/body/combined shaping attempts all leave the response and `X-CAP-Account` unchanged; no session → 401. |
| REQ-FR-5 | 03-07, 03-11 | ✓ SATISFIED | Order detail returns order+assets(stripped)+clock+verifications+proposals+decisions. |
| REQ-FR-6 | 03-02, 03-13, 03-16 | ✓ SATISFIED | `orderOwned()` resolves ownership before existence; route-suite's REQ-FR-6 test byte-compares 6 routes; live-deployment capture in `server-seam-verification.md` shows the real 401→404 path. |
| REQ-FR-7 | 03-05, 03-08 | ✓ SATISFIED | Re-open of a running segment returns `duplicate`, no second `writeClockSegment` call. |
| REQ-FR-8 | 03-01, 03-05, 03-08 | ✓ SATISFIED | `closeClockSegment()` returns `false` (→ `not_open`, 409) when nothing is open. |
| REQ-FR-9 | 03-05 | ✓ SATISFIED | `writeClockSegment` pushes onto `existing.segments`, never replaces. |
| REQ-FR-10 | 03-01, 03-08, 03-12 | ✓ SATISFIED | `computeElapsedSeconds` sums segments server-side; `POST /api/hours` hand-written 405 (avoids Pitfall 2); no enumeration anywhere carries `elapsed_s`/`hours`/`duration_s`. |
| REQ-FR-11 | 03-01, 03-05, 03-13 | ✓ SATISFIED | Clamp to `max(issued_at,last_contact)`; both `device_claimed_opened_at` and `device_offset_s` retained; proved by the "D-04" route-suite test. |
| REQ-FR-15 | 03-05, 03-09, 03-12 | ✓ SATISFIED (server half; client half is Phase 5 per CONTEXT.md's split-binding note) | No raw-image field in any enumeration; `THUMB_MAX_ENCODED_BYTES`/`CAPTURE_MAX_DECLARED_BYTES` enforced server-side. |
| REQ-FR-16 | 03-05, 03-09, 03-12 | ✓ SATISFIED (server half) | `duration_ms` accepted only on `kind:"voice"`; no `audio` field anywhere. |
| REQ-FR-17 | 03-04, 03-06, 03-09 | ✓ SATISFIED | `authoredMatch(assetId,fixtureSet)` — exactly 2 params, `confidence` always `null`; `check-fixture-inputs.mjs` and `check-named-packages.mjs` both pass live; `X-CAP-Verification: authored` header. |
| REQ-FR-18 | 03-05, 03-09 | ✓ SATISFIED | `!assetInOrder` → `asset_not_in_order` (409), proved live by route-suite check C. |
| REQ-FR-19 | 03-01, 03-05 | ✓ SATISFIED | `tooLarge()` refusals with an actionable sentence ("Retake"). |
| REQ-FR-21 | 03-04, 03-09, 03-13 | ✓ SATISFIED | `deriveProposalId` = bare HMAC-SHA256/base64url, no sequence; reproducibility-without-shared-state documented in the non-bypassability doc. |
| REQ-FR-23 | 03-03, 03-12, 03-13 | ✓ SATISFIED | `deriveAccount()` sole producer; `check-actor-field.mjs` passes live; route-suite's REQ-FR-23 test proves a forged actor string appears nowhere across 6 response surfaces. |
| REQ-FR-24 | 03-05, 03-12, 03-14, 03-15 | ✓ SATISFIED | `check-single-writer.mjs` and `check-non-bypassability.mjs` both pass live; `TERMINAL_STATES` structurally closes the state set. |
| REQ-FR-27 | 03-04, 03-09, 03-13 | ✓ SATISFIED | `notFoundProposal()` takes no parameter; route-suite's REQ-FR-27 test byte-compares unknown/unowned/wrong-observation. |
| REQ-FR-57 | 03-03, 03-12, 03-14, 03-15 | ✓ SATISFIED | `lib/access/scope.ts` is the sole accessor; `check-actor-field.mjs`'s RBAC sweep (Assertion 4) passes live; `check-structure.mjs` confirms no middleware/proxy. |
| REQ-FR-61 | 03-05, 03-12 | ✓ SATISFIED | No enumeration anywhere carries an observation/grade/provenance field; `check-accepted-fields.mjs` passes live. |
| REQ-NFR-F1 | 03-02, 03-07–03-11, 03-16 | ✓ SATISFIED | `withUniversalHeaders` stamps all 3 on every response; live-deployment header capture in `server-seam-verification.md` confirms it holds on Vercel too. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD`/`FIXME`/`XXX` debt markers | — | **None found** across `app/`, `lib/`, and every phase-owned `scripts/` file. |
| `lib/http/contract.ts` | HEADER_TABLE, `X-CAP-Account` entry | Documentation-only `routes` field lists `["POST /api/session"]`, now stale by 8 further emitting routes (flagged as a known, carried-forward staleness in 03-08 through 03-11's own SUMMARYs) | ℹ️ INFO | Cosmetic only — confirmed via grep that no code or test anywhere reads `HeaderTableEntry.routes` at runtime; `ok()`'s guard checks only header-name membership. Does not affect any Success Criterion or requirement. |
| `lib/copy/conflicts.ts` | `clock_skew.sentence` | Static illustrative text ("...disagrees with the server by 3 h 12 m...") served verbatim regardless of the real computed offset | ℹ️ INFO | Quoted verbatim from the locked `EXPERIENCE.md` design contract (precedence 1) per 03-05-PLAN.md's own explicit instruction ("imported... never quoted"); 03-01-SUMMARY.md flagged this for future reconsideration but no requirement or Success Criterion demands a dynamically-accurate figure in the refusal *text* — FR-11's actual requirement (retain both the device claim and the measured offset) is met structurally via `device_claimed_opened_at`/`device_offset_s`, which the sentence does not need to restate. Not a phase gap; noted for whoever next revisits `EXPERIENCE.md`'s copy. |
| — | — | Stub patterns (`return null`/`return {}`/empty handlers) | — | 8 hits, all traced individually: 5 in `lib/reconcile/validate.ts` are a validator's correct "no refusal" return (`ShapeRefusal \| null`); 1 in `lib/access/scope.ts` and 2 in `lib/attribution/index.ts` are legitimate early-return guards inside otherwise-substantive functions I read in full. **None is a stub.** |

### Human Verification Required

### 1. Plan 03-16's "a person ran the checks" must-have

**Test:** Read `docs/analysis/server-seam-verification.md`'s own "## What was run" section, then decide: does the orchestrator agent executing `git push`, the Vercel-dashboard lookups, and `bash scripts/curl-suite.sh`, at your own explicit real-time instruction ("run it from this shell"), satisfy plan 03-16's must-have "a person ran the checks" — or do you want to personally re-run `B=<preview-url> bash scripts/curl-suite.sh` from your own shell to close it literally?

**Expected:** A decision recorded either as (a) an override added to this file's frontmatter accepting the agent-executed run as sufficient, with your name and today's date, or (b) a fresh, personally-typed run whose output is appended to `docs/analysis/server-seam-verification.md`.

**Why human:** This is a provenance/policy judgment, not a fact discoverable in the codebase — the document itself already discloses, unprompted, that an agent (not your own hands) executed the mechanical steps. The HTTP evidence is real and reproducible either way; only whether your own explicit instruction to the agent counts as "you ran the checks" is in question, and only you can decide that.

**Suggested override, if you accept the recorded run as sufficient:**

```yaml
overrides:
  - must_have: "a person ran the checks"
    reason: "The orchestrator agent executed the mechanical steps (push, dashboard lookup, curl-suite.sh) at my own explicit real-time instruction, and the document discloses this plainly rather than presenting it as a human-typed run. The captured HTTP evidence is genuine and I have reviewed it."
    accepted_by: "<your name>"
    accepted_at: "<ISO timestamp>"
```

### Open Items (Not Phase Gaps)

These are real, currently-open items in this repository, but neither is a Phase 3 deliverable gap — both are reported here only because the orchestrator's brief asked for them to be surfaced, not silently passed over.

1. **`[SECURITY]` blocker in STATE.md** — `lib/data/types.ts` and `scripts/claims-audit.mjs` carry uncommitted, comment-only edits traced to a concurrent session in the sibling `../ipv-demo` repository (STATE.md lines 201–203). Confirmed via `git diff` that both diffs are comment/rule-text changes unrelated to anything Phase 3 ships (a `CitedFact.liveRead` doc-comment rewrite and a `claims-audit.mjs` IoT/SCADA rule rewording), confirmed unchanged by every Phase 3 plan from 03-08 onward via their own repeated `git status --short` checks, and confirmed still present, unstaged, at HEAD `bb72ebf` as of this verification. This needs your decision (commit, revert, or otherwise resolve in both repos) before Phase 4 begins, but it is not something Phase 3's own plans caused or can fix.
2. **Assumptions Log A1** (`03-RESEARCH.md`, `single-writer-non-bypassability.md` §Open items) — whether Vercel Fluid Compute shares one Node.js module scope across *concurrent* (not just sequential) invocations on the same instance is still unmeasured; no Phase 3 Success Criterion or requirement depends on this, and no plan or later-phase text yet schedules the concurrency smoke test that would close it. Carried forward as a known gap in what this phase's proofs can show, not a failure of what they claim to show.

### Gaps Summary

No code-level gap was found. Every one of the 5 ROADMAP Success Criteria and all 23 requirement IDs are satisfied by real, substantive, wired, non-stub code, corroborated by tests I ran live myself (466/466) and by independent CI/Vercel evidence. The single open item is procedural: plan 03-16's own must-have text demands literal human execution of the reviewer-facing curl suite, and the phase's own evidence honestly documents that this run was agent-executed under explicit human direction rather than human-executed. That gap is not in the server seam itself — it is in who gets credit for pressing enter — and only the developer can close it, either by accepting it via override or by spending the two minutes to re-run it personally.

---

_Verified: 2026-09-21T12:45:00Z_
_Verifier: Claude (gsd-verifier)_
