import assert from "node:assert/strict";
import test from "node:test";

import { createPreparationModel, validatePreparation } from "../game-preparation.mjs";

const customSpell = {
  id: "custom-water-flower",
  name: "Fleur d'eau",
  actions: [{ type: "glyph", element: "Eau", kind: "sigil", x: 0, y: 0, size: 30 }],
};

test("preparation keeps three presets and one custom slot", () => {
  const model = createPreparationModel();

  assert.equal(model.presets.length, 3);
  assert.equal(model.customSpell, null);
  assert.equal(model.settings.drawingSlowdown, 40);
});

test("preparation is not ready without a valid custom spell", () => {
  const result = validatePreparation(createPreparationModel());

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "custom-spell-required");
});

test("preparation reports the remaining arena speed", () => {
  const model = createPreparationModel({ settings: { drawingSlowdown: 80 } });

  assert.equal(model.settings.drawingTimeScale, 0.2);
  assert.equal(model.speedLabel, "20%");
});

test("preparation accepts a valid custom spell without changing its actions", () => {
  const model = createPreparationModel({ customSpell });
  const result = validatePreparation(model);

  assert.equal(result.accepted, true);
  assert.deepEqual(result.model.customSpell, customSpell);
  assert.notEqual(result.model.customSpell, customSpell);
});
