/* ================================================================
   NON-BYPASSABILITY CHECK — fixture proof (D-12, D-23)

   Proves check-non-bypassability.mjs exits non-zero on each
   incompleteness class — a new route, a new environment read, a
   second store writer, a missing required section, a missing document
   — and exits 0 on a clean tree, a comment-only environment mention,
   and a route named only inside a fenced code block. Every fixture but
   the first is built from BASELINE_FILES with exactly one thing
   mutated, from throwaway directories that never touch the repository.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

/* A minimal but plausible tree: two routes, a next.config.ts reading
   one variable, a store stub exporting one mutator, and the one
   permitted writer importing it — plus a document naming all of them
   and carrying every section Sweep 4 requires. */
const BASELINE_DOC = `# Non-bypassability enumeration (fixture)

## Scope
A fixture standing in for the real document.

## The single writer
lib/reconcile/apply.ts imports writeCapture from lib/store/memory.ts.

## The single accessor
Not exercised by this fixture tree.

## Routes
### app/api/orders/route.ts
### app/api/session/route.ts

## Configuration
### CAPTURE_BUILD_ID
Read by next.config.ts.

## What a reviewer can run
npm run verify

## Open items
None.
`;

const BASELINE_FILES = {
  "next.config.ts": `const buildId = process.env.CAPTURE_BUILD_ID;
export default { env: { NEXT_PUBLIC_BUILD_ID: buildId } };
`,
  "app/api/orders/route.ts": `export function GET() { return null; }\n`,
  "app/api/session/route.ts": `export function POST() { return null; }\n`,
  "lib/store/memory.ts": `export function writeCapture() {}\n`,
  "lib/reconcile/apply.ts": `import { writeCapture } from "../store/memory.ts";
export function applyItem() { writeCapture(); }
`,
  "docs/analysis/single-writer-non-bypassability.md": BASELINE_DOC,
};

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-non-bypassability.mjs");
  assert.equal(code, 0, stdout + stderr);
  assert.match(stdout, /Problems: 0/);
});

test("a clean fixture tree exits 0", async () => {
  await withFixture(BASELINE_FILES, async (dir) => {
    const { code, stdout, stderr } = await runCheck("scripts/check-non-bypassability.mjs", {
      cwd: dir,
    });
    assert.equal(code, 0, stdout + stderr);
  });
});

test("adding a new route without extending the document exits non-zero and names the path", async () => {
  await withFixture(
    {
      ...BASELINE_FILES,
      "app/api/referrals/route.ts": `export function POST() { return null; }\n`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-non-bypassability.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/referrals\/route\.ts/);
    },
  );
});

test("adding a new process.env read without extending the document exits non-zero and names the variable", async () => {
  await withFixture(
    {
      ...BASELINE_FILES,
      "lib/misc/flag.ts": `export const FLAG = process.env.SOMETHING_NEW;\n`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-non-bypassability.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /SOMETHING_NEW/);
    },
  );
});

test("a process.env read appearing only inside a comment exits 0 — the comment filter, proved", async () => {
  await withFixture(
    {
      ...BASELINE_FILES,
      "lib/misc/flag.ts": `// process.env.SOMETHING_NEW is not actually read here.
export const FLAG = 1;
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-non-bypassability.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a second module importing a mutating export without a document entry exits non-zero", async () => {
  await withFixture(
    {
      ...BASELINE_FILES,
      "lib/reconcile/other.ts": `import { writeCapture } from "../store/memory.ts";
export function otherWrite() { writeCapture(); }
`,
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-non-bypassability.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/reconcile\/other\.ts/);
    },
  );
});

test("a document missing the Configuration section exits non-zero naming the section", async () => {
  await withFixture(
    {
      ...BASELINE_FILES,
      "docs/analysis/single-writer-non-bypassability.md": BASELINE_DOC.replace(
        "## Configuration\n",
        "",
      ),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-non-bypassability.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /Configuration/);
    },
  );
});

test("a missing document file exits non-zero rather than passing", async () => {
  const filesWithoutDoc = { ...BASELINE_FILES };
  delete filesWithoutDoc["docs/analysis/single-writer-non-bypassability.md"];
  await withFixture(filesWithoutDoc, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-non-bypassability.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /does not exist/);
  });
});

test("a document naming a route only inside a fenced code block still exits 0 — the sweep is literal and does not care where the string sits", async () => {
  await withFixture(
    {
      ...BASELINE_FILES,
      "docs/analysis/single-writer-non-bypassability.md": BASELINE_DOC.replace(
        "### app/api/session/route.ts",
        "the second route is documented below:\n\n```\napp/api/session/route.ts\n```",
      ),
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-non-bypassability.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
