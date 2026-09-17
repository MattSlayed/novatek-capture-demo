/* ================================================================
   ACCESS SCOPE — unit tests (AD-2, AD-4, FR-6)

   Stub ActingAccount objects are built by hand per fixture persona
   below, rather than minted through a session, so this test has no
   dependency on lib/session/cookie.ts's signing key.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ordersFor, orderOwned, assetInOrder, assetsForOrder } from "./scope.ts";

function stubAccount(accountId) {
  return {
    account_id: accountId,
    artisan: {
      id: accountId,
      name: "Test Artisan",
      trade: "millwright",
      competency: "Millwright, Red Seal",
      employee_no: "EMP-0000",
      rbac_tier: "field_technician",
    },
    session: {
      sid: "test-sid",
      account_id: accountId,
      issued_at: "2026-01-01T00:00:00Z",
      expires_at: "2026-01-01T12:00:00Z",
    },
  };
}

const mabaso = stubAccount("acc-mabaso");
const naidoo = stubAccount("acc-naidoo");
const vanwyk = stubAccount("acc-vanwyk");

test("ordersFor returns exactly the fixture-assigned orders per account", () => {
  assert.deepEqual(ordersFor(mabaso).map((o) => o.id), ["wo-0142", "wo-0151"]);
  assert.deepEqual(ordersFor(naidoo).map((o) => o.id), ["wo-0137"]);
  assert.deepEqual(ordersFor(vanwyk).map((o) => o.id), ["wo-0129", "wo-0133"]);
});

test("ordersFor returns an empty array, never throws, for an account id outside the fixture set", () => {
  assert.deepEqual(ordersFor(stubAccount("acc-unknown")), []);
});

test("orderOwned returns null for both an unowned id and a fabricated id — FR-6's unit half", () => {
  assert.equal(orderOwned(mabaso, "wo-0137"), null); // naidoo's order, not mabaso's: unowned
  assert.equal(orderOwned(mabaso, "wo-9999"), null); // exists nowhere: fabricated
});

test("orderOwned returns the order record for an id the account owns", () => {
  const order = orderOwned(mabaso, "wo-0142");
  assert.ok(order !== null);
  assert.equal(order.id, "wo-0142");
});

test("assetInOrder is true for a member asset and false for a non-member asset", () => {
  const order = orderOwned(mabaso, "wo-0142");
  assert.equal(assetInOrder(order, "m-ap003"), true);
  assert.equal(assetInOrder(order, "m-gs001"), false);
});

test("assetsForOrder resolves every asset with an observation_ids array attached", () => {
  const order = orderOwned(mabaso, "wo-0142");
  const assets = assetsForOrder(order);
  assert.deepEqual(
    assets.map((a) => a.id).sort(),
    ["m-aa101", "m-aa102", "m-ap003"].sort(),
  );
  for (const asset of assets) {
    assert.ok(Array.isArray(asset.observation_ids));
  }
});

test("every exported function takes at least one parameter", () => {
  assert.ok(ordersFor.length >= 1);
  assert.ok(orderOwned.length >= 1);
  assert.ok(assetInOrder.length >= 1);
  assert.ok(assetsForOrder.length >= 1);
});

test("ordersFor and orderOwned take the account as a required, non-optional first parameter", async () => {
  const source = await readFile(new URL("./scope.ts", import.meta.url), "utf8");
  const ordersForMatch = source.match(/export function ordersFor\(([^)]*)\)/);
  const orderOwnedMatch = source.match(/export function orderOwned\(([^)]*)\)/);
  assert.ok(ordersForMatch, "ordersFor signature not found");
  assert.ok(orderOwnedMatch, "orderOwned signature not found");
  for (const signature of [ordersForMatch[1], orderOwnedMatch[1]]) {
    const firstParam = signature.split(",")[0];
    assert.ok(!firstParam.includes("?"), `first parameter must not be optional: ${signature}`);
    assert.ok(!firstParam.includes("="), `first parameter must not carry a default: ${signature}`);
  }
});

test("the module's source contains no occurrence of the artisan tier field's identifier", async () => {
  const source = await readFile(new URL("./scope.ts", import.meta.url), "utf8");
  assert.ok(!source.includes("rbac_tier"));
});
