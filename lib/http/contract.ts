/* ================================================================
   HTTP CONTRACT — the wire format, provable without a server (AD-11)

   Pure values and pure functions only. This module has no runtime
   dependency on the Next.js framework at all — no NextResponse, no
   framework import of any kind — and that omission is deliberate,
   not an oversight: the framework's server module does not resolve
   under a bare `node --test` run (verified this session — see
   03-02-PLAN.md's own interfaces note), so anything that needs
   `NextResponse` lives in `lib/http/respond.ts` instead, and
   everything provable without a running server lives here, where a
   plain `node --test` run can prove it.

   What this module owns: the three universal headers every response
   carries, the table marking every other `X-CAP-*` name universal or
   success-only (AD-4's not-found rule rests on that table, not on
   discipline), the status code for every wire error code, and the
   one function that resolves a refusal sentence — so a route can
   never write a `detail` literal, which is what makes the curl
   suite's expected string and the server's actual string the same
   string, by construction.
   ================================================================ */

import type { ConflictCode, RejectCode } from "../data/types";
import type { TransportErrorCode } from "../copy/conflicts";
import { CONFLICT_COPY, REJECT_COPY, TRANSPORT_COPY } from "../copy/conflicts.ts";

/** The `X-CAP-Store` value. One definition — nothing else in this
    phase names the store kind as a literal. */
export const STORE_KIND = "memory";

/**
 * The two universal headers with a value fixed at build time.
 * `X-CAP-Instance` is deliberately NOT a member of this object: its
 * value is the running instance's `BOOT_ID`
 * (`lib/store/memory.ts`), known only at request time, so
 * `lib/http/respond.ts` supplies it itself when it stamps this
 * object onto a response. All three names — these two plus
 * `X-CAP-Instance` — are still `HEADER_TABLE`'s two `universal`
 * entries below, so nothing about the third name is undocumented.
 */
export const UNIVERSAL_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "Cache-Control": "no-store",
  "X-CAP-Store": STORE_KIND,
});

/**
 * `universal` — carried on every response this phase sends, error or
 * not. `success-only` — carried only on a response that reached a
 * real 2xx outcome. AD-4's rule is exactly this split: a counter
 * marked `success-only` must never appear on a not-found response,
 * because its mere presence would tell a caller that SOMETHING
 * beyond ownership was already resolved before the refusal — an
 * existence oracle in header form.
 */
export type CapHeaderScope = "universal" | "success-only";

export interface HeaderTableEntry {
  name: string;
  scope: CapHeaderScope;
  /** Method + path of every route this phase has that emits this
      header. `["*"]` for the two universal names, which every route
      emits. Routes are named here ahead of their own plans (03-05
      onward) landing, from the seed's own route table. */
  routes: string[];
  /** One line: what a reviewer learns from this header, and — for
      every `success-only` entry — why letting it reach a not-found
      response would leak something AD-4 says a not-found must not. */
  reason: string;
}

const SYNC_COUNTER_REASON =
  "One of four per-batch outcome counters. POST /api/sync returns 200 whenever the envelope itself parses, so these never accompany a not-found in this phase — kept success-only on principle anyway: a per-item counter is never safe to promise on a response where no item was processed.";

/**
 * One entry per `X-CAP-*` name this phase emits. The single-writer
 * responder (`lib/http/respond.ts`) reads this table to decide, at
 * the one place a `Response` is built, whether a route-supplied
 * header is allowed on the response being constructed — so this
 * table is load-bearing, not documentation of a rule enforced
 * elsewhere.
 */
export const HEADER_TABLE: HeaderTableEntry[] = [
  {
    name: "X-CAP-Store",
    scope: "universal",
    routes: ["*"],
    reason:
      "Names which store kind (memory) backed this response. Carried on a not-found response too: the store kind is a property of the server, not of any one record, so its presence reveals nothing an unowned or unknown id shouldn't (AD-10, AD-11).",
  },
  {
    name: "X-CAP-Instance",
    scope: "universal",
    routes: ["*"],
    reason:
      "Names the running instance's boot id. Carried on a not-found response for the same reason as X-CAP-Store: this identifies the server process, not the record being asked about.",
  },
  {
    name: "X-CAP-Account",
    scope: "success-only",
    routes: ["POST /api/session"],
    reason:
      "Names the account a new session resolved to. This route has no ownership check to leak around, but the header still only ever accompanies the 201 it was minted for, never an error branch of the same route.",
  },
  {
    name: "X-CAP-Orders",
    scope: "success-only",
    routes: ["GET /api/orders"],
    reason: "A count of the orders returned; meaningless, and never sent, on anything but the 200 for this route.",
  },
  {
    name: "X-CAP-Order",
    scope: "success-only",
    routes: ["GET /api/orders/[id]"],
    reason:
      "Confirms an order body was actually returned. On a not-found response its mere presence would distinguish 'not yours' from 'does not exist' by presence alone, which is exactly the byte-identity FR-6 forbids.",
  },
  {
    name: "X-CAP-Clock",
    scope: "success-only",
    routes: ["POST /api/orders/[id]/open", "POST /api/orders/[id]/close"],
    reason:
      "Confirms a clock body was returned. On a 409 or a not-found it would leak that some clock state was already reached before the refusal fired.",
  },
  {
    name: "X-CAP-Verification",
    scope: "success-only",
    routes: ["POST /api/verify"],
    reason:
      "Names the verification method (always 'authored'). Present only once a verification actually ran — never on a refusal that stopped before reaching that step.",
  },
  {
    name: "X-CAP-Proposals",
    scope: "success-only",
    routes: ["POST /api/verify"],
    reason:
      "A count of the proposals issued. On a 404 or a 409 it would leak how many proposals a record holds before the caller is even confirmed to own it.",
  },
  {
    name: "X-CAP-Capture",
    scope: "success-only",
    routes: ["POST /api/captures"],
    reason: "Confirms a capture was recorded. Absent on every refusal for this route.",
  },
  {
    name: "X-CAP-Decision-State",
    scope: "success-only",
    routes: ["POST /api/decisions"],
    reason:
      "Names the decision's resulting state. A 404 unknown_proposal must not carry any hint of what state a real proposal might currently hold.",
  },
  {
    name: "X-CAP-Sync-Recorded",
    scope: "success-only",
    routes: ["POST /api/sync"],
    reason: SYNC_COUNTER_REASON,
  },
  {
    name: "X-CAP-Sync-Duplicate",
    scope: "success-only",
    routes: ["POST /api/sync"],
    reason: SYNC_COUNTER_REASON,
  },
  {
    name: "X-CAP-Sync-Conflict",
    scope: "success-only",
    routes: ["POST /api/sync"],
    reason: SYNC_COUNTER_REASON,
  },
  {
    name: "X-CAP-Sync-Rejected",
    scope: "success-only",
    routes: ["POST /api/sync"],
    reason: SYNC_COUNTER_REASON,
  },
  {
    name: "X-CAP-Walk-Facts",
    scope: "success-only",
    routes: ["GET /api/walk/[orderId]"],
    reason:
      "A count of the candidate facts in the walk payload. A 404 for an unowned or unknown order must not hint at how many facts a real payload for that order would carry.",
  },
  {
    name: "X-CAP-Redaction",
    scope: "success-only",
    routes: ["GET /api/walk/[orderId]"],
    reason:
      "Always the fixed value 'none' when present. Kept success-only regardless: AD-4's rule is about a header's presence, not its content, and a not-found carries neither.",
  },
];

/**
 * The three closed sets a wire error code can come from. `ConflictCode`
 * and `RejectCode` are `lib/data/types.ts`'s own closed sets;
 * `TransportErrorCode` (`lib/copy/conflicts.ts`, 03-01) covers the five
 * refusals a request can hit before any order, capture or decision
 * exists to attach the other two kinds of code to.
 */
export type WireErrorCode = ConflictCode | RejectCode | TransportErrorCode;

/**
 * Status codes exactly as CAPTURE-PLAN-SEED.md's route table states
 * them, reconciled against `lib/data/types.ts`'s closed set for one
 * name: the seed's route table writes the order-not-found code as
 * plain "not_found", while the closed set names it `order_not_found`.
 * Per Phase 2 D-19 (closed sets are defined once), the closed set
 * governs — `order_not_found` is the wire value below, and the
 * seed's shorthand is recorded in this comment rather than silently
 * resolved. This is the only reconciliation of that kind this table
 * needed; every other code name below is unambiguous between the two
 * sources.
 */
export const STATUS_BY_CODE: Record<WireErrorCode, number> = {
  // Transport (lib/copy/conflicts.ts's TransportErrorCode)
  no_session: 401,
  unknown_persona: 404,
  bad_request: 400,
  method_not_allowed: 405,
  batch_too_large: 413,
  // Conflict (lib/data/types.ts's ConflictCode)
  order_not_found: 404,
  order_closed: 409,
  not_open: 409,
  asset_not_in_order: 409,
  account_mismatch: 409,
  proposal_superseded: 409,
  already_recorded_differently: 409,
  clock_skew: 422,
  referral_evidence_missing: 409,
  // Reject (lib/data/types.ts's RejectCode)
  bad_shape: 422,
  media_too_large: 413,
  unknown_kind: 422,
  unknown_proposal: 404,
  unknown_referral: 404,
  store_evicted: 409,
};

/**
 * Resolves a code's sentence through whichever of the three copy
 * records actually defines it. No route ever writes a `detail`
 * literal — every refusal sentence has exactly one source, this
 * function, so the curl suite's expected string and the server's
 * actual string are the same string by construction, not two
 * hand-typed copies that can drift apart.
 */
export function detailFor(code: WireErrorCode): string {
  if (code in CONFLICT_COPY) return CONFLICT_COPY[code as ConflictCode].sentence;
  if (code in REJECT_COPY) return REJECT_COPY[code as RejectCode].sentence;
  return TRANSPORT_COPY[code as TransportErrorCode].sentence;
}

/**
 * The `{ error, detail }` envelope (AD-11), defined once. `detail`
 * defaults to `detailFor(code)`; a caller may override it only for a
 * genuinely per-request sentence (none exist in this phase's fixed
 * copy yet — every current call site can omit the second argument).
 */
export function errorBody(code: WireErrorCode, detail?: string): { error: WireErrorCode; detail: string } {
  return { error: code, detail: detail ?? detailFor(code) };
}
