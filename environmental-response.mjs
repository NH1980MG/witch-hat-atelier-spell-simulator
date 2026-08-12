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

function componentsContain(field, kind) {
  return Array.isArray(field?.components) && field.components.some((entry) => entry?.kind === kind || entry?.element === kind);
}

function baseResponse({ particleField, diameter, force }) {
  const focus = clamp(particleField?.focus ?? 1, 0.2, 8);
  const spread = clamp(particleField?.spread ?? 1, 0.05, 8);
  const cohesion = clamp(particleField?.cohesion ?? 0.35, 0, 1);
  const normalizedForce = clamp(force, 0, 100) / 100;
  const diameterMeters = clamp(diameter, 0.05, 5);
  return {
    focus,
    spread,
    cohesion,
    intensity: round(clamp((0.32 + normalizedForce * 1.22) * (0.72 + focus * 0.16), 0.02, 2.5)),
    radiusMeters: round(clamp(diameterMeters * (0.28 + spread * 0.2 - focus * 0.025), 0.05, diameterMeters)),
  };
}

export function environmentalResponseFromParticleField({
  particleField = null,
  diameter = 1,
  force = 0,
} = {}) {
  const field = particleField || {};
  const base = baseResponse({ particleField: field, diameter, force });
  const medium = String(field.medium || "energy");
  const channels = [];
  let primary = "ambient";
  let delivery = field.mode === "dispersed-field" ? "diffuse" : "local";
  let forceKind = "none";
  let massLoad = 0;
  let damping = 0;
  let heat = 0;

  if (medium === "photon-like") {
    primary = "illumination";
    forceKind = "radiant";
    channels.push("light");
    if (field.mode === "pulsed-beam") {
      delivery = "pulsed-focused";
      channels.push("pulse", "focus");
    } else if (field.behavior?.convergence === "focal-point" || base.focus > 1.5) {
      delivery = "focused";
      channels.push("focus");
    }
  } else if (medium === "slurry") {
    primary = "adhesion";
    delivery = base.focus > 1.2 ? "focused-contact" : "surface-contact";
    forceKind = "mass-load";
    massLoad = round(clamp(0.24 + base.cohesion * 0.62 + base.intensity * 0.12, 0, 1.5));
    damping = round(clamp(0.18 + base.cohesion * 0.62, 0, 1));
    channels.push("surface-contact", "mass");
  } else if (medium === "gas" || medium === "aerosol" || medium === "particulate") {
    primary = "flow";
    delivery = field.mode === "focused-flow" || field.mode === "column-flow" ? "directed-flow" : "diffuse-flow";
    forceKind = "impulse";
    channels.push("motion", "airflow");
    if (medium === "aerosol" || componentsContain(field, "liquid")) channels.push("wetting");
  } else if (medium === "plasma-gas" || componentsContain(field, "fire")) {
    primary = "heat";
    delivery = base.focus > 1.3 ? "focused-heat" : "radiant-heat";
    forceKind = "thermal";
    heat = round(clamp(0.2 + base.intensity * 0.45, 0, 1.4));
    channels.push("heat", "light");
  } else if (medium === "solid" || medium === "particulate") {
    primary = "impact";
    forceKind = "mass-impact";
    massLoad = round(clamp(0.18 + base.cohesion * 0.48, 0, 1.2));
    channels.push("mass");
  }

  const response = {
    version: 1,
    primary,
    delivery,
    forceKind,
    channels: [...new Set(channels)],
    intensity: base.intensity,
    radiusMeters: base.radiusMeters,
    focus: round(base.focus),
    spread: round(base.spread),
    cohesion: round(base.cohesion),
    massLoad,
    damping,
    heat,
    pulse: {
      mode: field.pulseRateHz > 0 ? "intermittent" : "continuous",
      rateHz: round(clamp(field.pulseRateHz ?? 0, 0, 16)),
    },
    medicalClaim: "none",
    rules: [
      `environment.medium.${medium}`,
      `environment.primary.${primary}`,
      field.mode ? `environment.mode.${field.mode}` : null,
    ].filter(Boolean),
  };
  return freezeDeep(response);
}

export function environmentalResponseFromSpell(spell = {}) {
  return environmentalResponseFromParticleField({
    particleField: spell.recipe?.manifestationPlan?.particleField || spell.manifestationPlan?.particleField || null,
    diameter: spell.diameter,
    force: spell.force,
  });
}
