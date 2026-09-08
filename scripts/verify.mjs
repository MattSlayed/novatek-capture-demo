/* ================================================================
   VERIFY — the one gate (AD-15)

   Every build-time check this repository owns, run in one fixed
   order (D-20), stopping at the first non-zero exit. This is the
   file `package.json`'s "verify" script and `vercel.json`'s
   buildCommand both point at, unmodified — the same command a
   developer runs on their own machine is the command that gates a
   deployment. A check fails here; it never degrades into a passed
   build with a note attached. A phase that creates a new check adds
   its step to STEPS below and nowhere else.

     node scripts/verify.mjs

   There is no flag that skips a step and no environment variable
   other than the platform's own VERCEL that changes the step list
   (D-22) — see resolveSteps below. Exit 0 = every step exited 0.
   Exit non-zero = the first step's own exit code.
   ================================================================ */

import { spawn, execSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILD_LOG_PATH = "scripts/.check/build.log";

/* ---------------------------------------------------------------
   D-03 — resolve CAPTURE_BUILD_ID for the next-build step's child
   environment only, never the parent shell, and only when none of
   the three variables next.config.ts checks is already present.
   --------------------------------------------------------------- */

function resolveBuildEnv() {
  const env = {};
  if (
    !process.env.VERCEL_GIT_COMMIT_SHA &&
    !process.env.VERCEL_DEPLOYMENT_ID &&
    !process.env.CAPTURE_BUILD_ID
  ) {
    try {
      env.CAPTURE_BUILD_ID = execSync("git rev-parse --short HEAD", {
        encoding: "utf8",
      }).trim();
    } catch {
      /* left unresolved on purpose — next.config.ts's own build-id
         gate reports the specific failure; this file never invents
         a constant fallback (D-03). */
    }
  }
  return env;
}

/* ---------------------------------------------------------------
   STEPS — D-20's order, exactly. `shell: true` only for the
   npx-resolved binaries (next, tsc, eslint), which do not resolve
   directly on this Windows workstation without one; every
   `node scripts/*.mjs` invocation runs unshelled so its exit code
   is exact. `vercelExcluded: true` marks the two steps resolveSteps
   removes when the platform's own VERCEL variable is "1".
   --------------------------------------------------------------- */

/* Both `next typegen` and `next build` load next.config.ts under a
   production-like NODE_ENV, so both need the same resolved build id
   in their child environment or D-03's gate throws on typegen before
   a single check has run — reproduced directly against this
   repository, not assumed. One resolution, reused by both steps. */
const buildEnv = resolveBuildEnv();

export const STEPS = [
  { id: "next-typegen", command: "npx", args: ["next", "typegen"], shell: true, env: buildEnv },
  { id: "tsc", command: "npx", args: ["tsc", "--noEmit"], shell: true },
  { id: "eslint", command: "npx", args: ["eslint", "."], shell: true },
  { id: "check-tokens", command: process.execPath, args: ["scripts/check-tokens.mjs"] },
  { id: "check-governed", command: process.execPath, args: ["scripts/check-governed.mjs"] },
  { id: "claims-audit", command: process.execPath, args: ["scripts/claims-audit.mjs"] },
  /* The whole fixture suite, browser-free by construction — this is
     what lets the two check-wcag steps below be the only steps
     resolveSteps ever removes. `--test` is passed the same recursive
     glob package.json's own "test" script uses: a bare directory
     argument (`node --test scripts/`) throws MODULE_NOT_FOUND on this
     Node 24 / Windows install (see SUMMARY for the reproduction); the
     glob, passed as a single unshelled argv entry so Node resolves it
     itself rather than a parent shell, behaves identically here and
     on Ubuntu. */
  { id: "fixture-suite", command: process.execPath, args: ["--test", "scripts/**/*.test.mjs"] },
  { id: "check-headers", command: process.execPath, args: ["scripts/check-headers.mjs"] },
  { id: "check-sw", command: process.execPath, args: ["scripts/check-sw.mjs"] },
  { id: "check-structure", command: process.execPath, args: ["scripts/check-structure.mjs"] },
  {
    id: "next-build",
    command: "npx",
    args: ["next", "build"],
    shell: true,
    env: buildEnv,
    capture: BUILD_LOG_PATH,
  },
  /* Additive, never a substitute for the check-structure step above
     (D-11) — asserted from the build's own captured output. */
  {
    id: "check-structure-build-output",
    command: process.execPath,
    args: ["scripts/check-structure.mjs", "--build-output", BUILD_LOG_PATH],
  },
  { id: "check-contrast", command: process.execPath, args: ["scripts/check-contrast.mjs"] },
  {
    id: "check-wcag-self-test",
    command: process.execPath,
    args: ["scripts/check-wcag.mjs", "--self-test"],
    vercelExcluded: true,
  },
  {
    id: "check-wcag",
    command: process.execPath,
    args: ["scripts/check-wcag.mjs"],
    vercelExcluded: true,
  },
];

/* ---------------------------------------------------------------
   resolveSteps — the single, environment-marked exclusion (D-22).
   Reads only `env.VERCEL`; never argv, never any other variable.
   Prints the excluded step id and the job that runs it instead, so
   an excluded step is visible in the log and never silent.
   --------------------------------------------------------------- */

export function resolveSteps(steps, env = process.env) {
  if (env.VERCEL !== "1") {
    return steps;
  }
  const kept = [];
  for (const step of steps) {
    if (step.vercelExcluded) {
      console.log(
        `!  excluding step "${step.id}" — env.VERCEL === "1"; the GitHub Actions "verify" job (.github/workflows/verify.yml) runs it instead`,
      );
    } else {
      kept.push(step);
    }
  }
  return kept;
}

/* ---------------------------------------------------------------
   runSteps — the fail-fast runner. Invokes each step in order via
   the injected `run` function; stops and returns the first non-zero
   result. Never converts a non-zero result into 0.
   --------------------------------------------------------------- */

export async function runSteps(steps, run) {
  for (const step of steps) {
    const code = await run(step);
    if (code !== 0) {
      return code;
    }
  }
  return 0;
}

/* ---------------------------------------------------------------
   defaultRun — spawns one real step, streaming stdout/stderr to the
   console and, when `capture` is set, also writing the combined
   output to that path once the child closes.

   A captured step's log is this run's evidence and nothing else's:
   any stale file at `capture` is removed before the child starts, so
   a later step can never parse a previous run's log as if it were
   this build's, and a capture that cannot be written resolves the
   step as a failure rather than leaving that stale file in place.
   --------------------------------------------------------------- */

export async function spawnStep(step, onSpawn) {
  if (step.capture) {
    await rm(step.capture, { force: true });
  }
  return new Promise((resolveSpawn) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: { ...process.env, ...(step.env ?? {}) },
      shell: step.shell === true,
    });
    /* `onSpawn` exists for scripts/verify.test.mjs alone, so a fixture
       can terminate the child by signal and prove the code === null
       branch below; the gate itself never passes one. */
    if (typeof onSpawn === "function") onSpawn(child);
    /* Raw Buffer chunks, decoded once at close. The route glyphs that
       check-structure --build-output parses (┌ ├ └ ○ ◐) are three-byte
       UTF-8 sequences; decoding chunk by chunk would turn one split
       across a chunk boundary into U+FFFD and fail the gate for a
       reason unrelated to the build. */
    const chunks = [];
    child.stdout?.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (step.capture) chunks.push(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
      if (step.capture) chunks.push(chunk);
    });
    child.on("close", async (code, signal) => {
      let captureWritten = true;
      if (step.capture) {
        try {
          await mkdir(path.dirname(step.capture), { recursive: true });
          await writeFile(step.capture, Buffer.concat(chunks).toString("utf8"), "utf8");
        } catch (e) {
          captureWritten = false;
          process.stderr.write(
            `\n✖ step "${step.id}": could not write ${step.capture}: ${e.message} — an unrecorded log is a failure, never a pass\n`,
          );
        }
      }
      /* A signal-terminated child (an OOM SIGKILL, a runner's SIGTERM,
         a crash surfacing as a signal) reports code === null. The step
         reached no verdict, so that is a failure — never a pass. */
      if (code === null) {
        process.stderr.write(
          `\n✖ step "${step.id}" was terminated by ${signal ?? "an unknown signal"} — treated as a failure\n`,
        );
        resolveSpawn(1);
        return;
      }
      if (code === 0 && !captureWritten) {
        resolveSpawn(1);
        return;
      }
      resolveSpawn(code);
    });
  });
}

async function defaultRun(step) {
  console.log(`\n▶ ${step.id} — ${step.command} ${step.args.join(" ")}`);
  const code = await spawnStep(step);
  if (code !== 0) {
    console.log(
      `\n✖ step "${step.id}" exited ${code}. Re-run it directly with: ${step.command} ${step.args.join(" ")}`,
    );
  }
  return code;
}

/* ---------------------------------------------------------------
   execution — guarded so scripts/verify.test.mjs can import STEPS,
   resolveSteps, runSteps and spawnStep without running the gate.

   `import.meta.main` exists from Node 24.2. On 24.0/24.1, which the
   "24" engines pin admits, it is undefined — and a guard that tests
   that value alone would then run no step and exit 0 having checked
   nothing. isMainModule uses the boolean when Node provides
   one and otherwise compares the entry script's path with this
   module's own, so the gate runs on every 24.x instead of silently
   passing.
   --------------------------------------------------------------- */

export function isMainModule(meta, argv = process.argv) {
  if (typeof meta.main === "boolean") return meta.main;
  if (typeof argv[1] !== "string" || argv[1].length === 0) return false;
  const entry = path.resolve(argv[1]);
  const self = fileURLToPath(meta.url);
  return process.platform === "win32"
    ? entry.toLowerCase() === self.toLowerCase()
    : entry === self;
}

if (isMainModule(import.meta)) {
  console.log("VERIFY");
  console.log("=".repeat(72));
  const steps = resolveSteps(STEPS, process.env);
  const exitCode = await runSteps(steps, defaultRun);
  if (exitCode === 0) {
    console.log("\nAll steps exited 0.");
  }
  process.exit(exitCode);
}
