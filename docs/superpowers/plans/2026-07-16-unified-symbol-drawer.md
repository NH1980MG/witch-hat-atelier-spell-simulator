# Unified Symbol Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge symbol discovery and Scratch-like placement into one drawer.

**Architecture:** Keep the existing symbol catalogue and drag pipeline. Render
one card collection in `inkList`, attach selection and pointer-drag behavior to
those cards, and remove the placement-only DOM and drawer state.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node test runner.

## Global Constraints

- Preserve all 64 shared vector symbols and existing translations.
- Preserve pointer drag, keyboard placement, selection, resizing, and history.
- Add no dependency or framework.

---

### Task 1: Define the unified interface contract

**Files:**
- Modify: `tests/symbol-palette-ui.test.mjs`

**Interfaces:**
- Consumes: `index.html`, `styles.css`, and `app.js` as text fixtures.
- Produces: regression checks for one drawer and draggable `.ink-button` cards.

- [ ] Replace placement-only DOM expectations with assertions that `inkList` is
  the sole symbol list and `placementDrawer` is absent.
- [ ] Assert `renderInkList()` attaches `startSymbolDrag` to each card.
- [ ] Run `node --test tests/symbol-palette-ui.test.mjs` and confirm failure.

### Task 2: Merge the drawers

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `startSymbolDrag(event, element)` and the existing symbol groups.
- Produces: one `symbolDrawer` whose `.ink-button` cards select or drag symbols.

- [ ] Remove `placementToggleButton`, `placementDrawer`, and `placementList`.
- [ ] Attach pointer and keyboard placement handlers in `renderInkList()`.
- [ ] Replace placement drawer bounds and open-state checks with symbol drawer
  bounds and state.
- [ ] Remove placement-only styles while preserving the card grid and drag ghost.
- [ ] Run the focused test and confirm it passes.

### Task 3: Update guidance and verify

**Files:**
- Modify: `README.md`
- Modify: `index.html`

**Interfaces:**
- Consumes: the unified drawer behavior.
- Produces: accurate user instructions and a fresh browser cache key.

- [ ] Point Scratch-like instructions to "Sigils and signs".
- [ ] Run `node --check app.js`, `node --test tests/*.test.mjs`, and
  `git diff --check`; all must exit successfully.
- [ ] Open `http://127.0.0.1:8000/index.html`, verify one symbol island, open it,
  and confirm a symbol can be dragged onto the parchment.
- [ ] Commit the scoped files and push the current branch to GitHub.
