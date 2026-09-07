/* ================================================================
   CONTRAST CHECK

   Computes the W3C relative-luminance contrast ratio
   (w3.org/WAI/WCAG22/Techniques/general/G18) for every ink-on-ground
   pair the Phase 1 surfaces render, from the resolved token values —
   never from a value typed by hand — and fails the build below the
   7:1 text / 3:1 non-text floors (D-21).

   Resolution:
     1. app/styles/tokens.inherited.css is parsed first, then
        app/styles/tokens.capture.css — the later file's declarations
        win, so the resolved value is what the cascade actually
        produces.
     2. Each pair's ink and ground token is looked up in that merged
        map. A single level of var(--other) indirection is followed
        (no deeper resolution). Accepted colour syntaxes: #rgb,
        #rrggbb, rgb()/rgba().
     3. An ink with an alpha channel is composited over its pair's
        ground before computing: each channel becomes
        (1 - a) * ground + a * ink, rounded to the nearest integer.
        This is engineering practice, not something the W3C formula
        itself specifies (RESEARCH.md §Phase Requirements) — it is
        what makes the inherited --viewer-border
        (rgba(96, 165, 250, 0.16)) resolve to #193455 over
        --navy-deep, the value docs/design/decorative-exemptions.json
        was measured against.

   Luminance and ratio, verbatim from the G18 technique:
     - each sRGB channel normalised to 0-1
     - linearised as c / 12.92 when c <= 0.03928,
       else ((c + 0.055) / 1.055) ** 2.4
     - luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B
     - ratio = (Llighter + 0.05) / (Ldarker + 0.05)

   Floors: 7:1 for kind "text", 3:1 for kind "non-text" (D-21). A
   pair below its floor passes only if
   docs/design/decorative-exemptions.json names the same ink and
   ground AND its measured_ratio equals the computed ratio rounded to
   two decimal places — the register is the only source of
   exceptions; there is no flag, environment variable or comment that
   can add one.

     node scripts/check-contrast.mjs

   Exit 0 = every pair meets its floor or is validly exempted.
   Exit 1 = at least one defect.
   ================================================================ */

import { readFile } from "node:fs/promises";

const INHERITED_PATH = "app/styles/tokens.inherited.css";
const CAPTURE_PATH = "app/styles/tokens.capture.css";
const PAIRS_PATH = "scripts/check-contrast.pairs.json";
const EXEMPTIONS_PATH = "docs/design/decorative-exemptions.json";

const TEXT_FLOOR = 7;
const NON_TEXT_FLOOR = 3;

const problems = [];

/* ---------------------------------------------------------------
   parse every --name: value; declaration inside the first :root
   block of a stylesheet
   --------------------------------------------------------------- */

function parseRootDeclarations(cssText) {
  const map = {};
  const rootIndex = cssText.indexOf(":root");
  if (rootIndex === -1) return map;
  const braceStart = cssText.indexOf("{", rootIndex);
  if (braceStart === -1) return map;

  let depth = 0;
  let i = braceStart;
  for (; i < cssText.length; i++) {
    if (cssText[i] === "{") depth++;
    else if (cssText[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const block = cssText.slice(braceStart + 1, i - 1);

  const declRe = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = declRe.exec(block))) {
    map[`--${m[1]}`] = m[2].trim();
  }
  return map;
}

/* ---------------------------------------------------------------
   resolve a token name to its raw CSS value, following one level of
   var(--other) indirection
   --------------------------------------------------------------- */

function resolveRaw(map, name) {
  if (!(name in map)) {
    throw new Error(`token ${name} is not declared in the resolved token map`);
  }
  let raw = map[name];
  const varMatch = raw.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[\s\S]*)?\)$/);
  if (varMatch) {
    const inner = varMatch[1];
    if (!(inner in map)) {
      throw new Error(
        `token ${name} resolves via var(${inner}), which is not declared`,
      );
    }
    raw = map[inner];
  }
  return raw;
}

/* ---------------------------------------------------------------
   parse #rgb, #rrggbb, rgb()/rgba() into { r, g, b, a }
   --------------------------------------------------------------- */

function parseColor(raw) {
  const value = raw.trim();

  let m = value.match(/^#([0-9a-fA-F]{3})$/);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }

  m = value.match(/^#([0-9a-fA-F]{6})$/);
  if (m) {
    const hex = m[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  m = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (m) {
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] !== undefined ? Number(m[4]) : 1,
    };
  }

  throw new Error(`cannot parse colour value: ${raw}`);
}

/* ---------------------------------------------------------------
   composite an (r,g,b,a) ink over an opaque (r,g,b) ground
   --------------------------------------------------------------- */

function compositeOverGround(ink, ground) {
  const a = ink.a ?? 1;
  return {
    r: Math.round((1 - a) * ground.r + a * ink.r),
    g: Math.round((1 - a) * ground.g + a * ink.g),
    b: Math.round((1 - a) * ground.b + a * ink.b),
  };
}

/* ---------------------------------------------------------------
   W3C relative luminance and contrast ratio (WCAG 2.2 Technique G18)
   --------------------------------------------------------------- */

function srgbChannelToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }) {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ---------------------------------------------------------------
   load inputs
   --------------------------------------------------------------- */

let inheritedText = "";
let captureText = "";
let pairs = [];
let exemptions = [];

try {
  inheritedText = await readFile(INHERITED_PATH, "utf8");
} catch (e) {
  problems.push(`could not read ${INHERITED_PATH}: ${e.message}`);
}

try {
  captureText = await readFile(CAPTURE_PATH, "utf8");
} catch (e) {
  problems.push(`could not read ${CAPTURE_PATH}: ${e.message}`);
}

try {
  pairs = JSON.parse(await readFile(PAIRS_PATH, "utf8"));
} catch (e) {
  problems.push(`could not read/parse ${PAIRS_PATH}: ${e.message}`);
}

try {
  exemptions = JSON.parse(await readFile(EXEMPTIONS_PATH, "utf8"));
} catch (e) {
  problems.push(`could not read/parse ${EXEMPTIONS_PATH}: ${e.message}`);
}

const tokens = {
  ...parseRootDeclarations(inheritedText),
  ...parseRootDeclarations(captureText),
};

/* ---------------------------------------------------------------
   evaluate every pair
   --------------------------------------------------------------- */

const results = [];

for (const pair of Array.isArray(pairs) ? pairs : []) {
  const label = pair.id ?? `${pair.ink} on ${pair.ground}`;

  if (pair.kind !== "text" && pair.kind !== "non-text") {
    problems.push(`${label}: kind must be "text" or "non-text", got ${JSON.stringify(pair.kind)}`);
    continue;
  }

  try {
    const inkRaw = resolveRaw(tokens, pair.ink);
    const groundRaw = resolveRaw(tokens, pair.ground);
    const ink = parseColor(inkRaw);
    const ground = parseColor(groundRaw);
    const effectiveInk = compositeOverGround(ink, ground);
    const ratio = contrastRatio(effectiveInk, {
      r: ground.r,
      g: ground.g,
      b: ground.b,
    });
    const rounded = Math.round(ratio * 100) / 100;
    const floor = pair.kind === "text" ? TEXT_FLOOR : NON_TEXT_FLOOR;

    let verdict;
    if (ratio >= floor) {
      verdict = "PASS";
    } else {
      const exemption = (Array.isArray(exemptions) ? exemptions : []).find(
        (e) => e.ink === pair.ink && e.ground === pair.ground,
      );
      if (exemption && Number(exemption.measured_ratio).toFixed(2) === rounded.toFixed(2)) {
        verdict = "EXEMPTED";
      } else if (exemption) {
        verdict = "DEFECT";
        problems.push(
          `${label}: ${pair.ink} on ${pair.ground} computes to ${rounded.toFixed(2)}:1, below the ${floor}:1 floor for ${pair.kind}; ${EXEMPTIONS_PATH} entry "${exemption.id}" names measured_ratio ${exemption.measured_ratio}, which disagrees with the computed value`,
        );
      } else {
        verdict = "DEFECT";
        problems.push(
          `${label}: ${pair.ink} on ${pair.ground} computes to ${rounded.toFixed(2)}:1, below the ${floor}:1 floor for ${pair.kind}, and is not named in ${EXEMPTIONS_PATH}`,
        );
      }
    }

    results.push({ label, ink: pair.ink, ground: pair.ground, kind: pair.kind, floor, ratio: rounded, verdict });
  } catch (e) {
    problems.push(`${label}: ${e.message}`);
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("CONTRAST CHECK");
console.log("=".repeat(72));
for (const r of results) {
  console.log(
    `  ${r.verdict.padEnd(9)} ${r.label.padEnd(28)} ${r.ratio.toFixed(2)}:1  (floor ${r.floor}:1, ${r.kind})`,
  );
}
console.log(`\nProblems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — a pair is below its floor with no valid exemption:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery ink-on-ground pair meets its 7:1/3:1 floor or is named, with an agreeing measured ratio, in the decorative-exemptions register.",
);
