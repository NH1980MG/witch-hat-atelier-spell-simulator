import assert from "node:assert/strict";
import test from "node:test";

import { BASE_ELEMENT_NAMES, INDEXED_ELEMENTAL_MIXTURES } from "../elemental-mixtures.mjs";
import { MATRIX_SIGIL_NAMES, MATRIX_SIGN_NAMES, composeSpellRecipe } from "../spell-grammar.mjs";

const supportIds = ["none", "shoe"];
const materialSignatures = [
  ...MATRIX_SIGIL_NAMES.map((sigil) => [sigil]),
  ...INDEXED_ELEMENTAL_MIXTURES,
];

function normalizedElementName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
      const expected = sigils.map(normalizedElementName).sort();
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
