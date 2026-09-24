---
phase: 4
slug: shell-gate-orders-clock-online
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-24
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` § Validation Architecture, which measured every
> claim below against this repository at Next.js 16.3.4.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in runner (`node:test` + `node:assert/strict`) for source-side proofs; Playwright 1.62.1 via `scripts/lib/harness.mjs` for browser proofs. **No new framework, no config file, no install.** |
| **Config file** | none — `node --test <glob>`; `scripts/verify.mjs`'s `STEPS` list is the one gate |
| **Quick run command** | `npx eslint <changed files> && node --test lib/client/<module>.test.mjs` |
| **Full suite command** | `node scripts/verify.mjs` |
| **Estimated runtime** | quick: ~2 seconds (no build, no browser) · full: ~180 seconds |

**`eslint` runs first, deliberately.** It is `verify.mjs`'s third step, and this phase's
most likely implementation mistakes are ESLint failures rather than test failures:
`eslint-plugin-react-hooks@7.1.1`'s React Compiler rules reject a clock anchor held in a
ref and read during render (`react-hooks/refs`) and a re-anchor-then-setState effect
(`react-hooks/set-state-in-effect`). Both are the natural first implementation
(04-RESEARCH.md, Pitfall 3). Running the fast linter before the slower suite puts the
feedback where the defect actually lands.

---

## Sampling Rate

- **After every task commit:** `npx eslint <changed files>` then
  `node --test lib/client/*.test.mjs` — both sub-second.
- **After every plan wave:** `node scripts/verify.mjs`. **Never two at once** — concurrent
  runs race on `.next`. Bound it with `timeout` and capture output to `scripts/.check/`.
- **Before `/gsd:verify-work`:** full suite green.
- **Phase gate, beyond the suite:** a device pass on a real Android and a real iOS handset
  against the Preview URL, recorded in `docs/analysis/` with the build id — the shape
  Phase 3 used for its curl suite. This closes Assumptions Log A1, A2, A3 and A6, which
  no harness on this machine can reach.
- **Max feedback latency:** 2 seconds per task; 180 seconds per wave.

---

## Per-Task Verification Map

**Populated when the plans land.** Task IDs do not exist until `gsd-planner` writes
`04-NN-PLAN.md`, so this table is filled by the planner and checked by
`gsd-plan-checker`'s Dimension 8. What follows is the requirement-level map the research
established, which every task-level entry must trace to.

| Requirement | Behaviour | Test type | Automated command | Exists? |
|---|---|---|---|---|
| REQ-FR-48a | First entry shows the long form before any claim is met; re-entry shows `preview` plus a control reopening it | browser, two visits with storage cleared between | `node scripts/check-wcag.mjs` (extended) | ❌ W0 |
| REQ-FR-48a | The disposition sentence is defined once and is **not** a member of `GOVERNED` | build rule | `check-primitives.mjs` + `check-governed.mjs` | ❌ W0 |
| REQ-FR-58 | Every segment renders with its source; device pairs render only where the record carries them | unit against fixture `OrderClock`s, plus browser | `node --test lib/client/projection.test.mjs` | ❌ W0 |
| REQ-FR-58 | The stated limitation renders above the segment list | browser | extended WCAG scan | ❌ W0 |
| REQ-NFR-2 | Every interactive element ≥ 44 × 44 at 360 px and 320 px, 100 % and 200 % (C1) | browser | extended WCAG scan | ❌ W0 |
| REQ-NFR-2 | `44px` / `var(--target-min)` declared in only three modules (A2) | build rule | `check-primitives.mjs` | ❌ W0 |
| REQ-NFR-4 | The clock control measures exactly 130 × 130 in rest and pressed, both viewports and text scales (C2) | browser | extended WCAG scan | ❌ W0 |
| REQ-NFR-4 | `--dur-press` declared, in `D13_MANIFEST`, and the only `transition` declaration (A8) | build rule | `check-tokens.mjs`; `check-primitives.mjs` | ❌ W0 |
| REQ-NFR-4 | Repeated taps idempotent — open twice yields one segment; closing a closed order yields a stated conflict | route-level | `scripts/server/route-suite.proof.mjs` | ✅ exists |
| REQ-NFR-4a | `navigator.vibrate` appears in exactly one module, behind a feature test | build rule, **not** browser (Pitfall 14) | `check-primitives.mjs` | ❌ W0 |
| REQ-NFR-6 | Every pair this phase renders is in the manifest and clears its floor, or matches an exemption on ink AND ground AND ratio (B1) | build rule | `check-contrast.mjs` | ⚠ script exists, 16 rows to add |
| REQ-NFR-6 | The exemption register still holds exactly four entries (B2) | build rule | `check-tokens.mjs` | ✅ **already enforced — do not build twice** |
| REQ-NFR-6 | No state by hue alone: every state carries a shape from the closed set of seven, plus a word (A4) | build rule + inspection | `check-primitives.mjs` | ❌ W0 |
| SC-5 | No `next/link`, no `useRouter`, no `router.push` (A12) | build rule | `check-primitives.mjs` | ❌ W0 |
| SC-5 | `position: fixed` and `position: sticky` appear zero times (A5, A6) | build rule | `check-primitives.mjs` | ❌ W0 |
| SC-5 | Focus lands on the new screen's `<h1>` after **every** transition, the `id`-only one included (C6) | browser | extended WCAG scan | ❌ W0 |
| SC-5 | `/` is still statically prerendered after the switcher becomes a Client Component | build rule | `check-structure.mjs --build-output` | ✅ exists — shape verified this session to keep the `◐` glyph |
| SC-1 | `X-CAP-Account` on the orders response matches the chosen persona | route-level | Phase 3 route suite; re-assertable from `page.request` | ✅ exists |
| D-05 | `already_open` present in `ConflictCode`, `CONFLICT_CODES` and `CONFLICT_COPY`, non-empty sentence, exactly one action (D3) | build rule | `check-primitives.mjs` | ❌ W0 |

---

## Wave 0 Requirements

- [ ] `scripts/check-primitives.mjs` + `scripts/check-primitives.test.mjs` — carries
      invariants A1–A14 and D3. The test needs a fixture that trips each assertion and
      asserts a non-zero exit (D-23, the pattern every existing sweep follows).
- [ ] **One** new `STEPS` entry in `scripts/verify.mjs`, placed with the other
      source-side sweeps (after `check-non-bypassability`, before `next-build`), carrying
      **no** `vercelExcluded` so it runs in the Vercel build as well as the GitHub job.
      Reconcile against `scripts/verify.test.mjs`'s `resolveSteps` / `runSteps`
      accounting, which asserts the step list.
- [ ] **Session establishment in `scripts/check-wcag.mjs` — the largest test task in this
      phase.** The harness has no cookie handling today. C1, C3, C6, C7 and C8 all need
      authenticated surfaces. Cheapest correct route: `page.request.post("/api/session", …)`
      before navigating, since the Playwright context shares its cookie jar with the page.
- [ ] `scripts/check-wcag.mjs` surface list re-pointed from two surfaces to five.
- [ ] C6's transition matrix, including the `order(A) → order(B)` case — the UI-SPEC's C6
      does not enumerate it, and Pitfall 4 proves it is the one that breaks: an effect
      keyed on `s` alone does not re-run on an `id`-only transition, so focus stays on a
      control that was just replaced.
- [ ] `scripts/check-deployment.test.mjs`'s `PASSING_BODY` fixture string (line 45) —
      Phase 4 retires the Phase 1 shell surface it encodes.
- [ ] `scripts/check-contrast.pairs.json` — the UI-SPEC's 16 rows.
- [ ] `scripts/check-tokens.mjs`'s `D13_MANIFEST` — `--dur-press` and `--tint-warn-head`,
      in the same commit that declares them (the manifest is a closed list that fails on
      any unlisted token).
- [ ] `lib/client/projection.test.mjs` and `lib/client/navigate.test.mjs` — no install
      needed; `verify.mjs`'s `unit-suite` step already runs `lib/**/*.test.mjs`.
- [ ] Framework install: **none.**

---

## Manual-Only Verifications

| Behaviour | Requirement | Why manual | Test instructions |
|---|---|---|---|
| Haptic confirmation fires on a record-binding control, additively | REQ-NFR-4a | `navigator.vibrate` cannot be asserted in a headless browser, and on iOS the API does not exist at all — the visible change carries NFR-4 alone there (Pitfall 14) | On a real Android handset against the Preview URL, press the clock control and confirm a short vibration accompanies, and never replaces, the visible state change. On iOS, confirm the visible change alone confirms within NFR-4's window. |
| Hidden-tab and wake-from-sleep clock behaviour | REQ-FR-58, SC-1 | Chrome throttles hidden-tab timers to 1/s and to 1/min after five minutes; no harness here reproduces a real backgrounded handset | Open an order, background the app for >5 minutes, return, and confirm the displayed figure re-anchors to the server value rather than showing accumulated drift. |
| The gate's first-entry disclosure on a genuinely first visit | REQ-FR-48a | `localStorage` state on a real device, including private mode and a second device | On a handset that has never opened the Preview, confirm the long form is present before any claim is met; re-enter and confirm `preview` plus the reopen control. |
| 200 % text reflow on real handsets | REQ-NFR-2, REQ-NFR-7 | CI asserts at 360 px and 320 px; the device pass is what NFR-7 actually claims | At 200 % text on both handsets, confirm every screen operable with one scroll axis and nothing shortened or truncated. |

These four are the device pass named in Sampling Rate, and they close Assumptions Log
A1, A2, A3 and A6. Record the result in `docs/analysis/` with the build id whether it
passes or not — the practice Phase 2's provenance check and Phase 3's curl suite both
followed.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s per task, < 180s per wave
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — the planner fills the per-task map; `gsd-plan-checker`'s
Dimension 8 is the gate.
