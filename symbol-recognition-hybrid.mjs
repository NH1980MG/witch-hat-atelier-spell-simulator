import { rasterizeTemplate, distanceTransform } from './photo-import.mjs';
import { normalizeInk, SAMPLE_SIZE } from './symbol-recognition-sample.mjs';
import { runNeuralInference } from './symbol-neural-runtime.mjs';

const TAU = Math.PI * 2;
const cache = new WeakMap();
export const wrapOrientation = angle => ((angle % TAU) + TAU) % TAU;

export function rotateRecognitionMask(mask, angle) {
  const out = new Float32Array(2304), c = Math.cos(angle), s = Math.sin(angle);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const sx = Math.round(23.5 + (x - 23.5) * c + (y - 23.5) * s);
    const sy = Math.round(23.5 - (x - 23.5) * s + (y - 23.5) * c);
    if (sx >= 0 && sy >= 0 && sx < 48 && sy < 48) out[y * 48 + x] = mask[sy * 48 + sx];
  }
  return out;
}

function inkIndices(mask) {
  const points = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) points.push(i);
  return points;
}

function geometryScore(a, ad, b, bd) {
  if (!a.length || !b.length) return 0;
  let forward = 0, backward = 0;
  for (const i of a) forward += Math.min(8, bd[i]);
  for (const i of b) backward += Math.min(8, ad[i]);
  const chamfer = Math.max(forward / a.length, backward / b.length);
  const density = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return Math.max(0, Math.exp(-chamfer / 2.3) * (0.75 + 0.25 * density));
}

function templates(symbolPaths, labels) {
  if (!symbolPaths || typeof symbolPaths !== 'object') throw new TypeError('Missing symbol catalog');
  if (!cache.has(symbolPaths)) cache.set(symbolPaths, new Map());
  const byName = cache.get(symbolPaths);
  if (labels.some(name => !Array.isArray(symbolPaths[name]) || symbolPaths[name].length > 64
    || symbolPaths[name].some(p => typeof p !== 'string' || p.length > 32000))) throw new TypeError('Incomplete/invalid symbol catalog');
  const entries = labels.map(name => {
    if (byName.has(name) && byName.get(name).paths === symbolPaths[name]) return byName.get(name);
    const mask = normalizeInk(rasterizeTemplate(symbolPaths[name], 96), 96, 96), dist = distanceTransform(mask, SAMPLE_SIZE), points = inkIndices(mask);
    let period = TAU;
    // Conservative approximate symmetry detection, never infer a unique pose for an equivalent rotation.
    for (const order of [8, 6, 4, 3, 2]) {
      const rotated = rotateRecognitionMask(mask, TAU / order), rd = distanceTransform(rotated);
      if (geometryScore(points, dist, inkIndices(rotated), rd) >= 0.94) { period = TAU / order; break; }
    }
    const template = { name, mask, dist, points, period, paths: symbolPaths[name] };
    byName.set(name, template);
    return template;
  });
  return entries;
}

export function emptyRecognitionResult(sourceKind, modelVersion, status = 'unknown') {
  return { status, candidates: [], confidence: 0, orientation: 0, orientationAmbiguous: true,
    orientationPeriod: null, sourceKind, modelVersion, experimental: true };
}

export function recognizeHybridSymbol(sample, model, symbolPaths) {
  if (sample.inkCount < 8 || sample.inkCount > 1000) return emptyRecognitionResult(model.sourceKind, model.version);
  const neural = runNeuralInference(model, sample), probabilities = new Map(neural.candidates.map(c => [c.name, c.score]));
  const rotations = Array.from({ length: 72 }, (_, i) => {
    const angle = i * TAU / 72, mask = rotateRecognitionMask(sample.mask, -angle);
    return { angle, points: inkIndices(mask), dist: distanceTransform(mask) };
  });
  const scored = templates(symbolPaths, neural.candidates.slice(0, 8).map(candidate => candidate.name)).map(template => {
    let best = { score: -1, angle: 0 };
    const poses = [];
    for (const r of rotations) {
      const score = geometryScore(r.points, r.dist, template.points, template.dist);
      poses.push({ angle: r.angle, score });
      if (score > best.score) best = { score, angle: r.angle };
    }
    return { name: template.name, geometryScore: best.score, neuralScore: probabilities.get(template.name),
      rotation: best.angle, period: template.period, template, poses };
  });
  // The neural model contributes to ranking, but cannot override a poor geometric fit.
  const fusion = candidate => 0.90 * candidate.geometryScore + 0.10 * Math.sqrt(candidate.neuralScore);
  scored.sort((a, b) => fusion(b) - fusion(a));
  for (const candidate of scored.slice(0, 4)) {
    const initial = candidate.rotation;
    for (let delta = -4; delta <= 4; delta++) {
      const angle = initial + delta * Math.PI / 180, rotated = rotateRecognitionMask(sample.mask, -angle), dist = distanceTransform(rotated);
      const score = geometryScore(inkIndices(rotated), dist, candidate.template.points, candidate.template.dist);
      if (score > candidate.geometryScore) { candidate.geometryScore = score; candidate.rotation = wrapOrientation(angle); }
    }
  }
  scored.sort((a, b) => fusion(b) - fusion(a));
  const best = scored[0], margin = fusion(best) - fusion(scored[1]), cal = model.calibration;
  let status = best.geometryScore >= cal.reviewGeometry ? 'review' : 'unknown';
  if (best.geometryScore >= cal.acceptGeometry && margin >= cal.acceptMargin && best.neuralScore >= cal.minimumNeural) status = 'accepted';
  const orientationAlternatives = [best.rotation];
  for (const pose of best.poses.sort((a, b) => b.score - a.score)) {
    if (pose.score < best.geometryScore - 0.025) continue;
    const separated = orientationAlternatives.every(angle => {
      const distance = Math.abs(angle - pose.angle) % best.period;
      return Math.min(distance, best.period - distance) > 25 * Math.PI / 180;
    });
    if (separated) orientationAlternatives.push(pose.angle);
  }
  const competingPoses = orientationAlternatives.length > 1;
  if (competingPoses && status === 'accepted') status = 'review';
  const orientationAmbiguous = best.period < TAU - 1e-6 || competingPoses;
  const orientation = best.rotation % best.period;
  return { status, candidates: scored.slice(0, 3).map(c => ({ name: c.name, score: 100 * fusion(c), rotation: c.rotation,
    neuralScore: c.neuralScore, geometryScore: c.geometryScore })), confidence: Math.min(1, fusion(best)),
    orientation, orientationAmbiguous, orientationPeriod: best.period, orientationAlternatives,
    orientationAmbiguity: competingPoses ? 'competing-poses' : orientationAmbiguous ? 'symmetry' : null,
    sourceKind: model.sourceKind, modelVersion: model.version, experimental: true };
}
