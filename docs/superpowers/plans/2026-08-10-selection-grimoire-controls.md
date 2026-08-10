# Selection-aware Grimoire Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make thickness, scale, and ink color selection-aware and derive spell force from circle size.

**Architecture:** Pure action-style helpers live in `symbol-interactions.mjs` and are unit tested. `app.js` owns gesture history, selection synchronization, dual-purpose scale behavior, and size-derived force. Existing vanilla HTML/CSS and localization patterns are preserved.

**Tech Stack:** HTML, CSS, browser JavaScript modules, Node test runner.

## Global Constraints

- No new dependencies or framework.
- Keep English and French interface copy synchronized.
- Preserve old saved spell compatibility.
- A continuous slider gesture creates one undo snapshot.

---

### Task 1: Selection style helpers

**Files:**
- Modify: `symbol-interactions.mjs`
- Test: `tests/symbol-interactions.test.mjs`

**Interfaces:**
- Produces: `styleSelectedActions(actions, indices, style)` returning cloned actions with selected `width` and/or `color` updated.

- [ ] Write failing unit tests for selected-only thickness and color changes.
- [ ] Run `node --test tests/symbol-interactions.test.mjs` and verify failure.
- [ ] Implement `styleSelectedActions` with positive-width and CSS hex-color validation.
- [ ] Run the focused test and verify it passes.

### Task 2: Grimoire controls and interaction

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `i18n.mjs`
- Test: `tests/grimoire-selection-controls.test.mjs`
- Test: `tests/symbol-palette-ui.test.mjs`
- Test: `tests/my-spells-ui.test.mjs`

**Interfaces:**
- Consumes: `styleSelectedActions(actions, indices, style)`.
- Produces: selection-aware `strokeInput`, `inkColorInput`, and `selectionScaleInput` behavior.

- [ ] Write failing structural tests for removed force and toolbar size buttons, new color/scale inputs, localized labels, and app wiring.
- [ ] Run the focused tests and verify failure.
- [ ] Replace the old force/zoom controls with thickness, color, and dual-purpose scale controls.
- [ ] Synchronize controls whenever selection changes and record one history entry per gesture.
- [ ] Remove intensity from drawing width and derive force/power from measured diameter.
- [ ] Update saved-spell loading assertions for compatibility without an intensity control.
- [ ] Run focused tests and verify they pass.

### Task 3: Verification and publication

**Files:**
- Modify: `README.md` and tutorial copy only if stale references remain.

**Interfaces:**
- Consumes: completed controls.
- Produces: tested, published static site revision.

- [ ] Search for stale Spell force and shrink/grow UI references and correct them.
- [ ] Run `node --check app.js` and `node --test tests/*.test.mjs`.
- [ ] Smoke test desktop and mobile controls at `http://127.0.0.1:8000/index.html`.
- [ ] Commit, rebase onto the current remote branch if needed, and push to GitHub.
