# Shoe Support And Selection Tool Design

## Objective

Improve the flying-shoe support so the pair reads clearly as shoes from the
underside view, and correct the Earth effect so no geometry floats unsupported
above the desk. Add an explicit selection tool for placed sigils and signs,
using the direct manipulation conventions of a visual editor.

These changes ship with the bilingual interface in the same public release.

## Selection Tool

### Toolbar

- Add a cursor-arrow button as the first drawing tool.
- Keep the pen as the initial active tool so existing drawing behavior does not
  change unexpectedly.
- Translate the tool name, tooltip, status messages, and accessibility label in
  English and French.
- Use the same fixed tool-button dimensions as the existing toolbar.

### Interaction

- With Selection active, pressing a placed glyph selects the topmost glyph at
  that point.
- Selection applies to both central sigils and modifier signs because both use
  the canonical `glyph` action type.
- Freehand strokes, circles, rings, rays, and spirals are not selectable in
  this release.
- Dragging a selected glyph moves it while preserving its size, rotation,
  canonical element ID, and recognition role.
- The complete glyph must remain inside the drawing limit. Movement clamps to
  that limit instead of allowing a partial glyph outside the parchment.
- A pointer press on empty canvas clears the selection.
- `Escape` clears the selection.
- `Delete` and `Backspace` remove the selected glyph when focus is not inside a
  form field.
- The existing `-` and `+` controls resize the selected glyph.
- Right-click and long-press selection remain as secondary shortcuts.
- A two-pointer gesture always keeps priority for panning the grid.

### History And Rendering

- A completed drag creates one undo history entry, regardless of the number of
  pointer-move events.
- Resize and deletion remain undoable and redoable.
- The selection indicator follows the glyph's actual center, size, and
  rotation.
- The indicator is visible on the editing canvas but hidden while exporting a
  PNG and while rendering the ritual in 3D.
- Changing language rerenders selection status text without changing the
  selected action.

## Shoe Model

Keep the support procedural and local to Three.js. Do not add a downloaded 3D
model or a copied reference asset.

Each shoe contains recognizable layers:

- a rounded outsole with a darker edge and shallow tread segments;
- a shaped toe rather than a sphere intersecting a box;
- an instep that slopes from toe to ankle;
- a separate heel block;
- an ankle opening and cuff with visible interior depth;
- side panels, piping, seams, and three lace crossings;
- a small paper patch fixed flat under each sole;
- the magic mark on the patch, visible from the underside camera.

The pair uses real-world proportions. Both shoes share the same length and
width, mirror their side details, sit parallel with a natural gap, and remain
small relative to the desk objects. The support camera frames the complete
pair, the paper patches, and the effect below them.

## Grounded Earth Effect

The desk surface is the physical origin for Earth support geometry.

- The mound's lowest point is always exactly at `THREE_TABLE_SURFACE_Y` plus a
  minimal z-fighting offset.
- Growth changes the mound height and upper profile only; its base does not
  translate upward.
- The shoes' support group follows the mound's top so the soles remain visibly
  supported.
- The mound is wider at the desk and narrows toward the shoes.
- Irregular rock lobes and small stones break up the current single-cylinder
  silhouette while preserving a stable base.
- The paper remains attached under the soles and does not intersect the mound.
- Earth without a lifting sign grows a low grounded support. Directional or
  lifting combinations may make it taller, but never detach it from the desk.
- When the spell ends, the animation stops with the rest of the active spell.

## Geometry Boundary

Extract small DOM-free helpers into `support-geometry.mjs`:

- calculate a clamped glyph position from canvas limits;
- calculate the Earth mound height from normalized spell progress;
- return the mound base, mound top, and shoe support height from one shared
  pose function.

The renderer consumes these values instead of duplicating numeric heights.
This keeps the table, mound, paper, and shoes on one coordinate model.

## Failure Handling

- A selection drag cancelled by the browser restores the glyph's original
  position and creates no history entry.
- Switching tools during a drag cancels the drag safely.
- Deleting an action updates the selected index and spell state immediately.
- Missing support geometry falls back to the no-support scene without throwing.
- Invalid animation progress is clamped to the range from zero to one.

## Testing

Automated tests verify:

- the Selection tool exists as the first tool and the pen remains initially
  active;
- only glyph actions can be selected;
- glyph movement clamps the complete symbol within the drawing limit;
- a drag produces one history snapshot;
- deletion, resize, undo, and redo preserve action data;
- the selection indicator is excluded during PNG export;
- every new Selection message exists in English and French;
- the Earth mound base equals the desk surface for progress values 0, 0.5, and
  1;
- mound height grows monotonically;
- shoe support height equals the mound top plus the intended sole clearance;
- all returned geometry values are finite.

Browser verification covers mouse and touch-sized viewports. It selects,
moves, resizes, deletes, undoes, and redoes one sign. The 3D verification uses
the shoe support with Earth and confirms through a screenshot and canvas-pixel
check that the shoes are recognizable, the paper is under the soles, the mound
touches the desk, and the scene is nonblank.

## Release

After all automated and browser checks pass, copy the public files to the
history-clean public repository, push its `main` branch, wait for GitHub Pages,
and verify the deployed site in both languages. Private screenshots and study
material remain only in the private repository.
