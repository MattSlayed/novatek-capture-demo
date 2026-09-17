# Phase 3: Server seam - Pattern Map

**Mapped:** 2026-09-17
**Files analyzed:** 47 (12 routes, 11 lib modules, 12 build-rule files, 2 proof artefacts, 2 analysis docs, 3 modified files, 5 lib unit tests)
**Analogs found:** 43 / 47 (4 partial/no-analog, logged in §No Analog Found — RESEARCH.md's Code Examples cover those)

## CRITICAL: one deviation every route analog carries that must NOT be copied

Every route-handler analog in `../ipv-demo/app/api/**/route.ts` exports:
```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```
This project's `next.config.ts` sets `cacheComponents: true` (build-asserted by `scripts/check-structure.mjs`). Under that flag, **both exports are a hard `next build` error** (RESEARCH.md Pitfall 1, empirically reproduced this session). Omit both exports from every `route.ts` in this phase. Every route already reads the session cookie or resolves a dynamic segment except `GET/HEAD /api/health`, which instead calls `await connection()` from `next/server` as its first statement (RESEARCH.md Code Example 4). Copy every other line of the sibling's route shape; do not copy these two lines.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/api/session/route.ts` | route | request-response | `../ipv-demo/app/api/decision/resolve/route.ts` | strong (minus segment-config) |
| `app/api/orders/route.ts` | route | CRUD (read, filtered) | `lib/data/artisans.ts` (`ORDER_IDS_BY_ARTISAN`) + `../ipv-demo/lib/decision/store.ts` (`list()`) | role-match |
| `app/api/orders/[id]/route.ts` | route | request-response | `../ipv-demo/app/api/scene/model/[id]/route.ts` | strong (minus segment-config) |
| `app/api/orders/[id]/open/route.ts` | route | CRUD (state transition) | `../ipv-demo/app/api/decision/resolve/route.ts` | strong |
| `app/api/orders/[id]/close/route.ts` | route | CRUD (state transition) | `../ipv-demo/app/api/decision/resolve/route.ts` | strong |
| `app/api/verify/route.ts` | route | request-response | `../ipv-demo/app/api/decision/propose/route.ts` | strong |
| `app/api/captures/route.ts` | route | CRUD (create) | `../ipv-demo/app/api/decision/propose/route.ts` | strong |
| `app/api/decisions/route.ts` | route | CRUD (state transition) | `../ipv-demo/app/api/decision/resolve/route.ts` | exact (same shape: id + action, STATUS map) |
| `app/api/sync/route.ts` | route | batch/event-driven | `../ipv-demo/app/api/decision/resolve/route.ts` (per-item) + `scripts/verify.mjs` `runSteps` (loop, per-item result, never abort the batch) | role-match |
| `app/api/hours/route.ts` | route | request-response | `../ipv-demo/app/api/decision/resolve/route.ts` (GET half) + RESEARCH.md Pitfall 2 (explicit 405) | role-match |
| `app/api/walk/[orderId]/route.ts` | route | transform/aggregation | `../ipv-demo/app/api/scene/model/[id]/route.ts` (params + ordered checks) + `../ipv-demo/lib/rbac/manifest.ts` `buildManifest()` (payload assembly) | strong |
| `app/api/health/route.ts` | route | request-response | RESEARCH.md Code Example 4 (no repo analog needed — the code is already written) | exact |
| `lib/session/cookie.ts` | utility (auth) | request-response | `../ipv-demo/lib/rbac/manifest.ts` | exact |
| `lib/attribution/index.ts` | utility (transform) | transform | `../ipv-demo/lib/rbac/manifest.ts` `parseTier()` | partial |
| `lib/access/scope.ts` | service (authz) | CRUD | `../ipv-demo/lib/decision/store.ts` `resolve()` ownership check + `lib/data/artisans.ts` `ORDER_IDS_BY_ARTISAN` | strong |
| `lib/store/memory.ts` | model/store | CRUD | `../ipv-demo/lib/decision/store.ts` | exact |
| `lib/reconcile/validate.ts` | utility (validation) | transform | RESEARCH.md Code Example 8 (no in-repo validator exists yet) | partial |
| `lib/reconcile/apply.ts` | service (single writer) | event-driven/CRUD | `../ipv-demo/lib/decision/store.ts` `resolve()` | exact |
| `lib/verify/authored.ts` | service | transform | `lib/data/observations.ts` `OBSERVATIONS_BY_ASSET` | role-match |
| `lib/proposals/derive.ts` | service | transform | `../ipv-demo/lib/rbac/manifest.ts` `signZone`/`signModel` | strong |
| `lib/http/respond.ts` | utility (responder) | request-response | repeated `NextResponse.json(...)` blocks across all sibling routes | strong (pattern to centralize) |
| `lib/walk/payload.ts` | service (aggregator) | transform | `../ipv-demo/lib/rbac/manifest.ts` `buildManifest()` | exact |
| `lib/limits/index.ts` | config | n/a (static exports) | `lib/data/fixtures.ts` | strong |
| `scripts/check-single-writer.mjs` + `.test.mjs` | config/tooling | batch | `scripts/check-register-isolation.mjs` + `.test.mjs` | exact |
| `scripts/check-actor-field.mjs` + `.test.mjs` | config/tooling | batch | `scripts/check-register-isolation.mjs` + `.test.mjs` | exact |
| `scripts/check-fixture-inputs.mjs` + `.test.mjs` | config/tooling | batch | `scripts/check-register-isolation.mjs` + `.test.mjs` | strong |
| `scripts/check-named-packages.mjs` + `.test.mjs` | config/tooling | batch | `scripts/check-governed.mjs` (text sweep) + `scripts/check-headers.mjs` (JSON read) | partial |
| `scripts/check-accepted-fields.mjs` + `.test.mjs` | config/tooling | batch | `scripts/check-headers.mjs` | strong |
| `scripts/check-non-bypassability.mjs` + `.test.mjs` | config/tooling | batch | `scripts/check-structure.mjs` + `.test.mjs` | exact (D-12 names this explicitly) |
| `scripts/server/route-suite.test.mjs` | test | request-response (HTTP) | `scripts/check-wcag.mjs` + `scripts/lib/server.mjs` | strong |
| `scripts/curl-suite.sh` | test script | request-response | `docs/CAPTURE-PLAN-SEED.md` §Verification's embedded bash block (no `.sh` file precedent in `scripts/`) | partial |
| `docs/analysis/single-writer-non-bypassability.md` | doc | n/a | `docs/analysis/deployment-gate.md` | strong |
| `docs/analysis/server-seam-verification.md` (name TBD) | doc | n/a | `docs/analysis/deployment-gate.md` + `docs/analysis/vercel-regions.md` | strong |
| `lib/data/types.ts` (modified) | model/types | n/a | itself (mechanical addition to existing closed sets) | exact |
| `scripts/verify.mjs` (modified) | config | batch | itself | exact |
| `scripts/verify.test.mjs` (modified) | test | n/a | itself | exact |
| `lib/reconcile/apply.test.mjs` | test | n/a | `scripts/check-register-isolation.test.mjs` (runner/assertion style only) | partial |
| `lib/reconcile/validate.test.mjs` | test | n/a | same | partial |
| `lib/access/scope.test.mjs` | test | n/a | same | partial |
| `lib/proposals/derive.test.mjs` | test | n/a | same | partial |
| `lib/verify/authored.test.mjs` | test | n/a | same | partial |

## Pattern Assignments

### Route handlers — shared core shape (all 12 `app/api/**/route.ts` files)

**Analogs:** `../ipv-demo/app/api/decision/resolve/route.ts`, `../ipv-demo/app/api/decision/propose/route.ts`, `../ipv-demo/app/api/scene/model/[id]/route.ts`

**Segment-config — DO NOT COPY** (`resolve/route.ts` lines 29-30, `propose/route.ts` lines 21-22, `model/[id]/route.ts` lines 26-27):
```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```
Every route in this phase omits both. `request.cookies.get("cap_session")` (or a dynamic segment) already forces per-request execution under `cacheComponents: true` (RESEARCH.md Pattern 6).

**Body-parse try/catch** (`resolve/route.ts` lines 42-58):
```typescript
export async function POST(request: Request) {
  let body: { id?: string; nonce?: string; tier?: string; action?: string; ... };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", detail: "Expected a JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  ...
}
```
In this phase, every parse failure and every subsequent refusal routes through `lib/http/respond.ts` instead of a route-local `NextResponse.json` call (AD-11) — the shape of the try/catch transfers, the response construction does not.

**Dynamic segment params, awaited** (`model/[id]/route.ts` lines 29-33):
```typescript
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
```
Type `params` inline as `Promise<{ id: string }>` (or `{ orderId: string }` for the walk route) — RESEARCH.md Pitfall 4 and the seed's own stated preference; do not import a generated `RouteContext` alias, which would create an ordering dependency on `next typegen` this repo's plan does not need.

**Ordered checks before any payload leaves the handler** (`model/[id]/route.ts` lines 39-76 — existence, then signature/session, then authorization, in that order, each returning before the next runs):
```typescript
const model = MODEL_BY_ID.get(id);
if (!model) {
  return NextResponse.json({ error: "not_found", ... }, { status: 404, ... });
}
if (!verifyModelSignature(id, tier, exp, sig)) {
  return NextResponse.json({ error: "invalid_signature", ... }, { status: 403, ... });
}
if (!tierClearsZone(tier, model.zone_id)) {
  return NextResponse.json({ error: "withheld", ... }, { status: 403, headers: { ..., "X-IPV-Withheld": ... } });
}
```
This phase's routes replace this three-step order with AD-1's fixed order — session → ownership → idempotency → shape → state — via `lib/reconcile/apply.ts` (for write routes) or `lib/access/scope.ts` directly (for read routes). The structural lesson to copy is: **check, return immediately, never fall through** — never accumulate refusals and pick one at the end.

**Server-side re-derivation, never trust the client's account of its own state** (`propose/route.ts` lines 39-63):
```typescript
const answer = answerQuestion(questionId, tier, question?.frame ?? null);
...
const record = propose({
  tier, question_id: questionId, action: answer.proposal,
  retrieval_chain: answer.retrieval_chain,
  expected_facts: answer.citations.map((c) => c.fact_id),
});
```
Maps directly to AD-5: `lib/proposals/derive.ts` re-derives `Proposal.id` from `(accountId, clientId, observationId)` every time — a decision's `proposal_id` is never looked up by a client-supplied value and trusted, it is recomputed and compared (`timingSafeEqual`).

**Custom error class caught by `instanceof`, everything else rethrown** (`propose/route.ts` lines 72-80):
```typescript
} catch (err) {
  if (err instanceof UnknownQuestionError) {
    return NextResponse.json({ error: "unknown_question", ... }, { status: 400, ... });
  }
  throw err;
}
```
Useful shape for any route wrapping a `lib/verify/authored.ts` or `lib/proposals/derive.ts` call that can throw a named error distinct from a validation refusal.

**Full binary/streamed response with custom headers** (`model/[id]/route.ts` lines 88-96) — analog for nothing in this phase (no route returns binary), included only because it shows the "always through one header-stamping call" discipline `lib/http/respond.ts` centralizes.

---

### `app/api/session/route.ts` (route, request-response)
**Analog:** `../ipv-demo/app/api/decision/resolve/route.ts` for the POST/body-parse shape; `GET`/`DELETE` have no sibling analog (the sibling has no session concept) — compose from RESEARCH.md Code Examples 2 (read) and 3 (mint/clear).
**Core pattern:** `POST` mints via `lib/session/cookie.ts`'s `withSessionCookie`; `GET` reads via `request.cookies.get("cap_session")` and returns the account or `401`; `DELETE` clears via `maxAge: 0` and returns success — cookie mutation happens on the `NextResponse` the responder already built, never via a second `Set-Cookie` write.
**Unknown-persona 404:** goes through the same not-found path `lib/http/respond.ts` uses everywhere else (AD-4) — no route-local 404 body.

### `app/api/orders/route.ts` (route, CRUD read)
**Analog:** `lib/data/artisans.ts`'s `ORDER_IDS_BY_ARTISAN` (lines 64-68) is the fixture-side half of `ordersFor(account)`; `../ipv-demo/lib/decision/store.ts`'s `list()` (lines 290-293, `return [...REGISTER.values()].reverse()`) is the shape for "derive a list view from the store/fixture, never mutate."
**Core pattern:** `lib/access/scope.ts`'s `ordersFor(account)` looks up `ORDER_IDS_BY_ARTISAN[account]`, maps to `ORDER_BY_ID.get(id)` (`lib/data/orders.ts` line 155) — no other route or module performs this lookup (AD-2).

### `app/api/orders/[id]/route.ts` (route, request-response)
**Analog:** `../ipv-demo/app/api/scene/model/[id]/route.ts` (full shape above) — existence check via `lib/access/scope.ts`'s `orderOwned(account, id)` (not the sibling's bare `MODEL_BY_ID.get`), same not-found before any other check.
**Server-only field stripped:** `OrderAsset = Machinery & { observation_ids: string[] }` (`lib/data/types.ts` line 497) — the response for each asset must omit `observation_ids`; strip it in `lib/walk/payload.ts`/the route itself before the responder serializes, not by mutating the fixture.

### `app/api/orders/[id]/open/route.ts` and `app/api/orders/[id]/close/route.ts` (route, CRUD state transition)
**Analog:** `../ipv-demo/app/api/decision/resolve/route.ts`'s STATUS map (lines 32-40) and result-to-status dispatch (lines 80-88):
```typescript
const STATUS: Record<string, number> = {
  not_found: 404, not_yours: 403, already_resolved: 409, tier_mismatch: 403,
  receipt_required: 422, receipt_invalid: 422, signatory_required: 422,
};
...
if (!result.ok) {
  return NextResponse.json({ error: result.code, detail: result.detail },
    { status: STATUS[result.code] ?? 400, headers: { "Cache-Control": "no-store" } });
}
```
This is precisely the shape `lib/reconcile/apply.ts`'s `applyItem` result needs to route through `lib/http/respond.ts`: a discriminated-union result with a `code` the responder maps to a status. **D-06 delta:** open is idempotent (`200 { clock }`, no new segment, not an error) where the sibling's `resolve()` treats a repeat as `already_resolved` (409) — this phase's open/close pair needs a genuine `200` idempotent-success branch the sibling's binary ok/fail shape doesn't have; model it on `resolve()`'s `reject` branch (lines 188-196), which also returns `{ ok: true, record }` for a non-mutating-by-surprise outcome.
**`not_open` (D-06):** closing a closed/never-opened order — same STATUS-map mechanism, new code `not_open` -> `409`.

### `app/api/verify/route.ts` (route, request-response)
**Analog:** `../ipv-demo/app/api/decision/propose/route.ts` in full (server re-derives, never trusts client fields).
**Core pattern:** `lib/verify/authored.ts` declares inputs exactly `(assetId, fixtureSet)` (AD-8) — the capture payload is never passed in, mirroring how `propose/route.ts` never forwards `body`'s own claims into `propose()`, only re-derived values (`answer.proposal`, `answer.retrieval_chain`).
**409 asset_not_in_order:** `lib/access/scope.ts`'s `assetInOrder(order, assetId)` — same ordered-check, return-immediately shape as `model/[id]/route.ts`'s three checks.

### `app/api/captures/route.ts` (route, CRUD create)
**Analog:** `../ipv-demo/app/api/decision/propose/route.ts`'s body-parse + re-derivation shape; the `201` + `X-IPV-Decision` id-in-header pattern (lines 68-71) is the direct analog for this route's success response carrying whatever `X-CAP-*` counter this phase's header table assigns it.
**Accepted-field enumeration (D-10/AD-20):** exactly `{sha256, bytes, mime}` (photo) or `{sha256, bytes, mime, duration_ms}` (voice) — `lib/reconcile/validate.ts` drops anything else at parse, most importantly any actor-shaped field; see `scripts/check-accepted-fields.mjs` below for the build-time proof.

### `app/api/decisions/route.ts` (route, CRUD state transition)
**Analog:** `../ipv-demo/app/api/decision/resolve/route.ts` — exact shape match: an `id` (here, `proposal_id`, HMAC-re-derived per AD-5 rather than looked up), an `action` (`accept`/`reject`), a STATUS map, a stripped-sensitive-field response (lines 90-96, `const { nonce: _nonce, ...safe } = result.record;` — this phase's analog is never echoing anything account-identifying beyond `decided_by`, which is itself server-stamped).
**`unknown_proposal` before state (FR-27):** re-derive-then-compare (AD-5) means an unknown id and an unowned id fail identically at the HMAC-mismatch step, before any state read — same "checked before state" discipline as `../ipv-demo/lib/decision/store.ts` lines 160-171.

### `app/api/sync/route.ts` (route, batch/event-driven)
**Analog:** `../ipv-demo/app/api/decision/resolve/route.ts` for the per-item STATUS/result shape, applied in a loop; `scripts/verify.mjs`'s `runSteps` (lines 164-172) for "iterate a list, collect one outcome per entry" — but inverted: `runSteps` stops at the first failure (fail-fast), while `/api/sync` must **never** stop early — every item gets a `SyncItemResult` and the route returns `200` whenever the envelope itself parsed (D-01). Do not reuse `runSteps`'s early-return; reuse only its "call once per entry, collect a typed result" shape.
**Per-item write path:** every item, including a session-less or ownership-refused one, still calls `lib/reconcile/apply.ts`'s `applyItem` so the refusal is retained (AD-1) — same function online routes use, never a second sync-only writer.
**Counters:** `X-CAP-Sync-{Recorded,Duplicate,Conflict,Rejected}` — tally `SyncItemResult.status` across the loop, stamp once via `lib/http/respond.ts` after the loop completes, never per-item.
**413 batch_too_large:** checked before the loop starts (item count and encoded-byte ceilings from `lib/limits`), analogous to `model/[id]/route.ts`'s "check, then return, never proceed" discipline.

### `app/api/hours/route.ts` (route, request-response)
**Analog:** `../ipv-demo/app/api/decision/resolve/route.ts` for the `GET`-equivalent read shape; RESEARCH.md Pitfall 2 for the explicit `POST` 405.
**GET:** server-derived `elapsed_s` summed from `OrderClock.segments` (`lib/data/types.ts` lines 632-641) — no client input beyond the session cookie and `[id]`/query.
**POST — must be hand-written, not relied on from Next's auto-405** (RESEARCH.md Pitfall 2, verified this session): Next's framework-level 405 carries no `Cache-Control`, no `X-CAP-*`, and a plain-text body — violates NFR-F1. Export:
```typescript
export async function POST() {
  return fail(405, "method_not_allowed", "..."); // through lib/http/respond.ts, not NextResponse.json directly
}
```
No `connection()` call needed on `POST` — Context7-confirmed the static/dynamic caching question only ever applies to `GET`.

### `app/api/walk/[orderId]/route.ts` (route, transform/aggregation)
**Analog:** `../ipv-demo/app/api/scene/model/[id]/route.ts` for params + ordered-checks; `../ipv-demo/lib/rbac/manifest.ts`'s `buildManifest()` (lines 144-202, full function) for payload assembly — see `lib/walk/payload.ts` below, which does the actual aggregation; the route itself is thin (auth, call `buildWalkPayload`, stamp `X-CAP-Walk-Facts`/`X-CAP-Redaction`, respond).

### `app/api/health/route.ts` (route, request-response — special case)
**Analog:** RESEARCH.md Code Example 4 — the code is already written there, verified empirically against this repo this session:
```typescript
import { connection } from "next/server";

export async function GET() {
  await connection(); // MUST be first — forces per-request execution before touching store state
  const stats = storeStats();
  return respondOk({ ok: true, store: "memory", boot_id: BOOT_ID, uptime_s: uptimeSeconds(), counts: stats, ttl_s: TTL_SECONDS });
}

export async function HEAD() {
  await connection();
  return respondOk(null, { status: 200 });
}
```
This is the **one** route with no cookie read and no dynamic segment, so without `await connection()` as the literal first statement it is eligible for build-time static prerendering and `boot_id`/`uptime_s` would freeze forever (curl check H would silently pass against a frozen snapshot). No other route in this phase needs this call.

---

### `lib/session/cookie.ts` (utility, request-response)

**Analog:** `../ipv-demo/lib/rbac/manifest.ts` in full.

**Lazy key resolution, refuse in production** (lines 42-81, adapted in RESEARCH.md Code Example 1):
```typescript
function resolveSigningKey(): string {
  const fromEnv = process.env.CAPTURE_SESSION_KEY; // already set in .env.local for this repo
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CAPTURE_SESSION_KEY is not set. Refusing to start in production without it.");
  }
  return "capture-demo-dev-key-not-for-prod"; // committed dev fallback, per D-CONV
}
let signingKey: string | null = null;
function key(): string {
  if (signingKey === null) signingKey = resolveSigningKey();
  return signingKey;
}
```
Resolved on first use, never at module load — `next build`/`next typegen` import every route module under a production-like `NODE_ENV` (confirmed by this repo's own `next.config.ts` build-id gate, which depends on exactly this behavior). `CAPTURE_SESSION_KEY` is **already present** in this repo's `.env.local` (confirmed this session) — no new env var name to invent.

**HMAC sign + constant-time verify with a length guard** (lines 86-104):
```typescript
export function signZone(zoneId: string, tier: RbacTier, expiresAt: number): string {
  return createHmac("sha256", key()).update(`${zoneId}:${tier}:${expiresAt}`).digest("base64url");
}
export function verifyZoneSignature(zoneId, tier, expiresAt, signature): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false;
  const expected = signZone(zoneId, tier, expiresAt);
  const a = Buffer.from(expected), b = Buffer.from(signature);
  if (a.length !== b.length) return false; // timingSafeEqual throws, does not return false, on mismatched lengths
  return timingSafeEqual(a, b);
}
```
`lib/session/cookie.ts` mints/verifies the `cap_session` value the same way; the length-guard-before-`timingSafeEqual` idiom is load-bearing (RESEARCH.md Anti-Patterns).

**Cookie attribute construction** — use RESEARCH.md Code Example 3 (`response.cookies.set({...})`), not the sibling (which signs URLs, not cookies): `httpOnly: true, sameSite: "lax", maxAge: <from lib/limits>, secure: process.env.NODE_ENV === "production", path: "/"`.

### `lib/attribution/index.ts` (utility, transform)

**Analog (partial):** `../ipv-demo/lib/rbac/manifest.ts`'s `parseTier()` (lines 130-134):
```typescript
export function parseTier(raw: string | null): RbacTier {
  if (raw === "site_supervisor" || raw === "management") return raw;
  return "field_technician";
}
```
Same "parse an untrusted-ish input, fail closed to a known-safe member" shape, but `deriveAccount(session)` differs in one crucial way: `parseTier` has a safe default; `deriveAccount` must have **no** default — an unresolvable session derives no account at all, and every actor field downstream is assigned only from this function's return (AD-3). No repo module currently expresses "derive X or explicitly fail, no default" as cleanly as `parseTier` expresses "derive X or default" — treat this as the shape to invert, not to copy verbatim.

### `lib/access/scope.ts` (service, CRUD/authorization)

**Analog:** `../ipv-demo/lib/decision/store.ts`'s `resolve()`, specifically the ownership-before-state comment and check (lines 160-171):
```typescript
/* Prove the caller is the session that was shown this decision.
   Checked before state, so an attacker enumerating ids cannot use
   the difference between "already resolved" and "not yours" to map
   the register. */
if (!input.nonce || !sameToken(input.nonce, record.nonce)) {
  return { ok: false, code: "not_yours", detail: "..." };
}
if (record.state !== "proposed") {
  return { ok: false, code: "already_resolved", detail: "..." };
}
```
This is the exact AD-2/AD-4 discipline `ordersFor`/`orderOwned`/`assetInOrder` must follow: ownership is decided before any existence/state comparison is even reached, so an unowned id and a fabricated id take the identical code path.
**Fixture-side lookup:** `lib/data/artisans.ts`'s `ORDER_IDS_BY_ARTISAN` (lines 64-68) is what `ordersFor(account)` reads; `lib/data/orders.ts`'s `ORDER_BY_ID` (line 155) is what it maps through. No other module performs this lookup (AD-2 — "the only place a decision is made").

### `lib/store/memory.ts` (model/store, CRUD)

**Analog:** `../ipv-demo/lib/decision/store.ts` in full — this is the single best structural analog in the whole mapping.

**Module-level Map + hard cap + oldest-first eviction** (lines 35, 48, 110-116):
```typescript
const REGISTER = new Map<string, StoredDecision>();
const REGISTER_LIMIT = 200;
...
while (REGISTER.size > REGISTER_LIMIT) {
  const oldest = REGISTER.keys().next();
  if (oldest.done) break;
  REGISTER.delete(oldest.value);
}
```
RESEARCH.md Pattern 5 already names this exact block as the eviction idiom to reuse verbatim for every record kind `lib/store/memory.ts` holds (captures, decisions, clock segments, the `seen` idempotency map). `BOOT_ID` (this project's addition, no sibling equivalent) mints once via `crypto.randomUUID()` at module load, same "module scope, not a service" comment style as lines 1-27's header block.

**Sequential id minting** (lines 76-86, `seq` counter + `padStart`) — a pattern this phase does **not** copy for anything client-visible (AD-5 requires derived, unguessable ids for proposals), but is fine internally if `lib/store/memory.ts` needs any purely-internal sequence.

### `lib/reconcile/validate.ts` (utility, validation)

**Analog (partial — no in-repo validator exists yet):** RESEARCH.md Code Example 8 is the primary source, already written:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
export function isUuidShaped(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && SHA256_HEX_RE.test(value);
}
```
The project's own hand-rolled-regex-no-library ethos is independently confirmed by `scripts/check-governed.mjs`'s field-extraction regexes (e.g. `extractField`, lines 150-154) — same "one small anchored regex per shape, named predicate function" style, different domain (source text vs. request body). No zod/valibot: RESEARCH.md's Don't-Hand-Roll table explicitly rules them out for this project.

### `lib/reconcile/apply.ts` (service, single writer)

**Analog:** `../ipv-demo/lib/decision/store.ts`'s `resolve()` in full (lines 144-288) — the single best analog in this entire phase.

**Fixed check order, refusal as a typed return (never a throw)** (lines 152-186, condensed):
```typescript
const record = REGISTER.get(input.id);
if (!record) return { ok: false, code: "not_found", detail: "..." };
if (!input.nonce || !sameToken(input.nonce, record.nonce)) return { ok: false, code: "not_yours", detail: "..." };
if (record.state !== "proposed") return { ok: false, code: "already_resolved", detail: "..." };
if (record.proposed_tier !== input.tier) return { ok: false, code: "tier_mismatch", detail: "..." };
```
This is AD-1's session → ownership → idempotency → shape → state order in miniature (the sibling has no idempotency or shape step because it has no offline/sync path, but the ordering discipline — each check returns immediately, nothing falls through, every failure is a named code in a discriminated union — transfers exactly). RESEARCH.md's own Pattern 1 pseudocode already adapts this into `applyItem`'s shape.

**Discriminated-union result type** (lines 125-134):
```typescript
export type ResolveFailure =
  | { ok: false; code: "not_found"; detail: string }
  | { ok: false; code: "not_yours"; detail: string }
  | ...;
export type ResolveResult = { ok: true; record: StoredDecision } | ResolveFailure;
```
`SyncItemResult` (`lib/data/types.ts` lines 661-672) is this phase's own version of this shape — `applyItem` should return something that maps onto it directly rather than a parallel type.

**Server derives the evidence, never trusts the client's account of it** (lines 207-266, the receipt-validation block) — the single most load-bearing excerpt for AD-1/AD-3 in the whole sibling: shape check, then consistency check, then provenance re-derivation (`facts_shown: record.expected_facts` — never `receipt.facts_shown`). `lib/reconcile/apply.ts`'s shape → state checks for a `capture`/`decision` item follow the identical three-tier discipline.

**Constant-time token compare with length guard** (lines 136-142):
```typescript
function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}
```

### `lib/verify/authored.ts` (service, transform)

**Analog:** `lib/data/observations.ts`'s `OBSERVATIONS_BY_ASSET` (lines 172-182):
```typescript
export const OBSERVATIONS_BY_ASSET = OBSERVATIONS.reduce((map, observation) => {
  const list = map.get(observation.asset_id) ?? [];
  list.push(observation);
  map.set(observation.asset_id, list);
  return map;
}, new Map<string, AuthoredObservation[]>());
```
Comment above it: "an asset with no authored row is simply absent as a key, never present with an empty array, so a `.get(id)` miss and a genuinely-empty list are never confused" — directly relevant to `authored.ts`'s `outcome: "matched" | "pending"` distinction and `derive.ts`'s empty-proposals-list case for `m-aa101`/`m-aa102`/`m-aa602`/`m-aa605`.
**Declared-inputs discipline (AD-8):** the function signature is exactly `(assetId, fixtureSet)` — no capture payload parameter, enforced at compile time by simply not accepting one, and at build time by `scripts/check-fixture-inputs.mjs`.

### `lib/proposals/derive.ts` (service, transform)

**Analog:** `../ipv-demo/lib/rbac/manifest.ts`'s `signZone`/`signModel` pair (lines 86-128) — RESEARCH.md Pattern 3 has already adapted this exactly:
```typescript
export function deriveProposalId(accountId: string, clientId: string, observationId: string): string {
  return createHmac("sha256", key()).update(`${accountId}\u0000${clientId}\u0000${observationId}`).digest("base64url");
}
export function proposalIdMatches(candidate, accountId, clientId, observationId): boolean {
  const expected = Buffer.from(deriveProposalId(accountId, clientId, observationId));
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```
Note the `\u0000` NUL separator (RESEARCH.md's own note: account ids and client ids are controlled formats here so a plain separator would be safe in practice, but NUL costs nothing and is unambiguous).

### `lib/http/respond.ts` (utility, responder)

**Analog:** the repeated `NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-IPV-*": ... } })` blocks in every sibling route file (e.g. `resolve/route.ts` lines 54-57, 62-68, 80-87, 97-103; `propose/route.ts` lines 29-32, 44-52, 68-71, 74-76) — the pattern this module exists to centralize so it is written exactly once. This project's version always adds `X-CAP-Store`, `X-CAP-Instance` (RESEARCH.md verified this session: a plain `next start` Route Handler response carries no `Cache-Control` of its own, so nothing but this module will ever set it).
**413 exception (AD-11):** the platform-level `413` (body too large before the app sees it) uses `lib/copy/governed.ts`'s `PLATFORM_413` sentence (lines 95-100) — already written, marked `[written here]`, imported never restated; the app-level `413 batch_too_large`/`media_too_large` sentences are new and live beside `lib/limits`/`lib/reconcile`, not in `governed.ts` (D-06's same reasoning: a conflict/reject sentence is not a governed sentence).

### `lib/walk/payload.ts` (service, aggregator)

**Analog:** `../ipv-demo/lib/rbac/manifest.ts`'s `buildManifest()` in full (lines 144-202):
```typescript
export function buildManifest(tier: RbacTier, now = Date.now()): SceneManifest {
  const expiresAt = ...;
  const zones: ManifestZoneEntry[] = [];
  const withheld: SceneManifest["withheld"] = [];
  for (const z of ZONES) {
    if (clears(tier, z.rbac_tier)) { zones.push({ ... }); } else { withheld.push({ ... }); }
  }
  const models: ManifestModelEntry[] = [];
  for (const m of MODELS) { if (!tierClearsZone(tier, m.zone_id)) continue; models.push({ ... }); }
  return { scene_version: SCENE_VERSION, issued_at: ..., viewer_tier: tier, zones, withheld, transmitted_bytes: ..., models };
}
```
Same shape `buildWalkPayload(account, order)` needs: one function assembling one big typed return value (`WalkPayload`, `lib/data/types.ts` lines 679-712) from several fixture/store sources, with a per-entry loop-and-branch for each asset's `verification`/`captures`/`candidate_facts`/`rejected`/`open` — not a component-by-component set of exported helpers. The `statement` field on `WalkPayload.store` and `redaction` resolves through `lib/copy/governed.ts`'s `memoryStore`/`noRedaction` keys (lines 67-71, 61-65) exactly as `VerificationResult.label` does — imported, never restated (`check-governed.mjs` enforces this).

### `lib/limits/index.ts` (config, static exports)

**Analog:** `lib/data/fixtures.ts` in full (43 lines) — a single-purpose module of named constant exports, each with a one-paragraph rationale comment, explicitly stating "no planning document restates a value":
```typescript
export const FIXTURE_VERSION = "capture-fixtures/2026.09.1";
export const FIXTURE_CONTENT_SHA256 = "3a4cdbb9...";
```
`lib/limits/index.ts` follows the identical shape: one `export const` per bounded quantity (thumbnail caps, per-account caps, TTL, cookie `Max-Age`, clock-offset window, `clock_skew` bounds, sync ceilings), each with its own short comment, no grouping object, no computed defaults from environment variables (this file is source-of-truth, not configuration-of-truth).

---

### Build-rule scripts — shared fixture-test pattern (all six new `check-*.mjs` + `.test.mjs` pairs)

**Analog:** `scripts/lib/fixtures.mjs` in full (108 lines) — every new `.test.mjs` imports `withFixture`/`runCheck` from here unchanged:
```javascript
export async function withFixture(files, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "capture-fixture-"));
  try {
    for (const [relPath, contents] of Object.entries(files)) {
      const target = path.join(dir, relPath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents, "utf8");
    }
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export function runCheck(scriptRelPath, opts = {}) { /* spawns process.execPath <script>, no shell, exact exit code */ }
```
Every check script must ship a fixture proving it fails (Phase 1 D-23) — see `scripts/check-register-isolation.test.mjs` lines 34-49 for the canonical shape of one such test (write a throwaway tree, run the check against it via `cwd: dir`, assert `code !== 0` and `assert.match(stdout, /.../)`).

### `scripts/check-single-writer.mjs` + `.test.mjs` (config/tooling, batch)

**Analog:** `scripts/check-register-isolation.mjs` in full (280 lines) — RESEARCH.md Code Example 6 already states this is a verbatim shape reuse:
```
SOURCE_ROOTS = ["app/api", "lib"]   // everywhere a write COULD happen
FORBIDDEN target = every named export from lib/store/memory.ts EXCEPT
  read-only accessors, imported from anywhere other than lib/reconcile/apply.ts
```
Reuse directly: `toPosix`/`toRel` (lines 53-61), `walkSourceFiles` (63-84, missing dir = nothing to check), `loadAliasPrefix` (105-130, tsconfig `@/*` mapping), `extractSpecifiers` (132-144, `from "..."` + bare `import "..."` regex extraction — "not a full parser," stated explicitly), `resolveImport` (146-175), `findViolation`'s BFS transitive walk (177-208, shortest-chain-first, per-root visited set so a cycle terminates). Only `SOURCE_ROOTS`/`FORBIDDEN` change. **What it cannot catch** (state honestly, per this repo's own claims-audit precedent): dynamic `import()` calls and re-exported bindings under a different name — carry the same caveat comment into the new script's header.
**Test file analog:** `scripts/check-register-isolation.test.mjs` lines 29-116 (source-mode: real-repo-exits-0, direct-import fixture, transitive+alias fixture, "no lib/client/" graceful-zero fixture).

### `scripts/check-actor-field.mjs` + `.test.mjs` (config/tooling, batch)

**Analog:** identical to `check-single-writer.mjs` above — same file, same functions, different `FORBIDDEN`: instead of banning imports of a specific file, this bans any assignment to an actor-named field (`captured_by`, `decided_by`, `raised_by`, `account_id`) from anywhere other than `lib/attribution`. This is a source-text assertion closer to `check-governed.mjs`'s regex-based field scan (lines 337-338's `SENTENCE_SHAPE` regex-over-source idea) than a pure import-graph walk — combine both techniques: walk for "does this file import `lib/attribution`," then regex-scan for an actor-field-name assignment not immediately preceded by a call into it.

### `scripts/check-fixture-inputs.mjs` + `.test.mjs` (config/tooling, batch)

**Analog:** `scripts/check-register-isolation.mjs`'s import-graph walk (same functions as above), asserting the reverse direction: `lib/verify/authored.ts` and `lib/proposals/derive.ts` import nothing from `lib/reconcile`, `app/api`, or anything capture-payload-shaped (AD-8). Also asserts a signature shape — closer to `check-structure.mjs`'s source-text assertions (`nextConfigSrc.includes(...)`-style checks) than a pure import walk, since "declares exactly `(assetId, fixtureSet)`" is a text/AST check on the function declaration, not an import-graph fact.

### `scripts/check-named-packages.mjs` + `.test.mjs` (config/tooling, batch)

**Analog (partial):** `scripts/check-headers.mjs`'s JSON-read-then-assert pattern (lines 59-93, `JSON.parse` + type/shape guard before comparison) for reading `package.json`; `scripts/check-governed.mjs`'s whole-tree text sweep (lines 300-324, walk + `readFile` + `includes`) for scanning `package-lock.json` — this script is a hybrid of the two techniques, sweeping `package.json`'s `dependencies`/`devDependencies` keys and (optionally) `package-lock.json`'s package names against a small forbidden list (`zod`, `valibot`, `jsonwebtoken`, `jose`, any NLP/ML package) per RESEARCH.md's Don't-Hand-Roll table. No existing script does exactly this; it is the weakest analog match in this phase.

### `scripts/check-accepted-fields.mjs` + `.test.mjs` (config/tooling, batch)

**Analog:** `scripts/check-headers.mjs` in full — the strongest structural match of the six new rules:
```javascript
const EXPECTED_BLOCKS = [
  { source: "/api/(.*)", headers: { "Cache-Control": "no-store" } },
  ...
];
for (const expected of EXPECTED_BLOCKS) {
  const block = blocks.find((b) => b.source === expected.source);
  if (!block) { problems.push(`missing headers block for source ...`); continue; }
  for (const key of expectedKeys) { /* compare declared vs expected, push a problem per mismatch */ }
  for (const key of declaredKeys) { if (!expectedKeys.includes(key)) problems.push(`unexpected extra header ${key}`); }
}
```
Replace `EXPECTED_BLOCKS`'s `{source, headers}` shape with `{route, fields}` — one entry per write route, each naming its exact accepted-field enumeration from the Topic-9/FR-15/FR-16/FR-61 table in CONTEXT.md/RESEARCH.md. The "declared-but-not-expected is also a problem" loop (lines 138-143) is exactly AD-20's "a field outside the enumeration is dropped at parse and appears nowhere" — reuse that half unchanged.

### `scripts/check-non-bypassability.mjs` + `.test.mjs` (config/tooling, batch) — or an extension of `check-structure.mjs`

**Analog:** `scripts/check-structure.mjs` in full (205 lines) — D-12 names this explicitly ("a new script or an extension of check-structure.mjs, at Claude's discretion"):
```javascript
const FORBIDDEN_NAMES = ["proxy.ts", "proxy.js", "middleware.ts", "middleware.js"];
for (const dir of FORBIDDEN_DIRS) {
  for (const name of FORBIDDEN_NAMES) {
    try { await access(p); problems.push(`${p} exists — ...`); } catch { /* absent, as required */ }
  }
}
```
D-12's rule inverts this "must be absent" check into a "must be present [in the document]" check: walk `app/api/**/route.ts`, every `process.env.<NAME>` read under `app/`/`lib/`/`next.config.ts`, and every store-writing module, then assert each is named (by path or identifier string) somewhere in `docs/analysis/single-writer-non-bypassability.md` — a literal string-membership sweep, matching `check-governed.mjs`'s and `claims-audit.mjs`'s "sweep source as text" precedent (RESEARCH.md Open Question 2's own recommendation). The `--build-output`-style "additive mode, never a substitute" pattern (`check-structure.mjs` lines 133-186) is a good template if this ships as an extension rather than a new file.
**Test file analog:** `scripts/check-structure.test.mjs` lines 26-153 (real-repo-exits-0, one fixture per violation type, each asserting `code !== 0` and a specific `stdout` match).

---

### `scripts/server/route-suite.test.mjs` (test, request-response over HTTP)

**Analogs:** `scripts/check-wcag.mjs` (build-then-start-then-assert-then-teardown shape, lines 241-318) + `scripts/lib/server.mjs` (`startServer`/`stopServer`, both read in full).

**Server lifecycle, adapted per RESEARCH.md Code Example 9** (two deliberate differences from `check-wcag.mjs`: no `next build` of its own — `verify.mjs`'s STEPS already ran `next-build` earlier — and `CAPTURE_SESSION_KEY` must be in `childEnv` since `next start` runs under the same production-like `NODE_ENV` this repo's build-id gate already depends on):
```javascript
import { startServer, stopServer } from "../lib/server.mjs";
const PORT = 4312; // not check-wcag.mjs's 4311
const BASE_URL = `http://127.0.0.1:${PORT}`;
const childEnv = { ...process.env, CAPTURE_SESSION_KEY: process.env.CAPTURE_SESSION_KEY ?? "route-suite-throwaway-key-000000" };
```
**Readiness poll and teardown** (`check-wcag.mjs` lines 271-317):
```javascript
serverProcess = startServer(process.execPath, [NEXT_BIN, "start", "-p", String(PORT)], { cwd: process.cwd(), env: childEnv });
serverProcess.stdout?.on("data", () => {}); // drain so the child never blocks on a full pipe buffer
let ready = false;
const deadline = Date.now() + READY_TIMEOUT_MS;
while (Date.now() < deadline) {
  try { await fetch(`${BASE_URL}/`); ready = true; break; } catch { /* not answering yet */ }
  await new Promise((r) => setTimeout(r, 500));
}
...
} finally {
  await stopServer(serverProcess); // ends the whole process group/tree, never a bare process.kill(pid)
}
```
This phase's readiness probe should poll `GET /api/health` instead of `/` (RESEARCH.md's own recommendation) since that IS the route under test.
**Critical placement gotcha (RESEARCH.md Code Example 9's closing paragraph):** `verify.mjs`'s `fixture-suite` STEP runs `node --test scripts/**/*.test.mjs` **before** `next-build`. If `scripts/server/route-suite.test.mjs` matches that glob, it gets collected and run when `.next` doesn't exist yet and fails for an unrelated reason. Give it its own explicit STEPS entry (`{ command: process.execPath, args: ["--test", "scripts/server/route-suite.test.mjs"] }`) placed after `next-build`, and verify `scripts/verify.test.mjs`'s step-counting assertions (see below) don't double-count it against the `fixture-suite` glob.
**Cookie-jar helper:** `node:test` + `fetch` has no built-in cookie jar (RESEARCH.md Wave 0 Gaps) — write a small manual `Set-Cookie`-capture-then-`Cookie`-header-replay helper; no existing script in this repo needs one, so there is no in-repo analog for this specific piece.

### `scripts/curl-suite.sh` (test script, request-response)

**Analog (partial — no `.sh` precedent in `scripts/`):** `docs/CAPTURE-PLAN-SEED.md` §Verification's embedded bash block (already quoted in full in RESEARCH.md's canonical refs and reproduced above in this document's research excerpt) is the literal starting point — labels A-H, `B=` base-URL variable, `curl -s -c a.jar` cookie-jar pattern. D-10 requires rewriting every body to strict shapes (real 64-hex `sha256`, UUID `client_id`s, `e3b0c442...` as the empty-file SHA-256) while keeping the A-H labels unchanged so the roadmap's success criterion reads one-to-one against the script.

---

### `docs/analysis/single-writer-non-bypassability.md` (doc, n/a)

**Analog:** `docs/analysis/deployment-gate.md` in full (173 lines) — "Dated artefact, not prose" (its own opening line). Structure to copy: `# Title — one-line scope statement` header, `##`-headed sections each stating one fact with its evidence inline (a command run, a log excerpt in a fenced code block, a specific date/commit/id), an "Open items" section for anything not yet closed, a bare `---` + `Recorded <date>.` footer (line 173). D-12's enumeration (every route, every `process.env` read, every store-writer) reads as a `##`-headed list section in this same voice, not a generated table.

### `docs/analysis/server-seam-verification.md` (name TBD — recorded curl-suite run against a deployment)

**Analog:** `docs/analysis/deployment-gate.md` (dated-artefact voice, code-block log citation, e.g. lines 41-47's fenced GitHub Actions log excerpt) + `docs/analysis/vercel-regions.md` (naming the deployment URL/build id/date pattern the prompt calls out explicitly). Record: the deployment URL, the build id, the date, and the curl-suite's own pass/fail output per check A-H, the same way `deployment-gate.md`'s "Automated checks" section (lines 149-158) records `npm run verify`'s exit code and a one-line summary per command.

---

### `lib/data/types.ts` (modified — model/types)

**Analog:** itself. Two additive, mechanical edits, no restructuring:

1. **`not_open` joins `ConflictCode`/`CONFLICT_CODES`** (current lines 367-386):
```typescript
export type ConflictCode =
  | "order_not_found"
  | "order_closed"
  | "asset_not_in_order"
  | "account_mismatch"
  | "proposal_superseded"
  | "already_recorded_differently"
  | "clock_skew"
  | "referral_evidence_missing";        // add "not_open" here (D-06)

export const CONFLICT_CODES: ConflictCode[] = [ /* same seven, plus "not_open" */ ];
```
Follow the exact style already established: string-literal union + a same-order array beside it, never a TypeScript `enum` (file header, lines 30-32, states why — Node 24 strip-only loading rejects one).

2. **`OrderClock.segments` gains the device-claim + measured-offset fields** (current lines 632-641), per RESEARCH.md Open Question 1's recommendation to mirror `Decision.device_offset_s` (line 591) for naming consistency:
```typescript
export interface OrderClock {
  order_id: string;
  account_id: string;
  segments: {
    opened_at: string;
    closed_at: string | null;
    source: "server" | "device_reconciled";
    device_claimed_opened_at?: string;  // new, optional — present only when source: "device_reconciled"
    device_offset_s?: number;           // new, optional — mirrors Decision.device_offset_s
  }[];
  elapsed_s: number;
}
```
Both new fields optional so `source: "server"` segments (every online-path segment) need no change and no existing fixture/type-check breaks — shape is not content, `lib/data/fixtures.ts`'s pinned hash (D-14) is unaffected because `types.ts` is outside the four hashed files (confirmed: `FIXTURE_PATHS` in `scripts/check-fixture-hash.mjs` lines 40-45 lists `plant.ts`, `artisans.ts`, `orders.ts`, `observations.ts` only).

### `scripts/verify.mjs` (modified — config, batch)

**Analog:** itself. `STEPS` (current lines 70-132) is a flat array of `{ id, command, args, shell?, env?, capture?, vercelExcluded? }` objects, resolved in fixed order (D-20), never conditionally reordered.

**Insertion points:**
- Six new source-assertion steps (`check-single-writer`, `check-actor-field`, `check-fixture-inputs`, `check-named-packages`, `check-accepted-fields`, `check-non-bypassability`) join the existing source-side block **before** `next-build` — alongside `check-structure`/`check-register-isolation` (current lines 90-95), same `{ id, command: process.execPath, args: ["scripts/check-X.mjs"] }` shape, no `shell: true` (only the npx-resolved binaries use a shell).
- One new step, `route-suite` (or similar id), joins **after** `next-build` (current line 97-103) and **before** `check-contrast`/`check-wcag-*` (current lines 119-131) — its own explicit non-globbed path per the placement gotcha noted above under `route-suite.test.mjs`, not folded into the existing `fixture-suite` step (current line 87).
- Every new `.mjs` check's own `.test.mjs` fixture file (e.g. `scripts/check-single-writer.test.mjs`) is **automatically** picked up by the existing `fixture-suite` glob (`scripts/**/*.test.mjs`, current line 87) — no STEPS change needed for those six test files, only for the six `.mjs` checks themselves and the one `route-suite.test.mjs` (which must be *excluded* from that glob's effective double-run, per the placement gotcha).

### `scripts/verify.test.mjs` (modified — test)

**Analog:** itself. `EXPECTED_ORDER` (current lines 29-48) is a flat array of step ids asserted with `assert.deepEqual(STEPS.map((s) => s.id), EXPECTED_ORDER)` (line 50-55) — add the six new check ids and the one route-suite id at the exact positions `verify.mjs` inserts them, in the same commit as the `verify.mjs` change (these two files drift apart silently otherwise — there is no build rule that cross-checks them beyond this test itself). Also update: the `"the two check-wcag steps are the last two"` assertion (lines 81-84) still holds (new steps are inserted mid-array, not appended) — reverify it after editing; the `VERCEL=1 excludes exactly the two check-wcag steps` assertion (lines 277-291) asserts `kept.length === 16` — this count must become `16 + (number of new non-excluded steps added)`.

---

### `lib/reconcile/apply.test.mjs`, `lib/reconcile/validate.test.mjs`, `lib/access/scope.test.mjs`, `lib/proposals/derive.test.mjs`, `lib/verify/authored.test.mjs` (test, n/a)

**Analog (partial — no `lib/**/*.test.mjs` file exists anywhere in this repo yet; confirmed via glob):** the project's `node:test` conventions, demonstrated in `scripts/check-register-isolation.test.mjs` and `scripts/verify.test.mjs` (both read in full): `import test from "node:test"; import assert from "node:assert/strict";`, one `test("plain-English description", async () => { ... })` per behavior, `assert.equal`/`assert.deepEqual`/`assert.match` over custom assertion helpers, no `describe` blocks anywhere in this codebase's existing tests (flat `test()` calls only). These five files are the project's **first** unit tests of pure `lib/` logic rather than fixture-driven build-rule scripts — no server, no `withFixture`, no temp directory: call `applyItem`/`validate`/`ordersFor`/`deriveProposalId`/`authored` functions directly with in-memory fixture data and assert on the return value, the way RESEARCH.md's Validation Architecture table describes (`node --test lib/**/*.test.mjs`, "fast, no build, no server"). Package.json's `"test"` script (`node --test "scripts/**/*.test.mjs"`) does **not** currently include `lib/`; either extend that glob or rely solely on `verify.mjs`'s own steps invoking these files directly — flag this gap explicitly to the planner, it is not resolved by any existing analog.

## Shared Patterns

### No `runtime`/`dynamic` route-segment exports (CRITICAL deviation from every route analog)
**Source:** RESEARCH.md Pitfall 1 (empirically verified this session against this exact repo/version)
**Apply to:** All 12 `app/api/**/route.ts` files
Every sibling route exports `export const runtime = "nodejs"; export const dynamic = "force-dynamic";`. Under this repo's `cacheComponents: true` (locked, build-asserted by `scripts/check-structure.mjs`), both are a hard `next build` error. Omit both from every route in this phase; add `await connection()` from `next/server` as the literal first statement in `GET`/`HEAD /api/health` only (the one route with neither a cookie read nor a dynamic segment).

### Lazy HMAC key resolution, refuse in production
**Source:** `../ipv-demo/lib/rbac/manifest.ts` lines 42-81
**Apply to:** `lib/session/cookie.ts`, `lib/proposals/derive.ts` (both need `CAPTURE_SESSION_KEY`)
```typescript
let signingKey: string | null = null;
function key(): string {
  if (signingKey === null) signingKey = resolveSigningKey(); // throws in production if unset, dev fallback otherwise
  return signingKey;
}
```
Resolved on first use, never at module load, because `next build`/`next typegen` import every route module under a production-like `NODE_ENV`.

### Ownership decided before any state comparison
**Source:** `../ipv-demo/lib/decision/store.ts` lines 160-171 (comment + code)
**Apply to:** `lib/access/scope.ts`, `lib/reconcile/apply.ts`, every route handler that takes an id
Every ownership check runs and returns before any existence/state check, so an unowned id and a fabricated id take the identical code path (AD-4's byte-identity, FR-6/FR-27).

### One responder, one header table
**Source:** the repeated `NextResponse.json(..., { status, headers: {...} })` blocks across all three sibling route files
**Apply to:** every route file, via `lib/http/respond.ts` — no route ever calls `NextResponse.json` directly
`Cache-Control: no-store`, `X-CAP-Store`, `X-CAP-Instance` on every response; `{ error, detail }` on every error; route-specific `X-CAP-*` counters added only through this module so a not-found path can never leak one (AD-4/AD-11, proved by `scripts/server/route-suite.test.mjs`'s D-11 comparator).

### Module-level Map store, oldest-first eviction
**Source:** `../ipv-demo/lib/decision/store.ts` lines 35, 48, 110-116
**Apply to:** `lib/store/memory.ts`, every record kind it holds
```javascript
while (MAP.size > LIMIT) {
  const oldest = MAP.keys().next();
  if (oldest.done) break;
  MAP.delete(oldest.value);
}
```

### Build-rule scripts: fixture-proof discipline, never skippable
**Source:** `scripts/lib/fixtures.mjs` (`withFixture`/`runCheck`) + `scripts/check-register-isolation.mjs`/`scripts/check-structure.mjs` (both read in full) + their `.test.mjs` files
**Apply to:** all six new `check-*.mjs` scripts and their `.test.mjs` pairs
Every check fails rather than warns, is not skippable, joins `verify.mjs`'s `STEPS`, and ships with a fixture proving it exits non-zero, built under `os.tmpdir()` via `withFixture` and run via `runCheck` (no shell, exact exit code). A missing directory that legitimately doesn't exist yet is "nothing to check" (exit 0); a missing directory the scan depends on (e.g. `--bundle <dir>`) is a named failure.

### `STEPS` array insertion contract
**Source:** `scripts/verify.mjs` lines 70-172, `scripts/verify.test.mjs` lines 29-55
**Apply to:** `scripts/verify.mjs` and `scripts/verify.test.mjs` together, same commit
New source-assertion checks join before `next-build`; the route suite joins after `next-build` with its own non-globbed STEPS entry (never folded into `fixture-suite`'s glob, which runs before `next-build` and would collect a server-dependent test file too early). `scripts/verify.test.mjs`'s `EXPECTED_ORDER` and step-count assertions must be updated in lockstep — nothing else cross-checks the two files.

### Governed sentences: imported, never restated
**Source:** `lib/copy/governed.ts` + `scripts/check-governed.mjs`
**Apply to:** `lib/walk/payload.ts` (the `statement`/`redaction` fields), `lib/verify/authored.ts` (`VerificationResult.label`)
Both resolve through `GOVERNED[key]` at build/request time; a literal copy anywhere under `app/`, `components/`, or `lib/` fails the build. `not_open`'s sentence (D-06) is explicitly **not** a governed sentence — it lives beside its code, passes the claims audit and the eight voice rules, but is exempt from `check-governed`'s closed-set assertion.

## No Analog Found

Files with no close match in the codebase — RESEARCH.md's own Code Examples/Recommended Project Structure are the primary source for these instead:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/reconcile/validate.ts` | utility | transform | No hand-rolled request-body validator exists anywhere in this repo yet; use RESEARCH.md Code Example 8 verbatim as the starting shape (`UUID_RE`/`SHA256_HEX_RE` + named predicate functions), following `check-governed.mjs`'s regex-per-shape ethos |
| `scripts/check-named-packages.mjs` | config/tooling | batch | No existing script sweeps `package.json`/lockfile for forbidden package names; hybridize `check-headers.mjs`'s JSON-read-and-compare with `check-governed.mjs`'s whole-tree text sweep |
| `scripts/curl-suite.sh` | test script | request-response | First `.sh` file in `scripts/`; every existing proof script is `.mjs`. Starting point is the bash block already embedded in `docs/CAPTURE-PLAN-SEED.md` §Verification (quoted in RESEARCH.md's canonical refs), not a repo script |
| `lib/attribution/index.ts` | utility | transform | Closest sibling function (`parseTier`) has a safe default; `deriveAccount` must fail with no default (AD-3) — the shape to copy is `parseTier`'s "parse untrusted input, narrow to a closed set" structure, inverted to "narrow or fail" |
| `lib/reconcile/apply.test.mjs`, `lib/reconcile/validate.test.mjs`, `lib/access/scope.test.mjs`, `lib/proposals/derive.test.mjs`, `lib/verify/authored.test.mjs` | test | n/a | No `lib/**/*.test.mjs` file exists in this repo yet (confirmed via glob) — these are the project's first pure-function unit tests; reuse `node:test`/`node:assert/strict` conventions from `scripts/*.test.mjs` but with no `withFixture`/temp-directory/server scaffolding, and note `package.json`'s `"test"` script glob does not currently include `lib/` |

## Metadata

**Analog search scope:** `scripts/`, `scripts/lib/`, `lib/data/`, `lib/copy/`, `app/` (this repo); `lib/rbac/`, `lib/decision/`, `app/api/**` (`../ipv-demo` sibling checkout)
**Files scanned:** 26 read in full or in targeted full-file passes (11 in this repo's `scripts/`, 7 in this repo's `lib/`+`app/`, 3 config files (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`), 2 `docs/analysis/*.md`, 3 in the sibling's `lib/`, 3 in the sibling's `app/api/**`); directory listings taken of both repos' full tree
**Pattern extraction date:** 2026-09-17
