import assert from "node:assert/strict";
import test from "node:test";

import {
  CATALOG_SYMBOLS,
  buildSymbolIndex,
  normalizePointerPoint,
  renderStroke,
} from "../local-demo/effect-editor/effect-editor-ui.mjs";

test("catalog entries use the authoritative palette kind and vector paths", () => {
  const water = CATALOG_SYMBOLS.find((symbol) => symbol.id === "Eau");
  const column = CATALOG_SYMBOLS.find((symbol) => symbol.id === "Colonne");
  assert.equal(water.kind, "sigil");
  assert.equal(column.kind, "sign");
  assert.equal(water.name, "Eau");
  assert.ok(water.paths.length > 0);
  assert.ok(column.paths.length > 0);
  assert.equal(CATALOG_SYMBOLS.length > 60, true);
});

test("symbol index combines official and local custom symbols without collisions", () => {
  const custom = [{ id: "mine-1", name: "Mon signe", kind: "sign", role: "form", strokes: [[{ x: 0, y: 1 }]] }];
  const index = buildSymbolIndex(custom);
  assert.equal(index.get("Eau").kind, "sigil");
  assert.equal(index.get("mine-1").name, "Mon signe");
  assert.deepEqual(index.get("mine-1").strokes, custom[0].strokes);
});

test("pointer coordinates are normalized to the SVG bounds and clamped", () => {
  assert.deepEqual(normalizePointerPoint({ clientX: 145, clientY: 70 }, { left: 45, top: 20, width: 200, height: 100 }), { x: 0.5, y: 0.5 });
  assert.deepEqual(normalizePointerPoint({ clientX: 0, clientY: 200 }, { left: 45, top: 20, width: 200, height: 100 }), { x: 0, y: 1 });
  assert.throws(() => normalizePointerPoint({ clientX: 10, clientY: 10 }, { left: 0, top: 0, width: 0, height: 10 }), TypeError);
});

test("stroke renderer maps normalized points to a viewBox path", () => {
  assert.equal(renderStroke([{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.8 }]), "M 10 20 L 50 80");
  assert.equal(renderStroke([]), "");
});
