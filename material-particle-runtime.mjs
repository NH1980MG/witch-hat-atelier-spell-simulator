const EFFECT_KEYS = Object.freeze(["heat", "water", "frost", "smother", "steam"]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, finiteNumber(value, minimum)));
}

function vector3(value = {}, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: finiteNumber(value.x, fallback.x),
    y: finiteNumber(value.y, fallback.y),
    z: finiteNumber(value.z, fallback.z),
  };
}

function round(value) {
  return Math.round(finiteNumber(value) * 1000) / 1000;
}

function cellKey(position, cellSize) {
  return `${Math.floor(position.x / cellSize)}:${Math.floor(position.y / cellSize)}:${Math.floor(position.z / cellSize)}`;
}

function emptyEffect() {
  return { heat: 0, water: 0, frost: 0, smother: 0, steam: 0 };
}

function targetRadius(target = {}) {
  const collider = target.collider || {};
  if (collider.type === "cuboid") {
    const half = vector3(collider.halfExtents, { x: 0.25, y: 0.25, z: 0.25 });
    return Math.hypot(half.x, half.y, half.z);
  }
  if (collider.type === "capsule") {
    return Math.max(0.01, finiteNumber(collider.radius, 0.2) + finiteNumber(collider.halfHeight, 0.5));
  }
  return Math.max(0.01, finiteNumber(target.radius, finiteNumber(collider.radius, 0.3)));
}

function packetEffectKind(kind) {
  if (kind === "heat") return "heat";
  if (kind === "water") return "water";
  if (kind === "frost") return "frost";
  if (kind === "earth") return "smother";
  if (kind === "steam") return "steam";
  return null;
}

export function createMaterialParticleRuntime(options = {}) {
  const maxParticles = Math.round(clamp(options.maxParticles ?? 192, 1, 1024));
  const cellSize = clamp(options.cellSize ?? 0.6, 0.1, 8);
  let particles = [];
  let events = [];
  let nextId = 1;

  function trimBudget() {
    if (particles.length > maxParticles) {
      particles.splice(0, particles.length - maxParticles);
    }
  }

  function emit(particle = {}) {
    const normalized = {
      id: nextId,
      kind: String(particle.kind || "heat"),
      sourceId: particle.sourceId ? String(particle.sourceId) : null,
      position: vector3(particle.position),
      velocity: vector3(particle.velocity),
      energy: clamp(particle.energy ?? 0.5, 0.001, 4),
      radius: clamp(particle.radius ?? 0.06, 0.01, 1),
      lifeSeconds: clamp(particle.lifeSeconds ?? 1.5, 0.01, 8),
    };
    nextId += 1;
    particles.push(normalized);
    trimBudget();
    return normalized.id;
  }

  function reactHeatAndWater() {
    const cells = new Map();
    for (const particle of particles) {
      const key = cellKey(particle.position, cellSize);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(particle);
    }

    const consumed = new Set();
    const steamPackets = [];
    for (const cellParticles of cells.values()) {
      const heat = cellParticles.filter((particle) => particle.kind === "heat");
      const water = cellParticles.filter((particle) => particle.kind === "water");
      const pairCount = Math.min(heat.length, water.length);
      for (let index = 0; index < pairCount; index += 1) {
        const heatPacket = heat[index];
        const waterPacket = water[index];
        consumed.add(heatPacket.id);
        consumed.add(waterPacket.id);
        const energy = round(Math.min(heatPacket.energy, waterPacket.energy));
        steamPackets.push({
          kind: "steam",
          position: {
            x: (heatPacket.position.x + waterPacket.position.x) / 2,
            y: (heatPacket.position.y + waterPacket.position.y) / 2,
            z: (heatPacket.position.z + waterPacket.position.z) / 2,
          },
          velocity: {
            x: (heatPacket.velocity.x + waterPacket.velocity.x) / 2,
            y: 0.35,
            z: (heatPacket.velocity.z + waterPacket.velocity.z) / 2,
          },
          energy,
          radius: Math.max(heatPacket.radius, waterPacket.radius),
          lifeSeconds: 0.9,
        });
        events.push({ type: "steam-created", energy });
      }
    }

    if (consumed.size > 0) {
      particles = particles.filter((particle) => !consumed.has(particle.id));
      steamPackets.forEach(emit);
    }
  }

  function collideWithTargets(targets) {
    const effects = {};
    const consumed = new Set();
    for (const particle of particles) {
      const effectKind = packetEffectKind(particle.kind);
      if (!effectKind || particle.kind === "steam") continue;
      for (const target of targets) {
        if (!target?.id) continue;
        if (particle.sourceId === target.id) continue;
        const position = vector3(target.position);
        const distance = Math.hypot(
          particle.position.x - position.x,
          particle.position.y - position.y,
          particle.position.z - position.z,
        );
        if (distance > targetRadius(target) + particle.radius) continue;
        effects[target.id] ||= emptyEffect();
        effects[target.id][effectKind] = round(effects[target.id][effectKind] + particle.energy);
        consumed.add(particle.id);
        break;
      }
    }
    if (consumed.size > 0) particles = particles.filter((particle) => !consumed.has(particle.id));
    return effects;
  }

  return Object.freeze({
    emit,
    step(deltaSeconds = 1 / 60, targets = [], stepOptions = {}) {
      const delta = clamp(deltaSeconds, 1 / 240, 0.25);
      const wind = vector3(stepOptions.wind);
      events = [];
      for (const particle of particles) {
        const windCoupling = particle.kind === "water" ? 0.2 : particle.kind === "earth" ? 0.08 : 0.55;
        particle.velocity.x += wind.x * windCoupling * delta;
        particle.velocity.y += wind.y * windCoupling * delta;
        particle.velocity.z += wind.z * windCoupling * delta;
        if (particle.kind === "steam" || particle.kind === "smoke") particle.velocity.y += 0.3 * delta;
        particle.position.x += particle.velocity.x * delta;
        particle.position.y += particle.velocity.y * delta;
        particle.position.z += particle.velocity.z * delta;
        particle.lifeSeconds -= delta;
      }
      particles = particles.filter((particle) => particle.lifeSeconds > 0 && particle.energy > 0);
      reactHeatAndWater();
      const effects = collideWithTargets(Array.isArray(targets) ? targets : []);
      trimBudget();
      return Object.freeze({ effects, events: events.map((event) => Object.freeze({ ...event })) });
    },
    snapshot() {
      const byKind = {};
      for (const particle of particles) byKind[particle.kind] = (byKind[particle.kind] || 0) + 1;
      return Object.freeze({
        count: particles.length,
        byKind,
        events: events.map((event) => Object.freeze({ ...event })),
      });
    },
    debugParticles() {
      return particles.map((particle) => Object.freeze({
        ...particle,
        position: Object.freeze({ ...particle.position }),
        velocity: Object.freeze({ ...particle.velocity }),
      }));
    },
    clear() {
      particles = [];
      events = [];
    },
  });
}

export const MATERIAL_PARTICLE_EFFECT_KEYS = EFFECT_KEYS;
