/* ================================================================
   ROUTE SUITE — the curl A-H checks and D-04's clamp, over the wire
   (D-09, D-10, D-04)

   Naming: the recursive test glob under scripts/ is verified this
   session to match nested directories, so it already collects
   scripts/lib/server.test.mjs and scripts/lib/support.test.mjs — a
   file named `scripts/server/route-suite.test.mjs` would therefore be
   collected by the pre-build `fixture-suite` step and fail for want of a `.next`
   directory (this suite starts the already-built production server;
   it has nothing to start before that build exists). The `.proof.mjs`
   suffix keeps this file outside that glob; its own explicit,
   non-globbed STEPS entry (added in this file's own follow-up commit)
   runs it after the gate's build step.

   Lifecycle: `before()`/`after()` start and stop the server once for
   the whole file, rather than a single top-level test wrapping
   everything in try/finally — each lettered curl check is its own
   named `test()` so the output reads one-to-one against the roadmap's
   success criterion; collapsing that into one pass/fail line would
   lose exactly the mapping the suite exists to prove.

   This suite never builds the bundle itself: the gate's own STEPS
   already produced the `.next` directory a step earlier, and this
   file only ever starts a server against what is already there
   (unlike scripts/check-wcag.mjs, which is also runnable standalone
   and so builds its own).

   Port: distinct from scripts/check-wcag.mjs's own port, since both
   can run inside the same verify sequence and must never collide.

   CAPTURE_SESSION_KEY: `next start` runs under a production-like
   NODE_ENV the same way the earlier build step does, so
   lib/session/key.ts's lazy resolver would otherwise refuse the very
   first request. A
   throwaway value at least sixteen characters long is supplied in the
   child's own environment only, never the parent shell's.

   CAPTURE_BUILD_ID: empirically, `next start` reloads next.config.ts's
   own build-id gate exactly as the earlier build step does —
   reproduced directly against this repository, not assumed from the
   research note that mentioned only the session key. This file
   resolves its own copy via `git rev-parse --short HEAD` in the
   child environment only, mirroring scripts/verify.mjs's identical
   D-03 resolution, so this suite starts cleanly whether it runs
   standalone or as a STEP inside that gate.

   Readiness probe: GET /api/health, not `/` — it is the route under
   test, and a health response that answers proves the exact thing
   curl check H needs.

   Every request this suite makes is issued through `capFetch` below
   (directly, or via a `cookieJar` built on top of it), so
   NFR-F1's universal-header assertion runs automatically on every
   response the suite ever sees — a check cannot forget it.
   ================================================================ */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execSync } from "node:child_process";
import http from "node:http";
import { createRequire } from "node:module";
import { startServer, stopServer } from "../lib/server.mjs";
import {
  assertUniversalHeaders,
  assertNoSuccessOnlyHeaders,
  compareResponses,
  cookieJar,
  snapshot,
} from "./route-assertions.mjs";
import { CONFLICT_COPY, TRANSPORT_COPY } from "../../lib/copy/conflicts.ts";

const require = createRequire(import.meta.url);
/* Resolved through node_modules, so the server can be started directly
   by process.execPath with no intermediate shell — scripts/lib/server.mjs's
   own header explains why a shell-wrapped server is the bug this
   pattern avoids. Same resolution scripts/check-wcag.mjs already uses. */
const NEXT_BIN = require.resolve("next/dist/bin/next");

const PORT = 4312;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = 60_000;

const EMPTY_SHA256 = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
const SMALL_THUMB_BASE64 = Buffer.from("route-suite-thumb").toString("base64");

/* ---------------------------------------------------------------
   shared, mutable across the lettered checks — the suite's own
   design has each check build on state an earlier one produced
   (B's minted client_id and observation_ids feed D and E, exactly as
   this plan's own task text describes), so node:test's default
   in-file definition order is load-bearing here, not incidental.
   --------------------------------------------------------------- */
let serverProcess;
let getOutput = () => "";
let capFetch;
let mabasoJar;
let naidooJar;
let mabasoSession;
let checkBState;
let checkDAcceptedProposalId;

function isoNow() {
  return new Date().toISOString();
}

function buildCaptureBody({ orderId, assetId, kind = "photo", mime = "image/jpeg", purpose = "verify", extra = {} }) {
  return {
    client_id: randomUUID(),
    order_id: orderId,
    asset_id: assetId,
    kind,
    purpose,
    captured_at: isoNow(),
    sha256: EMPTY_SHA256,
    bytes: 1024,
    mime,
    thumb: SMALL_THUMB_BASE64,
    ...extra,
  };
}

async function waitForHealth(deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return true;
    } catch {
      /* not answering yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

/** D-03's own resolution, mirrored here (never written to the parent
    shell) because `next start` reloads next.config.ts's build-id gate
    exactly as the earlier build step does — reproduced directly
    against this repository this session. */
function resolveCaptureBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || process.env.CAPTURE_BUILD_ID) {
    return {};
  }
  try {
    return { CAPTURE_BUILD_ID: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim() };
  } catch {
    return {};
  }
}

function startCaptureServer() {
  const childEnv = {
    ...process.env,
    CAPTURE_SESSION_KEY: process.env.CAPTURE_SESSION_KEY ?? "route-suite-throwaway-key-000000",
    ...resolveCaptureBuildId(),
  };
  const child = startServer(process.execPath, [NEXT_BIN, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: childEnv,
  });
  let output = "";
  /* drain stdio so the child never blocks on a full pipe buffer */
  child.stdout?.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    output += chunk;
  });
  return { child, getOutput: () => output };
}

/** The wrapper every request in this suite goes through, directly or
    via a cookieJar built on it — NFR-F1's universal-header assertion
    runs on every response this suite ever sees, so a check cannot
    forget it. */
async function makeCapFetch() {
  return async function capFetch(url, init = {}) {
    const response = await fetch(url, init);
    const method = init.method ?? "GET";
    assertUniversalHeaders(response, `${method} ${new URL(url).pathname}`);
    return response;
  };
}

/** A GET request that carries a JSON body — the Fetch API's own
    Request constructor refuses this outright ("Request with GET/HEAD
    method cannot have body", verified this session), so this one
    literal case in REQ-FR-4's negative set goes through node:http
    directly instead. Returns the same `{ status, bodyText, headers }`
    shape route-assertions.mjs already expects. */
function rawGetWithBody(urlString, { cookie, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          "content-type": "application/json",
          ...(payload !== undefined ? { "content-length": Buffer.byteLength(payload) } : {}),
          ...(cookie ? { cookie } : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const headers = {};
          for (const [name, value] of Object.entries(response.headers)) {
            headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
          }
          resolve({ status: response.statusCode, bodyText: Buffer.concat(chunks).toString("utf8"), headers });
        });
      },
    );
    request.on("error", reject);
    if (payload !== undefined) request.write(payload);
    request.end();
  });
}

function jarCookieHeader(jar) {
  return [...jar.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function mintSession(jar, personaId) {
  const response = await jar.fetch(`${BASE_URL}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ persona_id: personaId }),
  });
  assert.equal(response.status, 201, `mintSession(${personaId}): expected 201, got ${response.status}`);
  return response.json();
}

/* ---------------------------------------------------------------
   lifecycle
   --------------------------------------------------------------- */

before(async () => {
  const started = startCaptureServer();
  serverProcess = started.child;
  getOutput = started.getOutput;
  const ready = await waitForHealth(READY_TIMEOUT_MS);
  if (!ready) {
    const output = getOutput();
    await stopServer(serverProcess);
    throw new Error(
      `the production server at ${BASE_URL} did not answer /api/health within ${READY_TIMEOUT_MS / 1000}s\n${output.slice(-4000)}`,
    );
  }
  capFetch = await makeCapFetch();
});

after(async () => {
  await stopServer(serverProcess);
});

/* ---------------------------------------------------------------
   A-H — the seed's curl suite, over fetch
   --------------------------------------------------------------- */

test("A — identity from session, orders filtered by it", async () => {
  mabasoJar = cookieJar(capFetch);
  const minted = await mintSession(mabasoJar, "acc-mabaso");
  mabasoSession = minted.session;

  const mabasoOrders = await mabasoJar.fetch(`${BASE_URL}/api/orders`);
  assert.equal(mabasoOrders.status, 200);
  assert.equal(mabasoOrders.headers.get("x-cap-account"), "acc-mabaso");
  const mabasoBody = await mabasoOrders.json();
  assert.deepEqual(
    mabasoBody.orders.map((order) => order.id).sort(),
    ["wo-0142", "wo-0151"],
  );

  naidooJar = cookieJar(capFetch);
  await mintSession(naidooJar, "acc-naidoo");
  const naidooOrders = await naidooJar.fetch(`${BASE_URL}/api/orders`);
  assert.equal(naidooOrders.status, 200);
  const naidooBody = await naidooOrders.json();
  assert.deepEqual(
    naidooBody.orders.map((order) => order.id),
    ["wo-0137"],
  );

  const noSession = await capFetch(`${BASE_URL}/api/orders`);
  assert.equal(noSession.status, 401);

  const crossOrder = await mabasoJar.fetch(`${BASE_URL}/api/orders/wo-0137`);
  assert.equal(crossOrder.status, 404);
});

test("B — verification authored and saying so in a header", async () => {
  /* D-05's clock gate: a verify-purpose capture is refused
     order_closed unless the order already has a running segment. Not
     spelled out in the seed's own curl sketch, but load-bearing in
     the shipped writer — opened here so this check's own 201 is
     reachable. */
  const openResponse = await mabasoJar.fetch(`${BASE_URL}/api/orders/wo-0142/open`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: randomUUID() }),
  });
  assert.equal(openResponse.status, 200);

  const body = buildCaptureBody({ orderId: "wo-0142", assetId: "m-ap003" });
  const response = await mabasoJar.fetch(`${BASE_URL}/api/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-cap-verification"), "authored");
  assert.equal(response.headers.get("x-cap-proposals"), "3");
  const json = await response.json();
  assert.equal(json.verification.confidence, null);
  assert.equal(json.verification.method, "authored");
  assert.equal(json.proposals.length, 3);
  for (const proposal of json.proposals) {
    assert.ok(
      typeof proposal.observation_id === "string" && proposal.observation_id.length > 0,
      "every returned proposal must carry a non-empty observation_id",
    );
  }
  checkBState = { clientId: body.client_id, proposals: json.proposals };
});

test("C — asset must belong to the order", async () => {
  const body = buildCaptureBody({ orderId: "wo-0142", assetId: "m-gs001" });
  const response = await mabasoJar.fetch(`${BASE_URL}/api/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 409);
  const json = await response.json();
  assert.equal(json.error, "asset_not_in_order");
  assert.equal(json.detail, CONFLICT_COPY.asset_not_in_order.sentence);
});

test("D — decided_by in the body ignored and the acting account stamped", async () => {
  const proposal = checkBState.proposals[0];
  const body = {
    client_id: randomUUID(),
    proposal_id: proposal.id,
    capture_client_id: checkBState.clientId,
    observation_id: proposal.observation_id,
    outcome: "accept",
    decided_at: isoNow(),
    decided_where_claimed: "online",
    decided_by: "acc-vanwyk",
  };
  const response = await mabasoJar.fetch(`${BASE_URL}/api/decisions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 201);
  const text = await response.text();
  assert.ok(!text.includes("acc-vanwyk"), "the submitted decided_by must appear nowhere in the raw response text");
  const json = JSON.parse(text);
  assert.equal(json.decision.decided_by, "acc-mabaso");
  checkDAcceptedProposalId = proposal.id;
});

test("E — rejections retained in the walk route", async () => {
  const rejectedProposal = checkBState.proposals[1];
  const body = {
    client_id: randomUUID(),
    proposal_id: rejectedProposal.id,
    capture_client_id: checkBState.clientId,
    observation_id: rejectedProposal.observation_id,
    outcome: "reject",
    decided_at: isoNow(),
    decided_where_claimed: "online",
  };
  const decisionResponse = await mabasoJar.fetch(`${BASE_URL}/api/decisions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(decisionResponse.status, 201);

  const walkResponse = await mabasoJar.fetch(`${BASE_URL}/api/walk/wo-0142`);
  assert.equal(walkResponse.status, 200);
  assert.ok(walkResponse.headers.has("x-cap-walk-facts"));
  assert.equal(walkResponse.headers.get("x-cap-redaction"), "none");
  const walk = await walkResponse.json();
  const asset = walk.assets.find((entry) => entry.asset_id === "m-ap003");
  assert.ok(asset, "m-ap003 must be present in the walk payload");
  assert.ok(asset.candidate_facts.some((proposal) => proposal.id === checkDAcceptedProposalId));
  assert.ok(asset.rejected.some((proposal) => proposal.id === rejectedProposal.id));
  assert.ok(
    !asset.open.some((proposal) => proposal.id === checkDAcceptedProposalId || proposal.id === rejectedProposal.id),
  );
  assert.equal(walk.redaction.ran, false);
  assert.deepEqual(walk.referrals, []);
});

test("F — sync idempotency", async () => {
  const item = {
    client_id: randomUUID(),
    kind: "capture",
    schema_version: 1,
    order_id: "wo-0142",
    created_at: isoNow(),
    attempts: 1,
    state: "sending",
    claimed_account_id: "acc-mabaso",
    payload: buildCaptureBody({ orderId: "wo-0142", assetId: "m-aa101", purpose: "evidence" }),
  };

  const first = await mabasoJar.fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: [item] }),
  });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("x-cap-sync-recorded"), "1");
  const firstJson = await first.json();
  assert.equal(firstJson.results[0].status, "recorded");

  const second = await mabasoJar.fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: [item] }),
  });
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("x-cap-sync-duplicate"), "1");
  const secondJson = await second.json();
  assert.equal(secondJson.results[0].status, "duplicate");

  const changedItem = { ...item, payload: { ...item.payload, bytes: item.payload.bytes + 1 } };
  const third = await mabasoJar.fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: [changedItem] }),
  });
  assert.equal(third.status, 200);
  assert.equal(third.headers.get("x-cap-sync-conflict"), "1");
  const thirdJson = await third.json();
  assert.equal(thirdJson.results[0].code, "already_recorded_differently");
});

test("D-04 — a queued order_open is clamped and read back with source: device_reconciled", async () => {
  /* Three minutes behind "now": comfortably inside both the floor
     slack and the future tolerance around this account's own
     last-contact floor (every request so far has kept it fresh), so
     the item is recorded rather than refused clock_skew. */
  const deviceClaimedOpenedAt = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const item = {
    client_id: randomUUID(),
    kind: "order_open",
    schema_version: 1,
    order_id: "wo-0151",
    created_at: isoNow(),
    attempts: 1,
    state: "queued",
    claimed_account_id: "acc-mabaso",
    payload: { device_claimed_opened_at: deviceClaimedOpenedAt },
  };
  const response = await mabasoJar.fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: [item] }),
  });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.results[0].status, "recorded");

  const hoursResponse = await mabasoJar.fetch(`${BASE_URL}/api/hours`);
  const hoursBody = await hoursResponse.json();
  const clock = hoursBody.clocks.find((entry) => entry.order_id === "wo-0151");
  assert.ok(clock, "wo-0151's clock must be present");
  const segment = clock.segments.find((entry) => entry.source === "device_reconciled");
  assert.ok(segment, "a device_reconciled segment must be present");
  assert.equal(segment.device_claimed_opened_at, deviceClaimedOpenedAt);
  assert.equal(typeof segment.device_offset_s, "number");
  assert.ok(
    Date.parse(segment.opened_at) >= Date.parse(mabasoSession.issued_at),
    "opened_at must never land before the session's own issued_at",
  );

  /* Closed here so check G's own fresh open below creates a new,
     unambiguous server-sourced segment rather than landing on this
     still-running one's D-06/FR-7 duplicate-open branch. */
  const closeResponse = await mabasoJar.fetch(`${BASE_URL}/api/orders/wo-0151/close`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: randomUUID() }),
  });
  assert.equal(closeResponse.status, 200);
});

test("G — hours accrue server-side and a write to the hours route returns 405", async () => {
  const openResponse = await mabasoJar.fetch(`${BASE_URL}/api/orders/wo-0151/open`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: randomUUID() }),
  });
  assert.equal(openResponse.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const hoursResponse = await mabasoJar.fetch(`${BASE_URL}/api/hours`);
  assert.equal(hoursResponse.status, 200);
  const hoursBody = await hoursResponse.json();
  const clock = hoursBody.clocks.find((entry) => entry.order_id === "wo-0151");
  assert.ok(clock, "wo-0151's clock must be present");
  const openSegment = clock.segments.find((entry) => entry.closed_at === null);
  assert.ok(openSegment, "a running segment must be present");
  assert.equal(openSegment.source, "server");
  assert.ok(clock.elapsed_s >= 1, `expected elapsed_s >= 1, got ${clock.elapsed_s}`);

  const postResponse = await mabasoJar.fetch(`${BASE_URL}/api/hours`, { method: "POST" });
  assert.equal(postResponse.status, 405);
  const postJson = await postResponse.json();
  assert.equal(postJson.error, "method_not_allowed");
  assert.equal(postJson.detail, TRANSPORT_COPY.method_not_allowed.sentence);
  /* postResponse already passed through capFetch's own automatic
     assertUniversalHeaders call above — this is the concrete proof
     that a hand-written refusal carries the universal set Next's own
     auto-405 never would (03-RESEARCH.md Pitfall 2). */
});

test("H — X-CAP-Instance constant across calls and changed after restart", async () => {
  const first = await capFetch(`${BASE_URL}/api/health`);
  const second = await capFetch(`${BASE_URL}/api/health`);
  const third = await capFetch(`${BASE_URL}/api/health`);
  const instanceIds = [first, second, third].map((response) => response.headers.get("x-cap-instance"));
  assert.equal(instanceIds[0], instanceIds[1]);
  assert.equal(instanceIds[1], instanceIds[2]);

  await stopServer(serverProcess);
  const restarted = startCaptureServer();
  serverProcess = restarted.child;
  getOutput = restarted.getOutput;
  const ready = await waitForHealth(READY_TIMEOUT_MS);
  if (!ready) {
    throw new Error(
      `the restarted production server at ${BASE_URL} did not answer /api/health within ${READY_TIMEOUT_MS / 1000}s\n${getOutput().slice(-4000)}`,
    );
  }

  /* The local half of curl check H. The platform's own cold-start
     half — a real deployment's instance identifier changing across a
     genuine redeploy — is the human-run script's, per D-09(b). */
  const afterRestart = await capFetch(`${BASE_URL}/api/health`);
  const newInstanceId = afterRestart.headers.get("x-cap-instance");
  assert.notEqual(newInstanceId, instanceIds[0]);
});
