# SYNTHESIS — entry point for the roadmapper

Ingest of `docs/ingest.yaml` (mode: new) · synthesized 2026-09-04
Repo root: `C:\Users\matth\OneDrive\Documents\NOVATEK LLC\04 KNOWLEDGE-BASE\Project-Scopes\Project Scope's\Business Brain\novatek-capture-demo`

## Documents synthesized: 9

| Type | Count | Documents (repo-relative) · manifest precedence |
|---|---|---|
| ADR | 1 | `docs/planning-artifacts/architecture/architecture-novatek-capture-demo-2026-09-02/ARCHITECTURE-SPINE.md` · 0 · **LOCKED** |
| SPEC | 4 | `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/DESIGN.md` · 1 · `…/EXPERIENCE.md` · 1 · `docs/specs/spec-novatek-capture-demo/SPEC.md` · 3 · `docs/planning-artifacts/epics.md` · 3 |
| PRD | 2 | `docs/planning-artifacts/prds/prd-novatek-capture-demo-2026-09-01/prd.md` · 2 · `…/addendum.md` · 3 (draft; candidates) |
| DOC | 2 | `docs/planning-artifacts/briefs/brief-novatek-capture-demo-2026-08-31/brief.md` · 4 · `docs/CAPTURE-PLAN-SEED.md` · 5 |

All nine classifications consumed (keyed on `source_path`; filename hash suffixes are placeholders). No UNKNOWN / low-confidence classifications. Cross-ref cycle detection run: one citation-only strongly connected set among prd, addendum, seed, EXPERIENCE and brief (max depth 4); recorded as a WARNING, not a blocker — see the report.

## Decisions (decisions.md) — 31 locked entries from one ADR

- **23 architecture decisions AD-1 – AD-23**, each locked (paradigm: server-authoritative single-writer with a queue-first client projection).
- Plus locked: D-0 paradigm and layer table · D-INH inherited invariants (8) · D-DEP dependency direction · D-CONV consistency conventions (incl. 130 px target geometry, closed sets, no feature flag may relax an invariant) · D-STACK (Next 16.3.4, React 19.2.8, TS 5.x, ESLint 10.9.1, Node 24, uqr 0.1.3, Playwright 1.62.1, Turbopack, Vercel `cpt1`, 4.5 MB body limit) · D-DEPLOY (three environments, one build command; first deploy is production) · D-ENT core entities · D-MAP capability → architecture map by phase P1–P9.
- **Not locked, carried forward:** 8 deferred decisions (service worker choice → P7; IndexedDB layer; offline test strategy → P6/P7; bounded-quantity values → per phase; TS/ESLint cleanup; region re-decision trigger; approved-device list → P7; file layout), 3 open questions (outbound size budget below 4.5 MB → **decide in P6 before the batch ceiling**; eviction-case demo script; handover documentation matters), 5 conflicts the ADR itself surfaced.

## Requirements (requirements.md) — from prd.md, with addendum candidates dispositioned

- **79 functional requirements:** REQ-FR-1 … REQ-FR-66 (including REQ-FR-21a, REQ-FR-48a) and REQ-FR-R1 … REQ-FR-R11, each with verification method, phase and epic.
- **13 cross-cutting NFRs:** REQ-NFR-1 … REQ-NFR-12 plus REQ-NFR-4a; **5 feature-specific NFRs:** REQ-NFR-F1 … F5.
- **8 success metrics:** REQ-SM-1 … 5, REQ-SM-C1 … C3 (counter-metrics).
- **50 addendum candidates** (REQ-ADD-*: 33 NFR candidates in §1.1/§2.1, 17 audit-trail patterns in §3.1), each with an adopted / adopted-in-refined-form / value-owned-by-AD-13 / not-applicable disposition.
- Also carried: the nine build phases with FR bindings and the five non-negotiable ordering constraints (§D), the enforced-invariant register (§E), non-goals (§F), open questions and assumptions (§G).
- **Epic → phase map:** E1 = P1, P3, P4 · E2 = P2, P5 · E3 = P6 · E4 = P9 · E5 = P7 · E6 = P8 (FR-64 grouped in E6, delivered in P7).

## Constraints (constraints.md) — 64 entries

- By type: **nfr** 12 · **schema** 22 · **protocol** 28 · **api-contract** 2.
- By source: DESIGN.md C-1–C-26 (tokens, four grounds, ink permissions, exemption and dead-token registers, typography, spacing, the 130 px arithmetic, the measured vertical budget, safe area, reach bands, elevation, radius, ribbon, sticky bar, record control and its states, secondary control, proposal card, viewfinder, queue row/conflict card, focus ring, marks, wordmark, non-negotiables) · EXPERIENCE.md C-27–C-45 (foundation, fifteen surfaces, navigation, the eight sentences verbatim with placements, voice and claims audit, payload anatomy, seven state marks, proposal and queue closed sets, **every conflict and reject code with its sentence and actions**, tri-source connectivity and situation sentences, referral states, empty states, interaction primitives, accessibility floor, platform differences, referral inversion, settled decisions, anti-patterns) · SPEC.md C-46–C-60 (precedence, CAP-1–CAP-11 with success statements, the fourteen constraints, non-goals, open questions) · epics.md C-61–C-63 (six epics, 32 stories, inventory index) · C-64 accepted-field enumeration.

## Context (context.md) — 17 topics

- Brief (Topics 1–3): the problem with its regulatory citations, the solution and differentiators, readers, success criteria, scope, the ask, vision.
- Seed (Topics 4–17): the locked user decisions (verbatim); the real-vs-labelled table (verbatim); design decisions with [SUPERSEDED] marks; **data model, fixtures with provenance, API contracts, offline-and-sync semantics table, honesty-label table — verbatim, as the seed remains authoritative for these**; camera/voice/storage mechanism notes; service-worker design; **the nine-phase build order P1–P9 (verbatim) with the epic mapping and review gates**; the curl suite, phone walkthrough and harness; the seventeen risks; frameworks, repo and Vercel setup state.

## Conflicts

**0 blockers · 1 warning · 17 auto-resolved (INFO)** — full report: `.planning/INGEST-CONFLICTS.md`

- The four auto-resolutions the manifest expected all landed as INFO: version pins (spine > seed), the Safari `persist()` claim (AD-12 > seed), 124 → 130 px (DESIGN > PRD; already applied in the current PRD text), service worker (spine defers to P7 > seed's hand-rolled premise).
- Further INFO: build-id fallback (AD-15 > seed); every bounded numeric value → AD-13's `lib/limits`; referral-specific queue codes (EXPERIENCE's closed sets govern now; **P9 closes with UX**); label-placement evidence (EXPERIENCE's automated check leads; **decide and record in P8**); two prd-vs-addendum acceptance divergences (confirmation channels; reflow cap) resolved to prd.md by explicit manifest precedence with both variants recorded; addendum "Finding" vocabulary; epics' grouping vs PRD phase order (PRD governs: FR-64 in P7, P8 before P9); gloved test lands in P7; brief's "binds to nothing" wording; the recorded field-technician extension; addendum candidates not adopted; open questions carried into their phases.
- The single WARNING is the citation cycle among five documents. Synthesis did not traverse references and resolved everything by the manifest's acyclic precedence; the entry explains the reasoning and the remediation if the literal cycle rule is preferred.

## What the roadmapper must honour

1. Nine phases, 1:1 with the seed's build order / PRD §6.1 (requirements.md §D; context.md Topic 14); the five ordering constraints are non-negotiable; P9 is cross-cutting.
2. Every AD's "Binds" list (decisions.md) and D-MAP tell which decisions govern which phase; no phase ships a claim the honesty module does not yet carry.
3. Scheduled closures: P4 — `already_open`/`not_open` sentences; P6 — outbound size budget before the batch ceiling, degradation order; P7 — service-worker choice with a stated reason, approved-device list, gloved test (NFR-10 scheduling dependency); P8 — label-placement evidence artefact, handover; P9 — referral-specific queue codes with UX; P2 — the human provenance check (FR-21a) that closes the phase.
4. Bounded values are code (`lib/limits`), never restated in planning documents.

## Files

- `.planning/intel/decisions.md`
- `.planning/intel/requirements.md`
- `.planning/intel/constraints.md`
- `.planning/intel/context.md`
- `.planning/INGEST-CONFLICTS.md`
- `.planning/intel/classifications/*.json` (inputs, unchanged)
