---
phase: 03-server-seam
fixed_at: 2026-09-21T20:14:48Z
review_path: .planning/phases/03-server-seam/03-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
gate: pass
gate_steps: 26
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-09-21T20:14:48Z
**Source review:** `.planning/phases/03-server-seam/03-REVIEW.md`
**Iteration:** 1

**Summary:**

- Findings in scope: 13 (CR-01 to CR-04, WR-01 to WR-09)
- Fixed: 13
- Skipped: 0
- Out of scope, untouched: the 9 Info findings (IN-01 to IN-09)

Every in-scope finding was fixed and committed on its own, thirteen
commits in all, and `npm run verify` was run once at the end and exited
0 at all 26 steps. Four of the fixes are narrower than the review's own
suggested fix, each for a reason recorded below rather than silently;
they are listed under **Narrowings** and none of them is a silent
widening of a build rule.

## Fixed Issues

### CR-01: Refused items memoised in `seen` and replayed as `duplicate`

**Files modified:** `lib/reconcile/apply.ts`, `lib/reconcile/apply.test.mjs`
**Commit:** `1091347`
**Applied fix:** `finalize()` wrote a `seen` entry for every terminal
status except `duplicate`, so a `conflict` or `rejected` outcome was
stored and replayed by step 3 as `status: "duplicate", code: null` —
which every online write route renders as a 2xx. It now memoises
`recorded` and nothing else. A second consequence falls out of that: the
`already_recorded_differently` branch no longer reaches `writeSeen` at
all, so a changed replay can no longer clobber the stored hash of a
record that really exists. Two tests added — a refused close retried
after the order is opened is applied rather than replayed, and a changed
replay leaves the recorded item's stored result intact.

### CR-02: `/api/sync` stamped last contact before applying the batch

**Files modified:** `app/api/sync/route.ts`, `scripts/server/route-suite.proof.mjs`
**Commit:** `33414c0`
**Applied fix:** `noteContact(account)` moved from before the loop to
after it. The writer read that same request's timestamp back as
`lastContactMs` for every queued item in the batch, so D-07's clamp floor
was always "now": a queued `order_open` or decision claiming more than
`QUEUED_CLOCK_FLOOR_SLACK_SECONDS` ago was refused `clock_skew`, and a
claim inside the slack was clamped up to the request's own arrival, so
offline time was never credited. The other routes were deliberately left
alone — every item they build is `state: "sending"`, so `arrived_via` is
`"immediate"` and the floor is never consulted. A route-suite case was
added that distinguishes the two orderings: an authenticated request, a
1.5 s gap, then a queued `order_open` claiming 500 ms ago, asserting
`opened_at === device_claimed_opened_at`.

### CR-03: `DELETE /api/session` 500ed on every call

**Files modified:** `lib/http/respond.ts`, `scripts/server/route-suite.proof.mjs`
**Commit:** `b91512d`
**Applied fix:** `ok()` now builds 204, 205 and 304 as
`new NextResponse(null, { status, headers })`. `NextResponse.json(null,
{ status: 204 })` is `Response.json` underneath and throws
`Invalid response status code 204` out of the Response constructor, so
the handler never returned, Next served its own 500 with none of the
universal headers and no `Set-Cookie`, and the credential stayed on the
client with nothing in this project able to clear it. The construction
still happens inside the one module AD-11 permits. Route-suite coverage
added: 204, empty body, universal headers present, no success-only
header, a `Set-Cookie` clearing `cap_session` with `Max-Age=0`, and a
following `GET /api/session` that is 401 `no_session`.

### CR-04: The writer threw before `finalize()` for an unshaped envelope

**Files modified:** `lib/reconcile/apply.ts`, `lib/reconcile/validate.ts`, `lib/reconcile/apply.test.mjs`
**Commit:** `a9e2077`
**Applied fix:** AD-1's order is kept and steps 1-3 are made total
instead — hoisting the envelope check above ownership would turn an
unowned-order-plus-bad-field into `bad_shape`, which AD-4 forbids.
`finalize()` coerces `order_id` before measuring it; step 2 owns through
`asString(item.order_id)`, so a missing order id gets the same
`order_not_found` a fabricated one gets; `idempotencyHash()` projects
through `ACCEPTED_PAYLOAD_FIELDS[kind] ?? []`, so an unknown kind reaches
step 4 and is refused `unknown_kind` by name. Both cases added to
`apply.test.mjs`, each asserting the retained attempt (FR-60).

### WR-01: The idempotency hash omitted the envelope

**Files modified:** `lib/reconcile/validate.ts`, `lib/reconcile/apply.ts`, `lib/reconcile/validate.test.mjs`, `lib/reconcile/apply.test.mjs`
**Commit:** `af2cd6c`
**Applied fix:** `idempotencyHash` takes the envelope as a third
argument and the digest covers `kind`, `order_id`, `schema_version` and
the projected payload. The envelope parameter is typed loosely and
normalised inside the function for the same reason the `?? []` fallback
exists: AD-1 runs idempotency before shape. Four tests added — a changed
kind, order id and schema version each change the digest; an unproved
envelope never throws; a `client_id` reused across two kinds conflicts
with nothing closing behind the refusal; and one reused against a second
order leaves that order's clock untouched.

### WR-02: `CLOCK_SEGMENTS_PER_ACCOUNT_MAX` bounded order clocks, not segments

**Files modified:** `lib/store/memory.ts`, `lib/store/memory.test.mjs`
**Commit:** `93d2c64`
**Applied fix:** `globalObjectCount()` now sums segments rather than
counting one per clock, matching what `storeStats()` already reports, and
`writeClockSegment()` enforces the segment cap explicitly, evicting
oldest-*closed*-first and never a running segment. Test added: many
open/close cycles on one order stay at the cap and the running segment
survives as the most recent. See **Narrowings** for the refuse-versus-
evict decision.

### WR-03: `mime` and `note` had no ceiling, and no online route bounded its body

**Files modified:** `lib/limits/index.ts`, `lib/limits/index.test.mjs`, `lib/reconcile/validate.ts`, `lib/reconcile/validate.test.mjs`, `app/api/captures/route.ts`, `app/api/verify/route.ts`
**Commit:** `8312e93`
**Applied fix:** `MIME_MAX_CHARS` (255) and `NOTE_MAX_CHARS` (2000) join
`lib/limits`. The capture validator checks the mime's length before the
allowlist — the allowlist matches only the part before `;`, so everything
after the semicolon passed unexamined and was stored verbatim — and
refuses `bad_shape`; the decision validator refuses `media_too_large` for
an over-long note. `/api/verify` and `/api/captures` read the raw wire
text once and measure it against a new
`CAPTURE_BODY_MAX_ENCODED_BYTES` (96 KB) before parsing, the same idiom
`/api/sync` already uses for D-02. See **Narrowings** for the four routes
left unbounded.

### WR-04: Every `clock_skew` refusal named a fabricated "3 h 12 m"

**Files modified:** `lib/copy/conflicts.ts`
**Commit:** `3dd5bfe`
**Applied fix:** The figure is dropped; the sentence is now "This
phone's clock disagrees with the server. Check the phone's time and
decide again." The seed's illustrative number shipped as the one sentence
for the code and was returned whether the measured offset was 61 seconds
or a day. Nothing else in the repository asserted the old literal —
`check-governed` and `claims-audit` both still exit 0.

### WR-05: The three import sweeps could not see `import * as` or `export … from`

**Files modified:** `scripts/check-single-writer.mjs`, `scripts/check-actor-field.mjs`, `scripts/check-non-bypassability.mjs`, `scripts/check-single-writer.test.mjs`, `scripts/check-actor-field.test.mjs`
**Commit:** `9bf8be4`
**Applied fix:** `extractNamedImports` required a `{ … }` list, so all
three sweeps matched exactly one import shape and the invariant the whole
phase rests on was bypassable by an ordinary one. `extractImportEdges`
replaces it in all three, returning `{ names, specifier, namespace }`: a
namespace edge to `lib/store/memory.ts` is a violation on its own,
directly and transitively, because it reaches every mutating export at
once; a namespace edge to `lib/data/artisans.ts` violates FR-57 for the
same reason; and `export … from` is now an edge, so a re-export is walked
like any other hop with renamed names normalised to the real ones.
`check-actor-field`'s importer sweep resolves before testing names rather
than after, which is what lets it see an edge that names nothing. Five
fixtures added, one per newly-caught form. Nothing under `app/` or `lib/`
uses either shape today, so the real repository still exits 0 on all
three.

### WR-06: `HEADER_TABLE`'s `routes` was wrong for `X-CAP-Account` and unverified

**Files modified:** `lib/http/contract.ts`, `lib/http/contract.test.mjs`
**Commit:** `799bc84`
**Applied fix:** The entry now reads `routes: ["*"]` with a reason that
says why success-only matters here rather than why it does not — it was
listed against `POST /api/session` alone while ten routes emit it, with
the rationale "this route has no ownership check to leak around", which
is false for most of them. `contract.test.mjs` gains the check that would
have caught the drift: for every `route.ts` under `app/api`, every
`X-CAP-*` literal outside a comment must be in `HEADER_TABLE` and that
entry's `routes` must be `["*"]` or name the emitting path. Confirmed
load-bearing by temporarily restoring the old value, which fails with
`/api/captures emits "X-CAP-Account", but that entry's routes are
["POST /api/session"]`. The method is deliberately not compared: a file
may export several handlers and emit a header from only one, which a text
sweep cannot tell apart.

### WR-07: `curl-suite.sh` fell through to its fixed 12-UUID pool on Git Bash

**Files modified:** `scripts/curl-suite.sh`
**Commit:** `632991b`
**Applied fix:** `/dev/urandom` via `od` joins the chain as the third
option, ahead of the pool. All four sources were probed directly on this
workstation's Git Bash: no `uuidgen`, no `/proc/sys/kernel/random/uuid`,
`/dev/urandom` readable, `od` present — the review's premise confirmed.
Sixteen random bytes are laid out as v4/variant-1 with the variant nibble
derived by `(n & 3) | 8`, so the result is byte for byte the shape
`isUuidShaped()` accepts; six consecutive calls through the shipped
function returned six distinct ids all matching that regex.
`$UUID_SOURCE` is resolved once and printed in the banner so a recorded
run says which source fired, and the pool now names itself with a warning
explaining why a run on it is not reproducible. The file keeps LF-only
endings under its scoped `.gitattributes` rule and git mode 100755;
`bash -n` passes and a smoke run against a dead port printed
`UUID source: /dev/urandom` with no pool literal in its output.

### WR-08: `/api/sync`'s catch-all swallowed every exception as `bad_shape`

**Files modified:** `app/api/sync/route.ts`
**Commit:** `6318baf`
**Applied fix:** `UnknownCitedRecordError` is rethrown, so a fixture
citing a record it does not hold surfaces the same way it does on
`/api/verify`, which deliberately propagates it; the unbound `catch {}`
had been reporting that repository defect to the artisan as "a field was
missing or malformed … The field was `kind`." Everything else is still
contained — the batch is not a transaction and one item must never drop
its neighbours — but it is logged with the item's `client_id` and `kind`
instead of vanishing. The catch is also narrower now that CR-04's guards
have landed: what reaches it is the genuinely unforeseen, which is why it
is kept rather than removed.

### WR-09: The online replay path returned `201 {}` when the record was gone

**Files modified:** `app/api/captures/route.ts`, `app/api/verify/route.ts`
**Commit:** `5a35caa`
**Applied fix:** Both capture routes refuse `store_evicted` (409) when
the re-read by client id finds nothing, instead of answering 201 with a
body from which JSON has dropped the undefined key, under an
`X-CAP-Capture` header naming the id or an `X-CAP-Verification: authored`
header and a proposal count. A `seen` entry outlives its capture because
the per-account idempotency cap (500) is larger than the capture cap
(200). See **Narrowings** for the copy caveat and the absent test.

## Narrowings

Four fixes are narrower than the review's suggested fix. Each is a
deliberate stop, not an oversight.

1. **WR-02 evicts rather than refuses.** The review called refusing at
   the cap "the honest option", and it is — but refusing needs a conflict
   code that `lib/data/types.ts`'s closed `ConflictCode` set does not
   carry, and that file holds uncommitted third-party edits tracked as a
   [SECURITY] blocker and was out of bounds this session. What shipped is
   the store's own existing oldest-first eviction idiom, restricted to
   closed segments so a running one is never dropped. The consequence is
   stated in the code: an account past the cap is under-counted on
   `elapsed_s` rather than unbounded. **This is a product decision worth a
   human's confirmation.**

2. **WR-03 bounds two routes' bodies, not six.** Both string ceilings —
   the reproduced harm — are fixed completely. The per-route body ceiling
   went on `/api/verify` and `/api/captures` only, because those are the
   only online routes whose body can legitimately be large (a base64
   thumbnail) and the only ones where an existing refusal sentence is
   true. For `/api/session`, `/api/decisions` and the two order-clock
   routes, neither `media_too_large` ("this photograph is larger than…")
   nor `batch_too_large` ("send fewer items") is true of the body, and a
   third code would be a copy and closed-set change beyond this finding.
   Their bodies are a handful of identifiers, and `note` is now bounded.

3. **WR-09 uses `store_evicted`'s existing sentence.** It reads "The demo
   server's memory store made room and this **proposal** was dropped —
   re-verify the asset", which names a proposal where this case is a
   capture. Making it record-neutral means editing seed-marked copy the
   decision path also uses; the review's own preferred fix — carrying the
   recorded `Capture` on `SyncItemResult.server` so a replay never
   re-reads — needs a field on `lib/data/types.ts`. Both were out of
   bounds. No test was added either: both files import `next/server` and
   so are not unit-testable, and provoking the condition over the wire
   needs more than 200 captures on one account, which would evict the
   records the rest of the route suite reads.

4. **WR-04 drops the figure rather than measuring it.** The review
   offered both. Dropping removes the false claim outright with a
   one-string change; carrying the measured offset through `errorBody()`'s
   per-request `detail` would be better copy and is recorded in the code
   as the next step. The writer already measures the offset and retains it
   as `device_offset_s`.

## Worth a human's eye

These are fixed and tested, but each turns on a judgment a person should
confirm rather than a fact a test can settle:

- **WR-02** — evicting closed segments silently lowers `elapsed_s`. See
  Narrowing 1.
- **WR-03** — `MIME_MAX_CHARS` 255, `NOTE_MAX_CHARS` 2000 and
  `CAPTURE_BODY_MAX_ENCODED_BYTES` 96 KB are all Claude's discretion, not
  values from CONTEXT.md's table.
- **WR-04** — the `clock_skew` sentence now diverges from
  `docs/CAPTURE-PLAN-SEED.md`'s illustrative wording, deliberately.
- **WR-09** — the refusal sentence says "proposal" for a capture. See
  Narrowing 3.
- **CR-02** — "apply, then stamp" was applied to `/api/sync` alone; the
  reasoning that the other routes cannot be affected is in the commit.

## Out of scope

The nine Info findings (IN-01 through IN-09) were left untouched, as the
fix scope directed. IN-03 is now partly stale in this repository's favour:
its two false statements in
`docs/analysis/single-writer-non-bypassability.md` — that no refusal ever
escapes the writer as a throw, and that `DELETE` clears the cookie — have
become true with CR-04 and CR-03, but the document itself was not edited
and still says "twenty-five steps" where `scripts/verify.mjs` has 26.
IN-09's list of route-suite gaps is two shorter: `DELETE /api/session` and
a queued item measured against the floor are both covered now.

## Verification

Run once, at the end, from the isolated worktree against the exact
committed tree:

- `npm run verify` — **exit 0, all 26 steps**, ending "All steps exited 0."
- `fixture-suite`: 307 tests, 307 pass, 0 fail
- `unit-suite`: 178 tests, 178 pass, 0 fail
- `route-suite`: 16 tests, 16 pass, 0 fail (14 before this pass)
- `eslint`: exit 0 — 4 warnings, 0 errors, all four pre-existing at
  `91189e1` (`apply.test.mjs:55` and `validate.test.mjs:167` `_drop`,
  `check-actor-field.mjs:58` and `:77` unused constants)
- `tsc --noEmit`: exit 0

The pre-fix baseline for the same two node suites was 466 tests with 1
skipped; the 19 new tests are the ones listed per finding above.

The captured log lived at `scripts/.check/03-fix-verify.log` inside the
fix worktree and did not survive its removal. It was deliberately not
re-run in the primary checkout, because that tree carries the uncommitted
`lib/data/types.ts` and `scripts/claims-audit.mjs` edits from another
session — the [SECURITY] blocker — and a gate run there would be
verifying a tree nobody has approved rather than the one that landed.

## How this landed

Work was done in a dedicated worktree on `gsd-reviewfix/03-2937`, thirteen
commits, one per finding. `main` was fast-forwarded to `5a35caa` in the
primary checkout, the worktree was removed, the temp branch deleted and
the recovery sentinel dropped. Nothing was pushed. The three out-of-scope
modified files and the user's untracked `docs/` additions are exactly as
they were.

---

_Fixed: 2026-09-21T20:14:48Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
