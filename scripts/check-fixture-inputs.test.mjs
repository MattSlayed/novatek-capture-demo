/* ================================================================
   FIXTURE INPUTS CHECK — fixture proof (AD-8, D-23)

   Proves check-fixture-inputs.mjs exits non-zero on each of its
   three assertions' violation classes — a widened signature, a
   renamed parameter, a direct forbidden import, a two-hop transitive
   import, the same import written through the tsconfig "@/*" alias,
   and a payload identifier landing in live code — plus one proof
   that its own comment-stripping guard is neither self-tripping nor
   blind, and one proof that a missing lib/verify/ is nothing to
   check.
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

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-fixture-inputs.mjs");
  assert.equal(code, 0, stdout + stderr);
});

/* ---------------------------------------------------------------
   assertion 1 — the declared inputs
   --------------------------------------------------------------- */

test("a fixture where authoredMatch grew a third parameter exits non-zero and names the function", async () => {
  await withFixture(
    {
      "lib/verify/authored.ts": `export function authoredMatch(assetId: string, fixtureSet: string, extra: string) {
  return { assetId, fixtureSet, extra };
}
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /authoredMatch/);
    },
  );
});

test("a fixture where authoredMatch's parameters were renamed exits non-zero", async () => {
  await withFixture(
    {
      "lib/proposals/derive.ts": `export function authoredProposals(id: string, version: string) {
  return [id, version];
}
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /authoredProposals/);
    },
  );
});

/* ---------------------------------------------------------------
   assertion 2 — the import graph
   --------------------------------------------------------------- */

test("a fixture where lib/verify/authored.ts imports lib/reconcile/apply.ts directly exits non-zero and the output names the chain", async () => {
  await withFixture(
    {
      "lib/verify/authored.ts": `import { applyItem } from "../reconcile/apply";

export function authoredMatch(assetId: string, fixtureSet: string) {
  return applyItem(assetId, fixtureSet);
}
`,
      "lib/reconcile/apply.ts": `export function applyItem(a, b) {
  return { a, b };
}
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/verify\/authored\.ts/);
      assert.match(stdout, /lib\/reconcile\/apply\.ts/);
    },
  );
});

test("a fixture where lib/proposals/derive.ts imports a helper that imports lib/store/memory.ts exits non-zero and the output names the two-hop chain", async () => {
  await withFixture(
    {
      "lib/proposals/derive.ts": `export { helper as default } from "./helper";

export function authoredProposals(assetId: string, fixtureSet: string) {
  return [];
}
`,
      "lib/proposals/helper.ts": `import { readOne } from "../store/memory";

export function helper() {
  return readOne();
}
`,
      "lib/store/memory.ts": `export function readOne() {
  return null;
}
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/proposals\/derive\.ts/);
      assert.match(stdout, /lib\/proposals\/helper\.ts/);
      assert.match(stdout, /lib\/store\/memory\.ts/);
    },
  );
});

test("a fixture where the same transitive import is written through the @/ alias exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "lib/proposals/derive.ts": `export { helper as default } from "./helper";

export function authoredProposals(assetId: string, fixtureSet: string) {
  return [];
}
`,
      "lib/proposals/helper.ts": `import { readOne } from "@/lib/store/memory";

export function helper() {
  return readOne();
}
`,
      "lib/store/memory.ts": `export function readOne() {
  return null;
}
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/proposals\/derive\.ts/);
      assert.match(stdout, /lib\/store\/memory\.ts/);
    },
  );
});

/* ---------------------------------------------------------------
   assertion 3 — the payload identifiers, and the self-invalidation
   guard proved both ways
   --------------------------------------------------------------- */

test("a fixture where lib/verify/authored.ts contains a payload identifier in live code exits non-zero", async () => {
  await withFixture(
    {
      "lib/verify/authored.ts": `export function authoredMatch(assetId: string, fixtureSet: string) {
  const thumb = null;
  return { assetId, fixtureSet, thumb };
}
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /thumb/);
    },
  );
});

test("a fixture where the same identifier appears only inside a comment exits 0", async () => {
  await withFixture(
    {
      "lib/verify/authored.ts": `// thumb is mentioned here only as documentation, never as a value
export function authoredMatch(assetId: string, fixtureSet: string) {
  return { assetId, fixtureSet };
}
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   nothing to check
   --------------------------------------------------------------- */

test("a fixture with no lib/verify directory at all exits 0", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-fixture-inputs.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
