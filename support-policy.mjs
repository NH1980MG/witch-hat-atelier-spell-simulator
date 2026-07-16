import { SUPPORTED_SUPPORT_IDS } from "./spell-model.mjs";

export const SUPPORT_LIMITS = Object.freeze({
  shoeMaxDiameter: 0.35,
});

const SUPPORT_POLICIES = Object.freeze({
  none: Object.freeze({
    id: "none",
    carrier: "none",
    activation: "closed-ring",
    origin: "paper",
  }),
  shoe: Object.freeze({
    id: "shoe",
    carrier: "shoe-pair",
    activation: "split-sole-ring",
    origin: "under-sole-paper",
  }),
});

const SIGIL_FAMILIES = Object.freeze({
  Feu: "fire",
  Eau: "water",
  Terre: "earth",
  Vent: "wind",
  Lumiere: "light",
  Cristal: "crystal",
  Aeriforme: "air",
  "Vent sous pied": "wind",
  Repetition: "repetition",
  Fumee: "smoke",
  "Sangsue-valance": "valance-leech",
  Frillram: "frillram",
  Epee: "sword",
  "Loup-ecaille": "scalewolf",
  "Cerf-torche": "torchstag",
  "Chevre-lion": "liongoat",
  "Chat-hibou": "owlcat",
  "Tete de chat-hibou": "owlcat-head",
  Dragon: "dragon",
  Fleur: "flower",
  Cheval: "horse",
  "Oiseau A": "bird-a",
  "Oiseau B": "bird-b",
  "Arret temporel": "time-stop",
  "Vent tourbillonnant": "whorling-wind",
  "Flammes sans chaleur": "unburning-fire",
});

const SURFACE_EFFECTS = Object.freeze({
  Feu: "fire-scorch",
  Eau: "water-puddle",
  Terre: "earth-grounded-growth",
  Vent: "wind-surface-flow",
  Lumiere: "light-halo",
  Cristal: "crystal-growth",
  Aeriforme: "air-cushion",
  "Vent sous pied": "wind-lift",
  Repetition: "repetition-pulse",
  Fumee: "smoke-cloud",
  "Sangsue-valance": "valance-leech-form",
  Frillram: "frillram-form",
  Epee: "sword-form",
  "Loup-ecaille": "scalewolf-form",
  "Cerf-torche": "torchstag-form",
  "Chevre-lion": "liongoat-form",
  "Chat-hibou": "owlcat-form",
  "Tete de chat-hibou": "owlcat-head-form",
  Dragon: "dragon-form",
  Fleur: "flower-form",
  Cheval: "horse-form",
  "Oiseau A": "bird-a-form",
  "Oiseau B": "bird-b-form",
  "Arret temporel": "time-stop-field",
  "Vent tourbillonnant": "whorling-wind-flow",
  "Flammes sans chaleur": "unburning-fire-glow",
});

export function getSupportPolicy(id = "none") {
  if (!SUPPORTED_SUPPORT_IDS.includes(id)) {
    throw new TypeError(`Unknown support: ${id}`);
  }
  return SUPPORT_POLICIES[id];
}

function familyId(primarySigil) {
  return SIGIL_FAMILIES[primarySigil] || "raw-energy";
}

function surfaceEffectId(primarySigil) {
  return SURFACE_EFFECTS[primarySigil] || "raw-energy-pulse";
}

function finishPlan(policy, values) {
  return Object.freeze({
    supportId: policy.id,
    carrier: policy.carrier,
    activation: policy.activation,
    origin: policy.origin,
    mode: "surface-manifestation",
    movesCarrier: false,
    stable: true,
    hazard: false,
    fidelity: "documented",
    ruleIds: [],
    effectIds: [],
    valid: true,
    issue: null,
    ...values,
  });
}

export function composeSupportPlan({
  supportId = "none",
  primarySigil = null,
  operations = [],
  diameter = null,
} = {}) {
  const policy = getSupportPolicy(supportId);
  const normalizedOperations = [...new Set(operations.filter(Boolean))];
  const has = (operation) => normalizedOperations.includes(operation);

  if (supportId === "none") {
    return finishPlan(policy, {
      mode: "paper-origin",
      fidelity: "documented",
      ruleIds: ["ring.closed", "support.paper-origin"],
    });
  }

  if (Number.isFinite(diameter) && diameter > SUPPORT_LIMITS.shoeMaxDiameter) {
    return finishPlan(policy, {
      stable: false,
      fidelity: "documented",
      ruleIds: ["support.shoe-size"],
      valid: false,
      issue: "shoe-diameter",
    });
  }

  if (primarySigil === "Vent sous pied" && has("focus") && has("lift")) {
    return finishPlan(policy, {
      mode: "sylph-flight",
      movesCarrier: true,
      stable: true,
      fidelity: "documented",
      ruleIds: ["shoe.split-ring", "shoe.wind-underfoot", "shoe.convergence-levitation"],
      effectIds: ["wind-lift"],
    });
  }

  if (has("lift") || has("float") || has("carrier")) {
    const hazard = primarySigil === "Feu";
    return finishPlan(policy, {
      mode: "carrier-lift",
      movesCarrier: true,
      stable: !hazard,
      hazard,
      fidelity: "inferred",
      ruleIds: ["support.carrier-target"],
      effectIds: [`${familyId(primarySigil)}-carrier-lift`],
    });
  }

  const hazard = primarySigil === "Feu";
  return finishPlan(policy, {
    mode: "surface-manifestation",
    movesCarrier: false,
    stable: !hazard,
    hazard,
    fidelity: "experimental",
    ruleIds: ["support.surface-origin"],
    effectIds: [surfaceEffectId(primarySigil)],
  });
}
