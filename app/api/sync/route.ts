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
import { applyItem, noteContact } from "../../../lib/reconcile/apply.ts";
import { pick, ACCEPTED_BODY_FIELDS, validateEnvelopeItem, badShapeDetail } from "../../../lib/reconcile/validate.ts";
import { SYNC_MAX_ITEMS, SYNC_MAX_ENCODED_BYTES } from "../../../lib/limits/index.ts";
import { TRANSPORT_COPY } from "../../../lib/copy/conflicts.ts";
import type { SyncItem, SyncItemResult } from "../../../lib/data/types";

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

  // Iterated in arrival order, one at a time: the items are ordered
  // and the writer mutates shared module state, so no concurrent
  // dispatch of the whole array and no early exit from this loop —
  // every item gets a SyncItemResult, including one that was
  // refused, because the batch is not a transaction.
  const results: SyncItemResult[] = [];

  for (const rawItem of items) {
    const envelopeRefusal = validateEnvelopeItem(rawItem);

    if (envelopeRefusal && envelopeRefusal.field === "client_id") {
      // The one exception to "every item reaches the writer" (AD-1,
      // REQ-FR-24): an item with no UUID-shaped client_id cannot be
      // keyed for idempotency (the seen map is keyed by client_id)
      // or named in a result (a caller correlates a result back to
      // its own queued item by that same field), so it is refused
      // here, at the envelope, without calling the writer at all.
      // The result carries an empty client id in place of one that
      // never existed to report.
      results.push({
        client_id: "",
        status: "rejected",
        code: envelopeRefusal.code,
        detail: envelopeRefusal.detail,
      });
    } else {
      // Every other item — well-formed or not otherwise — reaches
      // the one writer anyway: a bad kind, a bad schema_version, a
      // bad order_id or a bad created_at is refused by the writer's
      // own shape step, not by a second check here, and the refusal
      // is retained as an attempt exactly like a real one. A
      // referral item is a recognised kind that reaches the writer
      // and comes back rejected unknown_kind — P9 supplies the real
      // behaviour; until then the refusal is honest rather than a
      // silent drop. The kind itself is never special-cased in this
      // file.
      const item = rawItem as SyncItem<unknown>;
      try {
        const outcome = await applyItem(sessionResult, item);
        results.push(outcome.result);
      } catch {
        // Defensive only: the queue envelope is versioned (AD-18)
        // and this server may receive an item shaped by a kind it
        // does not (or no longer) recognise. The writer's own shape
        // step already refuses a recognised-but-wrong shape safely;
        // this catch exists for the one input shape that is not
        // recognised at all and would otherwise throw before that
        // shape step is ever reached — which would drop every other
        // item in the batch along with it, never acceptable, since
        // the batch is not a transaction.
        results.push({
          client_id: typeof item.client_id === "string" ? item.client_id : "",
          status: "rejected",
          code: "bad_shape",
          detail: badShapeDetail("kind"),
        });
      }
    }
  }

  // Tallied once, after the loop completes — never per item, and
  // never by mutating an already-built response. A dropped item
  // would change these counts and so would be visible (D-01).
  const counts = { recorded: 0, duplicate: 0, conflict: 0, rejected: 0 };
  for (const result of results) {
    counts[result.status]++;
  }

  // Status 200 whenever the envelope itself parsed, even a batch in
  // which every single item was refused: the reasons live in the
  // body and in these counters, not in the status line. This is
  // deliberate, not an oversight likely to be "fixed" later by
  // someone expecting a 4xx when nothing was recorded.
  return ok(
    { server_time: new Date().toISOString(), results },
    {
      status: 200,
      headers: {
        "X-CAP-Sync-Recorded": String(counts.recorded),
        "X-CAP-Sync-Duplicate": String(counts.duplicate),
        "X-CAP-Sync-Conflict": String(counts.conflict),
        "X-CAP-Sync-Rejected": String(counts.rejected),
        "X-CAP-Account": account.account_id,
      },
    },
  );

  // What this route deliberately does not do, so P6 does not have to
  // guess: it holds no queue, it makes no connectivity judgment, it
  // renders no conflict card, and it decides no client-side batch
  // budget. Those are P6's; D-02 already places the client's own
  // outbound budget there, as a separate export strictly below
  // SYNC_MAX_ENCODED_BYTES.
}
