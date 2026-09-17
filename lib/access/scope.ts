/* ================================================================
   ACCESS SCOPE — the only authorisation decision (AD-2, FR-57)

   No middleware and no proxy module exist in this codebase — the
   structure check already asserts their absence — and no route
   consults the artisan's display-only tier field (see its own
   definition in lib/data/types.ts) to decide what an account may
   reach. A work order's assignment is the only fact that decides
   that, and this module is the only place that fact is read.

   Every function below takes the session-derived account as a
   non-optional first parameter, so there is no call shape in which
   the account is forgotten, and no call shape in which some other
   value stands in for it.

   Imports are limited to the fixture modules an authorisation
   decision actually needs (artisans, orders, plant, observations,
   their shared types) and the one function that produces an
   account. Nothing here reaches the store, the writer or the
   transport layer, and nothing here reaches the server-only lookup
   module P9 introduces for referral resolution — a build rule
   already fails the run if this file ever does.
   ================================================================ */

import type { ActingAccount } from "../attribution/index";
import type { WorkOrder, OrderAsset } from "../data/types";
import { ORDER_IDS_BY_ARTISAN } from "../data/artisans.ts";
import { ORDER_BY_ID } from "../data/orders.ts";
import { MACHINERY_BY_ID } from "../data/plant.ts";
import { OBSERVATIONS_BY_ASSET } from "../data/observations.ts";

/**
 * The only lookup of an account's order set anywhere in this
 * codebase. An id that does not resolve in ORDER_BY_ID is dropped
 * rather than surfaced — defensive only, since every id the fixture
 * assigns resolves today — and never throws for an account outside
 * the closed set of three: it simply has nothing assigned.
 */
export function ordersFor(account: ActingAccount): WorkOrder[] {
  const orderIds = ORDER_IDS_BY_ARTISAN[account.account_id] ?? [];
  const orders: WorkOrder[] = [];
  for (const id of orderIds) {
    const order = ORDER_BY_ID.get(id);
    if (order) orders.push(order);
  }
  return orders;
}

/**
 * Resolve ownership before existence. If `orderId` is not among the
 * ids this account is assigned, return null immediately — never
 * touching the order lookup at all. Only once ownership is proven is
 * the record itself resolved, again returning null if it is somehow
 * absent.
 *
 * An unowned id and a fabricated id must take the identical path:
 * the way to guarantee that is to answer the ownership question
 * before the existence question is ever asked, not to answer both
 * and compare notes afterward.
 */
export function orderOwned(account: ActingAccount, orderId: string): WorkOrder | null {
  const orderIds = ORDER_IDS_BY_ARTISAN[account.account_id] ?? [];
  if (!orderIds.includes(orderId)) return null;
  return ORDER_BY_ID.get(orderId) ?? null;
}

/**
 * Membership only, nothing else. This takes an order rather than an
 * account because the caller has already proven ownership of that
 * order via orderOwned() above; it is not a second place ownership
 * is decided, and it must never become one.
 */
export function assetInOrder(order: WorkOrder, assetId: string): boolean {
  return order.asset_ids.includes(assetId);
}

/**
 * Resolve each of an order's assets and attach the observation ids
 * authored against it. observation_ids is server-only: the route
 * that serialises a response strips it before it ships, never this
 * function mutating the fixture record itself. An asset id with no
 * authored observations gets an empty array, never a skipped entry —
 * absence of an observation is not absence of the asset.
 */
export function assetsForOrder(order: WorkOrder): OrderAsset[] {
  const assets: OrderAsset[] = [];
  for (const assetId of order.asset_ids) {
    const machinery = MACHINERY_BY_ID.get(assetId);
    if (!machinery) continue;
    const observations = OBSERVATIONS_BY_ASSET.get(assetId) ?? [];
    assets.push({
      ...machinery,
      observation_ids: observations.map((observation) => observation.id),
    });
  }
  return assets;
}
