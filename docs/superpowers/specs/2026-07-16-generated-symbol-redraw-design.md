# Generated Symbol Redraw Design

## Scope

Replace the existing drawings for `Vent sous pied`, `Vent`, `Aeriforme`, and
`Eau` with clean vector reconstructions based on the user-provided reference
and the generated style sheet. Keep names, spell behavior, drag-and-drop, and
recognition unchanged.

## Architecture

`SYMBOL_PATHS` remains the only drawing source. Both symbol drawers, the drag
ghost, the parchment renderer, and the 3D renderer continue consuming those
same paths, so no duplicated artwork or behavior is introduced.

## Verification

Automated tests pin the four revised path signatures and the cache version.
Browser verification checks that both drawers and a dropped symbol render the
same revised geometry.
