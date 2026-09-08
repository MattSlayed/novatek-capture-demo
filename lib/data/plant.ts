/* ================================================================
   PLANT FIXTURES — this repository's copy, trimmed by whole-record
   deletion

   The eleven assets the five work orders touch, plus `m-aa605` (the
   referral fixture's resolved target, on no order — a referral
   target absent from the register would exercise only the
   unresolved path). The sibling is not present on Vercel, so every
   record a Phase 2 observation or work order cites must be complete
   here.

     Source:        ../ipv-demo/lib/data/plant.ts
     Source commit: 8fd097a (2026-09-01)
     Copied:        2026-09-08

   Kept machinery (11): m-ap003, m-aa101, m-aa102, m-aa601, m-aa602,
   m-aa605, m-as001, m-bb001, m-ac001, m-gs001, m-an001.

   Deleted below, whole units only — no kept record is re-typed,
   reformatted or re-indented:
     - nine machinery records: m-ap001, m-ap002, m-ap004, m-aa210,
       m-aa211, m-aa301, m-cf101, m-ap010, m-bb002
     - the z05 zone (Reagent Dosing & Bulk Storage) — referenced by
       nothing in the kept subset
     - three PEOPLE keys: reliability, supervisor, planner —
       referenced only by the 3D placement/session-provenance surface
       below, also deleted
     - the 3D placement surface: its position table, its two derived
       exports and its per-zone lookup helper
     - the session-provenance export at the bottom of the sibling file
     - the two now-orphaned type names on this file's own `import
       type` line, in the same pass as the surface above (RESEARCH
       Pitfall 1 — leaving them is a hard tsc TS2305, not a lint nit)

   ZONES, PEOPLE, DOCS, DEVIATIONS, MACHINERY_BY_ID, MACHINERY_BY_TAG,
   machineryInZone and every kept record are otherwise byte-faithful
   to the source commit above.
   ================================================================ */

/* ================================================================
   THE REFERENCE PLANT

   A synthetic pump station and process bay. Every tag, record,
   document number, name and date below is invented. The *shapes* are
   real: KKS/AKZ plant designation, ISO 9001 Annex SL document
   numbering, ASME Section I and API 598 tolerance bands, and an ISO
   improvement-procedure NCR with the five-M root-cause taxonomy.

   This depicts no real facility. It is authored to demonstrate the
   binding and governance layer.
   ================================================================ */

import type {
  CitedFact,
  Deviation,
  GoverningDoc,
  Machinery,
  Provenance,
  Zone,
} from "./types";

export const SCENE_VERSION = "ref-plant/2026.07.3";
export const PLANT_NAME = "Reference Plant — Pump Station 2";

/** Document prefix for this reference site. */
const DOC = "RPL";

/* ---------------------------------------------------------------
   provenance helper
   --------------------------------------------------------------- */

let provSeq = 0;

function prov(
  source_label: string,
  source_uri: string,
  system_of_record: Provenance["system_of_record"],
  opts: Partial<Provenance> = {},
): Provenance {
  provSeq += 1;
  return {
    source_uri,
    source_label,
    system_of_record,
    source_version: opts.source_version ?? "rev 3",
    extracted_at: opts.extracted_at ?? "2026-07-24T06:12:41+02:00",
    extractor_hash:
      opts.extractor_hash ?? `sha256:9f2c${(provSeq * 7919).toString(16).padStart(8, "0")}`,
    confidence: opts.confidence ?? 0.98,
    grade: opts.grade ?? "EXTRACTED",
  };
}

/* ---------------------------------------------------------------
   ZONES
   The zone is simultaneously the capture unit, the training unit,
   the RBAC unit and the transmission unit. Per-zone objects are what
   make partial withholding physically possible.
   --------------------------------------------------------------- */

export const ZONES: Zone[] = [
  {
    id: "z01",
    code: "Z-01",
    name: "Pump Hall",
    description:
      "Four transfer sets on a common plinth, suction and discharge headers, overhead gantry.",
    rbac_tier: "field_technician",
    bbox: [-18, 0, -10, 4, 7.5, 10],
    tile_bytes: 4_412_160,
    manifest_hash: "sha256:1a7f4be2c9d0",
    scene_version: SCENE_VERSION,
  },
  {
    id: "z02",
    code: "Z-02",
    name: "Valve Station & Manifold",
    description:
      "Relief devices, manifold isolation, duplex strainer and the pressure-test tie-in.",
    rbac_tier: "field_technician",
    bbox: [4, 0, -10, 22, 8.5, 6],
    tile_bytes: 3_871_744,
    manifest_hash: "sha256:6c2d90aa4417",
    scene_version: SCENE_VERSION,
  },
  {
    id: "z03",
    code: "Z-03",
    name: "Process Bay & Vessels",
    description: "Surge vessel, oil cooler skid, flow element and the sample point.",
    rbac_tier: "field_technician",
    bbox: [4, 0, 6, 22, 11, 20],
    tile_bytes: 5_105_664,
    manifest_hash: "sha256:b3e81f70c25a",
    scene_version: SCENE_VERSION,
  },
  {
    id: "z04",
    code: "Z-04",
    name: "Motor Control Centre",
    description:
      "Switchgear line-up, actuator supplies and the isolation schedule board.",
    rbac_tier: "site_supervisor",
    bbox: [-18, 0, 10, -2, 6, 20],
    tile_bytes: 2_260_992,
    manifest_hash: "sha256:47da0c9e1b83",
    scene_version: SCENE_VERSION,
    restriction_reason:
      "Electrical isolation points. Restricted to Site Supervisor tier and above under the site access schedule.",
  },
];

export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));

/* ---------------------------------------------------------------
   PEOPLE — names carry their qualification on record, which is how
   the pilot client's own signed cards read.
   --------------------------------------------------------------- */

export const PEOPLE = {
  millwright: { name: "S. Mabaso", competency: "Millwright, Red Seal" },
  ndt: { name: "N. Dlamini", competency: "NDT Level II (MPI, PT)" },
  test: { name: "R. Pretorius", competency: "Test Technician, SANAS-traceable" },
  qc: { name: "L. Khumalo", competency: "QC Inspector" },
} as const;

/* ---------------------------------------------------------------
   GOVERNING DOCUMENTS
   PREFIX-{PO|PR|PD|WI}-{clause letter}-{seq}[-F{n}]
   clause letters: C context(4) L leadership(5) P planning(6)
                   S support(7) O operation(8) F performance(9)
                   I improvement(10)
   --------------------------------------------------------------- */

export const DOCS: GoverningDoc[] = [
  {
    id: "d-wi-o-9",
    code: `${DOC}-WI-O-9`,
    title: "Valve Repair & Testing Work Instruction",
    revision: 3,
    issued: "2024-09-01",
    next_review: "2027-09-01",
    satisfies: ["ISO 9001:2015 cl. 8.5.1", "API 598", "ASME/ANSI B16.34"],
    forms: [
      { code: `${DOC}-WI-O-9-F2`, title: "Valve Condition Check Sheet" },
      { code: `${DOC}-WI-O-9-F3`, title: "Valve Condition Report" },
      { code: `${DOC}-WI-O-9-F6`, title: "Relief-Safety Valve Inspection Report" },
    ],
  },
  {
    id: "d-pr-o-17",
    code: `${DOC}-PR-O-17`,
    title: "Safety Valve Trevi Test Procedure",
    revision: 2,
    issued: "2025-03-14",
    next_review: "2028-03-14",
    satisfies: ["ASME Section I", "BS EN ISO 4126-1", "SANS 347"],
    forms: [{ code: `${DOC}-PR-O-17-F1`, title: "Online Setpoint Verification Record" }],
  },
  {
    id: "d-pr-o-3",
    code: `${DOC}-PR-O-3`,
    title: "Product and Process Conformance Procedure",
    revision: 4,
    issued: "2024-09-01",
    next_review: "2027-09-01",
    satisfies: ["ISO 9001:2015 cl. 8.7"],
    forms: [{ code: `${DOC}-PR-O-3-F1`, title: "QC Checklist" }],
  },
  {
    id: "d-pr-i-1",
    code: `${DOC}-PR-I-1`,
    title: "Improvement Procedure",
    revision: 3,
    issued: "2023-11-20",
    next_review: "2026-11-20",
    satisfies: ["ISO 9001:2015 cl. 10.2"],
    forms: [
      { code: `${DOC}-PR-I-1-F1`, title: "Non-Conformance Report" },
      { code: `${DOC}-PR-I-1-F2`, title: "Defect Notice Form" },
    ],
  },
  {
    id: "d-wi-o-6",
    code: `${DOC}-WI-O-6`,
    title: "Monitoring Traceability (Calibration) Work Instruction",
    revision: 2,
    issued: "2025-06-02",
    next_review: "2028-06-02",
    satisfies: ["ISO 9001:2015 cl. 7.1.5", "SANAS"],
    forms: [{ code: `${DOC}-WI-O-6-F1`, title: "Calibration Register" }],
  },
  {
    id: "d-pr-s-1",
    code: `${DOC}-PR-S-1`,
    title: "Resource Management Procedure",
    revision: 5,
    issued: "2025-01-15",
    next_review: "2028-01-15",
    satisfies: ["ISO 9001:2015 cl. 7.1"],
    forms: [],
  },
];

export const DOC_BY_CODE = new Map(DOCS.map((d) => [d.code, d]));

/* ---------------------------------------------------------------
   DEVIATIONS
   --------------------------------------------------------------- */

export const DEVIATIONS: Deviation[] = [
  {
    id: "ncr-0118",
    ncr_number: "NCR-2026-0118",
    raised_on: "2026-06-30",
    originator: PEOPLE.millwright.name,
    department: "Mechanical Maintenance",
    description:
      "Drive-end bearing housing vibration recorded above the alarm threshold on the routine walk-down. Set removed from duty and placed on standby pending strip and assess.",
    risk_rating: "High",
    root_cause: "Machine",
    immediate_action:
      "Set taken off duty. Duty transferred to the adjacent transfer set. Isolation applied and tagged.",
    corrective_action: null,
    status: "Open",
    blocks: "Return to duty service following overhaul",
    provenance: prov(
      `${DOC}-PR-I-1-F1 Non-Conformance Report`,
      "ncr://register/NCR-2026-0118",
      "NCR Register",
      { source_version: "rev 1", confidence: 1.0 },
    ),
  },
  {
    id: "ncr-0104",
    ncr_number: "NCR-2026-0104",
    raised_on: "2026-05-18",
    originator: PEOPLE.qc.name,
    department: "Quality",
    description:
      "Lead seal found broken at routine inspection. Valve cannot be assumed to be at certified setpoint and must be de-commissioned and re-calibrated before it counts as a protective device.",
    risk_rating: "High",
    root_cause: "Man",
    immediate_action:
      "Device flagged as uncertified on the protective-device register. Standby relief capacity confirmed available.",
    corrective_action:
      "Re-calibration scheduled against the outage window; re-seal and certificate to follow.",
    status: "Under review",
    blocks: "Setpoint certification",
    provenance: prov(
      `${DOC}-PR-I-1-F1 Non-Conformance Report`,
      "ncr://register/NCR-2026-0104",
      "NCR Register",
      { source_version: "rev 2", confidence: 1.0 },
    ),
  },
  {
    id: "ncr-0091",
    ncr_number: "NCR-2026-0091",
    raised_on: "2026-03-06",
    originator: PEOPLE.ndt.name,
    department: "Inspection",
    description:
      "Minor tube-side fouling identified at inspection; heat-transfer duty marginally below specification.",
    risk_rating: "Medium",
    root_cause: "Material",
    immediate_action: "Cleaning scheduled into the next planned outage.",
    corrective_action:
      "Chemical clean completed and duty re-verified against the design sheet.",
    status: "Closed out",
    blocks: null,
    provenance: prov(
      `${DOC}-PR-I-1-F1 Non-Conformance Report`,
      "ncr://register/NCR-2026-0091",
      "NCR Register",
      { source_version: "rev 3", confidence: 1.0 },
    ),
  },
];

export const DEVIATION_BY_ID = new Map(DEVIATIONS.map((d) => [d.id, d]));

/* ---------------------------------------------------------------
   FACT BUILDERS
   --------------------------------------------------------------- */

function erpFact(
  id: string,
  label: string,
  value: string,
  opts: Partial<CitedFact> & { version?: string } = {},
): CitedFact {
  const { version, ...rest } = opts;
  return {
    id,
    label,
    value,
    provenance: prov("Maintenance management system", `erp://asset/${id}`, "ERP", {
      source_version: version ?? "read 2026-07-26",
      confidence: 0.99,
    }),
    ...rest,
  };
}

/* ---------------------------------------------------------------
   MACHINERY
   --------------------------------------------------------------- */

export const MACHINERY: Machinery[] = [
  /* ---- Z-01 Pump Hall — the four identical transfer sets -------- */
  {
    id: "m-ap003",
    tag: "20LAC10AP003",
    description: "Transfer set C — standby",
    asset_class: "centrifugal_pump",
    make: "Verwey",
    model: "HC 150-400",
    serial: "31884",
    zone_id: "z01",
    governing_docs: [`${DOC}-PR-S-1`, `${DOC}-WI-O-6`, `${DOC}-PR-I-1`],
    deviations: ["ncr-0118"],
    facts: [
      erpFact("f-ap003-status", "Service state", "Off duty — isolated", {
        liveRead: true,
        readAt: "14:32:07",
        tone: "crit",
      }),
      erpFact("f-ap003-last", "Last overhaul", "2024-08-22"),
      erpFact("f-ap003-next", "Next service due", "2025-08-22", { tone: "crit" }),
      erpFact("f-ap003-hours", "Running hours since overhaul", "11 630", { unit: "h", liveRead: true, readAt: "14:32:07" }),
      {
        id: "f-ap003-vib",
        label: "Last vibration reading",
        value: "9.4",
        unit: "mm/s RMS",
        tone: "crit",
        provenance: prov(
          "Routine walk-down record",
          "erp://condition/20LAC10AP003/2026-06-30",
          "ERP",
          { source_version: "2026-06-30", confidence: 0.94 },
        ),
        evidence: {
          measurement: "9.4 mm/s RMS, above alarm threshold",
          evidence: `${DOC}-PR-I-1-F1 Non-Conformance Report NCR-2026-0118`,
          retrieval: "NCR register, 2026 series",
          signatory: PEOPLE.millwright.name,
          competency: PEOPLE.millwright.competency,
          filed: "filed",
        },
      },
    ],
  },
  {
    id: "m-aa101",
    tag: "20LAC10AA101",
    description: "Transfer set C discharge non-return valve",
    asset_class: "non_return_valve",
    make: "Grynberg",
    model: "DN200 PN40",
    serial: "22417",
    zone_id: "z01",
    governing_docs: [`${DOC}-WI-O-9`],
    deviations: [],
    facts: [
      erpFact("f-aa101-last", "Last refurbishment", "2024-08-22"),
      erpFact("f-aa101-seat", "Seat test result", "Pass — API 598 low-pressure seat"),
      erpFact("f-aa101-next", "Next inspection due", "2026-08-22"),
    ],
  },
  {
    id: "m-aa102",
    tag: "20LAC10AA102",
    description: "Transfer set C suction gate valve",
    asset_class: "gate_valve",
    make: "Grynberg",
    model: "DN250 PN25",
    serial: "22418",
    zone_id: "z01",
    governing_docs: [`${DOC}-WI-O-9`],
    deviations: [],
    facts: [
      erpFact("f-aa102-state", "Position", "Closed — isolation applied", { tone: "warn" }),
      erpFact("f-aa102-last", "Last refurbishment", "2024-08-22"),
    ],
  },

  /* ---- Z-02 Valve Station & Manifold ---------------------------- */
  {
    id: "m-aa601",
    tag: "20HAD10AA601",
    description: "Header safety relief valve — torsion bar type",
    asset_class: "safety_relief_valve",
    make: "Hoffmann",
    model: "TB 80/125",
    serial: "32076",
    zone_id: "z02",
    governing_docs: [`${DOC}-PR-O-17`, `${DOC}-WI-O-9`],
    deviations: ["ncr-0104"],
    setpoint: {
      design_mpa: 12.97,
      lift_max: 13.03,
      lift_min: 12.9,
      reset_max: 12.64,
      reset_min: 12.51,
      blowdown_mpa_max: 0.65,
      blowdown_mpa_min: 0.39,
      blowdown_pct_max: 5.0,
      blowdown_pct_min: 3.0,
      tolerance_note: "±3% online (Trevi) · ±5% popping-pressure adjustment",
      governing_standard: "ASME Section I",
    },
    facts: [
      erpFact("f-aa601-cert", "Certification state", "Uncertified — seal broken", { tone: "crit" }),
      erpFact("f-aa601-last", "Last setpoint verification", "2025-10-09"),
      erpFact("f-aa601-next", "Next verification due", "2026-10-09"),
      {
        id: "f-aa601-seal",
        label: "Lead seal",
        value: "Broken at inspection 2026-05-18",
        tone: "crit",
        provenance: prov(
          `${DOC}-WI-O-9-F6 Relief-Safety Valve Inspection Report`,
          "doc://control/RPL-WI-O-9-F6/2026-05-18",
          "Document Control",
          { source_version: "rev 3", confidence: 1.0 },
        ),
        evidence: {
          measurement: "Seal integrity: failed",
          evidence: `${DOC}-WI-O-9-F6 Relief-Safety Valve Inspection Report`,
          retrieval: "Document control, May 2026",
          signatory: PEOPLE.qc.name,
          competency: PEOPLE.qc.competency,
          filed: "filed",
        },
      },
    ],
  },
  {
    id: "m-aa602",
    tag: "20HAD10AA602",
    description: "Header safety relief valve — torsion bar type",
    asset_class: "safety_relief_valve",
    make: "Hoffmann",
    model: "TB 80/125",
    serial: "32077",
    zone_id: "z02",
    governing_docs: [`${DOC}-PR-O-17`, `${DOC}-WI-O-9`],
    deviations: [],
    setpoint: {
      design_mpa: 12.97,
      lift_max: 13.03,
      lift_min: 12.9,
      reset_max: 12.64,
      reset_min: 12.51,
      blowdown_mpa_max: 0.65,
      blowdown_mpa_min: 0.39,
      blowdown_pct_max: 5.0,
      blowdown_pct_min: 3.0,
      tolerance_note: "±3% online (Trevi) · ±5% popping-pressure adjustment",
      governing_standard: "ASME Section I",
    },
    facts: [
      erpFact("f-aa602-cert", "Certification state", "Certified"),
      erpFact("f-aa602-last", "Last setpoint verification", "2026-04-11"),
      erpFact("f-aa602-next", "Next verification due", "2027-04-11"),
      {
        id: "f-aa602-trevi",
        label: "Online Trevi result",
        value: "12.95",
        unit: "MPa",
        provenance: prov(
          `${DOC}-PR-O-17-F1 Online Setpoint Verification Record`,
          "doc://control/RPL-PR-O-17-F1/2026-04-11",
          "Calibration Register",
          { source_version: "rev 2", confidence: 0.99 },
        ),
        evidence: {
          measurement: "12.95 MPa, within ±3% of 12.97 MPa design",
          evidence: `${DOC}-PR-O-17-F1 Online Setpoint Verification Record`,
          retrieval: "Calibration register, April 2026",
          signatory: PEOPLE.test.name,
          competency: PEOPLE.test.competency,
          filed: "filed",
        },
      },
    ],
  },
  {
    id: "m-aa605",
    tag: "20LBA10AA605",
    description: "Downstream header relief valve",
    asset_class: "safety_relief_valve",
    make: "Hoffmann",
    model: "TB 65/100",
    serial: "32081",
    zone_id: "z02",
    governing_docs: [`${DOC}-PR-O-17`],
    deviations: [],
    setpoint: {
      design_mpa: 11.93,
      lift_max: 11.99,
      lift_min: 11.87,
      reset_max: 11.63,
      reset_min: 11.51,
      blowdown_mpa_max: 0.6,
      blowdown_mpa_min: 0.36,
      blowdown_pct_max: 5.0,
      blowdown_pct_min: 3.0,
      tolerance_note: "±3% online (Trevi) · ±5% popping-pressure adjustment",
      governing_standard: "ASME Section I",
    },
    facts: [
      erpFact("f-aa605-cert", "Certification state", "Certified"),
      erpFact("f-aa605-next", "Next verification due", "2027-01-22"),
    ],
  },
  {
    id: "m-as001",
    tag: "20LAC30AS001",
    description: "Duplex strainer",
    asset_class: "strainer",
    make: "Steenkamp",
    model: "DX 250",
    serial: "22935",
    zone_id: "z02",
    governing_docs: [`${DOC}-PR-S-1`],
    deviations: [],
    facts: [
      erpFact("f-as001-dp", "Differential pressure", "0.28", { unit: "bar", liveRead: true, readAt: "14:32:07" }),
      erpFact("f-as001-clean", "Last element clean", "2026-06-12"),
    ],
  },

  /* ---- Z-03 Process Bay & Vessels ------------------------------- */
  {
    id: "m-bb001",
    tag: "20GHC10BB001",
    description: "Surge vessel",
    asset_class: "vessel",
    make: "Vaalpark Fabrication",
    model: "SV 6.3 m³",
    serial: "V-1188",
    zone_id: "z03",
    governing_docs: [`${DOC}-PR-O-3`],
    deviations: [],
    facts: [
      erpFact("f-bb001-insp", "Last statutory inspection", "2025-04-02"),
      erpFact("f-bb001-next", "Next statutory inspection", "2028-04-02"),
      erpFact("f-bb001-mawp", "MAWP", "1.6", { unit: "MPa" }),
    ],
  },
  {
    id: "m-ac001",
    tag: "20GHC20AC001",
    description: "Lube oil cooler",
    asset_class: "oil_cooler",
    make: "Vaalpark Fabrication",
    model: "OC 40",
    serial: "OC-0442",
    zone_id: "z03",
    governing_docs: [`${DOC}-PR-O-3`, `${DOC}-PR-I-1`],
    deviations: ["ncr-0091"],
    facts: [
      erpFact("f-ac001-duty", "Heat duty vs design", "98%", { liveRead: true, readAt: "14:32:07" }),
      erpFact("f-ac001-clean", "Last chemical clean", "2026-04-18"),
    ],
  },

  /* ---- Z-04 Motor Control Centre (Site Supervisor and above) ----- */
  {
    id: "m-gs001",
    tag: "20BFA10GS001",
    description: "Transfer sets switchgear line-up",
    asset_class: "motor_control_centre",
    make: "Rautenbach Switchgear",
    model: "MCC 400",
    serial: "SW-2290",
    zone_id: "z04",
    governing_docs: [`${DOC}-PR-S-1`],
    deviations: [],
    facts: [
      erpFact("f-gs001-iso", "Isolations applied", "1 — transfer set C", { tone: "warn", liveRead: true, readAt: "14:32:07" }),
      erpFact("f-gs001-test", "Last protection test", "2025-07-04"),
      erpFact("f-gs001-due", "Protection test due", "2026-07-04", { tone: "crit" }),
    ],
  },
  {
    id: "m-an001",
    tag: "20LAC10AN001",
    description: "Manifold valve electric actuator",
    asset_class: "actuator",
    make: "Meiring Instruments",
    model: "EA 90",
    serial: "MI-7802",
    zone_id: "z04",
    governing_docs: [`${DOC}-WI-O-6`],
    deviations: [],
    facts: [
      erpFact("f-an001-stroke", "Last stroke test", "2026-05-05"),
      erpFact("f-an001-due", "Stroke test due", "2027-05-05"),
    ],
  },
];

export const MACHINERY_BY_ID = new Map(MACHINERY.map((m) => [m.id, m]));
export const MACHINERY_BY_TAG = new Map(MACHINERY.map((m) => [m.tag, m]));

export function machineryInZone(zoneId: string): Machinery[] {
  return MACHINERY.filter((m) => m.zone_id === zoneId);
}
