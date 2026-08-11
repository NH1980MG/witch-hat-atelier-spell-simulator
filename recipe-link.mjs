export const RECIPE_LINK_LIMITS = Object.freeze({
  maxSigils: 4,
  maxSigns: 3,
});

function cleanNames(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return list.map((name) => String(name).trim()).filter(Boolean);
}

function cleanLibraryId(value) {
  const id = String(value || "").trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ? id : null;
}

export function buildRecipeHref(recipe = {}, base = "index.html") {
  const sigils = cleanNames(recipe.sigils).slice(0, RECIPE_LINK_LIMITS.maxSigils);
  if (sigils.length === 0) {
    throw new TypeError("A recipe link needs at least one sigil.");
  }
  const signs = cleanNames(recipe.signs).slice(0, RECIPE_LINK_LIMITS.maxSigns);
  const params = new URLSearchParams();
  params.set("sigils", sigils.join(","));
  if (signs.length > 0) {
    params.set("signs", signs.join(","));
  }
  if (recipe.supportId === "shoe") {
    params.set("support", "shoe");
  }
  if (recipe.activate) {
    params.set("activate", "1");
  }
  const libraryId = cleanLibraryId(recipe.libraryId);
  if (libraryId) {
    params.set("library", libraryId);
  }
  if (recipe.ritualId) {
    params.set("ritual", String(recipe.ritualId));
  }
  return `${base}?${params.toString()}`;
}

export function parseRecipeParams(search, { sigilNames = [], signNames = [], libraryIds = [] } = {}) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || "");
  if (!params.get("sigils")) {
    return null;
  }
  const allowedSigils = new Set(sigilNames);
  const allowedSigns = new Set(signNames);
  const sigils = cleanNames(params.get("sigils"))
    .filter((name) => allowedSigils.has(name))
    .slice(0, RECIPE_LINK_LIMITS.maxSigils);
  if (sigils.length === 0) {
    return null;
  }
  const signs = cleanNames(params.get("signs"))
    .filter((name) => allowedSigns.has(name))
    .slice(0, RECIPE_LINK_LIMITS.maxSigns);
  const supportId = params.get("support") === "shoe" ? "shoe" : "none";
  const activate = ["1", "true"].includes(String(params.get("activate") || "").toLowerCase());
  const requestedLibraryId = cleanLibraryId(params.get("library"));
  const libraryId = new Set(libraryIds).has(requestedLibraryId) ? requestedLibraryId : null;
  const ritualId = params.get("ritual") === "opening-petrification" ? "opening-petrification" : null;
  return Object.freeze({
    sigils: Object.freeze(sigils),
    signs: Object.freeze(signs),
    supportId,
    activate,
    libraryId,
    ritualId,
  });
}
