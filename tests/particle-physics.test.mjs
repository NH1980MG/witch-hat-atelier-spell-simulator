import assert from "node:assert/strict";
import test from "node:test";

import { composeSpellRecipe } from "../spell-grammar.mjs";
import { synthesizeParticleField } from "../particle-physics.mjs";

test("light, column, convergence, repetition, and stop synthesize a bounded pulsed beam", () => {
  const field = synthesizeParticleField({
    materialProfile: { family: "light", phase: "energy" },
    operations: {
      form: ["column", "focus"],
      relation: ["bind"],
    },
    parameters: {
      signTotal: 9,
      sigilTotal: 2,
      focus: 2.6,
      spread: 0.42,
      containment: 0.9,
      stability: 1.8,
      repetition: 4,
    },
  });

  assert.equal(field.mode, "pulsed-beam");
  assert.equal(field.medium, "photon-like");
  assert.equal(field.interpretation, "fictional-ultraviolet");
  assert.equal(field.behavior.emission, "intermittent");
  assert.ok(field.count >= 100);
  assert.ok(field.count <= 500);
  assert.ok(field.focus > field.spread);
  assert.ok(field.pulseRateHz > 0);
  assert.equal(field.rules.includes("particle.light.pulse-stop"), true);
  assert.equal(field.medicalClaim, "none");
});

test("symbolic particles make mud emerge from water and earth without a special effect name", () => {
  const field = synthesizeParticleField({
    elementalMixture: {
      elements: ["Eau", "Terre"],
      materialProfile: { family: "mud", phase: "liquid-solid" },
    },
    materialProfile: { family: "mud", phase: "liquid-solid" },
    operations: { form: ["focus"] },
    parameters: { signTotal: 2, sigilTotal: 2, focus: 1.4, spread: 0.7, containment: 0.2, stability: 1.1 },
  });

  assert.equal(field.medium, "slurry");
  assert.deepEqual(field.components.map((entry) => entry.kind), ["liquid", "solid"]);
  assert.ok(field.cohesion > 0.5);
});

test("spell recipes include deterministic symbolic particle physics", () => {
  const first = composeSpellRecipe({
    sigils: ["Lumiere", "Repetition"],
    signs: ["Colonne", "Convergence", "Arret"],
    geometry: { nestedCircleCount: 2, ringCount: 2 },
  });
  const second = composeSpellRecipe({
    sigils: ["Lumiere", "Repetition"],
    signs: ["Colonne", "Convergence", "Arret"],
    geometry: { nestedCircleCount: 2, ringCount: 2 },
  });

  assert.deepEqual(first.manifestationPlan.particleField, second.manifestationPlan.particleField);
  assert.equal(first.manifestationPlan.particleField.mode, "pulsed-beam");
  assert.ok(Object.isFrozen(first.manifestationPlan.particleField));
});
