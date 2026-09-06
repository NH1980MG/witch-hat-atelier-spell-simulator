import test from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOL_PATHS } from '../symbol-catalog.mjs';
import { PHOTO_SYMBOL_MODEL } from '../photo-symbol-model-data.mjs';
import { CANVAS_SYMBOL_MODEL } from '../canvas-symbol-model-data.mjs';
import { recognizePhotoSymbol } from '../photo-symbol-recognition-model.mjs';
import { recognizeCanvasSymbol } from '../canvas-symbol-recognition-model.mjs';
import { makeSyntheticSample, makeUnknownSamples } from '../scripts/train-symbol-recognition-models.mjs';

test('two independently trained assets cover the entire catalog', () => {
  assert.equal(PHOTO_SYMBOL_MODEL.labels.length, 69);
  assert.deepEqual(PHOTO_SYMBOL_MODEL.labels, Object.keys(SYMBOL_PATHS));
  assert.deepEqual(CANVAS_SYMBOL_MODEL.labels, PHOTO_SYMBOL_MODEL.labels);
  assert.notDeepEqual(CANVAS_SYMBOL_MODEL.w1, PHOTO_SYMBOL_MODEL.w1);
  for (const model of [PHOTO_SYMBOL_MODEL, CANVAS_SYMBOL_MODEL]) {
    assert.ok(model.training.finalLoss < model.training.initialLoss * 0.6);
    assert.equal(model.experimental, true);
  }
});

test('blank, blobs and malformed inputs are not accepted', () => {
  assert.equal(recognizePhotoSymbol(new Uint8Array(64 * 64), 64, 64, SYMBOL_PATHS).status, 'unknown');
  assert.notEqual(recognizePhotoSymbol(new Uint8Array(64 * 64).fill(1), 64, 64, SYMBOL_PATHS).status, 'accepted');
  assert.equal(recognizePhotoSymbol([], 99999999, 2, SYMBOL_PATHS).status, 'fallback');
  assert.equal(recognizeCanvasSymbol([], SYMBOL_PATHS).status, 'unknown');
});

test('full-circle inclination is preserved including 280 degrees', () => {
  for (const source of ['imported-image', 'canvas-strokes']) {
    const fixture = makeSyntheticSample('Eau', source, 280, 910003, false);
    const result = source === 'canvas-strokes' ? recognizeCanvasSymbol(fixture.actions, SYMBOL_PATHS)
      : recognizePhotoSymbol(fixture.mask, fixture.width, fixture.height, SYMBOL_PATHS);
    assert.equal(result.candidates[0].name, 'Eau');
    const error = Math.abs(Math.atan2(Math.sin(result.orientation - 280 * Math.PI / 180), Math.cos(result.orientation - 280 * Math.PI / 180)));
    assert.ok(error < 8 * Math.PI / 180, `${source}: ${error * 180 / Math.PI}`);
    assert.equal(result.orientationAmbiguous, false);
  }
});

test('fourfold symmetric symbols expose equivalent pose rather than true orientation', () => {
  const fixture = makeSyntheticSample('Lumiere', 'imported-image', 280, 310901, false);
  const result = recognizePhotoSymbol(fixture.mask, fixture.width, fixture.height, SYMBOL_PATHS);
  assert.equal(result.candidates[0].name, 'Lumiere');
  assert.equal(result.orientationAmbiguous, true);
  assert.equal(result.orientationPeriod, Math.PI / 2);
  assert.ok(result.candidates[0].score > 80 && result.candidates[0].score <= 100);
  assert.ok(result.confidence <= 1);
});

test('catalog failure is isolated from the other model', () => {
  const photo = makeSyntheticSample('Eau', 'imported-image', 0, 911);
  assert.equal(recognizePhotoSymbol(photo.mask, photo.width, photo.height, {}).status, 'fallback');
  const canvas = makeSyntheticSample('Eau', 'canvas-strokes', 0, 913);
  assert.equal(recognizeCanvasSymbol(canvas.actions, SYMBOL_PATHS).candidates[0].name, 'Eau');
});

test('near-symmetric competing poses are reviewed, not claimed as unique', () => {
  const name = 'Convergence', label = Object.keys(SYMBOL_PATHS).indexOf(name);
  const fixture = makeSyntheticSample(name, 'imported-image', 15, 5000001 + label * 997 + 15);
  const result = recognizePhotoSymbol(fixture.mask, fixture.width, fixture.height, SYMBOL_PATHS);
  assert.equal(result.candidates[0].name, name);
  assert.equal(result.status, 'review');
  assert.equal(result.orientationAmbiguous, true);
  assert.ok(result.orientationAlternatives.length > 1);
});

test('unknown corpus contains distinct deterministic masks, not repeated examples', () => {
  const samples = makeUnknownSamples('canvas-strokes', 770001, 60);
  assert.equal(new Set(samples.map(f => Array.from(f.sample.mask).join(''))).size, 60);
  assert.deepEqual(samples[0], makeUnknownSamples('canvas-strokes', 770001, 1)[0]);
});
