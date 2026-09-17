/* ================================================================
   NAMED PACKAGES CHECK — fixture proof (FR-17, D-23)

   Proves check-named-packages.mjs exits non-zero on a direct hit, a
   prefix-rule hit, a transitive-only hit (visible in the lockfile
   but not the manifest), and a missing lockfile — and exits 0 on a
   clean manifest/lockfile pair and on the real repository, whose own
   lockfile carries two known-safe, version-pinned transitive
   exceptions (see check-named-packages.mjs's own header comment).
   One more fixture proves that pinning is real: the same name at a
   different resolved version is not exempt.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-named-packages.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a fixture package.json with sharp in dependencies exits non-zero and names it", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({ name: "fixture", dependencies: { sharp: "^0.33.0" } }),
      "package-lock.json": JSON.stringify({
        name: "fixture",
        lockfileVersion: 3,
        packages: { "": {}, "node_modules/sharp": { version: "0.33.0" } },
      }),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /sharp/);
    },
  );
});

test("a fixture with zod in devDependencies exits non-zero and the message carries the dependency-minimalism reason rather than the FR-17 one", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({ name: "fixture", devDependencies: { zod: "^3.23.0" } }),
      "package-lock.json": JSON.stringify({
        name: "fixture",
        lockfileVersion: 3,
        packages: { "": {}, "node_modules/zod": { version: "3.23.0" } },
      }),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /zod/);
      assert.match(stdout, /dependency-minimalism/);
      assert.doesNotMatch(stdout, /FR-17/);
    },
  );
});

test("a fixture with @tensorflow/tfjs-core exits non-zero via the prefix rule", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({ name: "fixture", dependencies: { "@tensorflow/tfjs-core": "^4.20.0" } }),
      "package-lock.json": JSON.stringify({
        name: "fixture",
        lockfileVersion: 3,
        packages: { "": {}, "node_modules/@tensorflow/tfjs-core": { version: "4.20.0" } },
      }),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /@tensorflow\/tfjs-core/);
    },
  );
});

test("a fixture whose package.json is clean but whose package-lock.json carries node_modules/tesseract.js exits non-zero and the message says transitive", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({ name: "fixture", dependencies: {} }),
      "package-lock.json": JSON.stringify({
        name: "fixture",
        lockfileVersion: 3,
        packages: { "": {}, "node_modules/tesseract.js": { version: "5.1.1" } },
      }),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /tesseract\.js/);
      assert.match(stdout, /transitive/);
    },
  );
});

test("a fixture with no package-lock.json exits non-zero with a message naming the lockfile", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({ name: "fixture", dependencies: {} }),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /package-lock\.json/);
    },
  );
});

test("a fixture with a clean manifest and a clean lockfile exits 0", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({
        name: "fixture",
        dependencies: { next: "16.3.4" },
        devDependencies: { typescript: "5.9.3" },
      }),
      "package-lock.json": JSON.stringify({
        name: "fixture",
        lockfileVersion: 3,
        packages: {
          "": {},
          "node_modules/next": { version: "16.3.4" },
          "node_modules/typescript": { version: "5.9.3" },
        },
      }),
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   the version pin is real — a same-named package at a different
   resolved version is not exempt (T-3-31: a rule that cannot fail
   proves nothing)
   --------------------------------------------------------------- */

test("a fixture where sharp arrives transitively at a version other than the pinned exception still exits non-zero", async () => {
  await withFixture(
    {
      "package.json": JSON.stringify({ name: "fixture", dependencies: {} }),
      "package-lock.json": JSON.stringify({
        name: "fixture",
        lockfileVersion: 3,
        packages: { "": {}, "node_modules/sharp": { version: "0.34.0" } },
      }),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-named-packages.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /sharp/);
      assert.match(stdout, /transitive/);
    },
  );
});
