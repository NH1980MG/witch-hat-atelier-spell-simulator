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
