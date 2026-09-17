/* ================================================================
   AUTHORED VERIFICATION ANSWER — the whole of the verification
   answer (AD-8, REQ-FR-17)

   This module exists to make AD-8's claim true: nothing a device
   sends when an artisan photographs or speaks at an asset is a
   parameter here, nor reachable from here by any path. Differing
   images, a missing preview image and a solid-colour preview image
   all produce byte-identical results by construction, because none
   of that ever arrives as an argument to authoredMatch() below —
   there is no third parameter through which it could.

   No model runs anywhere in this file. No line in this file sets
   confidence to anything but null.

   VerificationResult's excluded fields — the record's own id and its
   verified-at timestamp — are attached by the route that calls this
   function, once it returns, not by this function. They are facts
   about the request an artisan made (which capture prompted this
   answer, and when the server produced it), and admitting either as
   a parameter here would give an authored answer a value that varies
   with that request — exactly what AuthoredMatch's Omit rules out.
   ================================================================ */

import { MACHINERY_BY_ID } from "../data/plant.ts";
import { FIXTURE_VERSION } from "../data/fixtures.ts";
import type { VerificationResult } from "../data/types";
import type { GovernedKey } from "../copy/governed";

/** The one key this module's answer is ever labelled with. Resolved
    through GOVERNED at render time (AD-12) — the sentence itself is
    never restated here, only its key. */
const LABEL: GovernedKey = "authoredVerification";

/**
 * capture_id and verified_at are the two VerificationResult fields a
 * calling route attaches once authoredMatch() below returns — see
 * the header comment for why neither is a parameter or a return
 * field of this module.
 */
export type AuthoredMatch = Omit<VerificationResult, "capture_id" | "verified_at">;

function pending(assetId: string): AuthoredMatch {
  return {
    asset_id: assetId,
    outcome: "pending",
    matched_tag: null,
    matched_serial: null,
    method: "authored",
    confidence: null,
    label: LABEL,
  };
}

/**
 * The whole of the verification answer (AD-8): a function of the
 * asset record and the fixture snapshot in force, and of nothing
 * else. Exactly two parameters, assetId and fixtureSet — a build
 * rule reads this file's own source to assert both the count and the
 * names, so neither may be renamed and a third may never be added.
 */
export function authoredMatch(assetId: string, fixtureSet: string): AuthoredMatch {
  const machinery = MACHINERY_BY_ID.get(assetId);

  // An asset outside the fixture set is an honest pending, not an
  // error: the route decides whether the asset was even on the
  // artisan's order before it ever calls here, and this function
  // only ever answers whether the fixture set itself knows the id.
  if (!machinery) return pending(assetId);

  // AD-6 binds a decision to a fixture version: an item queued under
  // an older snapshot is matched against the snapshot it names, or
  // not at all. A fixture-set mismatch is pending regardless of
  // whether the asset itself resolves.
  if (fixtureSet !== FIXTURE_VERSION) return pending(assetId);

  return {
    asset_id: assetId,
    outcome: "matched",
    matched_tag: machinery.tag,
    matched_serial: machinery.serial,
    method: "authored",
    confidence: null,
    label: LABEL,
  };
}
