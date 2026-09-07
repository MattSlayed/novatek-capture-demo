/* ================================================================
   WCAG A/AA CHECK

   Runs axe-core through the Playwright 1.62.1 harness
   (scripts/lib/harness.mjs) against the production build, on `/`
   and `/?s=limits`, at the pinned 390 x 844 mobile profile, and
   fails on any A or AA violation (REQ-NFR-9, D-21). It also asserts
   the ribbon's REQ-FR-48 contract by construction, not by axe rule:
   present once, never aria-hidden, position: static, max-height:
   none, a >=44px named link, and no dismiss-shaped control.

   Startup guard, before anything else: this repository's Research
   Open Question 1 found that axe-core@4.13.0 exposes 105 rules, that
   the "wcag22aa" tag exists and carries exactly one rule
   (target-size), and that no plain wcag22a (single trailing a) tag
   exists at all. The guard
   below asserts axe.getRules(["wcag22aa"]).length >= 1 so a future
   axe upgrade that renames or drops the tag fails this check rather
   than silently narrowing the scan.

     node scripts/check-wcag.mjs             full scan: builds,
                                              starts, scans both
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
   full scan is green on both surfaces. This check does not run
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
import axe from "axe-core";
import { AxeBuilder } from "@axe-core/playwright";
import { launch, openMobilePage } from "./lib/harness.mjs";

const PORT = 4311;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = 60_000;

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
   full scan — build, start, scan both surfaces, always tear down
   --------------------------------------------------------------- */

function runToCompletion(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

async function scanSurface(page, path, label) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const violation of results.violations) {
    const firstTarget = violation.nodes[0]?.target?.join(", ") ?? "(no node)";
    problems.push(
      `${label}: axe rule "${violation.id}" (impact: ${violation.impact}) at ${firstTarget}`,
    );
  }

  await assertRibbonContract(page, label);

  const errs = (page.__captureErrors ?? []).filter(
    (e) => !/favicon|Download the React DevTools/i.test(e),
  );
  for (const e of errs) {
    problems.push(`${label}: unexpected console/page error — ${e.slice(0, 240)}`);
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
    `next build exited ${build.code}:\n${(build.stdout + build.stderr).slice(-2000)}`,
  );
} else {
  let serverProcess = null;
  let browser = null;
  try {
    console.log(`Starting the production server on port ${PORT} (next start)...`);
    serverProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: process.cwd(),
      env: childEnv,
      shell: true,
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
      await scanSurface(page, "/", "/");
      await scanSurface(page, "/?s=limits", "/?s=limits");
      await context.close();
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProcess && serverProcess.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: "ignore" });
        } catch {
          /* already exited */
        }
      } else {
        try {
          process.kill(serverProcess.pid);
        } catch {
          /* already exited */
        }
      }
    }
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log(`\nProblems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the production build does not meet its A/AA or ribbon contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nZero A/AA violations on both surfaces; the ribbon is present once, never aria-hidden, position: static, max-height: none, with a >=44px named link and no dismiss-shaped control.",
);
