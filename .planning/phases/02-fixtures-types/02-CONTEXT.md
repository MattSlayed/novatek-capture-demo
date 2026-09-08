# Phase 2: Fixtures & types - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 2` — four gray areas discussed with the user (provenance check mechanics, kinds and wording, citation granularity, fixture version). Everything locked upstream is cited; every reconciliation of an upstream gap is marked *[reconciled here]*.

<domain>
## Phase Boundary

The synthetic plant subset, the three artisans, the five work orders and the twelve authored observations exist as typed fixtures under `lib/data/`, every closed set the later phases need is defined once in `lib/data/types.ts`, every `drawn_from` resolves to a real fixture record, and a named person has read each authored observation against the record it cites and signed the result. Phase 2 delivers:

- `lib/data/types.ts` — the sibling's types copied verbatim, the seed's new types, and every closed set (observation kinds, observation grade, proposal states, conflict and reject codes, referral resolution states, state marks, queue item kinds with their emitted schema versions, the governed-sentence keys) defined once. The grade meaning *the record states this* is unconstructible on an authored observation.
- `lib/data/plant.ts` — the ipv-demo plant subset copied verbatim at `8fd097a`: the eleven assets on the five orders plus `m-aa605`, with the zones, people, docs and deviations they reference.
- `lib/data/artisans.ts` — S. Mabaso, K. Naidoo, J. van Wyk as accounts with their assigned order ids and a display-only `rbac_tier`.
- `lib/data/orders.ts` — WO-2026-0142, 0151, 0137, 0129, 0133.
- `lib/data/observations.ts` — the seed's twelve authored observations, each with a resolvable `drawn_from`, a grade from {INFERRED, AMBIGUOUS}, a relation from {evidence, context}, and a structured comment quoting the cited record's own sentence.
- `lib/data/fixtures.ts` — `FIXTURE_VERSION`, one named export, with its pinned content hash.
- `lib/data/register.ts` — the tag-to-asset resolution table the referral will resolve against, typed as server-only; the register-isolation rule wired into `verify`.
- Tests in the existing fixture suite: every `drawn_from` resolves; every observation carries its comment and the quoted sentence equals the record; the isolation rule and the version-hash rule each fail on a violation.
- `docs/analysis/provenance-check.md` — the signed human provenance check (FR-21a). **The phase does not close without it.**
- The claims audit clean over the copied surfaces.

Requirements delivered: REQ-FR-21a. Prerequisites laid for FR-20 (P5), FR-59 (P5/P8), FR-57 (P3) and FR-R2–R4 (P9).

Not in this phase: `lib/limits` and every bounded value (P3); the session, the responder, the store, the reconcile module and every route (P3); the module that declares `(assetId, fixtureSet)` and composes `ObservationProvenance` (P3/P5); `lib/access/register.ts`, `POST /api/referrals`, the referral sync kind and its conflict sentences (P9); any UI.

The repository currently holds the Phase 1 shell: `lib/copy/governed.ts`, the ribbon and Limits surface, the token layers, and the fifteen-step `scripts/verify.mjs` gate. `lib/data/` does not exist yet and nothing imports it.

</domain>

<decisions>
## Implementation Decisions

### The human provenance check (FR-21a; AD-15; Story 2.1)
- **D-01:** The named reviewer is the developer, Matthew; the sign-off carries his name as he gives it at the checkpoint and the date. The SHEQ manager is not involved in this phase; no counter-signature line is added.
- **D-02:** The check runs as an in-session human-verify checkpoint, the same pattern as plan 01-09's checkpoints. The executor writes `observations.ts` and a review sheet — the draft of `docs/analysis/provenance-check.md` with its verdict column empty — then the plan stops. The reviewer confirms or disputes each row in the session. The executor records the verdicts, writes the signed file with name and date, and only then does the phase's final plan close. Never marked complete by the executor on its own.
- **D-03:** `docs/analysis/provenance-check.md` is a per-row table, repeatable by a second person without reading the code: observation id · asset id and tag · kind · wording as it will render · cited record id · the record's own sentence (the named field, quoted) · grade · relation confirmed (evidence or context) · verdict (confirmed / reworded / re-cited / dropped) · reviewer · date. A separate short table lists the two referral rows (`m-aa605` resolved, `20HAD10AA610` unresolved) marked *not subject — a referral takes no `drawn_from`*, so a later reader sees they were considered (Story 2.1, last criterion).
- **D-04:** On a disputed row the reviewer chooses reword, re-cite or drop, and supplies the new wording or record. The executor never rewords or re-cites on its own initiative. A reworded or re-cited row is read again against its record before the sign-off; the verdict column records the choice. The set may shrink below twelve only by the reviewer's decision.

### Kinds and wording (seed §Data model; EXPERIENCE.md §Voice and Tone)
- **D-05:** *[reconciled here]* The closed kind set is the seed's eight plus the kinds the three misfit rows need: "isolation tag present" (ap003) and "lock and tag present" (gs001) share one kind naming an isolation that is in place; "DP gauge face fogged" (as001) takes a kind naming an obscured gauge or reading. Names are at Claude's discretion but follow the seed's shape (snake_case, a noun phrase naming what is visible, e.g. `isolation_present`, `gauge_obscured`). Still one closed set, defined once in `types.ts`. The SUMMARY records this as a deviation from Story 2.1's eight-member list, with the reason: dropping the rows would leave the electrician door with no evidence-grade observation and the millwright without the isolation inference NCR-2026-0118 supports.
- **D-06:** The executor drafts the twelve `wording` sentences from the seed's short phrases, under the eight voice rules and the PRD §3 vocabulary verbatim; the reviewer confirms each at the checkpoint (D-02). No wording is written by anyone else first.
- **D-07:** A wording is one plain sentence stating what is visible and where, and nothing else: no cause, no severity, no figure, no record name, no verb that implies a model looked. Example shape: "Discolouration is visible on the drive-end bearing housing." The inference lives in the relation field and the citation, not in the words. Wordings pass the claims audit like any other string under `lib/`.
- **D-08:** Exactly the seed's twelve observations (ap003 three, as001 one, gs001 two, an001 one, aa601 three, ac001 one, bb001 one; corrected from a miscounted "thirteen" on 2026-09-08). `m-aa101`, `m-aa102` and `m-aa602` carry none; a verify on those assets will return an authored match and zero proposals, which is an honest state P5 renders. No observation is invented to fill an asset.

### Citation granularity (FR-20, FR-21a; roadmap success criterion 2)
- **D-09:** A `drawn_from` may name a CitedFact id from a copied machinery record's `facts` (the `f-…` ids, e.g. `f-gs001-iso`, `f-as001-dp`) or a Deviation's `id` field (the `ncr-0118` form, not the `NCR-2026-0118` `ncr_number`). Nothing else is citable: not a machinery id, not a document code, not a zone. The resolver test's id space is exactly that union over the copied subset. The five rows the seed cites vaguely ("the as001 DP fact", "gs001 record", "an001 record", "aa601 record", "bb001 inspection fact") are resolved to a specific fact by the executor at authoring and confirmed by the reviewer at the checkpoint; where a machinery record offers no fact that situates the observation, the row is raised at the checkpoint as a dispute rather than cited loosely.
- **D-10:** The comment beside an observation quotes the specific field the inference draws on, named. For a fact: `label: value` with its unit where one exists. For a deviation: `id.field: "…"`, e.g. `ncr-0118.immediate_action: "Isolation applied and tagged"`. Two rows citing the same deviation may quote different fields, as the seed's two ap003 rows do.
- **D-11:** The comment has one fixed, parseable form (exact syntax at Claude's discretion, e.g. `// cites f-gs001-iso: "Isolations applied: 1 — transfer set C"`). A test in the fixture suite parses `observations.ts`, asserts every observation has one, resolves the id per D-09, and compares the quoted text with the live record's own value; a comment that drifts from its record fails `verify`. The test ships with a fixture proving it fails on a missing comment, an unresolvable id and a drifted quote (D-23's pattern).
- **D-12:** *[reconciled here]* `AuthoredObservation.grade` is its own two-member type over {INFERRED, AMBIGUOUS}. The sibling's `ExtractionGrade` keeps all three members when copied verbatim, because the copied plant facts legitimately carry `EXTRACTED` provenance from the ERP and NCR systems of record; only the authored observation's grade excludes it, so that the grade meaning *the record states this* is unconstructible where the roadmap requires it and the copied records stay byte-faithful.

### Fixture version (AD-6; Story 2.1; roadmap success criterion 4)
- **D-13:** `lib/data/fixtures.ts` exports `FIXTURE_VERSION` as a dated string in the sibling's shape, `capture-fixtures/YYYY.MM.N` (the sibling's `SCENE_VERSION = "ref-plant/2026.07.3"` is the model and stays in the copied `plant.ts` as the source's own version). It is never derived from, equal to, or formatted like the build id.
- **D-14:** A content hash (SHA-256 over `plant.ts`, `artisans.ts`, `orders.ts` and `observations.ts`, in a fixed order) is pinned beside `FIXTURE_VERSION`. A check in `verify` (a new script or an extension of `check-structure.mjs`, at Claude's discretion) recomputes it and fails when it differs from the pin, so fixture content cannot change without a re-pin and a bump in the same commit. `types.ts`, `register.ts` and `fixtures.ts` itself are outside the hash: shape is not content. The mechanism is `scripts/check-tokens.mjs`'s pinned-hash pattern; it ships with a fixture test proving it fails.
- **D-15:** *[reconciled here]* Story 2.1 places the export in `lib/data/fixtures.ts`; AD-6 says "a single named export from AD-13's module", which is `lib/limits`, deferred to P3 by Phase 1's context. The version lives in `lib/data/fixtures.ts`: it is not a bounded quantity, and it describes the authored plane it sits in. P3 may re-export it from `lib/limits` if a client reader needs a single import. Recorded here so no later phase moves it without a reason.

### The register and its isolation rule (AD-7; AD-15; roadmap success criterion 4)
- **D-16:** `lib/data/register.ts` holds the tag-to-asset resolution table over the whole copied subset, `m-aa605` included, and nothing a client could use: no zone, order, assignment or history is exposed through it. It is typed as server-only — Next's `server-only` import is the expected mechanism if it holds under 16.3.4 (research confirms) — and it is not imported by anything in this phase; `lib/access/register.ts` and the route are P9.
- **D-17:** The register-isolation rule joins `verify` in this phase: no module under `components/` or `lib/client/` may import `lib/data/register` or `lib/access/register`, directly or transitively, and no register content may appear in a client bundle. The mechanism (an import-graph walk over source, a sentinel string asserted absent from `.next/static`, or both) is at Claude's discretion and must not warn or skip; it ships with a fixture test proving it fails on a violating import.

### The types module (D-CONV; AD-16; AD-18; AD-19)
- **D-18:** `types.ts` copies verbatim from `../ipv-demo/lib/data/types.ts` at `8fd097a`: `RbacTier` and its `RBAC_ORDER`/`RBAC_LABEL`, `ExtractionGrade`, `Provenance`, `SystemOfRecord`, `CitedFact`, `EvidenceChain`, `Zone`, `AssetClass` and `ASSET_CLASS_LABEL`, `Machinery`, `SetpointBlock`, `Deviation`, `RootCause5M`, `GoverningDoc`. The seed's new types follow its Data model section verbatim in shape: `Artisan`, `Session`, `WorkOrder`, `OrderAsset`, `AuthoredObservation`, `ObservationProvenance`, `Capture`, `VerificationResult`, `Proposal`, `Decision`, `Referral`, `Flag`, `OrderClock`, `SyncItem` (with AD-18's `schema_version`), `ConflictCode`, `RejectCode`, `SyncItemResult`, `WalkPayload`; AD-3, AD-5 and AD-6 narrow the fields the seed left broad (`arrived_via` server-derived; decision identity `capture_client_id` + `observation_id`; the bound decision context and `fixture_version_mismatch`).
- **D-19:** The closed sets are defined once here and imported everywhere later: observation kinds (D-05), observation grade (D-12), proposal states, the conflict and reject codes as the seed lists them including `referral_evidence_missing` and `unknown_referral` (P9 decides whether they gain sentences or leave the type; AD-9's `already_open`/`not_open` join in P4), referral resolution states, the state marks named in EXPERIENCE.md §State Patterns, and queue item kinds with their emitted schema versions. The governed-sentence set is not restated: `types.ts` imports `GovernedKey` from `lib/copy/governed.ts` (D-07, D-09 of Phase 1 forbid a second definition and `check-governed` would fail one).
- **D-20:** `Artisan.rbac_tier` is a display-only attribute: K. Naidoo carries `site_supervisor`, the other two `field_technician`; no function under `lib/data` reads it and no later access decision may (AD-2, FR-57). `lib/data` imports nothing from `lib/store`, `lib/reconcile` or `lib/access` (D-DEP).

### Claude's Discretion
- The shape of `drawn_from` on `AuthoredObservation`: the bare record id (recommended — one string the resolver test checks) or the full `ObservationProvenance` tuple with the id inside `source_uri`; either way AD-8's null confidence and authored extractor hold, and the tuple is composed from the cited record's own provenance by the P3/P5 module if not stored.
- The exact names of the added kinds (D-05) and the exact comment syntax (D-11).
- Whether the version-hash check and the isolation rule are new scripts or extensions of `check-structure.mjs`; the hash's file order; the sentinel, if one is used.
- Persona ids, employee numbers and order id shapes, subject to D-CONV's id conventions and the seed's `WO-2026-NNNN` numbers.
- How much of the sibling's `plant.ts` surrounding structure (zone records, `PEOPLE`, `DOCS`, the `DEVIATIONS` referenced by the subset, the `*_BY_ID` maps) is carried, provided every record an observation or an order references is present verbatim and `ANCHORS`, `CAPTURE_SESSIONS` and the 3D placement table are not.
- Whether the copied `plant.ts` is trimmed by deletion of whole records only (recommended, so a record that is present is byte-faithful) or re-typed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The locked architecture (precedence 0)
- `docs/planning-artifacts/architecture/architecture-novatek-capture-demo-2026-09-02/ARCHITECTURE-SPINE.md` §AD-6 (decision binds a snapshot; the fixture version), §AD-7 (register server-only), §AD-8 (authored results; grade closed set; named-package ban), §AD-13 (bounded quantities — why the version is not one), §AD-15 (the gate; FR-21a as the one human gate), §AD-19 (no path creates a finding), §Dependency direction, §Consistency Conventions (closed sets defined once; id shapes), §Capability → Architecture Map (P2 row)
- `.planning/intel/decisions.md` — AD-2, AD-3, AD-5, AD-6, AD-7, AD-8, AD-13, AD-15, AD-16, AD-18, AD-19, D-DEP, D-CONV, D-ENT, D-MAP (P2 row: `lib/data/` — AD-6, AD-7, AD-8, AD-15, AD-19)

### Requirements and the phase
- `.planning/ROADMAP.md` §Phase 2 — goal, four success criteria, scheduled closures
- `.planning/REQUIREMENTS.md` — REQ-FR-21a (delivered here), REQ-FR-20, REQ-FR-57, REQ-FR-59, REQ-FR-61, REQ-FR-65, and the out-of-scope row "Supervisor role … RBAC tier display-only"
- `docs/planning-artifacts/epics.md` lines 864–897 — Epic 2 preamble and Story 2.1 "Author the observations and prove their provenance" (acceptance criteria; `docs/analysis/provenance-check.md`; `lib/data/fixtures.ts`)
- `docs/planning-artifacts/prds/prd-novatek-capture-demo-2026-09-01/prd.md` §3 (vocabulary, verbatim in code and copy), §6.3 (no-finding evidence)

### The seed (precedence 5; authoritative for shapes and the fixture table)
- `docs/CAPTURE-PLAN-SEED.md` §Data model (`lib/data/types.ts`) lines 198–216, §Fixtures and §Referral fixture lines 218–234 (the corrected table; `m-aa605`; the comments the file must carry), §Repo file tree `lib/data/*` rows, §Build order row 2, §What is real vs. labelled
- `.planning/intel/context.md` Topic 7 (data model with the AD narrowings) and Topic 8 (fixtures and provenance) — the same, extracted

### Design and experience contract (precedence 1)
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/EXPERIENCE.md` §Voice and Tone (the eight rules the wordings obey), §Component Patterns row *Grade mark* (line 140: `EXTRACTED` can never render), §State Patterns — *Proposal states — the closed set*, *Queue states*, *Every conflict and reject code*, *The unresolved-referral state* (the closed sets `types.ts` defines), §UJ-5 (the referral fixture's story)
- `docs/planning-artifacts/ux-designs/ux-novatek-capture-demo-2026-09-01/DESIGN.md` §The small marks — the two grade marks
- `.planning/intel/constraints.md` C-24 (grade marks), C-43 (the referral inversion)

### The sibling repository (copy verbatim at `8fd097a`, 2026-09-01)
- `../ipv-demo/lib/data/types.ts` — the types D-18 copies
- `../ipv-demo/lib/data/plant.ts` — `ZONES`, `PEOPLE`, `DOCS`, `DEVIATIONS` (`ncr-0118`, `ncr-0104`, `ncr-0091`), `MACHINERY` (`m-ap003`, `m-aa101`, `m-aa102`, `m-as001`, `m-gs001`, `m-an001`, `m-aa601`, `m-aa602`, `m-bb001`, `m-ac001`, `m-aa605`) and their `f-…` facts, `SCENE_VERSION`
- `../ipv-demo/HANDOVER.md` §3 — the claims register the copied surfaces must pass

### Phase 1 artefacts this phase builds on
- `.planning/phases/01-scaffold-conventions/01-CONTEXT.md` — D-07 and D-09 (one definition of the governed set; `check-governed`), D-17–D-19 (claims audit over `lib/`; voice rules), D-20 (the gate's shape), D-23 (every check ships a failing fixture)
- `scripts/verify.mjs` — the `STEPS` array a new check joins; the `fixture-suite` step runs `node --test scripts/**/*.test.mjs`, so a new `*.test.mjs` is picked up without wiring
- `scripts/check-tokens.mjs` — the pinned-SHA-256 pattern D-14 reuses
- `scripts/lib/fixtures.mjs` — the fixture-test helper
- `lib/copy/governed.ts` — `GovernedKey`, imported not restated
- `docs/analysis/` — where `provenance-check.md` lands beside `vercel-regions.md`, `deployment-gate.md`, `scheduled-work.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/check-tokens.mjs`: asserts a file's SHA-256 against a pinned hash with the source, commit and date in its header — the exact mechanism for the fixture-version pin (D-14).
- `scripts/lib/fixtures.mjs`: helpers the Phase 1 check tests use to run a script against a temporary tree and assert its exit code; the resolver, hash and isolation tests follow the same shape.
- `scripts/check-structure.mjs`: source-inspection assertions with a fixture test; the isolation rule can be a sibling of these assertions or its own script.
- `lib/copy/governed.ts`: `GovernedKey` is the closed set of governed sentences; `types.ts` imports it.
- `../ipv-demo/lib/data/types.ts` and `plant.ts` at `8fd097a`: the source of every copied type and record; the sibling is not present on Vercel, so what is copied must be complete in this repository.

### Established Patterns
- Every check fails rather than warns, is not skippable, and ships with a fixture proving it exits non-zero (Phase 1 D-20, D-23). The new checks (version hash, register isolation, provenance-comment resolver) inherit this.
- The claims audit sweeps `lib/` as text, comments included: the quoted record sentences and the twelve wordings are swept by the inherited register plus the seed's additions. The copied `plant.ts` subset should be run through the audit early in the phase, since it was written against the sibling's register, not this project's extended one.
- Planning and phase files under `.planning/` are CRLF UTF-8; edit with Node or the Edit tool, never `perl -pi` (memory: edit-planning-files-with-node).
- Commits carry the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer; `gsd-sdk query commit` strips multi-line trailers, so executors verify and amend.

### Integration Points
- `lib/data/` is new; nothing imports it in this phase. P3's `lib/access/scope.ts`, store and reconcile read `artisans.ts`, `orders.ts`, `plant.ts`; P3/P5's authored module reads `observations.ts` and `fixtures.ts`; P9's `lib/access/register.ts` reads `register.ts`.
- `scripts/verify.mjs` `STEPS`: the version-hash check and the isolation rule are new source-side entries before `next-build`; the resolver test rides the existing `fixture-suite` step.
- The human checkpoint is a plan task of type `checkpoint:human-verify` in the plan that writes `observations.ts`; the phase's completion depends on it (roadmap success criterion 3).

</code_context>

<specifics>
## Specific Ideas

- The seed's table is already the second draft: "the first-draft table failed the second half for three rows" (aa601 moisture, ac001 residue, and the aa601 seal citation). The corrected grades and relations in Topic 8 are the starting point; the reviewer may still overturn any of them.
- The referral row's comment carries the register's own sentence beside the resolution: `f-aa605-cert` — "Certification state: Certified" — and the note that the register says certified and the artisan says the seal is gone, and nothing in this system resolves that disagreement. The unresolved row's comment states that no register entry exists for `20HAD10AA610` and that the plate photograph is the evidence that survives the typo.
- `m-aa605` is on no work order and must still be in the copied subset; a referral fixture whose target is absent would exercise only the unresolved path.
- The sibling's `SCENE_VERSION = "ref-plant/2026.07.3"` is the model for `FIXTURE_VERSION`'s shape and remains the copied plant's own `source_version`.
- Wording example the user chose: "Discolouration is visible on the drive-end bearing housing." — the thing and where, nothing more.

</specifics>

<deferred>
## Deferred Ideas

- `lib/access/register.ts`, `resolveTag`, `POST /api/referrals`, the `referral` sync kind, the `Flag` write and the sentences for `referral_evidence_missing` / `unknown_referral` — P9 (the types land here; the behaviour does not).
- `lib/limits` and every bounded value, including the 64 KB thumbnail cap the `Capture` type's `thumb` field carries as a type only — P3.
- The module declaring `(assetId, fixtureSet)`, the composition of `ObservationProvenance` from a cited record's provenance, and `fixture_version_mismatch`'s sentence and next act — P3/P5.
- AD-9's `already_open` / `not_open` closed-set members — P4.
- A counter-signature by the SHEQ manager on `provenance-check.md` — not requested; the user signs alone (D-01). Reopen only if the register owner is named before production.
- Extending the copied plant beyond the eleven assets plus `m-aa605`, or authoring observations for `m-aa101`, `m-aa102`, `m-aa602` — declined (D-08); revisit only if a later walkthrough needs a proposal on one of them.

</deferred>

---

*Phase: 02-fixtures-types*
*Context gathered: 2026-09-08*
