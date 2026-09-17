/* ================================================================
   FIXTURE HASH CHECK

   Recomputes the SHA-256 over the four fixture files and compares it
   against the pin lib/data/fixtures.ts carries (D-14). Fixture
   content cannot change without that pin being re-cut and
   FIXTURE_VERSION bumped in the same commit — this check is what
   makes a fixture edit a deliberate act rather than a silent drift.

   The pin is imported from the working directory's own
   lib/data/fixtures.ts, never from a fixed path, so a fixture tree
   under test is always compared against that tree's own pin. A
   check that imported its expected value from a fixed location
   would pass every fixture unconditionally and prove nothing (T-2-30).

   Each file is read, converted to a UTF-8 string and every "\r\n" is
   replaced with "\n" before hashing. This workstation has
   core.autocrlf=true while GitHub Actions and Vercel check out LF;
   a digest over raw bytes would be a digest of the checkout's
   line-ending policy rather than of the content, and would fail in
   CI immediately after a legitimate local re-pin (RESEARCH Pitfall 2).

     node scripts/check-fixture-hash.mjs

   Exit 0 = clean. Exit 1 = at least one defect. Never warns, never
   skips, no flag or environment variable changes this check.
   ================================================================ */

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

const problems = [];

/* ---------------------------------------------------------------
   the four fixture files, in fixtures.ts's own hashing order
   --------------------------------------------------------------- */

const FIXTURE_PATHS = [
  "lib/data/plant.ts",
  "lib/data/artisans.ts",
  "lib/data/orders.ts",
  "lib/data/observations.ts",
];

const VERSION_SHAPE = /^capture-fixtures\/\d{4}\.\d{2}\.\d+$/;

/* ---------------------------------------------------------------
   the pin — imported from this working directory's own module, not
   a fixed path, so a fixture tree is always checked against its own
   pin (T-2-30)
   --------------------------------------------------------------- */

let FIXTURE_VERSION;
let FIXTURE_CONTENT_SHA256;
try {
  const fixturesUrl = pathToFileURL(
    path.join(process.cwd(), "lib/data/fixtures.ts"),
  ).href;
  ({ FIXTURE_VERSION, FIXTURE_CONTENT_SHA256 } = await import(fixturesUrl));
} catch (e) {
  problems.push(`could not import lib/data/fixtures.ts: ${e.message}`);
}

if (FIXTURE_VERSION !== undefined && !VERSION_SHAPE.test(FIXTURE_VERSION)) {
  problems.push(
    `FIXTURE_VERSION "${FIXTURE_VERSION}" does not match the capture-fixtures/YYYY.MM.N shape (D-13)`,
  );
} else if (FIXTURE_VERSION === undefined && problems.length === 0) {
  problems.push("FIXTURE_VERSION is absent from lib/data/fixtures.ts");
}

/* ---------------------------------------------------------------
   recompute the digest over the four files, CRLF normalised to LF
   --------------------------------------------------------------- */

let recomputed = null;
if (FIXTURE_CONTENT_SHA256 !== undefined || problems.length === 0) {
  const hash = createHash("sha256");
  let readOk = true;
  for (const p of FIXTURE_PATHS) {
    try {
      const buf = await readFile(p);
      hash.update(buf.toString("utf8").replace(/\r\n/g, "\n"));
    } catch (e) {
      readOk = false;
      problems.push(`could not read ${p}: ${e.message}`);
    }
  }
  if (readOk) {
    recomputed = hash.digest("hex");
  }
}

if (
  recomputed !== null &&
  FIXTURE_CONTENT_SHA256 !== undefined &&
  recomputed !== FIXTURE_CONTENT_SHA256
) {
  problems.push(
    `fixture content hash mismatch: recomputed ${recomputed}, pinned ${FIXTURE_CONTENT_SHA256} — re-cut the pin and bump FIXTURE_VERSION in the same commit`,
  );
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("FIXTURE HASH CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the fixture content does not match its pin:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nThe recomputed content hash over plant.ts, artisans.ts, orders.ts and",
);
console.log(
  "observations.ts matches the pin in lib/data/fixtures.ts, and",
);
console.log("FIXTURE_VERSION carries the expected shape.");
