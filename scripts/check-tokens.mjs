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
  "\nThe inherited layer is byte-identical to its pinned parent digest.",
);
