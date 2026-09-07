/* ================================================================
   DEPLOYMENT CHECK — fixture tests (D-23)

   Proves scripts/check-deployment.mjs exits non-zero on every named
   failure mode, from a local `node:http` server so no network access
   is needed. The probe is pointed at `http://127.0.0.1:<port>`, which
   exercises every assertion except HSTS (asserted only when the
   final scheme is https, by design — see the script's own comment).
   ================================================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { runCheck } from "./lib/fixtures.mjs";

const SCRIPT = "scripts/check-deployment.mjs";

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

const PASSING_HEADERS = {
  "permissions-policy": "camera=(self), microphone=(self)",
  "x-frame-options": "SAMEORIGIN",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-type": "text/html",
};

const PASSING_BODY = `<!doctype html><html><body>
<section aria-label="Preview disclosure">
<p><span>Designed preview.</span> Capture is specified, not yet built.</p>
<a href="/?s=limits">Read the full preview limits</a>
</section>
<main><h1 id="screen-title">NOVATEK Capture</h1></main>
</body></html>`;

test("exits 0 when every header and the ribbon markup are present", async () => {
  const { server, url } = await startServer((req, res) => {
    res.writeHead(200, PASSING_HEADERS);
    res.end(PASSING_BODY);
  });
  try {
    const { code } = await runCheck(SCRIPT, { args: ["--url", url] });
    assert.equal(code, 0);
  } finally {
    await closeServer(server);
  }
});

test("exits non-zero when permissions-policy is missing", async () => {
  const { server, url } = await startServer((req, res) => {
    const headers = { ...PASSING_HEADERS };
    delete headers["permissions-policy"];
    res.writeHead(200, headers);
    res.end(PASSING_BODY);
  });
  try {
    const { code } = await runCheck(SCRIPT, { args: ["--url", url] });
    assert.notEqual(code, 0);
  } finally {
    await closeServer(server);
  }
});

test("exits non-zero when permissions-policy is the disabling policy camera=(), microphone=()", async () => {
  const { server, url } = await startServer((req, res) => {
    res.writeHead(200, {
      ...PASSING_HEADERS,
      "permissions-policy": "camera=(), microphone=()",
    });
    res.end(PASSING_BODY);
  });
  try {
    const { code } = await runCheck(SCRIPT, { args: ["--url", url] });
    assert.notEqual(code, 0);
  } finally {
    await closeServer(server);
  }
});

test("exits non-zero and names Deployment Protection on a 307 redirect to a _vercel/sso path", async () => {
  const { server, url } = await startServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(307, { location: "/_vercel/sso?d=1" });
      res.end();
    } else {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<!doctype html><html><body>login</body></html>");
    }
  });
  try {
    const { code, stdout } = await runCheck(SCRIPT, { args: ["--url", url] });
    assert.notEqual(code, 0);
    assert.match(stdout, /Deployment Protection/);
  } finally {
    await closeServer(server);
  }
});

test('exits non-zero when the body has no aria-label="Preview disclosure"', async () => {
  const body = PASSING_BODY.replace(' aria-label="Preview disclosure"', "");
  const { server, url } = await startServer((req, res) => {
    res.writeHead(200, PASSING_HEADERS);
    res.end(body);
  });
  try {
    const { code } = await runCheck(SCRIPT, { args: ["--url", url] });
    assert.notEqual(code, 0);
  } finally {
    await closeServer(server);
  }
});

test("exits non-zero when the ribbon section contains a dismiss-labelled control", async () => {
  const body = PASSING_BODY.replace(
    "</section>",
    '<button type="button" aria-label="Dismiss">x</button></section>',
  );
  const { server, url } = await startServer((req, res) => {
    res.writeHead(200, PASSING_HEADERS);
    res.end(body);
  });
  try {
    const { code } = await runCheck(SCRIPT, { args: ["--url", url] });
    assert.notEqual(code, 0);
  } finally {
    await closeServer(server);
  }
});

test("exits non-zero when invoked with no --url", async () => {
  const { code } = await runCheck(SCRIPT, {});
  assert.notEqual(code, 0);
});
