import assert from "node:assert/strict";
import test from "node:test";

import {
  INDEXED_ELEMENTAL_MIXTURES,
  composeElementalMixture,
  createElementalMixturePresentation,
} from "../elemental-mixtures.mjs";

function colorDistance(left, right) {
  const channels = (color) => color.match(/[a-f0-9]{2}/gi).map((value) => Number.parseInt(value, 16));
  const a = channels(left);
  const b = channels(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

test("balanced fire and water present as steam instead of one base element", () => {
  const mixture = composeElementalMixture({ Feu: 1, Eau: 1 });
  const presentation = createElementalMixturePresentation(mixture);

  assert.equal(presentation.id, "feu+eau");
  assert.equal(presentation.family, "steam");
  assert.equal(presentation.labelFr, "Vapeur");
  assert.equal(presentation.labelEn, "Steam");
  assert.equal(presentation.dominantElement, null);
  assert.deepEqual(presentation.elements.map(({ name, weight }) => [name, weight]), [
    ["Feu", 0.5],
    ["Eau", 0.5],
  ]);
  assert.notEqual(presentation.color, "#a94a38");
  assert.notEqual(presentation.color, "#377da4");
});

test("repetition changes mixture color and physical emphasis", () => {
  const balanced = createElementalMixturePresentation(composeElementalMixture({ Feu: 1, Eau: 1 }));
  const fireLed = createElementalMixturePresentation(composeElementalMixture({ Feu: 3, Eau: 1 }));
  const waterLed = createElementalMixturePresentation(composeElementalMixture({ Feu: 1, Eau: 3 }));

  assert.equal(fireLed.dominantElement, "Feu");
  assert.equal(fireLed.labelFr, "Vapeur, dominante feu");
  assert.equal(fireLed.labelEn, "Fire-dominant steam");
  assert.equal(waterLed.labelFr, "Vapeur, dominante eau");
  assert.equal(waterLed.labelEn, "Water-dominant steam");
  assert.ok(fireLed.elements.find(({ name }) => name === "Feu").weight > 0.5);
  assert.ok(colorDistance(fireLed.color, "#a94a38") < colorDistance(balanced.color, "#a94a38"));
});

test("every indexed mixture has a complete serializable presentation", () => {
  for (const names of INDEXED_ELEMENTAL_MIXTURES) {
    const mixture = composeElementalMixture(Object.fromEntries(names.map((name) => [name, 1])));
    const presentation = createElementalMixturePresentation(mixture);

    assert.match(presentation.color, /^#[a-f0-9]{6}$/i);
    assert.ok(presentation.labelFr);
    assert.ok(presentation.labelEn);
    assert.deepEqual(JSON.parse(JSON.stringify(presentation)), presentation);
  }
});
