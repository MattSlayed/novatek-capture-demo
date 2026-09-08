/* ================================================================
   AUTHORED-OBSERVATION CHECK

   The D-09/D-11 resolver and comment-fidelity check for
   lib/data/observations.ts (REQ-FR-21a). It proves, on every
   `verify` run:

     - every `drawn_from` resolves to a real fixture record id — a
       CitedFact id living inside some MACHINERY_BY_ID record's
       `facts[]`, or a key of DEVIATION_BY_ID, and nothing else (D-09);
     - every observation carries exactly one `// cites …` comment
       immediately above it, naming the same record as `drawn_from`,
       whose quoted text still equals what the live record holds
       (D-10, D-11);
     - the closed sets (`grade`, `relation`, `kind`), `asset_id`
       membership, id uniqueness, the D-08 asset exclusion list and
       the D-08 expected count all hold.

   WHAT THIS DOES AND DOES NOT PROVE, stated so nobody trusts it
   further than it deserves. It proves an id resolves and a quote
   still matches the record at the moment this script runs. It does
   NOT prove the quote is the *right* quote to have chosen, or that
   the wording is an honest inference the record actually supports —
   that judgement is the human provenance check FR-21a requires, and
   which plan 02-06 owns (D-02). A clean run here is the machine half
   only.

   COMMENT-FIDELITY RULE, fixed once, here:
     - a fact citation's quoted text must equal exactly
       `<label>: <value>` (or `<label>: <value> <unit>` when the fact
       carries a unit) composed from the LIVE fact's own fields — a
       fact's `label: value` pair is the whole of what the record
       says, so exact equality is right;
     - a deviation citation's quoted text must be a verbatim,
       contiguous substring of the named field's value on the LIVE
       deviation record — a deviation field is a paragraph, and D-10's
       own example quotes only one clause of it, so a substring is
       right.

   The record side is always the live, evaluated module — a dynamic
   import() of a file:// URL built from process.cwd(), never a second
   regex parse of plant.ts. The comment side is the only thing read as
   text, because the quoted string exists nowhere at runtime.

   Every path is resolved from process.cwd(), so this check runs
   correctly against a fixture tree via `runCheck(script, { cwd })` as
   well as against the real repository. No flag, no environment
   variable and no config value changes its behaviour.

     node scripts/check-observations.mjs

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CWD = process.cwd();

const OBSERVATIONS_PATH = "lib/data/observations.ts";
const PLANT_PATH = "lib/data/plant.ts";
const TYPES_PATH = "lib/data/types.ts";

/**
 * D-08 / D-04: the seed's own enumeration — ap003 three, as001 one,
 * gs001 two, an001 one, aa601 three, ac001 one, bb001 one — twelve in
 * total. This constant moves only by the reviewer's decision at the
 * 02-06 provenance checkpoint, in the same commit as the signed file;
 * it is never adjusted to make a count pass.
 */
const EXPECTED_COUNT = 12;

/** D-08: no observation may exist on these four assets. */
const FORBIDDEN_ASSETS = ["m-aa101", "m-aa102", "m-aa602", "m-aa605"];

const problems = [];

/* ---------------------------------------------------------------
   0. load the live, evaluated fixture modules
   --------------------------------------------------------------- */

async function loadModule(relPath) {
  const url = pathToFileURL(join(CWD, relPath)).href;
  return import(url);
}

let observationsModule = null;
let plantModule = null;
let typesModule = null;

try {
  observationsModule = await loadModule(OBSERVATIONS_PATH);
} catch (e) {
  problems.push(`could not import ${OBSERVATIONS_PATH}: ${e.message}`);
}
try {
  plantModule = await loadModule(PLANT_PATH);
} catch (e) {
  problems.push(`could not import ${PLANT_PATH}: ${e.message}`);
}
try {
  typesModule = await loadModule(TYPES_PATH);
} catch (e) {
  problems.push(`could not import ${TYPES_PATH}: ${e.message}`);
}

let observationsSource = null;
try {
  observationsSource = await readFile(join(CWD, OBSERVATIONS_PATH), "utf8");
} catch (e) {
  problems.push(`could not read ${OBSERVATIONS_PATH} as text: ${e.message}`);
}

/* ---------------------------------------------------------------
   1. source-text parsing — find each object literal in the
      OBSERVATIONS array and the // cites comment above it, without a
      full TS parser (check-governed.mjs's technique).
   --------------------------------------------------------------- */

/** Index of the bracket that closes the one at `openIndex` ("{" or
    "["), skipping string contents and handling either nesting inside
    the other. */
function findMatchingBracket(text, openIndex) {
  const stack = [text[openIndex]];
  let inString = null;
  for (let i = openIndex + 1; i < text.length; i++) {
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
    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }
    if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length === 0) return i;
      continue;
    }
  }
  return -1;
}

/** The value of a `field: "…"` string literal inside `block`, or null
    if the field isn't a bare double-quoted string there. The
    lookbehind guards against a short field name matching inside a
    longer one (e.g. "id" inside "asset_id"). */
function extractField(block, field) {
  const re = new RegExp(
    `(?<![A-Za-z0-9_])${field}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*[,}]`,
  );
  const m = re.exec(block);
  return m ? m[1] : null;
}

/** One fixed citation-comment form, matched against the text
    immediately above an observation literal:
      // cites <fact-or-deviation-id>[.<field>]: "<quoted text>" */
const CITES_RE = /\/\/\s*cites\s+([A-Za-z0-9_-]+)(?:\.([A-Za-z_][A-Za-z0-9_]*))?\s*:\s*"((?:[^"\\]|\\.)*)"/g;

/** Every top-level `{ … }` object literal between `start` and `end`
    (both absolute offsets into `text`), in source order. */
function extractArrayObjects(text, start, end) {
  const objects = [];
  let i = start;
  while (i < end) {
    if (text[i] !== "{") {
      i++;
      continue;
    }
    const close = findMatchingBracket(text, i);
    if (close === -1 || close > end) break;
    objects.push({ start: i, end: close, block: text.slice(i, close + 1) });
    i = close + 1;
  }
  return objects;
}

/** Every `// cites …` match found in `gapText`, as
    { id, field, quoted } — field is undefined for a fact citation. */
function citesInGap(gapText) {
  return [...gapText.matchAll(CITES_RE)].map((m) => ({
    id: m[1],
    field: m[2],
    quoted: m[3],
  }));
}

const parsedObjects = [];

if (observationsSource !== null) {
  const declIdx = observationsSource.indexOf("export const OBSERVATIONS");
  const eqIdx = declIdx === -1 ? -1 : observationsSource.indexOf("=", declIdx);
  const arrStart = eqIdx === -1 ? -1 : observationsSource.indexOf("[", eqIdx);
  const arrEnd = arrStart === -1 ? -1 : findMatchingBracket(observationsSource, arrStart);

  if (arrStart === -1 || arrEnd === -1) {
    problems.push(
      `could not find or parse "export const OBSERVATIONS: ... = [ … ]" in ${OBSERVATIONS_PATH}`,
    );
  } else {
    const objects = extractArrayObjects(observationsSource, arrStart + 1, arrEnd);
    let gapCursor = arrStart + 1;
    for (const obj of objects) {
      const gapText = observationsSource.slice(gapCursor, obj.start);
      const cites = citesInGap(gapText);
      const id = extractField(obj.block, "id");
      const asset_id = extractField(obj.block, "asset_id");
      const kind = extractField(obj.block, "kind");
      const grade = extractField(obj.block, "grade");
      const drawn_from = extractField(obj.block, "drawn_from");
      const relation = extractField(obj.block, "relation");
      parsedObjects.push({ id, asset_id, kind, grade, drawn_from, relation, cites });
      gapCursor = obj.end + 1;
    }
  }
}

/* ---------------------------------------------------------------
   2. per-observation assertions
   --------------------------------------------------------------- */

/** D-09's id space, resolved against the LIVE evaluated records —
    never a second regex parse of plant.ts. */
function resolveCitedRecord(drawnFrom, plant) {
  if (!plant) return undefined;
  if (drawnFrom.startsWith("ncr-")) return plant.DEVIATION_BY_ID.get(drawnFrom);
  for (const machine of plant.MACHINERY_BY_ID.values()) {
    const fact = machine.facts.find((f) => f.id === drawnFrom);
    if (fact) return fact;
  }
  return undefined;
}

/** A human-readable reason a drawn_from failed to resolve, so the two
    plausible-looking-but-wrong forms D-09 names are called out by
    name rather than reported as a bare "not found". */
function describeUnresolvable(drawnFrom, plant) {
  if (plant?.MACHINERY_BY_ID?.has(drawnFrom)) {
    return `"${drawnFrom}" is a machinery id, not a CitedFact id or a Deviation id`;
  }
  if (/^NCR-\d{4}-\d+$/i.test(drawnFrom)) {
    return `"${drawnFrom}" is the ncr_number display form, not the Deviation's bare id — use the "ncr-…" form`;
  }
  return `"${drawnFrom}" does not resolve to any CitedFact id or Deviation id`;
}

const seenIds = new Set();

for (const o of parsedObjects) {
  const label = o.id ?? "(observation with unreadable id)";

  if (!o.id) {
    problems.push(`an observation literal has no readable "id" field`);
  } else if (seenIds.has(o.id)) {
    problems.push(`observation id "${o.id}" is used more than once`);
  } else {
    seenIds.add(o.id);
  }

  if (o.asset_id && FORBIDDEN_ASSETS.includes(o.asset_id)) {
    problems.push(
      `observation "${label}" is on asset "${o.asset_id}", which D-08 carries no observation for`,
    );
  }
  if (o.asset_id && plantModule && !plantModule.MACHINERY_BY_ID.has(o.asset_id)) {
    problems.push(
      `observation "${label}"'s asset_id "${o.asset_id}" is not a key of MACHINERY_BY_ID`,
    );
  }

  if (typesModule) {
    if (!o.kind || !typesModule.OBSERVATION_KINDS.includes(o.kind)) {
      problems.push(`observation "${label}"'s kind "${o.kind}" is not in OBSERVATION_KINDS`);
    }
    if (!o.grade || !typesModule.OBSERVATION_GRADES.includes(o.grade)) {
      problems.push(
        `observation "${label}"'s grade "${o.grade}" is not in OBSERVATION_GRADES (D-12) — EXTRACTED is never constructible here`,
      );
    }
    if (!o.relation || !typesModule.OBSERVATION_RELATIONS.includes(o.relation)) {
      problems.push(
        `observation "${label}"'s relation "${o.relation}" is not in OBSERVATION_RELATIONS`,
      );
    }
  }

  // comment presence and pairing (D-11)
  if (o.cites.length === 0) {
    problems.push(`observation "${label}" has no "// cites " comment above it (D-11)`);
  } else if (o.cites.length > 1) {
    problems.push(
      `observation "${label}" has ${o.cites.length} "// cites " comments above it — expected exactly one (D-11)`,
    );
  }

  if (!o.drawn_from) {
    problems.push(`observation "${label}" has no readable "drawn_from" field`);
    continue;
  }

  const cite = o.cites.length === 1 ? o.cites[0] : null;
  if (cite && cite.id !== o.drawn_from) {
    problems.push(
      `observation "${label}"'s comment cites "${cite.id}" but drawn_from is "${o.drawn_from}" — the comment and the field must name the same record (D-11)`,
    );
  }

  // resolution (D-09)
  const resolved = resolveCitedRecord(o.drawn_from, plantModule);
  if (!resolved) {
    problems.push(
      `observation "${label}"'s drawn_from ${describeUnresolvable(o.drawn_from, plantModule)} (D-09)`,
    );
    continue;
  }

  if (!cite) continue; // already reported above (missing/duplicate comment)

  // comment fidelity (D-10)
  const isDeviation = o.drawn_from.startsWith("ncr-");
  if (isDeviation) {
    if (!cite.field) {
      problems.push(
        `observation "${label}"'s comment cites deviation "${o.drawn_from}" with no ".<field>" name (D-10)`,
      );
    } else if (!(cite.field in resolved)) {
      problems.push(
        `observation "${label}"'s comment names field "${cite.field}", which is not a key on deviation "${o.drawn_from}" (D-10)`,
      );
    } else if (typeof resolved[cite.field] !== "string") {
      problems.push(
        `observation "${label}"'s comment cites field "${cite.field}" on "${o.drawn_from}", which is not a string value and cannot be quoted (D-10)`,
      );
    } else if (!resolved[cite.field].includes(cite.quoted)) {
      problems.push(
        `observation "${label}"'s quoted text does not appear verbatim in "${o.drawn_from}.${cite.field}" (D-10): quoted "${cite.quoted}"`,
      );
    }
  } else {
    if (cite.field) {
      problems.push(
        `observation "${label}"'s comment cites fact "${o.drawn_from}" with a ".${cite.field}" field name — a fact citation names no field (D-10)`,
      );
    }
    const expected = resolved.unit
      ? `${resolved.label}: ${resolved.value} ${resolved.unit}`
      : `${resolved.label}: ${resolved.value}`;
    if (cite.quoted !== expected) {
      problems.push(
        `observation "${label}"'s quoted text does not match the live fact "${o.drawn_from}" (D-10): expected "${expected}", got "${cite.quoted}"`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   3. whole-set assertions
   --------------------------------------------------------------- */

if (observationsModule) {
  const count = observationsModule.OBSERVATIONS.length;
  if (count !== EXPECTED_COUNT) {
    problems.push(
      `OBSERVATIONS.length is ${count} — expected exactly ${EXPECTED_COUNT} (D-08, D-04)`,
    );
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log("AUTHORED-OBSERVATION CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — a citation does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery drawn_from resolves, every citation comment matches its live record, and",
);
console.log(
  "the closed sets, the D-08 exclusion list and the expected count all hold. This",
);
console.log(
  "proves the citations are well-formed and current — not that they are the right",
);
console.log("citations to have made; that judgement is the human provenance check's.");
