import "server-only";

/* ================================================================
   REGISTER (AD-7; D-16)

   The tag-to-asset resolution table a referral resolves against. In
   production this is the customer's system of record — validating a
   tag on a device would demonstrate a capability production does not
   have, so this table is unreachable from any client bundle. That is
   enforced, not intended: `import "server-only"` above is Next's own
   compiler-level marker (reproduced transitively against this
   repository's own Turbopack build), and scripts/check-register-
   isolation.mjs independently walks the source import graph and scans
   the built client bundle for the sentinel below, wired into
   `npm run verify` so neither layer can be skipped (D-17).

   The table exposes nothing beyond the resolution itself: no zone, no
   work order, no assignment, nothing about what came before (D-16). It
   covers the whole copied plant subset, `m-aa605` included, over the
   eleven records `lib/data/plant.ts` already defines.

   Nothing in this phase imports this module. `lib/access/register.ts`
   and the resolver it exposes, along with `POST /api/referrals`, are
   P9's — this phase ships the table only.
   ================================================================ */

import { MACHINERY } from "./plant.ts";

/** A register entry is not one of D-18's copied names and is read by
    exactly one module, so it is declared here rather than in
    types.ts. */
interface RegisterEntry {
  tag: string;
  asset_id: string;
  registry: string;
}

/**
 * Present nowhere else in the repository. Carried on every
 * REGISTER_ENTRIES row (not just declared once) so the literal is
 * reachable from the table's own data and a bundler cannot drop the
 * sentinel while keeping the data around it.
 *
 * scripts/check-register-isolation.mjs's bundle mode asserts this
 * string is absent from every file under `.next/static/**`. What that
 * scan proves: this module's own strings did not reach a client
 * chunk. What it cannot prove: that some future module which copies
 * only part of this table — rather than importing it — didn't carry
 * the data across without carrying this literal. That gap is accepted
 * and covered instead by the source import-graph walk and by
 * `server-only` itself (T-2-16).
 */
export const REGISTER_SENTINEL = "__CAPTURE_REGISTER_SENTINEL__";

/** One entry per machinery record in plant.ts, built from MACHINERY
    itself so the register cannot silently disagree with the plant. */
export const REGISTER_ENTRIES: RegisterEntry[] = MACHINERY.map((m) => ({
  tag: m.tag,
  asset_id: m.id,
  registry: REGISTER_SENTINEL,
}));

export const REGISTER_BY_TAG = new Map(REGISTER_ENTRIES.map((e) => [e.tag, e]));
