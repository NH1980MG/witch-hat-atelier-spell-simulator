# Circle Geometry Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make internal circles and incomplete/paired semicircles affect spell semantics in the simulator.

**Architecture:** Extend the normalized spell geometry object with circle metrics, then consume those metrics in the recipe effect plan. The drawing app computes the metrics from rings, closed circles, and free seals before passing geometry to `composeSpellRecipe`.

**Tech Stack:** Static JavaScript modules, Node.js built-in test runner.

## Global Constraints

- Do not add dependencies.
- Internal circles stabilize, contain, and combine spell effects; they do not add raw elemental power.
- Incomplete circles indicate prepared or joinable activation state.
- Keep existing recipe identities deterministic.

---

### Task 1: Geometry Model

**Files:**
- Modify: `spell-model.mjs`
- Test: `tests/spell-model.test.mjs`

**Interfaces:**
- Consumes: `normalizeSpellGeometry(geometry)`
- Produces: normalized fields `circleCount`, `ringCount`, `nestedCircleCount`, `semicircleCount`, `joinableSemicircleCount`, `circleCompleteness`

- [ ] **Step 1: Write failing normalization test**
- [ ] **Step 2: Run `node --test tests/spell-model.test.mjs` and verify failure**
- [ ] **Step 3: Add normalized circle fields**
- [ ] **Step 4: Re-run `node --test tests/spell-model.test.mjs` and verify pass**

### Task 2: Recipe Effect Plan

**Files:**
- Modify: `spell-grammar.mjs`
- Test: `tests/spell-grammar.test.mjs`

**Interfaces:**
- Consumes: normalized circle fields from `normalizeSpellGeometry`
- Produces: effect plan parameters `circleCount`, `nestedCircleCount`, `semicircleCount`, `joinableSemicircleCount`, `circleCompleteness`

- [ ] **Step 1: Write failing recipe tests for internal circles and half circles**
- [ ] **Step 2: Run `node --test tests/spell-grammar.test.mjs` and verify failure**
- [ ] **Step 3: Add containment/stability/focus/spread adjustments without changing `powerModifier`**
- [ ] **Step 4: Re-run `node --test tests/spell-grammar.test.mjs` and verify pass**

### Task 3: App Geometry Bridge

**Files:**
- Modify: `app.js`
- Test: `tests/spell-app-integration.test.mjs`

**Interfaces:**
- Consumes: `rings`, `closedCircles`, `freeSeals`, `hasBoundary`
- Produces: merged geometry passed to `composeSpellRecipe`

- [ ] **Step 1: Write static integration assertions**
- [ ] **Step 2: Run `node --test tests/spell-app-integration.test.mjs` and verify failure**
- [ ] **Step 3: Add circle geometry analysis and pass merged geometry**
- [ ] **Step 4: Run targeted tests and then the relevant suite**
