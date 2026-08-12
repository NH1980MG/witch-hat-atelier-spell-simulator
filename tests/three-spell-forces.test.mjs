import assert from "node:assert/strict";
import test from "node:test";

import { spellInfluenceProfile } from "../environment-interactions.mjs";
import { composeSpellRecipe } from "../spell-grammar.mjs";
import { spellForcesFromSnapshot } from "../three-spell-forces.mjs";

test("pulsed focused illumination becomes a low-impulse radiant pulse force", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Lumiere", "Repetition"],
    signs: ["Colonne", "Convergence", "Arret"],
  });
  const forces = spellForcesFromSnapshot({
    diameter: 1.6,
    force: 70,
    recipe,
    origin: { x: 1, y: 0.04, z: -2 },
    direction: { x: 0, z: -1 },
  });

  assert.equal(forces.length, 1);
  assert.equal(forces[0].type, "radiant-pulse");
  assert.equal(forces[0].forceKind, "radiant");
  assert.equal(forces[0].mode, "pulsed-focused");
  assert.deepEqual(forces[0].origin, { x: 1, y: 0.04, z: -2 });
  assert.deepEqual(forces[0].direction, { x: 0, y: 0, z: -1 });
  assert.ok(forces[0].magnitude > 0);
  assert.ok(forces[0].physicalImpulse < 0.2);
  assert.ok(forces[0].radiusMeters <= 1.6);
  assert.ok(forces[0].pulse.rateHz > 0);
  assert.equal(forces[0].medicalClaim, "none");
  assert.ok(Object.isFrozen(forces));
  assert.ok(Object.isFrozen(forces[0]));
});

test("slurry adhesion becomes damping and mass-load forces", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Eau", "Terre"],
    signs: ["Convergence", "Solidification"],
  });
  const forces = spellForcesFromSnapshot({ diameter: 2.2, force: 62, recipe });

  assert.equal(forces.length, 2);
  assert.deepEqual(forces.map((force) => force.type), ["adhesion-damping", "mass-load"]);
  assert.ok(forces.every((force) => force.forceKind === "mass-load"));
  assert.ok(forces[0].damping > 0);
  assert.ok(forces[1].massLoad > 0);
});

test("spell influence profiles expose force descriptors for the future physics layer", () => {
  const recipe = composeSpellRecipe({
    sigils: ["Vent"],
    signs: ["Colonne", "Convergence"],
  });
  const profile = spellInfluenceProfile({
    diameter: 3,
    force: 88,
    effects: [],
    recipe,
  });

  assert.ok(Array.isArray(profile.spellForces));
  assert.equal(profile.spellForces[0].type, "directed-impulse");
  assert.equal(profile.spellForces[0].forceKind, "impulse");
  assert.ok(profile.spellForces[0].magnitude > 0);
  assert.ok(Object.isFrozen(profile.spellForces));
});
