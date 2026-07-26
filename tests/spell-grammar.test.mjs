import assert from "node:assert/strict";
import test from "node:test";

import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
  SIGIL_PROFILES,
  composeSpellRecipe,
  validateSpellMatrix,
} from "../spell-grammar.mjs";

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

test("support changes the recipe identity and semantic plan", () => {
  const input = {
    sigils: ["Eau"],
    signs: ["Dispersion", "Levitation"],
    direction: "vers le haut",
  };
  const paper = composeSpellRecipe({ ...input, supportId: "none" });
  const shoe = composeSpellRecipe({ ...input, supportId: "shoe" });

  assert.notEqual(paper.id, shoe.id);
  assert.notDeepEqual(paper.supportPlan, shoe.supportPlan);
});

test("documented inverse-capable signs apply their inverse operation", () => {
  const traction = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Traction"],
    invertedSigns: ["Traction"],
  });
  const resize = composeSpellRecipe({
    sigils: ["Terre"],
    signs: ["Agrandissement"],
    invertedSigns: ["Agrandissement"],
  });

  assert.ok(traction.operations.motion.includes("push"));
  assert.ok(resize.operations.state.includes("shrink"));
});

test("unsupported inversion stays explicit instead of inventing an opposite", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Colonne"],
    invertedSigns: ["Colonne"],
  });

  assert.ok(recipe.operations.form.includes("column"));
  assert.ok(recipe.warnings.some((warning) => warning.toLowerCase().includes("inversion")));
  assert.notEqual(recipe.fidelity, "documented");
});

test("incompatible signs are ignored and lower fidelity", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau"], signs: ["Spire physique"] });

  assert.ok(recipe.ignoredSigns.includes("Spire physique"));
  assert.notEqual(recipe.fidelity, "documented");
});

test("the public matrix includes all 26 profiled sigils and all modifier signs", () => {
  assert.equal(MATRIX_SIGIL_NAMES.length, 26);
  assert.equal(MATRIX_SIGN_NAMES.length, 38);
  assert.deepEqual(MATRIX_SIGIL_NAMES, Object.keys(SIGIL_PROFILES));
});

test("the matrix validates exactly 38,532 deterministic support variants", () => {
  const result = validateSpellMatrix();

  assert.equal(result.tested, 38_532);
  assert.equal(result.unique, 38_532);
  assert.equal(result.deterministic, 38_532);
  assert.deepEqual(result.supports, { none: 19_266, shoe: 19_266 });
  assert.ok(result.distinctPlans > 0);
});
