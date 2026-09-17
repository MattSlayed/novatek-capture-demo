# Provenance check — FR-21a human review

This file records the one build gate no command can run (AD-15): a named
person reading each authored observation in `lib/data/observations.ts`
against the record it cites in `lib/data/plant.ts`, and judging whether the
record supports the wording (`relation: evidence`) or only situates it
(`relation: context`). The automated half — every `drawn_from` resolves and
every quoted comment still equals the record — is already green
(`node scripts/check-observations.mjs`). What follows is the per-row table a
second person can repeat without reading the code, signed below with the
reviewer's name and the date.

Matthew Koeberg read each of the twelve rows of the main table against the
record quoted beside it and confirmed, in his own words, that "all are quite
accurate to the citations": every wording is an honest inference the cited
record supports, or the record only situates it and the row says so, exactly
as drafted. No row was reworded, re-cited or dropped, so `relation` is
confirmed as drafted on every row and `lib/data/observations.ts` is
unchanged by this check.

## How to read a row

For each row, read the wording, then read the record's own sentence beside
it, and answer one of:

- **confirmed** — the wording is an honest inference this record supports
  (relation `evidence`), or the record only situates it and the row says so
  (relation `context`);
- **reword** — the wording says more, or less, than the record can carry;
  supply the replacement wording;
- **re-cite** — the wording is right but this is the wrong record; name the
  record to cite instead;
- **drop** — this observation should not ship.

If a row's relation is wrong — the record only situates a wording marked
`evidence`, or the reverse — say so and it is corrected as part of the
verdict.

## Main table

| Observation id | Asset id · tag | Kind | Wording as it will render | Cited record id | Record's own sentence (field named) | Grade | Relation | Verdict | Reviewer | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| obs-ap003-disc | m-ap003 · 20LAC10AP003 | discolouration | Discolouration is visible on the drive-end bearing housing. | f-ap003-vib | label "Last vibration reading", value "9.4", unit "mm/s RMS": *"Last vibration reading: 9.4 mm/s RMS"* | INFERRED | evidence | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-ap003-guard | m-ap003 · 20LAC10AP003 | fixing_missing | A missing fixing is visible on the coupling guard. | f-ap003-status | label "Service state", value "Off duty — isolated": *"Service state: Off duty — isolated"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-ap003-iso | m-ap003 · 20LAC10AP003 | isolation_present | An isolation tag is visible on the pump. | ncr-0118 | field `immediate_action`: *"Set taken off duty. Duty transferred to the adjacent transfer set. Isolation applied and tagged."* (comment quotes the trailing clause, *"Isolation applied and tagged"*) | INFERRED | evidence | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-as001-gauge | m-as001 · 20LAC30AS001 | gauge_obscured | Fogging is visible on the differential-pressure gauge face. | f-as001-dp | label "Differential pressure", value "0.28", unit "bar": *"Differential pressure: 0.28 bar"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-gs001-iso | m-gs001 · 20BFA10GS001 | isolation_present | A lock and tag are visible on the isolation point. | f-gs001-iso | label "Isolations applied", value "1 — transfer set C": *"Isolations applied: 1 — transfer set C"* | INFERRED | evidence | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-gs001-label | m-gs001 · 20BFA10GS001 | label_illegible | An illegible label is visible on the switchgear. | f-gs001-due | label "Protection test due", value "2026-07-04": *"Protection test due: 2026-07-04"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-an001-screw | m-an001 · 20LAC10AN001 | fixing_missing | A missing screw is visible on the actuator cover. | f-an001-due | label "Stroke test due", value "2027-05-05": *"Stroke test due: 2027-05-05"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-aa601-weep | m-aa601 · 20HAD10AA601 | gland_weep | Moisture is visible on the surface below the bonnet. | f-aa601-seal | label "Lead seal", value "Broken at inspection 2026-05-18": *"Lead seal: Broken at inspection 2026-05-18"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-aa601-seal | m-aa601 · 20HAD10AA601 | seal_absent | The lead seal wire is absent from the valve. | ncr-0104 | field `description`: *"Lead seal found broken at routine inspection. Valve cannot be assumed to be at certified setpoint and must be de-commissioned and re-calibrated before it counts as a protective device."* (comment quotes *"Lead seal found broken at routine inspection."*) | INFERRED | evidence | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-aa601-corr | m-aa601 · 20HAD10AA601 | corrosion_visible | Corrosion is visible on the spring housing. | f-aa601-cert | label "Certification state", value "Uncertified — seal broken": *"Certification state: Uncertified — seal broken"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-ac001-residue | m-ac001 · 20GHC20AC001 | leak_evidence | Residue is visible at the tube-side flange. | ncr-0091 | field `description`: *"Minor tube-side fouling identified at inspection; heat-transfer duty marginally below specification."* (comment quotes *"Minor tube-side fouling identified at inspection"*) | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |
| obs-bb001-stamp | m-bb001 · 20GHC10BB001 | label_illegible | Part of the inspection stamp is obscured on the vessel. | f-bb001-insp | label "Last statutory inspection", value "2025-04-02": *"Last statutory inspection: 2025-04-02"* | AMBIGUOUS | context | confirmed | Matthew Koeberg | 2026-09-17 |

Twelve rows, one per entry in `OBSERVATIONS` (D-08).

## Referral rows — not subject

A referral takes no `drawn_from` and has no cited record behind its wording,
because the wording is the artisan's own statement, not an authored
inference (D-ENT). The two rows below are listed here, in their own table,
so a later reader can see they were considered rather than overlooked
(Story 2.1's last criterion) — neither carries a verdict, because the
provenance gate does not apply to either.

| Referral | Tag as typed | Resolution | Register's own sentence | Status |
|---|---|---|---|---|
| J. van Wyk, off WO-2026-0129 (`m-aa601`) | `20LBA10AA605` | resolved → `m-aa605` | `f-aa605-cert` — *"Certification state: Certified"* | not subject — a referral takes no `drawn_from` |
| The same referral, tag mistyped | `20HAD10AA610` — one digit off `m-aa601`'s own `20HAD10AA601` | unresolved — absent from the register, retained with its plate photograph | no record cited: no register entry exists for this tag | not subject — a referral takes no `drawn_from` |

On the resolved row: the register says certified and the artisan says the
seal is gone, and nothing in this system resolves that disagreement — the
flag records that he raised it, not that the valve is uncertified.

## Open judgments

Every call plan 02-05 flagged for this checkpoint, one line each, naming the
row, the choice made and why, and what the alternative was:

1. **obs-ap003-disc** (cited record) — cited `f-ap003-vib` rather than
   `ncr-0118`. The seed's phrase says "the NCR-2026-0118 vibration record";
   the vibration fact's own `evidence` chain names that NCR, so both are
   citable under D-09. Kept the more specific fact citation. Alternative:
   re-cite to `ncr-0118` instead, if that is what the seed's phrase meant.
2. **obs-gs001-label** (cited record) — cited `f-gs001-due` (Protection test
   due). Neither remaining `gs001` fact is about a label; this is the
   closest fact available, but the fit is weak. Alternative: drop, or
   re-cite if a better-fitting record is intended.
3. **obs-an001-screw** (cited record) — cited `f-an001-due` (Stroke test
   due). No `an001` fact is about physical hardware condition at all — the
   strongest dispute candidate in the set, the case D-09 anticipates where a
   record offers no fact that situates the observation. Alternative: drop.
4. **obs-aa601-weep** (kind) — chose `gland_weep` rather than
   `leak_evidence` for "surface moisture below the bonnet." Either
   closed-set member plausibly fits; `gland_weep` was chosen for the
   spindle/gland area a torsion-bar relief valve's bonnet sits over.
   Alternative: `leak_evidence`.
5. **obs-ac001-residue** (kind) — chose `leak_evidence` as the closest
   existing member to "residue at the tube-side flange." No closed-set
   member says "residue" or "fouling" directly. Alternative: none closer
   exists in the current set; drop is the only other option.
6. **obs-bb001-stamp** (kind) — chose `label_illegible` for an inspection
   stamp, though a stamp is a marking rather than literally a label.
   `label_illegible` is the closest existing member. Alternative: none
   closer exists in the current set; drop is the only other option.

The size of the set is not one of these judgments: it is twelve, as D-08
enumerates it. The reviewer is being asked about rows, not about the count.

## Sign-off

Matthew Koeberg read each of the twelve rows above against the record's own
sentence quoted beside it and confirmed every wording as drafted: an honest
inference the cited record supports where the relation is `evidence`, or a
wording the record only situates where the relation is `context`. No row was
reworded, no row was re-cited, no row was dropped. The `Verdict`, `Reviewer`
and `Date` columns of the main table above record exactly this, on every
row. The two referral rows remain not subject to this gate, unchanged.

---

Recorded 2026-09-17.
