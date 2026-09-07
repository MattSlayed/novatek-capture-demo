/* ================================================================
   CONTRAST CHECK — fixture proof (D-23)

   Proves check-contrast.mjs exits 0 against the real repository with
   the six expected ratios, exits non-zero on each below-floor
   violation the exemption register does not cover, and gets the
   W3C relative-luminance formula itself right on two textbook cases.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

test("the real repository exits 0 with the six expected ratios", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-contrast.mjs");
  assert.equal(code, 0, stdout + stderr);
  for (const expected of ["7.98", "14.36", "8.62", "6.59", "4.07", "1.33"]) {
    assert.match(stdout, new RegExp(expected.replace(".", "\\.")));
  }
});

test("a fixture whose capture layer sets --viewer-ink-dim below 7:1 with no exemption exits non-zero", async () => {
  await withFixture(
    {
      "app/styles/tokens.inherited.css": `:root {\n  --navy-deep: #0c1e35;\n}\n`,
      "app/styles/tokens.capture.css": `:root {\n  --viewer-ink-dim: #16293F;\n}\n`,
      "scripts/check-contrast.pairs.json": JSON.stringify([
        {
          id: "test-ink-dim",
          ink: "--viewer-ink-dim",
          ground: "--navy-deep",
          kind: "text",
          note: "fixture",
        },
      ]),
      "docs/design/decorative-exemptions.json": JSON.stringify([]),
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-contrast.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a fixture that adds a text pair with no exemption entry and a below-floor ratio exits non-zero", async () => {
  await withFixture(
    {
      "app/styles/tokens.inherited.css": `:root {\n  --navy-deep: #0c1e35;\n}\n`,
      "app/styles/tokens.capture.css": `:root {\n  --new-ink: #16293F;\n}\n`,
      "scripts/check-contrast.pairs.json": JSON.stringify([
        {
          id: "new-pair",
          ink: "--new-ink",
          ground: "--navy-deep",
          kind: "text",
          note: "fixture",
        },
      ]),
      "docs/design/decorative-exemptions.json": JSON.stringify([]),
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-contrast.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a fixture whose exemption register omits the --viewer-border entry exits non-zero", async () => {
  await withFixture(
    {
      "app/styles/tokens.inherited.css": `:root {\n  --navy-deep: #0c1e35;\n  --viewer-border: rgba(96, 165, 250, 0.16);\n}\n`,
      "app/styles/tokens.capture.css": `:root {\n}\n`,
      "scripts/check-contrast.pairs.json": JSON.stringify([
        {
          id: "ribbon-bottom-border",
          ink: "--viewer-border",
          ground: "--navy-deep",
          kind: "non-text",
          note: "fixture",
        },
      ]),
      "docs/design/decorative-exemptions.json": JSON.stringify([]),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-contrast.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout + "", /not named in/);
    },
  );
});

test("a fixture whose exemption entry's measured_ratio disagrees with the computed value exits non-zero", async () => {
  await withFixture(
    {
      "app/styles/tokens.inherited.css": `:root {\n  --navy-deep: #0c1e35;\n  --viewer-border: rgba(96, 165, 250, 0.16);\n}\n`,
      "app/styles/tokens.capture.css": `:root {\n}\n`,
      "scripts/check-contrast.pairs.json": JSON.stringify([
        {
          id: "ribbon-bottom-border",
          ink: "--viewer-border",
          ground: "--navy-deep",
          kind: "non-text",
          note: "fixture",
        },
      ]),
      "docs/design/decorative-exemptions.json": JSON.stringify([
        {
          id: "ribbon-bottom-border",
          element: "fixture",
          ink: "--viewer-border",
          ground: "--navy-deep",
          measured_ratio: 5.0,
          reason: "fixture",
          source: "fixture",
        },
      ]),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-contrast.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout + "", /disagrees with the computed value/);
    },
  );
});

test("unit case: #ffffff on #000000 computes to 21.00 and a colour against itself computes to 1.00", async () => {
  await withFixture(
    {
      "app/styles/tokens.inherited.css": `:root {\n  --white: #ffffff;\n  --black: #000000;\n}\n`,
      "app/styles/tokens.capture.css": `:root {\n}\n`,
      "scripts/check-contrast.pairs.json": JSON.stringify([
        { id: "white-on-black", ink: "--white", ground: "--black", kind: "text", note: "fixture" },
        { id: "black-on-black", ink: "--black", ground: "--black", kind: "non-text", note: "fixture" },
      ]),
      "docs/design/decorative-exemptions.json": JSON.stringify([
        {
          id: "self-fixture",
          element: "fixture",
          ink: "--black",
          ground: "--black",
          measured_ratio: 1,
          reason: "fixture",
          source: "fixture",
        },
      ]),
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-contrast.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
      assert.match(stdout, /21\.00/);
      assert.match(stdout, /1\.00/);
    },
  );
});
