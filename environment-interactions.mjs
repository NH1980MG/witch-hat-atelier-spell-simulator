const WIND_FAMILIES = new Set(["wind", "air", "underfoot-wind", "whorling-wind", "fire-vortex", "driven-mist"]);
const FLAMMABLE_TARGETS = new Set(["book", "plant", "tree", "hat", "paper", "scroll"]);

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export function computeSceneScale(diameterMeters = 1) {
  const diameter = clamp(diameterMeters, 0.05, 5);
  if (diameter <= 1.2) return 1;
  return clamp(1 + (diameter - 1.2) * 0.36, 1, 2.35);
}

export function spellInfluenceProfile(spell = {}) {
  const effects = new Set(spell.effects || []);
  const family = spell.recipe?.materialProfile?.family || spell.materialFamily || "";
  const diameter = clamp(spell.diameter, 0.05, 5);
  const force = clamp(spell.force, 0, 100);
  const wind = WIND_FAMILIES.has(family) || effects.has("signe de vent") || effects.has("courant d'air defini");
  const fire = family === "fire" || family === "heated-mud" || family === "heated-earth" || family === "fire-vortex" || effects.has("explosion de feu");
  const water = family === "water" || family === "driven-mist" || effects.has("pluie");
  const earth = family === "earth" || family === "mud" || family === "moving-mud" || family === "heated-earth" || family === "heated-mud";
  const crystal = family === "crystal" || family === "crystal-fragments";
  const light = family === "light" || family === "unburning-fire";
  const lift = effects.has("levitation") || effects.has("flottement") || effects.has("vent porteur stabilise");
  const pull = effects.has("traction");
  const projectile = effects.has("projectile") || effects.has("lancement");
  const intensity = clamp((force / 100) * (0.55 + diameter / 3.8), 0.05, 1.7);
  return Object.freeze({
    canMove: true,
    canRotate: true,
    cameraPassthroughWhenMissed: true,
    diameter,
    force,
    family,
    intensity,
    wind,
    fire,
    water,
    earth,
    crystal,
    light,
    lift,
    pull,
    projectile,
  });
}

export function applySpellImpact(target = {}, profile = spellInfluenceProfile()) {
  const mass = clamp(target.mass, 1, 5000);
  const resistance = clamp(target.resistance ?? 0.5, 0, 1);
  const anchoredBonus = target.anchored ? 0.45 : 0;
  const threshold = resistance + anchoredBonus + Math.log10(mass) * 0.16;
  const power = profile.intensity + (profile.projectile ? 0.18 : 0) + (profile.pull ? 0.12 : 0);
  const consequences = new Set();
  const flammable = FLAMMABLE_TARGETS.has(target.kind);
  let state = "unaffected";
  if (profile.wind) {
    state = power > threshold + 0.62 ? "torn" : power > threshold * 0.14 ? "shaken" : "unaffected";
    if (state !== "unaffected") consequences.add("wind-streaks");
    if (state === "torn") consequences.add("loose-debris");
  } else if (profile.fire) {
    state = power > threshold * 0.65 ? (flammable ? "ignited" : "scorched") : "warmed";
    consequences.add(state === "ignited" ? "flame" : "heat-haze");
    if (state !== "warmed") consequences.add("scorch-mark");
  } else if (profile.water) {
    state = power > threshold * 0.7 ? "pushed" : "wet";
    consequences.add("wet-surface");
    if (state === "pushed") consequences.add("splash");
  } else if (profile.lift) {
    state = power > threshold ? "lifted" : "shaken";
    consequences.add(state === "lifted" ? "lift-ring" : "pressure-ripple");
  } else if (profile.pull) {
    state = power > threshold * 0.75 ? "pulled" : "shaken";
    consequences.add("drag-trail");
  } else if (profile.projectile) {
    state = power > threshold ? "hit" : "shaken";
    consequences.add("impact-ring");
  } else if (profile.earth) {
    state = power > threshold * 0.72 ? "buried" : "dusted";
    consequences.add("earth-deposit");
    if (state === "buried") consequences.add("stone-ridge");
  } else if (profile.crystal) {
    state = power > threshold * 0.7 ? "cracked" : "faceted";
    consequences.add("crystal-sparks");
    if (state === "cracked") consequences.add("crack-lines");
  } else if (profile.light) {
    state = power > threshold * 0.35 ? "lit" : "glimmering";
    consequences.add("light-glow");
  }
  return Object.freeze({
    state,
    offset: state === "torn" ? profile.diameter * 0.42 : state === "shaken" ? profile.diameter * 0.045 : profile.diameter * 0.12,
    tilt: state === "torn" ? 0.42 : state === "shaken" ? 0.08 : 0.14,
    power,
    consequences: Object.freeze([...consequences]),
  });
}
