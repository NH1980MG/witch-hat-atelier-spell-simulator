import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEffect, compileEffect } from "../local-demo/effect-editor/effect-runtime-model.mjs";
import { normalizeParts, normalizeTrajectory, sampleTrajectory, estimateCombat, normalizeMix, shapeExample } from "../local-demo/effect-editor/effect-authoring-model.mjs";
import { normalizeEditorState } from "../local-demo/effect-editor/effect-editor-model.mjs";

test("model parts retain transforms and bound imported complexity", () => {
  const parts = normalizeParts(Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, type: "box", x: 99, sy: -1, rz: 45 })));
  assert.equal(parts.length, 32);
  assert.equal(parts[0].x, 4);
  assert.equal(parts[0].sy, 0.05);
  assert.equal(parts[0].rz, 45);
});
test("editable examples have geometry rather than locked shape labels", () => {
  assert.equal(shapeExample("flower").length, 9);
  assert.equal(shapeExample("ring")[0].type, "torus");
});
test("trajectory interpolation is distance based, with hold and loop", () => {
  const path = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }];
  assert.equal(sampleTrajectory(path, 2).x, 2);
  assert.equal(sampleTrajectory(path, 8, "once").x, 4);
  assert.equal(sampleTrajectory(path, 5, "loop").x, 1);
  assert.equal(sampleTrajectory(path, 5, "pingpong").x, 3);
  assert.deepEqual(sampleTrajectory([], 1), { x: 0, y: 0, z: 0 });
  assert.equal(normalizeTrajectory([{ x: NaN, y: 0 }, { x: 1, y: 1 }]).length, 1);
});
test("mixture weights normalize, known interactions are explicit", () => {
  const mix = normalizeMix([{ element: "water", weight: 2 }, { element: "fire", weight: 2 }, { element: "unknown", weight: 9 }]);
  assert.equal(mix.length, 2);
  const result = estimateCombat(normalizeEffect({ mix, motion: "projectile" }));
  assert.match(result.interactions.join(" "), /Vapeur/);
  assert.ok(result.damage > 0 && result.speed > 0);
});
test("damage rises with power and speed but not decorative particle count", () => {
  const base = normalizeEffect({ material: "earth", motion: "projectile" });
  const result = estimateCombat(base);
  assert.ok(estimateCombat({ ...base, power: 2 }).damage > result.damage);
  assert.ok(estimateCombat({ ...base, speed: 2 }).damage > result.damage);
  assert.equal(estimateCombat({ ...base, count: 48 }).damage, result.damage);
  assert.equal(estimateCombat({ ...base, damageScale: 0 }).damage, 0);
  assert.equal(estimateCombat({ ...base, balance: { earth: { damage: 0, speed: 4 } } }).damage, 0);
});
test("composition retains multiple elements instead of silently replacing the mixture", () => {
  const result = compileEffect({ components: ["Eau", "Feu"].map((symbolId) => ({ symbolId, source: "catalog" })) });
  assert.deepEqual(result.effect.mix.map((item) => item.element), ["water", "fire"]);
});
test("custom geometry and motion roundtrip with saved compositions", () => {
  const custom = normalizeEffect({ shape: "custom", parts: [{ type: "box", x: 1 }], motion: "path", trajectory: [{ x: -1, y: 0, z: 0 }, { x: 1, y: 2, z: 1 }], pathMode: "pingpong", power: 2 });
  assert.equal(custom.parts[0].x, 1);
  assert.equal(custom.trajectory[1].z, 1);
  const state = normalizeEditorState({ compositions: [{ id: "c", components: [], effectOverrides: custom }] });
  assert.deepEqual(state.compositions[0].effectOverrides, custom);
});
