# Scalewolf 3D And Library Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale workshop rendering after 3D, improve the procedural Scalewolf, adapt every Scalewolf sign pair, and rank exact library elements before mixtures.

**Architecture:** Keep lifecycle and Three.js integration in `app.js`, move deterministic Scalewolf operation mapping to a small pure module, and add ranking only inside the catalog query comparator. Existing generic secondary effects remain available around the creature.

**Tech Stack:** Browser JavaScript modules, Three.js, Node test runner, GitHub Pages.

## Global Constraints

- Preserve unrelated photo-import work already present in the worktree.
- Keep all effects deterministic and bounded.
- Add no dependency or downloaded 3D model.

---

### Task 1: Redraw After 3D Close

**Files:**
- Modify: `app.js`
- Test: `tests/manifestation-lifecycle.test.mjs`

- [ ] Add a failing assertion that `close3dView()` redraws after cleanup.
- [ ] Run `node --test tests/manifestation-lifecycle.test.mjs` and confirm failure.
- [ ] Call `render()` after `clearActiveManifestation("close")`.
- [ ] Run the lifecycle test and confirm success.

### Task 2: Exact Library Material Priority

**Files:**
- Modify: `variant-catalog.mjs`
- Test: `tests/variant-catalog.test.mjs`

- [ ] Add a failing query test requiring single `Loup-ecaille` records before mixtures.
- [ ] Run the catalog test and confirm failure.
- [ ] Add an exact-material priority to the relevance comparator.
- [ ] Run the catalog test and confirm success.

### Task 3: Deterministic Scalewolf Combination Profiles

**Files:**
- Create: `decorative-creature-profile.mjs`
- Create: `tests/decorative-creature-profile.test.mjs`
- Modify: `app.js`

- [ ] Test representative operations and all 1,640 Scalewolf/support variants.
- [ ] Run the profile test and confirm the missing-module failure.
- [ ] Implement `createScalewolfMotionProfile(recipe)` with finite bounded values.
- [ ] Use the profile in the Scalewolf renderer.
- [ ] Run profile and renderer policy tests.

### Task 4: Improved Procedural Wolf

**Files:**
- Modify: `app.js`
- Test: `tests/manifestation-render-policy.test.mjs`

- [ ] Require neck, haunches, lower legs, nose, curved tail, and motion-profile integration.
- [ ] Run the renderer policy test and confirm failure.
- [ ] Build the detailed grouped anatomy and animate its articulated parts.
- [ ] Run focused and full test suites.
- [ ] Smoke-test open/close and the creature in the browser.
- [ ] Commit only scoped changes, push, merge, and verify Pages.
