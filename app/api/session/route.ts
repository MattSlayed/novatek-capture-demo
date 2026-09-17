/* ================================================================
   POST/GET/DELETE /api/session — the persona door (FR-1, FR-2, FR-3)

   POST mints a stateless credential from a chosen persona; GET
   answers which account a live credential names; DELETE clears the
   credential unconditionally. No `runtime` or `dynamic` export here,
   for the same reason as every other route in this phase
   (03-RESEARCH.md Pitfall 1) — reading or clearing the credential
   already makes every one of these handlers dynamic by construction.

   Every field the body carries is dropped at parse except
   `persona_id`, via `pick()` against `ACCEPTED_BODY_FIELDS.session`:
   no other value the body names is echoed in the response or
   persisted anywhere (FR-1). An unknown persona id — including one
   that never arrived as a string at all — resolves nothing in
   `ARTISAN_BY_ID` and is refused identically.

   The cookie is read and cleared inside each handler with the
   handler's own request object, never in a shared module-level
   helper and never in a routing-middleware file — this project has
   neither a `proxy.ts` nor a `middleware.ts`, and this phase adds
   neither.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail, setCookie } from "../../../lib/http/respond.ts";
import {
  mintSession,
  readSession,
  sessionCookieOptions,
  clearedSessionCookieOptions,
} from "../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../lib/attribution/index.ts";
import { noteContact } from "../../../lib/reconcile/apply.ts";
import { ARTISAN_BY_ID } from "../../../lib/data/artisans.ts";
import { pick, ACCEPTED_BODY_FIELDS } from "../../../lib/reconcile/validate.ts";

export async function POST(request: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return fail("bad_request");
  }

  // A body that parsed but is not itself a plain object (an array, a
  // string, a bare number, null) has no own property pick() could
  // ever find — treated the same as an empty body, never a crash.
  const raw: Record<string, unknown> =
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const body = pick(raw, ACCEPTED_BODY_FIELDS.session);
  const personaId = typeof body.persona_id === "string" ? body.persona_id : "";

  const artisan = ARTISAN_BY_ID.get(personaId);
  if (!artisan) {
    return fail("unknown_persona");
  }

  const { session, value } = mintSession(artisan.id);
  const response = ok(
    { account: artisan, session },
    { status: 201, headers: { "X-CAP-Account": artisan.id } },
  );
  return setCookie(response, sessionCookieOptions(value));
}

export async function GET(request: NextRequest) {
  const account = deriveAccount(readSession(request));
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);
  return ok(
    { account: account.artisan },
    { headers: { "X-CAP-Account": account.account_id } },
  );
}

export async function DELETE() {
  // FR-3's stated limitation, in the same words lib/session/cookie.ts
  // states it at its own definition: this credential is stateless, so
  // a copied value keeps verifying until the expiry written inside it
  // arrives — nothing here revokes one early. Clearing is therefore
  // unconditional: there is no server-side record to invalidate,
  // whether or not the incoming credential was itself still valid.
  //
  // D-08: no clock segment is touched here. A running segment
  // survives the end of a session and ends only when an explicit
  // order-close write arrives from the same account — this handler
  // must never be "tidied" into closing one.
  const response = ok(null, { status: 204 });
  return setCookie(response, clearedSessionCookieOptions());
}
