import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCompositionTexture,
  calibrateCompositionElement,
  compileCompositionDocument,
  extractCompositionDocument,
  normalizeCompositionDocument,
} from "../sigil-composition-model.mjs";

test("extractCompositionDocument preserves every action and groups a seal", () => {
  const document = extractCompositionDocument({
    actions: [
      { type: "circle", id: "ring-1", cx: 100, cy: 120, radius: 80, width: 4, closed: true },
      { type: "circle", id: "ring-2", cx: 100, cy: 120, radius: 45, width: 2, closed: true, filled: true },
      { type: "glyph", id: "sigil-1", element: "Eau", kind: "sigil", x: 100, y: 120, size: 28, rotation: 0.2 },
      { type: "glyph", id: "sign-1", element: "Colonne", kind: "sign", x: 100, y: 52, size: 18, rotation: 0 },
      { type: "free", id: "line-1", width: 3, points: [{ x: 80, y: 100 }, { x: 120, y: 100 }] },
      { type: "ray", id: "unknown-1", cx: 400, cy: 400, x: 450, y: 400, width: 2 },
    ],
    anchorIndex: 0,
  });

  assert.equal(document.version, 1);
  assert.equal(document.seals.length, 1);
  assert.equal(document.seals[0].rings.length, 2);
  assert.equal(document.seals[0].sigils[0].symbol, "Eau");
  assert.equal(document.seals[0].signs[0].symbol, "Colonne");
  assert.equal(document.seals[0].lines[0].points.length, 2);
  assert.equal(document.unclassified.length, 1);
  assert.equal(document.unclassified[0].action.type, "ray");
});

test("compileCompositionDocument keeps geometry and unknown actions", () => {
  const source = extractCompositionDocument({
    actions: [
      { type: "circle", id: "ring-1", cx: 100, cy: 120, radius: 80, width: 4, closed: true },
      { type: "glyph", id: "sigil-1", element: "Eau", kind: "sigil", x: 100, y: 120, size: 28 },
      { type: "ray", id: "unknown-1", cx: 400, cy: 400, x: 450, y: 400, width: 2 },
    ],
    anchorIndex: 0,
  });
  source.seals[0].sigils[0].x = 130;
  source.seals[0].sigils[0].texture = { kind: "zigzag", spacing: 8, amplitude: 3 };

  const actions = compileCompositionDocument(source);
  assert.deepEqual(actions, [
    { type: "circle", id: "ring-1", cx: 100, cy: 120, radius: 80, width: 4, closed: true },
    {
      type: "glyph",
      id: "sigil-1",
      element: "Eau",
      kind: "sigil",
      x: 130,
      y: 120,
      size: 28,
      texture: {
        kind: "zigzag",
        spacing: 8,
        amplitude: 3,
        thickness: 2,
        angle: 0,
        color: null,
        secondaryColor: null,
      },
    },
    { type: "ray", id: "unknown-1", cx: 400, cy: 400, x: 450, y: 400, width: 2 },
  ]);
});

test("calibrateCompositionElement recenters and rescales a detected symbol", () => {
  const calibrated = calibrateCompositionElement(
    { x: 92, y: 131, size: 20, rotation: 0 },
    { center: { x: 100, y: 120 }, size: 32, rotation: Math.PI / 2 },
  );

  assert.deepEqual(calibrated, { x: 100, y: 120, size: 32, rotation: Math.PI / 2 });
});

test("applyCompositionTexture normalizes a deterministic visual variant", () => {
  const textured = applyCompositionTexture(
    { symbol: "Eau", texture: null },
    { kind: "zigzag", spacing: 0, amplitude: 99 },
  );

  assert.deepEqual(textured.texture, {
    kind: "zigzag",
    spacing: 1,
    amplitude: 32,
    thickness: 2,
    angle: 0,
    color: null,
    secondaryColor: null,
  });
  assert.equal(textured.symbol, "Eau");
});

test("normalizeCompositionDocument migrates missing collections without dropping metadata", () => {
  const normalized = normalizeCompositionDocument({
    title: "Water study",
    seals: [{ rings: [{}] }],
  });

  assert.equal(normalized.version, 1);
  assert.equal(normalized.title, "Water study");
  assert.deepEqual(normalized.seals[0].sigils, []);
  assert.deepEqual(normalized.seals[0].signs, []);
  assert.deepEqual(normalized.seals[0].lines, []);
  assert.equal(normalized.seals[0].rings[0].visible, true);
});
