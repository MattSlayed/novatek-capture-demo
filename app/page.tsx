import { Suspense } from "react";
import { Screen } from "@/components/shell/Screen";

/* RESEARCH.md Pattern 1 (static shell with a streamed dynamic
   island): this file stays a plain, non-async Server Component so `/`
   is statically prerendered; only the Screen child below reads the
   query, behind <Suspense>, which requires cacheComponents: true in
   next.config.ts (already set, plan 01-01).

   Since Phase 4 that child is a Client Component, and it is the only
   mechanism that works (04-RESEARCH.md Pattern 1 and Pitfall 1): a
   Server Component's searchParams prop does not update on
   history.pushState, measured frozen at its first-render value across
   every push, replace and pop with zero server round trips, while the
   client hook Screen reads tracks every one of them. So this page no
   longer threads searchParams anywhere; the client reads the query
   itself. The boundary below is a build gate as well as a streaming
   seam: that hook outside a Suspense boundary is a hard prerender
   error, so removing it fails next build rather than shipping.

   Nothing here may make `/` dynamic (Pitfall 8): no route-segment
   config export and no request-cookie read at page level. Either
   would move `/` off its static route-table glyph and fail
   check-structure.mjs --build-output. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
