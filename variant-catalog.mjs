import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
  SIGN_PROFILES,
  composeSpellRecipe,
} from "./spell-grammar.mjs";

export const VARIANT_PAGE_SIZE = 50;

export const ENGLISH_ELEMENT_NAMES = Object.freeze({
  Feu: "Fire", Eau: "Water", Terre: "Earth", Vent: "Wind", Lumiere: "Light",
  Cristal: "Crystal", Aeriforme: "Aeriform", "Vent sous pied": "Wind underfoot",
  Repetition: "Repetition", Colonne: "Column", Dispersion: "Dispersion",
  Levitation: "Levitation", Traction: "Pull", Region: "Region",
  Convergence: "Convergence", Collection: "Collection", Nuage: "Billow",
  Crush: "Crush", Pantin: "Puppet", Flottement: "Float",
  Etirement: "Stretch Weave", "Spire physique": "Physical coil",
  Refroidissement: "Cooling", Renforcement: "Strengthen", Cible: "Sights",
  Enlacement: "Entwine", "Signe de vent": "Wind sign",
  "Aeriforme defini": "Defined aeriform", Rassemblement: "Gathering",
  Glaives: "Depth", Solidification: "Solidification", Lien: "Link",
  Arret: "Bind", Enveloppe: "Wrap", Dissimulation: "Concealment",
  Reflection: "Reflection", Diamant: "Diamond", Fenetre: "Window",
  Agrandissement: "Expansion", Viseur: "Crosshair", Radial: "Radial",
  Projectile: "Bolt", Pluie: "Rain", Orbe: "Orb",
  Purification: "Purification", Immobilite: "Stillness", Projection: "Projection",
});

export const DEFAULT_EXPLORER_STATE = Object.freeze({
  search: "",
  sigil: "all",
  sign: "all",
  role: "all",
  support: "all",
  fidelity: "all",
  warnings: "all",
  effect: "all",
  sort: "relevance",
  page: 1,
});

const FIDELITY_ORDER = Object.freeze({ documented: 0, inferred: 1, experimental: 2 });
const SUPPORTS = Object.freeze(["none", "shoe"]);
const SORTS = Object.freeze(["relevance", "name", "fidelity", "id"]);
const WARNING_FILTERS = Object.freeze(["all", "with", "without"]);
const ROLES = Object.freeze([...new Set(Object.values(SIGN_PROFILES).map(({ role }) => role))]);

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinAtMostOne(left, right) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + Number(i < left.length || j < right.length) <= 1;
}

function tokenScore(query, candidate) {
  if (query === candidate) return 12;
  if (candidate.startsWith(query)) return 8;
  if (query.length >= 4 && levenshteinAtMostOne(query, candidate)) return 4;
  return 0;
}

function searchScore(record, search) {
  const queries = normalizeSearchText(search).split(" ").filter(Boolean);
  if (!queries.length) return 0;
  const candidates = record.searchText.split(" ");
  let total = 0;
  for (const query of queries) {
    const best = Math.max(0, ...candidates.map((candidate) => tokenScore(query, candidate)));
    if (!best) return -1;
    total += best;
  }
  return total;
}

function makeSearchText(sigil, signs, supportId, recipe) {
  const values = [
    sigil,
    ENGLISH_ELEMENT_NAMES[sigil],
    ...signs,
    ...signs.map((name) => ENGLISH_ELEMENT_NAMES[name]),
    supportId,
    supportId === "shoe" ? "shoe chaussure flying volante sole semelle" : "none aucun paper papier",
    recipe.fidelity,
    recipe.effectPlan.layers.join(" "),
    ...signs.map((name) => SIGN_PROFILES[name]?.role),
  ];
  return normalizeSearchText(values.filter(Boolean).join(" "));
}

export function buildVariantIndex() {
  const records = [];
  for (const supportId of SUPPORTS) {
    for (const sigil of MATRIX_SIGIL_NAMES) {
      for (let first = 0; first < MATRIX_SIGN_NAMES.length; first += 1) {
        for (let second = first; second < MATRIX_SIGN_NAMES.length; second += 1) {
          const signs = [MATRIX_SIGN_NAMES[first], MATRIX_SIGN_NAMES[second]];
          const recipe = composeSpellRecipe({ sigils: [sigil], signs, supportId, direction: "vers le haut" });
          records.push(Object.freeze({
            id: recipe.id,
            sigil,
            signs: Object.freeze(signs),
            supportId,
            fidelity: recipe.fidelity,
            warningCount: recipe.warnings.length,
            effectCategory: recipe.effectPlan.layers[0] || recipe.materialProfile.family,
            planKey: recipe.effectPlan.pipeline.join("|"),
            roles: Object.freeze([...new Set(signs.map((name) => SIGN_PROFILES[name].role))]),
            searchText: makeSearchText(sigil, signs, supportId, recipe),
          }));
        }
      }
    }
  }
  return Object.freeze(records);
}

export function getVariantDetail(record) {
  const recipe = composeSpellRecipe({
    sigils: [record.sigil],
    signs: [...record.signs],
    supportId: record.supportId,
    direction: "vers le haut",
  });
  if (recipe.id !== record.id) throw new Error(`Variant identity mismatch: ${record.id}`);
  return Object.freeze({
    id: recipe.id,
    sigil: record.sigil,
    signs: [...record.signs],
    supportId: recipe.supportId,
    label: recipe.label,
    fidelity: recipe.fidelity,
    confidence: recipe.confidence,
    operations: recipe.operations,
    pipeline: [...recipe.effectPlan.pipeline],
    ruleIds: [...recipe.ruleIds],
    mechanics: [...recipe.mechanics],
    combinedEffects: [...recipe.combinedEffects],
    ignoredSigns: [...recipe.ignoredSigns],
    warnings: [...recipe.warnings],
    supportPlan: recipe.supportPlan,
  });
}

function validOr(value, choices, fallback = "all") {
  return choices.includes(value) ? value : fallback;
}

export function parseExplorerState(params) {
  const source = params instanceof URLSearchParams ? params : new URLSearchParams(params || "");
  const page = Number.parseInt(source.get("page") || "1", 10);
  return {
    search: String(source.get("q") || "").trim().slice(0, 120),
    sigil: validOr(source.get("sigil"), MATRIX_SIGIL_NAMES),
    sign: validOr(source.get("sign"), MATRIX_SIGN_NAMES),
    role: validOr(source.get("role"), ROLES),
    support: validOr(source.get("support"), SUPPORTS),
    fidelity: validOr(source.get("fidelity"), Object.keys(FIDELITY_ORDER)),
    warnings: validOr(source.get("warnings"), WARNING_FILTERS),
    effect: normalizeSearchText(source.get("effect") || "") || "all",
    sort: validOr(source.get("sort"), SORTS, "relevance"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function serializeExplorerState(state) {
  const normalized = { ...DEFAULT_EXPLORER_STATE, ...state };
  const params = new URLSearchParams();
  const keys = { search: "q", sigil: "sigil", sign: "sign", role: "role", support: "support", fidelity: "fidelity", warnings: "warnings", effect: "effect", sort: "sort", page: "page" };
  for (const [key, parameter] of Object.entries(keys)) {
    if (normalized[key] !== DEFAULT_EXPLORER_STATE[key]) params.set(parameter, String(normalized[key]));
  }
  return params;
}

export function queryVariants(records, state = DEFAULT_EXPLORER_STATE) {
  const requested = { ...DEFAULT_EXPLORER_STATE, ...state };
  const ranked = [];
  for (const record of records) {
    if (requested.sigil !== "all" && record.sigil !== requested.sigil) continue;
    if (requested.sign !== "all" && !record.signs.includes(requested.sign)) continue;
    if (requested.role !== "all" && !record.roles.includes(requested.role)) continue;
    if (requested.support !== "all" && record.supportId !== requested.support) continue;
    if (requested.fidelity !== "all" && record.fidelity !== requested.fidelity) continue;
    if (requested.warnings === "with" && record.warningCount === 0) continue;
    if (requested.warnings === "without" && record.warningCount > 0) continue;
    if (requested.effect !== "all" && normalizeSearchText(record.effectCategory) !== normalizeSearchText(requested.effect)) continue;
    const score = searchScore(record, requested.search);
    if (score < 0) continue;
    ranked.push({ record, score });
  }

  const compareName = (left, right) => `${left.sigil}|${left.signs.join("|")}|${left.supportId}`.localeCompare(`${right.sigil}|${right.signs.join("|")}|${right.supportId}`, "en");
  ranked.sort((left, right) => {
    if (requested.sort === "id") return left.record.id.localeCompare(right.record.id);
    if (requested.sort === "fidelity") return FIDELITY_ORDER[left.record.fidelity] - FIDELITY_ORDER[right.record.fidelity] || compareName(left.record, right.record);
    if (requested.sort === "name") return compareName(left.record, right.record);
    return right.score - left.score || compareName(left.record, right.record);
  });

  const filtered = ranked.length;
  const pageCount = Math.max(1, Math.ceil(filtered / VARIANT_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(requested.page) || 1), pageCount);
  const start = (page - 1) * VARIANT_PAGE_SIZE;
  return {
    total: records.length,
    filtered,
    page,
    pageCount,
    records: ranked.slice(start, start + VARIANT_PAGE_SIZE).map(({ record }) => record),
  };
}
