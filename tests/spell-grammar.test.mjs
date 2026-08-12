import assert from "node:assert/strict";
import test from "node:test";

import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
  SIGIL_PROFILES,
  SIGN_PROFILES,
  composeSpellRecipe,
  validateSpellMatrix,
} from "../spell-grammar.mjs";

test("base sigils compose before signs and supports", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre"],
    signs: ["Convergence", "Solidification"],
    supportId: "none",
  });
  assert.equal(recipe.elementalMixture.id, "eau+terre");
  assert.equal(recipe.materialProfile.family, "mud");
  assert.ok(recipe.ruleIds.includes("material.mix.eau+terre"));
  assert.ok(recipe.effectPlan.pipeline[0].includes("mud"));
  assert.equal(recipe.manifestationPlan.material.id, "mud");
  assert.ok(Object.isFrozen(recipe.manifestationPlan));
});

test("indexed mixtures expose real 3D element ids", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre"],
    signs: ["Crush", "Colonne"],
  });

  assert.equal(recipe.materialProfile.family, "mud");
  assert.deepEqual(recipe.manifestationPlan.material.elements, ["eau", "terre"]);
  assert.ok(!recipe.manifestationPlan.material.elements.includes("undefined"));
});

test("recipes synthesize one primary manifestation instead of stacked operations", () => {
  const mud = composeSpellRecipe({ sigils: ["Eau", "Terre"], signs: ["Crush", "Colonne"] });
  const mist = composeSpellRecipe({ sigils: ["Eau", "Vent"], signs: ["Convergence", "Lancement"] });
  const suspendedWater = composeSpellRecipe({ sigils: ["Eau"], signs: ["Levitation"] });

  assert.equal(mud.manifestationPlan.id, "mud.dense-projection");
  assert.equal(mist.manifestationPlan.id, "mist.pressurized-jet");
  assert.equal(suspendedWater.manifestationPlan.id, "water.suspended-mass");
  assert.ok(mud.manifestationPlan.consumedOperations.includes("state.crush"));
});

test("the opening petrification field requires the complete ritual seal pattern", () => {
  const shortcut = composeSpellRecipe({ sigils: ["Terre"], signs: ["Solidification", "Immobilite"] });
  const completeSeal = composeSpellRecipe({
    sigils: ["Terre"],
    signs: ["Solidification", "Immobilite"],
    ritualId: "opening-petrification",
  });

  assert.notEqual(shortcut.manifestationPlan.id, "ancient.petrification-field");
  assert.equal(completeSeal.manifestationPlan.id, "ancient.petrification-field");
  assert.ok(completeSeal.ruleIds.includes("ritual.opening-petrification"));
  assert.ok(completeSeal.manifestationPlan.consumedOperations.includes("state.still"));
});

test("recipes explain the role of every recognized symbol in the final architecture", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre"],
    signs: ["Convergence", "Crush", "Region"],
    geometry: {
      balance: 0.82,
      pressure: 0.34,
      spin: 0.12,
      reach: 0.9,
      connectedCount: 3,
      ignoredCount: 1,
      circleCount: 2,
      nestedCircleCount: 1,
    },
  });

  assert.equal(recipe.architecture.symbols.length, 5);
  assert.deepEqual(
    recipe.architecture.symbols.map((entry) => entry.name).sort(),
    ["Convergence", "Crush", "Eau", "Region", "Terre"],
  );
  assert.equal(recipe.architecture.symbols.filter((entry) => entry.kind === "sigil").length, 2);
  assert.equal(recipe.architecture.symbols.filter((entry) => entry.kind === "sign").length, 3);
  assert.ok(recipe.architecture.symbols.every((entry) => entry.explanation && entry.effectContribution));
  assert.ok(recipe.architecture.symbols.find((entry) => entry.name === "Crush").consumed);
  assert.ok(recipe.architecture.stages.some((stage) => stage.id === "material"));
  assert.ok(recipe.architecture.stages.some((stage) => stage.id === "geometry"));
  assert.match(recipe.architecture.finalEffect, /Projection de boue dense|Dense mud projection/);
  assert.ok(Object.isFrozen(recipe.architecture));
  assert.ok(Object.isFrozen(recipe.architecture.symbols[0]));
});

test("element order does not change identity", () => {
  const left = composeSpellRecipe({ sigils: ["Eau", "Terre"], signs: ["Colonne"] });
  const right = composeSpellRecipe({ sigils: ["Terre", "Eau"], signs: ["Colonne"] });
  assert.deepEqual(left, right);
});

test("base repetition changes plan parameters and identity", () => {
  const balanced = composeSpellRecipe({ sigils: ["Eau", "Terre"] });
  const dominant = composeSpellRecipe({ sigils: ["Eau", "Eau", "Terre"] });
  assert.notEqual(balanced.id, dominant.id);
  assert.equal(dominant.elementalMixture.dominantElement, "Eau");
  assert.ok(dominant.effectPlan.parameters.elementIntensity > balanced.effectPlan.parameters.elementIntensity);
});

test("non-base combinations retain primary-sigil behavior", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau", "Cristal"] });
  assert.equal(recipe.elementalMixture, null);
  assert.equal(recipe.material, "Cristal");
  assert.equal(recipe.materialProfile.family, "crystal");
});

test("support changes the recipe identity and semantic plan", () => {
  const input = {
    sigils: ["Eau"],
    signs: ["Dispersion", "Levitation"],
    direction: "vers le haut",
  };
  const paper = composeSpellRecipe({ ...input, supportId: "none" });
  const shoe = composeSpellRecipe({ ...input, supportId: "shoe" });

  assert.notEqual(paper.id, shoe.id);
  assert.notDeepEqual(paper.supportPlan, shoe.supportPlan);
});

test("documented inverse-capable signs apply their inverse operation", () => {
  const traction = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Traction"],
    invertedSigns: ["Traction"],
  });
  const resize = composeSpellRecipe({
    sigils: ["Terre"],
    signs: ["Agrandissement"],
    invertedSigns: ["Agrandissement"],
  });

  assert.ok(traction.operations.motion.includes("push"));
  assert.ok(resize.operations.state.includes("shrink"));
});

test("unsupported inversion stays explicit instead of inventing an opposite", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Levitation"],
    invertedSigns: ["Levitation"],
  });

  assert.ok(recipe.operations.motion.includes("lift"));
  assert.ok(recipe.warnings.some((warning) => warning.toLowerCase().includes("inversion")));
  assert.notEqual(recipe.fidelity, "documented");
});

test("column inversion is documented as an omnidirectional dispersion", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Colonne"],
    invertedSigns: ["Colonne"],
  });

  assert.ok(recipe.operations.form.includes("dispersion"));
  assert.ok(!recipe.warnings.some((warning) => warning.toLowerCase().includes("inversion")));
});

test("incompatible signs are ignored and lower fidelity", () => {
  const recipe = composeSpellRecipe({ sigils: ["Eau"], signs: ["Spire physique"] });

  assert.ok(recipe.ignoredSigns.includes("Spire physique"));
  assert.notEqual(recipe.fidelity, "documented");
});

test("phase-restricted signs apply when a mixture exposes a compatible phase", () => {
  for (const sign of ["Etirement", "Spire physique", "Enlacement"]) {
    const mud = composeSpellRecipe({ sigils: ["Eau", "Terre"], signs: [sign] });
    assert.ok(!mud.ignoredSigns.includes(sign), `${sign} should apply to liquid-solid mud`);
  }

  const heatedEarth = composeSpellRecipe({ sigils: ["Feu", "Terre"], signs: ["Spire physique"] });
  assert.ok(!heatedEarth.ignoredSigns.includes("Spire physique"));
  assert.ok(heatedEarth.operations.form.includes("coil"));
});

test("phase-restricted signs remain ignored when no mixture phase matches", () => {
  const steam = composeSpellRecipe({ sigils: ["Feu", "Eau"], signs: ["Spire physique"] });

  assert.ok(steam.ignoredSigns.includes("Spire physique"));
  assert.ok(!steam.operations.form.includes("coil"));
});

test("radial stays experimental and does not invent a power change", () => {
  const base = composeSpellRecipe({ sigils: ["Feu"] });
  const radial = composeSpellRecipe({ sigils: ["Feu"], signs: ["Radial"] });

  assert.ok(radial.operations.power.includes("unknown-radial"));
  assert.equal(radial.fidelity, "experimental");
  assert.ok(radial.uncertainSigns.includes("Radial"));
  assert.ok(radial.warnings.some((warning) => /fonction.*indeterminee/i.test(warning)));
  assert.equal(radial.effectPlan.parameters.elementIntensity, base.effectPlan.parameters.elementIntensity);
  assert.equal(radial.effectPlan.parameters.focus, base.effectPlan.parameters.focus);
});

test("convergence concentrates matter without adding elemental power", () => {
  const base = composeSpellRecipe({ sigils: ["Eau"] });
  const focused = composeSpellRecipe({ sigils: ["Eau"], signs: ["Convergence"] });

  assert.equal(focused.effectPlan.parameters.elementIntensity, base.effectPlan.parameters.elementIntensity);
  assert.ok(focused.effectPlan.parameters.focus > base.effectPlan.parameters.focus);
  assert.ok(focused.effectPlan.parameters.density > base.effectPlan.parameters.density);
  assert.equal(focused.effectPlan.powerModifier, 1);
});

test("internal circles contain and stabilize without adding raw power", () => {
  const base = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Dispersion"],
    geometry: { balance: 1, pressure: 0, spin: 0, reach: 1, connectedCount: 1, ignoredCount: 0 },
  });
  const nested = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Dispersion"],
    geometry: {
      balance: 1,
      pressure: 0,
      spin: 0,
      reach: 1,
      connectedCount: 1,
      ignoredCount: 0,
      circleCount: 3,
      ringCount: 1,
      nestedCircleCount: 2,
      circleCompleteness: 1,
    },
  });

  assert.notEqual(base.id, nested.id);
  assert.equal(nested.effectPlan.powerModifier, 1);
  assert.equal(nested.effectPlan.parameters.circleCount, 3);
  assert.equal(nested.effectPlan.parameters.nestedCircleCount, 2);
  assert.ok(nested.effectPlan.parameters.containment > base.effectPlan.parameters.containment);
  assert.ok(nested.effectPlan.parameters.stability > base.effectPlan.parameters.stability);
  assert.ok(nested.effectPlan.parameters.focus > base.effectPlan.parameters.focus);
  assert.ok(nested.effectPlan.parameters.spread < base.effectPlan.parameters.spread);
  assert.ok(nested.effectPlan.pipeline.some((stage) => stage.includes("cercles-internes-2")));
});

test("semicircles mark prepared joinable spells without changing raw power", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Vent"],
    signs: ["Levitation"],
    geometry: {
      balance: 1,
      pressure: 0,
      spin: 0,
      reach: 1,
      connectedCount: 1,
      ignoredCount: 0,
      semicircleCount: 2,
      joinableSemicircleCount: 2,
      circleCompleteness: 0.5,
    },
  });

  assert.equal(recipe.effectPlan.powerModifier, 1);
  assert.equal(recipe.effectPlan.parameters.semicircleCount, 2);
  assert.equal(recipe.effectPlan.parameters.joinableSemicircleCount, 2);
  assert.equal(recipe.effectPlan.parameters.circleCompleteness, 0.5);
  assert.ok(recipe.effectPlan.pipeline.some((stage) => stage.includes("activation:jonction-demi-cercles")));
  assert.ok(recipe.warnings.some((warning) => /demi-cercles.*jonction/i.test(warning)));
});

test("air creation and air movement remain separate capabilities", () => {
  assert.deepEqual(SIGIL_PROFILES.Aeriforme.capabilities, { createsAir: true, movesAir: false });
  assert.deepEqual(SIGIL_PROFILES.Vent.capabilities, { createsAir: false, movesAir: true });

  const definedAirflow = composeSpellRecipe({
    sigils: ["Aeriforme", "Vent"],
    signs: ["Aeriforme defini", "Signe de vent"],
  });
  assert.deepEqual(definedAirflow.effectPlan.materialCapabilities, { createsAir: true, movesAir: true });
});

test("crosshair direction and target lock are explicit sequential stages", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau"],
    signs: ["Viseur", "Cible", "Enveloppe"],
  });

  assert.equal(SIGN_PROFILES.Viseur.directional, true);
  assert.deepEqual(recipe.effectPlan.targeting, {
    mode: "locked-directional",
    directional: true,
    locked: true,
    shortEndsPointToTarget: true,
  });
  assert.ok(recipe.effectPlan.pipeline.indexOf("form:envelopex1") < recipe.effectPlan.pipeline.indexOf("target:aimx1+crosshairx1"));
});

test("the public matrix includes all 29 profiled sigils and all modifier signs", () => {
  assert.equal(MATRIX_SIGIL_NAMES.length, 29);
  assert.equal(MATRIX_SIGN_NAMES.length, 40);
  assert.deepEqual(MATRIX_SIGIL_NAMES, Object.keys(SIGIL_PROFILES));
});

test("the matrix validates every indexed material signature", () => {
  const result = validateSpellMatrix();

  assert.equal(result.materialSignatures, 40);
  assert.equal(result.tested, 65_600);
  assert.equal(result.unique, 65_600);
  assert.equal(result.deterministic, 65_600);
  assert.deepEqual(result.supports, { none: 32_800, shoe: 32_800 });
  assert.ok(result.distinctPlans > 0);
});
