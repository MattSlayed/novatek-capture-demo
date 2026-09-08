# Phase 2: Fixtures & types - Research

**Researched:** 2026-09-08
**Domain:** TypeScript fixture/type authoring; Next.js 16.3.4 server-only module isolation; Node 24 native TypeScript execution for build-time checks; content-hash pinning across CRLF/LF checkouts; human-in-the-loop provenance verification
**Confidence:** HIGH

## Summary

Phase 2 is almost entirely pre-decided by `02-CONTEXT.md` — the job of this research was to verify the four mechanisms the plan depends on (Next's `server-only` marker, Node 24's native TypeScript stripping, cross-platform content hashing, and the `checkpoint:human-verify` protocol), to extract exact, ready-to-use data (closed-set member lists, fact ids per copied record, id shapes) so the planner does not have to re-derive them, and to catch integration traps a naive "copy verbatim" reading of the sibling repo would miss.

Three findings changed what a naive plan would do. First, `server-only` is framework-internal in Next.js 16.3.4 — installing the npm package is optional (Next ships its own type declarations and its own build-time enforcement; the package's actual JS is never used) — and the poisoning was reproduced to propagate through a transitive import with no `server-only` marker of its own, confirmed by an actual `next build` under Turbopack against this repository's real dependency tree. Second, Node 24.19.0's TypeScript stripping is stable and default-on (`process.features.typescript === "strip"`, no `ExperimentalWarning`), but Node's ESM resolver requires the literal `.ts` extension only at the entry point where a `.mjs` script imports a `.ts` module — internal `.ts`-to-`.ts` imports (exactly how the sibling's `plant.ts` imports `./types`) resolve extension-free with no code change and no tsconfig change, both confirmed by direct execution against this exact Node install. Third, copying `plant.ts` by "whole-record deletion only" is not quite sufficient at the top and bottom of the file: dropping `ANCHORS`/`CAPTURE_SESSIONS` (already directed by Claude's Discretion) orphans the `Anchor`/`CaptureSession` names in the file's own `import type` line, which is not one of the fourteen names `D-18` copies into this project's `types.ts` — left in place, this is a straight `tsc` failure, not a lint nit.

**Primary recommendation:** Do not install `server-only` as a hard prerequisite — install it anyway for lint/tooling hygiene (it is free, official, and zero-risk per the legitimacy audit below), but do not block on it. Use Node's native, unflagged TypeScript stripping for every new `.mjs` check/test that must load `lib/data/*.ts` at runtime, importing with the explicit `.ts` extension only at the `.mjs` entry point. Trim `plant.ts`'s own `import type` line and its `ANCHOR_POSITIONS`/`ANCHORS`/`ANCHOR_BY_MACHINERY`/`anchorsInZone`/`CAPTURE_SESSIONS` block together, not as an afterthought. Pin the fixture-content hash over a CRLF-normalised buffer so the same four files hash identically on the Windows dev machine, GitHub Actions and Vercel.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-FR-21a | Every authored observation passes a human provenance check before it ships: a person has read the record it cites and confirmed the wording is an inference that record supports or only situates it; the fixture file carries the cited record's own sentence in a comment beside each observation; the evidence-or-context relation records which was confirmed. Phase 2 does not close on referential integrity alone. *[Verified by: inspection]* | §Human Checkpoint Protocol (verified `checkpoint:human-verify` task shape and the auto-mode auto-approval risk); §Code Examples (the resolver/comment-drift test pattern that makes the citation repeatable); §Validation Architecture (states explicitly that this criterion is human-verified, not automated) |

Other requirement IDs named in `02-CONTEXT.md` (REQ-FR-20, REQ-FR-57, REQ-FR-59, REQ-FR-61) are **not delivered by this phase** — Phase 2 only lays the type shapes (`AuthoredObservation`, `VerificationResult`, `Proposal`, `Decision`, `Artisan.rbac_tier`) those later phases (P3, P5, P8) will implement behaviour against. REQ-FR-65 was delivered in Phase 1 and is unaffected here.
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The human provenance check (FR-21a; AD-15; Story 2.1)**
- **D-01:** The named reviewer is the developer, Matthew; the sign-off carries his name as he gives it at the checkpoint and the date. The SHEQ manager is not involved in this phase; no counter-signature line is added.
- **D-02:** The check runs as an in-session human-verify checkpoint, the same pattern as plan 01-09's checkpoints. The executor writes `observations.ts` and a review sheet — the draft of `docs/analysis/provenance-check.md` with its verdict column empty — then the plan stops. The reviewer confirms or disputes each row in the session. The executor records the verdicts, writes the signed file with name and date, and only then does the phase's final plan close. Never marked complete by the executor on its own.
- **D-03:** `docs/analysis/provenance-check.md` is a per-row table, repeatable by a second person without reading the code: observation id · asset id and tag · kind · wording as it will render · cited record id · the record's own sentence (the named field, quoted) · grade · relation confirmed (evidence or context) · verdict (confirmed / reworded / re-cited / dropped) · reviewer · date. A separate short table lists the two referral rows (`m-aa605` resolved, `20HAD10AA610` unresolved) marked *not subject — a referral takes no `drawn_from`*, so a later reader sees they were considered.
- **D-04:** On a disputed row the reviewer chooses reword, re-cite or drop, and supplies the new wording or record. The executor never rewords or re-cites on its own initiative. A reworded or re-cited row is read again against its record before the sign-off; the verdict column records the choice. The set may shrink below twelve only by the reviewer's decision.

**Kinds and wording (seed §Data model; EXPERIENCE.md §Voice and Tone)**
- **D-05:** *[reconciled here]* The closed kind set is the seed's eight plus two kinds the three misfit rows need: one naming an isolation that is in place (shared by ap003 and gs001), one naming an obscured gauge or reading (as001). Names are at Claude's discretion but follow the seed's shape (snake_case, a noun phrase naming what is visible, e.g. `isolation_present`, `gauge_obscured`). Still one closed set, defined once in `types.ts`. The SUMMARY records this as a deviation from Story 2.1's eight-member list.
- **D-06:** The executor drafts the twelve `wording` sentences from the seed's short phrases, under the eight voice rules and the PRD §3 vocabulary verbatim; the reviewer confirms each at the checkpoint (D-02). No wording is written by anyone else first.
- **D-07:** A wording is one plain sentence stating what is visible and where, and nothing else: no cause, no severity, no figure, no record name, no verb that implies a model looked. Example shape: "Discolouration is visible on the drive-end bearing housing." Wordings pass the claims audit like any other string under `lib/`.
- **D-08:** Exactly the seed's twelve observations. `m-aa101`, `m-aa102` and `m-aa602` carry none; a verify on those assets will return an authored match and zero proposals, which is an honest state P5 renders. No observation is invented to fill an asset.

**Citation granularity (FR-20, FR-21a; roadmap success criterion 2)**
- **D-09:** A `drawn_from` may name a CitedFact id from a copied machinery record's `facts` (the `f-…` ids) or a Deviation's `id` field (the `ncr-0118` form, not the `NCR-2026-0118` `ncr_number`). Nothing else is citable. The resolver test's id space is exactly that union over the copied subset. Five rows the seed cites vaguely are resolved to a specific fact by the executor at authoring and confirmed by the reviewer at the checkpoint; where a machinery record offers no fact that situates the observation, the row is raised at the checkpoint as a dispute rather than cited loosely.
- **D-10:** The comment beside an observation quotes the specific field the inference draws on, named. For a fact: `label: value` with its unit where one exists. For a deviation: `id.field: "…"`. Two rows citing the same deviation may quote different fields.
- **D-11:** The comment has one fixed, parseable form (exact syntax at Claude's discretion). A test in the fixture suite parses `observations.ts`, asserts every observation has one, resolves the id per D-09, and compares the quoted text with the live record's own value; a comment that drifts from its record fails `verify`. The test ships with a fixture proving it fails on a missing comment, an unresolvable id and a drifted quote.
- **D-12:** *[reconciled here]* `AuthoredObservation.grade` is its own two-member type over {INFERRED, AMBIGUOUS}. The sibling's `ExtractionGrade` keeps all three members when copied verbatim (the copied plant facts legitimately carry `EXTRACTED` provenance from the ERP/NCR systems of record); only the authored observation's grade excludes it.

**Fixture version (AD-6; Story 2.1; roadmap success criterion 4)**
- **D-13:** `lib/data/fixtures.ts` exports `FIXTURE_VERSION` as a dated string in the sibling's shape, `capture-fixtures/YYYY.MM.N`. Never derived from, equal to, or formatted like the build id.
- **D-14:** A content hash (SHA-256 over `plant.ts`, `artisans.ts`, `orders.ts` and `observations.ts`, in a fixed order) is pinned beside `FIXTURE_VERSION`. A check in `verify` recomputes it and fails when it differs. `types.ts`, `register.ts` and `fixtures.ts` itself are outside the hash. The mechanism is `scripts/check-tokens.mjs`'s pinned-hash pattern; ships with a fixture test proving it fails.
- **D-15:** *[reconciled here]* The version lives in `lib/data/fixtures.ts` (not `lib/limits`, which is P3). P3 may re-export it if a client reader needs a single import.

**The register and its isolation rule (AD-7; AD-15; roadmap success criterion 4)**
- **D-16:** `lib/data/register.ts` holds the tag-to-asset resolution table over the whole copied subset (`m-aa605` included) and nothing a client could use. Typed server-only — Next's `server-only` import is the expected mechanism if it holds under 16.3.4 (**this research confirms it holds, including transitively — see §Architecture Patterns Pattern 1**). Not imported by anything in this phase.
- **D-17:** The register-isolation rule joins `verify` in this phase: no module under `components/` or `lib/client/` may import `lib/data/register` or `lib/access/register`, directly or transitively, and no register content may appear in a client bundle. Mechanism (import-graph walk, sentinel string, or both) is at Claude's discretion and must not warn or skip; ships with a fixture test proving it fails on a violating import.

**The types module (D-CONV; AD-16; AD-18; AD-19)**
- **D-18:** `types.ts` copies verbatim from `../ipv-demo/lib/data/types.ts` at `8fd097a`: `RbacTier` and its `RBAC_ORDER`/`RBAC_LABEL`, `ExtractionGrade`, `Provenance`, `SystemOfRecord`, `CitedFact`, `EvidenceChain`, `Zone`, `AssetClass` and `ASSET_CLASS_LABEL`, `Machinery`, `SetpointBlock`, `Deviation`, `RootCause5M`, `GoverningDoc`. The seed's new types follow its Data model section verbatim in shape: `Artisan`, `Session`, `WorkOrder`, `OrderAsset`, `AuthoredObservation`, `ObservationProvenance`, `Capture`, `VerificationResult`, `Proposal`, `Decision`, `Referral`, `Flag`, `OrderClock`, `SyncItem` (with AD-18's `schema_version`), `ConflictCode`, `RejectCode`, `SyncItemResult`, `WalkPayload`.
- **D-19:** The closed sets are defined once here and imported everywhere later (see §Closed Sets below for exact member lists). The governed-sentence set is not restated: `types.ts` imports `GovernedKey` from `lib/copy/governed.ts`.
- **D-20:** `Artisan.rbac_tier` is a display-only attribute: K. Naidoo carries `site_supervisor`, the other two `field_technician`; no function under `lib/data` reads it and no later access decision may. `lib/data` imports nothing from `lib/store`, `lib/reconcile` or `lib/access`.

### Claude's Discretion
- The shape of `drawn_from` on `AuthoredObservation`: the bare record id (recommended — one string the resolver test checks) or the full `ObservationProvenance` tuple with the id inside `source_uri`.
- The exact names of the added kinds (D-05) and the exact comment syntax (D-11).
- Whether the version-hash check and the isolation rule are new scripts or extensions of `check-structure.mjs`; the hash's file order; the sentinel, if one is used.
- Persona ids, employee numbers and order id shapes, subject to D-CONV's id conventions and the seed's `WO-2026-NNNN` numbers.
- How much of the sibling's `plant.ts` surrounding structure (zone records, `PEOPLE`, `DOCS`, the `DEVIATIONS` referenced by the subset, the `*_BY_ID` maps) is carried, provided every record an observation or an order references is present verbatim and `ANCHORS`, `CAPTURE_SESSIONS` and the 3D placement table are not.
- Whether the copied `plant.ts` is trimmed by deletion of whole records only (recommended) or re-typed.

### Deferred Ideas (OUT OF SCOPE)
- `lib/access/register.ts`, `resolveTag`, `POST /api/referrals`, the `referral` sync kind, the `Flag` write and the sentences for `referral_evidence_missing` / `unknown_referral` — P9 (the types land here; the behaviour does not).
- `lib/limits` and every bounded value, including the 64 KB thumbnail cap — P3.
- The module declaring `(assetId, fixtureSet)`, the composition of `ObservationProvenance` from a cited record's provenance, and `fixture_version_mismatch`'s sentence and next act — P3/P5.
- AD-9's `already_open` / `not_open` closed-set members — P4.
- A counter-signature by the SHEQ manager on `provenance-check.md` — not requested.
- Extending the copied plant beyond the eleven assets plus `m-aa605`, or authoring observations for `m-aa101`, `m-aa102`, `m-aa602` — declined (D-08).
</user_constraints>

## Project Constraints (from CLAUDE.md)

No project-level `./CLAUDE.md` exists in this repository (checked at research time; only the user's global `~/.claude/CLAUDE.md` SuperClaude framework file exists, which is a personal tool-orchestration preference file, not a project convention document — it imposes no repository-specific directive on this codebase). All binding project conventions for Phase 2 come from `.planning/config.json`, `.planning/intel/decisions.md` (the architecture spine extraction) and Phase 1's established `scripts/` patterns, all reflected above and below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Synthetic fixture data (`plant.ts`, `artisans.ts`, `orders.ts`) | Database / Storage (analog) | API / Backend | There is no database in this project (AD-10: memory store only); these modules play the system-of-record role a DB would, read at import time by server code only |
| Authored observations + provenance citation (`observations.ts`) | Database / Storage (analog) | API / Backend | Same as above; also the artefact FR-21a's human check validates directly |
| Tag→asset register (`register.ts`) | API / Backend | Database / Storage (analog) | Server-only lookup table; AD-7 forbids any client reachability |
| Closed-set type contracts (`types.ts`) | API / Backend | Browser / Client (type-only, compile-time) | Types are erased at runtime, but the enums model server-authoritative state machines; later client rendering code (P4+) imports the same types for exhaustive switches |
| Register-isolation build gate (new `verify` step) | API / Backend (protects this boundary) | — | Not a runtime tier; a CI/build-time assertion that the API/Backend-owned register never crosses into the client bundle |
| Human provenance check (FR-21a) | — (governance process, no runtime tier) | — | A per-session human action recorded to `docs/analysis/provenance-check.md`; not code that runs at any tier |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `server-only` | 0.0.1 | Poisons `lib/data/register.ts` so any Client Component import fails the build | The canonical, Next.js-documented mechanism (linked directly from nextjs.org's own guides); maintained by the React core team under `facebook/react` |
| Node.js native TS stripping | built into Node 24.19.0 (no package) | Lets `scripts/*.test.mjs` import `lib/data/*.ts` fixture modules at test time with zero new runtime dependency | `--experimental-strip-types` graduated to default-on; `process.features.typescript` reports `"strip"` on this exact install — no flag, no warning |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` (`createHash`) | built-in (Node 24) | SHA-256 content hash for D-14's fixture-version pin | Already the mechanism `scripts/check-tokens.mjs` uses for D-12's token-file pin — D-14 reuses the same pattern |
| `node:test` | built-in (Node 24) | The resolver test, the hash-check test, the isolation-rule test | Already wired via `scripts/verify.mjs`'s `fixture-suite` step (`node --test scripts/**/*.test.mjs`) — a new `*.test.mjs` file needs no additional wiring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node native TS stripping to load fixtures in `.mjs` tests | Compile `lib/data` to `scripts/.check/` with `tsc`, then import the emitted JS | Adds a build step and a stale-cache class of bug (the compiled copy can silently drift from source); native stripping has zero moving parts and was empirically the simplest correct answer — not recommended unless a project later needs full TS transform (enums, decorators), which this phase's types do not use |
| Node native TS stripping | Regex/text parsing of the `.ts` source without executing it | Strictly worse: the whole point of D-11's resolver test is comparing the *live, evaluated* record value against the quoted comment; a regex parse of `observations.ts` for the comment is still needed, but the record side (`plant.ts`'s actual `CitedFact.value`) must be the real evaluated object, not a second parallel regex parse that could itself drift |
| `server-only` (npm package installed) | Rely on Next's internal handling alone, skip `npm install` | Both work identically for `tsc` and `next build` on this exact repo (verified below); installing costs nothing and removes any future risk from an ESLint import-resolution plugin being added later that would otherwise flag the bare specifier |

**Installation:**
```bash
npm install server-only
```

**Version verification:** `npm view server-only version time.created dist.unpackedSize` was run directly against the registry — see §Package Legitimacy Audit. `server-only@0.0.1` has been the only version published since 2022-09-03; there is no newer version to be "behind" on.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| `server-only` | npm | ~4 yrs (published 2022-09-03, single version 0.0.1, never revised) | 15,063,972 / week (`api.npmjs.org/downloads/point/last-week`, window 2026-08-31→2026-09-06) | `bugs.url` → `github.com/facebook/react/issues` (package.json has no separate `repository` field, which is why slopcheck's own note below fires) | `[OK]` — note: "No source repository linked. Harder to verify what this code actually does." | **Approved** |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

Additional verification beyond slopcheck: maintainer is `sebmarkbage` (Sebastian Markbåge, React core team, co-creator of React Server Components) — matches the identity Next.js's own official docs implicitly vouch for by linking `https://www.npmjs.com/package/server-only` directly from `nextjs.org/docs/app/guides/data-security`. `npm view server-only scripts.postinstall` returned empty (no postinstall script). Package is 611 bytes unpacked, 3 files — a marker package with no executable logic beyond re-exporting an empty module under the `react-server` export condition. This package name was discovered via the official Next.js documentation (fetched live this session), not via WebSearch or training-data recall, so it is tagged `[VERIFIED: npm registry]` rather than `[ASSUMED]` per the provenance rule.

*slopcheck was available and ran successfully (`pip install slopcheck` succeeded; `slopcheck install server-only` printed a valid `[OK]` verdict before an unrelated Windows subprocess quirk crashed its own follow-on `npm install` step — the check itself completed and printed its verdict first).*

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │  lib/data/  (this phase — server-side only)  │
                    │                                               │
                    │  types.ts ──defines──▶ closed sets, entity    │
                    │      ▲                  shapes (imported      │
                    │      │ import type       everywhere below)    │
                    │      │                                        │
                    │  plant.ts ─────┐    artisans.ts   orders.ts   │
                    │  (11 assets,   │    (3 accounts)  (5 orders)  │
                    │   3 deviations,│                              │
                    │   6 docs,      │                              │
                    │   4 people)    │                              │
                    │      ▲         │                              │
                    │      │ cites   │                              │
                    │  observations.ts (13 authored observations,   │
                    │   each: kind, wording, grade, drawn_from,     │
                    │   relation, + a code comment quoting the      │
                    │   cited record's own field)                  │
                    │      │                                        │
                    │  fixtures.ts (FIXTURE_VERSION + pinned hash   │
                    │   over plant/artisans/orders/observations)    │
                    │                                               │
                    │  register.ts  ◀── import "server-only" ──┐    │
                    │  (tag→asset map, m-aa605 included)        │   │
                    └────────────────────────────────────────┼─┘   │
                                                               │     │
         ══════════════════ isolation boundary (D-17) ════════╪═════╪══════
                                                               │     │
                    ┌──────────────────────────────────────────┘     │
                    │  build-time verify checks (new, this phase)     │
                    │                                                  │
                    │  1. resolver test — every drawn_from resolves;  │
                    │     every quoted comment == live record value    │
                    │     (reads plant.ts + observations.ts as real,  │
                    │     evaluated modules via Node's native TS      │
                    │     stripping, .ts extension at the entry point)│
                    │  2. hash-pin check — SHA-256(plant+artisans+    │
                    │     orders+observations, CRLF-normalised) ==    │
                    │     pinned value beside FIXTURE_VERSION          │
                    │  3. register-isolation check — (a) source        │
                    │     import-graph walk: nothing under             │
                    │     components/ or lib/client/ reaches           │
                    │     lib/data/register or lib/access/register;    │
                    │     (b) post-build sentinel scan: a unique       │
                    │     string exported only by register.ts is       │
                    │     absent from every file under .next/static/** │
                    └──────────────────────────────────────────────────┘
                                        │
                                        ▼
                    scripts/verify.mjs STEPS[] — each check above is a
                    new fail-fast entry; (1)+(2) ride the existing
                    "fixture-suite" step (node --test scripts/**/*.test.mjs);
                    (3a) is a new source-side step before next-build;
                    (3b) extends check-structure.mjs --build-output,
                    which already runs a second time after next build.

    HUMAN GATE (FR-21a, outside all of the above):
    executor drafts observations.ts + docs/analysis/provenance-check.md
    (verdict column empty) → checkpoint:human-verify → developer confirms/
    disputes each row in-session → executor records verdicts, writes the
    signed file → only then does the phase's closing plan complete.
```

### Recommended Project Structure
```
lib/
└── data/
    ├── types.ts          # closed sets + entity shapes (D-18, D-19)
    ├── plant.ts           # 11 assets + m-aa605, 3 deviations, docs, zones, people (trimmed copy of ../ipv-demo)
    ├── artisans.ts         # 3 Artisan records
    ├── orders.ts           # 5 WorkOrder records
    ├── observations.ts     # 13 AuthoredObservation records + cited-sentence comments
    ├── fixtures.ts          # FIXTURE_VERSION + pinned content hash
    └── register.ts           # tag→asset map; import "server-only" at the top
docs/
└── analysis/
    └── provenance-check.md   # the signed FR-21a artefact (written after the checkpoint)
scripts/
├── check-fixture-hash.mjs        # or an extension of check-structure.mjs (Claude's Discretion)
├── check-fixture-hash.test.mjs
├── check-register-isolation.mjs  # or an extension of check-structure.mjs
├── check-register-isolation.test.mjs
├── check-observations.mjs        # the D-11 resolver/comment-drift test (could be *.test.mjs directly)
└── check-observations.test.mjs
```

### Pattern 1: `server-only` isolates a server-side module, including transitively — empirically confirmed

**What:** A single `import "server-only";` at the top of a module makes `next build` fail if any Client Component's module graph reaches that module, even through an intermediate file that carries no `server-only` marker of its own.

**When to use:** `lib/data/register.ts` (D-16); later, `lib/access/register.ts` in P9.

**Verified directly against this repository's own Next 16.3.4 / Turbopack install** (not from documentation alone): a throwaway three-file chain was created — `lib/data/_scratch_register.ts` (`import "server-only"`), `lib/access/_scratch_intermediate.ts` (a bare re-export, **no** `server-only` import of its own), and a `"use client"` component importing only the intermediate file, rendered from a real route. `next build` failed with exit code 1:

```
> Build error occurred
Error: Turbopack build failed with 2 errors:
./lib/data/_scratch_register.ts:1:1
Error: 'server-only' cannot be imported from a Client Component module
  It should only be used from a Server Component.

Import traces:
  Client Component Browser:
    ./lib/data/_scratch_register.ts [Client Component Browser]
    ./components/_scratch/ScratchClient.tsx [Client Component Browser]
    ./components/_scratch/ScratchClient.tsx [Server Component]
    ./app/scratch-research-test/page.tsx [Server Component]
```
*(all scratch files were deleted immediately after and the repository was rebuilt clean; `git status` before/after was identical)*

This directly answers the transitive-import question D-16 flags as needing confirmation: the poisoning propagates through `lib/access/register.ts` (P9) even without that file re-declaring `import "server-only"` itself.

Installing the npm package is **not required** for either half of the enforcement:
- `npx tsc --noEmit` passed cleanly with `import "server-only"` present and the package **not** installed as a dependency.
- `npx eslint .` (this project's flat config: `@next/eslint-plugin-next` core-web-vitals + `eslint-config-next/typescript` + `eslint-plugin-react-hooks`, no `eslint-plugin-import`) also passed cleanly.

The reason, confirmed by reading `node_modules/next/types/global.d.ts` directly:

```typescript
// Source: node_modules/next/types/global.d.ts (Next.js 16.3.4, this repo's install)
// We implement the behavior of `import 'server-only'` and `import 'client-only'` on the compiler level
// and thus don't require having them installed as dependencies.
// By default it works fine with typescript, because (surprisingly) TSC *doesn't check side-effecting imports*.
// But this behavior can be overridden with `noUncheckedSideEffectImports`
// (https://www.typescriptlang.org/tsconfig/#noUncheckedSideEffectImports)
// which'd cause `import 'server-only'` to start erroring.
// To prevent that, we add declarations for them here.
declare module 'server-only' { ... }
```

This project's `tsconfig.json` does not set `noUncheckedSideEffectImports`, so even the ambient declaration is belt-and-braces here. **Recommendation: install the package anyway** (D-16 doesn't forbid it, it's free, official, and zero-risk per the legitimacy audit — see §Standard Stack Alternatives Considered for why).

**Does not replace D-17's own custom check.** `server-only`'s enforcement is a `next build`-time error with no code your own `verify.mjs` controls or can assert a specific exit code against in isolation (it's folded into the general `next-build` step's pass/fail). D-17 explicitly requires an independently-owned, fixture-tested mechanism — see Pattern 3.

Source: [nextjs.org/docs/app/guides/data-security](https://nextjs.org/docs/app/guides/data-security) (fetched live, `lastUpdated: 2026-08-25`); [nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning](https://nextjs.org/docs/app/getting-started/server-and-client-components) (fetched live, `lastUpdated: 2026-08-25`); direct reproduction against this repo's `node_modules/next@16.3.4`.

### Pattern 2: Node 24 native TypeScript stripping for `.mjs` check scripts

**What:** Node 24.19.0 strips TypeScript type syntax at load time with no flag and no warning. This lets a plain `.mjs` test file `import` a `.ts` fixture module directly.

**When to use:** Every new `scripts/*.test.mjs` that needs `plant.ts`, `types.ts`, `observations.ts` or `fixtures.ts` as real, evaluated objects (the D-11 resolver test; the D-14 hash-check test).

**Verified directly on this repository's exact Node install (v24.19.0):**

```javascript
// A .mjs file importing a .ts module MUST use the explicit .ts extension —
// Node's ESM resolver does not auto-resolve it (reproduced: omitting the
// extension throws ERR_MODULE_NOT_FOUND).
import { OBSERVATIONS } from "../lib/data/observations.ts";
import { MACHINERY_BY_ID } from "../lib/data/plant.ts";
```

```
$ node -p "JSON.stringify(process.features)"
{"typescript":"strip", ...}          // stable, default-on — not "experimental"

$ node mod.ts                         # a .ts file with only interfaces/consts/functions
(exits 0, no ExperimentalWarning printed to stderr)
```

Two nuances confirmed empirically, both favourable:

1. **The `.ts` extension is required only at the `.mjs` entry point.** A second experiment confirmed that *internal* `.ts`-to-`.ts` imports — exactly how the sibling's `plant.ts` writes `import type { ... } from "./types";` with no extension — resolve correctly under Node's own loader with **no change needed** to the copied files' own import statements:
   ```
   consumer.mjs → import { W } from "./plant_like.ts"   (extension required here)
   plant_like.ts → import type { Widget } from "./types_like"   (no extension — resolves anyway)
   $ node consumer.mjs
   {"id":"m-ap003"}   (exit 0)
   ```
   This means `types.ts`, `plant.ts`, `artisans.ts`, `orders.ts` and `observations.ts` can all keep the sibling's extension-free, Next/bundler-idiomatic import style unchanged; only the new `.mjs` test files need the `.ts` suffix on their own import specifiers.

2. **No tsconfig change needed.** `allowImportingTsExtensions` only affects `tsc`'s own checking of `.ts` files that import other `.ts` files by explicit extension. The new `.mjs` test scripts are outside `tsc`'s project scope entirely — this repo's `tsconfig.json` `include` array is `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"]`, which does **not** match `.mjs`. `tsc --noEmit` never parses the `.mjs` test files, so it never sees their `.ts`-extension import specifiers and `allowImportingTsExtensions` is moot.

3. **Enums are not supported in strip-only mode** (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX: TypeScript enum is not supported in strip-only mode`, confirmed by direct test). Not a constraint here — the sibling's `types.ts` (read in full) and this phase's own new types use string-literal unions and `as const` objects exclusively, never a TS `enum`. Flag as a standing constraint for later phases: **never introduce a TS `enum` into `lib/data`** or the fixture suite's native-TS-loading tests break.

Source: direct execution against this repository's Node v24.19.0 install (see reproduction commands above). [VERIFIED] — not from documentation, from running the actual interpreter.

### Pattern 3: Register isolation — two independent, fixture-tested layers (D-17)

**What:** D-17 requires a mechanism the project's own `verify` command owns end-to-end (unlike Pattern 1's `server-only`, which is Next-internal and can't be asserted against directly). Two complementary, both-required layers:

**(a) Source import-graph walk.** Walk every `.ts`/`.tsx` file under `components/` and `lib/client/` (the latter doesn't exist yet this phase, but the check should already look for it so P4+ doesn't need to touch this script), resolve each `import`/`export...from` specifier (relative paths and the `@/*` alias — confirmed present in `tsconfig.json`'s `paths`), and fail if any resolved path is `lib/data/register.ts` or `lib/access/register.ts`, **transitively** (i.e., the walk must follow imports recursively, not just check direct imports — an intermediate `components/x.ts` importing `components/y.ts` which imports the register would otherwise be missed).

**(b) Post-build sentinel scan.** Export a unique literal from `register.ts` that exists nowhere else (e.g. a constant like `"__CAPTURE_REGISTER_SENTINEL__"`), and after `next build`, grep every file under `.next/static/**` for that literal — it must be absent. Confirmed directly against this repository's real build output: client JS/CSS chunks land under `.next/static/chunks/*.js` and `*.css`; server code lands under `.next/server/{app,chunks,pages}/`. `.next/server/` is therefore the only place the sentinel may legitimately appear (it will, since `register.ts` itself is server code) — the check must scope its scan to `.next/static/**` only, never assert on `.next/server/**`.

**Where this slots into `verify.mjs`:** (a) is a new source-only step, cheap, belongs before `next-build` alongside `check-structure`. (b) is additive after `next-build`, in the same spirit as the existing `check-structure.mjs --build-output` invocation (`verify.mjs`'s `check-structure-build-output` step, which already runs a second time against the captured build log after `next-build`) — either extend `check-structure.mjs` with a second `--build-output`-gated assertion, or add a new script that also takes `--build-output <path>`-style plumbing. Both (a) and (b) must exit non-zero on a violation, never warn, and each ships with its own fixture proving it fails (Phase 1 D-23's pattern, reused by `scripts/lib/fixtures.mjs`'s `withFixture`/`runCheck` helpers).

**Anti-pattern to avoid:** relying on `server-only` alone (Pattern 1) as the *enforced* gate. It is real and it was reproduced to work, including transitively, but it's Next's own build error text folded into the generic `next-build` step's exit code — `verify.mjs` cannot distinguish "failed because of a register leak" from "failed because of a typo" without (a)/(b), and D-17 explicitly requires a check that ships with its own targeted, provable-failure fixture test.

Source: `.next/static/chunks/` and `.next/server/{app,chunks,pages}/` structure confirmed by inspecting this repository's own real build output (Phase 1's committed build). [VERIFIED]

### Anti-Patterns to Avoid
- **Assuming "whole-record deletion only" applies to `plant.ts`'s import line too.** It doesn't — see §Common Pitfalls Pitfall 1.
- **Hashing `plant.ts`/`artisans.ts`/`orders.ts`/`observations.ts` from raw `fs.readFile` bytes with no CRLF normalisation.** This project's Windows workstation has `core.autocrlf=true`; the same commit will check out with different bytes on a Windows dev machine versus GitHub Actions/Vercel (both LF) unless the hash is computed over a normalised buffer — see §Common Pitfalls Pitfall 2.
- **Treating EXPERIENCE.md's "decided, pending" and the five-row conflict table as if they were additional closed-set members.** They aren't — see §Common Pitfalls Pitfall 3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server/client module isolation | A custom babel/webpack plugin that inspects import specifiers at build time | `import "server-only"` (Pattern 1) | Next.js already implements this at the compiler level for both Turbopack and webpack; a hand-rolled equivalent would need to reimplement Next's own module-graph walk and would not be tested against Next's actual bundler internals |
| Loading `.ts` fixture files from a `.mjs` test | A custom transpile-then-`eval` step, or a hand-rolled strip-comments-and-types regex | Node's native TS stripping (Pattern 2) | Regex-based type stripping is exactly the kind of "looks fine until a generic or a template-literal type appears" trap `noUnusedLocals`-adjacent tooling exists to avoid; Node's own parser handles the full grammar correctly and is already the interpreter running the test |
| Cross-platform content hashing | A hash that trusts whatever bytes `fs.readFile` returns | Explicit `\r\n` → `\n` normalisation before hashing (see Pitfall 2) | This is a known, generic class of bug (a hash that differs by platform is not a hash of "the content", it's a hash of "the content plus the checkout's line-ending policy") — normalising is a five-line fix, not a library dependency |

**Key insight:** every "don't hand-roll" item above is really the same lesson once: prefer the platform/runtime's own enforcement (Next's compiler, Node's parser, a normalised byte comparison) over a bespoke reimplementation, because the bespoke version is untested against the exact tool version this project actually runs.

## Closed Sets (D-19) — exact member lists

Extracted from `EXPERIENCE.md` §State Patterns (UX, precedence 1) and `docs/CAPTURE-PLAN-SEED.md` §Data model / `.planning/intel/decisions.md` (seed shapes, precedence 5 / architecture spine). Cross-verified against `DESIGN.md`'s independent restatement of state marks (line 755) — all three sources agree on type-level membership; **one discrepancy is flagged below.**

### Observation kind (10 members; D-05)
The seed's eight: `corrosion_visible | gland_weep | guard_damaged | seal_absent | leak_evidence | label_illegible | fixing_missing | discolouration`
Plus two new (D-05, names as suggested in `02-CONTEXT.md` itself — recommended, not re-derived): `isolation_present` (shared by the ap003 and gs001 "isolation/lock and tag present" rows), `gauge_obscured` (the as001 "DP gauge face fogged" row).

**Recommended kind assignment per observation** (13 rows; the two/three ambiguous ones are explicitly flagged for D-06's drafting-then-review step, not asserted as settled):

| # | Asset | Observation (seed's phrase) | Recommended kind | Confidence |
|---|-------|------------------------------|-------------------|------------|
| 1 | m-ap003 | drive-end housing discolouration | `discolouration` | HIGH — direct match |
| 2 | m-ap003 | coupling guard fixing missing | `fixing_missing` | HIGH — direct match |
| 3 | m-ap003 | isolation tag present | `isolation_present` (new) | HIGH — this is the row that motivated the new kind |
| 4 | m-as001 | DP gauge face fogged | `gauge_obscured` (new) | HIGH — this is the row that motivated the new kind |
| 5 | m-gs001 | lock and tag present | `isolation_present` (new, shared with #3) | HIGH |
| 6 | m-gs001 | arc-flash label illegible | `label_illegible` | HIGH — direct match |
| 7 | m-an001 | actuator cover screw missing | `fixing_missing` (shared with #2) | HIGH |
| 8 | m-aa601 | surface moisture below the bonnet | `gland_weep` **or** `leak_evidence` | MEDIUM — "moisture" doesn't name-match any of the ten cleanly; `gland_weep` (a weep is exactly surface moisture near a seal) fits the AMBIGUOUS/context grade slightly better than `leak_evidence`, but this is a genuine judgment call for D-06/the reviewer |
| 9 | m-aa601 | lead seal wire absent | `seal_absent` | HIGH — direct match |
| 10 | m-aa601 | surface corrosion on spring housing | `corrosion_visible` | HIGH — direct match |
| 11 | m-ac001 | residue at tube-side flange | `leak_evidence` | MEDIUM — "residue" is not itself a kind name; `leak_evidence` is the closest existing member, flag for reviewer confirmation |
| 12 | m-bb001 | inspection stamp part-obscured | `label_illegible` | MEDIUM — a stamp is a marking, not literally a "label", but no closer member exists; flag for reviewer confirmation |

*(13 rows total across the table above — row 5 and row 7 share kinds with rows 3 and 2 respectively, so 13 observations map onto 10 kind values with 3 kinds used twice each... recount: `isolation_present`×2, `fixing_missing`×2, all others ×1 — 8 unique kinds used across 13 rows, `label_illegible`×2 also (rows 6 and 12) if #12 is confirmed as label_illegible. This is drafting input for D-06, not a locked assignment.)*

### Observation grade (2 members; D-12)
`INFERRED | AMBIGUOUS` — its own type, distinct from the sibling's `ExtractionGrade` (which keeps `EXTRACTED` for copied plant facts). `EXTRACTED`/"the record states this" must be **unconstructible** on `AuthoredObservation.grade`'s type — do not reuse `ExtractionGrade` for this field.

**Grade-mark rendering rule** (`DESIGN.md` §The small marks, line 750-753 — cited directly, not paraphrased):
- `INFERRED` — a 3px left rule in `--cobalt-glow`, no fill, no radius, the word in `{typography.label}` / `--viewer-ink`.
- `AMBIGUOUS` — a 3px left rule in `--dk-warn` **plus a 1px full border box** (the added box is a shape difference, so the two grades are distinguishable with no colour perception at all).
- `EXTRACTED` can never render (EXPERIENCE.md line 140: "it would assert a quotation that does not exist").

### Relation (2 members; D-09/D-10)
`evidence | context` — on `AuthoredObservation.relation`. `evidence` = the cited record *supports* the observation (pairs naturally, not exclusively, with `INFERRED`); `context` = the record only *situates* it (pairs naturally with `AMBIGUOUS`).

### Proposal states (4 members)
`open | accepted | rejected | superseded` — confirmed identically in the seed's Data model, `types.ts`'s intended shape, `EXPERIENCE.md`'s §Proposal states table, and `DESIGN.md` line 755 ("proposal: open · accepted · rejected · superseded").

**Discrepancy flagged for the planner:** `EXPERIENCE.md`'s §State Patterns table also lists a row `decided, pending` with a half-filled-square mark. **This is not a fifth `Proposal.state` member.** It is a *derived, presentational* state (a proposal still `open` at the type level, but a `Decision` exists against it with `reconciled: pending`) — confirmed by cross-checking `DESIGN.md`'s independent restatement of the closed set at line 755, which lists exactly four proposal states, and by the seed's own `Proposal.state` type (`open|accepted|rejected|superseded`). Do not add `decided_pending` (or similar) to the `Proposal.state` union in `types.ts`.

### Reconciled states (4 members — distinct from Queue states below)
`recorded | pending | conflict | rejected` — on `Decision.reconciled` and `Referral.reconciled`. **Not an alias of queue item `state`** — note the different membership (`pending` here vs. `queued`+`sending` there; no `discarded` here).

### Queue item state (6 members)
`queued | sending | recorded | conflict | rejected | discarded` — on `SyncItem.state`. Confirmed identically in the seed, `EXPERIENCE.md`'s §Queue states table, and `DESIGN.md` line 755.

### Conflict codes (8 members; `ConflictCode`)
`order_not_found | order_closed | asset_not_in_order | account_mismatch | proposal_superseded | already_recorded_differently | clock_skew | referral_evidence_missing`

**Discrepancy flagged:** `EXPERIENCE.md`'s §Every conflict and reject code table currently shows sentences for only 7 of these 8 — `referral_evidence_missing` is absent from that table. This is intentional and already tracked: `.planning/intel/context.md` Topic 7 marks it `[OPEN → P9 with UX: referral_evidence_missing and unknown_referral are absent from EXPERIENCE.md's closed sets and need sentences and next acts]`. **Phase 2 still defines the type with all 8 members** (per `02-CONTEXT.md` D-19: "including `referral_evidence_missing` and `unknown_referral`"); the missing sentence is a P9 concern, not a Phase 2 blocker, since Phase 2 never touches `lib/copy/governed.ts` or writes UI copy.

Deferred to P4 (not part of Phase 2's closed set): AD-9's `already_open`, `not_open`.

### Reject codes (6 members; `RejectCode`)
`bad_shape | media_too_large | unknown_kind | unknown_proposal | unknown_referral | store_evicted`

**Same discrepancy pattern:** `EXPERIENCE.md`'s §Queue states section states reject codes are "`bad_shape`, `media_too_large`, `unknown_kind`, `unknown_proposal`, `store_evicted` — all five, and only these five" — this predates/excludes `unknown_referral`, the sixth member the seed's type carries. Same resolution as above: type carries 6, EXPERIENCE.md's rendering table currently covers 5, `unknown_referral`'s sentence is explicitly P9 scope.

### Referral resolution states (3 members)
`pending | resolved | unresolved` — on `Referral.resolution`. Confirmed identically in the seed's type and `EXPERIENCE.md`'s §The unresolved-referral state (which names them descriptively as "Pending resolution", "Resolved", "Concerning an unidentified asset").

### State marks (7 members; EXPERIENCE.md §State Patterns, lines 179-190 — this is a rendering-layer closed set, not a TypeScript union, but `types.ts`'s job per D-19 is to make sure every state value above the marks key off of is itself closed)
| Mark | Meaning | Applies to |
|------|---------|------------|
| 2px hollow square | live, and awaiting somebody | proposal `open`; queue `queued` |
| half-filled square | in hand, not yet bound | queue `sending`; a decision `decided, pending` (presentational, see above); a referral `pending` |
| filled square | bound | proposal `accepted`; queue `recorded`; referral `resolved` |
| filled diamond | the server declined for a stated reason | queue `conflict` |
| hollow square with a diagonal rule | refused or rejected, and retained | proposal `rejected`; queue `rejected` (every reject code) |
| 1px hollow square | ended without binding | proposal `superseded`; queue `discarded` |
| hollow square with a centred dot | kept, and unresolved | referral `unresolved` |

### Queue item kinds (5 members) and emitted schema versions (AD-18)
`order_open | order_close | capture | decision | referral` — on `SyncItem.kind`.

**Schema versions:** AD-18 requires "the emitted set is enumerated in code beside the item type." Since Phase 2 is the *first* phase to define `SyncItem`/`schema_version` at all, no breaking change has ever shipped — the natural, lowest-risk starting point is **schema_version `1` for every one of the 5 kinds** (a set of size one per kind: `{1}`). This is a reasoned recommendation, not something locked anywhere in `02-CONTEXT.md` or the architecture spine — flag it to the planner as a decision point rather than asserting it as settled (see Assumptions Log A1).

### The eight governed sentences (not restated — imported)
`types.ts` must **import** `GovernedKey` from `lib/copy/governed.ts`, never redeclare the set. Confirmed by reading `lib/copy/governed.ts` directly — the exact 8 keys are: `preview | authoredVerification | authoredProposals | noRedaction | memoryStore | noOfflineInference | pendingReconciliation | mediaOnDevice` (plus a 9th non-member export, `PLATFORM_413`, explicitly *not* one of the eight). `governed.ts` has zero imports itself, so importing `GovernedKey` into `types.ts` introduces no circular-dependency risk.

## Id Shapes (D-CONV)

| Entity | Shape | Example | Source |
|--------|-------|---------|--------|
| Account | `acc-<surname>` | `acc-mabaso` | D-CONV; confirmed in the seed's curl suite (`{"persona_id":"acc-mabaso"}`) |
| Work order | `wo-NNNN` (internal id); display `WO-2026-NNNN` | `wo-0142` / `WO-2026-0142` | D-CONV; confirmed in the seed's curl suite (`$B/api/orders/wo-0142`) — **the internal id and the display number are two different strings; do not conflate them in `orders.ts`** |
| Asset | `m-<tag-suffix>` | `m-ap003`, `m-aa605` | D-CONV; confirmed throughout `plant.ts` |
| KKS tag | uppercase, never abbreviated | `20LAC10AP003`, `20LBA10AA605` | D-CONV; confirmed throughout `plant.ts`'s `tag` field |
| Client-generated id (`client_id`, `Capture.id`, `Decision.id`, `Referral.id`) | UUID | — | D-CONV, AD-16 (the envelope's `client_id` *is* the entity's own id — not generated in Phase 2 since no route exists yet, but the type shape must allow a UUID string) |
| CitedFact | `f-<asset-suffix>-<short-label>` | `f-gs001-iso`, `f-as001-dp`, `f-aa605-cert` | Confirmed throughout `plant.ts` |
| Deviation | `ncr-NNNN` (id field); `NCR-2026-NNNN` (`ncr_number` field) | `ncr-0118` / `NCR-2026-0118` | Confirmed in `plant.ts`'s `DEVIATIONS` array — **D-09 requires `drawn_from` cite the `id` form (`ncr-0118`), never the `ncr_number` form** |

## Copying `plant.ts` — exact dependency map for the 11-record subset

All facts confirmed by reading `../ipv-demo/lib/data/plant.ts` in full (897 lines) at the pinned commit `8fd097a` (confirmed via `git log -1` against the sibling: `8fd097a5ea7ef50eff0c59649c6c7a5438598921 2026-09-01 18:09:13 +0200`, matching `02-CONTEXT.md`'s pin exactly).

### The 11 required records + `m-aa605`, with every fact id each defines

| Record | Zone | Tag | Deviations | Fact ids defined |
|--------|------|-----|------------|-------------------|
| `m-ap003` | z01 | `20LAC10AP003` | `ncr-0118` | `f-ap003-status`, `f-ap003-last`, `f-ap003-next`, `f-ap003-hours`, `f-ap003-vib` |
| `m-aa101` | z01 | `20LAC10AA101` | (none) | `f-aa101-last`, `f-aa101-seat`, `f-aa101-next` |
| `m-aa102` | z01 | `20LAC10AA102` | (none) | `f-aa102-state`, `f-aa102-last` |
| `m-aa601` | z02 | `20HAD10AA601` | `ncr-0104` | `f-aa601-cert`, `f-aa601-last`, `f-aa601-next`, `f-aa601-seal` |
| `m-aa602` | z02 | `20HAD10AA602` | (none) | `f-aa602-cert`, `f-aa602-last`, `f-aa602-next`, `f-aa602-trevi` |
| `m-aa605` | z02 | `20LBA10AA605` | (none) | `f-aa605-cert`, `f-aa605-next` |
| `m-as001` | z02 | `20LAC30AS001` | (none) | `f-as001-dp`, `f-as001-clean` |
| `m-bb001` | z03 | `20GHC10BB001` | (none) | `f-bb001-insp`, `f-bb001-next`, `f-bb001-mawp` |
| `m-ac001` | z03 | `20GHC20AC001` | `ncr-0091` | `f-ac001-duty`, `f-ac001-clean` |
| `m-gs001` | z04 | `20BFA10GS001` | (none) | `f-gs001-iso`, `f-gs001-test`, `f-gs001-due` |
| `m-an001` | z04 | `20LAC10AN001` | (none) | `f-an001-stroke`, `f-an001-due` |

**`m-aa605`'s `f-aa605-cert` value is confirmed: `"Certified"`** (exact source line: `erpFact("f-aa605-cert", "Certification state", "Certified")`) — matches the referral fixture comment `02-CONTEXT.md` specifies verbatim.

`m-aa601` and `m-aa602` (and `m-aa605`) each also carry a `setpoint: SetpointBlock` object (design/lift/reset/blowdown pressures) — copy verbatim, no trimming needed within a kept record.

### Candidate facts for the five vaguely-cited seed rows (D-09)

| Row | Record's available facts (excluding facts already cited by another observation on the same record) | Recommended candidate | Confidence |
|-----|---------------------------------------------------------------------------------------------------|------------------------|------------|
| as001 "DP gauge face fogged" | `f-as001-dp` (Differential pressure, 0.28 bar, `liveRead: true`), `f-as001-clean` (last element clean) | `f-as001-dp` — the only fact that is itself a *reading* (a DP value), matching "gauge face" | HIGH — only one plausible candidate |
| gs001 "arc-flash label illegible" | `f-gs001-iso` (already cited by the "lock and tag present" row — do not reuse), `f-gs001-test` (last protection test), `f-gs001-due` (protection test due, `tone: "crit"`) | `f-gs001-due` — its `crit` tone situates general disrepair, the best available context-only fit | MEDIUM — neither remaining fact is thematically about a label; flag as a genuine dispute candidate for the checkpoint |
| an001 "actuator cover screw missing" | `f-an001-stroke` (last stroke test), `f-an001-due` (stroke test due) | either — neither is about physical hardware condition | LOW — flag explicitly as a checkpoint dispute candidate; the record may simply not offer a fact that situates this observation well, which D-09 explicitly anticipates ("where a machinery record offers no fact that situates the observation, the row is raised at the checkpoint as a dispute") |
| aa601 "surface corrosion on spring housing" | `f-aa601-cert` (already partly thematically used — "Uncertified — seal broken", `tone: "crit"`), `f-aa601-last`/`f-aa601-next` (verification dates); `f-aa601-seal` is already cited by the "surface moisture" row, `ncr-0104` already cited by "lead seal wire absent" | `f-aa601-cert` — its `crit` tone and "Uncertified" state situates a valve in poor condition generally | MEDIUM |
| bb001 "inspection stamp part-obscured" | `f-bb001-insp` (last statutory inspection date), `f-bb001-next`, `f-bb001-mawp` | `f-bb001-insp` — directly about an inspection record, the closest available match to "inspection stamp" | HIGH |

*(All five are, per D-09, "resolved to a specific fact by the executor at authoring and confirmed by the reviewer at the checkpoint" — the table above is drafting input, not a locked assignment. The MEDIUM/LOW-confidence rows are exactly where D-04's "reword, re-cite or drop" dispute path is most likely to be exercised.)*

### What the 11 records + `m-aa605` depend on elsewhere in `plant.ts`

- **`DOC` constant** (`const DOC = "RPL"`) — required (used in every `governing_docs` template literal).
- **`prov()` and `erpFact()` helper functions** — required verbatim (every fact and every deviation's `provenance` field is built by these).
- **`PEOPLE`** — of the 7 keys, only `millwright`, `qc`, `test`, `ndt` are referenced by the 11-record subset's facts/evidence blocks and by the 3 deviations' `originator` fields. `reliability`, `supervisor` and `planner` are referenced **only** by `ANCHORS`/`CAPTURE_SESSIONS` (excluded — see Pitfall 1), so after that exclusion they become fully unused. **Recommend trimming `PEOPLE` to the 4 referenced keys** — this is Claude's Discretion per `02-CONTEXT.md`'s own list ("How much of the sibling's `plant.ts` surrounding structure (zone records, `PEOPLE`, `DOCS`...) is carried"), and trimming is consistent with the same whole-unit-deletion philosophy already applied to `MACHINERY`/`ZONES`. Keeping all 7 is not wrong, just slightly less minimal.
- **`DOCS`** — all 6 entries in the sibling's array are referenced by at least one of the 11 records' `governing_docs` (`RPL-WI-O-9`, `RPL-PR-O-17`, `RPL-PR-O-3`, `RPL-PR-I-1`, `RPL-WI-O-6`, `RPL-PR-S-1` — every one of the sibling's 6 `DOCS` entries is used). **No trimming needed or possible; copy `DOCS` and `DOC_BY_CODE` in full.**
- **`DEVIATIONS`** — the sibling defines exactly 3 deviations total (`ncr-0118`, `ncr-0104`, `ncr-0091`), and all 3 are exactly the ones the 11-record subset references. **No trimming needed or possible; copy `DEVIATIONS` and `DEVIATION_BY_ID` in full.**
- **`ZONES`** — the subset touches `z01` (ap003, aa101, aa102), `z02` (aa601, aa602, aa605, as001), `z03` (bb001, ac001), `z04` (gs001, an001). **`z05` (Reagent Dosing, management-tier) is referenced by nothing in the subset** (only `m-ap010` and `m-bb002`, both excluded) — recommend dropping the `z05` entry from the copied `ZONES` array (a whole-record deletion, consistent with the MACHINERY trim). `ZONE_BY_ID` regenerates correctly from the trimmed array automatically (it's a derived `.map()`).
- **`SCENE_VERSION`** — keep verbatim (`"ref-plant/2026.07.3"`); it is the *copied plant's own* version and is explicitly the shape-model for `FIXTURE_VERSION` (D-13), not something Phase 2 replaces.

## Common Pitfalls

### Pitfall 1: Trimming `ANCHORS`/`CAPTURE_SESSIONS` orphans two names in `plant.ts`'s own import line
**What goes wrong:** `02-CONTEXT.md`'s Claude's Discretion note says `ANCHORS`, `CAPTURE_SESSIONS` and "the 3D placement table" (i.e. the `ANCHOR_POSITIONS` const) are **not** carried into the copied `plant.ts`. A naive "delete whole blocks only" pass would leave the sibling's own import line untouched: `import type { Anchor, CaptureSession, CitedFact, Deviation, GoverningDoc, Machinery, Provenance, Zone } from "./types";`. Since `D-18`'s exhaustive copy list for `types.ts` does **not** include `Anchor` or `CaptureSession`, this import now references two names that don't exist in this project's `types.ts` — a hard `tsc` failure (`TS2305: Module '"./types"' has no exported member 'Anchor'`), not a lint warning.
**Why it happens:** "Whole-record deletion only" is the right rule for the `MACHINERY` array's entries, but the file's own top-of-file import statement is not itself a "record" — it's shared infrastructure that must be edited to match what's actually still present below it.
**How to avoid:** When trimming `plant.ts`, remove in the same pass: the `Anchor, CaptureSession,` names from the `import type` line; the `ANCHOR_POSITIONS` const; the `ANCHORS` export; the `ANCHOR_BY_MACHINERY` export; the `anchorsInZone` function; and the `CAPTURE_SESSIONS` export (the exact block is `../ipv-demo/lib/data/plant.ts` lines 832–897 in the sibling, plus the two names in the line-13-ish import). `machineryInZone` (a small helper depending only on `MACHINERY`/`Machinery`, neither excluded) has no such problem and can be kept.
**Warning signs:** `tsc --noEmit` reporting `TS2305` against `plant.ts`'s own import line, or an unused-import warning on `Anchor`/`CaptureSession` if `next build`'s lint step is stricter than this repo's current ESLint config.

### Pitfall 2: A naive hash pin will not survive a Windows-to-CI round trip
**What goes wrong:** This machine has `core.autocrlf=true`. If a developer edits `plant.ts`/`artisans.ts`/`orders.ts`/`observations.ts` in a Windows editor, the working-tree bytes are likely CRLF; Git normalises to LF on commit (assuming no override), but GitHub Actions and Vercel check out LF while the developer's own working tree (post-edit, pre-commit, or after certain editors write CRLF back on save) may show CRLF. A hash computed from raw `fs.readFile` bytes will differ between the two, making `check-fixture-hash` fail locally right after a legitimate, correctly-repinned edit — or worse, pass locally and fail only in CI, which is the most confusing failure mode for D-14's own check to produce.
**Why it happens:** D-12's precedent (`check-tokens.mjs`, paired with `.gitattributes`' `app/styles/tokens.inherited.css -text`) solves a *different* problem: a file that is never edited again, where `-text` (disable all normalisation) is correct because the goal is "preserve whatever was pinned, byte for byte, forever." D-14's four files are the opposite: actively developed fixture files that *will* be edited and re-pinned repeatedly through the rest of the project.
**How to avoid:** In the hash-check script, normalise `\r\n` → `\n` on the buffer (or use `buf.toString("utf8").replace(/\r\n/g, "\n")` before hashing) for all four files, **before** computing SHA-256 — this is the mechanism that "cannot be defeated by an editor," because it doesn't matter what's on disk when the check runs. Pair it with a `.gitattributes` entry `text eol=lf` (not `-text`) for the four files as defense-in-depth and consistency with the project's established convention of documenting line-ending intent in `.gitattributes` — but the script-side normalisation is the load-bearing mechanism, since `.gitattributes` only takes effect on checkout/checkin and has a well-known gap (it does not retroactively renormalise already-committed content without an explicit `git add --renormalize`).
**Warning signs:** `check-fixture-hash` passing on a developer's machine immediately after editing but failing in the GitHub Actions `verify` job (or vice versa) with no content difference visible in the diff.

### Pitfall 3: EXPERIENCE.md's UI-state vocabulary is not the same list as the TypeScript closed sets
**What goes wrong:** `EXPERIENCE.md`'s §State Patterns table (the document `02-CONTEXT.md` names as authoritative for the closed sets) includes rows like `decided, pending` that describe a *rendering* state, not a stored enum member. A literal transcription risks adding a 5th `Proposal.state` value or similar.
**Why it happens:** The design document's job is to describe every visually-distinct state a screen can show; some of those are derived combinations of two underlying type-level facts (here: `Proposal.state === "open"` AND a `Decision` exists with `reconciled === "pending"`), not first-class enum members.
**How to avoid:** Cross-check every state-pattern row against `DESIGN.md`'s independent restatement (line 755, a completely separate document written for a different purpose) and against the seed's own type shapes before adding anything to a `types.ts` union. Where the seed's type has 4 members and EXPERIENCE.md's table has a 5th descriptive row, the type wins — the render-time distinction is a small derivation done at the component level in a later phase, not a `types.ts` concern.
**Warning signs:** A closed-set union in `types.ts` with a member name that doesn't appear anywhere in the seed's Data model section or in `DESIGN.md`'s line-755 restatement.

## Code Examples

### The D-11 resolver/comment-drift test pattern (Node native TS loading)
```javascript
// Source: pattern synthesized from this repo's scripts/lib/fixtures.mjs
// conventions + the empirically-verified Node 24 native-TS-import behaviour
// (see Pattern 2 above). scripts/check-observations.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
// .ts extension required — this is a .mjs file, the entry point of the chain.
import { OBSERVATIONS } from "../lib/data/observations.ts";
import { MACHINERY_BY_ID, DEVIATION_BY_ID } from "../lib/data/plant.ts";

function resolveCitedRecord(drawnFrom) {
  // D-09's id space: a CitedFact id (f-...) lives inside a Machinery's
  // facts[]; a Deviation id (ncr-...) is DEVIATION_BY_ID directly.
  if (drawnFrom.startsWith("ncr-")) return DEVIATION_BY_ID.get(drawnFrom);
  for (const machine of MACHINERY_BY_ID.values()) {
    const fact = machine.facts.find((f) => f.id === drawnFrom);
    if (fact) return fact;
  }
  return undefined;
}

test("every drawn_from resolves to a real fixture record", () => {
  for (const obs of OBSERVATIONS) {
    assert.ok(
      resolveCitedRecord(obs.drawnFrom),
      `${obs.id}: drawn_from "${obs.drawnFrom}" does not resolve`,
    );
  }
});
```

### Cross-platform fixture hash (D-14, extending the D-12 pattern)
```javascript
// Source: pattern extending scripts/check-tokens.mjs's pinned-hash mechanism
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

async function normalisedHash(paths) {
  const hash = createHash("sha256");
  for (const p of paths) {
    const buf = await readFile(p);
    // Load-bearing: normalise CRLF -> LF before hashing so the digest is
    // identical on a Windows dev machine (core.autocrlf=true), GitHub
    // Actions and Vercel (both LF), regardless of what's on disk.
    hash.update(buf.toString("utf8").replace(/\r\n/g, "\n"));
  }
  return hash.digest("hex");
}

const PINNED_HASH = "..."; // computed once, re-pinned in the same commit as any fixture edit
const digest = await normalisedHash([
  "lib/data/plant.ts",
  "lib/data/artisans.ts",
  "lib/data/orders.ts",
  "lib/data/observations.ts",
]);
if (digest !== PINNED_HASH) {
  console.error(`fixture content hash mismatch: got ${digest}, expected ${PINNED_HASH}`);
  process.exit(1);
}
```

### Register isolation — source-side import-graph walk (D-17a)
```javascript
// Source: pattern for a new scripts/check-register-isolation.mjs
// Walks components/ and lib/client/ (the latter may not exist yet — that's fine,
// readdir on a missing dir should be treated as "nothing to check", not an error).
const FORBIDDEN = ["lib/data/register", "lib/access/register"];
// resolve relative specifiers AND the tsconfig "@/*" alias; walk transitively
// by following each resolved file's own imports until every reachable file
// under components/ + lib/client/'s graph has been visited once.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `--experimental-strip-types` flag required to run `.ts` files directly with Node | Default-on, no flag, `process.features.typescript === "strip"` | Somewhere in the Node 23.6→24.x line (this repo runs 24.19.0, where it is unflagged and prints no warning) | New `.mjs` check/test scripts can load `.ts` fixture modules with zero new dependency — this is the entire justification for not needing a `tsc`-to-`scripts/.check/` compile step |

**Deprecated/outdated:** None specific to this phase's stack — Next 16.3.4, React 19.2.8 and TypeScript 5.9.3 are all current per Phase 1's own D-STACK sweep (2026-08-31), and nothing in this phase touches a part of that stack Phase 1 didn't already validate.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Each of the 5 `SyncItem` kinds starts at `schema_version: 1` (an emitted set of size one per kind) | §Closed Sets — "Queue item kinds" | LOW — this is an internal versioning convention with no external contract yet (no route exists to emit these values this phase); if the planner picks a different starting convention (e.g., string `"v1"` instead of numeric `1`), nothing downstream in Phase 2 breaks, since P6/P9 are the first phases that actually read/write this field over the wire |
| A2 | The recommended kind assignments for observation rows 8, 11 and 12 (`gland_weep`/`leak_evidence` for aa601 moisture; `leak_evidence` for ac001 residue; `label_illegible` for the bb001 stamp) | §Closed Sets — "Observation kind" table | LOW-MEDIUM — these are explicitly flagged MEDIUM confidence and are exactly the kind of judgment call D-06 (executor drafts) → D-02 (reviewer confirms at the checkpoint) already exists to catch; a wrong initial guess costs one round of reviewer feedback, not a rework of the type system |
| A3 | The recommended candidate facts for the 5 vaguely-cited seed rows (§Copying plant.ts table) | §Copying `plant.ts` — "Candidate facts for the five vaguely-cited rows" | LOW-MEDIUM — same mitigation as A2: D-09 explicitly anticipates some of these being raised as checkpoint disputes rather than silently accepted |

**If this table is empty:** N/A — three low-risk drafting recommendations are logged above; nothing load-bearing to the architecture is assumed. Every mechanism claim in this document (`server-only`'s transitive behaviour, Node's native TS stripping, the `.next/static` vs `.next/server` split, the `checkpoint:human-verify` protocol, the exact governed-sentence keys, every fact id and deviation id in the sibling repo) was either directly reproduced against this repository's real toolchain or read verbatim from a committed file — none of those are tagged `[ASSUMED]`.

## Open Questions

1. **Exact comment syntax for D-11's citation comment**
   - What we know: it must be "one fixed, parseable form," must name the cited id, and must quote the record's own field verbatim (`label: value` with unit, or `id.field: "…"` for a deviation).
   - What's unclear: the precise punctuation/marker (`// cites f-gs001-iso: "Isolations applied: 1 — transfer set C"` is the example `02-CONTEXT.md` itself offers, but this is explicitly Claude's Discretion).
   - Recommendation: adopt the `02-CONTEXT.md` example verbatim (`// cites <id>: "<label>: <value>"` for a fact; `// cites <id>.<field>: "<value>"` for a deviation) — it's already been shown to the user once during discuss-phase and not objected to, minimising re-litigation risk at plan review.

2. **Whether `drawn_from` is a bare string id or the full `ObservationProvenance` tuple**
   - What we know: `02-CONTEXT.md` recommends the bare id ("one string the resolver test checks"), with the full tuple composed later by a P3/P5 module from the cited record's own provenance.
   - What's unclear: nothing structurally — this is a clean recommendation with a stated fallback. Including it here only so the planner sees it's Claude's Discretion, not locked.
   - Recommendation: bare string id, matching `02-CONTEXT.md`'s own recommendation and this research's confirmation that the resolver test (Pattern/Code Example above) is simplest against a bare id.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Native TS stripping for fixture tests (Pattern 2); the whole `verify` pipeline | ✓ | 24.19.0 | — |
| npm | `npm install server-only` | ✓ | bundled with Node 24.19.0 | — |
| `../ipv-demo` sibling repo at commit `8fd097a` | Source of every copied type/record | ✓ | confirmed via `git log -1` against the sibling: `8fd097a5ea7ef50eff0c59649c6c7a5438598921 2026-09-01 18:09:13 +0200` — matches `02-CONTEXT.md`'s pin exactly | — |
| Next.js / Turbopack | `next build`'s enforcement of `server-only` (Pattern 1); the register-isolation post-build sentinel scan | ✓ | 16.3.4 (this repo's installed version) | — |
| `server-only` (npm package) | Optional — see §Standard Stack | not yet installed (Phase 2 will add it) | 0.0.1 (only version ever published) | Next's internal handling works with or without it (confirmed) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — `server-only` is not "missing," it simply hasn't been installed yet, and Next's own internal handling is a complete functional fallback if the plan chooses to skip the `npm install` step (not recommended, but not a blocker either).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 24.19.0 built-in) |
| Config file | none — `scripts/verify.mjs`'s `fixture-suite` step runs `node --test scripts/**/*.test.mjs` directly; a new `*.test.mjs` file needs no additional wiring |
| Quick run command | `node --test scripts/check-observations.test.mjs` (or whatever filename the new resolver test takes) |
| Full suite command | `npm run verify` (runs the entire `scripts/verify.mjs` STEPS array, including `tsc`, `eslint`, the claims audit, the fixture suite, and `next build`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| REQ-FR-21a (referential-integrity half) | Every `drawn_from` resolves to a real fixture record id | unit | `node --test scripts/check-observations.test.mjs` | ❌ Wave 0 |
| REQ-FR-21a (comment-fidelity half) | Every observation's code comment quotes the cited record's own live value, with no drift | unit | `node --test scripts/check-observations.test.mjs` (same file, second assertion) | ❌ Wave 0 |
| REQ-FR-21a (grade-unconstructibility half) | `AuthoredObservation.grade` cannot hold the value meaning "the record states this" | type-check | `npx tsc --noEmit` (already in `verify.mjs`) | ✅ (existing step; no new file, just correct type authoring) |
| REQ-FR-21a (human provenance half) | **A named person has read each cited record and confirmed the wording** | manual-only | none — see below | N/A |
| D-14 (fixture-version hash) | Content hash over the four fixture files matches its pin; fails on drift | unit | `node --test scripts/check-fixture-hash.test.mjs` | ❌ Wave 0 |
| D-17 (register isolation, source) | No module under `components/`/`lib/client/` imports the register, directly or transitively | unit | `node --test scripts/check-register-isolation.test.mjs` | ❌ Wave 0 |
| D-17 (register isolation, bundle) | No register content in `.next/static/**` after a real build | integration (requires a real `next build`) | `node scripts/check-register-isolation.mjs --build-output <path>` (invoked from `verify.mjs` after `next-build`, matching `check-structure.mjs`'s existing two-invocation pattern) | ❌ Wave 0 |

**Success criterion 3 (the human provenance check) is explicitly, deliberately not automated.** `AD-15` names this "the one build gate that is not automated and is not lesser" and `02-CONTEXT.md` D-02 states the executor "never marks it complete on its own." No automated proxy is invented here — the closest an automated test can get is asserting that `docs/analysis/provenance-check.md` exists, has no empty verdict cells, and every row's verdict is one of `confirmed|reworded|re-cited|dropped` (a *structural* completeness check, not a substitute for the human judgment itself) — and even that structural check is optional polish, not a requirement this research is asserting.

### Sampling Rate
- **Per task commit:** `node --test scripts/check-observations.test.mjs scripts/check-fixture-hash.test.mjs scripts/check-register-isolation.test.mjs` (the three new test files, run directly, skipping the slower `next build`-dependent half of the isolation check during iteration)
- **Per wave merge:** `npm run verify` (full suite, including `next build` and the post-build sentinel scan)
- **Phase gate:** Full suite green before `/gsd:verify-work`, **plus** the signed `docs/analysis/provenance-check.md` — the phase does not close on the automated suite alone (FR-21a).

### Wave 0 Gaps
- [ ] `scripts/check-observations.mjs` + `scripts/check-observations.test.mjs` — covers REQ-FR-21a's referential-integrity and comment-fidelity halves
- [ ] `scripts/check-fixture-hash.mjs` (or a `check-structure.mjs` extension) + its test — covers D-14
- [ ] `scripts/check-register-isolation.mjs` (or a `check-structure.mjs` extension) + its test — covers D-17, both halves
- [ ] `lib/data/{types,plant,artisans,orders,observations,fixtures,register}.ts` — none exist yet; this entire phase's Wave 0 is authoring the fixtures themselves before any check can run against them
- [ ] `docs/analysis/provenance-check.md` — the draft-then-signed artefact; does not exist yet

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Not touched in this phase (P3) |
| V3 Session Management | No | Not touched in this phase (P3) |
| V4 Access Control | Partial | The register-isolation rule (D-17) is a build-time enforcement of a data-exposure boundary, not a runtime authorization decision — most precisely a V8-style data-protection control, included here because it's the phase's central security-relevant deliverable |
| V5 Input Validation | Yes (type-level) | The closed-set string-literal unions in `types.ts` are themselves a form of "illegal states unrepresentable" validation — `AuthoredObservation.grade` cannot hold `"EXTRACTED"` because the type excludes it, not because a runtime check rejects it |
| V6 Cryptography | Yes (minimal) | `node:crypto`'s `createHash("sha256")` for the D-14 content-hash pin — never hand-roll a hash function; Node's built-in is the standard control here |
| V8 Data Protection (not in the standard V2–V6 template above, added because it is this phase's primary control) | Yes | `import "server-only"` (Pattern 1) + the two-layer isolation check (Pattern 3) together are the standard control preventing the tag→asset register from reaching a client bundle |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Server-only data (the register) leaking into a client JS bundle | Information Disclosure | `import "server-only"` (compiler-level, confirmed transitive) + independent post-build sentinel scan of `.next/static/**` (Pattern 3) — defense in depth, neither layer alone is trusted |
| A code path constructs `grade: "EXTRACTED"`-equivalent on an authored observation, falsely implying the record states a fact it only supports/situates | Spoofing (of provenance/authenticity) | Type-level exclusion: `AuthoredObservation.grade` is its own 2-member union, never widened to include the sibling's 3-member `ExtractionGrade` (D-12) |
| A citation comment silently drifts from the record it quotes as the fixture file is edited over time, making an audited claim unverifiable after the fact | Repudiation | D-11's resolver/comment-drift test, run on every `verify` invocation, comparing the quoted text against the live, evaluated record value — not a one-time review |
| Supply-chain risk from the one new dependency this phase adds (`server-only`) | Tampering | Package Legitimacy Audit above: canonical maintainer, official-docs-linked, no postinstall script, `[OK]` from `slopcheck`, 15M+ weekly downloads |

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/app/guides/data-security](https://nextjs.org/docs/app/guides/data-security) — fetched live this session (`lastUpdated: 2026-08-25`); `server-only` package installation, "Next.js handles server-only imports internally" statement
- [nextjs.org/docs/app/getting-started/server-and-client-components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — fetched live this session (`lastUpdated: 2026-08-25`); §Preventing environment poisoning, module-graph semantics
- Direct execution against this repository's installed toolchain: Node v24.19.0 (`process.features.typescript`, `.ts`-extension import resolution, enum-rejection behaviour), `node_modules/next/types/global.d.ts` (the `server-only` ambient module declaration and its documented rationale), `npx tsc --noEmit` / `npx eslint .` (both run with `server-only` uninstalled), `npx next build` (three separate runs: one invalidated by an accidental `_`-prefixed route folder — Next's private-folder convention — one that reproduced the transitive `server-only` build failure with exit code 1 and a full import trace, and a final clean rebuild after all scratch files were removed)
- `../ipv-demo/lib/data/types.ts` (read in full, 412 lines) and `../ipv-demo/lib/data/plant.ts` (read in full, 897 lines) at commit `8fd097a`, confirmed via `git log -1` against the sibling repository
- `scripts/verify.mjs`, `scripts/check-tokens.mjs`, `scripts/check-structure.mjs`, `scripts/lib/fixtures.mjs`, `scripts/claims-audit.mjs`, `lib/copy/governed.ts`, `tsconfig.json`, `package.json`, `next.config.ts`, `.gitattributes`, `.gitignore` — all read in full from this repository
- `.planning/intel/decisions.md` AD-6, AD-7, AD-8, AD-9, AD-13, AD-15, AD-16, AD-17, AD-18, AD-19, D-DEP, D-CONV, D-STACK, D-DEPLOY, D-ENT, D-MAP; `docs/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` §Consistency Conventions, §AD-16, §AD-18, §Dependency direction — read directly
- `docs/planning-artifacts/ux-designs/.../EXPERIENCE.md` lines 135-144 and 175-300 (§Component Patterns, §State Patterns) and `DESIGN.md` lines 354-362, 441-448, 555-560, 742-794 (§The small marks, grade/state marks) — read directly
- `docs/CAPTURE-PLAN-SEED.md` lines 198-262 and 344-370 — read directly
- `docs/planning-artifacts/epics.md` lines 864-897 (Story 2.1) — read directly
- `.planning/phases/01-scaffold-conventions/01-CONTEXT.md` D-07, D-09, D-17–D-23; `01-09-PLAN.md` lines 220-289 (the `checkpoint:human-verify` task shape) — read directly
- `$HOME/.claude/get-shit-done/workflows/execute-phase.md` lines 1045-1084 (`checkpoint_handling` step, including the auto-mode auto-approval behaviour for `human-verify` checkpoints) — read directly
- `npm view server-only` (registry metadata), `api.npmjs.org/downloads/point/last-week/server-only` (15,063,972/week), `slopcheck install server-only` (`[OK]` verdict) — run directly this session

### Secondary (MEDIUM confidence)
- The recommended observation-kind assignments and candidate-fact picks for the ambiguous rows (§Closed Sets, §Copying `plant.ts`) — reasoned from the sibling's actual fact/field content, explicitly flagged MEDIUM/LOW where the fit is not clean, and logged in the Assumptions table

### Tertiary (LOW confidence)
- None — every claim in this document that could not be verified against an authoritative source or reproduced directly was either dropped or explicitly logged in the Assumptions table above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `server-only`'s mechanics were reproduced directly against this repo's real Next 16.3.4/Turbopack build, not inferred from docs alone
- Architecture: HIGH — the register-isolation two-layer design is grounded in this repo's actual `.next/static` vs `.next/server` output structure, confirmed by direct inspection
- Pitfalls: HIGH for Pitfalls 1 and 3 (both directly traceable to specific lines in files read in full); MEDIUM-HIGH for Pitfall 2 (CRLF/hash reasoning is standard, extremely stable git/hashing behaviour, not something likely to have drifted from training knowledge, but not independently re-tested with a live cross-platform checkout in this session)

**Research date:** 2026-09-08
**Valid until:** 30 days for the architectural/type-shape findings (stable, locked by `02-CONTEXT.md`); 7 days for any claim about Next.js/Node version-specific behaviour if the project's `next`/`node` versions change before Phase 2 executes (unlikely mid-phase, but the empirical reproductions above are pinned to Next 16.3.4 / Node 24.19.0 exactly)
