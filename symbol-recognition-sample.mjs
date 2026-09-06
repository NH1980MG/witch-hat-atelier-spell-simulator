import { toInkMask } from './photo-import.mjs';

export const SAMPLE_SIZE = 48;
export const FEATURE_SIZE = 97;
const MAX_PIXELS = 4 * 1024 * 1024;

function dimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > MAX_PIXELS) {
    throw new RangeError('Recognition image dimensions exceed limit');
  }
}

// Center of ink and radial scale commute with rotation; a bounding-box scale does not.
export function normalizeInk(mask, width, height) {
  dimensions(width, height);
  if (!mask || mask.length !== width * height) throw new TypeError('Invalid mask length');
  let count = 0, cx = 0, cy = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!Number.isFinite(mask[i]) || mask[i] < 0 || mask[i] > 255) throw new TypeError('Mask values must be finite ink values');
    if (mask[i] > 0) { count++; cx += i % width; cy += Math.floor(i / width); }
  }
  const out = new Float32Array(SAMPLE_SIZE ** 2);
  if (!count) return out;
  cx /= count; cy /= count;
  let radius = 1;
  for (let i = 0; i < mask.length; i++) if (mask[i] > 0) radius = Math.max(radius, Math.hypot(i % width - cx, Math.floor(i / width) - cy));
  const scale = 20 / radius;
  // Forward splatting retains thin strokes when a large source image is reduced.
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const x = Math.round(23.5 + (i % width - cx) * scale);
    const y = Math.round(23.5 + (Math.floor(i / width) - cy) * scale);
    if (x >= 0 && x < 48 && y >= 0 && y < 48) out[y * 48 + x] = 1;
  }
  // Upscaling needs inverse sampling as well, otherwise small inputs become dots.
  if (scale > 1) for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const sx = Math.round(cx + (x - 23.5) / scale), sy = Math.round(cy + (y - 23.5) / scale);
    if (sx >= 0 && sx < width && sy >= 0 && sy < height && mask[sy * width + sx]) out[y * 48 + x] = 1;
  }
  return out;
}

const polar = Array.from({ length: 2304 }, (_, i) => {
  const x = i % 48 - 23.5, y = Math.floor(i / 48) - 23.5;
  const angle = Math.atan2(y, x);
  return { radius: Math.hypot(x, y) / 20, cos: Array.from({ length: 8 }, (_, k) => Math.cos((k + 1) * angle)),
    sin: Array.from({ length: 8 }, (_, k) => Math.sin((k + 1) * angle)) };
});

export function extractInvariantFeatures(mask) {
  const re = new Float64Array(64), im = new Float64Array(64), mass = new Float64Array(8);
  const points = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    points.push([i % 48, Math.floor(i / 48)]);
    const p = polar[i];
    for (let r = 0; r < 8; r++) {
      const w = Math.max(0, 1 - Math.abs(p.radius * 7 - r));
      mass[r] += w;
      for (let k = 0; k < 8; k++) { re[r * 8 + k] += w * p.cos[k]; im[r * 8 + k] += w * p.sin[k]; }
    }
  }
  const n = Math.max(1, points.length), features = new Float32Array(FEATURE_SIZE);
  for (let r = 0; r < 8; r++) {
    features[r * 9] = mass[r] / n;
    for (let k = 0; k < 8; k++) features[r * 9 + k + 1] = Math.hypot(re[r * 8 + k], im[r * 8 + k]) / n;
  }
  const step = Math.max(1, Math.ceil(points.length / 100));
  let pairs = 0;
  for (let i = 0; i < points.length; i += step) for (let j = i + step; j < points.length; j += step) {
    const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) / 40 * 23;
    const low = Math.min(23, Math.floor(d)), high = Math.min(23, low + 1);
    features[72 + low] += 1 - (d - Math.floor(d)); features[72 + high] += d - Math.floor(d); pairs++;
  }
  for (let i = 72; i < 96; i++) features[i] /= Math.max(1, pairs);
  features[96] = points.length / 2304;
  return features;
}

function sample(mask, sourceKind) {
  return { mask, width: 48, height: 48, features: extractInvariantFeatures(mask), sourceKind,
    inkCount: mask.reduce((a, b) => a + Number(b > 0), 0) };
}

export function createPhotoRecognitionSample(input) {
  if (!input) throw new TypeError('Missing image');
  const { width, height } = input;
  dimensions(width, height);
  let mask = input.mask;
  if (!mask) {
    if (!input.data || input.data.length !== width * height * 4) throw new TypeError('Invalid RGBA image');
    mask = toInkMask(input);
  }
  return sample(normalizeInk(mask, width, height), 'imported-image');
}

export function createCanvasRecognitionSample(actions) {
  if (!Array.isArray(actions) || actions.length > 512) throw new RangeError('Stroke count limit');
  let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let rasterWork = 0;
  for (const action of actions) {
    if (action.type !== 'free' || !Array.isArray(action.points)) throw new TypeError('Expected freehand strokes');
    if (action.width !== undefined && (!Number.isFinite(action.width) || action.width <= 0)) throw new TypeError('Invalid stroke width');
    count += action.points.length;
    if (count > 24000) throw new RangeError('Point count limit');
    for (const p of action.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1e7 || Math.abs(p.y) > 1e7) throw new TypeError('Invalid point');
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  if (!count) return sample(new Float32Array(2304), 'canvas-strokes');
  const mask = new Uint8Array(96 * 96), scale = 76 / Math.max(1, maxX - minX, maxY - minY);
  for (const action of actions) {
    const radius = Math.max(0.8, Math.min(7, (action.width || 1.8) * scale / 2));
    for (let i = 0; i < action.points.length; i++) {
      const a = action.points[i], b = action.points[Math.min(i + 1, action.points.length - 1)];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * scale * 2));
      rasterWork += (steps + 1) * (2 * Math.ceil(radius) + 1) ** 2;
      if (rasterWork > 3000000) throw new RangeError('Stroke rasterization work limit');
      for (let j = 0; j <= steps; j++) {
        const x = 10 + (a.x + (b.x - a.x) * j / steps - minX) * scale;
        const y = 10 + (a.y + (b.y - a.y) * j / steps - minY) * scale;
        for (let yy = Math.max(0, Math.floor(y - radius)); yy <= Math.min(95, Math.ceil(y + radius)); yy++)
          for (let xx = Math.max(0, Math.floor(x - radius)); xx <= Math.min(95, Math.ceil(x + radius)); xx++)
            if ((xx - x) ** 2 + (yy - y) ** 2 <= radius ** 2) mask[yy * 96 + xx] = 1;
      }
    }
  }
  return sample(normalizeInk(mask, 96, 96), 'canvas-strokes');
}

export function validateRecognitionSample(value) {
  if (!value || value.width !== 48 || value.height !== 48 || value.mask?.length !== 2304 || value.features?.length !== FEATURE_SIZE
    || !['imported-image', 'canvas-strokes'].includes(value.sourceKind) || !Array.from(value.features).every(Number.isFinite)) throw new TypeError('Invalid recognition sample');
  return value;
}
