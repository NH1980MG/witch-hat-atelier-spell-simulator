# Paste an Image into Photo Import

## Goal

Allow a user to paste an image directly into the existing photo-import dialog with `Ctrl+V` or `Cmd+V`, while preserving the current file-picker workflow and the canvas copy/paste behavior.

## Scope

- Add a visible paste/drop target to the photo-import dialog.
- Accept raster image clipboard items that the browser exposes as PNG, JPEG, or WebP.
- Route pasted images through the same analysis and preview pipeline as file-picker images.
- Keep the existing file input available as a fallback.
- Show a local status message when the clipboard has no usable image.

Out of scope:

- Reading clipboard contents outside the open photo-import dialog.
- Changing canvas selection copy/paste.
- Uploading clipboard data to a server.
- Supporting HTML, SVG, or arbitrary text as a photo source.

## Design

The existing photo import dialog remains the single entry point. Its source area gains a drop/paste target and a short instruction. The existing file input continues to emit the same `File` object path used today.

While the dialog is open, a scoped `paste` listener checks `event.clipboardData.items` for the first image item. When found, it converts the item to a `File`, prevents the browser's default paste behavior, and calls the existing photo-import start function. The listener is removed when the dialog closes or the import is cancelled. If no image item exists, the event is left untouched when focus is in a text field; otherwise the dialog displays a non-blocking message explaining that an image must be copied first.

The drop target uses the same import entry point. Drag-over feedback is visual only and does not change analysis behavior. Object URLs are revoked by the existing preview cleanup path.

## Error handling

- Ignore clipboard items with non-image MIME types.
- Report an unavailable or empty clipboard without throwing.
- Preserve the current photo-read error state for invalid image files.
- Do not request clipboard permission proactively; use the browser paste event only after the user presses paste.

## Tests

- Unit test that an image clipboard item is converted into the import callback input.
- Unit test that text-only clipboard data does not start photo import.
- Unit test that the listener is scoped to the open dialog and does not alter canvas paste behavior.
- Existing photo import and browser smoke tests must continue to pass.

## Acceptance criteria

1. Open Photo, copy an image, press `Cmd+V` or `Ctrl+V`, and see the normal photo preview/analysis.
2. Selecting an image through the file picker behaves exactly as before.
3. Pasting text does not replace or corrupt a focused text field.
4. Closing the dialog stops paste handling.
5. No network request is made for the pasted image.
