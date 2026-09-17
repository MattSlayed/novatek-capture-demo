---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03-04-PLAN.md
last_updated: "2026-09-17T19:40:03.837Z"
last_activity: 2026-09-17
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 32
  completed_plans: 20
  percent: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-04)

**Core value:** The preview is real where it claims to be real — every enforced claim is enforced server-side and survives a hostile reviewer; every authored claim is labelled at the point it is met.
**Current focus:** Phase 03 — server-seam

## Current Position

Phase: 03 (server-seam) — EXECUTING
Plan: 5 of 16
Status: Ready to execute
Last activity: 2026-09-17

Progress: [██████░░░░] 59%

## Performance Metrics

**Velocity:**

- Total plans completed: 16
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 9 | - | - |
| 2 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 1 P1 | 14min | 3 tasks | 9 files |
| Phase 01 P02 | 10min | 3 tasks | 7 files |
| Phase 01 P03 | 19min | 3 tasks | 8 files |
| Phase 01 P04 | 23min | 3 tasks | 5 files |
| Phase 01 P05 | 18min | 3 tasks | 6 files |
| Phase 01 P06 | 19min | 2 tasks | 5 files |
| Phase 1 P7 | 22 | 3 tasks | 5 files |
| Phase 01 P08 | 25min | 3 tasks | 4 files |
| Phase 01-scaffold-conventions P09 | multi-session | 3 tasks | 5 files |
| Phase 02 P01 | 15min | 2 tasks | 1 files |
| Phase 02 P02 | 35min | 2 tasks | 2 files |
| Phase 02 P03 | 25min | 2 tasks | 3 files |
| Phase 02 P04 | 20min | 3 tasks | 7 files |
| Phase 02-fixtures-types P05 | 15min | 2 tasks | 3 files |
| Phase 02-fixtures-types P06 | 15min | 2 tasks | 3 files |
| Phase 02 P07 | 20min | 2 tasks | 6 files |
| Phase 03 P01 | 28min | 3 tasks | 12 files |
| Phase 03 P02 | 38min | 3 tasks | 5 files |
| Phase 03-server-seam P03 | 26min | 3 tasks | 6 files |
| Phase 03-server-seam P04 | 25min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table (31 locked entries from the architecture spine: D-0, D-INH, AD-1–AD-23, D-DEP, D-CONV, D-STACK, D-DEPLOY, D-ENT, D-MAP). Not re-litigated in any phase.
Recent decisions affecting current work:

- [Ingest]: First deployment is production — Phase 1 ships `lib/copy/governed.ts` and the ribbon before any other surface
- [Ingest]: One build gate (`npm run verify`) that fails rather than degrades; grows from P1's five checks to AD-15's full list
- [Ingest]: Every bounded numeric value is code in `lib/limits`, tuned in the phase that first needs it; never restated in planning documents
- [Ingest]: 130 px record-binding controls (DESIGN.md governs; the PRD's 124 px is retired)
- [Ingest]: Nine phases 1:1 with the seed's build order; P9 cross-cutting, last only because newest
- [Phase 1]: Changed package.json's test script to node --test scripts/**/*.test.mjs (Rule 3 fix) — A bare directory argument to node --test fails with MODULE_NOT_FOUND on this Node 24.19.0/Windows install
- [Phase 01]: check-structure.mjs adds an additive --build-output <path> mode for the D-11 static-marker assertion, run a second time after next build; never replaces the source assertions
- [Phase 01]: The T-1-02/D-03 next-build test spawns node:child_process directly instead of lib/fixtures.mjs's runCommand, since runCommand's env option merges onto process.env and cannot express true variable deletion
- [Phase 01]: Added .gitattributes marking app/styles/tokens.inherited.css -text — core.autocrlf=true would otherwise silently corrupt the pinned byte-identity on a future checkout
- [Phase 01]: Reworded self-tripping comments (#000000, prefers-color-scheme) in tokens.capture.css/globals.css that were caught by check-tokens.mjs's own naive substring guard
- [Phase 01]: Updated 01-02's placeholder check-structure.test.mjs test to assert exit 0 now that app/globals.css exists, as 01-02's SUMMARY anticipated
- [Phase 01]: Rule 1's funding alternation extends the inherited entry's own pattern in place rather than becoming a second array entry
- [Phase 01]: Found a third D-18 addition (staffing/headcount framing) already present verbatim in the inherited claims register, not flagged by 01-PATTERNS.md; left the inherited entry unchanged with a documenting comment rather than duplicated
- [Phase 01]: check-governed.mjs's closed-set assertion is unconditional, so its fixture tests declare the full 8-key GOVERNED shape rather than a partial stand-in
- [Phase 01]: Fonts load into --font-syne/--font-dm-sans/--font-jetbrains (the sibling's variable names), resolving the alias chain into --font-display/--font-body/--font-mono already declared in tokens.inherited.css
- [Phase 01]: The ribbon link's ::after hit-area is positioned against the text column, never the link or the section, so the section's own position: static contract stays intact
- [Phase 01]: check-contrast.mjs follows a single level of var(--other) indirection and alpha-composites an rgba() ink over its pair's opaque ground before computing luminance, matching the exemption register's --viewer-border measurement exactly
- [Phase 01]: A below-floor contrast pair passes only when a decorative-exemptions.json entry matches on ink AND ground AND its measured_ratio agrees with the computed ratio to two decimal places (string comparison, not float equality)
- [Phase 01]: check-wcag.mjs derives CAPTURE_BUILD_ID from git rev-parse --short HEAD only in the spawned child's environment, never the parent shell, and only when none of the three env vars next.config.ts checks are already set
- [Phase 01]: app/layout.tsx gained a document title (Rule 2 fix) after the first real check-wcag.mjs run failed axe's document-title rule (WCAG 2.4.2) on both surfaces, reusing the already-locked shell heading name
- [Phase 01]: The fixture-suite step in verify.mjs uses the unshelled glob scripts/**/*.test.mjs, not the plan's literal node --test scripts/ directory form, which throws MODULE_NOT_FOUND on this Node/Windows install (same class of fix as 01-01)
- [Phase 01]: next typegen shares the same resolved CAPTURE_BUILD_ID env as next build in verify.mjs, since typegen also loads next.config.ts under a production-like NODE_ENV and trips D-03's gate otherwise
- [Phase 01]: check-structure.mjs's --build-output D-11 static-marker assertion now accepts the Partial Prerender glyph (◐) alongside the fully-static glyph (○), matching the shell's actual, already-implemented shape from plan 01-05
- [Phase 01]: check-deployment.mjs is not added to verify.mjs's STEPS — it needs a live deployment, and D-20's gate is build-time only
- [Phase 01]: README.md paraphrases rather than quotes the preview governed sentence's wording, keeping one-definition discipline even outside the claims audit's swept ROOTS
- [Phase 01]: The Vercel Deployment Check was found and registered via the dashboard's Show All Checks path, not the default configured-checks flow, since that flow expects a vercel/repository-dispatch/actions/status@v1 step this project's verify.yml does not use
- [Phase 01]: The red-job demonstration (D-22) is recorded with an honest scope note - a branch deployment is never aliased to production, so Task 2 shows the red job and unchanged production, not a held promotion on main in the strict sense
- [Phase 01]: The D-22 Install Command falsification failed (no apt-get in Vercel's build container), resolving RESEARCH.md Assumptions Log A1 against the assumption and confirming the GitHub Actions / Vercel split for browser-dependent steps is required
- [Phase 01]: scripts/lib/server.mjs now kills its spawned dev server by process group with a heartbeat-file liveness proof, not a bare pid probe, after two Rule 1 fixes (293fa89, 5335c56) surfaced by cross-environment teardown differences between GitHub Actions (reaping) and Vercel's build container (non-reaping)
- [Phase 02]: Copied only the sixteen D-18 sibling names plus their directly-attached JSDoc into lib/data/types.ts; skipped multi-declaration section banners — The sibling's organisational banners describe IPV's 3D scene/overlay and at least one mixes in an excluded name (Anchor); doc-comment fidelity was read as the attached-JSDoc convention
- [Phase 02]: Split the 02-01 plan's single-file output into two atomic commits along the Task 1/Task 2 boundary — Wrote the full lib/data/types.ts once, then temporarily truncated to the Task 1 portion for the first commit before restoring Task 2 content, so each commit's diff matches its task scope
- [Phase 02]: Left plant.ts's zone-section banner comments untouched during the 02-02 trim; the plan's deletion list did not name them and editing them would exceed whole-record deletion
- [Phase 02]: Reworded plant.ts's own header comment to avoid the literal excluded-identifier tokens, since the plan's Task 1 acceptance-criteria grep for those tokens matched the header's own prose
- [Phase 02]: check-fixture-shape.test.mjs asserts MACHINERY_BY_ID's real Array.prototype.sort() order rather than the id sequence quoted in the plan's prose, which was not standard lexicographic order
- [Phase 02]: Reworded orders.ts's own header comment to describe the referral-only asset in prose rather than its literal id — Task 1's own acceptance criterion greps orders.ts for that literal id and expects zero matches
- [Phase 02]: Each order's governing_docs is computed as the deduplicated sorted union of its own assets' governing_docs codes read from plant.ts — Verified every resulting code resolves in DOC_BY_CODE's six entries before writing the literal arrays; no code was invented
- [Phase 02]: Used a literal stable extractor_hash string per order's provenance rather than calling plant.ts's prov() — prov() is module-private to plant.ts and the plan explicitly forbids calling it from orders.ts
- [Phase 02]: tsconfig.json: added allowImportingTsExtensions so register.ts's runtime import of plant.ts's MACHINERY resolves under Node's native type-stripping loader — This project's prior lib/data internal imports were all import type (erased before resolution); register.ts is the first genuine value import between two .ts fixture modules, which requires the literal .ts extension at runtime and this compiler flag to satisfy tsc
- [Phase 02-05]: obs-ap003-disc cites f-ap003-vib directly (not ncr-0118) — flagged for 02-06 reviewer
- [Phase 02-05]: aa601 gland_weep vs leak_evidence, ac001 leak_evidence, bb001 label_illegible — kind judgment calls flagged for 02-06 reviewer
- [Phase 02-05]: gs001 label_illegible and an001 fixing_missing cite the closest-available fact rather than one directly about the condition — dispute candidates flagged for 02-06
- [Phase 02-06]: All twelve provenance-check rows verdict confirmed as drafted (Matthew Koeberg: 'all are quite accurate to the citations') — No reword, re-cite or drop; lib/data/observations.ts and check-observations.mjs left unchanged
- [Phase 02-06]: Appended a three-test structural completeness guard to check-fixture-shape.test.mjs, never a substitute for the human judgment it guards — T-2-24 mitigation: proves row count, verdict closed-set membership and reviewer/date presence, nothing more
- [Phase 02-07]: FIXTURE_CONTENT_SHA256 computed once via a throwaway node -e script and hardcoded as a literal in lib/data/fixtures.ts, matching check-tokens.mjs's own pinned-constant precedent
- [Phase 02-07]: check-fixture-hash.mjs imports lib/data/fixtures.ts via pathToFileURL(path.join(process.cwd(), ...)) and a dynamic import(), not a static import — so a fixture tree under test is checked against its own pin rather than the real repository's, closing off a vacuously-passing check (T-2-30)
- [Phase 03-01]: Adopted the seed's P3 starting bounded values verbatim in lib/limits, plus three additional exports the plan names outright — CONTEXT.md's Claude's-discretion bullet and the plan text both specify exact values; nothing was invented
- [Phase 03-01]: account_mismatch's copy sentence names the mechanism without naming a persona — the acting account is a runtime value; a sentence that interpolated one would be a second literal
- [Phase 03-01]: scripts/scaffold.test.mjs's stale npm-test-script literal assertion updated to the new two-glob value — Rule 1 fix: Task 2's required package.json edit made this Phase 1 test fail
- [Phase 03-02]: CLOCK_SEGMENTS_PER_ACCOUNT_MAX caps the clocks Map's size (distinct order-clocks per account), matching every other per-account cap's Map.size idiom — The 5-order fixture universe means a segment-array-length sum would be equivalent in practice but Map.size keeps every per-account cap the same shape
- [Phase 03-02]: OrderClock.elapsed_s is computed fresh from segment boundaries on every read, never stored or incrementally maintained — A running segment's duration grows continuously between writes; PROJECT.md states hours are server-derived
- [Phase 03-02]: proposals and attempts have no per-account cap in lib/limits and rely on the STORE_GLOBAL_OBJECT_MAX safety net alone — Neither is named in lib/limits; the attempts ring gets its own small, unexported, non-AD-13 bound (50) since nothing about it is client-observable
- [Phase 03-02]: respond.ts's fail() refuses ANY caller header and ok() also guards Cache-Control directly, beyond the plan's literal HEADER_TABLE-scope wording — HEADER_TABLE is scoped to X-CAP-* names only, so its literal scope field would not catch an un-catalogued X-CAP-* name on fail() or a Cache-Control override on ok() (Rule 2 hardening)
- [Phase 03-server-seam]: Session payload is JSON.stringify(session), base64url-encoded; verifySessionValue treats an empty payload or signature half as malformed before any HMAC is computed — Whole Session shape is small enough that no field needs independent slicing; degenerate values should never reach the crypto call
- [Phase 03-server-seam]: Several lib/attribution and lib/access comments were worded to avoid literal banned identifiers (rbac_tier, register, body, request, headers, searchParams) that this plan's own acceptance-criteria greps forbid — Preserves the documented intent without self-tripping the acceptance check, following the same lesson 03-01 and 03-02 already recorded for self-tripping comments
- [Phase 03-server-seam]: [Phase 03-server-seam P04]: Excluded "capture" from lib/verify/authored.test.mjs's banned-substring sweep and "sha256" from lib/proposals/derive.test.mjs's — both are unavoidable substrings inside plan-mandated literal code (Omit's "capture_id" type argument; createHmac's "sha256" algorithm name) — The plan's own acceptance-criteria grep for lib/verify/authored.ts bans "sha256|thumb|duration_ms|payload" (satisfiable) while its action text additionally lists "bytes, mime, capture" for the unit test to sweep; the plan also mandates the literal type Omit<VerificationResult, "capture_id" | "verified_at"> verbatim, which contains "capture" and cannot be reworded without breaking the Omit. Symmetrically, lib/proposals/derive.ts's plan text mandates createHmac("sha256", signingKey()) verbatim (RESEARCH.md Pattern 3) while also asking the unit test to assert the source contains no "sha256". Both are satisfied by keeping the mandated code exactly as specified and narrowing each test's banned-word list to what is actually achievable, documented inline in each test file.
- [Phase 03-server-seam]: [Phase 03-server-seam P04]: lib/proposals/derive.ts's resolveCitedRecord scopes CitedFact resolution to the observation's own asset, not a search across every asset's facts — Verified directly against lib/data/plant.ts before writing the resolver: every fact-cited observation in the twelve shipped rows cites a CitedFact that lives on its own asset's own facts array (e.g. obs-ap003-disc's f-ap003-vib is on m-ap003 itself). This matches the plan's literal instruction and is simpler than scripts/check-observations.mjs's build-time checker, which searches every machine's facts because it has no asset_id context of its own to scope by.
- [Phase 03-server-seam]: [Phase 03-server-seam P04]: Fixed 3 raw NUL control bytes that a Write tool call embedded in lib/proposals/derive.ts's first draft, in place of the intended six-character escape-sequence text for a NUL byte separator, before running any test against the file — A prior MEMORY.md note on this exact project already flags that subagent-written files can carry NUL bytes when the six-character JavaScript escape-sequence text for a NUL byte is typed directly into Write or Edit tool content: an intermediate JSON layer decodes it into a real control character instead of leaving it as literal source text. Diagnosed with a Node script that reads the file as a raw Buffer and counts 0x00 bytes (found 3, at the exact 3 places the escape sequence was intended); repaired with a second Node script that rebuilds the replacement text from String.fromCharCode(92) concatenated with the plain string "u0000", so the fix script itself never contains a literal backslash-u sequence that could be reinterpreted the same way. Re-verified zero NUL bytes and three correct literal occurrences of the escape sequence before writing or running the test file.

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Vercel Deployment Protection must be turned off for previews (dashboard-only, user's action) or a phone meets a Vercel login
- [Phase 1]: Older global `~/.claude/skills/bmad-*` set duplicates the project set by name — user's call whether to remove (touches every project on the machine)
- [Phase 2]: FR-21a human provenance check requires a named person to read each authored observation against its cited record; phase does not close without it
- [Phase 6]: Outbound size budget below the platform 4.5 MB limit is a blocker on the batch ceiling — decide before tuning
- [Phase 7]: NFR-10 gloved test needs five artisans across three trades on the approved devices — scheduling dependency
- [Production]: The field-technician extension of the inherited RBAC ceiling should be ratified by the parent programme before production
- [SECURITY] Unexplained, uncommitted working-tree modifications discovered in lib/data/types.ts and scripts/claims-audit.mjs during 03-04 execution (2026-09-17) — neither file is in plan 03-04's scope (lib/verify/, lib/proposals/ only) and neither was touched by any Write/Edit tool call this session; the initial git status at session start showed both files clean. The diff narrows and partially disables claims-audit.mjs's IoT/SCADA prohibition (adds allowQuoted: true, rewrites the pattern to carve out a "scheduled historian read" exception) and edits types.ts's CitedFact.liveRead comment to assert plant condition data flows through a "historian path" — a capability PROJECT.md's Out of Scope section explicitly excludes ("No live plant data... not a CMMS"). The diff cites "Business Plan v3.1 D23", "FINDINGS.md:93", "A2-claims.md:83" and "audit/2026-08-30-gold-standard", of which exist anywhere in this repository or .planning/. NOT staged, NOT committed, NOT reverted by the executor — left exactly as found on disk for review. Run `git diff lib/data/types.ts scripts/claims-audit.mjs` to inspect. Needs immediate human investigation before the next plan in this phase executes.
- [SECURITY follow-up] Timeline refinement on the lib/data/types.ts / scripts/claims-audit.mjs tampering blocker above: a repo-wide mtime sweep shows scripts/claims-audit.mjs was modified at 2026-09-17T19:23:31Z, roughly 60 seconds after the executor's npm run verify invocation started (19:22:31Z, right after committing c2122ef) — i.e. around or before the claims-audit STEP itself (7th of 19 in scripts/verify.mjs's STEPS array), well before the next-build/next-start steps run later in the sequence. This rules out next build or next start as the mechanism. scripts/claims-audit.mjs's own code is read-only (readdir/readFile/console.log/process.exit only, no fs write call anywhere in it), so it cannot have modified itself while running, and none of the steps that had already run by that point (next-typegen, tsc --noEmit, eslint . without --fix, check-tokens, check-fixture-hash, check-governed) write to source files as part of their documented behaviour either. This points to a process outside the documented npm run verify pipeline — worth checking for a postinstall/prepare script, a next.config.ts plugin, a file watcher left running from an earlier next dev session, or compromised node_modules content, rather than assuming the build tooling itself is implicated.
- [SECURITY follow-up 2, orchestrator, 2026-09-17T19:45Z] Root cause narrowed to a concurrent session, not the build pipeline: the sibling repo ../ipv-demo carries the identical uncommitted edits to lib/data/types.ts and scripts/claims-audit.mjs (plus HANDOVER.md), written at 19:23:15Z, 16 s before this repo's copies (19:23:31Z), and the inserted comment itself says the rule is kept identical to the ipv-demo copy. This repo has no git hooks, no core.hooksPath, no npm lifecycle scripts, and node_modules contains none of the inserted strings; the 03-04 executor transcript has no Write/Edit on either file. The cited sources (Business Plan v3.1 D23, FINDINGS.md:93, A2-claims.md:83, audit/2026-08-30-gold-standard) resolve in neither repo. Both files remain unstaged and untouched. Whether the D23 rule change is a real business decision to keep, and whether to commit or revert it in both repos, is the user's call. Phase 3 execution continued from 03-05 with executors instructed not to stage, edit or revert either file.

## Deferred Items

Items acknowledged and carried forward (see PROJECT.md Deferred decisions and Open questions):

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Architecture | Service worker: hand-rolled or `@serwist/turbopack` | Scheduled P7 | Ingest |
| Architecture | IndexedDB layer: hand-rolled or `idb` | Scheduled P6 | Ingest |
| Testing | Offline test strategy (Playwright ≥ 1.57 SW routing) | Scheduled P6/P7 | Ingest |
| Architecture | Approved-device list (NFR-11-constrained) | Scheduled P7 | Ingest |
| Open question | Outbound size budget and truncation semantics | Scheduled P6 | Ingest |
| Open question | Label-placement evidence artefact (table vs automated check) | Scheduled P8 | Ingest |
| Open question | Referral-specific queue codes gain sentences or leave the type | Scheduled P9 | Ingest |
| Open question | Eviction case reachable in the walkthrough; PRD Q3, Q4 (handover) | Scheduled P8 | Ingest |
| Scope | Transcription, asset-history read-back, supervisor view, coached checklist | v2 (out of preview) | Ingest |
| Housekeeping | TypeScript 6/7 and ESLint 10 rule-cleanup scope | Scheduled P1 (scope only) | Ingest |

## Session Continuity

Last session: 2026-09-17T19:30:34.259Z
Stopped at: Completed 03-04-PLAN.md
Resume file: None
