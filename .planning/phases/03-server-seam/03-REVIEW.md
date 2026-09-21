---
phase: 03-server-seam
reviewed: 2026-09-21T13:06:15Z
depth: standard
files_reviewed: 62
files_reviewed_list:
  - app/api/captures/route.ts
  - app/api/decisions/route.ts
  - app/api/health/route.ts
  - app/api/hours/route.ts
  - app/api/orders/[id]/close/route.ts
  - app/api/orders/[id]/open/route.ts
  - app/api/orders/[id]/route.ts
  - app/api/orders/route.ts
  - app/api/session/route.ts
  - app/api/sync/route.ts
  - app/api/verify/route.ts
  - app/api/walk/[orderId]/route.ts
  - docs/analysis/server-seam-verification.md
  - docs/analysis/single-writer-non-bypassability.md
  - lib/access/scope.test.mjs
  - lib/access/scope.ts
  - lib/attribution/index.test.mjs
  - lib/attribution/index.ts
  - lib/copy/conflicts.test.mjs
  - lib/copy/conflicts.ts
  - lib/data/types.ts
  - lib/http/contract.test.mjs
  - lib/http/contract.ts
  - lib/http/respond.ts
  - lib/limits/index.test.mjs
  - lib/limits/index.ts
  - lib/proposals/derive.test.mjs
  - lib/proposals/derive.ts
  - lib/reconcile/apply.test.mjs
  - lib/reconcile/apply.ts
  - lib/reconcile/validate.test.mjs
  - lib/reconcile/validate.ts
  - lib/session/cookie.test.mjs
  - lib/session/cookie.ts
  - lib/session/key.test.mjs
  - lib/session/key.ts
  - lib/store/memory.test.mjs
  - lib/store/memory.ts
  - lib/verify/authored.test.mjs
  - lib/verify/authored.ts
  - lib/walk/payload.test.mjs
  - lib/walk/payload.ts
  - scripts/check-accepted-fields.mjs
  - scripts/check-accepted-fields.test.mjs
  - scripts/check-actor-field.mjs
  - scripts/check-actor-field.test.mjs
  - scripts/check-fixture-inputs.mjs
  - scripts/check-fixture-inputs.test.mjs
  - scripts/check-fixture-shape.test.mjs
  - scripts/check-named-packages.mjs
  - scripts/check-named-packages.test.mjs
  - scripts/check-non-bypassability.mjs
  - scripts/check-non-bypassability.test.mjs
  - scripts/check-single-writer.mjs
  - scripts/check-single-writer.test.mjs
  - scripts/curl-suite.sh
  - scripts/scaffold.test.mjs
  - scripts/server/route-assertions.mjs
  - scripts/server/route-assertions.test.mjs
  - scripts/server/route-suite.proof.mjs
  - scripts/verify.mjs
  - scripts/verify.test.mjs
findings:
  critical: 4
  warning: 9
  info: 9
  total: 22
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-09-21T13:06:15Z
**Depth:** standard
**Files Reviewed:** 62
**Status:** issues_found

## Summary

All 62 files were read in full at HEAD (`b9e126c`; the only commits after the coordinator's `bb72ebf` touched two planning artifacts, no in-scope file). `lib/data/types.ts` was reviewed as `git show HEAD:lib/data/types.ts`; its uncommitted working-tree comment is tracked elsewhere and is not a finding here. No server was started and `npm run verify` was not run. Four hypotheses were confirmed by running the real `lib/` modules under `node` with a bounded timeout (a forty-line reproduction script in the session scratchpad, never written into the repository); one was confirmed against the installed `next@16.3.4` by calling `NextResponse.json` directly.

**Claims that hold under adversarial reading.** One writer: no file other than `lib/reconcile/apply.ts` names a mutating store export, and every route builds its `SyncItem` from the session, the URL and a `pick()`-projected body. One attribution producer: every `captured_by`/`decided_by` is `account.account_id`, and forged actor fields in bodies and sync payloads cannot reach a record because the writer constructs each record field by field (`apply.ts:259-273`, `375-387`). One accessor: `orderOwned()` answers ownership before existence, and every not-found is `notFound()`/`notFoundProposal()` with no parameter to leak through. Session cookie: HMAC-SHA256 over the encoded payload, length guard then `timingSafeEqual`, signature checked before the payload is parsed or the expiry compared; no forgery path was found. Proposal ids: bare HMAC over `account\0client\0observation` re-derived under the session's account, so an unowned and a fabricated id fail at the same line. Walk payload: every store read is keyed by the acting account and filtered to the owned order; no cross-account field crosses into the response. No route exports a segment config. The byte-identity comparator compares status, raw body bytes and every non-excluded header, and its exclusion list carries no `x-cap-` name.

**Claims that do not hold.** The idempotency layer memoises *refusals* and replays them as `duplicate`, which every online route renders as a 2xx — a refused close/capture/decision retried under its own client id becomes a false success, and a changed replay poisons the record so the original conflicts too (CR-01). The D-07 clamp floor is stamped by the same `/api/sync` request before its items are applied, so it is always "now": a queued `order_open` or decision older than five minutes is refused `clock_skew`, and offline time is never credited (CR-02). `DELETE /api/session` throws inside `NextResponse.json` on every call (a 204 with a JSON body), so the sign-out route 500s and the cookie is never cleared (CR-03). The writer throws instead of refusing for a sync item with a missing `order_id` or an unknown `kind`, so no attempt is retained and the `unknown_kind` refusal is unreachable for the case it was written for (CR-04). Below those: the idempotency hash omits `kind`/`order_id` (WR-01), the "clock-segment cap" bounds order clocks rather than segments so segments grow without bound (WR-02), two string fields have no ceiling (WR-03), every `clock_skew` refusal tells the artisan a fabricated "3 h 12 m" (WR-04), and the single-writer / actor-field / non-bypassability sweeps do not see `import * as` or `export … from` (WR-05).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Refused items are memoised in `seen` and replayed as `duplicate`, which every online route renders as a 2xx success

**File:** `lib/reconcile/apply.ts:116-118` (writes `seen` for `conflict` and `rejected`), `lib/reconcile/apply.ts:499-503` (replays any stored result as `status: "duplicate"`, `code: null`), `app/api/orders/[id]/close/route.ts:84-99`, `app/api/orders/[id]/open/route.ts:93-117`, `app/api/captures/route.ts:112-128`, `app/api/verify/route.ts:116-141`, `app/api/decisions/route.ts:106-131` (each treats `duplicate` as success)
**Issue:** `finalize()` writes a `seen` entry for every terminal status except `duplicate`, so a `conflict` or `rejected` outcome is stored under the item's `client_id` with its payload hash. Step 3 then answers any later item with the same id and hash from that entry, relabelled `duplicate` with `code: null` on the `ApplyOutcome`. Reproduced against the real modules:

- `order_close` on a never-opened order → `conflict not_open` (seen entry written). Order opened. The identical close item retried → `status: "duplicate", code: "not_open"`, `outcome.code: null`; the segment is still open. The close route's success branch returns **200** `{ clock: { segments: [] } }` with `X-CAP-Clock: 0` — a fabricated empty clock while a segment runs.
- A decision refused `clock_skew` and re-sent unchanged after the phone's clock is fixed (EXPERIENCE's "Decide again" act) → 201 with body `{}` and `X-CAP-Decision-State: rejected` (`decisions/route.ts:116` falls through both `undefined`s to `"rejected"`). Re-sent with a new `decided_at` → `409 already_recorded_differently`, "This decision was already recorded" — nothing was ever recorded.
- A changed replay of a *recorded* capture overwrites the stored hash with the changed one (line 117 runs on the conflict path too): the original, unchanged item now returns `already_recorded_differently`, and the changed item sent twice returns `duplicate` → the capture route answers **201**.
- Through `/api/sync` the same relabelling inflates `X-CAP-Sync-Duplicate` and will tell P6's queue that a refused item was recorded.

AD-9's text is "a retried client_id with an unchanged payload replays the same *successful* result". Refusals are not successes and must not be memoised, and a stored success must never be overwritten by a later conflict.
**Fix:**
```ts
// lib/reconcile/apply.ts — finalize()
if (result.status === "recorded" && account) {
  writeSeen(account.account_id, item.client_id, idempotencyHash(item.kind, item.payload), result);
}
```
With only `recorded` memoised, the `already_recorded_differently` branch no longer clobbers the stored entry (it never reaches `writeSeen`), and a replayed `duplicate` always carries a real `server` block. Add unit tests: refuse → change state → retry the same item → applied; changed replay → original still `duplicate`; changed item twice → `conflict` both times. Add the online replay case to `route-suite.proof.mjs` (see IN-09).

### CR-02: `noteContact()` runs before `applyItem()` in `/api/sync`, so the D-07 clamp floor is always this request's own timestamp

**File:** `app/api/sync/route.ts:41` (stamp before the loop), `lib/reconcile/apply.ts:183-187` (queued `order_open` floor), `lib/reconcile/apply.ts:357-363` (queued decision floor)
**Issue:** `stampLastContact` writes `Date.now()`; the writer then reads it back as `lastContactMs` for every queued item in the same batch, so `floorMs = max(issued_at, now)` = now. Reproduced: session issued 2 h ago, a queued `order_open` claiming 60 min ago is `recorded` when no contact is stamped, and `conflict clock_skew` immediately after one `noteContact(account)` — exactly the call the sync route makes on line 41 before its loop. Consequences on the real route: every queued `order_open` or decision whose claim is older than `QUEUED_CLOCK_FLOOR_SLACK_SECONDS` (5 min) at sync time is refused `clock_skew`; a claim inside five minutes is clamped to ≈now, so `device_claimed_opened_at`/`device_offset_s` are retained but offline time is never credited. D-07's "the later of issued_at and the device's *last* server contact" means the contact before the device went offline, which is what `apply.test.mjs`'s queued tests model (none stamps contact before applying). The route proof (`route-suite.proof.mjs:451-499`) claims three minutes ago and asserts only `opened_at >= issued_at`, so it cannot see this.
**Fix:**
```ts
// app/api/sync/route.ts — delete the noteContact(account) call at line 41; after the loop:
noteContact(account);
return ok({ server_time: new Date().toISOString(), results }, { ... });
```
Do the same "apply, then stamp" on every route for uniformity. Add a distinguishing route test: make any authenticated request, wait ~1.5 s, post a queued `order_open` claiming `now − 500 ms`, and assert `segment.opened_at === device_claimed_opened_at` (with the stamp after the batch the claim is above the floor and is kept verbatim; with the stamp before, `opened_at` is the request time).

### CR-03: `DELETE /api/session` throws on every call — a 204 with a JSON body — so the sign-out route 500s and the cookie is never cleared

**File:** `app/api/session/route.ts:91-92`, `lib/http/respond.ts:80-83`
**Issue:** `ok(null, { status: 204 })` calls `NextResponse.json(null, { status: 204 })`, which is `Response.json(body, init)` under `next@16.3.4`. The Fetch spec forbids a body on a null-body status, and the installed framework throws `TypeError: Response constructor: Invalid response status code 204` (confirmed by calling `NextResponse.json(null, { status: 204 })` directly under this Node 24 / Next 16.3.4). The handler therefore never returns: Next serves its own 500 with none of the universal headers, no `Set-Cookie`, and the credential remains on the client. Nothing else in this project can clear it (no middleware by design). Neither `route-suite.proof.mjs` nor `curl-suite.sh` exercises `DELETE`, and `docs/analysis/single-writer-non-bypassability.md:121-122` describes the route as clearing the cookie unconditionally.
**Fix:**
```ts
// lib/http/respond.ts — ok()
const status = init?.status ?? 200;
const headers = withUniversalHeaders(callerHeaders);
if (status === 204 || status === 205 || status === 304) {
  return new NextResponse(null, { status, headers }); // null body: the only legal shape
}
return NextResponse.json(body, { status, headers });
```
Add `DELETE /api/session` to the route suite: 204, universal headers present, `set-cookie` carrying `Max-Age=0`, and a following `GET /api/session` → 401.

### CR-04: The writer throws before `finalize()` for a sync item with a missing `order_id` or an unknown `kind` — no attempt retained, `unknown_kind` unreachable, refusal mislabelled

**File:** `lib/reconcile/apply.ts:114` (`item.order_id.length`), `lib/reconcile/apply.ts:497` → `lib/reconcile/validate.ts:432` (`pick(source, ACCEPTED_PAYLOAD_FIELDS[kind])` with `kind` outside the closed set → `for … of undefined`), `app/api/sync/route.ts:96-144`
**Issue:** AD-1's order runs ownership and idempotency before shape, but steps 2-3 are not total over an unshaped envelope. Reproduced: an `order_open` item without `order_id` → `TypeError: Cannot read properties of undefined (reading 'length')` from `finalize()`, zero attempts retained; an item with `kind: "nonsense"` → `TypeError: fields is not iterable` at the idempotency step, before step 4 could return `unknown_kind`. Both are client-reachable through `/api/sync` (the route only pre-refuses the `client_id` shape and passes everything else to the writer). The route's catch-all converts either into `rejected bad_shape` "The field was kind." — wrong field for the first, wrong code for the second — and FR-60's retained attempt never happens. The `unknown_kind` sentence (an older preview queued it, reload) is therefore dead copy for the very case it was written for; only `referral` reaches it. The non-bypassability document's "a refusal is never a thrown exception that escapes this function" (`:45-47`) is false.
**Fix:** keep AD-1's order (hoisting the whole envelope check ahead of ownership would turn an unowned-order-plus-bad-field into `bad_shape`, which AD-4 forbids) and make steps 1-3 total instead:
```ts
// apply.ts finalize()
order_id: typeof item.order_id === "string" && item.order_id.length > 0 ? item.order_id : null,
// apply.ts step 2 — orderOwned(account, asString(item.order_id))
// validate.ts idempotencyHash()
const projected = pick(source, ACCEPTED_PAYLOAD_FIELDS[kind] ?? []);
```
Then a missing `order_id` is `order_not_found` (the same refusal a fabricated one gets) and an unknown kind on an owned order reaches step 4 and is refused `unknown_kind` with its own sentence and a retained attempt. Add both cases to `apply.test.mjs`.

## Warnings

### WR-01: The idempotency hash omits `kind`, `order_id` and `schema_version`, so a reused `client_id` across kinds or orders is a false `duplicate`

**File:** `lib/reconcile/validate.ts:430-434`, `lib/reconcile/apply.ts:497-503`
**Issue:** `idempotencyHash(kind, payload)` uses `kind` only to choose the projection; nothing from the envelope enters the digest. Reproduced: `idempotencyHash("order_open", {}) === idempotencyHash("order_close", {})` is `true`; an `order_close` sent under the `client_id` of an earlier `order_open` returns `duplicate` carrying the *open's* stored result, the segment keeps running, and the close route answers 200. The same id reused to open a different order returns the other order's clock. `already_recorded_differently` exists precisely to catch "same id, different item", and it cannot see the envelope.
**Fix:**
```ts
export function idempotencyHash(kind: SyncItemKind, payload: unknown, envelope: { order_id: string; schema_version: number }): string {
  const projected = pick(asRecord(payload) ?? {}, ACCEPTED_PAYLOAD_FIELDS[kind] ?? []);
  return createHash("sha256").update(canonicalize({ kind, ...envelope, payload: projected })).digest("hex");
}
```
Extend the "changed enumerated field" unit test to a changed `kind` and a changed `order_id`.

### WR-02: `CLOCK_SEGMENTS_PER_ACCOUNT_MAX` bounds order clocks, not segments — segments grow without bound and never expire while written

**File:** `lib/store/memory.ts:400-436` (`enforceCaps(map, CLOCK_SEGMENTS_PER_ACCOUNT_MAX)` where `map` is keyed by order id), `lib/store/memory.ts:278-287` (`globalObjectCount` counts one per clock), `lib/store/memory.ts:425` (`at_ms` refreshed on every write, so the TTL never fires for a busy clock), `lib/limits/index.ts:39-40` ("Per-account clock-segment cap")
**Issue:** An account holds at most two orders, so the map never exceeds two entries and the "20" is never applied to anything. Reproduced: 40 open/close cycles on one order → 42 segments, `storeStats().clock_segments` = 42, no eviction. Any holder of a valid session can grow one record without limit with fresh client ids (free), and every read that touches the clock — `/api/hours`, `/api/orders`, the walk payload, and `readClock` inside every capture and decision — `structuredClone`s and iterates all of it. AD-13's own words: a cap that does not hold.
**Fix:** bound segments explicitly and count them in the global total:
```ts
// writeClockSegment(), after the push / set:
const total = [...map.values()].reduce((n, c) => n + c.segments.length, 0);
if (total > CLOCK_SEGMENTS_PER_ACCOUNT_MAX) { /* refuse: return false and let apply.ts answer a conflict, or evict the oldest *closed* segment */ }
// globalObjectCount(): for (const m of clocks.values()) for (const c of m.values()) total += c.segments.length;
```
Refusing at the cap is the honest option for a demo (evicting closed segments silently changes `elapsed_s`); either way add a `memory.test.mjs` case and split the export into clocks-per-account and segments-per-account if both are wanted.

### WR-03: Two string fields have no ceiling, and no online route bounds its body

**File:** `lib/reconcile/validate.ts:102-106` and `:282` (`mime` is matched on the part before `;` and the whole string is stored), `lib/reconcile/validate.ts:328` (`note`), `lib/reconcile/apply.ts:266` and `:386` (stored verbatim), `app/api/{captures,verify,decisions,session,orders/[id]/open,orders/[id]/close}/route.ts` (`request.json()` with no byte check; only `/api/sync` has one)
**Issue:** Reproduced: a capture `mime` of `"image/jpeg;" + 5,000,000 chars` and a decision `note` of 5,000,000 chars both pass shape validation and would be `structuredClone`d into the store and echoed by `/api/walk`, `/api/orders/[id]` and the replay paths, 200 captures and 200 decisions per account. Everything else the store holds is bounded (thumb, sha256, timestamps by regex, ids by the HMAC length guard).
**Fix:** add `MIME_MAX_CHARS` and `NOTE_MAX_CHARS` to `lib/limits` and refuse (`badShape("mime")`, `tooLarge("note")`); add a per-route body ceiling checked against `content-length` before `request.json()`, resolved to the existing `batch_too_large`/`media_too_large` codes.

### WR-04: Every `clock_skew` refusal tells the artisan a fabricated "3 h 12 m"

**File:** `lib/copy/conflicts.ts:96-100`
**Issue:** The seed's illustrative sentence ships as the one sentence for the code: "This phone's clock disagrees with the server by 3 h 12 m." is returned whether the offset is 61 seconds or a day. The writer measures the real offset (`apply.ts:141-143`, `:201`, `:384`) and never surfaces it. A stated-as-fact number that is always wrong is the kind of overclaim the claims register exists to stop; it passes today only because the literal looks like a measurement.
**Fix:** either drop the figure — "This phone's clock disagrees with the server. Check the phone's time and decide again." — or carry the measured offset through `detail` (contract.ts's `errorBody` already accepts a per-request sentence) with the base sentence kept in `CONFLICT_COPY` and the clause appended the way `badShapeDetail` does.

### WR-05: The single-writer, non-bypassability and actor-field sweeps do not see `import * as` or `export … from`

**File:** `scripts/check-single-writer.mjs:151-163` (`extractNamedImports` requires `{ … }`), `:206-221`, `:250-260`; `scripts/check-non-bypassability.mjs:145-158`; `scripts/check-actor-field.mjs:146-159` and `:433-450` (`ORDER_IDS_BY_ARTISAN` importer sweep)
**Issue:** `import * as store from "../../../lib/store/memory.ts"; store.writeCapture(...)` in a route is valid TypeScript (the store has no default export, so the mixed `import def, { … }` form is the only one `tsc` blocks) and matches none of the three assertions, so the invariant the phase rests on is bypassable by an ordinary import shape; likewise `export { writeCapture as w } from "../store/memory.ts"` in a lib helper, and `import * as artisans` around FR-57's `ORDER_IDS_BY_ARTISAN` rule. The header lists a re-export under a different local name as uncatchable but not the plain namespace import, which is the likelier mistake. `scripts/check-fixture-inputs.mjs:163-171` already extracts every specifier and would see both.
**Fix:** extract specifiers the way `check-fixture-inputs.mjs` does, then treat any non-`type` import of `STORE_FILE` that is not an explicit named list as a violation (`import *` → violation; `export … from` → walk it as an edge), and add a fixture for each form to `check-single-writer.test.mjs` and `check-actor-field.test.mjs`.

### WR-06: `HEADER_TABLE`'s `routes` is wrong for `X-CAP-Account` and nothing verifies that field

**File:** `lib/http/contract.ts:99-105` (`routes: ["POST /api/session"]`, reason "This route has no ownership check to leak around"), emitted by `app/api/orders/route.ts:42`, `app/api/orders/[id]/route.ts:101`, `app/api/orders/[id]/open/route.ts:113`, `app/api/orders/[id]/close/route.ts:96`, `app/api/verify/route.ts:137`, `app/api/captures/route.ts:125`, `app/api/decisions/route.ts:127`, `app/api/sync/route.ts:170`, `app/api/walk/[orderId]/route.ts:60`, `app/api/session/route.ts:75`
**Issue:** The table is documented as load-bearing for AD-4, but only `name`/`scope` are enforced by `respond.ts`; `routes` and `reason` are free text, and the entry misstates the header's emitters and its rationale (several of those routes do have an ownership check the header must stay behind — it does, because it is success-only, but the table says otherwise). A reviewer auditing AD-4 from the table would be misled.
**Fix:** correct the entry (`routes: ["*"]` for authenticated 2xx responses, reason revised) and add a test that greps `app/api/**/route.ts` for every `"X-CAP-…"` literal and asserts each route appears in that name's `routes`.

### WR-07: `curl-suite.sh` on Git Bash uses the fixed 12-UUID pool, so a second run inside the TTL fails — and the recorded Preview run was from Git Bash

**File:** `scripts/curl-suite.sh:130-158`; `docs/analysis/server-seam-verification.md:14-17` ("from a Git Bash shell on Windows")
**Issue:** This workstation's Git Bash has neither `uuidgen` nor `/proc/sys/kernel/random/uuid` (verified), so `new_uuid` served the same twelve literals in the recorded run and will serve them again on every run. Against the same warm instance within `STORE_TTL_SECONDS` (6 h): check B's verify re-sends the first pool id with a fresh `captured_at` → `409 already_recorded_differently` (FAIL), and D/E/F fail behind it. FR-24 promises the seam is reproducible from an ordinary shell; on the project's own primary platform the suite is single-shot per instance. The run record does not say which UUID source fired.
**Fix:** generate v4 ids from `/dev/urandom`, which Git Bash does have:
```bash
new_uuid() {
  local h; h=$(od -An -tx1 -N16 /dev/urandom | tr -d ' \n')
  printf '%s-%s-4%s-%x%s-%s\n' "${h:0:8}" "${h:8:4}" "${h:13:3}" $(( (0x${h:16:1} & 3) | 8 )) "${h:17:3}" "${h:20:12}"
}
```
Keep the pool only as a last resort that prints a warning naming itself, and record the source in the run log.

### WR-08: `/api/sync`'s catch-all swallows every exception and relabels it `bad_shape` naming `kind`

**File:** `app/api/sync/route.ts:125-144`; contrast `app/api/verify/route.ts:103-112`
**Issue:** `catch {}` with no binding catches `UnknownCitedRecordError` (a fixture defect the verify route deliberately propagates so it is never dressed as a caller mistake), any store error, and CR-04's TypeErrors, and reports each to the artisan as "a field was missing or malformed … The field was kind." with nothing logged and no attempt retained. The same capture item is a 500 on `/api/verify` and a quiet `bad_shape` on `/api/sync`.
**Fix:**
```ts
} catch (error) {
  if (error instanceof UnknownCitedRecordError) throw error; // repository defect — surface it
  console.error("sync: applyItem threw", { client_id: item.client_id, kind: item.kind, error });
  results.push({ client_id: ..., status: "rejected", code: "bad_shape", detail: badShapeDetail("kind") });
}
```
Once CR-04's guards land, consider removing the try/catch entirely so a writer throw is loud on every route.

### WR-09: The online replay path re-reads the store and returns `201 {}` when the record is gone

**File:** `app/api/captures/route.ts:120-127`, `app/api/verify/route.ts:124-140`
**Issue:** On `duplicate`, the route re-reads `readCaptures(account).find(id)`; a `seen` entry outlives its capture under per-account eviction (`SEEN_ENTRIES_PER_ACCOUNT_MAX` 500 > `CAPTURES_PER_ACCOUNT_MAX` 200), and under CR-01 for every memoised refusal. The response is then `201` with body `{}` (JSON drops the `undefined`) and `X-CAP-Capture: <id>` — a success header for a record that does not exist.
**Fix:** treat a missing record on replay as a conflict (`store_evicted` fits its sentence) rather than a 201; better, put the recorded `Capture` on `SyncItemResult.server` so a replay carries its own record and the route never re-reads.

## Info

### IN-01: `respond.ts` header guards are case-sensitive while header names are not

**File:** `lib/http/respond.ts:47`, `:72-78`
**Issue:** `UNIVERSAL_NAMES.has(name)` and `name.startsWith("X-CAP-")` miss `x-cap-instance`; `new Headers({...})` would then append a second value to the universal header. Internal-only, but the guard exists to catch exactly a route author's slip.
**Fix:** compare `name.toLowerCase()` against lowercased sets.

### IN-02: The committed development key is used for any `NODE_ENV` other than exactly `"production"`

**File:** `lib/session/key.ts:30`
**Issue:** Unset (a custom Node server), `"staging"` or `"test"` all fall through to the well-known key silently.
**Fix:** allow the fallback only when `NODE_ENV` is `"development"` or `"test"`; throw otherwise.

### IN-03: Documentation drift in the two analysis documents

**File:** `docs/analysis/single-writer-non-bypassability.md:334` ("twenty-five steps"; `scripts/verify.mjs` has 26), `:45-47` (no refusal ever escapes as a throw — false per CR-04), `:121-122` (`DELETE` clears the cookie — false per CR-03); `docs/analysis/server-seam-verification.md` (does not record which UUID source the shell used, see WR-07)
**Fix:** correct after CR-03/CR-04 land; record the UUID source in the next run.

### IN-04: Unsupported methods on the other eleven routes still get Next's framework 405 without the universal headers; the hand-written 405 lacks `Allow`

**File:** `app/api/hours/route.ts:65-70` (and every other route for PUT/PATCH/DELETE)
**Issue:** The hours header explains why a framework 405 violates NFR-F1; the same applies to every method a route does not export. RFC 9110 also requires `Allow` on a 405.
**Fix:** export the remaining method handlers from one shared refusal (`fail("method_not_allowed")` plus an `Allow` value), or accept and document the gap.

### IN-05: AD-20's "dropped at parse" is not literally true for `/api/sync` payloads

**File:** `app/api/sync/route.ts:124-126`
**Issue:** Sync item payloads reach the writer unprojected; the actor-field guarantee holds only because `apply.ts:259-273`/`375-387` construct records field by field (verified). Documenting the mechanism as structural overstates it for this route.
**Fix:** project each item's payload through `pick(payload, ACCEPTED_PAYLOAD_FIELDS[kind] ?? [])` in the sync loop once CR-04's guard exists, or amend the comment in `validate.ts:110-116`.

### IN-06: `check-actor-field.mjs`'s RHS banlist for `account_id` is evadable by renaming the body variable

**File:** `scripts/check-actor-field.mjs:262-266`
**Issue:** `const b = await request.json(); … account_id: b.account_id` contains none of `body|payload|request|raw|searchParams` and passes. Low impact today because only the writer constructs records, but the check claims more than it enforces.
**Fix:** for the two record-constructing modules, allowlist the exact `PERMITTED_RHS` forms instead of banning tokens.

### IN-07: One key signs two HMAC domains without a domain-separation prefix

**File:** `lib/session/cookie.ts:47-49`, `lib/proposals/derive.ts:179-183`
**Issue:** The inputs are disjoint today (base64url alphabet vs. a NUL-joined triple), so no cross-domain confusion is possible, but the property rests on an alphabet accident.
**Fix:** prefix each domain (`"cap_session\0"`, `"proposal\0"`) so the separation is explicit.

### IN-08: The sync byte ceiling is enforced only after the whole body has been buffered

**File:** `app/api/sync/route.ts:48-54`, `:81`
**Issue:** `request.text()` reads everything before the 3 MiB check; on Vercel the platform's request limit bounds it, under `next start` nothing does.
**Fix:** refuse `413 batch_too_large` from `content-length` before reading, keeping the raw-byte measurement as the authoritative second check.

### IN-09: Route-suite coverage gaps that would have caught CR-01, CR-02 and CR-03

**File:** `scripts/server/route-suite.proof.mjs`
**Issue:** Not exercised: `DELETE /api/session`, `GET /api/session`, `HEAD /api/health`, an online `duplicate` replay on any write route, a refused-then-retried item, `bad_request`, `batch_too_large`, `media_too_large`/`bad_shape` over the wire, and a queued item older than the floor slack.
**Fix:** add one test per gap; the D-04 test should also assert `opened_at` against the claim (see CR-02).

---

_Reviewed: 2026-09-21T13:06:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
