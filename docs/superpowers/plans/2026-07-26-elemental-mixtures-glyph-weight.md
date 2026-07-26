# Elemental Mixtures And Glyph Weight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equalize central-sigil stroke weight with modifier signs and add deterministic, searchable mixtures of the four base elements.

**Architecture:** A focused `elemental-mixtures.mjs` module composes the 11 finite base-element material classes and calculates dominance from counts. `spell-grammar.mjs` consumes that result before applying signs and supports, while `variant-catalog.mjs` indexes only the 11 balanced mixture signatures in addition to its existing records. The glyph generator regenerates only central sigils toward the measured modifier-sign weight and records reproducible QA metrics.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node.js built-in test runner, Sharp-based development asset generator, plain JSON QA reports.

## Global Constraints

- Mix only `Feu`, `Eau`, `Terre`, and `Vent`.
- Index exactly 11 new distinct mixtures; do not enumerate arbitrary sigil counts, geometry, or all other sigils.
- Repetition changes dominance and intensity but not the material class.
- Preserve existing behavior for recipes containing any non-base sigil.
- Modifier signs remain unchanged.
- Raster glyphs remain 192 by 192 transparent PNG files.
- French and English UI content remain equivalent.
- Do not add a package manager, framework, or runtime server dependency.

---

### Task 1: Elemental Composition Domain Module

**Files:**
- Create: `elemental-mixtures.mjs`
- Create: `tests/elemental-mixtures.test.mjs`

**Interfaces:**
- Produces: `BASE_ELEMENT_NAMES: readonly string[]`
- Produces: `INDEXED_ELEMENTAL_MIXTURES: readonly (readonly string[])[]`
- Produces: `composeElementalMixture(sigilCounts): null | ElementalMixture`
- `ElementalMixture` includes `id`, `elements`, `counts`, `dominantElements`, `dominantElement`, `balance`, `intensity`, `fidelity`, `ruleId`, and `materialProfile`.

- [ ] **Step 1: Write the failing domain tests**

```js
test("the module exposes exactly eleven multi-element signatures", () => {
  assert.equal(INDEXED_ELEMENTAL_MIXTURES.length, 11);
  assert.deepEqual(
    new Set(INDEXED_ELEMENTAL_MIXTURES.map((names) => names.join("+"))).size,
    11,
  );
});

test("water and earth produce a deterministic mud profile", () => {
  const left = composeElementalMixture({ Eau: 1, Terre: 1 });
  const right = composeElementalMixture({ Terre: 1, Eau: 1 });
  assert.equal(left.id, "eau+terre");
  assert.equal(left.materialProfile.family, "mud");
  assert.deepEqual(left, right);
});

test("repetition changes dominance without changing material class", () => {
  const balanced = composeElementalMixture({ Eau: 1, Terre: 1 });
  const waterLed = composeElementalMixture({ Eau: 2, Terre: 1 });
  assert.equal(waterLed.id, balanced.id);
  assert.equal(waterLed.dominantElement, "Eau");
  assert.ok(waterLed.balance < balanced.balance);
  assert.ok(waterLed.intensity > balanced.intensity);
});

test("non-base sigils disable elemental mixture inference", () => {
  assert.equal(composeElementalMixture({ Eau: 1, Lumiere: 1 }), null);
});
```

- [ ] **Step 2: Run the domain test to verify it fails**

Run: `node --test tests/elemental-mixtures.test.mjs`

Expected: FAIL because `elemental-mixtures.mjs` does not exist.

- [ ] **Step 3: Implement the finite profile table and deterministic composer**

Define the six pair, four triple, and one quadruple profiles as frozen records.
Normalize element order with `BASE_ELEMENT_NAMES`, reject unknown/non-base
entries, calculate `balance = minCount / maxCount`, and calculate
`intensity = totalCount / elements.length`.

```js
export function composeElementalMixture(sigilCounts = {}) {
  const positive = normalizeBaseCounts(sigilCounts);
  if (!positive || positive.length < 2) return null;
  const id = positive.map(([name]) => slug(name)).join("+");
  const profile = MIXTURE_PROFILES[id];
  if (!profile) return null;
  const counts = Object.fromEntries(positive);
  const maximum = Math.max(...positive.map(([, count]) => count));
  const minimum = Math.min(...positive.map(([, count]) => count));
  const dominantElements = positive
    .filter(([, count]) => count === maximum)
    .map(([name]) => name);
  return deepFreeze({
    id,
    elements: positive.map(([name]) => name),
    counts,
    dominantElements,
    dominantElement: dominantElements.length === 1 ? dominantElements[0] : null,
    balance: minimum / maximum,
    intensity: positive.reduce((sum, [, count]) => sum + count, 0) / positive.length,
    fidelity: profile.fidelity,
    ruleId: `material.mix.${id}`,
    materialProfile: profile,
  });
}
```

- [ ] **Step 4: Run the domain tests**

Run: `node --test tests/elemental-mixtures.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the domain module**

```bash
git add elemental-mixtures.mjs tests/elemental-mixtures.test.mjs
git commit -m "feat: model base elemental mixtures"
```

---

### Task 2: Spell Grammar And Runtime Composition

**Files:**
- Modify: `spell-grammar.mjs`
- Modify: `tests/spell-grammar.test.mjs`
- Modify: `tests/spell-model.test.mjs`

**Interfaces:**
- Consumes: `composeElementalMixture(sigilCounts)` from Task 1.
- Produces: `recipe.elementalMixture` and mixture-aware `materialProfile`.
- Preserves: `recipe.material` as the dominant/primary sigil for compatibility.

- [ ] **Step 1: Write failing grammar tests**

```js
test("base sigils compose before signs and supports", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre"],
    signs: ["Convergence", "Solidification"],
    supportId: "none",
  });
  assert.equal(recipe.elementalMixture.id, "eau+terre");
  assert.equal(recipe.materialProfile.family, "mud");
  assert.ok(recipe.ruleIds.includes("material.mix.eau+terre"));
  assert.ok(recipe.effectPlan.pipeline[0].includes("mud"));
});

test("element order does not change identity", () => {
  const left = composeSpellRecipe({ sigils: ["Eau", "Terre"], signs: ["Colonne"] });
  const right = composeSpellRecipe({ sigils: ["Terre", "Eau"], signs: ["Colonne"] });
  assert.deepEqual(left, right);
});

test("base repetition changes plan parameters and identity", () => {
  const balanced = composeSpellRecipe({ sigils: ["Eau", "Terre"] });
  const dominant = composeSpellRecipe({ sigils: ["Eau", "Eau", "Terre"] });
  assert.notEqual(balanced.id, dominant.id);
  assert.equal(dominant.elementalMixture.dominantElement, "Eau");
  assert.ok(dominant.effectPlan.parameters.elementIntensity > balanced.effectPlan.parameters.elementIntensity);
});

test("non-base combinations retain primary-sigil behavior", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau", "Cristal"] });
  assert.equal(recipe.elementalMixture, null);
  assert.equal(recipe.materialProfile.family, "water");
});
```

- [ ] **Step 2: Run the focused grammar tests and confirm failure**

Run: `node --test tests/spell-grammar.test.mjs tests/spell-model.test.mjs`

Expected: FAIL on missing mixture fields and rules.

- [ ] **Step 3: Integrate composition before sign compatibility checks**

Import `composeElementalMixture`, compute the mixture from
`sigilCountObject`, and use its `materialProfile` when present. Add the mixture
mechanic, rule ID, fidelity, and warnings before signs are processed. Extend
effect-plan parameters with:

```js
elementBalance: elementalMixture?.balance ?? 1,
elementIntensity: elementalMixture?.intensity ?? 1,
elementCount: elementalMixture?.elements.length ?? Number(Boolean(primaryName)),
```

Keep `composeSupportPlan({ primarySigil: primaryName })` unchanged so existing
support policy remains stable.

- [ ] **Step 4: Run grammar and integration tests**

Run: `node --test tests/spell-grammar.test.mjs tests/spell-model.test.mjs tests/spell-app-integration.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit grammar integration**

```bash
git add spell-grammar.mjs tests/spell-grammar.test.mjs tests/spell-model.test.mjs
git commit -m "feat: compose base materials in spell grammar"
```

---

### Task 3: Searchable 54,834-Variant Explorer

**Files:**
- Modify: `variant-catalog.mjs`
- Modify: `variant-explorer.js`
- Modify: `bibliotheque.html`
- Modify: `tests/variant-catalog.test.mjs`
- Modify: `tests/library-explorer-ui.test.mjs`
- Modify: `tests/variant-worker.test.mjs`

**Interfaces:**
- Consumes: `INDEXED_ELEMENTAL_MIXTURES` from Task 1.
- Produces: records with `sigils: readonly string[]` and compatibility field `sigil`.
- Changes filter semantics: a sigil filter matches any `record.sigils` entry.

- [ ] **Step 1: Write failing catalogue tests**

```js
test("the explorer indexes 54,834 unique deterministic variants", () => {
  assert.equal(records.length, 54_834);
  assert.equal(new Set(records.map(({ id }) => id)).size, 54_834);
  assert.equal(records.filter(({ supportId }) => supportId === "none").length, 27_417);
  assert.equal(records.filter(({ supportId }) => supportId === "shoe").length, 27_417);
});

test("mixtures are searchable and filterable by either element", () => {
  const result = queryVariants(records, {
    ...DEFAULT_EXPLORER_STATE,
    search: "mud",
    sigil: "Eau",
  });
  assert.ok(result.filtered > 0);
  assert.ok(result.records.every(({ sigils }) => sigils.includes("Eau") && sigils.includes("Terre")));
});
```

- [ ] **Step 2: Run the catalogue tests and confirm the old total fails**

Run: `node --test tests/variant-catalog.test.mjs tests/library-explorer-ui.test.mjs tests/variant-worker.test.mjs`

Expected: FAIL with 38,532 instead of 54,834.

- [ ] **Step 3: Index single sigils and finite mixtures through one material-signature loop**

Create signatures:

```js
const MATERIAL_SIGNATURES = Object.freeze([
  ...MATRIX_SIGIL_NAMES.map((sigil) => Object.freeze([sigil])),
  ...INDEXED_ELEMENTAL_MIXTURES,
]);
```

For each signature, call `composeSpellRecipe({ sigils, signs, supportId })`.
Store all participating `sigils`, use `recipe.material` as the compatibility
`sigil`, add translated mixture aliases to `searchText`, and update
`getVariantDetail()` to reconstruct with `record.sigils`.

- [ ] **Step 4: Update explorer rendering**

Render the material title from all participating sigils, expose the component
list and elemental fidelity in the dialog, and keep pagination at 50 records.
The search and filter controls retain their current keyboard and mobile
behavior.

- [ ] **Step 5: Run catalogue and worker tests**

Run: `node --test tests/variant-catalog.test.mjs tests/library-explorer-ui.test.mjs tests/variant-worker.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the explorer**

```bash
git add variant-catalog.mjs variant-explorer.js bibliotheque.html tests/variant-catalog.test.mjs tests/library-explorer-ui.test.mjs tests/variant-worker.test.mjs
git commit -m "feat: index elemental mixture variants"
```

---

### Task 4: Equalize Central-Sigil Stroke Weight

**Files:**
- Modify: `scripts/generate-symbol-board-assets.mjs`
- Modify: `assets/symbol-glyphs/*.png` for the 25 raster central sigils only
- Modify: `app.js`
- Create: `docs/qa/2026-07-26-central-sigil-weight-report.json`
- Modify: `tests/generated-symbol-assets.test.mjs`
- Modify: `tests/symbol-catalog.test.mjs`

**Interfaces:**
- Consumes: `MATRIX_SIGIL_NAMES` to distinguish central sigils from signs.
- Produces: 25 raster sigils with measured stroke widths in the modifier-sign band.
- Preserves: all 38 modifier-sign file hashes.

- [ ] **Step 1: Extend asset tests before regeneration**

Assert:

```js
assert.equal(report.targetReference, "modifier-sign-median");
assert.ok(report.modifierSignMedian >= 6.3 && report.modifierSignMedian <= 6.5);
assert.equal(report.entries.length, 25);
for (const entry of report.entries) {
  assert.ok(entry.outputStrokeWidth >= report.acceptedBand.minimum);
  assert.ok(entry.preservedOpenings);
}
```

Record all modifier-sign hashes before regeneration and assert they match
afterward. Add an assertion that the vector `Vent` line width equals the
central-sigil target token.

- [ ] **Step 2: Run asset tests and confirm failure**

Run: `node --test tests/generated-symbol-assets.test.mjs tests/symbol-catalog.test.mjs`

Expected: FAIL because the central-sigil report and target token do not exist.

- [ ] **Step 3: Add category-aware supersampled dilation**

Update the generator to:

1. extract the source board cell;
2. measure aggregate stroke width;
3. supersample the alpha mask;
4. dilate central sigils iteratively toward the 6.4-pixel target;
5. downsample to 192 by 192;
6. reject a candidate if a required transparent opening disappears;
7. leave sign assets untouched;
8. emit the QA report with hashes and measured widths.

Use a single exported `CENTRAL_SIGIL_STROKE_WIDTH` visual token for the
vector-only `Vent` rendering.

- [ ] **Step 4: Regenerate assets and update cache keys**

Run with the bundled Sharp module available in the workspace dependency path:

```bash
NODE_PATH="$WORKSPACE_NODE_MODULES" node scripts/generate-symbol-board-assets.mjs --central-sigils
```

Bump the asset, CSS, and JavaScript cache key to
`20260726-central-weight-v1`.

- [ ] **Step 5: Run focused asset tests and inspect representative glyphs**

Run: `node --test tests/generated-symbol-assets.test.mjs tests/symbol-catalog.test.mjs tests/decorative-sigils.test.mjs`

Expected: PASS.

Visually inspect at least `Eau`, `Fumee`, `Repetition`, `Aeriforme`,
`Vent sous pied`, and `Vent` in both the picker and canvas.

- [ ] **Step 6: Commit the glyph update**

```bash
git add scripts/generate-symbol-board-assets.mjs assets/symbol-glyphs app.js index.html tests/generated-symbol-assets.test.mjs tests/symbol-catalog.test.mjs docs/qa/2026-07-26-central-sigil-weight-report.json
git commit -m "fix: match central sigil and sign stroke weights"
```

---

### Task 5: Bilingual Documentation, Metadata, And Release Verification

**Files:**
- Modify: `i18n.js`
- Modify: `tutoriel.html`
- Modify: `bibliotheque.html`
- Modify: `README.md`
- Modify: `docs/progress-tracker.md`
- Modify: `tests/tutorial-content.test.mjs`
- Modify: `tests/wiki-pages.test.mjs`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: the exact total `54_834`.
- Produces: synchronized French/English labels and documentation.

- [ ] **Step 1: Write failing copy and metadata tests**

Require:

```js
assert.equal(translate("en", "tutorial.matrix.total"), "54,834 tested variants");
assert.equal(translate("fr", "tutorial.matrix.total"), "54 834 variantes testees");
assert.match(library, /"numberOfItems":\s*54834/);
```

Also assert that the tutorial explains the four-element scope, dominance by
repetition, inferred fidelity, and why the full combinatorial universe is not
pre-enumerated.

- [ ] **Step 2: Run copy tests and confirm failure**

Run: `node --test tests/tutorial-content.test.mjs tests/wiki-pages.test.mjs tests/seo.test.mjs`

Expected: FAIL on old totals and missing mixture content.

- [ ] **Step 3: Update bilingual copy and structured metadata**

Add concise wiki sections for:

- supported base elements;
- six pair behaviors;
- triple and quadruple interpretations;
- dominance and balance;
- limitations and fidelity;
- searching the 54,834 indexed records.

Do not claim that inferred mixtures are manga-confirmed.

- [ ] **Step 4: Run all repository checks**

```bash
node --check app.js
node --check variant-explorer.js
node --test tests/*.test.mjs
node scripts/validate-spell-matrix.mjs
node scripts/validate-public-artifact.mjs
node scripts/security-audit.mjs
```

Expected: all checks pass and the matrix reports 54,834 unique deterministic
records.

- [ ] **Step 5: Browser verification**

Start the local server, then verify desktop and mobile:

- central sigils and signs have comparable stroke weight;
- small openings remain visible;
- adding Eau and Terre displays a mud/clay composition;
- adding repeated Eau makes Eau dominant;
- adding Lumiere alongside Eau preserves old primary behavior;
- the library search finds `mud`, `boue`, `steam`, and `vapeur`;
- filters match mixtures by either component;
- no text overflows and the canvas remains interactive.

- [ ] **Step 6: Commit docs and verification updates**

```bash
git add i18n.js tutoriel.html bibliotheque.html README.md docs/progress-tracker.md tests/tutorial-content.test.mjs tests/wiki-pages.test.mjs tests/seo.test.mjs
git commit -m "docs: explain elemental mixture variants"
```

- [ ] **Step 7: Push and open a pull request**

```bash
git push -u origin feature/elemental-mixtures-glyph-weight
```

Open a pull request summarizing the 54,834 deterministic variants, glyph
weight QA, bilingual documentation, test results, and visual verification.
