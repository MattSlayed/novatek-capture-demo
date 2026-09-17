/* ================================================================
   RESPOND — the only module that builds a framework response (AD-11)

   Every response this phase ever sends is built here, and nowhere
   else. State the consequence plainly: if any route hand-writes its
   own 404 instead of calling notFound() below, AD-4's byte-identity
   guarantee is void by construction, not by bug — there would be a
   second place a not-found response could be assembled, and two
   places can drift apart. Plan 03-12's scripts/check-single-writer.mjs
   asserts no app/api/** file constructs a response object itself;
   this file is the one module the rule excepts.

   This module exports no segment config. It is not a route, and no
   route in this phase exports one either: both of the legacy
   segment-config exports are a hard `next build` error under the
   locked `cacheComponents: true` (Phase 1 D-11, reproduced against
   this repository — 03-RESEARCH.md Pitfall 1).

   Unlike lib/http/contract.ts, this module has a genuine runtime
   dependency on the framework, because building a response requires
   one. That framework import does not resolve under a bare
   `node --test` run, so there is no unit test file beside this one —
   it is proved over HTTP instead, by scripts/server/route-suite.
   proof.mjs (plan 03-13), where every request the suite makes
   asserts the universal set on the response it actually got back.
   The pure half this module depends on (the header table, the
   status map, the error envelope) is already proved by
   lib/http/contract.test.mjs.
   ================================================================ */

import { NextResponse } from "next/server";
import { BOOT_ID } from "../store/memory.ts";
import { UNIVERSAL_HEADERS, HEADER_TABLE, STATUS_BY_CODE, errorBody } from "./contract.ts";
import type { WireErrorCode } from "./contract";

/**
 * Every header name the universal set already carries: the two
 * fixed-value entries from UNIVERSAL_HEADERS (the caching directive
 * and the store-kind header) plus the instance header, which
 * contract.ts leaves out of that object on purpose — its value is
 * this running instance's BOOT_ID, known only here, at request time.
 * No caller-supplied header may share a name with any of these
 * three (ok() and fail() both enforce it below): a route that could
 * override one would make the universal set a suggestion, not a
 * guarantee.
 */
const UNIVERSAL_NAMES: ReadonlySet<string> = new Set([...Object.keys(UNIVERSAL_HEADERS), "X-CAP-Instance"]);

function withUniversalHeaders(extra: Record<string, string>): Record<string, string> {
  return { ...UNIVERSAL_HEADERS, "X-CAP-Instance": BOOT_ID, ...extra };
}

/**
 * The 2xx constructor. Stamps the universal set, then merges the
 * caller's own headers — having refused two shapes of mistake first,
 * by throwing and naming the offending header rather than silently
 * dropping or silently allowing it:
 *   - a caller header sharing a name with one of the three universal
 *     headers (it would otherwise win the merge below, since it is
 *     applied last);
 *   - a caller header whose name starts `X-CAP-` but is not listed
 *     in HEADER_TABLE at all, so a new counter cannot be invented at
 *     a call site without joining the table first — and, by joining
 *     it, being forced to declare there whether it is safe on a
 *     not-found response.
 */
export function ok(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  const callerHeaders = init?.headers ?? {};
  for (const name of Object.keys(callerHeaders)) {
    if (UNIVERSAL_NAMES.has(name)) {
      throw new Error(`ok(): "${name}" is a universal header — a route may not set or override it`);
    }
    if (name.startsWith("X-CAP-") && !HEADER_TABLE.some((entry) => entry.name === name)) {
      throw new Error(`ok(): "${name}" is not in HEADER_TABLE — add it there before sending it`);
    }
  }
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: withUniversalHeaders(callerHeaders),
  });
}

/**
 * The error constructor. Status comes from STATUS_BY_CODE, the body
 * from errorBody(), and the response carries the universal set ONLY:
 * AD-4 says an error response carries the universal set and nothing
 * else, so any caller-supplied header at all — one HEADER_TABLE
 * already marks success-only, or one not catalogued there yet
 * either — is refused, by name, rather than quietly admitted.
 */
export function fail(code: WireErrorCode, detail?: string, headers?: Record<string, string>): NextResponse {
  const callerHeaders = headers ?? {};
  for (const name of Object.keys(callerHeaders)) {
    throw new Error(`fail(): "${name}" cannot be carried on an error response — AD-4 permits the universal set only`);
  }
  return NextResponse.json(errorBody(code, detail), {
    status: STATUS_BY_CODE[code],
    headers: withUniversalHeaders({}),
  });
}

/**
 * Exactly `fail("order_not_found")` — no parameters at all. The
 * absence of a parameter IS the mechanism (FR-6): there is nothing a
 * caller could pass to this function that would make one unowned
 * response differ from one fabricated response, because there is
 * nowhere to pass it.
 */
export function notFound(): NextResponse {
  return fail("order_not_found");
}

/**
 * Same no-parameter mechanism as notFound(), for the one other route
 * in this phase whose not-found path uses a different code: FR-27's
 * unknown_proposal, checked before any state comparison (AD-2).
 */
export function notFoundProposal(): NextResponse {
  return fail("unknown_proposal");
}

/**
 * The shape of the single-object form `response.cookies.set(options)`
 * accepts — derived directly from the framework's own method
 * signature via `Extract`/`Parameters` rather than hand-named here,
 * so this file never spells out a single cookie attribute. Every
 * attribute this project actually sets is decided once, in
 * lib/session/cookie.ts (plan 03-03); that module does not exist
 * yet, so this type is derived from the framework instead of
 * imported from a module this plan cannot see.
 */
type CookieOptions = Extract<Parameters<NextResponse["cookies"]["set"]>, [unknown]>[0];

/**
 * Mutates the response a constructor above already built, by calling
 * the framework's own cookie setter exactly once with the whole
 * `options` object, and returns the same response. This module never
 * assembles a cookie header by hand and never names an individual
 * attribute: the framework already derives the correct expiry from
 * the one attribute lib/session/cookie.ts sets for it, and a
 * hand-built value would not. Neither file needs to change when the
 * other does — the attributes are decided once, over there, and the
 * one write happens once, here.
 */
export function setCookie(response: NextResponse, options: CookieOptions): NextResponse {
  response.cookies.set(options);
  return response;
}
