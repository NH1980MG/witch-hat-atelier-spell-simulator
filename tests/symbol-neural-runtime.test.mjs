import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNeuralModel, runNeuralInference } from '../symbol-neural-runtime.mjs';
import { createPhotoRecognitionSample, createCanvasRecognitionSample } from '../symbol-recognition-sample.mjs';

test('samples reject invalid inputs and preserve ink', () => {
  assert.throws(() => createPhotoRecognitionSample({ mask: [1], width: Infinity, height: 1 }));
  assert.throws(() => createPhotoRecognitionSample({ mask: [NaN], width: 1, height: 1 }));
  assert.throws(() => createCanvasRecognitionSample([{ type: 'free', points: [{ x: NaN, y: 0 }] }]));
  const sample = createCanvasRecognitionSample([{ type: 'free', width: 2, points: [{ x: 0, y: 0 }, { x: 20, y: 20 }] }]);
  assert.equal(sample.sourceKind, 'canvas-strokes');
  assert.ok(sample.mask.some(Boolean));
  assert.ok(sample.features.every(Number.isFinite));
});

test('runtime validates bounds and computes a real nonlinear forward pass', () => {
  const model = { version: 'test', sourceKind: 'imported-image', inputSize: 2, hiddenSize: 2,
    labels: ['a', 'b'], mean: [0, 0], scale: [1, 1], w1: [1, 0, 0, 1], b1: [0, 0],
    w2: [1, -1, -1, 1], b2: [0, 0] };
  const result = runNeuralInference(model, { sourceKind: 'imported-image', features: [2, 0] });
  assert.equal(result.candidates[0].name, 'a');
  assert.ok(result.candidates[0].score > 0.98);
  assert.throws(() => validateNeuralModel({ ...model, w1: [Infinity, 0, 0, 1] }));
  assert.throws(() => validateNeuralModel({ ...model, hiddenSize: 1000000 }));
  assert.throws(() => runNeuralInference(model, { sourceKind: 'canvas-strokes', features: [2, 0] }));
});

test('RGBA samples agree with binary ink and oversized stroke work is bounded', () => {
  const data = new Uint8ClampedArray(48 * 48 * 4).fill(255);
  for (let y = 10; y < 38; y++) for (let x = 22; x < 26; x++) {
    data[(y * 48 + x) * 4] = 0; data[(y * 48 + x) * 4 + 1] = 0; data[(y * 48 + x) * 4 + 2] = 0;
  }
  const sample = createPhotoRecognitionSample({ data, width: 48, height: 48 });
  assert.ok(sample.inkCount > 10);
  assert.equal(sample.sourceKind, 'imported-image');
  assert.throws(() => createCanvasRecognitionSample([{ type: 'free', width: 20,
    points: Array.from({ length: 24000 }, (_, i) => ({ x: i % 2 * 100, y: i % 2 * 100 })) }]), /work limit/);
});
