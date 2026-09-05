# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-04)

**Core value:** The preview is real where it claims to be real — every enforced claim is enforced server-side and survives a hostile reviewer; every authored claim is labelled at the point it is met.
**Current focus:** Phase 1 — Scaffold & conventions

## Current Position

Phase: 1 of 9 (Scaffold & conventions)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-09-04 — Project initialised from ingest (PROJECT.md, REQUIREMENTS.md, ROADMAP.md written; 105/105 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table (31 locked entries from the architecture spine: D-0, D-INH, AD-1–AD-23, D-DEP, D-CONV, D-STACK, D-DEPLOY, D-ENT, D-MAP). Not re-litigated in any phase.
Recent decisions affecting current work:

- [Ingest]: First deployment is production — Phase 1 ships `lib/copy/governed.ts` and the ribbon before any other surface
- [Ingest]: One build gate (`npm run verify`) that fails rather than degrades; grows from P1's five checks to AD-15's full list
- [Ingest]: Every bounded numeric value is code in `lib/limits`, tuned in the phase that first needs it; never restated in planning documents
- [Ingest]: 130 px record-binding controls (DESIGN.md governs; the PRD's 124 px is retired)
- [Ingest]: Nine phases 1:1 with the seed's build order; P9 cross-cutting, last only because newest

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Vercel Deployment Protection must be turned off for previews (dashboard-only, user's action) or a phone meets a Vercel login
- [Phase 1]: Older global `~/.claude/skills/bmad-*` set duplicates the project set by name — user's call whether to remove (touches every project on the machine)
- [Phase 2]: FR-21a human provenance check requires a named person to read each authored observation against its cited record; phase does not close without it
- [Phase 6]: Outbound size budget below the platform 4.5 MB limit is a blocker on the batch ceiling — decide before tuning
- [Phase 7]: NFR-10 gloved test needs five artisans across three trades on the approved devices — scheduling dependency
- [Production]: The field-technician extension of the inherited RBAC ceiling should be ratified by the parent programme before production

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

Last session: 2026-09-04
Stopped at: Roadmap created from ingest; ready for `/gsd:plan-phase 1`
Resume file: None
