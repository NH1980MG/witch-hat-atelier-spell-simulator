import assert from "node:assert/strict";
import test from "node:test";
import {
  inverseGuideTransformPoint,
  normalizeGuideTransform,
  readGuideTransforms,
  rotateGuideTransform,
  translateGuideTransform,
  writeGuideTransforms,
} from "../guide-transform.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("guide transforms normalize and compose predictable edits", () => {
  const start = normalizeGuideTransform({ x: 4, y: -2, scale: 0.1 });
  const moved = translateGuideTransform(start, 12, 8);
  const rotated = rotateGuideTransform(moved, Math.PI / 2);
  assert.deepEqual(start, { x: 4, y: -2, rotation: 0, scale: 0.25 });
  assert.deepEqual(moved, { x: 16, y: 6, rotation: 0, scale: 0.25 });
  assert.equal(rotated.rotation, Math.PI / 2);
});

test("guide transform storage ignores malformed entries", () => {
  const storage = memoryStorage({
    whaGuideTransformsV1: JSON.stringify({ good: { x: 3, scale: 2 }, bad: null, array: [] }),
  });
  assert.deepEqual(readGuideTransforms(storage), { good: { x: 3, y: 0, rotation: 0, scale: 2 } });
  const saved = writeGuideTransforms(storage, { good: { y: 4 }, other: { rotation: 1 } });
  assert.equal(saved.good.y, 4);
  assert.deepEqual(readGuideTransforms(storage), saved);
});

test("inverse guide transform returns the original point", async () => {
  const { guideTransformPoint } = await import("../guide-transform.mjs");
  const center = { x: 100, y: 100 };
  const transform = { x: 18, y: -7, rotation: 0.7, scale: 1.4 };
  const point = { x: 125, y: 74 };
  const transformed = guideTransformPoint(point, transform, center);
  const restored = inverseGuideTransformPoint(transformed, transform, center);
  assert.ok(Math.abs(restored.x - point.x) < 1e-9);
  assert.ok(Math.abs(restored.y - point.y) < 1e-9);
});
