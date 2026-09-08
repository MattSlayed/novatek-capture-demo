/* ================================================================
   GOVERNED-SENTENCE CHECK

   The inverted twin of scripts/claims-audit.mjs: instead of failing
   the build when a prohibited string is present, this fails the
   build when a GOVERNED sentence is present anywhere it should not
   be (AD-12) — a second literal is a second definition, and a second
   definition is exactly what lets one copy drift from the other.

   It never restates a governed sentence itself. It reads
   lib/copy/governed.ts as text and extracts the sentences from the
   module's own `before`/`strong`/`after` fields — restating them
   here would itself be a second definition.

   It also enforces D-09's closed-set assertion: the keys of GOVERNED
   must be exactly the eight in the locked order, and no other object
   literal shaped like a GovernedSentence (before/strong/after) may
   exist anywhere under app/, components/ or lib/ — exported or not,
   in this module or another, frozen, re-exported or nested — other
   than PLATFORM_413. A ninth sentence, wherever it is added, fails
   the build.

     node scripts/check-governed.mjs

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readdir, readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".css", ".md"]);
const GOVERNED_PATH = "lib/copy/governed.ts";

const LOCKED_ORDER = [
  "preview",
  "authoredVerification",
  "authoredProposals",
  "noRedaction",
  "memoryStore",
  "noOfflineInference",
  "pendingReconciliation",
  "mediaOnDevice",
];

const problems = [];

/* ---------------------------------------------------------------
   directory walk (unchanged shape from claims-audit.mjs)
   --------------------------------------------------------------- */

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await walk(p)));
    } else if (EXT.has(extname(e.name))) {
      out.push(p);
    }
  }
  return out;
}

/* ---------------------------------------------------------------
   source-level parsing of lib/copy/governed.ts — no full TS parser;
   a brace-balancer that skips string contents is enough for this
   module's shape (flat string fields, no nested objects).
   --------------------------------------------------------------- */

/** Index of the "}" that closes the "{" at `openIndex`, skipping braces inside string literals. */
function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = null;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** First "{" at or after `fromIndex`, paired with `findMatchingBrace`. */
function extractBraceBlock(text, fromIndex) {
  const start = text.indexOf("{", fromIndex);
  if (start === -1) return null;
  const end = findMatchingBrace(text, start);
  if (end === -1) return null;
  return { start, end, content: text.slice(start, end + 1) };
}

/** Every top-level `key: { ... }` entry inside an object literal's inner text. */
function extractTopLevelEntries(innerText) {
  const entries = [];
  let i = 0;
  while (i < innerText.length) {
    while (i < innerText.length && /[\s,]/.test(innerText[i])) i++;
    if (i >= innerText.length) break;
    const keyMatch = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*/.exec(
      innerText.slice(i),
    );
    if (!keyMatch) {
      i++;
      continue;
    }
    const keyName = keyMatch[1];
    const afterColon = i + keyMatch[0].length;
    if (innerText[afterColon] !== "{") {
      i = afterColon;
      continue;
    }
    const closeIdx = findMatchingBrace(innerText, afterColon);
    if (closeIdx === -1) break;
    entries.push({ key: keyName, block: innerText.slice(afterColon, closeIdx + 1) });
    i = closeIdx + 1;
  }
  return entries;
}

/**
 * The field's value when it is one double-quoted string literal that
 * is the whole value (followed by `,` or `}`), else null. A single-
 * quoted string, a template literal or a concatenation (`"a" + "b"`)
 * all return null — and null is reported as a defect below, never
 * treated as an empty sentence, because a sentence that cannot be
 * extracted has silently left the duplicate sweep (D-09).
 */
function extractField(block, field) {
  const re = new RegExp(`${field}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*[,}]`);
  const m = re.exec(block);
  return m ? m[1] : null;
}

function normalise(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Turn one parsed { before, strong, after } into a needle, or record
 * why it cannot be one: a field that is not a double-quoted literal
 * (null) or a sentence with no text at all. Both are defects — the
 * check must never print "defined once" for a sentence it could not
 * read.
 */
function needleFor(key, fields) {
  const unquoted = ["before", "strong", "after"].filter((f) => fields[f] === null);
  if (unquoted.length) {
    problems.push(
      `${GOVERNED_PATH} entry "${key}" has no extractable ${unquoted.join("/")} — every field must be one double-quoted string literal, or the sentence silently drops out of the duplicate sweep (D-09)`,
    );
    return null;
  }
  const sentence = normalise(`${fields.before}${fields.strong}${fields.after}`);
  if (sentence.length === 0) {
    problems.push(
      `${GOVERNED_PATH} entry "${key}" is empty — a governed sentence must carry text (D-09)`,
    );
    return null;
  }
  return { key, sentence };
}

/**
 * Parses lib/copy/governed.ts's source text into:
 *  - `entries`: [{ key, before, strong, after }] in file order, for GOVERNED
 *  - `platform413`: { before, strong, after } | null
 *  - `extraExports`: names of other top-level `export const` bindings whose
 *    value is an object literal carrying before/strong/after fields.
 *  - `ownedRanges`: the [start, end] source spans of the GOVERNED and
 *    PLATFORM_413 object literals — the only two places a
 *    before/strong/after shape may legitimately appear (section 3).
 */
function parseGovernedModule(source) {
  const result = { entries: null, platform413: null, extraExports: [], ownedRanges: [] };

  const governedIdx = source.indexOf("export const GOVERNED");
  if (governedIdx !== -1) {
    const eqIdx = source.indexOf("=", governedIdx);
    if (eqIdx !== -1) {
      const block = extractBraceBlock(source, eqIdx);
      if (block) {
        result.ownedRanges.push([block.start, block.end]);
        const inner = source.slice(block.start + 1, block.end);
        result.entries = extractTopLevelEntries(inner).map(({ key, block: b }) => ({
          key,
          before: extractField(b, "before"),
          strong: extractField(b, "strong"),
          after: extractField(b, "after"),
        }));
      }
    }
  }

  // every top-level `export const NAME ... = { ... }` binding, so PLATFORM_413
  // and any extra GovernedSentence-shaped export can both be found generically.
  const exportRe = /export const ([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::[^=]+)?=\s*/g;
  let m;
  while ((m = exportRe.exec(source))) {
    const name = m[1];
    if (name === "GOVERNED") continue;
    const afterEq = m.index + m[0].length;
    if (source[afterEq] !== "{") continue;
    const closeIdx = findMatchingBrace(source, afterEq);
    if (closeIdx === -1) continue;
    const block = source.slice(afterEq, closeIdx + 1);
    const hasShape =
      /\bbefore\s*:/.test(block) &&
      /\bstrong\s*:/.test(block) &&
      /\bafter\s*:/.test(block);
    if (!hasShape) continue;
    const sentence = {
      before: extractField(block, "before"),
      strong: extractField(block, "strong"),
      after: extractField(block, "after"),
    };
    if (name === "PLATFORM_413") {
      result.platform413 = sentence;
      result.ownedRanges.push([afterEq, closeIdx]);
    } else {
      result.extraExports.push({ name, ...sentence });
    }
  }

  return result;
}

/* ---------------------------------------------------------------
   1. read and parse lib/copy/governed.ts — the sentences are read
      from the module, never restated in this check.
   --------------------------------------------------------------- */

let governedSource = null;
try {
  governedSource = await readFile(GOVERNED_PATH, "utf8");
} catch {
  problems.push(`${GOVERNED_PATH} is missing — the honesty surface has no definition (D-09)`);
}

let needles = [];
let ownedRanges = null;

if (governedSource !== null) {
  const parsed = parseGovernedModule(governedSource);
  ownedRanges = parsed.ownedRanges;

  if (!parsed.entries) {
    problems.push(`could not find or parse GOVERNED in ${GOVERNED_PATH}`);
  } else {
    const actualKeys = parsed.entries.map((e) => e.key);
    const sameOrder =
      actualKeys.length === LOCKED_ORDER.length &&
      actualKeys.every((k, i) => k === LOCKED_ORDER[i]);
    if (!sameOrder) {
      problems.push(
        `${GOVERNED_PATH} GOVERNED keys are [${actualKeys.join(", ")}] — expected exactly [${LOCKED_ORDER.join(", ")}] in that order (D-09)`,
      );
    }
    for (const entry of parsed.entries) {
      const needle = needleFor(entry.key, entry);
      if (needle) needles.push(needle);
    }
  }

  if (parsed.extraExports.length) {
    for (const extra of parsed.extraExports) {
      problems.push(
        `${GOVERNED_PATH} exports ${extra.name}, an additional GovernedSentence-shaped binding — only PLATFORM_413 may hold before/strong/after outside GOVERNED (D-09)`,
      );
    }
  }

  if (parsed.platform413) {
    const needle = needleFor("PLATFORM_413", parsed.platform413);
    if (needle) needles.push(needle);
  }
}

/* ---------------------------------------------------------------
   2. sweep every other file under the three roots for a duplicate
      literal — the whole file is whitespace-normalised, not swept
      line by line, so a sentence split across JSX lines is still
      caught; a commented copy is still a second literal.
   --------------------------------------------------------------- */

const governedAbs = resolve(GOVERNED_PATH);

if (needles.length) {
  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      if (resolve(file) === governedAbs) continue;
      const text = await readFile(file, "utf8");
      const normalisedText = normalise(text);
      for (const { key, sentence } of needles) {
        if (normalisedText.includes(sentence)) {
          problems.push(
            `${file} contains a second literal of the "${key}" governed sentence — import it from ${GOVERNED_PATH} instead (D-09)`,
          );
        }
      }
    }
  }
}

/* ---------------------------------------------------------------
   3. the closed set across the module boundary (D-09) — a
      before/strong/after-shaped object literal anywhere under the
      roots, other than GOVERNED and PLATFORM_413 themselves in
      lib/copy/governed.ts, is a ninth sentence wherever and however
      it is declared: a second module, a non-exported const, a frozen
      or re-exported object, an array element. Type and interface
      declarations are blanked first — they carry the field names,
      not a sentence — and so are the two owned blocks.
   --------------------------------------------------------------- */

const SENTENCE_SHAPE = /\bbefore\s*:[\s\S]{0,300}?\bstrong\s*:[\s\S]{0,300}?\bafter\s*:/g;
const SWEPT_FOR_SHAPE = new Set([".ts", ".tsx"]);

/** Overwrite [start, end] (inclusive) with spaces, keeping every other offset. */
function blankRange(text, start, end) {
  return text.slice(0, start) + " ".repeat(end + 1 - start) + text.slice(end + 1);
}

/** Blank every `type X = { ... }` and `interface X { ... }` block. */
function blankTypeDeclarations(text) {
  let out = text;
  const re =
    /\b(?:type\s+[A-Za-z_$][A-Za-z0-9_$]*\s*(?:<[^>]*>)?\s*=|interface\s+[A-Za-z_$][A-Za-z0-9_$]*(?:\s+extends\s+[^{]+)?)/g;
  let m;
  while ((m = re.exec(out))) {
    const open = out.indexOf("{", m.index + m[0].length);
    if (open === -1 || out.slice(m.index + m[0].length, open).trim() !== "") continue;
    const close = findMatchingBrace(out, open);
    if (close === -1) continue;
    out = blankRange(out, m.index, close);
    re.lastIndex = close + 1;
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Line numbers (in the original text) of every sentence-shaped literal. */
function shapeHits(text) {
  return [...blankTypeDeclarations(text).matchAll(SENTENCE_SHAPE)].map((m) =>
    lineOf(text, m.index),
  );
}

if (governedSource !== null && ownedRanges !== null) {
  let own = governedSource;
  for (const [start, end] of ownedRanges) own = blankRange(own, start, end);
  for (const line of shapeHits(own)) {
    problems.push(
      `${GOVERNED_PATH}:${line} declares a before/strong/after-shaped object outside GOVERNED and PLATFORM_413 — the set of eight is closed (D-09)`,
    );
  }
}

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    if (resolve(file) === governedAbs || !SWEPT_FOR_SHAPE.has(extname(file))) continue;
    const text = await readFile(file, "utf8");
    for (const line of shapeHits(text)) {
      problems.push(
        `${file}:${line} declares a before/strong/after-shaped object — a ninth governed sentence outside ${GOVERNED_PATH} (D-09)`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("GOVERNED-SENTENCE CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the honesty surface does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery governed sentence is defined once, the set of eight is closed, and",
);
console.log("no second literal was found under app/, components/ or lib/.");
