/* ================================================================
   DEPLOYMENT CHECK

   Proves a live URL is publicly reachable, correctly headed and
   carrying the undismissable ribbon — the half of roadmap success
   criterion 2 a shell can prove (a human on a handset proves the
   other half). Crosses the public-internet-to-a-live-deployment
   boundary as an unauthenticated stranger would, which is the only
   way Deployment Protection's state is observable.

     node scripts/check-deployment.mjs --url https://example.vercel.app

   It fetches the URL once, following redirects, and asserts:
   - the final status is 200 and the final host matches the
     requested host (a redirect to vercel.com or a `_vercel/sso`
     path means Deployment Protection is still on);
   - the five headers scripts/check-headers.mjs asserts in source
     (vercel.json) are also present on the wire, by exact value;
   - the served body carries `aria-label="Preview disclosure"` and
     the sentence "Designed preview." — the ribbon rendered before
     anything else (REQ-FR-48);
   - the ribbon section carries no dismissal control.

   `scripts/` is outside the claims audit's and check-governed's
   `ROOTS` (`app`, `components`, `lib`), so the literal
   "Designed preview." above and below is not a second definition of
   a governed sentence (AD-12) — it is a wire assertion, the only
   place outside lib/copy/governed.ts where any part of a governed
   sentence appears.

   Deliberately NOT a `npm run verify` step: it needs a live
   deployment on the wire, and D-20's gate is build-time only.

   Exit 0 = every assertion holds. Exit 1 = at least one problem, or
   no --url was given at all.
   ================================================================ */

const problems = [];

function readUrlArg(argv) {
  const i = argv.indexOf("--url");
  if (i === -1 || i + 1 >= argv.length) return null;
  return argv[i + 1];
}

const url = readUrlArg(process.argv.slice(2));

console.log("DEPLOYMENT CHECK");
console.log("=".repeat(72));

if (!url) {
  console.log(
    "  !  --url is required: node scripts/check-deployment.mjs --url <https://...>",
  );
  process.exit(1);
}

let response;
let finalUrl;
try {
  response = await fetch(url, { redirect: "follow" });
  finalUrl = response.url || url;
} catch (e) {
  console.log(`Checked: ${url}`);
  console.log(`  !  could not reach ${url}: ${e.message}`);
  process.exit(1);
}

const requestedHost = new URL(url).host;
const finalUrlObj = new URL(finalUrl);
const finalHost = finalUrlObj.host;

/* ---------------------------------------------------------------
   Deployment Protection — a redirect to vercel.com or a _vercel/sso
   path (regardless of final host) means Vercel Authentication is
   still on for this deployment (D-24).
   --------------------------------------------------------------- */

const deploymentProtectionOn =
  finalUrlObj.hostname.endsWith("vercel.com") ||
  finalUrlObj.pathname.includes("_vercel/sso");

if (deploymentProtectionOn) {
  problems.push(
    `redirected to ${finalUrl} — Deployment Protection is still on; turn it off in the Vercel dashboard: Settings -> Deployment Protection -> Vercel Authentication`,
  );
} else if (finalHost !== requestedHost) {
  problems.push(
    `final host ${finalHost} does not match the requested host ${requestedHost}`,
  );
}

if (response.status !== 200) {
  problems.push(`final status is ${response.status} — expected 200`);
}

/* ---------------------------------------------------------------
   headers — the same values check-headers.mjs asserts in
   vercel.json's source, asserted here on the wire, which is the
   only place the platform's own behaviour is visible.
   --------------------------------------------------------------- */

function header(name) {
  return response.headers.get(name);
}

const EXPECTED_HEADERS = {
  "permissions-policy": "camera=(self), microphone=(self)",
  "x-frame-options": "SAMEORIGIN",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

for (const [name, expected] of Object.entries(EXPECTED_HEADERS)) {
  const actual = header(name);
  if (actual !== expected) {
    problems.push(
      `header ${name} is ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`,
    );
  }
}

/* HSTS is only meaningful (and only ever sent by a real deployment)
   over https — asserted only when the final scheme is https so a
   plain-http URL can still be used to test every other assertion. */
if (finalUrlObj.protocol === "https:") {
  const hsts = header("strict-transport-security");
  if (!hsts || !hsts.includes("max-age=31536000")) {
    problems.push(
      `header strict-transport-security is ${JSON.stringify(hsts)} — expected to contain "max-age=31536000"`,
    );
  }
}

/* ---------------------------------------------------------------
   body — the ribbon rendered before anything else (REQ-FR-48).
   --------------------------------------------------------------- */

const body = await response.text();

const hasRibbonLandmark = body.includes('aria-label="Preview disclosure"');
if (!hasRibbonLandmark) {
  problems.push(
    'response body does not contain aria-label="Preview disclosure" — the ribbon landmark is missing',
  );
}

if (!body.includes("Designed preview.")) {
  problems.push(
    'response body does not contain "Designed preview." — the ribbon sentence is missing',
  );
}

if (hasRibbonLandmark) {
  const ribbonMatch = body.match(
    /<section[^>]*aria-label="Preview disclosure"[^>]*>[\s\S]*?<\/section>/,
  );
  const ribbonHtml = ribbonMatch ? ribbonMatch[0] : body;

  if (/type="button"/.test(ribbonHtml)) {
    problems.push(
      'the ribbon section contains a type="button" element — no dismissal control is permitted (REQ-FR-48)',
    );
  }
  if (/aria-label="[^"]*(dismiss|close|hide)[^"]*"/i.test(ribbonHtml)) {
    problems.push(
      "the ribbon section contains an aria-label naming dismiss, close or hide — no dismissal control is permitted (REQ-FR-48)",
    );
  }
}

/* ---------------------------------------------------------------
   report
   --------------------------------------------------------------- */

console.log(`Checked: ${url}`);
console.log(`Final URL: ${finalUrl}`);
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the deployment does not meet its contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nPublicly reachable, correctly headed, and carrying the undismissable ribbon.",
);
