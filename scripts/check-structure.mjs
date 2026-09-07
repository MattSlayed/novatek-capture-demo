/* ================================================================
   STRUCTURE CHECK

   Asserts D-05's structural conditions by file inspection, plus the
   D-11 companion requirement and (in its second mode) the D-11
   static-marker proof itself:

   1. No proxy.ts/proxy.js/middleware.ts/middleware.js at the
      repository root, in app/ or in src/ — Routing Middleware is not
      permitted in this project (AD-15).
   2. next.config.ts contains no webpack( key.
   3. next.config.ts contains no ignoreBuildErrors.
   4. app/globals.css imports ./styles/tokens.inherited.css strictly
      before ./styles/tokens.capture.css, and both imports exist.
   5. next.config.ts declares cacheComponents: true — without it the
      "/" route silently opts into dynamic rendering and D-11's static
      claim is false even though the route still functions.

     node scripts/check-structure.mjs
     node scripts/check-structure.mjs --build-output <path>

   The --build-output mode runs all five assertions above and then
   ADDS the D-11 static-marker assertion, read from a captured
   `next build` log: the route table row for "/" must be present and
   marked static — the fully static glyph ("○") or the Partial
   Prerender glyph ("◐"), since D-11's own shape (a statically
   prerendered shell whose searchParams reader sits behind Suspense,
   with cacheComponents: true) builds as a Partial Prerender, not a
   fully static route. It never replaces the source assertions —
   verify.mjs (plan 01-07) runs this script twice on every build,
   once before next build and once after with --build-output, and
   neither invocation is optional.

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const problems = [];

/* ---------------------------------------------------------------
   1. no Routing Middleware anywhere it could intercept a request
   --------------------------------------------------------------- */

const FORBIDDEN_NAMES = ["proxy.ts", "proxy.js", "middleware.ts", "middleware.js"];
const FORBIDDEN_DIRS = [".", "app", "src"];

for (const dir of FORBIDDEN_DIRS) {
  for (const name of FORBIDDEN_NAMES) {
    const p = join(dir, name);
    try {
      await access(p);
      problems.push(
        `${p} exists — Routing Middleware is not permitted in this project (AD-15)`,
      );
    } catch {
      /* absent, as required */
    }
  }
}

/* ---------------------------------------------------------------
   2, 3, 5. next.config.ts's own contract
   --------------------------------------------------------------- */

const NEXT_CONFIG = "next.config.ts";
let nextConfigSrc = "";
try {
  nextConfigSrc = await readFile(NEXT_CONFIG, "utf8");
} catch (e) {
  problems.push(`could not read ${NEXT_CONFIG}: ${e.message}`);
}

if (nextConfigSrc) {
  if (/webpack\(/.test(nextConfigSrc)) {
    problems.push(`${NEXT_CONFIG} contains a webpack( key — not permitted (D-05)`);
  }
  if (nextConfigSrc.includes("ignoreBuildErrors")) {
    problems.push(
      `${NEXT_CONFIG} contains ignoreBuildErrors — type errors must never be suppressed (D-05)`,
    );
  }
  if (!nextConfigSrc.includes("cacheComponents: true")) {
    problems.push(
      `${NEXT_CONFIG} does not declare cacheComponents: true — without it the "/" route silently opts into dynamic rendering and D-11's static claim is false`,
    );
  }
}

/* ---------------------------------------------------------------
   4. the token cascade order
   --------------------------------------------------------------- */

const GLOBALS_CSS = "app/globals.css";
let globalsSrc = null;
try {
  globalsSrc = await readFile(GLOBALS_CSS, "utf8");
} catch {
  globalsSrc = null;
}

if (globalsSrc === null) {
  problems.push(`${GLOBALS_CSS} does not exist yet`);
} else {
  const inheritedIndex = globalsSrc.indexOf("./styles/tokens.inherited.css");
  const captureIndex = globalsSrc.indexOf("./styles/tokens.capture.css");
  if (inheritedIndex === -1) {
    problems.push(`${GLOBALS_CSS} does not import ./styles/tokens.inherited.css`);
  }
  if (captureIndex === -1) {
    problems.push(`${GLOBALS_CSS} does not import ./styles/tokens.capture.css`);
  }
  if (
    inheritedIndex !== -1 &&
    captureIndex !== -1 &&
    !(inheritedIndex < captureIndex)
  ) {
    problems.push(
      `${GLOBALS_CSS} imports tokens.capture.css at or before tokens.inherited.css — the cascade order is reversed, so capture's one real override would be clobbered`,
    );
  }
}

/* ---------------------------------------------------------------
   --build-output — additive, never a substitute (D-11)
   --------------------------------------------------------------- */

const buildOutputFlagIndex = process.argv.indexOf("--build-output");
const buildOutputPath =
  buildOutputFlagIndex !== -1 ? process.argv[buildOutputFlagIndex + 1] : null;

if (buildOutputPath) {
  let logText = "";
  try {
    logText = await readFile(buildOutputPath, "utf8");
  } catch (e) {
    problems.push(
      `could not read build output log ${buildOutputPath}: ${e.message}`,
    );
  }

  if (logText) {
    const lines = logText.split(/\r?\n/);
    let rootGlyph = null;
    for (const line of lines) {
      const m = line.match(/^[┌├└]\s+(\S)\s+(\/)(?:\s|$)/);
      if (m) {
        rootGlyph = m[1];
        break;
      }
    }
    /* D-11's own shape is a statically prerendered shell whose
       searchParams reader sits behind <Suspense> — with
       cacheComponents: true this is exactly what Next marks as a
       Partial Prerender ("◐"), not a fully static route ("○"). Both
       glyphs satisfy the static claim; anything else (dynamic,
       "ƒ", or absent) does not. */
    const STATIC_GLYPHS = new Set(["○", "◐"]);
    if (rootGlyph === null) {
      problems.push(
        `no route table row for "/" found in ${buildOutputPath} — cannot confirm the static claim (D-11)`,
      );
    } else if (!STATIC_GLYPHS.has(rootGlyph)) {
      problems.push(
        `route "/" is marked dynamic (glyph "${rootGlyph}") in ${buildOutputPath} — D-11's static claim does not hold`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("STRUCTURE CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the structure does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nNo Routing Middleware, no webpack key, no suppressed type errors, the token cascade order holds, and cacheComponents is declared.",
);
