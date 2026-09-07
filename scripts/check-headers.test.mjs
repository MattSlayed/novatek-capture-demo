/* ================================================================
   HEADER CHECK — fixture proof (D-23)

   Proves check-headers.mjs exits non-zero on each of the violations
   D-04 names, from a throwaway vercel.json that never touches the
   repository.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

const BASE = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  framework: "nextjs",
  regions: ["cpt1"],
  buildCommand: "node scripts/verify.mjs",
  headers: [
    {
      source: "/api/(.*)",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [{ key: "Cache-Control", value: "max-age=0, must-revalidate" }],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self)",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ],
    },
  ],
};

function clone() {
  return JSON.parse(JSON.stringify(BASE));
}

test("the real repository vercel.json exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-headers.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("regions set to cdg1 exits non-zero", async () => {
  const fixture = clone();
  fixture.regions = ["cdg1"];
  await withFixture(
    { "vercel.json": JSON.stringify(fixture, null, 2) },
    async (dir) => {
      const { code } = await runCheck("scripts/check-headers.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("Permissions-Policy camera=(), microphone=() exits non-zero", async () => {
  const fixture = clone();
  const block = fixture.headers.find((b) => b.source === "/(.*)");
  const header = block.headers.find((h) => h.key === "Permissions-Policy");
  header.value = "camera=(), microphone=()";
  await withFixture(
    { "vercel.json": JSON.stringify(fixture, null, 2) },
    async (dir) => {
      const { code } = await runCheck("scripts/check-headers.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("Cache-Control no-store, must-revalidate on /api/(.*) exits non-zero", async () => {
  const fixture = clone();
  const block = fixture.headers.find((b) => b.source === "/api/(.*)");
  block.headers[0].value = "no-store, must-revalidate";
  await withFixture(
    { "vercel.json": JSON.stringify(fixture, null, 2) },
    async (dir) => {
      const { code } = await runCheck("scripts/check-headers.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("missing /sw.js block exits non-zero", async () => {
  const fixture = clone();
  fixture.headers = fixture.headers.filter((b) => b.source !== "/sw.js");
  await withFixture(
    { "vercel.json": JSON.stringify(fixture, null, 2) },
    async (dir) => {
      const { code } = await runCheck("scripts/check-headers.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});
