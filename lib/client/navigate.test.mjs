/* ================================================================
   NAVIGATE — unit tests (D-01, D-02, SC-5)

   Plain node:test assertions, no build and no server, discovered by
   scripts/verify.mjs's "unit-suite" step. The two history writes are
   deliberately NOT exercised here: they need a real history stack,
   and they are proved in the browser harness instead. What is proved
   here is the half that decides what a legal screen is, which is the
   half a crafted link attacks.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import {
  SURFACES,
  parseSurface,
  parseId,
  screenKey,
  hrefFor,
} from "./navigate.ts";

test("SURFACES is the closed set of four, in declaration order", () => {
  assert.deepStrictEqual([...SURFACES], ["orders", "order", "time", "limits"]);
});

test("every member of SURFACES parses to itself", () => {
  for (const surface of SURFACES) {
    assert.equal(parseSurface(surface), surface);
  }
});

test("parseSurface returns null for an absent, empty, unknown, miscased, composite or space-padded value", () => {
  assert.equal(parseSurface(null), null);
  assert.equal(parseSurface(""), null);
  assert.equal(parseSurface("gate"), null);
  assert.equal(parseSurface("Orders"), null);
  // D-01's rejected encoding: never split before validating, so this
  // is null rather than "order".
  assert.equal(parseSurface("order/wo-0142"), null);
  assert.equal(parseSurface("limits "), null);
});

test("parseId accepts the order-id shape and returns the value unchanged", () => {
  assert.equal(parseId("wo-0142"), "wo-0142");
});

test("parseId rejects a miscased, short, long, space-padded, empty or absent id, and a traversal attempt", () => {
  assert.equal(parseId("WO-0142"), null);
  assert.equal(parseId("wo-142"), null);
  assert.equal(parseId("wo-01423"), null);
  assert.equal(parseId("wo-0142 "), null);
  assert.equal(parseId(""), null);
  assert.equal(parseId(null), null);
  assert.equal(parseId("../../etc/passwd"), null);
});

test("parseId's match is anchored, so an id embedded in a longer string is refused", () => {
  assert.equal(parseId("wo-0142/../wo-0151"), null);
  assert.equal(parseId("xwo-0142"), null);
  assert.equal(parseId("wo-0142\nwo-0151"), null);
});

test("screenKey distinguishes two orders on the same surface", () => {
  assert.notEqual(screenKey("order", "wo-0142"), screenKey("order", "wo-0151"));
});

test("screenKey distinguishes the same order on two surfaces", () => {
  assert.notEqual(screenKey("order", "wo-0142"), screenKey("time", "wo-0142"));
});

test("screenKey is stable for the same screen, and carries both halves", () => {
  assert.equal(screenKey("order", "wo-0142"), screenKey("order", "wo-0142"));
  assert.equal(screenKey("order", "wo-0142"), "order|wo-0142");
  assert.equal(screenKey("orders", ""), "orders|");
});

test("hrefFor omits the id key entirely when no id is given", () => {
  const href = hrefFor("orders");
  assert.equal(href.includes("id="), false);
  assert.equal(href, "/?s=orders");
});

test("hrefFor carries both keys when an id is given", () => {
  const href = hrefFor("order", "wo-0142");
  assert.equal(href, "/?s=order&id=wo-0142");
  const params = new URL(href, "https://example.invalid").searchParams;
  assert.equal(params.get("s"), "order");
  assert.equal(params.get("id"), "wo-0142");
});

test("hrefFor always writes a root path with a query, never a path segment (Pitfall 7)", () => {
  for (const surface of SURFACES) {
    assert.match(hrefFor(surface, "wo-0142"), /^\/\?s=/);
  }
});
