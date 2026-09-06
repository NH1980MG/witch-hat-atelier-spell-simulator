import assert from "node:assert/strict";
import test from "node:test";
import { buildManifestationTimeline } from "../manifestation-timeline.mjs";
import { createFlowerManifestationPlan, buildPetalGeometryData } from "../flower-crystal-manifestation.mjs";

const timeline = buildManifestationTimeline({ material: { family: "water" }, operations: { form: ["flower", "dispersion"], state: ["resize", "crystallize", "crush"], target: ["aim"] } });
const input = { spellId: "flower-a", timeline };

test("seeded flower has discrete layered petals and bounded physical fragments", () => {
  const plan = createFlowerManifestationPlan(input);
  assert.ok(plan.petals.length >= 5 && plan.petals.length <= 24);
  assert.ok(new Set(plan.petals.map(({ layer }) => layer)).size >= 2);
  assert.ok(plan.petals.every(({ length, width }) => length > width && width > 0));
  assert.ok(plan.fracture.shards.length > plan.petals.length);
  assert.ok(plan.fracture.shards.length <= 160);
  assert.deepEqual(plan, createFlowerManifestationPlan(input));
  assert.notDeepEqual(plan.petals, createFlowerManifestationPlan({ ...input, spellId: "flower-b" }).petals);
  assert.ok(Object.isFrozen(plan.fracture.shards[0].impulse));
});

test("mobile and reduced-motion plans have lower caps and finite malformed-input fallbacks", () => {
  for (const quality of ["mobile", "low", "high"]) {
    const plan = createFlowerManifestationPlan({ ...input, quality, geometry: { petalCount: Infinity, scale: NaN, vector: { x: Infinity } } });
    assert.ok(plan.petals.length <= (quality === "high" ? 24 : 12));
    assert.ok(plan.fracture.shards.length <= (quality === "high" ? 160 : 72));
    assert.doesNotMatch(JSON.stringify(plan), /null/);
  }
  const reduced = createFlowerManifestationPlan({ ...input, reducedMotion: true });
  assert.ok(reduced.fracture.shards.length <= 48);
  assert.ok(reduced.fracture.shards.every(({ angularVelocity }) => angularVelocity.every((v) => v === 0)));
});

test("missing Crush keeps petals intact and missing Dispersion prevents launching", () => {
  const localTimeline = buildManifestationTimeline({ material: "water", operations: { form: ["flower"], state: ["crush"] } });
  const local = createFlowerManifestationPlan({ ...input, timeline: localTimeline });
  assert.ok(local.fracture.shards.every(({ impulse }) => impulse.every((v) => v === 0)));
  const intact = createFlowerManifestationPlan({ ...input, timeline: buildManifestationTimeline({ operations: { form: ["flower"], state: ["crystallize"] } }) });
  assert.equal(intact.fracture.shards.length, 0);
});

test("opposed targeting axes remain balanced opposite launch directions", () => {
  const plan = createFlowerManifestationPlan({ ...input, geometry: { targetAxes: [[1, 0, 0], [-1, 0, 0]] } });
  const positive = plan.fracture.shards.filter(({ targetBias }) => targetBias[0] > 0);
  const negative = plan.fracture.shards.filter(({ targetBias }) => targetBias[0] < 0);
  assert.ok(positive.length > 0 && negative.length > 0);
  assert.ok(Math.abs(positive.length - negative.length) <= 1);
  assert.ok(positive.every(({ impulse }) => impulse[0] > 0));
  assert.ok(negative.every(({ impulse }) => impulse[0] < 0));
});

test("procedural petal mesh has a tapered outline, curved ridge and valid triangles", () => {
  const mesh = buildPetalGeometryData();
  assert.ok(mesh.positions.length > 60);
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.equal(mesh.uvs.length / 2, mesh.positions.length / 3);
  assert.ok(mesh.indices.every((i) => i >= 0 && i < mesh.positions.length / 3));
  assert.ok(mesh.positions.filter((_, i) => i % 3 === 1).some((v) => v > 0.1));
  const widths = new Map();
  for (let i = 0; i < mesh.positions.length; i += 3) widths.set(mesh.positions[i], Math.max(widths.get(mesh.positions[i]) || 0, Math.abs(mesh.positions[i + 2])));
  assert.ok(widths.get(0) < widths.get(0.5));
  assert.ok(widths.get(1) < widths.get(0.5));
});
