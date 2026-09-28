/* ================================================================
   THE CLIENT PROJECTION — every cached server fact, in one module (SC-5)

   This is the only module in the build that holds cached server
   state. It is a projection scoped to the life of one document, not
   a service: no class, no constructor, no singleton accessor, and
   nothing that outlives the tab. A full document load empties every
   cell here, which is the same event that tears down the document
   the cells describe.

   If a second module starts caching a server fact, SC-5's claim is
   void by construction rather than by bug — there would then be two
   lifetimes and one purge, and the purge would be the one that did
   not matter. Plan 04-06's storage-and-module-state sweep in
   `scripts/check-primitives.mjs` is what stops that landing: it
   asserts no module-scope mutable state and no storage call in
   `app/` or `components/`. The failure it prevents is an artisan
   choosing a different persona and still seeing the previous
   account's order titles, because a component kept its own copy.

   Freshness is not this module's judgement. The server states which
   store answered on every response, in `X-CAP-Instance`, and
   `noteResponse` below compares that value before any body is
   stored (D-04). A projection that outlived the instance it was read
   from is the one failure the single purge exists to prevent.

   D-04's accepted cost, recorded here because this is where a later
   reader meets it: until Phase 6, a restored order whose segments
   died with the instance reads as *no time recorded* rather than
   *the record was discarded*. Phase 4 deliberately authors no
   sentence for the difference — `memoryStore` and `store_evicted`
   render on Phase 6's sync screen, and naming the loss here would
   mean inventing copy this phase does not own. Deliberate, not an
   oversight.

   Pattern: lib/store/memory.ts (the module-level Map and its
   "module scope, not a service" framing) and lib/http/respond.ts's
   notFound() (a function whose absence of a parameter is the
   mechanism). This module reaches the server over HTTP alone and
   imports nothing from lib/store, lib/access, lib/reconcile,
   lib/session or lib/http — the seam is the wire, not a shared
   module (D-DEP).
   ================================================================ */

import type {
  Artisan,
  Decision,
  OrderAsset,
  OrderClock,
  Proposal,
  VerificationResult,
  WorkOrder,
} from "../data/types.ts";
import { anchorFrom, type Anchor } from "./clock.ts";

/** What one order-detail read carries back, as the route sends it. */
export type OrderDetail = {
  order: WorkOrder;
  assets: OrderAsset[];
  clock: OrderClock | null;
  verifications: VerificationResult[];
  proposals: Proposal[];
  decisions: Decision[];
};

/**
 * A clock as read, with the monotonic reading at which it arrived.
 * The elapsed figure is never stored: it is rendered arithmetic
 * derived from this anchor (FR-10), and `lib/client/clock.ts` owns
 * the derivation.
 */
export type ClockEntry = { clock: OrderClock; anchor: Anchor };

/**
 * Every accessor answers in one of three ways, and the three are
 * deliberately distinguishable. A refusal is the server's own
 * `{ error, detail }` envelope, passed through unaltered. A
 * no-answer is a request that never reached a response at all.
 * Collapsing those two would make an offline app look signed out,
 * or a refused order look like a network fault.
 */
export type Outcome<T> =
  | { kind: "ok"; value: T }
  | { kind: "refused"; error: string; detail: string }
  | { kind: "no-answer" };

/* ---------------- the cells, at module scope ---------------- */

/** The store instance the cached values below were read from. */
let instance: string | null = null;

/** The acting account, as the server names it — never typed by a person. */
let account: Artisan | null = null;

/** The order list, keyed by order id. */
const orders = new Map<string, WorkOrder>();

/** One clock per order, with the monotonic instant it arrived. */
const clocks = new Map<string, ClockEntry>();

/** One full order detail per order id, as last read. */
const details = new Map<string, OrderDetail>();

/* ---------------- the one write door, and the one purge ---------------- */

/**
 * The single write door. Every response this module receives passes
 * through here BEFORE its body is touched.
 *
 * The ordering is load-bearing: purging after the body was stored
 * would discard the very datum that proved the instance changed,
 * leaving the new value in a cache the purge had already walked past.
 */
export function noteResponse(res: Response): void {
  const seen = res.headers.get("x-cap-instance");

  /* Cannot happen against this seam: `X-CAP-Instance` is in the
     universal header set and is present on every response including
     a 404 (lib/http/contract.ts's HEADER_TABLE). Handled rather than
     asserted, because a projection that threw here would fail the
     document over a header. */
  if (seen === null) return;

  if (instance !== null && instance !== seen) purge();

  instance = seen;
}

/**
 * Empties every cell. No parameters at all — the absence of a
 * parameter IS the mechanism: there is nothing a caller could pass
 * that would make this a partial purge, so no second, narrower reset
 * can drift away from this one.
 *
 * `instance` is deliberately NOT cleared. `noteResponse` sets it to
 * the new value on the very next line after calling this, and
 * clearing it would make the following response read as a first
 * contact rather than as the change it was.
 */
export function purge(): void {
  account = null;
  orders.clear();
  clocks.clear();
  details.clear();
}

/* ---------------- the cached readers, read during render ---------------- */

/* Reading a module-scope Map during render is lint-clean under this
   project's React Compiler rules, and hydrates cleanly because the
   module is empty on both sides of a fresh document. */

export function cachedAccount(): Artisan | null {
  return account;
}

export function cachedOrders(): WorkOrder[] {
  return [...orders.values()];
}

export function cachedOrder(orderId: string): OrderDetail | null {
  return details.get(orderId) ?? null;
}

export function cachedClock(orderId: string): ClockEntry | null {
  return clocks.get(orderId) ?? null;
}

/* ---------------- the seven accessors ---------------- */

/** Stores one clock as read, anchoring it to the monotonic clock. */
function storeClock(clock: OrderClock): void {
  clocks.set(clock.order_id, { clock, anchor: anchorFrom(clock, performance.now()) });
}

/** The server's refusal envelope, as sent. No sentence is composed here. */
async function refusalFrom(res: Response): Promise<Outcome<never>> {
  const body: unknown = await res.json().catch(() => null);
  const envelope = (body ?? {}) as { error?: string; detail?: string };
  return {
    kind: "refused",
    error: envelope.error ?? "bad_request",
    detail: envelope.detail ?? "",
  };
}

/**
 * Is there a session? This request, and nothing else. The credential
 * is an HttpOnly cookie and unreadable from script, so the client
 * never inspects, decodes or caches it — a 401 is the server saying
 * no, and it arrives as `{ kind: "ok", value: null }` because it is a
 * definite answer. A request that never landed is `no-answer`.
 */
export async function readSession(): Promise<Outcome<Artisan | null>> {
  let res: Response;
  try {
    res = await fetch("/api/session");
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  if (res.status === 401) return { kind: "ok", value: null };
  if (!res.ok) return refusalFrom(res);
  const body = (await res.json()) as { account: Artisan };
  account = body.account;
  return { kind: "ok", value: body.account };
}

/**
 * Ends the session, clearing the credential unconditionally (FR-3's
 * stated limitation: the credential is stateless, so nothing revokes
 * a copied value early).
 *
 * Deliberately does NOT purge. C-29 places the cache purge at the
 * next gate entry, and the ended account's clock segments and queued
 * items are untouched by clearing a credential — they carry their own
 * claimed account.
 */
export async function endSession(): Promise<Outcome<null>> {
  let res: Response;
  try {
    res = await fetch("/api/session", { method: "DELETE" });
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  return { kind: "ok", value: null };
}

/** The order list and its clocks, in one read. */
export async function readOrders(): Promise<Outcome<{ orders: WorkOrder[]; clocks: OrderClock[] }>> {
  let res: Response;
  try {
    res = await fetch("/api/orders");
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  if (!res.ok) return refusalFrom(res);
  const body = (await res.json()) as { orders: WorkOrder[]; clocks: OrderClock[] };
  for (const order of body.orders) orders.set(order.id, order);
  for (const clock of body.clocks) storeClock(clock);
  return { kind: "ok", value: body };
}

/**
 * One order in full. On a refusal the server's own code and sentence
 * are returned and nothing is cached — this accessor never branches
 * on *why* the read failed, so it cannot become an existence oracle
 * for what AD-4 defeats on the wire.
 */
export async function readOrder(orderId: string): Promise<Outcome<OrderDetail>> {
  let res: Response;
  try {
    res = await fetch(`/api/orders/${orderId}`);
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  if (!res.ok) return refusalFrom(res);
  const body = (await res.json()) as OrderDetail;
  details.set(orderId, body);
  orders.set(body.order.id, body.order);
  if (body.clock !== null) storeClock(body.clock);
  return { kind: "ok", value: body };
}

/** Every clock this account holds, replacing each stored entry. */
export async function readHours(): Promise<Outcome<OrderClock[]>> {
  let res: Response;
  try {
    res = await fetch("/api/hours");
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  if (!res.ok) return refusalFrom(res);
  const body = (await res.json()) as { clocks: OrderClock[] };
  for (const clock of body.clocks) storeClock(clock);
  return { kind: "ok", value: body.clocks };
}

/**
 * The body both clock routes accept: exactly one key, and a fresh
 * identifier on every call.
 *
 * Fresh is the point. Reusing one value makes the second tap a
 * `duplicate` rather than the idempotent success FR-7 describes.
 * `crypto.randomUUID` is a secure-context API — fine on https and on
 * localhost, absent on a plain-http LAN origin of the kind used for
 * on-device testing, which is a deployment constraint rather than a
 * fallback this module should invent.
 */
function clockBody(): { body: string; headers: Record<string, string> } {
  return {
    body: JSON.stringify({ client_id: crypto.randomUUID() }),
    headers: { "content-type": "application/json" },
  };
}

/** Opens the order's clock. Stores the returned clock, so no follow-up read is needed. */
export async function openClock(orderId: string): Promise<Outcome<OrderClock>> {
  const { body, headers } = clockBody();
  let res: Response;
  try {
    res = await fetch(`/api/orders/${orderId}/open`, { method: "POST", headers, body });
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  if (!res.ok) return refusalFrom(res);
  const parsed = (await res.json()) as { clock: OrderClock };
  storeClock(parsed.clock);
  return { kind: "ok", value: parsed.clock };
}

/** Closes the order's clock. Same body contract, same fresh identifier. */
export async function closeClock(orderId: string): Promise<Outcome<OrderClock>> {
  const { body, headers } = clockBody();
  let res: Response;
  try {
    res = await fetch(`/api/orders/${orderId}/close`, { method: "POST", headers, body });
  } catch {
    return { kind: "no-answer" };
  }
  noteResponse(res);
  if (!res.ok) return refusalFrom(res);
  const parsed = (await res.json()) as { clock: OrderClock };
  storeClock(parsed.clock);
  return { kind: "ok", value: parsed.clock };
}
