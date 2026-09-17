/* ================================================================
   FIXTURES — the version and the pinned content hash (D-13, D-14,
   D-15, AD-6)

   `FIXTURE_VERSION` is the authored plane's own version, in the
   sibling's shape (`plant.ts`'s SCENE_VERSION = "ref-plant/2026.07.3"
   is the model). It is never derived from, equal to, or formatted
   like the deployment identifier a production build resolves from
   the git commit that shipped it — those two identifiers name
   different things and must never be able to collide or be
   mistaken for one another. It lives here rather than in `lib/limits`
   because it is not a bounded quantity; P3 may re-export it from
   there if a client reader ever needs a single import (D-15).

   `FIXTURE_CONTENT_SHA256` is the SHA-256 hex digest over the four
   fixture files below, in this fixed order:

     Files:          lib/data/plant.ts, lib/data/artisans.ts,
                     lib/data/orders.ts, lib/data/observations.ts
     Normalisation:  each file read as UTF-8, every "\r\n" replaced
                     with "\n" before hashing (RESEARCH Pitfall 2) —
                     without this a Windows workstation
                     (core.autocrlf=true) and GitHub Actions/Vercel
                     (both LF) would hash different bytes from the
                     same commit and the pin would prove nothing
     Pin cut:        2026-09-17, after the FR-21a provenance
                     checkpoint (02-06) signed off observations.ts
     Pinned SHA-256: 3a4cdbb9f9552f4cd7c3fe2f205224c22ac6a6138e7b58bb32bd08be4c4f9717

   Fixture content cannot change without this pin being re-cut and
   FIXTURE_VERSION bumped in the same commit — scripts/check-fixture-
   hash.mjs recomputes this digest on every verify run and fails,
   naming both digests, the moment they disagree.

   `types.ts`, `register.ts` and this file itself are outside the
   hash: shape is not content, and a file that names the pin cannot
   also be inside what it pins.
   ================================================================ */

export const FIXTURE_VERSION = "capture-fixtures/2026.09.1";

export const FIXTURE_CONTENT_SHA256 =
  "3a4cdbb9f9552f4cd7c3fe2f205224c22ac6a6138e7b58bb32bd08be4c4f9717";
