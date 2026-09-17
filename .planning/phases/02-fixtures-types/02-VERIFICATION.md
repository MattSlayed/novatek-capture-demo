---
phase: 02-fixtures-types
verified: 2026-09-17T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 2: Fixtures & Types Verification Report

**Phase Goal:** The synthetic plant subset, artisans, orders and authored observations exist with cited records, and a person has confirmed every wording against the record it cites
**Verified:** 2026-09-17
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `tsc` is clean over `lib/data/types.ts`, `plant.ts`, `artisans.ts`, `orders.ts`, `observations.ts` and the closed sets defined once in the types module | ✓ VERIFIED | `npx tsc --noEmit` exits 0 with no output. `lib/data/types.ts` (712 lines) defines eleven closed sets (`ObservationKind`, `ObservationGrade`, `ObservationRelation`, `ArtisanTrade`, `ProposalState`, `ReconciledState`, `QueueItemState`, `ConflictCode`, `RejectCode`, `ReferralResolution`, `SyncItemKind` + `SYNC_ITEM_SCHEMA_VERSIONS`) as string-literal unions with typed member arrays, and imports `GovernedKey` type-only from `lib/copy/governed.ts` rather than restating the eight governed sentences. `grep -rn "enum"` over `lib/data/*.ts` returns no `enum` construct. |
| 2 | Every `drawn_from` on every authored observation resolves to a real fixture record id; every grade is from {inferred, ambiguous}; no grade meaning *the record states this* is constructible | ✓ VERIFIED | `node scripts/check-observations.mjs` exits 0, "Problems: 0" — every `drawn_from` resolves against `plant.ts`'s live facts/deviations and every citation comment matches the live record. `ObservationGrade` is declared as its own two-member union (`"INFERRED" \| "AMBIGUOUS"`, `lib/data/types.ts:307`), disjoint from `ExtractionGrade` (which retains `EXTRACTED` for copied ERP/NCR facts). All 12 observations in `lib/data/observations.ts` carry `grade: "INFERRED"` or `grade: "AMBIGUOUS"` only. |
| 3 | A named person has read each authored observation against the record it cites and confirmed it is an inference that record supports or only situates it; the fixture file carries the cited record's own sentence in a comment beside each observation and the evidence-or-context relation records which was confirmed — the phase does not close without this | ✓ VERIFIED | `docs/analysis/provenance-check.md` carries a 12-row main table, one per `OBSERVATIONS` entry, each with a `Verdict` of `confirmed`, `Reviewer` = "Matthew Koeberg", and `Date` = "2026-09-17". Each row quotes the cited record's own sentence and states the `Relation` (evidence/context) matching `observations.ts`'s `relation` field exactly. The two referral rows (`m-aa605` resolved, `20HAD10AA610` unresolved) are listed in a separate table marked "not subject — a referral takes no `drawn_from`". A closing sign-off statement and "Recorded 2026-09-17." close the file — no DRAFT banner remains. This is a human sign-off artifact, verified by inspection per REQ-FR-21a's own `[Verified by: inspection]` tag in REQUIREMENTS.md; no automated proxy was substituted. |
| 4 | The claims audit is clean over the copied surfaces; the fixture version is a single named export (not the build id); the register (`lib/data/register.ts`) is typed as server-only and the register-isolation rule is wired into the verify command | ✓ VERIFIED | `node scripts/claims-audit.mjs` exits 0 ("live violations: 0"). `lib/data/fixtures.ts` exports `FIXTURE_VERSION = "capture-fixtures/2026.09.1"` as a standalone dated string, distinct from `CAPTURE_BUILD_ID`; `node scripts/check-fixture-hash.mjs` exits 0 confirming the pinned SHA-256 over `plant.ts`/`artisans.ts`/`orders.ts`/`observations.ts` matches current content. `lib/data/register.ts` opens with `import "server-only";` as its first statement. `scripts/verify.mjs`'s STEPS array wires `check-register-isolation` (source-graph walk, before `next-build`) and `check-register-isolation-bundle` (post-build sentinel scan, after `next-build`); both ran with "Problems: 0" during the full `npm run verify` run, and `next build`'s output bundle carries no register sentinel. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/data/types.ts` | 14 copied names, 11 closed sets, 18 entity types; ≥300 lines; contains `export type ObservationGrade` | ✓ VERIFIED | 712 lines; contains the pattern; `tsc` clean |
| `lib/data/plant.ts` | Trimmed plant subset: 11 machinery + prov/erpFact helpers; ≥400 lines; contains `SCENE_VERSION` | ✓ VERIFIED | 652 lines; 11 `id: "m-..."` records including `m-aa605`; no `Anchor`/`CaptureSession`/`ANCHORS` remnants |
| `lib/data/artisans.ts` | Three Artisan accounts; contains `acc-mabaso` | ✓ VERIFIED | 68 lines; `acc-mabaso`, `acc-naidoo` (`site_supervisor`), `acc-vanwyk` (`field_technician`) present |
| `lib/data/orders.ts` | Five WorkOrder records; contains `WO-2026-0142` | ✓ VERIFIED | 155 lines; all five WO numbers present with separate internal `wo-NNNN` ids |
| `scripts/check-fixture-shape.test.mjs` | Runtime membership assertions; ≥80 lines; contains `ORDERS_BY_ID` | ✓ VERIFIED | 615 lines; part of the 228-test fixture-suite, all passing |
| `lib/data/register.ts` | Server-only tag-to-asset table; contains `import "server-only"` | ✓ VERIFIED | 63 lines; first statement is `import "server-only";` |
| `scripts/check-register-isolation.mjs` | Source-graph walk + bundle sentinel scan; ≥120 lines | ✓ VERIFIED | 279 lines; both modes exit 0 |
| `scripts/check-register-isolation.test.mjs` | Fixtures proving each half fails on violation; ≥90 lines | ✓ VERIFIED | 182 lines; passing in fixture-suite |
| `lib/data/observations.ts` | 12 authored observations; contains `// cites ` | ✓ VERIFIED | 182 lines; 12 `// cites` comments, 12 `id: "obs-..."` entries matching D-08's exact distribution (ap003×3, as001×1, gs001×2, an001×1, aa601×3, ac001×1, bb001×1) |
| `scripts/check-observations.mjs` | D-11 resolver + comment-fidelity check; ≥130 lines | ✓ VERIFIED | 403 lines; exits 0 |
| `scripts/check-observations.test.mjs` | Fixtures proving each violation class fails; ≥110 lines | ✓ VERIFIED | 192 lines; passing |
| `docs/analysis/provenance-check.md` | Signed FR-21a check; contains `Reviewer`; ≥40 lines | ✓ VERIFIED | 124 lines; reviewer name, date, verdicts on all 12 rows, referral table, sign-off |
| `lib/data/fixtures.ts` | `FIXTURE_VERSION` + pinned content hash; contains `capture-fixtures/` | ✓ VERIFIED | 43 lines; `FIXTURE_VERSION = "capture-fixtures/2026.09.1"`, `FIXTURE_CONTENT_SHA256` pinned |
| `scripts/check-fixture-hash.mjs` | CRLF-normalised SHA-256 recompute-and-compare; ≥70 lines | ✓ VERIFIED | 126 lines; exits 0 |
| `scripts/check-fixture-hash.test.mjs` | Fixture proving unpinned content change fails; ≥70 lines | ✓ VERIFIED | 115 lines; passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `lib/data/types.ts` | `lib/copy/governed.ts` | type-only import of `GovernedKey` | ✓ WIRED | `import type { ... GovernedKey ... }`; no second definition; `check-governed.mjs` (part of verify) exits 0 |
| `lib/data/types.ts AuthoredObservation.grade` | `ObservationGrade` | its own two-member union | ✓ WIRED | `grade: ObservationGrade` on `AuthoredObservation`; never `ExtractionGrade` |
| `lib/data/plant.ts` | `lib/data/types.ts` | import type of copied names, Anchor/CaptureSession removed | ✓ WIRED | confirmed no `Anchor`/`CaptureSession` reference remains anywhere in `plant.ts` |
| `scripts/check-fixture-shape.test.mjs` | `lib/data/plant.ts` | Node 24 native TS stripping, `.ts` extension | ✓ WIRED | fixture-suite step passes all 228 tests |
| `lib/data/orders.ts asset_ids` | `lib/data/plant.ts MACHINERY_BY_ID` | every asset id resolves | ✓ WIRED | asserted by fixture-shape test, part of 228 passing tests |
| `lib/data/artisans.ts` | `lib/data/orders.ts assigned_to` | assignment symmetry | ✓ WIRED | `ORDER_IDS_BY_ARTISAN` (wo-0142/wo-0151 → mabaso, wo-0137 → naidoo, wo-0129/wo-0133 → vanwyk); shape test asserts agreement |
| `scripts/verify.mjs STEPS` | `scripts/check-register-isolation.mjs` | one source-side step before `next-build`, one `--bundle` step after | ✓ WIRED | confirmed in `scripts/verify.mjs` STEPS array (lines 92, 115); both ran with "Problems: 0" in the full `npm run verify` |
| `lib/data/observations.ts drawn_from` | `lib/data/plant.ts` facts and `DEVIATION_BY_ID` | D-09 id space resolution | ✓ WIRED | `check-observations.mjs` resolves all 12 against live records, exits 0 |
| `scripts/check-observations.mjs` | `lib/data/observations.ts` | regex extraction of citation comment + dynamic import | ✓ WIRED | exits 0, "every drawn_from resolves, every citation comment matches its live record" |
| `docs/analysis/provenance-check.md` | `lib/data/observations.ts` | one row per observation, keyed by id | ✓ WIRED | 12 main-table rows match the 12 `OBSERVATIONS` entries by id; `check-fixture-shape.test.mjs` (per 02-06-SUMMARY) asserts the row count and verdict closed-set never silently regresses |
| `docs/analysis/provenance-check.md` | `lib/data/plant.ts` | cited record id + record's own sentence | ✓ WIRED | every row's "Record's own sentence" column matches the live fact/deviation field value quoted in `observations.ts`'s `// cites` comment |
| `scripts/verify.mjs STEPS` | `scripts/check-fixture-hash.mjs` | source-side step beside check-tokens, before next-build | ✓ WIRED | confirmed at STEPS index for `check-fixture-hash` (line 75), immediately after `check-tokens` |

### Probe / Command Execution

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| TypeScript | `npx tsc --noEmit` | exit 0, no output | PASS |
| Claims audit | `node scripts/claims-audit.mjs` | "live violations: 0" | PASS |
| Observation citations | `node scripts/check-observations.mjs` | "Problems: 0" | PASS |
| Fixture hash | `node scripts/check-fixture-hash.mjs` | "Problems: 0" | PASS |
| Register isolation (source) | `node scripts/check-register-isolation.mjs` | "Problems: 0" | PASS |
| Fixture-suite tests | `node --test scripts/**/*.test.mjs` (globstar enabled) | 228 tests, 228 pass, 0 fail | PASS |
| Verify step-order test | `node --test scripts/verify.test.mjs` | 28 tests, 28 pass, includes "VERCEL unset retains all eighteen steps" | PASS |
| Full build gate | `CAPTURE_BUILD_ID=$(git rev-parse --short HEAD) npm run verify` | all 18 steps exit 0, including `check-register-isolation`, `next-build`, `check-register-isolation-bundle`, `check-fixture-hash` (via check-tokens ordering), `check-wcag` | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| REQ-FR-21a | 02-01 through 02-07 (all seven) | Every authored observation passes a human provenance check before it ships | ✓ SATISFIED | `docs/analysis/provenance-check.md` signed by Matthew Koeberg, dated 2026-09-17, all 12 rows verdict `confirmed`; `ObservationGrade` excludes `EXTRACTED`; `check-observations.mjs` enforces `drawn_from` resolution and comment fidelity on every `verify` run |

No orphaned requirements found — REQUIREMENTS.md maps only REQ-FR-21a to Phase 2, and it is claimed by all seven plans' frontmatter.

### Anti-Patterns Found

None. `grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` over `lib/data/*.ts`, the phase's check scripts, and `docs/analysis/provenance-check.md` returned no matches. No TypeScript `enum` construct found under `lib/data`. `server-only` is pinned as an exact dependency (`"server-only": "0.0.1"`, no caret).

### Human Verification Required

None. Success criterion 3 (the human provenance check) is satisfied by inspection of the signed `docs/analysis/provenance-check.md` file itself, which is the deliberate, by-design human gate (AD-15) — not a gap requiring further human action. The file already carries a named reviewer, a date, and a verdict on all twelve main-table rows plus the two referral rows correctly marked not subject.

### Gaps Summary

No gaps found. All four roadmap success criteria are independently verified against the live codebase (not merely SUMMARY.md claims): `tsc` is clean, every observation's `drawn_from`/grade is well-formed and unconstructible for the excluded meaning, the human provenance sign-off exists with reviewer/date/verdict on every row, and the claims audit / fixture version / register isolation are all wired and green. The full 18-step `npm run verify` (including `next build` under Turbopack) exits 0, and the fixture-suite's 228 tests plus verify's 28-test step-order suite all pass.

---

*Verified: 2026-09-17*
*Verifier: Claude (gsd-verifier)*
