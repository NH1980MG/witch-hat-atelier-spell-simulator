import assert from "node:assert/strict";
import test from "node:test";

import { createScalewolfMotionProfile } from "../decorative-creature-profile.mjs";
import { MATRIX_SIGN_NAMES, composeSpellRecipe } from "../spell-grammar.mjs";

test("Scalewolf operations alter one bounded creature profile", () => {
  const projected = createScalewolfMotionProfile(composeSpellRecipe({
    sigils: ["Loup-ecaille"],
    signs: ["Projection", "Lien"],
    supportId: "none",
    direction: "vers le haut",
  }));
  assert.ok(projected.lunge > 0);
  assert.equal(projected.linked, true);

  const floating = createScalewolfMotionProfile(composeSpellRecipe({
    sigils: ["Loup-ecaille"],
    signs: ["Levitation", "Convergence"],
    supportId: "shoe",
    direction: "vers le haut",
  }));
  assert.ok(floating.hover > 0);
  assert.ok(floating.focus > 1);
  assert.ok(floating.supportLift > 0);
});

test("all 1,640 Scalewolf sign and support combinations have finite profiles", () => {
  let count = 0;
  for (const supportId of ["none", "shoe"]) {
    for (let first = 0; first < MATRIX_SIGN_NAMES.length; first += 1) {
      for (let second = first; second < MATRIX_SIGN_NAMES.length; second += 1) {
        const recipe = composeSpellRecipe({
          sigils: ["Loup-ecaille"],
          signs: [MATRIX_SIGN_NAMES[first], MATRIX_SIGN_NAMES[second]],
          supportId,
          direction: "vers le haut",
        });
        const profile = createScalewolfMotionProfile(recipe);
        const expectedOperations = Object.values(recipe.axes).flat().flatMap(({ operation, count }) => (
          Array.from({ length: count }, () => operation)
        )).sort();
        assert.deepEqual([...profile.operations].sort(), expectedOperations, recipe.id);
        assert.equal(
          Object.values(profile.roleLoads).reduce((total, value) => total + value, 0) + profile.ignoredCount,
          2,
          recipe.id,
        );
        for (const [key, value] of Object.entries(profile)) {
          if (typeof value === "number") assert.ok(Number.isFinite(value), `${recipe.id}.${key}`);
        }
        assert.ok(profile.stride >= 0 && profile.stride <= 0.36, recipe.id);
        assert.ok(profile.hover >= 0 && profile.hover <= 0.8, recipe.id);
        assert.ok(profile.lunge >= 0 && profile.lunge <= 1.2, recipe.id);
        assert.ok(profile.focus >= 0.75 && profile.focus <= 1.4, recipe.id);
        count += 1;
      }
    }
  }
  assert.equal(count, 1_640);
});
