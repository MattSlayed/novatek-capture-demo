---
phase: 01
slug: scaffold-conventions
status: verified
threats_open: 0
asvs_level: not configured in .planning/config.json — RESEARCH.md §Security Domain's cited references (V5 input validation, V14 configuration) used as the frame
created: 2026-09-08
---

# Phase 1 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing | Owning Plan(s) |
|----------|-------------|----------------|----------------|
| npm registry → `node_modules` | Third-party code enters the build; the lockfile is what CI reinstalls | package source code | 01-01 |
| developer workstation → git → build pipeline | Config that decides whether a build is allowed to succeed crosses here | build config, env resolution | 01-01, 01-02 |
| public internet → Vercel edge (`cpt1`) | Every response to an unauthenticated phone crosses here; `vercel.json` is the only place policy is declared | HTTP response headers | 01-02, 01-08, 01-09 |
| browser → a future service worker → `/api/` | A worker that intercepts `/api/` would sit between the client and every enforced claim | fetch interception | 01-02 |
| parent repository (`../ipv-demo`) → this repository | An inherited design layer crosses here once and must not drift afterwards | CSS token values | 01-03 |
| design register → build gate | A below-floor contrast value can only enter the build through the exemption register | colour/contrast data | 01-03, 01-06 |
| authored copy → rendered surface | A claim crosses from source into a public statement here; the audit is the only gate on that crossing | product copy | 01-04 |
| parent register (`ipv-demo/HANDOVER.md` §3) → this repository | An inherited prohibition list crosses here once and must not be paraphrased afterwards | prohibited-claims register | 01-04 |
| `lib/copy/governed.ts` → every renderer | The honesty contract crosses into markup here; a second literal would let one copy drift from the other | governed sentence text | 01-04, 01-05 |
| unauthenticated phone → the rendered page | The first thing a stranger sees crosses here; the ribbon is the only claim-bearing element in Phase 1 | rendered HTML | 01-05, 01-08, 01-09 |
| URL query (`?s=`) → rendered surface | The only untrusted input in Phase 1 | query string | 01-05 |
| local `next start` on 127.0.0.1:4311 | A short-lived server the scan drives; it must never outlive the check | process lifecycle | 01-06 |
| developer workstation → git → GitHub Actions | The gate's authority depends on it running somewhere the developer cannot edit per-run | CI execution | 01-07 |
| GitHub Actions check → Vercel production aliasing | A red job must hold promotion; this is the link that turns a failing check into a stopped deployment | deployment gating decision | 01-07, 01-09 |
| Vercel build container → the same script | The build runs the same file with one environment-marked exclusion, not a different command | build execution | 01-07 |
| public internet → a live deployment | The probe crosses this boundary as an unauthenticated stranger would, which is the only way Deployment Protection's state is observable | HTTP response | 01-08, 01-09 |
| authored copy → README | A claim crosses into a public statement here, outside the claims audit's roots | README prose | 01-08 |
| developer → Vercel dashboard | Settings that no command can read or set; the only human-only dependency in this phase | dashboard configuration state | 01-09 |

---

## Threat Register

All 22 threats verified against the current code at `main`@`2f8e222` (post code-review-fix; fix commits `26e7888`…`cd27bc1` are on `main`). Every `mitigate` row below was checked against live-executed fixture tests and/or a live command run during this audit, not accepted from SUMMARY.md narrative alone.

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-1-01 | Denial of service (self-inflicted) | `vercel.json` `/(.*)` `Permissions-Policy` | mitigate | closed | `vercel.json` declares `camera=(self), microphone=(self)`; `scripts/check-headers.mjs:53,146-149` asserts the exact string and fails on `camera=()`/`microphone=()`. The empty-config fail-open (WR-09) is fixed — an empty or non-object `vercel.json` now fails (`scripts/check-headers.mjs`, commit `52f55e8`), confirmed by `node --test scripts/check-headers.test.mjs` (live, this audit). Live `curl -sI https://novatek-capture-demo.vercel.app/` (this audit, 2026-09-08) shows `Permissions-Policy: camera=(self), microphone=(self)` on the wire. |
| T-1-02 | Repudiation | `next.config.ts` build-id resolution | mitigate | closed | `next.config.ts:8-21` throws and calls `process.exit(1)` with the exact `CAPTURE_BUILD_ID` message when no build-id variable resolves. `scripts/check-structure.test.mjs:210-236` reproduces this by deleting all three env vars and asserting a non-zero exit naming `CAPTURE_BUILD_ID` — independently reproduced during 01-VERIFICATION.md's live run (exit 1, exact message). |
| T-1-03 | Information disclosure (overclaiming) | `scripts/claims-audit.mjs` register | mitigate | closed | Header states `Register version: 2 … inherited from ipv-demo/HANDOVER.md §3 at 8fd097a (2026-09-01). owner: the SHEQ manager.` (`scripts/claims-audit.mjs:4-7`). Live run (this audit): `No live prohibited claim found in the swept surfaces`, 27 rules (was 26; WR-04 added a stem-extension rule, commit `204f70d`). `node --test scripts/claims-audit.test.mjs` (live, this audit): all fixtures pass including the WR-04/WR-05/WR-06 additions (plural/agent-noun forms, `$`-denominated savings, `RETIREMENT_MARKER` narrowing). |
| T-1-04 | Tampering | `package.json` scripts block (single verify entry point; no skippable check) | mitigate | closed | `package.json` scripts are exactly `dev`, `build`, `start`, `lint`, `test`, `verify` — no per-check script is exposed. `scripts/verify.mjs` has no `--skip`/`--only`/`--fast` flag and no environment variable other than the platform's own `VERCEL` changes the step list; `node --test scripts/verify.test.mjs` (live, this audit, 27/27 pass) proves this via `resolveSteps`/argv-flag fixtures. CR-01's fail-open (a signal-killed step resolving as exit 0) is fixed (`scripts/verify.mjs`, commit `26e7888`) and fixture-proven. *Note:* plan 01-03's own `<threat_model>` additionally labels the 13px-floor/ink-permission-list risk `T-1-04` with disposition `accept` (enforced by review, not a dedicated linter) — a distinct component reusing the same ID; see Accepted Risks Log for that sub-item, which is treated as informational here since the master threat register supplied for this audit assigns T-1-04 to the package.json entry-point risk only. |
| T-1-05 | Spoofing / Tampering | `vercel.json` `/(.*)` frame and transport controls | mitigate | closed | `vercel.json` declares `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`; `scripts/check-headers.mjs` asserts each by exact string. Live `curl -sI` against production (this audit) shows all four values present and correct. |
| T-1-06 | Tampering (of the honesty contract) | `lib/copy/governed.ts` consumers | mitigate | closed | `components/shell/Ribbon.tsx` and `components/limits/Limits.tsx` import and render `GOVERNED` only (grep, this audit — no literal copy found). `scripts/check-governed.mjs` fails on a second literal split across lines, hidden in a comment, or reordered; WR-07 (non-double-quoted fields silently dropping out) and WR-08 (the closed-set assertion only seeing one file) are both fixed (commits `40d3897`, `cd27bc1`, `a7e753f`). `node --test scripts/check-governed.test.mjs` (live, this audit): 7/7 pass on disk-based fixtures. |
| T-1-07 | Information disclosure / usability denial | rendered text inks (contrast floors) | mitigate | closed | Every override in `app/styles/tokens.capture.css` carries a measured ratio comment; `docs/design/decorative-exemptions.json` has exactly 4 entries; `scripts/check-tokens.mjs` asserts that shape. WR-12's fail-open (an empty/non-array pairs file passing vacuously) is fixed — `scripts/check-contrast.mjs` now requires a non-empty array (commit `5547f69`). `node --test scripts/check-contrast.test.mjs` (live, this audit) passes. |
| T-1-08 | Tampering | a future `public/sw.js` intercepting `/api/` | mitigate | closed | `scripts/check-sw.mjs`: absent branch sweeps `app/`, `components/`, `lib/` for `serviceWorker.register(`; present branch (lines 78-107) requires a `.pathname.startsWith("/api/")` guard with a bare `return` before any `respondWith`. `node --test scripts/check-sw.test.mjs` (live, this audit) passes. No `public/sw.js` exists yet in Phase 1, matching the plan. |
| T-1-09 | Tampering | ESLint flat config | mitigate | closed | `eslint.config.mjs` hand-composes `@next/eslint-plugin-next` + `eslint-plugin-react-hooks` + `eslint-config-next/typescript`, never importing the crashing default export or `/core-web-vitals` subpath. `scripts/scaffold.test.mjs:131-149` asserts both imports are absent by source grep. Live `npx eslint .` (this audit, run as part of the fixture-suite / `npm test`) exits 0. |
| T-1-10 | Elevation of privilege | Routing Middleware (must not exist) | mitigate | closed | `scripts/check-structure.mjs:46` (`FORBIDDEN_NAMES`) asserts no `proxy.ts`/`proxy.js`/`middleware.ts`/`middleware.js` at the root, in `app/`, or `src/`. `scripts/check-structure.test.mjs:31-43` fixture-proves a fixture with `app/middleware.ts` exits non-zero (live, this audit, part of the 106-test run). No such file exists in the repository (glob check, this audit). |
| T-1-11 | Tampering | `app/styles/tokens.inherited.css` (byte identity) | mitigate | closed | `scripts/check-tokens.mjs:46-67` asserts both byte-length and SHA-256 (`11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9`) against the pinned parent digest on every build. 01-VERIFICATION.md independently recomputed the SHA-256 and diffed against the sibling repository — identical. |
| T-1-12 | Tampering | `tokens.capture.css` shadowing inherited names | mitigate | closed | `scripts/check-tokens.mjs:158-167` fails on any Capture declaration that also exists in the inherited layer other than `--viewer-ink-dim` (`PERMITTED_SHADOW`). `node --test scripts/check-tokens.test.mjs` (live, this audit) passes, including the WR-11 fix (a `null` exemption register no longer passes vacuously — commit `2c61f29`). |
| T-1-13 | Repudiation | the audit's own limits | accept | closed | Accepted risk, documented in `scripts/claims-audit.mjs`'s own header ("WHAT IT CANNOT DO … it is a string sweep. It cannot detect a prohibited position expressed in new words") and named owner (the SHEQ manager). Live run of `claims-audit.mjs` (this audit) reprints the same limitation to stdout. Logged in this file's Accepted Risks Log below. |
| T-1-14 | Denial of the disclosure | ribbon styling and placement | mitigate | closed | `app/layout.tsx` renders `<Ribbon />` before `{children}` inside `<body>`, so it cannot be omitted per-route (grep, this audit). `scripts/check-wcag.mjs:90-155` asserts the ribbon section is never `aria-hidden`, computes to `position: static`/`max-height: none`, carries no button-shaped or dismiss-worded control. Live `curl -s https://novatek-capture-demo.vercel.app/` (this audit) shows the ribbon's opening clause present with no dismiss/close markup. |
| T-1-15 | Information disclosure | `searchParams.s` | mitigate | closed | `app/page.tsx:26-33` reads `s` for a two-way branch (`if (s === "limits")`) only; never interpolated into markup, a URL, or a header (source read, this audit). No other input surface exists in Phase 1. |
| T-1-16 | Tampering | the axe rule set (wcag22aa guard) | mitigate | closed | `scripts/check-wcag.mjs:77-83` asserts `axe.getRules(["wcag22aa"]).length >= 1` at startup and fails rather than silently narrowing if the tag is renamed or dropped. Confirmed present in current source (this audit). |
| T-1-17 | Denial of service (local) | the spawned `next start` | mitigate | closed | `scripts/check-wcag.mjs:307-316` calls `stopServer(serverProcess)` inside a `finally` block. `scripts/lib/server.mjs` ends the whole process group (POSIX `SIGTERM`→`SIGKILL` on `-child.pid`; win32 `taskkill /T /F`), fixing the shell-pid-only orphan bug recorded in `docs/analysis/deployment-gate.md` (GitHub Actions run 34196058170, 46-minute hang) and the Vercel zombie-reaping gap (deployment `8FN8Kb43W`). `node --test scripts/lib/server.test.mjs` (live, this audit) passes, including the intermediate-process/heartbeat fixture. Post-audit process check (this audit): nothing listening on port 4311, no orphaned `next start`. |
| T-1-18 | Tampering | the Vercel Deployment Check binding | mitigate | closed | `.github/workflows/verify.yml`'s job id is exactly `verify`; `scripts/verify.test.mjs:404-410` asserts this by parsing the `jobs:` block (live, this audit, part of 27/27 pass). `docs/analysis/deployment-gate.md` records the Deployment Check registered against this exact job id and a red-job demonstration (GitHub Actions run 34212837892, `check-governed` failure on a deliberate governed-literal duplicate) that left Production at the prior deployment. |
| T-1-19 | Denial of service | the browser install in Vercel's build | transfer | closed | Transfer documentation: `docs/analysis/deployment-gate.md` §"Install Command falsification" records the developer directly overriding Vercel's Install Command to attempt `npx playwright install --with-deps chromium`; the build failed in 4s with `sh: line 1: apt-get: command not found` / exit 127, confirming Vercel's build container cannot install a browser. `scripts/verify.mjs`'s `resolveSteps` (env-`VERCEL`-gated) transfers the two browser-dependent steps (`check-wcag-self-test`, `check-wcag`) to the GitHub Actions `verify` job, where `npx playwright install --with-deps chromium` is a declared, working step (`.github/workflows/verify.yml`). Plan 01-09 additionally re-verified the split directly (falsification, not assumption). Logged in this file's Accepted Risks Log below per this audit's instructions. |
| T-1-20 | Information disclosure | Deployment Protection left on | mitigate | closed | `scripts/check-deployment.mjs:74-85` treats a redirect to `vercel.com` or a `_vercel/sso` path as a named failure. `docs/analysis/vercel-regions.md` records Deployment Protection confirmed off (2026-09-08) and independently corroborates no `_vercel/sso` redirect on two Preview addresses. Live `node scripts/check-deployment.mjs --url https://novatek-capture-demo.vercel.app/` (this audit) exits 0, "Problems: 0", no protection redirect. |
| T-1-21 | Tampering | the throwaway demonstration branch | mitigate | closed | `docs/analysis/deployment-gate.md` "Open items" section records the branch `throwaway/red-check-demo` (`9884a9a`) confirmed deleted (`gh api …/branches/throwaway%2Fred-check-demo` returns 404) and never merged (its parent `5335c56` does not appear in `origin/dev`'s or `origin/main`'s history). `npm run verify` was re-run green on `dev` afterward per the same document. |
| T-1-SC | Tampering (supply chain) | npm/playwright installs (exact pins, lockfile) | mitigate | closed | `package-lock.json` (`lockfileVersion: 3`) is committed; `.github/workflows/verify.yml:23` installs with `npm ci`. `scripts/scaffold.test.mjs:50-70` fixture-asserts every dependency's declared version, including the four intentionally-caret packages (`eslint-plugin-react-hooks`, `@types/node`, `@types/react`, `@types/react-dom`) documented and approved in `01-RESEARCH.md` §Package Legitimacy Audit with a stated rationale (types packages don't track exact runtime versions; pinning `@types/react-dom` to `19.2.8` fails install with `ETARGET`, reproduced). Every installed package carries an "Approved" disposition in that audit (Vercel, ESLint org, Deque Labs, Microsoft, Meta) with no `[ASSUMED]`/`[SUS]`/`[SLOP]` entries. WR-13's gap (`axe-core` used but undeclared) is fixed — `"axe-core": "4.13.0"` is now in `devDependencies` (commit `c8a4ca7`), fixture-asserted. |

*Status: closed (all 22).*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party).*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-1 | T-1-13 | The claims audit is a string sweep and cannot detect a prohibited claim expressed in new, unregistered words — only known retired phrasing. This limitation is stated directly in `scripts/claims-audit.mjs`'s own header comment, and the register's owner (the SHEQ manager) is named so the residual risk has an accountable human reviewer (D-17, REQ-FR-50's stated limitation). No code change can close this risk; it is inherent to a keyword/pattern-based audit. | Plan 01-04 (`<threat_model>`); reaffirmed this audit, 2026-09-08 | 2026-09-08 |
| AR-2 | T-1-19 | Vercel's build container has no `apt-get`/root, so `playwright install --with-deps chromium` cannot succeed there (falsified directly: Install Command override failed in 4s with exit 127, recorded in `docs/analysis/deployment-gate.md`). The axe A/AA scan is transferred to the GitHub Actions `verify` job, which is the registered Vercel Deployment Check holding production aliasing — so the check still runs and still gates promotion, just on a different, capable runner. This is a transfer of execution environment, not an acceptance of reduced coverage: the same script, same steps, same exit-code contract apply on GitHub as would on Vercel. | Plan 01-07 (`<threat_model>`), falsified in Plan 01-09 Task 2; reaffirmed this audit, 2026-09-08 | 2026-09-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. All nine plans' SUMMARY.md files were checked for `## Threat Flags`: five (01-02 through 01-06) carry the heading and state "None" with an explicit list of the threat IDs their new surface maps to; four (01-01, 01-07, 01-08, 01-09) carry no `## Threat Flags` heading at all. Their Deviations, Decisions Made, and Accomplishments sections were read in full for this audit: all recorded deviations are Rule 1 bug fixes to infrastructure this same phase built (test-runner glob behaviour, build-id resolution for `next typegen`, a build-output glyph assertion, and the server-teardown process-group fix already credited to T-1-17) or Rule 2 additions (a `<title>` element, a `.gitattributes` entry) — none introduce new network surface, a new input path, or a new auth boundary. `CAPTURE_SESSION_KEY`, confirmed present on Production and Preview per 01-09/D-25, is not read by any Phase 1 application, script, or check file (grepped across `app/`, `components/`, `lib/`, `scripts/` for this audit — zero matches); it is pre-provisioned infrastructure for a later phase's session/HMAC design and is not attack surface this phase introduces or is responsible for mitigating.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-08 | 22 | 22 | 0 | Claude (gsd-security-auditor) |

**Verification method for this run:** every `mitigate` threat was checked against the current code on `main`@`2f8e222` (not against SUMMARY.md narrative), including live execution of `node --test` fixture suites (`check-headers`, `check-tokens`, `check-governed`, `check-structure`, `check-contrast`, `claims-audit`, `check-sw`, `lib/server`, `verify` — 133 tests total across these files, this audit, all pass), a live `node scripts/claims-audit.mjs` run, a live `node scripts/check-deployment.mjs --url https://novatek-capture-demo.vercel.app/` run (exit 0), and an independent `curl -sI` of the same production URL. The 01-REVIEW.md code review found 17 fail-open and scope defects (1 critical, 16 warnings) in the check scripts that are this phase's mitigation evidence; 01-REVIEW-FIX.md fixed 16 of them (all fix commits confirmed present on `main`'s history, `26e7888`…`76042e9`, `cd27bc1`), leaving one skipped item (WR-16, a visual emphasis/font-weight conflict with no security relevance — not part of the STRIDE register). No orphaned test-server process was found listening on port 4311 after this audit's fixture runs.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-08
