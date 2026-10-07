import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEffect, compileEffect } from "../local-demo/effect-editor/effect-runtime-model.mjs";
import { normalizeEditorState } from "../local-demo/effect-editor/effect-editor-model.mjs";

const composition = (...ids) => ({ components: ids.map((symbolId) => ({ symbolId, source: "catalog" })) });
test("bounds renderer work and sanitizes effect parameters", () => {
  const effect = normalizeEffect({ count: 99999, size: -9, duration: NaN, color: "url(x)", material: "invalid" });
  assert.equal(effect.count, 48);
  assert.equal(effect.size, 0.2);
  assert.equal(effect.duration, 6);
  assert.equal(effect.color, "#49b8df");
  assert.equal(effect.material, "water");
});
test("compiles cumulative stages, including crystallization then burst", () => {
  const result = compileEffect(composition("Eau", "Fleur", "Agrandissement", "Solidification", "Crush"));
  assert.equal(result.stages.length, 5);
  assert.equal(result.stages[1].effect.shape, "flower");
  assert.equal(result.stages[2].effect.size, 1.5);
  assert.equal(result.stages[3].effect.material, "crystal");
  assert.equal(result.effect.motion, "burst");
});
test("order changes the result and unsupported symbols produce warnings", () => {
  assert.equal(compileEffect(composition("Solidification", "Eau")).effect.material, "water");
  assert.equal(compileEffect(composition("Eau", "Solidification")).effect.material, "crystal");
  assert.equal(compileEffect(composition("unknown")).warnings.length, 1);
});
test("custom effects contribute fields by role, with composition overrides last", () => {
  const symbols = new Map([["custom", { name: "Rosace", effect: { shape: "flower", material: "fire", size: 2 } }]]);
  const result = compileEffect({ components: [{ source: "custom", symbolId: "custom", role: "form" }], effectOverrides: { size: 0.8 } }, symbols);
  assert.equal(result.effect.shape, "flower");
  assert.equal(result.effect.material, "water");
  assert.equal(result.stages[0].effect.size, 0.8);
});
test("saved definitions and partial overrides survive normalization", () => {
  const state = normalizeEditorState({ symbols: [{ id: "s", name: "S", role: "form", kind: "sigil", strokes: [[{ x: 0, y: 1 }]], effect: { shape: "flower" } }], compositions: [{ id: "c", name: "C", components: [], effectOverrides: { speed: 2 } }] });
  assert.equal(state.symbols[0].effect.shape, "flower");
  assert.deepEqual(state.compositions[0].effectOverrides, { speed: 2 });
});
