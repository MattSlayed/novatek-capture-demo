/* ================================================================
   SESSION COOKIE — unit tests (FR-1, FR-23)

   CAPTURE_SESSION_KEY is set to a fixed value below, before any test
   runs, so every signature in this file is deterministic. This is
   safe here — unlike lib/session/key.test.mjs, which spawns a fresh
   child process per case — because key.ts's signingKey() caches on
   first call, but nothing in this file calls a function that would
   trigger that resolution until a test() callback runs, and the
   assignment below executes during this file's own top-level
   evaluation, which completes before any callback does.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { SESSION_COOKIE_MAX_AGE_SECONDS } from "../limits/index.ts";
import {
  SESSION_COOKIE_NAME,
  mintSession,
  verifySessionValue,
  readSession,
  sessionCookieOptions,
  clearedSessionCookieOptions,
} from "./cookie.ts";

process.env.CAPTURE_SESSION_KEY = "cookie-test-fixed-signing-key-000000";

test("a minted value round-trips through verifySessionValue with the same account_id", () => {
  const { value, session } = mintSession("acc-mabaso");
  const result = verifySessionValue(value);
  assert.equal(result.ok, true);
  assert.equal(result.session.account_id, session.account_id);
});

test("flipping one character of the signature yields bad_signature, never throws", () => {
  const { value } = mintSession("acc-mabaso");
  const separatorIndex = value.indexOf(".");
  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  const result = verifySessionValue(`${payload}.${flipped}`);
  assert.deepEqual(result, { ok: false, reason: "bad_signature" });
});

test("truncating the value to remove the separator yields malformed, not a throw", () => {
  const { value } = mintSession("acc-mabaso");
  const separatorIndex = value.indexOf(".");
  const truncated = value.slice(0, separatorIndex);
  const result = verifySessionValue(truncated);
  assert.deepEqual(result, { ok: false, reason: "malformed" });
});

test("a value minted far enough in the past that its expiry has already passed yields expired", () => {
  const longAgo = Date.parse("2000-01-01T00:00:00Z");
  const { value } = mintSession("acc-mabaso", longAgo);
  const result = verifySessionValue(value);
  assert.deepEqual(result, { ok: false, reason: "expired" });
});

test("a value signed with a different key yields bad_signature", () => {
  const { value } = mintSession("acc-mabaso");
  const separatorIndex = value.indexOf(".");
  const payload = value.slice(0, separatorIndex);
  const wrongSignature = createHmac("sha256", "a-totally-different-key-0000000000000")
    .update(payload)
    .digest("base64url");
  const result = verifySessionValue(`${payload}.${wrongSignature}`);
  assert.deepEqual(result, { ok: false, reason: "bad_signature" });
});

test("readSession verifies the value off a hand-built request stub", () => {
  const { value } = mintSession("acc-mabaso");
  const stubRequest = {
    cookies: { get: (name) => (name === SESSION_COOKIE_NAME ? { value } : undefined) },
  };
  const result = readSession(stubRequest);
  assert.equal(result.ok, true);
});

test("readSession returns absent when the stub reports no cookie", () => {
  const stubRequest = { cookies: { get: () => undefined } };
  const result = readSession(stubRequest);
  assert.deepEqual(result, { ok: false, reason: "absent" });
});

test("sessionCookieOptions carries the required attributes", () => {
  const options = sessionCookieOptions("x");
  assert.equal(options.name, SESSION_COOKIE_NAME);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
});

test("clearedSessionCookieOptions expires immediately", () => {
  assert.equal(clearedSessionCookieOptions().maxAge, 0);
  assert.equal(clearedSessionCookieOptions().value, "");
});

test("the module's source assembles no cookie header string by hand", async () => {
  const source = await readFile(new URL("./cookie.ts", import.meta.url), "utf8");
  assert.ok(!source.includes("Set-Cookie"), "source must not hand-assemble a cookie header");
});
