/* ================================================================
   WORKER CHECK — fixture proof (D-23)

   Proves check-sw.mjs exits non-zero on each violation D-06 names,
   in both the absent and present states, from throwaway directories
   that never touch the repository.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

test("the real repository (no public/sw.js, no registration) exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-sw.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("no public/sw.js but a registration call exits non-zero", async () => {
  await withFixture(
    {
      "lib/register.ts": `navigator.serviceWorker.register("/sw.js");\n`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-sw.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a public/sw.js that respondWith's every request with no /api/ guard exits non-zero", async () => {
  await withFixture(
    {
      "public/sw.js": `self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-sw.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a public/sw.js that is not valid JavaScript exits non-zero", async () => {
  await withFixture(
    {
      "public/sw.js": `self.addEventListener("fetch" (event) => {\n`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-sw.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a public/sw.js that guards /api/ and returns before respondWith exits 0", async () => {
  await withFixture(
    {
      "public/sw.js": `self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    return;
  }
  event.respondWith(fetch(event.request));
});
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-sw.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
