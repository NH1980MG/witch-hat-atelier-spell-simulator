import assert from "node:assert/strict";
import test from "node:test";

import {
  BASE_ELEMENT_NAMES,
  INDEXED_ELEMENTAL_MIXTURES,
  composeElementalMixture,
} from "../elemental-mixtures.mjs";

test("the module exposes exactly eleven multi-element signatures", () => {
  assert.deepEqual(BASE_ELEMENT_NAMES, ["Feu", "Eau", "Terre", "Vent"]);
  assert.equal(INDEXED_ELEMENTAL_MIXTURES.length, 11);
  assert.deepEqual(
    new Set(INDEXED_ELEMENTAL_MIXTURES.map((names) => names.join("+"))).size,
    11,
  );
});

test("every indexed signature composes in canonical base-element order", () => {
  for (const names of INDEXED_ELEMENTAL_MIXTURES) {
    const mixture = composeElementalMixture(Object.fromEntries(names.map((name) => [name, 1])));
    assert.ok(mixture, names.join("+"));
    assert.deepEqual(mixture.elements, names);
  }
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

test("non-base sigils do not cancel a complete base-element mixture", () => {
  const mixture = composeElementalMixture({ Eau: 1, Terre: 1, Lumiere: 1 });

  assert.equal(mixture.id, "eau+terre");
  assert.equal(mixture.materialProfile.family, "mud");
  assert.deepEqual(mixture.elements, ["Eau", "Terre"]);
});

test("a single base element plus non-base sigils remains a single material", () => {
  assert.equal(composeElementalMixture({ Eau: 1, Lumiere: 1 }), null);
});
