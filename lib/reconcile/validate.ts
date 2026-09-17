/* ================================================================
   SHAPE VALIDATION, ACCEPTED-FIELD ENUMERATIONS AND THE
   IDEMPOTENCY CANONICALISER (D-10, AD-9, AD-20, FR-61)

   This module reads nothing from the store, the session or the
   attribution layer, and imports none of them — that omission is
   what makes the proposal-id re-derivation AD-5 needs a pure
   comparison: every input a caller needs is one the caller already
   holds, never a lookup this module could perform on its behalf.

   Every shape predicate here is one small anchored regex (or one
   small check) beside a named function, following
   scripts/check-governed.mjs's own "one predicate, one shape" style.
   Every predicate is deliberately strict per D-10 — tightened to
   this project's own emitted shapes (crypto.randomUUID()'s v4/
   variant-1 form, lowercase hex, a literal UTC `Z`), never loosened
   to a generic any-version matcher.
   ================================================================ */

import { createHash } from "node:crypto";
import {
  THUMB_MAX_ENCODED_BYTES,
  CAPTURE_MAX_DECLARED_BYTES,
  VOICE_MAX_DURATION_MS,
} from "../limits/index.ts";
import { REJECT_COPY } from "../copy/conflicts.ts";
import { SYNC_ITEM_KINDS, SYNC_ITEM_SCHEMA_VERSIONS } from "../data/types.ts";
import type { SyncItemKind } from "../data/types";

/* ----------------------------------------------------------------
   Shape predicates
   ---------------------------------------------------------------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Strict to crypto.randomUUID()'s own v4/variant-1 shape (a literal
 * "4" in the version position, `8`/`9`/`a`/`b` in the variant
 * position) rather than a generic any-version UUID matcher. D-10
 * says strict, and every UUID this project ever mints comes from
 * that one call.
 */
export function isUuidShaped(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

/** Lowercase only — an uppercase-hex digest is a shape refusal, not
    a case-fold this module performs on a caller's behalf. */
export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && SHA256_HEX_RE.test(value);
}

const ISO_UTC_Z_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Anchored to a literal trailing `Z` (an offset form is refused by
 * the regex alone) plus a Date.parse round trip, because Date.parse
 * silently rolls an out-of-range calendar component forward
 * ("2026-02-31" becomes March 3) instead of failing — the round trip
 * compares the reconstructed value's own calendar fields against the
 * ones the string named, so a rollover is caught rather than passed.
 */
export function isIsoUtcZ(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_UTC_Z_RE.test(value)) return false;
  const parsedMs = Date.parse(value);
  if (!Number.isFinite(parsedMs)) return false;
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.slice(0, 8).split(":").map(Number);
  const rebuilt = new Date(parsedMs);
  return (
    rebuilt.getUTCFullYear() === year &&
    rebuilt.getUTCMonth() + 1 === month &&
    rebuilt.getUTCDate() === day &&
    rebuilt.getUTCHours() === hour &&
    rebuilt.getUTCMinutes() === minute &&
    rebuilt.getUTCSeconds() === second
  );
}

/** A safe-integer, strictly greater than zero — "0" and a negative
    value are both shape refusals, and a float is refused by
    Number.isSafeInteger before the sign is ever checked. */
export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/* ----------------------------------------------------------------
   MIME allowlists

   Compared on the type/subtype only, before any `;` parameter, so
   "audio/webm;codecs=opus" still passes. P5 owns the recorder and
   may extend VOICE_MIMES when the real capability probe lands —
   that is a deliberate edit to this export, not a loosened check.
   ---------------------------------------------------------------- */

export const PHOTO_MIMES: readonly string[] = ["image/jpeg"];
export const VOICE_MIMES: readonly string[] = ["audio/webm", "audio/mp4", "audio/ogg"];

function mimeBaseMatches(value: unknown, allowed: readonly string[]): boolean {
  if (typeof value !== "string") return false;
  const base = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return allowed.includes(base);
}

/* ----------------------------------------------------------------
   Accepted-field enumerations (AD-20, FR-61, FR-10)

   These two records are the single in-code statement of what may
   leave the device and what may arrive in a queued item's payload.
   `pick()` below is the only place a field outside either list can
   be dropped structurally, and dropping is silent by design: AD-20
   says a field outside the enumeration is dropped at parse and
   appears nowhere, not reported as an error.

   Two consequences of that, worth stating plainly:
     - An actor field (captured_by, decided_by, raised_by,
       account_id) is in neither list, so it cannot survive a pick()
       call regardless of which route or which sync item carries it.
     - An observation, grade or provenance field is in neither list
       either — the accepted-field enumeration is FR-61 enforced
       structurally, not by review.

   One deliberate exception: `SyncItem.claimed_account_id` is read
   directly off the envelope in lib/reconcile/apply.ts, never through
   either list here, because lib/data/types.ts's own comment on that
   field says it is compared and never trusted. It is never copied
   onto a record and never becomes an actor field — comparing a value
   is not accepting it as content.

   AD-5's two identity fields, `capture_client_id` and
   `observation_id`, are named on both the `decisions` body and the
   `decision` payload lists below. They are proposal identity, not
   observation content, which is why FR-61's ban excludes them by
   name — every check that enforces that ban compares field names
   whole, never as substrings, so `observation_id` is never caught by
   the ban on `observation` itself. `capture_client_id` is the
   capture envelope's own client id (minted at enqueue, AD-16) and
   `observation_id` names the authored observation a proposal was
   issued from; together they are the only two inputs a decision
   supplies toward AD-5's re-derived triple, the third being the
   session's own account.

   FR-10's distinction, stated once here rather than at every call
   site: `duration_ms` is a voice capture's own media duration and is
   accepted on that one kind. No list below carries `elapsed_s`,
   `hours`, `duration_s` or any other accrued-time value, because
   hours are a sum the server computes from segments it stamped
   itself — an artisan-supplied duration or hour value has no field
   to arrive in.
   ---------------------------------------------------------------- */

const CAPTURE_BODY_FIELDS = [
  "client_id",
  "order_id",
  "asset_id",
  "kind",
  "purpose",
  "captured_at",
  "sha256",
  "bytes",
  "mime",
  "duration_ms",
  "thumb",
] as const;

export const ACCEPTED_BODY_FIELDS: Record<string, readonly string[]> = {
  session: ["persona_id"],
  orders_open: ["client_id"],
  orders_close: ["client_id"],
  verify: CAPTURE_BODY_FIELDS,
  captures: CAPTURE_BODY_FIELDS,
  decisions: [
    "client_id",
    "proposal_id",
    "capture_client_id",
    "observation_id",
    "outcome",
    "decided_at",
    "decided_where_claimed",
    "note",
  ],
  sync: ["items"],
};

export const ACCEPTED_PAYLOAD_FIELDS: Record<SyncItemKind, readonly string[]> = {
  order_open: ["device_claimed_opened_at"],
  order_close: ["device_claimed_closed_at"],
  capture: [
    "asset_id",
    "kind",
    "purpose",
    "captured_at",
    "sha256",
    "bytes",
    "mime",
    "duration_ms",
    "thumb",
  ],
  decision: [
    "proposal_id",
    "capture_client_id",
    "observation_id",
    "outcome",
    "decided_at",
    "decided_where_claimed",
    "note",
  ],
  referral: [],
};

/**
 * Returns a new object carrying only `fields`' own keys from `body`,
 * dropping everything else without reporting it (AD-20). Never
 * mutates `body`. An enumerated key `body` does not itself carry is
 * simply absent from the result — pick() does not invent values.
 */
export function pick(
  body: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  }
  return result;
}

/* ----------------------------------------------------------------
   Refusals — the canonical sentences are imported from
   lib/copy/conflicts.ts, never restated, with one clause naming the
   offending field appended per D-10.
   ---------------------------------------------------------------- */

export type ShapeRefusal = {
  code: "bad_shape" | "media_too_large" | "unknown_kind";
  field: string;
  detail: string;
};

export function badShapeDetail(field: string): string {
  return `${REJECT_COPY.bad_shape.sentence} The field was ${field}.`;
}

export function mediaTooLargeDetail(field: string): string {
  return `${REJECT_COPY.media_too_large.sentence} The field was ${field}.`;
}

function badShape(field: string): ShapeRefusal {
  return { code: "bad_shape", field, detail: badShapeDetail(field) };
}

function tooLarge(field: string): ShapeRefusal {
  return { code: "media_too_large", field, detail: mediaTooLargeDetail(field) };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/* ----------------------------------------------------------------
   Validators — one per kind, each ShapeRefusal | null.
   ---------------------------------------------------------------- */

export function validateCapturePayload(payload: unknown): ShapeRefusal | null {
  const p = asRecord(payload);
  if (!p) return badShape("asset_id");

  if (typeof p.asset_id !== "string" || p.asset_id.length === 0) return badShape("asset_id");
  if (p.kind !== "photo" && p.kind !== "voice") return badShape("kind");
  if (p.purpose !== "verify" && p.purpose !== "evidence") return badShape("purpose");
  if (!isIsoUtcZ(p.captured_at)) return badShape("captured_at");
  if (!isSha256Hex(p.sha256)) return badShape("sha256");
  if (!isPositiveInt(p.bytes)) return badShape("bytes");
  if ((p.bytes as number) > CAPTURE_MAX_DECLARED_BYTES) return tooLarge("bytes");

  const allowedMimes = p.kind === "photo" ? PHOTO_MIMES : VOICE_MIMES;
  if (!mimeBaseMatches(p.mime, allowedMimes)) return badShape("mime");

  if (p.kind === "voice") {
    if (!isPositiveInt(p.duration_ms)) return badShape("duration_ms");
    if ((p.duration_ms as number) > VOICE_MAX_DURATION_MS) return tooLarge("duration_ms");
  } else if (p.duration_ms !== undefined) {
    // A photo carrying a media duration names a field that does not
    // belong to its own kind — bad_shape, not media_too_large: the
    // field itself is unwelcome here, regardless of its value.
    return badShape("duration_ms");
  }

  if (p.thumb !== undefined) {
    if (typeof p.thumb !== "string") return badShape("thumb");
    if (p.thumb.length > THUMB_MAX_ENCODED_BYTES) return tooLarge("thumb");
  }

  return null;
}

export function validateDecisionPayload(payload: unknown): ShapeRefusal | null {
  const p = asRecord(payload);
  if (!p) return badShape("proposal_id");

  if (typeof p.proposal_id !== "string" || p.proposal_id.length === 0) {
    return badShape("proposal_id");
  }
  /* AD-1's order re-derives the proposal id at the ownership position
     (lib/reconcile/apply.ts), which runs before this validator ever
     sees the item. In practice a missing or mis-shaped
     capture_client_id or observation_id is already refused
     unknown_proposal by the digest comparison before shape is
     checked. The two rules below exist so the enumeration and this
     validator state the same field set in one place, and so a later
     reordering of the fixed check order cannot silently accept an
     unshaped value — not because either refusal is reachable through
     this path today. */
  if (!isUuidShaped(p.capture_client_id)) return badShape("capture_client_id");
  if (typeof p.observation_id !== "string" || p.observation_id.length === 0) {
    return badShape("observation_id");
  }
  if (p.outcome !== "accept" && p.outcome !== "reject") return badShape("outcome");
  if (!isIsoUtcZ(p.decided_at)) return badShape("decided_at");
  if (p.decided_where_claimed !== "online" && p.decided_where_claimed !== "on_device") {
    return badShape("decided_where_claimed");
  }
  if (p.note !== undefined && typeof p.note !== "string") return badShape("note");

  return null;
}

/**
 * The one optional device-claimed timestamp for `kind`, absent or
 * valid. `order_open`'s field is `device_claimed_opened_at`;
 * `order_close`'s is `device_claimed_closed_at` — never both on the
 * same payload, since ACCEPTED_PAYLOAD_FIELDS enumerates exactly one
 * per kind.
 */
export function validateClockPayload(
  payload: unknown,
  kind: "order_open" | "order_close",
): ShapeRefusal | null {
  const field = kind === "order_open" ? "device_claimed_opened_at" : "device_claimed_closed_at";
  if (payload === null || payload === undefined) return null;
  const p = asRecord(payload);
  if (!p) return badShape(field);
  const value = p[field];
  if (value !== undefined && !isIsoUtcZ(value)) return badShape(field);
  return null;
}

/**
 * The envelope's own shape: client_id, kind, schema_version,
 * order_id, created_at. A kind outside SYNC_ITEM_KINDS is
 * unknown_kind, not bad_shape — a shape refusal is for a
 * malformed-but-recognised item, not an item this server's closed
 * set has never heard of.
 */
export function validateEnvelopeItem(item: unknown): ShapeRefusal | null {
  const candidate = asRecord(item);
  if (!candidate) return badShape("client_id");

  if (!isUuidShaped(candidate.client_id)) return badShape("client_id");

  if (typeof candidate.kind !== "string" || !SYNC_ITEM_KINDS.includes(candidate.kind as SyncItemKind)) {
    return { code: "unknown_kind", field: "kind", detail: REJECT_COPY.unknown_kind.sentence };
  }
  const kind = candidate.kind as SyncItemKind;

  if (
    typeof candidate.schema_version !== "number" ||
    !SYNC_ITEM_SCHEMA_VERSIONS[kind].includes(candidate.schema_version)
  ) {
    return badShape("schema_version");
  }

  // Every kind but decision needs a real order id; a decision's
  // authorisation comes from the proposal id instead (AD-5), so its
  // order_id may be the empty string — still a string, never absent.
  if (typeof candidate.order_id !== "string") return badShape("order_id");
  if (kind !== "decision" && candidate.order_id.length === 0) return badShape("order_id");

  if (!isIsoUtcZ(candidate.created_at)) return badShape("created_at");

  return null;
}

/* ----------------------------------------------------------------
   Canonicaliser and idempotency (AD-9)
   ---------------------------------------------------------------- */

/**
 * Recursive, sorted-key JSON serialisation over an already-projected
 * (enumerated-subset) value — never the raw, attacker-shaped body.
 * Three limitations, stated plainly rather than glossed:
 *   - number formatting follows JSON.stringify's own rules (e.g.
 *     1.0 and 1 serialise identically); every numeric field this
 *     project hashes is an integer or a fixed-precision value, so
 *     this has never been observed to matter here.
 *   - a key that is absent and a key explicitly set to `undefined`
 *     both vanish under JSON.stringify — the desired behaviour,
 *     since pick() already decided what is present before this ever
 *     runs.
 *   - Unicode normalisation is not applied: two strings that render
 *     identically but differ in normalisation form would hash
 *     differently. Low-probability for this project's controlled
 *     inputs, not solved here.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`).join(",")}}`;
}

/**
 * The idempotency hash is over `payload` projected onto
 * ACCEPTED_PAYLOAD_FIELDS[kind] — via the same pick() every caller
 * uses — before hashing, never over the raw payload. Two
 * consequences: an unenumerated field added to an otherwise-identical
 * payload cannot change the hash, and the hash cannot depend on the
 * order keys happened to arrive in.
 */
export function idempotencyHash(kind: SyncItemKind, payload: unknown): string {
  const source = asRecord(payload) ?? {};
  const projected = pick(source, ACCEPTED_PAYLOAD_FIELDS[kind]);
  return createHash("sha256").update(canonicalize(projected)).digest("hex");
}

/**
 * Keyed per account, so one persona's retry can never short-circuit
 * into another's stored result (FR-34's server half). lib/store's own
 * account-keyed Maps already provide this separation structurally;
 * this export states the same scheme as one string, for a caller that
 * needs it in that form.
 */
export function seenKey(accountId: string, clientId: string): string {
  return `${accountId}:${clientId}`;
}
