/* ================================================================
   TOKEN CHECK

   Validates the two-layer token system D-12/D-13 requires:

   1. app/styles/tokens.inherited.css is byte-identical to the parent
      it was copied from. No inherited token is ever deleted or
      edited (D-12) — this check is the only thing standing between
      that promise and a drive-by edit.

        Parent:        ../ipv-demo/app/styles/tokens.css
        Parent commit: 8fd097a (2026-09-01)
        Pinned bytes:  4956
        Pinned SHA-256: 11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9

      A changed parent is adopted only by re-copying the file and
      re-pinning the constants below, in the same commit — never by
      editing app/styles/tokens.inherited.css in place.

   2. app/styles/tokens.capture.css declares the complete D-13
      manifest — no missing name, no undeclared extra name, no
      redeclaration of an inherited name other than the one
      permitted shadow (--viewer-ink-dim) — plus --target-record
      pinned at 130px and no literal #000000 anywhere in the file.

     node scripts/check-tokens.mjs

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const problems = [];

/* ---------------------------------------------------------------
   1. the inherited layer's byte identity (D-12)
   --------------------------------------------------------------- */

const INHERITED_PATH = "app/styles/tokens.inherited.css";
const PINNED_SHA256 =
  "11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9";
const PINNED_BYTES = 4956;

let inheritedBuf = null;
try {
  inheritedBuf = await readFile(INHERITED_PATH);
} catch (e) {
  problems.push(`could not read ${INHERITED_PATH}: ${e.message}`);
}

if (inheritedBuf) {
  if (inheritedBuf.length !== PINNED_BYTES) {
    problems.push(
      `${INHERITED_PATH} is ${inheritedBuf.length} bytes — expected ${PINNED_BYTES} (D-12)`,
    );
  }
  const digest = createHash("sha256").update(inheritedBuf).digest("hex");
  if (digest !== PINNED_SHA256) {
    problems.push(
      `${INHERITED_PATH} SHA-256 is ${digest} — expected ${PINNED_SHA256} (D-12); the inherited layer must never be edited`,
    );
  }
}

/* ---------------------------------------------------------------
   2. the Capture layer's completeness against the D-13 manifest
   --------------------------------------------------------------- */

const CAPTURE_PATH = "app/styles/tokens.capture.css";

const D13_MANIFEST = [
  // layer-2 overrides (8) — only --viewer-ink-dim shadows an
  // inherited declaration
  "--viewer-ink-dim",
  "--rule-faint",
  "--record-fill",
  "--record-fill-armed",
  "--record-ink",
  "--cobalt-glow-ink",
  "--control-border",
  "--panel-solid",
  // layer-2 authored tokens (5)
  "--dk-good",
  "--dk-warn",
  "--dk-crit",
  "--dk-crit-edge",
  "--surface-inset",
  // spacing scale, 4px base (9)
  "--space-4",
  "--space-8",
  "--space-12",
  "--space-16",
  "--space-20",
  "--space-24",
  "--space-32",
  "--space-40",
  "--space-48",
  // measured phone tokens (15)
  "--gutter",
  "--content",
  "--row-gap",
  "--target-record",
  "--target-min",
  "--ribbon-min-h",
  "--ribbon-h-100",
  "--ribbon-h-150",
  "--ribbon-h-200",
  "--ribbon-link-min-h",
  "--header-h",
  "--sticky-bar-h",
  "--viewfinder-min-h",
  "--safe-x",
  "--safe-b",
  // shadows (2)
  "--shadow-panel",
  "--shadow-sheet",
  // radius (1)
  "--radius-control",
];

const PERMITTED_SHADOW = "--viewer-ink-dim";

let captureSrc = null;
try {
  captureSrc = await readFile(CAPTURE_PATH, "utf8");
} catch (e) {
  problems.push(`could not read ${CAPTURE_PATH}: ${e.message}`);
}

if (captureSrc !== null) {
  const declaredNames = [...captureSrc.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(
    (m) => m[1],
  );
  const declaredSet = new Set(declaredNames);

  for (const name of D13_MANIFEST) {
    if (!declaredSet.has(name)) {
      problems.push(
        `${CAPTURE_PATH} is missing ${name} — the D-13 manifest must land at once`,
      );
    }
  }
  for (const name of declaredSet) {
    if (!D13_MANIFEST.includes(name)) {
      problems.push(
        `${CAPTURE_PATH} declares ${name}, which is not in the D-13 manifest`,
      );
    }
  }

  if (inheritedBuf) {
    const inheritedNames = [
      ...inheritedBuf.toString("utf8").matchAll(/(--[a-zA-Z0-9-]+)\s*:/g),
    ].map((m) => m[1]);
    const inheritedSet = new Set(inheritedNames);
    for (const name of declaredSet) {
      if (inheritedSet.has(name) && name !== PERMITTED_SHADOW) {
        problems.push(
          `${CAPTURE_PATH} redeclares ${name}, which already exists in ${INHERITED_PATH} — only ${PERMITTED_SHADOW} may shadow an inherited name (D-13)`,
        );
      }
    }
  }

  if (!/--target-record:\s*130px/.test(captureSrc)) {
    problems.push(`${CAPTURE_PATH} does not declare --target-record: 130px`);
  }
  if (captureSrc.includes("#000000")) {
    problems.push(
      `${CAPTURE_PATH} contains the literal #000000 — never black in a shadow or fill (D-13)`,
    );
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("TOKEN CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the token layers do not meet their contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nThe inherited layer is byte-identical to its pinned parent digest, and",
);
console.log(
  "the Capture layer declares the complete D-13 manifest with no clash.",
);
