/* ================================================================
   TOKEN CHECK — fixture proof (D-23)

   Proves check-tokens.mjs exits non-zero on each of the violations
   D-12/D-13/D-16 name, from a throwaway fixture that never touches
   the repository.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFixture, runCheck, repoRoot } from "./lib/fixtures.mjs";

async function realInherited() {
  return readFile(path.join(repoRoot(), "app/styles/tokens.inherited.css"));
}

async function realCapture() {
  return readFile(path.join(repoRoot(), "app/styles/tokens.capture.css"), "utf8");
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-tokens.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a one-character change in the inherited layer exits non-zero", async () => {
  const real = await realInherited();
  const mutated = Buffer.from(real);
  const midpoint = Math.floor(mutated.length / 2);
  mutated[midpoint] = mutated[midpoint] ^ 0xff;
  await withFixture(
    { "app/styles/tokens.inherited.css": mutated },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a missing inherited layer exits non-zero", async () => {
  await withFixture({}, async (dir) => {
    const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
    assert.notEqual(code, 0);
  });
});

test("trailing whitespace appended to the inherited layer exits non-zero", async () => {
  const real = await realInherited();
  const mutated = Buffer.concat([real, Buffer.from(" ")]);
  await withFixture(
    { "app/styles/tokens.inherited.css": mutated },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a capture layer missing --ribbon-h-200 exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = (await realCapture()).replace(
    /\s*--ribbon-h-200:\s*309px;/,
    "",
  );
  assert.doesNotMatch(capture, /--ribbon-h-200/);
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a capture layer that redeclares --navy-deep exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = (await realCapture()).replace(
    ":root {",
    ":root {\n  --navy-deep: #123456;",
  );
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a capture layer with --target-record: 124px exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = (await realCapture()).replace(
    "--target-record: 130px;",
    "--target-record: 124px;",
  );
  assert.match(capture, /--target-record:\s*124px/);
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});
