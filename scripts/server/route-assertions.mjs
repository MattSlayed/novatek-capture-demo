/* ================================================================
   ROUTE ASSERTIONS — the pure half of the route suite (D-09, D-11)

   Why this is a separate file from scripts/server/route-suite.proof.mjs:
   everything below is provable without a running server, so it lives
   here where the pre-build `fixture-suite` step (scripts/verify.mjs)
   can unit-test it directly, via scripts/server/route-assertions.test.mjs
   riding the existing recursive test glob under scripts/ (the same one
   package.json's own "test" script uses). The suite that
   DOES need a server — starting `next start`, running the curl A-H
   checks and the five negative sets over `fetch` — lives beside this
   file under a name (`route-suite.proof.mjs`) that glob cannot reach,
   because it would fail for want of a `.next` directory if it ran
   before `next-build`.

   No server, no `fetch` call of its own, anywhere in this module.

   Exports:
     - HEADER_EXCLUSIONS   — D-11's documented exclusion list
     - assertUniversalHeaders(response, label)
     - assertNoSuccessOnlyHeaders(response, label)
     - compareResponses(a, b, label)      — D-11's byte-identity comparator
     - cookieJar(fetchImpl)
     - snapshot(response)
   ================================================================ */

import assert from "node:assert/strict";
import { HEADER_TABLE } from "../../lib/http/contract.ts";

/**
 * D-11's exclusion list: every header name this comparator ignores
 * when it asserts two responses are byte-identical, each with a
 * one-line reason. This is the local observation
 * (03-RESEARCH.md §Common Pitfalls Pitfall 3) plus what CONTEXT.md's
 * D-11 anticipates the live platform may add — the human-run curl
 * suite against a real deployment (D-09b) is what confirms the
 * platform half; this list cannot confirm it by itself.
 *
 * Plan 03-16 ran that live confirmation against a real Preview
 * deployment (docs/analysis/server-seam-verification.md) and
 * reconciled this list against the platform's own observed response
 * headers: `x-vercel-*` and `server` were confirmed present exactly
 * as anticipated; `date`, `connection`, `keep-alive`,
 * `transfer-encoding`, `content-length`, `vary` and `etag` needed no
 * change (several were not even observed on the routes exercised
 * there, which this list already tolerates without change). `age`
 * and `x-robots-tag` were platform-added headers neither this list
 * nor this project's own code anticipated, and are added below as a
 * direct result.
 *
 * Names are lowercased. `prefix: true` marks an entry matched by
 * `String.prototype.startsWith` rather than exact equality — the one
 * such entry is Vercel's own routing/cache-identifier family.
 */
export const HEADER_EXCLUSIONS = [
  {
    name: "date",
    reason: "A per-response timestamp — two genuinely identical responses taken seconds apart would otherwise never compare equal.",
  },
  {
    name: "connection",
    reason: "Hop-by-hop, set by the HTTP layer that terminates the connection, never by this project's own responder.",
  },
  {
    name: "keep-alive",
    reason: "Hop-by-hop, carries a per-connection timeout value set by the HTTP layer alongside Connection, not a fact about the record requested.",
  },
  {
    name: "transfer-encoding",
    reason: "Body framing (chunked vs. Content-Length) varies between a local `next start` and the platform's own proxy layer, independent of the body's actual bytes.",
  },
  {
    name: "content-length",
    reason: "Framing, not content — observed absent locally for a chunked response, but a platform framing the identical body differently must not fail this comparator.",
  },
  {
    name: "vary",
    reason: "A framework-emitted router hint (03-RESEARCH.md Pitfall 3), constant per route method, not ours — observed identically on every Route Handler response tested, with or without cookies.",
  },
  {
    name: "server",
    reason: "Platform-added; names the serving software, not a fact about the record requested.",
  },
  {
    name: "etag",
    reason: "The platform may add one on a real deployment (03-RESEARCH.md Assumptions Log A2); this project's own responder never sets one.",
  },
  {
    name: "x-vercel-",
    reason: "Vercel's own routing and cache-identifier family, added by the platform's edge layer on a real deployment and never by this project's responder (CONTEXT.md D-11).",
    prefix: true,
  },
  {
    name: "age",
    reason: "A CDN/edge cache-age counter (seconds since the platform's edge cached the response) — observed as 0 for a cache MISS on a real Preview deployment's Route Handler responses (plan 03-16, docs/analysis/server-seam-verification.md); not set by this project's own responder and not a fact about the record requested.",
  },
  {
    name: "x-robots-tag",
    reason: "Vercel's own addition on a real Preview deployment, observed value \"noindex\" (plan 03-16, docs/analysis/server-seam-verification.md) — confirmed absent from this repository's own code (no next.config.ts headers() rule, no vercel.json headers entry, no lib/http/respond.ts or lib/http/contract.ts reference); keeps an ephemeral Preview URL out of a search index, not a fact about the record requested.",
  },
];

function isExcludedHeaderName(lowerName) {
  return HEADER_EXCLUSIONS.some((entry) =>
    entry.prefix ? lowerName.startsWith(entry.name) : lowerName === entry.name,
  );
}

/**
 * Reads a header's value off either a real Fetch `Response` (whose
 * `headers` is a `Headers` instance with `.get()`) or a `snapshot()`
 * record (whose `headers` is a plain, already-lowercased object) —
 * every function below that reads a header works against either
 * shape, so a caller can pass a live Response straight through
 * `assertUniversalHeaders`/`assertNoSuccessOnlyHeaders` before ever
 * calling `snapshot()`, or pass an already-snapshotted record.
 */
function headerValue(headersLike, name) {
  if (!headersLike) return undefined;
  if (typeof headersLike.get === "function") {
    return headersLike.get(name) ?? undefined;
  }
  const lower = name.toLowerCase();
  for (const key of Object.keys(headersLike)) {
    if (key.toLowerCase() === lower) return headersLike[key];
  }
  return undefined;
}

/**
 * NFR-F1: `Cache-Control` is exactly `no-store`, `X-CAP-Store` and
 * `X-CAP-Instance` are both present and non-empty. Every request the
 * suite makes passes its response through this — success and error
 * alike — so a caller cannot forget it for one code path.
 */
export function assertUniversalHeaders(response, label) {
  const cacheControl = headerValue(response.headers, "cache-control");
  assert.equal(
    cacheControl,
    "no-store",
    `${label}: expected Cache-Control: no-store, got ${JSON.stringify(cacheControl)}`,
  );
  const store = headerValue(response.headers, "x-cap-store");
  assert.ok(store, `${label}: missing X-CAP-Store`);
  const instance = headerValue(response.headers, "x-cap-instance");
  assert.ok(instance, `${label}: missing X-CAP-Instance`);
}

/**
 * AD-4: no header `HEADER_TABLE` marks `success-only` may appear on
 * this response. Used on every not-found and every error this suite
 * provokes — the assertion that fails the build the moment a
 * route-specific counter leaks onto a refusal.
 */
export function assertNoSuccessOnlyHeaders(response, label) {
  const successOnlyNames = HEADER_TABLE.filter((entry) => entry.scope === "success-only").map(
    (entry) => entry.name,
  );
  for (const name of successOnlyNames) {
    const value = headerValue(response.headers, name);
    assert.equal(
      value,
      undefined,
      `${label}: success-only header "${name}" must not be present, got ${JSON.stringify(value)}`,
    );
  }
}

function filteredHeaderMap(headersLike) {
  const map = {};
  const entries =
    typeof headersLike.entries === "function" ? [...headersLike.entries()] : Object.entries(headersLike);
  for (const [rawName, value] of entries) {
    const name = rawName.toLowerCase();
    if (isExcludedHeaderName(name)) continue;
    map[name] = value;
  }
  return map;
}

/**
 * D-11's comparator. `a` and `b` are `{ status, bodyText, headers }`
 * records (see `snapshot()` below). Asserts the statuses are equal,
 * the raw body text is byte-identical (never a parsed-object
 * comparison — two different objects can serialise to the same JSON
 * and two identical objects can serialise differently), then builds
 * each side's header map with every `HEADER_EXCLUSIONS` name removed
 * and asserts the two maps deep-equal. On failure, names the first
 * differing header and both of its values.
 */
export function compareResponses(a, b, label) {
  assert.equal(a.status, b.status, `${label}: status differs — ${a.status} vs ${b.status}`);
  assert.equal(a.bodyText, b.bodyText, `${label}: body bytes differ`);

  const mapA = filteredHeaderMap(a.headers);
  const mapB = filteredHeaderMap(b.headers);
  const names = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
  for (const name of names) {
    if (mapA[name] !== mapB[name]) {
      throw new assert.AssertionError({
        message: `${label}: header "${name}" differs — ${JSON.stringify(mapA[name])} vs ${JSON.stringify(mapB[name])}`,
      });
    }
  }
}

/**
 * `node:test` plus `fetch` has no cookie jar and there is no in-repo
 * analog to borrow one from — this is the smallest thing that does
 * the job. `fetchImpl` defaults to the global `fetch` but is
 * injectable so a fixture test can drive this with a stub rather than
 * a real network call. Captures every `set-cookie` a response carries
 * into a name→value map and replays it as a single `Cookie` header on
 * the next request; a clearing `set-cookie` (`Max-Age=0`) deletes that
 * name from the map rather than storing an empty value.
 */
export function cookieJar(fetchImpl = fetch) {
  const cookies = new Map();

  function cookieHeader() {
    return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  function captureSetCookie(response) {
    const raws =
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    for (const raw of raws) {
      const attrs = raw.split(";").map((part) => part.trim());
      const [pair, ...rest] = attrs;
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const maxAgeAttr = rest.find((attr) => attr.toLowerCase().startsWith("max-age="));
      const maxAge = maxAgeAttr ? Number(maxAgeAttr.slice("max-age=".length)) : undefined;
      if (maxAge === 0) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }
  }

  async function jarFetch(url, init = {}) {
    const headers = new Headers(init.headers ?? {});
    const cookieStr = cookieHeader();
    if (cookieStr) headers.set("Cookie", cookieStr);
    const response = await fetchImpl(url, { ...init, headers });
    captureSetCookie(response);
    return response;
  }

  return { fetch: jarFetch, cookies };
}

/**
 * Reads a live `Response` down into the plain `{ status, bodyText,
 * headers }` shape `compareResponses` compares, so that function
 * never has to touch a live Response (whose body can only be read
 * once). `headers` is a plain object with every name lowercased.
 */
export async function snapshot(response) {
  const bodyText = await response.text();
  const headers = {};
  for (const [name, value] of response.headers.entries()) {
    headers[name.toLowerCase()] = value;
  }
  return { status: response.status, bodyText, headers };
}
