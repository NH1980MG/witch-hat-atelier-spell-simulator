# Symbol Fidelity Redesign

Date: 2026-07-16

## Objective

Audit every editable sigil and sign against the three user-provided reference
boards and correct every drawing that does not match its identified reference.
The public application must continue to use original, clean vector
reconstructions rather than embedded screenshots or traced manga panels.

## Sources

Primary visual references:

- user board `Main Spell`, containing the principal sigil grid;
- user board containing the simple sign grid;
- user board `Auxiliary Spell`, containing auxiliary signs;
- the existing private captures in
  `/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/`.

Identification and terminology references:

- `https://witchhatatelier.telepedia.net/wiki/Magic`;
- `https://witchhatatelier.telepedia.net/wiki/Sigils_Explained`;
- `https://witchhatatelier.telepedia.net/wiki/Signs_Explained`.

The wiki is used to identify names, categories and documented functions. The
user boards are the visual authority for the drawings requested in this pass.

## Selected Approach

Each glyph will be reconstructed manually as one or more SVG paths in the
existing 48 by 48 coordinate system. Automatic image tracing is rejected
because it introduces noisy contours and inconsistent line weight. Shipping
cropped reference images is rejected because it would make the editor raster-
dependent and would publish copyrighted source material.

## Mapping Rules

1. Build a complete audit table for the 26 editable sigils and 38 simulator
   signs before replacing paths.
2. Identify a glyph by its wiki name, category and position on the supplied
   boards. Visual resemblance alone is not sufficient when several signs share
   simple strokes.
3. Mark each catalogue entry as `confirmed`, `corrected` or `unresolved`.
4. Correct all confirmed mismatches. Keep an existing path unchanged when the
   supplied material cannot identify it reliably; do not invent a substitute.
5. Keep sigils, signs and auxiliary signs distinct even when their shapes are
   similar.
6. Preserve intentional orientation. Directional signs are stored in their
   canonical orientation and rotated only by placement logic.

## Reference Storage

The three supplied boards will be copied into the existing private
`Whitch hat` research folder with stable descriptive filenames. They will not
be added to the public Git repository or deployment artifact. The catalogue's
reference metadata will identify the board and cell used for each confirmed
vector reconstruction.

## Code Changes

- Replace mismatched paths in `symbol-catalog.mjs`.
- Replace generated or ambiguous provenance identifiers with stable board-cell
  identifiers where a supplied capture confirms the drawing.
- Keep the picker, canvas, recognition previews and 3D rendering on the same
  shared paths.
- Update recognition fixtures only after the corrected visual vocabulary is
  fixed; mechanics and spell effects remain unchanged by this visual pass.
- Add an audit report listing every catalogue entry and its result.

## Validation

- All 64 simulator glyph names still expose non-empty vector paths.
- All 64 drawings remain unique unless the references explicitly show the same
  symbol serving two named roles.
- Every corrected entry has a private reference board and cell identifier.
- SVG paths fit the 48 by 48 view box without clipping.
- The symbol picker, placed canvas symbol and recognition preview show the same
  path data.
- Existing spell mechanics, the 38,532-variant matrix and bilingual content do
  not regress.
- Automated tests run before and after the path replacements.
- Desktop and mobile browser screenshots verify line weight, centering,
  legibility and absence of overflow.

## Completion Boundary

This pass is complete only when all confidently identifiable mismatches in the
three boards are corrected and the audit explicitly lists any unresolved
entries. It does not claim that undocumented glyphs have canonical names or
effects.
