---
phase: 03-server-seam
audit_date: 2026-09-21
audited_head: a195026
asvs_level: 1
block_on: high
threats_total: 81
threats_closed: 81
threats_open: 0
verdict: SECURED
---

# Phase 3 — Server Seam: Security Audit

Every threat the sixteen plans declared has its stated mechanism present in the
code as it stands at commit `a195026`, the tip of `main` after the thirteen
code-review fixes landed. Nothing in the register is open. Eight mitigations
shipped in a shape narrower or different from the register's wording; each is
recorded below with the evidence and with what the variance costs. Eight pieces
of attack surface exist with no threat id against them; none is a blocker, and
six of the eight are the code review's own Info findings, which the fix pass
deliberately left untouched.

## Scope of this audit

The register is the `<threat_model>` block inside each of the sixteen
`03-NN-PLAN.md` files, read directly rather than reconstructed. It carries 81
rows: 80 with `T-3-NN` identifiers running from `T-3-01` to `T-3-80`, plus one
`T-3-SC` supply-chain row in plan 03-06. Seventy-nine carry the disposition
`mitigate`; two carry `accept` (`T-3-SC` and `T-3-79`).

This audit verifies each declared mitigation against the implementation. It does
not scan for undeclared vulnerabilities. Where a mitigation's declared evidence
is a test or a build rule, the audit ran that rule or read that test rather than
taking the SUMMARY's word for it.

**Commands run in this session, all read-only:**

- `node scripts/check-single-writer.mjs` — exit 0, Problems: 0
- `node scripts/check-actor-field.mjs` — exit 0, Problems: 0
- `node scripts/check-accepted-fields.mjs` — exit 0, Problems: 0
- `node scripts/check-fixture-inputs.mjs` — exit 0, Problems: 0
- `node scripts/check-named-packages.mjs` — exit 0, Problems: 0, two informational exception lines
- `node scripts/check-non-bypassability.mjs` — exit 0, Problems: 0
- `node --test` over the six rules' fixture suites — 61 tests, 61 pass, 0 fail

`npm run verify` was deliberately not run: the orchestrator holds the gate in
this same checkout and a second run would race on the build output.

## Threat verification

### Plan 03-01 — limits, gate wiring, refusal copy

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-01 | Denial of Service | mitigate | CLOSED | `lib/limits/index.ts:23-148` exports every cap, the global object cap, the TTL and both sync ceilings as named constants; `lib/limits/index.test.mjs:41-47` asserts each is a positive finite integer and `:72-75` asserts the export set is exactly the enumerated list |
| T-3-02 | Information Disclosure | mitigate | CLOSED | Exactly one `order_not_found` sentence, at `lib/copy/conflicts.ts:48-51`; a repository-wide grep finds no second definition |
| T-3-03 | Tampering | mitigate | CLOSED | `lib/limits/index.test.mjs:51-56` asserts `THUMB_CLIENT_TARGET_ENCODED_BYTES < THUMB_MAX_ENCODED_BYTES` and `QUEUED_CLOCK_FLOOR_SLACK_SECONDS < QUEUED_CLOCK_FUTURE_TOLERANCE_SECONDS` as executable relationships |
| T-3-04 | Repudiation | mitigate | CLOSED | `scripts/verify.test.mjs:90` asserts the `unit-suite` step's args are exact and that `lib/**/*.test.mjs` currently matches at least one file |
| T-3-05 | Spoofing | mitigate | CLOSED | All three records are typed `Record<Code, RefusalCopy>` at `lib/copy/conflicts.ts:42`, `:120`, `:158`; `lib/copy/conflicts.test.mjs:35-44` asserts key-set equality against the closed-set arrays |
| T-3-16 | Information Disclosure | mitigate | CLOSED | `lib/session/key.ts:30-35` throws under `NODE_ENV === "production"` when the key is absent or under 16 characters; `lib/session/key.test.mjs:54` runs exactly that case in a child process and requires a throw naming `CAPTURE_SESSION_KEY` |

### Plan 03-02 — store, header table, responder

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-06 | Information Disclosure | mitigate | CLOSED | Every non-universal `X-CAP-*` entry is `success-only` at `lib/http/contract.ts:104-195`; `lib/http/contract.test.mjs:65-72` asserts it. `fail()` at `lib/http/respond.ts:109-113` throws on **any** caller header, and `notFound()` at `:127` takes no parameters |
| T-3-07 | Denial of Service | mitigate | CLOSED | `lib/store/memory.ts:349-368` — both eviction passes delete only from the writing account's own slice; `lib/store/memory.test.mjs:198` proves eviction under the global cap is scoped to the offending account |
| T-3-08 | Spoofing | mitigate | CLOSED | `lib/store/memory.ts:566` — `stampLastContact(account: string)` takes one parameter and writes `Date.now()`; `lib/store/memory.test.mjs:93` asserts it takes no time argument |
| T-3-09 | Tampering | mitigate | CLOSED (see V-1) | `lib/http/respond.ts:72-79` — `ok()` throws on a caller header sharing a universal name and on an `X-CAP-` name absent from `HEADER_TABLE` |
| T-3-10 | Repudiation | mitigate | CLOSED | `lib/store/memory.ts:542-552` stamps `at` from the module's own clock and routes an `account_id: null` entry to the separate unattributed ring at `:137`; `lib/reconcile/apply.test.mjs:63` proves a session-less refusal lands there |

### Plan 03-03 — session, attribution, access scope

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-11 | Spoofing | mitigate | CLOSED | `lib/session/cookie.ts:107-110` verifies the HMAC before the payload is decoded or the expiry compared; `lib/session/cookie.test.mjs:37` and `:62` prove a one-character signature change and a foreign-key signature both return `bad_signature` |
| T-3-12 | Information Disclosure | mitigate | CLOSED | `lib/session/cookie.ts:109-110` — explicit length guard then `timingSafeEqual`; no `===` or `Buffer.equals` on the signature anywhere in the file |
| T-3-13 | Spoofing | mitigate | CLOSED | `lib/attribution/index.ts:42` — `deriveAccount(result: SessionResult)`, one parameter; `lib/attribution/index.test.mjs:53-58` asserts the source contains none of `rbac_tier`, `req`, `request`, `body`, `headers`, `searchParams`; `scripts/check-actor-field.mjs` exits 0 |
| T-3-14 | Information Disclosure | mitigate | CLOSED | `lib/access/scope.ts:61-65` — `orderOwned` returns before touching `ORDER_BY_ID` when the id is not in the account's set; `lib/access/scope.test.mjs:48` asserts both cases return `null` |
| T-3-15 | Elevation of Privilege | mitigate | CLOSED | `lib/access/scope.test.mjs:97` and `lib/attribution/index.test.mjs:55` both assert `rbac_tier` is absent from source; `scripts/check-actor-field.mjs:433-434` fails the build on `rbac_tier` outside a comment, proved by its fixture at `check-actor-field.test.mjs:192` |

### Plan 03-04 — derived proposal identity, authored answer

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-17 | Spoofing | mitigate | CLOSED | `lib/proposals/derive.ts:179-183` — a bare HMAC-SHA256 digest over account, client id and observation id, NUL-joined; `lib/proposals/derive.test.mjs:94` asserts consecutive-input ids share no long prefix and `:108` asserts the decoded digest discloses neither input |
| T-3-18 | Information Disclosure | mitigate | CLOSED | `lib/proposals/derive.ts:195-199` reads no state; `lib/proposals/derive.test.mjs:140` proves a fabricated candidate and a valid id under a different account fail identically |
| T-3-19 | Information Disclosure | mitigate | CLOSED | `lib/proposals/derive.ts:198-199` — explicit length guard then `timingSafeEqual`; `derive.test.mjs:160` asserts no throw on an empty, malformed or oversized candidate |
| T-3-20 | Tampering | mitigate | CLOSED (see V-5) | `lib/verify/authored.ts:62` and `lib/proposals/derive.ts:158` both take exactly `(assetId, fixtureSet)`; `authored.test.mjs:16`/`:82` and `derive.test.mjs:26`/`:188` assert the count, the names and the absence of capture-payload identifiers; `scripts/check-fixture-inputs.mjs` exits 0 |
| T-3-21 | Repudiation | mitigate | CLOSED | `lib/proposals/derive.ts:67-74` defines `UnknownCitedRecordError` and `:110` throws it rather than falling back; `derive.test.mjs:170` asserts the named subclass carries both ids |

### Plan 03-05 — the single writer

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-22 | Spoofing | mitigate | CLOSED | `lib/reconcile/validate.ts:171-214` — no enumeration carries an actor field; `apply.ts:301` and `:414` assign `captured_by`/`decided_by` only from `account.account_id`; `validate.test.mjs:73` and `apply.test.mjs:656` prove a submitted value reaches neither the record nor the attempt entry |
| T-3-23 | Tampering | mitigate | CLOSED | No enumeration carries `observation`, `grade` or `provenance` (`validate.ts:171-214`); `validate.test.mjs:85` and `:98` assert it whole-name, so `observation_id` survives while `observation` does not; `scripts/check-accepted-fields.mjs` re-asserts against its own table and exits 0 |
| T-3-24 | Tampering | mitigate | CLOSED | `lib/reconcile/apply.ts:213-234` clamps to the later of `issued_at` and last contact, refuses `clock_skew` outside both bounds, and retains `device_claimed_opened_at` and `device_offset_s` separately; `apply.test.mjs:293`, `:321`, `:347`, `:378` cover all four cases |
| T-3-25 | Information Disclosure | mitigate | CLOSED | `lib/reconcile/validate.ts:497-499` keys `seen` as `accountId:clientId`; the store's Maps are account-keyed at `memory.ts:125`; `apply.test.mjs:148` proves the same `client_id` under two accounts yields two independent results |
| T-3-26 | Elevation of Privilege | mitigate | CLOSED | `lib/reconcile/apply.ts:470-490` — `proposalIdMatches` runs at the ownership position, before any state read; `apply.test.mjs:539` and `:567` assert a fabricated id, an id under another account, and a wrong or missing identity field give deep-equal `unknown_proposal` results |
| T-3-27 | Denial of Service | mitigate | CLOSED | `lib/reconcile/validate.ts:281`, `:294`, `:304` refuse `media_too_large` against `CAPTURE_MAX_DECLARED_BYTES`, `VOICE_MAX_DURATION_MS` and `THUMB_MAX_ENCODED_BYTES` before any write; `validate.test.mjs:174` proves the thumbnail boundary one character either side |
| T-3-28 | Repudiation | mitigate | CLOSED | `lib/reconcile/apply.ts:120-152` — `finalize()` writes an `AttemptEntry` on every path including success; `:160-167` asserts every written state against the closed set; `apply.test.mjs:183` and `:689` cover both halves |

### Plan 03-06 — fixture-input and package build rules

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-29 | Tampering | mitigate | CLOSED (see V-5) | `scripts/check-fixture-inputs.mjs` asserts both signatures by exact text and walks the import graph transitively; `check-fixture-inputs.test.mjs` carries 8 fixtures including a two-hop case (`:95`) and an alias-form case (`:125`); all pass |
| T-3-30 | Tampering | mitigate | CLOSED (see V-4) | `scripts/check-named-packages.mjs` sweeps `package-lock.json`'s `packages` keys and `package.json`'s four dependency maps; `check-named-packages.test.mjs:79` proves a transitive hit is reported as transitive and `:98` proves a missing lockfile is a named problem, not a pass |
| T-3-SC | Tampering | **accept** | CLOSED | Accepted-risk entry A-1 below. Verified: `03-RESEARCH.md:143-148` records the audit as not applicable, and the only `package.json` edit in this phase (`077af5c`) changed the `test` script glob, adding no dependency |
| T-3-31 | Repudiation | mitigate | CLOSED | Both rules ship fixture tests with a non-zero exit per violation class; `check-fixture-inputs.test.mjs:160` (live code fails) and `:177` (comment-only passes) are the comment-versus-live-code pair |

### Plan 03-07 — health, session, orders routes

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-32 | Spoofing | mitigate | CLOSED | A repository-wide grep of `app/api/**` for `searchParams`, `request.headers` and `nextUrl` returns **zero** matches; `app/api/orders/route.ts:27-45` takes no body. The negative set fails for lack of a code path |
| T-3-33 | Information Disclosure | mitigate | CLOSED | `app/api/orders/[id]/route.ts:65-69` builds a new asset object per entry by destructuring rest; `grep -c "delete " ` on that file returns 0 |
| T-3-34 | Information Disclosure | mitigate | CLOSED (see V-6) | `app/api/health/route.ts:34` and `:46` — `await connection()` is the literal first statement of both handlers |
| T-3-35 | Spoofing | mitigate | CLOSED | `lib/session/cookie.ts:147-157` — `httpOnly: true`, `sameSite: "lax"`, `secure` under production, `maxAge` from `SESSION_COOKIE_MAX_AGE_SECONDS`; the routes attach these through `setCookie()` and name no attribute of their own |
| T-3-36 | Information Disclosure | mitigate | CLOSED | `app/api/orders/[id]/route.ts:59` reaches not-found only through the parameterless `notFound()`; `fail()` throws on any caller header (`respond.ts:111-113`) |

### Plan 03-08 — clock routes and hours

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-37 | Tampering | mitigate | CLOSED | `open/route.ts:69` and `close/route.ts:60` pick down to `client_id` alone; `app/api/hours/route.ts:44-62` reads no query parameter and no body; `validate.test.mjs:115` asserts no enumeration carries an accrued-time value; `check-accepted-fields.mjs` exits 0 |
| T-3-38 | Information Disclosure | mitigate | CLOSED (see F-3) | `app/api/hours/route.ts:65-70` — an explicit `POST` whose whole body is `fail("method_not_allowed")`, so the refusal carries the universal set and the `{error, detail}` envelope |
| T-3-39 | Information Disclosure | mitigate | CLOSED | `open/route.ts:52` calls `orderOwned` before the body parse at `:58`; `close/route.ts:43` before `:49`. Both return `notFound()` from a single call site |
| T-3-40 | Tampering | mitigate | CLOSED | Neither route imports the store; `lib/reconcile/apply.ts:191-201` returns `duplicate` with the unchanged clock; `open/route.ts:93-116` renders it as a plain 200; `apply.test.mjs:110` proves no second segment is written |

### Plan 03-09 — capture, verify and decision routes

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-41 | Spoofing | mitigate | CLOSED | `verify/route.ts:89`, `captures/route.ts:91` and `decisions/route.ts:80` run the body through `pick` against the route's enumeration before any field is read; the writer assigns the actor field only from the attribution-derived account |
| T-3-42 | Information Disclosure | mitigate | CLOSED | `app/api/decisions/route.ts:139` — the one call site of `notFoundProposal()`, which takes no parameters (`respond.ts:136-138`); the decision is made by re-derivation inside the writer before any state read |
| T-3-43 | Tampering | mitigate | CLOSED | Neither `app/api/verify/route.ts` nor `app/api/captures/route.ts` imports `lib/verify/authored.ts` or `lib/proposals/derive.ts` (import blocks at `:35-45` and `:39-49`); `check-fixture-inputs.mjs` walks the graph from the other side and exits 0 |
| T-3-44 | Denial of Service | mitigate | CLOSED | `verify/route.ts:68-70` and `captures/route.ts:72-74` measure the raw body against `CAPTURE_BODY_MAX_ENCODED_BYTES` before parsing; the writer's validator refuses the three media ceilings before the write path; `STATUS_BY_CODE.media_too_large` is 413 (`contract.ts:238`) |
| T-3-45 | Elevation of Privilege | mitigate | CLOSED | `verify/route.ts:97` and `captures/route.ts:98` call `orderOwned` before the item is built; `apply.ts:267-276` runs `assetInOrder` inside the writer and refuses `asset_not_in_order`; no referral is reachable from that refusal |

### Plan 03-10 — the sync route

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-46 | Denial of Service | mitigate | CLOSED (see F-6) | `app/api/sync/route.ts:70` measures with `Buffer.byteLength`; `:97-99` refuses `batch_too_large` against `SYNC_MAX_ITEMS` and `SYNC_MAX_ENCODED_BYTES` before the loop, carrying the app-level sentence |
| T-3-47 | Tampering | mitigate | CLOSED | Exactly one `applyItem` call site at `app/api/sync/route.ts:142`; the route imports no store module; `scripts/check-single-writer.mjs` exits 0 with one permitted importer |
| T-3-48 | Spoofing | mitigate | CLOSED | `lib/reconcile/apply.ts:517-529` compares `claimed_account_id` against the acting account and returns `account_mismatch`; the field is never copied onto a record; `apply.test.mjs:96` proves it |
| T-3-49 | Information Disclosure | mitigate | CLOSED | Every item with a UUID-shaped `client_id` reaches the same `applyItem` (`sync/route.ts:129-143`); the route adds no ownership branch; the suite compares the per-item result objects at `route-suite.proof.mjs:807-813` |
| T-3-50 | Repudiation | mitigate | CLOSED | `sync/route.ts:111-185` — the loop never breaks and never uses `Promise.all`; `:197-200` tallies the four counters from `results` |

### Plan 03-11 — the walk payload

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-51 | Information Disclosure | mitigate | CLOSED (see V-2) | `app/api/walk/[orderId]/route.ts:36-39` calls `orderOwned` before the assembler and reaches not-found only through the parameterless `notFound()` |
| T-3-52 | Information Disclosure | mitigate | CLOSED | `lib/walk/payload.ts:161-163` builds each asset entry from `asset_id` and `tag` alone, never spreading the fixture record; `lib/walk/payload.test.mjs:133` asserts no asset entry carries the key |
| T-3-53 | Repudiation | mitigate | CLOSED | `lib/walk/payload.ts:136-159` filters the three sets on `state` so they are disjoint by construction; `payload.test.mjs:286` asserts a rejection survives a later unrelated write |
| T-3-54 | Tampering | mitigate | CLOSED | `app/api/walk/[orderId]/route.ts:46-53` derives `X-CAP-Walk-Facts` by reducing over the payload the assembler just returned, never re-querying the store |
| T-3-55 | Spoofing | mitigate | CLOSED | `lib/walk/payload.ts:150-152` reads `accepted_by`, `accepted_at` and `arrived_via` off the server's own decision record, with the reason in the comment at `:138-142`; `payload.test.mjs:234` asserts all three are server-derived |

### Plan 03-12 — the three source-side build rules

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-56 | Tampering | mitigate | CLOSED | `scripts/check-single-writer.mjs:51-70` lists ten mutating exports and one permitted importer; the walk is transitive and resolves the `@/` alias; fixtures prove the direct, alias, two-hop, namespace and re-export forms all fail, and that read-only reach exits 0 |
| T-3-57 | Spoofing | mitigate | CLOSED (see V-3) | `scripts/check-actor-field.mjs:32` sweeps four actor fields and `:41` allows two files; `check-actor-field.test.mjs:69` proves `decided_by: body.decided_by` in a permitted assigner exits non-zero, and `:88`/`:105` prove the safe forms exit 0 |
| T-3-58 | Tampering | mitigate | CLOSED | `scripts/check-accepted-fields.mjs:68-122` carries `EXPECTED_ROUTES`, `EXPECTED_PAYLOADS` and `FORBIDDEN_VOCAB` written independently of the module; `:195` and `:202` compare in both directions; `check-accepted-fields.test.mjs:104` and `:130` prove both halves |
| T-3-59 | Elevation of Privilege | mitigate | CLOSED | `scripts/check-actor-field.mjs:433-434` reports `rbac_tier` outside a comment; the companion sweep catches any `ORDER_IDS_BY_ARTISAN` import outside the accessor, including namespace and re-export forms (`check-actor-field.test.mjs:210`, `:232`, `:257`) |
| T-3-60 | Repudiation | mitigate | CLOSED | All three rules ship fixture tests with one case per violation class including comment-only cases; Task 3's expected table is written independently (see T-3-58). 61 fixture tests pass |
| T-3-61 | Information Disclosure | mitigate | CLOSED | `scripts/check-single-writer.mjs:361-362` sweeps `app/api/**` and `lib/**` for `NextResponse` and `new Response(` outside `lib/http/respond.ts`; a fixture proves the failure and a comment-only fixture proves it is not self-tripping |

### Plan 03-13 — the automated route suite

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-62 | Information Disclosure | mitigate | CLOSED (see V-2) | `assertNoSuccessOnlyHeaders` runs on 10 FR-6 responses (`route-suite.proof.mjs:649-759`) and 3 FR-27 responses (`:1020-1022`); the comparator removes only `HEADER_EXCLUSIONS` names (`route-assertions.mjs:104`, `:176-186`) |
| T-3-63 | Information Disclosure | mitigate | CLOSED | `compareResponses` compares status, raw body text and the filtered header map (`route-assertions.mjs:191-214`) across six routes (`proof.mjs:648`, `:666`, `:684`, `:702`, `:757`, `:792`); the self-test proves it throws on a one-byte body difference (`route-assertions.test.mjs:114`) and on a differing `x-cap-order` (`:102`) |
| T-3-64 | Spoofing | mitigate | CLOSED | `proof.mjs:816-893` posts `captured_by`, `decided_by` and `account_id` to four write routes (captures, decisions, orders open, sync) and asserts the submitted value appears in neither the responses nor the walk payload (`:887`) nor the hours read-back (`:890`) |
| T-3-65 | Repudiation | mitigate | CLOSED | The suite does not build — it spawns `next start` against the existing `.next` (`proof.mjs:160`); check H restarts the server and asserts `X-CAP-Instance` changed (`:1033-1050`) |
| T-3-66 | Repudiation | mitigate | CLOSED | The file is `scripts/server/route-suite.proof.mjs`; `verify.test.mjs:129` asserts the pre-build fixture-suite glob does not match it, and `:120` asserts the step runs after `next-build` and is not `vercelExcluded` |
| T-3-67 | Denial of Service | mitigate | CLOSED (see V-7) | `proof.mjs:261-263` — the `after()` teardown hook calls `stopServer`, which ends the whole process group (`scripts/lib/server.mjs:135`, `:141`, `:153`) with a liveness probe |

### Plan 03-14 — the two reviewer-facing artefacts

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-68 | Repudiation | mitigate | CLOSED | `docs/analysis/single-writer-non-bypassability.md` enumerates twelve routes, the single writer, the single accessor and every `process.env` name; `node scripts/check-non-bypassability.mjs` exits 0, and its fixtures prove a new route, a new env read and a new store-writing module each exit non-zero |
| T-3-69 | Information Disclosure | mitigate | CLOSED | `single-writer-non-bypassability.md:24-30` states first that the rule asserts completeness and cannot prove the prose beside each name is true; `## Open items` at `:353` states the live-deployment questions as questions |
| T-3-70 | Information Disclosure | mitigate | CLOSED | `scripts/curl-suite.sh:35` states no `jq` anywhere; `:57` uses `set -u` rather than `set -e`; `:164-199` falls back across `uuidgen`, `/proc/sys/kernel/random/uuid` and `/dev/urandom`; `:343-353` prints a `PASS`/`FAIL` line per check and `:558` a summary |
| T-3-71 | Tampering | mitigate | CLOSED | `git ls-files -s scripts/curl-suite.sh` reports mode `100755` |
| T-3-72 | Repudiation | mitigate | CLOSED | `scripts/curl-suite.sh:73` uses `EMPTY_SHA256`, verified in this session to be exactly 64 characters and to equal Node's own `sha256("")`; a grep for the seed's `"sha256":"00"` / `"bytes":1` placeholder returns nothing |

### Plan 03-15 — the non-bypassability rule and the step list

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-73 | Repudiation | mitigate | CLOSED | `scripts/check-non-bypassability.mjs` sweeps routes, env reads and store writers on every build; fixture tests prove a non-zero exit naming the missing path or variable for each class |
| T-3-74 | Repudiation | mitigate | CLOSED | The rule strips comment lines before collecting `process.env` names; its fixtures prove a comment-only env read exits 0 while a live one without a document entry exits non-zero |
| T-3-75 | Repudiation | mitigate | CLOSED | The fixture "a missing document file exits non-zero rather than passing" passes |
| T-3-76 | Repudiation | mitigate | CLOSED | `scripts/verify.test.mjs:153` asserts all six Phase 3 source-side rules run before `next-build` and are not `vercelExcluded`, and that `route-suite` runs after it |

### Plan 03-16 — the live-deployment verification

| ID | Category | Disp. | Verdict | Evidence |
|----|----------|-------|---------|----------|
| T-3-77 | Information Disclosure | mitigate | CLOSED | `docs/analysis/server-seam-verification.md` `## Headers the platform added` (`:160`) records the raw header blocks; `route-assertions.mjs:95-102` adds `age` and `x-robots-tag` as entries whose reasons cite that run, and `:38-50` records that the remaining names needed no change |
| T-3-78 | Repudiation | mitigate | CLOSED (see V-8) | `03-16-PLAN.md` is non-autonomous and blocking; `server-seam-verification.md` records the run against a real Preview deployment with 47 passed / 0 failed, and `## What was run` discloses the provenance rather than smoothing it |
| T-3-79 | Information Disclosure | **accept** | CLOSED | Accepted-risk entry A-2 below. Verified: `03-16-PLAN.md:155-157` is the private-window instruction, and `.planning/STATE.md:195` carries the standing dashboard blocker |
| T-3-80 | Repudiation | mitigate | CLOSED | `server-seam-verification.md:282-308` — `## What this run does not prove` names the single-moment limitation, the unforced cold start, and Assumptions Log A1's unmeasured Fluid Compute concurrency |

## Accepted risks log

### A-1 — `T-3-SC`: supply chain, a package arriving without the legitimacy gate

**Accepted.** Phase 3 installed zero packages. `03-RESEARCH.md:143-148` records the
Package Legitimacy Audit as not applicable, with "Packages removed due to slopcheck
verdict: none" and "Packages flagged as suspicious: none". The only `package.json`
change in the phase is commit `077af5c`, which widened the `test` script glob and
touched no dependency map. `scripts/check-named-packages.mjs` is the standing guard
for any future arrival, and any package a later phase installs re-enters the
legitimacy protocol.

**Residual exposure:** see finding F-1 — `sharp@0.35.4` and `zod@4.5.4` are already
present transitively and are allowlisted by pinned name and version.

### A-2 — `T-3-79`: a Preview behind Vercel Authentication answering a login page

**Accepted.** Deployment Protection is a Vercel dashboard setting outside the agent's
reach. `03-16-PLAN.md:155-157` instructs the developer to confirm the URL is reachable
in a private window and what to change if it is not; `.planning/STATE.md:195` carries
the same item as a standing Phase 1 blocker. The consequence of the risk materialising
is a suite that fails loudly for the wrong reason, not a silent pass — the failure mode
is legible, which is why accepting it is reasonable. The recorded run at
`docs/analysis/server-seam-verification.md:80` confirms the `_vercel/sso` redirect was
observed on one alias and the durable `git-dev` alias answered instead, so the risk is
live and understood rather than theoretical.

## Variances

Eight mitigations shipped in a shape narrower or different from the register's own
wording. None leaves its threat unmitigated; each is recorded here so a later reader
does not mistake the register's prose for what the code does.

**V-1 — `T-3-09`: the responder's header guards are case-sensitive.**
`lib/http/respond.ts:73` tests `UNIVERSAL_NAMES.has(name)` against exact-case names and
`:76` tests `name.startsWith("X-CAP-")`. A route passing `cache-control` in lowercase
would evade both guards and win the merge at `:50`, since caller headers are applied
last. All twelve shipped routes pass exact-case names, so nothing is exploitable today
and no request can reach this — the guard defends against a future route author, not an
attacker. This is the code review's `IN-01`, left untouched by the fix pass.

**V-2 — `T-3-51` and `T-3-62`: the byte-identity suite does not cover every response
the register names.** `T-3-62` declares `assertNoSuccessOnlyHeaders` on "all twelve FR-6
responses"; the suite runs it on ten. The two `/api/sync` envelope responses are
deliberately excluded, with the reason stated in code at `route-suite.proof.mjs:793-806`:
the sync envelope is a 200 carrying `X-CAP-Account` and four counters whenever the
envelope parses, by D-01's own design, so a literal application of the check would fail
against an already-correct shape on every run. The same block adds a per-item result
comparison instead, and `compareResponses` already diffs the full header map for those
two responses. This was recorded at the time as 03-13's fifth deviation.
`T-3-51` declares that the comparator proves the walk route's unowned and fabricated ids
are byte-identical; `/api/walk/[orderId]` is **not** among the six routes the FR-6 test
compares. The route's own structural mechanism is intact and verified
(`app/api/walk/[orderId]/route.ts:36-39`), and the walk route is exercised by the suite
for other purposes at `:391`, `:887` and `:897` — but the unowned-versus-fabricated pair
is never compared over the wire for this route. Since the walk payload is the largest
disclosure in the system, closing this gap is the single most valuable addition to the
suite.

**V-3 — `T-3-57`: `PERMITTED_RHS` is a banlist, not the declared three-entry allowlist.**
The register says the rule "allows only three right-hand sides". `check-actor-field.mjs:58`
keeps the three forms as documentation but `:69-78` explains that the operative check is
`isSafeRhs`, a banlist over unsafe sources (`body`, `payload`, `request`, a quoted
literal). The reason is concrete: the shipped `apply.ts` writes
`account ? account.account_id : null` inside `finalize()`, a compound expression built
only from permitted primitives that an exact-string allowlist would reject. The named
threat case still fails loudly — `check-actor-field.test.mjs:69` proves
`decided_by: body.decided_by` in a permitted assigner exits non-zero. Recorded as
03-12's first deviation. The review's `IN-06` notes the banlist is evadable by renaming
the body variable; see F-4.

**V-4 — `T-3-30`: the lockfile sweep carries a pinned exception list.**
`check-named-packages.mjs:97-100` allowlists `sharp@0.35.4` and `zod@4.5.4` by exact
name and resolved version. `sharp` is on the FORBIDDEN list as an
"image-analysis-capable library — FR-17 bans an image-analysis capability" and is
genuinely present in `package-lock.json:5234`, arriving through `next@16.3.4`'s own
`optionalDependencies` for `next/image`'s resizing pipeline, marked `optional: true`.
Neither package is imported by this project's source, and
`scripts/check-fixture-inputs.mjs` independently proves neither authored module can
reach a capture payload through its import graph. The exception is pinned, so a version
bump re-trips the rule, and an additional fixture at `check-named-packages.test.mjs:142`
proves that. Both exceptions print an informational line on every run. See F-1 for the
residual concern.

**V-5 — `T-3-20` and `T-3-29`: the text sweeps' identifier lists were narrowed.**
`capture`, `capture_id` and `sha256` were removed from the swept sets because the target
modules' own correct live code carries them — `Omit<VerificationResult, "capture_id" |
"verified_at">` exists precisely to *exclude* that field, and `createHmac("sha256", …)`
names a hash algorithm, not a capture's digest field. The swept set is now
`bytes, thumb, mime, duration_ms, payload`, confirmed absent from both target files.
The load-bearing half of both threats — the transitive import-graph walk — is unaffected.
Recorded as 03-04's and 03-06's deviations.

**V-6 — `T-3-34`: the "build output marks the route dynamic" assertion is not a standing
rule.** The code mechanism is present and verified (`await connection()` as the literal
first statement of both handlers). `scripts/check-structure.mjs`'s `--build-output` mode
asserts that route `/` is *static*; it carries no assertion that `/api/health` is
*dynamic*. The register's second clause was a one-time plan acceptance criterion, so
nothing in the gate would catch a future edit that removed the `connection()` call and
let the route prerender.

**V-7 — `T-3-67`: teardown is an `after()` hook, not a literal `finally`.**
`route-suite.proof.mjs:261-263` uses `node:test`'s `after()` hook, which gives the same
guarantee the register's `finally` wording intends. `before()` at `:246-258` also tears
down on a failed readiness wait.

**V-8 — `T-3-78`: the recorded live run was agent-executed, not typed by a person.**
`docs/analysis/server-seam-verification.md` discloses this itself rather than letting the
distinction blur: "this record documents an agent executing commands at a developer's
explicit direction, not a person typing the commands with their own hands". Every other
clause of the mitigation holds — the plan is non-autonomous and blocking, the output is
pasted, and a `FAIL` line would have been recorded as a defect. The provenance question
is already tracked as the phase's single open human-verification item in
`.planning/phases/03-server-seam/03-HUMAN-UAT.md` and is not a security finding.

## Unregistered flags

None of the sixteen SUMMARY files contains a `## Threat Flags` section — the template
this project uses has no such heading, so there is no executor-flagged list to
incorporate. The items below were instead derived from the sixteen `## Deviations from
Plan` sections and from `03-REVIEW.md`'s nine Info findings, which `03-REVIEW-FIX.md`
records as deliberately left untouched. All are WARNING class; none blocks the phase.

**F-1 — an FR-17-banned image-analysis package is in the dependency tree.**
`sharp@0.35.4` sits in `package-lock.json` as an optional transitive dependency of
`next`. It is allowlisted by pinned name and version and is not imported by this
project's source. Worth a decision rather than a fix: FR-17's claim is about
*capability*, and a capability present in `node_modules` but unreachable from source is
a different thing from one that is absent. Related: `check-named-packages.mjs`'s own
success line reads "No forbidden package name appears in … package-lock.json's resolved
tree", which the two informational lines printed immediately above it contradict. The
wording overclaims; the output does not hide anything.

**F-2 — the development signing key is used for any `NODE_ENV` other than exactly
`"production"`.** `lib/session/key.ts:30` tests `=== "production"`. A deployment running
under `NODE_ENV=staging`, or with the variable unset, silently serves the committed
fallback at `:42`. This is exactly what `T-3-16`'s mitigation declares, so the threat is
closed — but the residual surface has no threat id. The review's `IN-02`.

**F-3 — the other eleven routes still get the framework's own 405.**
`T-3-38` is scoped to `/api/hours` and is satisfied there. Every other route answers an
unsupported method through Next's own framework-level 405, which runs before application
code and carries none of the universal headers and none of the `{error, detail}`
envelope. The hand-written 405 also carries no `Allow` header. The review's `IN-04`.

**F-4 — the actor-field banlist is evadable by renaming the body variable.**
`check-actor-field.mjs`'s `isSafeRhs` bans `body`, `payload`, `request` and quoted
literals as right-hand sides. `const b = await request.json(); … account_id: b.account_id`
would pass. The rule catches the natural spelling of the threat, not every spelling.
The review's `IN-06`.

**F-5 — one signing key serves two HMAC domains with no domain separation.**
`signingKey()` is shared by `lib/session/cookie.ts:48` (HMAC over a base64url session
payload) and `lib/proposals/derive.ts:180` (HMAC over a NUL-joined triple). Neither input
space can produce the other's shape in practice — a base64url payload contains no NUL
byte — and the two digests are consumed by different comparators, so no cross-protocol
confusion is reachable today. A prefix per domain would remove the question entirely.
The review's `IN-07`.

**F-6 — the sync and capture byte ceilings are enforced after the body is buffered.**
`request.text()` at `sync/route.ts:66`, `verify/route.ts:64` and `captures/route.ts:68`
reads the whole body into memory before `Buffer.byteLength` measures it. This is
precisely what `T-3-46`'s and `T-3-44`'s mitigations declare, so both are closed; the
memory spike before the refusal has no threat id. The platform's own request limit sits
above this. The review's `IN-08`.

**F-7 — `AD-20`'s "dropped at parse" is not literally true for `/api/sync` payloads.**
An online route's `pick()` runs in the route handler; a sync item's payload is projected
inside `idempotencyHash` and validated by kind, but the raw payload object travels into
`applyItem`. No unenumerated field reaches a record — `applyByKind` reads named keys
only — but the claim's wording is stronger than the mechanism. The review's `IN-05`.

**F-8 — `docs/analysis/single-writer-non-bypassability.md` carries stale text.**
It still says "twenty-five steps" where `scripts/verify.mjs` has 26. Two other statements
in it that were false at review time became true with the `CR-03` and `CR-04` fixes, but
the document was not re-edited. `check-non-bypassability.mjs` asserts completeness, not
accuracy, so nothing catches this. The review's `IN-03`, partly stale.

## Out-of-scope blocker carried forward

`lib/data/types.ts` and `scripts/claims-audit.mjs` carry uncommitted working-tree edits
written by a concurrent session in the sibling `ipv-demo` project, tracked as a
`[SECURITY]` blocker at `.planning/STATE.md:201-203`. This audit verified both against
`git show HEAD:<path>` and left them exactly as found — unstaged, unedited, unreverted.

**They do not bear on any `T-3` threat.** The `types.ts` change edits only the JSDoc
comment on `CitedFact.liveRead`. Every closed set and every field the register depends on
is untouched: `ConflictCode`, `RejectCode`, `ProposalState`, `SYNC_ITEM_KINDS`,
`SYNC_ITEM_SCHEMA_VERSIONS`, the `rbac_tier` display-only annotation that `T-3-15` rests
on, and the `claimed_account_id` "compared, never trusted" note that `T-3-48` rests on.
The `claims-audit.mjs` change relaxes an IoT/SCADA prohibition in the claims register;
that script is a gate step but is named by no threat in the register, and it governs
product prose rather than any server-seam control.

The blocker remains open for the user on its own terms: the edits cite four documents
(`Business Plan v3.1 D23`, `FINDINGS.md:93`, `A2-claims.md:83`,
`audit/2026-08-30-gold-standard`) that resolve in neither repository, and they widen what
claims the audit permits. Whether that rule change is a real business decision to keep,
and whether to commit or revert it in both repositories, is the user's call.

## Recommendations

In rough order of value, none of them blocking:

1. Add an unowned-versus-fabricated `compareResponses` pair for
   `GET /api/walk/[orderId]` to the route suite (closes V-2's second half; the walk
   payload is the largest single disclosure in the system).
2. Lowercase header names before the `ok()` guard comparisons (closes V-1 / `IN-01`).
3. Give the two HMAC domains a distinct prefix (closes F-5 / `IN-07`).
4. Decide, and record, whether `sharp`'s transitive presence is acceptable under FR-17,
   and soften `check-named-packages.mjs`'s success line so it does not contradict its own
   exception lines (F-1).
5. Make `/api/health`'s dynamic rendering a standing assertion rather than a one-time
   acceptance criterion (V-6).
6. Correct `single-writer-non-bypassability.md`'s step count and the two statements the
   fix pass made true (F-8).

---

Audited at `a195026` on 2026-09-21. 81 threats, 81 closed, 0 open.
