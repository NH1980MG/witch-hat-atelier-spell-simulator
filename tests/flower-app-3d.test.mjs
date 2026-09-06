import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as THREE from "../vendor/three/three.module.js";
import { createFlowerManifestation3d } from "../immersive-3d.mjs";
import { synthesizeManifestation } from "../manifestation-synthesis.mjs";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
function source(name) {
  const match = app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `${name} exists`);
  return match[0];
}
const plan = synthesizeManifestation({ materialProfile: { family: "water" }, sigilCounts: { Fleur: 1, Cristal: 1 }, operations: { state: ["crush"], form: ["dispersion"] } });

test("app's actual manifestation function instantiates and advances real Three petals", () => {
  let genericCalls = 0;
  const create = new Function("THREE", "createFlowerManifestation3d", "addAnimatedObject", "addSymbolicParticleField3d", "window", "THREE_SHOE_INK_Y", "THREE_LOW_EFFECT_Y", `${source("addManifestationPlanEffect3d")}; return addManifestationPlanEffect3d;`)(
    THREE, createFlowerManifestation3d,
    (group, object, update) => { group.add(object); group.userData.animators = [{ object, update }]; },
    () => { genericCalls += 1; },
    { matchMedia: () => ({ matches: false }) }, 0.01, 0.02,
  );
  const group = new THREE.Group();
  create(group, plan, 0.5, new THREE.Color(0x66ccff));
  assert.equal(genericCalls, 0);
  assert.ok(group.getObjectByName("water-petals")?.isInstancedMesh);
  assert.ok(group.userData.flowerController);
  const crystal = plan.timeline.stages.find(({ id }) => id === "crystallization");
  const animator = group.userData.animators[0];
  animator.update(animator.object, (crystal.start + crystal.duration * 0.5) / 1000);
  assert.equal(group.userData.flowerController.group.userData.flowerPhase.crystal, 0.5);
  group.userData.flowerController.dispose();
});

test("app disposer invokes owned cleanup once before generic traversal", () => {
  const dispose = new Function(`${source("disposeObject3d")}; return disposeObject3d;`)();
  const root = new THREE.Group();
  const view = createFlowerManifestation3d({ THREE, plan });
  root.add(view.group);
  const water = view.group.getObjectByName("water-petals");
  let count = 0;
  water.geometry.addEventListener("dispose", () => { count += 1; });
  dispose(root); dispose(root);
  assert.equal(count, 1);
  assert.equal(view.update(100).disposed, true);
});

test("app 3D bridge connects shared world, avoids generic overlays, and keeps sequence alive", () => {
  assert.match(source("rebuildThreePhysicsRuntime"), /setPhysics\(\{ RAPIER, world: runtime\.world \}\)/);
  assert.match(source("rebuildThreeSpell"), /flowerController|isFlower/);
  assert.match(source("rebuildThreeSpell"), /timeline\.durationMs/);
  assert.match(source("rebuildThreeSpell"), /!isFlower/);
  assert.match(source("threeSpellForcesForPhysics"), /flowerController/);
});
