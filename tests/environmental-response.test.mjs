import assert from "node:assert/strict";
import test from "node:test";

import {
  environmentalResponseFromParticleField,
  environmentalResponseFromSpell,
} from "../environmental-response.mjs";
import { spellInfluenceProfile } from "../environment-interactions.mjs";
import { composeSpellRecipe } from "../spell-grammar.mjs";

test("pulsed photon-like fields become intermittent illumination responses, not medical claims", () => {
  const response = environmentalResponseFromParticleField({
    particleField: {
      mode: "pulsed-beam",
      medium: "photon-like",
      focus: 3.2,
      spread: 0.35,
      cohesion: 0.62,
      pulseRateHz: 5.4,
      interpretation: "fictional-ultraviolet",
      medicalClaim: "none",
    },
    diameter: 1.8,
    force: 64,
  });

  assert.equal(response.primary, "illumination");
  assert.equal(response.delivery, "pulsed-focused");
  assert.equal(response.forceKind, "radiant");
  assert.equal(response.medicalClaim, "none");
  assert.ok(response.intensity > 0);
  assert.ok(response.radiusMeters <= 1.8);
  assert.equal(response.pulse.rateHz, 5.4);
  assert.deepEqual(response.channels, ["light", "pulse", "focus"]);
  assert.ok(Object.isFrozen(response));
});

test("cohesive slurry fields become mass-loading adhesion responses", () => {
  const response = environmentalResponseFromParticleField({
    particleField: {
      mode: "focused-flow",
      medium: "slurry",
      focus: 1.8,
      spread: 0.7,
      cohesion: 0.86,
      pulseRateHz: 0,
      components: [{ kind: "liquid" }, { kind: "solid" }],
    },
    diameter: 2.4,
    force: 58,
  });

  assert.equal(response.primary, "adhesion");
  assert.equal(response.forceKind, "mass-load");
  assert.ok(response.massLoad > 0.5);
  assert.ok(response.damping > 0.5);
  assert.ok(response.channels.includes("surface-contact"));
});

test("spell influence profiles consume particle-field environmental responses", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Lumiere", "Repetition"],
    signs: ["Colonne", "Convergence", "Arret"],
  });
  const response = environmentalResponseFromSpell({ diameter: 1.2, force: 72, recipe });
  const profile = spellInfluenceProfile({ diameter: 1.2, force: 72, effects: [], recipe });

  assert.equal(response.primary, "illumination");
  assert.equal(profile.environmentalResponse.primary, "illumination");
  assert.equal(profile.projectile, true);
  assert.equal(profile.fire, false);
  assert.equal(profile.water, false);
});
