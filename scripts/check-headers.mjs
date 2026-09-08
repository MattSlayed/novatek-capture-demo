/* ================================================================
   HEADER CHECK

   Validates vercel.json against D-04's exact declared values: the
   region, the framework, the build command, and every header on
   every source block. One wrong character in the Permissions-Policy
   line — the sibling's `camera=(), microphone=()` chief among them —
   would make getUserMedia reject on every device regardless of what
   the artisan taps; this check exists so that line cannot survive a
   commit.

   WHAT IT CANNOT DO: this reads vercel.json's declared strings only.
   It does not verify Vercel actually serves these headers from a
   live deployment; that is outside a build-time script's reach.

     node scripts/check-headers.mjs

   Exit 0 = every declared value matches exactly. Exit 1 = at least
   one mismatch.
   ================================================================ */

import { readFile } from "node:fs/promises";

const VERCEL_JSON = "vercel.json";

const problems = [];

const EXPECTED = {
  framework: "nextjs",
  regions: ["cpt1"],
  buildCommand: "node scripts/verify.mjs",
};

const EXPECTED_BLOCKS = [
  {
    source: "/api/(.*)",
    headers: { "Cache-Control": "no-store" },
  },
  {
    source: "/sw.js",
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  },
  {
    source: "/manifest.webmanifest",
    headers: { "Cache-Control": "max-age=0, must-revalidate" },
  },
  {
    source: "/(.*)",
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "SAMEORIGIN",
      "Permissions-Policy": "camera=(self), microphone=(self)",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    },
  },
];

let raw = "";
let readOk = false;
try {
  raw = await readFile(VERCEL_JSON, "utf8");
  readOk = true;
} catch (e) {
  problems.push(`could not read ${VERCEL_JSON}: ${e.message}`);
}

/* Parsed whenever the read succeeded, never only when the text is
   truthy: an empty vercel.json is not "nothing to check", it is a
   config that declares no region, no build command and no headers,
   and must fail exactly like one. A parse that yields anything other
   than a JSON object (null, an array, a bare string) is the same
   defect. */
let config = null;
if (readOk) {
  let parsed;
  let parseOk = false;
  try {
    parsed = JSON.parse(raw);
    parseOk = true;
  } catch (e) {
    problems.push(`${VERCEL_JSON} does not parse as JSON: ${e.message}`);
  }
  if (parseOk) {
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      problems.push(
        `${VERCEL_JSON} is not a JSON object (got ${JSON.stringify(parsed)}) — it declares no region, build command or headers (D-04)`,
      );
    } else {
      config = parsed;
    }
  }
}

if (config) {
  if (config.framework !== EXPECTED.framework) {
    problems.push(
      `framework is ${JSON.stringify(config.framework)} — expected ${JSON.stringify(EXPECTED.framework)}`,
    );
  }
  if (JSON.stringify(config.regions) !== JSON.stringify(EXPECTED.regions)) {
    problems.push(
      `regions is ${JSON.stringify(config.regions)} — expected ${JSON.stringify(EXPECTED.regions)}`,
    );
  }
  if (config.buildCommand !== EXPECTED.buildCommand) {
    problems.push(
      `buildCommand is ${JSON.stringify(config.buildCommand)} — expected ${JSON.stringify(EXPECTED.buildCommand)}`,
    );
  }

  const blocks = Array.isArray(config.headers) ? config.headers : [];

  for (const expected of EXPECTED_BLOCKS) {
    const block = blocks.find((b) => b.source === expected.source);
    if (!block) {
      problems.push(
        `missing headers block for source ${JSON.stringify(expected.source)}`,
      );
      continue;
    }
    const declared = Array.isArray(block.headers) ? block.headers : [];
    const declaredKeys = new Set(declared.map((h) => h.key));
    const expectedKeys = Object.keys(expected.headers);

    for (const key of expectedKeys) {
      const entry = declared.find((h) => h.key === key);
      if (!entry) {
        problems.push(`${expected.source}: missing header ${key}`);
        continue;
      }
      if (entry.value !== expected.headers[key]) {
        problems.push(
          `${expected.source}: ${key} is ${JSON.stringify(entry.value)} — expected ${JSON.stringify(expected.headers[key])}`,
        );
      }
    }
    for (const key of declaredKeys) {
      if (!expectedKeys.includes(key)) {
        problems.push(`${expected.source}: unexpected extra header ${key}`);
      }
    }
  }
}

if (raw.includes("camera=()") || raw.includes("microphone=()")) {
  problems.push(
    `${VERCEL_JSON} contains the disabling policy camera=() or microphone=() — getUserMedia would reject on every device regardless of the artisan's answer (D-04)`,
  );
}

console.log("HEADER CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — vercel.json does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nRegion, build command and every declared header match D-04 exactly.",
);
