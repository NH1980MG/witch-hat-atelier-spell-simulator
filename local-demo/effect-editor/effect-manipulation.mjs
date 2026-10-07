import { normalizeParts } from './effect-authoring-model.mjs';

export function transformVolume(part, mode, axis, delta, pixels) {
  const value = { ...part };
  const axes = axis === 'free' ? ['x', 'y', 'z'] : [axis];
  if (mode === 'move') for (const key of axes) value[key] = part[key] + (delta[key] || 0);
  if (mode === 'scale') for (const key of axes) value[`s${key}`] = part[`s${key}`] * Math.exp(Math.max(-10, Math.min(10, (pixels.x - pixels.y) / 150)));
  const wrap = n => ((n + 180) % 360 + 360) % 360 - 180;
  if (mode === 'rotate') {
    if (axis === 'free') { value.rx = wrap(part.rx + pixels.y * .5); value.ry = wrap(part.ry + pixels.x * .5); }
    else value[`r${axis}`] = wrap(part[`r${axis}`] + (pixels.x - pixels.y) * .5);
  }
  const result = normalizeParts([value])[0];
  for (const key of ['x', 'y', 'z', 'sx', 'sy', 'sz', 'rx', 'ry', 'rz']) result[key] = Math.round(result[key] * 1000) / 1000;
  return result;
}
