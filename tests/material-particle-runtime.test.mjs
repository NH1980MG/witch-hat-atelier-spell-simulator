import assert from "node:assert/strict";
import test from "node:test";

import { createMaterialParticleRuntime } from "../material-particle-runtime.mjs";

test("interaction particles stay within the configured budget", () => {
  const runtime = createMaterialParticleRuntime({ maxParticles: 3 });

  for (let index = 0; index < 5; index += 1) {
    runtime.emit({ kind: "heat", position: { x: index, y: 0, z: 0 }, energy: 0.5 });
  }

  assert.deepEqual(runtime.snapshot(), {
    count: 3,
    byKind: { heat: 3 },
    events: [],
  });
});

test("a heat packet reports one bounded collision against a nearby target", () => {
  const runtime = createMaterialParticleRuntime();
  runtime.emit({
    kind: "heat",
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    energy: 0.8,
    radius: 0.08,
  });

  const result = runtime.step(0.1, [
    { id: "book", material: "paper", position: { x: 0.2, y: 0, z: 0 }, radius: 0.2 },
  ]);

  assert.equal(result.effects.book.heat, 0.8);
  assert.equal(result.effects.book.water, 0);
  assert.equal(runtime.snapshot().count, 0);
});

test("heat and water packets sharing a spatial cell turn into steam", () => {
  const runtime = createMaterialParticleRuntime({ cellSize: 0.5 });
  runtime.emit({ kind: "heat", position: { x: 0.1, y: 0, z: 0.1 }, energy: 0.7 });
  runtime.emit({ kind: "water", position: { x: 0.2, y: 0, z: 0.15 }, energy: 0.5 });

  runtime.step(0.05, []);

  const snapshot = runtime.snapshot();
  assert.equal(snapshot.count, 1);
  assert.deepEqual(snapshot.byKind, { steam: 1 });
  assert.deepEqual(snapshot.events, [{ type: "steam-created", energy: 0.5 }]);
});

test("wind biases packet movement without changing its elemental kind", () => {
  const runtime = createMaterialParticleRuntime();
  runtime.emit({
    kind: "heat",
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    energy: 0.5,
    lifeSeconds: 2,
  });

  runtime.step(0.25, [], { wind: { x: 2, y: 0, z: 0 } });

  const [particle] = runtime.debugParticles();
  assert.equal(particle.kind, "heat");
  assert.ok(particle.position.x > 0);
});
