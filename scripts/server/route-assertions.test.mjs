/* ================================================================
   ROUTE ASSERTIONS — fixture proof (Phase 1 D-23)

   Needs no server: every case here builds a synthetic
   `{ status, bodyText, headers }` record by hand, or drives cookieJar
   with a stub fetch. This is the self-test the suite ships with — it
   proves the suite fails when a response lacks a universal header —
   and it rides the pre-build `fixture-suite` glob because this file
   is named `*.test.mjs`.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import {
  HEADER_EXCLUSIONS,
  assertUniversalHeaders,
  assertNoSuccessOnlyHeaders,
  compareResponses,
  cookieJar,
  snapshot,
} from "./route-assertions.mjs";

function baseHeaders() {
  return { "cache-control": "no-store", "x-cap-store": "memory", "x-cap-instance": "boot-123" };
}

/* ---------------------------------------------------------------
   assertUniversalHeaders
   --------------------------------------------------------------- */

test("assertUniversalHeaders passes when all three universal headers are present and correct", () => {
  const response = { status: 200, bodyText: "{}", headers: baseHeaders() };
  assert.doesNotThrow(() => assertUniversalHeaders(response, "label"));
});

test("assertUniversalHeaders throws when X-CAP-Instance is missing", () => {
  const headers = baseHeaders();
  delete headers["x-cap-instance"];
  const response = { status: 200, bodyText: "{}", headers };
  assert.throws(() => assertUniversalHeaders(response, "label"), assert.AssertionError);
});

test("assertUniversalHeaders throws when X-CAP-Store is missing", () => {
  const headers = baseHeaders();
  delete headers["x-cap-store"];
  const response = { status: 200, bodyText: "{}", headers };
  assert.throws(() => assertUniversalHeaders(response, "label"), assert.AssertionError);
});

test("assertUniversalHeaders throws when Cache-Control is 'private, no-cache' rather than 'no-store'", () => {
  const headers = baseHeaders();
  headers["cache-control"] = "private, no-cache";
  const response = { status: 200, bodyText: "{}", headers };
  assert.throws(() => assertUniversalHeaders(response, "label"), assert.AssertionError);
});

/* ---------------------------------------------------------------
   assertNoSuccessOnlyHeaders
   --------------------------------------------------------------- */

test("assertNoSuccessOnlyHeaders passes for a record carrying only the universal three", () => {
  const response = { status: 404, bodyText: '{"error":"order_not_found"}', headers: baseHeaders() };
  assert.doesNotThrow(() => assertNoSuccessOnlyHeaders(response, "label"));
});

test("assertNoSuccessOnlyHeaders throws for a record carrying X-CAP-Order", () => {
  const headers = { ...baseHeaders(), "x-cap-order": "wo-0142" };
  const response = { status: 200, bodyText: "{}", headers };
  assert.throws(() => assertNoSuccessOnlyHeaders(response, "label"), assert.AssertionError);
});

/* ---------------------------------------------------------------
   compareResponses
   --------------------------------------------------------------- */

test("compareResponses passes for two records differing only in date, vary, x-vercel-id and content-length", () => {
  const a = {
    status: 404,
    bodyText: '{"error":"order_not_found","detail":"This order is not on your card. Nothing was bound."}',
    headers: {
      ...baseHeaders(),
      date: "Wed, 01 Jan 2026 00:00:00 GMT",
      vary: "rsc, next-router-state-tree, next-router-prefetch",
      "x-vercel-id": "cpt1::abc123",
      "content-length": "88",
    },
  };
  const b = {
    status: 404,
    bodyText: '{"error":"order_not_found","detail":"This order is not on your card. Nothing was bound."}',
    headers: {
      ...baseHeaders(),
      date: "Wed, 01 Jan 2026 00:00:07 GMT",
      vary: "rsc, next-router-state-tree, next-router-prefetch",
      "x-vercel-id": "cpt1::xyz789",
      "content-length": "88",
    },
  };
  assert.doesNotThrow(() => compareResponses(a, b, "label"));
});

test("compareResponses throws on a differing X-CAP-Order header", () => {
  const a = { status: 200, bodyText: "{}", headers: { ...baseHeaders(), "x-cap-order": "wo-0142" } };
  const b = { status: 200, bodyText: "{}", headers: { ...baseHeaders(), "x-cap-order": "wo-0151" } };
  assert.throws(() => compareResponses(a, b, "label"), assert.AssertionError);
});

test("compareResponses throws on a differing status", () => {
  const a = { status: 200, bodyText: "{}", headers: baseHeaders() };
  const b = { status: 404, bodyText: "{}", headers: baseHeaders() };
  assert.throws(() => compareResponses(a, b, "label"), assert.AssertionError);
});

test("compareResponses throws on a one-byte difference in bodyText", () => {
  const a = { status: 200, bodyText: '{"error":"order_not_found"}', headers: baseHeaders() };
  const b = { status: 200, bodyText: '{"error":"order_not_found_"}', headers: baseHeaders() };
  assert.throws(() => compareResponses(a, b, "label"), assert.AssertionError);
});

test("compareResponses's failure message names the differing header", () => {
  const a = { status: 200, bodyText: "{}", headers: { ...baseHeaders(), "x-cap-order": "wo-0142" } };
  const b = { status: 200, bodyText: "{}", headers: { ...baseHeaders(), "x-cap-order": "wo-0151" } };
  assert.throws(
    () => compareResponses(a, b, "label"),
    (err) => {
      assert.match(err.message, /x-cap-order/);
      return true;
    },
  );
});

/* ---------------------------------------------------------------
   HEADER_EXCLUSIONS
   --------------------------------------------------------------- */

test("HEADER_EXCLUSIONS carries a non-empty reason on every entry and no x-cap- name", () => {
  assert.ok(HEADER_EXCLUSIONS.length > 0);
  for (const entry of HEADER_EXCLUSIONS) {
    assert.ok(typeof entry.reason === "string" && entry.reason.length > 0, `entry "${entry.name}" must carry a reason`);
    assert.ok(
      !entry.name.toLowerCase().startsWith("x-cap-"),
      `entry "${entry.name}" must not exclude one of this project's own headers`,
    );
  }
});

/* ---------------------------------------------------------------
   cookieJar — driven with a stub fetch, never a real one
   --------------------------------------------------------------- */

test("cookieJar captures a set-cookie, replays it as a Cookie header, and drops it after a clearing set-cookie", async () => {
  const seenRequests = [];
  let call = 0;
  const stubFetch = async (url, init) => {
    call += 1;
    seenRequests.push({ url, headers: new Headers(init?.headers ?? {}) });
    if (call === 1) {
      return new Response(null, {
        status: 201,
        headers: [["set-cookie", "cap_session=abc123; Path=/; HttpOnly; SameSite=Lax"]],
      });
    }
    if (call === 2) {
      return new Response(null, { status: 200 });
    }
    return new Response(null, {
      status: 204,
      headers: [["set-cookie", "cap_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"]],
    });
  };

  const jar = cookieJar(stubFetch);

  await jar.fetch("http://127.0.0.1:4312/api/session", { method: "POST" });
  assert.equal(jar.cookies.get("cap_session"), "abc123");

  await jar.fetch("http://127.0.0.1:4312/api/session");
  assert.equal(seenRequests[1].headers.get("cookie"), "cap_session=abc123");

  await jar.fetch("http://127.0.0.1:4312/api/session", { method: "DELETE" });
  assert.equal(jar.cookies.has("cap_session"), false);
});

/* ---------------------------------------------------------------
   snapshot — a light smoke test; the real proof rides route-suite.proof.mjs
   --------------------------------------------------------------- */

test("snapshot reads status, body text and lowercased headers off a live Response", async () => {
  const response = new Response('{"ok":true}', {
    status: 200,
    headers: { "Cache-Control": "no-store", "X-CAP-Store": "memory", "X-CAP-Instance": "boot-123" },
  });
  const snap = await snapshot(response);
  assert.equal(snap.status, 200);
  assert.equal(snap.bodyText, '{"ok":true}');
  assert.equal(snap.headers["cache-control"], "no-store");
  assert.equal(snap.headers["x-cap-instance"], "boot-123");
});
