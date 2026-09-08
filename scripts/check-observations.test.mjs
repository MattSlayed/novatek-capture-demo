/* ================================================================
   AUTHORED-OBSERVATION CHECK — fixture proof (D-11, D-23)

   Proves check-observations.mjs exits non-zero on each violation
   class D-11 names — a missing comment, an unresolvable id and a
   drifted quote — plus the other classes D-09/D-10/D-08/D-12
   describe, from throwaway directories that never touch the
   repository.

   Every fixture tree carries the real lib/data/types.ts, plant.ts
   and observations.ts, read once from repoRoot(). All three import
   their types with `import type`, which Node's stripper erases, so
   no other file is needed in the tree.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFixture, runCheck, repoRoot } from "./lib/fixtures.mjs";

const TYPES_TS = await readFile(path.join(repoRoot(), "lib/data/types.ts"), "utf8");
const PLANT_TS = await readFile(path.join(repoRoot(), "lib/data/plant.ts"), "utf8");
const OBSERVATIONS_TS = await readFile(
  path.join(repoRoot(), "lib/data/observations.ts"),
  "utf8",
);

function fixtureFiles(observationsSource) {
  return {
    "lib/data/types.ts": TYPES_TS,
    "lib/data/plant.ts": PLANT_TS,
    "lib/data/observations.ts": observationsSource ?? OBSERVATIONS_TS,
  };
}

async function expectDefect(observationsSource, matcher) {
  await withFixture(fixtureFiles(observationsSource), async (dir) => {
    const { code, stdout, stderr } = await runCheck("scripts/check-observations.mjs", {
      cwd: dir,
    });
    assert.notEqual(code, 0, stdout + stderr);
    if (matcher) assert.match(stdout, matcher);
  });
}

/* ---------------------------------------------------------------
   the real repository
   --------------------------------------------------------------- */

test("the real repository exits 0", async () => {
  const { code, stdout, stderr } = await runCheck("scripts/check-observations.mjs");
  assert.equal(code, 0, stdout + stderr);
  assert.match(stdout, /Problems: 0/);
});

/* ---------------------------------------------------------------
   D-11's three named violation classes
   --------------------------------------------------------------- */

test("a missing // cites comment exits non-zero and names the observation", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    /\/\/ cites f-ap003-vib:.*\n(\s*\{\s*\n\s*id: "obs-ap003-disc",)/,
    "$1",
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /obs-ap003-disc/);
});

test("an unresolvable drawn_from id exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    '// cites f-ap003-vib: "Last vibration reading: 9.4 mm/s RMS"',
    '// cites f-does-not-exist: "Last vibration reading: 9.4 mm/s RMS"',
  ).replace('drawn_from: "f-ap003-vib",', 'drawn_from: "f-does-not-exist",');
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /does not resolve to any CitedFact id or Deviation id/);
});

test("a one-word drift in a quoted fact comment exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    "Last vibration reading: 9.4 mm/s RMS",
    "Last vibration reading: 9.9 mm/s RMS",
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /does not match the live fact "f-ap003-vib"/);
});

/* ---------------------------------------------------------------
   D-09's two plausible-but-uncitable id forms
   --------------------------------------------------------------- */

test("a drawn_from naming a machinery id exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    '// cites f-ap003-vib: "Last vibration reading: 9.4 mm/s RMS"',
    '// cites m-ap003: "Last vibration reading: 9.4 mm/s RMS"',
  ).replace('drawn_from: "f-ap003-vib",', 'drawn_from: "m-ap003",');
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /is a machinery id, not a CitedFact id or a Deviation id/);
});

test("a drawn_from naming the ncr_number display form exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    '// cites ncr-0118.immediate_action: "Isolation applied and tagged"',
    '// cites NCR-2026-0118.immediate_action: "Isolation applied and tagged"',
  ).replace('drawn_from: "ncr-0118",', 'drawn_from: "NCR-2026-0118",');
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /is the ncr_number display form, not the Deviation's bare id/);
});

/* ---------------------------------------------------------------
   D-10's fact and deviation fidelity rules
   --------------------------------------------------------------- */

test("a fact-cited comment missing its unit where the fact has one exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    '// cites f-as001-dp: "Differential pressure: 0.28 bar"',
    '// cites f-as001-dp: "Differential pressure: 0.28"',
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /does not match the live fact "f-as001-dp"/);
});

test("a deviation-cited comment naming a field that is not a key on the record exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    "// cites ncr-0118.immediate_action:",
    "// cites ncr-0118.not_a_real_field:",
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /is not a key on deviation "ncr-0118"/);
});

test("a deviation-cited comment whose quoted text is not a contiguous substring of the field exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    '// cites ncr-0118.immediate_action: "Isolation applied and tagged"',
    '// cites ncr-0118.immediate_action: "Something else entirely"',
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(
    mutated,
    /does not appear verbatim in "ncr-0118\.immediate_action"/,
  );
});

/* ---------------------------------------------------------------
   comment/field pairing and the D-08 asset exclusion
   --------------------------------------------------------------- */

test("a comment whose id no longer matches its observation's drawn_from exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    '// cites f-ap003-vib: "Last vibration reading: 9.4 mm/s RMS"',
    '// cites f-ap003-status: "Last vibration reading: 9.4 mm/s RMS"',
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(
    mutated,
    /comment cites "f-ap003-status" but drawn_from is "f-ap003-vib"/,
  );
});

test("an observation added on m-aa102 exits non-zero (D-08)", async () => {
  const injected = OBSERVATIONS_TS.replace(
    "export const OBSERVATIONS: AuthoredObservation[] = [",
    [
      "export const OBSERVATIONS: AuthoredObservation[] = [",
      '  // cites f-aa102-state: "Position: Closed — isolation applied"',
      "  {",
      '    id: "obs-aa102-bad",',
      '    asset_id: "m-aa102",',
      '    kind: "corrosion_visible",',
      '    wording: "Corrosion is visible on the valve body.",',
      '    grade: "AMBIGUOUS",',
      '    drawn_from: "f-aa102-state",',
      '    relation: "context",',
      "  },",
    ].join("\n"),
  );
  assert.notEqual(injected, OBSERVATIONS_TS);
  await expectDefect(injected, /is on asset "m-aa102", which D-08 carries no observation for/);
});

/* ---------------------------------------------------------------
   the grade exclusion — belt and braces beside the type-level one
   --------------------------------------------------------------- */

test("a grade changed to EXTRACTED exits non-zero", async () => {
  const mutated = OBSERVATIONS_TS.replace(
    /(id: "obs-ap003-guard",[\s\S]*?grade: ")AMBIGUOUS(")/,
    "$1EXTRACTED$2",
  );
  assert.notEqual(mutated, OBSERVATIONS_TS);
  await expectDefect(mutated, /is not in OBSERVATION_GRADES/);
});
