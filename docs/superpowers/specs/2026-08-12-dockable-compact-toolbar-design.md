# Dockable Compact Toolbar Design

## Goal

Replace the oversized compact-tool background with a narrow vertical capsule that can be moved with mouse or touch, then docks to the nearest canvas edge.

## Behavior

- The compact toolbar shows only its handle, alignment control, and selection tool in one vertical column.
- Dragging starts from the handle. During the drag the capsule follows the pointer; on release it docks to the nearest left or right edge.
- The dock side and relative vertical position are stored locally and restored after reload or viewport rotation.
- Position clamping keeps the whole capsule inside the drawing workspace, below its top controls and above the grimoire.
- A click on the handle still expands or compacts the toolbar. A completed drag must not trigger that click.
- Pointer Events provide one implementation for mouse, touch, iPad, and phone.

## Rotation

Every selectable action keeps cumulative rotation metadata. The selection label converts that exact value to normalized degrees, so a 190-degree object rotated by +90 displays 280 degrees rather than a rounded quarter turn.

## Constraints

- Keep the existing plain HTML, CSS, and JavaScript architecture.
- Preserve all unrelated in-progress 3D changes in the working tree.
- Publish the verified result to the existing GitHub Pages branch.
