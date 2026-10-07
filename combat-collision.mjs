function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function normalizePosition(position = {}) {
  return {
    x: finiteNumber(position.x ?? 0, "position.x"),
    y: finiteNumber(position.y ?? 0, "position.y"),
    z: finiteNumber(position.z ?? 0, "position.z"),
  };
}

function normalizeCollider(collider) {
  if (!collider || typeof collider.id !== "string" || !collider.id) {
    throw new TypeError("collider.id must be a non-empty string");
  }
  if (!["actor", "target", "projectile", "zone", "particle"].includes(collider.kind)) {
    throw new RangeError("collider.kind is not supported");
  }
  const radius = finiteNumber(collider.radius ?? 0.5, "collider.radius");
  if (radius < 0) throw new RangeError("collider.radius must be non-negative");
  return { ...collider, position: normalizePosition(collider.position), radius };
}

export function createCollisionWorld({ width = 18, depth = 12 } = {}) {
  finiteNumber(width, "width");
  finiteNumber(depth, "depth");
  const colliders = new Map();
  return {
    bounds: { width, depth },
    add(collider) {
      const normalized = normalizeCollider(collider);
      colliders.set(normalized.id, normalized);
      return normalized;
    },
    remove(id) {
      return colliders.delete(id);
    },
    reset() {
      colliders.clear();
    },
    list() {
      return [...colliders.values()].map((collider) => ({ ...collider, position: { ...collider.position } }));
    },
  };
}

export function clampColliderPosition(position, { width, depth, margin = 0 } = {}) {
  const point = normalizePosition(position);
  finiteNumber(width, "width");
  finiteNumber(depth, "depth");
  finiteNumber(margin, "margin");
  const xLimit = Math.max(0, width / 2 - margin);
  const zLimit = Math.max(0, depth / 2 - margin);
  return {
    x: Math.max(-xLimit, Math.min(xLimit, point.x)),
    y: point.y,
    z: Math.max(-zLimit, Math.min(zLimit, point.z)),
  };
}

function gameplayCollider(collider) {
  return collider.kind !== "particle" && ["projectile", "zone", "actor", "target"].includes(collider.kind);
}

function overlaps(a, b) {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  const distance = Math.hypot(dx, dy, dz);
  return distance <= a.radius + b.radius;
}

export function detectGameplayCollisions(world) {
  const colliders = world.list().filter(gameplayCollider);
  const sources = colliders.filter((collider) => ["projectile", "zone"].includes(collider.kind));
  const targets = colliders.filter((collider) => ["actor", "target"].includes(collider.kind));
  const events = [];
  for (const source of sources) {
    for (const target of targets) {
      if (source.id === target.id || source.sourceId === target.id || !overlaps(source, target)) continue;
      const dx = target.position.x - source.position.x;
      const dz = target.position.z - source.position.z;
      const length = Math.hypot(dx, dz) || 1;
      events.push({
        type: "hit",
        sourceId: source.id,
        targetId: target.id,
        point: { ...target.position },
        normal: { x: dx / length, y: 0, z: dz / length },
      });
    }
  }
  return events;
}
