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

async function realExemptions() {
  const raw = await readFile(
    path.join(repoRoot(), "docs/design/decorative-exemptions.json"),
    "utf8",
  );
  return JSON.parse(raw);
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

test("a decorative-exemption register with five entries exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = await realCapture();
  const exemptions = await realExemptions();
  exemptions.push({ ...exemptions[0], id: "a-fifth-entry" });
  assert.equal(exemptions.length, 5);
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
      "docs/design/decorative-exemptions.json": JSON.stringify(exemptions, null, 2),
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a decorative-exemption register whose second entry has no measured_ratio exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = await realCapture();
  const exemptions = await realExemptions();
  delete exemptions[1].measured_ratio;
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
      "docs/design/decorative-exemptions.json": JSON.stringify(exemptions, null, 2),
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a decorative-exemption register containing only null exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = await realCapture();
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
      "docs/design/decorative-exemptions.json": "null\n",
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0, "a null register has no four entries and must not pass");
      assert.match(stdout, /is not an array/);
    },
  );
});

test("a decorative-exemption register that is a JSON object rather than an array exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = await realCapture();
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
      "docs/design/decorative-exemptions.json": "{}\n",
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /is not an array/);
    },
  );
});

test("a decorative-exemption register that is not valid JSON exits non-zero", async () => {
  const inherited = await realInherited();
  const capture = await realCapture();
  await withFixture(
    {
      "app/styles/tokens.inherited.css": inherited,
      "app/styles/tokens.capture.css": capture,
      "docs/design/decorative-exemptions.json": "{ not valid json",
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});
