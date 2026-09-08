/* ================================================================
   REGISTER ISOLATION CHECK — fixture proof (D-17, D-23)

   Proves check-register-isolation.mjs exits non-zero on each half of
   D-17's rule — a direct import, a transitive import through an
   intermediate file, the tsconfig "@/*" alias, the not-yet-existing
   lib/access/register — from throwaway directories that never touch
   the repository, plus one real proof against this repository's own
   source and its own built bundle.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

const TSCONFIG = `{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
`;

/* ---------------------------------------------------------------
   source mode
   --------------------------------------------------------------- */

test("the real repository exits 0 in source mode", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-register-isolation.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a fixture whose components/Leak.tsx directly imports ../lib/data/register exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "components/Leak.tsx": `import { REGISTER_BY_TAG } from "../lib/data/register";
export const size = REGISTER_BY_TAG.size;
`,
      "lib/data/register.ts": `export const REGISTER_BY_TAG = new Map();\n`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-register-isolation.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/data\/register\.ts/);
    },
  );
});

test("a fixture whose components/Outer.tsx imports ./Inner.tsx, which imports @/lib/data/register, exits non-zero (transitive + alias)", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "components/Outer.tsx": `export { Inner as default } from "./Inner";\n`,
      "components/Inner.tsx": `import { REGISTER_BY_TAG } from "@/lib/data/register";
export const size = REGISTER_BY_TAG.size;
`,
      "lib/data/register.ts": `export const REGISTER_BY_TAG = new Map();\n`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-register-isolation.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /components\/Outer\.tsx/);
      assert.match(stdout, /lib\/data\/register\.ts/);
    },
  );
});

test("a fixture whose components/Outer.tsx imports ./Inner.tsx, which imports @/lib/access/register, exits non-zero (P9's not-yet-existing module is still forbidden)", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "components/Outer.tsx": `export { Inner as default } from "./Inner";\n`,
      "components/Inner.tsx": `import { resolveTag } from "@/lib/access/register";
export const resolved = resolveTag;
`,
      "lib/access/register.ts": `export function resolveTag() { return null; }\n`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-register-isolation.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/access\/register\.ts/);
    },
  );
});

test("a fixture where components/ imports only lib/data/plant exits 0", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "components/Safe.tsx": `import { MACHINERY } from "@/lib/data/plant";
export const count = MACHINERY.length;
`,
      "lib/data/plant.ts": `export const MACHINERY = [];\n`,
      "lib/data/register.ts": `export const REGISTER_BY_TAG = new Map();\n`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-register-isolation.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a fixture with no lib/client/ directory exits 0 rather than throwing", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "components/Alone.tsx": `export const x = 1;\n`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-register-isolation.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   bundle mode
   --------------------------------------------------------------- */

test("bundle mode against a fixture directory whose chunk contains the sentinel exits non-zero", async () => {
  await withFixture(
    {
      "static/chunks/app.js": `var x = "__CAPTURE_REGISTER_SENTINEL__";\n`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-register-isolation.mjs", {
        cwd: dir,
        args: ["--bundle", "static"],
      });
      assert.notEqual(code, 0);
      assert.match(stdout, /chunks\/app\.js/);
    },
  );
});

test("bundle mode against a fixture directory whose chunk does not contain the sentinel exits 0", async () => {
  await withFixture(
    {
      "static/chunks/app.js": `var x = "nothing to see here";\n`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-register-isolation.mjs", {
        cwd: dir,
        args: ["--bundle", "static"],
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("bundle mode against a directory that does not exist exits non-zero and names it", async () => {
  await withFixture({}, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-register-isolation.mjs", {
      cwd: dir,
      args: ["--bundle", "static"],
    });
    assert.notEqual(code, 0);
    assert.match(stdout, /static/);
  });
});

/* ---------------------------------------------------------------
   the real, built bundle
   --------------------------------------------------------------- */

test("the real repository's own .next/static exits 0 in bundle mode once a build exists", async (t) => {
  const { access } = await import("node:fs/promises");
  const { repoRoot } = await import("./lib/fixtures.mjs");
  const path = await import("node:path");
  try {
    await access(path.join(repoRoot(), ".next", "static"));
  } catch {
    t.skip("no .next/static present — this test only runs after a build");
    return;
  }
  const { code, stdout, stderr } = await runCheck("scripts/check-register-isolation.mjs", {
    args: ["--bundle", ".next/static"],
  });
  assert.equal(code, 0, stdout + stderr);
});
