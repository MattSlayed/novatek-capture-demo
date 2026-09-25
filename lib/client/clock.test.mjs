/* ================================================================
   CLOCK — unit tests (FR-58, FR-10, FR-11; UI-SPEC Decisions 2 and 3)

   Plain node:test assertions, no build and no server, discovered by
   scripts/verify.mjs's "unit-suite" step. This file is where
   04-VALIDATION.md's FR-58 unit row is discharged: the field-by-field
   mapping, and in particular the two device pairs being ABSENT rather
   than empty where the record does not carry them.

   OrderClock stubs are built by hand below rather than read from a
   fixture, so these assertions state the shape they depend on and do
   not move when fixture content does.
   ================================================================ */

import test from "node:test";
import assert from "node:assert/strict";
import {
  anchorFrom,
  elapsedAt,
  formatDuration,
  formatInstant,
  clockState,
  segmentRows,
} from "./clock.ts";

function stubClock(segments, elapsedS) {
  return {
    order_id: "wo-0142",
    account_id: "acc-mabaso",
    segments,
    elapsed_s: elapsedS,
  };
}

const serverSegment = {
  opened_at: "2026-09-25T06:12:00.000Z",
  closed_at: "2026-09-25T09:24:00.000Z",
  source: "server",
};

const runningSegment = {
  opened_at: "2026-09-25T06:12:00.000Z",
  closed_at: null,
  source: "server",
};

const reconciledSegment = {
  opened_at: "2026-09-25T06:12:00.000Z",
  closed_at: "2026-09-25T09:24:00.000Z",
  source: "device_reconciled",
  device_claimed_opened_at: "2026-09-25T06:08:48.000Z",
  device_offset_s: 192,
};

// FR-11 retains both, but the type marks each optional
// independently, so a record carrying only the claimed instant is a
// shape this mapping has to answer for.
const claimOnlySegment = {
  opened_at: "2026-09-25T06:12:00.000Z",
  closed_at: "2026-09-25T09:24:00.000Z",
  source: "device_reconciled",
  device_claimed_opened_at: "2026-09-25T06:08:48.000Z",
};

const terms = (pairs) => pairs.map((pair) => pair.term);

/* ---------------------------------------------------------------
   the anchor and the interpolation
   --------------------------------------------------------------- */

test("anchorFrom takes elapsed_s as given and stores the monotonic reading beside it", () => {
  assert.deepStrictEqual(anchorFrom(stubClock([serverSegment], 11520), 4200.5), {
    elapsedS: 11520,
    readAtMono: 4200.5,
  });
});

test("elapsedAt adds whole seconds only, never a fraction", () => {
  const anchor = anchorFrom(stubClock([runningSegment], 100), 1000);
  assert.equal(elapsedAt(anchor, 1000), 100);
  assert.equal(elapsedAt(anchor, 2000), 101);
  assert.equal(elapsedAt(anchor, 61_000), 160);
  assert.equal(Number.isInteger(elapsedAt(anchor, 7777.7)), true);
});

test("elapsedAt is unchanged by a sub-second delta", () => {
  const anchor = anchorFrom(stubClock([runningSegment], 100), 1000);
  assert.equal(elapsedAt(anchor, 1001), 100);
  assert.equal(elapsedAt(anchor, 1999), 100);
  assert.equal(elapsedAt(anchor, 2000), 101);
});

test("elapsedAt never returns less than the anchor's own figure, even for a reading behind the anchor", () => {
  const anchor = anchorFrom(stubClock([runningSegment], 100), 5000);
  assert.equal(elapsedAt(anchor, 4999), 100);
  assert.equal(elapsedAt(anchor, 0), 100);
  assert.equal(elapsedAt(anchor, -1), 100);
});

test("elapsedAt recomputes from the anchor rather than accumulating, so a throttled tick loses nothing", () => {
  const anchor = anchorFrom(stubClock([runningSegment], 100), 0);
  // One reading a minute apart, as an intensively throttled hidden
  // page gives: the figure is still the full elapsed time, not one
  // increment.
  assert.equal(elapsedAt(anchor, 60_000), 160);
  assert.equal(elapsedAt(anchor, 600_000), 700);
});

/* ---------------------------------------------------------------
   the two rendering formats
   --------------------------------------------------------------- */

test("formatDuration renders H:MM:SS with the hour unpadded and uncapped", () => {
  assert.equal(formatDuration(0), "0:00:00");
  assert.equal(formatDuration(192), "0:03:12");
  assert.equal(formatDuration(3661), "1:01:01");
  assert.equal(formatDuration(90000), "25:00:00");
});

test("formatDuration's regrouping is reversible, so it is a rendering and not a claim", () => {
  for (const seconds of [0, 1, 59, 60, 192, 3599, 3661, 86_399, 90_000, 359_999]) {
    const [h, m, s] = formatDuration(seconds).split(":").map(Number);
    assert.equal(h * 3600 + m * 60 + s, seconds);
  }
});

test("formatInstant returns the server's own string byte-identically as the machine value", () => {
  const iso = "2026-09-25T06:12:00.000Z";
  assert.equal(formatInstant(iso).machine, iso);
  assert.equal(formatInstant("2026-09-25T06:12:00Z").machine, "2026-09-25T06:12:00Z");
  assert.equal(formatInstant("2026-09-25T08:12:00+02:00").machine, "2026-09-25T08:12:00+02:00");
});

test("formatInstant's human value is one format always, YYYY-MM-DD HH:MM:SS in the device's zone", () => {
  // The shape and the byte-identity are asserted, not a fixed zone:
  // the human half is local by design, so pinning a zone would make
  // this test depend on the runner's TZ rather than on the mapping.
  const shape = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  assert.match(formatInstant("2026-09-25T06:12:00.000Z").human, shape);
  assert.match(formatInstant("2026-01-01T00:00:00.000Z").human, shape);
  assert.match(formatInstant("2026-12-31T23:59:59.000Z").human, shape);
});

test("formatInstant renders the full date even for two instants sharing a calendar day, so a day boundary is never hidden", () => {
  const opened = formatInstant("2026-09-25T06:12:00.000Z").human;
  const closed = formatInstant("2026-09-25T09:24:00.000Z").human;
  assert.equal(opened.slice(0, 10), closed.slice(0, 10));
  assert.equal(opened.length, closed.length);
});

/* ---------------------------------------------------------------
   the three clock states
   --------------------------------------------------------------- */

test("clockState returns no-segments for a record that has never been opened", () => {
  assert.equal(clockState(stubClock([], 0)), "no-segments");
});

test("clockState returns segment-running for a segment whose closed_at is null", () => {
  assert.equal(clockState(stubClock([runningSegment], 0)), "segment-running");
  assert.equal(clockState(stubClock([serverSegment, runningSegment], 11520)), "segment-running");
});

test("clockState returns all-segments-closed where segments exist and none is running", () => {
  assert.equal(clockState(stubClock([serverSegment], 11520)), "all-segments-closed");
  assert.equal(
    clockState(stubClock([serverSegment, reconciledSegment], 23040)),
    "all-segments-closed",
  );
});

/* ---------------------------------------------------------------
   FR-58's field-by-field mapping
   --------------------------------------------------------------- */

test("a server segment yields exactly SOURCE, STARTED and ENDED — no device pair is rendered empty", () => {
  const [row] = segmentRows(stubClock([serverSegment], 11520));
  assert.deepStrictEqual(terms(row), ["SOURCE", "STARTED", "ENDED"]);
  assert.deepStrictEqual(row[0].value, {
    kind: "mark",
    mark: "filled-square",
    word: "SERVER-STAMPED",
  });
  assert.equal(row[1].value.machine, serverSegment.opened_at);
  assert.equal(row[2].value.machine, serverSegment.closed_at);
});

test("a device_reconciled segment carrying both optional fields yields five pairs in order", () => {
  const [row] = segmentRows(stubClock([reconciledSegment], 11520));
  assert.deepStrictEqual(terms(row), [
    "SOURCE",
    "STARTED",
    "DEVICE CLAIMED",
    "MEASURED OFFSET",
    "ENDED",
  ]);
  assert.deepStrictEqual(row[0].value, {
    kind: "mark",
    mark: "hollow-square-dot",
    word: "DEVICE-CLAIMED",
  });
  assert.equal(row[2].value.machine, reconciledSegment.device_claimed_opened_at);
  assert.deepStrictEqual(row[3].value, { kind: "figure", text: "0:03:12" });
});

test("a device_reconciled segment carrying no measured offset omits only the MEASURED OFFSET pair", () => {
  const [row] = segmentRows(stubClock([claimOnlySegment], 11520));
  assert.deepStrictEqual(terms(row), ["SOURCE", "STARTED", "DEVICE CLAIMED", "ENDED"]);
  assert.equal(
    row.some((pair) => pair.term === "MEASURED OFFSET"),
    false,
  );
});

test("a running segment's ENDED pair carries the word RUNNING rather than an instant", () => {
  const [row] = segmentRows(stubClock([runningSegment], 100));
  const ended = row.at(-1);
  assert.equal(ended.term, "ENDED");
  assert.deepStrictEqual(ended.value, { kind: "word", word: "RUNNING" });
  assert.equal("machine" in ended.value, false);
});

test("segmentRows emits no per-segment duration pair for any segment shape", () => {
  const rows = segmentRows(
    stubClock([serverSegment, reconciledSegment, claimOnlySegment, runningSegment], 34560),
  );
  const allowed = new Set(["SOURCE", "STARTED", "DEVICE CLAIMED", "MEASURED OFFSET", "ENDED"]);
  for (const row of rows) {
    for (const term of terms(row)) {
      assert.equal(allowed.has(term), true, `unexpected term ${term}`);
    }
  }
});

test("segmentRows keeps the record's own segment order and maps every segment", () => {
  const rows = segmentRows(stubClock([serverSegment, reconciledSegment, runningSegment], 34560));
  assert.equal(rows.length, 3);
  assert.equal(rows[0][0].value.word, "SERVER-STAMPED");
  assert.equal(rows[1][0].value.word, "DEVICE-CLAIMED");
  assert.deepStrictEqual(rows[2].at(-1).value, { kind: "word", word: "RUNNING" });
});

test("segmentRows returns an empty list, never throws, for a record with no segments", () => {
  assert.deepStrictEqual(segmentRows(stubClock([], 0)), []);
});
