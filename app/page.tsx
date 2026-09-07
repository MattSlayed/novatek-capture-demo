import { Suspense } from "react";
import { Limits } from "@/components/limits/Limits";

/* RESEARCH.md Pattern 1 (static shell with a streamed dynamic
   island): this file stays a plain, non-async Server Component so `/`
   is statically prerendered; only the Screen child below reads
   searchParams, behind <Suspense>, which requires cacheComponents:
   true in next.config.ts (already set, plan 01-01). Typed as
   Promise<{ s?: string }> rather than the generated PageProps<"/">
   so this route type-checks without a prior `next typegen` run. */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;

  /* The only untrusted input in Phase 1: read for a two-way branch
     only, never interpolated into markup, a URL or a header. */
  if (s === "limits") {
    return <Limits />;
  }

  /* Otherwise-empty, labelled <main> and nothing else (D-11, D-19) —
     no body copy, no wordmark, no header bar, no navigation. The
     reader's next step is the ribbon link, rendered by the layout
     above this page. */
  return (
    <main aria-labelledby="screen-title">
      <h1 id="screen-title" className="screen-title">
        NOVATEK Capture
      </h1>
    </main>
  );
}
