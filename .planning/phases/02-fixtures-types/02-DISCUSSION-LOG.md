# Phase 2: Fixtures & types - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 02-fixtures-types
**Areas discussed:** Provenance check mechanics, Kinds and wording, Citation granularity, Fixture version

---

## Provenance check mechanics

### Who is the named reviewer?

| Option | Description | Selected |
|--------|-------------|----------|
| You (Matthew) sign it | Reviewer of record for Phase 2; name and date in the sign-off; register owner not involved | ✓ |
| The SHEQ manager signs it | Story 2.1's persona; execution pauses on their availability | |
| You sign now, SHEQ manager counter-signs later | Open counter-signature line recorded as a pending item | |

**User's choice:** You (Matthew) sign it

### How does the read-through happen?

| Option | Description | Selected |
|--------|-------------|----------|
| In-session checkpoint (Recommended) | Executor writes fixtures and a review sheet, plan stops at human-verify, row-by-row confirmation in session, executor writes the signed file | ✓ |
| Out of band | Review offline, return with edits, a later plan applies them | |
| You edit the fixture file directly | Confirmation trail lives in git rather than a document | |

**User's choice:** In-session checkpoint

### What does provenance-check.md record?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-row table with verdict (Recommended) | Observation id, asset, cited record id, its sentence, grade, relation confirmed, verdict, reviewer, date | ✓ |
| One signature block | Single statement over listed ids | |
| You decide | Claude picks | |

**User's choice:** Per-row table with verdict

### Who fixes a disputed row?

| Option | Description | Selected |
|--------|-------------|----------|
| Reviewer chooses per row (Recommended) | Reword, re-cite or drop, chosen and supplied by the reviewer; executor never rewords unasked | ✓ |
| Executor proposes, you confirm | Executor drafts a correction, reviewer accepts or rejects | |
| Drop any disputed row | Set shrinks to first-pass rows | |

**User's choice:** Reviewer chooses per row

---

## Kinds and wording

### Three observations fit none of the eight kinds

| Option | Description | Selected |
|--------|-------------|----------|
| Extend the kind set (Recommended) | Add kinds naming what they are (e.g. `isolation_present`, `gauge_obscured`); closed, defined once; deviation from Story 2.1's list recorded | ✓ |
| Remap to existing kinds | Fold into nearest kind; the tag-present rows have no honest home | |
| Drop the three rows | Ten remain; electrician door left with only AMBIGUOUS rows | |

**User's choice:** Extend the kind set

### Who writes the thirteen wordings?

| Option | Description | Selected |
|--------|-------------|----------|
| Executor drafts, you confirm (Recommended) | Drafted under the eight voice rules and PRD §3 vocabulary; confirmed at the provenance checkpoint | ✓ |
| You author first | User writes them; executor types verbatim | |
| Executor drafts two variants per row | Pick one at the checkpoint | |

**User's choice:** Executor drafts, you confirm

### What shape does a wording take?

| Option | Description | Selected |
|--------|-------------|----------|
| One plain sentence, what is visible only (Recommended) | Names the thing and where; no cause, severity or figure; the citation situates it | ✓ |
| Short noun phrase | The seed's phrases as labels | |
| Sentence that states the inference | Carries its own justification; closer to a finding in tone | |

**User's choice:** One plain sentence, what is visible only

### Three assets have no observation

| Option | Description | Selected |
|--------|-------------|----------|
| Leave at zero (Recommended) | Authored match, zero proposals; an honest state P5 renders | ✓ |
| Author one each | Sixteen observations; three more citations to find and read | |
| Author only where the plant record offers a citation | Add rows where a fact or deviation already supports one | |

**User's choice:** Leave at zero

---

## Citation granularity

### What may a drawn_from record id point at?

| Option | Description | Selected |
|--------|-------------|----------|
| A fact or a deviation only (Recommended) | CitedFact id or Deviation id; each has one sentence; vague seed rows resolved by the executor, confirmed by the reviewer; machinery not citable | ✓ |
| Any fixture record, including machinery | Allow `m-…` with the description quoted | |
| Facts, deviations and governing docs | Also DOCS codes; no seed row needs it | |

**User's choice:** A fact or a deviation only

### Which deviation field does the comment quote?

| Option | Description | Selected |
|--------|-------------|----------|
| The field the inference draws on, named (Recommended) | `ncr-0118.immediate_action: "…"`; two rows may quote different fields of one NCR | ✓ |
| The deviation's description only | Headline only; the isolation row's support is elsewhere | |
| You decide | Per row, shortest read-through | |

**User's choice:** The field the inference draws on, named

### What is the drawn_from field in types.ts?

| Option | Description | Selected |
|--------|-------------|----------|
| The bare record id (Recommended) | One string the test checks; the provenance tuple composed later | |
| The full ObservationProvenance object | The seed's literal shape; id inside `source_uri` | |
| You decide | Claude chooses, AD-8 satisfied | ✓ |

**User's choice:** You decide (Claude's discretion; bare id recommended)

### How is the cited sentence carried and checked?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured, verified against the record (Recommended) | Fixed comment form parsed by a test and compared to the live record value; drift fails verify | ✓ |
| Structured, presence only | Form asserted, content not compared | |
| Free comment | Nothing mechanical checks it | |

**User's choice:** Structured, verified against the record

---

## Fixture version

### Format

| Option | Description | Selected |
|--------|-------------|----------|
| Dated string like the sibling (Recommended) | `capture-fixtures/2026.09.1`, mirroring `SCENE_VERSION` | ✓ |
| Semver | `1.0.0`; major/minor/patch meaningless for a fixture set | |
| Integer | `1`, `2`, `3`; says nothing on a mismatch card | |

**User's choice:** Dated string like the sibling

### Bump enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Content hash pinned beside the version (Recommended) | verify recomputes and fails on change without a bump; check-tokens pattern | ✓ |
| Version string test only | Existence and not-the-build-id only; bump left to review | |
| You decide | Subject to AD-15 | |

**User's choice:** Content hash pinned beside the version

### Which files count as content

| Option | Description | Selected |
|--------|-------------|----------|
| plant, artisans, orders, observations (Recommended) | The four data files; types and register excluded | ✓ |
| Everything under lib/data | Any change forces a bump | |
| Observations only | Only what a decision binds | |

**User's choice:** plant, artisans, orders, observations

### Location

| Option | Description | Selected |
|--------|-------------|----------|
| lib/data/fixtures.ts (Recommended) | Story 2.1's location; AD-6 reconciled (not a bounded quantity); P3 may re-export | ✓ |
| Create lib/limits now | Reverses Phase 1's deferral | |
| You decide | Claude records the reconciliation either way | |

**User's choice:** lib/data/fixtures.ts

---

## Claude's Discretion

- Shape of `drawn_from` (bare id recommended).
- Names of the added observation kinds; exact comment syntax.
- Whether the version-hash check and the isolation rule are new scripts or extensions of `check-structure.mjs`; hash file order; bundle sentinel if used.
- Persona ids, employee numbers, order id shapes under D-CONV.
- How much of the sibling's `plant.ts` surrounding structure is carried; trim by whole-record deletion.

## Deferred Ideas

- `lib/access/register.ts`, the referral route, sync kind and sentences — P9.
- `lib/limits` and every bounded value — P3.
- The `(assetId, fixtureSet)` module and `ObservationProvenance` composition — P3/P5.
- AD-9's `already_open` / `not_open` — P4.
- SHEQ manager counter-signature — not requested.
- Observations for `m-aa101`, `m-aa102`, `m-aa602` — declined.

---

**Correction (2026-09-08, after planning):** the questions above say "thirteen" observations; the seed's Fixtures table enumerates twelve (ap003 three, as001 one, gs001 two, an001 one, aa601 three, ac001 one, bb001 one). The count was the orchestrator's miscount, not a decision; CONTEXT.md D-06 and D-08 now say twelve. The user's choice (exactly the seed's set, none invented) is unchanged.
