/* ================================================================
   SESSION COOKIE — the stateless cap_session credential (FR-1, FR-23)

   A session is a signed value, not a lookup key: this server verifies
   one without holding any record of it anywhere. Every field a
   session carries travels inside the value itself, base64url-encoded,
   with an HMAC-SHA256 signature over that encoding appended after a
   "." separator. Nothing about verification touches the store.

   Signing uses the one key ./key.ts resolves — never a second
   resolver here, and never a direct read of the environment variable
   that key holds. lib/proposals/derive.ts (plan 03-04) signs under
   the same key for a different purpose; one resolver is the
   difference between one key and two subtly different ones.

   The verify path checks the signature before it parses anything the
   payload claims and before it compares the expiry, so a caller
   cannot learn from the failure reason whether a forged payload was
   otherwise well-formed. Every comparison against the signature uses
   a constant-time comparison behind an explicit length guard — never
   a fast-exit operator — because a fast-exit comparison leaks how
   many leading bytes matched through response timing.

   FR-3's limit, stated plainly because later surfaces quote it: this
   credential is stateless, so a copied value keeps verifying until
   the expiry written inside it arrives — nothing here revokes one
   early.
   ================================================================ */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { signingKey } from "./key.ts";
import { SESSION_COOKIE_MAX_AGE_SECONDS } from "../limits/index.ts";
import type { Session } from "../data/types";

/** The one cookie name this project mints or reads. One definition. */
export const SESSION_COOKIE_NAME = "cap_session";

export type SessionResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "absent" | "malformed" | "bad_signature" | "expired" };

function encodePayload(session: Session): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function signEncodedPayload(encodedPayload: string): string {
  return createHmac("sha256", signingKey()).update(encodedPayload).digest("base64url");
}

/** Structural check on decoded, still-untrusted JSON — narrows to
    Session only once every field this type promises is actually
    present and is a string. Nothing here trusts the decode. */
function isSessionShaped(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sid === "string" &&
    typeof candidate.account_id === "string" &&
    typeof candidate.issued_at === "string" &&
    typeof candidate.expires_at === "string"
  );
}

/**
 * Mint a new session for the given account. `nowMs` defaults to
 * Date.now() and exists purely so a test can pin time — no route
 * ever supplies it, and it is never read from anything a caller
 * sends.
 */
export function mintSession(
  accountId: string,
  nowMs: number = Date.now(),
): { session: Session; value: string } {
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + SESSION_COOKIE_MAX_AGE_SECONDS * 1000).toISOString();
  const session: Session = {
    sid: randomUUID(),
    account_id: accountId,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
  const encodedPayload = encodePayload(session);
  const signature = signEncodedPayload(encodedPayload);
  return { session, value: `${encodedPayload}.${signature}` };
}

/**
 * Verify a bare cookie value. readSession() below, and this
 * project's envelope path, both reach this without needing a
 * framework request object.
 */
export function verifySessionValue(value: string): SessionResult {
  const separatorIndex = value.indexOf(".");
  if (separatorIndex === -1) return { ok: false, reason: "malformed" };

  const encodedPayload = value.slice(0, separatorIndex);
  const providedSignature = value.slice(separatorIndex + 1);
  if (encodedPayload.length < 1 || providedSignature.length < 1) {
    return { ok: false, reason: "malformed" };
  }

  /* Verify the signature before touching anything the payload claims
     and before comparing the expiry: an attacker must not learn from
     the reason code whether a forged payload was well-formed
     underneath a bad signature. */
  const expected = Buffer.from(signEncodedPayload(encodedPayload));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length) return { ok: false, reason: "bad_signature" };
  if (!timingSafeEqual(expected, provided)) return { ok: false, reason: "bad_signature" };

  let parsed: unknown;
  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    parsed = JSON.parse(decoded);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isSessionShaped(parsed)) return { ok: false, reason: "malformed" };

  const expiresAtMs = Date.parse(parsed.expires_at);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, session: parsed };
}

/**
 * Read and verify the cookie off a request. Reads the raw value with
 * the handler's own request object — never a second source — and
 * hands it straight to verifySessionValue().
 */
export function readSession(request: NextRequest): SessionResult {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return { ok: false, reason: "absent" };
  return verifySessionValue(raw);
}

/**
 * The attribute object a responder passes straight through to the
 * framework's own cookie setter. This function never assembles a
 * cookie header string itself, and neither does anything else in
 * this project — the framework derives the correct expiry from
 * maxAge on its own.
 */
export function sessionCookieOptions(value: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/** The same attribute shape, immediately expired, for a route that
    clears the session. */
export function clearedSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
