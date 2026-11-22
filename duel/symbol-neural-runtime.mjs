const validated = new WeakSet();

export function validateNeuralModel(model) {
  if (!model || typeof model !== 'object') throw new TypeError('Missing neural model');
  if (validated.has(model)) return model;
  const { inputSize: d, hiddenSize: h, labels } = model;
  if (!Number.isInteger(d) || d < 1 || d > 256 || !Number.isInteger(h) || h < 1 || h > 128
    || !Array.isArray(labels) || labels.length < 2 || labels.length > 69 || new Set(labels).size !== labels.length
    || labels.some(n => typeof n !== 'string') || typeof model.version !== 'string') throw new RangeError('Neural architecture limit');
  for (const [key, length] of Object.entries({ mean: d, scale: d, w1: d * h, b1: h, w2: h * labels.length, b2: labels.length })) {
    if (model[key]?.length !== length || !Array.from(model[key]).every(Number.isFinite)) throw new TypeError(`Invalid finite weights: ${key}`);
  }
  if (model.scale.some(s => s <= 0)) throw new TypeError('Invalid feature scale');
  // Only cache immutable models; callers may mutate test or development models.
  if (Object.isFrozen(model) && ['mean', 'scale', 'w1', 'b1', 'w2', 'b2', 'labels'].every(k => Object.isFrozen(model[k]))) validated.add(model);
  return model;
}

export function runNeuralInference(model, sample) {
  validateNeuralModel(model);
  if (sample?.sourceKind !== model.sourceKind || sample.features?.length !== model.inputSize) throw new TypeError('Neural source/input mismatch');
  const input = new Float32Array(model.inputSize), hidden = new Float32Array(model.hiddenSize), logits = new Float64Array(model.labels.length);
  for (let i = 0; i < input.length; i++) {
    if (!Number.isFinite(sample.features[i])) throw new TypeError('Nonfinite neural input');
    input[i] = Math.max(-8, Math.min(8, (sample.features[i] - model.mean[i]) / model.scale[i]));
  }
  for (let j = 0; j < hidden.length; j++) {
    let value = model.b1[j];
    for (let i = 0; i < input.length; i++) value += model.w1[j * input.length + i] * input[i];
    hidden[j] = Math.max(0, value);
  }
  for (let j = 0; j < logits.length; j++) {
    let value = model.b2[j];
    for (let i = 0; i < hidden.length; i++) value += model.w2[j * hidden.length + i] * hidden[i];
    if (!Number.isFinite(value)) throw new TypeError('Nonfinite neural output');
    logits[j] = value;
  }
  const max = Math.max(...logits);
  let sum = 0;
  for (let j = 0; j < logits.length; j++) { logits[j] = Math.exp(logits[j] - max); sum += logits[j]; }
  return { candidates: model.labels.map((name, i) => ({ name, score: logits[i] / sum })).sort((a, b) => b.score - a.score),
    sourceKind: model.sourceKind, modelVersion: model.version };
}
