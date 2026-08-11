# Interactive 3D Spells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make active 3D spells selectable, movable, rotatable, and able to affect proportional objects in the existing 3D environment.

**Architecture:** Add a small pure interaction module for scale and impact rules, then wire it into `app.js` Three.js runtime. Reuse the current interior/exterior scenes and tag existing scene objects as interactive targets.

**Tech Stack:** Plain ES modules, Three.js, Node test runner.

## Global Constraints

- Keep OrbitControls working when not directly dragging the spell.
- Use existing 3D decor first; only add targets if current scene lacks them.
- Object scale must be proportional to `activeSpell.diameter`.
- No external physics engine.
- French UI remains accent-free where existing tests require it.

---

### Task 1: Pure Scale And Impact Rules

**Files:**
- Create: `environment-interactions.mjs`
- Test: `tests/environment-interactions.test.mjs`

**Interfaces:**
- Produces: `computeSceneScale(diameterMeters)`, `spellInfluenceProfile(spell)`, `applySpellImpact(target, profile)`

- [ ] Write failing tests for proportional scale and wind impacts.
- [ ] Implement pure functions.
- [ ] Run `node --test tests/environment-interactions.test.mjs`.

### Task 2: Existing Decor As Interactive Targets

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes pure impact functions from Task 1.
- Produces `threeView.environmentTargets`.

- [ ] Tag existing exterior buildings, trees, rocks, plants, bottles, books and candles with `userData.interactiveTarget`.
- [ ] Scale exterior scene by `computeSceneScale(activeSpell.diameter)` so houses stay larger than large spells.
- [ ] Apply impact animations to target groups.

### Task 3: Direct Spell Manipulation

**Files:**
- Modify: `app.js`

**Interfaces:**
- Produces pointer handlers on `spell3dCanvas`.

- [ ] Add raycaster-based spell hit testing.
- [ ] Drag spell over ground plane while temporarily disabling OrbitControls.
- [ ] Shift-drag or secondary drag rotates the spell.
- [ ] Q/E rotate selected spell.
- [ ] Keep camera drag unchanged when pointer starts in empty space.

### Task 4: Verification

**Files:**
- Modify tests as needed.

- [ ] Run syntax checks.
- [ ] Run `node --test tests/*.test.mjs`.
- [ ] Run `node scripts/validate-spell-matrix.mjs`.
- [ ] Smoke test browser: camera orbit, spell drag, spell rotation, wind impact on house/tree.
