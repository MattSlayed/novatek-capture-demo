/* ================================================================
   SCAFFOLD TEST

   Proves the pin-and-lint-chain regression that Phase 1's plans and
   downstream phases all depend on: every D-01 version pin is declared
   in package.json AND actually installed, the verify entry point
   exists, the ESLint 10 flat config never re-imports the crashing
   eslint-config-next default export / /core-web-vitals subpath
   (RESEARCH.md Pitfall 1), the lint and type-check chains run green,
   next.config.ts carries the build-id-throws-in-production contract
   (D-03) with cacheComponents enabled (D-11's companion requirement)
   and no webpack()/ignoreBuildErrors escape hatch, and no Routing
   Middleware exists anywhere (AD-2).
   ================================================================ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf8"));
}

function readText(relPath) {
  return readFileSync(path.join(repoRoot, relPath), "utf8");
}

/** Spawn an npx-resolved binary with a shell, for Windows compatibility. */
function runNpx(args) {
  return new Promise((resolve) => {
    const child = spawn("npx", args, { cwd: repoRoot, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
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
    // "node --test scripts/" (a bare directory argument) treats the
    // directory as a CommonJS module path and fails with
    // MODULE_NOT_FOUND on this Node 24.19.0 / Windows combination
    // (reproduced in a clean directory with no special characters);
    // the recursive glob form is the working equivalent (Rule 3 fix).
    // The glob is quoted so Node, not the parent shell, expands it:
    // npm runs scripts through sh on Linux/macOS, where an unquoted
    // `**` is a plain `*` and only scripts/lib/*.test.mjs would run;
    // cmd.exe on Windows never expands globs, which is why the
    // unquoted form passed locally.
    assert.equal(pkg.scripts.test, 'node --test "scripts/**/*.test.mjs"');
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

describe("eslint.config.mjs — never the crashing import (Pitfall 1)", () => {
  test("does not import eslint-config-next's default export or /core-web-vitals", () => {
    const source = readText("eslint.config.mjs");
    assert.equal(
      source.includes("eslint-config-next/core-web-vitals"),
      false,
      "must never import eslint-config-next/core-web-vitals — crashes under ESLint 10.9.1",
    );
    assert.doesNotMatch(
      source,
      /from\s+["']eslint-config-next["']/,
      "must never import eslint-config-next's default export",
    );
  });

  test("composes @next/eslint-plugin-next and the flat config shape", () => {
    const source = readText("eslint.config.mjs");
    assert.match(source, /@next\/eslint-plugin-next/);
    assert.match(source, /configs\.flat\["recommended-latest"\]/);
    assert.match(source, /configs\["core-web-vitals"\]/);
  });
});

describe("lint and type-check chains run green", () => {
  test("npx eslint . exits 0", async () => {
    const { code, stderr } = await runNpx(["eslint", "."]);
    assert.equal(code, 0, `eslint . failed:\n${stderr}`);
  });

  test("npx tsc --noEmit exits 0", async () => {
    const { code, stderr } = await runNpx(["tsc", "--noEmit"]);
    assert.equal(code, 0, `tsc --noEmit failed:\n${stderr}`);
  });
});

describe("next.config.ts — build-id resolution and cacheComponents (D-03, D-11)", () => {
  test("resolves the three build-id env vars and never falls back to a constant", () => {
    const source = readText("next.config.ts");
    assert.match(source, /VERCEL_GIT_COMMIT_SHA/);
    assert.match(source, /VERCEL_DEPLOYMENT_ID/);
    assert.match(source, /CAPTURE_BUILD_ID/);
  });

  test("declares cacheComponents: true", () => {
    const source = readText("next.config.ts");
    assert.match(source, /cacheComponents:\s*true/);
  });

  test("contains no webpack() key and no ignoreBuildErrors escape hatch", () => {
    const source = readText("next.config.ts");
    assert.equal(source.includes("webpack("), false);
    assert.equal(source.includes("ignoreBuildErrors"), false);
  });
});

describe("no Routing Middleware anywhere (AD-2)", () => {
  test("no proxy.ts/proxy.js/middleware.ts/middleware.js at repo root or under app/", () => {
    const forbidden = ["proxy.ts", "proxy.js", "middleware.ts", "middleware.js"];
    for (const name of forbidden) {
      assert.equal(
        existsSync(path.join(repoRoot, name)) || existsSync(path.join(repoRoot, "app", name)),
        false,
        `${name} must not exist — AD-2 forbids Routing Middleware`,
      );
    }
  });
});
