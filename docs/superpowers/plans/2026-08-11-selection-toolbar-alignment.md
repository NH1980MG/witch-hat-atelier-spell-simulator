# Selection Toolbar Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selection-near rotation controls, an activable alignment/snap aid, and an Apple-like reduced toolbar mode while leaving 3D manipulation for a separate task.

**Architecture:** Keep the existing static simulator architecture. Add small DOM controls inside the canvas workspace, wire state through `app.js`, reuse the existing selection/rotation helpers, and add deterministic snap helpers before applying movement deltas.

**Tech Stack:** Static HTML/CSS, plain ES modules, Node.js built-in test runner.

## Global Constraints

- Do not implement 3D-circle manipulation in this task.
- Preserve existing selection, copy, paste, duplicate, resize, and rotate behavior.
- No new runtime dependencies.
- UI controls must remain keyboard reachable and bilingual.
- Toolbar reduced/expanded and alignment mode persist in `localStorage`.

---

### Task 1: Near-Selection Rotation Dock

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `i18n.mjs`
- Test: `tests/grimoire-selection-controls.test.mjs`
- Test: `tests/i18n-runtime.test.mjs`

**Interfaces:**
- Consumes: existing `rotateSelection(angleDelta)` and `selectionBounds()`.
- Produces: `selectionRotationDock` with `rotateSelectionQuarterLeftButton` and `rotateSelectionQuarterRightButton` that call `rotateSelection(-Math.PI / 2)` and `rotateSelection(Math.PI / 2)`.

- [ ] **Step 1: Write failing static tests for dock DOM, CSS, event wiring, and i18n keys.**
- [ ] **Step 2: Run targeted tests and confirm failures.**
- [ ] **Step 3: Add the dock markup, style, positioning sync, and click handlers.**
- [ ] **Step 4: Re-run targeted tests and confirm pass.**

### Task 2: Alignment/Snap Toggle

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `i18n.mjs`
- Test: `tests/symbol-interactions.test.mjs`
- Test: `tests/symbol-palette-ui.test.mjs`
- Test: `tests/i18n-runtime.test.mjs`

**Interfaces:**
- Produces: exported helper `snapDeltaForSelection(actions, indices, dx, dy, options)` in `symbol-interactions.mjs`.
- Produces: `alignmentToggleButton` in the toolbar that toggles `state.alignmentAssist`.

- [ ] **Step 1: Write failing behavior test for snapped deltas.**
- [ ] **Step 2: Write failing static UI tests for the toolbar button, CSS overlay, app wiring, and i18n keys.**
- [ ] **Step 3: Run targeted tests and confirm failures.**
- [ ] **Step 4: Implement snap helper and toolbar toggle.**
- [ ] **Step 5: Use snap helper for selection move/resize placement where it affects movement without changing scaling math.**
- [ ] **Step 6: Re-run targeted tests and confirm pass.**

### Task 3: Reduced Toolbar Capsule

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `i18n.mjs`
- Test: `tests/command-layout.test.mjs`
- Test: `tests/symbol-palette-ui.test.mjs`
- Test: `tests/i18n-runtime.test.mjs`

**Interfaces:**
- Produces: `toolbarCompactButton` that toggles `state.toolbarCompact`.
- Produces: `.simulator-page.toolbar-compact .floating-tools` CSS mode that shows a smaller capsule while keeping the expand button visible.

- [ ] **Step 1: Write failing static tests for compact toolbar markup, CSS mode, app wiring, localStorage, and i18n keys.**
- [ ] **Step 2: Run targeted tests and confirm failures.**
- [ ] **Step 3: Add compact button, state, CSS, and persistence.**
- [ ] **Step 4: Re-run targeted tests and the full suite.**
