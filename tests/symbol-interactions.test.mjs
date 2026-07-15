import test from "node:test";
import assert from "node:assert/strict";
import {
  canDropGlyph,
  clampGlyphCenter,
  cloneActions,
  resizeGlyphSize,
  shouldArmLongPress,
  shouldDeferTouchTool,
  topmostGlyphIndexAtPoint,
} from "../symbol-interactions.mjs";

test("resizeGlyphSize applique le pas et les limites", () => {
  assert.equal(resizeGlyphSize(20, "grow"), 22);
  assert.equal(resizeGlyphSize(20, "shrink"), 18);
  assert.equal(resizeGlyphSize(119, "grow"), 120);
  assert.equal(resizeGlyphSize(12, "shrink"), 12);
});

test("resizeGlyphSize refuse une direction inconnue", () => {
  assert.throws(() => resizeGlyphSize(20, "sideways"), /direction/);
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

test("clampGlyphCenter garde tout le glyphe dans le parchemin", () => {
  const bounds = { left: 0, right: 100, top: 0, bottom: 80 };
  assert.deepEqual(clampGlyphCenter({ x: -10, y: 95 }, 12, bounds), { x: 12, y: 68 });
  assert.deepEqual(clampGlyphCenter({ x: 50, y: 40 }, 12, bounds), { x: 50, y: 40 });
});

test("cloneActions copie aussi les points de trace", () => {
  const source = [{ type: "free", points: [{ x: 1, y: 2 }] }];
  const clone = cloneActions(source);

  clone[0].points[0].x = 9;
  assert.equal(source[0].points[0].x, 1);
});

test("le clic long est reserve a un seul doigt principal", () => {
  assert.equal(shouldArmLongPress("touch", 0, 1), true);
  assert.equal(shouldArmLongPress("pen", 0, 1), false);
  assert.equal(shouldArmLongPress("mouse", 0, 1), false);
  assert.equal(shouldArmLongPress("touch", 0, 2), false);
  assert.equal(shouldArmLongPress("touch", 2, 1), false);
});

test("les outils tactiles irreversibles attendent la fin du clic long", () => {
  assert.equal(shouldDeferTouchTool("touch", "glyph"), true);
  assert.equal(shouldDeferTouchTool("touch", "eraser"), true);
  assert.equal(shouldDeferTouchTool("touch", "free"), false);
  assert.equal(shouldDeferTouchTool("pen", "glyph"), false);
});
