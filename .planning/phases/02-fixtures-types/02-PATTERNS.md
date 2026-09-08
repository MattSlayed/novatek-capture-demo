# Phase 2: Fixtures & types - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 17
**Analogs found:** 17 / 17 (quality varies — see table; 3 files have no true analog anywhere and are called out in `## No Analog Found`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/data/types.ts` | model | transform | `../ipv-demo/lib/data/types.ts` (copy source) + `lib/copy/governed.ts` (closed-set shape) | exact for the 14 copied names; role-match for the seed's new types |
| `lib/data/plant.ts` | model | CRUD | `../ipv-demo/lib/data/plant.ts` | exact — direct copy source, trimmed by whole-record deletion |
| `lib/data/artisans.ts` | model | CRUD | `../ipv-demo/lib/data/plant.ts` (`PEOPLE` / array-of-typed-records shape) | structural — content is seed-authored, not copied |
| `lib/data/orders.ts` | model | CRUD | `../ipv-demo/lib/data/plant.ts` (`MACHINERY` array-of-typed-records shape) | structural — content is seed-authored, not copied |
| `lib/data/observations.ts` | model | CRUD | `../ipv-demo/lib/data/plant.ts` (`CitedFact`/`evidence` inline-object shape) | structural — the citation-comment convention itself has no analog anywhere (see `## No Analog Found`) |
| `lib/data/fixtures.ts` | config | transform | `scripts/check-tokens.mjs` (pinned-hash header convention) + `../ipv-demo/lib/data/plant.ts` (`SCENE_VERSION`) | role-match |
| `lib/data/register.ts` | service | CRUD | `../ipv-demo/lib/data/plant.ts` (`MACHINERY_BY_ID` Map-building) | partial — first `server-only`-marked module in this repo, no in-repo precedent for the marker itself |
| `scripts/check-observations.mjs` | utility | batch | `scripts/check-governed.mjs` (source text-extraction + sweep) | role-match |
| `scripts/check-observations.test.mjs` | test | batch | `scripts/check-tokens.test.mjs` / `scripts/check-structure.test.mjs` | exact — test shape |
| `scripts/check-fixture-hash.mjs` | utility | file-I/O | `scripts/check-tokens.mjs` | exact — same mechanism, different files |
| `scripts/check-fixture-hash.test.mjs` | test | file-I/O | `scripts/check-tokens.test.mjs` | exact — test shape |
| `scripts/check-register-isolation.mjs` | utility | batch | `scripts/check-structure.mjs` (`--build-output` two-invocation) + `scripts/check-governed.mjs` (`walk()`) | role-match |
| `scripts/check-register-isolation.test.mjs` | test | batch | `scripts/check-structure.test.mjs` | exact — test shape, including the two-invocation (`--build-output`) test pattern |
| `scripts/verify.mjs` (modified) | utility | batch | itself — the existing `STEPS` array | exact — self-analog, additive entries only |
| `.gitattributes` (modified) | config | file-I/O | itself — the existing `-text` entry | exact — self-analog, different directive (`text eol=lf`, not `-text`) |
| `package.json` (modified) | config | n/a (static manifest) | itself — the existing `dependencies` block | exact — self-analog |
| `docs/analysis/provenance-check.md` | doc | transform (draft → reviewed → signed) | `docs/analysis/deployment-gate.md` (voice) + `docs/analysis/vercel-regions.md` (per-row pipe-table shape) | role-match — no existing analysis doc combines both a real Markdown table and this doc's verdict-column workflow |

## Pattern Assignments

### `lib/data/types.ts` (model, transform)

**Analog:** `../ipv-demo/lib/data/types.ts` at `8fd097a` (copy source, read in full — 412 lines) + `lib/copy/governed.ts` (closed-set shape convention, this repo)

D-18 copies fourteen names verbatim: `RbacTier`/`RBAC_ORDER`/`RBAC_LABEL`, `ExtractionGrade`, `Provenance`, `SystemOfRecord`, `CitedFact`, `EvidenceChain`, `Zone`, `AssetClass`/`ASSET_CLASS_LABEL`, `Machinery`, `SetpointBlock`, `Deviation`, `RootCause5M`, `GoverningDoc`. The exact shape to copy for the closed-set-plus-label-map convention (`RbacTier`), verbatim from the source (`../ipv-demo/lib/data/types.ts` lines 18-31):

```typescript
/** RBAC tiers, mapping 1:1 to the roles in SEED-BRIEF.md. */
export type RbacTier = "field_technician" | "site_supervisor" | "management";

export const RBAC_ORDER: RbacTier[] = [
  "field_technician",
  "site_supervisor",
  "management",
];

export const RBAC_LABEL: Record<RbacTier, string> = {
  field_technician: "Field Technician",
  site_supervisor: "Site Supervisor",
  management: "Management",
};
```

**Do NOT copy** `Anchor` (lines 159-171), `CaptureSession` (lines 317-326), `DecisionRecord`/`DecisionState` (lines 332-356) or `SceneManifest`/`ManifestZoneEntry`/`ManifestModelEntry` (lines 365-412) — none of these fourteen names are in D-18's list, and the seed defines its own `Decision`/`Referral`/`SyncItem` shapes instead. Leaving any of these in `plant.ts`'s own `import type` line after trimming is Pitfall 1 (a hard `tsc` `TS2305`, not a lint nit).

**Closed-set convention already established in this repo** — the pattern every new closed set in `types.ts` (observation kind, grade, proposal states, etc., per D-19) should follow, from `lib/copy/governed.ts` lines 26-42:

```typescript
export type GovernedKey =
  | "preview"
  | "authoredVerification"
  | "authoredProposals"
  | "noRedaction"
  | "memoryStore"
  | "noOfflineInference"
  | "pendingReconciliation"
  | "mediaOnDevice";

export type GovernedSentence = {
  before: string;
  strong: string;
  after: string;
};

export const GOVERNED: Record<GovernedKey, GovernedSentence> = {
```

D-19 requires `types.ts` to **import** `GovernedKey` from `lib/copy/governed.ts`, never redeclare it — `governed.ts` has zero imports of its own, so this introduces no circular-dependency risk.

**Enum caution (carries forward to every closed set in this file):** Node 24's strip-only TypeScript loading (used by every new `.mjs` check/test) rejects a TS `enum` outright (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). The sibling's `types.ts` never uses one — string-literal unions and `as const` objects only. `types.ts` must follow the same discipline or the fixture suite's native-TS-loading tests break.

---

### `lib/data/plant.ts` (model, CRUD)

**Analog / copy source:** `../ipv-demo/lib/data/plant.ts` at `8fd097a` (read in full — 897 lines)

The import line that must be trimmed in the same pass as the `ANCHORS`/`CAPTURE_SESSIONS` block (Pitfall 1), verbatim (lines 14-23):

```typescript
import type {
  Anchor,
  CaptureSession,
  CitedFact,
  Deviation,
  GoverningDoc,
  Machinery,
  Provenance,
  Zone,
} from "./types";
```

`Anchor` and `CaptureSession` must be dropped from this line — they are not among D-18's fourteen copied names.

**The `DOC` constant** (line 29): `const DOC = "RPL";` — required verbatim, used in every `governing_docs` template literal.

**`prov()` helper**, required verbatim (lines 37-55):

```typescript
let provSeq = 0;

function prov(
  source_label: string,
  source_uri: string,
  system_of_record: Provenance["system_of_record"],
  opts: Partial<Provenance> = {},
): Provenance {
  provSeq += 1;
  return {
    source_uri,
    source_label,
    system_of_record,
    source_version: opts.source_version ?? "rev 3",
    extracted_at: opts.extracted_at ?? "2026-07-24T06:12:41+02:00",
    extractor_hash:
      opts.extractor_hash ?? `sha256:9f2c${(provSeq * 7919).toString(16).padStart(8, "0")}`,
    confidence: opts.confidence ?? 0.98,
    grade: opts.grade ?? "EXTRACTED",
  };
}
```

**`erpFact()` helper**, required verbatim (lines 307-324):

```typescript
function erpFact(
  id: string,
  label: string,
  value: string,
  opts: Partial<CitedFact> & { version?: string } = {},
): CitedFact {
  const { version, ...rest } = opts;
  return {
    id,
    label,
    value,
    provenance: prov("Maintenance management system", `erp://asset/${id}`, "ERP", {
      source_version: version ?? "read 2026-07-26",
      confidence: 0.99,
    }),
    ...rest,
  };
}
```

**One machinery record with its `facts`** — `m-ap003` (in the required 11-record subset; carries a deviation reference AND a fully inline `CitedFact` with an `evidence` chain, so it is the single richest template for the other ten records), verbatim (lines 388-430):

```typescript
  {
    id: "m-ap003",
    tag: "20LAC10AP003",
    description: "Transfer set C — standby",
    asset_class: "centrifugal_pump",
    make: "Verwey",
    model: "HC 150-400",
    serial: "31884",
    zone_id: "z01",
    governing_docs: [`${DOC}-PR-S-1`, `${DOC}-WI-O-6`, `${DOC}-PR-I-1`],
    deviations: ["ncr-0118"],
    facts: [
      erpFact("f-ap003-status", "Service state", "Off duty — isolated", {
        liveRead: true,
        readAt: "14:32:07",
        tone: "crit",
      }),
      erpFact("f-ap003-last", "Last overhaul", "2024-08-22"),
      erpFact("f-ap003-next", "Next service due", "2025-08-22", { tone: "crit" }),
      erpFact("f-ap003-hours", "Running hours since overhaul", "11 630", { unit: "h", liveRead: true, readAt: "14:32:07" }),
      {
        id: "f-ap003-vib",
        label: "Last vibration reading",
        value: "9.4",
        unit: "mm/s RMS",
        tone: "crit",
        provenance: prov(
          "Routine walk-down record",
          "erp://condition/20LAC10AP003/2026-06-30",
          "ERP",
          { source_version: "2026-06-30", confidence: 0.94 },
        ),
        evidence: {
          measurement: "9.4 mm/s RMS, above alarm threshold",
          evidence: `${DOC}-PR-I-1-F1 Non-Conformance Report NCR-2026-0118`,
          retrieval: "NCR register, 2026 series",
          signatory: PEOPLE.millwright.name,
          competency: PEOPLE.millwright.competency,
          filed: "filed",
        },
      },
    ],
  },
```

**One deviation** — `ncr-0118` (the deviation `m-ap003` references; also the deviation D-10's own example comment cites), verbatim (lines 232-253):

```typescript
  {
    id: "ncr-0118",
    ncr_number: "NCR-2026-0118",
    raised_on: "2026-06-30",
    originator: PEOPLE.millwright.name,
    department: "Mechanical Maintenance",
    description:
      "Drive-end bearing housing vibration recorded above the alarm threshold on the routine walk-down. Set removed from duty and placed on standby pending strip and assess.",
    risk_rating: "High",
    root_cause: "Machine",
    immediate_action:
      "Set taken off duty. Duty transferred to the adjacent transfer set. Isolation applied and tagged.",
    corrective_action: null,
    status: "Open",
    blocks: "Return to duty service following overhaul",
    provenance: prov(
      `${DOC}-PR-I-1-F1 Non-Conformance Report`,
      "ncr://register/NCR-2026-0118",
      "NCR Register",
      { source_version: "rev 1", confidence: 1.0 },
    ),
  },
```

Note for whoever writes D-10's citation comment against this record: the full `immediate_action` string is *"Set taken off duty. Duty transferred to the adjacent transfer set. Isolation applied and tagged."* — CONTEXT.md's own D-10 example (`ncr-0118.immediate_action: "Isolation applied and tagged"`) quotes only the trailing clause. `check-observations.mjs`'s comment-drift comparison (D-11) must decide once, consistently, whether a quoted comment must equal the field's full value or may be a verbatim substring of it — the fixture proving the check fails on "an unresolvable id and a drifted quote" should exercise whichever rule is chosen.

**`PEOPLE` constant** — of the sibling's 7 keys, only `millwright`, `qc`, `test`, `ndt` are referenced by the 11-record subset (per RESEARCH.md's dependency map); `reliability`/`supervisor`/`planner` are referenced only by the excluded `ANCHORS`/`CAPTURE_SESSIONS` block. Verbatim, for whichever keys are kept (lines 137-145):

```typescript
export const PEOPLE = {
  reliability: { name: "T. Mokoena", competency: "Reliability Engineer, ECSA" },
  millwright: { name: "S. Mabaso", competency: "Millwright, Red Seal" },
  ndt: { name: "N. Dlamini", competency: "NDT Level II (MPI, PT)" },
  test: { name: "R. Pretorius", competency: "Test Technician, SANAS-traceable" },
  qc: { name: "L. Khumalo", competency: "QC Inspector" },
  supervisor: { name: "P. Nkosi", competency: "Site Supervisor" },
  planner: { name: "A. Jacobs", competency: "Production Planner" },
} as const;
```

**Trim in the same pass** (Pitfall 1's exact instruction): the `Anchor, CaptureSession,` names from the import line above; `ANCHOR_POSITIONS` (lines 842-863); `ANCHORS` (865-874); `ANCHOR_BY_MACHINERY` (876); `anchorsInZone` (878-880); `CAPTURE_SESSIONS` (888-897). `machineryInZone` (lines 828-830) depends only on `MACHINERY`/`Machinery`, neither excluded, and can be kept as-is.

`SCENE_VERSION` (line 25: `export const SCENE_VERSION = "ref-plant/2026.07.3";`) stays verbatim — it is the copied plant's own version and the shape-model for `FIXTURE_VERSION`, not something this phase replaces.

---

### `lib/data/artisans.ts` (model, CRUD) and `lib/data/orders.ts` (model, CRUD)

**Analog:** `../ipv-demo/lib/data/plant.ts`'s array-of-typed-records shape (no direct copy source exists — these are seed-authored per `02-CONTEXT.md`'s Claude's Discretion on persona ids / order id shapes)

Follow the same literal-array-plus-`_BY_ID`-map convention `plant.ts` uses for `MACHINERY`/`MACHINERY_BY_ID` (lines 330, 825-826) and `DEVIATIONS`/`DEVIATION_BY_ID` (lines 231, 301):

```typescript
export const MACHINERY: Machinery[] = [ /* ... */ ];
export const MACHINERY_BY_ID = new Map(MACHINERY.map((m) => [m.id, m]));
export const MACHINERY_BY_TAG = new Map(MACHINERY.map((m) => [m.tag, m]));
```

Id shapes (D-CONV, confirmed against `plant.ts` and the seed's curl suite, per RESEARCH.md §Id Shapes): account `acc-<surname>` (e.g. `acc-mabaso`); work order internal id `wo-NNNN` with a separate display field `WO-2026-NNNN` (e.g. `wo-0142` / `WO-2026-0142`) — **do not conflate the two strings into one field.**

---

### `lib/data/observations.ts` (model, CRUD)

**Analog:** `../ipv-demo/lib/data/plant.ts`'s inline `CitedFact`-with-comment-adjacent-metadata shape (structural only — the citation-comment mechanism itself has no analog; see `## No Analog Found`)

The nearest existing convention for "a value plus a machine-checkable citation" is the inline `CitedFact` object inside `m-ap003.facts` above (lines 408-428), which pairs a `value` with a `provenance` object the code itself can inspect. D-11 asks for something adjacent but different: a **comment** beside each `AuthoredObservation` literal, parseable by regex, quoting a *sibling* record's field. `scripts/check-governed.mjs`'s source-text field extraction (see that script's Pattern Assignment below) is the closest existing technique for pulling a fixed-shape string out of TypeScript source without a full parser — reuse that regex-extraction style for the comment, not for the record side (the record side must be the real, evaluated object per RESEARCH.md's Alternatives Considered: "a regex parse of `observations.ts`'s comment is still needed, but the record side must be the real, evaluated object, not a second parallel regex parse that could itself drift").

`AuthoredObservation.grade` must be its own two-member type (`INFERRED | AMBIGUOUS`) — never the sibling's `ExtractionGrade` widened or reused. `EXTRACTED` must be unconstructible on this field (D-12).

---

### `lib/data/fixtures.ts` (config, transform)

**Analog:** `scripts/check-tokens.mjs`'s pinned-value header-comment convention (this repo) + `../ipv-demo/lib/data/plant.ts`'s `SCENE_VERSION` (shape model for the version string itself)

The header-comment convention to follow when documenting the pin (from `scripts/check-tokens.mjs` lines 1-18, which documents "Parent / Parent commit / Pinned bytes / Pinned SHA-256" right above the constants it checks):

```javascript
/* ================================================================
   TOKEN CHECK

   Validates the two-layer token system D-12/D-13 requires:

   1. app/styles/tokens.inherited.css is byte-identical to the parent
      it was copied from. No inherited token is ever deleted or
      edited (D-12) — this check is the only thing standing between
      that promise and a drive-by edit.

        Parent:        ../ipv-demo/app/styles/tokens.css
        Parent commit: 8fd097a (2026-09-01)
        Pinned bytes:  4956
        Pinned SHA-256: 11a78756df7d9995034c5eb90c8e5313e3baad13e062d46cf4fccd8dac556eb9
```

`fixtures.ts` itself just exports the two constants (`FIXTURE_VERSION`, the pinned hash) — the recompute-and-compare logic belongs in `check-fixture-hash.mjs`, below. `FIXTURE_VERSION`'s shape model, verbatim (`plant.ts` line 25): `export const SCENE_VERSION = "ref-plant/2026.07.3";` — D-13 wants `capture-fixtures/YYYY.MM.N` in the same style.

`types.ts`, `register.ts` and `fixtures.ts` itself are outside the D-14 hash's four inputs (`plant.ts`, `artisans.ts`, `orders.ts`, `observations.ts` only).

---

### `lib/data/register.ts` (service, CRUD)

**Analog:** `../ipv-demo/lib/data/plant.ts`'s `Map`-building convention (structural) — **no in-repo analog for the `server-only` marker itself**, since this is the first module in this project to need one. See `## No Analog Found`.

The tag→asset resolution table should follow the same derived-`Map`-from-array convention already used twice in `plant.ts` (lines 130, 825-826, 301):

```typescript
export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));
export const MACHINERY_BY_ID = new Map(MACHINERY.map((m) => [m.id, m]));
export const MACHINERY_BY_TAG = new Map(MACHINERY.map((m) => [m.tag, m]));
export const DEVIATION_BY_ID = new Map(DEVIATIONS.map((d) => [d.id, d]));
```

i.e. `register.ts` builds its tag→asset table the same way, over the full copied subset including `m-aa605`, and exposes nothing else (no zone, order, assignment or history — D-16).

The `server-only` marker itself (RESEARCH.md Pattern 1, empirically reproduced against this repo's actual Next 16.3.4/Turbopack build): a single line at the top of the file, `import "server-only";` — confirmed to poison the build transitively through an intermediate re-export file that carries no marker of its own. Confirmed via `node_modules/next/types/global.d.ts`'s own ambient declaration that installing the npm package is not required for either `tsc` or `next build` to enforce this, though RESEARCH.md recommends installing it anyway (see `package.json` below).

---

### `scripts/check-observations.mjs` (utility, batch) + `scripts/check-observations.test.mjs` (test, batch)

**Analog:** `scripts/check-governed.mjs` (source text-extraction + directory sweep, this repo, read in full — 412 lines) for the extraction technique; RESEARCH.md's own worked Code Example for the resolver logic (no in-repo script currently imports `.ts` fixture modules at runtime, since `lib/data/` doesn't exist yet)

`check-governed.mjs`'s directory-walk helper (reusable shape for any new sweep-style check; lines 52-70):

```javascript
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
```

`check-governed.mjs`'s field-extraction-from-TS-source-as-text technique (lines 150-154) — the model for pulling the `// cites <id>: "<quoted text>"` comment's two captured groups out of `observations.ts` without a full parser:

```javascript
function extractField(block, field) {
  const re = new RegExp(`${field}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*[,}]`);
  const m = re.exec(block);
  return m ? m[1] : null;
}
```

The resolver half (comparing against the *live, evaluated* record — never a second regex parse of `plant.ts`), verbatim from RESEARCH.md's Code Examples §"The D-11 resolver/comment-drift test pattern":

```javascript
import test from "node:test";
import assert from "node:assert/strict";
// .ts extension required — this is a .mjs file, the entry point of the chain.
import { OBSERVATIONS } from "../lib/data/observations.ts";
import { MACHINERY_BY_ID, DEVIATION_BY_ID } from "../lib/data/plant.ts";

function resolveCitedRecord(drawnFrom) {
  // D-09's id space: a CitedFact id (f-...) lives inside a Machinery's
  // facts[]; a Deviation id (ncr-...) is DEVIATION_BY_ID directly.
  if (drawnFrom.startsWith("ncr-")) return DEVIATION_BY_ID.get(drawnFrom);
  for (const machine of MACHINERY_BY_ID.values()) {
    const fact = machine.facts.find((f) => f.id === drawnFrom);
    if (fact) return fact;
  }
  return undefined;
}
```

Node 24 requires the `.ts` extension only at this `.mjs` entry point — `observations.ts`'s own (extension-free) internal imports resolve unchanged (RESEARCH.md Pattern 2, empirically confirmed against this exact Node install).

**Test file (`check-observations.test.mjs`):** follow `scripts/check-tokens.test.mjs`'s shape exactly (see next section) — one `"the real repository exits 0"` test, then one test per D-11-named failure mode ("missing comment," "unresolvable id," "drifted quote"), each via `withFixture`/`runCheck`.

---

### `scripts/check-fixture-hash.mjs` (utility, file-I/O) + `scripts/check-fixture-hash.test.mjs` (test, file-I/O)

**Analog:** `scripts/check-tokens.mjs` (this repo, read in full — the exact pinned-hash mechanism D-14 reuses) + RESEARCH.md's CRLF-normalisation extension (Pitfall 2)

The pinned-hash comparison pattern to extend, verbatim (`scripts/check-tokens.mjs` lines 37-38, 51-69):

```javascript
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
```
```javascript
let inheritedBuf = null;
try {
  inheritedBuf = await readFile(INHERITED_PATH);
} catch (e) {
  problems.push(`could not read ${INHERITED_PATH}: ${e.message}`);
}

if (inheritedBuf) {
  if (inheritedBuf.length !== PINNED_BYTES) {
    problems.push(
      `${INHERITED_PATH} is ${inheritedBuf.length} bytes — expected ${PINNED_BYTES} (D-12)`,
    );
  }
  const digest = createHash("sha256").update(inheritedBuf).digest("hex");
  if (digest !== PINNED_SHA256) {
    problems.push(
      `${INHERITED_PATH} SHA-256 is ${digest} — expected ${PINNED_SHA256} (D-12); the inherited layer must never be edited`,
    );
  }
}
```

**Load-bearing difference from `check-tokens.mjs`:** that check's file is pinned once, forever (`.gitattributes`' `-text`, "preserve whatever was pinned, byte for byte"). D-14's four fixture files are actively edited and re-pinned repeatedly, so the hash must be computed over a CRLF-normalised buffer, never raw `fs.readFile` bytes, or the check passes/fails inconsistently between this Windows workstation (`core.autocrlf=true`) and GitHub Actions/Vercel (both LF). RESEARCH.md's extension of the pattern, verbatim:

```javascript
async function normalisedHash(paths) {
  const hash = createHash("sha256");
  for (const p of paths) {
    const buf = await readFile(p);
    // Load-bearing: normalise CRLF -> LF before hashing so the digest is
    // identical on a Windows dev machine (core.autocrlf=true), GitHub
    // Actions and Vercel (both LF), regardless of what's on disk.
    hash.update(buf.toString("utf8").replace(/\r\n/g, "\n"));
  }
  return hash.digest("hex");
}
```

**Report/exit convention**, identical in every existing check script including this one's analog (`check-tokens.mjs` lines 251-268 — reuse this exact shape, only the two `console.log` sentences at the end change):

```javascript
console.log("TOKEN CHECK");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);

if (problems.length) {
  console.log("\nDEFECTS — the token layers do not meet their contract:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}
```

**Test file (`check-fixture-hash.test.mjs`):** `scripts/check-tokens.test.mjs` (read in full — 210 lines) is the exact shape to copy: a `"the real repository exits 0"` test first, then one `withFixture`/`runCheck` test per violation, e.g. (lines 36-48):

```javascript
test("a one-character change in the inherited layer exits non-zero", async () => {
  const real = await realInherited();
  const mutated = Buffer.from(real);
  const midpoint = Math.floor(mutated.length / 2);
  mutated[midpoint] = mutated[midpoint] ^ 0xff;
  await withFixture(
    { "app/styles/tokens.inherited.css": mutated },
    async (dir) => {
      const { code } = await runCheck("scripts/check-tokens.mjs", { cwd: dir });
      assert.notEqual(code, 0);
    },
  );
});
```

---

### `scripts/check-register-isolation.mjs` (utility, batch) + `scripts/check-register-isolation.test.mjs` (test, batch)

**Analog:** `scripts/check-structure.mjs`'s `--build-output`-gated two-invocation shape (this repo, read in full) for the (a)/(b) split; `scripts/check-governed.mjs`'s `walk()` (above) for the source-side import-graph traversal

D-17 needs two independent halves, mirroring exactly how `check-structure.mjs` already runs twice (once source-only, once `--build-output`-gated after `next build`). The `--build-output` flag-parsing convention to copy verbatim (`scripts/check-structure.mjs` lines 137-149):

```javascript
const buildOutputFlagIndex = process.argv.indexOf("--build-output");
const buildOutputPath =
  buildOutputFlagIndex !== -1 ? process.argv[buildOutputFlagIndex + 1] : null;

if (buildOutputPath) {
  let logText = null;
  try {
    logText = await readFile(buildOutputPath, "utf8");
  } catch (e) {
    problems.push(
      `could not read build output log ${buildOutputPath}: ${e.message}`,
    );
  }
```

For halve (b) (the post-build sentinel scan), the equivalent gated block should scan `.next/static/**` only — confirmed directly against this repo's own build output that client JS/CSS chunks land under `.next/static/chunks/*.{js,css}` and server code lands under `.next/server/{app,chunks,pages}/`; the check must never assert on `.next/server/**`.

For half (a) (the source import-graph walk), RESEARCH.md's own scaffold (Code Examples §"Register isolation — source-side import-graph walk"):

```javascript
// Walks components/ and lib/client/ (the latter may not exist yet — that's fine,
// readdir on a missing dir should be treated as "nothing to check", not an error).
const FORBIDDEN = ["lib/data/register", "lib/access/register"];
// resolve relative specifiers AND the tsconfig "@/*" alias; walk transitively
// by following each resolved file's own imports until every reachable file
// under components/ + lib/client/'s graph has been visited once.
```

Confirmed directly in this repo's `tsconfig.json` (`compilerOptions.paths`): `"@/*": ["./*"]` — the walk must resolve this alias, not just relative specifiers. `lib/client/` does not exist yet (confirmed); `components/limits/` and `components/shell/` do — `readdir` on a missing `lib/client/` must be treated as "nothing to check," matching the scaffold's own comment.

**Test file (`check-register-isolation.test.mjs`):** `scripts/check-structure.test.mjs` (read in full — 238 lines) is the shape to copy for the two-invocation pattern specifically, e.g. its dynamic-vs-static `--build-output` pair (lines 132-198 show both a failing and a passing fixture against the same flag) — mirror this for "sentinel present in `.next/static/**`" (fails) vs. "sentinel absent" (passes).

---

### `scripts/verify.mjs` (modified) (utility, batch)

**Analog:** itself — the existing `STEPS` array (this repo, read in full — 276 lines)

New entries are additive only, following the exact object shape already used for every `node scripts/*.mjs`-style step (no `shell: true`, since only the `npx`-resolved binaries need a shell on this Windows workstation) — e.g. the existing `check-tokens` and `check-structure-build-output` entries (lines 74, 100-104):

```javascript
{ id: "check-tokens", command: process.execPath, args: ["scripts/check-tokens.mjs"] },
```
```javascript
{
  id: "check-structure-build-output",
  command: process.execPath,
  args: ["scripts/check-structure.mjs", "--build-output", BUILD_LOG_PATH],
},
```

Per RESEARCH.md's System Architecture Diagram: the resolver test (`check-observations`) and the hash-pin test (`check-fixture-hash`) ride the existing `fixture-suite` step (`{ id: "fixture-suite", command: process.execPath, args: ["--test", "scripts/**/*.test.mjs"] }`, line 86) with **no new STEPS entry needed** for either, since `node --test scripts/**/*.test.mjs` already discovers any new `*.test.mjs` file. Only the register-isolation check needs new entries: one new source-side step before `next-build` (alongside `check-structure`, line 89) and one new `--build-output`-gated step after `next-build` (alongside `check-structure-build-output`, lines 100-104). Neither new step should carry `vercelExcluded: true` — that marker is reserved for the two browser-dependent WCAG steps (D-17 must run everywhere, including on Vercel).

---

### `.gitattributes` (modified) (config, file-I/O)

**Analog:** itself — the existing entry (this repo, read in full)

```
# The inherited token layer is a byte-identical copy pinned by SHA-256
# in scripts/check-tokens.mjs (D-12). Git's core.autocrlf would
# silently rewrite its line endings to CRLF on a future checkout on
# this machine, breaking the pinned hash everywhere except the
# already-checked-out copy. Marking it -text disables all newline
# conversion so the bytes survive checkout unchanged.
app/styles/tokens.inherited.css -text
```

**Different directive needed, not a copy of this one:** per Pitfall 2, `-text` is correct only for a file "pinned once, never edited again." The four D-14 fixture files are actively developed and re-pinned repeatedly, so the new entries should use `text eol=lf` (normalise to LF on checkout, not "disable normalisation entirely") — paired with the load-bearing CRLF-normalisation inside `check-fixture-hash.mjs` itself, which is what actually makes the check untamperable by an editor's line-ending setting.

---

### `package.json` (modified) (config, static manifest)

**Analog:** itself — the existing `dependencies` block

```json
  "dependencies": {
    "next": "16.3.4",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
```

Add `"server-only": "0.0.1"` here (a real `dependencies` entry, not `devDependencies` — it is imported at runtime by shipped server code, `lib/data/register.ts`), per RESEARCH.md's Package Legitimacy Audit: single version ever published, 15M+/week downloads, maintained by React core team, no postinstall script, `[OK]` from `slopcheck`. Not a hard prerequisite for the isolation guarantee (Next enforces `server-only` internally either way — confirmed via `node_modules/next/types/global.d.ts`), but recommended for lint/tooling hygiene at zero risk.

---

### `docs/analysis/provenance-check.md` (doc, transform)

**Analog:** `docs/analysis/deployment-gate.md` (voice/structure, read in full — 173 lines) + `docs/analysis/vercel-regions.md` (per-row pipe-table shape, targeted read)

The dated-artefact opening convention, verbatim (`deployment-gate.md` lines 1-6; `vercel-regions.md` lines 1-6 use the identical pattern with a different D-number):

```markdown
# Deployment gate — Task 2: Deployment Check, red-job proof, D-22 falsification

Dated artefact, not prose. Records which D-22 path is live, the Deployment
Check registration evidence, the red-job demonstration and its honest scope,
the Install Command falsification's outcome, the two deviation fixes found
while producing this evidence, and the production-promotion facts.
```

```markdown
# Vercel regions and Task 1 settings confirmation

Dated artefact (D-25), not prose. Records the live Vercel region list as
re-read on the date below, the three dashboard-only settings the developer
confirmed for the linked project...
```

The closing convention, verbatim (`deployment-gate.md` lines 171-174; `vercel-regions.md` lines 201-204 — identical shape):

```markdown
---

Recorded 2026-09-08.
```

**Per-row table shape** — neither analysis doc contains a table shaped like D-03's, but `vercel-regions.md` establishes that this repo's analysis docs do use real Markdown pipe tables, not just prose (lines 13-14):

```markdown
| Region code | AWS equivalent |
|---|---|
```

`provenance-check.md`'s own table columns are given verbatim by `02-CONTEXT.md` D-03, not derived from an analog: *observation id · asset id and tag · kind · wording as it will render · cited record id · the record's own sentence (the named field, quoted) · grade · relation confirmed · verdict · reviewer · date* — plus a second, short table for the two referral rows (`m-aa605` resolved, `20HAD10AA610` unresolved), each marked *"not subject — a referral takes no `drawn_from`."*

**Two-stage write, not one:** per D-02, the executor writes this file **twice**: first as a draft with the verdict column empty (before the `checkpoint:human-verify` task), then again with every verdict and the reviewer's name/date filled in (after). Neither `deployment-gate.md` nor `vercel-regions.md` models this two-stage draft→signed lifecycle — it comes from `01-09-PLAN.md`'s `checkpoint:human-verify` task shape (cited in `02-CONTEXT.md`'s canonical refs, not re-read here per the reading-discipline instruction).

## Shared Patterns

### The `problems[]` + fail/pass report convention
**Source:** every existing check script (`scripts/check-tokens.mjs`, `scripts/check-structure.mjs`, `scripts/check-governed.mjs`)
**Apply to:** `check-observations.mjs`, `check-fixture-hash.mjs`, `check-register-isolation.mjs`

```javascript
const problems = [];
// ... push a message string onto `problems` for every defect found ...
console.log("<CHECK NAME>");
console.log("=".repeat(72));
console.log(`Problems: ${problems.length}`);
if (problems.length) {
  console.log("\nDEFECTS — <what does not meet its contract>:");
  for (const p of problems) console.log(`  !  ${p}`);
  process.exit(1);
}
console.log("\n<one or two sentences confirming what held>");
```
Never warn, never skip, never exit 0 with problems non-empty (Phase 1 D-20).

### The fixture-test helper (`withFixture`/`runCheck`)
**Source:** `scripts/lib/fixtures.mjs` (read in full — 108 lines)
**Apply to:** all three new `*.test.mjs` files

```javascript
export async function withFixture(files, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "capture-fixture-"));
  try {
    for (const [relPath, contents] of Object.entries(files)) {
      const target = path.join(dir, relPath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents, "utf8");
    }
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
```
`runCheck(scriptRelPath, opts)` spawns the check script directly (no shell) against a fixture directory and resolves `{ code, stdout, stderr }` — every new check test asserts `code` from this helper, never parses stdout to infer pass/fail except where an existing test already does so for a specific message (see `check-tokens.test.mjs`'s `assert.match(stdout, /is not an array/)`).

### Node native TypeScript loading — `.ts` extension only at the `.mjs` entry point
**Source:** RESEARCH.md §Architecture Patterns Pattern 2 (empirically verified against this repo's Node v24.19.0)
**Apply to:** `check-observations.mjs`/`.test.mjs`, `check-fixture-hash.mjs`/`.test.mjs` — anywhere a `.mjs` script imports `lib/data/*.ts` directly

```javascript
import { OBSERVATIONS } from "../lib/data/observations.ts";
import { MACHINERY_BY_ID } from "../lib/data/plant.ts";
```
The `.ts` suffix is required only here; `observations.ts`'s own internal imports (e.g. `import type { ... } from "./types"`) stay extension-free, unchanged from the sibling's style. No tsconfig change needed — `.mjs` files are outside `tsc`'s `include` array entirely.

### Closed set = string-literal union + `Record<Key, Shape>`, never a TS `enum`
**Source:** `lib/copy/governed.ts` (`GovernedKey`/`GOVERNED`) and `../ipv-demo/lib/data/types.ts` (`RbacTier`/`RBAC_LABEL`)
**Apply to:** every closed set `types.ts` defines under D-19 (observation kind, grade, proposal states, conflict/reject codes, referral resolution states, queue item kinds)

A TS `enum` breaks Node's strip-only loading used by every new fixture test (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`) — confirmed directly against this Node install. Every existing closed set in this codebase already avoids it; `types.ts` must too.

## No Analog Found

Files/patterns with no close match anywhere in this repository or the sibling (planner should use RESEARCH.md/CONTEXT.md directly for these):

| File / Pattern | Role | Data Flow | Reason |
|---|---|---|---|
| `import "server-only";` marker in `lib/data/register.ts` | service | CRUD | First server-only-marked module in this project — no in-repo precedent. RESEARCH.md Pattern 1 (empirically reproduced against this repo's own `next build`) and `node_modules/next/types/global.d.ts`'s ambient declaration are the only sources. |
| The `// cites <id>: "<quoted text>"` citation comment on each `AuthoredObservation` | model (comment convention) | n/a | Neither this repo nor the sibling has a precedent for a machine-checked comment quoting a sibling record's field. The exact syntax is Claude's Discretion per D-11; RESEARCH.md's Open Questions §1 recommends adopting `02-CONTEXT.md`'s own example verbatim (`// cites f-gs001-iso: "Isolations applied: 1 — transfer set C"` for a fact; `// cites <id>.<field>: "<value>"` for a deviation) since it was already shown to the user once. |
| `lib/data/artisans.ts` / `lib/data/orders.ts` exact record content | model | CRUD | Seed-authored, not copied from anywhere — only the *array-of-typed-records* shape is structurally borrowed from `plant.ts`. Content (persona ids, order numbers) comes from `02-CONTEXT.md`'s specifics and D-CONV's id-shape rules. |

## Metadata

**Analog search scope:** `lib/`, `lib/copy/`, `scripts/`, `scripts/lib/`, `docs/analysis/`, `.gitattributes`, `package.json`, `tsconfig.json` (this repository); `lib/data/types.ts` and `lib/data/plant.ts` at commit `8fd097a` (`../ipv-demo` sibling, per `02-CONTEXT.md`'s explicit exclusion of the sibling's other data files)
**Files scanned:** 15 (this repo: `lib/copy/governed.ts`, `scripts/check-tokens.mjs` + `.test.mjs`, `scripts/check-structure.mjs` + `.test.mjs`, `scripts/check-governed.mjs`, `scripts/lib/fixtures.mjs`, `scripts/verify.mjs`, `.gitattributes`, `package.json`, `tsconfig.json`, `docs/analysis/deployment-gate.md`, `docs/analysis/vercel-regions.md` (targeted); sibling: `lib/data/types.ts`, `lib/data/plant.ts`)
**Pattern extraction date:** 2026-09-08
