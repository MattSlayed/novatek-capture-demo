# Phase 1: Scaffold & conventions - Research

**Researched:** 2026-09-05
**Domain:** Next.js 16.3.4 App Router scaffold, Vercel deployment gating, ESLint 10 flat config, WCAG 2.2 AA automated verification
**Confidence:** HIGH (stack/tooling facts empirically verified by installing and executing the real packages); MEDIUM (Vercel build-container internals — community-sourced, not official docs)

## Summary

Two findings change what the planner writes beyond what CONTEXT.md already locked.

**First:** `eslint-config-next@16.3.4`'s default export and `/core-web-vitals` subpath depend on `eslint-plugin-react@7.37.5`, which **crashes at runtime** under ESLint `10.9.1` (`TypeError: contextOrFilename.getFilename is not a function` — a removed API). Reproduced by installing the exact pinned versions and running `eslint .` for real, not inferred. `eslint-config-next/typescript` (typescript-eslint only) is unaffected. Fix: hand-roll a flat config importing `@next/eslint-plugin-next` + `eslint-plugin-react-hooks@^7` directly (both ESLint-10-safe) plus `eslint-config-next/typescript` — verified working, see Code Examples.

**Second:** D-11's "statically prerendered Server Component whose searchParams reader sits behind `<Suspense>`" needs `cacheComponents: true` in `next.config.ts`. Without it, reading `searchParams` anywhere — even inside `<Suspense>` — opts the *entire route* into dynamic rendering. This is a `next.config.ts` addition not named in any D-NN.

**D-22 (resolved):** the Playwright+axe step should not run inside Vercel's own build. Vercel's build container likely has no apt-get/root, which `playwright install --with-deps` needs (community-sourced, MEDIUM confidence). Vercel ships a native mechanism for exactly this gate shape — **Deployment Checks** — holding production promotion until a named GitHub Actions check succeeds. Recommend: `verify.mjs` (full, unmodified) runs as a GitHub Actions workflow on every push; Vercel's Build Command runs the non-browser subset; Vercel Deployment Checks (GitHub Checks type) gates production promotion on the Actions run.

**Primary recommendation:** hand-roll `eslint.config.mjs` per the verified pattern below; add `cacheComponents: true` to `next.config.ts`; wire D-22 through GitHub Actions + Vercel Deployment Checks, not Vercel's build step.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-FR-47 | Governed sentence defined once; no duplicate literal | `check-governed.mjs` is a plain `node:fs` sweep, same shape as inherited `claims-audit.mjs` — no new dependency. |
| REQ-FR-48 | `preview` sentence in document flow, every screen, no dismissal | `next/font` + `layout.tsx` composition verified via Context7; ribbon renders above `{children}` by construction. |
| REQ-FR-50 | Build-time claims audit fails build on violation | Inherited script uses only `node:fs/promises` — no new dependency risk. |
| REQ-FR-65 | One command runs every check | `verify.mjs` orchestration; D-22 (GitHub Actions + Vercel Deployment Checks) determines how the gate reaches the deployment, not just the shell. |
| REQ-NFR-5 | 7:1 text contrast, CI-checked | W3C relative-luminance/contrast formula confirmed verbatim below; alpha-compositing flagged as engineering practice, not W3C-specified. |
| REQ-NFR-9 | WCAG 2.2 AA in full, CI fails on A/AA violation | `@axe-core/playwright` version/peer confirmed against Playwright 1.62.1; WCAG 2.2 rule-enablement flagged as Open Question. |
| REQ-SM-5 | No claim trips audit, every commit | Same script as FR-50; "every commit" satisfied by the GitHub Actions workflow (D-22) on every push. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` at repo root (confirmed by listing). `_bmad/` and `.claude/skills/` hold only BMad workflow skills, not implementation conventions. No directives beyond CONTEXT.md's locked decisions apply.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Stack and scaffold**
- **D-01:** Pins are exact: Next.js `16.3.4`, React and React DOM `19.2.8`, TypeScript `5.x`, ESLint `10.9.1` with `eslint-config-next` at the Next version, Node.js `24` declared in `engines` with `@types/node` 24, Playwright `1.62.1` as a dev dependency. Turbopack is the bundler: no `webpack()` key in `next.config.ts`. No `proxy.ts`, `middleware.ts` or any Routing Middleware exists (AD-2). No starter template; scaffold written by hand.
- **D-02:** `../ipv-demo` is the reference for `tsconfig.json`, `eslint.config.mjs`, `app/layout.tsx` structure, `app/globals.css` import order — copy patterns, not its 3D dependencies. Source shape: `app/`, `components/`, `lib/`, `public/`, `scripts/`.
- **D-03:** Build identity: `next.config.ts` sets `env.NEXT_PUBLIC_BUILD_ID` from `VERCEL_GIT_COMMIT_SHA ?? VERCEL_DEPLOYMENT_ID ?? CAPTURE_BUILD_ID`. If none resolves under production build, config load throws and the build fails. No constant fallback; `next dev` may run without a build id.

**vercel.json, headers and structure checks**
- **D-04:** `vercel.json` declares `"framework": "nextjs"`, `"regions": ["cpt1"]`, headers including `Permissions-Policy: camera=(self), microphone=(self)` (replacing the sibling's `camera=(), microphone=()`). `scripts/check-headers.mjs` reads `vercel.json` and asserts every value by exact string.
- **D-05:** Structure check asserts: no `proxy.ts`/`middleware.ts`; no `webpack(` in `next.config.ts`; `typescript.ignoreBuildErrors` absent; `tokens.inherited.css` imported before `tokens.capture.css`.
- **D-06:** `scripts/check-sw.mjs` ships even with no worker yet: with `public/sw.js` present, runs `node --check` and requires the never-handle-`/api/` guard; absent, asserts no `serviceWorker.register(` call exists anywhere. Never skips, never warns.

**The honesty module**
- **D-07:** `lib/copy/governed.ts` defines eight governed sentences exactly once (`preview`, `authoredVerification`, `authoredProposals`, `noRedaction`, `memoryStore`, `noOfflineInference`, `pendingReconciliation`, `mediaOnDevice`), closed key union, plus a distinct 413-disclosure sentence (new copy, `[written here]`).
- **D-08:** Ribbon is `components/shell/Ribbon.tsx`, rendered by `app/layout.tsx` above `{children}`. `<section aria-label="Preview disclosure">`; `preview` sentence at `{typography.label}` (13px mono); `--cobalt-glow` dot; `min-height: 44px`; 44px link "Read the full preview limits"; no dismiss control; never `aria-hidden`.
- **D-09:** `scripts/check-governed.mjs` sweeps `app/`, `components/`, `lib/`; fails on any duplicate literal or unexpected export from `governed.ts`. Ships with a fixture test.
- **D-10:** Limits surface ships minimal: `components/limits/Limits.tsx` renders all eight sentences plus an English-only limitation sentence (new copy). Reached at `/?s=limits`.
- **D-11:** `app/page.tsx` is a statically prerendered Server Component whose search-params reader sits behind `<Suspense>`: no `s` → ribbon + empty labelled `<main>`; `s=limits` → Limits surface. Plain anchor to `/?s=limits`, no `<Link>`, no `router.push`.

**Tokens, fonts and the design floor**
- **D-12:** `app/styles/tokens.inherited.css` byte-identical to `../ipv-demo/app/styles/tokens.css` at commit `8fd097a` (4,956 bytes, SHA-256 `11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9`). `scripts/check-tokens.mjs` asserts byte-identity by hash.
- **D-13:** `app/styles/tokens.capture.css` loads after the inherited file; contains only named Layer-2 override/authored tokens, the `--space-*` scale, measured phone tokens, two shadows, `--radius-control: 10px`. `--target-record` is 130px, never 124.
- **D-14:** `app/layout.tsx` loads Syne, DM Sans, JetBrains Mono via `next/font` into `--font-display`/`--font-body`/`--font-mono`; `--navy-deep` universal ground, no light theme; `viewport.themeColor: "#0c1e35"`, `viewport.viewportFit: "cover"`; `env(safe-area-inset-*)` via `--safe-x`/`--safe-b`.
- **D-15:** `app/globals.css` defines exact type roles (`screen-title`, `object-title`, `prose`, `prose-sm`, `control-label`, `tag`, `eyebrow`, `label`, `figure`); 13px floor enforced; `font-variant-numeric: tabular-nums` on figures; focus ring `outline: 2px solid var(--cobalt-glow); outline-offset: 2px`.
- **D-16:** `docs/design/dead-token-register.md` and `docs/design/decorative-exemptions.json` (four entries with measured ratios) are the contrast check's required input.

**The claims audit**
- **D-17:** `scripts/claims-audit.mjs` copied from `../ipv-demo` verbatim as the inherited register; header states version/inheritance date/owner (SHEQ manager).
- **D-18:** Seed's additions appended as new register entries (funding claim, findings-verb family, camera-detects family, performance figures, server-persistence family, "simulation", "records never cross the border", TRL/competitor/modelled-savings entries), each with positive+negative fixtures in `scripts/claims-audit.test.mjs` (`node:test`).
- **D-19:** All Phase 1 copy follows the eight voice rules; only new sentences are the 413 sentence and English-only limitation, each marked `[written here]`.

**The gate**
- **D-20:** `package.json` exposes `"verify": "node scripts/verify.mjs"`, running in order: `next typegen`, `tsc --noEmit`, `eslint .`, `check-tokens`, `check-governed`, claims audit + fixtures, `check-headers`, `check-sw`, structure check, `next build`, contrast check, WCAG A/AA check. No warnings in place of failures; nothing skippable; `typescript.ignoreBuildErrors` never set.
- **D-21:** Contrast check computes WCAG 2.2 ratios from resolved token values (floor 7:1 text, 3:1 non-text), reading `docs/design/decorative-exemptions.json` as the only permitted-exception source. WCAG A/AA check runs axe-core through Playwright 1.62.1 against the production build (`next build` then `next start`) on `/` and `/?s=limits` at 390×844. `scripts/lib/harness.mjs` created here (Chromium, 390×844, `deviceScaleFactor` 3, `isMobile`, `hasTouch`).
- **D-22 (research question, resolved below):** AD-15 requires deployment to run the same command as a developer. Mechanism undecided: Vercel build command is `npm run verify` directly, OR `verify` runs in GitHub Actions with Vercel gated on that check, OR axe runs in both places. Plan must state which, why, and how a failing check stops the deployment.
- **D-23:** Each check script ships a fixture-driven test proving non-zero exit on a violation.

**Deployment and scheduled closures**
- **D-24:** Branch model: `dev` → Preview, `main` → Production (`cpt1`). Deployment Protection off, System Environment Variables on — dashboard-only, non-autonomous checkpoint with exact instructions. `CAPTURE_SESSION_KEY` confirmed present on Production and Preview.
- **D-25:** Scheduled closures recorded as artefacts: live Vercel region list re-read (`docs/analysis/vercel-regions.md`), TypeScript 6/7 + ESLint 10 cleanup scope (`docs/analysis/scheduled-work.md`), Vercel project settings confirmation.

### Claude's Discretion
- Whether `verify.mjs` shells out to each check or imports them as modules; exact file names of structure/contrast checks; whether `next typegen` runs when no route handlers exist yet.
- How `governed.ts` represents the load-bearing clause, provided the rendered sentence is verbatim and `<strong>` lands correctly.
- The JSON shape of the exemption register and contrast pairs manifest.
- How the axe run is wired and how Chromium is installed per environment — **subject to D-22, resolved below.**
- The wordmark: `components/brand/` may be copied from the sibling untouched if the empty `<main>` benefits from it; not required by any Phase 1 requirement.

### Deferred Ideas (OUT OF SCOPE)
- Session-key config, responder module, every route — P3.
- Record-binding control, secondary control, state marks, split panel, queue row, conflict card, target-size/reflow/parity checks — P4/P5.
- `history.pushState` screen switcher, focus management on transition, client projection — P4.
- `app/manifest.ts`, icons, `metadata.appleWebApp`, `public/sw.js`, coherent-shell precache, update offer — P7.
- Limits screen's disposition table, live `X-CAP-Instance`, storage tri-state, per-phase stated limitations — added by the phases that create them.
- `lib/limits` — created by the first phase needing a bounded value (P3).
- Single-writer, actor-field, fixture-inputs, register-isolation, manifest-ban, accepted-field rules — added by the phases that create what they check.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary | Rationale |
|------------|-------------|-----------|-----------|
| Governed sentence rendering | Frontend Server (SSR, static) | Browser (hydrates the anchor) | `layout.tsx`/`page.tsx` are Server Components; no client state needed. |
| Screen selection (`?s=limits`) | Frontend Server (dynamic island) | — | Needs `cacheComponents: true` + `<Suspense>` to keep the shell static while `searchParams` streams. |
| Build-time checks (tokens/governed/claims/headers/sw/structure) | Build tooling | — | Pure `node:fs`/`node:crypto` sweeps in `verify.mjs`; never shipped to a runtime tier. |
| WCAG contrast computation | Build tooling | — | Computed from static token values; no browser needed. |
| WCAG A/AA scanning (axe-core) | CI (GitHub Actions), not Vercel build | — | Needs a rendered page (`next start` + Chromium); Vercel's build container likely lacks the system deps `--with-deps` needs (MEDIUM confidence). |
| HTTP security headers | CDN/Static (Vercel edge, `vercel.json`) | — | D-04 locks `vercel.json` as sole source; don't duplicate in `next.config.ts` `headers()` — two sources would defeat `check-headers.mjs`'s exact-string assertion. |
| Production-promotion gating | CDN/Static (Vercel Deployment Checks) | CI (produces the check) | Native Vercel feature; holds custom-domain aliasing until the named GitHub check succeeds. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | `16.3.4` [VERIFIED: npm registry] | Framework, App Router, Turbopack | Locked D-01; confirmed published. |
| react / react-dom | `19.2.8` [VERIFIED: npm registry] | UI runtime | Locked D-01. |
| typescript | `5.9.3` [VERIFIED: npm registry] | Type checking | Latest 5.x. `typescript@latest` is now `7.0.2`, but `typescript-eslint@8.69.0`'s peer is `>=4.8.4 <6.1.0` — **the sourced reason for the TypeScript-5 exception**: the ESLint-10-compatible lint chain doesn't support TS 6/7 yet. |
| eslint | `10.9.1` [VERIFIED: npm registry] | Linting | Locked D-01; confirmed published. |
| eslint-config-next | `16.3.4` [VERIFIED + reproduced crash] | TS-aware rules only, via `/typescript` | **Never import the default export or `/core-web-vitals` — see Pitfalls.** `/typescript` (typescript-eslint only) is unaffected. |
| @next/eslint-plugin-next | `16.3.4` [VERIFIED + reproduced working] | Next-specific rules (`no-img-element` etc.) | Zero ESLint-version peer surface (`fast-glob`, `@eslint-community/eslint-utils` only). Use `configs["core-web-vitals"]` directly. |
| eslint-plugin-react-hooks | `^7.1.1` [VERIFIED + reproduced working] | Hooks lint rules | Peer includes `^10.0.0` — the only "web vitals" piece already ESLint-10-safe. Flat config is `configs.flat["recommended-latest"]`, not `configs["recommended-latest"]` (legacy shape, throws a config error). |
| playwright | `1.62.1` [VERIFIED: npm registry] | Browser automation, WCAG gate | Locked D-01; confirmed a real stable release. |
| @axe-core/playwright | `4.13.0` [VERIFIED: npm registry] | WCAG scanning via Playwright | Peer `playwright-core: >=1.0.0` — no friction against 1.62.1. Bundles `axe-core ~4.13.0`. |
| @types/node | `^24` [VERIFIED: npm registry] | Node typings | Caret, not exact pin — versions don't track Node's numbering. |
| @types/react, @types/react-dom | `^19` [VERIFIED: npm registry] | React typings | **Never pin `19.2.8`** — `@types/react-dom` latest published is `19.2.7`; pinning `19.2.8` fails install with `ETARGET` (reproduced). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript-eslint | `^8.69.0` (transitive) | TS-aware lint rules | Auto-pulled via `eslint-config-next/typescript`'s `^8.46.0` range; npm resolves the newest 8.x, the first to support ESLint 10. Don't pin separately. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `eslint-plugin-jsx-a11y` | Omit for Phase 1 | Latest (`6.10.2`) peer-caps at ESLint `^9`; direct install fails without `--legacy-peer-deps` (reproduced). `@axe-core/playwright` (D-21) is materially stronger — no coverage gap. |
| `eslint-plugin-import` | `eslint-plugin-import-x@4.17.1` [VERIFIED] if wanted | Maintained fork, peer already includes `^10.0.0`. Not required by any Phase 1 requirement — skip for now. |
| Vercel build running full `verify` incl. Playwright/axe | GitHub Actions + Vercel Deployment Checks | See D-22 resolution below. |

**Installation:**
```bash
npm install next@16.3.4 react@19.2.8 react-dom@19.2.8
npm install -D eslint@10.9.1 eslint-config-next@16.3.4 @next/eslint-plugin-next@16.3.4 \
  eslint-plugin-react-hooks@^7.1.1 typescript@5.9.3 playwright@1.62.1 @axe-core/playwright@4.13.0 \
  @types/node@^24 @types/react@^19 @types/react-dom@^19
npx playwright install chromium --with-deps
```
Every version was confirmed via `npm view` against the live registry (2026-09-05); the ESLint/Next combination was confirmed by a real `npm install` + `node eslint/bin/eslint.js .` run against a scratch project pinned to the exact D-01 versions — not a dry-run.

## Package Legitimacy Audit

All packages are long-established, officially-maintained (Vercel, ESLint org, Deque Labs, Microsoft, Meta) packages named in CONTEXT.md's locked stack or found via official docs — none from unverified web search. `slopcheck` was not run this session; given provenance plus this session's direct registry + runtime verification, all are `[OK]` by inspection.

| Package | Age | Downloads/wk | Source Repo | Verification | Disposition |
|---------|-----|--------------|-------------|-----------|-------------|
| next, react, react-dom | 5–10+ yrs | 10M+ | vercel/next.js, facebook/react | Registry + Context7 | Approved |
| eslint | 12+ yrs | 40M+ | eslint/eslint | Registry + eslint.org | Approved |
| eslint-config-next, @next/eslint-plugin-next | ships w/ Next | tied to Next | vercel/next.js | Registry + source read directly | Approved, **usage restricted** |
| eslint-plugin-react-hooks | 8+ yrs | 20M+ | facebook/react | Registry + reproduced working | Approved |
| playwright, @axe-core/playwright | 5–6+ yrs | 5M+, 200K+ | microsoft/playwright, dequelabs/axe-core-npm | Registry | Approved |
| typescript | 13+ yrs | 50M+ | microsoft/TypeScript | Registry | Approved |

**Removed `[SLOP]`:** none. **Flagged `[SUS]`:** none — `eslint-plugin-jsx-a11y`/`eslint-plugin-import` excluded for a *functional* reason (Alternatives Considered), not legitimacy.

## Architecture Patterns

### System Architecture Diagram
```
Push (dev/main) ──┬──────────────────────────┬──> Vercel Git integration:
                   │                          │    build = verify:build (non-browser
                   ▼                          │    subset) → next build → deployment
        GitHub Actions (on: push)             │    created (preview aliased now;
        npm run verify — FULL command:        │    production NOT yet aliased)
        typegen→tsc→eslint→checks→next build   │
        →next start→axe A/AA→contrast          │
                   │ reports check "verify"    │
                   ▼                           │
        Vercel Deployment Checks ──────────────┘
          pass ─> alias to production (cpt1) ─> phone opens labelled shell
          fail ─> stays un-aliased; production keeps serving last good deploy
```

### Recommended Project Structure
```
app/layout.tsx, page.tsx, globals.css, styles/{tokens.inherited,tokens.capture}.css
components/shell/Ribbon.tsx, limits/Limits.tsx
lib/copy/governed.ts
scripts/verify.mjs, check-{tokens,governed,headers,sw,structure,contrast,wcag}.mjs,
        claims-audit.mjs (+.test.mjs), lib/harness.mjs
.github/workflows/verify.yml
vercel.json, next.config.ts, eslint.config.mjs
```

### Pattern 1: Static shell with a streamed dynamic island (D-11)
Keep `page.tsx` a plain Server Component; a child reads `searchParams` inside `<Suspense>`.
```tsx
// app/page.tsx — Source: github.com/vercel/next.js .../migrating-to-cache-components.mdx
import { Suspense } from "react";
import { Ribbon } from "@/components/shell/Ribbon";
import { Limits } from "@/components/limits/Limits";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Ribbon />
      <Suspense fallback={null}>
        <Screen searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Screen({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { s } = await searchParams;
  if (s === "limits") return <Limits />;
  return <main aria-label="screen"><h1 className="screen-title">…</h1></main>;
}
```
Companion requirement in `next.config.ts`: `cacheComponents: true` — without it the whole route opts into dynamic rendering and D-11's "statically prerendered" claim is false, though it still functions. Recommend a structure-check assertion (grep `next build` output for the static marker next to `/`).

### Pattern 2: ESLint 10 flat config without the crashing dependency
Compose `@next/eslint-plugin-next` + `eslint-plugin-react-hooks` + `eslint-config-next/typescript` directly; never import `eslint-config-next`'s default export or `/core-web-vitals`.
```js
// eslint.config.mjs — verified 2026-09-05 against eslint@10.9.1 + eslint-config-next@16.3.4 + next@16.3.4
import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  nextPlugin.configs["core-web-vitals"],
  reactHooks.configs.flat["recommended-latest"],
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```
Reproduced result: exit 0, correctly flags a real `@next/next/no-img-element` violation and a real `@typescript-eslint/no-unused-vars` warning.

### Anti-Patterns to Avoid
- **`import nextVitals from "eslint-config-next/core-web-vitals"`:** crashes at lint time under ESLint 10.9.1 (reproduced). Don't copy this line from the sibling as-is.
- **Pinning `@types/react-dom` to `19.2.8`:** that patch doesn't exist for the types package; install fails with `ETARGET`.
- **Declaring security headers in both `vercel.json` and `next.config.ts` `headers()`:** two sources of truth defeats `check-headers.mjs`'s exact-string assertion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WCAG A/AA scanning | Custom DOM accessibility checker | `@axe-core/playwright`'s `AxeBuilder` | Encodes hundreds of maintained, audited WCAG rules. |
| Byte-identity of `tokens.inherited.css` | Custom diff/hash routine | `node:crypto` `createHash("sha256")` | Already implied by D-12's pinned hash; no external dependency needed. |
| Google Fonts loading | Manual `<link>` + font-face CSS | `next/font/google` with `variable` | Handles subsetting, self-hosting, `font-display`, CSS-variable wiring in one call. |
| ESLint's "web vitals" rule bundle | Re-implementing Next's rule set by hand | `@next/eslint-plugin-next` `configs["core-web-vitals"]` | Already dependency-free re: ESLint version; hand-rolling duplicates Vercel's own maintained rules for no benefit. |

**Key insight:** the one place this phase *should* hand-roll is exactly what D-21 specifies — contrast computation and fixture-driven check scripts — because no package reads this project's specific token file and exemption register. Everything else above has a maintained library; use it.

## Common Pitfalls

### Pitfall 1: `eslint-config-next`'s default export crashes under ESLint 10
`eslint .` throws `TypeError: contextOrFilename.getFilename is not a function` on the first file linted. Root cause: the base `index.js` imports `eslint-plugin-react@7.37.5`, whose `Components.js` calls `context.getFilename()` — removed from ESLint 10's rule-context API. The plugin's own peer range (`^3 || … || ^9.7`) already signals this; npm only warns (`ERESOLVE overriding peer dependency`) instead of blocking, so the broken combo installs silently. Same cause makes `npm ls` report `code ELSPROBLEMS` even though `npm install`/`eslint` both succeed — don't add `npm ls` as a `verify` step expecting exit 0. **Avoid:** use Pattern 2's config; import only `eslint-config-next/typescript`. **Warning sign:** a clean install with ERESOLVE warnings is not proof of runtime compatibility — test-run the tool.

### Pitfall 2: Vercel's build container likely can't run `playwright install --with-deps`
Chromium's shared libs (`libnss3`, `libatk-bridge2.0-0`, etc.) need `apt-get`/root; Vercel's build sandbox probably doesn't grant it (MEDIUM confidence — consistent community reports, no official Vercel doc either way). **Avoid:** route the axe/Playwright step through GitHub Actions (D-22), not Vercel's Build Command. **Falsify cheaply:** add the install to Vercel's Install Command and read the build log for an apt-get/permission failure before investing further.

### Pitfall 3: `next build` runs a second, separate `tsc` pass
A type error can appear reported twice — once from the explicit `tsc --noEmit` step, once from `next build`'s internal check (raw `tsc` output, no Next code frames). Next 16 defaults `experimental.useTypeScriptCli` to true: `next build` shells to the project-local `tsc` binary, checking whatever `tsconfig.json`'s `include` reaches, including test files if in scope [CITED: nextjs.org/docs — useTypeScriptCli]. **Avoid:** no action needed for Phase 1 (`.mjs` fixtures are outside TS's `include`); flag for later phases adding `.ts` test files.

### Pitfall 4: axe-core's WCAG 2.2 rule set may be disabled by default
`runOnly: { type: "tag", values: ["wcag22aa"] }` could return zero rules if the installed build still gates 2.2-mapped rules behind an experimental flag. axe-core's indexed docs say 2.2 rules are "disabled by default... until wider adoption" [CITED: dequelabs/axe-core rule-descriptions.md] — possibly stale relative to 4.13.0, since WCAG 2.2 has been a W3C Recommendation since October 2023 (Open Question, not asserted). **Avoid:** at implementation time, run `node -e "console.log(require('axe-core').getRules(['wcag22aa']).length)"` against the installed version before trusting the tag; if gated, combine with `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa` and rely on D-21's contrast script for SC 1.4.6.

## Code Examples

### `next.config.ts` — build-id resolution + cacheComponents (D-03 + Pattern 1)
```ts
// Sources: nextjs.org/docs/messages/next-config-error; .../cacheComponents.mdx
import type { NextConfig } from "next";

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.CAPTURE_BUILD_ID;

if (!buildId && process.env.NODE_ENV === "production") {
  throw new Error(
    "CAPTURE_BUILD_ID unresolved: set VERCEL_GIT_COMMIT_SHA, VERCEL_DEPLOYMENT_ID, or CAPTURE_BUILD_ID before a production build.",
  );
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId ?? "dev" },
};

export default nextConfig;
```
A throw during `next.config.ts` evaluation surfaces as Next's documented "next.config.js Loading Error" class, halting the CLI rather than silently falling back [CITED: nextjs.org/docs/messages/next-config-error]. In a non-interactive build this exits non-zero.

### `.github/workflows/verify.yml` — the D-22 gate
```yaml
name: verify
on: push
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run verify
```
Register this job's name (`verify`) in **Settings → Deployment Checks → Add Checks → GitHub**, after confirming the repo is linked and automatic production aliasing is on [CITED: vercel.com/docs/deployment-checks, 2026-08-11].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `next lint` | `eslint .` | Next.js `16.0.0` removed `next lint` and the `eslint` key in `next.config.js` [CITED: nextjs.org/docs] | `package.json`'s `"lint"` script and `verify.mjs` must call `eslint .` directly; sibling already made this change. |
| `experimental.ppr` | `cacheComponents: true` | Next.js 16 | Same mechanism, renamed and promoted out of `experimental`; still opt-in. |
| Vercel "Ignored Build Step" hack for external-CI-gated promotion | Native "Deployment Checks" (GitHub Checks type) | Vercel changelog "Native Deployment Checks are now available" [CITED: vercel.com/docs/deployment-checks, 2026-08-11] | D-22 now has an officially-supported mechanism — no need for the older workaround. |
| TypeScript compiler API in-process during `next build` | Project-local `tsc` CLI by default (`useTypeScriptCli`) | Documented Aug 2026 [CITED: nextjs.org/docs] | Diagnostics are raw `tsc` output; checks whatever `tsconfig.json`'s `include` reaches. |

**Deprecated:** `eslint-config-next`'s bundled a11y/import/react rule set is unusable with this project's pinned ESLint — treat the sibling's `eslint.config.mjs` as a pattern to *adapt*, not copy verbatim (D-02 anticipated this: "apart from the ESLint 10 / Next 16.3 version check").

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel's build container lacks apt-get/root, blocking `playwright install --with-deps` | Pitfall 2, D-22 | If wrong, the single-command `verify` (D-22 Option 1) becomes viable and the GitHub Actions split is extra infrastructure — low cost if built anyway; worth a 10-min spike first. |
| A2 | axe-core 4.13.0's WCAG 2.2 rules may still be default-disabled per stale-looking doc text | Pitfall 4 | If enabled (likely), no harm — the verification command confirms either way. If truly disabled and missed, NFR-9 could silently under-test. |
| A3 | A throw in `next.config.ts` during production build exits the CLI non-zero | Code Examples, D-03 | Reasoned from Next's documented error class + Node module-loading semantics, not an explicit "exit code 1" statement. Cheap fix regardless: add explicit `process.exit(1)` in the thrown branch. |

## Open Questions (RESOLVED)

1. **Does installed `axe-core@4.13.0` actually enable WCAG 2.2 A/AA rules by default?** — RESOLVED 2026-09-06 by running the installed package: `axe-core@4.13.0` from the registry exposes 105 rules; the `wcag22aa` tag exists and carries exactly one rule, `target-size` (SC 2.5.8 Target Size (Minimum)); no `wcag22a` tag exists (WCAG 2.2's new Level A criteria have no automated axe rule). The WCAG check therefore runs `runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }` (70 rules in the union; `wcag22a` is omitted because the tag does not exist) and asserts at startup that `axe.getRules(["wcag22aa"]).length >= 1`, so an axe upgrade that renames the tag fails the check instead of silently narrowing it. Evidence: `node -e "const a=require('axe-core'); console.log(a.getRules(['wcag22aa']).map(r=>r.ruleId))"` → `[ 'target-size' ]`. Deque's "disabled pending adoption" note is stale for this version.
2. **Is Vercel's build container genuinely unable to run `playwright install --with-deps`?** — RESOLVED by decision, not by evidence: CONTEXT.md D-22 makes the deployment gate independent of the answer. GitHub Actions runs the full, unmodified `verify` (with Chromium) on every push; Vercel's Build Command runs the non-browser subset under an explicit environment marker; Vercel Deployment Checks on the `verify` job hold production promotion until that job is green. The falsification (add `npx playwright install --with-deps chromium` to the Vercel Install Command on a branch and read the build log) is a plan task whose outcome can only *widen* Vercel's Build Command to the full `verify`; nothing in Phase 1 waits on it, and the handover records which path is live.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build scripts, `node:test` | ✓ local dev | Confirm ≥24 before scaffold | Install via nvm/fnm if older |
| npm registry access | Package installation | ✓ verified this session | — | — |
| Vercel dashboard access | D-24 checkpoint | Assumed ✓ (`.vercel/project.json` linked) | — | None — human-only; carry as `checkpoint:human-verify` |
| GitHub Actions (D-22) | `verify` gate reaching production | Depends on repo's GitHub plan | — | Free/generous at this scale — no fallback needed |
| System Chromium deps | `@axe-core/playwright` | ✓ on `ubuntu-latest` via `--with-deps` | ✗ likely unavailable in Vercel's build container (A1) | Route through GitHub Actions per D-22 |

**Missing dependencies with no fallback:** none blocking — the one dashboard-only dependency is already a D-24 checkpoint.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 24) for fixture-driven check scripts; Playwright's bundled browser automation for the WCAG scan |
| Config file | none yet — Wave 0 creates `scripts/claims-audit.test.mjs`; the WCAG check can use `chromium.launch()` directly via `scripts/lib/harness.mjs` rather than the full Playwright Test runner |
| Quick run command | `node --test scripts/*.test.mjs` |
| Full suite command | `npm run verify` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-FR-47 | Duplicate governed literal fails build | fixture | `node --test scripts/check-governed.test.mjs` | ❌ Wave 0 |
| REQ-FR-48 | Ribbon present, undismissable, every screen | integration | `node scripts/check-wcag.mjs` | ❌ Wave 0 |
| REQ-FR-50 | Claims audit fails on prohibited string | fixture | `node --test scripts/claims-audit.test.mjs` | ❌ Wave 0 (script inherited, test new) |
| REQ-FR-65 | `verify` exits non-zero on any check failing | fixture, one per check | `node --test scripts/*.test.mjs` | ❌ Wave 0 |
| REQ-NFR-5 | 7:1 text contrast on every Phase 1 pair | unit | `node scripts/check-contrast.mjs` | ❌ Wave 0 |
| REQ-NFR-9 | No WCAG A/AA violation on `/` and `/?s=limits` | integration | `node scripts/check-wcag.mjs` | ❌ Wave 0 |
| REQ-SM-5 | Claims audit runs every commit | CI wiring | `.github/workflows/verify.yml` → `npm run verify` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test scripts/*.test.mjs` (fast, no browser)
- **Per wave merge:** `npm run verify` (full, including `next build` + axe)
- **Phase gate:** Full suite green in GitHub Actions before the production Deployment Check passes

### Wave 0 Gaps
- [ ] `scripts/*.test.mjs` — one fixture-driven test per check script (D-23); none exist (fresh repo)
- [ ] `scripts/lib/harness.mjs` — shared Playwright launch profile (D-21)
- [ ] `.github/workflows/verify.yml` — the CI job the Vercel Deployment Check depends on
- [ ] Framework install: `npx playwright install --with-deps chromium` (local dev + CI, not Vercel build)

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 (Auth, Session, Access Control) | No — Phase 3 | — |
| V5 Input Validation | Marginal | `searchParams` reads only `s` for a two-way branch — no injection surface, no structured input in Phase 1. |
| V6 Cryptography | Marginal | `node:crypto` `createHash("sha256")` for the token-file byte-identity check (D-12) — standard library. |
| V14 Configuration | Yes | HTTP security headers via `vercel.json` (D-04): `Permissions-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Strict-Transport-Security`. `typescript.ignoreBuildErrors`/`webpack()` explicitly forbidden (D-05). |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Missing/incorrect `Permissions-Policy` silently disabling camera/mic for later phases | DoS (self-inflicted) | `check-headers.mjs` asserts the exact string `camera=(self), microphone=(self)` — confirmed valid Permissions-Policy grammar this session. |
| Clickjacking via missing frame-ancestors control | Tampering/Spoofing | `X-Frame-Options: SAMEORIGIN` carried forward (D-04). |
| Claims-register drift from the inherited source | Info disclosure (overclaiming) | D-17/D-18's version+date+owner header, enforced by SM-5's every-commit run. |
| Build succeeding with an unresolved build id, defeating attribution headers | Repudiation | D-03's throw-on-unresolved-build-id, confirmed to surface as a documented Next.js error class, not a silent fallback. |

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js` — env inlining, `viewport`/`next/font`, `searchParams`+`<Suspense>`, `cacheComponents`, `next typegen`, `next lint` removal; Context7 `/dequelabs/axe-core` — `runOnly`/tag API, WCAG 2.2 note
- nextjs.org/docs/messages/next-config-error; .../useTypeScriptCli; .../config/eslint (16.0.0 removal)
- vercel.com/docs/regions (2026-08-11) — 20-region list, `cpt1`/`af-south-1` confirmed
- vercel.com/docs/deployment-checks (2026-08-11) — native GitHub-Checks-gated promotion
- vercel.com/docs/deployment-protection (2026-08-28) — dashboard path, default-on for new projects
- vercel.com/docs/environment-variables/system-environment-variables (2026-07-15) — `VERCEL_GIT_COMMIT_SHA`/`VERCEL_DEPLOYMENT_ID` build+runtime; exact checkbox text
- w3.org/WAI/WCAG22/Techniques/general/G18 — luminance/contrast formulas, verbatim
- npm registry (`npm view`, this session) — every version/peer-dependency claim in Standard Stack
- Direct execution: real `npm install` + `node eslint/bin/eslint.js .` against exact D-01 versions in a scratch project, reproducing both the crash and the fix

### Secondary (MEDIUM confidence)
- chris.lu "Next.js 16 Linting setup using ESLint 10 flat config" — corroborated the hand-rolled approach; verification here is the direct reproduction
- Community reports (ZenRows, rafay99.com) on Vercel build-container `apt-get` restrictions — no official doc confirming/denying for the build step specifically

### Tertiary (LOW confidence)
None retained — every finding was reproduced directly or traced to a primary source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions and ESLint-10 compatibility verified by direct registry query and real execution
- Architecture (cacheComponents/Suspense, D-22): HIGH for Next.js mechanics (official docs), MEDIUM for the Vercel-build-container claim (no official confirmation)
- Pitfalls: HIGH — reproduced or sourced from dated official documentation

**Research date:** 2026-09-05
**Valid until:** 2026-10-05 (30 days) for Vercel platform facts. Re-verify the ESLint/eslint-config-next finding sooner if either package publishes a new major before implementation — that is the one finding a routine upstream patch could invalidate.
