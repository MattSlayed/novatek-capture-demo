/* ================================================================
   DATA TYPES

   The fourteen names D-18 copies verbatim from the sibling, the
   eleven closed sets this project's later phases key off (D-19), and
   the seed's eighteen new entity types. This file is the single
   definition site — every later phase imports a closed set from here
   rather than restating it.

     Parent:        ../ipv-demo/lib/data/types.ts
     Parent commit: 8fd097a (2026-09-01)

   The sixteen names copied verbatim below — RbacTier and its
   RBAC_ORDER/RBAC_LABEL, ExtractionGrade, Provenance, SystemOfRecord,
   EvidenceChain, CitedFact, Zone, AssetClass and ASSET_CLASS_LABEL,
   Machinery, SetpointBlock, RootCause5M, Deviation, GoverningDoc —
   are D-18's exhaustive list. Nothing else is copied from the
   sibling: its `Anchor`, `CaptureSession`, `DecisionState`,
   `DecisionRecord`, `SceneManifest`, `ManifestZoneEntry` and
   `ManifestModelEntry` are deliberately absent, because the seed
   defines its own `Decision`, `Referral` and `SyncItem` shapes and
   this project has no 3D scene.

   `ExtractionGrade` keeps all three members including `EXTRACTED`
   (D-12): the copied plant facts carry `EXTRACTED` provenance
   legitimately, from the ERP and NCR systems of record. It is the
   authored observation's own grade, defined further down as its own
   two-member `ObservationGrade` union, that excludes it.

   No TypeScript `enum` construct is written anywhere in this file —
   Node 24's strip-only loading, used by every fixture test under
   scripts/, rejects one outright (RESEARCH Pattern 2, nuance 3).
   ================================================================ */

import type { GovernedKey } from "../copy/governed";

/** RBAC tiers, mapping 1:1 to the roles in SEED-BRIEF.md. */
export type RbacTier = "field_technician" | "site_supervisor" | "management";

export const RBAC_ORDER: RbacTier[] = [
  "field_technician",
  "site_supervisor",
  "management",
];

export const RBAC_LABEL: Record<RbacTier, string> = {
  field_technician: "Field Technician",
  site_supervisor: "Site Supervisor",
  management: "Management",
};

export type ExtractionGrade = "EXTRACTED" | "INFERRED" | "AMBIGUOUS";

export interface Provenance {
  /** Stable identifier of the source record this fact came from. */
  source_uri: string;
  /** Revision of that source at extraction time. */
  source_version: string;
  /** ISO-8601 timestamp of extraction. */
  extracted_at: string;
  /** Hash identifying the extractor build, so a fact is reproducible. */
  extractor_hash: string;
  /** 0..1 */
  confidence: number;
  grade: ExtractionGrade;
  /** Human-readable name of the source document or system. */
  source_label: string;
  /** Which system of record holds it. The twin is a view, never a record. */
  system_of_record: SystemOfRecord;
}

export type SystemOfRecord =
  | "ERP"
  | "Document Control"
  | "NCR Register"
  | "Calibration Register"
  | "Capture Session";

export interface EvidenceChain {
  /** The number as it appears on a dashboard or sheet. */
  measurement: string;
  /** The signed artefact behind it. */
  evidence: string;
  /** Where that artefact is filed. */
  retrieval: string;
  /** Who signed it. */
  signatory: string;
  /** Their qualification on record. */
  competency: string;
  /** Whether the signed evidence is actually filed. */
  filed: "filed" | "pending" | "not_signed";
}

export interface CitedFact {
  id: string;
  label: string;
  value: string;
  /** Optional unit rendered in the mono face. */
  unit?: string;
  provenance: Provenance;
  evidence?: EvidenceChain;
  /**
   * True when the value is re-read from the system of record at the
   * moment the overlay opens, rather than served from a cached copy.
   * IPV has no IoT/SCADA path; this is a live business-system read.
   */
  liveRead?: boolean;
  /** Clock at which a live value was read, for display. */
  readAt?: string;
  /** Emphasis in the panel. */
  tone?: "default" | "warn" | "crit";
}

export interface Zone {
  id: string;
  /** Display code, e.g. "Z-01". */
  code: string;
  name: string;
  description: string;
  /** Minimum tier required to receive this zone's geometry at all. */
  rbac_tier: RbacTier;
  /** Axis-aligned bounds in scene units: [minX, minY, minZ, maxX, maxY, maxZ]. */
  bbox: [number, number, number, number, number, number];
  /** Reported tile size, so the manifest reads like a real manifest. */
  tile_bytes: number;
  /** Hash of the published manifest entry. */
  manifest_hash: string;
  /** Scene version this zone was published at. */
  scene_version: string;
  /**
   * Why a zone is restricted, when it is. Drawn from the real
   * security-features exclusion list that governs capture.
   */
  restriction_reason?: string;
}

export type AssetClass =
  | "safety_relief_valve"
  | "gate_valve"
  | "globe_valve"
  | "butterfly_valve"
  | "non_return_valve"
  | "knife_gate_valve"
  | "centrifugal_pump"
  | "slurry_pump"
  | "submersible_pump"
  | "actuator"
  | "strainer"
  | "vessel"
  | "oil_cooler"
  | "motor_control_centre";

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  safety_relief_valve: "Safety relief valve",
  gate_valve: "Gate valve",
  globe_valve: "Globe valve",
  butterfly_valve: "Butterfly valve",
  non_return_valve: "Non-return valve",
  knife_gate_valve: "Knife gate valve",
  centrifugal_pump: "Centrifugal pump",
  slurry_pump: "Slurry pump",
  submersible_pump: "Submersible pump",
  actuator: "Electric actuator",
  strainer: "Strainer",
  vessel: "Pressure vessel",
  oil_cooler: "Oil cooler",
  motor_control_centre: "Motor control centre",
};

/**
 * A machine in the client's system of record.
 *
 * `tag` follows the KKS / AKZ plant designation convention used across
 * South African power and process plant:
 *
 *   10  HAD  10   AA   601
 *   |   |    |    |    +-- sequence within class
 *   |   |    |    +------- equipment class (AA fitting/valve, AP pump, CF flow)
 *   |   |    +------------ subsystem / train
 *   |   +----------------- system code
 *   +--------------------- unit number
 *
 * KKS is an open international standard, so the shape is authentic
 * without reproducing anyone's asset register.
 */
export interface Machinery {
  id: string;
  tag: string;
  description: string;
  asset_class: AssetClass;
  /** Fictional make. Deliberately a mixed fleet — that is the argument. */
  make: string;
  model: string;
  /** Unique traceability number stamped on the body. */
  serial: string;
  zone_id: string;
  /** Facts rendered in the overlay, each individually cited. */
  facts: CitedFact[];
  /** Governing procedures and forms. */
  governing_docs: string[];
  /** Open deviation ids. */
  deviations: string[];
  /** Setpoint block, present on pressure-relief devices. */
  setpoint?: SetpointBlock;
}

/**
 * Safety-valve setpoint and blowdown data.
 * Shape follows a real valve register: design pressure with lift and
 * reset bands, blowdown expressed both absolutely and as a percentage.
 */
export interface SetpointBlock {
  design_mpa: number;
  lift_max: number;
  lift_min: number;
  reset_max: number;
  reset_min: number;
  blowdown_mpa_max: number;
  blowdown_mpa_min: number;
  blowdown_pct_max: number;
  blowdown_pct_min: number;
  /** e.g. "±3% online (Trevi)", "±5% ASME Section I". */
  tolerance_note: string;
  governing_standard: string;
}

export type RootCause5M = "Man" | "Method" | "Material" | "Machine" | "Money";

export interface Deviation {
  id: string;
  /** Centrally issued NCR number. */
  ncr_number: string;
  raised_on: string;
  originator: string;
  department: string;
  description: string;
  risk_rating: "High" | "Medium" | "Low";
  root_cause: RootCause5M;
  immediate_action: string;
  corrective_action: string | null;
  status: "Open" | "Under review" | "Closed out";
  /** Which downstream activity this NCR blocks until closed out. */
  blocks: string | null;
  provenance: Provenance;
}

export interface GoverningDoc {
  id: string;
  /** e.g. "RPL-WI-O-9". */
  code: string;
  title: string;
  revision: number;
  issued: string;
  next_review: string;
  /** Standards this procedure satisfies. */
  satisfies: string[];
  /** Forms generated under it. */
  forms: { code: string; title: string }[];
}

/* ================================================================
   CLOSED SETS (D-19)

   Every closed set this project's later phases key off, defined
   exactly once, here. Each is a string-literal union with a typed
   member array beside it, following `RbacTier`/`RBAC_ORDER` above and
   `lib/copy/governed.ts`'s `GovernedKey`/`GOVERNED` shape. Never a
   TypeScript enum, for the reason stated at the top of this file.
   ================================================================ */

/**
 * D-05: the seed's eight observation kinds plus two additions.
 * `isolation_present` and `gauge_obscured` exist because the ap003
 * and gs001 isolation rows and the as001 fogged-gauge row have no
 * honest fit among the seed's original eight.
 */
export type ObservationKind =
  | "corrosion_visible"
  | "gland_weep"
  | "guard_damaged"
  | "seal_absent"
  | "leak_evidence"
  | "label_illegible"
  | "fixing_missing"
  | "discolouration"
  | "isolation_present"
  | "gauge_obscured";

export const OBSERVATION_KINDS: ObservationKind[] = [
  "corrosion_visible",
  "gland_weep",
  "guard_damaged",
  "seal_absent",
  "leak_evidence",
  "label_illegible",
  "fixing_missing",
  "discolouration",
  "isolation_present",
  "gauge_obscured",
];

/**
 * D-12: deliberately not `ExtractionGrade`, so the grade meaning *the
 * record states this* cannot be constructed on an authored
 * observation.
 */
export type ObservationGrade = "INFERRED" | "AMBIGUOUS";

export const OBSERVATION_GRADES: ObservationGrade[] = ["INFERRED", "AMBIGUOUS"];

export type ObservationRelation = "evidence" | "context";

export const OBSERVATION_RELATIONS: ObservationRelation[] = ["evidence", "context"];

export type ArtisanTrade = "millwright" | "electrician" | "boilermaker";

export const ARTISAN_TRADES: ArtisanTrade[] = [
  "millwright",
  "electrician",
  "boilermaker",
];

/**
 * RESEARCH Pitfall 3: EXPERIENCE.md's `decided, pending` row is a
 * rendering state derived from an open proposal with a pending
 * decision, never a fifth member here.
 */
export type ProposalState = "open" | "accepted" | "rejected" | "superseded";

export const PROPOSAL_STATES: ProposalState[] = [
  "open",
  "accepted",
  "rejected",
  "superseded",
];

export type ReconciledState = "recorded" | "pending" | "conflict" | "rejected";

export const RECONCILED_STATES: ReconciledState[] = [
  "recorded",
  "pending",
  "conflict",
  "rejected",
];

export type QueueItemState =
  | "queued"
  | "sending"
  | "recorded"
  | "conflict"
  | "rejected"
  | "discarded";

export const QUEUE_ITEM_STATES: QueueItemState[] = [
  "queued",
  "sending",
  "recorded",
  "conflict",
  "rejected",
  "discarded",
];

/**
 * `referral_evidence_missing` has no sentence yet — P9 supplies it.
 * AD-9's `already_open` and `not_open` join this set in P4.
 */
export type ConflictCode =
  | "order_not_found"
  | "order_closed"
  | "asset_not_in_order"
  | "account_mismatch"
  | "proposal_superseded"
  | "already_recorded_differently"
  | "clock_skew"
  | "referral_evidence_missing";

export const CONFLICT_CODES: ConflictCode[] = [
  "order_not_found",
  "order_closed",
  "asset_not_in_order",
  "account_mismatch",
  "proposal_superseded",
  "already_recorded_differently",
  "clock_skew",
  "referral_evidence_missing",
];

/**
 * `unknown_referral` has no sentence yet either — same P9 note as
 * `referral_evidence_missing` above.
 */
export type RejectCode =
  | "bad_shape"
  | "media_too_large"
  | "unknown_kind"
  | "unknown_proposal"
  | "unknown_referral"
  | "store_evicted";

export const REJECT_CODES: RejectCode[] = [
  "bad_shape",
  "media_too_large",
  "unknown_kind",
  "unknown_proposal",
  "unknown_referral",
  "store_evicted",
];

export type ReferralResolution = "pending" | "resolved" | "unresolved";

export const REFERRAL_RESOLUTIONS: ReferralResolution[] = [
  "pending",
  "resolved",
  "unresolved",
];

export type SyncItemKind =
  | "order_open"
  | "order_close"
  | "capture"
  | "decision"
  | "referral";

export const SYNC_ITEM_KINDS: SyncItemKind[] = [
  "order_open",
  "order_close",
  "capture",
  "decision",
  "referral",
];

/**
 * AD-18: the emitted set is enumerated beside the type. No breaking
 * change has shipped, so each kind emits exactly one schema version
 * so far.
 */
export const SYNC_ITEM_SCHEMA_VERSIONS: Record<SyncItemKind, readonly number[]> = {
  order_open: [1],
  order_close: [1],
  capture: [1],
  decision: [1],
  referral: [1],
};
