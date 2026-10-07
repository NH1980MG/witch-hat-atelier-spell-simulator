export const PART_TYPES = { sphere: "Sphère", box: "Bloc", cone: "Cône", cylinder: "Cylindre", torus: "Anneau", crystal: "Cristal", contour: "Contour extrudé" };
export const ELEMENT_PROFILES = {
  water: { name: "Eau", damage: 14, speed: 4 }, fire: { name: "Feu", damage: 22, speed: 6 },
  earth: { name: "Terre", damage: 26, speed: 2.5 }, air: { name: "Vent", damage: 10, speed: 8 },
  light: { name: "Lumière", damage: 18, speed: 12 }, crystal: { name: "Cristal", damage: 24, speed: 5 },
};
export const bounded = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function normalizeTrajectory(points) {
  return (Array.isArray(points) ? points : []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    .slice(0, 64).map((p) => ({ x: bounded(p.x, -4, 4, 0), y: bounded(p.y, -2, 4, 0), z: bounded(p.z, -4, 4, 0) }));
}
export function normalizeParts(parts) {
  const ids = new Set();
  return (Array.isArray(parts) ? parts : []).filter((p) => p && Object.hasOwn(PART_TYPES, p.type)).slice(0, 32).map((p, i) => {
    let id = typeof p.id === 'string' && /^[\w-]{1,80}$/.test(p.id) ? p.id : `part-${i}`;
    while (ids.has(id)) id += '-copy';
    ids.add(id);
    const result = { id, type: p.type, name: typeof p.name === "string" ? p.name.slice(0, 40) : PART_TYPES[p.type] };
    for (const key of ["x", "y", "z"]) result[key] = bounded(p[key], -4, 4, 0);
    for (const key of ["sx", "sy", "sz"]) result[key] = bounded(p[key], 0.05, 4, 1);
    for (const key of ["rx", "ry", "rz"]) result[key] = bounded(p[key], -180, 180, 0);
    result.contour = normalizeTrajectory(p.contour).map(({ x, y }) => ({ x, y }));
    return result;
  });
}
export function shapeExample(shape) {
  if (shape === "flower") return normalizeParts([
    { type: "sphere", name: "Cœur", sx: .24, sy: .24, sz: .24 },
    ...Array.from({ length: 8 }, (_, i) => ({ type: "sphere", name: `Pétale ${i + 1}`, x: Math.sin(i * Math.PI / 4) * .58, y: Math.cos(i * Math.PI / 4) * .58, sx: .23, sy: .58, sz: .13, rz: -i * 45 > -180 ? -i * 45 : 360 - i * 45 })),
  ]);
  return normalizeParts([{ type: ({ orb: "sphere", ring: "torus", column: "cylinder", shards: "crystal" })[shape] || "sphere", sx: shape === "orb" ? .7 : 1, sy: shape === "column" ? 2.3 : shape === "orb" ? .7 : 1, sz: shape === "orb" ? .7 : 1 }]);
}
export const DEFAULT_TRAJECTORY = [{ x: -2, y: 0, z: 0 }, { x: 0, y: 1.5, z: 0 }, { x: 2, y: 0, z: 0 }];
export function trajectoryLength(points) {
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y, p.z - points[i].z), 0);
}
export function sampleTrajectory(raw, distance, mode = "once") {
  const points = normalizeTrajectory(raw);
  if (!points.length) return { x: 0, y: 0, z: 0 };
  const length = trajectoryLength(points);
  if (!length) return { ...points[0] };
  let d = Math.max(0, Number.isFinite(distance) ? distance : 0);
  if (mode === "loop") d %= length;
  else if (mode === "pingpong") { d %= length * 2; if (d > length) d = length * 2 - d; }
  else d = Math.min(length, d);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const segment = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (d <= segment && segment > 0) {
      const t = d / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
    d -= segment;
  }
  return { ...points.at(-1) };
}
export function normalizeMix(raw, fallback = "water") {
  const weights = new Map();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item || !Object.hasOwn(ELEMENT_PROFILES, item.element)) continue;
    const weight = bounded(item.weight, 0, 100, 0);
    if (weight) weights.set(item.element, Math.min(100, (weights.get(item.element) || 0) + weight));
  }
  return weights.size ? [...weights].map(([element, weight]) => ({ element, weight })) : [{ element: Object.hasOwn(ELEMENT_PROFILES, fallback) ? fallback : "water", weight: 1 }];
}
export function normalizeBalance(raw) {
  return Object.fromEntries(Object.entries(ELEMENT_PROFILES).map(([key, base]) => [key, {
    damage: bounded(raw?.[key]?.damage, 0, 100, base.damage), speed: bounded(raw?.[key]?.speed, 0.5, 20, base.speed),
  }]));
}
export function estimateCombat(effect = {}) {
  const mix = normalizeMix(effect.mix, effect.material);
  const balance = normalizeBalance(effect.balance);
  const total = mix.reduce((sum, item) => sum + item.weight, 0);
  const fractions = Object.fromEntries(mix.map(({ element, weight }) => [element, weight / total]));
  const mean = (key) => mix.reduce((sum, item) => sum + balance[item.element][key] * item.weight / total, 0);
  const interactions = [];
  let synergy = 1;
  const pair = (a, b, coefficient, label) => {
    const strength = Math.min(fractions[a] || 0, fractions[b] || 0) * 2;
    if (strength) { synergy += coefficient * strength; interactions.push(label); }
  };
  pair("water", "fire", -.2, "Vapeur : impact direct atténué");
  pair("fire", "air", .15, "Attisement : impact renforcé");
  pair("water", "earth", -.15, "Boue : impact direct atténué");
  pair("water", "crystal", .1, "Glace : impact renforcé");
  const moving = effect.motion !== "hover";
  const speed = moving ? mean("speed") * bounded(effect.speed, .1, 3, 1) : 0;
  const kinetic = moving ? 1 + Math.min(speed, 30) / 30 : 1;
  const power = bounded(effect.power, .1, 3, 1);
  const sizeFactor = Math.pow(bounded(effect.size, .2, 3, 1), .7);
  const focus = 1 / (1 + bounded(effect.spread, .2, 3, 1) * .15);
  const damageScale = bounded(effect.damageScale, 0, 3, 1);
  const damage = Math.round(mean("damage") * power * sizeFactor * focus * synergy * kinetic * damageScale);
  return {
    damage, speed: Math.round(speed * 100) / 100, baseDamage: mean("damage"), synergy, kinetic, sizeFactor, focus,
    power, damageScale, interactions, fractions,
    energy: Math.round(10 * power * sizeFactor * (1 + bounded(effect.duration, 2, 15, 6) / 12)),
    travelTime: speed > 0 && effect.motion === "path" ? trajectoryLength(normalizeTrajectory(effect.trajectory)) / speed : null,
  };
}
