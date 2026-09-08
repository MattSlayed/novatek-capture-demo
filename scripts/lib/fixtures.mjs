/* ================================================================
   FIXTURES

   Shared by every scripts/*.test.mjs. Provides what D-23 requires:
   every later check script must be provable to exit non-zero on a
   fixture violation, from a throwaway directory that never touches
   the repository.

   `withFixture` builds that throwaway directory under os.tmpdir() —
   never under scripts/, because `node --test scripts/` walks that
   tree recursively and would otherwise discover fixture files as
   tests of their own. It is created with fs.mkdtemp and removed in a
   `finally`, so a thrown assertion inside the callback still cleans
   up.

   `runCheck` spawns a check script directly (no shell) so its exit
   code is exact and can be asserted against. `runCommand` exists only
   for `npx`/`next` binaries, which resolve through a shell on
   Windows; it is not used to invoke check scripts themselves.
   ================================================================ */

import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Absolute path of the repository root, resolved from this file's URL. */
export function repoRoot() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, "..", "..");
}

/**
 * Create a throwaway directory under os.tmpdir(), write `files` into
 * it (each key a relative path, each value its string contents,
 * parent directories created as needed), await `fn(dir)`, then remove
 * the directory whether `fn` resolved or threw.
 */
export async function withFixture(files, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "capture-fixture-"));
  try {
    for (const [relPath, contents] of Object.entries(files)) {
      const target = path.join(dir, relPath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents, "utf8");
    }
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Resolve `{ code, signal, stdout, stderr }` once `child` closes. A
 * child terminated by a signal reports `code === null`; that is never
 * a pass — it resolves as 1, with the signal surfaced so an assertion
 * message can show it. (Otherwise every "the real repository exits 0"
 * test would pass if the check script were killed mid-run.)
 */
export function collect(child) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("close", (code, signal) =>
      resolve({ code: code === null ? 1 : code, signal, stdout, stderr }),
    );
  });
}

/**
 * Spawn `process.execPath <repo-root>/<scriptRelPath>` with no shell,
 * so the reported exit code is exact. `cwd` defaults to the repo
 * root; `env` is inherited and extended, never replaced. An already-
 * absolute `scriptRelPath` (as `withFixture` produces, under
 * os.tmpdir()) is used as-is rather than joined onto the repo root.
 */
export function runCheck(scriptRelPath, opts = {}) {
  const scriptPath = path.isAbsolute(scriptRelPath)
    ? scriptRelPath
    : path.join(repoRoot(), scriptRelPath);
  const child = spawn(
    process.execPath,
    [scriptPath, ...(opts.args ?? [])],
    {
      cwd: opts.cwd ?? repoRoot(),
      env: { ...process.env, ...(opts.env ?? {}) },
    },
  );
  return collect(child);
}

/**
 * Same shape as `runCheck` but resolves `command` through a shell —
 * for `npx`/`next` binaries, which do not resolve directly on
 * Windows without one.
 */
export function runCommand(command, args = [], opts = {}) {
  const child = spawn(command, args, {
    cwd: opts.cwd ?? repoRoot(),
    env: { ...process.env, ...(opts.env ?? {}) },
    shell: true,
  });
  return collect(child);
}
