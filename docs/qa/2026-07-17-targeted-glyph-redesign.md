# Targeted Glyph Redesign QA

Date: 2026-07-17

## Scope

This pass corrected ten shared 48 by 48 vector drawings used by the symbol
picker, placed glyphs, recognition previews and 3D spell rendering. Private
screenshots remain outside the public repository.

| Catalogue name | Kind | Visual source | Result |
| --- | --- | --- | --- |
| Aeriforme | Sigil | `reference-09-air-sigils` | Corrected |
| Repetition | Sigil | `reference-08-repetition` | Corrected |
| Fumee | Sigil | `reference-01-crystallize-smoke` | Corrected |
| Sangsue-valance | Sigil | `reference-02-valance-frillram-sword` | Corrected |
| Frillram | Sigil | `reference-02-valance-frillram-sword` | Corrected |
| Cerf-torche | Sigil | `reference-03-scalewolf-torchstag-liongoat` | Corrected |
| Chat-hibou | Sigil | `reference-04-owlcat-head-scalewolf` | Corrected |
| Cheval | Sigil | `reference-05-dragon-flower-horse` | Corrected |
| Aeriforme defini | Sign | capture `131850` and user signs board | Corrected |
| Purification | Sign | capture `132128` and user signs board | Corrected |

## Reference Boards

The supplied main-spell, signs and auxiliary-spell boards were archived in the
private `Whitch hat` research folder. Existing generated boards 02 through 05
already cover all eight requested central sigils, so no additional generated
board was needed for this batch.

## Verification

- Exact path regression coverage exists for all ten corrected glyphs.
- Desktop inspection at 1280 by 720 confirmed readable, unclipped cards.
- Mobile inspection at 390 by 844 confirmed readable labels and icons.
- The public cache key was advanced to `20260717-reference-glyphs-v2`.
- Mechanical confidence labels remain independent from drawing fidelity.

