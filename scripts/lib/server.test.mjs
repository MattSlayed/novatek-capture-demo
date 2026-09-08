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
   ================================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";

import { withFixture, repoRoot } from "./fixtures.mjs";

const RUNNER_TIMEOUT_MS = 15_000;

/* A long-lived leaf process that prints its own pid then never exits
   on its own. No regex, no "\n" escape and no backtick appears in any
   of the three fixture sources below — they are generated strings
   embedded in this file's own source, so avoiding those characters
   sidesteps a second layer of escaping entirely. */
const GRANDCHILD_SRC = `console.log("GRANDCHILD_PID:" + process.pid);
setInterval(function () {}, 1000);
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

var stopStarted = Date.now();
await stopServer(child);
console.log("STOP_MS:" + (Date.now() - stopStarted));
console.log("STOPPED");
`;

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

        assert.equal(
          isAlive(grandchildPid),
          false,
          `grandchild pid ${grandchildPid} is still alive after stopServer resolved`,
        );
      },
    );
  },
);
