/* ================================================================
   PROPOSAL DERIVATION — unit tests (AD-5, AD-8, REQ-FR-21, REQ-FR-27)

   node --test spawns each matched file as its own process, so this
   assignment cannot leak into or be leaked into by any other test
   file's environment. It only has to land before this file's own
   first call into signingKey() (reached indirectly through
   deriveProposalId), which happens well after this line, inside a
   later test() callback — never at import time.
   ================================================================ */

process.env.CAPTURE_SESSION_KEY = "derive-test-fixed-key-at-least-16-chars-long";

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  authoredProposals,
  deriveProposalId,
  proposalIdMatches,
  UnknownCitedRecordError,
} from "./derive.ts";
import { DEVIATION_BY_ID } from "../data/plant.ts";
import { FIXTURE_VERSION } from "../data/fixtures.ts";

test("authoredProposals takes exactly two parameters, named assetId and fixtureSet", async () => {
  assert.equal(authoredProposals.length, 2);
  const source = await readFile(new URL("./derive.ts", import.meta.url), "utf8");
  const match = source.match(/export function authoredProposals\(([^)]*)\)/);
  assert.ok(match, "authoredProposals signature not found");
  assert.equal(match[1].replace(/\s+/g, " ").trim(), "assetId: string, fixtureSet: string");
});

test("authoredProposals('m-ap003', FIXTURE_VERSION) returns the three obs-ap003 rows in fixture order", () => {
  const proposals = authoredProposals("m-ap003", FIXTURE_VERSION);
  assert.deepEqual(
    proposals.map((p) => p.observation_id),
    ["obs-ap003-disc", "obs-ap003-guard", "obs-ap003-iso"],
  );
  for (const proposal of proposals) {
    assert.equal(proposal.asset_id, "m-ap003");
  }
});

test("authoredProposals returns an honest empty array, never a throw, for an asset with no authored rows", () => {
  assert.deepEqual(authoredProposals("m-aa101", FIXTURE_VERSION), []);
});

test("authoredProposals returns an empty array when the fixture set does not match the live version", () => {
  assert.deepEqual(authoredProposals("m-ap003", "capture-fixtures/1999.01.1"), []);
});

test("every returned provenance carries a null confidence, the authored extractor, a non-empty source label, and the observation's own grade", () => {
  const proposals = authoredProposals("m-ap003", FIXTURE_VERSION);
  assert.ok(proposals.length > 0);
  for (const proposal of proposals) {
    assert.equal(proposal.provenance.confidence, null);
    assert.equal(proposal.provenance.extractor, "authored");
    assert.ok(typeof proposal.provenance.source_label === "string");
    assert.ok(proposal.provenance.source_label.length > 0);
    assert.ok(["INFERRED", "AMBIGUOUS"].includes(proposal.provenance.grade));
  }
});

test("obs-ap003-iso resolves its provenance from DEVIATION_BY_ID — the deviation-citation resolution path", () => {
  const proposals = authoredProposals("m-ap003", FIXTURE_VERSION);
  const isoProposal = proposals.find((p) => p.observation_id === "obs-ap003-iso");
  assert.ok(isoProposal, "obs-ap003-iso not found among m-ap003's proposals");
  const deviation = DEVIATION_BY_ID.get("ncr-0118");
  assert.ok(deviation, "fixture setup: ncr-0118 must exist in DEVIATION_BY_ID");
  assert.equal(isoProposal.provenance.source_uri, deviation.provenance.source_uri);
  assert.equal(isoProposal.provenance.source_label, deviation.provenance.source_label);
  assert.equal(isoProposal.provenance.system_of_record, deviation.provenance.system_of_record);
});

test("obs-ap003-disc resolves its provenance from a CitedFact on its own asset — the fact-citation resolution path", () => {
  const proposals = authoredProposals("m-ap003", FIXTURE_VERSION);
  const discProposal = proposals.find((p) => p.observation_id === "obs-ap003-disc");
  assert.ok(discProposal, "obs-ap003-disc not found among m-ap003's proposals");
  // f-ap003-vib is an ERP fact, not the NCR register — a different
  // system_of_record than the deviation case above proves the two
  // resolution paths are genuinely distinct, not the same path twice.
  assert.equal(discProposal.provenance.system_of_record, "ERP");
});

test("deriveProposalId is deterministic and changes when any one of its three inputs changes", () => {
  const base = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  assert.equal(deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc"), base);
  assert.notEqual(deriveProposalId("acc-naidoo", "client-1", "obs-ap003-disc"), base);
  assert.notEqual(deriveProposalId("acc-mabaso", "client-2", "obs-ap003-disc"), base);
  assert.notEqual(deriveProposalId("acc-mabaso", "client-1", "obs-ap003-guard"), base);
});

test("ids derived from consecutive observation ids share no long common prefix and are not sequential counters", () => {
  const a = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  const b = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-guard");
  let commonPrefix = 0;
  while (
    commonPrefix < a.length &&
    commonPrefix < b.length &&
    a[commonPrefix] === b[commonPrefix]
  ) {
    commonPrefix++;
  }
  assert.ok(commonPrefix < 4, `ids share a suspiciously long common prefix (${commonPrefix} chars): ${a} / ${b}`);
});

test("a derived id is a single base64url token and its decoding discloses neither input id as a substring", () => {
  const clientId = "22222222-2222-4222-8222-222222222222";
  const observationId = "obs-ap003-disc";
  const id = deriveProposalId("acc-mabaso", clientId, observationId);
  assert.equal(id.includes("."), false);
  const decoded = Buffer.from(id, "base64url");
  assert.equal(decoded.includes(Buffer.from(clientId)), false);
  assert.equal(decoded.includes(Buffer.from(observationId)), false);
});

test("proposalIdMatches is true for a freshly derived id checked under the same three inputs", () => {
  const id = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  assert.equal(proposalIdMatches(id, "acc-mabaso", "client-1", "obs-ap003-disc"), true);
});

test("proposalIdMatches is false for a one-character mutation of a valid id", () => {
  const id = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  const flipped = id[0] === "A" ? "B" : "A";
  const mutated = flipped + id.slice(1);
  assert.equal(proposalIdMatches(mutated, "acc-mabaso", "client-1", "obs-ap003-disc"), false);
});

test("proposalIdMatches is false for a truncated candidate", () => {
  const id = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  assert.equal(proposalIdMatches(id.slice(0, -4), "acc-mabaso", "client-1", "obs-ap003-disc"), false);
});

test("proposalIdMatches is false when the same valid id is re-checked with a different observationId", () => {
  const id = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  assert.equal(proposalIdMatches(id, "acc-mabaso", "client-1", "obs-ap003-guard"), false);
});

test("proposalIdMatches fails identically for a wholly fabricated token and for a valid id under a different account — REQ-FR-27's unit half", () => {
  const validId = deriveProposalId("acc-mabaso", "client-1", "obs-ap003-disc");
  assert.equal(
    proposalIdMatches("wholly-fabricated-token-nobody-derived", "acc-mabaso", "client-1", "obs-ap003-disc"),
    false,
  );
  assert.equal(proposalIdMatches(validId, "acc-naidoo", "client-1", "obs-ap003-disc"), false);
});

test("proposalIdMatches takes exactly four parameters, named candidate, accountId, clientId and observationId", async () => {
  assert.equal(proposalIdMatches.length, 4);
  const source = await readFile(new URL("./derive.ts", import.meta.url), "utf8");
  const match = source.match(/export function proposalIdMatches\(([^)]*)\)/);
  assert.ok(match, "proposalIdMatches signature not found");
  assert.equal(
    match[1].replace(/\s+/g, " ").trim(),
    "candidate: string, accountId: string, clientId: string, observationId: string",
  );
});

test("proposalIdMatches never throws on an empty, malformed, or oversized candidate", () => {
  assert.doesNotThrow(() => proposalIdMatches("", "acc-mabaso", "client-1", "obs-ap003-disc"));
  assert.doesNotThrow(() =>
    proposalIdMatches("not-a-valid-token-!!!", "acc-mabaso", "client-1", "obs-ap003-disc"),
  );
  assert.doesNotThrow(() =>
    proposalIdMatches("x".repeat(500), "acc-mabaso", "client-1", "obs-ap003-disc"),
  );
});

test("UnknownCitedRecordError is a named Error subclass carrying the observation and drawn_from ids", () => {
  const err = new UnknownCitedRecordError("obs-test", "f-test-nonexistent");
  assert.ok(err instanceof Error);
  assert.equal(err.name, "UnknownCitedRecordError");
  assert.match(err.message, /obs-test/);
  assert.match(err.message, /f-test-nonexistent/);
});

/**
 * REQ-FR-17/AD-8's negative set, at the source level. "sha256" is not
 * swept here: deriveProposalId's own required createHmac("sha256", ...)
 * call legitimately contains that substring as the HMAC algorithm
 * name (the same literal already committed in lib/session/cookie.ts's
 * identical call), which is a different thing entirely from the
 * capture envelope's own sha256 hash field this sweep exists to
 * catch. No rewording of the algorithm name is possible without
 * breaking the HMAC call itself.
 */
test("the module's source contains none of the capture-envelope field names for what a device sends", async () => {
  const source = (await readFile(new URL("./derive.ts", import.meta.url), "utf8")).toLowerCase();
  for (const banned of ["thumb", "duration_ms", "payload"]) {
    assert.ok(!source.includes(banned), `source must not contain "${banned}"`);
  }
});

test("the module imports nothing from reconcile, store, http or access, and names no register", async () => {
  const source = await readFile(new URL("./derive.ts", import.meta.url), "utf8");
  assert.ok(!/from "\.\.\/reconcile|from "\.\.\/store|from "\.\.\/http|from "\.\.\/access/.test(source));
  assert.ok(!source.includes("register"));
});
