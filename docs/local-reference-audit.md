# Local Reference Audit

Audit date: 2026-07-14.

All 42 files in `Whitch hat/` were reviewed visually. They are private research
references (`publicUse: false`), not runtime assets and not a license to copy
the source artwork. The simulator uses original vector reconstructions and
procedural 3D effects.

## Inventory

| # | Local file suffix | Visible subject | Used to verify |
| --- | --- | --- | --- |
| 01 | `125359` | Different signs; sign balance | Column/Levitation distinction, balance |
| 02 | `125540` | Sign rotation, ring, inversion | orientation, closure, inversion |
| 03 | `125618` | Linked spells | linked formula behavior |
| 04 | `125652` | Nested glyphs, spell toggling | nested/connected execution |
| 05 | `125849` | Sign inversion | inversion limits and uncertainty |
| 06 | `125940` | Spell toggling, Glaives | activation boundary, depth sign |
| 07 | `130033` | Spell catalogue overview | category and naming policy |
| 08 | `130049` | Fire spells | fire formula examples |
| 09 | `130116` | Water spells, first group | water formula examples |
| 10 | `130135` | Water spells, continuation | Water Cage and Water Rose |
| 11 | `130226` | Earth spells | earth formula examples |
| 12 | `130246` | Wind spells | wind, puppet and shoe examples |
| 13 | `130313` | Light spells | light and projection examples |
| 14 | `130336` | Crystal spells | crystal structure examples |
| 15 | `130400` | Time spells | Repetition as central sigil |
| 16 | `130434` | Vision and mixed spells | concealment and mixed formulas |
| 17 | `130504` | Niche spells, first group | niche formula classification |
| 18 | `130520` | Niche spells, continuation | niche/unknown formula classification |
| 19 | `130547` | Unknown and ancient spells | uncertainty policy |
| 20 | `130603` | Ancient forbidden spells | restricted formula boundary |
| 21 | `130639` | Ancient non-forbidden spells | historical formula examples |
| 22 | `131215` | Sign categories | directional/semi/non/asymmetric classes |
| 23 | `131258` | Column | exact shape and imbalance behavior |
| 24 | `131324` | Dispersion | exact shape and leaking behavior |
| 25 | `131350` | Levitation | exact arrow and carrier behavior |
| 26 | `131511` | Pull | double arrow, attraction and rotation |
| 27 | `131529` | Crush | zigzag, earth-only confirmed behavior |
| 28 | `131606` | Puppet and Float | crown-ring and twin-wave drawings |
| 29 | `131646` | Region | chevron, sector and orientation behavior |
| 30 | `131711` | Convergence, Collection, Billow | triangle, open hourglass and clover |
| 31 | `131740` | Repetition, Stretch, Coil, Cool | exact shapes and material restrictions |
| 32 | `131802` | Strengthen, Focus, Entwine | exact shapes and roles |
| 33 | `131850` | Sign of Wind, Aeriforms Defined, Gather | exact shapes; uncertain semantics |
| 34 | `131920` | Glaives, Solidify, Bind | exact shapes and state/depth roles |
| 35 | `131948` | Envelop, Conceal, Reflect | exact shapes and illusion relations |
| 36 | `132010` | Diamond, Window, Enlarge | nearby/carrier targeting and resize |
| 37 | `132038` | Crosshair | exact cross shape; uncertain targeting |
| 38 | `132100` | Radial, Bolt, Rain | exact shapes and form/power roles |
| 39 | `132128` | Orb, Purify | exact shapes and containment/filtering |
| 40 | `132156` | Link, Stillness | woven link and static-hold shapes |
| 41 | `132216` | Project | outward projection shape |
| 42 | `oiu.png` | Rotation and ring notes | rotation reach and ring-only discharge |

The `Local file suffix` is the final timestamp in the corresponding
`Opera Instantane...witchhatatelier.telepedia.net.png` filename. This shorter
form keeps the table readable while preserving an unambiguous match.

## Audit Decisions

- The menu, placed glyph, canvas rendering and 3D ink all use the same paths
  from `symbol-catalog.mjs`.
- Every one of the 47 catalogue entries now has a `SYMBOL_REFERENCE_SUFFIX`
  pointing to the local capture used for its visual review. The validation
  script rejects a drawing without a reference or an exact duplicate drawing.
- The 2026-07-14 shape pass corrected seven visible divergences: Repetition's
  eye, Glaives' shallow fork, Envelop's straight stem and end hooks, Enlarge's
  triple corner brackets, Rain's concave frame and orthogonal rays, Purify's
  inward spiral hook, and Stillness' opposed forks with two crossbars.
- The elemental sigils were checked again in the spell catalogue captures:
  Fire is the stemmed triangle, Water the flowing S with two drops, Earth the
  barred diamond with side points, Wind the curled S with lateral strokes,
  Light the square-diamond star, and Crystal the crossed lattice.
- `radial` orientation is separate from physical `directional` behavior.
  Semi-directional signs can face inward without becoming movement vectors.
- `Crush` is confirmed for earth only. Other materials remain an explicitly
  marked interpretation.
- Diamond, Window, Crosshair, Sign of Wind, Glaives and Reflection remain
  medium/low-confidence where the references do not establish a complete rule.
- Unknown freehand marks stay unknown; they are never silently renamed to a
  convenient sign.
- Newer documented forms take precedence when early spell diagrams conflict.

## Public Release Rule

Do not publish `Whitch hat/`, `assets/reference-panels/`, or copied spell crops
as public application assets. Keep links and research notes, and ship only the
project's original vectors, interface, and procedural animation.
