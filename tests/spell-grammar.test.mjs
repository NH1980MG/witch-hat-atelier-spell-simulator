import assert from "node:assert/strict";
import test from "node:test";

import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
  SIGIL_PROFILES,
  composeSpellRecipe,
  validateSpellMatrix,
} from "../spell-grammar.mjs";

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
