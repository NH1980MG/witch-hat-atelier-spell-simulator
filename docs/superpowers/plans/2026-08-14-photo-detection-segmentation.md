# Photo Detection Segmentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent thick-ring residue from creating oversized photo-detection boxes and keep disconnected strokes of one symbol together.

**Architecture:** Extend the deterministic segmentation pipeline in `photo-import.mjs`. Recognition will compare a full turn in bounded steps, and component-size filtering will occur after grouping while preserving the existing ring boundary rule.

**Tech Stack:** Browser JavaScript ES modules, Node test runner, raster masks.

## Global Constraints

- No new dependency or machine-learning service.
- Do not change manual photo-region editing.
- Do not modify unrelated untracked files.

---

### Task 1: Regression coverage

**Files:**
- Modify: `tests/photo-import.test.mjs`

**Interfaces:**
- Consumes: `analyzePhoto(imageData, symbolPaths)` and `groupComponents(...)`.
- Produces: regression cases for thick annular ink and disconnected glyph strokes.

- [ ] Add a synthetic thick-ring case with nearby glyphs and assert no region spans more than 45% of the image.
- [ ] Add a disconnected Crosshair grouping case and assert it produces one region.
- [ ] Run `node --test tests/photo-import.test.mjs` and confirm the new assertions fail for segmentation, not setup errors.

### Task 2: Adaptive segmentation

**Files:**
- Modify: `photo-import.mjs`
- Modify: `app.js`
- Modify: `tests/photo-import-ui.test.mjs`

**Interfaces:**
- Produces: full-turn recognition and post-group component filtering.

- [ ] Compare grouped masks over a full turn at 12-degree intervals.
- [ ] Retain meaningful small components until their grouped extent can be evaluated.
- [ ] Preserve ring boundaries and separation between nearby complete glyphs.
- [ ] Update the photo module cache revision in `app.js` and its UI test.
- [ ] Run the targeted tests until green.

### Task 3: Verification and publication

**Files:**
- Test: all tracked `tests/*.test.mjs`

**Interfaces:**
- Produces: a verified public deployment.

- [ ] Run photo tests, all tracked Node tests, `node --check`, and `git diff --check`.
- [ ] Smoke-test the local photo import page.
- [ ] Commit only intended files, push `main`, and verify GitHub Pages completion.
