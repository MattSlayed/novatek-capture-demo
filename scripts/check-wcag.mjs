/* ================================================================
   WCAG A/AA CHECK

   Runs axe-core through the Playwright 1.62.1 harness
   (scripts/lib/harness.mjs) against the production build, on the
   five surfaces UI-SPEC invariant C7 names, at the pinned 390 x 844
   mobile profile, and fails on any A or AA violation (REQ-NFR-9,
   D-21). It also asserts the ribbon's REQ-FR-48 contract by
   construction, not by axe rule: present once, never aria-hidden,
   position: static, max-height: none, a >=44px named link, and no
   dismiss-shaped control.

   SESSION AND SURFACES. `/` alone is scanned with no credential
   present, because the gate with nothing minted is the state
   REQ-FR-48a is about. A session is then minted for acc-mabaso by
   POST /api/session through page.request, whose cookie jar the page
   shares, and the mint must answer 201 before anything authenticated
   is scanned. The other four surfaces — /?s=orders,
   /?s=order&id=wo-0142, /?s=time&id=wo-0142 and /?s=limits — are
   scanned after the mint. /?s=limits belongs there and not before:
   with no session the switcher renders the gate at every value of
   `s` (D-03), so a pre-mint scan of it would scan the gate twice and
   never reach Limits. Every scan waits for #screen-title to carry the
   heading that surface's own component renders before axe runs. The
   body paints only once GET /api/session has answered, so a scan
   begun at domcontentloaded could analyse an empty page; and a
   surface scanned in the wrong session state renders the gate, which
   would otherwise pass every count-based check. Each scan prints how
   many GET /api/session requests its load made.

   THE ONE EXPECTED 401. With no session the switcher's GET
   /api/session answers 401 — the definite "no session" answer D-03
   requires — and Chromium logs every 4xx resource load as a console
   error. PRE_MINT_EXPECTED_401_PATHS below exempts exactly that, on
   the pre-mint scan only, matched on the URL Chromium attaches to the
   message rather than on its text; after the mint a 401 from any URL
   is a defect. The pre-mint scan also asserts that at least one GET
   /api/session -> 401 was observed, so the exemption is never
   vacuous: it proves the gate rendered from the server's own answer.

   GEOMETRY AND REFLOW (UI-SPEC C1, C2, C3). On every scanned surface,
   at the pinned profile's 390 px width and again at the 360 px and
   320 px widths C1 names: every rendered button, link and element with
   a role of button or link measures at least 44 x 44 CSS px; on order
   detail the clock control measures exactly 130 x 130 at rest and
   while pressed; and at 320 px the page scrolls on one axis only. The
   pinned profile is restored after each surface.

   TEXT SCALE — A STATED LIMIT, NOT A SILENT GAP. C1, C2 and C3 also
   name 200 % text, and this harness cannot emulate it. The type roles
   are declared in CSS pixels, so a text-only scale has no browser
   setting to reach; halving the viewport is page zoom, not text zoom;
   and injecting a stylesheet would assert against the injected CSS
   rather than the build. CI therefore carries the viewport widths
   only. The 200 % claim is carried by the device pass —
   04-VALIDATION.md § Manual-Only Verifications, row 4 ("200 % text
   reflow on real handsets"), recorded in docs/analysis/ with the
   build id — which is where that document already assigns it
   (T-04-27).

   HEADINGS AND THE RIBBON'S ANCESTRY (UI-SPEC C5, C8). On every
   scanned surface there is exactly one <h1 id="screen-title">, inside
   one <main aria-labelledby="screen-title">; and neither the ribbon's
   section nor any ancestor of it carries aria-hidden, found by walking
   up the rendered tree — ancestry cannot be decided by a source sweep,
   which is why C8 lives here.

   FOCUS ON EVERY TRANSITION (UI-SPEC C6, T-04-25). In a fresh context
   with no session, every transition this phase has is driven with
   focus parked elsewhere first, so the assertion cannot pass on focus
   that was already on a heading, and focus must then land on the new
   screen's heading: the gate's persona door to the order list (a
   replace); the order list to order detail and on to the time surface
   (pushes); the header's back control twice; history.back();
   order(A) -> order(B), the id-only transition the UI-SPEC's C6 does
   not list and the one an effect keyed on the surface alone skips;
   back to the order list; the order list's foot control to Limits,
   added once 5f90cd1 made Limits' heading focusable; history.back()
   to the order list; ending the session, back to the gate; and the
   gate's disclosure reopen, where focus lands on the disclosure's
   <h2>, not the <h1>. The two order ids come from the order list's
   own GET /api/orders, captured as /?s=orders loads, whose
   X-CAP-Account header is also asserted to equal the minted persona
   (SC-1).

   Startup guard, before anything else: this repository's Research
   Open Question 1 found that axe-core@4.13.0 exposes 105 rules, that
   the "wcag22aa" tag exists and carries exactly one rule
   (target-size), and that no plain wcag22a (single trailing a) tag
   exists at all. The guard
   below asserts axe.getRules(["wcag22aa"]).length >= 1 so a future
   axe upgrade that renames or drops the tag fails this check rather
   than silently narrowing the scan.

     node scripts/check-wcag.mjs             full scan: builds,
                                              starts, scans all five
                                              surfaces
     node scripts/check-wcag.mjs --self-test browser-only smoke: no
                                              build, no server; proves
                                              the harness, the axe
                                              wiring and the tag guard
                                              are live in ~3s against
                                              a deliberately
                                              inaccessible inline page

   --self-test is additive, never a substitute — it exists only
   because the full scan is too slow to be this task's per-task
   feedback command. verify.mjs (plan 01-07) runs --self-test
   immediately before the full scan; this task is not done until the
   full scan is green on all five surfaces. This check does not run
   inside Vercel's build container — D-22 routes it through GitHub
   Actions instead, and verify.mjs excludes this step only on the
   platform's own VERCEL system variable, never a developer-facing
   flag. There is no flag here that skips the axe scan other than
   --self-test.

   Exit 0 = clean (or, under --self-test, at least one violation
   found on the deliberately broken page). Exit 1 = at least one
   defect.
   ================================================================ */

import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import axe from "axe-core";
import { AxeBuilder } from "@axe-core/playwright";
import { launch, MOBILE_PROFILE, openMobilePage } from "./lib/harness.mjs";
import { startServer, stopServer } from "./lib/server.mjs";

const require = createRequire(import.meta.url);
/* Next's own bin, resolved through node_modules rather than a
   hard-coded path, so the production server can be started directly
   by `process.execPath` with no intermediate shell (see
   scripts/lib/server.mjs for why a shell-wrapped server is the bug
   this file used to carry). */
const NEXT_BIN = require.resolve("next/dist/bin/next");

const PORT = 4311;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = 60_000;
/* How long a scan waits for #screen-title to carry its heading, and
   how long it lets the surface's own data reads settle afterwards. */
const HEADING_TIMEOUT_MS = 15_000;
const SETTLE_TIMEOUT_MS = 10_000;

/* The persona the session is minted for: the one UJ-1 runs on, and the
   one assigned two work orders (lib/data/artisans.ts), which is what
   makes the order(A) -> order(B) transition reachable. */
const PERSONA_ID = "acc-mabaso";
/* The fixture order the three id-bearing surface paths in C7 name. */
const ORDER_ID = "wo-0142";

/* C1's widths: the pinned profile's own, where axe runs, then the two
   UI-SPEC C1 names. C3 is asserted at the narrowest of them. */
const GEOMETRY_WIDTHS = [MOBILE_PROFILE.viewport.width, 360, 320];
const REFLOW_WIDTH = 320;
const TARGET_MIN_PX = 44;
/* An exact figure, not a minimum: the perimeter is an inset shadow so
   the box cannot change size between rest and pressed. */
const RECORD_BOX_PX = 130;
/* Longer than --dur-press (90 ms), so the pressed box is measured once
   the press transition has finished. */
const PRESS_SETTLE_MS = 150;
/* How long a driven transition has to land focus once its new heading
   has rendered. */
const FOCUS_TIMEOUT_MS = 2_000;

/**
 * One entry, with the reason: with no session, the switcher
 * (components/shell/Screen.tsx) reads GET /api/session and the frozen
 * route answers 401, which is the definite "no session" answer D-03
 * requires. Chromium logs every 4xx resource load as a console error
 * whose text carries no URL, so the entry is matched against the URL
 * Chromium attaches to the message (its location), never against the
 * text alone, and only on the scan made before the mint — after the
 * mint, a 401 from any URL is a defect. A second entry is an
 * architectural change, never a maintenance edit.
 */
const PRE_MINT_EXPECTED_401_PATHS = ["/api/session"];

/* Chromium's own wording for a resource load answered 401. The status
   lives only in this text; the path comes from the message location. */
const RESOURCE_401 = /^Failed to load resource: the server responded with a status of 401\b/;

/* wcag22a is deliberately omitted — Research Open Question 1 found
   the tag does not exist in axe-core@4.13.0. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const problems = [];

/* ---------------------------------------------------------------
   startup guard — before anything else (RESEARCH.md Open Question 1)
   --------------------------------------------------------------- */

const wcag22aaRules = axe.getRules(["wcag22aa"]);
if (!Array.isArray(wcag22aaRules) || wcag22aaRules.length < 1) {
  console.log("WCAG CHECK");
  console.log("=".repeat(72));
  console.log(
    "!  the installed axe-core no longer carries the wcag22aa tag (or it now carries zero rules) — failing rather than silently narrowing the A/AA scan (RESEARCH.md Open Question 1)",
  );
  process.exit(1);
}

const selfTest = process.argv.includes("--self-test");

/* ---------------------------------------------------------------
   REQ-FR-48 — the ribbon's undismissable, static, uncapped contract
   --------------------------------------------------------------- */

async function assertRibbonContract(page, surface) {
  const sections = page.locator('section[aria-label="Preview disclosure"]');
  const count = await sections.count();
  if (count !== 1) {
    problems.push(
      `${surface}: expected exactly one section[aria-label="Preview disclosure"], found ${count}`,
    );
    return;
  }
  const section = sections.first();

  const ariaHidden = await section.getAttribute("aria-hidden");
  if (ariaHidden !== null) {
    problems.push(
      `${surface}: the ribbon carries aria-hidden="${ariaHidden}" — it must never be hidden from assistive tech`,
    );
  }

  const position = await section.evaluate((el) => getComputedStyle(el).position);
  if (position !== "static") {
    problems.push(`${surface}: the ribbon computes to position: ${position}, not static`);
  }

  const maxHeight = await section.evaluate((el) => getComputedStyle(el).maxHeight);
  if (maxHeight !== "none") {
    problems.push(`${surface}: the ribbon computes to max-height: ${maxHeight}, not none`);
  }

  const link = section.getByRole("link", {
    name: "Read the full preview limits",
    exact: true,
  });
  const linkCount = await link.count();
  if (linkCount !== 1) {
    problems.push(
      `${surface}: expected exactly one link named "Read the full preview limits" inside the ribbon, found ${linkCount}`,
    );
  } else {
    const box = await link.first().boundingBox();
    if (!box || box.height < 44) {
      problems.push(
        `${surface}: the ribbon link's bounding box is ${box ? box.height.toFixed(1) : "unavailable"}px high — must be at least 44px`,
      );
    }
  }

  const dismissShaped = await section
    .locator('button, input[type="button"]')
    .count();
  if (dismissShaped > 0) {
    problems.push(
      `${surface}: the ribbon contains ${dismissShaped} button-shaped control(s) — never a dismiss control`,
    );
  }

  const dismissWords = /dismiss|close|hide/i;
  const candidates = await section.locator("[aria-label], a, button").all();
  for (const el of candidates) {
    const ariaLabel = await el.getAttribute("aria-label");
    const text = (await el.innerText().catch(() => "")).trim();
    if ((ariaLabel && dismissWords.test(ariaLabel)) || dismissWords.test(text)) {
      problems.push(
        `${surface}: an element inside the ribbon has an accessible name or aria-label matching dismiss/close/hide ("${ariaLabel ?? text}")`,
      );
    }
  }
}

/* ---------------------------------------------------------------
   --self-test — browser-only smoke, no build, no server
   --------------------------------------------------------------- */

if (selfTest) {
  const browser = await launch();
  let violationCount = 0;
  try {
    const { page } = await openMobilePage(browser);
    /* Deliberately inaccessible: no lang attribute on <html>, an
       image with no alt text. This proves the harness launches, the
       axe wiring reports violations, and the tag set is live. */
    await page.setContent(
      `<!DOCTYPE html><html><head><title>self-test</title></head><body><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></body></html>`,
    );
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    violationCount = results.violations.length;
  } finally {
    await browser.close();
  }

  console.log("WCAG CHECK — SELF TEST");
  console.log("=".repeat(72));
  console.log(`Violations found on the deliberately inaccessible page: ${violationCount}`);

  if (violationCount < 1) {
    console.log(
      "\n!  expected at least one violation (missing lang, missing alt) but found none — the harness or the axe wiring is not working",
    );
    process.exit(1);
  }

  console.log(
    "\nThe harness launches, axe reports violations, and the wcag22aa tag is live. This is not a substitute for the full scan.",
  );
  process.exit(0);
}

/* ---------------------------------------------------------------
   full scan — build, start, scan five surfaces, always tear down
   --------------------------------------------------------------- */

/* A signal-terminated `next build` reports code === null. It resolves
   as 1 here, never 0 — otherwise the scan would proceed to `next
   start` against whatever stale .next/ was already on disk and report
   on an artefact that is not the one just built. */
function runToCompletion(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("close", (code, signal) =>
      resolve({ code: code === null ? 1 : code, signal, stdout, stderr }),
    );
  });
}

/* Per-page records the harness's text-only collector cannot give: each
   console error with the URL Chromium attaches to it, and every GET
   /api/session the page itself makes, with the status it got.
   page.request calls never pass through these page events, so the mint
   is not counted as one of the page's own reads. */
function attachRecorders(page) {
  const rec = { consoleErrors: [], sessionReads: [] };
  page.on("console", (m) => {
    if (m.type() === "error") {
      rec.consoleErrors.push({ text: m.text(), url: m.location().url });
    }
  });
  page.on("request", (r) => {
    if (r.method() === "GET" && new URL(r.url()).pathname === "/api/session") {
      rec.sessionReads.push({ request: r, status: null });
    }
  });
  page.on("response", (res) => {
    const read = rec.sessionReads.find((entry) => entry.request === res.request());
    if (read) read.status = res.status();
  });
  return rec;
}

/* True only for Chromium's 401 resource message whose located URL is
   this server's origin and a path PRE_MINT_EXPECTED_401_PATHS lists. */
function isExpectedPreMint401(record) {
  if (!RESOURCE_401.test(record.text)) return false;
  let url;
  try {
    url = new URL(record.url);
  } catch {
    return false;
  }
  return url.origin === BASE_URL && PRE_MINT_EXPECTED_401_PATHS.includes(url.pathname);
}

/* Waits for #screen-title to carry `expected`, and returns the text it
   carries when the wait ends: `expected` on success, the heading that
   rendered instead, or null when there is no #screen-title at all. */
async function waitForHeading(page, expected, timeout) {
  try {
    await page.waitForFunction(
      (want) =>
        document.getElementById("screen-title")?.textContent.replace(/\s+/g, " ").trim() === want,
      expected,
      { timeout },
    );
    return expected;
  } catch {
    return page.evaluate(() => {
      const h = document.getElementById("screen-title");
      return h === null ? null : h.textContent.replace(/\s+/g, " ").trim();
    });
  }
}

/* C1 (REQ-NFR-2): every rendered button, a, and element with a role of
   button or link measures at least 44 x 44 CSS px, width and height
   both, from its bounding box. An element with no layout box is not on
   screen and is not a target. */
async function assertTargetSize(page, surface, width) {
  const { measured, small } = await page.evaluate((min) => {
    const out = { measured: 0, small: [] };
    for (const el of document.querySelectorAll('button, a, [role="button"], [role="link"]')) {
      if (el.getClientRects().length === 0) continue;
      out.measured += 1;
      const r = el.getBoundingClientRect();
      if (r.width < min || r.height < min) {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60);
        out.small.push(
          `<${el.tagName.toLowerCase()}> "${name}" measures ${r.width.toFixed(1)} x ${r.height.toFixed(1)}`,
        );
      }
    }
    return out;
  }, TARGET_MIN_PX);
  if (measured === 0) {
    problems.push(`${surface} at ${width}px: C1 found no rendered interactive element to measure`);
  }
  for (const s of small) {
    problems.push(
      `${surface} at ${width}px: C1 — ${s} CSS px, under ${TARGET_MIN_PX} x ${TARGET_MIN_PX}`,
    );
  }
}

/* C3 (REQ-NFR-7's shape): at 320 px the scrolling element is no wider
   than the viewport's client width, so the page scrolls on one axis. */
async function assertOneAxis(page, surface) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (clientWidth !== REFLOW_WIDTH) {
    problems.push(
      `${surface}: C3 — the viewport's client width measured ${clientWidth}px, not ${REFLOW_WIDTH}px, so the reflow measurement would prove nothing`,
    );
  } else if (scrollWidth > clientWidth) {
    problems.push(
      `${surface} at ${REFLOW_WIDTH}px: C3 — the page scrolls in two dimensions: scrollWidth ${scrollWidth}px exceeds the viewport's client width ${clientWidth}px`,
    );
  }
}

/* C2 (REQ-NFR-4): the clock control measures exactly 130 x 130 at rest
   and while pressed. The press is held with the pointer down, measured
   once the press transition has run, then released off the control, so
   no click fires and no segment is opened on the server; the label is
   compared before and after the press to prove that. */
async function assertClockBox(page, surface, width) {
  const control = page.locator("main button").filter({ hasText: /^(OPEN|CLOSE|REOPEN)$/ });
  try {
    await control.first().waitFor({ timeout: HEADING_TIMEOUT_MS });
  } catch {
    problems.push(`${surface} at ${width}px: C2 — no clock control (OPEN, CLOSE or REOPEN) rendered`);
    return;
  }
  const count = await control.count();
  if (count !== 1) {
    problems.push(`${surface} at ${width}px: C2 — expected exactly one clock control, found ${count}`);
    return;
  }
  const measure = () =>
    control.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, active: el.matches(":active"), label: el.textContent.trim() };
    });

  const rest = await measure();
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(PRESS_SETTLE_MS);
  const pressed = await measure();
  await page.mouse.move(0, 0);
  await page.mouse.up();
  const after = await measure();

  if (!pressed.active) {
    problems.push(
      `${surface} at ${width}px: C2 — the held press did not put the clock control in its :active state, so the pressed measurement proves nothing`,
    );
  }
  for (const [state, m] of [["at rest", rest], ["pressed", pressed]]) {
    if (m.w !== RECORD_BOX_PX || m.h !== RECORD_BOX_PX) {
      problems.push(
        `${surface} at ${width}px: C2 — the clock control measures ${m.w} x ${m.h} ${state}, not exactly ${RECORD_BOX_PX} x ${RECORD_BOX_PX}`,
      );
    }
  }
  if (after.label !== rest.label) {
    problems.push(
      `${surface} at ${width}px: C2 — the measurement press fired the clock control (${rest.label} became ${after.label}); the harness changed server state`,
    );
  }
}

/* C5: exactly one <h1 id="screen-title">, and the surface's one <main>
   carries aria-labelledby="screen-title". */
async function assertHeadingAndMain(page, surface) {
  const counts = await page.evaluate(() => ({
    titles: document.querySelectorAll("#screen-title").length,
    h1Titles: document.querySelectorAll("h1#screen-title").length,
    mains: document.querySelectorAll("main").length,
    labelled: document.querySelectorAll('main[aria-labelledby="screen-title"]').length,
  }));
  if (counts.titles !== 1 || counts.h1Titles !== 1) {
    problems.push(
      `${surface}: C5 — expected exactly one <h1 id="screen-title">, found ${counts.h1Titles} such <h1> among ${counts.titles} element(s) with that id`,
    );
  }
  if (counts.mains !== 1 || counts.labelled !== 1) {
    problems.push(
      `${surface}: C5 — expected one <main aria-labelledby="screen-title">, found ${counts.mains} <main> of which ${counts.labelled} carry it`,
    );
  }
}

/* C8: walk up the rendered tree from the ribbon's section to the root;
   neither it nor any ancestor may carry aria-hidden. */
async function assertRibbonAncestry(page, surface) {
  const hidden = await page.evaluate(() => {
    const ribbon = document.querySelector('section[aria-label="Preview disclosure"]');
    if (ribbon === null) return null;
    const found = [];
    for (let el = ribbon; el !== null; el = el.parentElement) {
      if (el.hasAttribute("aria-hidden")) {
        found.push(`<${el.tagName.toLowerCase()}> aria-hidden="${el.getAttribute("aria-hidden")}"`);
      }
    }
    return found;
  });
  /* A missing ribbon is already reported by assertRibbonContract. */
  if (hidden === null) return;
  for (const h of hidden) {
    problems.push(
      `${surface}: C8 — ${h} on the ribbon or one of its ancestors hides the ribbon from assistive technology`,
    );
  }
}

/* C1 at every width, C2 where the surface carries the clock control,
   and C3 at the narrowest width; the pinned profile always comes back. */
async function assertGeometry(page, surface, { clock }) {
  try {
    for (const width of GEOMETRY_WIDTHS) {
      await page.setViewportSize({ width, height: MOBILE_PROFILE.viewport.height });
      await assertTargetSize(page, surface, width);
      if (clock) await assertClockBox(page, surface, width);
      if (width === REFLOW_WIDTH) await assertOneAxis(page, surface);
    }
  } finally {
    await page.setViewportSize(MOBILE_PROFILE.viewport);
  }
}

/* One surface: load it, prove it is the screen it claims to be, then
   run every per-surface assertion against it. The path is the label,
   so the report names each of the five surfaces as C7 does. */
async function scanSurface(page, rec, { path, heading, preMint = false, clock = false }) {
  const errorsFrom = page.__captureErrors.length;
  const consoleFrom = rec.consoleErrors.length;
  const readsFrom = rec.sessionReads.length;

  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });

  const found = heading === null ? null : await waitForHeading(page, heading, HEADING_TIMEOUT_MS);
  if (heading === null) {
    problems.push(
      `${path}: no expected heading — GET /api/orders did not list the order this surface shows, so the scan cannot prove what rendered`,
    );
  } else if (found !== heading) {
    problems.push(
      `${path}: expected the #screen-title heading "${heading}", found ${found === null ? "no #screen-title" : `"${found}"`} — the surface did not render, or was scanned in the wrong session state; its other assertions were not run`,
    );
  } else {
    /* A settle, not an assertion: lets the surface's own data reads
       land so axe and the measurements see the populated screen. */
    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});

    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    for (const violation of results.violations) {
      const firstTarget = violation.nodes[0]?.target?.join(", ") ?? "(no node)";
      problems.push(
        `${path}: axe rule "${violation.id}" (impact: ${violation.impact}) at ${firstTarget}`,
      );
    }

    await assertRibbonContract(page, path);
    await assertHeadingAndMain(page, path);
    await assertRibbonAncestry(page, path);
    await assertGeometry(page, path, { clock });
  }

  const reads = rec.sessionReads.slice(readsFrom);
  const statuses = reads.map((r) => r.status ?? "no answer").join(", ");
  console.log(`  ${path}: ${reads.length} GET /api/session on this load (${statuses || "none"})`);
  if (preMint && !reads.some((r) => r.status === 401)) {
    problems.push(
      `${path}: no GET /api/session answered 401 on the pre-mint load — the gate was not rendered from the server's own "no session" answer, so the 401 exemption would be vacuous`,
    );
  }

  /* Each exempt record pardons one identical harness entry, so a
     second 401 the exemption does not cover is still reported. */
  const exempt = preMint
    ? rec.consoleErrors.slice(consoleFrom).filter(isExpectedPreMint401).map((r) => r.text)
    : [];
  for (const e of page.__captureErrors.slice(errorsFrom)) {
    if (/favicon|Download the React DevTools/i.test(e)) continue;
    const i = exempt.indexOf(e);
    if (i !== -1) {
      exempt.splice(i, 1);
      continue;
    }
    problems.push(`${path}: unexpected console/page error — ${e.slice(0, 240)}`);
  }
}

/* ---------------------------------------------------------------
   C6 — focus on the new screen's heading after every transition
   --------------------------------------------------------------- */

/* The focused element's id, or its tag when it has none. */
function focusedElement(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    return a === null ? "(none)" : a.id || `<${a.tagName.toLowerCase()}>`;
  });
}

/* Park focus on the first rendered button, or on the body when the
   screen has none, so no assertion can pass on focus that was already
   on a heading before the transition ran (Code Examples 5). */
async function parkFocus(page) {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.getClientRects().length > 0,
    );
    if (button) button.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  return focusedElement(page);
}

/* One transition: park focus, drive it, wait for the new screen's
   heading, then assert document.activeElement is `focusId`. Returns
   false when the expected screen never rendered, so the matrix stops
   rather than driving the rest of it from the wrong screen. */
async function assertFocusMoves(page, landed, { name, heading, focusId = "screen-title", act }) {
  const parked = await parkFocus(page);
  if (parked === focusId) {
    problems.push(
      `C6 ${name}: focus could not be parked away from #${focusId} first, so the assertion would pass vacuously`,
    );
    return false;
  }
  try {
    await act();
  } catch (e) {
    problems.push(`C6 ${name}: the transition could not be driven — ${String(e?.message ?? e).split("\n")[0]}`);
    return false;
  }
  const found = await waitForHeading(page, heading, HEADING_TIMEOUT_MS);
  if (found !== heading) {
    problems.push(
      `C6 ${name}: expected the new screen's heading "${heading}", found ${found === null ? "no #screen-title" : `"${found}"`}; the rest of the matrix was not driven`,
    );
    return false;
  }
  try {
    await page.waitForFunction((id) => document.activeElement?.id === id, focusId, {
      timeout: FOCUS_TIMEOUT_MS,
    });
    landed.push(name);
  } catch {
    problems.push(
      `C6 ${name}: focus is on "${await focusedElement(page)}" after the transition (parked on "${parked}" before it), not #${focusId}`,
    );
  }
  return true;
}

/* The matrix, in its own context so it starts with no session and no
   disclosure flag, whatever the scans left behind. The persona door
   mints this context's session through the gate itself. */
async function assertFocusMatrix(browser, { personaName, orderA, orderB }) {
  const GATE = "Choose an artisan";
  const LIST = "Your work orders";
  const detail = (o) => `${o.number} ${o.title}`;
  const { context, page } = await openMobilePage(browser);
  page.setDefaultTimeout(HEADING_TIMEOUT_MS);
  const inMain = (name) => page.locator("main").getByRole("button", { name, exact: true });
  const back = () => page.locator("header").getByRole("button", { name: "Back", exact: true }).click();
  const historyBack = () => page.evaluate(() => history.back());

  const steps = [
    { name: "gate -> order list (the persona door, a replace)", heading: LIST,
      act: () => page.locator("main button", { hasText: personaName }).click() },
    { name: "order list -> order detail (a push)", heading: detail(orderA),
      act: () => page.locator("main button", { hasText: orderA.number }).click() },
    { name: "order detail -> time on this order (a push)", heading: "Time on this order",
      act: () => inMain("Time on this order").click() },
    { name: "header back: time on this order -> order detail", heading: detail(orderA), act: back },
    { name: "header back: order detail -> order list", heading: LIST, act: back },
    { name: "history.back(): order list -> order detail", heading: detail(orderA), act: historyBack },
    { name: `order(A) -> order(B): ${orderA.id} -> ${orderB.id}, only the id changes (a push)`,
      heading: detail(orderB),
      act: () => page.evaluate((href) => history.pushState(null, "", href), `/?s=order&id=${orderB.id}`) },
    { name: "header back: order detail -> order list", heading: LIST, act: back },
    { name: "order list -> Limits (the foot control, a push)", heading: "Preview limits",
      act: () => inMain("Read the full preview limits").click() },
    { name: "history.back(): Limits -> order list", heading: LIST, act: historyBack },
    { name: "order list -> gate (ending the session)", heading: GATE,
      act: () => inMain("End this session and choose a different artisan").click() },
    { name: "the gate's disclosure reopen (focus on the disclosure's <h2>)", heading: GATE,
      focusId: "disclosure-title", act: () => inMain("Read the full disclosure").click() },
  ];

  const landed = [];
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    const first = await waitForHeading(page, GATE, HEADING_TIMEOUT_MS);
    if (first !== GATE) {
      problems.push(
        `C6: / in a fresh context rendered ${first === null ? "no #screen-title" : `"${first}"`}, not the gate's "${GATE}"; the focus matrix was not driven`,
      );
    } else {
      for (const step of steps) {
        if (!(await assertFocusMoves(page, landed, step))) break;
      }
    }
  } finally {
    await context.close();
  }

  console.log(`\nFocus matrix (C6): ${landed.length} of ${steps.length} transitions landed focus on their target:`);
  for (const name of landed) console.log(`  ok  ${name}`);
}

console.log("WCAG CHECK");
console.log("=".repeat(72));

/* CAPTURE_BUILD_ID passed through from the parent environment, or
   derived from git rev-parse --short HEAD, in the CHILD environment
   only — never written to a committed file — so next.config.ts's
   build-id gate (D-03) does not throw. */
const childEnv = { ...process.env };

/* CAPTURE_SESSION_KEY, in the CHILD environment only, for the same
   reason scripts/server/route-suite.proof.mjs gives: `next start` runs
   under a production NODE_ENV, so lib/session/key.ts refuses to sign a
   session without a key of at least sixteen characters, and the mint
   below would answer 500. Locally .env.local supplies one, which is
   why this went unnoticed until the GitHub "verify" job, whose
   environment carries no .env.local, answered the mint with 500. A
   real key, when present, is used as given. */
childEnv.CAPTURE_SESSION_KEY ??= "check-wcag-throwaway-key-0000000";
if (
  !childEnv.VERCEL_GIT_COMMIT_SHA &&
  !childEnv.VERCEL_DEPLOYMENT_ID &&
  !childEnv.CAPTURE_BUILD_ID
) {
  try {
    childEnv.CAPTURE_BUILD_ID = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
    }).trim();
  } catch (e) {
    problems.push(`could not derive CAPTURE_BUILD_ID from git: ${e.message}`);
  }
}

console.log("Building the production bundle (next build)...");
const build = await runToCompletion("npx", ["next", "build"], childEnv);

if (build.code !== 0) {
  problems.push(
    `next build exited ${build.code}${build.signal ? ` (terminated by ${build.signal})` : ""}:\n${(build.stdout + build.stderr).slice(-2000)}`,
  );
} else {
  let serverProcess = null;
  let browser = null;
  try {
    console.log(`Starting the production server on port ${PORT} (next start)...`);
    serverProcess = startServer(process.execPath, [NEXT_BIN, "start", "-p", String(PORT)], {
      cwd: process.cwd(),
      env: childEnv,
    });
    /* drain stdio so the child never blocks on a full pipe buffer */
    serverProcess.stdout?.on("data", () => {});
    serverProcess.stderr?.on("data", () => {});

    let ready = false;
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        await fetch(`${BASE_URL}/`);
        ready = true;
        break;
      } catch {
        /* not answering yet */
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      problems.push(
        `the production server at ${BASE_URL} did not answer within ${READY_TIMEOUT_MS / 1000}s`,
      );
    } else {
      browser = await launch();
      const { context, page } = await openMobilePage(browser);
      const rec = attachRecorders(page);

      console.log("Scanning (GET /api/session counts are the page's own reads):");
      await scanSurface(page, rec, { path: "/", heading: "Choose an artisan", preMint: true });

      /* The mint (T-04-26). It must answer 201 before anything
         authenticated is scanned, so a failed authentication cannot
         present itself as four clean surfaces. */
      const mint = await page.request.post(`${BASE_URL}/api/session`, {
        data: { persona_id: PERSONA_ID },
      });
      if (mint.status() !== 201) {
        problems.push(
          `POST /api/session for ${PERSONA_ID} answered ${mint.status()}, not 201 — the four surfaces that need a session were not scanned`,
        );
      } else {
        const { account } = await mint.json();

        /* The orders come from the order list's own GET /api/orders,
           captured as /?s=orders loads, never from page.request. The
           session cookie is Secure under next start, and page.request
           does not send a Secure cookie over plain http while the page
           does: real run 1's page.request read answered 401, and a
           scratch server reproduced it. SC-1 is then asserted on the
           very response the app rendered from. The body is read as soon
           as the response lands, while the page is still on the list. */
        const ordersRead = page
          .waitForResponse(
            (r) => r.request().method() === "GET" && new URL(r.url()).pathname === "/api/orders",
            { timeout: HEADING_TIMEOUT_MS },
          )
          .then(
            async (r) => ({
              status: r.status(),
              actingAccount: r.headers()["x-cap-account"],
              orders: r.status() === 200 ? await r.json().then((b) => b.orders, () => null) : null,
            }),
            () => null,
          );

        await scanSurface(page, rec, { path: "/?s=orders", heading: "Your work orders" });

        const read = await ordersRead;
        let orders = [];
        if (read === null) {
          problems.push(
            `/?s=orders: the order list made no GET /api/orders within ${HEADING_TIMEOUT_MS / 1000}s of loading`,
          );
        } else if (read.status !== 200) {
          problems.push(`GET /api/orders answered ${read.status} after the mint, not 200`);
        } else {
          if (Array.isArray(read.orders)) orders = read.orders;
          else problems.push("GET /api/orders answered 200 without an orders array");
          /* SC-1's own wording: the orders response names the account
             the session was minted for. */
          if (read.actingAccount !== PERSONA_ID) {
            problems.push(
              `SC-1: GET /api/orders carries X-CAP-Account "${read.actingAccount}", not the minted persona ${PERSONA_ID}`,
            );
          }
        }
        const shown = orders.find((o) => o.id === ORDER_ID);
        const second = orders.find((o) => o.id !== ORDER_ID);

        await scanSurface(page, rec, {
          path: `/?s=order&id=${ORDER_ID}`,
          heading: shown ? `${shown.number} ${shown.title}` : null,
          clock: true,
        });
        await scanSurface(page, rec, { path: `/?s=time&id=${ORDER_ID}`, heading: "Time on this order" });
        await scanSurface(page, rec, { path: "/?s=limits", heading: "Preview limits" });

        if (!shown || !second) {
          problems.push(
            `C6: GET /api/orders listed ${orders.length} order(s) for ${PERSONA_ID}; the focus matrix needs ${ORDER_ID} and a second order to drive order(A) -> order(B), so it was not driven`,
          );
        } else {
          await assertFocusMatrix(browser, { personaName: account.name, orderA: shown, orderB: second });
        }
      }
      await context.close();
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    /* Ends the server's whole process group (POSIX) or process tree
       (win32) and waits, bounded, for it to actually exit — see
       scripts/lib/server.mjs. Never a bare process.kill(pid) on
       POSIX: with the old shell-wrapped spawn that pid was the shell,
       not next start, and the real server survived as an orphan. */
    await stopServer(serverProcess);
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log(`\nProblems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the production build does not meet its A/AA or ribbon contract:");
  for (const p of problems) console.log(`  !  ${p}`);
} else {
  console.log(
    "\nZero A/AA violations on all five surfaces, each scanned once it rendered its own heading; C1, C2, C3, C5 and C8 hold wherever they apply; focus landed on its target after every driven transition; X-CAP-Account names the minted persona; the ribbon is present once, never aria-hidden, position: static, max-height: none, with a >=44px named link and no dismiss-shaped control.",
  );
}

/* Explicit exit, rather than falling off the end of the script — no
   lingering handle (a pipe from an orphaned server, or anything else)
   can keep the event loop alive past this line. */
process.exit(problems.length > 0 ? 1 : 0);
