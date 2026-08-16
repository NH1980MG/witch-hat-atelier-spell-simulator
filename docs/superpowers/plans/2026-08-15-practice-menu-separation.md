# Practice Menu Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move tracing practice from the ritual command grid into the shared workshop menu.

**Architecture:** Reuse the current practice bar and scoring logic. Add one translated menu link on each public page, pointing to `index.html#practice`; `app.js` opens the existing bar when the simulator loads with that hash and no longer requires a practice command button.

**Tech Stack:** Static HTML, browser JavaScript modules, project i18n module, Node test runner.

## Global Constraints

- Keep the existing practice workflow and scoring unchanged.
- Preserve the project convention of accent-free French translation source strings.
- Do not add dependencies or a second practice implementation.

---

### Task 1: Add navigation contract tests

**Files:**
- Modify: `tests/workshop-menu.test.mjs`

- [ ] **Step 1: Write tests for the translated practice link and removed ritual button**

Assert each public page contains `href="index.html#practice"` with `data-i18n="nav.practice"`, assert `index.html` has no `id="practiceToggleButton"`, and assert `app.js` can open the practice bar without requiring that button.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test tests/workshop-menu.test.mjs`

Expected: FAIL because the menu link and implementation have not been moved yet.

### Task 2: Move practice into the menu

**Files:**
- Modify: `index.html`, `bibliotheque.html`, `tutoriel.html`, `fonctionnement.html`, `parametres.html`, `suggestions.html`
- Modify: `i18n.mjs`
- Modify: `app.js`

- [ ] **Step 1: Add the menu link and remove the ritual-grid button**

Place the practice link after the tutorial link where present, using `href="index.html#practice"`, `data-i18n="nav.practice"`, and `data-i18n-aria-label="nav.openPractice"`. Remove only the existing `practiceToggleButton` markup.

- [ ] **Step 2: Add French and English navigation strings**

Add `nav.practice` and `nav.openPractice` in both locale objects, using `Entrainement` / `Practice` for the labels.

- [ ] **Step 3: Make the existing practice bar open from the hash**

Allow `setPracticeOpen` to work when the command-grid button is absent. After the simulator initializes, open the bar when `window.location.hash === "#practice"`; listen for `hashchange` so the menu works even when the simulator is already open.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test tests/workshop-menu.test.mjs tests/practice-mode.test.mjs`

Expected: PASS.

### Task 3: Run regression verification

**Files:** None.

- [ ] **Step 1: Run the full tests and syntax checks**

Run: `node --test tests/*.test.mjs && node --check app.js && node --check site-nav.mjs && node --check i18n.mjs`

Expected: all tests pass and all checks exit successfully.
