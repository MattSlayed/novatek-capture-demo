# Capture demo — a phone-first preview of the "Capture" surface, in a new repo

## Context

The NOVATEK site (novatekllc.co.za, "01 / What we build → NOVACORE") describes two product surfaces. **Walk** is tagged *"Demonstrable · synthetic plant, real enforcement"* and links to the existing `ipv-demo` at `ipv-demo-psi.vercel.app`. **Capture** is tagged *"Designed · funded by this round"* and has no demo behind it. This project gives Capture the same treatment Walk has: a hosted, interactive preview a funder or reviewer can open on their phone, built so that everything it claims to do is real where it says it is real, and labelled where it is not.

The Capture card's copy is the specification:

> Where the record is fed. An artisan, electrician or fitter opens the work order already assigned to them, selects the asset within it, and captures photographs and a spoken note as the work happens rather than writing it up afterwards. The camera verifies the unit against its own record before anything binds to it, and surfaces what it observes, such as visible corrosion, a weeping gland or a damaged guard, as proposals for a person to accept or reject. Never as findings. Hours accrue against the order automatically, because the account already knows whose they are.
> — Identity comes from the work order · Observes and proposes, never concludes · Works with no signal, reconciles on reconnect

The new repo is a **sibling of `ipv-demo`**: same stack (Next.js 16.2.12 · React 19.2.4 · TypeScript · plain CSS with one tokens file + CSS Modules), same brand tokens, same synthetic plant vocabulary (Pump Hall, Valve Station, KKS-style tags like `20HAD10AA601`), same claims discipline and the same "the demo is the TRL-evidence artefact, not a marketing asset" posture. It is phone-first, which `ipv-demo` is not (its narrowest breakpoint is 820px), so it inherits the tokens but needs its own layout system.

### Decisions taken with the user (do not relitigate)

| Decision | Choice |
|---|---|
| Unit verification | **Authored visual match.** The artisan photographs the asset; the app shows a staged "matched to record" result from fixtures, labelled *"authored for this preview — no model ran"*. No QR scan, no vision model. |
| Observations | **Authored proposals** from the synthetic asset record (a valve with a seal-weep history yields a "weeping gland" proposal), labelled *"authored — no model observed this photograph"*. The accept/reject gate and never-auto-binding are **real** (server-side, person-attributed, rejections retained). |
| Who accepts | **The artisan, on the phone, at the asset.** One persona at a time. A "what Walk receives" view shows the payload. |
| Repo & deploy | **GitHub public `MattSlayed/novatek-capture-demo` → Vercel.** Camera/microphone Permissions-Policy relaxed deliberately (ipv-demo's `vercel.json` denies both). |

### How the build is run — frameworks (user requirement)

The project is built through **BMAD** (`/bmad:master`) and **GSD**, with the latest versions of both installed before Phase 1 begins.

**State found on this machine (read-only check, 31 Aug 2026):**

| Framework | Installed | npm latest | Verdict |
|---|---|---|---|
| GSD (`get-shit-done-cc`) | `~/.claude/get-shit-done/VERSION` = **1.42.3** | **1.42.3** (`next` 1.43.0-rc2) | Current. Still run `/gsd-update` at Phase 0 — it is deterministic and its script owns the package name (its docs forbid ad-hoc `npm view`). |
| BMAD (`bmad-method`) | `/bmad:master` (`~/.claude/commands/bmad/master.md`) is a shim: *"BMad v6.7.1 replaced the legacy BMad Master agent with the `bmad-help` skill"*. Live set = `~/.claude/skills/bmad-*` dated 2026-05-19, unstamped (≥6.7.1). Legacy `~/bmad/_cfg/manifest.yaml` = **6.0.0-alpha.12** (Nov 2025). | **6.11.0** (bin `bmad` / `bmad-method`) | **Update required.** Two installs coexist; the alpha is residue. |

**Decisions taken with the user:** update BMAD to 6.11.0 *and* remove the legacy `~/bmad` folder; **BMAD produces the specs, GSD builds** (one hand-off via `/gsd-ingest-docs`).

**Division of labour** (paths verified against the installed skills: BMAD writes to `{planning_artifacts}`, which the installer's `--output-folder` sets; `bmad-create-architecture` produces **one** `architecture.md` and hard-gates on a discoverable PRD; GSD's ingest classifies by path heuristics unless a `--manifest` types each file)

```
BMAD (/bmad:master → bmad-help), planning_artifacts = docs/planning-artifacts/     GSD
────────────────────────────────────────────────────────────────────────────     ─────────────────────────────────────────
bmad-product-brief    → docs/planning-artifacts/briefs/brief-<name>-<date>/brief.md
bmad-prd              → docs/planning-artifacts/prds/prd-<name>-<date>/prd.md      /gsd-ingest-docs docs/ --mode new --manifest docs/ingest.yaml
bmad-create-ux-design → docs/planning-artifacts/ux-design-specification.md     ─►    manifest types: architecture.md=ADR · ux=SPEC · prd=PRD · brief=DOC
bmad-create-architecture → docs/planning-artifacts/architecture.md                   → .planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md
                                                                                    /gsd-plan-phase N → /gsd-execute-phase N → /gsd-verify-work
bmad-code-review / bmad-review-adversarial-general  ◄─ review gates on phases 3, 5, 6
bmad-editorial-review-prose ◄─ UX spec + architecture (bmad-prd and bmad-product-brief already run it at finalize); it reports, a person applies
```
(Paths as generated by the 6.11.0 installer with `--output-folder docs`: `_bmad/bmm/config.yaml` → `planning_artifacts: {project-root}/docs/planning-artifacts`, `implementation_artifacts: …/docs/implementation-artifacts`, `project_knowledge: …/docs`.)

This plan file is the seed for BMAD's brief and PRD; the "Implementation design" section below is the seed for `architecture.md` (one decision section per row of the *Design decisions* table, plus the offline semantics and the honesty register). The GSD `.planning/` roadmap phases should map 1:1 to the build phases listed under *Build order*. Every BMAD skill activates through `python3 _bmad/scripts/resolve_customization.py` — confirm `python3` runs it once after install (Windows Store stub risk).

### What is real vs. labelled in this preview

The governing rule from `ipv-demo/HANDOVER.md §1`: *the demo must be real where it claims to be real; a client-side fake of a server-side control is disproved with devtools in eight seconds.*

| Claim on the card | In the preview | Label |
|---|---|---|
| Opens the work order already assigned to them | **Real.** Server mints a signed session for the chosen artisan; `/api/orders` filters by that account server-side — the one seam. A foreign order id returns the same `404 not_found` as a nonexistent one, on every route including sync, so nothing reveals what exists. | — |
| Identity comes from the work order | **Real.** Nothing is typed: artisan, order, asset, hours, every capture is attributed from the session. | — |
| Captures photographs and a spoken note as the work happens | **Real.** Camera via `getUserMedia` (fallback `<input type=file capture>`), voice via `MediaRecorder`. Stored on-device in IndexedDB. | "No redaction pass runs in this preview." |
| Camera verifies the unit against its own record | **Authored.** Staged match from fixtures. | "Authored for this preview — no model ran." |
| Surfaces what it observes as proposals | **Authored** proposals; **real** accept/reject gate, person-attributed, never auto-binding. | "Authored — no model observed this photograph." |
| Never as findings | **Real.** No code path writes a finding. Rejections are kept, not deleted. | — |
| Hours accrue against the order automatically | **Real.** Server stamps open/close against the account; no hour-entry field exists anywhere. | — |
| Works with no signal | **Real.** Installable PWA, service worker precaches the shell, IndexedDB queue. | — |
| Reconciles on reconnect | **Real.** Idempotent batch sync; server re-validates each item; conflicts surfaced, never silently resolved. Server store is memory-only. | "Synced records live in memory on the demo server and are discarded on restart." |
| *Status* | — | Persistent, non-dismissible ribbon = `governed.preview`: "Designed preview. Capture is specified, not yet built. The plant, the people and every record here are synthetic." The gate's long form adds: "The work-order identity, the accept/reject gate and the offline queue are real and enforced server-side; the verification and the observations are authored." The site's "funded by this round" chip is **not** rendered in the app — see the "Funded" wording decision. |

Two IPV architecture rules that bind this build: **"proposals queue; there is no offline inference"** and the named anti-pattern **"auto-executing queued offline proposals"**. An accept made offline syncs as *accepted on device, pending reconciliation*; the server records it only after re-validating order assignment, asset membership and timestamp sanity.

Claims discipline inherited from `ipv-demo/HANDOVER.md §3` and enforced by a copied `scripts/claims-audit.mjs`: the word "simulation" is banned; no performance/turnaround/cost figure; never "reduce headcount"; never "records never cross the border"; the artisan framing is *a time-served artisan converting plant knowledge into a durable asset while remaining employed*.

---

## Phase 0 — framework prerequisites (before any project work)

All steps are outside the new repo except the BMAD project install. Each has a verification line; the phase is done only when all four pass.

1. **GSD**: run `/gsd-update`. Expect "already at latest 1.42.3" (or install if a release landed). Verify: `cat ~/.claude/get-shit-done/VERSION` equals the version `/gsd-update` reports as latest.
2. **Create the repo first** (BMAD's project-local install needs a project root):
   `cd "…/Business Brain" && gh repo create MattSlayed/novatek-capture-demo --public --clone -d "NOVATEK Capture — a phone-first designed preview of the Capture surface: work-order identity, authored proposals with a real accept/reject gate, offline queue with server-side reconciliation. Next.js 16 · Vercel."` — `--clone` lands in the *current* directory and `-d` is what sets the description (verified against `gh repo create --help`, gh 2.83.0).
3. **BMAD** — *done 31 Aug 2026, headless.* What the 6.11.0 release actually does (read from the cached package, `tools/installer/`): skills are installed **project-locally only** — `platform-codes.yaml` lists `target_dir: .claude/skills` and `global_target_dir: ~/.claude/skills`, but no installer code reads `global_target_dir`; the "choose global or project" prompt exists on GitHub `main`, not in 6.11.0. So there is no global refresh to choose, and the headless form is deterministic: `npx -y bmad-method@6.11.0 install --directory "<Windows path>" --yes --modules bmm,cis --tools claude-code --output-folder docs --user-name Matthew`. **Under Git Bash, pass `--directory "$(cygpath -w "$PWD")"`** — a POSIX `/c/Users/…` path is joined as `C:\c\Users\…` and the install lands in a phantom `C:\c` tree (that happened once; the tree was removed and the install re-run). Result: `_bmad/_config/manifest.yaml` `version: 6.11.0` (core 6.11.0, bmm 6.11.0, cis 0.3.2); 59 skills in `<repo>/.claude/skills`; `docs/` output folder; `_bmad/bmm/config.yaml` `planning_artifacts: {project-root}/docs/planning-artifacts`. Committed: `_bmad/` and `.claude/skills/` (project BMAD state); gitignored: `_bmad/**/*.user.*`, `config.user.yaml`. **Open point for the user:** the older global set `~/.claude/skills/bmad-*` (44 skills, 2026-05-19, from the 6.7.1 installer) still exists and now duplicates the project set by name while working in this repo. Recommendation: remove the global `bmad-*` set (`/bmad:master` routes to `bmad-help`, which the project set provides) — but that touches every other project on this machine, so it is the user's call, not taken here.
4. **Remove legacy BMAD**: `Remove-Item -Recurse -Force ~/bmad` — *after* step 3 succeeds and `/bmad:master` works. Verify: `Test-Path ~/bmad` is false; `~/.claude/commands/bmad/master.md` still resolves (it references the skill, not the folder); `grep -r "matth/bmad\|~/bmad" ~/.claude/commands ~/.claude/skills` returns nothing.
5. **Vercel project** — *done 31 Aug 2026 from the CLI:* project `novatek-capture-demo` (`prj_5Lq54q2Ck6UkqzzabQoMC9MreI1V`, team `matthew-ks-projects-ab449c33`), linked (`.vercel/` gitignored), **Git-connected** to `MattSlayed/novatek-capture-demo` via `vercel git connect`, `CAPTURE_SESSION_KEY` set as a sensitive variable on Production and Preview (same value kept in the gitignored `.env.local`), `cpt1` confirmed as Cape Town in Vercel's region list. Project framework preset is "Other" until `vercel.json` (`"framework": "nextjs"`) lands in build phase 1; Node.js version is 24.x (fine for Next 16). **Still dashboard-only for the user:** Settings → Deployment Protection → turn off Vercel Authentication (https://vercel.com/matthew-ks-projects-ab449c33/novatek-capture-demo/settings/deployment-protection). Original reasoning: create the project **Git-connected to the GitHub repo** (dashboard → Import, or `vercel git connect`) rather than CLI-only like ipv-demo — CLI deploys currently carry no git metadata (`VERCEL_GIT_COMMIT_SHA` absent; vercel/vercel#15577 open), and Git integration gives every push to a non-default branch a preview URL. Set `CAPTURE_SESSION_KEY` for **Production and Preview** now (the lazy-key check throws under `NODE_ENV=production`, which previews run). Deployment Protection: **disable Vercel Authentication** for this public demo project (default is on for all non-production deployments, which would put every preview behind a Vercel login on the phone) — or use Shareable Links + a Protection Bypass token for the harness. Note the first deployment of a new project is always production regardless of flags; the ribbon and governed copy land in build phase 1 so even a placeholder production deploy is honest.

## Phase 1 — BMAD specs · Phase 2 — GSD ingest

**Phase 1 (BMAD, in the new repo, `planning_artifacts` = `docs/planning-artifacts/`):** `/bmad:master` → `bmad-product-brief` (→ `docs/planning-artifacts/briefs/brief-*/brief.md`) → `bmad-prd` (→ `docs/planning-artifacts/prds/prd-*/prd.md`; must exist before the architecture skill, which refuses to run without a PRD) → `bmad-create-ux-design` (→ `docs/planning-artifacts/ux-design-specification.md`) → `bmad-create-architecture` (→ `docs/planning-artifacts/architecture.md`, one collaborative document). Seed every one from this file — the *Context* and *real-vs-labelled* table are the brief/PRD; the *Implementation design* below is `architecture.md`. Run `bmad-editorial-review-prose` over the UX spec and `architecture.md` (the brief and PRD already run it at finalize) and apply its suggestions — the skill only reports.

**Phase 2 (GSD):** write `docs/ingest.yaml` typing each file explicitly — `docs/planning-artifacts/architecture.md: ADR`, `docs/planning-artifacts/ux-design-specification.md: SPEC`, `docs/planning-artifacts/prds/**/prd.md: PRD`, `docs/planning-artifacts/briefs/**/brief.md: DOC`, `docs/CAPTURE-PLAN-SEED.md: DOC` — because the path heuristics (`*/adr/*`, `NNNN-*.md`, `*/specs/*`, `*/prd/*`) would otherwise classify BMAD's filenames as generic DOC and rank the architecture *below* the PRD. Then `/gsd-ingest-docs docs/ --mode new --manifest docs/ingest.yaml` → `.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md`. Roadmap phases must come out as the eight build phases in *Build order* below (rename/merge if the roadmapper splits differently). Check `.planning/INGEST-CONFLICTS.md` has no blockers. Then per phase: `/gsd-plan-phase N` → `/gsd-execute-phase N` → `/gsd-verify-work`, with `bmad-code-review` as the review gate on phases 3, 5, 6 (the seam, the write path, the offline queue).

---

## Implementation design

Facts from the Next 16.2.12 docs in `ipv-demo/node_modules/next/dist/docs` that shape this: **Turbopack is the default bundler** (a `webpack()` key makes `next build` fail without `--webpack`; Serwist needs webpack → hand-rolled `public/sw.js`); **request APIs are async-only** (`await cookies()`, `await context.params`, `RouteContext<'/api/…/[id]'>`); `middleware` is renamed `proxy`; `next lint` is removed; `app/manifest.ts` returns `MetadataRoute.Manifest` at `/manifest.webmanifest`; `Viewport` supports `viewportFit: "cover"`; `metadata.appleWebApp` emits the iOS tags.

### Design decisions (beyond the four locked with the user)

| Decision | Choice | Why |
|---|---|---|
| Routing | One route `/`; screens switched with `window.history.pushState` + `useSearchParams` (`?s=orders&o=wo-0142&a=m-ap003`) | App Router navigations fetch RSC payloads, which fail offline. pushState is router-integrated and request-free. Mirrors ipv-demo's one-route shape. |
| Write path | One server function `applyItem(account, item)` behind every online write route *and* `/api/sync` | Online and reconciled writes validate identically, or offline becomes a second, weaker seam. |
| Media on the wire | Photos: SHA-256 of the full blob + a ≤ 40 KB thumbnail. Voice: SHA-256 + duration only — **no audio bytes ever leave the phone.** Full-fidelity stays in IndexedDB. | No redaction runs; shipping unredacted full-res imagery of a real place to a self-discarding store is the worst of both worlds. Hash proves integrity; the thumbnail lets the reviewer see the payload. Voice is the most PII-dense capture. |
| Offline decisions | Allowed as *"decided on this phone — pending reconciliation"*; server validates on reconnect and records or surfaces a conflict. **Offline verification is not allowed**: a capture made without signal queues as a draft (`verification: pending`); proposals arrive after sync. | "No offline inference" respected literally. The person's decision is the person's; what is withheld is the *write*. |
| Governed sentences | `lib/copy/governed.ts`, one export each, imported wherever rendered | Eight sentences across nine screens: "one governed sentence, one place" needs one module. |
| SW versioning | Static `public/sw.js` registered as `/sw.js?v=<NEXT_PUBLIC_BUILD_ID>`; `next.config.ts` sets `env.NEXT_PUBLIC_BUILD_ID = VERCEL_GIT_COMMIT_SHA ?? VERCEL_DEPLOYMENT_ID ?? "dev"` (the `env` key is legacy-tagged but inlines at build, which is exactly what is wanted; `VERCEL_DEPLOYMENT_ID` exists on every deployment, git sha only on Git-integrated ones); cache named from `self.location.search` | No build templating under Turbopack; a changed URL is a new worker, so every deploy is an update. |
| Proposal identity | `Proposal.id = HMAC(session key, account_id · capture.client_id · observation_id)` — deterministic and unguessable | Any server instance can re-derive and validate a decision it never issued (Vercel memory is per instance), and ids are non-sequential so enumeration and state-vs-ownership oracles are closed (ipv-demo §4A #1). |
| Vercel project | Git-connected to the GitHub repo; previews from a `dev` branch, production from `main`; Vercel Authentication off | CLI-only deploys carry no git metadata and no previews; default deployment protection would wall previews behind a Vercel login on the phone. |
| QR | `uqr` (zero-dep, renders an SVG string) in a Server Component | No client bundle, no canvas. |
| IndexedDB | Hand-rolled ~90-line promisified wrapper, four stores (`orders`, `media`, `queue`, `kv`) | Repo ethos: no deps for small things. `idb` acceptable if preferred. |
| Coached checklist | Not on the phone in v1; the linear flow is the coaching. Reserve the `done(state)` pattern for the desktop frame's side panel in v2. | 360 px has no room for a checklist over a viewfinder. |
| Vercel region | `cpt1` (Cape Town), not ipv-demo's `cdg1` | Phone demo in SA; latency is visible on a phone. **Flag to user.** |
| Tier | Carried on artisan and order for Walk's benefit; **not enforced** — the work order is the one authorisation. The electrician persona carries `site_supervisor` because ipv-demo's Z-04 (Motor Control Centre) is restricted to that tier; the two demos must not contradict each other about the same zone | One access-control seam; one synthetic plant. |
| "Funded" wording | **The app does not render the site's status chip.** `governed.preview` ("Designed preview. Capture is specified, not yet built…") is the only status text. The claims audit adds `funded by this round` to ipv-demo's rule 1 alternation (ipv-demo retired "IPV is funded"; "funded by this round" is the differently-shaped form of the same claim) | The website keeps its own chip; the demo's claims register must not carry a phrase the audit would fail. **Flag to user: the site chip's wording itself sits against the register.** |

### Repo file tree

```
novatek-capture-demo/
  .env.example              CAPTURE_SESSION_KEY (required in prod), NEXT_PUBLIC_SITE_URL (QR override)
  .gitignore                ipv-demo's, plus /scripts/out/ and /scripts/.check/
  AGENTS.md / CLAUDE.md     "This is NOT the Next.js you know", verbatim from ipv-demo
  README.md · HANDOVER.md   ipv-demo voice; "Three things to know before editing"; claims register; offline semantics
  package.json              next 16.2.12 · react 19.2.4 · uqr · playwright (dev) · eslint 9 · typescript 5
  next.config.ts            env.NEXT_PUBLIC_BUILD_ID ← VERCEL_GIT_COMMIT_SHA; allowedDevOrigins for LAN dev
  tsconfig.json · eslint.config.mjs   ipv-demo's verbatim
  vercel.json               regions ["cpt1"]; Permissions-Policy camera=(self) microphone=(self); /sw.js no-cache
  docs/{prd,specs,adr}/     BMAD outputs (Phase 1) — ingested by GSD (Phase 2)
  _bmad/                    BMAD 6.11 project install (Phase 0)
  .planning/                GSD state (Phase 2)

  app/
    layout.tsx              fonts (Syne/DM Sans/JetBrains Mono via next/font), metadata.manifest + appleWebApp, viewport viewportFit cover
    page.tsx                THE APPLICATION — static Server Component: <PhoneFrame><Shell/></PhoneFrame>
    manifest.ts             MetadataRoute.Manifest → /manifest.webmanifest
    globals.css · styles/tokens.css · app.module.css   tokens copied verbatim; phone-first primitives (48px targets, safe-area)
    api/
      health/route.ts             GET/HEAD — online probe; store stats; X-CAP-Instance
      session/route.ts            POST mint (persona → signed cookie) · GET whoami · DELETE
      orders/route.ts             GET — orders assigned to the session account. THE SEAM
      orders/[id]/route.ts        GET — order + assets + clock + proposals/decisions (404 if not yours)
      orders/[id]/open/route.ts   POST — start the clock (idempotent)
      orders/[id]/close/route.ts  POST — stop the clock
      verify/route.ts             POST — authored match + authored proposals for one capture
      captures/route.ts           POST — evidence capture metadata (hash, thumb, duration)
      decisions/route.ts          POST — accept/reject one proposal, person-attributed by the server
      sync/route.ts               POST — batch of queued items, idempotent by client_id
      hours/route.ts              GET only — server-derived clocks; no manual entry route exists
      walk/[orderId]/route.ts     GET — "What Walk receives" payload

  components/
    brand/                  NOVATEK mark + wordmark, copied
    shell/                  Shell (state provider, screen switch, SW register, probe; publishes window.__cap) · Ribbon (non-dismissible, in flow) · Header (account from session, never typed; online badge; queue count) · OnlineBadge ("Work without signal" switch)
    gate/                   three persona doors + disclaimer; role=dialog, scroll lock (ipv-demo Hero pattern)
    orders/                 OrderList · OrderDetail (assets, open/close, docs, Walk link) · Clock
    asset/                  Verify (camera → photo → authored match → continue) · Camera (getUserMedia + <input capture> fallback) · VerifyResult
    capture/                CaptureScreen (no-redaction sentence above shutter) · PhotoGrid (state chips) · VoiceNote · useCamera · useRecorder
    proposals/              Proposals (authored header) · ProposalCard (grade chip, source record, accept/reject equal weight) · DecisionState
    sync/                   SyncScreen (queue, switch, Sync now, store statement, instance id, storage estimate) · QueueRow · ConflictCard (Discard / Re-decide; never auto-resolves)
    walk/                   WalkPayload (summary + JSON of GET /api/walk/[orderId])
    limits/                 Limits — all eight governed sentences on one screen
    frame/                  PhoneFrame (server comp; ≥900px renders 390×844 frame + QR side panel) · QrCode (uqr → SVG)
    pwa/                    Register (register /sw.js?v=…, update toast, iOS install hint, storage.persist())

  lib/
    data/types.ts           Provenance, CitedFact, ExtractionGrade, RbacTier, SystemOfRecord copied; Capture types (below)
    data/plant.ts           ZONES, PEOPLE, DOCS, DEVIATIONS + the MACHINERY subset used by orders — copied from ipv-demo
    data/artisans.ts        three personas → accounts, with assigned order ids
    data/orders.ts          work orders (TS literals + Map indexes)
    data/observations.ts    authored observations per asset, each citing the record it was drawn from
    copy/governed.ts        the eight governed sentences
    session/cookie.ts       mintSession / readSession — HMAC-SHA256, lazy key, refuse-in-prod without key (ipv-demo manifest.ts pattern)
    access/scope.ts         ordersFor(account) · orderOwned(account,id) · assetInOrder(order,id) — THE seam
    store/memory.ts         module-level Maps, TTL 6h sweep, caps, BOOT_ID — the store that says it is memory (ipv-demo store.ts pattern)
    reconcile/validate.ts   hand-rolled shape guards, size caps, timestamp sanity
    reconcile/apply.ts      applyItem(account,item) → SyncItemResult; idempotent by client_id
    walk/payload.ts         buildWalkPayload(account, order)
    http/respond.ts         ok()/fail(): Cache-Control no-store + X-CAP-Instance + X-CAP-Store on every response
    client/api.ts · db.ts · queue.ts · online.ts · media.ts · nav.ts · store.ts

  public/sw.js · public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon-180}.png
  scripts/
    claims-audit.mjs        ipv-demo's register + Capture rules
    check-headers.mjs       asserts vercel.json relaxes camera/mic and no-caches /sw.js
    check-sw.mjs            node --check sw.js; asserts the never-cache-/api/ guard is present
    lib/harness.mjs         Playwright phone harness (fake camera flags, 390×844, IDB/cookie reset, setOffline)
    capture-stills.mjs      ten phone stills + one desktop frame
    check-offline.mjs       load → offline → reload → capture → decide → reconnect → assert queue states
```

### Data model (`lib/data/types.ts`) — new types, in brief

Copied verbatim from ipv-demo: `RbacTier` family, `ExtractionGrade`, `Provenance`, `SystemOfRecord` (already has `"Capture Session"`), `CitedFact`, `EvidenceChain`, `Zone`, `AssetClass`, `Machinery`, `Deviation`, `GoverningDoc`.

- `Artisan { id, name, trade: "millwright"|"electrician"|"boilermaker", competency, employee_no, rbac_tier }` · `Session { sid, account_id, issued_at, expires_at }` — the cookie is stateless HMAC; `DELETE /api/session` clears the cookie only (a copied value replays until `Max-Age`), and HANDOVER's limits say so.
- `WorkOrder { id, number, title, description, assigned_to, zone_id, asset_ids[], governing_docs[], priority, raised_on, due_by, status: "assigned"|"in_progress"|"closed", provenance }` · `OrderAsset = Machinery & { observation_ids[] }` (server-only; stripped from responses)
- `AuthoredObservation { id, asset_id, kind: corrosion_visible|gland_weep|guard_damaged|seal_absent|leak_evidence|label_illegible|fixing_missing|discolouration, wording, grade: INFERRED|AMBIGUOUS (never EXTRACTED), drawn_from: Provenance, relation: "evidence"|"context" }` — `relation` says whether the cited record *supports* the observation (INFERRED) or merely *situates* it (AMBIGUOUS); the wording must be an honest inference from the record's actual content, never a restatement of a record that says something else · `ObservationProvenance = Omit<Provenance,"confidence"|"extractor_hash"> & { confidence: null; extractor: "authored" }`
- `Capture { id (client UUID), order_id, asset_id, kind: photo|voice, purpose: verify|evidence, captured_at, mime, bytes, sha256, duration_ms?, thumb? (≤64 KB cap), captured_by: string|null (server-stamped), recorded_at }`
- `VerificationResult { capture_id, asset_id, outcome: matched|pending, matched_tag, matched_serial, method: "authored", confidence: null, label (GOVERNED.authoredVerification), verified_at }`
- `Proposal { id, capture_id, asset_id, order_id, observation, provenance: ObservationProvenance, issued_at, state: open|accepted|rejected|superseded }`
- `Decision { id (client UUID), proposal_id, outcome: accept|reject, decided_at, decided_where_claimed: online|on_device, arrived_via: immediate|queued (server-derived: recorded_at − decided_at > 60 s or item.attempts > 0), decided_by: string|null (server-stamped; body value ignored), note?, recorded_at, device_offset_s (server-measured), reconciled: recorded|pending|conflict|rejected, conflict? }` — the Walk payload shows `arrived_via`, never the client's claim as fact (ipv-demo §4A #2: a forgeable audit field is no audit field)
- `OrderClock { order_id, account_id, segments: { opened_at, closed_at|null, source: server|device_reconciled }[], elapsed_s }` — reopen after close appends a segment (a parts run or a break is a real thing); `elapsed_s` is the server sum; device-claimed `opened_at` is bounded below by the session's `issued_at` and the device's last server contact
- `SyncItem<K> { client_id, kind: order_open|order_close|capture|decision, order_id, created_at, attempts, state: queued|sending|recorded|conflict|rejected|discarded, claimed_account_id (compared, never trusted), payload, last_result? }`
- `ConflictCode = order_not_found|order_closed|asset_not_in_order|account_mismatch|proposal_superseded|already_recorded_differently|clock_skew` (`order_not_found` covers unknown **and** not-owned, mirroring the GET path's uniform 404 — sync must not be an existence oracle) · `RejectCode = bad_shape|media_too_large|unknown_kind|unknown_proposal|store_evicted`
- `SyncItemResult { client_id, status: recorded|duplicate|conflict|rejected, code?, detail, server?: { verification?, proposals?, decision?, clock? } }`
- `WalkPayload { schema: "novatek.capture.walk/1", issued_at, store: { kind: "memory", instance, ttl_s, statement }, account, order & OrderClock, assets[]: { asset_id, tag, verification, captures[] (+ thumb_present, audio_left_device: false), candidate_facts[] (accepted, with provenance + accepted_by/at + server-derived arrived_via — never the client's decided_where claim), rejected[] (retained), open[] }, redaction: { ran: false, statement } }`

**Fixtures** (reusing ipv-demo's plant verbatim):

| Door | Account | Orders (zone) | Assets | Authored observations (grade ← drawn from) |
|---|---|---|---|---|
| Millwright | S. Mabaso · Millwright, Red Seal (ipv-demo `PEOPLE.millwright` — a millwright, so the door says Millwright, not Fitter) · tier `field_technician` | WO-2026-0142 Strip & assess transfer set C (Z-01) · WO-2026-0151 Duplex strainer element clean (Z-02) | `m-ap003`, `m-aa101`, `m-aa102` · `m-as001` | ap003: drive-end housing discolouration (INFERRED ← NCR-2026-0118 *vibration* record, relation evidence — an inference from bearing distress, not a restatement); coupling guard fixing missing (AMBIGUOUS ← f-ap003-status, context); isolation tag present (INFERRED ← ncr-0118 immediate_action "Isolation applied and tagged", evidence). as001: DP gauge face fogged (AMBIGUOUS ← the as001 DP fact, context) |
| Electrician | K. Naidoo · Electrician, Trade Tested (new) · tier **`site_supervisor`** (Z-04 is supervisor-restricted in ipv-demo) | WO-2026-0137 Protection test — set C feeder (Z-04) | `m-gs001`, `m-an001` | gs001: lock and tag present (INFERRED ← f-gs001-iso "Isolations applied: 1 — transfer set C", evidence); arc-flash label illegible (AMBIGUOUS ← gs001 record, context). an001: actuator cover screw missing (AMBIGUOUS ← an001 record, context) |
| Boilermaker | J. van Wyk · Boilermaker, Red Seal (new) · tier `field_technician` | WO-2026-0129 Relief valve re-cert support (Z-02) · WO-2026-0133 Surge vessel inspection prep (Z-03) | `m-aa601`, `m-aa602` · `m-bb001`, `m-ac001` | aa601: surface moisture below the bonnet (**AMBIGUOUS** ← f-aa601-seal / NCR-2026-0104, context only — that NCR records a *broken lead certification seal*, not gland packing; the first draft of this table mis-cited it); lead seal wire absent (INFERRED ← NCR-2026-0104, evidence); surface corrosion on spring housing (AMBIGUOUS ← aa601 record, context). ac001: residue at tube-side flange (**AMBIGUOUS** ← NCR-2026-0091, context only — that NCR is tube-side fouling, closed out). bb001: inspection stamp part-obscured (AMBIGUOUS ← bb001 inspection fact, context) |

Phase 2 gate, restated: every `drawn_from` resolves to a real record id in the copied `plant.ts`, **and** a person reads each cited record and confirms the wording is an inference the record actually supports (`relation: evidence`) or only situates (`relation: context`). The first-draft table failed the second half for three rows; the table above is corrected, and the fixture file must carry the cited record's own sentence in a comment beside each observation so the check is repeatable.

### API contracts

Every handler: `runtime="nodejs"`, `dynamic="force-dynamic"`, JSON via `lib/http/respond.ts` stamping `Cache-Control: no-store`, `X-CAP-Store: memory`, `X-CAP-Instance: <boot id>`. Errors `{ error: snake_case, detail: "A sentence." }`. Params awaited. Session read from the `cap_session` cookie; **nothing identity-bearing is read from a body.**

| Method · path | Body | Success | Errors | Headers |
|---|---|---|---|---|
| `POST /api/session` | `{ persona_id }` | 201 `{ account, session }` + `Set-Cookie cap_session; HttpOnly; SameSite=Lax; Max-Age=43200; Secure (prod)` | 400 · 404 `unknown_persona` | `X-CAP-Account` |
| `GET` / `DELETE /api/session` | — | 200 `{ account }` / 204 | 401 `no_session` | |
| `GET /api/orders` | — | 200 `{ orders, clocks }` **filtered by `assigned_to === session.account_id`** | 401 | `X-CAP-Orders: n` |
| `GET /api/orders/[id]` | — | 200 `{ order, assets (observation_ids stripped), clock, verifications, proposals, decisions }` | 401 · **404 `not_found`** for unknown *and* not-yours | `X-CAP-Order` |
| `POST /api/orders/[id]/open` · `/close` | `{ client_id }` | 200 `{ clock }` (open idempotent) | 401 · 404 · 409 `order_closed` / `not_open` | `X-CAP-Clock` |
| `POST /api/verify` | `Capture{purpose:"verify"}` | 201 `{ capture, verification, proposals }` — thumbnail content never read; match + proposals come from the asset record | 401 · 404 · 409 `asset_not_in_order` · 409 `order_closed` · 413 `media_too_large` · 422 `bad_shape` · 422 `clock_skew` | `X-CAP-Verification: authored`, `X-CAP-Proposals: n` |
| `POST /api/captures` | `Capture{purpose:"evidence"}` | 201 `{ capture }` (`captured_by` stamped) | as above | `X-CAP-Capture` |
| `POST /api/decisions` | `{ client_id, proposal_id, outcome, decided_at, note? }` — any `decided_by` **ignored** | 201 `{ decision, proposal }` | 401 · **404 `unknown_proposal` for unknown *and* not-owned, checked before any state comparison** (ipv-demo `store.ts` ordering: caller binding first, so 409s never map the register) · 409 `proposal_superseded` · 409 `already_recorded_differently` · 422 | `X-CAP-Decision-State` |
| `POST /api/sync` | `{ items: SyncItem[] }` ≤ 50 items, ≤ 3 MB | 200 `{ server_time, results[] }` per-item; HTTP 200 whenever the envelope parsed | 400 · 401 · 413 `batch_too_large` | `X-CAP-Sync-{Recorded,Duplicate,Conflict,Rejected}: n` |
| `GET /api/hours` | — | 200 `{ clocks }` server-derived (POST → 405) | 401 | |
| `GET /api/walk/[orderId]` | — | 200 `WalkPayload` | 401 · 404 | `X-CAP-Walk-Facts: n`, `X-CAP-Redaction: none` |
| `GET`/`HEAD /api/health` | — | 200 `{ ok, store:"memory", boot_id, uptime_s, counts, ttl_s }` | — | probe target |

`lib/reconcile/apply.ts` is the single implementation behind open/close/verify/captures/decisions **and** sync. Order of checks, fixed: session → ownership (`order_not_found` / `unknown_proposal`) → idempotency → shape → state. Idempotency: `seen: Map<"${account_id}:${client_id}",{payload_hash,result}>` — keyed **per account** so one persona's retry can never short-circuit into another's stored result; same key + same hash → `duplicate`; same key + different hash → `conflict already_recorded_differently`. `validate.ts` enforces UUID shape on every `client_id`.

**Memory store caps** (`store/memory.ts`), numbered so they are checkable: per account — 200 captures, 200 decisions, 20 clock segments, 500 `seen` entries; global — 5 000 objects, oldest-first eviction **within the offending account first**; TTL 6 h; `BOOT_ID` per instance. An item that hits an evicted-but-same-instance proposal returns `rejected store_evicted` with its own sentence ("The demo server's memory store made room and this proposal was dropped — re-verify the asset"), distinct from an instance change.

### Offline and sync semantics

**Online** = `navigator.onLine && !switchOn && probeOk`; probe = `HEAD /api/health` (`cache:"no-store"`) on mount, on `online` event, every 20 s. The "Work without signal" switch makes `apiFetch` throw `OfflineByChoice` before any request; its label: *"Work without signal — a preview switch that blocks this app's own requests. Real airplane mode works too."*

**Queue**: every write goes `enqueue(item)` → `flush()`; online, flush runs immediately, so the online path *is* the queue path. Batched in `created_at` order. Network failure → `queued`, `attempts++`, backoff `min(60s, 2s·2^attempts)`. `sending` reverts to `queued` on reload if the tab died mid-flight.

| Situation | Server outcome | UI says |
|---|---|---|
| Open order offline | recorded as a `device_reconciled` segment, `opened_at` clamped to ≥ session `issued_at` and ≥ last server contact; already open → `duplicate` | "Clock started on this phone at 14:02 (device clock). Reconciled when you reconnect." Walk and the hours screen show the segment's `source`. |
| Verify offline | local `pending`; on sync `server.verification` + `server.proposals` | "Without signal, nothing is verified or observed on this phone. Queued as a draft…" → "3 observations arrived for 20HAD10AA601 — review them." |
| Evidence offline | recorded | chip "on this phone · queued" → "recorded 14:31" |
| Decide offline on earlier proposals | validate order assigned, asset in order, proposal open, timestamps sane → recorded | "Accepted on this phone at 14:32 — pending reconciliation. It binds only after the server confirms the order is still yours." → "Recorded 14:41 · S. Mabaso" |
| Persona switched with items queued | `account_mismatch` / `order_not_found` | ConflictCard: **Discard** or **Sync as S. Mabaso**. The `orders` IDB store is namespaced by `account_id` and foreign entries are purged at the gate, so the shell never renders another persona's prefetched orders; queued items are kept (they carry `claimed_account_id`) |
| Order closed server-side before capture arrives | `conflict order_closed` | "…Nothing was bound." Discard only |
| Decision reaches an instance that never issued the proposal | **Recorded** — proposal ids are deterministic, so any instance re-derives and validates them. No "server restarted" message exists for this case. | chip "recorded" |
| Proposal genuinely gone (TTL, or evicted under caps) | `rejected store_evicted` | "The demo server's memory store made room and this proposal was dropped — re-verify the asset." **Re-verify** |
| Newer verify superseded proposals | `conflict proposal_superseded` | **Re-decide** |
| Retry after timeout | `duplicate` | treated as recorded |
| 401 during flush (session expired mid-shift) | — | every item stays `queued`; the app routes to the gate to re-mint the **same** persona; nothing is discarded |
| Clock skew | item arrives within 60 s of `decided_at`: server **clamps** to receive time and records `device_offset_s` — never a conflict on the online path. Queued item: future tolerance 60 min, floor `issued_at`−5 min; outside that → `conflict clock_skew` | "This phone's clock disagrees with the server by 3 h 12 m. Check the phone's time and decide again." |

Conflicts are **never** auto-resolved. Batches are packed by **encoded bytes** (flush when a batch approaches 2.5 MB, regardless of item count) as well as the 50-item cap — 50 × 64 KB thumbnails base64-encoded would exceed the envelope.

### Camera and voice notes

- **Secure context**: `getUserMedia`, `crypto.subtle`, `crypto.randomUUID`, `navigator.serviceWorker` and `navigator.storage` are all `[SecureContext]`-gated (MediaRecorder itself is not, but it has no stream without gUM) — a phone on a LAN `http://192.168…` gets none of them. Two documented paths for phone testing: **Vercel preview deployments** (primary; requires Deployment Protection off — Phase 0 step 5) and **`next dev --experimental-https`** (Next 16's documented local option; the phone must trust the mkcert root CA, and `allowedDevOrigins` must list the LAN origin).
- **Permissions-Policy** must be `camera=(self), microphone=(self)` (ipv-demo's `camera=()` would make `getUserMedia` reject regardless of the user's answer); `scripts/check-headers.mjs` enforces it. The desktop frame renders the app inline, not in an `<iframe>` — a same-origin iframe *would* work (default allowlist `self`, shared cookies and SW); the reason is one document, one viewport, simpler layout.
- **Photo**: `getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } } })` → `<video autoPlay muted playsInline>` with an explicit `play()` after a gesture; shutter reads `videoWidth/videoHeight` at capture time and draws to canvas ≤ 1600 px long edge → `toBlob("image/jpeg", 0.82)`. Fallback `<input type="file" accept="image/*" capture="environment">` is **first-class** (the path that works on every phone incl. iOS standalone); decode with plain `createImageBitmap(file)` — modern engines apply EXIF orientation by default, and the `imageOrientation: "from-image"` option throws a TypeError on engines that predate the rename (wrap in try/catch if used). Canvas re-encode strips EXIF, so the stored JPEG is upright and tag-free — assert that in the harness. Thumbnail 320 px JPEG 0.6, **40 KB client target / 64 KB server hard cap, both measured in base64-encoded bytes** (what the JSON envelope carries). SHA-256 over the **full** blob via `crypto.subtle`.
- **iOS media lifecycle**: iOS has allowed only one active capture per page — **stop camera tracks before starting the recorder and vice versa**; tracks are muted on backgrounding and do not always resume — **re-acquire on `visibilitychange`**; a standalone-mode app can be reloaded from scratch when foregrounded — screen/order/asset already live in the URL, and pending-capture intent is stashed in IDB `kv` so the flow resumes.
- **React 19 strict effects** double-run in dev: guard `getUserMedia` with a ref; cleanup must `track.stop()` every track.
- **Voice**: `new MediaRecorder(stream, { audioBitsPerSecond: 32000, mimeType })` with `mimeType` from `isTypeSupported` in order `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` (iOS Safari: AAC/MP4 only) → `audio/ogg;codecs=opus`; if every probe is false, **construct with no `mimeType` and read `recorder.mimeType` afterwards** (older iOS `isTypeSupported` under-reports); only if construction itself throws, show an honest "voice notes are not available in this browser" state — `<input accept="audio/*" capture>` is not a reliable path and is not presented as one. `start(1000)` timeslice so partial data survives a killed tab and memory is bounded (not because iOS needs it). Measure `duration_ms` by wall clock (WebM blobs report `Infinity`). Hard cap 60 s. Only `{ sha256, bytes, mime, duration_ms }` leaves the phone.
- **Storage**: IDB `media` store `{ id, blob, thumb, mime, bytes, sha256 }`; `navigator.storage?.persist?.()` **feature-detected and caught** (Safari has no `persist()`; Chrome decides by heuristics, no prompt) and the Sync screen reports the honest tri-state: *persistent / best-effort / not supported on this browser*; `storage.estimate()` shown alongside. WebKit's ITP cap deletes all script-writable storage — IDB, Cache API **and the SW registration** — after **7 days of Safari use without visiting the site**; a home-screen install keeps its own counter and is effectively exempt. The Sync screen says exactly that.
- **Budget**: photo typically 250–600 KB on device (high-entropy corrosion textures can reach ~800 KB; server caps thumbnails, not originals — originals never leave the phone), ≤ 40 KB on wire; voice at 32 kbps ≈ 240 KB/min, so ≤ 240 KB per 60 s note on device, 0 on wire; sync batch ≤ 2.5 MB encoded (Vercel body limit 4.5 MB).

### Service worker (`public/sw.js`)

- Registered production-only (a SW fights HMR): `register('/sw.js?v=' + NEXT_PUBLIC_BUILD_ID, { scope: "/", updateViaCache: "none" })`. Worker: `SHELL = "cap-shell-" + v`; `STATIC = "cap-static"` (stable across versions).
- **Precache — the shell must be coherent.** On the first visit the page is not yet controlled, so its `/_next/static/*` chunks load uncontrolled and would never be cached; an airplane-mode reload would then serve cached HTML whose scripts 404. So at `install`: fetch `/` (`cache:"reload"`), **parse the HTML for every `/_next/static/…` URL** (script `src`, stylesheet `href`, `modulepreload`, font preloads) and `cache.addAll` them into `STATIC` alongside the HTML in `SHELL`, plus `/manifest.webmanifest` and the icons. Then *"opens with no signal after one online visit"* is actually true, and `scripts/check-offline.mjs` proves it (reload offline → zero failed subresources).
- **Runtime**: `/api/*` → **never handled** (network only; `check-sw.mjs` greps for the guard — a SW serving stale `/api/orders` would lie) · `mode === "navigate"` → network-first with a **3 s `AbortController` timeout** (a `Promise.race` would leave the losing fetch running and let a late response overwrite the coherent precached shell — never cache the navigation response over the precached `/`), fall back to `SHELL`'s `/` · `/_next/static/**` → cache-first into `STATIC` · same-origin image/font/manifest → stale-while-revalidate · else pass through.
- **Activate**: delete `cap-shell-*` ≠ `SHELL`; prune `STATIC` by count (keep newest ~150 entries) — never wholesale, so a version bump cannot orphan the live shell; `clients.claim()`.
- **Update**: on `updatefound`, show the toast "A newer preview is ready — reload" **only if `navigator.serviceWorker.controller` was already non-null** (otherwise `updatefound` is just the first install and the toast is false); also check `reg.waiting` at page load for an update that installed while the page was closed. Tap → `SKIP_WAITING`; reload on `controllerchange` **only behind a flag set by that tap** — an unconditional reload on `controllerchange` is the classic first-visit reload loop and would also break "never auto-reload mid-capture".
- **Headers** (`vercel.json`): `/sw.js` → `no-cache, no-store, must-revalidate` (`Service-Worker-Allowed` is unnecessary for a root-level worker and is not set); `/manifest.webmanifest` → `max-age=0, must-revalidate`; `/api/(.*)` → `no-store`.
- **Screen switching is request-free — asserted, not assumed.** Next's docs promise only that `pushState` "integrates into the Next.js Router"; the 16.2.12 restore reducer can spawn dynamic requests in some states. `check-offline.mjs` asserts **zero `_rsc` and zero document requests** during offline screen switches; if that ever fails, the fallback is a `history.state`-only switcher that bypasses the router entirely.
- **Manifest**: `id:"/"`, `name:"NOVATEK Capture — designed preview"`, `short_name:"Capture"`, `start_url:"/?source=pwa"`, `display:"standalone"`, `orientation:"portrait"`, colours `#0c1e35`, icons 192/512/512-maskable. `layout.tsx`: `metadata.appleWebApp`, `viewport.viewportFit:"cover"`; CSS uses `env(safe-area-inset-*)`.

### Where each honesty label lives (`lib/copy/governed.ts`)

| Key | Sentence | Rendered in | Also served by |
|---|---|---|---|
| `preview` | **Designed preview.** Capture is specified, not yet built. The plant, the people and every record here are synthetic. | `shell/Ribbon` on every screen, non-dismissible. **This is the only status text; the site's chip is not rendered in the app** (see the "Funded" wording decision) | `Gate` long form first time, short on re-open |
| `authoredVerification` | Matched to record — **authored for this preview. No model ran.** The match is drawn from the asset record, not from your photograph. | `asset/VerifyResult` | `VerificationResult.label`; `X-CAP-Verification: authored` |
| `authoredProposals` | **Authored observations — no model observed this photograph.** Each is drawn from the asset's own history so the accept/reject gate can be shown working. | `proposals/Proposals` header; each card names the record it was drawn from | `Proposal.provenance.source_label`; `WalkPayload.candidate_facts[].provenance` |
| `noRedaction` | **No redaction runs in this preview.** Faces, name boards and screens are not blurred. Photograph the plant, not people. | `capture/CaptureScreen` above the shutter | `WalkPayload.redaction.statement`; `X-CAP-Redaction: none` |
| `memoryStore` | The server keeps this **in memory only**, for a few hours at most, and discards it on cold start. There is no database behind this preview. | `sync/SyncScreen` with live `X-CAP-Instance`; `walk/WalkPayload` | `/api/health`; `WalkPayload.store.statement` |
| `noOfflineInference` | Without signal, **nothing is verified or observed on this phone.** The capture is queued as a draft; the server does that work when you reconnect. | `asset/Verify` when offline; `sync/QueueRow` | `VerificationResult.outcome:"pending"` |
| `pendingReconciliation` | Decided on this phone at {time} — **pending reconciliation.** It binds only after the server confirms the order is still yours. | `proposals/DecisionState` | `Decision.reconciled:"pending"` |
| `mediaOnDevice` | The full photograph stays on this phone; a small preview and a fingerprint leave it. **The recording never leaves this phone; only its fingerprint and length do.** | `capture/PhotoGrid`, `capture/VoiceNote` | `audio_left_device: false` — the network panel shows a `POST /api/captures` carrying `{sha256, bytes, mime, duration_ms}` for a voice note, so the sentence must say exactly that and no less |

`components/limits/Limits.tsx` renders all eight on one screen (from the ribbon and the desktop side panel).

**Claims audit** (`scripts/claims-audit.mjs`): copy ipv-demo's register and **keep ipv-demo's `ROOTS = ["app","components","lib"]`** — README and HANDOVER carry the register itself and would trip a dozen rules that have no `allowQuoted`; they are reviewed by a person, and the script header says so. Additions, each tested against the copied ipv-demo surfaces before Phase 2 so no inherited comment trips them:
- Rule 1 alternation gains `\bfunded by this round\b` (allowQuoted) — the differently-shaped form of the retired "IPV is funded".
- `\b(as|writes?|files?|records?|reports?|raises?|surfaces?)\s+(a\s+)?findings?\b` — claim-shaped uses only, so identifiers and "code review findings" pass; `RETIREMENT_MARKER` gains `never as (a )?finding` and `no model` so the card copy and denial forms are excused.
- `\b(camera|model|AI|vision)\b.{0,40}\b(detects|detected|recognis(es|ed)|identif(ies|ied))\b.{0,30}\b(corrosion|leak|damage|asset|unit)\b` — subject-guarded so "the work order identifies the asset" (a true, load-bearing sentence) does not fire.
- Performance figures `\d+(\.\d+)?\s*(%|x|×)\s*(faster|fewer|less|reduction|saved)`, `\bin under \d+ (seconds|minutes)`; `reduce(s|d)? (reliance on imported|headcount)`.
- `\bpersisted (to|in|on) (a |the )?(server|database|cloud)\b|\bencrypted at rest\b|\bsecure(ly)? stored\b` — server-side persistence claims only; "persisted on this phone" and ipv-demo's `types.ts` comment "persisted before execution" are legitimate.

### Build order (GSD roadmap phases 1–8)

| # | Phase | Gate |
|---|---|---|
| 1 | **Scaffold & conventions** — configs, `vercel.json` (cpt1, relaxed policy, sw headers), tokens/globals/brand copied, ribbon + `governed.ts` skeleton (so the first — always production — deploy is already labelled), `claims-audit`, `check-headers`, `check-sw`; `verify` = `next typegen && tsc --noEmit && node scripts/claims-audit.mjs && node scripts/check-headers.mjs && node scripts/check-sw.mjs && eslint . && next build` (`next typegen` first — on a fresh clone `.next/types` does not exist; alternatively type route params inline as `{ params: Promise<{ id: string }> }` exactly as ipv-demo does and skip `RouteContext`). Push `dev` → first preview URL; confirm the Vercel project settings from Phase 0 step 5 | `npm run verify` green on an empty page; a preview URL opens on a phone without a Vercel login |
| 2 | **Fixtures & types** — `types.ts`, `plant.ts` subset, `artisans.ts`, `orders.ts`, `observations.ts`, `governed.ts` | `tsc` clean; every `drawn_from` resolves to a real record id **and** a person confirms each wording against the cited record's content (the restated gate under *Fixtures*); claims audit clean over the copied surfaces |
| 3 | **Server seam** — `session/cookie.ts`, `access/scope.ts`, `store/memory.ts`, `reconcile/*`, `http/respond.ts`, all `app/api/**` | curl suite below passes; `bmad-code-review` |
| 4 | **Shell, gate, orders, clock** (online) — `client/{api,nav,store}.ts`, `shell/*`, `gate/*`, `orders/*` | choose a persona → only that persona's orders; open one; clock ticks; `X-CAP-Account` matches |
| 5 | **Camera → verify → capture → proposals → decisions** (online) — `client/media.ts`, `asset/*`, `capture/*`, `proposals/*` | on a Vercel preview (or `next dev --experimental-https`) from a real iPhone **and** a real Android: authored match with label; accept one, reject one; both recorded and attributed; voice note records on both; `bmad-code-review` |
| 6 | **Offline** — `client/{db,queue,online}.ts` (orders namespaced by account, purged at the gate), switch, `sync/*`, `/api/sync` wiring, conflict cards, byte-packed batches | `scripts/check-offline.mjs` passes, including its own offline-ness probe and the zero-`_rsc` assertion; `bmad-code-review` |
| 7 | **PWA & desktop frame** — `manifest.ts` (no `metadata.manifest` in `layout.tsx` — the file convention already injects the link and would override it), icons, `sw.js` with the coherent-shell precache, `pwa/Register`, `frame/*` + `uqr` | install on iOS + Android; airplane mode → opens to orders with offline badge and **zero failed subresources**; desktop frame + scannable QR |
| 8 | **Walk payload, Limits, docs, stills, deploy** — `walk/*`, `limits/*`, README, HANDOVER, harness, stills; verify `CAPTURE_SESSION_KEY` is set for Production **and Preview** (set in Phase 0); merge `dev` → `main` for the production deploy (Git-connected — no `npx vercel --prod`) | phone walkthrough below; then the website link follow-up |

### Verification

**From a shell (Phase 3 gate, re-run at the end):**
```bash
B=http://localhost:3000; J='Content-Type: application/json'
# A identity from session; orders filtered by it
curl -s -c a.jar -X POST $B/api/session -H "$J" -d '{"persona_id":"acc-mabaso"}'
curl -s -c b.jar -X POST $B/api/session -H "$J" -d '{"persona_id":"acc-naidoo"}'
curl -s -b a.jar -D - $B/api/orders | grep -E "X-CAP-Account|WO-2026"      # Mabaso's two orders only
curl -s -b b.jar $B/api/orders/wo-0142                                        # 404 not_found (Mabaso's order)
curl -s $B/api/orders                                                         # 401 no_session
# B verification is authored and says so
curl -s -b a.jar -D - -X POST $B/api/verify -H "$J" -d '{"id":"c1","order_id":"wo-0142","asset_id":"m-ap003","kind":"photo","purpose":"verify","captured_at":"'$(date -u +%FT%TZ)'","mime":"image/jpeg","bytes":1,"sha256":"00"}' | grep -E "X-CAP-Verification|No model"
# C asset must belong to the order → 409 asset_not_in_order (asset_id m-gs001)
# D decided_by in the body is ignored; server stamps acc-mabaso
# E rejections retained: GET /api/walk/wo-0142 → candidate_facts, rejected, open, redaction.ran=false
# F sync idempotency: same item twice → duplicate; same id different outcome → already_recorded_differently
# G hours: POST open, sleep 3, GET /api/hours → elapsed_s ≥ 3; POST /api/hours → 405
# H memory store: X-CAP-Instance constant across calls; changes after restart
node scripts/check-headers.mjs && node scripts/check-sw.mjs && node scripts/claims-audit.mjs
```

**From a phone (Phase 8 gate):** open the production URL — ribbon visible before the gate; Add to Home Screen → enter as the fitter → only two orders, headed by a name you never typed → open WO-2026-0142, clock starts → verify by photographing anything, authored label shown → photo + voice, chips say what leaves the phone → airplane mode, reload: opens from cache with offline badge → accept one / reject one: "pending reconciliation" → photograph a second asset: "queued as a draft" → airplane off: decisions become "recorded · S. Mabaso", draft returns with observations → "What Walk receives" shows `candidate_facts`, `rejected`, `redaction.ran:false` → re-enter as the electrician with an item queued → `account_mismatch` conflict card.

**Harness (`scripts/lib/harness.mjs`):** Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`; context `{ viewport:{390,844}, deviceScaleFactor:3, isMobile, hasTouch, permissions:["camera","microphone"] }`; clears cookies + every IndexedDB so a first arrival is a first arrival; `enterAs()` with ipv-demo's click-verify-retry; `probe()` reads `window.__cap`. **Offline-ness is proved, not assumed**: after `context.setOffline(true)` the harness asserts that a page-context fetch to a never-cached same-origin URL rejects (that request traverses the SW; Playwright's emulation has not always reached SW-initiated fetches); if it does not reject, the harness stops the `next start` process for the offline leg instead — a dead server starves the SW unconditionally. It also asserts zero `_rsc`/document requests during offline screen switches and zero failed subresources on the offline reload.

### Risks and gotchas (Next 16 · React 19 · Vercel)

1. Turbopack default — **no `webpack()` key anywhere**; no Serwist/next-pwa. Import `tokens.css` first in `globals.css`.
2. Async-only request APIs; type route params inline as `{ params: Promise<{ id: string }> }` (ipv-demo's form) or run `next typegen` before `tsc` if `RouteContext` is used.
3. No `proxy.ts` for auth — it would be a second seam; keep `readSession()` in each handler.
4. `useSearchParams` needs a `<Suspense>` boundary or the static `/` prerender errors; keep `page.tsx` a static Server Component so the SW caches its HTML.
5. No `<Link>`/`router.push` between screens (RSC fetch fails offline) — `history.pushState` only, **and the harness asserts it issues no requests** (see Service worker).
6. Vercel memory is **per instance**; concurrent instances have separate Maps. Deterministic proposal ids make this invisible for the decisions path; `X-CAP-Instance` on every response and the Sync screen explain the rest. State it, don't hide it.
7. Body limit 4.5 MB → batch 2.5 MB encoded, thumbnail 40 KB target / 64 KB cap, 413 with a sentence.
8. Cookie `Secure` off on localhost, on in production; **Preview deployments need `CAPTURE_SESSION_KEY`** (lazy-key check runs under `NODE_ENV=production` there too).
9. React 19 strict effects double-invoke `getUserMedia`; ref-guard and stop tracks.
10. SW in dev fights HMR — production-only; test offline on `next build && next start` or a preview.
11. Explicit no-cache on `/sw.js` in `vercel.json` so a CDN never holds an old worker.
12. iOS: `audio/mp4` only; one active capture at a time; tracks mute on backgrounding; home-screen app has separate cookie/IDB storage from Safari (gate handles it); ITP evicts all site storage incl. the SW after 7 days of Safari use without a visit — installed apps are effectively exempt.
13. `next lint` removed — `verify` calls `eslint .` directly.
14. Camera on a plain LAN dev URL will not work — use previews (protection off) or `next dev --experimental-https`; budget real-device testing into Phase 5.
15. The claims audit is a string sweep (ipv-demo's own caveat); the eight governed sentences live in one module so they are edited once.
16. Vercel Deployment Protection defaults to on for previews; the first deploy of a project is production regardless of flags; CLI deploys carry no git metadata. All three are handled in Phase 0 step 5 — do not skip it.
17. Stateless HMAC cookie: `DELETE /api/session` cannot revoke; document it in HANDOVER's limits rather than implying sign-out invalidates anything server-side.

### Verification record

An adversarial sweep over this plan (six finder lenses: Next 16 docs, browser/PWA platform, Vercel, BMAD/GSD on this machine, fixtures & claims copy, logic & security) returned 56 findings and confirmed 77 claims as holding. The refuter stage was cut short by a session rate limit, so the findings were triaged by hand rather than by majority vote; every finding was applied above except the purely stylistic ones. The highest-impact corrections: the service-worker shell was incoherent (cached HTML, uncached chunks); a different Vercel instance would have been reported as a "server restart"; idempotency was keyed without the account; BMAD's skills write to `{planning_artifacts}`, not `docs/prd`; Vercel previews would have been behind a login wall on the phone; three fixture observations cited NCR records that say something else; and the Status ribbon contradicted the plan's own "funded" rule. The sweep did not verify `cpt1` as a live Vercel region id — confirm from the Vercel region list at Phase 0 step 5 and fall back to `cdg1` (ipv-demo's) if absent.

---

## Production infrastructure suggestions (for the real Capture app, not the demo)

These align with `IPV (Digital Twin technology)/IPV-ARCHITECTURE.md` and `SEED-BRIEF.md` (GCP `africa-south1`, Postgres ERP as system of record, source-mcp for all writes, EgoBlur redaction gate, Neo4j spatial graph as a view). Each is a suggestion to weigh, not a commitment.

**Client**
- **PWA first, native later.** A PWA covers Android (the likely artisan device) fully: camera, mic, IndexedDB, background sync, install. iOS Safari limits background sync and MediaRecorder codecs; if BRIMIS issues iPhones, wrap the same codebase with Capacitor rather than rewriting in React Native.
- **Local-first storage**: IndexedDB (or SQLite via Capacitor) as the primary store; the server is a replica of the device, not the other way round. Client-generated ULIDs make every sync idempotent.
- **Media on device**: photos downscaled to ~2000px longest edge + JPEG q80 before storage (a 12 MP phone JPEG is 4–6 MB; a shift's worth would exhaust a cheap phone). Voice as Opus/WebM on Android, AAC/MP4 on iOS.
- **Glove-and-glare UI**: ≥48px touch targets, high-contrast dark ground (matches the viewer tokens), voice as the primary note channel, one primary action per screen.

**Identity**
- BRIMIS runs Microsoft 365 → **Entra ID** as the IdP, MSAL in the PWA, device-bound refresh tokens so a shift can run offline for hours after one login. RBAC roles map 1:1 to the IPV tiers (Field Technician = capture/upload; Site Supervisor = review; Management; NOVATEK Admin).
- Work orders come from the **ERP (Postgres 16) via source-mcp**, filtered to the account server-side. The phone never receives another artisan's orders.

**Ingest & sync**
- **BFF on Cloud Run (`africa-south1`)**, Node/TypeScript, same handler conventions as the demo. Batch sync endpoint, idempotent by client id, per-item results.
- **Quarantine bucket** (GCS regional, `africa-south1`, no read access except the redaction service) → **EgoBlur Gen 2 redaction** on Cloud Run → redaction record + model hash into provenance → Site-Supervisor spot-check queue → release to the media bucket. This is already the IPV capture pipeline; Capture is its front end.
- **Observations**: a vision model on the *redacted* photo, in-region if a suitable open model runs on CPU in `africa-south1`; otherwise Claude on Vertex AI (EU/global endpoint) with the cross-border transfer disclosed under POPIA s72 — inference sovereignty is not claimable and must not be. Output is always a `Proposal` node, never a finding; a person accepts or rejects; both are retained.
- **Voice**: store the audio; transcribe server-side (Speech-to-Text in-region supports en-ZA and af-ZA; isiZulu/Sesotho coverage should be checked before it is promised). The transcript is a *proposal* too — the artisan confirms it.
- **Hours**: derive from order open/close events plus device-side pause; write to the ERP job as a proposed time entry through the BR-001 gate, not directly.

**Data model**
- Extend the plant ontology (NVT-BB-ANX-001): `CAPTURE_SESSION` already exists; add `CAPTURE` (photo/voice, redaction hash, device, captured_at), `PROPOSAL` (observation, grade, model hash or "authored"), `DECISION` (accepted/rejected, by whom, when, what-was-shown). Standard provenance tuple on every edge.
- Postgres stays the record; Neo4j holds the graph view; GCS holds blobs. Nothing the phone writes is authoritative until source-mcp commits it.

**Ops**
- Vercel is fine for the demo; production should sit in `africa-south1` on Cloud Run for the residency design commitment (Tier D until the Phase 1 IAM test passes).
- Observability headers on every response (`X-CAP-*`) so an auditor can reproduce any claim from a shell — the same discipline as `ipv-demo`.

---

## Questions for you — feasibility · accuracy · usability

Answer at your pace; none blocks the demo build, but several shape the production design above and a few shape the demo's fixtures and copy.

**Feasibility**
1. **Devices.** Do BRIMIS artisans carry personal Android phones, company-issued phones, or rugged devices? Any iPhones? (PWA vs Capacitor wrapper; MediaRecorder codec choice.)
2. **Connectivity.** At the Middelburg workshop and at client sites — is it intermittent LTE, Wi-Fi in the workshop only, or genuinely nothing for hours? (How long the offline window must be, and whether background sync matters.)
3. **Work orders today.** Are jobs already assigned to a named artisan in the ERP, or to a team? Is there one asset per job or several? (Whether "opens the work order already assigned to them" is a data-model fact or a process change.)
4. **Identity.** Do artisans already have M365 accounts, or only supervisors? (Entra ID SSO vs a separate identity for the shop floor.)
5. **Photography permissions.** Is Capture expected at client sites in v1, or workshop-only until per-site capture agreements are signed? (The IPV risk register sequences the Middelburg workshop first for exactly this reason.)

**Accuracy**
6. **"The camera verifies the unit."** In production, what would you accept as verification — reading the tag plate (OCR/QR), a visual match to a reference photo, GPS + zone, or the artisan confirming? The demo stages it; the production claim needs a mechanism you would defend to an adjudicator.
7. **What counts as an observation?** Corrosion, weeping gland, damaged guard are visual. Are there non-visual proposals you want (abnormal noise from the voice note, a reading the artisan speaks)? Each is a model dependency to disclose.
8. **Hours.** Open-to-close on the order, or per step of the 11-step service workflow? Does a lunch break or a parts run pause the clock, and who says so?
9. **Rejections.** Should a rejected proposal be visible to the supervisor in Walk (audit trail), or only counted? The demo retains them; the display decision is yours.

**Usability**
10. **Gloves and glare.** Should voice be the *primary* note channel with typing as fallback? Any requirement for the app to work with the screen off (voice-only capture)?
11. **Language.** English only for v1, or Afrikaans/isiZulu labels and voice? (Transcription language support is uneven — do not promise it before checking.)
12. **Review on the phone.** Should the artisan see previous captures of the same asset (last visit's photos) before capturing? It helps consistency but adds data to sync down.
13. **Supervisor loop.** In the demo the artisan accepts on the phone and Walk receives it. In production, does a supervisor confirm before it binds (two-step), or is the artisan's acceptance final for observations and only *writes to the ERP* go through the gate?

---

## Follow-up outside this repo (after deploy, on your go)

- `MattSlayed/novatek-website` → add a "Preview Capture" link on the Capture card (`src/sections/Platforms.tsx` / `src/data/site.ts`) pointing at the deployed URL, in the same form as Walk's "Open the live demo", with a disclaimer line in the same voice: *"A designed preview. The work-order identity, the accept/reject gate and the offline queue are real and enforced server-side. The plant is synthetic, its records are invented, and the observations are authored — no model runs."*
