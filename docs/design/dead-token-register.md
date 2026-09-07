# Dead-token register

No inherited token is ever deleted or edited (D-12). `app/styles/tokens.inherited.css`
is a byte-identical, CI-asserted copy of the parent design layer, and every
retired name in it survives unused. This register is the record of why each
one was retired — the reason a Capture surface never references it, not a
change to the file itself.

| Retired | Why it is retired | Superseded by |
|---|---|---|
| The inherited display/hero scale (the 3.05rem hero) | No display role exists in Capture (locked, DESIGN.md §Typography). The type scale compresses from both ends: the largest Phase 1 role is `screen-title` at 20px, and no surface in this product needs a hero-sized heading. | Nothing — the role is retired outright, not replaced. |
| Every inherited 8.5–11px size and its 0.35em tracking | Below the 13px floor this system enforces everywhere (CONTEXT.md D-15). Never referenced on the phone; the smallest Capture role is 13px (`label`, `eyebrow`, `figure`). | The 13px floor across all mono roles. |
| The 124px record target | Superseded by the measured `--target-record: 130px` (DESIGN.md §Dead-token register; the PRD's 124px figure does not carry forward). | `--target-record: 130px` in `app/styles/tokens.capture.css`. |
| The inherited light-ground tokens and `color-scheme: light` | No light theme exists in this product (D-14). `--navy-deep` is the universal page ground on every screen, with no user-preference branch that could select a different one. | `--navy-deep` (inherited, unchanged) as the sole ground. |
| The inherited `--good` / `--warn` / `--crit` tones, used as text inks | These tones do not clear this system's 7:1 text-contrast floor as inks (CONTEXT.md D-16, D-21). | `--dk-good`, `--dk-warn`, `--dk-crit` in `app/styles/tokens.capture.css`. |

None of the five rows above is a change to `app/styles/tokens.inherited.css` —
that file is unedited and re-hashed on every build by `scripts/check-tokens.mjs`.
This table exists so a later phase does not rediscover, and re-introduce, a name
this phase already decided not to use.
