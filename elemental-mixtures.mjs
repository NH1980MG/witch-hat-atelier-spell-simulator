const profile = (value) => Object.freeze(value);

export const BASE_ELEMENT_NAMES = Object.freeze(["Feu", "Eau", "Terre", "Vent"]);

const MIXTURE_PROFILE_DEFINITIONS = Object.freeze({
  "eau+terre": profile({
    family: "mud",
    noun: "boue",
    phase: "liquid-solid",
    defaultLabel: "boue ou sediment humide",
    mechanic: "compose de l'eau et de la terre en boue, argile ou sediment humide",
    fidelity: "inferred",
  }),
  "feu+eau": profile({
    family: "steam",
    noun: "vapeur",
    phase: "gas",
    defaultLabel: "vapeur chaude",
    mechanic: "compose de l'eau et du feu en vapeur ou brume chaude",
    fidelity: "inferred",
  }),
  "eau+vent": profile({
    family: "driven-mist",
    noun: "brume",
    phase: "liquid-gas",
    defaultLabel: "brume ou pluie poussee",
    mechanic: "compose de l'eau et du vent en brume, projection ou pluie poussee",
    fidelity: "inferred",
  }),
  "feu+terre": profile({
    family: "heated-earth",
    noun: "terre chauffee",
    phase: "solid-energy",
    defaultLabel: "terre chauffee ou argile cuite",
    mechanic: "compose du feu et de la terre en terre chauffee, argile cuite ou mineral fondu",
    fidelity: "inferred",
  }),
  "feu+vent": profile({
    family: "fire-vortex",
    noun: "flamme",
    phase: "energy-gas",
    defaultLabel: "flamme entrainee",
    mechanic: "compose du feu et du vent en flamme entrainee ou vortex de feu",
    fidelity: "inferred",
  }),
  "terre+vent": profile({
    family: "dust",
    noun: "poussiere",
    phase: "solid-gas",
    defaultLabel: "poussiere ou sable en mouvement",
    mechanic: "compose de la terre et du vent en poussiere, sable ou debris mobiles",
    fidelity: "inferred",
  }),
  "eau+terre+vent": profile({
    family: "moving-mud",
    noun: "boue mouvante",
    phase: "liquid-solid-gas",
    defaultLabel: "boue mouvante",
    mechanic: "compose de l'eau, de la terre et du vent en boue mouvante, sediment pluvial ou debris humides",
    fidelity: "inferred",
  }),
  "feu+eau+vent": profile({
    family: "pressurized-steam",
    noun: "vapeur sous pression",
    phase: "gas-energy",
    defaultLabel: "vapeur sous pression",
    mechanic: "compose de l'eau, du feu et du vent en vapeur sous pression ou vapeur chaude",
    fidelity: "inferred",
  }),
  "feu+eau+terre": profile({
    family: "heated-mud",
    noun: "boue chauffee",
    phase: "liquid-solid-energy",
    defaultLabel: "boue chauffee ou transformation ceramique",
    mechanic: "compose de l'eau, du feu et de la terre en boue chauffee, ceramique ou boue minerale",
    fidelity: "inferred",
  }),
  "feu+terre+vent": profile({
    family: "ash",
    noun: "cendre",
    phase: "solid-energy-gas",
    defaultLabel: "cendre ou poussiere chaude",
    mechanic: "compose du feu, de la terre et du vent en cendre, poussiere chaude ou mineral fondu projete",
    fidelity: "inferred",
  }),
  "feu+eau+terre+vent": profile({
    family: "unstable-elemental-mixture",
    noun: "melange elementaire instable",
    phase: "mixed",
    defaultLabel: "melange elementaire instable",
    mechanic: "compose les quatre elements en une manifestation instable determinee par les signes et la dominance",
    fidelity: "experimental",
  }),
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
  const inputNames = Object.keys(sigilCounts);
  if (inputNames.some((name) => !BASE_ELEMENT_NAMES.includes(name))) return null;
  const positive = BASE_ELEMENT_NAMES
    .filter((name) => Number.isFinite(sigilCounts[name]) && sigilCounts[name] > 0)
    .map((name) => [name, sigilCounts[name]]);
  return positive;
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
