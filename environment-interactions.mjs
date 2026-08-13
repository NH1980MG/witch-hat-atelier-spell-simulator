import { environmentalResponseFromSpell } from "./environmental-response.mjs";
import { spellForcesFromSnapshot } from "./three-spell-forces.mjs?v=20260813-contact-reactions-v1";

const WIND_FAMILIES = new Set(["wind", "air", "underfoot-wind", "whorling-wind", "fire-vortex", "driven-mist"]);

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
  const environmentalResponse = environmentalResponseFromSpell(spell);
  const diameter = clamp(spell.diameter, 0.05, 5);
  const force = clamp(spell.force, 0, 100);
  const wind = environmentalResponse.primary === "flow" || WIND_FAMILIES.has(family) || effects.has("signe de vent") || effects.has("courant d'air defini");
  const fire = environmentalResponse.primary === "heat" || family === "fire" || effects.has("explosion de feu");
  const water = environmentalResponse.channels.includes("wetting") || environmentalResponse.primary === "adhesion" || family === "water" || family === "driven-mist" || effects.has("pluie");
  const lift = effects.has("levitation") || effects.has("flottement") || effects.has("vent porteur stabilise");
  const pull = effects.has("traction");
  const projectile = environmentalResponse.delivery === "pulsed-focused" || effects.has("projectile") || effects.has("lancement");
  const spellForces = spellForcesFromSnapshot({ ...spell, environmentalResponse });
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
    lift,
    pull,
    projectile,
    environmentalResponse,
    spellForces,
  });
}

export function applySpellImpact(target = {}, profile = spellInfluenceProfile()) {
  const mass = clamp(target.mass, 1, 5000);
  const resistance = clamp(target.resistance ?? 0.5, 0, 1);
  const anchoredBonus = target.anchored ? 0.45 : 0;
  const threshold = resistance + anchoredBonus + Math.log10(mass) * 0.16;
  const power = profile.intensity + (profile.projectile ? 0.18 : 0) + (profile.pull ? 0.12 : 0);
  let state = "unaffected";
  if (profile.wind) {
    state = power > threshold + 0.62 ? "torn" : power > threshold * 0.14 ? "shaken" : "unaffected";
  } else if (profile.fire) {
    state = power > threshold * 0.65 ? "scorched" : "warmed";
  } else if (profile.water) {
    state = power > threshold * 0.7 ? "pushed" : "wet";
  } else if (profile.lift) {
    state = power > threshold ? "lifted" : "shaken";
  } else if (profile.pull) {
    state = power > threshold * 0.75 ? "pulled" : "shaken";
  } else if (profile.projectile) {
    state = power > threshold ? "hit" : "shaken";
  }
  return Object.freeze({
    state,
    offset: state === "torn" ? profile.diameter * 0.42 : state === "shaken" ? profile.diameter * 0.045 : profile.diameter * 0.12,
    tilt: state === "torn" ? 0.42 : state === "shaken" ? 0.08 : 0.14,
    power,
  });
}
