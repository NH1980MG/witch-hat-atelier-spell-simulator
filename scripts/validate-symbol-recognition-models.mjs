import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { SYMBOL_PATHS } from '../symbol-catalog.mjs';
import { PHOTO_SYMBOL_MODEL } from '../photo-symbol-model-data.mjs';
import { CANVAS_SYMBOL_MODEL } from '../canvas-symbol-model-data.mjs';
import { recognizePhotoSymbol } from '../photo-symbol-recognition-model.mjs';
import { recognizeCanvasSymbol } from '../canvas-symbol-recognition-model.mjs';
import { runNeuralInference, validateNeuralModel } from '../symbol-neural-runtime.mjs';
import { TRAIN_ANGLES, CALIBRATION_ANGLES, TEST_ANGLES, makeSyntheticSample, makeUnknownSamples } from './train-symbol-recognition-models.mjs';

function quantile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] : null;
}

function poseError(actual, expected, period) {
  const difference = Math.abs(actual - expected) % period;
  return Math.min(difference, period - difference) * 180 / Math.PI;
}

export async function validateSavedModels({ calibration = false, enforce = true } = {}) {
  const reports = [], labels = Object.keys(SYMBOL_PATHS);
  assert.equal(labels.length, 69);
  assert.ok(TEST_ANGLES.every(a => !TRAIN_ANGLES.includes(a) && !CALIBRATION_ANGLES.includes(a)));
  assert.ok(CALIBRATION_ANGLES.every(a => !TRAIN_ANGLES.includes(a)));
  let bytes = 0;
  for (const model of [PHOTO_SYMBOL_MODEL, CANVAS_SYMBOL_MODEL]) {
    validateNeuralModel(model);
    assert.equal(model.experimental, true);
    assert.deepEqual(model.labels, labels);
    assert.ok(model.training.finalLoss < model.training.initialLoss * 0.6);
    const photo = model.sourceKind === 'imported-image';
    const file = new URL(`../${photo ? 'photo' : 'canvas'}-symbol-model-data.mjs`, import.meta.url);
    const contents = await readFile(file), size = (await stat(file)).size;
    bytes += size;
    const recognize = fixture => photo ? recognizePhotoSymbol(fixture.mask, fixture.width, fixture.height, SYMBOL_PATHS)
      : recognizeCanvasSymbol(fixture.actions, SYMBOL_PATHS);
    let total = 0, neuralCorrect = 0, correct = 0, accepted = 0, acceptedCorrect = 0, ambiguous = 0;
    const errors = [], acceptedErrors = [], uniqueErrors = [], times = [], failures = [], poseFailures = [];
    for (let label = 0; label < labels.length; label++) for (const angle of calibration ? CALIBRATION_ANGLES : TEST_ANGLES) {
      // Validation seeds and angles are not used by the optimizer or feature normalization.
      const fixture = makeSyntheticSample(labels[label], model.sourceKind, angle, (calibration ? 5000001 : 9000001) + label * 997 + angle);
      const neural = runNeuralInference(model, fixture.sample);
      if (neural.candidates[0].name === labels[label]) neuralCorrect++;
      const start = performance.now(), result = recognize(fixture);
      times.push(performance.now() - start);
      total++;
      if (result.status === 'accepted') accepted++;
      if (result.orientationAmbiguous) ambiguous++;
      if (result.candidates[0]?.name === labels[label]) {
        correct++;
        const error = poseError(result.orientation, angle * Math.PI / 180, result.orientationPeriod);
        errors.push(error);
        if (!result.orientationAmbiguous) uniqueErrors.push(error);
        if (error > 10) poseFailures.push({ name: labels[label], angle, predicted: result.orientation * 180 / Math.PI, error,
          status: result.status, orientationAmbiguous: result.orientationAmbiguous });
        if (result.status === 'accepted') { acceptedCorrect++; acceptedErrors.push(error); }
      } else failures.push({ name: labels[label], angle, status: result.status, predicted: result.candidates[0]?.name });
    }
    const unknowns = makeUnknownSamples(model.sourceKind, calibration ? 660001 : 1770001, calibration ? 60 : 300);
    const distinctUnknowns = new Set(unknowns.map(f => Array.from(f.sample.mask).join(''))).size;
    assert.equal(distinctUnknowns, unknowns.length, 'Unknown fixture masks must not be duplicates');
    let falseAccepts = 0, unknownReviews = 0;
    const unknownFailures = [];
    for (const fixture of unknowns) {
      const result = recognize(fixture);
      if (result.status === 'accepted') { falseAccepts++; unknownFailures.push(result.candidates[0]); }
      if (result.status === 'review') unknownReviews++;
    }
    const report = { sourceKind: model.sourceKind, version: model.version, split: calibration ? 'calibration' : 'held-out',
      samples: total, labels: labels.length, standaloneNeuralAccuracy: neuralCorrect / total, hybridTop1Accuracy: correct / total,
      acceptedCoverage: accepted / total, acceptedAccuracy: accepted ? acceptedCorrect / accepted : 0, acceptedCount: accepted,
      unknownSamples: unknowns.length, distinctUnknowns, falseAccepts, falseAcceptRate: falseAccepts / unknowns.length, unknownReviews,
      rotationMedianDegrees: quantile(errors, 0.5), rotationP95Degrees: quantile(errors, 0.95),
      uniqueRotationP95Degrees: quantile(uniqueErrors, 0.95), acceptedRotationP95Degrees: quantile(acceptedErrors, 0.95),
      acceptedRotationMaxDegrees: acceptedErrors.length ? Math.max(...acceptedErrors) : null,
      rotationEvaluated: errors.length, symmetryFlaggedCount: ambiguous, warmLatencyP50Ms: quantile(times.slice(1), 0.5),
      warmLatencyP95Ms: quantile(times.slice(1), 0.95), maxLatencyMs: Math.max(...times), firstCallMs: times[0],
      modelBytes: size, sha256: createHash('sha256').update(contents).digest('hex'), failures, poseFailures, unknownFailures };
    reports.push(report);
    console.log(JSON.stringify(report, null, 2));
    if (enforce) {
      assert.ok(report.standaloneNeuralAccuracy >= 0.75, 'Neural classifier must learn useful discrimination');
      assert.ok(report.hybridTop1Accuracy >= 0.90, 'Hybrid held-out accuracy');
      assert.ok(report.acceptedCoverage >= 0.40, 'Rejecting everything is not a pass');
      assert.ok(report.acceptedAccuracy >= 0.98, 'Accepted symbol reliability');
      assert.ok(report.falseAcceptRate <= 0.01, 'Synthetic unknown false accepts exceed 1%');
      assert.ok(report.rotationP95Degrees <= 10, 'Full-angle pose error');
      assert.ok(report.acceptedRotationMaxDegrees <= 10, 'No automatic placement with a large measured pose error');
      assert.ok(report.warmLatencyP95Ms < 1000, 'Bounded latency target on validation host');
    }
  }
  assert.notDeepEqual(PHOTO_SYMBOL_MODEL.w1, CANVAS_SYMBOL_MODEL.w1);
  assert.ok(bytes < 1.5 * 1024 * 1024, 'Combined model payload exceeds 1.5 MiB');
  console.log(`Combined saved model bytes: ${bytes}. Synthetic-only evaluation, not real-world validation.`);
  return reports;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await validateSavedModels({ calibration: process.argv.includes('--calibration'), enforce: !process.argv.includes('--report-only') });
}
