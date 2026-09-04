# Sequenced Flower Crystal Manifestation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn confirmed symbol semantics into an ordered water-to-flower-to-crystal-to-fracture manifestation with deterministic procedural petals and bounded physical fragments.

**Architecture:** Imported placement kind and catalogue semantic kind remain separate, so a sigil repeated from a WHA `signs` collection still contributes sigil meaning. A pure timeline builder converts a canonical recipe into serializable stages, and the 3D layer consumes deterministic flower parameters without owning grammar logic.

**Tech Stack:** Browser ES modules, existing spell grammar and manifestation synthesis, Three.js, existing Rapier particle/physics runtime, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-04-local-neural-symbol-recognition-flower-sequence-design.md`

**Dependency:** Complete `docs/superpowers/plans/2026-09-04-dual-local-symbol-networks.md` first so this plan can consume `buildRecognitionSnapshot(actions)` and validated semantic actions.

## Global Constraints

- Recognition semantics must be confirmed or high-confidence verified before grammar consumption.
- Visual placement kind must not override the catalogue semantic kind.
- The target sequence is `water -> flower -> enlarge -> crystallize -> fracture -> disperse/aim`.
- The same canonical spell produces the same petals, stages, and fracture pattern.
- High quality is bounded to 24 petals and 160 active shard or particle bodies; mobile modes use lower caps.
- Reduced-motion mode preserves all semantic stages while shortening rapid transitions.
- Existing generic manifestations and legacy circle documents remain compatible.

---

## File Structure

- Create `manifestation-timeline.mjs`: pure ordered stage construction and validation.
- Create `flower-crystal-manifestation.mjs`: deterministic petal, material, and fracture parameters.
- Modify `wha-spell-maker-import.mjs`: catalogue semantic kind for cross-collection symbols.
- Modify `spell-grammar.mjs`: consume validated recognized semantics and expose ordered operations.
- Modify `manifestation-synthesis.mjs`: attach a timeline and select flower-crystal specialization.
- Modify `immersive-3d.mjs`: public bounded flower phase helpers.
- Modify `app.js`: instantiate, advance, and clean up the procedural manifestation.
- Modify `i18n.mjs`: stage and warning labels.

### Task 1: Separate WHA Placement Kind from Semantic Kind

**Files:**
- Modify: `wha-spell-maker-import.mjs`
- Modify: `circle-share.mjs`
- Test: `tests/wha-spell-maker-import.test.mjs`
- Test: `tests/circle-share.test.mjs`

**Interfaces:**
- Image and glyph actions may contain `semantic: { element, kind, source, confidence, recognizer, modelVersion, intrinsicRotation }`.
- `kind` continues to control radial placement; `semantic.kind` controls spell grammar.

- [ ] **Step 1: Write a failing cross-collection sigil test**

```js
test("sigil Crystalize repeated from WHA signs keeps sigil semantics", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{ signs: [{ name: "sigil_Crystalize", amount: 4 }] }],
  });
  const crystals = result.circle.actions.filter(({ element }) => element === "Cristal");
  assert.equal(crystals.length, 4);
  assert.ok(crystals.every(({ kind }) => kind === "sign"));
  assert.ok(crystals.every(({ semantic }) => semantic.kind === "sigil"));
});
```

- [ ] **Step 2: Run importer tests and verify the semantic-kind failure**

Run: `node --test tests/wha-spell-maker-import.test.mjs tests/circle-share.test.mjs`

Expected: FAIL because `sigil_Crystalize` currently inherits the `signs` collection kind.

- [ ] **Step 3: Add catalogue-driven semantic metadata**

```js
function importedGlyphAction(source, collectionKind, placement) {
  const element = canonicalWhaSymbolName(source.name);
  const semanticKind = SIGIL_PROFILES[element]
    ? "sigil"
    : SIGN_PROFILES[element]
      ? "sign"
      : null;
  return {
    type: "glyph",
    element,
    kind: collectionKind,
    ...placement,
    semantic: semanticKind ? {
      element,
      kind: semanticKind,
      source: "confirmed",
      confidence: 1,
      recognizer: "confirmed",
      modelVersion: "wha-catalogue-v1",
      intrinsicRotation: 0,
    } : undefined,
  };
}
```

Preserve both kinds through share parsing with strict catalogue validation.

- [ ] **Step 4: Run importer and share tests**

Run: `node --test tests/wha-spell-maker-import.test.mjs tests/circle-share.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit semantic kind separation**

```bash
git add wha-spell-maker-import.mjs circle-share.mjs tests/wha-spell-maker-import.test.mjs tests/circle-share.test.mjs
git commit -m "fix: preserve imported sigil semantics"
```

### Task 2: Ordered Manifestation Timeline

**Files:**
- Create: `manifestation-timeline.mjs`
- Test: `tests/manifestation-timeline.test.mjs`

**Interfaces:**
- Produces: `buildManifestationTimeline({ material, operations, geometry, spellId })`.
- Returns deeply frozen `{ id, durationMs, stages }`, where every stage has `{ id, start, duration, consumes, inputMaterial, outputMaterial, form, transition }`.

- [ ] **Step 1: Write failing order and determinism tests**

```js
test("water flower crystal crush dispersion becomes a complete sequence", () => {
  const timeline = buildManifestationTimeline(waterFlowerCrystalRecipe());
  assert.deepEqual(timeline.stages.map(({ id }) => id), [
    "material-acquisition", "flower-formation", "enlargement",
    "crystallization", "fracture", "directed-dispersion",
  ]);
});

test("timeline is deterministic and bounded", () => {
  const first = buildManifestationTimeline(waterFlowerCrystalRecipe());
  assert.deepEqual(first, buildManifestationTimeline(waterFlowerCrystalRecipe()));
  assert.ok(first.durationMs >= 1200 && first.durationMs <= 12000);
  assert.ok(Object.isFrozen(first.stages));
});
```

- [ ] **Step 2: Run timeline tests and verify the missing module**

Run: `node --test tests/manifestation-timeline.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement canonical stage ordering**

```js
const STAGE_ORDER = Object.freeze([
  "material-acquisition", "shape-formation", "scale-transformation",
  "state-transformation", "fracture", "release-motion",
  "targeting", "stabilization",
]);

export function buildManifestationTimeline(input) {
  const stages = collectStages(input).sort((a, b) => STAGE_ORDER.indexOf(a.role) - STAGE_ORDER.indexOf(b.role));
  return freezeTimeline(normalizeStageDurations(stages, input.spellId));
}
```

Map `Eau` to acquisition, `Fleur` to shape formation, `Agrandissement` to scale, `Cristal` to state transformation, `Crush` to fracture, and `Dispersion` or `Cible` to release and targeting. Unsupported operations remain secondary metadata rather than disappearing.

- [ ] **Step 4: Run timeline tests**

Run: `node --test tests/manifestation-timeline.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit timeline construction**

```bash
git add manifestation-timeline.mjs tests/manifestation-timeline.test.mjs
git commit -m "feat: build ordered manifestation timelines"
```

### Task 3: Grammar and Synthesis Integration

**Files:**
- Modify: `spell-grammar.mjs`
- Modify: `manifestation-synthesis.mjs`
- Test: `tests/spell-grammar.test.mjs`
- Test: `tests/manifestation-synthesis.test.mjs`

**Interfaces:**
- `composeSpellRecipe` consumes `semanticActions` in addition to exact glyph lists.
- `synthesizeManifestation` returns `timeline` and selects `water.crystal-flower-fracture` for the complete sequence.

- [ ] **Step 1: Write failing recipe and synthesis tests**

```js
test("confirmed image semantics contribute to the recipe", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Fleur", "Cristal"],
    signs: ["Agrandissement", "Crush", "Dispersion", "Cible"],
  });
  assert.ok(recipe.operations.state.includes("crystallize"));
  assert.ok(recipe.operations.state.includes("crush"));
});

test("the complete recipe selects the sequenced flower manifestation", () => {
  const result = synthesizeManifestation(completeFlowerInput());
  assert.equal(result.id, "water.crystal-flower-fracture");
  assert.equal(result.timeline.stages.at(-1).id, "directed-dispersion");
});
```

- [ ] **Step 2: Run grammar and synthesis tests and verify failures**

Run: `node --test tests/spell-grammar.test.mjs tests/manifestation-synthesis.test.mjs`

Expected: FAIL because crystallization and ordered timelines are not integrated.

- [ ] **Step 3: Consume validated semantics and attach the timeline**

```js
function acceptedSemanticActions(actions) {
  return actions
    .map((action) => action.semantic)
    .filter((semantic) => semantic?.source === "confirmed" || semantic?.source === "verified");
}

const timeline = buildManifestationTimeline({
  material: materialProfile,
  operations: normalizedOperations,
  geometry: normalizedGeometry,
  spellId,
});
```

Extend `synthesizeManifestation` to accept the canonical `spellId`. Deduplicate repeated semantics for identity while retaining occurrence count as strength. Select `water.crystal-flower-fracture` before generic crystal-fragment rules so the complete sequence cannot collapse into a generic effect.

- [ ] **Step 4: Run grammar, synthesis, and matrix validation**

Run: `node --test tests/spell-grammar.test.mjs tests/manifestation-synthesis.test.mjs && node scripts/validate-spell-matrix.mjs`

Expected: PASS with existing matrix counts unchanged.

- [ ] **Step 5: Commit grammar integration**

```bash
git add spell-grammar.mjs manifestation-synthesis.mjs tests/spell-grammar.test.mjs tests/manifestation-synthesis.test.mjs
git commit -m "feat: synthesize sequenced crystal flowers"
```

### Task 4: Deterministic Procedural Flower Parameters

**Files:**
- Create: `flower-crystal-manifestation.mjs`
- Test: `tests/flower-crystal-manifestation.test.mjs`

**Interfaces:**
- Produces: `createFlowerManifestationPlan({ spellId, timeline, quality, geometry })`.
- Returns: `{ petals, core, materials, fracture, bounds }` without Three.js objects.

- [ ] **Step 1: Write failing geometry-bound tests**

```js
test("flower plans have visible petals and bounded shards", () => {
  const plan = createFlowerManifestationPlan(completeFlowerPlanInput("spell-a"));
  assert.ok(plan.petals.length >= 5 && plan.petals.length <= 24);
  assert.ok(plan.fracture.shards.length <= 160);
  assert.ok(plan.petals.every(({ length, width }) => length > width && width > 0));
});

test("the same spell id produces the same flower", () => {
  assert.deepEqual(
    createFlowerManifestationPlan(completeFlowerPlanInput("spell-a")),
    createFlowerManifestationPlan(completeFlowerPlanInput("spell-a")),
  );
});
```

- [ ] **Step 2: Run flower-plan tests and verify failure**

Run: `node --test tests/flower-crystal-manifestation.test.mjs`

Expected: FAIL because the procedural module is absent.

- [ ] **Step 3: Implement seeded petals, crystal sweep, and fragments**

```js
export function createFlowerManifestationPlan({ spellId, timeline, quality = "high", geometry = {} }) {
  const random = seededRandom(hashSpellId(spellId));
  const limits = quality === "high" ? { petals: 24, shards: 160 } : { petals: 12, shards: 72 };
  const petals = createPetals(random, limits.petals, geometry);
  const shards = createPetalShards(random, petals, limits.shards, geometry.vector);
  return freezeDeep({ petals, core: createCore(petals), materials: phaseMaterials(timeline), fracture: { shards } });
}
```

Each petal descriptor includes radial layer, angle, curve, length, width, and growth delay. Each shard has bounded mass, impulse, angular velocity, lifetime, and target bias.

- [ ] **Step 4: Run flower-plan tests**

Run: `node --test tests/flower-crystal-manifestation.test.mjs`

Expected: PASS for desktop, mobile, reduced-motion, finite values, and deterministic replay.

- [ ] **Step 5: Commit procedural plans**

```bash
git add flower-crystal-manifestation.mjs tests/flower-crystal-manifestation.test.mjs
git commit -m "feat: generate procedural crystal flowers"
```

### Task 5: Three.js and Physics Phase Rendering

**Files:**
- Modify: `immersive-3d.mjs`
- Modify: `app.js`
- Modify: `i18n.mjs`
- Test: `tests/immersive-3d.test.mjs`
- Test: `tests/manifestation-lifecycle.test.mjs`
- Test: `tests/activation-snapshot.test.mjs`

**Interfaces:**
- Produces: `manifestationPhaseAt(timeline, elapsedMs)` and `flowerPhaseProfile(stage, progress, reducedMotion)`.
- `app.js` owns Three.js mesh creation and disposes every geometry, material, shard body, and particle allocation when replaying or clearing.

- [ ] **Step 1: Write failing phase and lifecycle tests**

```js
test("flower phases advance in timeline order", () => {
  assert.equal(manifestationPhaseAt(timeline, 0).id, "material-acquisition");
  assert.equal(manifestationPhaseAt(timeline, timeline.durationMs - 1).id, "directed-dispersion");
});

test("reduced motion preserves crystallization and fracture", () => {
  const stages = reducedFlowerProfiles(timeline).map(({ id }) => id);
  assert.ok(stages.includes("crystallization"));
  assert.ok(stages.includes("fracture"));
});
```

- [ ] **Step 2: Run 3D phase tests and verify failures**

Run: `node --test tests/immersive-3d.test.mjs tests/manifestation-lifecycle.test.mjs tests/activation-snapshot.test.mjs`

Expected: FAIL because flower phases are not exposed or instantiated.

- [ ] **Step 3: Implement bounded phase helpers and renderer integration**

```js
export function manifestationPhaseAt(timeline, elapsedMs) {
  const elapsed = Math.max(0, Math.min(timeline.durationMs, Number(elapsedMs) || 0));
  const stage = timeline.stages.find((entry) => elapsed < entry.start + entry.duration) || timeline.stages.at(-1);
  return Object.freeze({
    ...stage,
    progress: Math.max(0, Math.min(1, (elapsed - stage.start) / Math.max(1, stage.duration))),
  });
}
```

Create petals as instanced geometry around a central core. Animate water opacity and surface motion during acquisition, petal scale during formation and enlargement, crystal material sweep during crystallization, then replace visible petals with bounded Rapier shards during fracture. Apply dispersion and target vectors only after fracture starts. Register every allocation in the existing manifestation lifecycle cleanup.

- [ ] **Step 4: Run 3D, lifecycle, physics, and activation tests**

Run: `node --test tests/immersive-3d.test.mjs tests/manifestation-lifecycle.test.mjs tests/particle-physics.test.mjs tests/rapier-physics-world.test.mjs tests/activation-snapshot.test.mjs`

Expected: PASS with finite vectors, bounded bodies, and complete cleanup.

- [ ] **Step 5: Commit 3D rendering**

```bash
git add immersive-3d.mjs app.js i18n.mjs tests/immersive-3d.test.mjs tests/manifestation-lifecycle.test.mjs tests/activation-snapshot.test.mjs
git commit -m "feat: render sequenced crystal flower effects"
```

### Task 6: Complete Imported-Spell Regression and Browser Verification

**Files:**
- Modify: `tests/wha-spell-maker-import.test.mjs`
- Modify: `tests/spell-app-integration.test.mjs`
- Modify: `README.md`
- Modify: `docs/spell-effect-catalog.md`

**Interfaces:**
- Validates the supplied WHA composition from import through semantics, timeline, procedural plan, and activation.

- [ ] **Step 1: Add the complete regression fixture and failing assertions**

```js
test("the reported WHA spell keeps circles and performs the full sequence", () => {
  const imported = convertWhaSpellMakerDocument(REPORTED_WHA_FLOWER_DOCUMENT);
  assert.equal(imported.circle.actions.filter(({ type }) => type === "circle").length, 3);
  assert.equal(imported.circle.actions.length, 132);
  assert.deepEqual(imported.manifestation.timeline.stages.map(({ id }) => id), [
    "material-acquisition", "flower-formation", "enlargement",
    "crystallization", "fracture", "directed-dispersion",
  ]);
});
```

- [ ] **Step 2: Run the focused regression and verify any missing integration**

Run: `node --test tests/wha-spell-maker-import.test.mjs tests/spell-app-integration.test.mjs`

Expected: FAIL until the fixture passes through the complete activation path.

- [ ] **Step 3: Connect the final fixture path without adding spell-specific exceptions**

```js
const imported = convertWhaSpellMakerDocument(REPORTED_WHA_FLOWER_DOCUMENT);
const recognition = buildRecognitionSnapshot(imported.circle.actions);
const recipe = composeSpellRecipe(recognition.recipeInput);
const manifestation = synthesizeManifestation(recipe);
const flower = createFlowerManifestationPlan({
  spellId: manifestation.spellId,
  timeline: manifestation.timeline,
  geometry: recipe.geometry,
});
```

Fix only generic importer, semantic, grammar, timeline, or renderer boundaries revealed by this flow. Do not add an ID check, filename check, or hard-coded result for the supplied spell.

- [ ] **Step 4: Run complete verification**

Run: `node --check app.js && node --test tests/*.test.mjs && node scripts/validate-spell-matrix.mjs && node scripts/security-audit.mjs`

Expected: all commands exit zero.

- [ ] **Step 5: Smoke-test the imported spell**

Run: `./scripts/start-local-server.sh`

At `http://127.0.0.1:8000/index.html`, import the supplied JSON, verify all three circles and 132 editable actions, confirm two grouped custom symbols rather than 110 prompts, activate the spell, and observe every timeline phase. Confirm that clearing and replaying leaves no stale petals or physics bodies.

- [ ] **Step 6: Document and commit the completed manifestation**

```bash
git add tests/wha-spell-maker-import.test.mjs tests/spell-app-integration.test.mjs README.md docs/spell-effect-catalog.md
git commit -m "test: cover imported crystal flower sequence"
```
