# Phase 1: Scaffold & conventions - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Source:** Ingest intel express path — synthesized from `.planning/intel/` (the locked architecture spine, DESIGN.md, EXPERIENCE.md, the PRD, the seed) and `docs/planning-artifacts/epics.md` Stories 1.1–1.2, scoped to Phase 1. No discuss-phase was run; every decision below is either locked upstream (cited) or is the orchestrator's reconciliation of an upstream gap (marked *[reconciled here]*).

<domain>
## Phase Boundary

A public URL is labelled before it has anything to label, and one command runs every build-time check and exits zero. Phase 1 delivers the repository scaffold on the pinned stack, `vercel.json` for region `cpt1` with the relaxed camera/microphone policy and the uncached worker path, the two token files and the three fonts, `lib/copy/governed.ts` with the eight governed sentences, the ribbon on every screen, a minimal Limits surface reachable from the ribbon, the claims audit with the inherited register, the header, token, governed-literal and worker checks, the contrast and WCAG A/AA checks, and the single `verify` command that runs all of them and fails rather than degrades. It ends with the labelled shell deployed as the project's first production deployment.

Requirements delivered: REQ-FR-47, REQ-FR-48, REQ-FR-50, REQ-FR-65, REQ-NFR-5, REQ-NFR-9, REQ-SM-5.

Not in this phase: fixtures and types (P2); every route, the session cookie, the responder module and the memory store (P3); the gate, order screens, the `pushState` screen switcher and the client projection (P4); the record-binding control, state marks, panels and the target-size, reflow and parity checks (P4–P5); the service worker, manifest, icons and install behaviour (P7); the Limits screen's disposition table, live instance id and storage tri-state (P8).

The repository currently contains no application code: `README.md`, `.gitignore`, `.env.local` (holds `CAPTURE_SESSION_KEY`), `.vercel/project.json` (linked to `prj_5Lq54q2Ck6UkqzzabQoMC9MreI1V`), `docs/`, `_bmad/`, `.planning/`. The sibling repository `../ipv-demo` (commit `8fd097a`, 2026-09-01) is the reference implementation for shape, tokens and the claims audit.

</domain>

<decisions>
## Implementation Decisions

### Stack and scaffold (locked by the spine §Stack, D-STACK)
- **D-01:** Pins are exact: Next.js `16.3.4`, React and React DOM `19.2.8`, TypeScript `5.x`, ESLint `10.9.1` with `eslint-config-next` at the Next version, Node.js `24` declared in `engines` with `@types/node` 24, Playwright `1.62.1` as a dev dependency. Turbopack is the bundler: no `webpack()` key in `next.config.ts`. No `proxy.ts`, `middleware.ts` or any Routing Middleware exists (AD-2). No starter template is used; the scaffold is written by hand.
- **D-02:** The sibling `../ipv-demo` is the reference for `tsconfig.json`, `eslint.config.mjs` shape (`defineConfig` from `eslint/config` with the `globalIgnores` block — but see the ESLint 10 amendment: the sibling's `eslint-config-next/core-web-vitals` import is replaced, not copied), `app/layout.tsx` structure and `app/globals.css` import order — copy the patterns, not its 3D dependencies (`three`, `@react-three/*`, `@sparkjsdev/spark`, `motion`, `postprocessing` are not installed). Source shape follows the seed's cold start: `app/`, `components/`, `lib/`, `public/`, `scripts/`; the code owns the final layout. *Amended 2026-09-05 from research:* `eslint-config-next@16.3.4`'s default export and `/core-web-vitals` subpath crash under ESLint 10.9.1 (reproduced: `eslint-plugin-react` calls the removed `context.getFilename()`), so `eslint.config.mjs` composes `@next/eslint-plugin-next` `configs["core-web-vitals"]`, `eslint-plugin-react-hooks@^7.1.1` `configs.flat["recommended-latest"]` and `eslint-config-next/typescript` directly (verified exit 0); `@types/react-dom` is `^19`, never pinned to `19.2.8`, which does not exist for the types package.
- **D-03:** Build identity: `next.config.ts` sets `env.NEXT_PUBLIC_BUILD_ID` from `VERCEL_GIT_COMMIT_SHA ?? VERCEL_DEPLOYMENT_ID ?? CAPTURE_BUILD_ID`, where `CAPTURE_BUILD_ID` is a developer-supplied value the `verify` script sets from `git rev-parse --short HEAD` for local builds. If none of the three resolves under a production build (`NODE_ENV=production`), config load throws and the build fails. There is no constant fallback anywhere; the seed's `?? "dev"` is retired (AD-15). `next dev` may run without a build id.

### vercel.json, headers and structure checks (locked by the seed §Runtime posture, AD-11, AD-15)
- **D-04:** `vercel.json` declares `"framework": "nextjs"`, `"regions": ["cpt1"]`, and headers: `/api/(.*)` → `Cache-Control: no-store`; `/sw.js` → `Cache-Control: no-cache, no-store, must-revalidate`; `/manifest.webmanifest` → `Cache-Control: max-age=0, must-revalidate`; and on `/(.*)` the document-level policy set including `Permissions-Policy: camera=(self), microphone=(self)` (replacing the sibling's `camera=(), microphone=()`, which makes `getUserMedia` reject regardless of the artisan's answer), carrying forward the sibling's `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN` and `Strict-Transport-Security`. `scripts/check-headers.mjs` reads `vercel.json` and asserts every one of those values by exact string, exiting non-zero on any deviation.
- **D-05:** A structure check (part of the gate, naming at Claude's discretion) asserts by file inspection: no `proxy.ts`/`middleware.ts` at the app or project root (the middleware-absence assertion, AD-15); no `webpack(` in `next.config.ts`; `typescript.ignoreBuildErrors` absent from `next.config.ts`; `tokens.inherited.css` imported before `tokens.capture.css` in `globals.css`.
- **D-06:** *[reconciled here]* `scripts/check-sw.mjs` ships in Phase 1 even though no worker exists yet, because the roadmap's success criterion 1 names the worker check as part of `verify`. Its assertion is real in both states: when `public/sw.js` exists it runs `node --check` on it and requires the never-handle-`/api/` guard; when it does not exist it asserts that no `serviceWorker.register(` call exists anywhere under `app/`, `components/` or `lib/`, so no worker can be registered without passing the guard. It never skips and never warns.

### The honesty module (locked by AD-11, AD-12, AD-22; EXPERIENCE.md §The Honesty Surface; seed §Where each honesty label lives)
- **D-07:** `lib/copy/governed.ts` defines the eight governed sentences exactly once, keyed `preview`, `authoredVerification`, `authoredProposals`, `noRedaction`, `memoryStore`, `noOfflineInference`, `pendingReconciliation`, `mediaOnDevice`, each with the seed's text verbatim (see `.planning/intel/context.md` Topic 13 and `constraints.md` C-30) and a representation of its load-bearing clause so renderers can wrap it in `<strong>` at weight 500. The set of eight is typed as a closed key union. The module also exports, under a distinct name that is not one of the eight, the sentence rendered when a platform `413` arrives with no `X-CAP-Instance` header (AD-11's disclosed exception); that sentence is new copy, marked `[written here]` in a comment, and must pass the claims audit.
- **D-08:** The ribbon is `components/shell/Ribbon.tsx`, rendered by `app/layout.tsx` above `{children}` so every route carries it by construction (FR-48). It follows `constraints.md` C-15 exactly: `<section aria-label="Preview disclosure">`; the `preview` sentence as static text at `{typography.label}` (13 px mono, the single declared exception to the 16 px rule) in `--viewer-ink-dim` with `<strong>` promoted to `--viewer-ink`; a 5 px `--cobalt-glow` dot; `background --navy-deep`, `border-bottom 1px solid --viewer-border`; `min-height: 44px`, `max-height: none`, `position: static`; a 44 px link with visible label "Read the full preview limits" whose hit area fills the band; no dismiss control, no ✕, no chevron, no collapse affordance; never `aria-hidden`; not announced as a region on screen change.
- **D-09:** `scripts/check-governed.mjs` sweeps `app/`, `components/` and `lib/` and fails the build if any governed sentence (whitespace-normalised) appears as a literal outside `lib/copy/governed.ts`, and if `governed.ts` exports anything other than the eight keys plus the named 413 sentence (FR-47, UX-DR-112). It ships with a fixture test proving it fails on a duplicated literal.
- **D-10:** *[reconciled here]* The Limits surface ships in its minimal form: `components/limits/Limits.tsx` renders all eight sentences together at `{typography.prose}` 16 px in `--viewer-ink` with the load-bearing clause in `<strong>`, plus one sentence stating that the preview is English only as a preview limitation and not a product position (new copy, `[written here]`). It is reached at `/?s=limits`. The disposition table, the live instance id, the storage tri-state and the per-phase stated limitations are added by the phases that create them (P3, P5, P7, P8). The ribbon link never reads as a dismiss.
- **D-11:** *[reconciled here]* Phase 1's `app/page.tsx` is a statically prerendered Server Component (AD-14 keeps it so) whose search-params reader sits behind `<Suspense>`: with no `s` it renders the ribbon and an otherwise empty, labelled `<main>` carrying one `screen-title` heading; with `s=limits` it renders the Limits surface. The ribbon link is a plain anchor to `/?s=limits` in this phase; P4 replaces the anchor with the `history.pushState` switcher without changing the URL contract. No `<Link>` and no `router.push` are introduced. *Amended 2026-09-05 from research:* keeping the shell statically prerendered while a child reads `searchParams` inside `<Suspense>` requires `cacheComponents: true` in `next.config.ts`; without it the whole route becomes dynamic. The structure check asserts the static marker beside `/` in `next build` output.

### Tokens, fonts and the design floor (locked by DESIGN.md; constraints.md C-1–C-8, C-15, C-26)
- **D-12:** `app/styles/tokens.inherited.css` is a byte-identical copy of `../ipv-demo/app/styles/tokens.css` as of commit `8fd097a` (4 956 bytes, SHA-256 `11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9`). Because the sibling is not present on Vercel, `scripts/check-tokens.mjs` asserts byte-identity by comparing the file's SHA-256 to that pinned hash, with the parent path, commit and date recorded in the script header; a changed parent is adopted only by re-copying and re-pinning in the same commit. No inherited token is ever deleted or edited.
- **D-13:** `app/styles/tokens.capture.css` loads after the inherited file and contains only: the Layer-2 override tokens (`--viewer-ink-dim #AAB4C0`, `--rule-faint #606D7E`, `--record-fill #7DB3FB`, `--record-fill-armed #93C5FD` declared and unused, `--record-ink #0c1e35`, `--cobalt-glow-ink #8CBDFC`, `--control-border #487FC3`, `--panel-solid #16293F`), the Layer-2 authored tokens (`--dk-good #4ade80`, `--dk-warn #fbbf24`, `--dk-crit #fca5a5`, `--dk-crit-edge #f87171`, `--surface-inset #081424`), the `--space-*` scale on a 4 px base (4, 8, 12, 16, 20, 24, 32, 40, 48), the measured phone tokens (`gutter 16px`, `content 328px`, `row-gap 12px`, `target-record 130px`, `target-min 44px`, `ribbon-min-h 44px`, `ribbon-h-100 89px`, `ribbon-h-150 182px`, `ribbon-h-200 309px`, `ribbon-link-min-h 44px`, `header-h 56px`, `sticky-bar-h 60px`, `viewfinder-min-h 200px`, `safe-x`, `safe-b`), the two dark-ground shadows (`--shadow-panel: 0 18px 48px rgba(4,12,24,0.5)`, `--shadow-sheet: 0 28px 70px rgba(4,12,24,0.62)`), and `--radius-control: 10px`. Every override carries a comment with the measured contrast ratio that forced it, ground-first and panel-second. `--target-record` is 130 px, never 124.
- **D-14:** `app/layout.tsx` loads Syne, DM Sans and JetBrains Mono through `next/font` into `--font-display`, `--font-body` and `--font-mono`; `--navy-deep` is the universal page ground with no light theme, theme switch or `prefers-color-scheme` branch; `viewport.themeColor` is `#0c1e35` and `viewport.viewportFit` is `cover`; CSS uses `env(safe-area-inset-*)` through `--safe-x` and `--safe-b`. `metadata.appleWebApp` and the manifest are P7.
- **D-15:** `app/globals.css` defines the type roles at their exact values — `screen-title` Syne 600 20px/1.25/−0.01em (one per screen), `object-title` Syne 600 17px/1.3/−0.01em, `prose` DM Sans 400 16px/1.55, `prose-sm` 15px/1.55, `control-label` Mono 500 `clamp(15px, 0.9375rem, 23px)`/1.3/0.08em, `tag` Mono 500 15px/1.3/0.04em, `eyebrow` Mono 500 13px/1.2/0.15em, `label` Mono 500 13px/1.3/0.06em, `figure` Mono 500 13px/1.3/0.04em — enforces the 13 px floor (no inherited 8.5–11 px size and no 0.35em tracking is referenced on the phone), applies `font-variant-numeric: tabular-nums` to every figure, and sets the focus ring as `outline: 2px solid var(--cobalt-glow); outline-offset: 2px` on every interactive element. Text inks are restricted to `--viewer-ink`, `--viewer-ink-dim`, `--cobalt-glow-ink`, `--cobalt-wash`, `--white` and the `--dk-good`/`--dk-warn`/`--dk-crit` tones; `--cobalt-glow`, `--rule-faint`, `--dk-crit-edge`, `--record-fill`, `--cobalt` and the inherited `--good`/`--warn`/`--crit` never carry a word.
- **D-16:** `docs/design/dead-token-register.md` lists every retirement from DESIGN.md §The dead-token register with its reason, and `docs/design/decorative-exemptions.json` carries the decorative-exemption register's exactly four entries with their measured ratios (`--viewer-border` 1.33:1; the eyebrow's 40 × 1 px rule at 0.35 opacity, 2.23:1 / 2.17:1; the accept control's 1 px `--control-border` rest border at 1.905:1 against its own fill; `--panel-solid` at 1.136:1 against the ground). The JSON is the contrast check's required input; a below-floor value can enter only by being added to it with a measured ratio.

### The claims audit (locked by FR-50, AD-15; EXPERIENCE.md §Voice and Tone; seed §Where each honesty label lives; ipv-demo HANDOVER.md §3)
- **D-17:** `scripts/claims-audit.mjs` is copied from `../ipv-demo/scripts/claims-audit.mjs` with its `ROOTS = ["app", "components", "lib"]`, its file-extension set, its `allowQuoted` + retirement-marker mechanism and every `PROHIBITED` entry carried verbatim as the inherited register. Its header states: the register version, `inherited from ipv-demo/HANDOVER.md §3 at 8fd097a (2026-09-01)`, `owner: the SHEQ manager`, and that it is a string sweep that cannot detect a prohibited position expressed in new words. It exits 1 on the first prohibited claim.
- **D-18:** The seed's additions are appended as new register entries, each with a note: rule 1's alternation gains `\bfunded by this round\b` (`allowQuoted`); a findings-verb family `\b(as|writes?|files?|records?|reports?|raises?|surfaces?)\s+(a\s+)?findings?\b` for claim-shaped uses, with `RETIREMENT_MARKER` extended by `never as (a )?finding` and `no model`; a subject-guarded camera-detects family `\b(camera|model|AI|vision)\b.{0,40}\b(detects|detected|recognis(es|ed)|identif(ies|ied))\b.{0,30}\b(corrosion|leak|damage|asset|unit)\b`; performance figures `\d+(\.\d+)?\s*(%|x|×)\s*(faster|fewer|less|reduction|saved)` and `\bin under \d+ (seconds|minutes)`; `reduce(s|d)? (reliance on imported|headcount)`; the server-persistence family `\bpersisted (to|in|on) (a |the )?(server|database|cloud)\b|\bencrypted at rest\b|\bsecure(ly)? stored\b`; the word "simulation" in any form; "records never cross the border"; and the TRL-claim, competitor-name and modelled-savings-as-cash entries named by REQ-FR-50. Every addition ships with a positive and a negative fixture in `scripts/claims-audit.test.mjs` (`node:test`) that `verify` runs.
- **D-19:** All copy written in Phase 1 follows the eight voice rules (mechanism not mood; the actor named; every refusal with a next act; never more or less than is true; no exclamation, celebration or praise; never a euphemism for a limitation; the artisan's words are theirs; passes the register), uses the PRD §3 vocabulary verbatim, and never implies the artisan is measured, ranked, replaced or deskilled. The only newly authored sentences in this phase are the 413 sentence (D-07) and the English-only limitation (D-10); each carries `[written here]` beside it.

### The gate: one command that fails rather than degrades (locked by AD-15, FR-65; roadmap success criteria 1 and 4)
- **D-20:** `package.json` exposes `"verify": "node scripts/verify.mjs"`. `scripts/verify.mjs` runs, in order, stopping at the first non-zero exit: `next typegen` (where the project has route types to generate), `tsc --noEmit`, `eslint .` (`next lint` no longer exists), `check-tokens`, `check-governed`, the claims audit and its fixture tests, `check-headers`, `check-sw`, the structure check, `next build` (with `CAPTURE_BUILD_ID` set from git when no Vercel variable is present), then the contrast check and the WCAG A/AA check against the built output. No check emits a warning in place of a failure; no environment variable, flag or config value skips a check; `typescript.ignoreBuildErrors` is never set.
- **D-21:** The contrast check computes WCAG 2.2 contrast ratios from the resolved token values for every ink-on-ground pair used by the Phase 1 surfaces, listed in a pairs manifest beside the script, with the floor 7:1 for text and 3:1 for non-text, reading `docs/design/decorative-exemptions.json` as the only source of permitted exceptions; a pair below its floor that is not in the register fails the build. The WCAG A/AA check runs axe-core through the Playwright 1.62.1 harness against the production build (`next build` then `next start`) on `/` and `/?s=limits` at a 390 × 844 mobile viewport and fails on any A or AA violation. `scripts/lib/harness.mjs` is created here with the seed's launch profile (Chromium, viewport 390 × 844, `deviceScaleFactor` 3, `isMobile`, `hasTouch`; the fake-media flags are added when P5 needs them).
- **D-22:** *[resolved 2026-09-05 from research]* AD-15 requires that deployment runs the same command as a developer. Mechanism: `.github/workflows/verify.yml` runs the full, unmodified `npm run verify` (after `npx playwright install --with-deps chromium`) on every push; Vercel's Build Command runs the non-browser subset of the same script (`verify.mjs` with the axe step excluded by an explicit environment marker, never a skip flag a developer could use); and Vercel **Deployment Checks** (Settings → Deployment Checks → Add Checks → GitHub, job name `verify`) holds production aliasing until the Actions job succeeds, so a failing check stops the deployment. Reason: Vercel's build container likely cannot run `playwright install --with-deps` (MEDIUM confidence, community-sourced). The plan includes one cheap falsification — add the Playwright install to Vercel's Install Command on a branch and read the build log — and if it succeeds, Vercel's Build Command becomes the full `verify` too. The handover states which path is live.
- **D-23:** Each check script ships with a fixture-driven test that proves it exits non-zero on a violation (a bad `vercel.json`, a duplicated governed literal, a modified token file, a prohibited claim, a worker without the guard), so the success criterion "non-zero when any one check fails" is demonstrated rather than asserted.

### Deployment and the scheduled closures (locked by D-DEPLOY; roadmap Phase 1 scheduled closures)
- **D-24:** The branch model is the seed's: work is pushed to `dev` for a Vercel Preview and merged to `main` for Production in region `cpt1`; the phase ends with the labelled shell as the project's first production deployment, opening on a phone without a Vercel login and showing the `preview` sentence before any other surface exists. Deployment Protection must be off and System Environment Variables access on; both are dashboard-only actions the user performs, so the plan carries them as a non-autonomous checkpoint with exact instructions, and `CAPTURE_SESSION_KEY` is confirmed present on Production and Preview (it already is, per the seed).
- **D-25:** The three scheduled closures are recorded as artefacts, not prose: the live Vercel region list is re-read and `cpt1` confirmed in `docs/analysis/vercel-regions.md` with the date; the TypeScript 6/7 migration and the ESLint 10 rule-cleanup scope are written into `docs/analysis/scheduled-work.md` as scheduled work with the spine's stated reason for the TypeScript 5 exception; the Vercel project settings confirmation is recorded in the same regions file.

### Claude's Discretion
- Whether `verify.mjs` shells out to each check or imports them as modules; the exact file names of the structure and contrast checks; whether `next typegen` is invoked when no route handlers exist yet.
- How `governed.ts` represents the load-bearing clause (a `{ before, strong, after }` shape, a marker string, or a small render helper), provided the rendered sentence is verbatim and the `<strong>` lands on the clause EXPERIENCE.md bolds.
- The JSON shape of the exemption register and the contrast pairs manifest.
- How the axe run is wired (a `node:test` file driving Playwright, or a standalone script) and how Chromium is installed in each environment, subject to D-22.
- The wordmark: `components/brand/` may be copied from the sibling's `components/brand` untouched (UX-DR-87) if the empty `<main>` benefits from it; not required by any Phase 1 requirement.

</decisions>

<specifics>
## Specific Ideas

- The seed's Phase 1 gate, which `verify` grows from: `next typegen && tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-headers.mjs && node scripts/check-sw.mjs && eslint . && next build` — green on an empty page; a preview URL opens on a phone without a Vercel login.
- "The first deployment of a new project is a production deployment regardless of flags — so P1 ships `governed.ts` and the ribbon before any other surface, so a public URL is labelled before it has anything to label."
- The ribbon's measured heights are the budget everything else is derived from: 89 px at 100 % text, 182 px at 150 %, 309 px at 200 %, inner width 311 px; "the ribbon is measured, never estimated".
- The sibling's `vercel.json` ships `camera=(), microphone=()`; the header check exists because that one line would make `getUserMedia` reject on every device regardless of what the artisan taps.
- `.env.local` already carries `CAPTURE_SESSION_KEY`; the Vercel project is Git-connected and linked in `.vercel/project.json`; `.gitignore` already ignores `.env.*`, `.vercel/`, `scripts/out/` and `scripts/.check/`.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The locked architecture (precedence 0)
- `docs/planning-artifacts/architecture/architecture-novatek-capture-demo-2026-09-02/ARCHITECTURE-SPINE.md` §AD-11 (one responder; the 413 disclosed exception), §AD-12 (one definition per governed sentence; platform claims), §AD-13 (`lib/limits`), §AD-15 (the one gate), §AD-22 (the honesty surface may only be strengthened), §Consistency Conventions, §Stack, §Structural Seed → Deployment and environments, §Capability → Architecture Map (P1 row)
- `.planning/intel/decisions.md` — the same decisions extracted per AD with `binds` lists; D-STACK, D-DEPLOY, D-CONV, D-DEP

### Requirements and the phase
- `.planning/REQUIREMENTS.md` — REQ-FR-47, REQ-FR-48, REQ-FR-50, REQ-FR-65, REQ-NFR-5, REQ-NFR-9, REQ-SM-5 (with verification methods)
- `.planning/ROADMAP.md` §Phase 1 — goal, five success criteria, scheduled closures
- `docs/planning-artifacts/prds/prd-novatek-capture-demo-2026-09-01/prd.md` §4.8 (the honesty surface), §4.10 (NFR-5, NFR-9), §6.1 (phase map)
- `docs/planning-artifacts/epics.md` lines 548–626 — Story 1.1 "Ship the labelled shell before anything else" (acceptance criteria for this phase) and Story 1.2 (the primitives; only the token, type-role and focus-ring parts land in P1)

### Design contract (precedence 1; governs measured figures)
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/DESIGN.md` §Brand & Style (two token files), §Colors (four grounds, ink permissions, the decorative-exemption register), §Typography (roles, 13 px floor, control-label clamp), §Layout & Spacing (spacing scale, phone tokens, the ribbon budget), §Elevation & Depth (two shadows), §Shapes (radius language), §Components → Ribbon, §The dead-token register, §Do's and Don'ts
- `.planning/intel/constraints.md` C-1–C-8, C-15, C-23, C-26 — the same, extracted with values
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/EXPERIENCE.md` §Foundation, §The Honesty Surface (the eight sentences verbatim and where each renders), §Voice and Tone (the eight rules; the claims audit as a gate), §What this file settles that the sources left open
- `.planning/intel/constraints.md` C-30, C-31 — the same, extracted

### The seed (precedence 5; authoritative for these specifics)
- `docs/CAPTURE-PLAN-SEED.md` §Repo file tree (cold-start shape), §Service worker (the `vercel.json` headers), §Where each honesty label lives (sentences, the claims-audit additions with regexes), §Build order (Phase 1 row and gate), §Risks and gotchas (items 1, 4, 11, 13, 15, 16), §How the build is run
- `.planning/intel/context.md` Topics 12, 13, 14, 16, 17 — the same, extracted

### The sibling repository (reference implementation; copy patterns, not dependencies)
- `../ipv-demo/app/styles/tokens.css` — the file `tokens.inherited.css` must equal byte for byte (SHA-256 `11a78756…6eb9` at `8fd097a`)
- `../ipv-demo/scripts/claims-audit.mjs` — the inherited register, `ROOTS`, `allowQuoted` and retirement-marker mechanism
- `../ipv-demo/HANDOVER.md` §1 (the governing insight), §3 (CLAIMS DISCIPLINE — the register's source)
- `../ipv-demo/vercel.json`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`, `package.json`, `app/layout.tsx`, `app/globals.css` — shape references
- `../ipv-demo/components/brand/` — the mark and wordmark, if carried

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `../ipv-demo/app/styles/tokens.css` (4 956 bytes): copied verbatim as `tokens.inherited.css`.
- `../ipv-demo/scripts/claims-audit.mjs`: the audit script and register, extended per D-17/D-18.
- `../ipv-demo/eslint.config.mjs` and `tsconfig.json`: reusable as-is apart from the ESLint 10 / Next 16.3 version check.
- `../ipv-demo/components/brand/`: the inherited mark and wordmark (UX-DR-87), untouched if used.

### Established Patterns
- The sibling's `verify` is `tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-model.mjs --require && next build`; this project's `verify` follows the same one-command shape and grows per D-20.
- The sibling's `vercel.json` header blocks are the template; region and the camera/microphone policy are the two lines that change.
- The sibling imports `tokens.css` first in `globals.css`; here `tokens.inherited.css` then `tokens.capture.css`, in that order, asserted by the structure check.

### Integration Points
- There is no existing application code. `README.md` states "repository seeded; nothing built yet" and should be updated to reflect the labelled shell at the end of the phase.
- `.vercel/project.json` links the repo to the Vercel project; `.env.local` carries `CAPTURE_SESSION_KEY` (unused until P3) and a Vercel OIDC token.
- `.gitignore` already covers `node_modules/`, `.next/`, `*.tsbuildinfo`, `next-env.d.ts`, `.env.*`, `.vercel/`, `scripts/out/`, `scripts/.check/`.

</code_context>

<deferred>
## Deferred Ideas

- The session-key config that fails fast under production, the responder module and every route — P3.
- The record-binding control (130 px), the secondary control, the seven state marks, the split panel primitive, the queue row and conflict card, and the target-size, reflow (320 px / 200 %) and accept/reject parity checks — P4 and P5, where their NFRs are bound. Story 1.2 groups them; the roadmap places them.
- The `history.pushState` screen switcher, focus management on transition, and the client projection — P4.
- `app/manifest.ts`, icons, `metadata.appleWebApp`, `public/sw.js` and the coherent-shell precache, the update offer — P7.
- The Limits screen's disposition table, live `X-CAP-Instance`, storage tri-state and the FR-3/FR-45/FR-50/FR-58/FR-63 stated limitations — P8 (each limitation lands with the phase that creates it).
- `lib/limits` — created by the first phase that needs a bounded value (P3 for store caps and TTL), not here.
- The single-writer, actor-field, fixture-inputs, register-isolation, manifest-ban and accepted-field rules — added to `verify` by the phases that create what they check.

</deferred>

---

*Phase: 01-scaffold-conventions*
*Context gathered: 2026-09-05 via ingest intel express path*
