/* ================================================================
   THE CLIENT PROJECTION — unit tests (SC-5, D-04, FR-7, FR-10)

   `globalThis.fetch` is stubbed per test and `Response` objects are
   built by hand so every header the projection reads is visible in
   the test, in lib/access/scope.test.mjs's stub style. Nothing here
   starts a server.

   Module-scope state is the subject under test, so it carries between
   tests in this file by design — the same way it carries between
   screens in a document. Each test below therefore uses its own
   instance id, and the ordering test depends on running after the
   first-contact test, which node:test guarantees within one file.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import {
  noteResponse,
  purge,
  readSession,
  readOrders,
  readOrder,
  readHours,
  openClock,
  cachedAccount,
  cachedOrders,
  cachedOrder,
  cachedClock,
} from "./projection.ts";

const ORDER_ID = "wo-0142";

function headers(instance) {
  return { "content-type": "application/json", "x-cap-instance": instance };
}

function jsonResponse(body, { status = 200, instance = "inst-a" } = {}) {
  return new Response(JSON.stringify(body), { status, headers: headers(instance) });
}

function bareResponse({ status = 204, instance = "inst-a" } = {}) {
  return new Response(null, { status, headers: { "x-cap-instance": instance } });
}

function orderDetail(instance) {
  return jsonResponse(
    {
      order: { id: ORDER_ID, title: "Gearbox inspection" },
      assets: [],
      clock: null,
      verifications: [],
      proposals: [],
      decisions: [],
    },
    { instance },
  );
}

/** Replaces fetch with a recorder; returns the call log. */
function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return responder(String(url), init);
  };
  return calls;
}

test("a first noteResponse stores the instance and purges nothing", async () => {
  stubFetch(() => orderDetail("inst-a"));
  const read = await readOrder(ORDER_ID);
  assert.equal(read.kind, "ok");
  assert.notEqual(cachedOrder(ORDER_ID), null, "a same-instance read must survive");
});

test("a changed instance purges before the new body is stored, and the new instance is kept", async () => {
  assert.notEqual(cachedOrder(ORDER_ID), null, "precondition: the previous test cached an order");

  noteResponse(bareResponse({ instance: "inst-b" }));
  assert.equal(cachedOrder(ORDER_ID), null, "a changed instance must clear the cache");

  // The new instance was stored, so a second inst-b response is a no-op:
  // seed under inst-b, then note inst-b again and require the seed to survive.
  stubFetch(() => orderDetail("inst-b"));
  await readOrder(ORDER_ID);
  assert.notEqual(cachedOrder(ORDER_ID), null);
  noteResponse(bareResponse({ instance: "inst-b" }));
  assert.notEqual(cachedOrder(ORDER_ID), null, "the same instance twice must not purge again");
});

test("purge empties every cell", async () => {
  stubFetch((url) =>
    url.endsWith("/api/session")
      ? jsonResponse({ account: { id: "acc-mabaso", name: "S. Mabaso" } }, { instance: "inst-b" })
      : jsonResponse(
          { orders: [{ id: ORDER_ID, title: "Gearbox inspection" }], clocks: [] },
          { instance: "inst-b" },
        ),
  );
  await readSession();
  await readOrders();
  assert.notEqual(cachedAccount(), null);
  assert.equal(cachedOrders().length, 1);

  purge();

  assert.equal(cachedAccount(), null);
  assert.equal(cachedOrders().length, 0);
  assert.equal(cachedOrder(ORDER_ID), null);
  assert.equal(cachedClock(ORDER_ID), null);
});

test("a cache hit issues no second request", async () => {
  const calls = stubFetch(() =>
    jsonResponse(
      { orders: [{ id: ORDER_ID, title: "Gearbox inspection" }], clocks: [] },
      { instance: "inst-c" },
    ),
  );
  await readOrders();
  assert.equal(calls.length, 1);
  assert.equal(cachedOrders().length, 1, "read through the cache, not the wire");
  assert.equal(calls.length, 1, "cachedOrders must not fetch");
});

test("a refused order read returns the server's own code and sentence, and caches nothing", async () => {
  stubFetch(() =>
    jsonResponse(
      { error: "order_not_found", detail: "That work order is not on your list." },
      { status: 404, instance: "inst-c" },
    ),
  );
  const read = await readOrder("wo-9999");
  assert.equal(read.kind, "refused");
  assert.equal(read.error, "order_not_found");
  assert.equal(read.detail, "That work order is not on your list.");
  assert.equal(cachedOrder("wo-9999"), null);
});

test("a 401 session read is a definite no, not a fault", async () => {
  stubFetch(() =>
    jsonResponse({ error: "no_session", detail: "Choose an artisan to continue." }, {
      status: 401,
      instance: "inst-c",
    }),
  );
  const read = await readSession();
  assert.equal(read.kind, "ok");
  assert.equal(read.value, null);
  assert.equal(cachedAccount(), null);
});

test("a request that never lands is distinguishable from a refusal", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("network error");
  };
  const read = await readHours();
  assert.equal(read.kind, "no-answer");
});

test("a clock write sends exactly client_id, as JSON, fresh on every call", async () => {
  const clock = { order_id: ORDER_ID, account_id: "acc-mabaso", segments: [] };
  const calls = stubFetch(() => jsonResponse({ clock }, { instance: "inst-d" }));

  await openClock(ORDER_ID);
  await openClock(ORDER_ID);

  assert.equal(calls.length, 2);
  const ids = calls.map((call) => {
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.headers["content-type"], "application/json");
    const body = JSON.parse(call.init.body);
    assert.deepEqual(Object.keys(body), ["client_id"], "exactly one accepted field");
    return body.client_id;
  });
  assert.notEqual(ids[0], ids[1], "a reused id would make the second tap a duplicate");
  assert.notEqual(cachedClock(ORDER_ID), null, "the returned clock is stored, so no follow-up read");
});
