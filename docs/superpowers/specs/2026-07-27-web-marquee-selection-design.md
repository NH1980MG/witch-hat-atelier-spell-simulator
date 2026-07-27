# Web Marquee Selection Design

## Objective

Extend the web simulator's existing right-click glyph selection so players can
select one or more placed sigils, signs, circles, and rings without switching
tools manually.

## Interaction

- A right-click without dragging selects the topmost eligible action under the
  pointer.
- Holding the right mouse button and dragging from empty parchment displays a
  rectangular marquee.
- Every eligible action whose bounds intersect the marquee becomes selected.
- Right-clicking empty parchment without dragging clears the selection.
- The browser context menu remains disabled over the drawing canvas.
- Tracing guides and onion-skin examples are never included in this selection.
- Freehand strokes, rays, and spirals remain controlled by their existing
  drawing, eraser, undo, redo, and clear operations.

Eligible action types are `glyph`, `circle`, and `ring`. Both sigils and signs
are represented by `glyph` actions.

## Selected Group

- A dashed shared bounding box surrounds all selected actions.
- Four corner handles are visible.
- Dragging inside the shared bounds moves every selected action by the same
  offset while respecting the parchment boundary.
- Dragging a corner handle scales the group proportionally around the opposite
  corner.
- Group scaling updates glyph positions and sizes, and circle/ring centers and
  radii.
- Delete or Backspace removes all selected actions.
- Escape clears the selection without modifying the drawing.
- Toolbar grow and shrink buttons scale the full selection proportionally.

## History and State

`state.selectedActionIndices` replaces the single `selectedGlyphIndex` as the
authoritative selection. Selection-only changes are not recorded in history.
Each completed move, resize, toolbar scale, or deletion records exactly one
undo snapshot. Undo, redo, loading, and clearing reset the selection.

Indices are normalized, unique, sorted, and filtered whenever actions are
removed or restored. Rendering and controls must tolerate an empty selection.

## Geometry

Pure helpers live in `symbol-interactions.mjs`:

- test rectangle intersection;
- compute combined bounds;
- find the topmost eligible action;
- find all eligible actions intersecting a marquee;
- translate a selected action;
- proportionally scale a selected group.

The marquee uses drawing coordinates after the canvas pan/zoom transform, so
selection behavior is stable at every zoom level.

## Accessibility and Localization

Status messages report zero, one, or multiple selected elements in French and
English. Existing keyboard deletion and Escape behavior remain available.
Pointer cursors distinguish marquee creation, movement, and corner resizing.

## Validation

- Unit tests cover intersection, eligibility, topmost selection, marquee
  selection, combined bounds, group movement, and proportional scaling.
- Integration tests verify right-button pointer handling and the absence of
  guide selection.
- Existing JavaScript and localization tests must continue to pass.
- A browser smoke test verifies click selection, drag marquee, group movement,
  group resizing, deletion, undo, zoomed selection, and guide exclusion.

## Distribution

This web change follows the project's normal publication rule. Minecraft mod
files remain local and are not included in the web commit or publication.
