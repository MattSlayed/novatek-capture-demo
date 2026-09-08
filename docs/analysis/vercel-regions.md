# Vercel regions and Task 1 settings confirmation

Dated artefact (D-25), not prose. Records the live Vercel region list as
re-read on the date below, the three dashboard-only settings the developer
confirmed for the linked project (`prj_5Lq54q2Ck6UkqzzabQoMC9MreI1V`), and
both Preview probe results from `scripts/check-deployment.mjs`.

## Region list, re-read 2026-09-08

Source: `https://vercel.com/docs/regions`, fetched directly with `curl` on
2026-09-08 (HTTP 200). The full region table as read:

| Region code | AWS equivalent |
|---|---|
| `arn1` | `eu-north-1` |
| `bom1` | `ap-south-1` |
| `cdg1` | `eu-west-3` |
| `cle1` | `us-east-2` |
| `cpt1` | `af-south-1` |
| `dub1` | `eu-west-1` |
| `dxb1` | `me-central-1` |
| `fra1` | `eu-central-1` |
| `gru1` | `sa-east-1` |
| `hkg1` | `ap-east-1` |
| `hnd1` | `ap-northeast-1` |
| `iad1` | `us-east-1` |
| `icn1` | `ap-northeast-2` |
| `kix1` | `ap-northeast-3` |
| `lhr1` | `eu-west-2` |
| `pdx1` | `us-west-2` |
| `sfo1` | `us-west-1` |
| `sin1` | `ap-southeast-1` |
| `syd1` | `ap-southeast-2` |
| `yul1` | `ca-central-1` |

`cpt1` is confirmed present on the current plan, listed as "Cape Town, South
Africa (`cpt1`)", AWS equivalent `af-south-1`. This is the region declared in
`vercel.json`'s `regions` array.

## Vercel project settings — confirmed 2026-09-08

The developer reported all three settings confirmed on 2026-09-08:

1. **Deployment Protection.** Settings -> Deployment Protection -> Vercel
   Authentication: turned off. Verified independently below — the probe
   found no `_vercel/sso` redirect on either Preview address.
2. **System Environment Variables.** Settings -> Environment Variables ->
   "Automatically expose System Environment Variables": ticked. This is
   what makes `VERCEL_GIT_COMMIT_SHA` resolve during the build, so
   `NEXT_PUBLIC_BUILD_ID` is a real commit and `next.config.ts` does not
   throw (D-03).
3. **`CAPTURE_SESSION_KEY`.** Confirmed present on Production and Preview
   (developer-confirmed 2026-09-08). Value not recorded here or anywhere
   else.

**Build-id status:** not confirmed by the developer at checkpoint 1. The
Preview build log's `NEXT_PUBLIC_BUILD_ID` resolving to a commit sha (rather
than the `dev` fallback) is still an open item — the developer has not
reported it, and neither the served HTML nor the response headers checked
here expose it. This is re-asked in plan 01-09 Task 2's checkpoint.

## Preview probe results

### First attempt — failed, 2026-09-08

`node scripts/check-deployment.mjs --url https://novatek-capture-demo-git-dev-mattslayed.vercel.app`
exited 1. Vercel answered with HTTP 404 and header
`X-Vercel-Error: DEPLOYMENT_NOT_FOUND`. Cause: the hostname used the wrong
team slug (`mattslayed` instead of the linked project's actual team slug,
`matthew-ks-projects-ab449c33`) — not a real deployment on this project. No
artefact was written from this attempt.

### Deployment URL — passed, 2026-09-08

```
node scripts/check-deployment.mjs --url https://novatek-capture-demo-7uceqbpcf-matthew-ks-projects-ab449c33.vercel.app/
```

Exit code: 0.

```
DEPLOYMENT CHECK
========================================================================
Checked: https://novatek-capture-demo-7uceqbpcf-matthew-ks-projects-ab449c33.vercel.app/
Final URL: https://novatek-capture-demo-7uceqbpcf-matthew-ks-projects-ab449c33.vercel.app/
Problems: 0

Publicly reachable, correctly headed, and carrying the undismissable ribbon.
```

Every assertion held: no `_vercel/sso` redirect (Deployment Protection is
off), final status 200, all five declared headers present by exact value
(`Permissions-Policy: camera=(self), microphone=(self)`, `X-Frame-Options:
SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Strict-Transport-Security:
max-age=31536000; includeSubDomains`), the ribbon landmark
(`aria-label="Preview disclosure"`) and sentence present, no dismissal
control found.

An independent read-only `curl -sI` of the same URL, run by the orchestrator
before this task resumed, corroborated the same result: `HTTP/1.1 200 OK`,
the same `Permissions-Policy` and `Strict-Transport-Security` values, and
`X-Frame-Options: SAMEORIGIN`.

### Branch alias — passed, 2026-09-08

The durable Preview address for the `dev` branch, with the correct team
slug, also probed clean:

```
node scripts/check-deployment.mjs --url https://novatek-capture-demo-git-dev-matthew-ks-projects-ab449c33.vercel.app/
```

Exit code: 0. Same assertion summary as the deployment-URL probe above:
no Deployment Protection redirect, final status 200, all five headers by
exact value, ribbon landmark and sentence present, no dismissal control.

### `origin/dev` at probe time

`git fetch origin dev` (read-only) followed by `git log origin/dev -1`
shows `origin/dev` at commit `56a419c685bb278f89e31b8bcbcaddbf916dc6a1`
("docs(01-08): complete scaffold-conventions plan 08"), authored
2026-09-07T22:31:21+02:00. Both Preview addresses above serve this commit
or a later one pushed to `dev` since; the developer did not report a
different commit at the time of settings confirmation.

## Preview addresses recorded

- Deployment URL (per-deployment, will change on the next push):
  `https://novatek-capture-demo-7uceqbpcf-matthew-ks-projects-ab449c33.vercel.app/`
- Branch alias (durable Preview address for `dev`):
  `https://novatek-capture-demo-git-dev-matthew-ks-projects-ab449c33.vercel.app/`

## Production — 2026-09-08

Production URL: `https://novatek-capture-demo.vercel.app/` (also reachable
at `https://novatek-capture-demo-matthew-ks-projects-ab449c33.vercel.app/`).

The developer merged `dev` into `main` (fast-forward; local `main` =
`origin/dev`). `origin/main` now sits at `50a246c` ("docs(01-09): record the
deployment-gate evidence for Task 2"). GitHub Actions run 34214635320
(`verify` on `main`@`50a246c`) completed success at 10:18:27Z, "All steps
exited 0"; the GitHub check `verify` on `50a246c` reports success. Vercel
promoted the corresponding production deployment two seconds later:
GitHub deployment 6325456468, environment Production, created 10:18:29Z,
status success "Deployment has completed", environment URL
`https://novatek-capture-demo-b7ftuva6d-matthew-ks-projects-ab449c33.vercel.app`.
This is the first production deployment of the Phase 1 tree promoted from a
push to `main` through the registered `verify` Deployment Check. (Earlier
the same day, at 09:44:06Z, the developer had promoted the `5335c56`
rebuild to Production directly from the dashboard — deployment 6324899062,
recorded in `docs/analysis/deployment-gate.md` — after `verify` had passed
on that commit; that was the first production promotion of the day, and the
10:18 one above is the first triggered by a `main` push.)

`node scripts/check-deployment.mjs --url https://novatek-capture-demo.vercel.app/`
re-run 2026-09-08 (after the checkpoint approval): exit 0.

```
DEPLOYMENT CHECK
========================================================================
Checked: https://novatek-capture-demo.vercel.app/
Final URL: https://novatek-capture-demo.vercel.app/
Problems: 0

Publicly reachable, correctly headed, and carrying the undismissable ribbon.
```

A read-only `curl -sI` of the same URL, run by the orchestrator, shows
`X-Vercel-Id: cpt1::ls5qv-1788863142361-3295b5bfc43a` on the response — the
deployment reports region `cpt1` (Cape Town, `af-south-1`), matching
`vercel.json`'s declared `regions`. The same response carried the same five
declared header values the probe asserts (`Permissions-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Strict-Transport-Security`).

An orchestrator Playwright pass at the project's `MOBILE_PROFILE` viewport
(390x844) against production found the ribbon on both `/` and `/?s=limits`
at x=0, y=0, width 390, height approx 122px; ribbon paragraph computed
style: 13px "JetBrains Mono", color `rgb(170, 180, 192)` on section
background `rgb(12, 30, 53)`; ribbon text "Designed preview. Capture is
specified, not yet built. The plant, the people and every record here are
synthetic. READ THE FULL PREVIEW LIMITS"; the Limits surface shows the
heading "Preview limits", the eight sentences in declaration order and the
English-only sentence.

**Phone check — developer-reported, 2026-09-08.** The developer replied to
the Task 3 checkpoint: "approved, checked on iPhone and Android." On both
handsets the developer confirmed: the ribbon sentence renders above the
link; nothing in the ribbon can be dismissed; the ribbon scrolls with the
page; the link opens the Limits surface with all nine sentences (the eight
governed sentences and the English-only sentence) shown, with the ribbon
still present; and at 200% text size nothing hides or truncates. No handset
model or OS version was reported, and none is recorded here beyond
"iPhone" and "Android" as stated by the developer.

`NEXT_PUBLIC_BUILD_ID`: still not independently observed in served HTML at
this checkpoint and not reported by the developer; recorded as not
confirmed, consistent with `docs/analysis/deployment-gate.md`.

---

Recorded 2026-09-08.
