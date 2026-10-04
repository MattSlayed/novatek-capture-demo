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
     A10 tsx          aria-modal, nowhere: it hides everything outside
                      a dialog from assistive technology, so the
                      ribbon would be unreachable by rotor on the gate
                      (Decision 4).
     A12 tsx          no next/link import, no useRouter and no
                      router.push (SC-5).
     A13 css-all      --cobalt-glow, --record-fill, --dk-crit-edge
                      and --rule-faint never on a color: property;
                      --viewer-border only on a border-* property.
     A14 css-modules  --rule-faint, zero times.
     A15 tsx          navigator.vibrate in exactly one file, the
                      record control's, which also carries the literal
                      feature test "vibrate" in navigator (NFR-4a). A
                      browser assertion cannot carry this: headless
                      Chromium reports the API as present, so only the
                      source can show that the call is feature-tested.
     A16 tsx          localStorage, sessionStorage and indexedDB,
                      nowhere; and no *.tsx declares module-scope
                      mutable state, matched as a top-level let,
                      new Map( or new Set( (SC-5, T-04-03).
     A17 tsx          no file other than components/shell/Screen.tsx
                      imports parseSurface or parseId from
                      lib/client/navigate — D-01's one parse point, as
                      an allowlist, so the rule is decidable before
                      the switcher lands and after it.
     D1  copy         lib/copy/governed.ts exports FR48A_DISPOSITION
                      as a plain string, outside GOVERNED, which stays
                      at eight (check-governed.mjs owns the eight).
     D3  copy         already_open is in ConflictCode, CONFLICT_CODES
                      and CONFLICT_COPY, with a non-empty sentence and
                      exactly one action (D-05).

   Two rows of the list are deliberately absent. A11 moved to C8 in
   plan 04-12: whether the ribbon or any ancestor of it is hidden from
   assistive technology is an ancestry question that needs a rendered
   tree. B2 belongs to check-tokens.mjs, which already owns the
   four-entry exemption register, and two owners of one rule is how a
   rule gets half-removed later.

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

   The A16 module-state half is a string sweep that cannot tell a
   frozen lookup table from a mutable one, which is why it matches
   let and the two constructors rather than "a mutable object": a
   constant Map is flagged, and an object literal mutated in place is
   not. It reads brace depth, not scope, so a constructor nested in a
   top-level object literal is missed, and module-scope text that
   merely contains those words is a false positive. The storage half
   asserts absence from this sweep's two roots rather than presence
   under lib/client/, which is not one of them; lib/client/projection.ts
   and lib/client/disclosure.ts are the modules that legitimately hold
   the state this assertion pushes out of the component tree. A15 and
   A17 read call sites and static import statements, so a destructured
   vibrate and a dynamic import() of the navigation module are outside
   them. D1 and D3 read their lib/ modules as text, from paths built
   off process.cwd(), never a fixed path.

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

/**
 * One entry, with the reason: the record control is the build's one
 * haptic call site, behind a feature test (Primitive 2, NFR-4a). A
 * second entry is an architectural change, never a maintenance edit.
 */
const HAPTIC_OWNERS = ["components/controls/RecordControl.tsx"];

/**
 * One entry, with the reason: D-01 names one parse point for the
 * surface and the id, the screen switcher. Absence is allowed, so the
 * rule holds before the switcher lands. A second entry is an
 * architectural change, never a maintenance edit.
 */
const PARSE_POINT_OWNERS = ["components/shell/Screen.tsx"];

const CWD = process.cwd();
const GOVERNED_PATH = "lib/copy/governed.ts";
const TYPES_PATH = "lib/data/types.ts";
const CONFLICTS_PATH = "lib/copy/conflicts.ts";

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
   A10 — no modality anywhere (Decision 4)
   --------------------------------------------------------------- */

async function checkModality(sources) {
  for (const [file, text] of scope(sources, isTsx)) {
    for (const m of text.matchAll(/aria-modal/g)) {
      problems.push(
        `${file}:${lineOf(text, m.index)} carries aria-modal — it hides everything outside the dialog from assistive technology, which would make the ribbon unreachable by rotor on the gate (A10, Decision 4)`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   A12 — navigation is the history API, never the router (SC-5)
   --------------------------------------------------------------- */

const NAVIGATION_RES = [
  /["']next\/link["']/g,
  /(?<![\w$])useRouter(?![\w$])/g,
  /(?<![\w$])router\s*\.\s*push(?![\w$])/g,
];

async function checkNavigation(sources) {
  for (const [file, text] of scope(sources, isTsx)) {
    for (const re of NAVIGATION_RES) {
      for (const m of text.matchAll(re)) {
        problems.push(
          `${file}:${lineOf(text, m.index)} uses ${m[0]} — in-app navigation is window.history, with no next/link, no useRouter and no router.push (A12, SC-5)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A15 — one haptic call site, feature-tested (NFR-4a)
   --------------------------------------------------------------- */

const VIBRATE_RE = /navigator\s*\??\.\s*vibrate(?![\w$])/g;
const FEATURE_TEST_RE = /["']vibrate["']\s+in\s+navigator(?![\w$])/;

async function checkHaptic(sources) {
  for (const [file, text] of scope(sources, isTsx)) {
    if (HAPTIC_OWNERS.includes(file)) continue;
    for (const m of text.matchAll(VIBRATE_RE)) {
      problems.push(
        `${file}:${lineOf(text, m.index)} calls ${m[0]} — the build's one haptic call site is ${HAPTIC_OWNERS[0]} (A15, NFR-4a)`,
      );
    }
  }
  const owner = sources.get(HAPTIC_OWNERS[0]);
  if (owner === undefined || !owner.match(VIBRATE_RE)) {
    problems.push(
      `${HAPTIC_OWNERS[0]} carries no navigator.vibrate call — it appears in exactly one file, the record control's (A15, NFR-4a)`,
    );
  } else if (!FEATURE_TEST_RE.test(owner)) {
    problems.push(
      `${HAPTIC_OWNERS[0]} calls navigator.vibrate with no "vibrate" in navigator feature test beside it (A15, NFR-4a)`,
    );
  }
}

/* ---------------------------------------------------------------
   A16 — no browser storage, and no module-scope mutable state, in
   the component tree (SC-5, T-04-03)
   --------------------------------------------------------------- */

const STORAGE_RE = /(?<![\w$])(?:localStorage|sessionStorage|indexedDB)(?![\w$])/g;
const MODULE_STATE_RES = [/(?<![\w$.])let\s+(?:[\w$]+|[[{])/g, /(?<![\w$.])new\s+(?:Map|Set)\s*\(/g];

/** The text at brace depth zero; everything inside a block becomes spaces, newlines kept. */
function moduleScope(src) {
  let depth = 0;
  let out = "";
  for (const ch of src) {
    if (ch === "{") depth++;
    out += depth === 0 || ch === "\n" ? ch : " ";
    if (ch === "}") depth = Math.max(0, depth - 1);
  }
  return out;
}

async function checkClientState(sources) {
  for (const [file, text] of scope(sources, isTsx)) {
    for (const m of text.matchAll(STORAGE_RE)) {
      problems.push(
        `${file}:${lineOf(text, m.index)} touches ${m[0]} — no file under app/ or components/ reads or writes browser storage; persisted client facts live under lib/client/ (A16, T-04-03)`,
      );
    }
    if (!file.endsWith(".tsx")) continue;
    const top = moduleScope(text);
    for (const re of MODULE_STATE_RES) {
      for (const m of top.matchAll(re)) {
        problems.push(
          `${file}:${lineOf(top, m.index)} declares module-scope mutable state (${m[0].trim()}) — cached state lives in lib/client/projection.ts, never in the component tree (A16, T-04-03)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   A17 — one parse point for the surface and the id (D-01)
   --------------------------------------------------------------- */

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;
const NAVIGATE_SOURCE_RE = /(?:^|\/)lib\/client\/navigate(?:\.ts)?$/;
const PARSE_NAME_RE = /(?<![\w$])parse(?:Surface|Id)(?![\w$])/;

async function checkParsePoint(sources) {
  for (const [file, text] of scope(sources, isTsx)) {
    if (PARSE_POINT_OWNERS.includes(file)) continue;
    for (const m of text.matchAll(IMPORT_RE)) {
      if (!NAVIGATE_SOURCE_RE.test(m[2])) continue;
      const namespaced = /\*\s*as\s+[\w$]+/.test(m[1]) && /\.\s*parse(?:Surface|Id)(?![\w$])/.test(text);
      if (PARSE_NAME_RE.test(m[1]) || namespaced) {
        problems.push(
          `${file}:${lineOf(text, m.index)} imports parseSurface / parseId from ${m[2]} — D-01's one parse point is ${PARSE_POINT_OWNERS[0]} (A17, D-01)`,
        );
      }
    }
  }
}

/* ---------------------------------------------------------------
   source-level reading of two lib/ modules for D1 and D3 — the
   brace-balancer from check-governed.mjs, unchanged, which skips
   braces inside string literals
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
    const keyMatch = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*/.exec(innerText.slice(i));
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

async function readLib(path, id) {
  try {
    return stripComments(await readFile(join(CWD, path), "utf8"));
  } catch (e) {
    problems.push(`could not read ${path}: ${e.message} (${id})`);
    return null;
  }
}

/* ---------------------------------------------------------------
   D1 — the FR-48a disposition sentence exists, and sits outside the
   closed set. check-governed.mjs already fails a ninth member and a
   third triple; this carries the one thing it does not.
   --------------------------------------------------------------- */

async function checkDisposition() {
  const src = await readLib(GOVERNED_PATH, "D1");
  if (src === null) return;
  const decl = /export\s+const\s+FR48A_DISPOSITION(?![\w$])[^=]*=\s*/.exec(src);
  if (!decl) {
    problems.push(
      `${GOVERNED_PATH} does not export FR48A_DISPOSITION — the FR-48a disposition sentence is a named export beside PLATFORM_413 (D1)`,
    );
    return;
  }
  const at = decl.index + decl[0].length;
  if (!/["'`]/.test(src[at] ?? "")) {
    const end = src.indexOf(";", at);
    const rhs = src.slice(at, end === -1 ? undefined : end);
    const triple = ["before", "strong", "after"].every((k) =>
      new RegExp(k + /\s*:/.source).test(rhs),
    );
    problems.push(
      `${GOVERNED_PATH}:${lineOf(src, decl.index)} FR48A_DISPOSITION is ${triple ? "a {before, strong, after} triple" : "not a plain string"} — the disposition is a plain string, never a governed sentence (D1)`,
    );
  }
  const head = /export\s+const\s+GOVERNED(?![\w$])[^=]*=\s*/.exec(src);
  const block = head ? extractBraceBlock(src, head.index + head[0].length) : null;
  if (!block) {
    problems.push(
      `${GOVERNED_PATH} has no GOVERNED object literal, so FR48A_DISPOSITION cannot be shown to sit outside it (D1)`,
    );
    return;
  }
  if (decl.index > block.start && decl.index < block.end) {
    problems.push(
      `${GOVERNED_PATH}:${lineOf(src, decl.index)} declares FR48A_DISPOSITION inside GOVERNED's object literal (D1)`,
    );
  }
  const member = /(?<![\w$])FR48A_DISPOSITION(?![\w$])/.exec(block.content);
  if (member) {
    problems.push(
      `${GOVERNED_PATH}:${lineOf(src, block.start + member.index)} names FR48A_DISPOSITION inside GOVERNED — the disposition is not a member of the closed set of eight (D1, D-09)`,
    );
  }
}

/* ---------------------------------------------------------------
   D3 — already_open in all three places, with one next act (D-05)
   --------------------------------------------------------------- */

const ALREADY_OPEN_RE = /["']already_open["']/;

async function checkAlreadyOpen() {
  const types = await readLib(TYPES_PATH, "D3");
  const copy = await readLib(CONFLICTS_PATH, "D3");
  if (types === null || copy === null) return;

  const union = /export\s+type\s+ConflictCode\s*=([^;]*);/.exec(types);
  if (!union || !ALREADY_OPEN_RE.test(union[1])) {
    problems.push(`${TYPES_PATH} ConflictCode does not carry "already_open" (D3, D-05)`);
  }
  const codes = /export\s+const\s+CONFLICT_CODES(?![\w$])[^=]*=\s*(?:Object\.freeze\(\s*)?\[([^\]]*)\]/.exec(types);
  if (!codes || !ALREADY_OPEN_RE.test(codes[1])) {
    problems.push(`${TYPES_PATH} CONFLICT_CODES does not carry "already_open" (D3, D-05)`);
  }

  const head = /export\s+const\s+CONFLICT_COPY(?![\w$])[^=]*=\s*/.exec(copy);
  const block = head ? extractBraceBlock(copy, head.index + head[0].length) : null;
  const entry = block
    ? extractTopLevelEntries(block.content.slice(1, -1)).find((e) => e.key === "already_open")
    : undefined;
  if (!entry) {
    problems.push(`${CONFLICTS_PATH} CONFLICT_COPY has no already_open entry (D3, D-05)`);
    return;
  }
  const sentence = /(?<![\w$])sentence\s*:\s*(["'`])([\s\S]*?)\1/.exec(entry.block);
  if (!sentence || !sentence[2].trim()) {
    problems.push(`${CONFLICTS_PATH} CONFLICT_COPY.already_open has no non-empty sentence (D3, D-05)`);
  }
  const actions = /(?<![\w$])actions\s*:\s*\[([^\]]*)\]/.exec(entry.block);
  const count = actions ? [...actions[1].matchAll(/(["'`])(?:(?!\1)[^\n])*\1/g)].length : 0;
  if (count !== 1) {
    problems.push(
      `${CONFLICTS_PATH} CONFLICT_COPY.already_open carries ${count} actions — it carries exactly one next act (D3, D-05)`,
    );
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
await checkModality(sources);
await checkNavigation(sources);
await checkTokenPlacement(sources);
await checkRuleFaint(sources);
await checkHaptic(sources);
await checkClientState(sources);
await checkParsePoint(sources);
await checkDisposition();
await checkAlreadyOpen();

console.log("PRIMITIVES CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — a primitive escaped its one owner, or D-07's contract is broken:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nEvery primitive has one owner and nothing in the build is pinned, modal, routed",
);
console.log("or stored outside lib/client/; the disposition and already_open are in place.");
