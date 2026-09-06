import assert from "node:assert/strict";
import test from "node:test";
import { buildManifestationTimeline } from "../manifestation-timeline.mjs";

const input = {
  spellId: "flower-test",
  material: { family: "water" },
  operations: { form: ["flower", "dispersion"], state: ["resize", "crystallize", "crush"], target: ["aim"], relation: ["link"] },
};

test("flower timeline orders transformations, retaining unconsumed operations", () => {
  const timeline = buildManifestationTimeline(input);
  assert.deepEqual(timeline.stages.map(({ id }) => id), ["material-acquisition", "flower-formation", "enlargement", "crystallization", "fracture", "directed-dispersion"]);
  assert.deepEqual(timeline.secondaryOperations, ["relation.link"]);
  assert.ok(timeline.stages.at(-1).consumes.includes("target.aim"));
  assert.equal(timeline.stages[3].inputMaterial, "water");
  assert.equal(timeline.stages[3].outputMaterial, "crystal");
  assert.equal(timeline.stages[4].outputMaterial, "crystal-fragments");
});

test("timeline is immutable, deterministic, contiguous and bounded", () => {
  const timeline = buildManifestationTimeline(input);
  assert.deepEqual(timeline, buildManifestationTimeline(input));
  assert.ok(Object.isFrozen(timeline.stages[0].consumes));
  assert.ok(timeline.durationMs >= 1200 && timeline.durationMs <= 12000);
  let time = 0;
  for (const stage of timeline.stages) { assert.equal(stage.start, time); time += stage.duration; }
  assert.equal(time, timeline.durationMs);
});

test("optional operations do not invent growth, crystal, fracture, or release", () => {
  const plain = buildManifestationTimeline({ ...input, operations: { form: ["flower"] } });
  assert.deepEqual(plain.stages.map(({ id }) => id), ["material-acquisition", "flower-formation"]);
  const local = buildManifestationTimeline({ ...input, operations: { form: ["flower"], state: ["crystallize", "crush"], target: ["aim"] } });
  assert.equal(local.stages.at(-1).id, "fracture");
  assert.ok(local.secondaryOperations.includes("target.aim"));
});

test("reduced motion keeps every stage and reduces rapid fracture duration", () => {
  const regular = buildManifestationTimeline(input);
  const reduced = buildManifestationTimeline({ ...input, reducedMotion: true });
  assert.deepEqual(reduced.stages.map(({ id }) => id), regular.stages.map(({ id }) => id));
  assert.ok(reduced.stages[4].duration < regular.stages[4].duration);
});

test("operation counts affect bounded growth without depending on insertion order", () => {
  const small = buildManifestationTimeline({ ...input, operationCounts: { resize: 1 } });
  const large = buildManifestationTimeline({ ...input, operationCounts: { resize: 100000 } });
  assert.ok(large.stages[2].scale > small.stages[2].scale);
  assert.ok(large.stages[2].scale <= 2.5);
  const reordered = { ...input, operations: { relation: ["link"], target: ["aim"], state: ["crush", "resize", "crystallize", "resize"], form: ["dispersion", "flower"] } };
  assert.deepEqual(buildManifestationTimeline(input), buildManifestationTimeline(reordered));
});
