function finiteNumber(value, label) {
  if (!Number.isFinite(Number(value))) throw new TypeError(`${label} must be finite`);
  return Number(value);
}

function nonNegativeNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number < 0) throw new RangeError(`${label} must be non-negative`);
  return number;
}

function point(value = {}, label = "point") {
  return {
    x: finiteNumber(value.x ?? 0, `${label}.x`),
    y: finiteNumber(value.y ?? 0, `${label}.y`),
    z: finiteNumber(value.z ?? 0, `${label}.z`),
  };
}

export function createCombatProjectile({
  id,
  sourceId,
  origin,
  target,
  targetId = null,
  speed = 12,
  radius = 0.24,
  material = null,
  damage = 12,
} = {}) {
  if (typeof id !== "string" || !id.trim()) throw new TypeError("id must be a non-empty string");
  if (typeof sourceId !== "string" || !sourceId.trim()) throw new TypeError("sourceId must be a non-empty string");
  const start = point(origin, "origin");
  const destination = point(target, "target");
  const dx = destination.x - start.x;
  const dy = destination.y - start.y;
  const dz = destination.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  const normalizedSpeed = finiteNumber(speed, "speed");
  if (normalizedSpeed <= 0) throw new RangeError("speed must be positive");
  if (distance === 0) throw new RangeError("origin and target must differ");
  return {
    id,
    sourceId,
    targetId: typeof targetId === "string" ? targetId : null,
    position: start,
    target: destination,
    velocity: {
      x: (dx / distance) * normalizedSpeed,
      y: (dy / distance) * normalizedSpeed,
      z: (dz / distance) * normalizedSpeed,
    },
    radius: nonNegativeNumber(radius, "radius"),
    material: typeof material === "string" ? material : null,
    damage: nonNegativeNumber(damage, "damage"),
    age: 0,
    travelled: 0,
  };
}

export function advanceCombatProjectile(projectile, delta = 0) {
  const elapsed = nonNegativeNumber(delta, "delta");
  const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y, projectile.velocity.z);
  const requestedDistance = speed * elapsed;
  const remainingDistance = Math.hypot(
    projectile.target.x - projectile.position.x,
    projectile.target.y - projectile.position.y,
    projectile.target.z - projectile.position.z,
  );
  const distance = Math.min(requestedDistance, remainingDistance);
  const ratio = speed > 0 ? distance / speed : 0;
  return {
    ...projectile,
    position: {
      x: projectile.position.x + projectile.velocity.x * ratio,
      y: projectile.position.y + projectile.velocity.y * ratio,
      z: projectile.position.z + projectile.velocity.z * ratio,
    },
    age: projectile.age + elapsed,
    travelled: projectile.travelled + distance,
    reachedTarget: remainingDistance <= requestedDistance,
  };
}
