/* ================================================================
   PLAYWRIGHT HARNESS

   Declares the pinned mobile launch profile the WCAG scan uses (D-21),
   once, so no later check script re-derives it. The values are the
   seed's measured mobile profile: an iPhone-class viewport at 3x
   device scale, touch-capable.

   This file's launch path is exercised by scripts/check-wcag.mjs
   (plan 01-06), not by scripts/lib/support.test.mjs — that file stays
   browser-free deliberately (see its own header), because
   scripts/verify.mjs runs the whole fixture suite as one step and
   D-22 excludes only the axe step on Vercel; a browser launch inside
   the fixture suite would blur that boundary.
   ================================================================ */

import { chromium } from "playwright";

/** The pinned mobile launch profile (D-21). Frozen so it cannot drift
    per-callsite. */
export const MOBILE_PROFILE = Object.freeze({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

/** Launch Chromium headless, no GPU args — irrelevant to a mobile WCAG
    scan. */
export async function launch() {
  return chromium.launch({ headless: true });
}

/**
 * Open a new context at MOBILE_PROFILE and a new page on it, with
 * console-error and pageerror collectors attached to
 * `page.__captureErrors` so a caller can assert the page raised
 * nothing unexpected.
 */
export async function openMobilePage(browser) {
  const context = await browser.newContext(MOBILE_PROFILE);
  const page = await context.newPage();

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.__captureErrors = errors;

  return { context, page };
}
