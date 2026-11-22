const BASE_COMPONENTS = Object.freeze({
  fire: Object.freeze({ kind: "energy", element: "fire", heat: 1, mass: 0.08 }),
  water: Object.freeze({ kind: "liquid", element: "water", heat: 0.18, mass: 1 }),
  earth: Object.freeze({ kind: "solid", element: "earth", heat: 0.08, mass: 1.45 }),
  wind: Object.freeze({ kind: "gas", element: "wind", heat: 0.12, mass: 0.16 }),
  air: Object.freeze({ kind: "gas", element: "air", heat: 0.1, mass: 0.18 }),
  light: Object.freeze({ kind: "energy", element: "light", heat: 0.04, mass: 0 }),
  crystal: Object.freeze({ kind: "solid", element: "crystal", heat: 0.04, mass: 1.75 }),
  repetition: Object.freeze({ kind: "temporal", element: "repetition", heat: 0, mass: 0 }),
  "time-stop": Object.freeze({ kind: "temporal", element: "stop", heat: 0, mass: 0 }),
});

const MIXTURE_COMPONENTS = Object.freeze({
  mud: Object.freeze(["water", "earth"]),
  "moving-mud": Object.freeze(["water", "earth", "wind"]),
  "heated-mud": Object.freeze(["water", "earth", "fire"]),
  steam: Object.freeze(["water", "fire"]),
  "pressurized-steam": Object.freeze(["water", "fire", "wind"]),
  "driven-mist": Object.freeze(["water", "wind"]),
  "heated-earth": Object.freeze(["earth", "fire"]),
  "fire-vortex": Object.freeze(["fire", "wind"]),
  dust: Object.freeze(["earth", "wind"]),
  ash: Object.freeze(["fire", "earth", "wind"]),
});

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function operationList(operations = {}, axes = {}) {
  const values = [];
  for (const role of new Set([...Object.keys(operations || {}), ...Object.keys(axes || {})])) {
    if (Array.isArray(operations?.[role])) values.push(...operations[role]);
    if (Array.isArray(axes?.[role])) values.push(...axes[role].map((entry) => entry?.operation));
  }
  return values.filter((value) => typeof value === "string" && value);
}

function normalizeElementName(value) {
  const raw = typeof value === "string" ? value : value?.name;
  return String(raw || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function componentIds({ materialProfile = {}, elementalMixture = null }) {
  const family = String(elementalMixture?.materialProfile?.family || materialProfile.family || "raw-energy");
  if (MIXTURE_COMPONENTS[family]) return [...MIXTURE_COMPONENTS[family]];
  const elements = Array.isArray(elementalMixture?.elements)
    ? elementalMixture.elements.map(normalizeElementName).filter(Boolean)
    : [];
  return elements.length > 0 ? elements : [family];
}

function componentFor(id) {
  return BASE_COMPONENTS[id] || Object.freeze({ kind: "energy", element: id || "raw-energy", heat: 0.2, mass: 0.2 });
}

function mediumFor(components, family) {
  const kinds = new Set(components.map((entry) => entry.kind));
  if (family === "light") return "photon-like";
  if (family === "mud" || (kinds.has("liquid") && kinds.has("solid"))) return "slurry";
  if (kinds.has("liquid") && kinds.has("gas")) return "aerosol";
  if (kinds.has("solid") && kinds.has("gas")) return "particulate";
  if (kinds.has("energy") && kinds.has("gas")) return "plasma-gas";
  if (kinds.has("liquid")) return "liquid";
  if (kinds.has("solid")) return "solid";
  if (kinds.has("gas")) return "gas";
  if (kinds.has("temporal")) return "temporal-field";
  return "energy";
}

export function synthesizeParticleField({
  materialProfile = {},
  elementalMixture = null,
  operations = {},
  axes = {},
  geometry = {},
  parameters = {},
} = {}) {
  const family = String(elementalMixture?.materialProfile?.family || materialProfile.family || "raw-energy");
  const operationNames = operationList(operations, axes);
  const has = (name) => operationNames.includes(name);
  const components = componentIds({ materialProfile, elementalMixture }).map(componentFor);
  const medium = mediumFor(components, family);
  const focus = clamp(parameters.focus ?? 1, 0.2, 8);
  const spread = clamp(parameters.spread ?? 1, 0.05, 8);
  const containment = clamp(parameters.containment ?? 0, 0, 8);
  const stability = clamp(parameters.stability ?? geometry.balance ?? 1, 0.05, 8);
  const signTotal = clamp(parameters.signTotal ?? operationNames.length, 0, 64);
  const repetition = clamp(parameters.repetition ?? 0, 0, 16);
  const lightPulse = family === "light" && has("column") && has("focus") && has("bind") && repetition > 0;
  const mode = lightPulse
    ? "pulsed-beam"
    : has("column") && has("focus")
      ? "focused-flow"
      : has("column")
        ? "column-flow"
        : has("dispersion")
          ? "dispersed-field"
          : "settled-field";
  const count = Math.round(clamp(
    90 + signTotal * 18 + focus * 16 + containment * 10 + repetition * 14,
    100,
    500,
  ));
  const field = {
    version: 1,
    mode,
    medium,
    components,
    count,
    focus: Math.round(focus * 100) / 100,
    spread: Math.round(spread * 100) / 100,
    cohesion: Math.round(clamp(0.26 + containment * 0.14 + stability * 0.11 + (medium === "slurry" ? 0.24 : 0), 0, 1) * 100) / 100,
    behavior: {
      flow: has("column") ? "aligned" : has("dispersion") ? "outward" : "local",
      convergence: has("focus") ? "focal-point" : "none",
      emission: lightPulse ? "intermittent" : repetition > 0 ? "looped" : "continuous",
      stop: has("bind") ? "state-gated" : has("still") ? "frozen-after-forming" : "none",
    },
    pulseRateHz: lightPulse ? Math.round(clamp(1.5 + repetition * 0.85 + signTotal * 0.08, 0, 16) * 100) / 100 : 0,
    interpretation: lightPulse ? "fictional-ultraviolet" : "symbolic-material",
    medicalClaim: "none",
    rules: [
      `particle.medium.${medium}`,
      has("column") ? "particle.form.column" : null,
      has("focus") ? "particle.form.focus" : null,
      lightPulse ? "particle.light.pulse-stop" : null,
    ].filter(Boolean),
  };
  return freezeDeep(field);
}
