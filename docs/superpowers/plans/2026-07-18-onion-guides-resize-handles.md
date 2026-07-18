# Onion Guides And Resize Handles Implementation Plan

1. Add failing unit tests for rotated corner hit testing, proportional resizing, and bounded personal-guide persistence.
2. Add failing UI integration tests for the Guides drawer, save command, translations, and application wiring.
3. Implement pure resize and guide-storage helpers.
4. Wire corner dragging into the existing selection pointer lifecycle and undo stack.
5. Add the Guides drawer, library/personal lists, visibility controls, opacity, save, delete, and canvas onion layer.
6. Add bilingual copy and responsive parchment styling.
7. Run all tests, JavaScript syntax checks, and a browser smoke test.
8. Commit and push the completed feature to the existing GitHub branch and pull request.
9. Extend the same corner-resize interaction to active library and personal guides, verify it, and publish the follow-up automatically.
