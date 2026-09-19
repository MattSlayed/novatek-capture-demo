# Server seam verification — Preview deployment curl suite (D-09b)

Dated artefact, not prose. Records one run of `scripts/curl-suite.sh` against a real
Vercel Preview deployment: the exact command, the deployment identity, the complete
per-check output, the platform's own observed response headers reconciled against
`scripts/server/route-assertions.mjs`'s `HEADER_EXCLUSIONS`, and what this one run does
not prove.

## What was run

`B=https://novatek-capture-demo-4rph6w0fj-matthew-ks-projects-ab449c33.vercel.app bash scripts/curl-suite.sh`,
run 2026-09-19T19:45:07Z to 19:45:26Z, curl 8.14.1, exit 0.

**Who ran it, stated plainly.** Both mechanical steps that produced this record —
running the curl suite above, and capturing the two header blocks in the next section —
were carried out by the orchestrator agent, from a Git Bash shell on Windows, at the
developer's explicit instruction ("run it from this shell"), not typed by a person's own
hands. The developer directed every step (push the work to `dev`, read the Preview URL
and the deployment identity off the Vercel dashboard, confirm the URL answers without a
login page, run the suite) and reported the deployment identity below; the agent executed
the commands and read the results back. This is recorded here without euphemism because
D-09b's and this document's own `T-3-78` threat-register entry describe *a person* running
the checks, and an agent running them at a person's explicit direction is a related but
different claim — the difference is exactly the kind of thing this project's own honesty
surface exists to not blur.

**Preview deployment.** Vercel deployment id `dpl_Bv8xHd9B8kknPQ3jM2thTZ8bivPT` (GitHub
deployment 6544908009, environment Preview), built from `dev`@`2babfd8`
("fix(03): tolerate ENOTDIR when clearing a stale capture path so the fixture-suite
passes on Linux"), status Ready, "Build Completed in 50s".

**Build id.** `NEXT_PUBLIC_BUILD_ID` was not independently fetched from the served
bundle during this run — recorded as not confirmed, consistent with this project's own
established practice in `docs/analysis/deployment-gate.md` and
`docs/analysis/vercel-regions.md` of stating plainly when a value was not independently
observed rather than assuming it. What was independently observed instead is the running
instance's own `X-CAP-Instance` value, `a129ffa3-4225-4978-a26d-fbe39c83da15` — read
directly off the curl suite's own check H, and again off all three header captures below,
all four readings agreeing — together with the Vercel deployment id and the exact commit
named above. Per `next.config.ts`'s own resolution order and the "System Environment
Variables" dashboard setting Phase 1 confirmed on, `NEXT_PUBLIC_BUILD_ID` for this
deployment resolves to `VERCEL_GIT_COMMIT_SHA`, i.e. the full sha of `2babfd8` — this is
the expected value under that resolution order, not an independently fetched one, and is
recorded as such rather than asserted as observed.

**Why `dev` needed a second push.** The first push of this phase's work to `dev` failed
both the GitHub `verify` job (run 35464494701) and the Vercel build
(`dpl_E7ApbZuSVZRquusGaRwJkbEcwLvZ`) on one pre-existing test,
`scripts/verify.test.mjs:276` ("spawnStep resolves non-zero when the capture file cannot
be written"): the fixture's `rm(path, { force: true })` call only swallows `ENOENT`, and
Linux reports `ENOTDIR` when a path component is a file where a directory is expected —
Windows reports `ENOENT` for the identical condition, so every local run on this
project's own development machine had passed. `main`'s own CI had in fact been red since
`2f8e222` (2026-09-08), one commit after Phase 1 review fix `69c16d7` introduced the
stale-capture `rm`, so production had continued serving `50a246c` throughout. Fix commit
`2babfd8` ("fix(03): tolerate ENOTDIR when clearing a stale capture path so the
fixture-suite passes on Linux") is the commit both `main` and `dev` now carry, and the
commit this Preview was built from; see this phase's 03-16 plan summary for the full
account. With the fix, GitHub run 35464913133 passed with all 26 steps on Linux
(`route-suite`: "ℹ tests 14 / pass 14 / fail 0"), and the Vercel build log for
`dpl_Bv8xHd9B8kknPQ3jM2thTZ8bivPT` shows:

```
2026-09-19T19:38:14.226Z ▶ route-suite — /node24/bin/node --test scripts/server/route-suite.proof.mjs
...
ℹ tests 14
ℹ pass 14
ℹ fail 0
...
Build Completed in /vercel/output [50s]
```

with `VERCEL=1` excluding exactly the two `check-wcag` steps, so twenty-four of the
twenty-six steps ran in this build. This is the Vercel build-log `route-suite` line plan
03-13's own `<verification>` block asked for and that `03-13-SUMMARY.md` carried forward
as unobservable from a sandbox with no live deployment access — closed here.

**Pre-flight, confirmed before the run.** `CAPTURE_SESSION_KEY` exists for the Preview
environment (`vercel env ls preview`); the Preview URL answers the API directly, with no
`_vercel/sso` redirect to a login page; the durable `git-dev` branch alias also answers
200. All three are the exact conditions this plan's own `user_setup` block names as
required before the suite can run at all.

## Result

Every one of the eight lettered checks A through H appears in the output below, matching
`scripts/curl-suite.sh`'s own labels exactly; every line printed `PASS`, none printed
`FAIL`. Pasted verbatim and unedited, the complete output including its own summary line:

```
novatek-capture-demo curl suite — B=https://novatek-capture-demo-4rph6w0fj-matthew-ks-projects-ab449c33.vercel.app

PASS  A  mint a session for acc-mabaso
PASS  A  mint a session for acc-naidoo
PASS  A  GET /api/orders as acc-mabaso
PASS  A  X-CAP-Account names the acting account
PASS  A  identity from session, orders filtered by it: acc-mabaso holds exactly two orders
PASS  A  wo-0142 is one of acc-mabaso's two orders
PASS  A  wo-0151 is the other of acc-mabaso's two orders
PASS  A  GET /api/orders as acc-naidoo
PASS  A  a different persona's jar returns a different, disjoint order set
PASS  A  acc-naidoo's one order is wo-0137
PASS  A  no jar at all is refused, never a filtered empty list
PASS  A  acc-mabaso reading acc-naidoo's own order wo-0137
PASS  A  the not-found body names order_not_found, never a permission-specific code

PASS  B  open wo-0142 so a capture against it is not order_closed
PASS  B  verification authored and saying so in a header
PASS  B  X-CAP-Verification names the method, not a fact about the world
PASS  B  X-CAP-Proposals is non-zero (3)
PASS  B  no model ran: confidence is null throughout
PASS  B  captured two proposal identities to carry into D and E

PASS  C  asset must belong to the order: m-gs001 is not one of wo-0142's assets
PASS  C  asset_not_in_order, never a not-found, since the order itself is real and owned

PASS  D  decided_by in the body ignored and the acting account stamped
PASS  D  the response names the session's own account, not the body's claim
PASS  D  the submitted decided_by appears nowhere in the raw response

PASS  E  reject the second proposal ahead of the walk read-back
PASS  E  GET /api/walk/wo-0142
PASS  E  X-CAP-Redaction: none
PASS  E  redaction.ran:false is present in the body
PASS  E  rejections retained in the walk route: the accepted proposal reads back accepted
PASS  E  rejections retained in the walk route: the rejected proposal reads back rejected, never dropped

PASS  F  sync idempotency: first post of a new client_id
PASS  F  X-CAP-Sync-Recorded: 1 on the first post
PASS  F  sync idempotency: identical replay of the same client_id
PASS  F  X-CAP-Sync-Duplicate: 1 on the identical replay
PASS  F  sync idempotency: same client_id, a changed field
PASS  F  X-CAP-Sync-Conflict: 1 on the changed replay
PASS  F  already_recorded_differently names the conflict

PASS  G  open wo-0151 for the hours check
PASS  G  GET /api/hours
PASS  G  hours accrue server-side: wo-0151's elapsed_s is at least 1 (got 2)
PASS  G  a write to the hours route returns 405
PASS  G  the hand-written 405 still carries Cache-Control: no-store
PASS  G  the hand-written 405 still carries X-CAP-Store
PASS  G  the hand-written 405 still carries X-CAP-Instance — the whole reason this route is hand-written

PASS  H  GET /api/health, call 1 of 3
PASS  H  X-CAP-Instance constant across calls (call 2 of 3)
PASS  H  X-CAP-Instance constant across calls (call 3 of 3)
H — this instance's id is: a129ffa3-4225-4978-a26d-fbe39c83da15
H — a platform cold start cannot be forced from a shell. Re-run this
    script after redeploying the same URL and compare the printed id
    by eye: a genuine cold start changes it; nothing else here does.

----------------------------------------------------------------
47 passed, 0 failed
```

No check failed. Per this plan's own instruction, a red letter here would be recorded as
a defect against the requirement it belongs to, and the phase would not close; there is
none to record.

## Headers the platform added

Captured directly against the same Preview deployment and the same running instance
(`X-CAP-Instance: a129ffa3-4225-4978-a26d-fbe39c83da15` on every response below, matching
the curl suite's own check H above), immediately after the suite run.

### `curl -s -D - -o /dev/null $B/api/health` — no session

```
HTTP/1.1 200 OK
Age: 0
Cache-Control: no-store
Content-Type: application/json
Date: Sat, 19 Sep 2026 19:48:03 GMT
Permissions-Policy: camera=(self), microphone=(self)
Referrer-Policy: strict-origin-when-cross-origin
Server: Vercel
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Cap-Instance: a129ffa3-4225-4978-a26d-fbe39c83da15
X-Cap-Store: memory
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-Matched-Path: /api/health
X-Robots-Tag: noindex
X-Vercel-Cache: MISS
X-Vercel-Id: cpt1::cpt1::mhsb5-1789847283202-41ddc0b154ff
Transfer-Encoding: chunked
```

### `curl -s -D - -o /dev/null $B/api/orders/wo-9999` — no session, the plan's own literal command

```
HTTP/1.1 401 Unauthorized
Age: 0
Cache-Control: no-store
Content-Type: application/json
Date: Sat, 19 Sep 2026 19:48:03 GMT
Permissions-Policy: camera=(self), microphone=(self)
Referrer-Policy: strict-origin-when-cross-origin
Server: Vercel
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Cap-Instance: a129ffa3-4225-4978-a26d-fbe39c83da15
X-Cap-Store: memory
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-Matched-Path: /api/orders/[id]
X-Robots-Tag: noindex
X-Vercel-Cache: MISS
X-Vercel-Id: cpt1::cpt1::2zd29-1789847283528-6f6c918e3153
Transfer-Encoding: chunked
```

With no session cookie at all this route refuses before ownership is ever decided
(`401 no_session`), the same path curl check A's own "no jar at all is refused, never a
filtered empty list" already exercises against `/api/orders`. This is not yet the
not-found path itself, so a second, authenticated capture against the same id follows to
reach it — matching the plan's own suggestion to mint a session with the identical
`POST /api/session` body `scripts/curl-suite.sh` itself uses when an authenticated
not-found is needed to show the byte-identical 404 path.

### The same request, authenticated as `acc-mabaso`, against an order id owned by no one

```
HTTP/1.1 404 Not Found
Age: 0
Cache-Control: no-store
Content-Type: application/json
Date: Sat, 19 Sep 2026 19:49:31 GMT
Permissions-Policy: camera=(self), microphone=(self)
Referrer-Policy: strict-origin-when-cross-origin
Server: Vercel
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Cap-Instance: a129ffa3-4225-4978-a26d-fbe39c83da15
X-Cap-Store: memory
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-Matched-Path: /api/orders/[id]
X-Robots-Tag: noindex
X-Vercel-Cache: MISS
X-Vercel-Id: cpt1::cpt1::6pfsv-1789847370980-5ccd45eab628
Transfer-Encoding: chunked
```

This is the genuine not-found path (`order_not_found`, AD-4's uniform not-found), reached
the same way curl check A's own cross-account case reaches it — `wo-9999` is neither one
of `acc-mabaso`'s own orders nor a real order id at all, and `orderOwned` returns the
identical early result either way. Session minted with the identical
`POST /api/session` body `scripts/curl-suite.sh` uses (`{"persona_id":"acc-mabaso"}`);
its `Set-Cookie` value was read from the mint response's own header and passed back as a
plain `Cookie` header rather than through curl's file-based cookie jar (`-b`/`-c`) — the
jar file came back empty on this shell on two separate attempts, for reasons not further
diagnosed here since `scripts/curl-suite.sh`'s own jar-based runs (above) demonstrably
work; the direct-header form reaches the identical account and the identical response
either way.

All three `X-Vercel-Id` values above read `cpt1::cpt1::...`, confirming region `cpt1`,
matching `vercel.json`'s declared `regions` and `docs/analysis/vercel-regions.md`'s own
prior reading.

### Reconciliation against `HEADER_EXCLUSIONS`

Every header name observed above, set against `scripts/server/route-assertions.mjs`'s
`HEADER_EXCLUSIONS` as it read before this run:

| Header (as sent) | Already excluded? | Disposition |
|---|---|---|
| `Date` | yes (`date`) | confirmed, no change |
| `Server: Vercel` | yes (`server`) | confirmed, value matches the anticipated platform name |
| `X-Vercel-Cache`, `X-Vercel-Id` | yes (`x-vercel-` prefix) | confirmed, both fall under the prefix entry exactly as anticipated |
| `Transfer-Encoding: chunked` | yes (`transfer-encoding`) | confirmed; no `Content-Length` observed on any of these three JSON responses, matching the local `next start` finding exactly |
| `Vary` | yes (`vary`) | **not observed at all** on this real deployment, though 03-RESEARCH.md Pitfall 3 observed a `vary: rsc, next-router-state-tree, ...` value locally under `next start` on every route; the exclusion entry is harmless when the header is absent from both sides of a comparison, so no change is needed — recorded because it is the opposite of what local observation alone would have predicted |
| `Connection`, `Keep-Alive` | yes | not observed either — Vercel's own front proxy evidently strips these hop-by-hop headers before they reach a client; harmless absence, no change |
| `Etag` | yes | not observed on any of these three responses (none of the three requests exercised here would have reason to carry one); the entry stays as a documented anticipation, unconfirmed either way by this run |
| `X-Cap-Instance`, `X-Cap-Store` | n/a — ours | the platform re-cases the literal `X-CAP-Instance`/`X-CAP-Store` names this project's own `lib/http/respond.ts` writes to `X-Cap-Instance`/`X-Cap-Store`; HTTP header field names are case-insensitive, and `route-assertions.mjs`'s own `filteredHeaderMap`/`headerValue` helpers already lowercase every name before comparing, so this needed no code change — recorded as an observation only |
| `X-Matched-Path` | **no** | new. Vercel's own matched-route identifier (`/api/health`, `/api/orders/[id]`). Every existing D-11 comparator invocation compares two requests to the *same* route (an unowned id against a fabricated id on the identical endpoint), so this header's value is identical on both sides of every comparison this suite performs today; decided to let the byte-identity comparison hold rather than exclude it — no exclusion added, and none is needed for the comparator's current usage |
| `Age` | **no** | new. A CDN/edge cache-age counter (`0` on every response captured here, all cache `MISS`); platform-added, not a fact about the record requested, and not guaranteed to stay `0` under a different caching condition. Added to `HEADER_EXCLUSIONS` in this same commit, citing this run |
| `X-Robots-Tag: noindex` | **no** | new. Confirmed absent from this repository's own code (`next.config.ts` has no `headers()` rule; `vercel.json`'s `headers` array does not name it; neither `lib/http/respond.ts` nor `lib/http/contract.ts` references it) — a Vercel platform addition, most likely applied to Preview deployments specifically to keep an ephemeral URL out of a search index. Added to `HEADER_EXCLUSIONS` in this same commit, citing this run |

`scripts/server/route-assertions.mjs` gained two exclusion entries (`age`,
`x-robots-tag`) in this same commit, each citing this run as its evidence. `npm run
verify` was re-run after the edit and still exits 0 at twenty-six steps.

## What this run does not prove

This is one deployment, at one moment: `dpl_Bv8xHd9B8kknPQ3jM2thTZ8bivPT`, one running
instance (`a129ffa3-4225-4978-a26d-fbe39c83da15`), one run of the suite, nineteen seconds
long, plus a handful of follow-up requests minutes later against the same still-warm
instance. It says nothing about a different instance, a different region's behaviour, or
a different moment in this same deployment's life.

No cold start was forced. `X-CAP-Instance` stayed constant across the curl suite's three
`/api/health` calls and across every capture taken afterward for this document, minutes
apart. Nothing here proves what a genuine cold start would add to or remove from the
header set; curl-suite.sh's own check H says as much on every run ("a platform cold
start cannot be forced from a shell").

Assumptions Log A1 — whether Vercel Fluid Compute shares one Node.js module scope across
*concurrent* invocations on the same instance, not only sequential warm ones — is still
unmeasured. Nothing in this run, and nothing in the automated route suite, issues
concurrent requests against a live instance; `docs/analysis/single-writer-non-bypassability.md`'s
own `## Open items` section already carries this forward and continues to do so after
this run.

Restated from `## What was run`: this record documents an agent executing commands at a
developer's explicit direction, not a person typing the commands with their own hands.
The HTTP responses captured are the same either way — curl does not know who invoked
it — but the provenance is different from D-09b's original human-hands framing, and this
document says so rather than letting the distinction blur.

---

Recorded 2026-09-19.
