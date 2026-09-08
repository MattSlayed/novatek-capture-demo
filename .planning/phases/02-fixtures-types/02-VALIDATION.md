---
phase: 2
slug: fixtures-types
status: draft
nyquist_compliant: false
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
| **Full suite command** | `npm run verify` (the whole `STEPS` array: typegen, `tsc`, `eslint`, the token, governed and claims checks, the fixture suite, headers, worker, structure, `next build`, the post-build assertions, contrast; the axe scan runs in the GitHub `verify` job) |
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
| 2-01-01 | 01 | 1 | REQ-FR-21a | T-2-01 / — | {expected secure behavior or "N/A"} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(Rows are completed by the planner from the PLAN.md task list. Every task that touches `lib/data/` or `scripts/` must carry an automated command; the provenance sign-off task is manual-only by design and is listed below, not here.)*

---

## Wave 0 Requirements

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
| A named person has read each authored observation against the record it cites and confirmed the wording is an inference the record supports (`evidence`) or only situates (`context`) | REQ-FR-21a | AD-15 names this the one build gate no command can run; whether a wording is an honest inference from a record is a human judgment, and no automated proxy is invented for it | At the plan's `checkpoint:human-verify` task the executor presents the review sheet (draft of `docs/analysis/provenance-check.md`: observation id, asset, kind, wording, cited record id, the record's own sentence, grade, relation). The reviewer (Matthew) reads each row against the quoted record and answers confirmed / reword / re-cite / drop per row, supplying any replacement. The executor applies the verdicts, re-presents any changed row, then writes the signed file with reviewer name and date. The phase does not close without it. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
