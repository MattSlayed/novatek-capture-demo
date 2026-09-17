/* ================================================================
   AUTHORED PROPOSALS AND THEIR DERIVED IDENTITY (AD-5, AD-8,
   REQ-FR-21, REQ-FR-27)

   This module carries two separate concerns, kept apart on purpose:
   the authored content below (declared over exactly
   `(assetId, fixtureSet)`, the same discipline lib/verify/authored.ts
   follows for AD-8) and the derived identity (an HMAC over three
   ids, AD-5). The id derivation never folds into the content
   function's parameter list, because that parameter list is the
   very thing a later build rule checks by reading this file's own
   source.

   AD-5's whole mechanism: a proposal's id is never minted and stored
   for later lookup. It is re-derived, on every decision, from three
   inputs the decision item itself supplies — the session's own
   account plus the envelope's client id and the observation id — and
   compared. Nothing about validating a decision reads the store.
   That is what lets any server instance validate any proposal id
   without having issued it and without asking another instance:
   there is nothing to ask, because there is nothing kept. A decision
   landing on an instance that never issued the proposal has every
   input it needs already in the request, re-derives the same digest
   an issuing instance would have derived, and either matches or does
   not — with no "restarted" message anywhere for the artisan to see.

   The consequence this buys for REQ-FR-27: a fabricated id and a
   valid id belonging to a different account both fail at the same
   re-derive-and-compare step, before any state is read. There is no
   second path that could tell them apart, because there is only one
   path.

   Field separator: the three inputs below are joined with a NUL byte
   (\u0000), never a printable character. Account ids and client ids
   are controlled formats in this project (acc-<surname>, a UUID) so
   a plain separator would be safe in practice today, but a NUL byte
   cannot appear in either format even by accident, so this costs
   nothing and removes the question entirely.

   Pattern: ../ipv-demo/lib/rbac/manifest.ts lines 86-128
   (signZone/verifyZoneSignature) — the HMAC-then-length-guard-then-
   timingSafeEqual shape below is that pattern, unchanged.
   ================================================================ */

import { createHmac, timingSafeEqual } from "node:crypto";
import { OBSERVATIONS_BY_ASSET } from "../data/observations.ts";
import { DEVIATION_BY_ID, MACHINERY_BY_ID } from "../data/plant.ts";
import { FIXTURE_VERSION } from "../data/fixtures.ts";
import { signingKey } from "../session/key.ts";
import type {
  AuthoredObservation,
  CitedFact,
  Deviation,
  ObservationProvenance,
  Proposal,
} from "../data/types";

/**
 * Thrown when an observation's drawn_from resolves to neither a
 * deviation nor one of its own asset's cited facts. Every cited
 * record must resolve to a real fixture record (REQ-FR-20); the
 * shipped fixtures already prove this holds, at build time, so
 * reaching this at runtime means a later fixture edit broke that
 * proof — a guard against that future edit, not a path any of
 * today's rows takes.
 */
export class UnknownCitedRecordError extends Error {
  constructor(observationId: string, drawnFrom: string) {
    super(
      `Observation "${observationId}" cites "${drawnFrom}", which resolves to no deviation and no fact on its own asset.`,
    );
    this.name = "UnknownCitedRecordError";
  }
}

/**
 * asset_id, observation_id, observation and provenance all come
 * straight through from Proposal — Proposal.observation_id is not
 * restated here, it is simply not omitted. id, capture_id, order_id,
 * issued_at and state are all attributes of the request and the
 * record a route attaches after calling authoredProposals() below,
 * never of the authored content itself.
 */
export type AuthoredProposal = Omit<
  Proposal,
  "id" | "capture_id" | "order_id" | "issued_at" | "state"
>;

/**
 * Resolves an observation's drawn_from first against DEVIATION_BY_ID,
 * then against the facts array of the observation's own asset —
 * never any other asset's facts, since every fact-cited observation
 * in this fixture set cites a fact on its own asset. Throws
 * UnknownCitedRecordError when it resolves to neither, rather than
 * falling back to anything: a silent fallback is the one thing this
 * preview may not do here.
 */
function resolveCitedRecord(
  assetId: string,
  observationId: string,
  drawnFrom: string,
): Deviation | CitedFact {
  const deviation = DEVIATION_BY_ID.get(drawnFrom);
  if (deviation) return deviation;

  const machinery = MACHINERY_BY_ID.get(assetId);
  const fact = machinery?.facts.find((candidate) => candidate.id === drawnFrom);
  if (fact) return fact;

  throw new UnknownCitedRecordError(observationId, drawnFrom);
}

/**
 * Every step here carries its own reason, because none of it is
 * arbitrary:
 *  - source_uri, source_version, extracted_at, source_label and
 *    system_of_record all come from the cited record's own
 *    provenance, unchanged — a proposal card names the record an
 *    observation was drawn from, and that name comes from the
 *    record, not from this module.
 *  - confidence is null and extractor is "authored": no model ran,
 *    and this is the only value either field is ever given here.
 *  - grade comes from the observation's own grade field, never the
 *    cited record's. An authored observation is an inference the
 *    record supports (INFERRED) or a context it situates (AMBIGUOUS)
 *    — never an extraction — so its grade describes the inference
 *    drawn from the record, while the cited record's own grade
 *    (typically EXTRACTED) describes the record itself, a different
 *    fact entirely.
 */
function composeProvenance(
  assetId: string,
  observation: AuthoredObservation,
): ObservationProvenance {
  const cited = resolveCitedRecord(assetId, observation.id, observation.drawn_from);
  return {
    source_uri: cited.provenance.source_uri,
    source_version: cited.provenance.source_version,
    extracted_at: cited.provenance.extracted_at,
    source_label: cited.provenance.source_label,
    system_of_record: cited.provenance.system_of_record,
    confidence: null,
    extractor: "authored",
    grade: observation.grade,
  };
}

/**
 * The authored content half of this module (AD-8): a function of
 * the asset record and the fixture snapshot in force, and of
 * nothing else — the same declared-inputs discipline
 * lib/verify/authored.ts's authoredMatch() follows. Exactly two
 * parameters, assetId and fixtureSet. Returns one entry per row
 * OBSERVATIONS_BY_ASSET holds for this asset when fixtureSet matches
 * the live version, and an honest empty array — never a throw — when
 * the asset has no row or the fixture set does not match.
 */
export function authoredProposals(assetId: string, fixtureSet: string): AuthoredProposal[] {
  if (fixtureSet !== FIXTURE_VERSION) return [];

  const observations = OBSERVATIONS_BY_ASSET.get(assetId);
  if (!observations) return [];

  return observations.map((observation) => ({
    asset_id: assetId,
    observation_id: observation.id,
    observation: observation.wording,
    provenance: composeProvenance(assetId, observation),
  }));
}

/**
 * AD-5's id: one bare HMAC-SHA256 digest over the three inputs a
 * decision must supply, base64url-encoded. No half carries anything
 * else, no "." join, nothing encoded into the id that could be read
 * back out of it — a holder of this string learns nothing from it
 * beyond what it already sent to receive it.
 */
export function deriveProposalId(accountId: string, clientId: string, observationId: string): string {
  return createHmac("sha256", signingKey())
    .update(`${accountId}\u0000${clientId}\u0000${observationId}`)
    .digest("base64url");
}

/**
 * Re-derives from the same three inputs the caller supplies — never
 * reading a stored id — and compares under a constant-time
 * comparison behind an explicit length guard, so a length mismatch
 * returns false rather than reaching timingSafeEqual, which throws
 * on mismatched buffer lengths. This never inspects candidate for
 * structure: a digest has none to inspect, so there is no decoder
 * for one anywhere in this file. A malformed candidate and a
 * well-formed-but-wrong one both fail here, by the identical path.
 */
export function proposalIdMatches(candidate: string, accountId: string, clientId: string, observationId: string): boolean {
  const expected = Buffer.from(deriveProposalId(accountId, clientId, observationId));
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
