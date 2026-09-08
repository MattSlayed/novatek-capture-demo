# Deployment gate — Task 2: Deployment Check, red-job proof, D-22 falsification

Dated artefact, not prose. Records which D-22 path is live, the Deployment
Check registration evidence, the red-job demonstration and its honest scope,
the Install Command falsification's outcome, the two deviation fixes found
while producing this evidence, and the production-promotion facts.

## Which D-22 path is live

GitHub Actions job `verify` (`.github/workflows/verify.yml`) runs the full,
unmodified `npm run verify` — every step in `scripts/verify.mjs`'s STEPS
list, including `check-wcag-self-test` and `check-wcag` — on every push,
after a preceding `npx playwright install --with-deps chromium` step.

Vercel's own build runs the same `npm run verify` script as its Build
Command, but `resolveSteps` in `scripts/verify.mjs` removes the two
`vercelExcluded: true` steps (`check-wcag-self-test`, `check-wcag`) whenever
`env.VERCEL === "1"`, because Vercel's build container cannot install a
browser (falsified directly below).

This GitHub job, `verify`, is the check registered as the Vercel Deployment
Check that holds production aliasing. Note for a future reader: the
registration dialog's own "configured checks" path expects a
`vercel/repository-dispatch/actions/status@v1` step, which this project does
not use; the check was found and added via "Show All Checks" instead.

## Deployment Check registration — 2026-09-08

Settings -> Build and Deployment -> Deployment Checks -> Add Checks ->
GitHub -> SHA `293fa89` -> "Show All Checks" -> `verify` -> Add. Vercel's
toast: "New deployment checks will take effect on your next production
deployment." The section now lists `verify | GitHub | Production`.

## Red-job demonstration — 2026-09-08

Throwaway branch `throwaway/red-check-demo` at `9884a9a` ("test: deliberate
governed-literal duplicate for D-22 demonstration") duplicated the
`PLATFORM_413` governed sentence as a literal string in
`components/limits/Limits.tsx`.

GitHub Actions run 34212837892: failure. Log:

```
check-governed -> "Problems: 1 — components/limits/Limits.tsx contains a second literal of the "PLATFORM_413" governed sentence — import it from lib/copy/governed.ts instead (D-09)"
✖ step "check-governed" exited 1
Process completed with exit code 1
```

GitHub check `verify` on `9884a9a`: failure. Vercel created a Preview
deployment only; the Production deployment stayed at `5335c56` (GitHub
deployment 6324899062, 09:44:06Z).

**Honest scope note.** A branch deployment is never aliased to production,
so this demonstration shows the red job and the unchanged production, not a
held *promotion* in the strict sense — the hold itself is only observable on
`main` after a red commit there, which was not done in this plan. Recorded
plainly rather than overstated.

**Branch state at the time this artefact was written.**
`gh api repos/MattSlayed/novatek-capture-demo/branches/throwaway%2Fred-check-demo`
returned HTTP 200, not 404: the branch still exists, pointing at `9884a9a`
(parent `5335c56`), `protected: false`. The developer was told to delete it
once the evidence was read; as of this writing it has not been deleted. It
was never merged — its one commit's parent is `5335c56`, and it does not
appear in `origin/dev`'s history. This is an open item; see "Open items"
below.

## Install Command falsification (D-22, RESEARCH A1) — 2026-09-08

The developer overrode Vercel's Install Command with
`npm install && npx playwright install --with-deps chromium`. Vercel
deployment `7ASCRCpxe` of `dev`@`5335c56` failed in 4 s during install
(build region `iad1`, Vercel CLI 59.11.7). Log:

```
Running "install" command: 'npm install && npx playwright install --with-deps chromium'...
BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu24.04-x64 as a fallback.
Installing dependencies...
sh: line 1: apt-get: command not found
Failed to install browsers
Error: Installation process exited with code: 127
Error: Command "npm install && npx playwright install --with-deps chromium" exited with 1
```

**Outcome.** Vercel's build container cannot install the browser — there is
no `apt-get`, so Playwright's fallback dependency install has nothing to run
against. The D-22 split stands: GitHub's `verify` job runs the full command
including the axe scan; Vercel's Build Command runs the same script with the
two `vercelExcluded` steps removed by `VERCEL=1`. Because the install
failed, nothing here widens Vercel's Build Command — RESEARCH.md
Assumptions Log A1 is resolved against the assumption it was testing: the
GitHub Actions / Vercel split for the browser-dependent steps is required,
not optional.

The Install Command has been restored to its default. Evidence: the
subsequent rebuild of `5335c56` went Ready in 47 s, and its Preview URL
`https://novatek-capture-demo-m2s1xdgn0-matthew-ks-projects-ab449c33.vercel.app/`
probed clean (`node scripts/check-deployment.mjs`, exit 0).

## Deviation fixes made while producing this evidence

Two bugs were found and fixed during this plan's execution. Both are Rule 1
deviations of plan 01-09, recorded here and to be carried into
`01-09-SUMMARY.md`:

1. `293fa89` — fix(01-09): end check-wcag's server as a process group, not
   one shell pid. Found because GitHub Actions run 34196058170
   (ubuntu-latest) hung for 46 minutes after `check-wcag` printed
   "Problems: 0": `spawn("npx", ["next","start"], {shell:true})` made
   `serverProcess.pid` the shell's pid, `process.kill(pid)` ended only the
   shell, and the orphaned `next start` kept the piped stdout open. Fix:
   `scripts/lib/server.mjs` (`startServer`/`stopServer`, no shell,
   `detached: true`, process-group SIGTERM/SIGKILL on POSIX, `taskkill /T
   /F` on win32) plus fixture test `scripts/lib/server.test.mjs`. Proven by
   run 34201360044 (success, 1m09s, "All steps exited 0").
2. `5335c56` — fix(01-09): prove grandchild teardown with a heartbeat, not a
   pid probe. Found because Vercel deployment `8FN8Kb43W` of `dev`@`293fa89`
   failed in 21 s: the fixture asserted `process.kill(pid, 0)` throws for
   the killed grandchild, but Vercel's build container has no reaping init,
   so the zombie still answered; GitHub's runner reaps and passed. Fix:
   heartbeat-file proof plus zombie-aware `isAlive` via `/proc/<pid>/stat`.
   Proven by GitHub run 34206298478 (success) and by Vercel's rebuild of
   `5335c56` going Ready in 47 s once the Install Command was restored.

## Production-promotion facts — 2026-09-08

The developer promoted the `5335c56` rebuild to Production from the
dashboard at 09:44:06Z (GitHub deployment 6324899062, environment URL the
`m2s1xdgn0` deployment). The `verify` check on `5335c56` had passed at
08:47:19Z, so the gate admitted it.

`node scripts/check-deployment.mjs --url https://novatek-capture-demo.vercel.app/`
exits 0: "Publicly reachable, correctly headed, and carrying the
undismissable ribbon."

`origin/main` is still the seed commit `ddfdabe`; local `main` =
`origin/dev` = `5335c56` as of this writing. Two dashboard redeploys of the
seed commit sat at "Running Checks" because no `verify` check exists for
`ddfdabe`; the developer cancelled both.

Dashboard facts: Hobby plan; Framework Preset shows "Other" (deploys work
because `vercel.json` declares `"framework": "nextjs"`).

`NEXT_PUBLIC_BUILD_ID` in the Preview build log: not confirmed by the
developer at either checkpoint, and not independently observed here — this
artefact records the deployment-gate mechanics, not the served HTML.
Recorded as not confirmed.

## Automated checks — run on `main` (= `origin/dev` = `5335c56`), 2026-09-08

- `node --test scripts/check-governed.test.mjs`: exit 0. 7 tests, 7 pass, 0
  fail.
- `npm run verify`: exit 0. All fifteen steps — including
  `check-wcag-self-test` and `check-wcag` — exited 0; log ends "All steps
  exited 0."
- `node scripts/claims-audit.mjs`: exit 0. "Scanned: app, components, lib
  Rules: 26 / Hits: 0 | live violations: 0 | quoted-as-retired: 0."
- `npx eslint .`: exit 0, no output.

## Open items

- ~~The throwaway branch `throwaway/red-check-demo` (commit `9884a9a`) is
  still present on GitHub as of this writing.~~ Resolved 2026-09-08: the
  branch is deleted, confirmed both on GitHub (`gh api
  repos/MattSlayed/novatek-capture-demo/branches/throwaway%2Fred-check-demo`
  now returns 404) and locally (no matching refs). It was never merged —
  its one commit's parent (`5335c56`) never appears in `origin/dev`'s or
  `origin/main`'s history. Task 2's acceptance criterion on branch deletion
  is closed.

---

Recorded 2026-09-08.
