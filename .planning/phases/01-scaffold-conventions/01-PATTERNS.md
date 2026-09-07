# Phase 1: Scaffold & Conventions - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 33 (new — this repo has no application code yet)
**Analogs found:** 25 / 33 have a usable analog in `../ipv-demo` (13 exact/strong role-and-flow matches, 12 shape-or-partial matches). 8 files have no analog at all (see **No Analog Found**). Two of the 25 — `check-contrast.mjs` and `check-wcag.mjs` — have an analog only for their report/harness shell, not their core computation; both are cross-listed under **No Analog Found** for that reason, so that table has 10 rows.

**Analog codebase:** `../ipv-demo` (sibling repo, commit referenced by CONTEXT.md as `8fd097a`, 2026-09-01). Scope searched: `app/`, `components/`, `lib/`, `scripts/` (excluding `scripts/.check/`, `scripts/out/` — generated artefacts, not code), plus root `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vercel.json`, `HANDOVER.md` §3. Confirmed absent: `.github/`, any `*.test.mjs`, any `node:test` usage, any `lib/copy/` module. Confirmed present and byte-verified: `app/styles/tokens.css` (4,956 bytes, SHA-256 `11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9` — **matches CONTEXT.md D-12's pinned hash exactly**, re-verified this session with `certutil -hashfile`).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/layout.tsx` | provider (root layout) | request-response | `../ipv-demo/app/layout.tsx` | role-match (structure identical; font-variable wiring must change) |
| `app/page.tsx` | route | request-response + streaming | RESEARCH.md Pattern 1 (primary); `../ipv-demo/app/page.tsx` (import/export shape only) | partial — sibling has no `searchParams`/`Suspense`; RESEARCH.md's example is purpose-built |
| `app/globals.css` | config (styles) | transform | `../ipv-demo/app/globals.css` | role-match (reset/focus/sr-only reusable; theme branch must NOT be copied) |
| `app/styles/tokens.inherited.css` | config (data file) | file-I/O | `../ipv-demo/app/styles/tokens.css` | **exact** — literal byte-for-byte copy source, hash-verified |
| `app/styles/tokens.capture.css` | config (styles) | transform | `../ipv-demo/app/styles/tokens.css` (as a naming-convention reference only) | partial — mostly new token names, one real override (`--viewer-ink-dim`) |
| `components/shell/Ribbon.tsx` | component | request-response | `../ipv-demo/components/deepdive/PartPanel.tsx` (empty-state branch) | role-match — closest static `<section aria-label>` shape in the codebase |
| `components/limits/Limits.tsx` | component | request-response | `../ipv-demo/components/deepdive/PartPanel.tsx` (empty-state branch) | role-match — same static-content-in-a-landmark shape |
| `components/brand/*` (optional, Claude's Discretion) | component | request-response | `../ipv-demo/components/brand/Brand.tsx` (+ `brand.module.css`) | **exact** — literal copy candidate, untouched (UX-DR-87) |
| `lib/copy/governed.ts` | model (data module) | transform | `../ipv-demo/lib/data/types.ts` (closed-union + `Record<Key,V>` shape) | role-match only — no copy-governance precedent exists |
| `scripts/verify.mjs` | utility (orchestrator) | batch | `../ipv-demo/package.json` line 12 (`verify` script) | shape-match — sibling's is a one-liner; this one grows into a file per D-20 |
| `scripts/check-tokens.mjs` | utility (validation) | file-I/O | `../ipv-demo/scripts/check-model.mjs` | shape-match (byte-length/threshold pattern; hash check itself is new) |
| `scripts/check-governed.mjs` | utility (validation) | batch | `../ipv-demo/scripts/claims-audit.mjs` | **strong** — same directory-walk-and-sweep shape, inverted purpose |
| `scripts/check-headers.mjs` | utility (validation) | file-I/O | `../ipv-demo/scripts/check-model.mjs` | shape-match only — sibling never validates its own `vercel.json` |
| `scripts/check-sw.mjs` | utility (validation) | file-I/O | `../ipv-demo/scripts/check-model.mjs` (missing-file branch, lines 69-82) | **strong** — near-identical "absent is fine / present has a contract" branch |
| `scripts/check-structure.mjs` (name at discretion) | utility (validation) | file-I/O + batch | `../ipv-demo/scripts/check-model.mjs` | shape-match only |
| `scripts/check-contrast.mjs` | utility (validation) | transform | `../ipv-demo/scripts/check-model.mjs` (problems/warnings/report shape) | shape-match only — contrast math itself has no analog (cross-listed below) |
| contrast pairs manifest (naming at discretion, e.g. `scripts/check-contrast.pairs.json`) | config (data file) | config | none | no analog — shape at Claude's Discretion per CONTEXT.md |
| `scripts/check-wcag.mjs` | test (integration) | event-driven (browser) + batch | `../ipv-demo/scripts/check-splat.mjs` + `scripts/lib/harness.mjs` | **strong** for the harness shell — axe integration itself has no analog (cross-listed below) |
| `scripts/claims-audit.mjs` | utility (validation) | batch | `../ipv-demo/scripts/claims-audit.mjs` | **exact** — copied verbatim per D-17, then extended |
| `scripts/claims-audit.test.mjs` | test | batch | none (`node:test` unused in sibling) | no analog — see RESEARCH.md §Validation Architecture |
| `scripts/lib/harness.mjs` | utility (shared test helper) | event-driven (browser) | `../ipv-demo/scripts/lib/harness.mjs` | **exact path/role match** — same file path in both repos; content must change (mobile viewport vs. WebGL/GPU) |
| `scripts/*.test.mjs` (one per check script, D-23) | test | batch | none | no analog — see RESEARCH.md §Validation Architecture, §Wave 0 Gaps |
| `.github/workflows/verify.yml` | config (CI) | event-driven | none — sibling has no `.github/` | no analog — use RESEARCH.md Code Examples verbatim |
| `vercel.json` | config | config | `../ipv-demo/vercel.json` | **exact** role-match — template with two locked line-changes + two new header blocks |
| `next.config.ts` | config | config | `../ipv-demo/next.config.ts` (shape only); RESEARCH.md Code Examples (content) | shape-match only — sibling's content is 3D-asset-specific and not reusable |
| `eslint.config.mjs` | config | config | `../ipv-demo/eslint.config.mjs` | shape-match **with a hard warning** — line 2 crashes under ESLint 10.9.1; see below |
| `package.json` | config | config | `../ipv-demo/package.json` | role-match — scripts-block and dependency-declaration shape; `engines` has no sibling precedent |
| `tsconfig.json` | config | config | `../ipv-demo/tsconfig.json` | **exact** — reusable near-verbatim per D-02 |
| `docs/design/dead-token-register.md` | doc | static | none | no analog — see DESIGN.md §The dead-token register (canonical ref) |
| `docs/design/decorative-exemptions.json` | config (data file) | config | none | no analog — shape at Claude's Discretion |
| `docs/analysis/vercel-regions.md` | doc | static | none | no analog |
| `docs/analysis/scheduled-work.md` | doc | static | none | no analog |
| `README.md` (update) | doc | static | `../ipv-demo/README.md` (tone reference only, not read in full — out of scope per orchestrator) | weak — different project stage |

---

## Pattern Assignments

### Config & build files

#### `tsconfig.json`

**Analog:** `../ipv-demo/tsconfig.json` (34 lines, whole file below) — **reusable near-verbatim per D-02.**

```json
// ../ipv-demo/tsconfig.json lines 1-34
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```
No changes needed for Phase 1 except whatever `next` itself regenerates into `.next/types`. The `@/*` → `./*` path alias is the import convention every new `.ts`/`.tsx` file should follow (e.g. `import { Ribbon } from "@/components/shell/Ribbon"`).

---

#### `eslint.config.mjs` — copy the shape, NOT the import

**Analog:** `../ipv-demo/eslint.config.mjs` (18 lines, whole file):

```js
// ../ipv-demo/eslint.config.mjs lines 1-18 — DO NOT COPY LINE 2 AS-IS
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";   // ← crashes under ESLint 10.9.1
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

**Why not copy line 2 verbatim:** RESEARCH.md Pitfall 1 reproduced `TypeError: contextOrFilename.getFilename is not a function` at lint time — `eslint-config-next/core-web-vitals`'s default export pulls in `eslint-plugin-react@7.37.5`, which calls a rule-context API removed in ESLint 10. This is confirmed empirically (RESEARCH.md: "installed the exact pinned versions and ran `eslint .` for real, not inferred").

**Use instead** (RESEARCH.md Code Examples, verified exit 0 against the exact D-01 pins):
```js
// verified 2026-09-05 against eslint@10.9.1 + eslint-config-next@16.3.4 + next@16.3.4
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
Reuse from the sibling: the `defineConfig`/`globalIgnores` import style from `eslint/config`, the `globalIgnores([...])` array contents (identical four entries), and `eslint-config-next/typescript` (unaffected by the crash — TS-aware rules only). Everything else in the replacement is new per RESEARCH.md.

---

#### `next.config.ts`

**Analog:** `../ipv-demo/next.config.ts` (13 lines, whole file) — shape reference only, content is domain-specific:
```ts
// ../ipv-demo/next.config.ts lines 1-13
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/scene/model/[id]": ["./assets/models/*.glb"],
  },
};

export default nextConfig;
```
Reusable: the `import type { NextConfig } from "next"` + `const nextConfig: NextConfig = {...}; export default nextConfig;` shape only. `outputFileTracingIncludes` is not applicable (no signed asset route in Phase 1).

**Actual content to write** — RESEARCH.md Code Examples (D-03 build-id resolution + D-11's `cacheComponents`), already verified:
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
Structure-check reminder (D-05): this file must never contain a `webpack(` key or `typescript.ignoreBuildErrors`.

---

#### `package.json`

**Analog:** `../ipv-demo/package.json` (39 lines, whole file):
```json
// ../ipv-demo/package.json lines 1-39
{
  "name": "ipv-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "claims": "node scripts/claims-audit.mjs",
    "model:check": "node scripts/check-model.mjs",
    "verify": "tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-model.mjs --require && next build",
    "stills": "node scripts/capture-stills.mjs",
    "capture:deepdive": "node scripts/capture-deepdive.mjs",
    "walkthrough": "node scripts/capture-walkthrough.mjs"
  },
  "dependencies": { "next": "16.2.12", "react": "19.2.4", "react-dom": "19.2.4", "...(3D libs, not installed here)": "" },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.12",
    "playwright": "^1.62.0",
    "typescript": "^5"
  }
}
```
**Reusable pattern:** the `"verify": "<step> && <step> && ... && next build"` one-command chain shape (CONTEXT.md's "Established Patterns" names this exact line as the seed `verify` grows from), the `"lint": "eslint"` script (Next 16 removed `next lint` — sibling already made this change, confirming RESEARCH.md's State of the Art note), and the flat `dependencies`/`devDependencies` structure.

**Must differ:**
- No `engines` key exists in the sibling at all — D-01 requires `"engines": { "node": "24" }`; there is no analog for this key, write it fresh.
- Version pins differ per D-01 (`next@16.3.4`, `react@19.2.8`, `eslint@10.9.1`, `playwright@1.62.1`, `@types/node@^24`) — do not copy the sibling's actual version numbers, only the key shape.
- `"verify"` must become `"node scripts/verify.mjs"` (D-20) rather than an inline `&&` chain, since the new gate has 11 steps, not 4.

---

#### `vercel.json` — exact template, two locked line-changes, two new blocks

**Analog:** `../ipv-demo/vercel.json` (32 lines, whole file):
```json
// ../ipv-demo/vercel.json lines 1-32
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, must-revalidate" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Permitted-Cross-Domain-Policies", "value": "none" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

**Flag for planner — the sibling's actual values are more specific than CONTEXT.md's prose quotes them:**
1. `regions` is `["cdg1"]` in the sibling, not `["cpt1"]` — D-04 locks the new value to `cpt1` (this is the region change, confirmed as one of the "two lines that change" per CONTEXT.md's Established Patterns note).
2. The sibling's `Permissions-Policy` value is the **full** string `camera=(), microphone=(), geolocation=(), interest-cohort=()` — CONTEXT.md D-04 only quotes `camera=(), microphone=()` when describing what's being replaced. Decide (or confirm at Claude's Discretion) whether `geolocation=()` and `interest-cohort=()` carry forward unchanged alongside the new `camera=(self), microphone=(self)`, since D-04 does not explicitly mention them either way — most consistent reading is they carry forward untouched (only camera/microphone are named as changing) and `check-headers.mjs` should assert the exact resulting four-clause string.
3. `/api/(.*)` `Cache-Control` in the sibling is `"no-store, must-revalidate"` — D-04 specifies exactly `no-store` for the new project's `/api/(.*)` block. Do not copy `, must-revalidate` onto that line.
4. `Referrer-Policy` differs by block in the sibling (`no-referrer` for `/api/(.*)`, `strict-origin-when-cross-origin` for `/(.*)`) — D-04 says "carrying forward the sibling's ... Referrer-Policy" without naming which value for which route; the safest read is to carry forward this same per-route split.
5. `X-Permitted-Cross-Domain-Policies: none` exists on the sibling's `/(.*)` block but is not named in D-04's explicit carry-forward list — include it only if treating D-04's list as illustrative rather than exhaustive; otherwise it has no mandate either way in this phase.
6. Two new `source` blocks have **no sibling precedent** at all (no service worker or manifest exists there): `/sw.js` → `Cache-Control: no-cache, no-store, must-revalidate`, and `/manifest.webmanifest` → `Cache-Control: max-age=0, must-revalidate` — write these fresh from D-04's exact text.

**Reusable verbatim:** the `$schema` key, `"framework": "nextjs"`, the two-block `source`/`headers` array shape, and the `Strict-Transport-Security` value `max-age=31536000; includeSubDomains` (D-04 carries this forward unchanged).

---

### Styles & fonts

#### `app/styles/tokens.inherited.css` — literal copy, not a pattern

**Source:** `../ipv-demo/app/styles/tokens.css` — **byte-identity independently re-verified this session:**
```
size: 4,956 bytes (matches CONTEXT.md D-12 exactly)
SHA-256: 11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9 (matches CONTEXT.md D-12's pinned hash exactly)
```
Copy the file with a byte-preserving operation (e.g. `cp`, not an editor round-trip that could normalise line endings). `scripts/check-tokens.mjs` re-hashes this file against the pinned constant — the hash above is safe to hardcode in that script's header per D-12.

Full `:root` block for reference (143 lines total; token names below are what `tokens.capture.css` and every component may reference — **no other token names exist in the inherited layer**):
```css
/* ../ipv-demo/app/styles/tokens.css lines 15-83 — the complete :root block */
:root {
  --navy: #1e3a5f; --navy-deep: #0c1e35; --navy-dark: #152c4a; --navy-light: #2a4d78;
  --cobalt: #2563eb; --cobalt-light: #3b82f6; --cobalt-glow: #60a5fa; --cobalt-wash: #dbeafe;
  --white: #ffffff; --off-white: #f8fafc; --grey-light: #f1f5f9; --grey-mid: #e2e8f0;
  --charcoal: #334155; --grey-muted: #94a3b8; --grey-dim: #64748b;
  --good: #15803d; --good-bg: #dcfce7; --warn: #b45309; --warn-bg: #fef3c7;
  --crit: #b91c1c; --crit-bg: #fee2e2;
  --font-display: var(--font-syne), "Syne", system-ui, sans-serif;
  --font-body: var(--font-dm-sans), "DM Sans", system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), "JetBrains Mono", ui-monospace, monospace;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1); --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --shadow-sm: 0 1px 2px rgba(30,58,95,.06); /* …shadow-md/lg/xl/cobalt… */
  --radius-chip: 6px; --radius-btn: 2px; --radius-card: 16px; --radius-panel: 20px; --radius-swatch: 14px; --radius-full: 9999px;
  --container: 1240px; --container-pad: 48px; --section-pad-y: 100px; --section-pad-y-end: 80px;
  --viewer-bg: var(--navy-deep);
  --viewer-panel: rgba(12, 30, 53, 0.82);
  --viewer-panel-solid: #101f33;
  --viewer-border: rgba(96, 165, 250, 0.16);
  --viewer-border-strong: rgba(96, 165, 250, 0.34);
  --viewer-ink: #e8eef6;
  --viewer-ink-dim: rgba(232, 238, 246, 0.62);      /* line 81 — see override note below */
  --viewer-ink-faint: rgba(232, 238, 246, 0.38);
}
```

**Load-bearing finding for `tokens.capture.css` (D-13):** of D-13's listed "Layer-2 override tokens," only **`--viewer-ink-dim`** actually already exists in the inherited file (line 81, `rgba(232, 238, 246, 0.62)` — a semi-transparent value). `tokens.capture.css` genuinely overrides this one via CSS cascade (loading after `tokens.inherited.css`, redeclaring the same custom-property name at `:root` with the new solid `#AAB4C0`). The rest of D-13's named tokens — `--rule-faint`, `--record-fill`, `--record-fill-armed`, `--record-ink`, `--cobalt-glow-ink`, `--control-border`, `--panel-solid` — **do not exist under those names anywhere in the inherited file** (the closest same-purpose inherited names are `--viewer-panel-solid` and `--viewer-border`, which are different identifiers, not overridden). Treat those seven as wholly new declarations, not redefinitions, when writing `tokens.capture.css`.

`--cobalt-glow: #60a5fa` (line 24) is already present in the inherited layer and can be used as-is for the ribbon's dot (D-08) with no override needed. `--navy-deep: #0c1e35` (line 18) already matches D-14's `viewport.themeColor`.

---

#### `app/globals.css`

**Analog:** `../ipv-demo/app/globals.css` (177 lines). Key excerpts:

Import + reset (lines 1, 11-24):
```css
@import "./styles/tokens.css";
/* new project: @import "./styles/tokens.inherited.css"; then @import "./styles/tokens.capture.css"; — in that exact order, per D-05's structure check */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  color-scheme: light;   /* DO NOT COPY — D-14 forbids a light theme or any prefers-color-scheme branch; this project is navy-deep universal */
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Focus ring (lines 66-71) — reusable shape, different token:
```css
:focus-visible {
  outline: 2px solid var(--cobalt);   /* new project: outline: 2px solid var(--cobalt-glow); per D-15 */
  outline-offset: 2px;
  border-radius: 2px;                  /* D-15 doesn't specify a border-radius on the ring — omit or confirm */
}
```

Screen-reader-only utility (lines 141-152) — **directly reusable verbatim**, useful anywhere Phase 1 needs visually-hidden-but-announced text:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

`prefers-reduced-motion` guard (lines 26-30) — pattern to keep in mind for later phases; nothing in Phase 1's static shell animates, so likely not needed yet, but the guard shape is here if a transition is added.

---

#### `app/layout.tsx`

**Analog:** `../ipv-demo/app/layout.tsx` (87 lines, whole file). Font loading (lines 10-29):
```tsx
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["300","400","500","600"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400","500"], display: "swap" });
```

**Flag for planner — naming deviation, not a copy-verbatim case:** the sibling loads fonts into `--font-syne` / `--font-dm-sans` / `--font-jetbrains`, then a SEPARATE alias step in `tokens.css` (line 45-47 of that file) maps them to `--font-display` / `--font-body` / `--font-mono`. D-14 instead says `app/layout.tsx` loads the three fonts "into `--font-display`, `--font-body` and `--font-mono`" directly — i.e. the new project should set `variable: "--font-display"` etc. **in the `next/font` call itself** (no separate alias layer, since `tokens.capture.css`/`tokens.inherited.css` don't own a font-alias section for this project the way the sibling's monolithic `tokens.css` does). Confirm this reading before implementing; either approach is functionally equivalent, but D-14's literal wording points at the direct-naming form.

Viewport + RootLayout (lines 70-87):
```tsx
export const viewport: Viewport = {
  themeColor: "#0c1e35",
  width: "device-width",
  initialScale: 1,
  // new project also needs viewportFit: "cover" per D-14 — not present in sibling
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA" className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```
The new project's `RootLayout` additionally renders `<Ribbon />` above `{children}` (D-08) — the sibling has no ribbon at all, so this insertion has no direct precedent; it is a one-line addition to the `<body>` composition shown above (`<body><Ribbon />{children}</body>`).

`metadata` (lines 35-68) is present in the sibling but nothing in CONTEXT.md's Phase 1 decisions requires SEO/OG metadata — treat as optional, lower priority than the font/viewport/ribbon wiring above.

---

### Components

#### `components/shell/Ribbon.tsx` and `components/limits/Limits.tsx`

**Analog:** `../ipv-demo/components/deepdive/PartPanel.tsx` lines 116-130 (the empty-state branch) — the closest existing shape to "a landmark `<section>` with only static, non-interactive prose inside it":
```tsx
// ../ipv-demo/components/deepdive/PartPanel.tsx lines 116-130
if (!part) {
  return (
    <section className={d.sidePanel} aria-label="Component record">
      <div className={v.panelHead}>
        <span className={v.panelTitle}>Component</span>
      </div>
      <div className={v.panelBody}>
        <p className={v.hint}>
          Select a component in the model to resolve it to its record — what it
          is, what it is made of, and any deviation raised against it. Drag to
          orbit, and use the spread slider for the exploded view.
        </p>
      </div>
    </section>
  );
}
```
And the populated branch (line 143) confirms the same landmark is reused with dynamic content: `<section className={d.sidePanel} aria-label="Component record">`.

**What to copy:** the `<section aria-label="...">` landmark pattern itself (a named, describable region rather than a generic `<div>`), and the head/body sub-structure (a small label row, then a prose block). **What differs:** D-08's Ribbon needs no "head" row (just the sentence + dot + link inline), `min-height`/`max-height`/`position` constraints the sibling's panel doesn't have, and — critically — the ribbon's text must come from `lib/copy/governed.ts` (`{governed.preview}`), never a literal string the way `v.hint`'s paragraph is a literal string here. `Limits.tsx` is closer in spirit to this analog's prose-block shape (multiple `<p>`-equivalent blocks, each one governed sentence) but again sourced from the module, not literals.

No CSS Module is required for either new component per CONTEXT.md (styling approach: plain CSS + global type roles in `globals.css`; CSS Modules only "where component-scoping is needed" per the UI-SPEC design-system table) — so, unlike `PartPanel.tsx`'s `d.sidePanel`/`v.panelHead` module-scoped classes, the new components likely use global class names from `globals.css`'s type roles (`label`, `prose`) directly.

---

#### `components/brand/*` (optional carry, Claude's Discretion)

**Analog:** `../ipv-demo/components/brand/Brand.tsx` (179 lines) — copy candidate, untouched, if used at all. `Mark` (lines 18-89) is the SVG wordmark-icon; `Wordmark` (lines 95-114) is the text lockup; `Footer` (lines 122-179) is unrelated to Phase 1's needs (funding-pack footer with sourcing citations) and should be left out even if `Mark`/`Wordmark` are carried.
```tsx
// ../ipv-demo/components/brand/Brand.tsx lines 18-26 (Mark signature)
export function Mark({
  size = 40,
  variant = "gradient",
  animate = false,
}: {
  size?: number;
  variant?: "gradient" | "navy" | "cobalt" | "white";
  animate?: boolean;
}) { /* … */ }
```
Nothing in Phase 1's requirements mandates this component; CONTEXT.md frames it as usable only "if the empty `<main>` benefits from it."

---

### `lib/copy/governed.ts`

**No functional analog** — the sibling keeps all copy as inline JSX literals (see `app/page.tsx` lines 47-50, 74-158) and has no centralized, typed copy module anywhere under `lib/`. The closest **structural** analog for "a closed key union backed by a `Record`" is `lib/data/types.ts`:
```ts
// ../ipv-demo/lib/data/types.ts lines 19-30
export type RbacTier = "field_technician" | "site_supervisor" | "management";

export const RBAC_ORDER: RbacTier[] = [
  "field_technician",
  "site_supervisor",
  "management",
];

export const RBAC_LABEL: Record<RbacTier, string> = {
  field_technician: "Field Technician",
  site_supervisor: "Site Supervisor",
  management: "Management",
};
```
Apply the same shape to `governed.ts`: a union type of the eight (plus the 413 sentence's distinct export name) keys, and a `Record<GovernedKey, ...>` (or equivalent) holding each sentence's text plus its load-bearing-clause representation (shape at Claude's Discretion per CONTEXT.md — `{ before, strong, after }`, a marker string, or a render helper all satisfy D-07).

---

### The claims audit — copy verbatim, then extend

**Source:** `../ipv-demo/scripts/claims-audit.mjs` (222 lines) — **copy this entire file verbatim per D-17**, then append per D-18. Full mechanism, in order:

Header (lines 1-24) — states purpose and the "string sweep, not a judgement" caveat; the new file's header instead states register version + `inherited from ipv-demo/HANDOVER.md §3 at 8fd097a (2026-09-01)` + `owner: the SHEQ manager` per D-17.

Roots and extensions (lines 29-30):
```js
const ROOTS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".css", ".md"]);
```
Copy exactly — D-17 names these `ROOTS` verbatim.

The register shape (lines 44-62, representative entries — 16 total in the sibling):
```js
const PROHIBITED = [
  {
    kind: "retired",
    pattern: /\bIPV is funded\b|\bfunded and specified\b/i,
    note: "IPV is not funded. 'Specified, and not yet built' is the defensible form.",
    allowQuoted: true,
  },
  {
    kind: "retired",
    pattern: /records? never cross(es)? the border/i,
    note: "Retired residency claim. IPV-ARCHITECTURE §4.",
    allowQuoted: true,
  },
  {
    kind: "never",
    pattern: /\bsimulat(e|es|ed|ion|ing)\b/i,
    note: "Prohibited word. The training module is procedural rehearsal.",
    allowQuoted: true,
  },
  // …13 more entries, each { kind: "retired"|"never"|"figure", pattern, note, allowQuoted? }
];
```
D-18's new entries (funding-alternation, findings-verb family, camera-detects family, performance figures, server-persistence family, "simulation" — **already present at line 76, so D-18's mention of it may be redundant with the inherited entry, worth confirming during planning** —, "records never cross the border" — **also already present at line 53, same redundancy flag** —, TRL/competitor/modelled-savings) all append to this same array using this exact `{ kind, pattern, note, allowQuoted? }` shape.

Retirement marker (lines 122-124):
```js
const RETIREMENT_MARKER =
  /retired|withdrawn|never restate|no longer|prohibited|do not (use|claim)|must not|does not claim|does not model|superseded|stop claiming|not claimable|out of scope|ceded|what this is not|rather than claimed|never claim/i;
```
D-18 says this "is extended by `never as (a )?finding` and `no model`" — append those as new alternation branches inside this same regex literal.

Walk function (lines 140-158) — copy verbatim, no changes needed:
```js
async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await walk(p)));
    } else if (EXT.has(extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}
```

Sweep + context-window excusal logic (lines 160-184):
```js
const CONTEXT = 3;  // lines either side of a hit to search for RETIREMENT_MARKER — line 138

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const text = await readFile(file, "utf8");
    const lines = text.split("\n");
    for (const rule of PROHIBITED) {
      lines.forEach((line, i) => {
        if (!rule.pattern.test(line)) return;
        const window = lines.slice(Math.max(0, i - CONTEXT), i + CONTEXT + 1).join(" ");
        const excused = rule.allowQuoted && RETIREMENT_MARKER.test(window);
        findings.push({ file, line: i + 1, kind: rule.kind, note: rule.note, excused, text: line.trim().slice(0, 132) });
      });
    }
  }
}
```

Report + exit (lines 186-222), exit code at line 214:
```js
const live = findings.filter((f) => !f.excused);
// … console.log report …
if (live.length) {
  // … print each violation …
  process.exit(1);
}
// exit 0 implicitly (no explicit call — falls through)
```
This exact `live`/`quoted` split, report shape and `process.exit(1)`-on-violation is the pattern `check-governed.mjs` (D-09) should mirror closely, since it is functionally "the same kind of sweep, inverted" (fails on an ABSENT literal being duplicated outside its one legitimate home, rather than on a PRESENT prohibited string) — copy the `walk()` function unchanged and adapt the matching predicate.

**Direct source for the D-18 register additions:** `../ipv-demo/HANDOVER.md` §3 "CLAIMS DISCIPLINE" (lines 110-124), the canonical register this file already encodes:
```
## 3. CLAIMS DISCIPLINE — read before writing any copy
...
- Tier C — first-party measured — is EMPTY. No claim may enter it.
- Never claim: live IoT/SCADA/sensor feeds. Correct form: "overlays read live business-system values at the moment you open them."
- Never claim: physics, process or layout simulation. Ceded to Prevu3D / Siemens.
- Never claim: "scenario planning" or "rehearse changes virtually."
- Never claim: inference sovereignty. ...
- RETIRED, never restate in any form: "records never cross the border."
- No performance, cost, turnaround or frame-rate figure as an achievement.
- Standing prohibition: never discuss any site's CIPA / National Key Point status.
```
This is the register `claims-audit.mjs`'s `PROHIBITED` array already encodes for the sibling project; it is reproduced here so the planner can see the `kind` taxonomy (`retired` / `never` / `figure`, defined at lines 32-43 of the script) in its original, human-readable form before writing D-18's new NOVATEK-Capture-specific entries in the same taxonomy.

---

### Generic check-script shape (`check-tokens.mjs`, `check-headers.mjs`, `check-sw.mjs`, `check-structure.mjs`, `check-contrast.mjs`)

**Analog:** `../ipv-demo/scripts/check-model.mjs` (285 lines) — the strongest generic "a script that validates something and exits non-zero" template in the codebase. Full shape:

Header convention (lines 1-24) — a `/* ===... */` banner stating what the script validates, why it's a script and not a checklist, and its exact invocation + exit-code contract. Every new check script should open the same way.

Flag-driven behaviour (line 35):
```js
const requireModel = process.argv.includes("--require");
```

Missing-input branch (lines 69-82) — **the closest existing precedent for D-06's check-sw.mjs "present vs. absent" contract**:
```js
let glb;
try {
  glb = await readFile(MODEL_PATH);
} catch {
  console.log("IPV MODEL CHECK");
  console.log("=".repeat(72));
  console.log(`MODEL MISSING (expected before Phase B export)`);
  console.log(`  looked for: ${MODEL_PATH}`);
  if (requireModel) {
    console.log("  --require was passed, so a missing model is fatal.");
    process.exit(1);
  }
  process.exit(0);
}
```
D-06 needs the inverse framing but the identical branch shape: when `public/sw.js` is absent, assert no `serviceWorker.register(` call exists anywhere (fail if one does — the sibling's version fails only when `--require` is passed and the file is absent; the new check must invert which side is fatal). The try/catch-on-absence plus explicit two-path branching is the reusable part.

Problems/warnings accumulation and final report (lines 37-38, 266-286):
```js
const problems = [];
const warnings = [];
// ... pushed to throughout ...

console.log("IPV MODEL CHECK");
console.log("=".repeat(72));
console.log(`Model: ${MODEL_PATH} (${glb.length} bytes) ...`);
console.log(`Problems: ${problems.length}  |  warnings: ${warnings.length}`);

if (warnings.length) {
  console.log("\nWARNINGS:");
  for (const w of warnings) console.log(`  ~  ${w}`);
}

if (problems.length) {
  console.log("\nDEFECTS — the model does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log("\n...clean-run message...");
```
This `problems`/`warnings` split with `problems.length` driving `process.exit(1)` (D-20's "no check emits a warning in place of a failure" is compatible with this shape as long as new checks never populate only `warnings` for something D-20 requires to be fatal) is the pattern every one of the five listed check scripts should follow. `check-headers.mjs` additionally needs the exact-string comparison idiom implied by D-04 (`value !== expected` pushed to `problems`, not a fuzzy match) — no direct precedent for that specific comparison exists in the sibling, but it composes naturally with this same array/report shape.

---

### `scripts/check-wcag.mjs` and `scripts/lib/harness.mjs`

**Analogs:** `../ipv-demo/scripts/lib/harness.mjs` (485 lines — same file path/role as the new project's D-21 harness) and `../ipv-demo/scripts/check-splat.mjs` (72 lines, a script that drives the harness).

`harness.mjs` launch function (lines 46-49) — the exact shape to mirror, different arguments:
```js
export async function launch() {
  return chromium.launch({ headless: true, args: GPU_FLAGS });
}
```
The new harness's `launch()` needs no `args` (no GPU flags relevant to a mobile-viewport WCAG scan) but keeps the `export async function launch()` → `chromium.launch({...})` shape.

Context/page creation and console-error collection (lines 96-134, excerpted):
```js
export async function openViewer(browser, { width = 1600, height = 1000, deviceScaleFactor = 1, reducedMotion = "no-preference", section = "inspect", guide = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor, reducedMotion });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.__ipvErrors = errors;

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  // ...app-specific gate-dismissal steps, not applicable...
  return { context, page };
}
```
D-21's harness needs the same `browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch })` call shape but with the pinned values `viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true` (no `reducedMotion` param needed, no gate to dismiss — Phase 1's shell has no dialog to clear before scanning). The `page.on("console", ...)`/`page.on("pageerror", ...)` error-collection idiom is directly reusable if console-error checking is wanted, though not required by any Phase 1 decision.

`check-splat.mjs` shows how a script consumes the harness (lines 12-15, 27-28):
```js
import { launch, openViewer, waitForZones, /* ...task-specific helpers... */ } from "./lib/harness.mjs";
// ...
const browser = await launch();
const { context, page } = await openViewer(browser, { width: 1600, height: 1000 });
```
`check-wcag.mjs` mirrors this import/launch/open shape, then (per D-21) runs `next build && next start` first, navigates to `/` and `/?s=limits`, and runs `@axe-core/playwright`'s `AxeBuilder` against each — the axe-specific part has no sibling precedent (the sibling has no accessibility scanning at all) and should follow RESEARCH.md's `@axe-core/playwright` guidance directly. `check-splat.mjs`'s final error-reporting block (lines 65-69) is a reusable pattern for surfacing collected console errors, filtering out known noise:
```js
const errs = page.__ipvErrors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
console.log(`\nconsole errors: ${errs.length}`);
for (const e of errs.slice(0, 12)) console.log("  !", e.slice(0, 240));
```

---

## Shared Patterns

### The directory-walk-and-sweep (governed literals + claims audit)
**Source:** `../ipv-demo/scripts/claims-audit.mjs` lines 140-158 (`walk()`) and 160-184 (sweep loop).
**Apply to:** `scripts/claims-audit.mjs` (copy unchanged) and `scripts/check-governed.mjs` (adapt the matching predicate — instead of "does this line match a prohibited pattern," ask "does this line contain one of the eight governed sentences (whitespace-normalised) outside `lib/copy/governed.ts` itself").
```js
async function walk(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await walk(p)));
    } else if (EXT.has(extname(e.name))) { out.push(p); }
  }
  return out;
}
```

### The problems/warnings/exit(1) report shape
**Source:** `../ipv-demo/scripts/check-model.mjs` lines 37-38, 266-286.
**Apply to:** every one of `check-tokens.mjs`, `check-headers.mjs`, `check-sw.mjs`, `check-structure.mjs`, `check-contrast.mjs` — accumulate into `problems`/`warnings` arrays, print a banner + counts, list each, and `process.exit(1)` only when `problems.length > 0`. D-20 requires no check ever substitutes a warning for what should be a failure — so for these scripts, `warnings` should likely stay empty/unused unless a genuinely non-fatal observation is needed (unlike `check-model.mjs`, which legitimately warns on file-size soft limits — no Phase 1 check has an analogous soft limit named in CONTEXT.md).

### Shared Playwright launch profile
**Source:** `../ipv-demo/scripts/lib/harness.mjs` lines 46-49 (`launch()`) and 96-134 (`openViewer()`/context creation).
**Apply to:** `scripts/lib/harness.mjs` (new) and `scripts/check-wcag.mjs`. Same file path as the sibling; same `export async function launch()` and `browser.newContext({...})` shapes; different arguments (390×844 mobile viewport per D-21, no GPU flags, no gate-dismissal).

### `<section aria-label="...">` static-content landmark
**Source:** `../ipv-demo/components/deepdive/PartPanel.tsx` lines 118, 143.
**Apply to:** `components/shell/Ribbon.tsx` (`aria-label="Preview disclosure"` per D-08) and `components/limits/Limits.tsx`. Both render only static text (from `lib/copy/governed.ts`, never literals) inside a named landmark — no interactive state, matching this analog's empty-state branch more closely than its populated (interactive-record) branch.

### `next/font` → CSS custom property wiring
**Source:** `../ipv-demo/app/layout.tsx` lines 10-29.
**Apply to:** `app/layout.tsx`. Same `next/font/google` import + `variable`/`subsets`/`weight`/`display: "swap"` call shape for Syne, DM Sans and JetBrains Mono — but target `--font-display`/`--font-body`/`--font-mono` directly per D-14 rather than the sibling's indirected `--font-syne`→alias-in-CSS approach (see flag under `app/layout.tsx` above).

### Type-level closed key union + `Record<Key, V>`
**Source:** `../ipv-demo/lib/data/types.ts` lines 19-30.
**Apply to:** `lib/copy/governed.ts`'s eight-sentence closed union (D-07).

---

## No Analog Found

Files/concerns with no close match anywhere in `../ipv-demo` (planner should use RESEARCH.md/CONTEXT.md directly). The last two rows are the core-logic half of files that DO have a shell/shape analog listed in File Classification above.

| File | Role | Data Flow | Reason / where to look instead |
|---|---|---|---|
| `scripts/claims-audit.test.mjs` | test | batch | No `*.test.mjs` or `node:test` usage exists in the sibling at all (confirmed by search). See RESEARCH.md §Validation Architecture ("Framework: `node:test` (built-in, Node 24)") and §Wave 0 Gaps. |
| `scripts/*.test.mjs` (per-check fixture tests, D-23) | test | batch | Same — no fixture-test precedent anywhere in the sibling. See RESEARCH.md §Phase Requirements → Test Map. |
| `.github/workflows/verify.yml` | config (CI) | event-driven | Sibling repo has no `.github/` directory at all. Use RESEARCH.md §Code Examples verbatim (the `verify.yml` block is already written and dated 2026-09-05). |
| contrast pairs manifest (e.g. `scripts/check-contrast.pairs.json`) | config (data) | config | No exemption/pairs-manifest concept exists in the sibling (it has no contrast-checking script). Shape is at Claude's Discretion per CONTEXT.md; content comes from D-21's pairs list and DESIGN.md's ink/ground combinations. |
| `docs/design/decorative-exemptions.json` | config (data) | config | No exemption register exists in the sibling. Content is fully specified by CONTEXT.md D-16 (four entries with measured ratios). |
| `docs/design/dead-token-register.md` | doc | static | No token-retirement doc exists in the sibling. Content comes from DESIGN.md §The dead-token register (canonical ref, precedence 1). |
| `docs/analysis/vercel-regions.md` | doc | static | No scheduled-closure docs exist in the sibling. See CONTEXT.md D-25 and RESEARCH.md's `vercel.com/docs/regions` source. |
| `docs/analysis/scheduled-work.md` | doc | static | Same as above; content is the TypeScript 6/7 + ESLint 10 cleanup scope per CONTEXT.md D-25 and RESEARCH.md §Standard Stack (the `typescript-eslint` peer-range note). |
| `scripts/check-contrast.mjs` (the WCAG-math core, not the report shell) | utility | transform | No contrast-computation code exists anywhere in the sibling. Use RESEARCH.md's cited W3C relative-luminance/contrast formula (`w3.org/WAI/WCAG22/Techniques/general/G18`) directly; only the report/exit shell borrows from `check-model.mjs` (see Pattern Assignments above). |
| `scripts/check-wcag.mjs` (the axe-core integration specifically) | test | event-driven | No accessibility scanning exists in the sibling at all. Use RESEARCH.md's `@axe-core/playwright` guidance and Pitfall 4 (WCAG 2.2 rule-tag gating) directly; only the Playwright launch/navigate shell borrows from `harness.mjs`/`check-splat.mjs`. |

---

## Metadata

**Analog search scope:** `../ipv-demo/app/`, `../ipv-demo/components/`, `../ipv-demo/lib/`, `../ipv-demo/scripts/` (excluding `scripts/.check/` and `scripts/out/`, which hold only generated screenshots/PDFs — 100+ files skipped as non-code), plus root `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vercel.json`, and `HANDOVER.md` §3 only. `node_modules/`, `.next/`, `public/`, `AGENTS.md` and `CLAUDE.md` were not entered/read, per orchestrator scope.
**Files scanned (read in full or by targeted grep):** 16 — `scripts/claims-audit.mjs`, `scripts/check-model.mjs`, `scripts/check-splat.mjs`, `scripts/lib/harness.mjs`, `app/layout.tsx`, `app/globals.css`, `app/styles/tokens.css`, `app/page.tsx`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vercel.json`, `components/brand/Brand.tsx`, `components/deepdive/PartPanel.tsx` (partial, lines 100-170), `lib/data/types.ts` (partial), `lib/scene/palette.ts` (partial), plus `HANDOVER.md` lines 110-156 and a full directory listing of `app/`, `components/`, `lib/`, `scripts/`.
**Independent verification performed:** SHA-256 + byte-size of `../ipv-demo/app/styles/tokens.css` re-computed this session via `certutil -hashfile`, confirmed to match CONTEXT.md D-12's pinned values exactly.
**Pattern extraction date:** 2026-09-06
