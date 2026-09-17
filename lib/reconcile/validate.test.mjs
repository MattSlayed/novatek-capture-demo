import test from "node:test";
import assert from "node:assert/strict";
import { THUMB_MAX_ENCODED_BYTES } from "../limits/index.ts";
import {
  isUuidShaped,
  isSha256Hex,
  isIsoUtcZ,
  isPositiveInt,
  PHOTO_MIMES,
  VOICE_MIMES,
  ACCEPTED_BODY_FIELDS,
  ACCEPTED_PAYLOAD_FIELDS,
  pick,
  badShapeDetail,
  mediaTooLargeDetail,
  validateCapturePayload,
  validateDecisionPayload,
  validateClockPayload,
  validateEnvelopeItem,
  idempotencyHash,
  seenKey,
} from "./validate.ts";

const VALID_UUID = "12345678-1234-4234-8234-123456789abc";
const VALID_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".slice(0, 64);
const VALID_ISO = "2026-01-15T10:30:00Z";

/* ----------------------------------------------------------------
   Predicates: one valid example, at least three shaped-but-wrong.
   ---------------------------------------------------------------- */

test("isUuidShaped accepts a v4/variant-1 UUID and refuses near misses", () => {
  assert.equal(isUuidShaped(VALID_UUID), true);
  assert.equal(isUuidShaped("12345678-1234-1234-8234-123456789abc"), false); // v1, not v4
  assert.equal(isUuidShaped("12345678-1234-4234-c234-123456789abc"), false); // bad variant nibble
  assert.equal(isUuidShaped("not-a-uuid-at-all"), false);
  assert.equal(isUuidShaped(42), false);
});

test("isSha256Hex accepts exactly 64 lowercase hex characters and refuses near misses", () => {
  assert.equal(isSha256Hex(VALID_SHA256), true);
  assert.equal(isSha256Hex(VALID_SHA256.toUpperCase()), false); // uppercase hex
  assert.equal(isSha256Hex(VALID_SHA256.slice(0, 63)), false); // 63 characters
  assert.equal(isSha256Hex(VALID_SHA256 + "0"), false); // 65 characters
  assert.equal(isSha256Hex("not-hex-at-all-not-hex-at-all-not-hex-at-all-not-hex-at-all-000"), false);
});

test("isIsoUtcZ accepts a literal-Z UTC timestamp and refuses near misses", () => {
  assert.equal(isIsoUtcZ(VALID_ISO), true);
  assert.equal(isIsoUtcZ("2026-01-15T10:30:00+02:00"), false); // offset, not Z
  assert.equal(isIsoUtcZ("2026-02-31T00:00:00Z"), false); // rolls to March 3 under Date.parse
  assert.equal(isIsoUtcZ("2026-01-15 10:30:00Z"), false); // missing T
  assert.equal(isIsoUtcZ("not-a-timestamp"), false);
});

test("isPositiveInt accepts a positive safe integer and refuses near misses", () => {
  assert.equal(isPositiveInt(5), true);
  assert.equal(isPositiveInt(0), false);
  assert.equal(isPositiveInt(-1), false);
  assert.equal(isPositiveInt(1.5), false);
  assert.equal(isPositiveInt("5"), false);
});

test("PHOTO_MIMES and VOICE_MIMES are the declared allowlists", () => {
  assert.deepEqual(PHOTO_MIMES, ["image/jpeg"]);
  assert.deepEqual(VOICE_MIMES, ["audio/webm", "audio/mp4", "audio/ogg"]);
});

/* ----------------------------------------------------------------
   pick() and the accepted-field enumerations
   ---------------------------------------------------------------- */

test("pick drops every actor field from every route's accepted-body enumeration (FR-23's negative set)", () => {
  const forbiddenActorFields = ["captured_by", "decided_by", "raised_by", "account_id"];
  for (const [route, fields] of Object.entries(ACCEPTED_BODY_FIELDS)) {
    const body = Object.fromEntries(fields.map((f) => [f, "declared-value"]));
    for (const actorField of forbiddenActorFields) body[actorField] = "attacker-value";
    const picked = pick(body, fields);
    for (const actorField of forbiddenActorFields) {
      assert.equal(actorField in picked, false, `route "${route}" leaked actor field "${actorField}"`);
    }
  }
});

test("pick drops observation, grade and provenance from every accepted-field enumeration (FR-61)", () => {
  const forbiddenContentFields = ["observation", "grade", "provenance"];
  const everyEnumeration = { ...ACCEPTED_BODY_FIELDS, ...ACCEPTED_PAYLOAD_FIELDS };
  for (const [key, fields] of Object.entries(everyEnumeration)) {
    const body = Object.fromEntries(fields.map((f) => [f, "declared-value"]));
    for (const forbidden of forbiddenContentFields) body[forbidden] = "attacker-value";
    const picked = pick(body, fields);
    for (const forbidden of forbiddenContentFields) {
      assert.equal(forbidden in picked, false, `"${key}" leaked content field "${forbidden}"`);
    }
  }
});

test("AD-5's identity pair is enumerated on both surfaces and survives pick(), while observation itself is dropped from the same body", () => {
  assert.ok(ACCEPTED_BODY_FIELDS.decisions.includes("capture_client_id"));
  assert.ok(ACCEPTED_BODY_FIELDS.decisions.includes("observation_id"));
  assert.ok(ACCEPTED_PAYLOAD_FIELDS.decision.includes("capture_client_id"));
  assert.ok(ACCEPTED_PAYLOAD_FIELDS.decision.includes("observation_id"));

  const decisionBody = {
    capture_client_id: VALID_UUID,
    observation_id: "obs-ap003-disc",
    observation: "attacker-supplied observation text",
  };
  const picked = pick(decisionBody, ACCEPTED_BODY_FIELDS.decisions);
  assert.equal(picked.capture_client_id, decisionBody.capture_client_id);
  assert.equal(picked.observation_id, decisionBody.observation_id);
  assert.equal("observation" in picked, false);
});

test("no accepted-field enumeration carries an accrued-time value (FR-10)", () => {
  const banned = ["elapsed_s", "hours", "duration_s"];
  const all = [...Object.values(ACCEPTED_BODY_FIELDS), ...Object.values(ACCEPTED_PAYLOAD_FIELDS)].flat();
  for (const field of banned) assert.equal(all.includes(field), false, `enumeration carried "${field}"`);
});

/* ----------------------------------------------------------------
   validateCapturePayload
   ---------------------------------------------------------------- */

const VALID_PHOTO_PAYLOAD = {
  asset_id: "m-ap003",
  kind: "photo",
  purpose: "evidence",
  captured_at: VALID_ISO,
  sha256: VALID_SHA256,
  bytes: 100,
  mime: "image/jpeg",
};

const VALID_VOICE_PAYLOAD = {
  asset_id: "m-ap003",
  kind: "voice",
  purpose: "evidence",
  captured_at: VALID_ISO,
  sha256: VALID_SHA256,
  bytes: 100,
  mime: "audio/webm",
  duration_ms: 1000,
};

test("validateCapturePayload accepts a well-shaped photo and a well-shaped voice payload", () => {
  assert.equal(validateCapturePayload(VALID_PHOTO_PAYLOAD), null);
  assert.equal(validateCapturePayload(VALID_VOICE_PAYLOAD), null);
});

test("validateCapturePayload accepts a mime with a codec parameter after the base type", () => {
  assert.equal(
    validateCapturePayload({ ...VALID_VOICE_PAYLOAD, mime: "audio/webm;codecs=opus" }),
    null,
  );
});

test("a photo payload carrying duration_ms is bad_shape naming duration_ms", () => {
  const refusal = validateCapturePayload({ ...VALID_PHOTO_PAYLOAD, duration_ms: 500 });
  assert.ok(refusal);
  assert.equal(refusal.code, "bad_shape");
  assert.equal(refusal.field, "duration_ms");
  assert.match(refusal.detail, /duration_ms/);
});

test("a voice payload with no duration_ms is bad_shape naming duration_ms", () => {
  const { duration_ms: _drop, ...withoutDuration } = VALID_VOICE_PAYLOAD;
  const refusal = validateCapturePayload(withoutDuration);
  assert.ok(refusal);
  assert.equal(refusal.code, "bad_shape");
  assert.equal(refusal.field, "duration_ms");
});

test("a thumbnail one character above THUMB_MAX_ENCODED_BYTES is media_too_large naming thumb, one character below passes", () => {
  const tooLarge = validateCapturePayload({
    ...VALID_PHOTO_PAYLOAD,
    thumb: "a".repeat(THUMB_MAX_ENCODED_BYTES + 1),
  });
  assert.ok(tooLarge);
  assert.equal(tooLarge.code, "media_too_large");
  assert.equal(tooLarge.field, "thumb");

  const atLimit = validateCapturePayload({
    ...VALID_PHOTO_PAYLOAD,
    thumb: "a".repeat(THUMB_MAX_ENCODED_BYTES),
  });
  assert.equal(atLimit, null);
});

test("validateCapturePayload refuses a declared byte count above CAPTURE_MAX_DECLARED_BYTES", () => {
  const refusal = validateCapturePayload({ ...VALID_PHOTO_PAYLOAD, bytes: 33554432 + 1 });
  assert.ok(refusal);
  assert.equal(refusal.code, "media_too_large");
  assert.equal(refusal.field, "bytes");
});

test("validateCapturePayload refuses a mime outside the declared kind's allowlist", () => {
  const refusal = validateCapturePayload({ ...VALID_PHOTO_PAYLOAD, mime: "audio/webm" });
  assert.ok(refusal);
  assert.equal(refusal.code, "bad_shape");
  assert.equal(refusal.field, "mime");
});

test("validateCapturePayload refuses a non-object payload", () => {
  const refusal = validateCapturePayload(null);
  assert.ok(refusal);
  assert.equal(refusal.code, "bad_shape");
});

/* ----------------------------------------------------------------
   validateDecisionPayload
   ---------------------------------------------------------------- */

const VALID_DECISION_PAYLOAD = {
  proposal_id: "any-non-empty-opaque-digest-string",
  capture_client_id: VALID_UUID,
  observation_id: "obs-ap003-disc",
  outcome: "accept",
  decided_at: VALID_ISO,
  decided_where_claimed: "online",
};

test("validateDecisionPayload accepts a well-shaped decision", () => {
  assert.equal(validateDecisionPayload(VALID_DECISION_PAYLOAD), null);
  assert.equal(validateDecisionPayload({ ...VALID_DECISION_PAYLOAD, note: "a note" }), null);
});

test("validateDecisionPayload refuses a capture_client_id that is not UUID-shaped", () => {
  const refusal = validateDecisionPayload({ ...VALID_DECISION_PAYLOAD, capture_client_id: "not-a-uuid" });
  assert.ok(refusal);
  assert.equal(refusal.field, "capture_client_id");
});

test("validateDecisionPayload refuses an outcome outside the closed set", () => {
  const refusal = validateDecisionPayload({ ...VALID_DECISION_PAYLOAD, outcome: "maybe" });
  assert.ok(refusal);
  assert.equal(refusal.field, "outcome");
});

/* ----------------------------------------------------------------
   validateClockPayload
   ---------------------------------------------------------------- */

test("validateClockPayload accepts an absent claimed timestamp and a valid one", () => {
  assert.equal(validateClockPayload(undefined, "order_open"), null);
  assert.equal(validateClockPayload({}, "order_open"), null);
  assert.equal(
    validateClockPayload({ device_claimed_opened_at: VALID_ISO }, "order_open"),
    null,
  );
});

test("validateClockPayload refuses a mis-shaped claimed timestamp for the given kind", () => {
  const refusal = validateClockPayload({ device_claimed_closed_at: "not-a-timestamp" }, "order_close");
  assert.ok(refusal);
  assert.equal(refusal.field, "device_claimed_closed_at");
});

/* ----------------------------------------------------------------
   validateEnvelopeItem
   ---------------------------------------------------------------- */

const VALID_ENVELOPE = {
  client_id: VALID_UUID,
  kind: "capture",
  schema_version: 1,
  order_id: "wo-0142",
  created_at: VALID_ISO,
};

test("validateEnvelopeItem accepts a well-shaped envelope and allows an empty order_id only for a decision", () => {
  assert.equal(validateEnvelopeItem(VALID_ENVELOPE), null);
  assert.equal(
    validateEnvelopeItem({ ...VALID_ENVELOPE, kind: "decision", schema_version: 1, order_id: "" }),
    null,
  );
});

test("validateEnvelopeItem refuses an empty order_id on every kind but decision", () => {
  const refusal = validateEnvelopeItem({ ...VALID_ENVELOPE, order_id: "" });
  assert.ok(refusal);
  assert.equal(refusal.field, "order_id");
});

test("validateEnvelopeItem reports unknown_kind, not bad_shape, for a kind outside the closed set", () => {
  const refusal = validateEnvelopeItem({ ...VALID_ENVELOPE, kind: "teleport" });
  assert.ok(refusal);
  assert.equal(refusal.code, "unknown_kind");
});

test("validateEnvelopeItem refuses a schema_version outside the emitted set for its kind", () => {
  const refusal = validateEnvelopeItem({ ...VALID_ENVELOPE, schema_version: 99 });
  assert.ok(refusal);
  assert.equal(refusal.field, "schema_version");
});

/* ----------------------------------------------------------------
   badShapeDetail / mediaTooLargeDetail import the canonical sentence
   ---------------------------------------------------------------- */

test("badShapeDetail and mediaTooLargeDetail name the offending field beside the imported sentence", () => {
  assert.match(badShapeDetail("sha256"), /sha256/);
  assert.match(mediaTooLargeDetail("thumb"), /thumb/);
});

/* ----------------------------------------------------------------
   Canonicaliser and idempotency (AD-9)
   ---------------------------------------------------------------- */

test("idempotencyHash ignores key order and an unenumerated field, but changes when an enumerated value changes", () => {
  const a = idempotencyHash("capture", { sha256: VALID_SHA256, bytes: 1, mime: "image/jpeg" });
  const b = idempotencyHash("capture", { mime: "image/jpeg", bytes: 1, sha256: VALID_SHA256 });
  assert.equal(a, b);

  const withStrayField = idempotencyHash("capture", {
    sha256: VALID_SHA256,
    bytes: 1,
    mime: "image/jpeg",
    captured_by: "attacker",
  });
  assert.equal(a, withStrayField);

  const changedValue = idempotencyHash("capture", { sha256: VALID_SHA256, bytes: 2, mime: "image/jpeg" });
  assert.notEqual(a, changedValue);
});

test("idempotencyHash is a pure function of (kind, projected payload)", () => {
  const a = idempotencyHash("order_open", { device_claimed_opened_at: VALID_ISO });
  const b = idempotencyHash("order_open", { device_claimed_opened_at: VALID_ISO });
  assert.equal(a, b);
  assert.equal(typeof a, "string");
  assert.equal(a.length, 64); // sha256 hex digest
});

test("seenKey differs for the same client_id under two accounts", () => {
  assert.notEqual(seenKey("acc-mabaso", VALID_UUID), seenKey("acc-naidoo", VALID_UUID));
});
