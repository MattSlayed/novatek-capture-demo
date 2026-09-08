/* ================================================================
   ARTISANS

   The three doors the preview's walkthrough runs on: S. Mabaso, K.
   Naidoo and J. van Wyk. Each is an account with an assigned order
   set (D-CONV); none of the three ever leaves their own orders.

   S. Mabaso's name and competency are the same strings as
   `PEOPLE.millwright` in plant.ts — the same person who raised
   NCR-2026-0118. They are written as literals here, not imported
   from plant.ts, so the account's own content sits inside the D-14
   hash; scripts/check-fixture-shape.test.mjs asserts the two agree.

   lib/data imports nothing from lib/store, lib/reconcile or
   lib/access (D-20, D-DEP).
   ================================================================ */

import type { Artisan } from "./types";

/**
 * D-20 / AD-2 / FR-57: `rbac_tier` is carried so a surface can
 * display which tier a person holds, and is read by nothing.
 * Authorisation is decided by work-order assignment alone — never by
 * this field. K. Naidoo carries `site_supervisor` because Z-04 is
 * supervisor-restricted in the inherited plant, and that fact must
 * not become an access rule here or in any later phase.
 */
export const ARTISANS: Artisan[] = [
  {
    id: "acc-mabaso",
    name: "S. Mabaso",
    trade: "millwright",
    competency: "Millwright, Red Seal",
    employee_no: "EMP-4471",
    rbac_tier: "field_technician",
  },
  {
    id: "acc-naidoo",
    name: "K. Naidoo",
    trade: "electrician",
    competency: "Electrician, Trade Tested",
    employee_no: "EMP-4208",
    rbac_tier: "site_supervisor",
  },
  {
    id: "acc-vanwyk",
    name: "J. van Wyk",
    trade: "boilermaker",
    competency: "Boilermaker, Red Seal",
    employee_no: "EMP-4635",
    rbac_tier: "field_technician",
  },
];

export const ARTISAN_BY_ID = new Map(ARTISANS.map((a) => [a.id, a]));

/**
 * D-CONV's assignment boundary: the order ids each artisan is
 * assigned, kept beside the accounts rather than derived, so the
 * assignment plane is readable in one place. orders.ts's own
 * `assigned_to` field is the other direction of this same fact;
 * scripts/check-fixture-shape.test.mjs asserts the two agree.
 */
export const ORDER_IDS_BY_ARTISAN: Record<string, readonly string[]> = {
  "acc-mabaso": ["wo-0142", "wo-0151"],
  "acc-naidoo": ["wo-0137"],
  "acc-vanwyk": ["wo-0129", "wo-0133"],
};
