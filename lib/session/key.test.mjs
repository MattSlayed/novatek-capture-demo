/* ================================================================
   SESSION SIGNING KEY — unit tests

   Every case below spawns a fresh child process rather than
   importing ./key.ts directly in this file: signingKey() resolves
   into a module-level `cached` variable on first call, so a second
   assertion sharing this process would silently read the first
   assertion's cached value instead of exercising its own
   environment. A fresh child process gives each case its own,
   never-yet-imported module scope.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

/** process.env with CAPTURE_SESSION_KEY and NODE_ENV removed, so a
    test can add back only the ones it means to set — never relying
    on an ambient value from the environment this suite itself runs
    under. */
function baseEnv() {
  const env = { ...process.env };
  delete env.CAPTURE_SESSION_KEY;
  delete env.NODE_ENV;
  return env;
}

function runInChild(env, script) {
  return spawnSync(process.execPath, ["-e", script], { env, encoding: "utf8" });
}

test("importing the module with CAPTURE_SESSION_KEY unset and NODE_ENV unset does not throw", () => {
  const script =
    "import('./lib/session/key.ts').then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1)})";
  const result = runInChild(baseEnv(), script);
  assert.equal(result.status, 0, result.stderr);
});

test("signingKey() returns the environment value when one at least 16 characters long is set", () => {
  const env = { ...baseEnv(), CAPTURE_SESSION_KEY: "a-development-key-well-over-16-chars" };
  const script =
    "import('./lib/session/key.ts').then((m)=>{const k=m.signingKey();process.exit(k===process.env.CAPTURE_SESSION_KEY?0:1)})";
  const result = runInChild(env, script);
  assert.equal(result.status, 0, result.stderr);
});

test("signingKey() returns a non-empty string when neither CAPTURE_SESSION_KEY nor a production NODE_ENV is set", () => {
  const script =
    "import('./lib/session/key.ts').then((m)=>{const k=m.signingKey();process.exit(typeof k==='string'&&k.length>0?0:1)})";
  const result = runInChild(baseEnv(), script);
  assert.equal(result.status, 0, result.stderr);
});

test("with NODE_ENV=production and CAPTURE_SESSION_KEY absent, signingKey() throws naming CAPTURE_SESSION_KEY", () => {
  const env = { ...baseEnv(), NODE_ENV: "production" };
  const script =
    "import('./lib/session/key.ts').then((m)=>{try{m.signingKey();process.exit(1)}catch(e){process.exit(String(e.message).includes('CAPTURE_SESSION_KEY')?0:1)}})";
  const result = runInChild(env, script);
  assert.equal(result.status, 0, result.stderr);
});
