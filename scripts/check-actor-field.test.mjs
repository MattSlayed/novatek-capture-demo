/* ================================================================
   ACTOR-FIELD CHECK — fixture proof (AD-3, FR-23, FR-57, D-23)

   Proves check-actor-field.mjs exits non-zero on each violation
   class, and exits 0 on the shapes this repository's own already-
   shipped code actually uses (a ternary built from safe primitives,
   a bare identifier, a lookalike identity field) — from throwaway
   directories that never touch the repository, plus one real proof
   against this repository's own source.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

function validateFixture(decisionsBodyExtra = "", decisionPayloadExtra = "") {
  return `export const ACCEPTED_BODY_FIELDS = {
  decisions: ["client_id", "proposal_id", "capture_client_id", "observation_id", "outcome"${decisionsBodyExtra}],
};
export const ACCEPTED_PAYLOAD_FIELDS = {
  decision: ["proposal_id", "capture_client_id", "observation_id"${decisionPayloadExtra}],
};
`;
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-actor-field.mjs");
  assert.equal(code, 0, stdout + stderr);
});

test("a fixture where app/api/decisions/route.ts assigns decided_by: exits non-zero and quotes the line", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "app/api/decisions/route.ts": `export function build(body) {
  return { decided_by: body.account_id };
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/decisions\/route\.ts/);
      assert.match(stdout, /decided_by/);
    },
  );
});

test("a fixture where lib/walk/payload.ts assigns captured_by: exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "lib/walk/payload.ts": `export function build(account) {
  return { captured_by: account.account_id };
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/walk\/payload\.ts/);
      assert.match(stdout, /captured_by/);
    },
  );
});

test("a fixture where lib/reconcile/apply.ts assigns decided_by: body.decided_by exits non-zero — a permitted assigner with a forbidden right-hand side", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "lib/reconcile/apply.ts": `export function build(body) {
  return { decided_by: body.decided_by };
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/reconcile\/apply\.ts/);
      assert.match(stdout, /decided_by/);
    },
  );
});

test("a fixture where lib/reconcile/apply.ts assigns decided_by: account.account_id exits 0", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "lib/reconcile/apply.ts": `export function build(account) {
  return { decided_by: account.account_id };
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a fixture where lib/reconcile/apply.ts assigns decided_by through a ternary built from safe primitives exits 0 — the real repository's own shape", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "lib/reconcile/apply.ts": `export function build(account) {
  return { decided_by: account ? account.account_id : null };
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a fixture where a route mentions decided_by only in a comment exits 0", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "app/api/decisions/route.ts": `// decided_by is dropped at parse and stamped by the writer instead.
export function build() {
  return {};
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("a fixture where a route reads body.decided_by exits non-zero — the route-schema read side", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "app/api/decisions/route.ts": `export function build(body) {
  return body.decided_by;
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /app\/api\/decisions\/route\.ts/);
    },
  );
});

test("a fixture whose lib/reconcile/validate.ts adds decided_by to ACCEPTED_BODY_FIELDS.decisions exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "lib/reconcile/validate.ts": validateFixture(', "decided_by"'),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /decided_by/);
    },
  );
});

test("a fixture whose enumeration contains the AD-5 identity pair (capture_client_id, observation_id) exits 0, and a bare account_id in the same enumeration exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "lib/reconcile/validate.ts": validateFixture(', "claimed_account_id", "account_id"'),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      // The lookalikes (claimed_account_id, capture_client_id,
      // observation_id — the latter two already in every fixture's
      // base list) must not themselves be reported; only the bare
      // account_id is a problem, proving whole-name comparison rather
      // than assuming it.
      assert.match(stdout, /Problems: 1/);
      assert.match(stdout, /"account_id"/);
    },
  );
});

test("a fixture where app/api/orders/route.ts reads rbac_tier exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": `{}`,
      "app/api/orders/route.ts": `export function decide(artisan) {
  return artisan.rbac_tier === "site_supervisor";
}
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /rbac_tier/);
    },
  );
});

test("a fixture where a second module imports ORDER_IDS_BY_ARTISAN exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": `{
  "compilerOptions": { "paths": { "@/*": ["./*"] } }
}
`,
      "lib/data/artisans.ts": `export const ORDER_IDS_BY_ARTISAN = {};\n`,
      "lib/reports/summary.ts": `import { ORDER_IDS_BY_ARTISAN } from "../data/artisans.ts";
export const count = Object.keys(ORDER_IDS_BY_ARTISAN).length;
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/reports\/summary\.ts/);
      assert.match(stdout, /ORDER_IDS_BY_ARTISAN/);
    },
  );
});

test("a fixture where a second module binds lib/data/artisans.ts as a namespace exits non-zero", async () => {
  // ORDER_IDS_BY_ARTISAN appears nowhere in this module's own source
  // text, and it is reachable through the namespace binding like any
  // other export — the shape the importer sweep used to be blind to.
  await withFixture(
    {
      "tsconfig.json": `{
  "compilerOptions": { "paths": { "@/*": ["./*"] } }
}
`,
      "lib/data/artisans.ts": `export const ORDER_IDS_BY_ARTISAN = {};\n`,
      "lib/reports/summary.ts": `import * as artisans from "../data/artisans.ts";
export const count = Object.keys(artisans.ORDER_IDS_BY_ARTISAN).length;
`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/reports\/summary\.ts/);
      assert.match(stdout, /namespace/);
    },
  );
});

test("a fixture where a second module re-exports ORDER_IDS_BY_ARTISAN under another name exits non-zero", async () => {
  await withFixture(
    {
      "tsconfig.json": `{
  "compilerOptions": { "paths": { "@/*": ["./*"] } }
}
`,
      "lib/data/artisans.ts": `export const ORDER_IDS_BY_ARTISAN = {};\n`,
      "lib/reports/summary.ts": `export { ORDER_IDS_BY_ARTISAN as orderIds } from "../data/artisans.ts";\n`,
      "lib/reconcile/validate.ts": validateFixture(),
    },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/check-actor-field.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.match(stdout, /lib\/reports\/summary\.ts/);
      assert.match(stdout, /ORDER_IDS_BY_ARTISAN/);
    },
  );
});
