/* ================================================================
   SESSION SIGNING KEY — one resolver, shared by two signers

   Two modules sign with the same secret: lib/session/cookie.ts (the
   stateless `cap_session` cookie, plan 03-03) and
   lib/proposals/derive.ts (AD-5's derived proposal id, plan 03-04).
   One resolver here is the difference between one key and two
   subtly different ones.

   Resolved lazily, on first call, into a module-level cache — never
   at module load. `next build` and `next typegen` both import every
   route module under a production-like NODE_ENV (this repository's
   own next.config.ts build-id gate already depends on exactly that
   behaviour, reproduced against this repository), so a throw at
   module scope would fail the build on a machine that has no
   business holding the production key. Deferring to first use means
   the build stays clean and a running production server without a
   key fails on its first request, loudly, which is where the check
   belongs.

   Pattern: ../ipv-demo/lib/rbac/manifest.ts lines 42-81.
   ================================================================ */

let cached: string | null = null;

function resolveSigningKey(): string {
  const fromEnv = process.env.CAPTURE_SESSION_KEY;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CAPTURE_SESSION_KEY is not set (or is shorter than 16 characters). " +
        "The server refuses to serve without it in production.",
    );
  }

  // Development fallback. Deliberately committed so a local `verify`
  // run needs no secret — CAPTURE_SESSION_KEY is already set in this
  // repository's .env.local for anyone who wants the real value
  // exercised locally too. Production never reaches this line: the
  // throw above runs first.
  return "capture-demo-dev-key-not-for-prod";
}

/** The one signing key, resolved on first call and cached for the
    lifetime of the module. Exports nothing else: no raw key
    constant, no getter that returns the fallback unconditionally. */
export function signingKey(): string {
  if (cached === null) cached = resolveSigningKey();
  return cached;
}
