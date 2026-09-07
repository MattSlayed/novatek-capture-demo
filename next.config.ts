// next.config.ts — build-id resolution and cacheComponents (D-03, D-11).
// Sources: nextjs.org/docs/messages/next-config-error; .../cacheComponents.mdx
import type { NextConfig } from "next";

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.CAPTURE_BUILD_ID;

if (!buildId && process.env.NODE_ENV === "production") {
  // No constant fallback anywhere (D-03) — an unresolved build id fails
  // config load rather than shipping an unlabelled build. process.exit(1)
  // guarantees the non-zero exit rather than relying on Next's
  // config-load error class alone (RESEARCH.md Assumptions Log A3); the
  // throw that follows is the documented failure mode Next itself
  // reports as a "next.config.js Loading Error".
  const message =
    "CAPTURE_BUILD_ID unresolved: set VERCEL_GIT_COMMIT_SHA, VERCEL_DEPLOYMENT_ID, or CAPTURE_BUILD_ID before a production build.";
  console.error(message);
  process.exit(1);
  throw new Error(message);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId ?? "dev" },
};

export default nextConfig;
