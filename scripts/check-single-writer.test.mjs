/* ================================================================
   SINGLE-WRITER CHECK — fixture proof (AD-1, D-23)

   Proves check-single-writer.mjs exits non-zero on each violation
   class — a direct mutating import, the same import through the
   tsconfig "@/*" alias, a two-hop transitive reach through a helper,
   and a hand-built response — from throwaway directories that never
   touch the repository, plus one real proof against this
   repository's own source. Each fixture carries a minimal
   tsconfig.json so loadAliasPrefix has something to read.
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

const STORE_STUB = `export function writeCapture() {}
export function writeDecision() {}
export const BOOT_ID = "boot-id";
export function readClock() { return null; }
`;

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-single-writer.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a fixture where app/api/captures/route.ts imports writeCapture from lib/store/memory.ts exits non-zero and names the file", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/captures/route.ts": `import { writeCapture } from "../../../lib/store/memory.ts";
export function POST() { writeCapture(); return null; }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/captures\/route\.ts/);
      assert.match(stdout, /writeCapture/);
    },
  );
});

test("the same violation written through the @/ alias exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/captures/route.ts": `import { writeCapture } from "@/lib/store/memory.ts";
export function POST() { writeCapture(); return null; }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/captures\/route\.ts/);
    },
  );
});

test("a fixture where a route imports a helper that imports writeDecision exits non-zero and names the two-hop chain", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/decisions/route.ts": `import { helperWrite } from "../../../lib/helper.ts";
export function POST() { helperWrite(); return null; }
`,
      "lib/helper.ts": `import { writeDecision } from "./store/memory.ts";
export function helperWrite() { writeDecision(); }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/decisions\/route\.ts/);
      assert.match(stdout, /lib\/helper\.ts/);
      assert.match(stdout, /lib\/store\/memory\.ts/);
      assert.match(stdout, /writeDecision/);
    },
  );
});

test("a fixture where a route imports only BOOT_ID and readClock exits 0 — read-only reach is not a violation", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/health/route.ts": `import { BOOT_ID, readClock } from "../../../lib/store/memory.ts";
export function GET() { return BOOT_ID + String(readClock()); }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a fixture where a route binds the store as a namespace exits non-zero — no mutator is named anywhere", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/captures/route.ts": `import * as store from "../../../lib/store/memory.ts";
export function POST() { store.writeCapture(); return null; }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/captures\/route\.ts/);
      assert.match(stdout, /namespace/);
    },
  );
});

test("a fixture where a helper re-exports a mutator under a different local name exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/captures/route.ts": `import { w } from "../../../lib/helper.ts";
export function POST() { w(); return null; }
`,
      "lib/helper.ts": `export { writeCapture as w } from "./store/memory.ts";\n`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/helper\.ts/);
      assert.match(stdout, /writeCapture/);
    },
  );
});

test("a fixture where a helper binds the store as a namespace and a route imports the helper exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/decisions/route.ts": `import { helperWrite } from "../../../lib/helper.ts";
export function POST() { helperWrite(); return null; }
`,
      "lib/helper.ts": `import * as store from "./store/memory.ts";
export function helperWrite() { store.writeDecision(); }
`,
      "lib/store/memory.ts": STORE_STUB,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/decisions\/route\.ts/);
      assert.match(stdout, /lib\/helper\.ts/);
    },
  );
});

test("a fixture where app/api/orders/route.ts calls NextResponse.json exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/orders/route.ts": `import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ ok: true }); }
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/orders\/route\.ts/);
      assert.match(stdout, /NextResponse/);
    },
  );
});

test("a fixture where NextResponse appears only inside a comment exits 0 — the self-invalidation guard", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "app/api/orders/route.ts": `// This route never calls NextResponse.json directly.
export function GET() { return null; }
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a fixture with no app/api directory exits 0", async () => {
  await withFixture(
    {
      "tsconfig.json": TSCONFIG,
      "lib/limits/index.ts": `export const FOO = 1;\n`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-single-writer.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
