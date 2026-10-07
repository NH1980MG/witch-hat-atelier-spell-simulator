import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCombatProjectile,
  createCombatProjectile,
} from "../combat-projectiles.mjs";

test("a combat projectile starts at the caster and reaches its target over time", () => {
  const projectile = createCombatProjectile({
    id: "projectile-1",
    sourceId: "player",
    origin: { x: 0, y: 1, z: 0 },
    target: { x: 0, y: 1, z: -4 },
    speed: 12,
  });

  assert.deepEqual(projectile.position, { x: 0, y: 1, z: 0 });
  assert.equal(projectile.position.z, 0);

  const advanced = advanceCombatProjectile(projectile, 1 / 3);
  assert.ok(advanced.position.z < -3.9);
  assert.equal(advanced.position.z > -4.1, true);
  assert.equal(advanced.travelled > 0, true);
});
