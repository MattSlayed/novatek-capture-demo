/* ================================================================
   GET /api/orders — the artisan's own order list (FR-4, FR-57)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — reading the
   session cookie already makes this handler dynamic by construction.

   FR-4's negative set — an account value arriving as a query
   parameter, as a body field, or as a dedicated account-naming
   header — has no reader here, not a guard against one: this handler
   never reads the request URL's own query string, never reads a
   request body (it is a GET), and never reads any request header
   beyond the one the session accessor already reads for itself.
   There is nowhere for any of those three values to arrive, which is
   what the acceptance check asserts by absence rather than by a
   defended-against case.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail } from "../../../lib/http/respond.ts";
import { readSession } from "../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../lib/attribution/index.ts";
import { noteContact } from "../../../lib/reconcile/apply.ts";
import { ordersFor } from "../../../lib/access/scope.ts";
import { readClocksForAccount } from "../../../lib/store/memory.ts";

export async function GET(request: NextRequest) {
  const account = deriveAccount(readSession(request));
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  const orders = ordersFor(account);
  const clocks = readClocksForAccount(account.account_id);

  return ok(
    { orders, clocks },
    {
      headers: {
        "X-CAP-Orders": String(orders.length),
        "X-CAP-Account": account.account_id,
      },
    },
  );
}
