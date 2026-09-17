/* ================================================================
   ATTRIBUTION — the one producer of every actor field (AD-3)

   Exactly one function turns a verified session into an acting
   account, and every actor field on every record this project ever
   writes — captured_by, decided_by, raised_by, account_id, and any
   field naming who acted — is assigned only from what it returns. A
   build rule joining plan 03-12 asserts no other module makes that
   assignment.

   This module imports nothing from the store, the writer, the
   transport layer or any route: it has no way to see a payload, a
   query string or a transport field, and that absence is the
   mechanism, not a convention someone could accidentally violate.
   ================================================================ */

import type { SessionResult } from "../session/cookie.ts";
import type { Artisan, Session } from "../data/types";
import { ARTISAN_BY_ID } from "../data/artisans.ts";

export type ActingAccount = { account_id: string; artisan: Artisan; session: Session };

/**
 * Derive the acting account from a verified session, or derive
 * nothing at all.
 *
 * The closest sibling shape — a parser that narrows an untrusted
 * string to a closed set by falling back to its safest member — is
 * the shape to invert here, not to copy: this function has no
 * fallback member to fall back to. A session that did not verify,
 * and a verified session naming an id outside the closed set of
 * three accounts, both derive `null`, by the same return, so a
 * caller with no acting account has no path that produces one
 * anyway.
 *
 * The artisan's own tier field travels inside `artisan` because the
 * type is a plain data record, but no line here reads it, and
 * nothing beyond its presence in that record is guaranteed by this
 * function: it is documented display-only at its own definition,
 * and no decision anywhere may treat it otherwise.
 */
export function deriveAccount(result: SessionResult): ActingAccount | null {
  if (!result.ok) return null;
  const artisan = ARTISAN_BY_ID.get(result.session.account_id);
  if (!artisan) return null;
  return {
    account_id: result.session.account_id,
    artisan,
    session: result.session,
  };
}
