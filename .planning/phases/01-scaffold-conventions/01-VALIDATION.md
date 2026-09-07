---
phase: 1
slug: scaffold-conventions
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `01-RESEARCH.md` §Validation Architecture; the per-task rows are completed by the planner from the PLAN.md task list.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node 24) for the fixture-driven check scripts; Playwright 1.62.1 `chromium.launch()` through `scripts/lib/harness.mjs` with `@axe-core/playwright` 4.13.0 for the WCAG scan (not the Playwright Test runner) |
| **Config file** | none — Wave 0 creates `scripts/*.test.mjs` and `scripts/lib/harness.mjs` |
| **Quick run command** | `node --test scripts/*.test.mjs` |
| **Full suite command** | `npm run verify` |
| **Estimated runtime** | ~20 seconds quick; ~3–5 minutes full (includes `next build`, `next start` and the axe scan) |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/*.test.mjs`
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green locally and in the GitHub Actions `verify` job
- **Max feedback latency:** 300 seconds (full `verify`); 20 seconds (quick); per-task commands stay under 60 seconds — the WCAG task samples with `check-wcag.mjs --self-test` (~3s) and defers the full build-and-scan pipeline to wave close and `verify.mjs` step 15

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-04 T2 | 01-04 | 2 | REQ-FR-47 | T-1-06 | A second literal of a governed sentence anywhere in `app/`, `components/`, `lib/` fails the build; the set of eight is closed | fixture | `node --test scripts/check-governed.test.mjs` | created by 01-04 T2 | ⬜ pending |
| 01-05 T1, 01-05 T3, 01-06 T2 | 01-05, 01-06 | 3, 4 | REQ-FR-48 | T-1-14 | Ribbon present on both surfaces, `position: static`, `max-height: none`, no `aria-hidden`, no dismiss control, ≥44px named link | integration | `node scripts/check-wcag.mjs --self-test` per task; full scan `node scripts/check-wcag.mjs` at wave close and as `verify.mjs` step 15 | created by 01-06 T2 | ⬜ pending |
| 01-04 T3 | 01-04 | 2 | REQ-FR-50 | T-1-03 | Register carries version, inheritance date and owner; no prohibited string ships; every addition has a positive and a negative fixture | fixture | `node --test scripts/claims-audit.test.mjs` | created by 01-04 T3 (script inherited, test new) | ⬜ pending |
| 01-07 T1, 01-07 T2 | 01-07 | 5 | REQ-FR-65 | T-1-04 | `verify` exits non-zero on any single failing check, stops at the first, warns for nothing and has no skip flag | fixture | `node --test scripts/verify.test.mjs` | created by 01-07 T2 | ⬜ pending |
| 01-06 T1 | 01-06 | 4 | REQ-NFR-5 | T-1-07 | 7:1 text / 3:1 non-text computed from resolved token values; the four-entry register is the only exception source | unit | `node scripts/check-contrast.mjs` | created by 01-06 T1 | ⬜ pending |
| 01-06 T2 | 01-06 | 4 | REQ-NFR-9 | T-1-07, T-1-16 | axe A/AA on `/` and `/?s=limits` at 390×844; startup guard fails if the `wcag22aa` tag disappears | integration | `node scripts/check-wcag.mjs --self-test` per task; full scan `node scripts/check-wcag.mjs` at wave close and as `verify.mjs` step 15 | created by 01-06 T2 | ⬜ pending |
| 01-07 T3, 01-09 T2 | 01-07, 01-09 | 5, 7 | REQ-SM-5 | T-1-03, T-1-18 | Full unmodified `npm run verify` on every push under job `verify`; a red job holds production aliasing | CI wiring | `node --test scripts/verify.test.mjs` | created by 01-07 T3 | ⬜ pending |
| 01-02 T1 | 01-02 | 2 | (D-04) | T-1-01, T-1-05 | `Permissions-Policy: camera=(self), microphone=(self)` and the carried headers asserted by exact string; `camera=()` anywhere is a named failure | fixture | `node --test scripts/check-headers.test.mjs` | created by 01-02 T1 | ⬜ pending |
| 01-02 T3 | 01-02 | 2 | (D-03, D-05, D-11) | T-1-02, T-1-10 | Production build with the three variables unset exits non-zero; no middleware, no `webpack(`, no `ignoreBuildErrors`, token import order, `/` static | fixture | `node --test scripts/check-structure.test.mjs` | created by 01-02 T3 | ⬜ pending |
| 01-03 T1, 01-03 T2, 01-03 T3 | 01-03 | 2 | (D-12, D-13, D-16) | T-1-11, T-1-12 | Inherited layer byte-identical by SHA-256; no Capture declaration shadows an inherited name except `--viewer-ink-dim`; exemption register has exactly four entries | fixture | `node --test scripts/check-tokens.test.mjs` | created by 01-03 T1 | ⬜ pending |
| 01-02 T2 | 01-02 | 2 | (D-06) | T-1-08 | Absent worker → no `serviceWorker.register(` anywhere; present worker → `node --check` plus the never-handle-`/api/` guard | fixture | `node --test scripts/check-sw.test.mjs` | created by 01-02 T2 | ⬜ pending |
| 01-01 T1, 01-01 T2 | 01-01 | 1 | (D-01, D-02) | T-1-09, T-1-SC | Exact pins declared and installed; `eslint .` exits 0 without `eslint-config-next/core-web-vitals` | fixture | `node --test scripts/scaffold.test.mjs` | created by 01-01 T1 | ⬜ pending |
| 01-01 T3 | 01-01 | 1 | (D-21, D-23) | — | Fixture runner reports child exit codes exactly; `MOBILE_PROFILE` is the pinned 390×844 profile | fixture | `node --test scripts/lib/support.test.mjs` | created by 01-01 T3 | ⬜ pending |
| 01-08 T1 | 01-08 | 6 | (D-24, roadmap SC 2) | T-1-20 | A live URL is publicly reachable with no `_vercel/sso` redirect, carries the five headers on the wire and serves the undismissable ribbon | fixture | `node --test scripts/check-deployment.test.mjs` | created by 01-08 T1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat refs (from `01-RESEARCH.md` §Security Domain): T-1-01 missing or incorrect `Permissions-Policy` silently disabling camera and microphone for later phases; T-1-02 a build succeeding with an unresolved build id, defeating attribution headers; T-1-03 claims-register drift from the inherited source; T-1-04 a gate that warns or can be skipped, letting an unverified build deploy.

---

## Wave 0 Requirements

Wave 0 work lands in wave 1 (plan 01-01) and wave 2 (plans 01-02 to 01-04); the plan and task that creates each item is named.

- [ ] `scripts/lib/fixtures.mjs` — shared temp-dir fixture builder and child-process check runner, used by every `*.test.mjs` (01-01 T3)
- [ ] `scripts/lib/harness.mjs` — shared Playwright launch profile: Chromium, viewport 390 × 844, `deviceScaleFactor` 3, `isMobile`, `hasTouch` (D-21) (01-01 T3)
- [ ] `scripts/scaffold.test.mjs` and `scripts/lib/support.test.mjs` — the wave-1 regression proofs for the pins, the ESLint 10 chain and the shared helpers (01-01 T1, T2, T3)
- [ ] `scripts/check-headers.test.mjs`, `scripts/check-sw.test.mjs`, `scripts/check-structure.test.mjs` — one fixture-driven test per check proving non-zero exit on a violation (D-23) (01-02 T1, T2, T3)
- [ ] `scripts/check-tokens.test.mjs` (01-03 T1); `scripts/check-governed.test.mjs` (01-04 T2); `scripts/claims-audit.test.mjs` (01-04 T3) — the remaining D-23 fixtures
- [ ] `scripts/check-contrast.mjs` + `scripts/check-contrast.pairs.json` + `scripts/check-contrast.test.mjs` — WCAG relative-luminance contrast from resolved token values with `docs/design/decorative-exemptions.json` as the only exception source (01-06 T1)
- [ ] `scripts/check-wcag.mjs` — axe-core A/AA run against `next start` on `/` and `/?s=limits` with `runOnly` tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` and a startup assertion that `getRules(['wcag22aa'])` is non-empty (Research Open Question 1, resolved); `--self-test` is its browser-only smoke mode (01-06 T2)
- [ ] `scripts/verify.test.mjs` — proof that the step order matches D-20 and that the runner stops at the first non-zero exit (01-07 T2)
- [ ] `.github/workflows/verify.yml` — the CI job (`verify`) that the Vercel Deployment Check depends on (D-22) (01-07 T3)
- [ ] Framework install: `npx playwright install chromium` locally (01-01 T1) and `npx playwright install --with-deps chromium` in CI (01-07 T3); never in Vercel's build

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The production URL opens on a phone without a Vercel login and shows the `preview` sentence in document flow with no dismiss control | REQ-FR-48; roadmap success criterion 2 | Deployment Protection is a dashboard setting and the check is on a real handset | Settings → Deployment Protection → Vercel Authentication off; open the production URL on iPhone and Android; confirm the ribbon renders before anything else, cannot be dismissed, and scrolls with the page |
| Vercel Deployment Check registered on the `verify` GitHub job; a red job holds production promotion | REQ-SM-5; D-22 | Dashboard-only configuration | Settings → Deployment Checks → Add Checks → GitHub → select `verify`; push a commit with a deliberate governed-literal duplicate on a branch and confirm the deployment is not aliased to production |
| System Environment Variables exposed to the build so `VERCEL_GIT_COMMIT_SHA` resolves | D-03, D-24 | Dashboard-only setting | Settings → Environment Variables → "Automatically expose System Environment Variables" checked; confirm a Preview build log shows a resolved `NEXT_PUBLIC_BUILD_ID` |
| Live Vercel region list re-read and `cpt1` confirmed on the current plan | D-25 | Platform fact, dated | Record the list and date in `docs/analysis/vercel-regions.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify — 26 of 26 tasks across the 9 plans carry one; no `MISSING` marker was needed because every command names a file the same task or an earlier wave creates
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — none outstanding
- [x] No watch-mode flags
- [x] Feedback latency < 300s — `node --test scripts/` ~20s; `npm run verify` ~3–5 min
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-09-06 (9 plans, 7 waves; per-task map completed from the PLAN.md task lists)
