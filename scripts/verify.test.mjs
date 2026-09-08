/* ================================================================
   VERIFY — fixture proof of the fail-fast contract (D-20, D-23)

   Demonstrates, from injected synthetic steps and never a real
   check, that: STEPS carries D-20's exact fifteen-step order;
   runSteps stops at the first non-zero exit and never continues past
   it; resolveSteps removes only the two check-wcag steps, only under
   the platform's own VERCEL variable, and nothing else — no other
   environment variable and no argv flag changes the step list; and
   verify.mjs's own source contains no branch that converts a
   non-zero child exit into a passing one. It also asserts the shape
   of .github/workflows/verify.yml (Task 3), which does not exist
   until that task lands — expected to fail until then, inside this
   same plan.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { STEPS, resolveSteps, runSteps, spawnStep, isMainModule } from "./verify.mjs";

/* ---------------------------------------------------------------
   order assertions (D-20)
   --------------------------------------------------------------- */

const EXPECTED_ORDER = [
  "next-typegen",
  "tsc",
  "eslint",
  "check-tokens",
  "check-governed",
  "claims-audit",
  "fixture-suite",
  "check-headers",
  "check-sw",
  "check-structure",
  "next-build",
  "check-structure-build-output",
  "check-contrast",
  "check-wcag-self-test",
  "check-wcag",
];

test("STEPS carries D-20's fifteen ids in the exact order", () => {
  assert.deepEqual(
    STEPS.map((s) => s.id),
    EXPECTED_ORDER,
  );
});

test("check-structure appears twice, once before and once after next-build", () => {
  const ids = STEPS.map((s) => s.id);
  const structureIndices = ids
    .map((id, i) => (id === "check-structure" || id === "check-structure-build-output" ? i : -1))
    .filter((i) => i !== -1);
  assert.equal(structureIndices.length, 2);
  const buildIndex = ids.indexOf("next-build");
  assert.ok(structureIndices[0] < buildIndex, "check-structure runs before next-build");
  assert.ok(structureIndices[1] > buildIndex, "check-structure-build-output runs after next-build");
});

test("the two check-wcag steps are the last two", () => {
  const ids = STEPS.map((s) => s.id);
  assert.deepEqual(ids.slice(-2), ["check-wcag-self-test", "check-wcag"]);
});

test("no step id is duplicated — the deliberate check-structure pair uses two distinct ids", () => {
  const ids = STEPS.map((s) => s.id);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const duplicated = [...counts.entries()].filter(([, n]) => n > 1);
  assert.deepEqual(duplicated, [], "every step id must be unique, including the two check-structure invocations");
  assert.ok(ids.includes("check-structure") && ids.includes("check-structure-build-output"));
});

/* ---------------------------------------------------------------
   fail-fast assertions (D-20) — synthetic steps, no real check runs
   --------------------------------------------------------------- */

test("runSteps resolves to the first non-zero exit and does not invoke later steps", async () => {
  const invoked = [];
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
  const code = await runSteps(steps, async (step) => {
    invoked.push(step.id);
    return step.id === "c" ? 4 : 0;
  });
  assert.equal(code, 4);
  assert.deepEqual(invoked, ["a", "b", "c"]);
});

test("runSteps resolves to 0 and invokes every step when all return 0", async () => {
  const invoked = [];
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const code = await runSteps(steps, async (step) => {
    invoked.push(step.id);
    return 0;
  });
  assert.equal(code, 0);
  assert.deepEqual(invoked, ["a", "b", "c"]);
});

test("runSteps stops at the first non-zero exit rather than the highest", async () => {
  const invoked = [];
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const code = await runSteps(steps, async (step) => {
    invoked.push(step.id);
    if (step.id === "a") return 1;
    if (step.id === "b") return 2;
    return 0;
  });
  assert.equal(code, 1);
  assert.deepEqual(invoked, ["a"]);
});

/* ---------------------------------------------------------------
   signal-termination assertions — a step the runner kills by signal
   reports code === null and must resolve as a failure, never a pass
   --------------------------------------------------------------- */

/** Run `fn` with process.stderr.write captured, returning what it wrote. */
async function captureStderr(fn) {
  const originalWrite = process.stderr.write;
  const written = [];
  process.stderr.write = (chunk) => {
    written.push(String(chunk));
    return true;
  };
  try {
    return { result: await fn(), written };
  } finally {
    process.stderr.write = originalWrite;
  }
}

test("spawnStep resolves non-zero and names the signal when the child is terminated by SIGTERM (code === null)", async () => {
  const step = {
    id: "signal-fixture",
    command: process.execPath,
    args: ["-e", "setInterval(() => {}, 1000)"],
  };
  const { result: code, written } = await captureStderr(() =>
    spawnStep(step, (child) => child.kill("SIGTERM")),
  );
  assert.notEqual(code, 0, "a signal-terminated step must never resolve as 0");
  assert.ok(
    written.some((w) => w.includes('"signal-fixture"') && w.includes("SIGTERM")),
    `expected a stderr line naming the step and the signal, got: ${JSON.stringify(written)}`,
  );
});

test("spawnStep resolves non-zero when the child kills itself with SIGTERM", async () => {
  const step = {
    id: "self-kill-fixture",
    command: process.execPath,
    args: ["-e", 'process.kill(process.pid, "SIGTERM")'],
  };
  const { result: code } = await captureStderr(() => spawnStep(step));
  assert.notEqual(code, 0);
});

test("spawnStep resolves the child's own non-zero exit code unchanged", async () => {
  const step = { id: "exit-seven", command: process.execPath, args: ["-e", "process.exit(7)"] };
  const code = await spawnStep(step);
  assert.equal(code, 7);
});

test("spawnStep resolves 0 for a child that exits 0", async () => {
  const step = { id: "exit-zero", command: process.execPath, args: ["-e", "process.exit(0)"] };
  const code = await spawnStep(step);
  assert.equal(code, 0);
});

/* ---------------------------------------------------------------
   exclusion assertions (D-22) — resolveSteps reads only env.VERCEL
   --------------------------------------------------------------- */

test("VERCEL=1 excludes exactly the two check-wcag steps and reports the exclusion", () => {
  const messages = [];
  const originalLog = console.log;
  console.log = (msg) => messages.push(String(msg));
  let kept;
  try {
    kept = resolveSteps(STEPS, { VERCEL: "1" });
  } finally {
    console.log = originalLog;
  }
  assert.equal(kept.length, 13);
  assert.ok(!kept.some((s) => s.id === "check-wcag-self-test" || s.id === "check-wcag"));
  assert.ok(messages.some((m) => m.includes("check-wcag-self-test")));
  assert.ok(messages.some((m) => m.includes("check-wcag") && !m.includes("check-wcag-self-test")));
});

test("VERCEL unset retains all fifteen steps", () => {
  const kept = resolveSteps(STEPS, {});
  assert.equal(kept.length, 15);
  assert.deepEqual(kept.map((s) => s.id), EXPECTED_ORDER);
});

test("no environment variable other than VERCEL changes the step list", () => {
  const distractors = [
    { CI: "true" },
    { NODE_ENV: "test" },
    { SKIP_WCAG: "1" },
    { FAST: "1" },
    { VERCEL: "0" },
    { VERCEL: "preview" },
  ];
  for (const env of distractors) {
    const kept = resolveSteps(STEPS, env);
    assert.equal(kept.length, 15, `env ${JSON.stringify(env)} must not change the step list`);
  }
});

test("no argv flag changes the step list (--skip, --only, --fast, --no-wcag)", () => {
  const flags = ["--skip", "--only", "--fast", "--no-wcag"];
  const originalArgv = process.argv.slice();
  try {
    for (const flag of flags) {
      process.argv = [...originalArgv, flag];
      const kept = resolveSteps(STEPS, {});
      assert.equal(kept.length, 15, `argv flag ${flag} must not change the step list`);
    }
  } finally {
    process.argv = originalArgv;
  }
});

/* ---------------------------------------------------------------
   warning-substitution assertion — verify.mjs's own source never
   converts a non-zero child exit into a passing one
   --------------------------------------------------------------- */

test("verify.mjs's source contains no branch that turns a failure into a pass", async () => {
  const src = await readFile(new URL("./verify.mjs", import.meta.url), "utf8");
  assert.ok(!/\bwarning\b/i.test(src), "must not describe a failure as a warning");
  assert.ok(!/\bcontinue\b/i.test(src), "must not continue past a failing step");
  assert.ok(!src.includes("--skip"), "must carry no --skip flag");
  assert.ok(!src.includes("--only"), "must carry no --only flag");
  assert.ok(!src.includes("--fast"), "must carry no --fast flag");
  assert.ok(!src.includes("npm ls"), "must never add npm ls as a step");
  assert.ok(!src.includes("next lint"), "must never call the removed next lint");
  assert.ok(src.includes("git rev-parse --short HEAD"), "must derive CAPTURE_BUILD_ID from git");
  assert.ok(src.includes("CAPTURE_BUILD_ID"));
  assert.ok(src.includes("scripts/.check/build.log"));
});

/* ---------------------------------------------------------------
   entry-guard assertions — the gate must run on Node 24.0/24.1,
   where import.meta.main is undefined, rather than exit 0 untested
   --------------------------------------------------------------- */

test("isMainModule returns a boolean import.meta.main as-is", () => {
  const self = fileURLToPath(import.meta.url);
  assert.equal(isMainModule({ main: true, url: import.meta.url }, [process.execPath, "/elsewhere.mjs"]), true);
  assert.equal(isMainModule({ main: false, url: import.meta.url }, [process.execPath, self]), false);
});

test("isMainModule falls back to the entry-script path when import.meta.main is undefined", () => {
  const self = fileURLToPath(import.meta.url);
  assert.equal(isMainModule({ url: import.meta.url }, [process.execPath, self]), true);
  assert.equal(
    isMainModule({ url: import.meta.url }, [process.execPath, path.join(path.dirname(self), "verify.mjs")]),
    false,
    "a different entry script must not count as main",
  );
  assert.equal(isMainModule({ url: import.meta.url }, [process.execPath]), false, "no entry script at all is not main");
});

test("verify.mjs's entry guard goes through isMainModule, never a bare import.meta.main", async () => {
  const src = await readFile(new URL("./verify.mjs", import.meta.url), "utf8");
  assert.ok(src.includes("if (isMainModule(import.meta))"), "the guard must call isMainModule(import.meta)");
  assert.doesNotMatch(src, /if\s*\(\s*import\.meta\.main\s*\)/, "a bare import.meta.main guard is a silent no-op on Node 24.0/24.1");
});

/* ---------------------------------------------------------------
   the real gate exits 0 (slow — a full build, contrast and axe scan)
   --------------------------------------------------------------- */

test("resolveSteps(STEPS, process.env) matches EXPECTED_ORDER when VERCEL is unset locally", () => {
  const kept = resolveSteps(STEPS, { ...process.env, VERCEL: undefined });
  assert.deepEqual(
    kept.map((s) => s.id),
    EXPECTED_ORDER,
  );
});

/* ---------------------------------------------------------------
   Task 3 — the workflow this gate runs under on every push (D-22)
   --------------------------------------------------------------- */

test(".github/workflows/verify.yml declares the verify job on every push", async () => {
  let src;
  try {
    src = await readFile(".github/workflows/verify.yml", "utf8");
  } catch (e) {
    assert.fail(`.github/workflows/verify.yml does not exist yet: ${e.message}`);
  }
  assert.match(src, /^name:\s*verify\s*$/m);
  assert.match(src, /^on:\s*push\s*$/m);
  assert.match(src, /^\s*verify:\s*$/m);
  assert.match(src, /runs-on:\s*ubuntu-latest/);
  assert.match(src, /node-version:\s*24/);
  assert.match(src, /npm ci/);
  assert.match(src, /npx playwright install --with-deps chromium/);
  assert.match(src, /npm run verify/);
  assert.ok(!/npm run verify\s+--\S/.test(src), "npm run verify must carry no extra flags");
  assert.ok(!src.includes("schedule"), "no schedule trigger");
  assert.ok(!src.includes("workflow_dispatch"), "no manual dispatch");
  assert.ok(!src.includes("matrix"), "no matrix strategy");
});

test(".github/workflows/verify.yml's job id is exactly verify (the Vercel Deployment Check name)", async () => {
  const src = await readFile(".github/workflows/verify.yml", "utf8");
  const jobsBlock = src.slice(src.indexOf("jobs:"));
  const jobIdMatch = jobsBlock.match(/^\s{2}(\S+):\s*$/m);
  assert.ok(jobIdMatch, "could not find a job id under jobs:");
  assert.equal(jobIdMatch[1], "verify");
});
