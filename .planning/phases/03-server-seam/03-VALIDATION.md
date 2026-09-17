---
phase: 3
slug: server-seam
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-17
updated: 2026-09-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `03-RESEARCH.md` §Validation Architecture; the per-task rows are completed by the planner from the PLAN.md task list.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + `node:assert/strict` (built-in, Node 24) — the project's sole framework; no new dependency. Unit tests import the `.ts` modules through Node's native type stripping, as the Phase 2 fixture tests already do. |
| **Config file** | none. `scripts/verify.mjs`'s `fixture-suite` STEP runs `node --test scripts/**/*.test.mjs` before `next build`. **Verified this session: that glob DOES match nested directories** — it already collects `scripts/lib/server.test.mjs`. The route suite is therefore named `scripts/server/route-suite.proof.mjs`, which the glob cannot reach, and gets its own STEPS entry after `next-build` (plan 03-13). Its pure half, `scripts/server/route-assertions.test.mjs`, deliberately *is* a `.test.mjs` so the existing glob runs it before the build. A new `unit-suite` STEP (plan 03-01) runs `node --test lib/**/*.test.mjs`, with a `verify.test.mjs` assertion that the glob is non-empty, because an empty glob exits 0 under `node --test`. |
| **Quick run command** | `node --test lib/**/*.test.mjs` — the unit proofs of `limits`, `key`, `conflicts`, `memory`, `contract`, `cookie`, `attribution`, `scope`, `authored`, `derive`, `validate`, `apply` and `walk/payload`; no build, no server, sub-second |
| **Full suite command** | `npm run verify` — twenty-six steps by the end of the phase: typegen, `tsc`, eslint, the existing checks, the unit suite, the six new source-side rules, `next build`, the route suite against a spawned `next start`, contrast; the axe scan in the GitHub `verify` job only |
| **Estimated runtime** | ~2 seconds quick; ~3–4 minutes full (Phase 2 measured ~1 minute; the route suite adds a production-server start, the A–H assertions, the five negative sets and one restart for check H) |

---

## Sampling Rate

- **After every task commit:** Run `node --test lib/**/*.test.mjs` (plus `node --test scripts/<new-check>.test.mjs` when the task added a build rule, and `npx tsc --noEmit` when `lib/data/types.ts` changed)
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green **and** `scripts/curl-suite.sh` must have been run against a Preview or Production deployment with its output recorded in `docs/analysis/server-seam-verification.md` (CONTEXT D-09b, plan 03-16); the local route suite proves byte-identity under the locally observed header set only, and the live run is what closes research Pitfall 3
- **Three tasks carry the full gate as their own `<automated>` command** — 3-13-02, 3-13-03 and 3-15-02 — because each one's claim is about the built server or the gate itself. Each now runs a sub-second interim assertion first (a `node --check` parse, the pure route-assertions self-test, or the STEPS-shape probe), so a developer gets a red result before the build starts; the gate run behind it is the honest proof and stays.
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | REQ-FR-11, REQ-FR-19 | T-3-01 / T-3-03 / T-3-16 | Every cap is a named export; client target strictly below server ceiling; production refuses without `CAPTURE_SESSION_KEY` | unit | `node --test lib/limits/index.test.mjs && node --test lib/session/key.test.mjs && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | REQ-FR-8, REQ-FR-11 | T-3-04 | `not_open` in the closed set; retained segment fields; `Proposal.observation_id` present so AD-5's triple can be reconstructed from a decision request; the unit-suite step cannot pass on an empty glob | unit + config | `node --test scripts/check-fixture-shape.test.mjs && node scripts/check-fixture-hash.mjs && node --test scripts/verify.test.mjs && npx tsc --noEmit` | ✅ | ⬜ pending |
| 3-01-03 | 01 | 1 | REQ-FR-8 | T-3-02 / T-3-05 | One sentence per code, one `order_not_found` sentence only, no code without a sentence | unit | `node --test lib/copy/conflicts.test.mjs && node scripts/check-governed.mjs && node scripts/claims-audit.mjs && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | REQ-FR-19, REQ-NFR-F1 | T-3-07 / T-3-08 / T-3-10 | Per-account and global caps, oldest-first within the offending account; `stampLastContact` takes no time argument; every act writes an attempt | unit | `node --test lib/store/memory.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | REQ-NFR-F1, REQ-FR-6 | T-3-06 | Every `X-CAP-*` counter marked success-only; one status map; one error envelope | unit | `node --test lib/http/contract.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | REQ-NFR-F1, REQ-FR-6 | T-3-09 | One Response constructor; `notFound()` takes no parameters; `fail` throws on a success-only header | source assertion | `npx tsc --noEmit && npx eslint lib/http/respond.ts && node scripts/claims-audit.mjs` | ✅ | ⬜ pending |
| 3-03-01 | 03 | 2 | REQ-FR-1 | T-3-11 / T-3-12 | HMAC session verified before the payload is parsed; `timingSafeEqual` behind a length guard; no `Set-Cookie` string assembly | unit | `node --test lib/session/cookie.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | REQ-FR-23 | T-3-13 | One producer, one parameter, no default; no request value reachable | unit | `node --test lib/attribution/index.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 2 | REQ-FR-4, REQ-FR-18, REQ-FR-57 | T-3-14 / T-3-15 | Ownership decided before existence; account non-optional; no `rbac_tier` read | unit | `node --test lib/access/scope.test.mjs && node scripts/check-register-isolation.mjs && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | REQ-FR-17 | T-3-20 | Declared inputs exactly `(assetId, fixtureSet)`; null confidence; no capture-payload identifier in source | unit | `node --test lib/verify/authored.test.mjs && node scripts/check-governed.mjs && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 2 | REQ-FR-21, REQ-FR-27 | T-3-17 / T-3-18 / T-3-19 / T-3-21 | Bare-HMAC derived id, re-derived from the account plus the item's `capture_client_id` and `observation_id` with no store read; fabricated ids, foreign ids and unreconstructable triples fail identically; constant-time compare | unit | `node --test lib/proposals/derive.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-05-01 | 05 | 3 | REQ-FR-15, REQ-FR-16, REQ-FR-19, REQ-FR-61 | T-3-23 / T-3-27 | Strict D-CONV shapes; enumerated fields dropped at parse, with AD-5's two identity fields enumerated by name; media ceilings refused before the write path | unit | `node --test lib/reconcile/validate.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-05-02 | 05 | 3 | REQ-FR-24 | T-3-22 / T-3-25 / T-3-28 | Fixed check order; refusals written as retained attempts; `seen` keyed per account; closed result-state set | unit | `node --test lib/reconcile/apply.test.mjs && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 | ⬜ pending |
| 3-05-03 | 05 | 3 | REQ-FR-7, REQ-FR-8, REQ-FR-9, REQ-FR-11 | T-3-24 / T-3-26 | Idempotent open, `not_open` on close, reopen retains priors, queued claim clamped with claim and offset both retained | unit | `node --test lib/reconcile/apply.test.mjs && node scripts/check-governed.mjs && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-06-01 | 06 | 3 | REQ-FR-17 | T-3-29 / T-3-31 | Two declared inputs asserted by text; no path from the authored modules to a capture payload | build rule | `node scripts/check-fixture-inputs.mjs && node --test scripts/check-fixture-inputs.test.mjs` | ❌ W0 | ⬜ pending |
| 3-06-02 | 06 | 3 | REQ-FR-17 | T-3-30 / T-3-SC | No vision, OCR or inference library in the manifest or the lockfile; a missing lockfile is a failure | build rule | `node scripts/check-named-packages.mjs && node --test scripts/check-named-packages.test.mjs && node --test scripts/verify.test.mjs` | ❌ W0 | ⬜ pending |
| 3-07-01 | 07 | 4 | REQ-FR-1, REQ-FR-2, REQ-FR-3, REQ-NFR-F1 | T-3-34 / T-3-35 | `connection()` first on `/api/health`; cookie attributes from one module; no identity value persisted | build + route | `npx next typegen && npx tsc --noEmit && node scripts/check-structure.mjs && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-07-02 | 07 | 4 | REQ-FR-4, REQ-FR-5, REQ-FR-57 | T-3-32 / T-3-33 / T-3-36 | No reader for a query parameter, body field or header naming an account; `observation_ids` stripped by construction | build + route | `npx next typegen && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-08-01 | 08 | 4 | REQ-FR-7, REQ-FR-8, REQ-FR-9 | T-3-39 / T-3-40 | Ownership before the body parse; no store access in the route; repeat open renders as plain success | build + route | `npx next typegen && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-08-02 | 08 | 4 | REQ-FR-10, REQ-NFR-F1 | T-3-37 / T-3-38 | Explicit `POST` 405 through the responder; no query, body or duration reader on `GET` | build + route | `npx next typegen && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-09-01 | 09 | 4 | REQ-FR-15, REQ-FR-16, REQ-FR-17, REQ-FR-18, REQ-FR-19 | T-3-43 / T-3-44 / T-3-45 | Body picked to the enumeration before any other line; the route cannot import the authored modules; purpose is the route, not the body | build + route | `npx next typegen && npx tsc --noEmit && node scripts/check-governed.mjs && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-09-02 | 09 | 4 | REQ-FR-23, REQ-FR-27 | T-3-41 / T-3-42 | `decided_by` gone at parse while AD-5's identity pair survives it; one `notFoundProposal()` call site with no parameters | build + route | `npx next typegen && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-10-01 | 10 | 4 | REQ-FR-19 | T-3-46 | Raw request bytes measured; both ceilings refused before the loop; the app-level 413 sentence, not the platform one | build + route | `npx next typegen && npx tsc --noEmit && node scripts/check-governed.mjs && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-10-02 | 10 | 4 | REQ-FR-11, REQ-FR-24 | T-3-47 / T-3-48 / T-3-49 / T-3-50 | One writer call site, no early break, counters tallied once from the results array | build + route | `npx next typegen && npx tsc --noEmit && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-11-01 | 11 | 4 | REQ-FR-5, REQ-FR-24 | T-3-52 / T-3-53 / T-3-55 | Disjoint accepted/rejected/open sets; governed statements assembled not quoted; no server-only field carried | unit | `node --test lib/walk/payload.test.mjs && node scripts/check-governed.mjs && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 3-11-02 | 11 | 4 | REQ-FR-6, REQ-NFR-F1 | T-3-51 / T-3-54 | Ownership before assembly; one `notFound()` call site; the fact count derived from the body it ships with | build + route | `npx next typegen && npx tsc --noEmit && node scripts/check-governed.mjs && node scripts/claims-audit.mjs` | ❌ W0 (route half rides 03-13) | ⬜ pending |
| 3-12-01 | 12 | 5 | REQ-FR-24 | T-3-56 / T-3-61 | One permitted importer of the store's mutators, transitively and through the alias; one Response constructor | build rule | `node scripts/check-single-writer.mjs && node --test scripts/check-single-writer.test.mjs` | ❌ W0 | ⬜ pending |
| 3-12-02 | 12 | 5 | REQ-FR-23, REQ-FR-57 | T-3-57 / T-3-59 | Two permitted assigners, three permitted right-hand sides; no `rbac_tier`; one importer of the order set | build rule | `node scripts/check-actor-field.mjs && node --test scripts/check-actor-field.test.mjs` | ❌ W0 | ⬜ pending |
| 3-12-03 | 12 | 5 | REQ-FR-10, REQ-FR-15, REQ-FR-16, REQ-FR-61 | T-3-58 / T-3-60 | Both directions compared against an independently written table; field names compared whole, so `observation_id` is not caught by the `observation` ban; a new write route must join it | build rule | `node scripts/check-accepted-fields.mjs && node --test scripts/check-accepted-fields.test.mjs && node --test scripts/verify.test.mjs` | ❌ W0 | ⬜ pending |
| 3-13-01 | 13 | 6 | REQ-FR-6, REQ-NFR-F1 | T-3-62 | The comparator throws on a differing `X-CAP-*`, a differing status and a one-byte body change; the exclusion list excludes none of our own headers | unit | `node --test scripts/server/route-assertions.test.mjs` | ❌ W0 | ⬜ pending |
| 3-13-02 | 13 | 6 | REQ-FR-1, REQ-FR-2, REQ-FR-3, REQ-FR-5, REQ-FR-7, REQ-FR-8, REQ-FR-9, REQ-FR-10, REQ-FR-11, REQ-FR-17, REQ-FR-18, REQ-FR-19, REQ-NFR-F1 | T-3-65 / T-3-67 | Curl A–H over the wire; the clamp proved end to end; universal headers asserted on every request; process-group teardown | route (spawned server) | `node --check scripts/server/route-suite.proof.mjs && node --test scripts/server/route-assertions.test.mjs && npm run build && node --test scripts/server/route-suite.proof.mjs` | ❌ W0 | ⬜ pending |
| 3-13-03 | 13 | 6 | REQ-FR-4, REQ-FR-6, REQ-FR-23, REQ-FR-24, REQ-FR-27 | T-3-63 / T-3-64 / T-3-66 | Byte-identity on six routes; no success-only header on any refusal; forged actor value absent from every read-back | route (spawned server) | `node --check scripts/server/route-suite.proof.mjs && node --test scripts/verify.test.mjs && npm run verify` | ❌ W0 | ⬜ pending |
| 3-14-01 | 14 | 6 | REQ-FR-24, REQ-FR-57 | T-3-68 / T-3-69 | Every route path and every `process.env` name enumerated; the document states what it cannot prove | doc assertion | `node -e "<enumerate app/api/**/route.ts and assert each path appears in the document>"` | ✅ | ⬜ pending |
| 3-14-02 | 14 | 6 | REQ-FR-24 | T-3-70 / T-3-71 / T-3-72 | Real hashes and UUIDs, no `jq`, `set -u` not `set -e`, executable mode recorded in git | script lint | `bash -n scripts/curl-suite.sh && node --test scripts/verify.test.mjs` | ✅ | ⬜ pending |
| 3-15-01 | 15 | 7 | REQ-FR-24, REQ-FR-57 | T-3-73 / T-3-74 / T-3-75 | A new route, env read or store writer without a document entry fails the build; a missing document fails rather than passes | build rule | `node scripts/check-non-bypassability.mjs && node --test scripts/check-non-bypassability.test.mjs` | ❌ W0 | ⬜ pending |
| 3-15-02 | 15 | 7 | REQ-FR-24 | T-3-76 | All six source-side rules before `next-build`, none Vercel-excluded, the route suite after it — asserted, not remembered | config | `node -e "import('./scripts/verify.mjs').then(m=>{const i=m.STEPS.map(s=>s.id);if(i[i.indexOf('check-accepted-fields')+1]!=='check-non-bypassability')process.exit(1)})" && node --test scripts/verify.test.mjs && npm run verify` | ✅ | ⬜ pending |
| 3-16-01 | 16 | 8 | REQ-FR-6, REQ-FR-24, REQ-NFR-F1 | T-3-77 / T-3-78 / T-3-79 / T-3-80 | The platform's own headers observed and reconciled against the exclusion list; a `FAIL` recorded as a defect rather than smoothed over | manual + automated | `node --test scripts/server/route-assertions.test.mjs && node scripts/check-non-bypassability.mjs` (plus the human-run `B=<url> bash scripts/curl-suite.sh`) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*"File Exists" reads the test file, not the source: ❌ W0 means the task creates its own test file in the same commit as the code it proves, which is this phase's Wave 0 shape — no test file is deferred to a later plan. The route-typed rows for plans 03-07 to 03-11 are marked "route half rides 03-13" because their build-time assertions run in their own plan while their over-the-wire proof is a named test inside `scripts/server/route-suite.proof.mjs`.*

---

## Wave 0 Requirements

- [ ] `lib/**/*.test.mjs` — thirteen unit test files, each created in the same commit as the module it proves: `limits/index`, `session/key`, `copy/conflicts`, `store/memory`, `http/contract`, `session/cookie`, `attribution/index`, `access/scope`, `verify/authored`, `proposals/derive`, `reconcile/validate`, `reconcile/apply`, `walk/payload`. The `unit-suite` STEP that runs them lands in plan 03-01 Task 2, together with a `verify.test.mjs` assertion that the glob is non-empty.
- [ ] `scripts/server/route-assertions.mjs` + `.test.mjs` — the universal-header assertion, the D-11 comparator with its documented exclusion list, and a cookie-jar `fetch` helper; the `.test.mjs` name is deliberate so the existing `fixture-suite` glob runs it before the build, with no server (plan 03-13 Task 1)
- [ ] `scripts/server/route-suite.proof.mjs` — the HTTP-level proof for every route-typed requirement; the `.proof.mjs` suffix keeps it out of the pre-build glob and it gets its own STEPS entry after `next-build` (plan 03-13 Tasks 2 and 3)
- [ ] `scripts/check-fixture-inputs.mjs`, `scripts/check-named-packages.mjs` (plan 03-06); `scripts/check-single-writer.mjs`, `scripts/check-actor-field.mjs`, `scripts/check-accepted-fields.mjs` (plan 03-12); `scripts/check-non-bypassability.mjs` (plan 03-15) — each with its own `.test.mjs` fixture proof per Phase 1 D-23, and each added to `scripts/verify.mjs` STEPS and `scripts/verify.test.mjs`'s expected order in the same commit
- [ ] `docs/analysis/single-writer-non-bypassability.md` — hand-written in plan 03-14; plan 03-15's check reads it
- [ ] `scripts/curl-suite.sh` — the seed's A–H rewritten with real 64-hex hashes and UUID client ids (plan 03-14 Task 2)
- [ ] Framework install: none — `node:test` is a Node 24 built-in already in use, and this phase installs zero packages (RESEARCH.md §Package Legitimacy Audit)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Curl suite A–H passes against a real deployment; platform-added headers (`x-vercel-*`, possible `server`, `etag`) do not break byte-identity | REQ-FR-6, REQ-NFR-F1 (roadmap success criterion 1) | The local route suite cannot observe Vercel's edge headers (research Pitfall 3, Assumptions Log A2); `scripts/check-headers.mjs` reads `vercel.json` only | Plan 03-16: push to `dev`, take the Preview URL, run `B=<url> bash scripts/curl-suite.sh`, paste the complete output; the agent then captures the raw header blocks itself, reconciles them against `HEADER_EXCLUSIONS`, and records URL, build id, date and result in `docs/analysis/server-seam-verification.md` |
| `X-CAP-Instance` changes after a cold start on the platform | REQ-NFR-F1 (curl H, live half) | The route suite proves the restart case locally by stopping and restarting the server; a platform cold start cannot be forced from a shell | Note the instance id from the recorded curl run; compare against a later run after a redeploy. Recorded in `## What this run does not prove` rather than claimed. |
| Fluid Compute concurrency — whether one instance's module scope is shared across concurrent invocations | AD-10's "per instance" framing (research Assumptions Log A1) | Not reachable from a local `next start` and not exercised by any check in this phase | Carried forward as an open item in `docs/analysis/single-writer-non-bypassability.md`; nothing in this phase's curl suite would catch the failure mode and the document says so. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every one of the thirty-seven tasks carries an `<automated>` command; none is `MISSING`
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — every test file is created in the same commit as the code it proves; none is deferred
- [x] No watch-mode flags
- [x] Feedback latency < 180s — quick suite ~2 s, full gate ~3–4 minutes run per wave rather than per task; the three gate-scoped tasks (3-13-02, 3-13-03, 3-15-02) front their command with a sub-second interim assertion so the first red arrives before the build
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-09-17 — thirty-seven tasks across sixteen plans and eight waves.
