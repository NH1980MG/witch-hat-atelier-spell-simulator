# Immersive 3D Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an interactive, consequence-rich 3D workshop without touching the application demo.

**Architecture:** Put deterministic view policy in a new DOM-free module, keep Rapier as material-state authority, and let `app.js` render and manipulate the resulting scene. Add controls inside the existing 3D overlay so activation and the 2D workshop remain compatible.

**Tech Stack:** Browser JavaScript modules, Three.js, vendored Rapier 0.19.3, HTML/CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-19-immersive-3d-workshop-design.md`

## Global Constraints

- Do not modify `minecraft-mod/` or application-demo artifacts.
- Do not add runtime network dependencies.
- Keep English and French translation catalogs identical.
- Preserve mobile and tablet usability.

---

### Task 1: Deterministic immersive policy

**Files:**
- Create: `immersive-3d.mjs`
- Create: `tests/immersive-3d.test.mjs`

**Interfaces:**
- Produces: `reactionVisualProfile`, `cameraPreset`, `nextCameraMode`, `evaluateWorkshopExperiments`, `canManipulateTarget`.

- [ ] Write tests for all reaction states, camera cycling, experiments, and anchored-target policy.
- [ ] Run the focused test and verify the missing-module failure.
- [ ] Implement the minimal pure module.
- [ ] Run the focused test and verify success.

### Task 2: Material chains and persistent physics

**Files:**
- Modify: `rapier-physics-world.mjs`
- Modify: `tests/rapier-physics-world.test.mjs`

**Interfaces:**
- Produces: snapshots that expose heat, wetness, crystal, adhesion, illumination, and stable reaction transitions.

- [ ] Add failing tests for wet-crystal freezing, fire/water extinguishing, and restoration.
- [ ] Implement bounded cross-material transitions.
- [ ] Run Rapier tests and verify success.

### Task 3: Interactive Three.js workshop

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `i18n.mjs`
- Modify: `tests/manifestation-lifecycle.test.mjs`
- Create: `tests/immersive-3d-ui.test.mjs`

**Interfaces:**
- Consumes: immersive policy and Rapier snapshots.
- Produces: reaction visuals, object selection/drag/reset, live spell fields, camera controls, audio/haptics, and experiment status.

- [ ] Add failing static integration tests for controls and all material states.
- [ ] Add the overlay toolbar, inspector, and experiment card.
- [ ] Render all reaction profiles and synchronize effects continuously.
- [ ] Add target hit-testing, safe dragging, reset actions, camera modes, and feedback.
- [ ] Run focused integration tests and verify success.

### Task 4: Creature silhouettes and responsive finish

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `tests/manifestation-render-policy.test.mjs`

**Interfaces:**
- Produces: dedicated procedural groups for supported decorative creature families.

- [ ] Add a failing renderer-policy test for dedicated creature families.
- [ ] Add recognizable low-poly profiles without external assets.
- [ ] Verify desktop, iPad, and phone overlay layouts.

### Task 5: Verification and publication

**Files:**
- Modify: `docs/progress-tracker.md`

- [ ] Run `node --check app.js` and module checks.
- [ ] Run focused tests, then `node --test tests/*.test.mjs`.
- [ ] Smoke-test activation, interaction, cameras, and closing at `http://127.0.0.1:8000/index.html`.
- [ ] Confirm `minecraft-mod/` is untouched.
- [ ] Commit, push to GitHub, and verify the GitHub Pages deployment.
