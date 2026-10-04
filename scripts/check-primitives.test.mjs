/* ================================================================
   PRIMITIVES CHECK — fixture proof (D-07, D-23)

   Proves check-primitives.mjs exits non-zero on each violation
   class, from throwaway directories that never touch the
   repository, plus one real proof against this repository's own
   source. Every fixture starts from BASE, the smallest tree that
   satisfies every assertion — the record control's geometry and
   haptic call, the seven marks, the one focus rule, and the three
   lib/ modules D1 and D3 read — so each violation test adds exactly
   one defect, and the self-invalidation guards prove the sweep does
   not over-fire on the repository's own legitimate shapes.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

const CHECK = "scripts/check-primitives.mjs";

const SHAPES = [
  "hollow-square-2px",
  "half-filled-square",
  "filled-square",
  "filled-diamond",
  "hollow-square-diagonal",
  "hollow-square-1px",
  "hollow-square-dot",
];

const conflicts = (actions) => `export const CONFLICT_COPY = {
  order_closed: {
    sentence: "This order is closed, so nothing was bound.",
    actions: ["Discard"],
  },
  already_open: {
    sentence: "The clock was already running on this order, so nothing was lost.",
    actions: ${actions},
  },
};
`;

const GOVERNED = `export const GOVERNED = {
  preview: {
    before: "",
    strong: "Designed preview.",
    after: " The records here are synthetic.",
  },
};
`;

const BASE = {
  "app/globals.css": `:focus-visible {
  outline: 2px solid var(--cobalt-glow);
  outline-offset: 2px;
}
`,
  "components/controls/RecordControl.module.css": `.control {
  width: var(--target-record);
  height: var(--target-record);
  transition: border-radius var(--dur-press) var(--ease-out-expo);
}
`,
  "components/controls/RecordControl.tsx": `export function RecordControl() {
  if ("vibrate" in navigator) {
    navigator.vibrate(12);
  }
  return null;
}
`,
  "components/marks/StateMark.module.css": SHAPES.map((s) => `.${s} {
  width: 10px;
}
`).join("\n"),
  "lib/copy/governed.ts": `${GOVERNED}
export const FR48A_DISPOSITION =
  "The work-order identity is real and enforced; the observations are authored.";
`,
  "lib/data/types.ts": `export type ConflictCode =
  | "order_closed"
  | "already_open";

export const CONFLICT_CODES: ConflictCode[] = ["order_closed", "already_open"];
`,
  "lib/copy/conflicts.ts": conflicts(`["View time on this order"]`),
};

/** BASE plus `files` must exit non-zero, and the output must match every pattern. */
async function expectDefect(files, ...patterns) {
  await withFixture({ ...BASE, ...files }, async (dir) => {
    const { code, stdout, stderr } = await runCheck(CHECK, { cwd: dir });
    assert.notEqual(code, 0, stdout + stderr);
    for (const p of patterns) assert.match(stdout, p);
  });
}

/** BASE plus `files` must exit 0. */
async function expectClean(files) {
  await withFixture({ ...BASE, ...files }, async (dir) => {
    const { code, stdout, stderr } = await runCheck(CHECK, { cwd: dir });
    assert.equal(code, 0, stdout + stderr);
  });
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck(CHECK);
  assert.equal(code, 0, stdout + stderr);
  assert.match(stdout, /^PRIMITIVES CHECK/);
  assert.match(stdout, /Problems: 0/);
});

test("the BASE fixture exits 0, so each violation test below adds exactly one defect", async () => {
  await expectClean({});
});

/* ---------------------------------------------------------------
   CSS scope — one fixture per violation class
   --------------------------------------------------------------- */

test("a second module declaring 130px as a width exits non-zero and names the file (A1)", async () => {
  await expectDefect(
    { "components/screens/Big.module.css": `.big {\n  width: 130px;\n}\n` },
    /components\/screens\/Big\.module\.css/,
    /130px/,
  );
});

test("a screen module declaring min-height: 44px exits non-zero and names the file (A2)", async () => {
  await expectDefect(
    { "components/screens/List.module.css": `.item {\n  min-height: 44px;\n}\n` },
    /components\/screens\/List\.module\.css/,
    /min-height: 44px/,
  );
});

test("a module containing a :focus-visible rule exits non-zero and names the file (A3)", async () => {
  await expectDefect(
    { "components/screens/Focus.module.css": `.link:focus-visible {\n  color: var(--viewer-ink);\n}\n` },
    /components\/screens\/Focus\.module\.css/,
    /:focus-visible/,
  );
});

test("a box-shadow inside globals.css's :focus-visible block exits non-zero (A3)", async () => {
  await expectDefect(
    {
      "app/globals.css": `:focus-visible {\n  outline: 2px solid var(--cobalt-glow);\n  outline-offset: 2px;\n  box-shadow: 0 0 0 2px var(--cobalt-glow);\n}\n`,
    },
    /app\/globals\.css/,
    /box-shadow/,
  );
});

test("a second module declaring a state-mark shape exits non-zero and names the file (A4)", async () => {
  await expectDefect(
    { "components/screens/Card.module.css": `.filled-diamond {\n  transform: rotate(45deg);\n}\n` },
    /components\/screens\/Card\.module\.css/,
    /filled-diamond/,
  );
});

test("a module declaring position: fixed exits non-zero and names the file (A5)", async () => {
  await expectDefect(
    { "components/screens/Bar.module.css": `.bar {\n  position: fixed;\n}\n` },
    /components\/screens\/Bar\.module\.css/,
    /position: fixed/,
  );
});

test("a module declaring position: sticky exits non-zero and names the file (A6)", async () => {
  await expectDefect(
    { "components/screens/Head.module.css": `.head {\n  position: sticky;\n}\n` },
    /components\/screens\/Head\.module\.css/,
    /position: sticky/,
  );
});

test("a ribbon max-height other than none exits non-zero (A7)", async () => {
  await expectDefect(
    { "components/shell/Ribbon.module.css": `.band {\n  max-height: 4rem;\n}\n` },
    /components\/shell\/Ribbon\.module\.css/,
    /max-height: 4rem/,
  );
});

test("a second transition declaration exits non-zero and names the file (A8)", async () => {
  await expectDefect(
    { "components/screens/Fade.module.css": `.panel {\n  transition: opacity 200ms;\n}\n` },
    /components\/screens\/Fade\.module\.css/,
    /transition: opacity 200ms/,
  );
});

test("a module carrying a raw hex colour exits non-zero and names the file (A9)", async () => {
  await expectDefect(
    { "components/screens/Hex.module.css": `.warn {\n  color: #1a2b3c;\n}\n` },
    /components\/screens\/Hex\.module\.css/,
    /#1a2b3c/,
  );
});

test("a module putting --record-fill on a color: property exits non-zero and names the file (A13)", async () => {
  await expectDefect(
    { "components/screens/Ink.module.css": `.label {\n  color: var(--record-fill);\n}\n` },
    /components\/screens\/Ink\.module\.css/,
    /--record-fill/,
  );
});

test("--viewer-border on a property other than border-* exits non-zero (A13)", async () => {
  await expectDefect(
    { "components/screens/Edge.module.css": `.card {\n  box-shadow: 0 0 0 1px var(--viewer-border);\n}\n` },
    /components\/screens\/Edge\.module\.css/,
    /--viewer-border/,
  );
});

test("a module using --rule-faint exits non-zero and names the file (A14)", async () => {
  await expectDefect(
    { "components/screens/Rule.module.css": `.row {\n  border-top: 1px solid var(--rule-faint);\n}\n` },
    /components\/screens\/Rule\.module\.css/,
    /--rule-faint/,
  );
});

/* ---------------------------------------------------------------
   tsx scope — one fixture per violation class
   --------------------------------------------------------------- */

test("a .tsx importing next/link exits non-zero and names the file (A12)", async () => {
  await expectDefect(
    {
      "components/screens/Nav.tsx": `import Link from "next/link";\nexport function Nav() {\n  return <Link href="/?s=orders">Orders</Link>;\n}\n`,
    },
    /components\/screens\/Nav\.tsx/,
    /next\/link/,
  );
});

test("a .tsx calling router.push exits non-zero and names the file (A12)", async () => {
  await expectDefect(
    {
      "components/screens/Go.tsx": `export function Go({ router }) {\n  router.push("/?s=orders");\n  return null;\n}\n`,
    },
    /components\/screens\/Go\.tsx/,
    /router\.push/,
  );
});

test("a .tsx containing aria-modal exits non-zero and names the file (A10)", async () => {
  await expectDefect(
    {
      "components/screens/Dialog.tsx": `export function Dialog() {\n  return <div role="dialog" aria-modal="true" />;\n}\n`,
    },
    /components\/screens\/Dialog\.tsx/,
    /aria-modal/,
  );
});

test("a .tsx reading localStorage exits non-zero and names the file (A16)", async () => {
  await expectDefect(
    {
      "components/screens/Persona.tsx": `export function Persona() {\n  return localStorage.getItem("persona");\n}\n`,
    },
    /components\/screens\/Persona\.tsx/,
    /localStorage/,
  );
});

test("a .tsx declaring a module-scope let exits non-zero and names the file (A16)", async () => {
  await expectDefect(
    {
      "components/screens/Cache.tsx": `let cached = null;\nexport function Cache() {\n  return cached;\n}\n`,
    },
    /components\/screens\/Cache\.tsx/,
    /let cached/,
  );
});

test("a second file importing parseSurface exits non-zero and names the file (A17)", async () => {
  await expectDefect(
    {
      "components/screens/Other.tsx": `import { parseSurface } from "@/lib/client/navigate";\nexport function Other({ s }) {\n  return parseSurface(s);\n}\n`,
    },
    /components\/screens\/Other\.tsx/,
    /parseSurface/,
  );
});

test("a .tsx calling navigator.vibrate outside the record control exits non-zero and names the file (A15)", async () => {
  await expectDefect(
    {
      "components/screens/Buzz.tsx": `export function Buzz() {\n  if ("vibrate" in navigator) navigator.vibrate(5);\n  return null;\n}\n`,
    },
    /components\/screens\/Buzz\.tsx/,
    /navigator\.vibrate/,
  );
});

/* ---------------------------------------------------------------
   copy — D1 and D3, read from lib/ as text
   --------------------------------------------------------------- */

test("a CONFLICT_COPY whose already_open entry carries two actions exits non-zero (D3)", async () => {
  await expectDefect(
    { "lib/copy/conflicts.ts": conflicts(`["View time on this order", "Discard"]`) },
    /lib\/copy\/conflicts\.ts/,
    /already_open carries 2 actions/,
  );
});

test("a governed.ts with no disposition sentence exits non-zero (D1)", async () => {
  await expectDefect(
    { "lib/copy/governed.ts": GOVERNED },
    /lib\/copy\/governed\.ts/,
    /FR48A_DISPOSITION/,
  );
});

test("a governed.ts whose disposition is a {before, strong, after} triple exits non-zero (D1)", async () => {
  await expectDefect(
    {
      "lib/copy/governed.ts": `${GOVERNED}
export const FR48A_DISPOSITION = {
  before: "",
  strong: "The work-order identity is real.",
  after: " The observations are authored.",
};
`,
    },
    /lib\/copy\/governed\.ts/,
    /FR48A_DISPOSITION is a \{before, strong, after\} triple/,
  );
});

/* ---------------------------------------------------------------
   self-invalidation guards — the repository's legitimate shapes
   must not trip the sweep
   --------------------------------------------------------------- */

test("position: relative and position: absolute, used correctly, exit 0 — the self-invalidation guard for A5 and A6", async () => {
  await expectClean({
    "components/screens/Layered.module.css": `.band {\n  position: relative;\n}\n\n.band::after {\n  position: absolute;\n  inset: 0;\n}\n`,
  });
});

test("44px written only inside a comment exits 0 — the self-invalidation guard for A2", async () => {
  await expectClean({
    "components/screens/Note.module.css": `.note {\n  /* A screen never declares\n     min-height: 44px; the floor is the row's. */\n  display: block;\n}\n`,
  });
});

test("the word transition appearing only in a .ts file's prose exits 0 — the self-invalidation guard for A8", async () => {
  await expectClean({
    "app/api/orders/[id]/open/route.ts": `/* The open transition is idempotent:\n   transition: open to open adds no segment. */\n// A second transition request is refused with already_open.\nexport function POST() {\n  return null;\n}\n`,
  });
});

test("--rule-faint declared in the token file and used nowhere exits 0 — the self-invalidation guard for A13 and A14", async () => {
  await expectClean({
    "app/styles/tokens.capture.css": `:root {\n  --rule-faint: rgba(255, 255, 255, 0.12);\n}\n`,
  });
});

test("router.push on an unstarred continuation line of a JSX block comment exits 0 — the Ribbon.tsx shape, guard for A12", async () => {
  await expectClean({
    "components/shell/Banner.tsx": `export function Banner() {
  return (
    <a href="/?s=limits">
      {/* A plain anchor on purpose: no <Link>, no
          router.push. A later phase swaps it for a history.pushState
          handler. */}
      Read the limits
    </a>
  );
}
`,
  });
});

test("--cobalt-glow-ink on a color: property exits 0 — a token name is matched whole, guard for A13", async () => {
  await expectClean({
    "components/screens/Link.module.css": `.link {\n  color: var(--cobalt-glow-ink);\n}\n`,
  });
});
