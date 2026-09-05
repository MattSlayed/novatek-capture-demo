---
phase: 1
slug: scaffold-conventions
status: draft
nyquist_compliant: false
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
- **Max feedback latency:** 300 seconds (full `verify`); 20 seconds (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD by plan | — | — | REQ-FR-47 | — | N/A | fixture | `node --test scripts/check-governed.test.mjs` | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | REQ-FR-48 | — | N/A | integration | `node scripts/check-wcag.mjs` (asserts the ribbon `<section aria-label="Preview disclosure">` is present, static and without a dismiss control on `/` and `/?s=limits`) | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | REQ-FR-50 | T-1-03 | Claims register carries version, inheritance date and owner; no prohibited string ships | fixture | `node --test scripts/claims-audit.test.mjs` | ❌ W0 (script inherited, test new) | ⬜ pending |
| TBD by plan | — | — | REQ-FR-65 | T-1-04 | `verify` exits non-zero on any single failing check; no check warns or is skippable | fixture, one per check | `node --test scripts/*.test.mjs` | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | REQ-NFR-5 | — | N/A | unit | `node scripts/check-contrast.mjs` | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | REQ-NFR-9 | — | N/A | integration | `node scripts/check-wcag.mjs` | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | REQ-SM-5 | T-1-03 | Audit runs on every push before production promotion | CI wiring | `.github/workflows/verify.yml` → `npm run verify`; Vercel Deployment Check on the `verify` job | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | (D-04) | T-1-01 | `Permissions-Policy: camera=(self), microphone=(self)` and the carried security headers asserted by exact string | fixture | `node --test scripts/check-headers.test.mjs` | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | (D-03) | T-1-02 | Production build with no resolvable build id exits non-zero; no constant fallback | fixture | `node --test scripts/check-structure.test.mjs` (runs `next build` with the three variables unset and asserts non-zero) | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | (D-12) | — | N/A | fixture | `node --test scripts/check-tokens.test.mjs` | ❌ W0 | ⬜ pending |
| TBD by plan | — | — | (D-06) | — | N/A | fixture | `node --test scripts/check-sw.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat refs (from `01-RESEARCH.md` §Security Domain): T-1-01 missing or incorrect `Permissions-Policy` silently disabling camera and microphone for later phases; T-1-02 a build succeeding with an unresolved build id, defeating attribution headers; T-1-03 claims-register drift from the inherited source; T-1-04 a gate that warns or can be skipped, letting an unverified build deploy.

---

## Wave 0 Requirements

- [ ] `scripts/check-governed.test.mjs`, `scripts/claims-audit.test.mjs`, `scripts/check-headers.test.mjs`, `scripts/check-tokens.test.mjs`, `scripts/check-sw.test.mjs`, `scripts/check-structure.test.mjs` — one fixture-driven test per check script proving non-zero exit on a violation (D-23)
- [ ] `scripts/lib/harness.mjs` — shared Playwright launch profile: Chromium, viewport 390 × 844, `deviceScaleFactor` 3, `isMobile`, `hasTouch` (D-21)
- [ ] `scripts/check-wcag.mjs` — axe-core A/AA run against `next start` on `/` and `/?s=limits`; the `runOnly` tag list confirmed against the installed `axe-core` 4.13.0 with `getRules(['wcag22aa'])` first (Research Open Question 1)
- [ ] `scripts/check-contrast.mjs` — WCAG relative-luminance contrast from resolved token values with `docs/design/decorative-exemptions.json` as the only exception source
- [ ] `.github/workflows/verify.yml` — the CI job (`verify`) that the Vercel Deployment Check depends on (D-22)
- [ ] Framework install: `npx playwright install --with-deps chromium` locally and in CI (not in Vercel's build)

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
