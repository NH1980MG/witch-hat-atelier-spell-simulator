import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SYMBOL_PATHS } from '../symbol-catalog.mjs';
import { flattenSvgPath } from '../stroke-matcher.mjs';
import { createPhotoRecognitionSample, createCanvasRecognitionSample, FEATURE_SIZE } from '../symbol-recognition-sample.mjs';

export const TRAIN_ANGLES = Array.from({ length: 36 }, (_, i) => i * 10);
export const CALIBRATION_ANGLES = [15, 75, 135, 195, 255, 315];
export const TEST_ANGLES = [5, 55, 115, 175, 235, 285, 335];
export function randomGenerator(seed) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const polylines = new Map();
export function makeSyntheticSample(name, sourceKind, degrees, seed, augmented = true) {
  const random = randomGenerator(seed), photo = sourceKind === 'imported-image';
  if (!polylines.has(name)) polylines.set(name, SYMBOL_PATHS[name].flatMap(flattenSvgPath));
  const radians = degrees * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
  const sx = augmented ? 0.94 + random() * 0.12 : 1, sy = augmented ? 0.94 + random() * 0.12 : 1;
  const shear = augmented && photo ? (random() - 0.5) * 0.10 : 0;
  const actions = polylines.get(name).map(line => ({ type: 'free', width: augmented ? (photo ? 1.3 : 1.4) + random() * (photo ? 1.0 : 0.8) : 1.8,
    points: line.map(([x, y]) => {
      const jitter = augmented ? (photo ? 0.12 : 0.32) : 0;
      const dx = (x - 24) * sx + shear * (y - 24) + (random() - 0.5) * jitter;
      const dy = (y - 24) * sy + (random() - 0.5) * jitter;
      return { x: 48 + 1.6 * (dx * c - dy * s), y: 48 + 1.6 * (dx * s + dy * c) };
    }) }));
  // Stroke width scales with the coordinate transform, independently per source.
  for (const action of actions) action.width *= 1.6;
  if (!photo) return { actions, sample: createCanvasRecognitionSample(actions), name, degrees };
  const mask = new Uint8Array(96 * 96);
  for (const action of actions) for (let i = 0; i < action.points.length; i++) {
    const a = action.points[i], b = action.points[Math.min(i + 1, action.points.length - 1)];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2)), radius = action.width / 2;
    for (let j = 0; j <= steps; j++) {
      const x = a.x + (b.x - a.x) * j / steps, y = a.y + (b.y - a.y) * j / steps;
      for (let yy = Math.max(0, Math.floor(y - radius)); yy <= Math.min(95, Math.ceil(y + radius)); yy++)
        for (let xx = Math.max(0, Math.floor(x - radius)); xx <= Math.min(95, Math.ceil(x + radius)); xx++)
          if ((xx - x) ** 2 + (yy - y) ** 2 <= radius ** 2) mask[yy * 96 + xx] = 1;
    }
  }
  if (augmented) for (let i = 0; i < mask.length; i++) if (mask[i] && random() < 0.012) mask[i] = 0;
  return { mask, width: 96, height: 96, sample: createPhotoRecognitionSample({ mask, width: 96, height: 96 }), name, degrees };
}

export function makeUnknownSamples(sourceKind, seed = 770001, count = 36) {
  const random = randomGenerator(seed), fixtures = [];
  for (let i = 0; i < count; i++) {
    let actions;
    if (i % 3 === 0) actions = [{ type: 'free', width: 3 + random() * 8,
      points: Array.from({ length: 8 }, () => ({ x: 10 + random() * 70, y: 10 + random() * 70 })) }];
    else if (i % 3 === 1) actions = Array.from({ length: 4 + i % 4 }, (_, j) => ({ type: 'free', width: 1.4 + random(),
      points: [{ x: 10 + j * 8 + random() * 3, y: 10 + random() * 6 },
        { x: 10 + j * 8 + random() * 3, y: 74 + random() * 6 }] }));
    else {
      const winding = 0.26 + random() * 0.26, growth = 0.38 + random() * 0.24;
      actions = [{ type: 'free', width: 1.4 + random(),
        points: Array.from({ length: 60 }, (_, j) => ({ x: 48 + j * growth * Math.cos(j * winding), y: 48 + j * growth * Math.sin(j * winding) })) }];
    }
    const sample = createCanvasRecognitionSample(actions);
    fixtures.push(sourceKind === 'canvas-strokes' ? { actions, sample } : {
      mask: sample.mask, width: 48, height: 48,
      sample: createPhotoRecognitionSample({ mask: sample.mask, width: 48, height: 48 }) });
  }
  return fixtures;
}

export function trainModel(sourceKind) {
  const seed = sourceKind === 'imported-image' ? 381901 : 782303, random = randomGenerator(seed);
  const labels = Object.keys(SYMBOL_PATHS), d = FEATURE_SIZE, h = 64, k = labels.length;
  const dataset = [];
  for (let y = 0; y < k; y++) for (let a = 0; a < TRAIN_ANGLES.length; a++) for (let repeat = 0; repeat < 2; repeat++) {
    dataset.push({ x: makeSyntheticSample(labels[y], sourceKind, TRAIN_ANGLES[a], seed + y * 10000 + a * 17 + repeat).sample.features, y });
  }
  const mean = new Float64Array(d), scale = new Float64Array(d);
  for (const { x } of dataset) for (let i = 0; i < d; i++) mean[i] += x[i] / dataset.length;
  for (const { x } of dataset) for (let i = 0; i < d; i++) scale[i] += (x[i] - mean[i]) ** 2 / dataset.length;
  for (let i = 0; i < d; i++) scale[i] = Math.max(0.002, Math.sqrt(scale[i]));
  for (const row of dataset) row.x = Float32Array.from(row.x, (x, i) => Math.max(-8, Math.min(8, (x - mean[i]) / scale[i])));
  const w1 = Float32Array.from({ length: d * h }, () => (random() - 0.5) * Math.sqrt(24 / d));
  const w2 = Float32Array.from({ length: h * k }, () => (random() - 0.5) * Math.sqrt(12 / h));
  const b1 = new Float32Array(h), b2 = new Float32Array(k);
  const parameters = [w1, b1, w2, b2], velocities = parameters.map(p => new Float32Array(p.length));
  const gradients = parameters.map(p => new Float32Array(p.length));
  const hidden = new Float32Array(h), probabilities = new Float64Array(k), dh = new Float64Array(h);
  let initialLoss = 0, finalLoss = 0;
  const epochs = 65, batchSize = 32;
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = dataset.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [dataset[i], dataset[j]] = [dataset[j], dataset[i]]; }
    let loss = 0, correct = 0;
    const rate = 0.025 * (1 - epoch / epochs) + 0.003;
    for (let offset = 0; offset < dataset.length; offset += batchSize) {
      for (const g of gradients) g.fill(0);
      const end = Math.min(offset + batchSize, dataset.length);
      for (let n = offset; n < end; n++) {
        const { x, y } = dataset[n];
        for (let j = 0; j < h; j++) { let v = b1[j]; for (let i = 0; i < d; i++) v += w1[j * d + i] * x[i]; hidden[j] = Math.max(0, v); }
        let max = -Infinity, winner = 0;
        for (let j = 0; j < k; j++) { let v = b2[j]; for (let i = 0; i < h; i++) v += w2[j * h + i] * hidden[i]; probabilities[j] = v; if (v > max) { max = v; winner = j; } }
        if (winner === y) correct++;
        let sum = 0;
        for (let j = 0; j < k; j++) { probabilities[j] = Math.exp(probabilities[j] - max); sum += probabilities[j]; }
        loss -= Math.log(Math.max(1e-12, probabilities[y] / sum));
        dh.fill(0);
        for (let j = 0; j < k; j++) {
          const delta = probabilities[j] / sum - Number(j === y);
          gradients[3][j] += delta;
          for (let i = 0; i < h; i++) { gradients[2][j * h + i] += delta * hidden[i]; dh[i] += delta * w2[j * h + i]; }
        }
        for (let j = 0; j < h; j++) {
          const delta = hidden[j] > 0 ? dh[j] : 0;
          gradients[1][j] += delta;
          for (let i = 0; i < d; i++) gradients[0][j * d + i] += delta * x[i];
        }
      }
      for (let p = 0; p < parameters.length; p++) for (let i = 0; i < parameters[p].length; i++) {
        velocities[p][i] = 0.9 * velocities[p][i] + gradients[p][i] / (end - offset) + (p % 2 === 0 ? 0.0001 * parameters[p][i] : 0);
        parameters[p][i] -= rate * velocities[p][i];
      }
    }
    finalLoss = loss / dataset.length;
    if (epoch === 0) initialLoss = finalLoss;
    if (epoch % 10 === 0 || epoch === epochs - 1) console.log(`${sourceKind} epoch ${epoch + 1}/${epochs}: loss=${finalLoss.toFixed(4)} accuracy=${(correct / dataset.length).toFixed(4)}`);
  }
  const rounded = values => Array.from(values, v => Number(v.toFixed(7)));
  return { version: `${sourceKind === 'imported-image' ? 'photo' : 'canvas'}-symbol-net-v1-experimental`, sourceKind, experimental: true,
    architecture: 'polar-pair-descriptors/97-64-69/relu-softmax', inputSize: d, hiddenSize: h, labels,
    mean: rounded(mean), scale: rounded(scale), w1: rounded(w1), b1: rounded(b1), w2: rounded(w2), b2: rounded(b2),
    calibration: { acceptGeometry: 0.83, acceptMargin: 0.035, minimumNeural: 0.80, reviewGeometry: 0.64 },
    training: { seed, epochs, batchSize, samples: dataset.length, initialLoss, finalLoss, angles: TRAIN_ANGLES,
      provenance: 'Synthetic catalog paths only; no real user corpus. SGD momentum 0.9; cross-entropy; all dense weights optimized.' } };
}

async function main() {
  if (process.argv.includes('--check')) {
    const { validateSavedModels } = await import('./validate-symbol-recognition-models.mjs');
    await validateSavedModels();
    return;
  }
  for (const sourceKind of ['imported-image', 'canvas-strokes']) {
    const model = trainModel(sourceKind), photo = sourceKind === 'imported-image';
    const exportName = photo ? 'PHOTO_SYMBOL_MODEL' : 'CANVAS_SYMBOL_MODEL';
    const output = new URL(`../${photo ? 'photo' : 'canvas'}-symbol-model-data.mjs`, import.meta.url);
    // This is generated output, not a hand-maintained source edit.
    await writeFile(output, `// Generated by scripts/train-symbol-recognition-models.mjs. Synthetic-only experimental model.\nconst model = ${JSON.stringify(model)};\nfor (const value of Object.values(model)) if (Array.isArray(value)) Object.freeze(value);\nObject.freeze(model.calibration);\nObject.freeze(model.training.angles);\nObject.freeze(model.training);\nexport const ${exportName} = Object.freeze(model);\n`);
    console.log(`Wrote ${fileURLToPath(output)}`);
  }
}

// Do not hold module evaluation open: --check imports the validator, which reuses
// the pure fixture generators from this module without starting an optimizer.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
