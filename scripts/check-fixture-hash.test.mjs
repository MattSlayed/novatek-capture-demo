/* ================================================================
   FIXTURE HASH CHECK — fixture proof (D-14, D-23)

   Proves check-fixture-hash.mjs exits non-zero on a content change
   left un-repinned, and — the single most important test in this
   file — exits 0 when the four fixture files are converted to CRLF
   line endings with the pin untouched, proving the normalisation
   itself rather than merely asserting it (RESEARCH Pitfall 2).
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFixture, runCheck, repoRoot } from "./lib/fixtures.mjs";

const FIXTURE_FILES = [
  "lib/data/plant.ts",
  "lib/data/artisans.ts",
  "lib/data/orders.ts",
  "lib/data/observations.ts",
];

async function realFile(relPath) {
  return readFile(path.join(repoRoot(), relPath), "utf8");
}

/** Every real fixture file plus the real pin, as a withFixture map. */
async function realTree() {
  const tree = {};
  for (const f of FIXTURE_FILES) {
    tree[f] = await realFile(f);
  }
  tree["lib/data/fixtures.ts"] = await realFile("lib/data/fixtures.ts");
  tree["lib/data/types.ts"] = await realFile("lib/data/types.ts");
  return tree;
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-fixture-hash.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a one-character change inside lib/data/observations.ts with the pin left alone exits non-zero", async () => {
  const tree = await realTree();
  tree["lib/data/observations.ts"] = tree["lib/data/observations.ts"].replace(
    /./,
    (c) => (c === "/" ? "*" : "/"),
  );
  await withFixture(tree, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-fixture-hash.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /hash mismatch/);
  });
});

test("a one-character change inside lib/data/plant.ts with the pin left alone exits non-zero", async () => {
  const tree = await realTree();
  tree["lib/data/plant.ts"] = tree["lib/data/plant.ts"].replace(
    /./,
    (c) => (c === "/" ? "*" : "/"),
  );
  await withFixture(tree, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-fixture-hash.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /hash mismatch/);
  });
});

test("the four fixture files converted to CRLF line endings with the pin left alone exits 0 — the normalisation's own proof", async () => {
  const tree = await realTree();
  for (const f of FIXTURE_FILES) {
    tree[f] = tree[f].replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  }
  await withFixture(tree, async (dir) => {
    const { code, stdout, stderr } = await runCheck("scripts/check-fixture-hash.mjs", {
      cwd: dir,
    });
    assert.equal(code, 0, stdout + stderr);
  });
});

test("a change to lib/data/types.ts with the pin left alone exits 0 — types.ts is outside the hash", async () => {
  const tree = await realTree();
  tree["lib/data/types.ts"] = tree["lib/data/types.ts"] + "\n// a harmless local edit\n";
  await withFixture(tree, async (dir) => {
    const { code, stdout, stderr } = await runCheck("scripts/check-fixture-hash.mjs", {
      cwd: dir,
    });
    assert.equal(code, 0, stdout + stderr);
  });
});

test("a FIXTURE_VERSION that does not match the capture-fixtures/YYYY.MM.N shape exits non-zero", async () => {
  const tree = await realTree();
  tree["lib/data/fixtures.ts"] = tree["lib/data/fixtures.ts"].replace(
    /capture-fixtures\/\d{4}\.\d{2}\.\d+/,
    "capture-fixtures-v2",
  );
  await withFixture(tree, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-fixture-hash.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /does not match/);
  });
});

test("one of the four files missing exits non-zero with a message naming it", async () => {
  const tree = await realTree();
  delete tree["lib/data/observations.ts"];
  await withFixture(tree, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-fixture-hash.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /lib\/data\/observations\.ts/);
  });
});
