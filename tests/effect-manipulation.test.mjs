import test from 'node:test';
import assert from 'node:assert/strict';
import { transformVolume } from '../local-demo/effect-editor/effect-manipulation.mjs';
const part = { type: 'box', x: 1, y: 0, z: 0, sx: 1, sy: 2, sz: 1, rx: 0, ry: 0, rz: 0 };
test('translation uses local coordinates and selected axis', () => {
  const p = transformVolume(part, 'move', 'x', {x: 2, y: 3, z: 1}, {x: 0, y: 0});
  assert.equal(p.x, 3); assert.equal(p.y, 0); assert.equal(p.z, 0); assert.equal(part.x, 1);
});
test('scale preserves proportions and bounds each dimension', () => {
  const p = transformVolume(part, 'scale', 'free', {}, {x: 150, y: 0});
  assert.equal(p.sy, 4); assert.ok(p.sx > 2);
  assert.equal(transformVolume(part, 'scale', 'z', {}, {x: -10000, y: 0}).sz, .05);
});
test('rotation wraps angles rather than sticking at its limits', () => {
  const p = transformVolume(part, 'rotate', 'z', {}, {x: 400, y: 0});
  assert.equal(p.rz, -160); assert.equal(p.rx, 0);
});
