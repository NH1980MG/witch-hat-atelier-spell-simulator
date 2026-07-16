import assert from "node:assert/strict";
import test from "node:test";

import { composeSpellRecipe, validateSpellMatrix } from "../spell-grammar.mjs";

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

test("the matrix validates exactly 13,338 deterministic support variants", () => {
  const result = validateSpellMatrix();

  assert.equal(result.tested, 13_338);
  assert.equal(result.unique, 13_338);
  assert.equal(result.deterministic, 13_338);
  assert.deepEqual(result.supports, { none: 6_669, shoe: 6_669 });
  assert.ok(result.distinctPlans > 0);
});
