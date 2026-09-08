---
phase: 2
slug: fixtures-types
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `02-RESEARCH.md` §Validation Architecture; the per-task rows are completed by the planner from the PLAN.md task list.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node 24.19.0) for the fixture-driven check scripts. The `.mjs` tests load the `.ts` fixture modules through Node's native type stripping (default-on in 24.19.0, no flag, no warning; the `.ts` extension is needed only at the `.mjs` entry point) — no new runtime dependency. |
| **Config file** | none — `scripts/verify.mjs`'s `fixture-suite` step already runs `node --test scripts/**/*.test.mjs`, so a new `*.test.mjs` needs no wiring; Wave 0 creates the three new check scripts and their tests (names at the planner's discretion — research suggests `check-observations`, `check-fixture-hash`, `check-register-isolation`) |
| **Quick run command** | `node --test scripts/check-observations.test.mjs scripts/check-fixture-hash.test.mjs scripts/check-register-isolation.test.mjs` (the three new test files, skipping the `next build`-dependent half of the isolation check) |
| **Full suite command** | `npm run verify` (the whole `STEPS` array: typegen, `tsc`, `eslint`, the token, governed and claims checks, the fixture suite, headers, worker, structure, `next build`, the post-build assertions, contrast; the axe scan runs in the GitHub `verify` job). Fifteen steps today; plan 02-04 adds `check-register-isolation` and `check-register-isolation-bundle` (seventeen) and plan 02-07 adds `check-fixture-hash` (eighteen), each with the matching update to `scripts/verify.test.mjs`'s `EXPECTED_ORDER` |
| **Estimated runtime** | ~15 seconds quick; ~1 minute full on a calm machine (59 s measured after Phase 1), longer under CPU load — the suite's bounded waits are load-sensitive |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/check-observations.test.mjs scripts/check-fixture-hash.test.mjs scripts/check-register-isolation.test.mjs` (plus `npx tsc --noEmit` when `lib/data/types.ts` changed)
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green **and** `docs/analysis/provenance-check.md` must be signed — the phase does not close on the automated suite alone (FR-21a)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01 T1 | 02-01 | 1 | REQ-FR-21a | T-2-01, T-2-02, T-2-04 | `ObservationGrade` is its own two-member union so `EXTRACTED` is unconstructible on an authored observation; `GovernedKey` is imported type-only, never restated; no TS `enum` in `lib/data` | type-check | `npx tsc --noEmit && node scripts/check-governed.mjs && node scripts/claims-audit.mjs` | ✅ existing steps | ⬜ pending |
| 02-01 T2 | 02-01 | 1 | REQ-FR-21a | T-2-01, T-2-03 | `AuthoredObservation.grade` typed as `ObservationGrade`; `VerificationResult.confidence` is `null` and `label` is a `GovernedKey`; `lib/data` imports nothing from store, reconcile or access | type-check | `npx tsc --noEmit && node scripts/check-governed.mjs && node scripts/claims-audit.mjs && npx eslint lib/data/types.ts` | ✅ existing steps | ⬜ pending |
| 02-02 T1 | 02-02 | 2 | REQ-FR-21a | T-2-05, T-2-07 | Eleven records present verbatim, nine deleted whole, `z05` and three `PEOPLE` keys gone, the anchor block and the two orphaned import names removed together; claims audit clean over the copy | unit | `npx tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-governed.mjs` | ✅ existing steps | ⬜ pending |
| 02-02 T2 | 02-02 | 2 | REQ-FR-21a | T-2-06, T-2-08 | Every closed set's membership asserted at runtime; the eleven ids, eleven tags, four zones, three deviations, four people and thirty-two fact ids asserted; every kept record's zone, deviation and doc reference resolves | unit | `node --test scripts/check-fixture-shape.test.mjs` | ❌ W0 — created by 02-02 T2 | ⬜ pending |
| 02-03 T1 | 02-03 | 3 | REQ-FR-21a | T-2-09, T-2-10 | Three accounts with a display-only `rbac_tier` no function reads; five orders carrying `id` and `number` as two strings; `m-aa605` on no order | unit | `npx tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-governed.mjs` | ✅ existing steps | ⬜ pending |
| 02-03 T2 | 02-03 | 3 | REQ-FR-21a | T-2-09, T-2-10, T-2-11, T-2-12 | Every `assigned_to`, `zone_id`, `asset_ids` entry and `governing_docs` code resolves; no order's `id` equals its `number`; `acc-mabaso` matches `PEOPLE.millwright`; `rbac_tier` unread, asserted from comment-stripped source | unit | `node --test scripts/check-fixture-shape.test.mjs` | ✅ created by 02-02 T2 | ⬜ pending |
| 02-04 T1 | 02-04 | 3 | REQ-FR-21a | T-2-13, T-2-15, T-2-SC | `import "server-only"` is the register's first statement; it exports only the sentinel, the entries and the tag map, with no zone, order, assignment or history; `server-only@0.0.1` pinned exactly, audited `[OK]` | unit | `npx tsc --noEmit && node -e "import('./lib/data/register.ts').then(m=>{if(m.REGISTER_BY_TAG.size!==11)process.exit(1)})"` | ✅ existing steps | ⬜ pending |
| 02-04 T2 | 02-04 | 3 | REQ-FR-21a | T-2-13, T-2-14, T-2-16 | Source import-graph walk fails on a direct, a transitive and an `@/`-aliased register import and on `lib/access/register`; bundle scan fails on the sentinel in `.next/static/**` and on a missing directory; never warns, never skips | fixture | `node --test scripts/check-register-isolation.test.mjs` | ❌ W0 — created by 02-04 T2 | ⬜ pending |
| 02-04 T3 | 02-04 | 3 | REQ-FR-21a | T-2-14 | Both halves are `STEPS` entries, one before and one after `next-build`, neither `vercelExcluded`; no flag and no environment variable changes the list | fixture | `node --test scripts/verify.test.mjs` | ✅ existing (updated by 02-04 T3) | ⬜ pending |
| 02-05 T1 | 02-05 | 4 | REQ-FR-21a | T-2-19, T-2-21 | Every grade from {INFERRED, AMBIGUOUS}; every `drawn_from` in the D-09 id space; one `// cites` comment per observation; no observation on `m-aa101`, `m-aa102`, `m-aa602` or `m-aa605`; no row invented to satisfy a count | unit | `npx tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-governed.mjs` | ✅ existing steps | ⬜ pending |
| 02-05 T2 | 02-05 | 4 | REQ-FR-21a | T-2-17, T-2-18, T-2-19, T-2-20 | Resolver and comment-fidelity check against the live evaluated records, with fixtures for a missing comment, an unresolvable id, a drifted quote, a machinery-id citation, an `ncr_number` citation and a `grade` of `EXTRACTED` | fixture | `node scripts/check-observations.mjs && node --test scripts/check-observations.test.mjs` | ❌ W0 — created by 02-05 T2 | ⬜ pending |
| 02-06 T1 | 02-06 | 5 | REQ-FR-21a | T-2-26 | Review sheet generated from the fixtures with D-03's eleven columns, the two referral rows marked *not subject*, and the open judgments listed; verdict, reviewer and date left empty | unit | `node scripts/check-observations.mjs` | ✅ created by 02-05 T2 | ⬜ pending |
| 02-06 T2 | 02-06 | 5 | REQ-FR-21a | T-2-22, T-2-23, T-2-24, T-2-25 | **Manual-only gate — see §Manual-Only Verifications.** The automated half is the structural completeness guard: every row carries one of the four verdicts, no row is unaccounted for, and the reviewer's name and the date are present | manual + unit | `node scripts/check-observations.mjs && node --test scripts/check-fixture-shape.test.mjs && npx tsc --noEmit` | ✅ created by 02-02 T2, extended here | ⬜ pending |
| 02-07 T1 | 02-07 | 6 | REQ-FR-21a | T-2-29 | `FIXTURE_VERSION` is a single named export in `capture-fixtures/YYYY.MM.N` shape with no reference to a build id, a git sha or `process.env`; the pin is cut over the four files after the sign-off | unit | `npx tsc --noEmit && node scripts/check-tokens.mjs && node scripts/claims-audit.mjs` | ✅ existing steps | ⬜ pending |
| 02-07 T2 | 02-07 | 6 | REQ-FR-21a | T-2-27, T-2-28, T-2-30, T-2-31 | Recomputed SHA-256 fails on a content change without a re-pin, passes when all four files are converted to CRLF, and ignores `types.ts`; the check imports the pin from the tree it is checking | fixture | `node scripts/check-fixture-hash.mjs && node --test scripts/check-fixture-hash.test.mjs && node --test scripts/verify.test.mjs` | ❌ W0 — created by 02-07 T2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat refs (each plan's own `<threat_model>`; ids are per phase, so Phase 1's were T-1-NN): T-2-01 an authored observation carrying the grade meaning *the record states this*; T-2-02 a second definition of the governed set; T-2-03 a closed set widened without its member array; T-2-04 a TS `enum` breaking Node's strip-only loading; T-2-05 a copied plant record diverging from its source; T-2-06 a dangling reference left by the trim; T-2-07 a prohibited claim entering `lib/` through copied text; T-2-08 an unsupported TypeScript construct; T-2-09 `rbac_tier` reaching an access decision; T-2-10 the display order number replayed as an identity; T-2-11 an order naming an asset, document or account that is not there; T-2-12 the account drifting from the plant record; T-2-13 register content reaching a client bundle; T-2-14 a check that warns, skips or is excluded; T-2-15 the register exposing more than a resolution; T-2-16 the sentinel scan proving less than it appears to (accepted, scoped in the code comment); T-2-17 a citation comment drifting from its record; T-2-18 a `drawn_from` that looks resolvable and names nothing citable; T-2-19 `EXTRACTED` arriving from outside the type system; T-2-20 an automated check mistaken for the human gate; T-2-21 an observation invented to satisfy a count; T-2-22 the gate closed without a named person; T-2-23 the executor rewording or re-citing on its own initiative; T-2-24 a verdict cell silently blanked later; T-2-25 an automated pass mistaken for the provenance check; T-2-26 the referral rows quietly omitted; T-2-27 fixture content changing without a re-pin; T-2-28 a pin that differs by platform; T-2-29 the fixture version confused with the build id; T-2-30 a check whose fixtures cannot fail; T-2-31 a pin cut over a draft; T-2-SC supply chain — the one new dependency, `server-only@0.0.1`, `[VERIFIED: npm registry]` and `[OK]` from slopcheck, so no blocking legitimacy checkpoint is required.

*(Rows are completed by the planner from the PLAN.md task list. Every task that touches `lib/data/` or `scripts/` must carry an automated command; the provenance sign-off task is manual-only by design and is listed below, not here.)*

---

## Wave 0 Requirements

Wave 0 work is spread across waves 1 to 6; the plan and task that creates each item is named. Nothing in this phase can be checked before the fixtures it checks are authored, so the fixtures are themselves Wave 0.

- [ ] `lib/data/types.ts`, `plant.ts`, `artisans.ts`, `orders.ts`, `observations.ts`, `fixtures.ts`, `register.ts` — none exist yet; the fixtures themselves are Wave 0, since no check can run against them before they are authored
- [ ] `scripts/check-observations.mjs` + `scripts/check-observations.test.mjs` — REQ-FR-21a's referential-integrity half (every `drawn_from` resolves to a fact or deviation id) and comment-fidelity half (every quoted comment equals the live record value); fixture proving it fails on a missing comment, an unresolvable id and a drifted quote
- [ ] `scripts/check-fixture-hash.mjs` (or a `check-structure.mjs` extension) + its test — D-14's pinned SHA-256 over the four data files with CRLF→LF normalisation before hashing; fixture proving it fails on a content change without a bump
- [ ] `scripts/check-register-isolation.mjs` (or a `check-structure.mjs` extension) + its test — D-17's source import-graph walk (no `components/` or `lib/client/` module reaches `lib/data/register` or `lib/access/register`) and the post-build sentinel scan of `.next/static/**`; fixture proving each half fails
- [ ] `scripts/verify.mjs` — the new source-side steps join `STEPS` before `next-build`; the bundle scan runs after it, matching `check-structure.mjs`'s two-invocation pattern
- [ ] `docs/analysis/provenance-check.md` — the draft review sheet, then the signed record

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A named person has read each authored observation against the record it cites and confirmed the wording is an inference the record supports (`evidence`) or only situates (`context`) — **plan 02-06, Task 2, `checkpoint:human-verify gate="blocking"`, in an `autonomous: false` plan; never auto-approved and `workflow.auto_advance` does not apply** | REQ-FR-21a | AD-15 names this the one build gate no command can run; whether a wording is an honest inference from a record is a human judgment, and no automated proxy is invented for it | At the plan's `checkpoint:human-verify` task the executor presents the review sheet (draft of `docs/analysis/provenance-check.md`: observation id, asset, kind, wording, cited record id, the record's own sentence, grade, relation). The reviewer (Matthew) reads each row against the quoted record and answers confirmed / reword / re-cite / drop per row, supplying any replacement. The executor applies the verdicts, re-presents any changed row, then writes the signed file with reviewer name and date. The phase does not close without it. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify — 15 of 15 tasks across the 7 plans carry one; the single manual-only behaviour (plan 02-06 Task 2) additionally carries an automated structural guard, and is listed above as manual by design
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — the four new check/test files and the seven `lib/data` modules are each named with the plan and task that creates them; no `MISSING` marker was needed, because every command names a file its own task or an earlier wave creates
- [x] No watch-mode flags
- [x] Feedback latency < 90s — the three new test files run in ~15 s; `npm run verify` ~1 minute on a calm machine
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-09-08 (7 plans, 6 waves, 15 tasks; per-task map completed from the PLAN.md task lists)
