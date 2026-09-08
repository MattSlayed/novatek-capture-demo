---
phase: 01-scaffold-conventions
verified: 2026-09-08T10:45:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 1: Scaffold & Conventions Verification Report

**Phase Goal:** A public URL is labelled before it has anything to label, and one command runs every build-time check and exits zero
**Verified:** 2026-09-08
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run verify` runs typegen, type check, claims audit, header check, worker check, lint and build, exits zero on an empty page, non-zero when any check fails, no warns, none skippable | VERIFIED | Ran `npm run verify` live: exit code 0, all 15 ordered steps executed (`next-typegen`, `tsc`, `eslint`, `check-tokens`, `check-governed`, `claims-audit`, `fixture-suite` [117 tests], `check-headers`, `check-sw`, `check-structure`, `next-build` [real Turbopack build], `check-structure-build-output`, `check-contrast`, `check-wcag-self-test`, `check-wcag` [real axe scan, 0 A/AA violations]), log ends "All steps exited 0". `node --test scripts/verify.test.mjs` (15/15 pass) proves fail-fast (stops at first non-zero exit), no env var/flag skips a step, and no branch turns a failure into a pass. Live deployment-gate.md documents an actual red-CI-job demonstration on a branch (governed-literal duplicate → `check-governed` failed → GitHub Actions run 34212837892 failed). `node --test scripts/check-governed.test.mjs` (7/7) proves the duplicate-literal gate fails on disk-based fixtures, not mocks. |
| 2 | First deployment (Production, `cpt1`) opens on a phone without Vercel login, shows `preview` sentence in document flow with no dismissal control, before any other surface exists | VERIFIED | Live probe: `node scripts/check-deployment.mjs --url https://novatek-capture-demo.vercel.app/` exits 0, "Publicly reachable, correctly headed, and carrying the undismissable ribbon." Independent `curl -sI` of production confirms `HTTP/1.1 200 OK`, `Permissions-Policy: camera=(self), microphone=(self)`, `X-Vercel-Id: cpt1::...` (region confirmed live, not just claimed). `curl -s` of the raw HTML shows "Preview disclosure", "Designed preview", "synthetic", "Read the full preview limits" present, and no dismiss/close markup found. `Ribbon.tsx` source confirms `position: static`-class rendering above `{children}` in `app/layout.tsx`, no dismiss control, `aria-label="Preview disclosure"`. GitHub Actions run 34214635320 on `main`@`50a246c` confirmed via `gh run view` (conclusion: success, headSha matches). Developer's phone confirmation (iPhone + Android) recorded in `docs/analysis/vercel-regions.md`. |
| 3 | Every governed sentence defined once in `lib/copy/governed.ts`; duplicate-literal check fails build on a second literal anywhere in `app/`, `components/` or `lib/` | VERIFIED | `lib/copy/governed.ts` defines exactly 8 keys (closed `GovernedKey` union) plus `PLATFORM_413`, each with `before`/`strong`/`after`. `Ribbon.tsx` and `Limits.tsx` both import `GOVERNED` and render via destructuring/`Object.entries` — never a literal. `node --test scripts/check-governed.test.mjs`: 7/7 pass including "the same sentence split across three JSX lines", "hidden in a comment", "a ninth GovernedSentence-shaped binding exits non-zero", "a component that imports and renders ... exits 0". Live `npm run verify` run confirms `check-governed` exits 0 against the real repo (Problems: 0). |
| 4 | Claims audit carries inherited register with version/inheritance date, owner named, additions tested; contrast check (7:1 text, decorative-exemption register as input) and WCAG A/AA check wired into the same command | VERIFIED | `scripts/claims-audit.mjs` header states "Register version: 2 ... inherited from ipv-demo/HANDOVER.md §3 at 8fd097a (2026-09-01). owner: the SHEQ manager." Live run: "Scanned: app, components, lib Rules: 26, Hits: 0". `docs/design/decorative-exemptions.json` has exactly 4 entries with measured ratios, consumed by `check-contrast.mjs` (confirmed via grep) as its "only permitted-exception source". Live `check-contrast` run: 6 ink-on-ground pairs, 5 PASS at ≥7:1 (text) or ≥3:1 (non-text), 1 EXEMPTED (`ribbon-bottom-border` 1.33:1, matches the register's `1.33` entry exactly). `check-wcag.mjs` asserts `axe.getRules(["wcag22aa"]).length >= 1` at startup (fails rather than narrows per Research Open Question 1) and scans `/` and `/?s=limits` at 390×844; live run shows "Problems: 0. Zero A/AA violations on both surfaces." Both checks are steps 13/15 and 15/15 of the same `verify.mjs` STEPS array, proven by the single successful `npm run verify` run. |
| 5 | `tokens.inherited.css` byte-identical to parent's, CI-asserted; `vercel.json` sets region, `Permissions-Policy: camera=(self), microphone=(self)`, uncached `/sw.js`; production build with unresolved build id fails | VERIFIED | `sha256sum app/styles/tokens.inherited.css` = `11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9`, matching the pinned hash exactly; `diff` against `../ipv-demo/app/styles/tokens.css` reports no differences. `scripts/check-tokens.mjs` asserts this SHA-256 and runs as step 4 of `verify.mjs` (confirmed exit 0 in live run). `vercel.json` declares `"regions": ["cpt1"]`, `Permissions-Policy: camera=(self), microphone=(self)`, and `/sw.js` → `Cache-Control: no-cache, no-store, must-revalidate`. Live test: ran `env -u VERCEL_GIT_COMMIT_SHA -u VERCEL_DEPLOYMENT_ID -u CAPTURE_BUILD_ID NODE_ENV=production npx next build` directly — **exit code 1**, output: "CAPTURE_BUILD_ID unresolved: set VERCEL_GIT_COMMIT_SHA, VERCEL_DEPLOYMENT_ID, or CAPTURE_BUILD_ID before a production build." This is a direct, live reproduction of the failure mode, not a summary claim. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | D-01 pins, `verify` entry point | VERIFIED | `"verify": "node scripts/verify.mjs"` present; pins confirmed installed (`next 16.3.4`, `react/react-dom 19.2.8`, `eslint 10.9.1`, etc. per 01-01-SUMMARY, cross-checked against live `npm run verify` running cleanly under Node 24.19.0) |
| `eslint.config.mjs` | ESLint 10.9.1-safe flat config | VERIFIED | Live `npx eslint .` (inside `npm run verify`) exits 0 with no output |
| `next.config.ts` | Build-id resolution that throws, `cacheComponents` | VERIFIED | Live test reproduced the throw with unresolved build id (exit 1); `check-structure.mjs` asserts `cacheComponents` declared, exit 0 |
| `vercel.json` | Region, headers, uncached `/sw.js` | VERIFIED | Read directly — all D-04 values present and correct |
| `scripts/verify.mjs` | One gate, ordered step list, fail-fast runner | VERIFIED | `STEPS` array read directly — 15 steps in D-20's order; live run + `verify.test.mjs` (15/15) prove fail-fast and no-skip |
| `.github/workflows/verify.yml` | CI job named `verify` on every push | VERIFIED | Read directly — `on: push`, job id `verify`, runs unmodified `npm run verify`; live `gh run view 34214635320` confirms success on `main`@`50a246c` |
| `lib/copy/governed.ts` | Eight governed sentences, closed set, `PLATFORM_413` | VERIFIED | Read directly — 8 keys + `PLATFORM_413`, each `before`/`strong`/`after` shaped |
| `app/styles/tokens.inherited.css` | Byte-identical inherited layer | VERIFIED | SHA-256 matches pinned hash and sibling file, live-computed |
| `app/styles/tokens.capture.css`, `app/globals.css` | Layer-2 tokens, type roles, focus ring | VERIFIED | `check-tokens.mjs` and `check-structure.mjs` both exit 0 against real repo in live run |
| `docs/design/decorative-exemptions.json` | Exactly 4 exemption entries | VERIFIED | Read directly — 4 entries with measured ratios, consumed by `check-contrast.mjs` |
| `components/shell/Ribbon.tsx`, `app/layout.tsx` | Ribbon above `{children}` on every route | VERIFIED | Read directly — `<Ribbon />` precedes `{children}` in `<body>`; live curl of production HTML confirms rendering |
| `app/page.tsx`, `components/limits/Limits.tsx` | Labelled shell + minimal Limits surface | VERIFIED | Read directly, both render from `GOVERNED`; live curl of `/` and `/?s=limits` confirms rendered content matches |
| `scripts/check-contrast.mjs`, `scripts/check-wcag.mjs` | 7:1/3:1 contrast, axe A/AA scan | VERIFIED | Both run live inside `npm run verify`, 0 problems, wired to `decorative-exemptions.json` and `wcag22aa` tag respectively |
| `scripts/check-deployment.mjs` | Live-URL probe | VERIFIED | Ran live against production URL, exit 0 |
| `README.md` | Describes labelled shell and `npm run verify` | VERIFIED | Read directly — describes Phase 1 deliverables and the verify/test commands |
| `docs/analysis/scheduled-work.md`, `docs/analysis/vercel-regions.md`, `docs/analysis/deployment-gate.md` | Dated scheduled-closure and deployment evidence | VERIFIED | All three read directly, contain dated, specific evidence (not prose placeholders) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/check-governed.mjs` | `lib/copy/governed.ts` | source parse | VERIFIED | Fixture tests confirm the check reads the module, never restates sentences |
| `scripts/claims-audit.mjs` | `app/, components/, lib/` | recursive walk + regex sweep | VERIFIED | Live run: "Scanned: app, components, lib Rules: 26 Hits: 0" |
| `app/globals.css` | `tokens.inherited.css` then `tokens.capture.css` | `@import` order | VERIFIED | `check-structure.mjs` asserts this order, exits 0 live |
| `scripts/check-contrast.mjs` | `docs/design/decorative-exemptions.json` | exception source | VERIFIED | Live run's one EXEMPTED pair ratio (1.33:1) matches the register's `ribbon-bottom-border` entry exactly |
| `scripts/check-wcag.mjs` | `scripts/lib/harness.mjs` | pinned mobile launch profile | VERIFIED | Live axe scan ran at 390×844 per harness profile, 0 violations |
| `package.json` → `.github/workflows/verify.yml` → `vercel.json buildCommand` | `scripts/verify.mjs` | same unmodified script | VERIFIED | All three read directly and cross-checked; `resolveSteps` only differs by `VERCEL=1` excluding two browser steps, proven by `verify.test.mjs` |
| `components/shell/Ribbon.tsx` | `/?s=limits` | plain anchor | VERIFIED | Read directly, `href="/?s=limits"`, no `<Link>`/`router.push` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full verify gate exits 0 | `npm run verify` | Exit 0, "All steps exited 0", 15/15 steps, real `next build` + axe scan | PASS |
| Fail-fast on unresolved build id | `env -u VERCEL_GIT_COMMIT_SHA -u VERCEL_DEPLOYMENT_ID -u CAPTURE_BUILD_ID NODE_ENV=production npx next build` | Exit 1, exact D-03 error message | PASS |
| Duplicate-literal gate | `node --test scripts/check-governed.test.mjs` | 7/7 pass, including disk-based duplicate/comment/reorder fixtures | PASS |
| Fail-fast runner contract | `node --test scripts/verify.test.mjs` | 15/15 pass, confirms stop-at-first-failure and no skip mechanism | PASS |
| Production reachability, headers, ribbon | `node scripts/check-deployment.mjs --url https://novatek-capture-demo.vercel.app/` | Exit 0, "Problems: 0" | PASS |
| Production headers (independent of project's own probe) | `curl -sI https://novatek-capture-demo.vercel.app/` | `Permissions-Policy: camera=(self), microphone=(self)`, `X-Vercel-Id: cpt1::...`, `X-Frame-Options: SAMEORIGIN` | PASS |
| Preview sentence present, no dismiss markup | `curl -s https://novatek-capture-demo.vercel.app/` | "Preview disclosure", "Designed preview", "synthetic" present; no "dismiss"/"close" markup found | PASS |
| Byte-identity of inherited tokens | `sha256sum app/styles/tokens.inherited.css` + `diff` vs sibling | Matches pinned hash exactly; diff reports identical | PASS |
| CI run status | `gh run view 34214635320 --json headSha,conclusion,status` | `{"conclusion":"success","headSha":"50a246c...","status":"completed"}` | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| REQ-FR-47 | 01-04, 01-05 | Governed sentence defined once, no duplicate literal | SATISFIED | `check-governed.mjs` fixture tests + live 0-problem run |
| REQ-FR-48 | 01-05, 01-06, 01-08, 01-09 | `preview` sentence in document flow, no dismissal control, on every screen | SATISFIED | Live curl of production, `Ribbon.tsx` source, `check-wcag.mjs` ribbon assertions |
| REQ-FR-50 | 01-04 | Build-time claims audit, inherited register, versioned/dated/owned | SATISFIED | `claims-audit.mjs` header + live 0-hit run |
| REQ-FR-65 | 01-01, 01-02, 01-04, 01-06, 01-07, 01-08, 01-09 | One command runs every build-time check | SATISFIED | Live `npm run verify` exit 0, 15 ordered steps |
| REQ-NFR-5 | 01-03, 01-06, 01-07 | 7:1 text contrast, checked automatically in CI | SATISFIED | Live `check-contrast.mjs` run, wired into `verify.mjs` and `verify.yml` |
| REQ-NFR-9 | 01-05, 01-06, 01-07 | WCAG 2.2 AA in full, CI fails on any A/AA violation | SATISFIED | Live `check-wcag.mjs` run, 0 violations, `wcag22aa` startup guard present |
| REQ-SM-5 | 01-04, 01-07, 01-08, 01-09 | No claim trips audit, on every commit | SATISFIED | `.github/workflows/verify.yml` runs on every push; live GH run 34214635320 succeeded; `deployment-gate.md` documents a real red-job demonstration |

No orphaned requirements — the union of all plans' `requirements:` frontmatter (REQ-FR-47, REQ-FR-48, REQ-FR-50, REQ-FR-65, REQ-NFR-5, REQ-NFR-9, REQ-SM-5) exactly matches the phase's declared requirement IDs and REQUIREMENTS.md's "Phase 1" mapping. REQ-FR-48a is correctly excluded — REQUIREMENTS.md maps it to Phase 4, not Phase 1.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|placeholder|coming soon|not yet implemented|not available` across `app/`, `components/`, `lib/`, `scripts/*.mjs` (excluding test files), `vercel.json`, `package.json`, `.github/` returned zero matches. No `return null`/`return {}`/`return []` stub patterns found in components. `app/page.tsx`'s otherwise-empty `<main>` is the intended goal (a labelled shell with nothing to label yet), not a stub — it is a Server Component with real conditional logic (`searchParams` branch to `<Limits />`).

Deviations recorded across all nine SUMMARY.md files were reviewed: all are Rule 1 (bugs found and fixed before/during the same task commit) or Rule 2 (missing-critical items added, e.g., a `<title>` for WCAG 2.4.2, a `.gitattributes` entry to protect the pinned CRLF-sensitive file) — none represent scope reduction, and none left an unresolved gap.

### Human Verification Required

None. The phone check (roadmap success criterion 2's "opens on a phone") was already performed by the developer during plan 01-09's Task 3 checkpoint and is documented with specific, dated evidence in `docs/analysis/vercel-regions.md` ("approved, checked on iPhone and Android" with itemized confirmations: ribbon renders first, undismissable, scrolls with page, Limits surface reachable, no truncation at 200% text). This verifier additionally corroborated the same production URL independently via live `curl` and the project's own deployment probe, both matching the developer's account. No further human action is needed for this phase's goal.

### Gaps Summary

No gaps found. All five roadmap success criteria were independently reproduced against the live repository and the live production deployment — not merely accepted from SUMMARY.md narrative. The one command (`npm run verify`) was actually executed end-to-end (including a real `next build` and a real axe-core scan) and exited 0. The unresolved-build-id failure mode was independently reproduced (exit 1). The duplicate-literal gate's fixture tests were independently executed against real fixture files on disk. The production URL was independently probed via both the project's own script and a bare `curl`, cross-checked against a live `gh run view` of the CI run cited in the summaries. Token byte-identity was independently recomputed via `sha256sum` and `diff` against the sibling repository. No server processes were left running after any of the checks executed during this verification.

---

*Verified: 2026-09-08*
*Verifier: Claude (gsd-verifier)*
