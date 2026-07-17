# Reference Circle Crops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the 33 invented library thumbnails with tightly cropped reference circles from the archived gallery captures while preserving the existing card layout.

**Architecture:** Keep the existing catalog IDs and category structure. Store one local PNG crop per card in `assets/library-schematics/`, point the library HTML to those crops, and identify them as reference captures rather than simulator reconstructions.

**Tech Stack:** Static HTML, CSS, JavaScript metadata, Node test runner, macOS `sips` image cropping.

## Global Constraints

- Keep exactly 33 cards and the current category layout.
- Include only the circle artwork, not titles, page text, or full screenshots.
- Keep every asset local and accessible in English and French.
- Verify the local library visually before publishing.

---

### Task 1: Asset Contract

**Files:**
- Modify: `tests/library-assets.test.mjs`
- Modify: `library-circle-data.mjs`

- [x] Require a nonblank local PNG for every catalog entry.
- [x] Require reference-capture fidelity and bilingual reference alt text.
- [x] Run `node --test tests/library-assets.test.mjs` and confirm the new checks fail before implementation.

### Task 2: Reference Crops

**Files:**
- Replace: `assets/library-schematics/*.svg`
- Create: `assets/library-schematics/*.png`

- [x] Crop the 33 named circles from the five archived gallery screenshots.
- [x] Inspect a contact sheet and adjust any crop containing labels, borders, or clipped artwork.
- [x] Confirm all 33 files are nonblank and square.

### Task 3: Library Presentation

**Files:**
- Modify: `bibliotheque.html`
- Modify: `app.js`
- Modify: `README.md`
- Modify: `docs/release-checklist.md`

- [x] Point every card to its PNG and replace reconstruction wording with reference-capture wording.
- [x] Update bilingual descriptions, alt text, and public asset documentation.
- [x] Run the focused test, then the full test suite.

### Task 4: Visual Verification And Publication

**Files:**
- Verify: `http://127.0.0.1:8000/bibliotheque.html#schematics`

- [x] Check all categories at desktop and narrow widths.
- [x] Confirm no broken images or browser errors.
- [x] Commit the scoped changes and push the current branch to GitHub.
