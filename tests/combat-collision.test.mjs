import assert from "node:assert/strict";
import test from "node:test";

import {
  clampColliderPosition,
  createCollisionWorld,
  detectGameplayCollisions,
} from "../combat-collision.mjs";

test("gameplay colliders report a stable hit without treating particles as colliders", () => {
  const world = createCollisionWorld({ width: 10, depth: 8 });
  world.add({ id: "player", shape: "capsule", kind: "actor", position: { x: 0, y: 0, z: 0 }, radius: 0.5, height: 1.8 });
  world.add({ id: "target", shape: "sphere", kind: "target", position: { x: 0.7, y: 0, z: 0 }, radius: 0.5 });
  world.add({ id: "spark", shape: "sphere", kind: "particle", position: { x: 0.1, y: 0, z: 0 }, radius: 10 });
  world.add({ id: "bolt", shape: "sphere", kind: "projectile", sourceId: "player", position: { x: 0.7, y: 0, z: 0 }, radius: 0.2 });

  const events = detectGameplayCollisions(world);
  assert.deepEqual(events.map(({ type, sourceId, targetId }) => ({ type, sourceId, targetId })), [
    { type: "hit", sourceId: "bolt", targetId: "target" },
  ]);
});

test("arena clamping keeps an actor inside the gameplay bounds", () => {
  assert.deepEqual(clampColliderPosition({ x: 99, y: 0, z: -99 }, { width: 10, depth: 8, margin: 1 }), { x: 4, y: 0, z: -3 });
});
