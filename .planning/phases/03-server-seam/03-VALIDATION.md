---
phase: 3
slug: server-seam
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `03-RESEARCH.md` §Validation Architecture; the per-task rows are completed by the planner from the PLAN.md task list.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` + `node:assert/strict` (built-in, Node 24) — the project's sole framework; no new dependency. Unit tests import the `.ts` modules through Node's native type stripping, as the Phase 2 fixture tests already do. |
| **Config file** | none — `scripts/verify.mjs`'s `fixture-suite` STEP runs `node --test scripts/**/*.test.mjs` before `next build`; the new route suite needs its own STEPS entry **after** `next-build` and a location or suffix the `fixture-suite` glob does not sweep (research recommends `scripts/server/route-suite.test.mjs` with an explicit STEPS entry; planner confirms the glob does not match it) |
| **Quick run command** | `node --test lib/**/*.test.mjs` — the unit proofs of `applyItem`, `validate.ts`, `scope.ts`, `derive.ts`, `authored.ts`; no build, no server, sub-second |
| **Full suite command** | `npm run verify` — the whole gate: typegen, `tsc`, eslint, the existing checks, the six new source-side rules, `next build`, the route suite against a spawned `next start`, contrast; the axe scan in the GitHub `verify` job only |
| **Estimated runtime** | ~2 seconds quick; ~2–3 minutes full (Phase 2 measured ~1 minute before the route suite; the suite adds a production-server start, the A–H assertions, the negative sets and one restart for curl H) |

---

## Sampling Rate

- **After every task commit:** Run `node --test lib/**/*.test.mjs` (plus `node --test scripts/<new-check>.test.mjs` when the task added a build rule, and `npx tsc --noEmit` when `lib/data/types.ts` changed)
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green **and** the reviewer-facing `scripts/curl-suite.sh` (name at the planner's discretion) must have been run against a Preview or Production deployment with its output recorded in `docs/analysis/` (CONTEXT D-09); the local route suite proves byte-identity under the locally observed header set only, and the live run is what closes research Pitfall 3
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | T-{N}-01 / — | {expected secure behavior or "N/A"} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The planner replaces the placeholder row with one row per task, using the requirement → test map in `03-RESEARCH.md` §Validation Architecture: route-level proofs (REQ-FR-1–6, 18, 19, 27, NFR-F1) ride the route suite; clock proofs (REQ-FR-7–9, 11) are unit tests on `applyItem` plus the route suite; derivation (REQ-FR-21) is a unit test on `derive.ts`; the build rules (REQ-FR-10, 15, 16, 17, 23, 24, 57, 61) are `scripts/check-*.mjs` scripts each with a fixture test proving non-zero exit.*

---

## Wave 0 Requirements

- [ ] `scripts/server/route-suite.test.mjs` (or the planner's chosen path outside the `fixture-suite` glob) — the HTTP-level proof for every route-typed requirement; needs a cookie-jar `fetch` helper (manual `Set-Cookie` capture → `Cookie` header) and the byte-identity comparator with D-11's documented exclusion list
- [ ] `lib/reconcile/apply.test.mjs`, `lib/reconcile/validate.test.mjs`, `lib/access/scope.test.mjs`, `lib/proposals/derive.test.mjs`, `lib/verify/authored.test.mjs` — unit-level proofs; the modules do not exist yet either
- [ ] `scripts/check-single-writer.mjs`, `scripts/check-actor-field.mjs`, `scripts/check-fixture-inputs.mjs`, `scripts/check-named-packages.mjs`, `scripts/check-accepted-fields.mjs`, `scripts/check-non-bypassability.mjs` (names at the planner's discretion) — each with its own `.test.mjs` fixture proof per Phase 1 D-23, and each added to `scripts/verify.mjs` STEPS and `scripts/verify.test.mjs`'s expected order
- [ ] `docs/analysis/single-writer-non-bypassability.md` — hand-written; the non-bypassability check reads it
- [ ] `scripts/curl-suite.sh` — the seed's A–H rewritten with real 64-hex hashes and UUID client ids (CONTEXT D-10)
- [ ] Framework install: none — `node:test` is a Node 24 built-in already in use

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Curl suite A–H passes against a real deployment; platform-added headers (`x-vercel-*`, possible `server`, `etag`) do not break byte-identity | REQ-FR-6, REQ-NFR-F1 (roadmap success criterion 1) | The local route suite cannot observe Vercel's edge headers (research Pitfall 3, Assumptions Log A2); `scripts/check-headers.mjs` reads `vercel.json` only | Run `scripts/curl-suite.sh` with `B=` set to the Preview URL after the phase's last push to `dev`; record the pass/fail output, the deployment URL, the build id and the date in `docs/analysis/` |
| `X-CAP-Instance` changes after a cold start on the platform | REQ-NFR-F1 (curl H, live half) | The route suite proves the restart case locally; a platform cold start cannot be forced from a shell | Note the instance id from the recorded curl run; compare against a later run after a redeploy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
