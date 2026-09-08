/* ================================================================
   SERVER LIFECYCLE — fixture proof (D-23)

   Proves scripts/lib/server.mjs's stopServer ends a process it did
   not spawn directly — an intermediate process's own child — which
   is exactly the shape a shell-wrapped `next start` had: GitHub
   Actions run 34196058170 showed the shell's pid die while
   `next start` survived as an orphan with its stdout/stderr pipes
   still open, and scripts/check-wcag.mjs never exited. The fixture
   below is pure `process.execPath`, no shell binary at all, so the
   two-hop shape it reproduces (an intermediate process spawning a
   long-lived grandchild) is identical on Windows and Linux.

   The "runner" fixture script deliberately never calls
   process.exit() — the same discipline scripts/check-wcag.mjs's
   report section now follows — so this also proves that once
   stopServer resolves, nothing is left open that keeps the runner's
   own event loop (and therefore the runner process itself) alive.

   TEARDOWN PROOF, REVISED. The grandchild's own liveness used to be
   asserted with `process.kill(pid, 0)` alone. That is not a proof of
   "the grandchild is no longer running" in every environment this
   gate runs in — it is a proof of "the OS has reaped this pid",
   which is a different claim. GitHub Actions' ubuntu-latest runner
   reaps a reparented zombie immediately (systemd as pid 1); Vercel's
   build container does not, so the same tree that passed on GitHub
   (run 34201360044) failed the Vercel build of `293fa89` (deployment
   8FN8Kb43W) on that exact assertion, with the runner itself already
   having reported STOP_MS and STOPPED. The grandchild now writes a
   heartbeat file every ~100ms (see GRANDCHILD_SRC); the primary proof
   below is that the heartbeat stops growing and stays stopped across
   a quiet window after stopServer resolves — true regardless of
   whether the OS has reaped the pid, because a zombie cannot execute
   JavaScript and so can never write another heartbeat line. The pid
   probe is kept only as a secondary, zombie-tolerant corroboration
   (see isAlive in server.mjs).
   ================================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { withFixture, repoRoot } from "./fixtures.mjs";
import { isAlive } from "./server.mjs";

const RUNNER_TIMEOUT_MS = 15_000;

/* A long-lived leaf process that prints its own pid, then writes its
   own heartbeat into the fixture directory every 100ms until it is
   killed, and never exits on its own. The heartbeat file — not this
   process's pid — is the runner's actual teardown proof (see
   waitForHeartbeatToStop below): appendFileSync is synchronous, so
   each tick either lands before the process dies or does not happen
   at all, with nothing in between for a poll to race against. No
   regex, no "\n" escape and no backtick appears in any of the three
   fixture sources below — they are generated strings embedded in this
   file's own source, so avoiding those characters sidesteps a second
   layer of escaping entirely. */
const GRANDCHILD_SRC = `import { appendFileSync } from "node:fs";
console.log("GRANDCHILD_PID:" + process.pid);
setInterval(function () {
  appendFileSync("heartbeat.txt", Date.now() + ";");
}, 100);
`;

/* The intermediate hop — mimics the shell that used to wrap
   next start: it spawns the real long-lived process and, left alone,
   would wait for it. */
const PARENT_SRC = `import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

var dir = path.dirname(fileURLToPath(import.meta.url));
var grandchild = spawn(process.execPath, [path.join(dir, "grandchild.mjs")], {
  stdio: "inherit",
});
grandchild.on("exit", function () {
  process.exit(0);
});
`;

/* The script under proof — the caller. Starts the two-hop tree
   through scripts/lib/server.mjs, waits for the grandchild to report
   its own pid, tears the whole tree down through stopServer, times
   that call, and then — the point of this fixture — exits by letting
   its own event loop drain rather than calling process.exit(). */
const RUNNER_SRC = `import path from "node:path";
import { pathToFileURL } from "node:url";

var repoRootPath = process.env.SERVER_TEST_REPO_ROOT;
var fixtureDir = process.env.SERVER_TEST_FIXTURE_DIR;

var serverLibUrl = pathToFileURL(
  path.join(repoRootPath, "scripts", "lib", "server.mjs"),
).href;
var mod = await import(serverLibUrl);
var startServer = mod.startServer;
var stopServer = mod.stopServer;

var parentScript = path.join(fixtureDir, "parent.mjs");
var child = startServer(process.execPath, [parentScript], { cwd: fixtureDir });

child.stderr.on("data", function () {});

var grandchildPid;
await new Promise(function (resolve) {
  child.stdout.on("data", function (chunk) {
    if (grandchildPid !== undefined) return;
    var text = chunk.toString();
    var marker = "GRANDCHILD_PID:";
    var idx = text.indexOf(marker);
    if (idx === -1) return;
    var rest = text.slice(idx + marker.length);
    var numStr = "";
    for (var i = 0; i < rest.length; i++) {
      var ch = rest[i];
      if (ch >= "0" && ch <= "9") {
        numStr += ch;
      } else if (numStr.length > 0) {
        break;
      }
    }
    if (numStr.length > 0) {
      grandchildPid = Number(numStr);
      resolve();
    }
  });
});

console.log("GRANDCHILD_PID:" + grandchildPid);

/* Give the grandchild's 100ms heartbeat interval (see GRANDCHILD_SRC)
   a couple of ticks to land before teardown begins, so the outer
   test process has a non-empty heartbeat file to prove has stopped
   growing, rather than one that was merely always empty. */
await new Promise(function (resolve) {
  setTimeout(resolve, 250);
});

var stopStarted = Date.now();
await stopServer(child);
console.log("STOP_MS:" + (Date.now() - stopStarted));
console.log("STOPPED");
`;

const HEARTBEAT_POLL_MS = 400;
const HEARTBEAT_QUIET_SAMPLES = 2;
const HEARTBEAT_MAX_WAIT_MS = 3000;

/** Contents of `dir`/heartbeat.txt, or "" if it does not exist (yet). */
async function readHeartbeat(dir) {
  try {
    return await readFile(path.join(dir, "heartbeat.txt"), "utf8");
  } catch {
    return "";
  }
}

/**
 * Poll heartbeat.txt — written every 100ms by the fixture's
 * grandchild process (see GRANDCHILD_SRC) — until its contents stop
 * growing across HEARTBEAT_QUIET_SAMPLES consecutive samples, bounded
 * by HEARTBEAT_MAX_WAIT_MS. This is the actual claim under proof —
 * "the grandchild is no longer running" — and it holds in every
 * environment this gate runs in: a zombie process cannot execute
 * JavaScript, so its heartbeat can never grow again once the process
 * has exited, whether or not the OS has reaped its pid yet.
 */
async function waitForHeartbeatToStop(dir) {
  const deadline = Date.now() + HEARTBEAT_MAX_WAIT_MS;
  let last = await readHeartbeat(dir);
  let quietStreak = 0;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, HEARTBEAT_POLL_MS));
    const current = await readHeartbeat(dir);
    if (current === last) {
      quietStreak += 1;
      if (quietStreak >= HEARTBEAT_QUIET_SAMPLES) {
        return { stopped: true, content: current };
      }
    } else {
      quietStreak = 0;
      last = current;
    }
  }
  return { stopped: false, content: last };
}

function digitsAfter(haystack, marker) {
  const idx = haystack.indexOf(marker);
  if (idx === -1) return undefined;
  const rest = haystack.slice(idx + marker.length);
  let numStr = "";
  for (const ch of rest) {
    if (ch >= "0" && ch <= "9") {
      numStr += ch;
    } else if (numStr.length > 0) {
      break;
    }
  }
  return numStr.length > 0 ? Number(numStr) : undefined;
}

/**
 * Spawn `scriptPath` unshelled, collect its output, and reject
 * (force-killing it) if it has not closed within `timeoutMs` — so a
 * regression that reintroduces the orphan-pipe bug fails this test
 * instead of hanging the whole suite.
 */
function runBounded(scriptPath, env, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.dirname(scriptPath),
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(
        new Error(
          `runner did not close within ${timeoutMs}ms — stdout so far: ${stdout} | stderr: ${stderr}`,
        ),
      );
    }, timeoutMs);
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

test(
  "stopServer ends an intermediate process's own child, and the caller's event loop drains without process.exit()",
  { timeout: RUNNER_TIMEOUT_MS + 5000 },
  async () => {
    await withFixture(
      {
        "grandchild.mjs": GRANDCHILD_SRC,
        "parent.mjs": PARENT_SRC,
        "runner.mjs": RUNNER_SRC,
      },
      async (dir) => {
        const { code, stdout, stderr } = await runBounded(
          path.join(dir, "runner.mjs"),
          { SERVER_TEST_REPO_ROOT: repoRoot(), SERVER_TEST_FIXTURE_DIR: dir },
          RUNNER_TIMEOUT_MS,
        );

        assert.equal(code, 0, `runner exited ${code}; stderr: ${stderr}`);

        const grandchildPid = digitsAfter(stdout, "GRANDCHILD_PID:");
        assert.ok(
          grandchildPid !== undefined,
          `runner never reported a grandchild pid; stdout: ${stdout}`,
        );

        const stopMs = digitsAfter(stdout, "STOP_MS:");
        assert.ok(stopMs !== undefined, `runner never reported STOP_MS; stdout: ${stdout}`);
        assert.ok(
          stopMs < RUNNER_TIMEOUT_MS,
          `stopServer took ${stopMs}ms, expected well under ${RUNNER_TIMEOUT_MS}ms`,
        );

        assert.ok(stdout.includes("STOPPED"), `runner never printed STOPPED; stdout: ${stdout}`);

        const heartbeat = await waitForHeartbeatToStop(dir);
        assert.ok(
          heartbeat.content.length > 0,
          "grandchild never wrote a heartbeat before stopServer was called — fixture timing assumption broken",
        );
        assert.equal(
          heartbeat.stopped,
          true,
          `grandchild heartbeat kept growing for ${HEARTBEAT_MAX_WAIT_MS}ms after stopServer resolved — it is still running`,
        );

        /* Secondary corroboration only — the heartbeat above is the
           primary proof. isAlive is zombie-tolerant on Linux (see
           server.mjs), so it no longer reports a reaped-but-present
           zombie as alive the way a bare kill(pid, 0) probe does. */
        assert.equal(
          isAlive(grandchildPid),
          false,
          `grandchild pid ${grandchildPid} is still alive (non-zombie) after stopServer resolved`,
        );
      },
    );
  },
);
