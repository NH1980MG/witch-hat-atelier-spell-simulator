# Responsive Grimoire Design

## Goal

Keep the drawing workshop usable on phones, iPad mini, standard iPad, and desktop without letting controls consume the drawing area.

## Interaction

- At viewport widths up to 1180 px, the Grimoire is a bottom sheet controlled by one persistent handle.
- The sheet starts collapsed on compact screens, can be expanded or collapsed by touch, mouse, or keyboard, and exposes its state through `aria-expanded`.
- The open state is stored locally. Its content scrolls independently while the canvas remains visible.
- Above 1180 px, the existing desktop footer remains fully visible and the handle is hidden.

## Responsive Layout

- Phone widths use two command columns, one settings column, compact navigation, and safe-area padding.
- Tablet portrait uses two settings columns; tablet landscape uses three where space permits.
- The simulator uses dynamic viewport height and avoids the current fixed 720 px workspace minimum.
- Tool and drawer controls retain a minimum 44 px touch target.

## Verification

Automated tests assert the accessible toggle, responsive breakpoint, bottom-sheet states, safe-area support, and phone/tablet grids. The full existing test suite must remain green.
