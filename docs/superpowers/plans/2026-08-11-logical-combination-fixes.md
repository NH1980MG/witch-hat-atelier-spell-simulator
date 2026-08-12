# Logical Combination Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all audited spell combinations internally logical: indexed mixtures keep valid 3D element metadata, free workshop mixtures survive extra non-base sigils, and family-gated signs recognize compatible elements inside mixtures.

**Architecture:** Keep `elemental-mixtures.mjs` as the source of material composition. Let `spell-grammar.mjs` separate base-element material synthesis from extra sigils, then pass a complete recipe to `manifestation-synthesis.mjs` and `support-policy.mjs`. Avoid changing the indexed matrix size or adding manga claims; mark uncertain extra sigils explicitly instead of inventing undocumented behavior.

**Tech Stack:** Native ESM JavaScript modules, `node:test`, static GitHub Pages, no new runtime dependencies.

## Global Constraints

- Keep the public matrix at 65,600 regular recipes plus the complete opening petrification ritual.
- Preserve the 11 indexed base-element mixtures and 29 single profiled sigils.
- Do not promote inferred or experimental rules to documented.
- Keep generated labels bilingual through existing `labelFr`, `labelEn`, and i18n patterns.
- Use TDD: every logic change starts with a failing test.
- Commit after each task and push to GitHub after the final verified implementation.

---

## File Structure

- Modify `manifestation-synthesis.mjs`: fix mixture element normalization so string and object elements both produce stable slugs.
- Modify `elemental-mixtures.mjs`: compose base-element mixtures from the base subset of sigils instead of rejecting when non-base sigils are present.
- Modify `spell-grammar.mjs`: expose extra non-base sigils as explicit secondary symbols/warnings and update family compatibility checks for mixtures.
- Modify `tests/manifestation-synthesis.test.mjs`: regression tests for string-backed mixture element metadata.
- Modify `tests/elemental-mixtures.test.mjs`: regression tests for base subset composition with extra sigils.
- Modify `tests/spell-grammar.test.mjs`: regression tests for free-sigil mixture preservation and mixture-aware family gating.
- Modify `docs/logical-combination-audit-2026-08-11.md`: update counts after fixes and move resolved issues into a resolved section.

---

### Task 1: Fix 3D Element Metadata For Indexed Mixtures

**Files:**
- Modify: `manifestation-synthesis.mjs`
- Test: `tests/manifestation-synthesis.test.mjs`
- Test: `tests/spell-grammar.test.mjs`

**Interfaces:**
- Consumes: `synthesizeManifestation({ elementalMixture })`
- Produces: `manifestationPlan.material.elements: string[]`, where `["Eau", "Terre"]` becomes `["eau", "terre"]`

- [ ] **Step 1: Write the failing unit test for string mixture elements**

Add to `tests/manifestation-synthesis.test.mjs`:

```js
test("mixture elements can be provided as strings by the spell grammar", () => {
  const result = synthesizeManifestation({
    materialProfile: { family: "mud", phase: "liquid-solid", noun: "boue" },
    elementalMixture: {
      elements: ["Eau", "Terre"],
      materialProfile: { family: "mud", phase: "liquid-solid", noun: "boue" },
      fidelity: "inferred",
    },
    operations: { state: ["crush"], form: ["column"] },
    axes: {},
    geometry: { balance: 1, pressure: 0, spin: 0, reach: 1 },
    supportPlan: { supportId: "none", mode: "paper-origin", fidelity: "documented" },
  });

  assert.deepEqual(result.material.elements, ["eau", "terre"]);
  assert.equal(result.id, "mud.dense-projection");
});
```

- [ ] **Step 2: Write the failing integration test through `composeSpellRecipe`**

Add to `tests/spell-grammar.test.mjs`:

```js
test("indexed mixtures expose real 3D element ids", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre"],
    signs: ["Crush", "Colonne"],
  });

  assert.equal(recipe.materialProfile.family, "mud");
  assert.deepEqual(recipe.manifestationPlan.material.elements, ["eau", "terre"]);
  assert.ok(!recipe.manifestationPlan.material.elements.includes("undefined"));
});
```

- [ ] **Step 3: Run both tests and verify they fail**

Run:

```bash
node --test tests/manifestation-synthesis.test.mjs tests/spell-grammar.test.mjs
```

Expected: FAIL because `manifestationPlan.material.elements` currently contains `["undefined"]`.

- [ ] **Step 4: Implement minimal normalization**

In `manifestation-synthesis.mjs`, replace `elementNames()` with:

```js
function elementNames(elementalMixture, materialProfile) {
  const values = Array.isArray(elementalMixture?.elements)
    ? elementalMixture.elements.map((entry) => typeof entry === "string" ? entry : entry?.name)
    : [];
  if (values.length === 0) values.push(materialProfile?.family || "raw-energy");
  return [...new Set(values.map((value) => slug(String(value))).filter(Boolean))].sort();
}
```

- [ ] **Step 5: Run focused tests and verify pass**

Run:

```bash
node --test tests/manifestation-synthesis.test.mjs tests/spell-grammar.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add manifestation-synthesis.mjs tests/manifestation-synthesis.test.mjs tests/spell-grammar.test.mjs
git commit -m "fix: preserve mixture element ids in manifestations"
```

---

### Task 2: Preserve Base Mixtures When Extra Non-Base Sigils Are Present

**Files:**
- Modify: `elemental-mixtures.mjs`
- Modify: `spell-grammar.mjs`
- Test: `tests/elemental-mixtures.test.mjs`
- Test: `tests/spell-grammar.test.mjs`

**Interfaces:**
- Consumes: `composeElementalMixture(sigilCounts: Record<string, number>)`
- Produces: a mixture when at least two base elements are present, while ignoring non-base names for the material base
- Produces: `recipe.secondarySigils: string[]` or equivalent explicit architecture entries for extra non-base sigils

- [ ] **Step 1: Replace the old negative test with base-subset behavior**

In `tests/elemental-mixtures.test.mjs`, replace:

```js
test("non-base sigils disable elemental mixture inference", () => {
  assert.equal(composeElementalMixture({ Eau: 1, Lumiere: 1 }), null);
});
```

with:

```js
test("non-base sigils do not cancel a complete base-element mixture", () => {
  const mixture = composeElementalMixture({ Eau: 1, Terre: 1, Lumiere: 1 });

  assert.equal(mixture.id, "eau+terre");
  assert.equal(mixture.materialProfile.family, "mud");
  assert.deepEqual(mixture.elements, ["Eau", "Terre"]);
});

test("a single base element plus non-base sigils remains a single material", () => {
  assert.equal(composeElementalMixture({ Eau: 1, Lumiere: 1 }), null);
});
```

- [ ] **Step 2: Add workshop free-combination tests**

Add to `tests/spell-grammar.test.mjs`:

```js
test("extra non-base sigils do not break a base elemental mixture", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre", "Lumiere"],
    signs: ["Colonne", "Convergence"],
  });

  assert.equal(recipe.elementalMixture.id, "eau+terre");
  assert.equal(recipe.materialProfile.family, "mud");
  assert.equal(recipe.manifestationPlan.material.id, "mud");
  assert.deepEqual(recipe.manifestationPlan.material.elements, ["eau", "terre"]);
  assert.ok(recipe.warnings.some((warning) => /lumiere/i.test(warning)));
});

test("every indexed mixture survives one extra non-base sigil", () => {
  for (const mixture of [
    ["Eau", "Terre"],
    ["Feu", "Eau"],
    ["Eau", "Vent"],
    ["Feu", "Terre"],
    ["Feu", "Vent"],
    ["Terre", "Vent"],
    ["Eau", "Terre", "Vent"],
    ["Feu", "Eau", "Vent"],
    ["Feu", "Eau", "Terre"],
    ["Feu", "Terre", "Vent"],
    ["Feu", "Eau", "Terre", "Vent"],
  ]) {
    const base = composeSpellRecipe({ sigils: mixture, signs: ["Colonne"] });
    const withLight = composeSpellRecipe({ sigils: [...mixture, "Lumiere"], signs: ["Colonne"] });
    assert.equal(withLight.materialProfile.family, base.materialProfile.family, mixture.join("+"));
  }
});
```

- [ ] **Step 3: Run tests and verify fail**

Run:

```bash
node --test tests/elemental-mixtures.test.mjs tests/spell-grammar.test.mjs
```

Expected: FAIL because non-base sigils currently cancel mixture inference.

- [ ] **Step 4: Update base-element filtering**

In `elemental-mixtures.mjs`, change `normalizeBaseCounts()` so it filters non-base names instead of returning `null`:

```js
function normalizeBaseCounts(sigilCounts) {
  if (!sigilCounts || typeof sigilCounts !== "object" || Array.isArray(sigilCounts)) return null;
  return BASE_ELEMENT_NAMES
    .filter((name) => Number.isFinite(sigilCounts[name]) && sigilCounts[name] > 0)
    .map((name) => [name, sigilCounts[name]]);
}
```

- [ ] **Step 5: Add explicit extra-sigil warnings**

In `spell-grammar.mjs`, after `elementalMixture` is created, derive extras:

```js
const mixtureBaseNames = new Set(elementalMixture?.elements || []);
const secondarySigils = elementalMixture
  ? orderedSigils.map(([name]) => name).filter((name) => !mixtureBaseNames.has(name))
  : [];
```

When `secondarySigils.length > 0`, add:

```js
warnings.push(`Sigil(s) secondaire(s) hors melange: ${secondarySigils.join(", ")}. Le melange elementaire reste la matiere principale.`);
fidelity = worstFidelity(fidelity, "inferred");
```

Return `secondarySigils` on the recipe object:

```js
secondarySigils,
```

- [ ] **Step 6: Represent secondary sigils in architecture**

In `buildSymbolArchitecture()`, for sigils that are not primary mixture elements, keep them as recognized but secondary:

```js
const isMixtureBase = elementalMixture?.elements?.includes(name);
const isSecondarySigil = elementalMixture && !isMixtureBase;
```

Use `status: isSecondarySigil ? "secondary" : "active"` and an explanation that says the sigil is present but does not replace the composed material.

- [ ] **Step 7: Run focused tests**

Run:

```bash
node --test tests/elemental-mixtures.test.mjs tests/spell-grammar.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add elemental-mixtures.mjs spell-grammar.mjs tests/elemental-mixtures.test.mjs tests/spell-grammar.test.mjs
git commit -m "fix: preserve elemental mixtures with extra sigils"
```

---

### Task 3: Make Family-Gated Signs Mixture-Aware

**Files:**
- Modify: `spell-grammar.mjs`
- Test: `tests/spell-grammar.test.mjs`

**Interfaces:**
- Consumes: `SIGN_PROFILES[name].families`
- Consumes: `elementalMixture.elements`
- Produces: compatibility where a sign requiring `earth`, `wind`, `water`, or `fire` applies when that base element exists inside the mixture

- [ ] **Step 1: Add failing tests for family compatibility inside mixtures**

Add to `tests/spell-grammar.test.mjs`:

```js
test("earth-family signs are compatible with earth-containing mixtures", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau", "Terre"], signs: ["Crush"] });

  assert.equal(recipe.materialProfile.family, "mud");
  assert.ok(recipe.operations.state.includes("crush"));
  assert.ok(!recipe.uncertainSigns.includes("Crush"));
  assert.ok(!recipe.warnings.some((warning) => /Crush est documente pour earth/i.test(warning)));
});

test("wind-family signs are compatible with wind-containing mixtures", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau", "Vent"], signs: ["Signe de vent", "Aeriforme defini"] });

  assert.equal(recipe.materialProfile.family, "driven-mist");
  assert.ok(recipe.operations.state.includes("wind-modifier"));
  assert.ok(recipe.operations.state.includes("define-air"));
  assert.ok(!recipe.uncertainSigns.includes("Signe de vent"));
  assert.ok(!recipe.uncertainSigns.includes("Aeriforme defini"));
});
```

- [ ] **Step 2: Run tests and verify fail**

Run:

```bash
node --test tests/spell-grammar.test.mjs
```

Expected: FAIL because mixture families such as `mud` and `driven-mist` are compared literally against `earth` or `wind`.

- [ ] **Step 3: Add base family mapping helper**

In `spell-grammar.mjs`, near helper functions:

```js
const BASE_FAMILY_BY_SIGIL = Object.freeze({
  Feu: "fire",
  Eau: "water",
  Terre: "earth",
  Vent: "wind",
});

function materialFamilySet(material, elementalMixture) {
  const families = new Set([material?.family].filter(Boolean));
  for (const name of elementalMixture?.elements || []) {
    const family = BASE_FAMILY_BY_SIGIL[name];
    if (family) families.add(family);
  }
  return families;
}
```

- [ ] **Step 4: Use the helper in the sign family gate**

Before iterating signs:

```js
const materialFamilies = materialFamilySet(material, elementalMixture);
```

Replace:

```js
if (sign.families && material && !sign.families.includes(material.family)) {
```

with:

```js
if (sign.families && !sign.families.some((family) => materialFamilies.has(family))) {
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test tests/spell-grammar.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add spell-grammar.mjs tests/spell-grammar.test.mjs
git commit -m "fix: recognize family signs inside mixtures"
```

---

### Task 4: Add Exhaustive Logic Audit Regression Tests

**Files:**
- Create: `tests/logical-combination-audit.test.mjs`

**Interfaces:**
- Consumes: `composeSpellRecipe`
- Produces: automated guard against the three audited problem classes returning

- [ ] **Step 1: Add exhaustive matrix test**

Create `tests/logical-combination-audit.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { INDEXED_ELEMENTAL_MIXTURES, BASE_ELEMENT_NAMES } from "../elemental-mixtures.mjs";
import { MATRIX_SIGIL_NAMES, MATRIX_SIGN_NAMES, composeSpellRecipe } from "../spell-grammar.mjs";

const supportIds = ["none", "shoe"];
const materialSignatures = [
  ...MATRIX_SIGIL_NAMES.map((sigil) => [sigil]),
  ...INDEXED_ELEMENTAL_MIXTURES,
];

test("all public matrix recipes have finite labeled manifestations", () => {
  for (const supportId of supportIds) {
    for (const sigils of materialSignatures) {
      for (let first = 0; first < MATRIX_SIGN_NAMES.length; first += 1) {
        for (let second = first; second < MATRIX_SIGN_NAMES.length; second += 1) {
          const recipe = composeSpellRecipe({
            sigils,
            signs: [MATRIX_SIGN_NAMES[first], MATRIX_SIGN_NAMES[second]],
            supportId,
          });

          assert.equal(typeof recipe.manifestationPlan.labelFr, "string", sigils.join("+"));
          assert.equal(typeof recipe.manifestationPlan.labelEn, "string", sigils.join("+"));
          assert.ok(recipe.manifestationPlan.labelFr.length > 0, sigils.join("+"));
          assert.ok(recipe.manifestationPlan.labelEn.length > 0, sigils.join("+"));
          assert.ok(JSON.stringify(recipe.manifestationPlan).indexOf("undefined") === -1, sigils.join("+"));
        }
      }
    }
  }
});

test("all indexed mixtures keep valid 3D element ids across sign pairs and supports", () => {
  for (const supportId of supportIds) {
    for (const sigils of INDEXED_ELEMENTAL_MIXTURES) {
      const expected = sigils.map((name) =>
        name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
      ).sort();
      for (let first = 0; first < MATRIX_SIGN_NAMES.length; first += 1) {
        for (let second = first; second < MATRIX_SIGN_NAMES.length; second += 1) {
          const recipe = composeSpellRecipe({
            sigils,
            signs: [MATRIX_SIGN_NAMES[first], MATRIX_SIGN_NAMES[second]],
            supportId,
          });

          assert.deepEqual(recipe.manifestationPlan.material.elements, expected, sigils.join("+"));
        }
      }
    }
  }
});

test("all indexed mixtures survive one extra non-base sigil", () => {
  const nonBaseSigils = MATRIX_SIGIL_NAMES.filter((name) => !BASE_ELEMENT_NAMES.includes(name));
  for (const sigils of INDEXED_ELEMENTAL_MIXTURES) {
    const base = composeSpellRecipe({ sigils, signs: ["Colonne"] });
    for (const extra of nonBaseSigils) {
      const recipe = composeSpellRecipe({ sigils: [...sigils, extra], signs: ["Colonne"] });
      assert.equal(recipe.materialProfile.family, base.materialProfile.family, `${sigils.join("+")}+${extra}`);
    }
  }
});
```

- [ ] **Step 2: Run audit test**

Run:

```bash
node --test tests/logical-combination-audit.test.mjs
```

Expected: PASS after Tasks 1-3.

- [ ] **Step 3: Run full suite**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: PASS with all tests.

- [ ] **Step 4: Commit**

```bash
git add tests/logical-combination-audit.test.mjs
git commit -m "test: cover full logical combination audit"
```

---

### Task 5: Update Audit Documentation And Publish

**Files:**
- Modify: `docs/logical-combination-audit-2026-08-11.md`

**Interfaces:**
- Consumes: final audit counts from `tests/logical-combination-audit.test.mjs`
- Produces: human-readable report showing resolved and remaining interpretation limits

- [ ] **Step 1: Update the report status**

In `docs/logical-combination-audit-2026-08-11.md`, change the verdict section to:

```md
Verdict after implementation: the audited internal logic defects are resolved.
The remaining limits are interpretation limits, not data-shape or material
composition bugs.
```

Move the old P1/P2 failures into a `Resolved Findings` section with the commit ids produced by Tasks 1-4.

- [ ] **Step 2: Record final verification counts**

Add:

```md
Final verification:

- Public matrix recipes checked: 65,600.
- Runtime exceptions: 0.
- Material family mismatches: 0.
- 3D `undefined` element metadata: 0.
- Free mixture-plus-non-base-sigil failures: 0 / 275.
- Non-finite manifestation numbers: 0.
```

- [ ] **Step 3: Run docs-adjacent tests**

Run:

```bash
node --test tests/current-docs.test.mjs tests/tutorial-content.test.mjs tests/wiki-pages.test.mjs tests/logical-combination-audit.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Run full suite**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/logical-combination-audit-2026-08-11.md
git commit -m "docs: update logical combination audit results"
```

- [ ] **Step 6: Push to GitHub**

Run:

```bash
git pull --ff-only origin main
git push origin main
```

If `git pull --ff-only` reports that local and remote diverged, run:

```bash
git fetch origin main
git rebase origin/main
node --test tests/*.test.mjs
git push origin main
```

Expected: `main` pushed successfully and the working tree is clean.

---

## Self-Review

- Spec coverage: the plan covers every non-logical class from the audit: 3D `undefined` elements, free mixture cancellation, family-gated warning errors, and exhaustive regression coverage.
- Placeholder scan: no `TBD`, `TODO`, or vague test instructions remain.
- Type consistency: `elementalMixture.elements` remains `string[]`; `manifestationPlan.material.elements` becomes normalized lowercase slug `string[]`; `secondarySigils` is a `string[]` returned from `composeSpellRecipe`.
