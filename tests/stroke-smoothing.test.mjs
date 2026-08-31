import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_STROKE_SMOOTHING,
  STROKE_SMOOTHING_STORAGE_KEY,
  loadStrokeSmoothing,
  normalizeStrokeSmoothing,
  saveStrokeSmoothing,
  smoothStroke,
} from "../stroke-smoothing.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const POINTS = [
  { x: 0, y: 0 },
  { x: 10, y: 8 },
  { x: 20, y: -6 },
  { x: 30, y: 0 },
];

test("la fluidite n'altère pas un tracé quand elle vaut zero", () => {
  const smoothed = smoothStroke(POINTS, 0);
  assert.deepEqual(smoothed, POINTS);
  assert.notEqual(smoothed, POINTS);
});

test("la fluidite conserve les extremites et reduit les ecarts interieurs", () => {
  const smoothed = smoothStroke(POINTS, 100);
  assert.deepEqual(smoothed[0], POINTS[0]);
  assert.deepEqual(smoothed.at(-1), POINTS.at(-1));
  assert.notDeepEqual(smoothed, POINTS);
  assert.ok(Math.abs(smoothed[1].y) < Math.abs(POINTS[1].y));
  assert.ok(Math.abs(smoothed[2].y) < Math.abs(POINTS[2].y));
});

test("le reglage de fluidite est borne et persiste", () => {
  const storage = memoryStorage({ [STROKE_SMOOTHING_STORAGE_KEY]: "200" });
  assert.equal(normalizeStrokeSmoothing(-4), 0);
  assert.equal(normalizeStrokeSmoothing(42.7), 43);
  assert.equal(normalizeStrokeSmoothing("bad"), DEFAULT_STROKE_SMOOTHING);
  assert.equal(loadStrokeSmoothing(storage), 100);
  assert.equal(saveStrokeSmoothing(storage, 67), 67);
  assert.equal(storage.getItem(STROKE_SMOOTHING_STORAGE_KEY), "67");
});
