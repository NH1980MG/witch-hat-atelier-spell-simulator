# Particle And Material Physics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bounded particle collisions and persistent fire/water material consequences to the published 3D workshop.

**Architecture:** Keep Rapier for rigid objects and add a deterministic spatial-hash particle runtime for elemental interaction packets. Feed aggregated packet collisions into the existing material reaction state machine and expose only bounded summaries to the renderer.

**Tech Stack:** Browser JavaScript modules, Three.js, vendored Rapier 3D, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-21-particle-material-physics-design.md`

## Global Constraints

- Do not add a Rapier rigid body per particle.
- Keep runtime particle count at or below 192 by default.
- Preserve all existing spell-volume reactions and old snapshots.
- Do not add a network or paid dependency.
- Do not modify the Minecraft/application demo.

---

### Task 1: Deterministic Particle Interaction Runtime

**Files:**
- Create: `material-particle-runtime.mjs`
- Create: `tests/material-particle-runtime.test.mjs`

**Interfaces:**
- Produces: `createMaterialParticleRuntime({ maxParticles, cellSize }): MaterialParticleRuntime`
- Produces methods: `emit(particle)`, `step(deltaSeconds, targets, options)`, `snapshot()`, `clear()`

- [x] Write tests proving particles are capped, heat packets collide with nearby targets, and colocated heat/water packets become steam.
- [x] Run `node --test tests/material-particle-runtime.test.mjs` and confirm it fails because the module is missing.
- [x] Implement normalized particles, spatial hashing, target collision aggregation, deterministic movement, and snapshot summaries.
- [x] Run `node --test tests/material-particle-runtime.test.mjs` and confirm all tests pass.

### Task 2: Persistent Material Consequences

**Files:**
- Modify: `rapier-physics-world.mjs`
- Modify: `tests/rapier-physics-world.test.mjs`

**Interfaces:**
- Consumes: `createMaterialParticleRuntime`
- Extends target snapshots with: `temperatureC`, `fuel`, `damage`, `steamExposure`
- Extends physics snapshots with: `particles`

- [x] Write tests showing a burning target ignites a nearby combustible target after the direct spell moves away.
- [x] Write tests showing water cools and extinguishes fire, fuel depletion chars material, and snapshots restore new state.
- [x] Run the focused Rapier tests and confirm the new assertions fail.
- [x] Integrate spell emitters, burning-target emitters, packet effects, material aging, reset, and restore.
- [x] Run `node --test tests/rapier-physics-world.test.mjs tests/material-particle-runtime.test.mjs` and confirm all tests pass.

### Task 3: Visible Consequences And Release Verification

**Files:**
- Modify: `immersive-3d.mjs`
- Modify: `app.js`
- Modify: `tests/immersive-3d.test.mjs`
- Modify: `tests/manifestation-lifecycle.test.mjs`
- Modify: `docs/3d-environment-long-term-report.md`

**Interfaces:**
- Consumes target states: `steaming`, `smoldering`, `charred`
- Consumes particle summary: `{ count, byKind, events }`

- [x] Write failing tests for bounded visual profiles and runtime consumption of particle summaries.
- [x] Add steam, smoke, ember, and char visual profiles using the existing reaction overlay system.
- [x] Document the hybrid runtime and performance budget.
- [x] Run focused tests, then `node --test`.
- [x] Smoke-test the local 3D view and confirm the WebGL canvas is visible and nonblank.
- [ ] Commit, push to `origin/main`, and verify GitHub Pages serves the new revision.
