# Manifestation Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace visibly stacked elemental/sign effects with one deterministic physical manifestation plan while preserving only independent secondary effects.

**Architecture:** A pure `manifestation-synthesis.mjs` module converts the existing recipe, geometry, and support plan into a frozen serializable manifestation plan. `spell-grammar.mjs` attaches that plan to every recipe, and both 2D/3D renderers consult consumed operations before adding secondary layers.

**Tech Stack:** Plain JavaScript ES modules, Node test runner, Canvas 2D, Three.js, static GitHub Pages.

## Global Constraints

- No new framework, package manager, backend, or full physics engine.
- Preserve deterministic static deployment.
- Mark community-derived behavior as inferred, never documented canon.
- No support may create magic absent from the recipe.
- Stop and dispose every active manifestation on deactivation, replacement, close, and navigation.
- Keep particle counts bounded and animation updates allocation-light.

---

### Task 1: Pure Synthesis Planner

**Files:**
- Create: `manifestation-synthesis.mjs`
- Create: `tests/manifestation-synthesis.test.mjs`

**Interfaces:**
- Produces `synthesizeManifestation({ materialProfile, elementalMixture, operations, axes, geometry, supportPlan, fidelity }): Readonly<ManifestationPlan>`.
- `ManifestationPlan` exposes `id`, `fidelity`, bilingual labels, `material`, `form`, `motion`, `lifecycle`, `consumedOperations`, `secondaryOperations`, `supportInteraction`, and `warnings`.

- [ ] **Step 1:** Add failing tests for water/earth/crush, water/wind/focus, fire/wind/rotation, crystal/crush/column, water/levitation, generic recipes, contradictions, geometry drift/spin, support behavior, finite values, and deep immutability.
- [ ] **Step 2:** Run `node --test tests/manifestation-synthesis.test.mjs` and confirm the missing module failure.
- [ ] **Step 3:** Implement ordered material/state/form/motion/pressure/direction/scope/target synthesis and the six base-element pair families.
- [ ] **Step 4:** Implement conservative generic fallback, operation consumption, secondary-operation preservation, fidelity propagation, and warnings.
- [ ] **Step 5:** Run the focused tests and confirm deterministic plans.
- [ ] **Step 6:** Commit the planner and tests.

### Task 2: Recipe and Snapshot Integration

**Files:**
- Modify: `spell-grammar.mjs`, `spell-model.mjs`
- Modify: `tests/spell-grammar.test.mjs`, `tests/activation-snapshot.test.mjs`, `scripts/validate-spell-matrix.mjs`

**Interfaces:**
- Every recipe exposes `manifestationPlan`.
- Activation snapshots deep-freeze the plan with the rest of the active spell.

- [ ] **Step 1:** Add failing tests requiring a deterministic plan on normal, mixed, raw-energy, and supported recipes.
- [ ] **Step 2:** Run focused tests and confirm the plan is absent.
- [ ] **Step 3:** Call the pure planner after geometry, effect, and support plans are finalized.
- [ ] **Step 4:** Include plan uniqueness/finite checks in matrix validation and confirm activation snapshot immutability.
- [ ] **Step 5:** Run grammar, snapshot, and matrix validation tests.
- [ ] **Step 6:** Commit recipe integration and tests.

### Task 3: Coherent 2D and 3D Rendering

**Files:**
- Modify: `app.js`
- Create: `tests/manifestation-render-policy.test.mjs`
- Modify: `tests/activation-snapshot.test.mjs`, `tests/shoe-render-policy.test.mjs`

**Interfaces:**
- `manifestationConsumes(plan, operation)` gates legacy layers.
- Specialized mixture renderers use plan material/form/motion instead of adding consumed sign layers.
- Independent operations remain renderable through `secondaryOperations`.

- [ ] **Step 1:** Add failing source-policy tests forbidding consumed operation layers and requiring the activation snapshot plan in both render paths.
- [ ] **Step 2:** Run focused tests and confirm current stacked rendering fails.
- [ ] **Step 3:** Read `state.activeSpell.recipe.manifestationPlan` in 3D and the current recipe plan in 2D.
- [ ] **Step 4:** Suppress consumed form, motion, state, supply, scope, and target layers in the combined and grammar renderers.
- [ ] **Step 5:** Add coherent plan-driven handling for dense mud projection, pressurized mist jet, flame vortex, crystal fragments, and growing suspended water.
- [ ] **Step 6:** Ensure shoe support changes contact/force only and default support remains none.
- [ ] **Step 7:** Run focused rendering and support tests.
- [ ] **Step 8:** Commit rendering integration and tests.

### Task 4: Lifecycle and Resource Cleanup

**Files:**
- Modify: `app.js`
- Create: `tests/manifestation-lifecycle.test.mjs`

**Interfaces:**
- `disposeObject3d(root)` disposes owned geometry/material/texture resources.
- `clearActiveManifestation(reason)` stops animation, removes the scene group, disposes resources, and clears state.

- [ ] **Step 1:** Add failing tests for stop on timeout, explicit deactivation, recipe replacement, view close, and navigation.
- [ ] **Step 2:** Run the lifecycle test and confirm direct group removal lacks disposal.
- [ ] **Step 3:** Implement one cleanup path and replace direct spell-group removal sites with it.
- [ ] **Step 4:** Bound growth/particle parameters from the plan and stop all animator updates after cleanup.
- [ ] **Step 5:** Run lifecycle and activation tests.
- [ ] **Step 6:** Commit cleanup behavior and tests.

### Task 5: Read, Details, Tutorial, and Fidelity Copy

**Files:**
- Modify: `app.js`, `i18n.mjs`, `fonctionnement.html`, `tutoriel.html`, `docs/mechanics-fidelity-report.md`
- Modify: `tests/tutorial.test.mjs`, `tests/ui-structure.test.mjs`

**Interfaces:**
- Details surfaces show the synthesized manifestation, material, form, motion, support interaction, fidelity, drift, and independent secondary effects.
- Consumed signs remain in the explanation but not as separate visible effects.

- [ ] **Step 1:** Add failing tests for bilingual synthesis labels, fidelity notices, and absence of consumed-effect lists.
- [ ] **Step 2:** Run focused tests and confirm the new copy is absent.
- [ ] **Step 3:** Add localized labels and render the plan in Read/Details.
- [ ] **Step 4:** Update tutorial and fidelity report with documented/inferred distinctions and Discord-community attribution rules.
- [ ] **Step 5:** Run focused UI/tutorial tests.
- [ ] **Step 6:** Commit documentation and UI explanation changes.

### Task 6: Validation and GitHub Publication

**Files:**
- Modify release documentation only when verification results require it.

**Interfaces:**
- Publishes the exact tested branch through the existing GitHub pull request and GitHub Pages workflow.

- [ ] **Step 1:** Synchronize the branch with its remote counterpart without staging or modifying the unrelated `minecraft-mod/` directory.
- [ ] **Step 2:** Run `node --check app.js`, every focused synthesis test, and `node --test tests/*.test.mjs`.
- [ ] **Step 3:** Run matrix validation and security/static checks.
- [ ] **Step 4:** Start the local server and capture desktop/mobile 3D smoke tests for mud, mist, flame vortex, and suspended water; confirm nonblank canvas pixels and no stale scene after stop.
- [ ] **Step 5:** Commit final verification documentation if changed.
- [ ] **Step 6:** Push the branch, update the existing pull request, and verify GitHub Pages checks.
