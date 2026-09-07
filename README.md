# NOVATEK Capture — designed preview

NOVATEK Capture is a phone-first preview of the Capture surface described on
[novatekllc.co.za](https://www.novatekllc.co.za/) ("01 — Capture · In the field, on a
phone"). Sibling of the Walk demo (`ipv-demo`, live at ipv-demo-psi.vercel.app): same
stack, same brand tokens, same synthetic plant, same claims discipline. Capture itself
is a specification, not a build — this repository is the preview's labelled shell. An
artisan enters as one of three personas, opens a work order already assigned to them,
photographs and speaks at the asset, and accepts or rejects each proposal drawn from
the asset record under their own name.

## What Phase 1 delivers

The two surfaces, `/` and `/?s=limits`; the preview-disclosure ribbon, rendered on
every route by `app/layout.tsx`; the honesty module (`lib/copy/governed.ts`), where
each governed sentence is defined exactly once; and the eleven checks and the one
command (`npm run verify`) that fail the build rather than let it degrade.

## Running it

```
npm install
npx playwright install chromium
npm run dev
npm run verify
node --test scripts/**/*.test.mjs
```

`npm run dev` runs the dev server directly. A production build — `npm run verify` or a
bare `next build` — needs `CAPTURE_BUILD_ID` resolved (D-03): `npm run verify`
resolves it from `git rev-parse --short HEAD` automatically when neither that variable
nor a Vercel-supplied one is already set; running `next build` on its own without any
of the three set fails on purpose. `node --test scripts/**/*.test.mjs` is the fast
fixture suite alone — every check script's own proof that it exits non-zero on a
violation — for feedback during development, without the full build.

## What `npm run verify` runs

In order, stopping at the first non-zero exit (`scripts/verify.mjs`'s `STEPS`):

1. `next typegen` — generates route types
2. `tsc --noEmit` — the type check
3. `eslint .` — lint
4. `check-tokens` — the inherited token layer's byte identity and the Capture layer's completeness
5. `check-governed` — the eight governed sentences, each defined exactly once
6. `claims-audit` — the inherited and Capture-specific prohibited-claims register
7. the fixture suite (`node --test scripts/**/*.test.mjs`) — every check script's own violation proofs
8. `check-headers` — `vercel.json`'s declared headers, by exact value
9. `check-sw` — the service-worker contract
10. `check-structure` — source-level structural assertions
11. `next build` — the production build, with `CAPTURE_BUILD_ID` resolved as above
12. `check-structure` again, against the build's own output
13. `check-contrast` — WCAG relative-luminance contrast computed from resolved token values
14. `check-wcag` self-test — a browser-only axe smoke test, no build required (excluded on Vercel's own build)
15. `check-wcag` — the full axe A/AA scan against the built output on `/` and `/?s=limits` (excluded on Vercel's own build)

No step emits a warning in place of a failure, and none is skippable by flag or
environment variable other than the platform's own `VERCEL`.

`scripts/check-deployment.mjs` is deliberately not one of these steps: it proves a
live URL is publicly reachable and correctly headed, which needs a real deployment on
the wire, not a build.

## Deployment topology

GitHub Actions runs this same, unmodified `npm run verify` on every push, under a job
named `verify`. Vercel's own build runs the same script with the axe scan excluded by
the platform's own `VERCEL` variable. Vercel Deployment Checks holds production
aliasing on that `verify` job. Work is pushed to `dev` for a Preview and merged to
`main` for Production, in region `cpt1`.

## Where to look next

- [`docs/design/dead-token-register.md`](docs/design/dead-token-register.md) and
  [`docs/design/decorative-exemptions.json`](docs/design/decorative-exemptions.json)
  — the design floor: every retired token and the four permitted contrast exceptions.
- [`docs/analysis/`](docs/analysis/) — the toolchain's scheduled closures (the
  TypeScript 6/7 migration, the ESLint 10 rule cleanup).

NOVATEK® LLC (Pty) Ltd · CIPC 2025/796748/07
