# Web Marquee Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add right-click single and rectangular group selection for web simulator glyphs, circles, and rings.

**Architecture:** Pure geometry and transformation helpers remain in `symbol-interactions.mjs` and are covered by Node tests. `app.js` owns pointer state, history, rendering, and localized status updates while the guide continues to use its separate selection path.

**Tech Stack:** Browser JavaScript modules, Canvas 2D, Pointer Events, Node.js built-in test runner.

## Global Constraints

- Eligible actions are `glyph`, `circle`, and `ring`.
- Tracing guides and onion-skin examples are never included.
- Freehand strokes, rays, and spirals remain excluded.
- Right-button group transformations produce one undo snapshot each.
- Existing touch long-press and left-button drawing behavior must remain unchanged.
- Minecraft files must not be included in the web implementation commit.

---

### Task 1: Pure Selection Geometry

**Files:**
- Modify: `symbol-interactions.mjs`
- Modify: `tests/symbol-interactions.test.mjs`

**Interfaces:**
- Produces: `isSelectableAction(action)`.
- Produces: `selectableActionBounds(action)`.
- Produces: `boundsIntersect(first, second)`.
- Produces: `combinedSelectionBounds(actions, indices)`.
- Produces: `topmostSelectableIndexAtPoint(actions, point, padding)`.
- Produces: `selectableIndicesInRect(actions, rect)`.
- Produces: `translateSelectedActions(actions, indices, dx, dy)`.
- Produces: `scaleSelectedActions(actions, indices, origin, scale)`.

- [x] **Step 1: Write failing tests**

Add tests proving glyph/circle/ring eligibility, excluded guide-like and freehand actions, topmost hit testing, rectangle intersection, sorted marquee indices, combined bounds, uniform translation, and proportional scaling of glyph position/size and circle center/radius.

- [x] **Step 2: Verify the tests fail**

Run:

```bash
node --test tests/symbol-interactions.test.mjs
```

Expected: failure because the new exports do not exist.

- [x] **Step 3: Implement the pure helpers**

Normalize rectangles so dragging in any direction works. Return new cloned action arrays from transform helpers. Clamp scale to a finite positive value and preserve unrelated actions.

- [x] **Step 4: Verify the focused tests pass**

Run the Task 1 command. Expected: all symbol interaction tests pass.

### Task 2: Selection State and Rendering

**Files:**
- Modify: `app.js`
- Modify: `tests/spell-app-integration.test.mjs`

**Interfaces:**
- Replaces: `state.selectedGlyphIndex` with `state.selectedActionIndices`.
- Produces: `selectedActions()`, `normalizeSelection()`, `clearSelection()`, and `selectionBounds()`.
- Produces: `drawSelection()` for the shared bounds and `drawSelectionMarquee()` for the active drag rectangle.

- [x] **Step 1: Write failing integration assertions**

Assert that `app.js` declares `selectedActionIndices`, renders a marquee and shared selection bounds, and no longer uses `selectedGlyphIndex` as state.

- [x] **Step 2: Verify the integration test fails**

Run:

```bash
node --test tests/spell-app-integration.test.mjs
```

Expected: assertion failure for missing group-selection state.

- [x] **Step 3: Implement state helpers and rendering**

Draw one dashed gold box with four handles around selected actions. Draw the active marquee with a translucent fill. Selection controls are enabled for any nonempty valid selection.

- [x] **Step 4: Verify focused tests pass**

Run Task 1 and Task 2 tests together.

### Task 3: Right-Button Pointer Flow and Group Editing

**Files:**
- Modify: `app.js`
- Modify: `tests/spell-app-integration.test.mjs`

**Interfaces:**
- Produces: right-button pointer modes `pending`, `marquee`, `move`, and `resize`.
- Consumes: geometry helpers from Task 1.
- Produces: group deletion and toolbar scaling as one history operation.

- [x] **Step 1: Add failing source integration tests**

Assert that right-button `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` are handled through pointer capture; contextmenu only suppresses the browser menu; and the guide path is not passed to marquee selection.

- [x] **Step 2: Verify the focused test fails**

Run the Task 2 command. Expected: missing right-button pointer flow.

- [x] **Step 3: Implement right-click and marquee**

Right-click on an eligible action selects the topmost action and begins group move. Right-drag from empty parchment switches to marquee after a four-pixel threshold. Releasing applies the intersection result; releasing below threshold clears selection.

- [x] **Step 4: Implement group move, resize, delete, and toolbar scale**

Move all selected actions by one clamped shared delta. Scale around the opposite handle corner. Delete indices in descending order. Record one pre-edit snapshot only when geometry changes.

- [x] **Step 5: Verify focused tests pass**

Run Task 1 and Task 2 tests together.

### Task 4: Localization and Full Verification

**Files:**
- Modify: `site-i18n.mjs`
- Modify: `tests/i18n-runtime.test.mjs`
- Modify: `tests/english-mode.test.mjs`

**Interfaces:**
- Produces: French and English status strings for singular selection, group selection, marquee empty, group moved, group resized, and group deleted.

- [x] **Step 1: Add failing localization tests**

Assert every new key exists and returns meaningful French and English text.

- [x] **Step 2: Verify localization tests fail**

Run:

```bash
node --test tests/i18n-runtime.test.mjs tests/english-mode.test.mjs
```

- [x] **Step 3: Add localized strings and wire statuses**

Use counts for plural messages and retain the current single-element name status.

- [x] **Step 4: Run the complete test suite**

Run:

```bash
node --test tests/*.test.mjs
node --check app.js
```

Expected: every test passes and syntax check exits successfully.

- [x] **Step 5: Browser smoke test and local commit**

At `http://127.0.0.1:8000/index.html`, verify single selection, marquee in all drag directions, group move, corner resize, deletion, undo, zoom, and guide exclusion. Commit only web source, tests, and this plan; do not push Minecraft files.
