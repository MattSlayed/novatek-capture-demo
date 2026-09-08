/* ================================================================
   CLAIMS AUDIT

   Register version: 2 — the ipv-demo register, carried verbatim,
   plus NOVATEK Capture's own additions (D-18).
   inherited from ipv-demo/HANDOVER.md §3 at 8fd097a (2026-09-01).
   owner: the SHEQ manager.

   Sweeps every string this project can put in front of a reviewer
   against the register below, and fails the run if a prohibited
   claim appears.

   WHY THIS IS A SCRIPT AND NOT A CHECKLIST. The claims discipline is
   the reason the preview is worth showing: it is what makes the
   defensible claims believable. A discipline enforced by re-reading
   the page decays the first time someone is in a hurry. This runs in
   seconds and can go in CI.

   WHAT IT CANNOT DO, stated so nobody trusts it further than it
   deserves: it is a string sweep. It cannot detect a prohibited
   position expressed in new words — the failure mode the corpus
   correction pass called "the differently-shaped overclaim". A clean
   run here means no KNOWN retired phrasing is present. It does not
   mean the copy is honest. That still needs a person.

     node scripts/claims-audit.mjs

   Exit 0 = clean. Exit 1 = at least one prohibited claim found.
   ================================================================ */

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".css", ".md"]);

/* ---------------------------------------------------------------
   THE REGISTER

   `kind: "retired"` — was claimed, is now withdrawn, must never be
   restated in any form.
   `kind: "never"`   — was never defensible.
   `kind: "figure"`  — a number the dossier marks unusable.

   `allowQuoted` marks entries a document may legitimately quote IN
   ORDER TO RECORD THAT THEY ARE RETIRED. Where that applies, the line
   must also carry an explicit retirement marker, or it fails.

   Every entry above the "--- D-18 additions ---" divider is the
   ipv-demo register, inherited verbatim (D-17) — none of its wording,
   pattern or note is edited, even where a D-18 addition would
   otherwise duplicate it (see the two inline comments below).
   --------------------------------------------------------------- */
const PROHIBITED = [
  {
    kind: "retired",
    // D-18: gains the \bfunded by this round\b alternation — NOVATEK
    // Capture's own funding-alternation addition to this same rule,
    // rather than a second, separate entry.
    pattern: /\bIPV is funded\b|\bfunded and specified\b|\bfunded by this round\b/i,
    note: "IPV is not funded. 'Specified, and not yet built' is the defensible form.",
    allowQuoted: true,
  },
  {
    kind: "retired",
    pattern: /records? never cross(es)? the border/i,
    note: "Retired residency claim. IPV-ARCHITECTURE §4.",
    allowQuoted: true,
    // D-18: satisfies the seed's "records never cross the border" addition —
    // already inherited above, not duplicated (01-PATTERNS.md flags this).
  },
  {
    kind: "retired",
    pattern: /client data does not leave (SA|South Africa)/i,
    note: "Retired residency claim.",
    allowQuoted: true,
  },
  {
    kind: "never",
    pattern: /POPIA requires? .{0,40}(stay|remain) in South Africa/i,
    note: "POPIA s.72 permits cross-border transfer under conditions.",
  },
  {
    kind: "never",
    pattern: /\b(inference|processing) sovereignty\b/i,
    note: "Never claimable — Claude on Vertex AI has no African region.",
    allowQuoted: true,
  },
  {
    kind: "never",
    pattern: /\bsimulat(e|es|ed|ion|ing)\b/i,
    note: "Prohibited word. The training module is procedural rehearsal.",
    allowQuoted: true,
    // D-18: satisfies the seed's ban on that prohibited word (its every
    // grammatical form) — already inherited above, not duplicated (01-PATTERNS.md flags this).
  },
  {
    kind: "never",
    pattern: /\bscenario planning\b|rehearse changes virtually/i,
    note: "Ceded to Prevu3D / Siemens.",
  },
  {
    kind: "never",
    pattern: /\b(live |real[- ]time )?(IoT|SCADA)\b.{0,24}(feed|integration|connect)/i,
    note: "IPV has no IoT/SCADA path. Correct form: reads live business-system values.",
  },
  {
    kind: "never",
    pattern: /reduce(s|d)? (reliance on imported|headcount)/i,
    note: "Appears nowhere in the TIA Act or APP; headcount framing is politically fatal.",
    // D-18: satisfies the seed's staffing-framing addition ("never 'reduce
    // headcount'") — already inherited above, not duplicated (Rule 1 fix:
    // this overlap is not flagged in 01-PATTERNS.md, found during this task).
  },
  {
    kind: "never",
    pattern: /pumps? (consume|use) .{0,16}10\s*%.{0,24}(global )?electricity/i,
    note: "That is the IEA savings potential, not consumption.",
  },
  {
    kind: "never",
    pattern: /net exporter of pumps/i,
    note: "SA is a small net importer.",
  },
  { kind: "figure", pattern: /\$?59\s*million per hour/i, note: "Do-not-use figure." },
  { kind: "figure", pattern: /70\s*%.{0,30}tribal/i, note: "Do-not-use figure." },
  { kind: "figure", pattern: /\$?260[,.]?000\s*\/?\s*(per )?hour/i, note: "Do-not-use figure." },
  { kind: "figure", pattern: /40\s*%.{0,40}(searching|search for)/i, note: "Do-not-use figure." },
  {
    kind: "never",
    pattern: /load[- ]shedding/i,
    note: "Inverted framing required — 199 consecutive days without load shedding to Dec 2025.",
    allowQuoted: true,
  },
  {
    kind: "never",
    pattern: /\b(CIPA|National Key Point)\b/i,
    note: "Standing prohibition: never discuss any site's status.",
  },

  /* --- D-18 additions: NOVATEK Capture-specific entries, seed's register --- */

  {
    kind: "never",
    pattern: /\b(as|writes?|files?|records?|reports?|raises?|surfaces?)\s+(a\s+)?findings?\b/i,
    note: "Nothing in Capture creates a finding — PRD §3 glossary: 'finding means an asserted fact, which nothing in this system creates' (REQ-FR-50).",
    allowQuoted: true,
  },
  {
    kind: "never",
    pattern:
      /\b(camera|model|AI|vision)\b.{0,40}\b(detects|detected|recognis(es|ed)|identif(ies|ied))\b.{0,30}\b(corrosion|leak|damage|asset|unit)\b/i,
    note: "No model runs anywhere in this preview; verification and observations are authored from fixtures (AD-8; PROJECT.md Out of Scope).",
  },
  {
    kind: "figure",
    pattern: /\d+(\.\d+)?\s*(%|x|×)\s*(faster|fewer|less|reduction|saved)/i,
    note: "No performance figure is claimable as an achievement (REQ-FR-50).",
  },
  {
    kind: "figure",
    pattern: /\bin under \d+ (seconds|minutes)/i,
    note: "No turnaround figure is claimable as an achievement (REQ-FR-50).",
  },
  {
    kind: "never",
    pattern:
      /\bpersisted (to|in|on) (a |the )?(server|database|cloud)\b|\bencrypted at rest\b|\bsecure(ly)? stored\b/i,
    note: "No database exists behind this preview (AD-10); nothing is persisted server-side (PROJECT.md Out of Scope).",
  },
  {
    kind: "never",
    pattern: /\bTRL\s*-?\s*[1-9]\b|\btechnology readiness level\b/i,
    note: "No product-level readiness number is claimable for Capture (REQ-FR-50).",
    allowQuoted: true,
  },
  {
    kind: "never",
    pattern: /\b(Prevu3D|Siemens|Matterport|Hexagon|AVEVA)\b/,
    note: "Ceded to named competitors; the SHEQ manager extends this list when a new competitor is named (REQ-FR-50; ../ipv-demo/HANDOVER.md §3 cedes Prevu3D and Siemens).",
    allowQuoted: true,
  },
  {
    kind: "figure",
    // The word boundary guards only the letter currencies: `\b\$` can
    // never match in prose (a dollar sign is a non-word character and
    // is almost always preceded by a space), which had left every
    // $-denominated saving claim unaudited.
    pattern:
      /(?:\b(?:R|ZAR|USD)|\$)\s?\d[\d ,.]*\s*(k|m|bn|million|billion)?\b.{0,40}\b(saved|saving|savings|avoided)\b/i,
    note: "No modelled saving may be presented as cash (REQ-FR-50).",
  },
  {
    kind: "figure",
    pattern: /\b(saves?|saving|savings)\b.{0,30}(?:\b(?:R|ZAR|USD)|\$)\s?\d/i,
    note: "No modelled saving may be presented as cash (REQ-FR-50).",
  },
  {
    kind: "never",
    // D-18 extension of the inherited prohibited-word entry above
    // (carried verbatim, not edited): that pattern's trailing \b leaves
    // the plural noun (stem + "ions") and the agent noun (stem + "or",
    // "ors") unmatched. This entry catches every remaining form of the
    // stem and excludes exactly the suffixes the inherited entry already
    // covers, so one occurrence is still reported exactly once.
    pattern: /\bsimulat(?!(?:e|es|ed|ion|ing)\b)/i,
    note: "Prohibited word, in every remaining grammatical form of the stem — plural and agent nouns included (D-18; extends the inherited entry).",
    allowQuoted: true,
  },
];

/** Marks prose that is quoting a claim in order to retire or deny it.
    Every alternative up to `never claim` is the ipv-demo marker,
    inherited verbatim; `never as (a )?finding` is Capture's addition.
    `no model` was also added here and has been removed again: it is
    ordinary product copy on every honesty surface ("No model ran.",
    "no model observed"), so any allowQuoted phrase within three lines
    of a governed sentence was auto-excused as quoted-to-retire rather
    than reported. A marker must recognise a retirement note, not the
    copy it guards. */
const RETIREMENT_MARKER =
  /retired|withdrawn|never restate|no longer|prohibited|do not (use|claim)|must not|does not claim|does not model|superseded|stop claiming|not claimable|out of scope|ceded|what this is not|rather than claimed|never claim|never as (a )?finding/i;

/**
 * How many lines either side of a hit to search for that marker.
 *
 * Checking only the matched line is what a first cut does, and it
 * fails every correct case: a claims table quotes the retired string
 * on one line and says "Retired. Quoted here solely to record that it
 * is retired" on the next, and a paragraph opens "What this is not"
 * two lines above the word it is disowning. All four findings in the
 * first run of this script were that mistake, not four defects in the
 * copy — a gate that fails a correct subject, which is worse than no
 * gate because it trains the reader to ignore it.
 */
const CONTEXT = 3;

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

const findings = [];

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const text = await readFile(file, "utf8");
    const lines = text.split("\n");
    for (const rule of PROHIBITED) {
      lines.forEach((line, i) => {
        if (!rule.pattern.test(line)) return;
        const window = lines
          .slice(Math.max(0, i - CONTEXT), i + CONTEXT + 1)
          .join(" ");
        const excused = rule.allowQuoted && RETIREMENT_MARKER.test(window);
        findings.push({
          file,
          line: i + 1,
          kind: rule.kind,
          note: rule.note,
          excused,
          text: line.trim().slice(0, 132),
        });
      });
    }
  }
}

const live = findings.filter((f) => !f.excused);
const quoted = findings.filter((f) => f.excused);

console.log("IPV CLAIMS AUDIT");
console.log("=".repeat(72));
console.log(`Scanned: ${ROOTS.join(", ")}   Rules: ${PROHIBITED.length}`);
console.log(
  `Hits: ${findings.length}  |  live violations: ${live.length}  |  quoted-as-retired: ${quoted.length}`,
);

if (quoted.length) {
  console.log("\nQUOTED IN ORDER TO RECORD RETIREMENT (allowed):");
  for (const f of quoted) {
    console.log(`  ok  ${f.file}:${f.line}`);
    console.log(`      ${f.text}`);
  }
}

if (live.length) {
  console.log("\nLIVE VIOLATIONS — these must be removed or marked as retired:");
  for (const f of live) {
    console.log(`  ${f.kind.toUpperCase()}  ${f.file}:${f.line}`);
    console.log(`      ${f.text}`);
    console.log(`      why: ${f.note}`);
  }
  console.log(
    "\nA string sweep cannot catch a prohibited position expressed in new words.",
  );
  process.exit(1);
}

console.log("\nNo live prohibited claim found in the swept surfaces.");
console.log(
  "This is a STRING sweep: it proves no KNOWN retired phrasing is present.\n" +
    "It does not prove the copy is honest — a differently-worded overclaim would\n" +
    "pass. That judgement still needs a reader.",
);
