// daily-spell.mjs
// Tirage deterministe du "sort du jour" : a date egale, tout le monde obtient
// le meme sort, sans serveur. Le rang plat suit exactement l'ordre de
// buildVariantIndex() (support x materiau x paire de signes) ; le test
// daily-spell epingle cette correspondance contre l'index complet.

import { MATRIX_SIGN_NAMES, composeSpellRecipe } from "./spell-grammar.mjs";
import { MATERIAL_SIGNATURES, VARIANT_SUPPORTS } from "./variant-catalog.mjs";

export function dailyDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// FNV-1a 32 bits : stable entre plateformes et entre sessions.
export function dailySeed(dateKey) {
  let hash = 0x811c9dc5;
  const text = `wha-daily:${dateKey}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function dailyPairCount() {
  const signCount = MATRIX_SIGN_NAMES.length;
  return (signCount * (signCount + 1)) / 2;
}

export function dailyVariantTotal() {
  return VARIANT_SUPPORTS.length * MATERIAL_SIGNATURES.length * dailyPairCount();
}

export function dailyFlatIndex(dateKey) {
  return dailySeed(dateKey) % dailyVariantTotal();
}

// Decompose le rang plat selon l'ordre des boucles de buildVariantIndex :
// support, puis materiau, puis paire de signes (first <= second).
export function dailyPick(date = new Date()) {
  const dateKey = dailyDateKey(date);
  const flatIndex = dailyFlatIndex(dateKey);
  const pairCount = dailyPairCount();
  const pairIndex = flatIndex % pairCount;
  const materialIndex = Math.floor(flatIndex / pairCount) % MATERIAL_SIGNATURES.length;
  const supportIndex = Math.floor(flatIndex / (pairCount * MATERIAL_SIGNATURES.length));
  let remaining = pairIndex;
  let first = 0;
  while (remaining >= MATRIX_SIGN_NAMES.length - first) {
    remaining -= MATRIX_SIGN_NAMES.length - first;
    first += 1;
  }
  const second = first + remaining;
  const sigils = [...MATERIAL_SIGNATURES[materialIndex]];
  const signs = [MATRIX_SIGN_NAMES[first], MATRIX_SIGN_NAMES[second]];
  const supportId = VARIANT_SUPPORTS[supportIndex];
  const recipe = composeSpellRecipe({ sigils, signs, supportId, direction: "vers le haut" });
  return Object.freeze({
    dateKey,
    flatIndex,
    sigils: Object.freeze(sigils),
    signs: Object.freeze(signs),
    supportId,
    recipeId: recipe.id,
    fidelity: recipe.fidelity,
  });
}
