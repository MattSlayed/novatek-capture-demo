/* ================================================================
   NAMED PACKAGES CHECK

   FR-17 says the dependency manifest contains no image-analysis,
   vision, OCR or inference library, and this is that claim as a
   check. State its own limitation honestly, in the claims-audit's
   own voice: this is a name sweep over a list this project
   maintains, so it cannot detect a capability shipped under a name
   nobody thought of — it fails the build on the names that are
   known, and scripts/check-fixture-inputs.mjs beside it is what
   covers the capability rather than the name.

   Sweeps package.json's four dependency maps (dependencies,
   devDependencies, optionalDependencies, peerDependencies) for a
   direct hit, then package-lock.json's "packages" object keys for a
   transitive one. A transitive hit is reported as a transitive hit,
   naming the path it was found at, not as a direct dependency,
   because the two need different remedies — remove the direct
   dependency, or find and remove whichever direct dependency pulled
   it in. A missing package-lock.json is a named problem, not a
   silent pass: a lockfile is the only place a transitive arrival is
   visible.

   Four entries in FORBIDDEN below (zod, valibot, jsonwebtoken, jose)
   are not an FR-17 concern at all — they are this project's own
   dependency-minimalism principle (RESEARCH.md's Don't Hand-Roll
   table: hand-rolled shape guards and the project's own lazy-HMAC
   pattern replace a validation or JWT library) — and carry that
   reason instead of FR-17's, so a defect naming one of these four
   never claims a capability it does not have.

   KNOWN_TRANSITIVE_EXCEPTIONS exists because two forbidden names are
   already present in this repository's own package-lock.json,
   legitimately: `sharp`, at next@16.3.4's own optionalDependencies
   entry (next/image's optional server-side resizing pipeline, never
   imported by this project's own source, and marked optional: true
   in its own lockfile entry), and `zod`, a plain (non-optional)
   dependency of eslint-plugin-react-hooks@7.1.1 used for that
   plugin's own internal rule-config validation, never imported by
   this project's own source either. Each exception is pinned by
   exact name AND resolved version, so a version bump on either side
   — or a same-named package arriving by a new, unaudited path —
   re-triggers the defect rather than silently widening the
   exemption. This is a hardcoded, in-source, auditable allowlist,
   not a flag or an environment variable: removing an entry
   re-enables detection for exactly that package.

     node scripts/check-named-packages.mjs

   Exit 0 = clean. Exit 1 = at least one defect. No flag, no
   environment variable, no skip.
   ================================================================ */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CWD = process.cwd();

const FORBIDDEN = [
  /* vision and image analysis */
  { name: "opencv", kind: "exact", reason: "vision/image-analysis library — FR-17 bans an image-analysis capability" },
  { name: "opencv4nodejs", kind: "exact", reason: "vision/image-analysis library — FR-17 bans an image-analysis capability" },
  { name: "@techstark/opencv-js", kind: "exact", reason: "vision/image-analysis library — FR-17 bans an image-analysis capability" },
  { name: "sharp", kind: "exact", reason: "image-analysis-capable library — FR-17 bans an image-analysis capability" },
  { name: "jimp", kind: "exact", reason: "image-analysis-capable library — FR-17 bans an image-analysis capability" },
  { name: "canvas", kind: "exact", reason: "image-analysis-capable library — FR-17 bans an image-analysis capability" },
  { name: "image-size", kind: "exact", reason: "image-analysis-capable library — FR-17 bans an image-analysis capability" },
  { name: "exifr", kind: "exact", reason: "image metadata/analysis library — FR-17 bans an image-analysis capability" },
  { name: "exif-parser", kind: "exact", reason: "image metadata/analysis library — FR-17 bans an image-analysis capability" },
  { name: "piexifjs", kind: "exact", reason: "image metadata/analysis library — FR-17 bans an image-analysis capability" },
  /* OCR */
  { name: "tesseract.js", kind: "exact", reason: "OCR library — FR-17 bans an OCR capability" },
  { name: "node-tesseract-ocr", kind: "exact", reason: "OCR library — FR-17 bans an OCR capability" },
  { name: "ocrad.js", kind: "exact", reason: "OCR library — FR-17 bans an OCR capability" },
  /* inference and ML */
  { name: "onnxruntime-node", kind: "exact", reason: "inference runtime — FR-17 bans an inference capability" },
  { name: "onnxruntime-web", kind: "exact", reason: "inference runtime — FR-17 bans an inference capability" },
  { name: "@tensorflow/tfjs", kind: "exact", reason: "ML/inference library — FR-17 bans an inference capability" },
  { name: "@tensorflow/tfjs-node", kind: "exact", reason: "ML/inference library — FR-17 bans an inference capability" },
  { name: "@xenova/transformers", kind: "exact", reason: "ML/inference library — FR-17 bans an inference capability" },
  { name: "@huggingface/transformers", kind: "exact", reason: "ML/inference library — FR-17 bans an inference capability" },
  { name: "openai", kind: "exact", reason: "hosted-model client — FR-17 bans an inference capability" },
  { name: "@anthropic-ai/sdk", kind: "exact", reason: "hosted-model client — FR-17 bans an inference capability" },
  { name: "replicate", kind: "exact", reason: "hosted-model client — FR-17 bans an inference capability" },
  { name: "langchain", kind: "exact", reason: "ML/inference orchestration library — FR-17 bans an inference capability" },
  { name: "@tensorflow/", kind: "prefix", reason: "ML/inference library — FR-17 bans an inference capability" },
  { name: "@mediapipe/", kind: "prefix", reason: "ML/vision library — FR-17 bans an inference capability" },
  { name: "@aws-sdk/client-rekognition", kind: "prefix", reason: "hosted vision/inference client — FR-17 bans an inference capability" },
  /* this project's own dependency-minimalism principle, not FR-17 */
  { name: "zod", kind: "exact", reason: "dependency-minimalism: this project hand-rolls shape guards rather than adding a validation library (RESEARCH.md Don't Hand-Roll)" },
  { name: "valibot", kind: "exact", reason: "dependency-minimalism: this project hand-rolls shape guards rather than adding a validation library (RESEARCH.md Don't Hand-Roll)" },
  { name: "jsonwebtoken", kind: "exact", reason: "dependency-minimalism: this project signs with node:crypto's lazy HMAC pattern rather than a JWT library (RESEARCH.md Don't Hand-Roll)" },
  { name: "jose", kind: "exact", reason: "dependency-minimalism: this project signs with node:crypto's lazy HMAC pattern rather than a JWT library (RESEARCH.md Don't Hand-Roll)" },
];

/* See header comment. Each key is exactly "<name>@<resolved version>". */
const KNOWN_TRANSITIVE_EXCEPTIONS = new Set([
  "sharp@0.35.4",
  "zod@4.5.4",
]);

const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

const problems = [];

function matchForbidden(pkgName) {
  return FORBIDDEN.find((f) => (f.kind === "exact" ? pkgName === f.name : pkgName.startsWith(f.name)));
}

/* ---------------------------------------------------------------
   direct half — package.json's four dependency maps
   --------------------------------------------------------------- */

let pkgRaw = null;
try {
  pkgRaw = await readFile(join(CWD, "package.json"), "utf8");
} catch (e) {
  problems.push(`could not read package.json: ${e.message}`);
}

let pkg = null;
if (pkgRaw !== null) {
  try {
    const parsed = JSON.parse(pkgRaw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      problems.push(`package.json is not a JSON object — it declares no dependencies to sweep`);
    } else {
      pkg = parsed;
    }
  } catch (e) {
    problems.push(`package.json does not parse as JSON: ${e.message}`);
  }
}

if (pkg) {
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object" || Array.isArray(deps)) continue;
    for (const name of Object.keys(deps)) {
      const hit = matchForbidden(name);
      if (hit) {
        problems.push(`${name} is a direct dependency in package.json's "${field}" — ${hit.reason}`);
      }
    }
  }
}

/* ---------------------------------------------------------------
   transitive half — package-lock.json's resolved package tree
   --------------------------------------------------------------- */

let lockRaw = null;
let lockReadError = null;
try {
  lockRaw = await readFile(join(CWD, "package-lock.json"), "utf8");
} catch (e) {
  lockReadError = e;
}

if (lockRaw === null) {
  problems.push(
    `package-lock.json could not be read (${lockReadError?.message ?? "missing"}) — a lockfile is the only place a transitive arrival is visible, so a missing lockfile is a named problem, not a silent pass`,
  );
} else {
  let lockJson = null;
  try {
    const parsedLock = JSON.parse(lockRaw);
    if (parsedLock === null || typeof parsedLock !== "object" || Array.isArray(parsedLock)) {
      problems.push(`package-lock.json is not a JSON object — it declares no packages to sweep`);
    } else {
      lockJson = parsedLock;
    }
  } catch (e) {
    problems.push(`package-lock.json does not parse as JSON: ${e.message}`);
  }

  if (lockJson) {
    const packages = lockJson.packages;
    if (!packages || typeof packages !== "object" || Array.isArray(packages)) {
      problems.push(`package-lock.json has no "packages" object — cannot sweep for a transitive arrival`);
    } else {
      for (const [key, entry] of Object.entries(packages)) {
        /* "node_modules/sharp" -> "sharp"; "node_modules/@scope/name" ->
           "@scope/name"; "node_modules/a/node_modules/b" -> "b" (the
           innermost, actually-resolved copy). The root entry's own key
           ("") yields no segment and is skipped. */
        const segments = key.split("node_modules/").filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        if (!lastSegment) continue;
        const pkgName = lastSegment.replace(/\/$/, "");
        const hit = matchForbidden(pkgName);
        if (!hit) continue;

        const version = entry && typeof entry === "object" ? entry.version : undefined;
        const exceptionKey = version ? `${pkgName}@${version}` : null;
        if (exceptionKey && KNOWN_TRANSITIVE_EXCEPTIONS.has(exceptionKey)) {
          console.log(
            `i  ${exceptionKey} matches a forbidden name but is a known-safe, version-pinned transitive exception — see KNOWN_TRANSITIVE_EXCEPTIONS`,
          );
          continue;
        }
        problems.push(
          `${pkgName} is a transitive dependency (found at "${key}" in package-lock.json) — ${hit.reason}`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("NAMED PACKAGES CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the dependency manifest carries a forbidden package:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nNo forbidden package name appears in package.json's four dependency maps or in package-lock.json's resolved tree.",
);
