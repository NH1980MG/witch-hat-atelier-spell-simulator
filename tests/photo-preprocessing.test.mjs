import test from "node:test";
import assert from "node:assert/strict";

import { cropImageData, estimateInkMask, inkBounds } from "../photo-preprocessing.mjs";

function gradientPaper(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Math.round(198 + (x / Math.max(1, width - 1)) * 48 + (y / Math.max(1, height - 1)) * 5);
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value - 4;
      data[i + 2] = value - 10;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

function shadowedPaper(width, height, shadowValue = 150, lightValue = 230) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = x < width / 2 ? shadowValue : lightValue;
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

function inkCircle(photo, cx, cy, radius, thickness) {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;
  for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y += 1) {
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x += 1) {
      if (x < 0 || y < 0 || x >= photo.width || y >= photo.height) continue;
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < inner || distance > outer) continue;
      const i = (y * photo.width + x) * 4;
      photo.data[i] = 45;
      photo.data[i + 1] = 38;
      photo.data[i + 2] = 35;
    }
  }
}

function inkRect(photo, left, top, right, bottom) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const i = (y * photo.width + x) * 4;
      photo.data[i] = 35;
      photo.data[i + 1] = 30;
      photo.data[i + 2] = 28;
    }
  }
}

test("estimateInkMask keeps ink visible across uneven paper light", () => {
  const photo = gradientPaper(180, 120);
  inkCircle(photo, 90, 60, 34, 5);
  const mask = estimateInkMask(photo);
  const darkInk = mask.reduce((count, value) => count + value, 0);
  assert.ok(darkInk > 450, `expected the ring to remain visible, got ${darkInk} pixels`);
});

test("estimateInkMask removes isolated one-pixel noise", () => {
  const photo = gradientPaper(120, 90);
  inkCircle(photo, 60, 45, 25, 4);
  for (const [x, y] of [[4, 4], [115, 8], [8, 84]]) {
    const i = (y * photo.width + x) * 4;
    photo.data[i] = 20;
    photo.data[i + 1] = 20;
    photo.data[i + 2] = 20;
  }
  const mask = estimateInkMask(photo);
  for (const [x, y] of [[4, 4], [115, 8], [8, 84]]) {
    assert.equal(mask[y * photo.width + x], 0, `noise at ${x},${y} should be removed`);
  }
});

test("estimateInkMask keeps dense ink when local paper is unreliable", () => {
  const photo = gradientPaper(240, 160);
  inkRect(photo, 20, 30, 70, 120);
  inkRect(photo, 160, 40, 161, 112);
  const mask = estimateInkMask(photo);
  assert.equal(mask[75 * photo.width + 45], 1, "dense dark area should survive global fallback");
  assert.equal(mask[75 * photo.width + 160], 1, "thin stroke should survive local contrast");
});

test("estimateInkMask does not classify a legitimate paper shadow as ink", () => {
  const photo = shadowedPaper(240, 160);
  inkRect(photo, 60, 30, 61, 130);
  const mask = estimateInkMask(photo);
  const shadowInk = Array.from(mask).reduce((count, value, index) => {
    const x = index % photo.width;
    return count + (x < photo.width / 2 && x !== 60 && x !== 61 ? value : 0);
  }, 0);
  assert.ok(shadowInk < 500, `shadow paper should remain background, got ${shadowInk} ink pixels`);
  assert.equal(mask[80 * photo.width + 60], 1, "the dark stroke should remain ink");
});

test("ink bounds include the entire ring radius and a safe margin", () => {
  const photo = gradientPaper(500, 300);
  inkCircle(photo, 250, 150, 110, 5);
  const mask = estimateInkMask(photo);
  const bounds = inkBounds(mask, 500, 300);
  assert.ok(bounds.left <= 130 && bounds.right >= 370);
  assert.ok(bounds.top <= 30 && bounds.bottom >= 270);
});

test("inkBounds returns null for an empty mask", () => {
  assert.equal(inkBounds(new Uint8Array(12 * 8), 12, 8), null);
});

test("cropImageData keeps inclusive source edges and RGBA pixels", () => {
  const data = new Uint8ClampedArray([
    1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255,
    10, 11, 12, 255, 13, 14, 15, 255, 16, 17, 18, 255,
  ]);
  const cropped = cropImageData({ data, width: 3, height: 2 }, {
    left: 1,
    top: 0,
    right: 2,
    bottom: 1,
    width: 2,
    height: 2,
  });
  assert.deepEqual(cropped, {
    data: new Uint8ClampedArray([
      4, 5, 6, 255, 7, 8, 9, 255,
      13, 14, 15, 255, 16, 17, 18, 255,
    ]),
    width: 2,
    height: 2,
  });
});
