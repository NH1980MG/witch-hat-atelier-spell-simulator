import { environmentalResponseFromSpell } from "./environmental-response.mjs";

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function vector3(value = {}, fallback = { x: 0, y: 0, z: -1 }) {
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  return {
    x: Number.isFinite(x) ? round(x) : fallback.x,
    y: Number.isFinite(y) ? round(y) : fallback.y,
    z: Number.isFinite(z) ? round(z) : fallback.z,
  };
}

function normalizedDirection(value = {}) {
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z ?? value.y);
  const candidate = {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) && Number.isFinite(value.z) ? y : 0,
    z: Number.isFinite(z) ? z : -1,
  };
  const length = Math.hypot(candidate.x, candidate.y, candidate.z);
  if (length < 0.0001) return { x: 0, y: 0, z: -1 };
  return {
    x: round(candidate.x / length),
    y: round(candidate.y / length),
    z: round(candidate.z / length),
  };
}

function baseForce({ response, snapshot }) {
  const diameter = clamp(snapshot.diameter, 0.05, 5);
  const force = clamp(snapshot.force, 0, 100) / 100;
  return {
    version: 1,
    response: response.primary,
    forceKind: response.forceKind,
    mode: response.delivery,
    origin: vector3(snapshot.origin, { x: 0, y: 0, z: 0 }),
    direction: normalizedDirection(snapshot.direction),
    radiusMeters: round(clamp(response.radiusMeters || diameter * 0.45, 0.05, diameter)),
    magnitude: round(clamp(response.intensity * (0.55 + force * 0.7), 0, 3.5)),
    pulse: response.pulse || { mode: "continuous", rateHz: 0 },
    medicalClaim: "none",
  };
}

export function spellForcesFromSnapshot(snapshot = {}) {
  const response = snapshot.environmentalResponse || environmentalResponseFromSpell(snapshot);
  const base = baseForce({ response, snapshot });
  const forces = [];

  if (response.primary === "illumination") {
    forces.push({
      ...base,
      type: response.delivery === "pulsed-focused" ? "radiant-pulse" : "radiant-field",
      physicalImpulse: round(clamp(base.magnitude * 0.045, 0, 0.18)),
      affects: ["light-sensitive", "surface"],
    });
  } else if (response.primary === "adhesion") {
    forces.push({
      ...base,
      type: "adhesion-damping",
      damping: round(clamp(response.damping || 0, 0, 1)),
      physicalImpulse: round(clamp(base.magnitude * 0.08, 0, 0.32)),
      affects: ["surface", "loose-props"],
    });
    forces.push({
      ...base,
      type: "mass-load",
      massLoad: round(clamp(response.massLoad || 0, 0, 1.5)),
      physicalImpulse: round(clamp(base.magnitude * 0.16, 0, 0.7)),
      affects: ["loose-props", "grounded-props"],
    });
  } else if (response.primary === "flow") {
    forces.push({
      ...base,
      type: response.delivery === "directed-flow" ? "directed-impulse" : "radial-impulse",
      physicalImpulse: round(clamp(base.magnitude * 0.72, 0, 2.4)),
      affects: ["grass", "tree", "loose-props", "light-structures"],
    });
  } else if (response.primary === "heat") {
    forces.push({
      ...base,
      type: "thermal-field",
      heat: round(clamp(response.heat || 0, 0, 1.4)),
      physicalImpulse: round(clamp(base.magnitude * 0.08, 0, 0.28)),
      affects: ["surface", "flammable-props"],
    });
  } else if (response.primary === "impact") {
    forces.push({
      ...base,
      type: "mass-impact",
      massLoad: round(clamp(response.massLoad || 0.2, 0, 1.5)),
      physicalImpulse: round(clamp(base.magnitude * 0.5, 0, 1.8)),
      affects: ["loose-props", "structures"],
    });
  }

  return freezeDeep(forces);
}
