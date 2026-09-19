# Single-writer non-bypassability — every route, the writer, the accessor and every configuration value enumerated (AD-19, FR-24, FR-57)

Dated enumeration, not an argument. Names the one writer, the one accessor,
every route this phase ships, every `process.env` name this phase's server
code reads, and the fixture modules that stand in for a feature flag or a
build mode — for each, the record states it can produce and the one
sentence that matters: that it produces no finding.

## Scope

AD-19 asks for one thing: no type, no record state, no route and no
configuration value produces a finding — the evidence for that is not an
inspection but an enumeration of every interface and every configuration
value, produced by the same command that gates the build (AD-15) and
shipped with the handover. This document is that enumeration for Phase 3's
server seam: the twelve routes under `app/api/**`, the one function that
writes to the store, the one function that decides authorisation, and every
`process.env` name this phase's server code reads. Plan 03-15's
`scripts/check-non-bypassability.mjs` asserts every route path, every
configuration name and every store-writing module found by a source sweep
is named somewhere below, by string, and fails the build the moment one is
added to the repository without also being added here.

What this document cannot do is stated here rather than left as an
implication: it is a written enumeration checked for *completeness* — that
every name is present — by that build rule. It does not and cannot prove
that the sentence beside each name is *true*. That is a different kind of
claim, and it is carried by the tests cited under each entry below and by a
reviewer's own reading, not by this document's own existence.

## The single writer

`lib/reconcile/apply.ts` exports `applyItem(sessionResult, item)` and is
the only module in the repository that imports `lib/store/memory.ts`'s ten
mutating exports — `writeCapture`, `writeProposals`, `writeDecision`,
`writeClockSegment`, `closeClockSegment`, `writeSeen`, `writeAttempt`,
`stampLastContact`, `recordEviction` and `sweep`. Its own header comment
states the order this document restates rather than paraphrases: "session
-> ownership -> idempotency -> shape -> state." Every step returns
immediately on refusal, and every path — success and failure alike —
writes a retained `AttemptEntry` through the module's one `finalize()`
choke point before it returns control to the caller. A refusal at the
session step (no acting account resolved) is finalized with `account:
null` rather than skipped, so FR-60's retained-attempt guarantee holds even
for the one case with no account to attribute the attempt to. A refusal is
never a thrown exception that escapes this function and never a response
some other module constructs on this function's behalf: every one of the
twelve routes below either calls `applyItem` exactly once per request (or,
for `/api/sync`, once per item in a batch) or calls no writer at all.

`scripts/check-single-writer.mjs` is the build rule that holds this claim,
not this paragraph's own prose. It walks the import graph from every file
under `app/` and `lib/` and asserts, first, that no file other than
`apply.ts` imports one of the ten mutating exports named above directly;
second, that no file under `app/api` reaches one of them transitively
through an intermediate helper, treating `apply.ts` itself as a permitted
sink that the walk never expands past (every route legitimately imports
it); and third, that no file other than `lib/http/respond.ts` references
`NextResponse` or calls `new Response(`. Its own header comment states the
limitation this document repeats rather than hides: the specifier
extraction it performs is a regex over source text, not a parser, so a
dynamic `import()` built from a runtime string is outside what it can see.
No such call exists in this repository today — the check proves nothing
about a future one until that future line is written and swept.

## The single accessor

`lib/access/scope.ts` is the only place authorisation is decided:
`ordersFor(account)`, `orderOwned(account, orderId)`, `assetInOrder(order,
assetId)` and `assetsForOrder(order)`. Every one of the first three takes
the session-derived account as a non-optional first argument — there is no
call shape in which the account is forgotten, and no call shape in which a
request body, a query parameter or a header stands in for it.
`orderOwned` resolves ownership before existence: an id outside the
account's own assigned set (`ORDER_IDS_BY_ARTISAN`) returns `null` before
`ORDER_BY_ID` is ever consulted, so an unowned order and a fabricated order
id take the identical early return, through the identical call site. No
line in this module, and no route in this phase, reads
`Artisan.rbac_tier` to decide anything: the field exists so a surface can
display which tier a person holds, and it is read by nothing that decides
access (FR-57).

No `proxy.ts` and no `middleware.ts` exist anywhere in this repository.
`scripts/check-structure.mjs`'s forbidden-file assertion
(`FORBIDDEN_NAMES = ["proxy.ts", "proxy.js", "middleware.ts",
"middleware.js"]`) fails the build the moment either is added, so AD-2's
"no second seam" rule does not rest on discipline alone. `scripts/check-
actor-field.mjs`'s fourth assertion is this claim's other half: it sweeps
`app/api` and `lib` for any consultation of `rbac_tier` outside a comment,
and asserts that no module other than `lib/access/scope.ts` itself imports
`ORDER_IDS_BY_ARTISAN` — the one table a second, competing authorisation
decision could be built from.

## Routes

One subsection per route file this phase ships, named by its exact path.
For each: the methods it exports; what it reads from the request; which
writer call it makes, if any; the record states it can produce, drawn from
the closed set `{open, accepted, rejected, superseded}`; and the sentence
that matters most.

### app/api/health/route.ts

`GET` and `HEAD`. Neither handler reads the session cookie, derives an
account, or accepts any request field of any kind — each calls the
framework's own `connection()` as its first statement (so `boot_id` and
`uptime_s` cannot freeze into the build's static snapshot) and then returns
the store's own `BOOT_ID`, `uptimeSeconds()` and `storeStats()`. Neither
handler calls `applyItem` or any store mutator. This route writes nothing
and reads no session, plainly — there is no writer call here to produce a
proposal state or a finding from, and none is produced.

### app/api/session/route.ts

`POST`, `GET`, `DELETE`. `POST` reads the request body, picks it down to
`persona_id` alone through `ACCEPTED_BODY_FIELDS.session`, resolves it
against `ARTISAN_BY_ID`, and mints a session — it calls no writer, because
a session is a signed, stateless value verified on read, not a stored
record `applyItem` produces. `GET` reads the `cap_session` cookie via
`readSession`, derives the account, and returns it — no writer call.
`DELETE` reads nothing beyond its own request object and clears the cookie
unconditionally; by D-08's own rule it never touches a clock segment. None
of the three handlers calls `applyItem`: this route produces no proposal
state, no order state and no finding.

### app/api/orders/route.ts

`GET` only. Reads the session cookie and nothing else — never the request
URL's query string, never a body (it is a `GET`), never any header beyond
the one the session accessor reads for itself. Calls `ordersFor(account)`
and `readClocksForAccount`, both read-only, and no writer. Produces no
record state of any kind and no finding.

### app/api/orders/[id]/route.ts

`GET` only. Reads the session cookie and the awaited dynamic segment
(`context.params`). Calls `orderOwned` as its one authorisation decision —
an unowned id and a fabricated id resolve through the identical
`notFound()` call site — and, on success, only read-only store accessors
(`readClock`, `readCaptures`, `readProposalsForAsset`, `readDecisions`)
plus the pure `authoredMatch()` function to reconstruct verifications
already recorded elsewhere. It calls no writer. Produces no record state
and no finding: everything in its response already existed before this
request arrived.

### app/api/orders/[id]/open/route.ts

`POST`. Reads the session cookie, the awaited dynamic segment, and the
body picked down to `client_id` alone through
`ACCEPTED_BODY_FIELDS.orders_open` — every other field on the `SyncItem`
it builds (`kind`, `schema_version`, `order_id`, `created_at`, `attempts`,
`state`, `claimed_account_id`, an empty payload) is server-derived or a
fixed enumerated value, never read from the body. Ownership is decided
before the body is even parsed. Calls `applyItem` — the one writer —
exactly once. The only record it can produce is an `OrderClock` segment
(a second open of a running order is idempotent and produces no second
segment at all). A clock segment is not a proposal and carries no member of
`{open, accepted, rejected, superseded}`; this route produces no proposal
of any state and no finding.

### app/api/orders/[id]/close/route.ts

Identical shape to `open`, for `order_close`. Ownership decided before the
body is parsed; calls `applyItem` exactly once. Produces or amends a clock
segment only — the closed-or-never-opened case is a stated conflict
(`not_open`), never a fifth proposal state. No finding.

### app/api/hours/route.ts

`GET` reads the session cookie and nothing else — no query parameter and
no body of any kind — and returns `readClocksForAccount(account.account_id)`
in full, withholding nothing (FR-58). It calls no writer: accrued time is a
sum computed fresh from segments the writer already stamped, never a
second write. `POST` is a hand-written refusal, `fail("method_not_
allowed")`: it reads no session and accepts no field at all, and exists
solely so the 405 it returns carries this project's universal headers
(`Cache-Control: no-store`, `X-CAP-Store`, `X-CAP-Instance`) rather than
Next's own framework-level 405, which would carry none of them. Neither
handler calls `applyItem`; neither produces a record state or a finding.

### app/api/verify/route.ts

`POST`. Reads the session cookie and the body picked down to
`ACCEPTED_BODY_FIELDS.verify`'s eleven fields (`client_id`, `order_id`,
`asset_id`, `kind`, `purpose`, `captured_at`, `sha256`, `bytes`, `mime`,
`duration_ms`, `thumb`); `purpose` is then forced to the literal `"verify"`
regardless of what the body's own field said. Ownership is decided before
the capture's own shape is checked. Calls `applyItem` exactly once — the
only place `lib/verify/authored.ts` and `lib/proposals/derive.ts` are ever
reached, since this route imports neither directly. The records it can
produce are a `Capture` and, for a matched asset, `Proposal`s created in
state `open` — never any other member of the closed set on creation, and
never a finding: an authored proposal is inferred content plus a
re-derived identity (AD-5, AD-8), not an assertion the server itself makes
about the world.

### app/api/captures/route.ts

Identical shape to `verify`, forcing `purpose` to the literal `"evidence"`
instead. Ownership decided before shape. Calls `applyItem` exactly once.
Produces a `Capture` only — an evidence capture answers no verification and
derives no proposal at all, so it cannot reach a proposal state, let alone
a finding.

### app/api/decisions/route.ts

`POST`. Reads the session cookie and the body picked down to
`ACCEPTED_BODY_FIELDS.decisions`'s eight fields. Unlike every other write
route, this route makes no `orderOwned` call at all: a decision's
authorisation is the proposal id's own re-derived HMAC digest (AD-5),
checked inside `applyItem` at the ownership position, so `order_id` on the
`SyncItem` this route builds is the literal empty string by design, never a
lookup this route performs. Calls `applyItem` exactly once. The only state
it can produce is an existing `Proposal` moving to `accepted` or `rejected`
— both members of the closed set — and a `Decision` recording that
transition. A decision records what an already-authored proposal became;
it asserts nothing new, and it produces no finding.

### app/api/sync/route.ts

`POST`. Reads the session cookie once, at the envelope level (never
per item), and the raw request body text — measured for the D-02 byte
ceiling before it is parsed — picked down to `items` alone through
`ACCEPTED_BODY_FIELDS.sync`. Calls `applyItem` once per item in the batch,
in arrival order, with no early exit: every item, refused or recorded,
produces a `SyncItemResult` in the response, because a batch is not a
transaction. This route imports no store module of its own and constructs
no response of its own. Every state any item in the batch can reach is
exactly the same set `applyItem`'s other four callers can reach — a clock
segment, a `Capture`, a `Proposal` in `open`, `accepted` or `rejected`, a
`Decision` — because it is the identical function deciding it. There is no
sixth writer hiding behind this route's loop, and no finding reachable here
that the other five write routes above do not already share.

### app/api/walk/[orderId]/route.ts

`GET` only. Reads the session cookie and the awaited dynamic segment.
Calls `orderOwned` as its one authorisation decision and, on success, the
one assembler `buildWalkPayload` — a pure function over already-recorded
store state and the fixture set, calling no writer of its own. The payload
it returns partitions existing proposals into `candidate_facts`,
`rejected` and `open` by each proposal's own already-recorded `state`; it
creates none of them and changes none of them. It reads and reports; it
produces no record state and no finding.

## Configuration

One subsection per `process.env` name this phase's server code reads under
`app/`, `lib/` and `next.config.ts` — confirmed by `grep -rn
"process\.env\." app lib next.config.ts` immediately before this document
was written, not assumed from any earlier plan text. The five names found
match exactly what CONTEXT.md's own D-12 decision anticipated: no
reconciliation is recorded because none was needed.

### VERCEL_GIT_COMMIT_SHA

Read by `next.config.ts`, first in the three-way `??` chain that resolves
`buildId`. Vercel sets this automatically on every deployment. When
present, it becomes `NEXT_PUBLIC_BUILD_ID` — an identifier baked into the
client bundle — and satisfies the gate that fails config load when no build
id resolves under `NODE_ENV=production` (D-03). Its value changes which
string labels a build. It changes no route's behaviour, no authorisation
decision and no record state, and it produces no finding.

### VERCEL_DEPLOYMENT_ID

Read by `next.config.ts`, second in the same chain, tried only when
`VERCEL_GIT_COMMIT_SHA` is absent. Same effect as above: labels the build,
decides nothing about what any route does, produces no finding.

### CAPTURE_BUILD_ID

Read by `next.config.ts`, the final fallback in the chain, explicitly set
wherever neither Vercel-provided variable is present —
`scripts/verify.mjs` resolves it from `git rev-parse --short HEAD` for a
local or CI build, and `scripts/server/route-suite.proof.mjs` performs the
identical resolution in the child process it spawns for `next start`,
mirroring the build step's own gate for the same reason (`next start`
reloads `next.config.ts` exactly as `next build` does — reproduced directly
against this repository). Same effect as the two variables above: a label,
not a switch. No route reads this variable directly; no authorisation, no
writer step and no proposal state is conditioned on its value.

### NODE_ENV

Read in three independent places: `next.config.ts` (whether an unresolved
build id fails config load at all — the gate applies only "in
production"), `lib/session/key.ts` (whether the session-signing key
resolver may fall back to its committed development value, or must throw
when `CAPTURE_SESSION_KEY` is absent or shorter than sixteen characters),
and `lib/session/cookie.ts` (whether the session cookie's `Secure`
attribute is set). None of these three reads changes which routes exist,
what a route accepts, who is authorised, or which record state a write can
reach — they change whether the server refuses to start without a real
secret, and whether a cookie is marked `Secure`, never what the one writer
is capable of producing once the server has started. No finding is
reachable through any of the three reads.

### CAPTURE_SESSION_KEY

Read by `lib/session/key.ts`'s `signingKey()`, the one resolver both
`lib/session/cookie.ts` (the session cookie's HMAC) and
`lib/proposals/derive.ts` (AD-5's proposal-id HMAC) sign under — one
resolver so there are not two subtly different keys. Its value changes
whether a session or a proposal id verifies; it is a secret, not a mode
switch, and a missing or short value under `NODE_ENV=production` throws
rather than serving with a weak or absent key. It does not add a route,
does not change what a route accepts, does not relax an authorisation
decision, and does not enable a fifth record state.

### The fixture set is not a runtime switch

There is no feature flag, no build mode and no fixture-selection variable
anywhere in this project's server code — the `grep` this section opened
with found exactly the five names above and no others, and this sentence
records that absence rather than describing a control that does not exist.
The fixture set is `lib/data/fixtures.ts`'s `FIXTURE_VERSION` and
`FIXTURE_CONTENT_SHA256`, two literals compiled into the build and pinned
against the four fixture files' own content (`lib/data/plant.ts`,
`lib/data/artisans.ts`, `lib/data/orders.ts`, `lib/data/observations.ts`)
by `scripts/check-fixture-hash.mjs`; no environment variable selects a
different fixture set, in this build or any other. `lib/data/register.ts`
is the tag-to-asset resolution table a referral will resolve against
(AD-7, D-16): it is marked `import "server-only"`, it is imported by
nothing this phase ships — confirmed directly, not assumed: no file under
`app/` or `lib/` other than `register.ts` itself names it — and
`scripts/check-register-isolation.mjs` independently sweeps the built
client bundle for its own sentinel string, so that isolation is held
structurally rather than by discipline alone. It is P9's; this phase ships
the table only, and nothing that reads it.

## What a reviewer can run

`npm run verify` — the full build gate, twenty-five steps including
`route-suite` (the automated half of this proof: a `node:test` file that
starts a locally built production server and runs the curl A–H checks plus
five negative test sets over `fetch`) and the fixture and unit suites the
rest of this enumeration's own claims depend on. A clean exit proves every
build-time check this document names held on the commit that produced it.

`scripts/curl-suite.sh`, with a `B=` base URL set to a real deployment —
the reviewer-facing half of the identical eight checks, run by hand with
plain `curl` and nothing else installed. A clean run proves the same
behaviour holds over the network, against the deployed platform, not only
against a server started locally inside the build gate. Plan 03-16 records
its run against a real deployment — the deployment URL, the build id and
the date — in this directory, beside this document.

## Open items

**Does a real Vercel deployment add a response header this document's
byte-identity comparator does not already exclude?**
`scripts/server/route-assertions.mjs`'s `HEADER_EXCLUSIONS` list
anticipates the `x-vercel-*` family and a possible platform `etag`,
matching ordinary documented Vercel behaviour, but this was not
independently verified against a live deployment during this phase's own
research (03-RESEARCH.md Pitfall 3, Assumptions Log A2). If a real
deployment adds a header this list does not name, the locally-run route
suite's byte-identity proof would not carry over unchanged to the real
platform. `scripts/curl-suite.sh`'s recorded run against a real deployment
(plan 03-16) is the artefact that answers this.

**Does Vercel Fluid Compute share one Node.js module scope across
*concurrent* invocations on the same instance, the way AD-10's "per
instance" memory store depends on — or only across sequential warm
invocations?** Logged in 03-RESEARCH.md's Assumptions Log as A1: if
concurrent invocations on one instance somehow received isolated module
scopes, `lib/store/memory.ts`'s in-memory `Map`s would silently fragment
under real concurrent traffic, while curl check H's "X-CAP-Instance
constant across calls" would still pass, since both concurrent requests
would report the same boot id regardless. Nothing in this phase's curl
suite or route suite currently exercises concurrent requests against a
live instance, so nothing in either would catch that failure mode. A
live-deployment concurrency smoke test would close this; none is yet
scheduled to a plan.

---

Recorded 2026-09-19.
