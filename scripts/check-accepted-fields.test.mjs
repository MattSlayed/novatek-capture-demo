/* ================================================================
   ACCEPTED-FIELDS CHECK — fixture proof (AD-20, D-23)

   Every fixture below starts from a clean, fully-wired baseline tree
   (a validate.ts whose two records exactly match
   check-accepted-fields.mjs's own EXPECTED_ROUTES/EXPECTED_PAYLOADS,
   plus all seven write routes each calling pick() with their own
   key) and mutates exactly one thing, so each test proves one
   violation class in isolation.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

const CLEAN_VALIDATE = `export const ACCEPTED_BODY_FIELDS = {
  session: ["persona_id"],
  orders_open: ["client_id"],
  orders_close: ["client_id"],
  verify: ["client_id","order_id","asset_id","kind","purpose","captured_at","sha256","bytes","mime","duration_ms","thumb"],
  captures: ["client_id","order_id","asset_id","kind","purpose","captured_at","sha256","bytes","mime","duration_ms","thumb"],
  decisions: ["client_id","proposal_id","capture_client_id","observation_id","outcome","decided_at","decided_where_claimed","note"],
  sync: ["items"],
};
export const ACCEPTED_PAYLOAD_FIELDS = {
  order_open: ["device_claimed_opened_at"],
  order_close: ["device_claimed_closed_at"],
  capture: ["asset_id","kind","purpose","captured_at","sha256","bytes","mime","duration_ms","thumb"],
  decision: ["proposal_id","capture_client_id","observation_id","outcome","decided_at","decided_where_claimed","note"],
  referral: [],
};
export function pick(body, fields) {
  const result = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) result[f] = body[f];
  }
  return result;
}
`;

function routeCallingPick(relPathToLib, routeKey) {
  return `import { pick, ACCEPTED_BODY_FIELDS } from "${relPathToLib}";
export function POST(body) { return pick(body, ACCEPTED_BODY_FIELDS.${routeKey}); }
`;
}

function baselineFiles(overrides = {}) {
  const files = {
    "tsconfig.json": `{}`,
    "lib/reconcile/validate.ts": CLEAN_VALIDATE,
    "app/api/session/route.ts": routeCallingPick("../../../lib/reconcile/validate.ts", "session"),
    "app/api/orders/[id]/open/route.ts": routeCallingPick(
      "../../../../../lib/reconcile/validate.ts",
      "orders_open",
    ),
    "app/api/orders/[id]/close/route.ts": routeCallingPick(
      "../../../../../lib/reconcile/validate.ts",
      "orders_close",
    ),
    "app/api/verify/route.ts": routeCallingPick("../../../lib/reconcile/validate.ts", "verify"),
    "app/api/captures/route.ts": routeCallingPick("../../../lib/reconcile/validate.ts", "captures"),
    "app/api/decisions/route.ts": routeCallingPick("../../../lib/reconcile/validate.ts", "decisions"),
    "app/api/sync/route.ts": routeCallingPick("../../../lib/reconcile/validate.ts", "sync"),
  };
  return { ...files, ...overrides };
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-accepted-fields.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a clean baseline tree exits 0", async () => {
  await withFixture(baselineFiles(), async (dir) => {
    const { code, stdout, stderr } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
    assert.equal(code, 0, stdout + stderr);
  });
});

test("a fixture whose validate.ts drops sha256 from the capture enumeration exits non-zero", async () => {
  const validate = CLEAN_VALIDATE.replace(
    `capture: ["asset_id","kind","purpose","captured_at","sha256","bytes","mime","duration_ms","thumb"],`,
    `capture: ["asset_id","kind","purpose","captured_at","bytes","mime","duration_ms","thumb"],`,
  );
  await withFixture(baselineFiles({ "lib/reconcile/validate.ts": validate }), async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /sha256/);
  });
});

test("a fixture whose validate.ts drops capture_client_id from the decisions enumeration exits non-zero naming the field", async () => {
  const validate = CLEAN_VALIDATE.replace(
    `decisions: ["client_id","proposal_id","capture_client_id","observation_id","outcome","decided_at","decided_where_claimed","note"],`,
    `decisions: ["client_id","proposal_id","observation_id","outcome","decided_at","decided_where_claimed","note"],`,
  );
  await withFixture(baselineFiles({ "lib/reconcile/validate.ts": validate }), async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /capture_client_id/);
  });
});

test("a fixture whose validate.ts adds observation to the decision payload enumeration exits non-zero, while observation_id in the same array does not trip the rule", async () => {
  const validate = CLEAN_VALIDATE.replace(
    `decision: ["proposal_id","capture_client_id","observation_id","outcome","decided_at","decided_where_claimed","note"],`,
    `decision: ["proposal_id","capture_client_id","observation_id","observation","outcome","decided_at","decided_where_claimed","note"],`,
  );
  await withFixture(baselineFiles({ "lib/reconcile/validate.ts": validate }), async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /"observation"/);
    // observation_id must never be named as the offending field itself.
    assert.doesNotMatch(stdout, /forbidden field "observation_id"/);
  });
});

test("a fixture whose validate.ts adds decided_by exits non-zero", async () => {
  const validate = CLEAN_VALIDATE.replace(
    `decisions: ["client_id","proposal_id","capture_client_id","observation_id","outcome","decided_at","decided_where_claimed","note"],`,
    `decisions: ["client_id","proposal_id","capture_client_id","observation_id","outcome","decided_at","decided_where_claimed","note","decided_by"],`,
  );
  await withFixture(baselineFiles({ "lib/reconcile/validate.ts": validate }), async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /decided_by/);
  });
});

test("a fixture whose validate.ts adds an unexpected but harmless field exits non-zero — the declared-but-unexpected half", async () => {
  const validate = CLEAN_VALIDATE.replace(`sync: ["items"],`, `sync: ["items","spare_field"],`);
  await withFixture(baselineFiles({ "lib/reconcile/validate.ts": validate }), async (dir) => {
    const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stdout, /spare_field/);
    assert.match(stdout, /declared-but-unexpected/);
  });
});

test("a fixture where app/api/decisions/route.ts has no pick( call exits non-zero", async () => {
  await withFixture(
    baselineFiles({
      "app/api/decisions/route.ts": `export function POST(body) { return body; }\n`,
    }),
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/decisions\/route\.ts/);
    },
  );
});

test("a fixture that adds app/api/referrals/route.ts with a POST export exits non-zero naming it as an unenumerated write route", async () => {
  await withFixture(
    baselineFiles({
      "app/api/referrals/route.ts": routeCallingPick("../../../lib/reconcile/validate.ts", "referrals"),
    }),
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/referrals\/route\.ts/);
      assert.match(stdout, /"referrals"/);
      assert.match(stdout, /not in EXPECTED_ROUTES/);
    },
  );
});

test("a fixture where app/api/hours/route.ts has a hand-written POST refusal with no pick( call exits 0 — a route accepting no fields has nothing to enumerate", async () => {
  await withFixture(
    baselineFiles({
      "app/api/hours/route.ts": `export function POST() { return { status: 405 }; }\n`,
    }),
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-accepted-fields.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
