import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("shoe rendering uses stable support effect IDs", () => {
  assert.doesNotMatch(app, /has\("table mouillee"\)/);
  assert.doesNotMatch(app, /has\("chaussures propulsees"\)/);
  assert.match(app, /supportPlan\.effectIds/);
  for (const effectId of ["water-puddle", "fire-scorch", "earth-grounded-growth", "wind-lift"]) {
    assert.match(app, new RegExp(effectId));
  }
});

test("the under-sole seal is parented to the shoe support", () => {
  assert.match(app, /supportProp\.add\(sealCarrier\)/);
  assert.match(app, /shoeSupportPose/);
});

test("shoe-supported mixtures render their composed manifestation", () => {
  const mixtureEffect = app.match(/function addElementalMixtureEffect3d\([\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(mixtureEffect, /supportId !== "none"/);

  const rebuild = app.match(/function rebuildThreeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(rebuild, /addElementalMixtureEffect3d\(group, materialPresentation, auraRadius, elementColor, supportId\)/);

  const shoeEffects = app.match(/function addShoeSupportEffects3d\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(shoeEffects, /supportPlan\.isMixture/);
  assert.match(shoeEffects, /endsWith\("-surface"\)/);
  assert.match(shoeEffects, /endsWith\("-carrier-lift"\)/);
});
