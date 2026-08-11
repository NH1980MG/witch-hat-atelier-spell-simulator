# Canvas Context Menu And Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Scratch-like object actions, deterministic single-object targeting, unbounded object growth, and independent canvas pinch zoom.

**Architecture:** Keep pure action geometry and ordering in `symbol-interactions.mjs`; keep pointer lifecycle, history, localized menu behavior, and canvas viewport state in `app.js`. Add one semantic menu to `index.html` and style it within the existing parchment visual language.

**Tech Stack:** Static HTML, CSS, browser JavaScript modules, Node test runner.

## Global Constraints

- Preserve right-drag marquee selection from empty parchment.
- Keep a positive lower size/zoom floor but no upper object or canvas zoom cap.
- Do not add dependencies or alter Minecraft files.
- Publish the verified web change to GitHub `main`.

---

### Task 1: Pure Transform And Ordering Contracts

**Files:**
- Modify: `tests/symbol-interactions.test.mjs`
- Modify: `symbol-interactions.mjs`

**Interfaces:**
- Produces: `reorderSelectedActions(actions, indices, placement)` returning `{ actions, indices }`.
- Produces: uncapped `resizeGlyphFromCorner`, `resizeGlyphSize`, `resizeGuideScaleFromCorner`, and `scaleSelectedActions`.

- [ ] Write failing tests proving sizes can exceed old limits and selected layers retain their relative order when moved to front/back.
- [ ] Run `node --test tests/symbol-interactions.test.mjs` and verify the expected failures.
- [ ] Remove upper clamps and implement stable layer ordering with normalized returned indices.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Context Menu And Deterministic Targeting

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `site-i18n.mjs`
- Modify: `tests/spell-app-integration.test.mjs`
- Modify: `tests/i18n-runtime.test.mjs`

**Interfaces:**
- Produces: `openSelectionContextMenu(event)`, `closeSelectionContextMenu()`, and a `data-selection-action` command router.
- Consumes: the existing selection/history functions and `reorderSelectedActions`.

- [ ] Add failing integration and translation assertions for the semantic menu and its five commands.
- [ ] Run the focused tests and verify they fail for the missing menu.
- [ ] Add the menu markup, bilingual labels, focus behavior, and parchment-aligned styling.
- [ ] Change right-click object targeting to replace the prior group with exactly one hit index, defer movement until drag threshold, and open the menu on a short release.
- [ ] Route duplicate, delete, and layer-order actions through one history-aware command handler.
- [ ] Run focused tests and verify they pass.

### Task 3: Independent Trackpad And Touch Pinch Zoom

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `tests/spell-app-integration.test.mjs`

**Interfaces:**
- Consumes: `setCanvasScale(scale, announce)` and canvas pan state.
- Produces: trackpad pinch zoom and two-pointer pan/zoom without selection scaling.

- [ ] Add failing integration assertions that `ctrlKey` wheel changes canvas scale and wheel handling no longer scales selected actions.
- [ ] Run the focused test and verify the expected failure.
- [ ] Store pinch distance/scale in `panGesture`, update scale around the gesture midpoint, and route ordinary wheel deltas only to pan.
- [ ] Remove the 200% canvas cap, update hidden input metadata, and keep the 10% minimum.
- [ ] Run focused tests and verify they pass.

### Task 4: Verification And Publication

**Files:**
- Modify: asset revision query strings where required for GitHub Pages cache refresh.

- [ ] Run `node --test tests/*.test.mjs` and `node --check app.js`.
- [ ] Smoke-test right-click actions, overlapping objects, unbounded resize, trackpad pinch, ordinary pan, and responsive layouts at `http://127.0.0.1:8000/index.html`.
- [ ] Inspect `git diff --check` and `git status --short`.
- [ ] Commit only simulator source, tests, and docs, then push the verified commit to GitHub `main`.
