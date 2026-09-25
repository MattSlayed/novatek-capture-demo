---
phase: 4
slug: shell-gate-orders-clock-online
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-24
task_map_filled: 2026-09-24
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

**Filled 2026-09-24, from the thirteen plans as written.** Thirty-four tasks, every one carrying an
`<automated>` command. No task depends on a test that does not exist by the wave it runs in: the
`lib/**/*.test.mjs` glob is already a `verify.mjs` step, and `check-primitives.mjs` lands in wave 3,
before every task that names it.

| Task | Type | Behaviour proved | Automated command |
|---|---|---|---|
| 04-01 T1 | auto | Both new tokens declared once and named once in the closed manifest | `node scripts/check-tokens.mjs` |
| 04-01 T2 | auto | Every pair Phase 4 renders is declared and computed; the register stays at four | `node scripts/check-contrast.mjs && node scripts/check-tokens.mjs` |
| 04-02 T1 | checkpoint:decision | The two blocked files are clean before any Phase 4 edit | `git status --short lib/data/types.ts scripts/claims-audit.mjs` |
| 04-02 T2 | auto | `already_open` in all three places, one action, exact sentence | `node --test lib/copy/conflicts.test.mjs && node scripts/check-governed.mjs && node scripts/claims-audit.mjs` |
| 04-02 T3 | auto | The disposition sentence is a plain string outside the closed set of eight | `node scripts/check-governed.mjs && node scripts/claims-audit.mjs && npx tsc --noEmit` |
| 04-03 T1 | auto | Surface allowlist, id shape guard, screen key, the two history writes | `node --test lib/client/navigate.test.mjs && npx eslint lib/client/navigate.ts && node scripts/check-register-isolation.mjs` |
| 04-03 T2 | auto | **FR-58's field-by-field mapping** and the interpolation arithmetic | `node --test lib/client/clock.test.mjs && node --test "lib/**/*.test.mjs"` |
| 04-04 T1 | auto | Instance compared before the body is stored; one total purge | `node --test lib/client/projection.test.mjs && npx eslint lib/client/projection.ts && node scripts/check-register-isolation.mjs` |
| 04-04 T2 | auto | Seven accessors, cache hit issues no second fetch, fresh `client_id` per tap | `node --test "lib/**/*.test.mjs" && npx eslint lib/client && npx tsc --noEmit` |
| 04-05 T1 | auto | The 130 px geometry, the one transition, the one feature-tested haptic call site | `npx eslint components/controls && npx tsc --noEmit && node scripts/check-contrast.mjs` |
| 04-05 T2 | auto | The two 44 px owners; no local target size, focus rule or font property | `npx eslint components/controls components/rows && npx tsc --noEmit && node scripts/check-contrast.mjs` |
| 04-05 T3 | auto | Seven marks in one module, three bound tones, four in `currentColor` | `npx eslint components/marks && npx tsc --noEmit && node scripts/check-contrast.mjs && node scripts/check-tokens.mjs` |
| 04-06 T1 | auto | A1–A9, A13, A14 fail the build on a violation | `node scripts/check-primitives.mjs && npx eslint scripts/check-primitives.mjs` |
| 04-06 T2 | auto | A10, A12, A15, A16, A17, D1, D3 | `node scripts/check-primitives.mjs && npx eslint scripts/check-primitives.mjs` |
| 04-06 T3 | auto | The sweep trips once per violation class and does not over-fire; the gate carries 27 steps | `node --test scripts/check-primitives.test.mjs && node --test scripts/verify.test.mjs` |
| 04-07 T1 | auto | The FR-48a flag, its safe failure direction, its versioned key | `node --test lib/client/disclosure.test.mjs && node scripts/check-primitives.mjs` |
| 04-07 T2 | auto | The two gate states, no `aria-modal`, no scroll lock, purge on choice | `npx eslint components/gate/Gate.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/check-governed.mjs && node scripts/claims-audit.mjs` |
| 04-07 T3 | auto | The gate's rhythm in declared steps and declared tokens | `node scripts/check-primitives.mjs && node scripts/check-contrast.mjs && node scripts/check-tokens.mjs` |
| 04-08 T1 | auto | Two-zone card, no action row, no composed sentence, corrected border | `npx eslint components/conflict && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/check-contrast.mjs` |
| 04-08 T2 | auto | Three fields per row, the refusal from the conflict table, no confirmation | `npx eslint components/orders/OrderList.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/claims-audit.mjs` |
| 04-08 T3 | auto | One row-gap on the surface; no locally declared primitive | `node scripts/check-primitives.mjs && node scripts/check-contrast.mjs && node scripts/check-tokens.mjs` |
| 04-09 T1 | auto | `role="timer"` with no `aria-live`, no ref-in-render, no `Date.now()` delta, no spinner | `npx eslint components/order/Clock.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/claims-audit.mjs` |
| 04-09 T2 | auto | No pinned bar, no rendered id, non-interactive rows | `npx eslint components/order/OrderDetail.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/claims-audit.mjs` |
| 04-09 T3 | auto | The scrolling surface's budget in declared steps | `node scripts/check-primitives.mjs && node scripts/check-contrast.mjs && node scripts/check-tokens.mjs` |
| 04-10 T1 | auto | **FR-58 rendered**: every field, device pairs only where present, limitation above the list | `npx eslint components/time/TimeOnOrder.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/claims-audit.mjs` |
| 04-10 T2 | auto | Pairs wrap rather than forcing a horizontal scroll | `node scripts/check-primitives.mjs && node scripts/check-contrast.mjs && node scripts/check-tokens.mjs` |
| 04-11 T1 | auto | The header's name, the absent Phase 6 slots, the kept 56 px | `npx eslint components/shell/Header.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs && node scripts/check-contrast.mjs` |
| 04-11 T2 | auto | One parse point (A17), no router API, focus keyed on the full screen identity | `npx eslint components/shell/Screen.tsx && npx tsc --noEmit && node scripts/check-primitives.mjs` |
| 04-11 T3 | auto | `/` still prerenders; the retired shell's two fixtures agree with what it serves | `node --test scripts/check-deployment.test.mjs && node scripts/check-primitives.mjs && npx tsc --noEmit` |
| 04-12 T1 | auto | The harness mints a session and scans five surfaces, each by its own heading | `node scripts/check-wcag.mjs --self-test` |
| 04-12 T2 | auto | **C1, C2, C3** — target size, exact 130 × 130 rest and pressed, one-axis scrolling | `node scripts/check-wcag.mjs --self-test` |
| 04-12 T3 | auto | **C5, C6, C8** — one heading, focus on seven transitions, the ribbon's ancestry | `node scripts/check-wcag.mjs --self-test` |
| 04-13 T1 | auto | The device-pass record exists with its five checks and the build id | `test -f docs/analysis/phase-4-device-pass.md && node scripts/claims-audit.mjs` |
| 04-13 T2 | checkpoint:human-verify | The four device-only claims answered on real hardware, pass or fail | `grep -c "Result" docs/analysis/phase-4-device-pass.md` |

Both `--self-test` entries are the fast per-task gate; each of 04-12's three tasks additionally
runs the real bounded scan against the production build, and plans 04-06, 04-11 and 04-12 each
close with one full `node scripts/verify.mjs` run captured under `scripts/.check/`.

What follows is the requirement-level map the research established, which every task-level entry
above traces to.

| Requirement | Behaviour | Test type | Automated command | Exists? |
|---|---|---|---|---|
| REQ-FR-48a | First entry shows the long form before any claim is met; re-entry shows `preview` plus a control reopening it | browser, two visits with storage cleared between | `node scripts/check-wcag.mjs` (extended) | ❌ W0 |
| REQ-FR-48a | The disposition sentence is defined once and is **not** a member of `GOVERNED` | build rule | `check-primitives.mjs` + `check-governed.mjs` | ❌ W0 |
| REQ-FR-58 | Every segment renders with its source; device pairs render only where the record carries them | unit against fixture `OrderClock`s, plus browser | `node --test lib/client/clock.test.mjs` | ❌ W0 |
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

Each item now names the plan that owns it. None is complete — `wave_0_complete` stays `false`
until those plans execute — but every one is assigned, which is what the sign-off box below
records.

- [ ] `scripts/check-primitives.mjs` + `scripts/check-primitives.test.mjs` — carries
      invariants A1–A14 and D3. The test needs a fixture that trips each assertion and
      asserts a non-zero exit (D-23, the pattern every existing sweep follows).
      → **04-06 T1, T2, T3.** Scope widened to A1–A10, A12–A17, D1 and D3: A11 is not
      attempted as a source sweep (it is C8), and A15–A17 are the three additions the
      research and D-01 called for. The sweep lands in **wave 3, after the primitives it
      owns** — its own test asserts the real repository exits 0, and `fixture-suite` already
      runs in the gate, so it cannot land earlier.
- [ ] **One** new `STEPS` entry in `scripts/verify.mjs`, placed with the other
      source-side sweeps (after `check-non-bypassability`, before `next-build`), carrying
      **no** `vercelExcluded` so it runs in the Vercel build as well as the GitHub job.
      Reconcile against `scripts/verify.test.mjs`'s `resolveSteps` / `runSteps`
      accounting, which asserts the step list.
      → **04-06 T3.** Seven coordinated edits: `EXPECTED_ORDER`, the count word at lines 5,
      59 and 373, and the four length assertions at 367 (24 → **25**), 375, 390 and 401
      (26 → 27).
- [ ] **Session establishment in `scripts/check-wcag.mjs` — the largest test task in this
      phase.** The harness has no cookie handling today. C1, C3, C6, C7 and C8 all need
      authenticated surfaces. Cheapest correct route: `page.request.post("/api/session", …)`
      before navigating, since the Playwright context shares its cookie jar with the page.
      → **04-12 T1.**
- [ ] `scripts/check-wcag.mjs` surface list re-pointed from two surfaces to five.
      → **04-12 T1.** `/` alone is scanned before the mint; the other four, `/?s=limits`
      included, are scanned after it, because the switcher renders the gate at every value
      of `s` when there is no session.
- [ ] C6's transition matrix, including the `order(A) → order(B)` case — the UI-SPEC's C6
      does not enumerate it, and Pitfall 4 proves it is the one that breaks: an effect
      keyed on `s` alone does not re-run on an `id`-only transition, so focus stays on a
      control that was just replaced.
      → **04-12 T3.**
- [ ] `scripts/check-deployment.test.mjs`'s `PASSING_BODY` fixture string (line 45) —
      Phase 4 retires the Phase 1 shell surface it encodes.
      → **04-11 T3**, in the same change that retires the shell.
- [ ] `scripts/check-contrast.pairs.json` — the UI-SPEC's 16 rows.
      → **04-01 T2.** Fifteen rows are added, not sixteen: `--cobalt-glow-ink` on
      `--navy-deep` is already declared as `ribbon-link` and has its note extended instead.
- [ ] `scripts/check-tokens.mjs`'s `D13_MANIFEST` — `--dur-press` and `--tint-warn-head`,
      in the same commit that declares them (the manifest is a closed list that fails on
      any unlisted token).
      → **04-01 T1.**
- [ ] `lib/client/projection.test.mjs` and `lib/client/navigate.test.mjs` — no install
      needed; `verify.mjs`'s `unit-suite` step already runs `lib/**/*.test.mjs`.
      → **04-04 T1/T2** and **04-03 T1**, plus two the list did not anticipate:
      `lib/client/clock.test.mjs` (04-03 T2), which is where FR-58's mapping is actually
      proved, and `lib/client/disclosure.test.mjs` (04-07 T1).
- [ ] Framework install: **none.** → held by every plan's threat register (`T-04-SC`).

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

- [x] All tasks have `<automated>` verify or a Wave 0 dependency — 34 of 34 carry a command; no
      task names a MISSING test, because every sweep lands in a wave before the tasks that call it
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — there is no such run;
      every task's command is checkable
- [x] Wave 0 covers all MISSING references — all ten items assigned above, plus two test files the
      original list did not anticipate
- [x] No watch-mode flags — no `--watch`, no `--ui`, no `next dev` in any task command
- [x] Feedback latency < 2s per task, < 180s per wave — the per-task commands are `eslint`, `tsc`,
      `node --test` and the source-side sweeps, all sub-second to a few seconds; the three full
      `verify.mjs` runs (04-06 T3, 04-11 T3, 04-12 T3) are the per-wave gate and are bounded with
      `timeout` and captured to `scripts/.check/`
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** the per-task map is filled and all six boxes are ticked, so the validation contract
is discharged for planning. `wave_0_complete` deliberately stays `false`: every Wave 0 item is
assigned to a named plan task, and none of them has executed yet. `gsd-plan-checker`'s Dimension 8
remains the gate.
