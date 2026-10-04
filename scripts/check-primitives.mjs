/* ================================================================
   PRIMITIVES CHECK (D-06, D-07)

   D-06 builds the five primitives once; D-07 makes owning them a
   build rule, so a later screen consumes a primitive rather than
   re-declaring its size, its focus rule, a mark's geometry or a
   colour locally. Reuses check-governed.mjs's walk and report-and-
   exit convention and check-actor-field.mjs's layout: one named
   function per assertion, all awaited in one block at the bottom.

   Every assertion is a row of 04-UI-SPEC.md's complete D-07
   invariant list, and each sweeps one of that list's three scopes:
     css-modules  every *.module.css under app/ and components/
     css-all      css-modules plus app/globals.css — never the two
                  token files: tokens.inherited.css is byte-pinned
                  and tokens.capture.css is where a token must be
                  declared, so a rule forbidding its own declaration
                  would fail on correct code
     tsx          every *.ts and *.tsx under app/ and components/

     A1  css-modules  130px / var(--target-record) as a width or a
                      height, in exactly one module: the record
                      control's.
     A2  css-modules  44px / var(--target-min) as a min-height or a
                      min-width, only in the secondary control's,
                      the row's and the ribbon's modules.
     A3  css-all      outline / outline-offset only in
                      app/globals.css; no module carries a :focus
                      rule at all; that file's single :focus-visible
                      block declares outline and outline-offset and
                      nothing else — no box-shadow, no border.
     A4  css-modules  the seven state-mark shapes, declared in
                      exactly one module and closed at seven.
     A5  css-all+tsx  position: fixed, zero times.
     A6  css-all+tsx  position: sticky, zero times.
     A7  css-modules  Ribbon.module.css's only max-height is none.
     A8  css-all      the one transition declaration is the record
                      control's.
     A9  css-all      no raw hex, rgb() or rgba() colour literal.
     A13 css-all      --cobalt-glow, --record-fill, --dk-crit-edge
                      and --rule-faint never on a color: property;
                      --viewer-border only on a border-* property.
     A14 css-modules  --rule-faint, zero times.

   WHAT IT CANNOT CATCH: this is a text sweep over comment-blanked
   source, not a CSS or TypeScript parser. A value composed at
   runtime, a declaration reached through a custom-property
   indirection (a module that declares --x: 130px and then sets
   width: var(--x)), and a size or a style set from JavaScript are
   all outside what it can see. Comments are blanked by a regex, so a
   string literal that happens to contain the two characters opening
   a block comment swallows the code after it, and a trailing line
   comment after code on the same line is still read as code. A
   state mark drawn under a class name that says neither square nor
   diamond is invisible to A4, and A9 reads hex, rgb() and rgba()
   only — a named colour keyword or another colour function is not
   swept.

     node scripts/check-primitives.mjs

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readdir, readFile } from "node:fs/promises";
import { join, extname, sep } from "node:path";

const ROOTS = ["app", "components"];
const EXT = new Set([".ts", ".tsx", ".css"]);
const GLOBALS_CSS = "app/globals.css";

/**
 * One entry, with the reason: the record control is the build's one
 * 130 px primitive (Primitive 2), so its module alone may size a box
 * from the record target. A second entry is an architectural change,
 * never a maintenance edit.
 */
const RECORD_TARGET_OWNERS = ["components/controls/RecordControl.module.css"];

/**
 * Three entries, with the reason: the secondary control and the row
 * are the two primitives that carry the 44 px floor (Primitive 3),
 * and Ribbon.module.css predates them with its own link-target name
 * (Phase 1). No screen module declares a target size locally. A
 * fourth entry is an architectural change, never a maintenance edit.
 */
const MIN_TARGET_OWNERS = [
  "components/controls/SecondaryControl.module.css",
  "components/rows/Row.module.css",
  "components/shell/Ribbon.module.css",
];

/**
 * One owner, with the reason: the state marks are one component and
 * one module (Primitive 5), declaring all seven shapes of C-33's
 * closed set. A second owner is an architectural change, never a
 * maintenance edit.
 */
const STATE_MARK_OWNER = "components/marks/StateMark.module.css";

/** C-33's closed set of seven, in the source's own order. */
const STATE_MARK_SHAPES = [
  "hollow-square-2px",
  "half-filled-square",
  "filled-square",
  "filled-diamond",
  "hollow-square-diagonal",
  "hollow-square-1px",
  "hollow-square-dot",
];

/** A class name that reads as a mark's geometry, whoever declares it. */
const SHAPE_NAME_RE = /^(?:hollow|half|filled)-|square|diamond/;

/**
 * One entry, with the reason: the record control's press is the one
 * thing that moves in this phase (§Motion). A second entry is an
 * architectural change, never a maintenance edit.
 */
const TRANSITION_OWNERS = ["components/controls/RecordControl.module.css"];

const RIBBON_MODULE = "components/shell/Ribbon.module.css";

/** Tokens that are below the text floor on every ground they meet. */
const NEVER_ON_COLOR = ["--cobalt-glow", "--record-fill", "--dk-crit-edge", "--rule-faint"];

const problems = [];

/* ---------------------------------------------------------------
   directory walk (unchanged shape from check-governed.mjs)
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
   comment blanking, the three scopes, and a declaration reader
   --------------------------------------------------------------- */

const COMMENT_LINE_RE = /^\s*(\/\/|\*|\/\*)/;

/**
 * Blank every comment while keeping every newline, so a defect's line
 * number is the source's own. Block-comment spans go first, because a
 * JSX or CSS comment's continuation lines open with prose rather than
 * a comment marker, and check-actor-field.mjs's line filter alone
 * would read them as code. The line filter then blanks whole-line
 * comments. A comment marker later in a line is left alone: it may be
 * a URL inside a string.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (span) => span.replace(/[^\n]/g, ""))
    .split("\n")
    .map((line) => (COMMENT_LINE_RE.test(line) ? "" : line))
    .join("\n");
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

/** Every file under ROOTS, keyed by a forward-slash path, comments blanked. */
async function loadSources() {
  const sources = new Map();
  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const rel = file.split(sep).join("/");
      sources.set(rel, stripComments(await readFile(file, "utf8")));
    }
  }
  return sources;
}

const isCssModule = (f) => f.endsWith(".module.css");
const isCssAll = (f) => isCssModule(f) || f === GLOBALS_CSS;
const isTsx = (f) => f.endsWith(".ts") || f.endsWith(".tsx");

/** The [file, text] pairs a scope predicate admits. */
function scope(sources, admits) {
  return [...sources].filter(([file]) => admits(file));
}

/**
 * Every innermost rule of a comment-blanked stylesheet, as its selector,
 * the line it starts on, and its declarations ({ prop, value, line }).
 * An at-rule's prelude is never returned as a selector: the pattern
 * only matches a block that contains no further block.
 */
function rules(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const lead = m[1].length - m[1].trimStart().length;
    const rule = { selector: m[1].trim(), line: lineOf(css, m.index + lead), decls: [] };
    let offset = m.index + m[1].length + 1;
    for (const piece of m[2].split(";")) {
      const d = /^(\s*)([-\w]+)\s*:\s*([\s\S]*?)\s*$/.exec(piece);
      if (d) {
        rule.decls.push({
          prop: d[2].toLowerCase(),
          value: d[3].replace(/\s+/g, " "),
          line: lineOf(css, offset + d[1].length),
        });
      }
      offset += piece.length + 1;
    }
    out.push(rule);
  }
  return out;
}

function declarations(css) {
  return rules(css).flatMap((r) => r.decls);
}

/** A token name, matched whole: --cobalt-glow never matches --cobalt-glow-ink. */
const token = (name) => new RegExp(name + /(?![\w-])/.source);

/* ---------------------------------------------------------------
   A1 — the 130 px record geometry has one owner (Primitive 2)
   --------------------------------------------------------------- */

const SIZE_PROP_RE = /^(?:min-|max-)?(?:width|height)$/;
const RECORD_SIZE_RE = /(?<![\d.])130px|var\(\s*--target-record\s*\)/;

async function checkRecordTarget(sources) {
  let owned = 0;
  for (const [file, css] of scope(sources, isCssModule)) {
    const hits = declarations(css).filter(
      (d) => SIZE_PROP_RE.test(d.prop) && RECORD_SIZE_RE.test(d.value),
    );
    if (!hits.length) continue;
    if (RECORD_TARGET_OWNERS.includes(file)) {
      owned++;
      continue;
    }
    for (const d of hits) {
      problems.push(
        `${file}:${d.line} declares "${d.prop}: ${d.value}" — the 130px record geometry is declared in exactly one module, ${RECORD_TARGET_OWNERS[0]} (A1, D-07)`,
      );
    }
  }
  if (owned === 0) {
    problems.push(
      `${RECORD_TARGET_OWNERS[0]} declares no 130px / var(--target-record) width or height — the record geometry must exist in exactly one module (A1, D-07)`,
    );
  }
}

/* ---------------------------------------------------------------
   A2 — the 44 px floor is declared only by its owners (Primitive 3)
   --------------------------------------------------------------- */

const MIN_PROP_RE = /^min-(?:width|height)$/;
const MIN_SIZE_RE = /(?<![\d.])44px|var\(\s*--target-min\s*\)/;

async function checkMinTarget(sources) {
  for (const [file, css] of scope(sources, isCssModule)) {
    if (MIN_TARGET_OWNERS.includes(file)) continue;
    for (const d of declarations(css)) {
      if (MIN_PROP_RE.test(d.prop) && MIN_SIZE_RE.test(d.value)) {
        problems.push(
          `${file}:${d.line} declares "${d.prop}: ${d.value}" — no screen module declares a target size locally; the 44px floor belongs to the secondary control, the row and the ribbon (A2, D-07)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A3 — one focus rule in the build, and it is an outline (Primitive 4)

   The box-shadow / border clause is scoped to the one :focus-visible
   block: a build-wide sweep for border is undecidable, because every
   panel, row and control legitimately carries a 1 px --control-border.
   --------------------------------------------------------------- */

const FOCUS_SELECTOR_RE = /:focus/;
const OUTLINE_PROP_RE = /^outline(?:-|$)/;
const RING_PROPS = ["outline", "outline-offset"];

async function checkFocusRule(sources) {
  for (const [file, css] of scope(sources, isCssModule)) {
    for (const r of rules(css)) {
      if (FOCUS_SELECTOR_RE.test(r.selector)) {
        problems.push(
          `${file}:${r.line} declares the focus rule "${r.selector}" — no CSS module carries a :focus or :focus-visible rule; ${GLOBALS_CSS}'s single block is the build's only focus rule (A3, Primitive 4)`,
        );
      }
      for (const d of r.decls) {
        if (OUTLINE_PROP_RE.test(d.prop)) {
          problems.push(
            `${file}:${d.line} declares "${d.prop}: ${d.value}" — outline and outline-offset appear only in ${GLOBALS_CSS} (A3, Primitive 4)`,
          );
        }
      }
    }
  }

  const globals = sources.get(GLOBALS_CSS);
  if (globals === undefined) {
    problems.push(`${GLOBALS_CSS} is missing — it carries the build's one focus rule (A3, Primitive 4)`);
    return;
  }
  const focusRules = rules(globals).filter((r) => FOCUS_SELECTOR_RE.test(r.selector));
  if (focusRules.length !== 1 || !/:focus-visible/.test(focusRules[0].selector)) {
    problems.push(
      `${GLOBALS_CSS} carries ${focusRules.length} focus rule(s) [${focusRules.map((r) => r.selector).join(", ")}] — expected exactly one :focus-visible block (A3, Primitive 4)`,
    );
  }
  for (const r of focusRules) {
    for (const d of r.decls) {
      if (!RING_PROPS.includes(d.prop)) {
        problems.push(
          `${GLOBALS_CSS}:${d.line} declares "${d.prop}: ${d.value}" inside "${r.selector}" — the ring is outline and outline-offset only, never a box-shadow and never a border (A3, Primitive 4)`,
        );
      }
    }
    for (const prop of RING_PROPS) {
      if (!r.decls.some((d) => d.prop === prop)) {
        problems.push(
          `${GLOBALS_CSS}:${r.line} "${r.selector}" declares no ${prop} — the ring is an outline with an offset (A3, Primitive 4)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A4 — the seven state marks have one owner, closed at seven
   (Primitive 5), asserted the way check-governed.mjs asserts its
   closed set of eight: the actual list against the locked list.
   --------------------------------------------------------------- */

function shapeClasses(css) {
  const out = [];
  for (const r of rules(css)) {
    for (const m of r.selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      if (SHAPE_NAME_RE.test(m[1])) out.push({ name: m[1], line: r.line });
    }
  }
  return out;
}

async function checkStateMarks(sources) {
  for (const [file, css] of scope(sources, isCssModule)) {
    if (file === STATE_MARK_OWNER) continue;
    for (const s of shapeClasses(css)) {
      problems.push(
        `${file}:${s.line} declares the state-mark shape ".${s.name}" — a mark's geometry is declared in exactly one module, ${STATE_MARK_OWNER} (A4, Primitive 5)`,
      );
    }
  }
  const owner = sources.get(STATE_MARK_OWNER);
  const actual = owner === undefined ? [] : [...new Set(shapeClasses(owner).map((s) => s.name))];
  const closed =
    actual.length === STATE_MARK_SHAPES.length &&
    actual.every((name, i) => name === STATE_MARK_SHAPES[i]);
  if (!closed) {
    problems.push(
      `${STATE_MARK_OWNER} declares the shapes [${actual.join(", ")}] — expected exactly [${STATE_MARK_SHAPES.join(", ")}] in that order; the set is closed at seven (A4, Primitive 5)`,
    );
  }
}

/* ---------------------------------------------------------------
   A5, A6 — no pinned element (Decision 6)

   Matches fixed and sticky specifically: position: absolute and
   position: relative are legitimate and present today (the ribbon's
   hit area, globals.css's .sr-only). An inline style's quoted value
   is matched as well as a stylesheet's bare one.
   --------------------------------------------------------------- */

const POSITION_RE = {
  fixed: /(?<![\w-])position\s*:\s*["'`]?fixed(?![\w-])/g,
  sticky: /(?<![\w-])position\s*:\s*["'`]?sticky(?![\w-])/g,
};

function positionHits(text, keyword) {
  return [...text.matchAll(POSITION_RE[keyword])].map((m) => lineOf(text, m.index));
}

async function checkNoFixed(sources) {
  for (const [file, text] of scope(sources, (f) => isCssAll(f) || isTsx(f))) {
    for (const line of positionHits(text, "fixed")) {
      problems.push(
        `${file}:${line} declares position: fixed — Phase 4 has no fixed element (A5, Decision 6); Phase 9 raises this to exactly one, with a file allowlist naming the referral bar's module`,
      );
    }
  }
}

async function checkNoSticky(sources) {
  for (const [file, text] of scope(sources, (f) => isCssAll(f) || isTsx(f))) {
    for (const line of positionHits(text, "sticky")) {
      problems.push(
        `${file}:${line} declares position: sticky — no element in the build is pinned (A6, Decision 6)`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   A7 — the ribbon never collapses (Phase 1 assertion, retained)
   --------------------------------------------------------------- */

async function checkRibbonHeight(sources) {
  const css = sources.get(RIBBON_MODULE);
  if (css === undefined) return;
  for (const d of declarations(css)) {
    if (d.prop === "max-height" && d.value !== "none") {
      problems.push(
        `${RIBBON_MODULE}:${d.line} declares "max-height: ${d.value}" — the ribbon's only max-height is none (A7, Primitive 1)`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   A8 — one transition in the build (§Motion). Scoped to CSS: the
   word appears in two route files' prose.
   --------------------------------------------------------------- */

async function checkTransitions(sources) {
  for (const [file, css] of scope(sources, isCssAll)) {
    if (TRANSITION_OWNERS.includes(file)) continue;
    for (const d of declarations(css)) {
      if (/^transition(?:-|$)/.test(d.prop)) {
        problems.push(
          `${file}:${d.line} declares "${d.prop}: ${d.value}" — the only transition declaration is the record control's press, in ${TRANSITION_OWNERS[0]} (A8, §Motion)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A9 — every colour is a var(--token)
   --------------------------------------------------------------- */

const RAW_COLOUR_RE = /#[0-9a-fA-F]{3,8}(?![\w-])|(?<![\w-])rgba?\s*\(/gi;

async function checkRawColours(sources) {
  for (const [file, css] of scope(sources, isCssAll)) {
    for (const d of declarations(css)) {
      for (const m of d.value.matchAll(RAW_COLOUR_RE)) {
        problems.push(
          `${file}:${d.line} carries the raw colour literal "${m[0]}" in "${d.prop}: ${d.value}" — every colour is a var(--token) (A9, D-07)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A13 — tokens on the properties they are measured for. Scoped to
   css-all: tokens.capture.css names --viewer-border in its header.
   --------------------------------------------------------------- */

async function checkTokenPlacement(sources) {
  const viewerBorder = token("--viewer-border");
  for (const [file, css] of scope(sources, isCssAll)) {
    for (const d of declarations(css)) {
      if (d.prop === "color") {
        for (const name of NEVER_ON_COLOR) {
          if (token(name).test(d.value)) {
            problems.push(
              `${file}:${d.line} puts ${name} on "color: ${d.value}" — that token never carries text (A13, D-07)`,
            );
          }
        }
      }
      if (viewerBorder.test(d.value) && !/^border(?:-|$)/.test(d.prop)) {
        problems.push(
          `${file}:${d.line} puts --viewer-border on "${d.prop}: ${d.value}" — it appears only on a border-* property (A13, D-07)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A14 — the hairline is forbidden outright in every module (2.80:1
   on a panel). Scoped to modules: its own declaration in
   tokens.capture.css is correct and must survive (C-1).
   --------------------------------------------------------------- */

async function checkRuleFaint(sources) {
  const re = new RegExp(token("--rule-faint").source, "g");
  for (const [file, css] of scope(sources, isCssModule)) {
    for (const m of css.matchAll(re)) {
      problems.push(
        `${file}:${lineOf(css, m.index)} uses --rule-faint — it appears zero times in any CSS module (A14, Primitive 5)`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   run every assertion and report
   --------------------------------------------------------------- */

const sources = await loadSources();
await checkRecordTarget(sources);
await checkMinTarget(sources);
await checkFocusRule(sources);
await checkStateMarks(sources);
await checkNoFixed(sources);
await checkNoSticky(sources);
await checkRibbonHeight(sources);
await checkTransitions(sources);
await checkRawColours(sources);
await checkTokenPlacement(sources);
await checkRuleFaint(sources);

console.log("PRIMITIVES CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — a primitive is re-declared outside its one owner:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery primitive has one owner: no module re-declares a size, a focus rule,",
);
console.log("a mark's geometry or a raw colour, and nothing in the build is pinned.");
