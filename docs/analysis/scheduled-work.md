# Scheduled work — toolchain closures

Dated artefact, not prose (D-25). Two closures the toolchain owes; each states
what is deferred, why, what would let it close, and the evidence behind the
reason. Evidence for both items: `.planning/phases/01-scaffold-conventions/01-RESEARCH.md`,
produced by direct execution against the exact D-01 pins, dated 2026-09-05.

## Item 1 — the TypeScript 6/7 migration

**Deferred:** `typescript` is pinned at `5.9.3` in `package.json`, even though the
registry's `latest` is `7.0.2`.

**Why:** `typescript-eslint@8.69.0`'s peer range is `>=4.8.4 <6.1.0` — it does not
accept TypeScript 6 or 7. `typescript-eslint` is what `eslint-config-next/typescript`
pulls in (the one subpath of `eslint-config-next` this repository imports; see Item 2),
so the ESLint-10-compatible lint chain does not support TypeScript 6 or 7 yet. This is
the sourced reason for the TypeScript 5 exception recorded in `01-RESEARCH.md`
§Standard Stack.

**Closes when:** `typescript-eslint` publishes a release whose peer range admits
TypeScript 6.1 or later. The migration itself is then a pin bump (`typescript` to the
then-current release) plus a `tsc --noEmit` pass; `npm run verify` is the acceptance —
no separate migration test is needed.

## Item 2 — the ESLint 10 rule cleanup

**Deferred:** `eslint.config.mjs` composes `@next/eslint-plugin-next`
`configs["core-web-vitals"]`, `eslint-plugin-react-hooks@^7.1.1`
`configs.flat["recommended-latest"]` and `eslint-config-next/typescript` by hand,
rather than importing `eslint-config-next`'s own default export or its
`/core-web-vitals` subpath.

**Why:** `eslint-config-next`'s default export and `/core-web-vitals` subpath crash at
lint time under ESLint `10.9.1` — `eslint-plugin-react@7.37.5` calls the removed
`context.getFilename()`. Reproduced directly: installing the exact D-01 pins and
running `eslint .` for real throws `TypeError: contextOrFilename.getFilename is not a
function` on the first file linted (`01-RESEARCH.md` Pitfall 1).

Two rule sets are deliberately not installed, and why:

- `eslint-plugin-jsx-a11y@6.10.2` peer-caps at ESLint `^9`, and its coverage is
  materially exceeded by the axe scan (`scripts/check-wcag.mjs`) this phase already
  runs.
- `eslint-plugin-import` peer-caps below ESLint 10. Its maintained fork,
  `eslint-plugin-import-x@4.17.1`, is available if wanted (peer already includes
  `^10.0.0`) but is not required by any Phase 1 requirement.

**Closes when:** `eslint-config-next` ships an ESLint-10-safe default export. At that
point the hand-rolled composition in `eslint.config.mjs` can be replaced with the
package's own default export, and the two omitted rule sets above can be
reconsidered.

## Standing note — `npm ls`

`npm ls` reports `code ELSPROBLEMS` on this dependency graph, because
`eslint-plugin-react@7.37.5`'s peer range (`^3 || … || ^9.7`) does not admit ESLint
`10.9.1` — even though both `npm install` and `eslint .` succeed. `npm ls` must never
be added as a `verify` gate step expecting exit 0 on this graph. More generally: a
clean install that only produced `ERESOLVE overriding peer dependency` warnings is not
proof of runtime compatibility — the tool itself must be run for real, as `01-RESEARCH.md`
did.

---

Recorded 2026-09-05. Evidence: `01-RESEARCH.md`'s direct execution against the exact
D-01 pins (`typescript@5.9.3`, `eslint@10.9.1`, `eslint-config-next@16.3.4`,
`@next/eslint-plugin-next@16.3.4`, `eslint-plugin-react-hooks@^7.1.1`).
