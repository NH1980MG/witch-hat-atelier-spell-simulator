import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeManifestation } from "../manifestation-synthesis.mjs";
import { composeSpellRecipe } from "../spell-grammar.mjs";
import { convertWhaSpellMakerDocument } from "../wha-spell-maker-import.mjs";

const input = { spellId: "canonical-flower", materialProfile: { family: "water", phase: "liquid" }, sigilCounts: { Eau: 1, Fleur: 1, Cristal: 4 }, signCounts: { Agrandissement: 4, Crush: 3 }, operations: { form: ["dispersion"], state: ["resize", "crush"], target: ["aim"] }, geometry: { targetAxes: [[1, 0, 0], [-1, 0, 0]] } };

test("confirmed recipe counts select sequenced flower before generic specializations", () => {
  const plan = synthesizeManifestation(input);
  assert.equal(plan.id, "water.crystal-flower-fracture");
  assert.equal(plan.spellId, input.spellId);
  assert.equal(plan.form.id, "flower");
  assert.equal(plan.timeline.stages.at(-1).id, "directed-dispersion");
  assert.equal(plan.flower.petals.length, 18);
  assert.deepEqual(plan.geometry.targetAxes, input.geometry.targetAxes);
});

test("canonical operations alone also select flower without catalogue-count input", () => {
  const plan = synthesizeManifestation({ materialProfile: input.materialProfile, operations: { form: ["flower", "dispersion"], state: ["crystallize", "crush"] } });
  assert.equal(plan.id, "water.crystal-flower-fracture");
  assert.deepEqual(plan, synthesizeManifestation({ materialProfile: input.materialProfile, operations: { state: ["crush", "crystallize"], form: ["dispersion", "flower"] } }));
});

test("Fleur without Cristal stays water, without Crush stays intact", () => {
  const watery = synthesizeManifestation({ ...input, sigilCounts: { Eau: 1, Fleur: 1 } });
  assert.equal(watery.id, "water.flower");
  assert.equal(watery.flower.materials.crystalline, false);
  const intact = synthesizeManifestation({ ...input, operations: { state: ["resize"] } });
  assert.equal(intact.id, "water.crystal-flower");
  assert.equal(intact.flower.fracture.shards.length, 0);
});

test("non-flower synthesis retains generic selection and no flower allocations", () => {
  const plan = synthesizeManifestation({ materialProfile: { family: "crystal", phase: "solid" }, operations: { form: ["column"], state: ["crush"] } });
  assert.equal(plan.id, "crystal.propelled-fragments");
  assert.equal(plan.flower, null);
});

test("water acquisition wins over primary flower or crystal when canonical counts contain Eau", () => {
  for (const family of ["flower", "crystal"]) {
    const plan = synthesizeManifestation({ ...input, materialProfile: { family, phase: "solid" } });
    assert.equal(plan.id, "water.crystal-flower-fracture");
    assert.equal(plan.timeline.stages[0].inputMaterial, "water");
  }
});

test("real grammar composes the full flower sequence and preserves opposed targeting axes", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau", "Fleur", "Cristal"], signs: ["Agrandissement", "Crush", "Dispersion", "Cible"], geometry: { targetAxes: [[1, 0, 0], [-1, 0, 0]] } });
  assert.equal(recipe.manifestationPlan.id, "water.crystal-flower-fracture");
  assert.equal(recipe.manifestationPlan.spellId, recipe.id);
  assert.deepEqual(recipe.manifestationPlan.timeline.stages.map(({ id }) => id), ["material-acquisition", "flower-formation", "enlargement", "crystallization", "fracture", "directed-dispersion"]);
  assert.deepEqual(recipe.ignoredSigns, []);
  assert.deepEqual(recipe.manifestationPlan.geometry.targetAxes, [[-1, 0, 0], [1, 0, 0]]);
  const reversed = composeSpellRecipe({ sigils: ["Eau", "Fleur", "Cristal"], signs: ["Agrandissement", "Crush", "Dispersion", "Cible"], geometry: { targetAxes: [[-1, 0, 0], [1, 0, 0]] } });
  assert.equal(reversed.id, recipe.id);
  assert.deepEqual(reversed.manifestationPlan.flower, recipe.manifestationPlan.flower);
});

test("WHA annular crystal semantics reach the real grammar without a special JSON exception", () => {
  const imported = convertWhaSpellMakerDocument({ seals: [{ rings: [{ radius: 375 }], sigils: [{ name: "sigil_Water" }, { name: "sigil_Flower" }], signs: [{ name: "sigil_Crystalize", amount: 4, radius: 200 }, { name: "sign_Crush", radius: 300 }, { name: "sign_Dispersion", radius: 300 }] }] });
  const glyphs = imported.circle.actions.filter(({ type }) => type === "glyph");
  const recipe = composeSpellRecipe({ sigils: glyphs.filter((action) => (action.semanticKind || action.kind) === "sigil").map(({ element }) => element), signs: glyphs.filter((action) => (action.semanticKind || action.kind) === "sign").map(({ element }) => element) });
  assert.equal(recipe.manifestationPlan.id, "water.crystal-flower-fracture");
  assert.equal(recipe.manifestationPlan.timeline.stages.at(-1).id, "directed-dispersion");
  assert.equal(recipe.manifestationPlan.flower.materials.crystalline, true);
});
