/* ================================================================
   POST /api/sync — reconcile a batch through the one writer (D-01,
   D-02, AD-1, REQ-FR-24)

   No `runtime` or `dynamic` export, for the same reason as every
   other route in this phase (03-RESEARCH.md Pitfall 1) — reading the
   session cookie already makes this handler dynamic by construction.

   This route returns HTTP 200 whenever the envelope itself parsed,
   and every per-item outcome — recorded, duplicate, conflict or
   rejected alike — is carried in `results[]` rather than in the
   status line. A batch is not a transaction: a refused item does not
   fail its neighbours, and the loop this file builds never stops
   early.

   The session check lives here, once, at the envelope level, rather
   than once per item: the route table gives this whole route a 401,
   and a per-item no_session would be a second rendering of the same
   fact. Every item still reaches the one writer afterward — this
   route imports no store module of its own and constructs no
   response of its own; both belong to lib/reconcile/apply.ts and
   lib/http/respond.ts respectively.
   ================================================================ */

import type { NextRequest } from "next/server";
import { ok, fail } from "../../../lib/http/respond.ts";
import { readSession } from "../../../lib/session/cookie.ts";
import { deriveAccount } from "../../../lib/attribution/index.ts";
import { noteContact } from "../../../lib/reconcile/apply.ts";
import { pick, ACCEPTED_BODY_FIELDS } from "../../../lib/reconcile/validate.ts";
import { SYNC_MAX_ITEMS, SYNC_MAX_ENCODED_BYTES } from "../../../lib/limits/index.ts";
import { TRANSPORT_COPY } from "../../../lib/copy/conflicts.ts";
import type { SyncItemResult } from "../../../lib/data/types";

export async function POST(request: NextRequest) {
  const sessionResult = readSession(request);
  const account = deriveAccount(sessionResult);
  if (!account) {
    return fail("no_session");
  }
  noteContact(account);

  // The raw wire text is read once and measured directly, rather than
  // via a parsed-then-re-serialised object: the ceiling is about what
  // actually crossed the wire, and re-encoding an already-parsed
  // value could measure a different byte length (a different key
  // order, different whitespace) than what the client actually sent.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail("bad_request");
  }
  const encodedBytes = Buffer.byteLength(raw, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("bad_request");
  }

  // A parsed-but-non-object value (an array, a string, a bare number,
  // null) has no own property pick() could ever find — treated the
  // same as an empty body, the same guard every other write route in
  // this phase already needed for a non-object JSON body.
  const body: Record<string, unknown> =
    typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const picked = pick(body, ACCEPTED_BODY_FIELDS.sync);
  const items = Array.isArray(picked.items) ? (picked.items as unknown[]) : null;
  if (!items) {
    return fail("bad_request");
  }

  // D-02: the app-level batch ceiling, read from lib/limits and
  // checked before a single item in the batch is read. This is a
  // different refusal from the hosting platform's own governed
  // sentence for a request the platform refused before the preview
  // server ever saw the body at all — neither sentence is ever used
  // in place of the other.
  if (items.length > SYNC_MAX_ITEMS || encodedBytes > SYNC_MAX_ENCODED_BYTES) {
    return fail("batch_too_large", TRANSPORT_COPY.batch_too_large.sentence);
  }

  // Refuse nothing else at the envelope level — an item whose own
  // shape is wrong is one item's problem, decided per item below.

  // Placeholder result set. The per-item loop, the four-counter
  // response and the closing "what this route does not do" note are
  // this same task's next commit.
  const results: SyncItemResult[] = [];
  return ok(
    { server_time: new Date().toISOString(), results },
    { status: 200, headers: { "X-CAP-Account": account.account_id } },
  );
}
