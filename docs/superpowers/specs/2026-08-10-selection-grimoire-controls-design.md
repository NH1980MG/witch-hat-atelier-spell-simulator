# Selection-aware grimoire controls

## Goal

Replace redundant drawing controls with selection-aware thickness, scale, and
ink color controls while keeping canvas zoom available when nothing is
selected.

## Behavior

- Remove the Spell force slider. Spell force is derived from the measured
  circle diameter, so a larger circle produces a stronger spell.
- Thickness edits every selected drawing action. With no selection, it sets
  the thickness used by newly drawn actions.
- Ink color edits every selected drawing action. With no selection, it sets
  the color used by newly drawn actions.
- Remove the toolbar shrink and grow buttons.
- The Scale slider is dual-purpose. With a selection, it starts at `0%` and
  reports the cumulative size difference from the moment that selection was
  made. With no selection, it controls canvas zoom and displays the existing
  `x1`-style value.
- The Scale slider recenters after each gesture, allowing repeated growth with
  no artificial upper size limit. Existing corner handles remain available.
- Each continuous slider gesture creates one undo step.

## Compatibility

Saved circles keep their existing action width and color fields. Older saved
spells containing intensity continue to load, but intensity no longer controls
the interface or spell strength.
