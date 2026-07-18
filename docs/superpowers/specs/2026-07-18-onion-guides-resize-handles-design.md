# Onion Guides And Resize Handles

## Goal

Let users resize a selected sigil by dragging its corner handles and trace a reusable circle shown underneath their drawing.

## Interaction

- The selection tool and right click continue to select the topmost sigil.
- Dragging inside the selection moves it; dragging one of its four corners resizes it proportionally around its center.
- A new Guides drawer offers Library and My examples views.
- Library guides use the existing reference crops in `assets/library-schematics/`.
- Personal guides are snapshots of the current vector actions, saved locally in the browser.
- The active guide is drawn below all user actions, can be hidden, cleared, and faded with an opacity slider.
- A Save as example command sits beside Archive PNG. Personal examples can be deleted.

## Data And Safety

- Personal examples store sanitized drawing actions only, never activation state or runtime objects.
- Storage is bounded to 24 examples and malformed data is ignored.
- Guides are excluded from PNG export and spell calculations.
- Resizing is clamped to the existing 12-120 size range and creates one undo history entry.

## Visual Direction

The drawer follows the existing parchment, navy, and gold visual language. Library cards use the real cropped circle images; active cards receive a clear gold outline. The guide is an onion-skin layer rather than an editable drawing action.
