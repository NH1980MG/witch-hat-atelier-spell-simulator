# Paste Photo Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users paste a copied PNG, JPEG, or WebP directly into the open photo-import dialog and send it through the existing photo analysis flow.

**Architecture:** Add a small DOM-free clipboard helper that extracts the first image `File` from a paste event. Scope the browser listener to the photo-import dialog state in `app.js`, then call the existing `handlePhotoFile` function so pasted and selected files share all decoding, analysis, preview, and error behavior. Add a visible drop/paste target and bilingual strings without changing canvas paste routing.

**Tech Stack:** Plain browser JavaScript modules, HTML, CSS, Node's built-in test runner, static browser app.

## Global Constraints

- Clipboard contents are read only from the user-triggered paste event while the photo-import dialog is open.
- PNG, JPEG, and WebP image items are accepted; text, HTML, SVG, and non-image items are ignored.
- The existing file picker and canvas copy/paste behavior must remain unchanged.
- No clipboard image is uploaded to a server.
- Keep source files ASCII-compatible with existing project conventions.

---

### Task 1: Add the clipboard extraction helper

**Files:**
- Create: `photo-clipboard.mjs`
- Create: `tests/photo-clipboard.test.mjs`

**Interfaces:**
- Produces `imageFileFromPaste(event) -> File|null`.
- The helper must tolerate missing `clipboardData`, missing `items`, and `getAsFile()` returning null.

- [ ] **Step 1: Write the failing tests**

Add tests for an image item returning its `File`, a text-only paste returning `null`, and a missing clipboard returning `null`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/photo-clipboard.test.mjs`

Expected: FAIL because `photo-clipboard.mjs` does not exist yet.

- [ ] **Step 3: Implement the minimal helper**

Export `imageFileFromPaste(event)`. Iterate over `event.clipboardData.items`, select the first item whose `kind` is `file` and whose MIME type starts with `image/`, then return `item.getAsFile?.() || null`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/photo-clipboard.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the helper**

Run: `git add photo-clipboard.mjs tests/photo-clipboard.test.mjs && git commit -m "feat: extract pasted photo files"`

### Task 2: Add the paste/drop source UI and translations

**Files:**
- Modify: `index.html:276-294`
- Modify: `styles.css:3998-4020`
- Modify: `i18n.mjs` in both locale dictionaries near the existing `photo.*` entries
- Modify: `tests/photo-import-ui.test.mjs`

**Interfaces:**
- Produces a focusable `#photoImportDropzone` inside `#photoImportDialog`.
- Produces translation keys `photo.pasteHint`, `photo.pasteReady`, and `photo.pasteNoImage` in English and French.

- [ ] **Step 1: Extend the UI test with failing assertions**

Assert that the dialog contains `photoImportDropzone`, `photo.pasteHint`, and `photo.pasteNoImage`, and that all three translation keys occur twice in `i18n.mjs`.

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run: `node --test tests/photo-import-ui.test.mjs`

Expected: FAIL because the new IDs and keys do not exist.

- [ ] **Step 3: Add the drop/paste target and bilingual copy**

Place the target above the preview frame. Give it `role="button"`, `tabindex="0"`, and an accessible label. Keep the existing `Use a photo` button and hidden file input unchanged.

- [ ] **Step 4: Style the target without changing the preview layout**

Add a dashed, focus-visible dropzone with drag-over state and responsive width. Keep the visual treatment consistent with the existing paper, line, and ink variables.

- [ ] **Step 5: Run the focused UI test and verify it passes**

Run: `node --test tests/photo-import-ui.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the UI**

Run: `git add index.html styles.css i18n.mjs tests/photo-import-ui.test.mjs && git commit -m "feat: add photo paste dropzone"`

### Task 3: Wire paste and drop into the existing importer

**Files:**
- Modify: `app.js:74-90, 360-390, 11020-11065, 12228-12262`
- Modify: `tests/photo-import-ui.test.mjs`

**Interfaces:**
- Consumes `imageFileFromPaste(event)`.
- Reuses `handlePhotoFile(file)` for both paste and drop paths.

- [ ] **Step 1: Add failing source assertions**

Assert that `app.js` imports `imageFileFromPaste`, checks `photoImportDialog?.open`, handles `paste`, handles `drop`, calls `handlePhotoFile(file)`, and removes the active drop state on `dragleave` or `drop`.

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run: `node --test tests/photo-import-ui.test.mjs`

Expected: FAIL because the event wiring is not present.

- [ ] **Step 3: Implement scoped paste handling**

Add a document-level paste listener that returns unless the photo dialog is open. If the focused element is an input, textarea, or contenteditable element, leave the paste untouched. Otherwise, extract an image file, prevent default only when an image is found, and call `handlePhotoFile(file)`. For non-image clipboard content, show the new non-blocking status message.

- [ ] **Step 4: Implement drop handling**

Add `dragover`, `dragleave`, and `drop` listeners to the dropzone. Prevent default only for an image file, clear the visual drag state in every exit path, and send the first dropped image to `handlePhotoFile(file)`.

- [ ] **Step 5: Verify the focused tests**

Run: `node --test tests/photo-clipboard.test.mjs tests/photo-import-ui.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the importer wiring**

Run: `git add app.js tests/photo-import-ui.test.mjs && git commit -m "feat: paste images into photo import"`

### Task 4: Full verification and local browser smoke test

**Files:**
- Modify: none unless verification exposes a defect.

- [ ] **Step 1: Run syntax checks**

Run: `node --check app.js && node --check photo-clipboard.mjs`

- [ ] **Step 2: Run the full deterministic test suite**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 3: Run the local browser smoke test**

Serve the project locally, open the workshop, open `Import circle` then `Use a photo`, paste an image, and verify the preview/analysis appears. Also verify the file picker still works and that pasting into the JSON textarea remains text paste.

- [ ] **Step 4: Review the final diff and commit status**

Run: `git diff HEAD~3 --check` and `git status --short --branch`.

- [ ] **Step 5: Prepare publication**

Confirm the final commits contain only the paste-photo feature and its spec/plan, then publish the branch through the repository's GitHub workflow. Do not publish the local app preview branch to the public site without confirming the target branch.
