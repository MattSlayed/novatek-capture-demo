/* ================================================================
   CLAIMS AUDIT — fixture proof (D-23)

   Every D-18 register addition gets a matched pair: a MUST-TRIP
   fixture (asserted non-zero) and a MUST-PASS near-miss (asserted 0)
   that proves the entry is scoped, not a word ban. Every entry
   carrying `allowQuoted` also gets an EXCUSED fixture, placing the
   trigger phrase within a RETIREMENT_MARKER's three-line context
   window (asserted 0). Two D-18-named additions — "simulation" and
   "records never cross the border" — are already inherited from
   ipv-demo verbatim; their tests prove the phrase is caught exactly
   once (not twice, which would mean it was duplicated into a second
   register entry) and that their inherited `allowQuoted` still works.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { withFixture, runCheck } from "./lib/fixtures.mjs";

function hitsCount(stdout) {
  const m = /Hits:\s*(\d+)/.exec(stdout);
  return m ? Number(m[1]) : null;
}

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs");
  assert.equal(code, 0, stdout + stderr);
});

/* ---------------------------------------------------------------
   Funding alternation (Rule 1's alternation gains "funded by this round")
   --------------------------------------------------------------- */

test("funding alternation: trips on 'funded by this round'", async () => {
  await withFixture(
    { "lib/fixture.md": "This work is funded by this round of investment." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("funding alternation: passes a different funding source", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "This work is funded by the client's own capital budget.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("funding alternation: excused when quoted to retire it", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "retired claim, never restate: funded by this round",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Findings-verb family
   --------------------------------------------------------------- */

test("findings-verb family: trips on 'writes a finding'", async () => {
  await withFixture(
    { "lib/fixture.md": "The artisan writes a finding against the asset." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("findings-verb family: passes 'writes an observation'", async () => {
  await withFixture(
    {
      "lib/fixture.md": "The artisan writes an observation against the asset.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("findings-verb family: excused as 'never as a finding'", async () => {
  await withFixture(
    { "lib/fixture.md": "The verification is authored, never as a finding." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("findings-verb family: 'Matched to record, and no model ran.' does not fail the build", async () => {
  await withFixture(
    { "lib/fixture.md": "Matched to record, and no model ran." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Camera-detects family (subject-guarded)
   --------------------------------------------------------------- */

test("camera-detects family: trips on 'the camera detects corrosion'", async () => {
  await withFixture(
    { "lib/fixture.md": "The camera detects corrosion on the unit." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("camera-detects family: passes a sentence with no subject noun and no detect-verb", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "The artisan photographs the unit and the record names the corrosion.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Performance figures
   --------------------------------------------------------------- */

test("performance figures (pattern one): trips on '40% faster'", async () => {
  await withFixture(
    { "lib/fixture.md": "Capture is 40% faster." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("performance figures (pattern one): passes a figure with no achievement verb", async () => {
  await withFixture(
    { "lib/fixture.md": "The gauge reads 40% relative humidity." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("performance figures (pattern two): trips on 'in under 30 seconds'", async () => {
  await withFixture(
    { "lib/fixture.md": "The capture completes in under 30 seconds." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("performance figures (pattern two): passes prose instead of a numeral", async () => {
  await withFixture(
    { "lib/fixture.md": "The photograph is taken in under two minutes." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Staffing framing (already inherited verbatim — not duplicated;
   found during this task, not flagged in 01-PATTERNS.md)
   --------------------------------------------------------------- */

test("staffing framing: trips on 'reduces headcount'", async () => {
  await withFixture(
    { "lib/fixture.md": "Capture reduces headcount on the plant." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("staffing framing: passes the same verb with a different object", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "Capture reduces reliance on paper by moving the record to the phone.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Server-persistence family
   --------------------------------------------------------------- */

test("server-persistence family: trips on 'persisted to a database'", async () => {
  await withFixture(
    { "lib/fixture.md": "The capture is persisted to a database." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("server-persistence family: passes a denial of persistence", async () => {
  await withFixture(
    { "lib/fixture.md": "There is no database behind this preview." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   TRL claim
   --------------------------------------------------------------- */

test("TRL claim: trips on 'TRL 6'", async () => {
  await withFixture(
    { "lib/fixture.md": "Capture is at TRL 6." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("TRL claim: passes an asset tag that merely contains the letters TRL", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "The asset tag reads TRL-A17, which is a plant identifier and not a readiness claim.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("TRL claim: excused when quoted beside the out-of-scope marker", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "Capture is at TRL 6.\nout of scope: never claim any TRL for Capture as a product",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Competitor name
   --------------------------------------------------------------- */

test("competitor name: trips on 'Prevu3D'", async () => {
  await withFixture(
    { "lib/fixture.md": "Prevu3D covers the layout work." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("competitor name: passes the word-boundary case ('hexagonal' is not 'Hexagon')", async () => {
  await withFixture(
    { "lib/fixture.md": "The hexagonal bolt head is 24 mm across." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("competitor name: excused when quoted to record what is ceded", async () => {
  await withFixture(
    { "lib/fixture.md": "out of scope: Prevu3D and Siemens own this" },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Modelled savings as cash
   --------------------------------------------------------------- */

test("modelled savings as cash (pattern one): trips on 'R 1.2m saved'", async () => {
  await withFixture(
    { "lib/fixture.md": "R 1.2m saved on downtime last year." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("modelled savings as cash (pattern two): trips on 'saves R 40 000'", async () => {
  await withFixture(
    { "lib/fixture.md": "Capture saves R 40 000 a month." },
    async (dir) => {
      const { code } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});

test("modelled savings as cash: passes a work-order identifier with no saving verb nearby", async () => {
  await withFixture(
    { "lib/fixture.md": "Work order R 1024 is open." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   Inherited entries D-18 names that are already present — proving
   the overlap was documented, not duplicated into two findings.
   --------------------------------------------------------------- */

test("inherited 'simulation' entry: caught exactly once, not twice", async () => {
  await withFixture(
    { "lib/fixture.md": "The training module runs a simulation of the plant." },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.notEqual(code, 0);
      assert.equal(hitsCount(stdout), 1, stdout);
    },
  );
});

test("inherited 'simulation' entry: excused when quoted to retire it", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "The training module runs a simulation of the plant.\nThis is a prohibited word and must not be used to describe Capture.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

/* ---------------------------------------------------------------
   D-18 extension of the inherited prohibited-word entry: the forms
   its trailing word boundary leaves uncovered. The stem is assembled
   at runtime so this file never spells the word itself.
   --------------------------------------------------------------- */

const STEM = ["simu", "lat"].join("");

test("stem extension: trips on the plural noun form, caught exactly once", async () => {
  await withFixture(
    { "lib/fixture.md": `The training module runs ${STEM}ions of the plant.` },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.equal(hitsCount(stdout), 1, stdout);
    },
  );
});

test("stem extension: trips on the agent-noun form, caught exactly once", async () => {
  await withFixture(
    { "lib/fixture.md": `The plant ${STEM}or runs on a separate workstation.` },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.equal(hitsCount(stdout), 1, stdout);
    },
  );
});

test("stem extension: the singular noun is still caught exactly once (no double count with the inherited entry)", async () => {
  await withFixture(
    { "lib/fixture.md": `The training module runs a ${STEM}ion of the plant.` },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.notEqual(code, 0);
      assert.equal(hitsCount(stdout), 1, stdout);
    },
  );
});

test("stem extension: passes a look-alike that does not contain the stem", async () => {
  await withFixture(
    { "lib/fixture.md": "A stimulating talk on plant safety." },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("stem extension: passes a word that merely contains the stem past a word boundary", async () => {
  await withFixture(
    { "lib/fixture.md": `The report notes the dis${STEM}ion in the vendor claim.` },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("stem extension: excused when quoted to retire it", async () => {
  await withFixture(
    { "lib/fixture.md": `${STEM}ors is a prohibited word; never restate it in this preview.` },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", { cwd: dir });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});

test("inherited 'records never cross the border' entry: caught exactly once, not twice", async () => {
  await withFixture(
    { "lib/fixture.md": "Records never cross the border in this system." },
    async (dir) => {
      const { code, stdout } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.notEqual(code, 0);
      assert.equal(hitsCount(stdout), 1, stdout);
    },
  );
});

test("inherited 'records never cross the border' entry: excused when quoted to retire it", async () => {
  await withFixture(
    {
      "lib/fixture.md":
        "Records never cross the border in this system.\nRetired residency claim, never restate it.",
    },
    async (dir) => {
      const { code, stdout, stderr } = await runCheck("scripts/claims-audit.mjs", {
        cwd: dir,
      });
      assert.equal(code, 0, stdout + stderr);
    },
  );
});
