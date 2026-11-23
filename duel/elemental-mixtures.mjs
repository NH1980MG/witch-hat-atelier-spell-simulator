const profile = (value) => Object.freeze(value);

export const BASE_ELEMENT_NAMES = Object.freeze(["Feu", "Eau", "Terre", "Vent"]);

const MIXTURE_PROFILE_DEFINITIONS = Object.freeze({
  "eau+terre": profile({
    family: "mud",
    noun: "boue",
    nounEn: "mud",
    phase: "liquid-solid",
    defaultLabel: "boue ou sediment humide",
    mechanic: "compose de l'eau et de la terre en boue, argile ou sediment humide",
    fidelity: "inferred",
  }),
  "feu+eau": profile({
    family: "steam",
    noun: "vapeur",
    nounEn: "steam",
    phase: "gas",
    defaultLabel: "vapeur chaude",
    mechanic: "compose de l'eau et du feu en vapeur ou brume chaude",
    fidelity: "inferred",
  }),
  "eau+vent": profile({
    family: "driven-mist",
    noun: "brume",
    nounEn: "driven mist",
    phase: "liquid-gas",
    defaultLabel: "brume ou pluie poussee",
    mechanic: "compose de l'eau et du vent en brume, projection ou pluie poussee",
    fidelity: "inferred",
  }),
  "feu+terre": profile({
    family: "heated-earth",
    noun: "terre chauffee",
    nounEn: "heated earth",
    phase: "solid-energy",
    defaultLabel: "terre chauffee ou argile cuite",
    mechanic: "compose du feu et de la terre en terre chauffee, argile cuite ou mineral fondu",
    fidelity: "inferred",
  }),
  "feu+vent": profile({
    family: "fire-vortex",
    noun: "flamme",
    nounEn: "fire vortex",
    phase: "energy-gas",
    defaultLabel: "flamme entrainee",
    mechanic: "compose du feu et du vent en flamme entrainee ou vortex de feu",
    fidelity: "inferred",
  }),
  "terre+vent": profile({
    family: "dust",
    noun: "poussiere",
    nounEn: "dust",
    phase: "solid-gas",
    defaultLabel: "poussiere ou sable en mouvement",
    mechanic: "compose de la terre et du vent en poussiere, sable ou debris mobiles",
    fidelity: "inferred",
  }),
  "eau+terre+vent": profile({
    family: "moving-mud",
    noun: "boue mouvante",
    nounEn: "moving mud",
    phase: "liquid-solid-gas",
    defaultLabel: "boue mouvante",
    mechanic: "compose de l'eau, de la terre et du vent en boue mouvante, sediment pluvial ou debris humides",
    fidelity: "inferred",
  }),
  "feu+eau+vent": profile({
    family: "pressurized-steam",
    noun: "vapeur sous pression",
    nounEn: "pressurized steam",
    phase: "gas-energy",
    defaultLabel: "vapeur sous pression",
    mechanic: "compose de l'eau, du feu et du vent en vapeur sous pression ou vapeur chaude",
    fidelity: "inferred",
  }),
  "feu+eau+terre": profile({
    family: "heated-mud",
    noun: "boue chauffee",
    nounEn: "heated mud",
    phase: "liquid-solid-energy",
    defaultLabel: "boue chauffee ou transformation ceramique",
    mechanic: "compose de l'eau, du feu et de la terre en boue chauffee, ceramique ou boue minerale",
    fidelity: "inferred",
  }),
  "feu+terre+vent": profile({
    family: "ash",
    noun: "cendre",
    nounEn: "ash",
    phase: "solid-energy-gas",
    defaultLabel: "cendre ou poussiere chaude",
    mechanic: "compose du feu, de la terre et du vent en cendre, poussiere chaude ou mineral fondu projete",
    fidelity: "inferred",
  }),
  "feu+eau+terre+vent": profile({
    family: "unstable-elemental-mixture",
    noun: "melange elementaire instable",
    nounEn: "unstable elemental mixture",
    phase: "mixed",
    defaultLabel: "melange elementaire instable",
    mechanic: "compose les quatre elements en une manifestation instable determinee par les signes et la dominance",
    fidelity: "experimental",
  }),
});

const BASE_ELEMENT_COLORS = Object.freeze({
  Feu: "#a94a38",
  Eau: "#377da4",
  Terre: "#7b6043",
  Vent: "#5c8b62",
});

const BASE_ELEMENT_LABELS_EN = Object.freeze({
  Feu: "Fire",
  Eau: "Water",
  Terre: "Earth",
  Vent: "Wind",
});

const MIXTURE_TINTS = Object.freeze({
  mud: "#765a3f",
  steam: "#a7bdc1",
  "driven-mist": "#71a3a4",
  "heated-earth": "#9b5738",
  "fire-vortex": "#c16b36",
  dust: "#9a865e",
  "moving-mud": "#66704f",
  "pressurized-steam": "#a9c8cb",
  "heated-mud": "#90543e",
  ash: "#756e65",
  "unstable-elemental-mixture": "#8a7488",
});

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function normalizeBaseCounts(sigilCounts) {
  if (!sigilCounts || typeof sigilCounts !== "object" || Array.isArray(sigilCounts)) return null;
  return BASE_ELEMENT_NAMES
    .filter((name) => Number.isFinite(sigilCounts[name]) && sigilCounts[name] > 0)
    .map((name) => [name, sigilCounts[name]]);
}

function hexChannels(color) {
  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function colorHex(channels) {
  return `#${channels.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function titleCase(value) {
  const text = String(value || "");
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

export const INDEXED_ELEMENTAL_MIXTURES = Object.freeze(
  Object.keys(MIXTURE_PROFILE_DEFINITIONS).map((id) =>
    Object.freeze(id.split("+").map((name) => BASE_ELEMENT_NAMES.find((element) => slug(element) === name))),
  ),
);

export function composeElementalMixture(sigilCounts = {}) {
  const positive = normalizeBaseCounts(sigilCounts);
  if (!positive || positive.length < 2) return null;
  const id = positive.map(([name]) => slug(name)).join("+");
  const materialProfile = MIXTURE_PROFILE_DEFINITIONS[id];
  if (!materialProfile) return null;
  const counts = Object.fromEntries(positive);
  const maximum = Math.max(...positive.map(([, count]) => count));
  const minimum = Math.min(...positive.map(([, count]) => count));
  const dominantElements = positive
    .filter(([, count]) => count === maximum)
    .map(([name]) => name);
  return deepFreeze({
    id,
    elements: positive.map(([name]) => name),
    counts,
    dominantElements,
    dominantElement: dominantElements.length === 1 ? dominantElements[0] : null,
    balance: minimum / maximum,
    intensity: positive.reduce((sum, [, count]) => sum + count, 0) / positive.length,
    fidelity: materialProfile.fidelity,
    ruleId: `material.mix.${id}`,
    materialProfile,
  });
}

export function createElementalMixturePresentation(mixture) {
  if (!mixture?.materialProfile || !Array.isArray(mixture.elements) || mixture.elements.length < 2) {
    return null;
  }
  const total = mixture.elements.reduce((sum, name) => sum + (mixture.counts[name] || 0), 0);
  const elements = mixture.elements.map((name) => ({
    name,
    count: mixture.counts[name],
    weight: Math.round(((mixture.counts[name] || 0) / total) * 10_000) / 10_000,
    color: BASE_ELEMENT_COLORS[name],
  }));
  const weightedChannels = [0, 1, 2].map((channel) =>
    elements.reduce((sum, element) => sum + hexChannels(element.color)[channel] * element.weight, 0),
  );
  const tintChannels = hexChannels(MIXTURE_TINTS[mixture.materialProfile.family] || "#807b74");
  const tintStrength = 0.24 * mixture.balance;
  const color = colorHex(weightedChannels.map((channel, index) =>
    channel * (1 - tintStrength) + tintChannels[index] * tintStrength,
  ));
  const baseLabelFr = titleCase(mixture.materialProfile.noun);
  const baseLabelEn = titleCase(mixture.materialProfile.nounEn);
  const labelFr = mixture.dominantElement
    ? `${baseLabelFr}, dominante ${mixture.dominantElement.toLowerCase()}`
    : baseLabelFr;
  const labelEn = mixture.dominantElement
    ? `${BASE_ELEMENT_LABELS_EN[mixture.dominantElement]}-dominant ${mixture.materialProfile.nounEn}`
    : baseLabelEn;

  return deepFreeze({
    kind: "elemental-mixture",
    id: mixture.id,
    family: mixture.materialProfile.family,
    phase: mixture.materialProfile.phase,
    labelFr,
    labelEn,
    color,
    elements,
    dominantElement: mixture.dominantElement,
    dominantElements: [...mixture.dominantElements],
    balance: mixture.balance,
    intensity: mixture.intensity,
  });
}
