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
 * `not_open` landed in P3 under D-06, with its sentence and next act
 * defined in `lib/copy/conflicts.ts`. AD-9's `already_open` remains on
 * its stated P4 schedule — no code for it is introduced in this
 * phase. `referral_evidence_missing` still has no sentence until P9.
 */
export type ConflictCode =
  | "order_not_found"
  | "order_closed"
  | "not_open"
  | "asset_not_in_order"
  | "account_mismatch"
  | "proposal_superseded"
  | "already_recorded_differently"
  | "clock_skew"
  | "referral_evidence_missing";

export const CONFLICT_CODES: ConflictCode[] = [
  "order_not_found",
  "order_closed",
  "not_open",
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

/* ================================================================
   ENTITY TYPES (D-18)

   The seed's new types, following its own §Data model shape and
   referencing the closed sets above by name. `lib/data` imports
   nothing from `lib/store`, `lib/reconcile` or `lib/access` (D-DEP,
   D-20).
   ================================================================ */

/**
 * D-20 / AD-2: `rbac_tier` is a display-only attribute. No function
 * under `lib/data` reads it, and no later access decision may — the
 * work order is the only authorisation (FR-57).
 */
export interface Artisan {
  id: string;
  name: string;
  trade: ArtisanTrade;
  competency: string;
  employee_no: string;
  rbac_tier: RbacTier;
}

export interface Session {
  sid: string;
  account_id: string;
  issued_at: string;
  expires_at: string;
}

/**
 * `id` (the internal `wo-NNNN` id) and `number` (the display
 * `WO-2026-NNNN` string) are two different strings and are never
 * conflated.
 */
export interface WorkOrder {
  id: string;
  number: string;
  title: string;
  description: string;
  assigned_to: string;
  zone_id: string;
  asset_ids: string[];
  governing_docs: string[];
  priority: string;
  raised_on: string;
  due_by: string;
  status: "assigned" | "in_progress" | "closed";
  provenance: Provenance;
}

/** Server-only: `observation_ids` is stripped from responses. */
export type OrderAsset = Machinery & { observation_ids: string[] };

/**
 * `drawn_from` is a bare record id, not a `Provenance` tuple:
 * Claude's Discretion, resolved to the bare id because the resolver
 * test checks one string and because the full `ObservationProvenance`
 * tuple is composed from the cited record's own provenance by the
 * P3/P5 module. The id space is a `CitedFact` id or a `Deviation`
 * `id` and nothing else (D-09).
 */
export interface AuthoredObservation {
  id: string;
  asset_id: string;
  kind: ObservationKind;
  wording: string;
  grade: ObservationGrade;
  drawn_from: string;
  relation: ObservationRelation;
}

/** AD-8: authored results declare exactly (assetId, fixtureSet). */
export type ObservationProvenance = Omit<
  Provenance,
  "confidence" | "extractor_hash"
> & {
  confidence: null;
  extractor: "authored";
};

/**
 * AD-13: the thumbnail's byte cap is a bounded quantity that lives in
 * `lib/limits` in P3 — no number appears here.
 */
export interface Capture {
  id: string;
  order_id: string;
  asset_id: string;
  kind: "photo" | "voice";
  purpose: "verify" | "evidence";
  captured_at: string;
  mime: string;
  bytes: number;
  sha256: string;
  duration_ms?: number;
  thumb?: string;
  captured_by: string | null;
  recorded_at: string;
}

/**
 * `label` is typed as `GovernedKey`, which is what makes the
 * `GovernedKey` import load-bearing: the sentence is resolved through
 * `GOVERNED` at render time and never restated here.
 */
export interface VerificationResult {
  capture_id: string;
  asset_id: string;
  outcome: "matched" | "pending";
  matched_tag: string | null;
  matched_serial: string | null;
  method: "authored";
  confidence: null;
  label: GovernedKey;
  verified_at: string;
}

/**
 * AD-5: `Proposal.id` is the HMAC over the account, the capture
 * envelope's client id and the observation id, so the decision item
 * must carry `capture_client_id` plus `observation_id` for any
 * instance to reconstruct that triple and re-derive without reading
 * the store. A client can only send back an observation id the server
 * told it, and `observation_id` below is where it is told.
 *
 * This deliberately does not widen the plural, server-only id list
 * carried on `OrderAsset` (stripped from every response): that list
 * names observations the artisan has not been shown, whereas an
 * issued proposal already carries its observation's full wording, and
 * naming that observation's id discloses nothing further. It also
 * adds nothing to `Decision`, whose identity pair is a request-time
 * pair consumed at the ownership check and never stored on the
 * record.
 */
export interface Proposal {
  id: string;
  capture_id: string;
  asset_id: string;
  order_id: string;
  observation_id: string;
  observation: string;
  provenance: ObservationProvenance;
  issued_at: string;
  state: ProposalState;
}

/**
 * AD-3: `arrived_via` is server-derived and the client's
 * `decided_where_claimed` is shown as a claim, never as fact;
 * `decided_by` is server-stamped and any body value is ignored.
 * AD-5: decision identity is `capture_client_id` plus
 * `observation_id`.
 */
export interface Decision {
  id: string;
  proposal_id: string;
  outcome: "accept" | "reject";
  decided_at: string;
  decided_where_claimed: "online" | "on_device";
  arrived_via: "immediate" | "queued";
  decided_by: string | null;
  note?: string;
  recorded_at: string;
  device_offset_s: number;
  reconciled: ReconciledState;
  conflict?: ConflictCode;
}

/**
 * A referral has no proposals, no verification, no decision and no
 * `drawn_from`. `typed_tag` is the artisan's own claim, recorded as
 * typed and never overwritten.
 */
export interface Referral {
  id: string;
  order_id: string;
  typed_tag: string | null;
  plate_capture_id: string;
  capture_ids: string[];
  note_capture_id?: string;
  observed_at: string;
  resolution: ReferralResolution;
  resolved_asset_id: string | null;
  flag_id: string | null;
  raised_by: string | null;
  recorded_at: string;
  reconciled: ReconciledState;
}

/**
 * AD-19: a flag records that a person raised something, not that a
 * condition obtains. It carries no grade, no wording about the
 * plant's condition and no provenance tuple, and no operation
 * promotes one.
 */
export interface Flag {
  id: string;
  asset_id: string;
  referral_id: string;
  raised_by: string;
  raised_at: string;
  state: "raised";
}

export interface OrderClock {
  order_id: string;
  account_id: string;
  segments: {
    opened_at: string;
    closed_at: string | null;
    source: "server" | "device_reconciled";
    /**
     * Present only when `source` is `"device_reconciled"`. Retained
     * alongside the measured offset below rather than replacing
     * `opened_at`, because FR-11 says neither silently replaces the
     * other: this is what the device claimed, `opened_at` is what the
     * server recorded. `types.ts` sits outside
     * `check-fixture-hash.mjs`'s `FIXTURE_PATHS` (Phase 2 D-14), so
     * this edit does not move the pinned fixture hash — shape is not
     * content.
     */
    device_claimed_opened_at?: string;
    /**
     * Present only when `source` is `"device_reconciled"`. Named to
     * match the same-named field already carried on `Decision`
     * (naming precedent), so the same quantity carries the same name
     * on both records.
     */
    device_offset_s?: number;
  }[];
  elapsed_s: number;
}

/**
 * AD-18: the emitted set is enumerated beside the type in
 * `SYNC_ITEM_SCHEMA_VERSIONS`. `claimed_account_id` is compared,
 * never trusted.
 */
export interface SyncItem<K> {
  client_id: string;
  kind: SyncItemKind;
  schema_version: number;
  order_id: string;
  created_at: string;
  attempts: number;
  state: QueueItemState;
  claimed_account_id: string;
  payload: K;
  last_result?: SyncItemResult;
}

export interface SyncItemResult {
  client_id: string;
  status: "recorded" | "duplicate" | "conflict" | "rejected";
  code?: ConflictCode | RejectCode;
  detail: string;
  server?: {
    verification?: VerificationResult;
    proposals?: Proposal[];
    decision?: Decision;
    clock?: OrderClock;
  };
}

/**
 * The seed's shape at docs/CAPTURE-PLAN-SEED.md line 216. The fields
 * the P8 route actually populates are P8's concern; this is the
 * shape only.
 */
export interface WalkPayload {
  schema: "novatek.capture.walk/1";
  issued_at: string;
  store: { kind: "memory"; instance: string; ttl_s: number; statement: string };
  account: string;
  order: WorkOrder;
  clock: OrderClock;
  assets: {
    asset_id: string;
    tag: string;
    verification: VerificationResult;
    captures: (Capture & { thumb_present: boolean; audio_left_device: false })[];
    candidate_facts: (Proposal & {
      accepted_by: string | null;
      accepted_at: string | null;
      arrived_via: "immediate" | "queued";
    })[];
    rejected: Proposal[];
    open: Proposal[];
  }[];
  referrals: {
    referral_id: string;
    typed_tag: string | null;
    resolution: ReferralResolution;
    resolved_asset_id: string | null;
    flag_id: string | null;
    captures: Capture[];
    raised_by: string | null;
    observed_at: string;
    recorded_at: string;
    work_proposal: { statement: string; raised_here: false };
  }[];
  redaction: { ran: false; statement: string };
}
