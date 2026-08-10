# Responsive Grimoire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible bottom-sheet Grimoire and device-appropriate workshop layouts from phone through iPad.

**Architecture:** Existing semantic controls remain in place. A small toggle manages one body class and local preference, while CSS owns positioning, scrolling, safe areas, and width-specific grids.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node test runner.

## Global Constraints

- Preserve the current visual language and all existing control IDs.
- No new dependency or framework.
- Maintain 44 px touch targets on compact screens.

---

### Task 1: Accessible Grimoire State

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Test: `tests/responsive-grimoire.test.mjs`

- [x] Add a failing structural test for the toggle, `aria-expanded`, and persisted state.
- [x] Run the focused test and confirm failure.
- [x] Add the toggle and `setGrimoireOpen(open)` behavior.
- [x] Run the focused test and confirm success.

### Task 2: Phone and Tablet Layout

**Files:**
- Modify: `styles.css`
- Test: `tests/responsive-grimoire.test.mjs`

- [x] Add failing assertions for the 1180 px bottom sheet, dynamic viewport, safe area, tablet columns, and phone columns.
- [x] Implement the responsive CSS and independent sheet scrolling.
- [x] Run focused and complete tests.

### Task 3: Publish

**Files:**
- Modify: `index.html` asset revision only.

- [x] Run JavaScript syntax validation, all tests, and `git diff --check`.
- [x] Commit, synchronize with `origin/main`, and push the verified commit.
