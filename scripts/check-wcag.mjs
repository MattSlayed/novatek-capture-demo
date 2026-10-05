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
import { launch, openMobilePage } from "./lib/harness.mjs";
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
   and the orders read are not counted as the page's own reads. */
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

/* One surface: load it, prove it is the screen it claims to be, then
   run every per-surface assertion against it. The path is the label,
   so the report names each of the five surfaces as C7 does. */
async function scanSurface(page, rec, { path, heading, preMint = false }) {
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

console.log("WCAG CHECK");
console.log("=".repeat(72));

/* CAPTURE_BUILD_ID passed through from the parent environment, or
   derived from git rev-parse --short HEAD, in the CHILD environment
   only — never written to a committed file — so next.config.ts's
   build-id gate (D-03) does not throw. */
const childEnv = { ...process.env };
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
        const ordersRes = await page.request.get(`${BASE_URL}/api/orders`);
        let orders = [];
        if (ordersRes.status() !== 200) {
          problems.push(`GET /api/orders answered ${ordersRes.status()} after the mint, not 200`);
        } else {
          orders = (await ordersRes.json()).orders;
        }
        const shown = orders.find((o) => o.id === ORDER_ID);

        await scanSurface(page, rec, { path: "/?s=orders", heading: "Your work orders" });
        await scanSurface(page, rec, {
          path: `/?s=order&id=${ORDER_ID}`,
          heading: shown ? `${shown.number} ${shown.title}` : null,
        });
        await scanSurface(page, rec, { path: `/?s=time&id=${ORDER_ID}`, heading: "Time on this order" });
        await scanSurface(page, rec, { path: "/?s=limits", heading: "Preview limits" });
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
    "\nZero A/AA violations on all five surfaces, each scanned once it rendered its own heading; the ribbon is present once, never aria-hidden, position: static, max-height: none, with a >=44px named link and no dismiss-shaped control.",
  );
}

/* Explicit exit, rather than falling off the end of the script — no
   lingering handle (a pipe from an orphaned server, or anything else)
   can keep the event loop alive past this line. */
process.exit(problems.length > 0 ? 1 : 0);
