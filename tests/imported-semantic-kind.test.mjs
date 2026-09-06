import assert from "node:assert/strict";
import test from "node:test";
import { convertWhaSpellMakerDocument } from "../wha-spell-maker-import.mjs";
import { parseCircleShare, fitCircleShare } from "../circle-share.mjs";
import { resolveGlyphSemantic } from "../action-semantics.mjs";
import { PALETTE_ELEMENTS } from "../symbol-palette-data.mjs";
import { composeSpellRecipe } from "../spell-grammar.mjs";

test("a crystallization sigil in an annulus retains placement kind and canonical meaning", () => {
  const { circle } = convertWhaSpellMakerDocument({ seals: [{
    rings: [{ radius: 375 }],
    signs: [{ name: "sigil_Crystalize", amount: 4, radius: 175, rotation: 10 }],
  }] });
  const glyphs = circle.actions.filter(({ type }) => type === "glyph");
  assert.equal(glyphs.length, 4);
  for (const glyph of glyphs) {
    assert.equal(glyph.element, "Cristal");
    assert.equal(glyph.kind, "sign");
    assert.equal(glyph.semanticKind, "sigil");
  }
  const parsed = parseCircleShare(JSON.parse(JSON.stringify(circle)));
  assert.equal(fitCircleShare(parsed, { width: 800, height: 600 })[1].semanticKind, "sigil");
  assert.equal(parsed.actions[1].rotation, Math.PI / 18);
});

test("imported cross-collection sigils drive the complete canonical flower sequence", () => {
  const { circle } = convertWhaSpellMakerDocument({ seals: [{
    rings: [{ radius: 375 }, { radius: 225 }],
    sigils: [{ name: "sigil_Flower" }, { name: "sigil_Water" }],
    signs: [{ name: "sigil_Crystalize", amount: 4, radius: 175 },
      { name: "sign_Enlarge" }, { name: "sign_Crush" }, { name: "sign_Dispersion" }],
  }] });
  const glyphs = circle.actions.map((action) => resolveGlyphSemantic(action, PALETTE_ELEMENTS)).filter(Boolean);
  const recipe = composeSpellRecipe({
    sigils: glyphs.filter((glyph) => glyph.kind === "sigil").map((glyph) => glyph.element),
    signs: glyphs.filter((glyph) => glyph.kind === "sign").map((glyph) => glyph.element),
    geometry: { targetAxes: [[1, 0, 0], [-1, 0, 0]], releaseAxes: [[0, 0, 1], [0, 0, -1]] },
  });
  const plan = recipe.manifestationPlan;
  assert.equal(plan.id, "water.crystal-flower-fracture");
  assert.deepEqual(plan.timeline.stages.map((stage) => stage.id), ["material-acquisition", "flower-formation", "enlargement", "crystallization", "fracture", "directed-dispersion"]);
  assert.equal(plan.geometry.targetAxes.length, 2);
  assert.ok(plan.flower.petals.length > 5);
});
