/* ================================================================
   GET/POST /api/hours — accrued time, server-derived only
   (FR-10, FR-58, D-08)

   No `runtime` or `dynamic` export on GET, for the same reason as
   every other route in this phase (03-RESEARCH.md Pitfall 1) —
   reading the session cookie already makes it dynamic by
   construction. Neither handler in this file needs next/server's
   Dynamic API that app/api/health/route.ts calls as its own first
   statement: GET already reads the cookie, and a POST handler is
   never eligible for build-time caching in the first place —
   RESEARCH.md's own Context7 lookup confirms the static/dynamic
   caching question only ever applies to GET.

   GET takes no query parameter and no body — there is nothing for a
   caller to read this route's own accrued values from except the
   session cookie identifying whose record to serve. FR-10's "no
   write route accepts an artisan-supplied duration or hour value"
   holds here for lack of any reader at all: this handler has no
   parameter an hour figure could arrive through, and none of
   lib/reconcile/validate.ts's field enumerations carry elapsed_s,
   hours or duration_s for the same reason — accrued time is a sum
   the server computes from segments it stamped itself, never a
   value a request supplies.

   POST's whole body is a refusal, written by hand rather than left
   to Next's own framework-level 405: that auto-response is generated
   before application code ever runs, carries none of this project's
   universal headers and a plain-text body, and would satisfy curl
   check G's status code while quietly violating NFR-F1
   (03-RESEARCH.md Pitfall 2). No session is read for it — HTTP
   method negotiation precedes identity, and nothing in this phase's
   requirements exercises an authenticated POST here, so the refusal
   does not differ between a signed-in and a signed-out caller.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail } from "../../../lib/http/respond.ts";
import { readSession } from "../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../lib/attribution/index.ts";
import { noteContact } from "../../../lib/reconcile/apply.ts";
import { readClocksForAccount } from "../../../lib/store/memory.ts";

export async function GET(request: NextRequest) {
  const account = deriveAccount(readSession(request));
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  // FR-58: every segment, its source, and — where present — the
  // device-claimed start and the measured offset, withheld nothing.
  // This route is the reason FR-58 exists, and a filtered view here
  // would be the one dishonest thing it could do.
  //
  // D-08: a segment opened under an earlier, now-ended session is
  // still here and still accruing, because the clock is keyed by
  // order and account, never by session id — re-entry as the same
  // persona resumes it, and nothing about DELETE /api/session or
  // cookie expiry ever touches this record.
  const clocks = readClocksForAccount(account.account_id);
  return ok({ clocks });
}

export async function POST() {
  // See this file's own header comment for why this is hand-written
  // rather than left to Next's framework-level default, and why no
  // session is read before answering.
  return fail("method_not_allowed");
}
