/* ================================================================
   WORKER CHECK

   Validates the never-handle-/api/ contract (D-06) in both states a
   service worker can be in. No worker exists in Phase 1 — that does
   not make this check a no-op. A worker that intercepted /api/ would
   sit between the client and every enforced claim, so both branches
   below are real assertions and neither skips or warns (D-20).

   ABSENT (public/sw.js does not exist): no file under app/,
   components/ or lib/ may call serviceWorker.register( — a worker
   cannot be introduced by the front end without this check catching
   it on the next commit.

   PRESENT (public/sw.js exists): the file must be valid JavaScript,
   and its fetch handler must test the request pathname against
   "/api/", return before handling it, and never call respondWith
   between that test and that return.

     node scripts/check-sw.mjs

   Exit 0 = clean. Exit 1 = at least one defect.
   ================================================================ */

import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, extname } from "node:path";

const SW_PATH = "public/sw.js";
const ROOTS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const problems = [];

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

let swSource = null;
try {
  swSource = await readFile(SW_PATH, "utf8");
} catch {
  swSource = null;
}

if (swSource === null) {
  /* ABSENT — sweep for any registration attempt */
  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const text = await readFile(file, "utf8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (line.includes("serviceWorker.register(")) {
          problems.push(
            `${file}:${i + 1}: calls serviceWorker.register( — no service worker exists yet (D-06)`,
          );
        }
      });
    }
  }
} else {
  /* PRESENT — the file itself must be valid, and must guard /api/ */
  const check = spawnSync(process.execPath, ["--check", SW_PATH]);
  if (check.status !== 0) {
    const message = (check.stderr ? check.stderr.toString() : "").trim();
    problems.push(`${SW_PATH} is not valid JavaScript: ${message}`);
  }

  const guardPattern = /\.pathname\.startsWith\((['"])\/api\/\1\)/;
  const guardMatch = swSource.match(guardPattern);

  if (!guardMatch) {
    problems.push(
      `${SW_PATH}: no pathname test for "/api/" found — expected .pathname.startsWith("/api/") (either quote style) so /api/ requests are never handled by the worker`,
    );
  } else {
    const guardEnd = guardMatch.index + guardMatch[0].length;
    const window = swSource.slice(guardEnd, guardEnd + 200);
    const returnMatch = window.match(/\breturn\s*;/);

    if (!returnMatch) {
      problems.push(
        `${SW_PATH}: no bare "return;" found within 200 characters after the /api/ pathname test — the guard does not exit before handling the request`,
      );
    } else {
      const between = swSource.slice(guardEnd, guardEnd + returnMatch.index);
      if (between.includes("respondWith")) {
        problems.push(
          `${SW_PATH}: respondWith appears between the /api/ pathname test and its guard return — /api/ requests would still be handled`,
        );
      }
    }
  }
}

console.log("WORKER CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the worker contract is not met:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}

console.log(
  "\nNo worker can register without the never-handle-/api/ guard, and none does yet.",
);
