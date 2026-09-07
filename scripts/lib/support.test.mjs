/* ================================================================
   SUPPORT TEST

   Proves the two shared modules every later check script depends on:
   withFixture/runCheck from fixtures.mjs (D-23 — a check script can
   be proved to exit non-zero on a fixture violation without touching
   the repository) and the pinned MOBILE_PROFILE from harness.mjs
   (D-21).

   Deliberately browser-free: no `launch()` call and no import from
   "playwright". scripts/verify.mjs runs the whole fixture suite as
   one step, and D-22 excludes only the axe step on Vercel — a browser
   launch inside this suite would blur that boundary. harness.mjs's
   launch path is exercised instead by scripts/check-wcag.mjs
   (plan 01-06).
   ================================================================ */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { withFixture, runCheck } from "./fixtures.mjs";
import { MOBILE_PROFILE } from "./harness.mjs";

describe("withFixture", () => {
  test("writes a nested file and removes the directory after the callback resolves", async () => {
    let capturedDir;
    let contentsSeen;

    await withFixture({ "nested/deep/file.txt": "hello fixture" }, async (dir) => {
      capturedDir = dir;
      contentsSeen = await readFile(path.join(dir, "nested/deep/file.txt"), "utf8");
      assert.equal(existsSync(dir), true, "fixture directory must exist during the callback");
    });

    assert.equal(contentsSeen, "hello fixture");
    assert.equal(existsSync(capturedDir), false, "fixture directory must be removed afterward");
  });

  test("removes the directory even when the callback throws", async () => {
    let capturedDir;
    await assert.rejects(
      withFixture({ "a.txt": "x" }, async (dir) => {
        capturedDir = dir;
        throw new Error("boom");
      }),
    );
    assert.equal(existsSync(capturedDir), false, "fixture directory must be removed on throw");
  });
});

describe("runCheck", () => {
  test("resolves with the child's non-zero exit code", async () => {
    await withFixture(
      { "exit-three.mjs": "process.exit(3);\n" },
      async (dir) => {
        const { code } = await runCheck(path.join(dir, "exit-three.mjs"));
        assert.equal(code, 3);
      },
    );
  });

  test("resolves with code 0 and the expected stdout on a normal exit", async () => {
    await withFixture(
      { "print-ok.mjs": "console.log('ok from fixture');\n" },
      async (dir) => {
        const { code, stdout } = await runCheck(path.join(dir, "print-ok.mjs"));
        assert.equal(code, 0);
        assert.match(stdout, /ok from fixture/);
      },
    );
  });
});

describe("MOBILE_PROFILE (D-21)", () => {
  test("matches the pinned mobile values exactly", () => {
    assert.deepEqual(MOBILE_PROFILE, {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
  });

  test("is frozen", () => {
    assert.equal(Object.isFrozen(MOBILE_PROFILE), true);
  });
});
