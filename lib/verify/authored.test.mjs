/* ================================================================
   AUTHORED VERIFICATION — unit tests (AD-8, REQ-FR-17)

   Every case below calls authoredMatch() with only an asset id and a
   fixture-set string — that is the whole of what the function under
   test accepts, and the whole of what these tests ever supply it.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { authoredMatch } from "./authored.ts";
import { MACHINERY_BY_ID } from "../data/plant.ts";
import { FIXTURE_VERSION } from "../data/fixtures.ts";

test("authoredMatch takes exactly two parameters, named assetId and fixtureSet", async () => {
  assert.equal(authoredMatch.length, 2);
  const source = await readFile(new URL("./authored.ts", import.meta.url), "utf8");
  const match = source.match(/export function authoredMatch\(([^)]*)\)/);
  assert.ok(match, "authoredMatch signature not found");
  assert.equal(match[1].replace(/\s+/g, " ").trim(), "assetId: string, fixtureSet: string");
});

test("a known asset under the live fixture version matches, with its own tag and serial", () => {
  const machinery = MACHINERY_BY_ID.get("m-ap003");
  assert.ok(machinery, "fixture setup: m-ap003 must exist in MACHINERY_BY_ID");
  const result = authoredMatch("m-ap003", FIXTURE_VERSION);
  assert.equal(result.outcome, "matched");
  assert.equal(result.matched_tag, machinery.tag);
  assert.equal(result.matched_serial, machinery.serial);
});

test("an asset with no authored observations still matches — zero proposals is not a pending", () => {
  const result = authoredMatch("m-aa101", FIXTURE_VERSION);
  assert.equal(result.outcome, "matched");
});

test("an asset id outside the fixture set is pending, with both matched fields null", () => {
  const result = authoredMatch("m-nope", FIXTURE_VERSION);
  assert.equal(result.outcome, "pending");
  assert.equal(result.matched_tag, null);
  assert.equal(result.matched_serial, null);
});

test("a fixture set that is not the live version is pending, even for a known asset", () => {
  const result = authoredMatch("m-ap003", "capture-fixtures/1999.01.1");
  assert.equal(result.outcome, "pending");
  assert.equal(result.matched_tag, null);
  assert.equal(result.matched_serial, null);
});

test("calling authoredMatch twice with identical arguments returns deep-equal results", () => {
  const first = authoredMatch("m-ap003", FIXTURE_VERSION);
  const second = authoredMatch("m-ap003", FIXTURE_VERSION);
  assert.deepEqual(first, second);
});

test("confidence is null on every result, and the source never assigns it anything else", async () => {
  for (const result of [
    authoredMatch("m-ap003", FIXTURE_VERSION),
    authoredMatch("m-nope", FIXTURE_VERSION),
  ]) {
    assert.equal(result.confidence, null);
  }
  const source = await readFile(new URL("./authored.ts", import.meta.url), "utf8");
  const confidenceLines = source.split("\n").filter((line) => line.includes("confidence"));
  assert.ok(confidenceLines.length > 0, "expected at least one line mentioning confidence");
  for (const line of confidenceLines) {
    assert.ok(line.includes("null"), `line mentions confidence without null: ${line}`);
  }
});

/**
 * REQ-FR-17's negative set, at the source level: none of the fields
 * that make up what a device sends during a capture appear in this
 * module. "capture" itself is not swept here — AuthoredMatch's own
 * required `Omit<VerificationResult, "capture_id" | "verified_at">`
 * legitimately contains that substring, since "capture_id" is the
 * real field name being excluded, and no rewording of that literal
 * type argument is possible without breaking the Omit itself.
 */
test("the module's source contains none of the fields that make up what a device sends", async () => {
  const source = (
    await readFile(new URL("./authored.ts", import.meta.url), "utf8")
  ).toLowerCase();
  for (const banned of ["sha256", "thumb", "duration_ms", "payload", "bytes", "mime"]) {
    assert.ok(!source.includes(banned), `source must not contain "${banned}"`);
  }
});

test("the module imports nothing from reconcile, store, http or access, and names no register", async () => {
  const source = await readFile(new URL("./authored.ts", import.meta.url), "utf8");
  assert.ok(!/from "\.\.\/reconcile|from "\.\.\/store|from "\.\.\/http|from "\.\.\/access/.test(source));
  assert.ok(!source.includes("register"));
});
