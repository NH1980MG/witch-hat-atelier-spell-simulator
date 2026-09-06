import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "../vendor/three/three.module.js";
import { loadRapier3dCompat } from "../rapier-physics-world.mjs";
import { buildManifestationTimeline } from "../manifestation-timeline.mjs";
import { createFlowerManifestationPlan } from "../flower-crystal-manifestation.mjs";
import { manifestationPhaseAt, flowerPhaseProfile, createFlowerManifestation3d } from "../immersive-3d.mjs";

const timeline = buildManifestationTimeline({ spellId: "render-flower", material: "water", operations: { form: ["flower", "dispersion"], state: ["resize", "crystallize", "crush"], target: ["aim"] } });
const plan = createFlowerManifestationPlan({ spellId: "render-flower", timeline, quality: "mobile", geometry: { targetAxes: [[1, 0, 0], [-1, 0, 0]] } });
const time = (id, progress = 0) => { const stage = timeline.stages.find((entry) => entry.id === id); return stage.start + stage.duration * progress; };

test("phase sampling clamps boundaries and preserves semantic stages in reduced motion", () => {
  assert.equal(manifestationPhaseAt(timeline, -100).id, "material-acquisition");
  assert.equal(manifestationPhaseAt(timeline, Infinity).progress, 1);
  assert.equal(manifestationPhaseAt({ stages: [] }, 0), null);
  for (const stage of timeline.stages) {
    assert.equal(manifestationPhaseAt(timeline, stage.start).id, stage.id);
    assert.equal(flowerPhaseProfile(stage, 0.5, true).id, stage.id);
  }
  assert.equal(flowerPhaseProfile({ id: "fracture" }, 0.5, true).motion, 0.15);
});

test("real Three meshes grow, sweep crystal, fracture once, release and expire", () => {
  const view = createFlowerManifestation3d({ THREE, plan });
  assert.equal(view.group.name, "sequenced-flower");
  let state = view.update(time("flower-formation", 0.5));
  assert.ok(state.growth > 0 && state.growth < 1);
  const water = view.group.getObjectByName("water-petals");
  const crystal = view.group.getObjectByName("crystal-petals");
  assert.ok(water.isInstancedMesh && crystal.isInstancedMesh);
  assert.ok(water.geometry.attributes.position.count > 50);
  const matrix = new THREE.Matrix4();
  water.getMatrixAt(0, matrix);
  const earlyScale = new THREE.Vector3().setFromMatrixScale(matrix).x;
  state = view.update(time("enlargement", 0.9));
  water.getMatrixAt(0, matrix);
  assert.ok(new THREE.Vector3().setFromMatrixScale(matrix).x > earlyScale);
  state = view.update(time("crystallization", 0.5));
  assert.equal(state.crystal, 0.5);
  assert.equal(state.activeShards, 0);
  state = view.update(time("fracture", 0.5));
  assert.ok(state.activeShards > 0 && state.activeShards < plan.fracture.shards.length);
  assert.equal(state.released, false);
  state = view.update(time("directed-dispersion", 0.1));
  assert.equal(state.activeShards, plan.fracture.shards.length);
  assert.equal(state.released, true);
  assert.equal(view.update(time("directed-dispersion", 0.1)).activeShards, state.activeShards);
  assert.equal(view.update(timeline.durationMs + 5000).activeShards, 0);
  view.dispose();
});

test("resource disposal is idempotent and replay removes prior allocations", () => {
  const view = createFlowerManifestation3d({ THREE, plan });
  const resources = new Set();
  view.group.traverse((object) => { if (object.geometry) resources.add(object.geometry); if (object.material) resources.add(object.material); if (object.isInstancedMesh) resources.add(object); });
  const counts = new Map([...resources].map((resource) => [resource, 0]));
  for (const resource of resources) resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource) + 1));
  view.update(time("directed-dispersion", 0.5));
  view.update(0);
  assert.equal(view.update(0).activeShards, 0);
  view.dispose(); view.dispose();
  assert.ok([...counts.values()].every((count) => count === 1));
  assert.equal(view.group.children.length, 0);
  assert.equal(view.update(0).disposed, true);
});

test("shared Rapier world gets bounded shards, delayed opposed impulses and complete cleanup", async () => {
  const RAPIER = await loadRapier3dCompat();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const external = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const view = createFlowerManifestation3d({ THREE, plan, physics: { RAPIER, world }, origin: { x: 2, y: 1, z: 0 }, radius: 0.5 });
  assert.equal(world.bodies.len(), 1);
  view.update(time("crystallization", 0.8));
  assert.equal(world.bodies.len(), 1);
  view.update(time("fracture", 0.9));
  const beforeRelease = [];
  world.bodies.forEach((body) => { if (body.isDynamic()) beforeRelease.push(body.linvel()); });
  assert.ok(beforeRelease.length > 0);
  assert.ok(beforeRelease.every(({ x, y, z }) => x === 0 && y === 0 && z === 0));
  view.update(time("directed-dispersion", 0.01));
  assert.equal(world.bodies.len(), plan.fracture.shards.length + 1);
  const velocities = [];
  world.bodies.forEach((body) => { if (body.isDynamic()) velocities.push(body.linvel().x); });
  assert.ok(velocities.some((x) => x > 0) && velocities.some((x) => x < 0));
  world.step();
  view.update(time("directed-dispersion", 0.02));
  view.update(timeline.durationMs + 5000);
  assert.equal(world.bodies.len(), 1);
  view.update(0);
  view.update(time("directed-dispersion", 0.02));
  view.dispose();
  assert.equal(world.bodies.len(), 1);
  assert.ok(world.getRigidBody(external.handle));
  world.free();
});

test("no Crush preserves a visible crystal flower after timeline completes", () => {
  const intactTimeline = buildManifestationTimeline({ material: "water", operations: { form: ["flower"], state: ["crystallize", "resize"] } });
  const view = createFlowerManifestation3d({ THREE, plan: createFlowerManifestationPlan({ timeline: intactTimeline }) });
  const state = view.update(intactTimeline.durationMs + 1000);
  assert.equal(state.crystal, 1);
  assert.equal(state.activeShards, 0);
  assert.equal(view.group.getObjectByName("crystal-petals").visible, true);
  view.dispose();
});

test("renderer-only reduced-motion setting limits allocations from a high-quality plan", () => {
  const high = createFlowerManifestationPlan({ timeline, geometry: { petalCount: 24 } });
  const view = createFlowerManifestation3d({ THREE, plan: high, reducedMotion: true });
  assert.ok(view.update(time("directed-dispersion", 0.1)).activeShards <= 48);
  view.dispose();
});

test("renderer mobile setting rebuilds a bounded flower from a desktop recipe", () => {
  const high = createFlowerManifestationPlan({ timeline, geometry: { petalCount: 24 } });
  const view = createFlowerManifestation3d({ THREE, plan: { flower: high, timeline, geometry: { petalCount: 24 } }, quality: "mobile" });
  assert.ok(view.group.getObjectByName("water-petals").count <= 12);
  assert.ok(view.update(time("directed-dispersion", 0.1)).activeShards <= 72);
  view.dispose();
});
