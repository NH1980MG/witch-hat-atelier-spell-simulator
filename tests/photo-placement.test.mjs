import test from "node:test";
import assert from "node:assert/strict";
import {
  mapPhotoAnalysis,
  photoContentBounds,
  selectPhotoCandidate,
} from "../photo-placement.mjs";

test("placement bounds include ring edges instead of only centers", () => {
  const bounds = photoContentBounds({
    ring: { cx: 100, cy: 80, radius: 60 },
    rings: [],
    regions: [],
  });
  assert.deepEqual(bounds, {
    left: 40,
    top: 20,
    right: 160,
    bottom: 140,
    width: 120,
    height: 120,
  });
});

test("placement bounds use accepted and user-confirmed region extents", () => {
  const bounds = photoContentBounds({
    rings: [],
    regions: [
      {
        status: "accepted",
        candidates: [{ name: "Eau", score: 81 }],
        left: 20,
        top: 10,
        right: 70,
        bottom: 50,
        width: 50,
        height: 40,
        cx: 45,
        cy: 30,
        size: 50,
      },
      {
        status: "ambiguous",
        selectedName: "Feu",
        candidates: [{ name: "Feu", score: 52 }],
        left: 90,
        top: 25,
        right: 130,
        bottom: 85,
        width: 40,
        height: 60,
        cx: 110,
        cy: 55,
        size: 60,
      },
      {
        status: "ambiguous",
        candidates: [{ name: "Terre", score: 50 }],
        left: 0,
        top: 0,
        right: 200,
        bottom: 200,
        width: 200,
        height: 200,
        cx: 100,
        cy: 100,
        size: 200,
      },
    ],
  });

  assert.deepEqual(bounds, {
    left: 20,
    top: 5,
    right: 140,
    bottom: 85,
    width: 120,
    height: 80,
  });
});

test("mapping fits complete extents in the target without stretching", () => {
  const mapped = mapPhotoAnalysis({
    ring: { cx: 100, cy: 50, radius: 50 },
    rings: [],
    regions: [],
  }, { left: 10, top: 20, width: 200, height: 100 });

  assert.deepEqual(mapped, {
    rings: [{ cx: 110, cy: 70, radius: 50 }],
    symbols: [],
  });
});

test("mapping recreates accepted and explicitly confirmed candidates only", () => {
  const mapped = mapPhotoAnalysis({
    rings: [],
    regions: [
      {
        status: "accepted",
        candidates: [{ name: "Eau", score: 78 }],
        cx: 20,
        cy: 20,
        size: 20,
        left: 10,
        top: 10,
        right: 30,
        bottom: 30,
      },
      {
        status: "ambiguous",
        selectedName: "Feu",
        candidates: [{ name: "Terre", score: 51 }, { name: "Feu", score: 49 }],
        cx: 50,
        cy: 20,
        size: 20,
        left: 40,
        top: 10,
        right: 60,
        bottom: 30,
      },
      {
        status: "ambiguous",
        candidates: [{ name: "Lumiere", score: 47 }],
        cx: 80,
        cy: 20,
        size: 20,
        left: 70,
        top: 10,
        right: 90,
        bottom: 30,
      },
      {
        status: "unreadable",
        selectedName: "Vent",
        candidates: [{ name: "Vent", score: 30 }],
        cx: 110,
        cy: 20,
        size: 20,
        left: 100,
        top: 10,
        right: 120,
        bottom: 30,
      },
    ],
  }, { left: 0, top: 0, width: 110, height: 75 });

  assert.deepEqual(mapped.rings, []);
  assert.deepEqual(mapped.symbols.map(({ name, score }) => ({ name, score })), [
    { name: "Eau", score: 78 },
    { name: "Feu", score: 49 },
  ]);
  assert.deepEqual(mapped.symbols.map(({ cx, cy, size, width, height }) => ({
    cx,
    cy,
    size,
    width,
    height,
    renderedLeft: cx - size,
    renderedRight: cx + size,
  })), [
    { cx: 22, cy: 37.5, size: 22, width: 44, height: 44, renderedLeft: 0, renderedRight: 44 },
    { cx: 88, cy: 37.5, size: 22, width: 44, height: 44, renderedLeft: 66, renderedRight: 110 },
  ]);
});

test("mapping returns no output when nothing is accepted or confirmed", () => {
  assert.deepEqual(mapPhotoAnalysis({
    rings: [],
    regions: [{
      status: "ambiguous",
      candidates: [{ name: "Eau", score: 50 }],
      cx: 10,
      cy: 10,
      size: 10,
    }],
  }, { left: 0, top: 0, width: 100, height: 100 }), { rings: [], symbols: [] });
});

test("candidate selection mutates pending analysis and updates placement", () => {
  const pending = {
    analysis: {
      rings: [],
      regions: [{
        status: "ambiguous",
        candidates: [{ name: "Terre", score: 51 }, { name: "Feu", score: 49 }],
        cx: 10,
        cy: 10,
        size: 20,
        left: 0,
        top: 0,
        right: 20,
        bottom: 20,
      }],
    },
  };
  const target = { left: 0, top: 0, width: 100, height: 100 };

  assert.deepEqual(mapPhotoAnalysis(pending.analysis, target), { rings: [], symbols: [] });

  selectPhotoCandidate(pending.analysis, 0, "Feu");

  assert.equal(pending.analysis.regions[0].selectedName, "Feu");
  assert.deepEqual(mapPhotoAnalysis(pending.analysis, target).symbols.map(({ name, score, size }) => ({
    name,
    score,
    size,
  })), [{ name: "Feu", score: 49, size: 50 }]);

  selectPhotoCandidate(pending.analysis, 0, "");

  assert.equal(pending.analysis.regions[0].selectedName, null);
  assert.deepEqual(mapPhotoAnalysis(pending.analysis, target), { rings: [], symbols: [] });
});
