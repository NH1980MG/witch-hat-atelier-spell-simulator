# Unified Symbol Drawer Design

## Goal

Replace the separate "Sigils and signs" dictionary and "Symbols to place"
palette with one "Sigils and signs" drawer.

## Interface

The existing "Sigils and signs" island opens one drawer containing the current
classified symbol groups. Each card keeps its name, confidence or category,
selection behavior, keyboard placement, and Scratch-like pointer drag onto the
parchment. The separate placement island and drawer are removed.

## Behavior

Clicking a card prepares that symbol for the glyph tool. Dragging the same card
creates the existing transport ghost and drop preview. Closing the unified
drawer cancels an active drag. Details and Support remain mutually exclusive
drawers.

## Compatibility

The symbol catalogue, drawing actions, contextual selection, resizing, history,
translation keys, spell analysis, and 3D rendering remain unchanged. Tests must
prove that only one symbol drawer exists and that its cards start the established
drag pipeline.
