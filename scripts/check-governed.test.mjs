/* ================================================================
   GOVERNED-SENTENCE CHECK — fixture proof (D-23)

   Proves check-governed.mjs exits non-zero on a second literal of a
   governed sentence anywhere under app/, components/ or lib/ — even
   split across lines or hidden in a comment — and on the set of
   eight ever being reordered or grown to nine. Every fixture writes
   its own lib/copy/governed.ts; the check reads its needles from
   whatever module is present, so the fixture module never needs to
   carry the real project's sentences, only the same shape.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

const BASE_KEYS = [
  "preview",
  "authoredVerification",
  "authoredProposals",
  "noRedaction",
  "memoryStore",
  "noOfflineInference",
  "pendingReconciliation",
  "mediaOnDevice",
];

/** The full, whitespace-normalised sentence a fixture key resolves to. */
function fixtureSentence(key) {
  return `Fixture clause for ${key}. Fixture tail for ${key}.`;
}

/** A well-formed lib/copy/governed.ts fixture, keys in the order given. */
function governedModuleSource({ keys = BASE_KEYS, extraExport = null } = {}) {
  const entries = keys
    .map(
      (key) =>
        `  ${key}: {\n` +
        `    before: "",\n` +
        `    strong: "Fixture clause for ${key}.",\n` +
        `    after: " Fixture tail for ${key}.",\n` +
        `  },`,
    )
    .join("\n");

  let src =
    `export const GOVERNED = {\n${entries}\n};\n\n` +
    `export const PLATFORM_413 = {\n` +
    `  before: "Fixture 413 sentence.",\n` +
    `  strong: "",\n` +
    `  after: "",\n` +
    `};\n`;

  if (extraExport) {
    src +=
      `\nexport const ${extraExport} = {\n` +
      `  before: "",\n` +
      `  strong: "Fixture ninth clause.",\n` +
      `  after: "",\n` +
      `};\n`;
  }

  return src;
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-governed.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("Ribbon.tsx containing a governed sentence as a literal exits non-zero", async () => {
  await withFixture(
    {
      "lib/copy/governed.ts": governedModuleSource(),
      "components/shell/Ribbon.tsx": `export function Ribbon() {
  return <p>${fixtureSentence("preview")}</p>;
}
`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("the same sentence split across three JSX lines with different indentation exits non-zero", async () => {
  await withFixture(
    {
      "lib/copy/governed.ts": governedModuleSource(),
      "components/shell/Ribbon.tsx": `export function Ribbon() {
  return (
    <p>
        Fixture clause for
      preview.
    Fixture tail for preview.
    </p>
  );
}
`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a governed sentence hidden in a comment in app/page.tsx exits non-zero", async () => {
  await withFixture(
    {
      "lib/copy/governed.ts": governedModuleSource(),
      "app/page.tsx": `// ${fixtureSentence("noRedaction")}
export default function Page() {
  return null;
}
`,
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a module exporting a ninth GovernedSentence-shaped binding exits non-zero", async () => {
  await withFixture(
    {
      "lib/copy/governed.ts": governedModuleSource({ extraExport: "NINTH" }),
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

/* ---------------------------------------------------------------
   a governed field that is not one double-quoted literal must be a
   defect, never an empty sentence that silently leaves the sweep
   --------------------------------------------------------------- */

const DOUBLE_QUOTED_STRONG = 'strong: "Fixture clause for noRedaction.",';

test("a governed field written with single quotes exits non-zero", async () => {
  const src = governedModuleSource().replace(
    DOUBLE_QUOTED_STRONG,
    "strong: 'Fixture clause for noRedaction.',",
  );
  assert.notEqual(src, governedModuleSource(), "the fixture must actually change the field");
  await withFixture({ "lib/copy/governed.ts": src }, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /no extractable strong/);
  });
});

test("a governed field written as a template literal exits non-zero", async () => {
  const src = governedModuleSource().replace(
    DOUBLE_QUOTED_STRONG,
    "strong: `Fixture clause for noRedaction.`,",
  );
  await withFixture({ "lib/copy/governed.ts": src }, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /no extractable strong/);
  });
});

test("a governed field written as a concatenation exits non-zero", async () => {
  const src = governedModuleSource().replace(
    DOUBLE_QUOTED_STRONG,
    'strong: "Fixture clause " + "for noRedaction.",',
  );
  await withFixture({ "lib/copy/governed.ts": src }, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /no extractable strong/);
  });
});

test("PLATFORM_413 written with single quotes exits non-zero", async () => {
  const src = governedModuleSource().replace(
    'before: "Fixture 413 sentence.",',
    "before: 'Fixture 413 sentence.',",
  );
  await withFixture({ "lib/copy/governed.ts": src }, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /"PLATFORM_413" has no extractable before/);
  });
});

test("a governed entry whose three fields are all empty exits non-zero", async () => {
  const src = governedModuleSource()
    .replace(DOUBLE_QUOTED_STRONG, 'strong: "",')
    .replace('after: " Fixture tail for noRedaction.",', 'after: "",');
  await withFixture({ "lib/copy/governed.ts": src }, async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /"noRedaction" is empty/);
  });
});

test("a module that reorders two keys exits non-zero", async () => {
  const reordered = [...BASE_KEYS];
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  await withFixture(
    {
      "lib/copy/governed.ts": governedModuleSource({ keys: reordered }),
    },
    async (dir) => {
      const { code } = await runCheck("scripts/check-governed.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("a component that imports and renders the sentence rather than restating it exits 0", async () => {
  await withFixture(
    {
      "lib/copy/governed.ts": governedModuleSource(),
      "components/shell/Ribbon.tsx": `import { GOVERNED } from "@/lib/copy/governed";

export function Ribbon() {
  return (
    <p>
      {GOVERNED.preview.before}
      <strong>{GOVERNED.preview.strong}</strong>
      {GOVERNED.preview.after}
    </p>
  );
}
`,
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-governed.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
