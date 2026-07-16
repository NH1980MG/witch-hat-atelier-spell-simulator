import assert from "node:assert/strict";
import test from "node:test";
import { composeSupportPlan } from "../support-policy.mjs";

test("no support keeps the manifestation on paper", () => {
  const plan = composeSupportPlan({ supportId: "none", primarySigil: "Eau", operations: ["dispersion"], diameter: 0.8 });
  assert.equal(plan.origin, "paper");
  assert.equal(plan.movesCarrier, false);
  assert.equal(plan.valid, true);
});

test("the documented Sylph-shoe fixture is recognized", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Vent sous pied", operations: ["focus", "lift"], diameter: 0.2 });
  assert.equal(plan.mode, "sylph-flight");
  assert.equal(plan.fidelity, "documented");
  assert.deepEqual(plan.ruleIds, ["shoe.split-ring", "shoe.wind-underfoot", "shoe.convergence-levitation"]);
});

test("unsupported shoe recipes remain explicit experiments", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Eau", operations: ["dispersion"], diameter: 0.2 });
  assert.equal(plan.mode, "surface-manifestation");
  assert.equal(plan.movesCarrier, false);
  assert.equal(plan.fidelity, "experimental");
  assert.ok(plan.effectIds.includes("water-puddle"));
});

test("movement signs can move the carrier without changing the element", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Eau", operations: ["lift"], diameter: 0.2 });
  assert.equal(plan.movesCarrier, true);
  assert.equal(plan.mode, "carrier-lift");
  assert.equal(plan.fidelity, "inferred");
});

test("hazards never receive a stable support bonus", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Feu", operations: ["focus"], diameter: 0.2 });
  assert.equal(plan.hazard, true);
  assert.equal(plan.stable, false);
});

test("shoe seals above 35 cm are invalid", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Vent sous pied", operations: ["focus", "lift"], diameter: 0.36 });
  assert.equal(plan.valid, false);
  assert.equal(plan.issue, "shoe-diameter");
});

test("unknown support IDs are rejected", () => {
  assert.throws(() => composeSupportPlan({ supportId: "cloak" }), /support/i);
});
