/* ================================================================
   STRUCTURE CHECK — fixture proof (D-23)

   Proves check-structure.mjs exits non-zero on each D-05 violation
   and on a dynamic "/" row under --build-output, from throwaway
   directories that never touch the repository — plus one real
   T-1-02/D-03 proof against the repository's own next.config.ts.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { withFixture, runCheck, repoRoot } from "./lib/fixtures.mjs";

const GOOD_NEXT_CONFIG = `import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  cacheComponents: true,
};
export default nextConfig;
`;

const GOOD_GLOBALS_CSS = `@import "./styles/tokens.inherited.css";
@import "./styles/tokens.capture.css";
`;

test("the real repository exits 0 now that app/globals.css exists (01-03)", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-structure.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a fixture with app/middleware.ts exits non-zero", async () => {
  await withFixture(
    {
      "app/middleware.ts": "export {};\n",
      "next.config.ts": GOOD_NEXT_CONFIG,
      "app/globals.css": GOOD_GLOBALS_CSS,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-structure.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a fixture whose next.config.ts contains a webpack( key exits non-zero", async () => {
  await withFixture(
    {
      "next.config.ts": `import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  cacheComponents: true,
  webpack(config) {
    return config;
  },
};
export default nextConfig;
`,
      "app/globals.css": GOOD_GLOBALS_CSS,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-structure.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a fixture whose next.config.ts contains ignoreBuildErrors exits non-zero", async () => {
  await withFixture(
    {
      "next.config.ts": `import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  cacheComponents: true,
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
`,
      "app/globals.css": GOOD_GLOBALS_CSS,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-structure.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a fixture whose globals.css imports tokens.capture.css before tokens.inherited.css exits non-zero", async () => {
  await withFixture(
    {
      "next.config.ts": GOOD_NEXT_CONFIG,
      "app/globals.css": `@import "./styles/tokens.capture.css";
@import "./styles/tokens.inherited.css";
`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-structure.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("--build-output: a build log whose / row is marked dynamic exits non-zero", async () => {
  await withFixture(
    {
      "next.config.ts": GOOD_NEXT_CONFIG,
      "app/globals.css": GOOD_GLOBALS_CSS,
      "build.log": `Route (app)                                Size     First Load JS
┌ ƒ /                                      142 B          87.4 kB
└ ○ /_not-found                            871 B          88.1 kB

○  (Static)  prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-structure.mjs", {
        cwd: dir,
        args: ["--build-output", "build.log"],
      });
      assert.notEqual(code, 0);
    },
  );
});

test("--build-output: a build log whose / row is marked static exits 0", async () => {
  await withFixture(
    {
      "next.config.ts": GOOD_NEXT_CONFIG,
      "app/globals.css": GOOD_GLOBALS_CSS,
      "build.log": `Route (app)                                Size     First Load JS
┌ ○ /                                      142 B          87.4 kB
└ ○ /_not-found                            871 B          88.1 kB

○  (Static)  prerendered as static content
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-structure.mjs", {
        cwd: dir,
        args: ["--build-output", "build.log"],
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("--build-output: a build log whose / row is marked Partial Prerender exits 0 (D-11's actual shape)", async () => {
  await withFixture(
    {
      "next.config.ts": GOOD_NEXT_CONFIG,
      "app/globals.css": GOOD_GLOBALS_CSS,
      "build.log": `Route (app)                                Size     First Load JS
┌ ◐ /                                      142 B          87.4 kB
└ ○ /_not-found                            871 B          88.1 kB

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-structure.mjs", {
        cwd: dir,
        args: ["--build-output", "build.log"],
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* T-1-02 / D-03 — the slowest test in this suite (a real `next build`,
   ~5-6s on this machine). Not deferred: it is the only proof that an
   unresolved build id actually fails a production build rather than
   the assumption resting on next.config.ts's source alone.

   `runCommand` (lib/fixtures.mjs) merges its `env` option onto
   `process.env` and documents that it never replaces it, so it cannot
   express "these three variables are absent" if they happened to be
   set in the parent shell. This test spawns directly instead, with an
   explicit copy of process.env that has VERCEL_GIT_COMMIT_SHA,
   VERCEL_DEPLOYMENT_ID, CAPTURE_BUILD_ID and NODE_ENV deleted from
   that copy only — the parent process's real environment is never
   touched. */
test(
  "next build with all three build-id variables deleted exits non-zero and names CAPTURE_BUILD_ID",
  async () => {
    const childEnv = { ...process.env };
    delete childEnv.VERCEL_GIT_COMMIT_SHA;
    delete childEnv.VERCEL_DEPLOYMENT_ID;
    delete childEnv.CAPTURE_BUILD_ID;
    delete childEnv.NODE_ENV;

    const { code, stdout, stderr } = await new Promise((resolve) => {
      const child = spawn("npx", ["next", "build"], {
        cwd: repoRoot(),
        env: childEnv,
        shell: true,
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("close", (c) => resolve({ code: c ?? 0, stdout: out, stderr: err }));
    });

    assert.notEqual(code, 0);
    assert.match(stdout + stderr, /CAPTURE_BUILD_ID/);
  },
);
