/* ================================================================
   SCAFFOLD TEST

   Proves the pin-and-lint-chain regression that Phase 1's plans and
   downstream phases all depend on: every D-01 version pin is declared
   in package.json AND actually installed, and the verify entry point
   exists. Task 2 appends the eslint.config.mjs / next.config.ts /
   lint-chain / Routing-Middleware-absence groups below this one.
   ================================================================ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf8"));
}

const pkg = readJson("package.json");

describe("package.json — declared pins (D-01)", () => {
  test("dependencies are pinned exactly", () => {
    assert.equal(pkg.dependencies.next, "16.3.4");
    assert.equal(pkg.dependencies.react, "19.2.8");
    assert.equal(pkg.dependencies["react-dom"], "19.2.8");
  });

  test("devDependencies are pinned exactly, @types/react-dom is a caret range", () => {
    assert.equal(pkg.devDependencies.eslint, "10.9.1");
    assert.equal(pkg.devDependencies["eslint-config-next"], "16.3.4");
    assert.equal(pkg.devDependencies["@next/eslint-plugin-next"], "16.3.4");
    assert.equal(pkg.devDependencies["eslint-plugin-react-hooks"], "^7.1.1");
    assert.equal(pkg.devDependencies.typescript, "5.9.3");
    assert.equal(pkg.devDependencies.playwright, "1.62.1");
    assert.equal(pkg.devDependencies["@axe-core/playwright"], "4.13.0");
    assert.equal(pkg.devDependencies["@types/node"], "^24");
    assert.equal(pkg.devDependencies["@types/react"], "^19");
    assert.equal(pkg.devDependencies["@types/react-dom"], "^19");
  });

  test("banned packages are absent", () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const banned of [
      "eslint-plugin-jsx-a11y",
      "eslint-plugin-import",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "motion",
      "postprocessing",
    ]) {
      assert.equal(all[banned], undefined, `${banned} must not be declared`);
    }
  });

  test('engines.node is "24"', () => {
    assert.equal(pkg.engines?.node, "24");
  });

  test("scripts block matches exactly", () => {
    assert.equal(pkg.scripts.dev, "next dev");
    assert.equal(pkg.scripts.build, "next build");
    assert.equal(pkg.scripts.start, "next start");
    assert.equal(pkg.scripts.lint, "eslint .");
    assert.equal(pkg.scripts.test, "node --test scripts/");
    assert.equal(pkg.scripts.verify, "node scripts/verify.mjs");
  });
});

describe("node_modules — installed versions match the pins", () => {
  test("next, react, react-dom", () => {
    assert.equal(readJson("node_modules/next/package.json").version, "16.3.4");
    assert.equal(readJson("node_modules/react/package.json").version, "19.2.8");
    assert.equal(readJson("node_modules/react-dom/package.json").version, "19.2.8");
  });

  test("eslint, playwright, @axe-core/playwright", () => {
    assert.equal(readJson("node_modules/eslint/package.json").version, "10.9.1");
    assert.equal(readJson("node_modules/playwright/package.json").version, "1.62.1");
    assert.equal(
      readJson("node_modules/@axe-core/playwright/package.json").version,
      "4.13.0",
    );
  });
});
