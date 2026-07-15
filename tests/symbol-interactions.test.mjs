import test from "node:test";
import assert from "node:assert/strict";
import {
  canDropGlyph,
  cloneActions,
  resizeGlyphSize,
  topmostGlyphIndexAtPoint,
} from "../symbol-interactions.mjs";

test("resizeGlyphSize applique le pas et les limites", () => {
  assert.equal(resizeGlyphSize(20, "grow"), 22);
  assert.equal(resizeGlyphSize(20, "shrink"), 18);
  assert.equal(resizeGlyphSize(119, "grow"), 120);
  assert.equal(resizeGlyphSize(12, "shrink"), 12);
});

test("topmostGlyphIndexAtPoint ignore les traits et choisit le glyphe superieur", () => {
  const actions = [
    { type: "glyph", x: 50, y: 50, size: 20 },
    { type: "circle", cx: 50, cy: 50, radius: 30 },
    { type: "glyph", x: 52, y: 50, size: 12 },
  ];

  assert.equal(topmostGlyphIndexAtPoint(actions, { x: 51, y: 50 }), 2);
  assert.equal(topmostGlyphIndexAtPoint(actions, { x: 200, y: 200 }), -1);
});

test("canDropGlyph exige que le glyphe entier reste dans les limites", () => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };

  assert.equal(canDropGlyph({ x: 50, y: 50 }, 20, bounds), true);
  assert.equal(canDropGlyph({ x: 10, y: 50 }, 20, bounds), false);
});

test("cloneActions copie aussi les points de trace", () => {
  const source = [{ type: "free", points: [{ x: 1, y: 2 }] }];
  const clone = cloneActions(source);

  clone[0].points[0].x = 9;
  assert.equal(source[0].points[0].x, 1);
});
