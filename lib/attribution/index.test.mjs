/* ================================================================
   ATTRIBUTION — unit tests (AD-3)

   Verified sessions are built by hand below rather than minted
   through lib/session/cookie.ts: deriveAccount's own contract is
   that it takes a SessionResult, not that it takes a minted one, so
   this file has no dependency on the signing key.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deriveAccount } from "./index.ts";

function verified(accountId) {
  return {
    ok: true,
    session: {
      sid: "test-sid-0001",
      account_id: accountId,
      issued_at: "2026-09-17T00:00:00Z",
      expires_at: "2026-09-17T12:00:00Z",
    },
  };
}

const FIXTURE_IDS = ["acc-mabaso", "acc-naidoo", "acc-vanwyk"];

for (const id of FIXTURE_IDS) {
  test(`deriveAccount resolves a verified session naming ${id}`, () => {
    const account = deriveAccount(verified(id));
    assert.ok(account !== null);
    assert.equal(account.account_id, id);
    assert.equal(account.artisan.id, id);
  });
}

test("deriveAccount derives null for a verified session naming an id outside the fixture set", () => {
  assert.equal(deriveAccount(verified("acc-unknown")), null);
});

test("deriveAccount derives null for every unverified reason", () => {
  const reasons = ["absent", "malformed", "bad_signature", "expired"];
  for (const reason of reasons) {
    assert.equal(deriveAccount({ ok: false, reason }), null);
  }
});

test("deriveAccount takes exactly one parameter", () => {
  assert.equal(deriveAccount.length, 1);
});

test("the module's source contains none of the forbidden identifiers", async () => {
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");
  const forbidden = ["rbac_tier", "req", "request", "body", "headers", "searchParams"];
  for (const term of forbidden) {
    assert.ok(!source.includes(term), `source must not contain "${term}"`);
  }
});
