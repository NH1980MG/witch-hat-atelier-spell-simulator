import assert from "node:assert/strict";
import test from "node:test";

import { synthesizeManifestation } from "../manifestation-synthesis.mjs";

function plan({ family = "water", phase = "liquid", elements = [], operations = {}, geometry = {}, supportPlan = null, fidelity = "documented", ritualId = null } = {}) {
  return synthesizeManifestation({
    materialProfile: { family, phase, noun: family },
    elementalMixture: elements.length ? {
      elements: elements.map((name) => ({ name, weight: 0.5 })),
      materialProfile: { family, phase, noun: family },
    } : null,
    operations: {
      supply: [], state: [], form: [], motion: [], pressure: [], direction: [],
      scope: [], target: [], relation: [], power: [],
      ...operations,
    },
    axes: {},
    geometry: { balance: 1, pressure: 0, spin: 0, reach: 1, ...geometry },
    supportPlan: supportPlan ?? { supportId: "none", mode: "surface-manifestation", fidelity: "documented" },
    fidelity,
    ritualId,
  });
}

test("water, earth, and crush become one dense mud projection", () => {
  const result = plan({
    family: "mud",
    phase: "liquid-solid",
    elements: ["Eau", "Terre"],
    operations: { state: ["crush"], form: ["column"] },
  });

  assert.equal(result.id, "mud.dense-projection");
  assert.equal(result.material.id, "mud");
  assert.equal(result.form.id, "column");
  assert.ok(result.consumedOperations.includes("state.crush"));
  assert.ok(result.consumedOperations.includes("form.column"));
});

test("mixture elements can be provided as strings by the spell grammar", () => {
  const result = synthesizeManifestation({
    materialProfile: { family: "mud", phase: "liquid-solid", noun: "boue" },
    elementalMixture: {
      elements: ["Eau", "Terre"],
      materialProfile: { family: "mud", phase: "liquid-solid", noun: "boue" },
      fidelity: "inferred",
    },
    operations: { state: ["crush"], form: ["column"] },
    axes: {},
    geometry: { balance: 1, pressure: 0, spin: 0, reach: 1 },
    supportPlan: { supportId: "none", mode: "paper-origin", fidelity: "documented" },
  });

  assert.deepEqual(result.material.elements, ["eau", "terre"]);
  assert.equal(result.id, "mud.dense-projection");
});

test("water, wind, and focus become a pressurized mist jet", () => {
  const result = plan({
    family: "driven-mist",
    phase: "liquid-gas",
    elements: ["Eau", "Vent"],
    operations: { form: ["focus"], motion: ["burst"] },
  });

  assert.equal(result.id, "mist.pressurized-jet");
  assert.equal(result.form.id, "jet");
  assert.equal(result.motion.id, "project");
  assert.ok(result.consumedOperations.includes("form.focus"));
});

test("fire and wind with rotation become one flame vortex", () => {
  const result = plan({
    family: "fire-vortex",
    phase: "energy-gas",
    elements: ["Feu", "Vent"],
    geometry: { spin: 0.7, reach: 0.72 },
  });

  assert.equal(result.id, "fire.flame-vortex");
  assert.equal(result.motion.id, "vortex");
  assert.equal(result.motion.spin, 0.7);
  assert.equal(result.motion.reach, 0.72);
});

test("crystal, crush, and column become propelled fragments", () => {
  const result = plan({
    family: "crystal",
    phase: "solid",
    operations: { state: ["crush"], form: ["column"] },
  });

  assert.equal(result.id, "crystal.propelled-fragments");
  assert.equal(result.material.phase, "fragments");
  assert.equal(result.motion.id, "project");
});

test("water and levitation produce a growing suspended mass", () => {
  const result = plan({ operations: { motion: ["lift"] } });

  assert.equal(result.id, "water.suspended-mass");
  assert.equal(result.form.id, "orb");
  assert.equal(result.lifecycle.growth, "continuous");
  assert.equal(result.lifecycle.stop, "dispose");
});

test("earth, solidification, and stillness produce the opening petrification field", () => {
  const result = plan({
    family: "earth",
    phase: "solid",
    operations: { state: ["solidify", "still"] },
    ritualId: "opening-petrification",
  });

  assert.equal(result.id, "ancient.petrification-field");
  assert.equal(result.labelEn, "Forbidden petrification field");
  assert.equal(result.labelFr, "Champ de petrification interdit");
  assert.equal(result.material.id, "petrified-stone");
  assert.equal(result.form.id, "locking-crystal-field");
  assert.equal(result.motion.id, "surface-lock");
  assert.ok(result.consumedOperations.includes("state.solidify"));
  assert.ok(result.consumedOperations.includes("state.still"));
});

test("earth, solidification, and stillness stay generic without the complete ritual pattern", () => {
  const result = plan({
    family: "earth",
    phase: "solid",
    operations: { state: ["solidify", "still"] },
  });

  assert.notEqual(result.id, "ancient.petrification-field");
});

test("generic synthesis preserves independent relation layers", () => {
  const result = plan({
    family: "light",
    phase: "energy",
    operations: { form: ["project"], target: ["aim"], relation: ["link"] },
  });

  assert.equal(result.form.id, "project");
  assert.ok(result.consumedOperations.includes("target.aim"));
  assert.deepEqual(result.secondaryOperations, ["relation.link"]);
});

test("contradictory operations produce warnings instead of non-finite values", () => {
  const result = plan({ operations: { form: ["orb", "dispersion"], motion: ["lift"], state: ["still"] } });

  assert.ok(result.warnings.length >= 2);
  assert.ok(Object.values(result.motion).filter((value) => typeof value === "number").every(Number.isFinite));
});

test("geometry controls drift, spin, and stability", () => {
  const result = plan({ geometry: { balance: 0.42, pressure: 0.8, spin: -0.35, reach: 0.66, vector: { x: 0.8, y: -0.2 } } });

  assert.equal(result.motion.spin, -0.35);
  assert.equal(result.motion.reach, 0.66);
  assert.equal(result.motion.vector[0], 0.8);
  assert.equal(result.stability, 0.42);
});

test("shoe support changes contact but never invents propulsion", () => {
  const result = plan({
    supportPlan: { supportId: "shoe", mode: "carrier-grounded", effectIds: [], fidelity: "inferred" },
  });

  assert.equal(result.supportInteraction.supportId, "shoe");
  assert.equal(result.supportInteraction.mode, "carrier-grounded");
  assert.equal(result.supportInteraction.movesCarrier, false);
});

test("plans are deterministic, deeply frozen, and bounded", () => {
  const input = { family: "dust", phase: "solid-gas", elements: ["Terre", "Vent"], geometry: { pressure: 4, spin: 9, reach: -2 } };
  const first = plan(input);
  const second = plan(input);

  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.material));
  assert.ok(first.particles.max <= 240);
  assert.equal(first.motion.spin, 1);
  assert.equal(first.motion.reach, 0.2);
});
