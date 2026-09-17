/* ================================================================
   MEMORY STORE — the whole of the record (AD-10)

   Module-level Maps, keyed by account so a per-account cap and a
   per-account eviction pass are both expressible. This is server
   memory, not a service: no class, no external resource, nothing
   that outlives this running process. A cold start empties every
   Map, mints a fresh BOOT_ID below, and says nothing about it —
   AD-10 marks that silence as correct. Only an eviction (a record
   actually dropped while this instance kept running) is ever
   surfaced to a caller, through recordEviction/wasEvicted below.

   No database sits behind this module and no external store is ever
   consulted. Every value read here can vanish on the next deploy,
   the next cold start, or simply because a later request lands on a
   different running instance. The walk payload's own `store.statement`
   (lib/copy/governed.ts's `memoryStore` sentence) is what tells a
   reviewer this in the product itself, so this module's job is to
   make that sentence true, not to work around it.

   Pattern: ../ipv-demo/lib/decision/store.ts (the whole file) — the
   module-level Map, the oldest-first eviction idiom (its lines
   108-119, reused verbatim below), and this same "module scope, not
   a service" framing (its header, lines 1-27). NOT copied: the
   sibling's sequential `dec-2026-0001` id minting (lines 76-86). AD-5
   requires every client-visible id in this project to be derived and
   unguessable, and nothing minted in this module is ever returned to
   a caller as an identity it depends on — `BOOT_ID` identifies the
   running instance, not a record.

   CAPS, TWO RULES (stated here once, applied identically at every
   write below):
     1. A per-account cap (captures, decisions, clock-clocks, seen)
        evicts oldest-first WITHIN that account. It never looks at,
        and never touches, any other account's records.
     2. The global cap (STORE_GLOBAL_OBJECT_MAX, counted across every
        record map for every account) evicts oldest-first WITHIN THE
        OFFENDING ACCOUNT FIRST — the account whose write just pushed
        the total over the limit, and only from the very map that
        write touched. This is the seed's own wording, and it is the
        reason one account flooding the store can never delete a
        second account's records: the eviction pass this module runs
        is always scoped to the account that caused it.
   ================================================================ */

import { randomUUID } from "node:crypto";
import {
  CAPTURES_PER_ACCOUNT_MAX,
  DECISIONS_PER_ACCOUNT_MAX,
  CLOCK_SEGMENTS_PER_ACCOUNT_MAX,
  SEEN_ENTRIES_PER_ACCOUNT_MAX,
  STORE_GLOBAL_OBJECT_MAX,
  STORE_TTL_SECONDS,
  EVICTION_RECORD_PER_ACCOUNT_MAX,
} from "../limits/index.ts";
import type { Capture, Decision, OrderClock, Proposal, SyncItemResult } from "../data/types";

/** Minted once per cold start; identifies the running instance on
    every response (`X-CAP-Instance`) and in `/api/health`. A fresh
    value here IS the observable signal of a cold start or an
    instance change — nothing else announces one. */
export const BOOT_ID: string = randomUUID();

/** Wall-clock moment this module first loaded, for `uptimeSeconds()`. */
const BOOTED_AT_MS = Date.now();

const TTL_MS = STORE_TTL_SECONDS * 1000;

/**
 * FR-60: every act on a proposal produces a server-generated,
 * time-stamped entry naming the acting account, the event type and
 * the outcome. Nothing about the body's content is retained here,
 * because a retained attempt is evidence that an act occurred, not a
 * copy of what was sent — the two are different claims and this
 * project only makes the first one.
 *
 * `at` is ISO-8601 UTC with a trailing `Z`, taken from this module's
 * own clock at write time; no caller ever supplies it (`writeAttempt`
 * below has no parameter for it, by the same discipline
 * `stampLastContact` uses for D-07's last-contact value).
 */
export interface AttemptEntry {
  at: string;
  account_id: string | null;
  event: string;
  outcome: "recorded" | "duplicate" | "conflict" | "rejected";
  code: string | null;
  client_id: string | null;
  order_id: string | null;
}

/* ----------------------------------------------------------------
   Stored shapes. Each adds one field, `at_ms`, to the domain type:
   the moment this exact copy entered the store, from this module's
   own clock, used only by the TTL sweep below. It is never returned
   to a caller — every read strips it (see `stripAtMs`) — so widening
   a domain type with it here never changes what a route can observe.
   `seen`'s stored shape already carried `at_ms` as part of its own
   definition (below), so it needs no separate wrapper.
   ---------------------------------------------------------------- */
type StoredCapture = Capture & { at_ms: number };
type StoredDecision = Decision & { at_ms: number };
type StoredProposal = Proposal & { at_ms: number };
type StoredClock = OrderClock & { at_ms: number };
interface StoredSeen {
  payload_hash: string;
  result: SyncItemResult;
  at_ms: number;
}

/* ----------------------------------------------------------------
   The record, in full. Every Map below is keyed first by account id,
   so a per-account cap and a per-account eviction and sweep pass are
   all one Map lookup away — nothing here ever scans every account to
   answer a question about one of them.
   ---------------------------------------------------------------- */
const captures = new Map<string, Map<string, StoredCapture>>();
const decisions = new Map<string, Map<string, StoredDecision>>();
/** Issued proposals, kept so a later decision can read state. The id
    itself is derived elsewhere (AD-5, `lib/proposals/derive.ts`,
    plan 03-04) and never minted in this module. */
const proposals = new Map<string, Map<string, StoredProposal>>();
/** Keyed by order id — one `OrderClock` per order an account holds. */
const clocks = new Map<string, Map<string, StoredClock>>();
const seen = new Map<string, Map<string, StoredSeen>>();
/** A bounded ring per account. Ring size is `ATTEMPT_RING_PER_ACCOUNT_MAX`
    below, not one of `lib/limits`' exports: AD-13 bounds quantities
    both the client and the server must agree on, and nothing on the
    client ever reads how many attempts this module retains. */
const attempts = new Map<string, AttemptEntry[]>();
/**
 * A refusal that never resolved an account (no session) is written
 * here with `account_id: null` rather than attributed to a guess —
 * FR-60 says an entry names the acting account, and an entry that
 * cannot name one is kept honestly separate instead.
 */
const unattributedAttempts: AttemptEntry[] = [];
/**
 * Which proposal ids this account has had evicted, so `wasEvicted`
 * can tell `store_evicted` (was here, got dropped) from
 * `unknown_proposal` (never derivable). Modelled as a
 * `Map<proposalId, at_ms>` rather than a literal `Set` so the same
 * insertion-order eviction idiom and the same TTL sweep apply here
 * too; only `.has(id)` and key order are ever used, which is exactly
 * a Set's contract.
 */
const evicted = new Map<string, Map<string, number>>();
/**
 * D-07: the device's last server contact, stamped from this module's
 * own clock only (`stampLastContact` takes no time argument — see
 * below). The value doubles as its own sweep timestamp: how long ago
 * contact happened and how stale the entry is are the same question.
 */
const lastContact = new Map<string, number>();

/** Every account this instance has ever touched, so the full `sweep()`
    below has a roster to walk without scanning any Map's keys twice. */
const knownAccounts = new Set<string>();

/** Not one of `lib/limits`' exports — see the `attempts` comment above. */
const ATTEMPT_RING_PER_ACCOUNT_MAX = 50;
/** Same reasoning as `ATTEMPT_RING_PER_ACCOUNT_MAX`, for the one ring
    with no account to key by. */
const UNATTRIBUTED_ATTEMPT_RING_MAX = 50;

/* ---------------------------------------------------------------
   Internal helpers. None of these are exported: a build rule telling
   a write from a read only has to look at this module's exports.
   --------------------------------------------------------------- */

function isStale(atMs: number, nowMs: number): boolean {
  return nowMs - atMs > TTL_MS;
}

function ensureAccountMap<V>(
  store: Map<string, Map<string, V>>,
  account: string,
): Map<string, V> {
  knownAccounts.add(account);
  let map = store.get(account);
  if (!map) {
    map = new Map<string, V>();
    store.set(account, map);
  }
  return map;
}

function ensureAttemptRing(account: string): AttemptEntry[] {
  knownAccounts.add(account);
  let ring = attempts.get(account);
  if (!ring) {
    ring = [];
    attempts.set(account, ring);
  }
  return ring;
}

function ensureEvictedMap(account: string): Map<string, number> {
  knownAccounts.add(account);
  let map = evicted.get(account);
  if (!map) {
    map = new Map<string, number>();
    evicted.set(account, map);
  }
  return map;
}

/** Sweeps one account's slice of a `Map<id, {at_ms}>`-shaped record
    map, in place. O(this account's own entries in this one map) —
    never a full-store scan, which is what keeps every exported
    function below O(touched-account). */
function sweepRecordMap<V extends { at_ms: number }>(
  map: Map<string, V> | undefined,
  nowMs: number,
): void {
  if (!map) return;
  for (const [id, value] of map) {
    if (isStale(value.at_ms, nowMs)) map.delete(id);
  }
}

/** Same shape as `sweepRecordMap`, for `evicted`'s `Map<id, at_ms>`
    (the value itself IS the timestamp — nothing to unwrap). */
function sweepTimestampMap(
  map: Map<string, number> | undefined,
  nowMs: number,
): void {
  if (!map) return;
  for (const [id, at] of map) {
    if (isStale(at, nowMs)) map.delete(id);
  }
}

/** `AttemptEntry.at` is the only timestamp a ring's own entries
    carry, so sweeping means parsing it rather than reading `.at_ms`. */
function sweepAttemptRing(ring: AttemptEntry[] | undefined, nowMs: number): void {
  if (!ring) return;
  let i = 0;
  while (i < ring.length) {
    if (isStale(Date.parse(ring[i].at), nowMs)) ring.splice(i, 1);
    else i += 1;
  }
}

/**
 * Runs at the head of every account-scoped exported function below,
 * mutating and reading alike, so a stale record can never be
 * observed. Touches only `account`'s own slice of every Map — this
 * is the "O(touched-account)" sweep the design calls for, not a
 * full-store scan (that is what the separate `sweep()` export below
 * is for, and it says so where it is not this cheap).
 */
function sweepAccount(account: string, nowMs: number): void {
  sweepRecordMap(captures.get(account), nowMs);
  sweepRecordMap(decisions.get(account), nowMs);
  sweepRecordMap(proposals.get(account), nowMs);
  sweepRecordMap(clocks.get(account), nowMs);
  sweepRecordMap(seen.get(account), nowMs);
  sweepAttemptRing(attempts.get(account), nowMs);
  sweepTimestampMap(evicted.get(account), nowMs);
  const contact = lastContact.get(account);
  if (contact !== undefined && isStale(contact, nowMs)) lastContact.delete(account);
}

/**
 * The running total `STORE_GLOBAL_OBJECT_MAX` bounds: the same six
 * categories `storeStats()` reports, except a clock counts once per
 * order here (what the caps actually bound) where `storeStats()`
 * reports a segment count instead (a more legible number for a
 * reviewer reading `/api/health`) — both are correct, they answer
 * different questions. Computed fresh rather than tracked
 * incrementally: this preview's account cardinality is fixture-
 * bounded (three artisans), so summing `Map.size` across each
 * account's slice is O(accounts), not O(objects), and that is cheap
 * enough to recompute rather than risk a running counter drifting
 * out of sync with one of the several sweep or evict paths above.
 */
function globalObjectCount(): number {
  let total = 0;
  for (const m of captures.values()) total += m.size;
  for (const m of decisions.values()) total += m.size;
  for (const m of proposals.values()) total += m.size;
  for (const m of clocks.values()) total += m.size;
  for (const m of seen.values()) total += m.size;
  for (const ring of attempts.values()) total += ring.length;
  return total;
}

/**
 * The sibling's eviction idiom (`../ipv-demo/lib/decision/store.ts`
 * lines 108-119), verbatim, run twice: once for `perAccountMax` (if
 * this record kind has one — proposals and attempts do not, see the
 * comments above their Maps) and once for the global cap, in that
 * order. Both passes only ever delete from `map` — the account that
 * just wrote's own slice — which is the whole of the cross-account
 * safety rule: an eviction this call triggers can only ever consume
 * records the writing account itself owns.
 */
function enforceCaps<V>(
  map: Map<string, V>,
  perAccountMax: number | null,
  onEvict?: (id: string) => void,
): void {
  if (perAccountMax !== null) {
    while (map.size > perAccountMax) {
      const oldest = map.keys().next();
      if (oldest.done) break;
      map.delete(oldest.value);
      onEvict?.(oldest.value);
    }
  }
  while (globalObjectCount() > STORE_GLOBAL_OBJECT_MAX) {
    const oldest = map.keys().next();
    if (oldest.done) break;
    map.delete(oldest.value);
    onEvict?.(oldest.value);
  }
}

/** Reads return defensive copies, never the live Map, so a caller
    cannot mutate the store through a read: `structuredClone` first,
    then this strips the internal `at_ms` field the caller never
    asked for and was never promised. */
function stripAtMs<T extends { at_ms: number }>(stored: T): Omit<T, "at_ms"> {
  const clone = structuredClone(stored);
  const { at_ms: _at_ms, ...rest } = clone;
  void _at_ms;
  return rest;
}

/** `elapsed_s` on the stored record is a placeholder, never read
    directly (see `writeClockSegment`) — a running segment's duration
    grows between writes, so every read recomputes it fresh from the
    segments themselves rather than trusting a value that would
    otherwise go stale the instant it was stored. */
function computeElapsedSeconds(clock: StoredClock, nowMs: number): number {
  let totalMs = 0;
  for (const segment of clock.segments) {
    const openedMs = Date.parse(segment.opened_at);
    const endMs = segment.closed_at ? Date.parse(segment.closed_at) : nowMs;
    totalMs += Math.max(0, endMs - openedMs);
  }
  return Math.floor(totalMs / 1000);
}

function toOrderClock(stored: StoredClock, nowMs: number): OrderClock {
  const clone = structuredClone(stored);
  const { at_ms: _at_ms, ...rest } = clone;
  void _at_ms;
  return { ...rest, elapsed_s: computeElapsedSeconds(stored, nowMs) };
}

/* =================================================================
   MUTATORS — every export below begins `write`, `stamp` or `record`,
   or is named `sweep`. The one exception is `closeClockSegment`,
   flagged where it is defined: a build rule enumerating this
   module's mutating exports (plan 03-12's single-writer check) must
   list it by name alongside these nine.
   ================================================================= */

export function writeCapture(account: string, capture: Capture): void {
  const nowMs = Date.now();
  const map = ensureAccountMap(captures, account);
  sweepAccount(account, nowMs);
  map.set(capture.id, { ...structuredClone(capture), at_ms: nowMs });
  enforceCaps(map, CAPTURES_PER_ACCOUNT_MAX);
}

/** Plural: one verify call issues several proposals at once. Any
    proposal id this call evicts — via either the global cap here (no
    per-account cap exists for proposals) — is passed to
    `recordEviction`, which is how `wasEvicted` below can later tell
    `store_evicted` from `unknown_proposal`. */
export function writeProposals(account: string, items: Proposal[]): void {
  const nowMs = Date.now();
  const map = ensureAccountMap(proposals, account);
  sweepAccount(account, nowMs);
  for (const proposal of items) {
    map.set(proposal.id, { ...structuredClone(proposal), at_ms: nowMs });
  }
  enforceCaps(map, null, (proposalId) => recordEviction(account, proposalId));
}

export function writeDecision(account: string, decision: Decision): void {
  const nowMs = Date.now();
  const map = ensureAccountMap(decisions, account);
  sweepAccount(account, nowMs);
  map.set(decision.id, { ...structuredClone(decision), at_ms: nowMs });
  enforceCaps(map, DECISIONS_PER_ACCOUNT_MAX);
}

/**
 * Appends one segment to `orderId`'s clock for `account`, creating
 * the `OrderClock` record on first use. `opened_at` and the two
 * optional device-claim fields are taken exactly as given — any
 * clamping against D-07's floor is `lib/reconcile/apply.ts`'s
 * decision (plan 03-05), not this module's; this module only stores
 * what it is told. `closed_at` starts `null` — see `closeClockSegment`.
 */
export function writeClockSegment(
  account: string,
  orderId: string,
  input: {
    opened_at: string;
    source: "server" | "device_reconciled";
    device_claimed_opened_at?: string;
    device_offset_s?: number;
  },
): void {
  const nowMs = Date.now();
  const map = ensureAccountMap(clocks, account);
  sweepAccount(account, nowMs);
  const segment: StoredClock["segments"][number] = {
    opened_at: input.opened_at,
    closed_at: null,
    source: input.source,
    ...(input.device_claimed_opened_at !== undefined
      ? { device_claimed_opened_at: input.device_claimed_opened_at }
      : {}),
    ...(input.device_offset_s !== undefined ? { device_offset_s: input.device_offset_s } : {}),
  };
  const existing = map.get(orderId);
  if (existing) {
    existing.segments.push(segment);
    existing.at_ms = nowMs;
  } else {
    map.set(orderId, {
      order_id: orderId,
      account_id: account,
      segments: [segment],
      elapsed_s: 0, // placeholder — see computeElapsedSeconds
      at_ms: nowMs,
    });
  }
  enforceCaps(map, CLOCK_SEGMENTS_PER_ACCOUNT_MAX);
}

/**
 * MUTATOR, despite a name that carries none of `write`/`stamp`/
 * `record`/`sweep` — flagged explicitly here so the single-writer
 * rule (plan 03-12) lists it alongside the nine that do. Closes the
 * account's currently-open segment for `orderId` from this module's
 * own clock (no `closed_at` parameter exists, by the same discipline
 * as `stampLastContact` — and `OrderClock.segments` carries no
 * `device_claimed_closed_at` field for a caller to fill anyway).
 * Returns `false` when there is no order-clock, or no segment left
 * running, for `orderId` — the D-06 `not_open` case — so a caller
 * needs no separate read to distinguish the two.
 */
export function closeClockSegment(account: string, orderId: string): boolean {
  const nowMs = Date.now();
  sweepAccount(account, nowMs);
  const clock = clocks.get(account)?.get(orderId);
  if (!clock) return false;
  let open: StoredClock["segments"][number] | undefined;
  for (let i = clock.segments.length - 1; i >= 0; i -= 1) {
    if (clock.segments[i].closed_at === null) {
      open = clock.segments[i];
      break;
    }
  }
  if (!open) return false;
  open.closed_at = new Date().toISOString();
  clock.at_ms = nowMs;
  return true;
}

export function writeSeen(
  account: string,
  clientId: string,
  payloadHash: string,
  result: SyncItemResult,
): void {
  const nowMs = Date.now();
  const map = ensureAccountMap(seen, account);
  sweepAccount(account, nowMs);
  map.set(clientId, { payload_hash: payloadHash, result: structuredClone(result), at_ms: nowMs });
  enforceCaps(map, SEEN_ENTRIES_PER_ACCOUNT_MAX);
}

/**
 * `entry.at` is never accepted from a caller — stamped here, from
 * this module's own clock, always. An entry whose `account_id` is
 * `null` (no session resolved) goes to the module-level unattributed
 * ring instead of any account's own ring; see the comment on that
 * ring above.
 */
export function writeAttempt(entry: Omit<AttemptEntry, "at">): void {
  const stamped: AttemptEntry = { ...entry, at: new Date().toISOString() };
  if (stamped.account_id !== null) {
    const account = stamped.account_id;
    const nowMs = Date.now();
    const ring = ensureAttemptRing(account);
    sweepAccount(account, nowMs);
    ring.push(stamped);
    while (ring.length > ATTEMPT_RING_PER_ACCOUNT_MAX) ring.shift();
    return;
  }
  unattributedAttempts.push(stamped);
  while (unattributedAttempts.length > UNATTRIBUTED_ATTEMPT_RING_MAX) unattributedAttempts.shift();
}

/**
 * Writes `Date.now()` and nothing else — `.length === 1` is asserted
 * by this module's own test, because a second parameter would be a
 * door for a body value to move D-07's clamp floor (AD-3). Reading
 * this value back after a sweep or a cold start is `null`, silently:
 * AD-10 already permits a silent cold start, so an absent floor here
 * is not an error and gets no message — `readLastContact` below
 * falls back to `issued_at` alone with nothing logged.
 */
export function stampLastContact(account: string): void {
  const nowMs = Date.now();
  knownAccounts.add(account);
  sweepAccount(account, nowMs);
  lastContact.set(account, nowMs);
}

export function recordEviction(account: string, proposalId: string): void {
  const nowMs = Date.now();
  const map = ensureEvictedMap(account);
  sweepAccount(account, nowMs);
  map.set(proposalId, nowMs);
  while (map.size > EVICTION_RECORD_PER_ACCOUNT_MAX) {
    const oldest = map.keys().next();
    if (oldest.done) break;
    map.delete(oldest.value);
  }
}

/**
 * The one function in this module that is NOT O(touched-account): it
 * has no single account to scope to, so it walks every account this
 * instance has ever seen. Nothing in this phase's routes needs to
 * call it directly — every account-scoped function above already
 * sweeps its own account on every call — but `storeStats()` below
 * calls it before counting, and it is exported as a maintenance
 * primitive in its own right.
 */
export function sweep(): void {
  const nowMs = Date.now();
  for (const account of knownAccounts) sweepAccount(account, nowMs);
  let i = 0;
  while (i < unattributedAttempts.length) {
    if (isStale(Date.parse(unattributedAttempts[i].at), nowMs)) unattributedAttempts.splice(i, 1);
    else i += 1;
  }
}

/* =================================================================
   READS — every export below begins `read`, or is a boolean lookup
   (`wasEvicted`) or a constant/aggregate (`BOOT_ID`, `storeStats`,
   `uptimeSeconds`). None ever returns a live Map, an element with
   its internal `at_ms` still attached, or a value a caller could
   mutate to affect what the next read sees.
   ================================================================= */

export function readClock(account: string, orderId: string): OrderClock | null {
  const nowMs = Date.now();
  sweepAccount(account, nowMs);
  const stored = clocks.get(account)?.get(orderId);
  return stored ? toOrderClock(stored, nowMs) : null;
}

export function readClocksForAccount(account: string): OrderClock[] {
  const nowMs = Date.now();
  sweepAccount(account, nowMs);
  const map = clocks.get(account);
  if (!map) return [];
  return [...map.values()].map((clock) => toOrderClock(clock, nowMs));
}

export function readCaptures(account: string): Capture[] {
  sweepAccount(account, Date.now());
  const map = captures.get(account);
  if (!map) return [];
  return [...map.values()].map(stripAtMs);
}

export function readProposal(account: string, proposalId: string): Proposal | null {
  sweepAccount(account, Date.now());
  const stored = proposals.get(account)?.get(proposalId);
  return stored ? stripAtMs(stored) : null;
}

export function readProposalsForAsset(account: string, assetId: string): Proposal[] {
  sweepAccount(account, Date.now());
  const map = proposals.get(account);
  if (!map) return [];
  return [...map.values()].filter((proposal) => proposal.asset_id === assetId).map(stripAtMs);
}

export function readDecisions(account: string): Decision[] {
  sweepAccount(account, Date.now());
  const map = decisions.get(account);
  if (!map) return [];
  return [...map.values()].map(stripAtMs);
}

export function readSeen(
  account: string,
  clientId: string,
): { payload_hash: string; result: SyncItemResult } | null {
  sweepAccount(account, Date.now());
  const entry = seen.get(account)?.get(clientId);
  return entry ? stripAtMs(entry) : null;
}

export function readAttempts(account: string): AttemptEntry[] {
  sweepAccount(account, Date.now());
  const ring = attempts.get(account);
  return ring ? structuredClone(ring) : [];
}

/** The refusal ring for a request that resolved no acting account at
    all — see the `unattributedAttempts` comment above. FR-60 says an
    entry that cannot name an account is kept honestly separate
    rather than attributed to a guess, and this is what makes that
    entry readable back rather than only ever written. Same
    defensive-copy discipline as readAttempts. */
export function readUnattributedAttempts(): AttemptEntry[] {
  return structuredClone(unattributedAttempts);
}

/** `null` before any `stampLastContact(account)` call, a number after,
    and `null` again once a sweep or an instance change has passed —
    the three states D-07's clamp floor distinguishes. */
export function readLastContact(account: string): number | null {
  sweepAccount(account, Date.now());
  return lastContact.get(account) ?? null;
}

export function wasEvicted(account: string, proposalId: string): boolean {
  sweepAccount(account, Date.now());
  return evicted.get(account)?.has(proposalId) ?? false;
}

/** The shape `/api/health` serves. Runs a full `sweep()` first, so a
    stale record already past its TTL is never counted — the only
    place in this module that trades the O(touched-account) rule for
    an accurate global answer, and it is cheap for the same reason
    `globalObjectCount` is: few accounts, not many objects. */
export function storeStats(): {
  captures: number;
  proposals: number;
  decisions: number;
  clock_segments: number;
  seen: number;
  attempts: number;
  total: number;
} {
  sweep();
  let capturesTotal = 0;
  for (const m of captures.values()) capturesTotal += m.size;
  let proposalsTotal = 0;
  for (const m of proposals.values()) proposalsTotal += m.size;
  let decisionsTotal = 0;
  for (const m of decisions.values()) decisionsTotal += m.size;
  let clockSegmentsTotal = 0;
  for (const m of clocks.values()) {
    for (const clock of m.values()) clockSegmentsTotal += clock.segments.length;
  }
  let seenTotal = 0;
  for (const m of seen.values()) seenTotal += m.size;
  let attemptsTotal = 0;
  for (const ring of attempts.values()) attemptsTotal += ring.length;
  return {
    captures: capturesTotal,
    proposals: proposalsTotal,
    decisions: decisionsTotal,
    clock_segments: clockSegmentsTotal,
    seen: seenTotal,
    attempts: attemptsTotal,
    total:
      capturesTotal +
      proposalsTotal +
      decisionsTotal +
      clockSegmentsTotal +
      seenTotal +
      attemptsTotal,
  };
}

export function uptimeSeconds(): number {
  return Math.floor((Date.now() - BOOTED_AT_MS) / 1000);
}
