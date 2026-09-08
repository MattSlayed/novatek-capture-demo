/* ================================================================
   SERVER LIFECYCLE

   Starts a long-lived child process and guarantees its full
   descendant tree — not just the immediate child — can be ended
   later, deterministically and within a bounded time.

   Root cause this exists to prevent: spawning a server through a
   shell (`{ shell: true }`) makes `child.pid` the pid of the shell,
   not of the real server. Ending only that pid leaves the real
   server (and anything it goes on to spawn) running as an orphan,
   with its stdout/stderr pipes still attached to the caller — the
   caller's event loop never drains and the calling script never
   exits (observed in GitHub Actions run 34196058170: `next start`
   under `npx` under a shell survived `process.kill(serverProcess.pid)`
   on ubuntu-latest and the job hung until cancelled; the Windows
   `taskkill /T /F` branch already killed the whole tree, which is why
   the bug never showed locally).

   `startServer` never uses a shell and leads its own process group on
   POSIX (`detached: true`), so `stopServer` can end the whole group —
   not one pid — and then waits, bounded, for the child to actually
   exit before resolving.
   ================================================================ */

import { spawn, execSync } from "node:child_process";

const DEFAULT_STOP_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 100;

/**
 * Spawn `command` with `args`, no shell, leading its own process
 * group on POSIX (`detached: true`) so a later `stopServer` call can
 * end every descendant, not just this one pid. `detached: true` is
 * set on win32 too — Windows has no process-group signal to send, so
 * `stopServer` always ends that platform's tree via
 * `taskkill /T /F`, which walks parent/child pid relationships
 * regardless of this flag; setting it here costs nothing and keeps
 * the two platforms' spawn options identical.
 */
export function startServer(command, args, opts = {}) {
  return spawn(command, args, {
    cwd: opts.cwd ?? process.cwd(),
    env: opts.env ?? process.env,
    detached: true,
  });
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve when `promise` settles or `ms` elapses, whichever comes
 * first — and, unlike a bare `Promise.race([promise,
 * new Promise((r) => setTimeout(r, ms))])`, always clears the losing
 * timer. A `Promise.race` never cancels the timer it did not need:
 * that timer keeps firing on schedule regardless, and a `setTimeout`
 * is itself an active handle that keeps Node's event loop (and so the
 * whole process, absent an explicit `process.exit()`) alive until it
 * does. Reproduced directly while writing this file's own fixture
 * test: `stopServer` was already resolving in under half a second,
 * but the calling script did not actually exit for another ~4.5s —
 * the exact remainder of the uncleared timeout window.
 */
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    promise.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * End `child` and its full descendant tree, then resolve once the
 * child itself has exited — bounded by `timeoutMs` in every branch,
 * so a child that refuses to die can never keep the caller's event
 * loop alive.
 *
 * - win32: `taskkill /pid <pid> /T /F` ends the whole tree; Windows
 *   has no POSIX process-group signal to send instead.
 * - POSIX: `child.pid` leads its own process group (see
 *   `startServer`, `detached: true`); `process.kill(-child.pid,
 *   "SIGTERM")` signals the negative pid, which POSIX defines as the
 *   whole group, not just the leader. A bounded poll follows, then
 *   `SIGKILL` on the group if anything is still alive.
 */
export async function stopServer(child, { timeoutMs = DEFAULT_STOP_TIMEOUT_MS } = {}) {
  if (!child || !child.pid) return;

  const alreadyExited = child.exitCode !== null || child.signalCode !== null;
  const exited = alreadyExited
    ? Promise.resolve()
    : new Promise((resolve) => child.once("exit", () => resolve()));

  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {
      /* already exited */
    }
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* already exited, or never got its own group */
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && isAlive(child.pid)) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (isAlive(child.pid)) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* already exited */
      }
    }
  }

  await withTimeout(exited, timeoutMs);
}
