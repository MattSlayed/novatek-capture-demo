#!/usr/bin/env bash
# ================================================================
# curl-suite.sh — the reviewer-facing mirror of curl checks A-H
# (D-09b, D-10, FR-24)
#
# This is the first `.sh` file in this repository; every other proof
# script here is `.mjs`. That is deliberate: FR-24 promises the seam
# is "reproducible from an ordinary shell with a standard HTTP
# client," and a reviewer who has never run this project's Node
# tooling still has `bash` and `curl`. This script is that half of
# the proof. The other half is automated: plan 03-13's
# `scripts/server/route-suite.proof.mjs` runs the identical eight
# lettered checks (plus five negative sets this script does not
# repeat) inside `npm run verify`, against a server it starts and
# tears down itself. The eight checks below mirror that suite's own
# checks A-H, over plain `curl` instead of `fetch` — this script is
# the human-run twin, not a superset.
#
# Deliberately NOT wired into `scripts/verify.mjs`. D-09 splits the
# proof in two on purpose: the automated half runs inside the build
# gate against a server this repository starts for itself; this half
# is run by a human, by hand, against a real deployment, and its
# output is recorded in `docs/analysis/` (see plan 03-16). Do not add
# this file to `verify.mjs`'s STEPS later "to be thorough" — that
# would collapse the two halves D-09 keeps apart on purpose.
#
# No early stop on a failing command. Each lettered check below
# prints its own PASS or FAIL line and every check still runs after
# one fails, because a reviewer reading this output by eye wants the
# whole picture in one pass, not just the first stumble. The `check`
# helper below (never a bare shell assertion) is what makes that
# true: it reports and continues, and the script's own exit status at
# the very end is what a pipeline reads.
#
# No `jq` anywhere in this file. `jq` is not guaranteed to be on a
# reviewer's machine, and this script has to run with nothing
# installed beyond `bash` and `curl` themselves. Every JSON field this
# script reads back is pulled out with `grep -o` and `sed`, using this
# project's own known, stable response shapes (documented inline at
# each extraction) rather than a general-purpose parser.
#
# Headers and body are captured to two separate temporary files via
# `-D`/`-o` rather than the combined `-D - -o -` stream: this script
# re-reads both repeatedly with `grep`/`sed` after each request, and
# two plain files are simpler to re-read than a single stream split by
# hand on the blank-line boundary between them.
#
# Git executable bit: this file is committed as mode 100755. On a
# Windows checkout (this repository's own primary development
# platform) that bit does not exist on the filesystem itself, so it is
# set directly in the index with
# `git update-index --chmod=+x scripts/curl-suite.sh` rather than left
# to `chmod` alone — a reviewer who clones this repository on Linux or
# macOS and finds a `100644` script cannot run it as written.
# ================================================================

set -u

# First executable line, deliberately: running this script with no
# base URL at all should print one usable sentence, not a wall of
# connection-refused errors from eight separate checks.
B="${B:?set B to the base URL, e.g. B=https://example.vercel.app}"

# ----------------------------------------------------------------
# Constants (D-10): real values throughout, never the seed's
# placeholder body. The seed's own curl sketch used a two-character
# stand-in digest and a one-byte declared size for every capture body
# — both retired here entirely.
# ----------------------------------------------------------------

# The SHA-256 of an empty file/buffer — a real 64-lowercase-hex
# digest, and the seed's own suggested D-10 replacement.
EMPTY_SHA256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

# base64("curl-suite-thumb") — a short, real base64 string, computed
# once and hardcoded here rather than shelling out to a `base64`
# binary whose flags differ between GNU and BSD userlands.
THUMB_B64="Y3VybC1zdWl0ZS10aHVtYg=="

# A believable declared original size, well under
# lib/limits's CAPTURE_MAX_DECLARED_BYTES (32 MiB). Chosen to start
# with a digit other than one, on purpose: a value such as one
# thousand and twenty-four still opens with the same leading digit as
# the seed's own retired one-byte placeholder, even though it is a
# real, unrelated number — this one cannot be mistaken for a
# surviving trace of that placeholder by a simple text search.
CAPTURE_BYTES=2048

now_iso() {
  # ISO-8601 UTC with a literal Z, no fractional seconds — exactly
  # lib/reconcile/validate.ts's isIsoUtcZ() shape.
  date -u +%Y-%m-%dT%H:%M:%SZ
}

# ----------------------------------------------------------------
# Working directory, cookie jars, and the one request helper. Created
# ahead of the UUID generator below, on purpose: the fallback path
# needs a file to persist its own counter in, since every `new_uuid`
# call site here reads its result back through `$(...)`, and `$(...)`
# runs its command in a subshell — a plain shell variable a subshell
# increments is discarded the moment that subshell exits, so a counter
# kept only in memory would silently reset to the same value on every
# single call. A file on disk survives across that subshell boundary
# the way an in-memory variable cannot; this was found and fixed by
# actually running this script against a locally started server and
# watching every fallback-generated id collide with the one before it
# (see this plan's own SUMMARY).
# ----------------------------------------------------------------

WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/cap-curl-suite.XXXXXX")
trap 'rm -rf "$WORKDIR"' EXIT

MABASO_JAR="$WORKDIR/mabaso.jar"
NAIDOO_JAR="$WORKDIR/naidoo.jar"
HDR_FILE="$WORKDIR/headers.txt"
BODY_FILE="$WORKDIR/body.txt"

# ----------------------------------------------------------------
# UUID generation. Resolved ONCE, into $UUID_SOURCE, so the banner
# below can name the source that actually fired: a recorded run of
# this suite has to say which of the four it used, because they are
# not equally reproducible.
#
# Tried in this order: `uuidgen` (present on macOS and most Linux
# distributions via util-linux — the most recognisably "a real UUID
# tool" of the four), then the Linux kernel's own UUID source (needs
# no external binary at all where it exists), then `/dev/urandom` via
# `od`, then a small fixed pool of literal v4-shaped UUIDs.
#
# /dev/urandom is on the list because this project's own primary
# development platform — Git Bash on Windows — has neither of the
# first two but does have both /dev/urandom and `od` (all four probed
# directly on that shell). Without it the pool served the same twelve
# literals on every run, which made this suite single-shot against a
# warm instance: inside STORE_TTL_SECONDS (6 h), check B's verify
# re-sends the first pool id with a fresh captured_at, gets 409
# already_recorded_differently, and D, E and F fail behind it. FR-24
# promises the seam is reproducible from an ordinary shell; on this
# project's own primary platform it was not.
#
# The pool survives only so this script still runs somewhere with just
# `bash` and `curl` and nothing else. It names itself loudly in the
# banner when it fires, because a run on the pool is not a
# reproducible run and a recorded one must not be read as if it were.
# ----------------------------------------------------------------

FALLBACK_UUIDS=(
  "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d"
  "b2c3d4e5-f6a7-4b2c-9d3e-4f5a6b7c8d9e"
  "c3d4e5f6-a7b8-4c3d-ae4f-5a6b7c8d9e0f"
  "d4e5f6a7-b8c9-4d4e-b5a6-6b7c8d9e0f1a"
  "e5f6a7b8-c9d0-4e5f-8a7b-7c8d9e0f1a2b"
  "f6a7b8c9-d0e1-4f6a-9b8c-8d9e0f1a2b3c"
  "a7b8c9d0-e1f2-4a7b-ac9d-9e0f1a2b3c4d"
  "b8c9d0e1-f2a3-4b8c-bd0e-0f1a2b3c4d5e"
  "c9d0e1f2-a3b4-4c9d-8e1f-1a2b3c4d5e6f"
  "d0e1f2a3-b4c5-4d0e-9f2a-2b3c4d5e6f70"
  "e1f2a3b4-c5d6-4e1f-a3b4-3c4d5e6f7081"
  "f2a3b4c5-d6e7-4f2a-b4c5-4d5e6f708192"
)
FALLBACK_UUID_INDEX_FILE="$WORKDIR/uuid-index"
printf '0' >"$FALLBACK_UUID_INDEX_FILE"

if command -v uuidgen >/dev/null 2>&1; then
  UUID_SOURCE="uuidgen"
elif [ -r /proc/sys/kernel/random/uuid ]; then
  UUID_SOURCE="/proc/sys/kernel/random/uuid"
elif [ -r /dev/urandom ] && command -v od >/dev/null 2>&1; then
  UUID_SOURCE="/dev/urandom"
else
  UUID_SOURCE="fixed-pool"
fi

# Sixteen random bytes as thirty-two lowercase hex characters, laid
# out as v4/variant-1 — byte for byte the shape
# lib/reconcile/validate.ts's isUuidShaped() accepts: a literal "4" in
# the version position and one of 8/9/a/b in the variant position. The
# variant nibble is derived from a random one with `(n & 3) | 8`
# rather than picked from a list, so nothing here can bias it. `od` is
# used rather than `hexdump` or `xxd`: it is the one of the three in
# POSIX, and the one Git Bash actually ships.
urandom_uuid() {
  local h
  h=$(od -An -tx1 -N16 /dev/urandom | tr -d ' \n')
  printf '%s-%s-4%s-%x%s-%s\n' \
    "${h:0:8}" "${h:8:4}" "${h:13:3}" \
    "$(( (0x${h:16:1} & 3) | 8 ))" "${h:17:3}" "${h:20:12}"
}

new_uuid() {
  case "$UUID_SOURCE" in
    uuidgen)
      uuidgen | tr 'A-Z' 'a-z'
      ;;
    /proc/sys/kernel/random/uuid)
      cat /proc/sys/kernel/random/uuid
      ;;
    /dev/urandom)
      urandom_uuid
      ;;
    *)
      local idx
      idx=$(cat "$FALLBACK_UUID_INDEX_FILE")
      printf '%s' "${FALLBACK_UUIDS[$idx]}"
      printf '%s' "$(( (idx + 1) % ${#FALLBACK_UUIDS[@]} ))" >"$FALLBACK_UUID_INDEX_FILE"
      ;;
  esac
}

# req METHOD URL [JAR] [BODY_JSON]
# Populates $STATUS with the numeric status code and leaves the
# response headers and body in $HDR_FILE/$BODY_FILE for the caller to
# read with the helpers below. An empty JAR argument means: no cookie
# at all — the third request path check A's own design calls for.
req() {
  local method="$1" url="$2" jar="${3:-}" body="${4:-}"
  local args=(-sS -D "$HDR_FILE" -o "$BODY_FILE" -w '%{http_code}' -X "$method" "$url")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" --data-raw "$body")
  fi
  if [ -n "$jar" ]; then
    args+=(-b "$jar" -c "$jar")
  fi
  STATUS=$(curl "${args[@]}")
}

header_value() {
  # header_value NAME — last matching header's value in $HDR_FILE,
  # case-insensitive name match, trailing CR stripped.
  grep -i "^$1:" "$HDR_FILE" | tail -n1 | sed -E 's/^[^:]*:[[:space:]]*//' | tr -d '\r'
}

body_has() {
  # body_has TEXT — true when $BODY_FILE contains TEXT as a fixed
  # (non-regex) substring.
  grep -qF "$1" "$BODY_FILE"
}

json_str_field() {
  # json_str_field FIELD [N] — the Nth (default 1) `"FIELD":"value"`
  # occurrence anywhere in $BODY_FILE, value only. Field names below
  # are chosen so this never matches a longer field name that merely
  # ends the same way (e.g. "id" never matches inside "capture_id",
  # because the character immediately before a real "id" match is
  # always a quote, never an underscore).
  local field="$1" n="${2:-1}"
  grep -o "\"$field\":\"[^\"]*\"" "$BODY_FILE" | sed -n "${n}p" | sed -E "s/^\"$field\":\"(.*)\"\$/\1/"
}

proposals_array_text() {
  # The verify/captures response shape is always
  # `{"capture":...,"verification":...,"proposals":[...]}` — proposals
  # is the last top-level key, so a greedy match to the final "]" in
  # the line lands exactly on this array's own closing bracket, never
  # short of it.
  sed -E 's/^.*"proposals":(\[.*\]).*$/\1/' "$BODY_FILE"
}

proposal_state_in_body() {
  # proposal_state_in_body PROPOSAL_ID — this project's own Proposal
  # shape always writes "id" before "capture_id", "order_id",
  # "issued_at" and "state", with no nested object or array between
  # them, so scanning forward from this proposal's own "id" occurrence
  # to its own closing brace is enough to reach "state" without ever
  # crossing into a different proposal's object.
  grep -o "\"id\":\"$1\"[^}]*}" "$BODY_FILE" | head -n1 | grep -o '"state":"[^"]*"' | head -n1 | sed -E 's/^"state":"(.*)"$/\1/'
}

elapsed_s_for_order() {
  # elapsed_s_for_order ORDER_ID — GET /api/hours's OrderClock shape
  # is `{order_id, account_id, segments:[...], elapsed_s}`; a `segment`
  # array can itself contain "}" characters, so a naive
  # "up to the next close-brace" scan from order_id would stop inside
  # the first segment instead of reaching elapsed_s. Both "order_id"
  # and "elapsed_s" appear nowhere else in this response and exactly
  # once per clock, so this lists each in array order and pairs them
  # up by position instead.
  local target="$1"
  local ids elapsed idx=0 id
  ids=$(grep -o '"order_id":"[^"]*"' "$BODY_FILE" | sed -E 's/^"order_id":"(.*)"$/\1/')
  elapsed=$(grep -o '"elapsed_s":[0-9]*' "$BODY_FILE" | sed -E 's/^"elapsed_s":([0-9]+)$/\1/')
  while IFS= read -r id; do
    idx=$((idx + 1))
    if [ "$id" = "$target" ]; then
      printf '%s\n' "$elapsed" | sed -n "${idx}p"
      return 0
    fi
  done <<<"$ids"
}

# capture_body_json CLIENT_ID ORDER_ID ASSET_ID PURPOSE — the online
# verify/captures body shape (flat, not the payload-only subset).
capture_body_json() {
  printf '{"client_id":"%s","order_id":"%s","asset_id":"%s","kind":"photo","purpose":"%s","captured_at":"%s","sha256":"%s","bytes":%d,"mime":"image/jpeg","thumb":"%s"}' \
    "$1" "$2" "$3" "$4" "$(now_iso)" "$EMPTY_SHA256" "$CAPTURE_BYTES" "$THUMB_B64"
}

# capture_payload_json ASSET_ID PURPOSE — the same fields, without
# client_id/order_id, for embedding as a sync item's own "payload".
capture_payload_json() {
  printf '{"asset_id":"%s","kind":"photo","purpose":"%s","captured_at":"%s","sha256":"%s","bytes":%d,"mime":"image/jpeg","thumb":"%s"}' \
    "$1" "$2" "$(now_iso)" "$EMPTY_SHA256" "$CAPTURE_BYTES" "$THUMB_B64"
}

# sync_envelope_json CLIENT_ID ORDER_ID PAYLOAD_JSON — one capture
# item wrapped in the { items: [...] } envelope /api/sync accepts.
sync_envelope_json() {
  printf '{"items":[{"client_id":"%s","kind":"capture","schema_version":1,"order_id":"%s","created_at":"%s","attempts":1,"state":"sending","claimed_account_id":"acc-mabaso","payload":%s}]}' \
    "$1" "$2" "$(now_iso)" "$3"
}

# decision_body_json CLIENT_ID PROPOSAL_ID CAPTURE_CLIENT_ID OBSERVATION_ID OUTCOME [DECIDED_BY]
#
# AD-5's whole mechanism lives in these four identity fields:
# `proposal_id` is a bare HMAC digest with nothing else encoded in it,
# so the server re-derives it from the session's own account plus
# `capture_client_id` and `observation_id` together — a decision
# omitting either of those two, or carrying either with one character
# wrong, is refused `unknown_proposal` before any state is even read.
# The optional sixth argument is D-10's own attack shape: a
# `decided_by` the body supplies, which the server must ignore and
# stamp over with the acting account instead.
decision_body_json() {
  local decided_by_clause=""
  if [ -n "${6:-}" ]; then
    decided_by_clause=",\"decided_by\":\"$6\""
  fi
  printf '{"client_id":"%s","proposal_id":"%s","capture_client_id":"%s","observation_id":"%s","outcome":"%s","decided_at":"%s","decided_where_claimed":"online"%s}' \
    "$1" "$2" "$3" "$4" "$5" "$(now_iso)" "$decided_by_clause"
}

client_id_body_json() {
  printf '{"client_id":"%s"}' "$1"
}

# ----------------------------------------------------------------
# check LABEL EXPECTED ACTUAL [DETAIL] — the one report-and-continue
# helper every assertion below goes through. Never exits on its own;
# the script's own final exit code is decided once, at the very end,
# from the accumulated counters.
# ----------------------------------------------------------------

PASS_COUNT=0
FAIL_COUNT=0

check() {
  local label="$1" expected="$2" actual="$3" detail="${4:-}"
  if [ "$expected" = "$actual" ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    printf 'PASS  %s  %s\n' "$label" "$detail"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    printf 'FAIL  %s  expected %s, got %s (%s)\n' "$label" "$expected" "$actual" "$detail"
  fi
}

yes_no() {
  # yes_no CONDITION_EXIT_CODE — turns a shell truth test's own exit
  # status into the "yes"/"no" string check() compares, so a
  # substring/non-empty assertion reads through the identical helper
  # as a plain equality one.
  if [ "$1" -eq 0 ]; then printf 'yes'; else printf 'no'; fi
}

echo "novatek-capture-demo curl suite — B=$B"
# Recorded with every run (FR-24): which of the four id sources fired
# decides whether this run is repeatable against the same instance.
echo "UUID source: $UUID_SOURCE"
if [ "$UUID_SOURCE" = "fixed-pool" ]; then
  echo "WARNING: no uuidgen, no /proc/sys/kernel/random/uuid, and no /dev/urandom"
  echo "         with od — this run is using curl-suite.sh's OWN FIXED POOL of"
  echo "         twelve literal ids. Against the same warm instance inside"
  echo "         STORE_TTL_SECONDS a second run re-sends them and check B onward"
  echo "         will fail already_recorded_differently. This run is NOT"
  echo "         reproducible; say so wherever its output is recorded."
fi
echo

# ================================================================
# A — identity from session, orders filtered by it
# ================================================================

req POST "$B/api/session" "$MABASO_JAR" '{"persona_id":"acc-mabaso"}'
check "A" "201" "$STATUS" "mint a session for acc-mabaso"

req POST "$B/api/session" "$NAIDOO_JAR" '{"persona_id":"acc-naidoo"}'
check "A" "201" "$STATUS" "mint a session for acc-naidoo"

req GET "$B/api/orders" "$MABASO_JAR"
check "A" "200" "$STATUS" "GET /api/orders as acc-mabaso"
check "A" "acc-mabaso" "$(header_value X-CAP-Account)" "X-CAP-Account names the acting account"
MABASO_ORDER_COUNT=$(grep -o '"id":"wo-[0-9]*"' "$BODY_FILE" | wc -l | tr -d ' ')
check "A" "2" "$MABASO_ORDER_COUNT" "identity from session, orders filtered by it: acc-mabaso holds exactly two orders"
check "A" "yes" "$(yes_no $(body_has "wo-0142"; echo $?))" "wo-0142 is one of acc-mabaso's two orders"
check "A" "yes" "$(yes_no $(body_has "wo-0151"; echo $?))" "wo-0151 is the other of acc-mabaso's two orders"

req GET "$B/api/orders" "$NAIDOO_JAR"
check "A" "200" "$STATUS" "GET /api/orders as acc-naidoo"
NAIDOO_ORDER_COUNT=$(grep -o '"id":"wo-[0-9]*"' "$BODY_FILE" | wc -l | tr -d ' ')
check "A" "1" "$NAIDOO_ORDER_COUNT" "a different persona's jar returns a different, disjoint order set"
check "A" "yes" "$(yes_no $(body_has "wo-0137"; echo $?))" "acc-naidoo's one order is wo-0137"

req GET "$B/api/orders" ""
check "A" "401" "$STATUS" "no jar at all is refused, never a filtered empty list"

req GET "$B/api/orders/wo-0137" "$MABASO_JAR"
check "A" "404" "$STATUS" "acc-mabaso reading acc-naidoo's own order wo-0137"
check "A" "order_not_found" "$(json_str_field error)" "the not-found body names order_not_found, never a permission-specific code"

echo

# ================================================================
# B — verification authored and saying so in a header
# ================================================================

# D-05: the clock gates the record — a capture against an order with
# no running segment is refused 409 order_closed. Not part of the
# seed's own curl sketch, but load-bearing in the shipped server, so
# this order is opened first.
req POST "$B/api/orders/wo-0142/open" "$MABASO_JAR" "$(client_id_body_json "$(new_uuid)")"
check "B" "200" "$STATUS" "open wo-0142 so a capture against it is not order_closed"

CHECK_B_CLIENT_ID=$(new_uuid)
req POST "$B/api/verify" "$MABASO_JAR" "$(capture_body_json "$CHECK_B_CLIENT_ID" "wo-0142" "m-ap003" "verify")"
check "B" "201" "$STATUS" "verification authored and saying so in a header"
check "B" "authored" "$(header_value X-CAP-Verification)" "X-CAP-Verification names the method, not a fact about the world"
CHECK_B_PROPOSAL_COUNT=$(header_value X-CAP-Proposals)
check "B" "yes" "$(yes_no $([ -n "$CHECK_B_PROPOSAL_COUNT" ] && [ "$CHECK_B_PROPOSAL_COUNT" != "0" ]; echo $?))" "X-CAP-Proposals is non-zero ($CHECK_B_PROPOSAL_COUNT)"
check "B" "yes" "$(yes_no $(body_has '"confidence":null'; echo $?))" "no model ran: confidence is null throughout"

# Kept for D and E below: the client_id this capture was posted under
# (AD-5's re-derivation needs it back as capture_client_id), and the
# first two proposals' own id and observation_id.
PROPOSALS_TEXT=$(proposals_array_text)
PROPOSAL_1_ID=$(printf '%s' "$PROPOSALS_TEXT" | grep -o '"id":"[^"]*"' | sed -n '1p' | sed -E 's/^"id":"(.*)"$/\1/')
PROPOSAL_1_OBS=$(printf '%s' "$PROPOSALS_TEXT" | grep -o '"observation_id":"[^"]*"' | sed -n '1p' | sed -E 's/^"observation_id":"(.*)"$/\1/')
PROPOSAL_2_ID=$(printf '%s' "$PROPOSALS_TEXT" | grep -o '"id":"[^"]*"' | sed -n '2p' | sed -E 's/^"id":"(.*)"$/\1/')
PROPOSAL_2_OBS=$(printf '%s' "$PROPOSALS_TEXT" | grep -o '"observation_id":"[^"]*"' | sed -n '2p' | sed -E 's/^"observation_id":"(.*)"$/\1/')
check "B" "yes" "$(yes_no $([ -n "$PROPOSAL_1_ID" ] && [ -n "$PROPOSAL_2_ID" ]; echo $?))" "captured two proposal identities to carry into D and E"

echo

# ================================================================
# C — asset must belong to the order
# ================================================================

req POST "$B/api/verify" "$MABASO_JAR" "$(capture_body_json "$(new_uuid)" "wo-0142" "m-gs001" "verify")"
check "C" "409" "$STATUS" "asset must belong to the order: m-gs001 is not one of wo-0142's assets"
check "C" "asset_not_in_order" "$(json_str_field error)" "asset_not_in_order, never a not-found, since the order itself is real and owned"

echo

# ================================================================
# D — decided_by in the body ignored and the acting account stamped
# ================================================================

# If this comes back 404 unknown_proposal, read that as the shell
# having mangled one of the two identity fields in transit (a missing
# quote, an unescaped character) rather than the server being wrong —
# capture_client_id and observation_id both have to survive quoting
# byte-for-byte, or AD-5's re-derived digest simply will not match.
DECISION_D_BODY=$(decision_body_json "$(new_uuid)" "$PROPOSAL_1_ID" "$CHECK_B_CLIENT_ID" "$PROPOSAL_1_OBS" "accept" "acc-vanwyk")
req POST "$B/api/decisions" "$MABASO_JAR" "$DECISION_D_BODY"
check "D" "201" "$STATUS" "decided_by in the body ignored and the acting account stamped"
check "D" "acc-mabaso" "$(json_str_field decided_by)" "the response names the session's own account, not the body's claim"
check "D" "no" "$(yes_no $(body_has "acc-vanwyk"; echo $?))" "the submitted decided_by appears nowhere in the raw response"

echo

# ================================================================
# E — rejections retained in the walk route
# ================================================================

DECISION_E_BODY=$(decision_body_json "$(new_uuid)" "$PROPOSAL_2_ID" "$CHECK_B_CLIENT_ID" "$PROPOSAL_2_OBS" "reject")
req POST "$B/api/decisions" "$MABASO_JAR" "$DECISION_E_BODY"
check "E" "201" "$STATUS" "reject the second proposal ahead of the walk read-back"

req GET "$B/api/walk/wo-0142" "$MABASO_JAR"
check "E" "200" "$STATUS" "GET /api/walk/wo-0142"
check "E" "none" "$(header_value X-CAP-Redaction)" "X-CAP-Redaction: none"
check "E" "yes" "$(yes_no $(body_has '"ran":false'; echo $?))" "redaction.ran:false is present in the body"
check "E" "accepted" "$(proposal_state_in_body "$PROPOSAL_1_ID")" "rejections retained in the walk route: the accepted proposal reads back accepted"
check "E" "rejected" "$(proposal_state_in_body "$PROPOSAL_2_ID")" "rejections retained in the walk route: the rejected proposal reads back rejected, never dropped"

echo

# ================================================================
# F — sync idempotency
# ================================================================

SYNC_CLIENT_ID=$(new_uuid)
SYNC_PAYLOAD=$(capture_payload_json "m-aa101" "evidence")
SYNC_BODY=$(sync_envelope_json "$SYNC_CLIENT_ID" "wo-0142" "$SYNC_PAYLOAD")

req POST "$B/api/sync" "$MABASO_JAR" "$SYNC_BODY"
check "F" "200" "$STATUS" "sync idempotency: first post of a new client_id"
check "F" "1" "$(header_value X-CAP-Sync-Recorded)" "X-CAP-Sync-Recorded: 1 on the first post"

req POST "$B/api/sync" "$MABASO_JAR" "$SYNC_BODY"
check "F" "200" "$STATUS" "sync idempotency: identical replay of the same client_id"
check "F" "1" "$(header_value X-CAP-Sync-Duplicate)" "X-CAP-Sync-Duplicate: 1 on the identical replay"

CHANGED_PAYLOAD=$(printf '%s' "$SYNC_PAYLOAD" | sed -E "s/\"bytes\":$CAPTURE_BYTES/\"bytes\":$((CAPTURE_BYTES + 1))/")
CHANGED_BODY=$(sync_envelope_json "$SYNC_CLIENT_ID" "wo-0142" "$CHANGED_PAYLOAD")
req POST "$B/api/sync" "$MABASO_JAR" "$CHANGED_BODY"
check "F" "200" "$STATUS" "sync idempotency: same client_id, a changed field"
check "F" "1" "$(header_value X-CAP-Sync-Conflict)" "X-CAP-Sync-Conflict: 1 on the changed replay"
check "F" "yes" "$(yes_no $(body_has "already_recorded_differently"; echo $?))" "already_recorded_differently names the conflict"

echo

# ================================================================
# G — hours accrue server-side and a write to the hours route
# returns 405
# ================================================================

req POST "$B/api/orders/wo-0151/open" "$MABASO_JAR" "$(client_id_body_json "$(new_uuid)")"
check "G" "200" "$STATUS" "open wo-0151 for the hours check"

sleep 2

req GET "$B/api/hours" "$MABASO_JAR"
check "G" "200" "$STATUS" "GET /api/hours"
WO_0151_ELAPSED=$(elapsed_s_for_order "wo-0151")
check "G" "yes" "$(yes_no $([ -n "$WO_0151_ELAPSED" ] && [ "$WO_0151_ELAPSED" -ge 1 ]; echo $?))" "hours accrue server-side: wo-0151's elapsed_s is at least 1 (got ${WO_0151_ELAPSED:-<none>})"

req POST "$B/api/hours" "$MABASO_JAR" ""
check "G" "405" "$STATUS" "a write to the hours route returns 405"
check "G" "no-store" "$(header_value Cache-Control)" "the hand-written 405 still carries Cache-Control: no-store"
check "G" "yes" "$(yes_no $([ -n "$(header_value X-CAP-Store)" ]; echo $?))" "the hand-written 405 still carries X-CAP-Store"
check "G" "yes" "$(yes_no $([ -n "$(header_value X-CAP-Instance)" ]; echo $?))" "the hand-written 405 still carries X-CAP-Instance — the whole reason this route is hand-written"

echo

# ================================================================
# H — X-CAP-Instance constant across calls
# ================================================================

req GET "$B/api/health" ""
FIRST_INSTANCE=$(header_value X-CAP-Instance)
check "H" "200" "$STATUS" "GET /api/health, call 1 of 3"

req GET "$B/api/health" ""
SECOND_INSTANCE=$(header_value X-CAP-Instance)
check "H" "$FIRST_INSTANCE" "$SECOND_INSTANCE" "X-CAP-Instance constant across calls (call 2 of 3)"

req GET "$B/api/health" ""
THIRD_INSTANCE=$(header_value X-CAP-Instance)
check "H" "$FIRST_INSTANCE" "$THIRD_INSTANCE" "X-CAP-Instance constant across calls (call 3 of 3)"

echo "H — this instance's id is: ${FIRST_INSTANCE:-<none>}"
echo "H — a platform cold start cannot be forced from a shell. Re-run this"
echo "    script after redeploying the same URL and compare the printed id"
echo "    by eye: a genuine cold start changes it; nothing else here does."

echo
echo "----------------------------------------------------------------"
printf '%d passed, %d failed\n' "$PASS_COUNT" "$FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
