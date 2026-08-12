const ROLE_ORDER = Object.freeze(["supply", "state", "form", "motion", "pressure", "direction", "scope", "target", "relation", "power"]);
const PRIMARY_ROLES = new Set(["supply", "state", "form", "motion", "pressure", "direction", "scope", "target", "power"]);
const FIDELITY_RANK = Object.freeze({ documented: 0, inferred: 1, experimental: 2 });

const MATERIAL_LABELS = Object.freeze({
  water: ["Water", "Eau"],
  mud: ["Mud", "Boue"],
  steam: ["Steam", "Vapeur"],
  "driven-mist": ["Driven mist", "Brume dirigee"],
  "pressurized-steam": ["Pressurized steam", "Vapeur pressurisee"],
  "heated-earth": ["Heated earth", "Terre chauffee"],
  "fire-vortex": ["Flame vortex", "Vortex de flammes"],
  dust: ["Dust", "Poussiere"],
  "moving-mud": ["Moving mud", "Boue en mouvement"],
  "heated-mud": ["Heated mud", "Boue chauffee"],
  ash: ["Ash", "Cendres"],
  crystal: ["Crystal", "Cristal"],
  fire: ["Fire", "Feu"],
  earth: ["Earth", "Terre"],
  wind: ["Wind", "Vent"],
  air: ["Air", "Air"],
  light: ["Light", "Lumiere"],
  "raw-energy": ["Raw energy", "Energie brute"],
  "petrified-stone": ["Forbidden petrification field", "Champ de petrification interdit"],
});

export function synthesizeManifestation({
  materialProfile = {},
  elementalMixture = null,
  operations = {},
  axes = {},
  geometry = {},
  supportPlan = {},
  fidelity = "documented",
  ritualId = null,
} = {}) {
  const normalizedOperations = normalizeOperations(operations, axes);
  const has = (operation) => ROLE_ORDER.some((role) => normalizedOperations[role].includes(operation));
  const elements = elementNames(elementalMixture, materialProfile);
  const family = String(elementalMixture?.materialProfile?.family || materialProfile.family || "raw-energy");
  const phase = String(elementalMixture?.materialProfile?.phase || materialProfile.phase || "energy");
  const normalizedGeometry = normalizeGeometry(geometry);
  const warnings = [];

  if (has("orb") && has("dispersion")) warnings.push("containment-dispersion-conflict");
  if (has("still") && normalizedOperations.motion.some((operation) => operation !== "still")) warnings.push("motion-stillness-sequenced");
  if (has("pull") && has("push")) warnings.push("opposed-motion");
  if (normalizedGeometry.balance < 0.72) warnings.push("directional-imbalance");

  const selected = selectSpecialization({ family, phase, elements, has, geometry: normalizedGeometry, ritualId });
  const consumedOperations = operationIds(normalizedOperations)
    .filter((entry) => PRIMARY_ROLES.has(entry.split(".", 1)[0]));
  const secondaryOperations = operationIds(normalizedOperations)
    .filter((entry) => !consumedOperations.includes(entry));
  const materialFidelity = worstFidelity(
    fidelity,
    elementalMixture?.fidelity,
    supportPlan.fidelity,
    selected.fidelity,
  );
  const labels = selected.labels || MATERIAL_LABELS[selected.materialId] || MATERIAL_LABELS[family] || [titleCase(family), titleCase(family)];
  const movesCarrier = Boolean(supportPlan.movesCarrier) && (has("lift") || has("float") || has("carrier"));

  return freezeDeep({
    id: selected.id,
    fidelity: materialFidelity,
    labelEn: labels[0],
    labelFr: labels[1],
    material: {
      id: selected.materialId,
      phase: selected.phase,
      density: finite(selected.density, 1, 0.05, 12),
      elements,
    },
    form: {
      id: selected.form,
      scale: finite(selected.scale, 1, 0.1, 4),
    },
    motion: {
      id: selected.motion,
      vector: normalizedGeometry.vector,
      pressure: normalizedGeometry.pressure,
      spin: normalizedGeometry.spin,
      reach: normalizedGeometry.reach,
    },
    lifecycle: {
      growth: selected.growth,
      stop: "dispose",
      maxDurationMs: 30_000,
    },
    stability: normalizedGeometry.balance,
    consumedOperations,
    secondaryOperations,
    supportInteraction: {
      supportId: supportPlan.supportId || "none",
      mode: supportPlan.mode || "paper-origin",
      transfersForce: supportPlan.supportId === "shoe",
      movesCarrier,
      origin: supportPlan.origin || "paper",
    },
    particles: {
      max: Math.round(finite(selected.particles, 120, 0, 240)),
    },
    warnings: [...new Set(warnings)],
  });
}

function selectSpecialization({ family, phase, elements, has, geometry, ritualId }) {
  const includes = (name) => elements.includes(name);

  if (ritualId === "opening-petrification" && family === "earth" && has("solidify") && has("still")) {
    return specialization(
      "ancient.petrification-field",
      "petrified-stone",
      "mineral-lock",
      "locking-crystal-field",
      "surface-lock",
      MATERIAL_LABELS["petrified-stone"],
      { density: 3.4, particles: 144, fidelity: "documented" },
    );
  }
  if ((family === "mud" || family === "moving-mud" || (includes("water") && includes("earth"))) && has("crush")) {
    return specialization("mud.dense-projection", "mud", "slurry", "column", "project", ["Dense mud projection", "Projection de boue dense"], { density: 1.35, particles: 96 });
  }
  if ((family === "driven-mist" || (includes("water") && includes("wind"))) && has("focus")) {
    return specialization("mist.pressurized-jet", "driven-mist", "aerosol", "jet", "project", ["Pressurized mist jet", "Jet de brume pressurise"], { density: 0.35, particles: 180 });
  }
  if (family === "fire-vortex" || (includes("fire") && includes("wind") && Math.abs(geometry.spin) >= 0.08)) {
    return specialization("fire.flame-vortex", "fire-vortex", "energy-gas", "vortex", "vortex", ["Flame vortex", "Vortex de flammes"], { density: 0.22, particles: 160 });
  }
  if (family === "crystal" && has("crush") && has("column")) {
    return specialization("crystal.propelled-fragments", "crystal", "fragments", "fragments", "project", ["Propelled crystal fragments", "Fragments de cristal propulses"], { density: 2.2, particles: 88 });
  }
  if (family === "water" && has("lift")) {
    return specialization("water.suspended-mass", "water", "liquid", "orb", "lift", ["Growing suspended water mass", "Masse d'eau suspendue croissante"], { density: 1, growth: "continuous", particles: 72 });
  }

  const familySpecializations = {
    steam: specialization("steam.rising-cloud", "steam", "vapor", has("focus") ? "jet" : "cloud", has("burst") ? "project" : "rise", MATERIAL_LABELS.steam, { density: 0.18, particles: 170 }),
    "pressurized-steam": specialization("steam.pressurized-jet", "pressurized-steam", "vapor", "jet", "project", MATERIAL_LABELS["pressurized-steam"], { density: 0.2, particles: 190 }),
    "driven-mist": specialization("mist.driven-spray", "driven-mist", "aerosol", "spray", "project", MATERIAL_LABELS["driven-mist"], { density: 0.3, particles: 180 }),
    mud: specialization("mud.surface-slurry", "mud", "slurry", has("column") ? "column" : "pool", has("column") ? "project" : "spread", MATERIAL_LABELS.mud, { density: 1.25, particles: 90 }),
    "moving-mud": specialization("mud.moving-slurry", "moving-mud", "slurry", "stream", "flow", MATERIAL_LABELS["moving-mud"], { density: 1.18, particles: 110 }),
    "heated-mud": specialization("mud.heated-slurry", "heated-mud", "slurry", "pool", "spread", MATERIAL_LABELS["heated-mud"], { density: 1.3, particles: 100 }),
    "heated-earth": specialization("earth.heated-mass", "heated-earth", "solid", has("bolt") ? "fragments" : "mass", has("burst") ? "project" : "surface", MATERIAL_LABELS["heated-earth"], { density: 2.4, particles: 82 }),
    dust: specialization("earth.dust-stream", "dust", "particulate", has("focus") ? "jet" : "cloud", has("burst") || has("column") ? "project" : "drift", MATERIAL_LABELS.dust, { density: 0.42, particles: 220 }),
    ash: specialization("fire.ash-cloud", "ash", "particulate", "cloud", "drift", MATERIAL_LABELS.ash, { density: 0.32, particles: 220 }),
  };
  if (familySpecializations[family]) return familySpecializations[family];

  const form = firstMatching(normalizePreferred(has, ["orb", "column", "rain", "cloud", "bolt", "ribbon", "coil", "envelope", "project", "focus", "dispersion"]), "field");
  const motion = firstMatching(normalizePreferred(has, ["burst", "lift", "float", "push", "pull", "puppet"]), geometry.pressure > 0.05 ? "drift" : "surface");
  return specialization(`${slug(family)}.${slug(form)}-${slug(motion)}`, family, phase, form, motion, null, {
    density: phase.includes("solid") ? 1.8 : phase.includes("liquid") ? 1 : 0.3,
    particles: phase.includes("gas") ? 180 : 96,
    fidelity: family === "raw-energy" ? "experimental" : "inferred",
  });
}

function specialization(id, materialId, phase, form, motion, labels, options = {}) {
  return {
    id,
    materialId,
    phase,
    form,
    motion,
    labels,
    density: options.density ?? 1,
    scale: options.scale ?? 1,
    growth: options.growth ?? "bounded",
    particles: options.particles ?? 120,
    fidelity: options.fidelity ?? "inferred",
  };
}

function normalizeOperations(operations, axes) {
  return Object.fromEntries(ROLE_ORDER.map((role) => {
    const direct = Array.isArray(operations?.[role]) ? operations[role] : [];
    const derived = Array.isArray(axes?.[role]) ? axes[role].map((entry) => entry?.operation) : [];
    return [role, [...new Set([...direct, ...derived].filter((value) => typeof value === "string" && value))]];
  }));
}

function operationIds(operations) {
  return ROLE_ORDER.flatMap((role) => operations[role].map((operation) => `${role}.${operation}`));
}

function elementNames(elementalMixture, materialProfile) {
  const values = Array.isArray(elementalMixture?.elements)
    ? elementalMixture.elements.map((entry) => typeof entry === "string" ? entry : entry?.name)
    : [];
  if (values.length === 0) values.push(materialProfile?.family || "raw-energy");
  return [...new Set(values.map((value) => slug(String(value))).filter(Boolean))].sort();
}

function normalizeGeometry(geometry) {
  const vector = geometry?.vector && typeof geometry.vector === "object"
    ? [finite(geometry.vector.x, 0, -1, 1), finite(geometry.vector.y, 1, -1, 1), 0]
    : [0, 1, 0];
  return {
    balance: finite(geometry?.balance, 1, 0, 1),
    pressure: finite(geometry?.pressure, 0, 0, 1),
    spin: finite(geometry?.spin, 0, -1, 1),
    reach: finite(geometry?.reach, 1, 0.2, 1),
    vector,
  };
}

function normalizePreferred(has, candidates) {
  return candidates.filter(has);
}

function firstMatching(values, fallback) {
  return values[0] || fallback;
}

function finite(value, fallback, minimum, maximum) {
  const number = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

function worstFidelity(...values) {
  return values
    .filter((value) => value in FIDELITY_RANK)
    .sort((left, right) => FIDELITY_RANK[right] - FIDELITY_RANK[left])[0] || "documented";
}

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

function titleCase(value) {
  const text = String(value).replace(/[-_]+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
