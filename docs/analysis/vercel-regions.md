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

---

Recorded 2026-09-08.
