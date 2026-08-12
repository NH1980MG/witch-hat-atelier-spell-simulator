# 3D Physics Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mostly procedural 3D reactions with a proportional, interactive environment driven by a real physics engine.

**Architecture:** Keep Three.js for rendering and add Rapier as the physics layer. The spell remains controlled by the simulator recipe, while the environment owns physical bodies, masses, constraints, damage states, and reset-free relaunch behavior.

**Tech Stack:** Plain browser JavaScript modules, Three.js, local Rapier build, local `.glb` assets when available, deterministic procedural fallbacks.

## Global Constraints

- No paid dependency.
- No network dependency at runtime.
- The camera must remain movable like now.
- Relaunching the spell must not reset environment damage or object positions.
- The magic circle scale must stay proportional to houses, trees, crates, stones, and props.
- The 2D spell drawing and activation snapshot must not be mutated by 3D interactions.

---

## File Structure

- `three-environment-assets.mjs`: existing long-term asset manifest; extend with physics metadata.
- `three-physics-world.mjs`: create and step the Rapier world, map Three objects to rigid bodies.
- `three-physics-props.mjs`: create physical props from manifest entries.
- `three-spell-forces.mjs`: convert spell effects into physics impulses, wind fields, lift, crush, heat, or binding.
- `app.js`: wire physics lifecycle into the existing 3D panel without moving the whole renderer yet.
- `tests/three-physics-world.test.mjs`: physics lifecycle and deterministic stepping.
- `tests/three-spell-forces.test.mjs`: spell-to-force mapping.
- `tests/environment-interactions.test.mjs`: proportional reactions and relaunch behavior.

---

### Task 1: Physics Manifest Metadata

**Files:**
- Modify: `three-environment-assets.mjs`
- Test: `tests/three-environment-assets.test.mjs`

**Interfaces:**
- Produces: `asset.physics = { bodyType, massKg, collider, breakForceN, anchorPoints }`

- [ ] Add failing tests asserting house/tree/crate/stone/grass all expose physics metadata.
- [ ] Add `massKg`, collider type, and break threshold to each prop.
- [ ] Verify proportions: house heavier than crate, crate heavier than grass, stone dense but smaller.
- [ ] Run `node --test tests/three-environment-assets.test.mjs`.

### Task 2: Rapier Local Runtime

**Files:**
- Create: `vendor/rapier/`
- Create: `three-physics-world.mjs`
- Test: `tests/three-physics-world.test.mjs`

**Interfaces:**
- Produces: `createPhysicsWorld({ gravity }): PhysicsWorldAdapter`
- Produces: `stepPhysics(world, deltaSeconds)`
- Produces: `disposePhysicsWorld(world)`

- [ ] Add local Rapier files to `vendor/rapier/` instead of loading from CDN.
- [ ] Create a small wrapper so `app.js` never calls Rapier directly.
- [ ] Test that stepping updates a dynamic body downward under gravity.
- [ ] Test that disposing clears registered bodies.
- [ ] Run `node --test tests/three-physics-world.test.mjs`.

### Task 3: Physical Props

**Files:**
- Create: `three-physics-props.mjs`
- Modify: `app.js`
- Test: `tests/environment-interactions.test.mjs`

**Interfaces:**
- Consumes: `createPhysicsWorld`, `THREE_ENVIRONMENT_ASSETS`
- Produces: `createPhysicalEnvironment({ scene, manifest, world, scaleMeters })`

- [ ] Wrap each visible prop with a physics body.
- [ ] House starts as constrained parts: base, roof, light panels.
- [ ] Tree starts with a bend constraint and can detach at high force.
- [ ] Crate slides/tips; stone rolls/nudges; grass/dust has visual-only particles.
- [ ] Test wind moves tree more than house, and roof detaches before full house.

### Task 4: Spell Force Mapping

**Files:**
- Create: `three-spell-forces.mjs`
- Modify: `app.js`
- Test: `tests/three-spell-forces.test.mjs`

**Interfaces:**
- Produces: `spellForcesFromSnapshot(snapshot): SpellForce[]`
- Produces: `applySpellForces({ world, props, spellGroup, forces, elapsedSeconds })`

- [ ] Map wind signs to directional force fields.
- [ ] Map levitation to upward impulses.
- [ ] Map crush to inward pressure.
- [ ] Map stillness/binding to damping or temporary constraints.
- [ ] Map fire/heat to visual scorch and low physical impulse.
- [ ] Test each mapping from a frozen activation snapshot.

### Task 5: Interactive 3D Transform With Physics

**Files:**
- Modify: `app.js`
- Test: `tests/environment-interactions.test.mjs`

**Interfaces:**
- Consumes: existing `rotateSelectedSpell3d`, spell dragging, `applySpellForces`

- [ ] Keep current camera controls active unless the user is dragging the spell.
- [ ] Moving the spell updates the force origin.
- [ ] Rotating the spell updates wind/projectile direction.
- [ ] Relaunch keeps object positions and damage states.
- [ ] Test camera mode and spell movement stay separate.

### Task 6: Asset Upgrade Path

**Files:**
- Create: `three-gltf-assets.mjs`
- Modify: `three-physics-props.mjs`
- Test: `tests/three-environment-assets.test.mjs`

**Interfaces:**
- Produces: `loadEnvironmentAsset(asset): Promise<THREE.Object3D>`

- [ ] Load local `.glb` only when present.
- [ ] Use procedural fallback if the file is missing or loading fails.
- [ ] Preserve manifest dimensions after loading.
- [ ] Do not block the 3D panel while assets load.

### Task 7: Performance And Fallbacks

**Files:**
- Modify: `app.js`
- Modify: `docs/3d-environment-long-term-report.md`
- Test: `tests/environment-interactions.test.mjs`

**Interfaces:**
- Produces: `setPhysicsQuality("full" | "reduced" | "visual-only")`

- [ ] Full mode: Rapier props and collisions.
- [ ] Reduced mode: only house/tree/crate have bodies.
- [ ] Visual-only mode: current deterministic reactions.
- [ ] Test that relaunch works in all three modes.
- [ ] Document when each mode is used.

---

## Acceptance Checks

- A 3 m spell beside a house looks like 3 m, not larger than the building.
- Wind pushes grass and tree first, then crate, then house parts only if force is high.
- A roof can lift without deleting the whole house.
- Relaunching the spell restarts only the spell effect, not the damaged scene.
- Camera orbit/pan/zoom remains usable after moving or rotating the spell.
- If Rapier fails to load, the current 3D view still works with visual-only reactions.
