# Canvas Context Menu And Zoom Design

## Objective

Make canvas objects behave like Scratch sprites: a short right-click targets one
specific object and opens a compact action menu, while resize handles and canvas
zoom remain independent interactions.

## Interaction

- A short right-click on a selectable action selects only the topmost action
  whose actual stroke or glyph bounds are hit.
- The menu offers Select, Duplicate, Delete, Bring to front, and Send to back.
- Right-dragging the targeted object moves only that object. Right-dragging from
  empty parchment keeps the existing marquee selection.
- The menu closes on Escape, an outside pointer press, resize, scroll, or action.
- Menu commands reuse the existing history, duplication, deletion, rendering,
  spell-state, and localization paths.

## Geometry And Scale

- A right-click never preserves an older group merely because the newly hit
  object was already inside that group.
- Glyph, guide, and group resize operations keep their minimum positive size but
  have no upper size cap.
- Browser trackpad pinch (`wheel` with `ctrlKey`) changes canvas view scale.
  Ordinary two-finger trackpad scrolling pans the canvas and never resizes a
  selected object.
- Two-finger touchscreen gestures pan and pinch the canvas around their midpoint.
- Canvas zoom has a 10% lower safety floor and no upper UI cap.

## Accessibility And Validation

The menu is a labelled `role="menu"` surface with native buttons, visible focus,
French and English labels, and Escape support. Unit tests cover unbounded scale
and layer ordering. Integration tests cover menu wiring and wheel/pinch routing;
the full suite and a browser smoke test protect drawing and selection behavior.
