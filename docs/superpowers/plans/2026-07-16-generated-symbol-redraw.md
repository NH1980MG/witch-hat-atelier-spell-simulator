# Generated Symbol Redraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four inaccurate symbols with generated-style vector drawings everywhere they are used.

**Architecture:** Update only `SYMBOL_PATHS`, the shared rendering source used by both palettes, drag transport, canvas, and 3D. Preserve all symbol data and behavior.

**Tech Stack:** JavaScript ES modules, SVG path data, Canvas 2D, Node test runner.

## Global Constraints

- Keep the existing names and magical behavior.
- Use one shared vector definition for every rendering surface.
- Do not ship the user-provided screenshot as a runtime asset.

---

### Task 1: Pin And Replace The Four Drawings

**Files:**
- Create: `tests/symbol-catalog.test.mjs`
- Modify: `symbol-catalog.mjs`
- Modify: `app.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `SYMBOL_PATHS: Record<string, readonly string[]>`
- Produces: revised paths for `Vent sous pied`, `Vent`, `Aeriforme`, and `Eau`

- [ ] **Step 1: Write the failing geometry and cache assertions.**
- [ ] **Step 2: Run `node --test tests/symbol-catalog.test.mjs` and confirm failure on the old paths.**
- [ ] **Step 3: Replace only the four path arrays and bump the symbol catalog cache key.**
- [ ] **Step 4: Run `node --test tests/*.test.mjs` and the existing JavaScript validations.**
- [ ] **Step 5: Verify both palettes and a dropped symbol in the local browser.**
- [ ] **Step 6: Commit only the scoped files and publish through a clean GitHub branch.**
