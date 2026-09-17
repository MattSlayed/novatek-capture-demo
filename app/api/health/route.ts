/* ================================================================
   GET/HEAD /api/health — the probe target (curl check H)

   No `runtime` or `dynamic` export here, or in any other route this
   phase ships: both are a hard `next build` error under this
   project's locked `cacheComponents: true` (03-RESEARCH.md Pitfall 1,
   reproduced empirically against this repository).

   This is the one route in the phase with neither a cookie read nor
   a dynamic segment, so without a dynamic API call it is eligible for
   build-time static prerendering: `boot_id` and `uptime_s` would
   freeze into the build's own snapshot, and curl check H would then
   pass forever against a frozen instance, proving nothing about
   whether the serving instance is actually alive. Calling the
   framework's own dynamic API, `connection()`, as the literal first
   statement of both handlers below — and awaiting it there, before
   any module-level state is read — is what forces this route to
   execute fresh on every request instead.

   Neither handler resolves the artisan making the request or
   performs the last-contact write every authenticated route makes
   after attribution succeeds: this is an unauthenticated probe
   target, not a route an artisan visits, and stamping D-07's floor
   from a probe that names no account would corrupt that floor for
   every account at once.
   ================================================================ */

import { connection } from "next/server";
import { ok } from "../../../lib/http/respond.ts";
import { BOOT_ID, storeStats, uptimeSeconds } from "../../../lib/store/memory.ts";
import { STORE_TTL_SECONDS } from "../../../lib/limits/index.ts";

export async function GET() {
  await connection();
  return ok({
    ok: true,
    store: "memory",
    boot_id: BOOT_ID,
    uptime_s: uptimeSeconds(),
    counts: storeStats(),
    ttl_s: STORE_TTL_SECONDS,
  });
}

export async function HEAD() {
  await connection();
  return ok(null, { status: 200 });
}
