/* ================================================================
   AUTHORED OBSERVATIONS

   The seed's twelve authored observations (D-08): ap003 three, as001
   one, gs001 two, an001 one, aa601 three, ac001 one, bb001 one.
   `m-aa101`, `m-aa102`, `m-aa602` carry none, and `m-aa605` — the
   referral fixture's target — carries none either. A verify on any
   of those four assets returns an authored match and zero proposals,
   which is an honest state P5 renders; no observation is invented to
   fill an asset or to reach a count.

   Each `wording` is one plain sentence stating what is visible and
   where — no cause, no severity, no figure, no record name, no verb
   implying a model looked (D-07) — drafted by the executor and
   confirmed or disputed by the reviewer at plan 02-06's checkpoint
   (D-06). The `grade`/`relation`/cited-record choice for several rows
   is a judgment call the seed itself left open; every one of those is
   listed in 02-05-SUMMARY.md for the reviewer, not silently settled
   here.

   The comment immediately above each observation is the one fixed,
   parseable citation form scripts/check-observations.mjs parses and
   verifies against the live `plant.ts` records on every `verify` run
   (D-10, D-11). Its shape, in prose so this header itself does not
   read as a thirteenth citation: the word "cites", then either a fact
   id followed by a colon and its quoted `label: value[ unit]`, or a
   deviation id and a dotted field name followed by a colon and its
   quoted substring.

   Every quoted string below was copied out of lib/data/plant.ts by
   reading it, never from memory. `drawn_from` is a bare record id — a
   CitedFact id or a Deviation's `id` field, and nothing else citable
   (D-09).

   lib/data imports nothing from lib/store, lib/reconcile or
   lib/access (D-20, D-DEP).
   ================================================================ */

import type { AuthoredObservation } from "./types";

export const OBSERVATIONS: AuthoredObservation[] = [
  /* ---- Millwright door — m-ap003, m-as001 ------------------------ */

  // cites f-ap003-vib: "Last vibration reading: 9.4 mm/s RMS"
  {
    id: "obs-ap003-disc",
    asset_id: "m-ap003",
    kind: "discolouration",
    wording: "Discolouration is visible on the drive-end bearing housing.",
    grade: "INFERRED",
    drawn_from: "f-ap003-vib",
    relation: "evidence",
  },
  // cites f-ap003-status: "Service state: Off duty — isolated"
  {
    id: "obs-ap003-guard",
    asset_id: "m-ap003",
    kind: "fixing_missing",
    wording: "A missing fixing is visible on the coupling guard.",
    grade: "AMBIGUOUS",
    drawn_from: "f-ap003-status",
    relation: "context",
  },
  // cites ncr-0118.immediate_action: "Isolation applied and tagged"
  {
    id: "obs-ap003-iso",
    asset_id: "m-ap003",
    kind: "isolation_present",
    wording: "An isolation tag is visible on the pump.",
    grade: "INFERRED",
    drawn_from: "ncr-0118",
    relation: "evidence",
  },
  // cites f-as001-dp: "Differential pressure: 0.28 bar"
  {
    id: "obs-as001-gauge",
    asset_id: "m-as001",
    kind: "gauge_obscured",
    wording: "Fogging is visible on the differential-pressure gauge face.",
    grade: "AMBIGUOUS",
    drawn_from: "f-as001-dp",
    relation: "context",
  },

  /* ---- Electrician door — m-gs001, m-an001 ------------------------ */

  // cites f-gs001-iso: "Isolations applied: 1 — transfer set C"
  {
    id: "obs-gs001-iso",
    asset_id: "m-gs001",
    kind: "isolation_present",
    wording: "A lock and tag are visible on the isolation point.",
    grade: "INFERRED",
    drawn_from: "f-gs001-iso",
    relation: "evidence",
  },
  // cites f-gs001-due: "Protection test due: 2026-07-04"
  {
    id: "obs-gs001-label",
    asset_id: "m-gs001",
    kind: "label_illegible",
    wording: "An illegible label is visible on the switchgear.",
    grade: "AMBIGUOUS",
    drawn_from: "f-gs001-due",
    relation: "context",
  },
  // cites f-an001-due: "Stroke test due: 2027-05-05"
  {
    id: "obs-an001-screw",
    asset_id: "m-an001",
    kind: "fixing_missing",
    wording: "A missing screw is visible on the actuator cover.",
    grade: "AMBIGUOUS",
    drawn_from: "f-an001-due",
    relation: "context",
  },

  /* ---- Boilermaker door — m-aa601, m-ac001, m-bb001 --------------- */

  // cites f-aa601-seal: "Lead seal: Broken at inspection 2026-05-18"
  {
    id: "obs-aa601-weep",
    asset_id: "m-aa601",
    kind: "gland_weep",
    wording: "Moisture is visible on the surface below the bonnet.",
    grade: "AMBIGUOUS",
    drawn_from: "f-aa601-seal",
    relation: "context",
  },
  // cites ncr-0104.description: "Lead seal found broken at routine inspection."
  {
    id: "obs-aa601-seal",
    asset_id: "m-aa601",
    kind: "seal_absent",
    wording: "The lead seal wire is absent from the valve.",
    grade: "INFERRED",
    drawn_from: "ncr-0104",
    relation: "evidence",
  },
  // cites f-aa601-cert: "Certification state: Uncertified — seal broken"
  {
    id: "obs-aa601-corr",
    asset_id: "m-aa601",
    kind: "corrosion_visible",
    wording: "Corrosion is visible on the spring housing.",
    grade: "AMBIGUOUS",
    drawn_from: "f-aa601-cert",
    relation: "context",
  },
  // cites ncr-0091.description: "Minor tube-side fouling identified at inspection"
  {
    id: "obs-ac001-residue",
    asset_id: "m-ac001",
    kind: "leak_evidence",
    wording: "Residue is visible at the tube-side flange.",
    grade: "AMBIGUOUS",
    drawn_from: "ncr-0091",
    relation: "context",
  },
  // cites f-bb001-insp: "Last statutory inspection: 2025-04-02"
  {
    id: "obs-bb001-stamp",
    asset_id: "m-bb001",
    kind: "label_illegible",
    wording: "Part of the inspection stamp is obscured on the vessel.",
    grade: "AMBIGUOUS",
    drawn_from: "f-bb001-insp",
    relation: "context",
  },
];

/**
 * Grouped by `asset_id` — an asset with no authored row (D-08) is
 * simply absent as a key, never present with an empty array, so a
 * `.get(id)` miss and a genuinely-empty list are never confused.
 */
export const OBSERVATIONS_BY_ASSET = OBSERVATIONS.reduce((map, observation) => {
  const list = map.get(observation.asset_id) ?? [];
  list.push(observation);
  map.set(observation.asset_id, list);
  return map;
}, new Map<string, AuthoredObservation[]>());
