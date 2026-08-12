# Dockable Compact Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a movable, edge-docked compact toolbar and preserve exact selection rotation values.

**Architecture:** Keep toolbar drag state in `app.js`, persist a normalized vertical coordinate in local storage, and use CSS for the vertical capsule. Extend the existing action rotation transform so every selectable action retains cumulative angle metadata.

**Tech Stack:** Plain HTML, CSS, JavaScript modules, Node test runner.

## Global Constraints

- Mouse, touch, iPad, and phone must share Pointer Events behavior.
- The toolbar must stay fully inside the drawing workspace and dock left or right.
- Existing unrelated working-tree changes must remain untouched.

---

### Task 1: Exact Rotation Metadata

**Files:**
- Modify: `tests/symbol-interactions.test.mjs`
- Modify: `symbol-interactions.mjs`

**Interfaces:**
- Consumes: `rotateSelectedActions(actions, indices, origin, angleDelta)`.
- Produces: cumulative `rotation` radians on every selected action.

- [ ] Add a failing test rotating a free trace from 190 degrees by 90 degrees and expecting 280 degrees.
- [ ] Run `node --test tests/symbol-interactions.test.mjs` and confirm the new assertion fails.
- [ ] Store cumulative rotation for every selected action while preserving geometry transforms.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Dockable Compact Capsule

**Files:**
- Modify: `tests/command-layout.test.mjs`
- Modify: `tests/symbol-palette-ui.test.mjs`
- Modify: `styles.css`
- Modify: `app.js`

**Interfaces:**
- Consumes: `#toolbarCompactButton`, `.floating-tools`, `.canvas-wrap`.
- Produces: `applyToolbarDockPosition()`, pointer drag handlers, and `whaToolbarDock` persisted state.

- [ ] Add failing layout and runtime assertions for a one-column compact capsule, persisted dock position, and Pointer Events handlers.
- [ ] Run the two focused test files and confirm the assertions fail.
- [ ] Implement compact capsule styling after responsive rules so mobile widths cannot override it.
- [ ] Implement pointer capture, free drag, nearest-edge docking, clamping, click suppression, resize restoration, and local persistence.
- [ ] Re-run the focused tests and confirm they pass.

### Task 3: Verification And Publication

**Files:**
- Modify: cache revision references in public HTML if required.

**Interfaces:**
- Consumes: the completed toolbar and rotation implementation.
- Produces: a verified commit on `main` and published GitHub Pages assets.

- [ ] Run JavaScript syntax checks and the complete Node test suite.
- [ ] Smoke-test the local page at desktop and mobile viewport sizes.
- [ ] Review the diff to exclude unrelated untracked directories.
- [ ] Commit only intended tracked changes plus existing completed 3D work, push `main`, and verify the public asset revision.
