import { normalizeParts, normalizeTrajectory, normalizeMix, normalizeBalance } from "./effect-authoring-model.mjs";
import { normalizeAnimation } from './effect-animation-model.mjs';

export const DEFAULT_EFFECT = Object.freeze({
  material: "water", shape: "orb", motion: "hover", color: "#49b8df",
  size: 1, count: 12, speed: 1, duration: 6, spread: 1, angle: 0,
});

export const EFFECT_OPTIONS = {
  material: { water: "Eau", fire: "Feu", earth: "Terre", air: "Vent", light: "Lumière", crystal: "Cristal" },
  shape: { custom: "Ma forme modelée", orb: "Exemple : orbe", flower: "Exemple : fleur", column: "Exemple : colonne", ring: "Exemple : anneau", shards: "Exemple : éclats" },
  motion: { path: "Ma trajectoire", hover: "Exemple : flotter", orbit: "Exemple : tourner", rise: "Exemple : s’élever", projectile: "Exemple : projeter", burst: "Exemple : éclater", rain: "Exemple : pleuvoir" },
};
export const EFFECT_RANGES = { size: [0.2, 3, 0.1], count: [1, 48, 1], speed: [0.1, 3, 0.1], duration: [2, 15, 0.5], spread: [0.2, 3, 0.1], angle: [-180, 180, 1] };
export function normalizeEffect(raw = {}) {
  const value = raw && typeof raw === "object" ? raw : {};
  const effect = { ...DEFAULT_EFFECT };
  for (const [key, choices] of Object.entries(EFFECT_OPTIONS)) if (Object.hasOwn(choices, value[key])) effect[key] = value[key];
  for (const [key, [min, max]] of Object.entries(EFFECT_RANGES)) {
    if (Number.isFinite(value[key])) effect[key] = Math.max(min, Math.min(max, value[key]));
  }
  effect.count = Math.round(effect.count);
  if (typeof value.color === "string" && /^#[0-9a-f]{6}$/i.test(value.color)) effect.color = value.color;
  effect.parts = normalizeParts(value.parts);
  effect.geometrySource = value.geometrySource === 'asset' ? 'asset' : 'volumes';
  effect.assetId = typeof value.assetId === 'string' && /^[a-f0-9]{64}$/.test(value.assetId) ? value.assetId : '';
  effect.clip = {name: typeof value.clip?.name === 'string' ? value.clip.name.slice(0,200) : '', speed: Number.isFinite(value.clip?.speed) ? Math.max(.1,Math.min(3,value.clip.speed)) : 1, loop:value.clip?.loop !== false};
  effect.animation = normalizeAnimation(value.animation, effect.parts.map(p=>p.id));
  effect.trajectory = normalizeTrajectory(value.trajectory);
  effect.pathMode = ["once", "loop", "pingpong"].includes(value.pathMode) ? value.pathMode : "pingpong";
  effect.mix = normalizeMix(value.mix, effect.material);
  effect.balance = normalizeBalance(value.balance);
  effect.power = Number.isFinite(value.power) ? Math.max(.1, Math.min(3, value.power)) : 1;
  effect.damageScale = Number.isFinite(value.damageScale) ? Math.max(0, Math.min(3, value.damageScale)) : 1;
  return effect;
}
const RULES = {
  Eau: { material: "water", color: "#49b8df" }, Feu: { material: "fire", color: "#ff803a", motion: "rise" },
  Terre: { material: "earth", color: "#bc9860" }, Vent: { material: "air", color: "#bbebe3", motion: "orbit" },
  Lumiere: { material: "light", color: "#ffe791" }, Cristal: { material: "crystal", color: "#b0dfff" },
  Fleur: { shape: "flower" }, Colonne: { shape: "column" }, Orbe: { shape: "orb" },
  Projectile: { motion: "projectile" }, Projection: { motion: "projectile" }, Lancement: { motion: "projectile" },
  Pluie: { motion: "rain" }, Dispersion: { motion: "burst" }, Crush: { motion: "burst", shape: "shards" },
  Solidification: { material: "crystal" }, Refroidissement: { material: "crystal", color: "#b0dfff" },
  Convergence: { spread: 0.25 }, Nuage: { count: 40, spread: 2 },
  Agrandissement: { scale: 1.5 }, Etirement: { shape: "column" }, Enveloppe: { shape: "ring" },
  Renforcement: { scale: 1.2 },
};
const ROLE_FIELDS = {
  material: ["material", "color", "mix"], form: ["shape", "size", "count", "parts"],
  direction: ["motion", "angle", "speed", "trajectory", "pathMode"], transformation: ["material", "shape", "motion", "color", "parts", "trajectory", "pathMode"],
  modifier: ["size", "count", "speed", "spread", "power", "damageScale", "balance"], trigger: ["duration"],
};
ROLE_FIELDS.form.push('geometrySource','assetId');
ROLE_FIELDS.direction.push('clip','animation');
ROLE_FIELDS.transformation.push('geometrySource','assetId','clip','animation');
export function suggestedRole(name) {
  if (["Eau", "Feu", "Terre", "Vent", "Lumiere", "Cristal"].includes(name)) return "material";
  if (["Fleur", "Orbe", "Colonne", "Enveloppe", "Etirement"].includes(name)) return "form";
  if (["Agrandissement", "Renforcement", "Convergence", "Nuage"].includes(name)) return "modifier";
  if (["Solidification", "Refroidissement", "Crush"].includes(name)) return "transformation";
  return "direction";
}
export function compileEffect(composition, symbols = new Map()) {
  let effect = { ...DEFAULT_EFFECT };
  const stages = [];
  const warnings = [];
  let mixture = [];
  for (const item of composition?.components || []) {
    const symbol = symbols.get(item.symbolId);
    const name = symbol?.name || item.symbolId;
    let patch;
    if (item.source === "custom" && symbol?.effect) {
      const definition = normalizeEffect(symbol.effect);
      // A custom symbol contributes only the fields matching its assigned role.
      patch = Object.fromEntries((ROLE_FIELDS[item.role] || []).map((key) => [key, definition[key]]));
    } else if (item.source === "catalog") patch = RULES[name];
    if (!patch) { warnings.push(`${name} : comportement non défini dans cette démo.`); continue; }
    if (patch.mix) mixture = normalizeMix([...mixture, ...patch.mix]);
    else if (patch.material && suggestedRole(name) === "material") mixture = normalizeMix([...mixture, { element: patch.material, weight: 1 }]);
    if (mixture.length) patch = { ...patch, mix: mixture };
    effect = normalizeEffect({ ...effect, ...patch, size: patch.scale ? effect.size * patch.scale : patch.size ?? effect.size });
    stages.push({ label: name, effect: { ...effect } });
  }
  const overrides = composition?.effectOverrides || {};
  const overridden = (base) => normalizeEffect({ ...base, ...overrides, ...(overrides.material && !overrides.mix ? { mix: [{ element: overrides.material, weight: 1 }] } : {}) });
  return { effect: overridden(effect), stages: stages.map((stage) => ({ ...stage, effect: overridden(stage.effect) })), warnings };
}

export const EFFECT_PRESETS = [
  { name: "Fleur de cristal", symbols: ["Eau", "Fleur", "Agrandissement", "Solidification", "Crush"], effect: { material: "crystal", color: "#96dcff", shape: "flower", motion: "hover", count: 8 } },
  { name: "Pluie de lumière", symbols: ["Lumiere", "Pluie"], effect: { material: "light", color: "#ffe791", shape: "shards", motion: "rain", count: 32 } },
  { name: "Orbe de feu", symbols: ["Feu", "Orbe", "Projectile"], effect: { material: "fire", color: "#ff803a", shape: "orb", motion: "projectile", count: 20 } },
];
