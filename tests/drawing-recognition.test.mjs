import assert from "node:assert/strict";
import test from "node:test";

import {
  assessFreehandBoundary,
  recognizedMaterialLabel,
} from "../drawing-recognition.mjs";

function circlePoints({ cx = 250, cy = 250, radius = 190, gap = 0, steps = 96 } = {}) {
  const gapAngle = 2 * Math.asin(Math.min(1, gap / (2 * radius)));
  const start = gapAngle / 2;
  const sweep = Math.PI * 2 - gapAngle;
  return Array.from({ length: steps }, (_, index) => {
    const angle = start + sweep * (index / (steps - 1));
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
}

test("a hand-drawn ring with a small pen gap is closed", () => {
  const result = assessFreehandBoundary(circlePoints({ gap: 10 }));

  assert.equal(result.candidate, true);
  assert.equal(result.closed, true);
});

test("the visibly open ring from the reported case stays incomplete", () => {
  const result = assessFreehandBoundary(circlePoints({ gap: 30 }));

  assert.equal(result.candidate, true);
  assert.equal(result.closed, false);
});

test("an open boundary candidate is not treated as a sigil", () => {
  const result = assessFreehandBoundary(circlePoints({ gap: 46 }));

  assert.equal(result.candidate, true);
  assert.equal(result.closed, false);
});

test("raw energy does not masquerade as a recognized material", () => {
  assert.equal(recognizedMaterialLabel({ sigilCount: 0, presentationLabel: "Raw energy", noneLabel: "None" }), "None");
  assert.equal(recognizedMaterialLabel({ sigilCount: 1, presentationLabel: "Water", noneLabel: "None" }), "Water");
});
