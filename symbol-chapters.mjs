// symbol-chapters.mjs
// Premier chapitre manga documente pour chaque symbole (source : wiki Telepedia,
// sections Sigils_Explained / Signs_Explained et pages de sorts, collecte du
// 2026-07-31). Sert au filtre anti-spoiler : un lecteur qui declare son chapitre
// ne voit que les symboles deja apparus.
//
// - null : symbole sans chapitre identifiable (reference anime, artbook ou
//   reseau social uniquement) ; toujours visible, car impossible a dater.
// - Certains chapitres bas (1-2) viennent de la premiere apparition du *sort*
//   plutot que de l'identification du glyphe : le filtre reste indicatif.

export const SPOILER_MAX_CHAPTER = 94;

export const SYMBOL_FIRST_CHAPTER = Object.freeze({
  // Sigils
  Feu: 5,
  Eau: 5,
  Terre: 5,
  Vent: 5,
  Lumiere: 3,
  Cristal: 18,
  Aeriforme: 30,
  "Vent sous pied": 1,
  Repetition: 7,
  Fumee: 91,
  "Sangsue-valance": 78,
  Frillram: null,
  Epee: null,
  "Loup-ecaille": 58,
  "Cerf-torche": 58,
  "Chevre-lion": 58,
  "Chat-hibou": null,
  "Tete de chat-hibou": 58,
  Dragon: 58,
  Fleur: 58,
  Cheval: 46,
  "Oiseau A": 11,
  "Oiseau B": 11,
  "Arret temporel": 45,
  "Vent tourbillonnant": 1,
  "Flammes sans chaleur": 43,
  Guidage: 64,
  Appel: 34,
  "Lumiere vacillante": 1,
  // Signes
  Colonne: 3,
  Dispersion: 1,
  Levitation: 4,
  Traction: 14,
  Region: 6,
  Convergence: 7,
  Collection: 7,
  Nuage: 6,
  Crush: 6,
  Pantin: 43,
  Flottement: 1,
  Etirement: 18,
  "Spire physique": null,
  Refroidissement: 2,
  Renforcement: 11,
  Cible: 6,
  Enlacement: 11,
  "Signe de vent": 1,
  "Aeriforme defini": 1,
  Rassemblement: 2,
  Glaives: 63,
  Solidification: 12,
  Lien: 46,
  Arret: 12,
  Enveloppe: 1,
  Dissimulation: 17,
  Reflection: 19,
  Diamant: 45,
  Selection: 37,
  Agrandissement: 7,
  Viseur: 8,
  Radial: 18,
  Projectile: 24,
  Pluie: 20,
  Orbe: 53,
  Purification: 61,
  Immobilite: 94,
  Projection: 19,
  Lancement: 11,
  Fenetres: 29,
});

// chapter : null/undefined -> filtre inactif, tout est visible.
export function isSymbolVisibleAtChapter(name, chapter) {
  if (chapter === null || chapter === undefined) {
    return true;
  }
  const first = SYMBOL_FIRST_CHAPTER[name];
  return first === null || first === undefined || first <= chapter;
}

// Une variante (recette de la bibliotheque) reste visible tant que TOUS ses
// symboles sont visibles : un seul symbole trop tardif la masque entierement.
export function isVariantVisibleAtChapter(record, chapter) {
  if (chapter === null || chapter === undefined) {
    return true;
  }
  const symbols = [...(record.sigils || []), ...(record.signs || [])];
  return symbols.every((name) => isSymbolVisibleAtChapter(name, chapter));
}

export function clampSpoilerChapter(value) {
  const chapter = Number(value);
  if (!Number.isFinite(chapter)) {
    return 1;
  }
  return Math.min(SPOILER_MAX_CHAPTER, Math.max(1, Math.round(chapter)));
}

// Lit le reglage partage (atelier + bibliotheque). Storage-compatible avec une
// Map pour les tests. Retourne null quand le filtre est inactif.
export function readSpoilerChapter(storage) {
  if (!storage || storage.getItem("whaSpoilerEnabled") !== "true") {
    return null;
  }
  return clampSpoilerChapter(storage.getItem("whaSpoilerChapter") || SPOILER_MAX_CHAPTER);
}

export function writeSpoilerChapter(storage, enabled, chapter) {
  storage.setItem("whaSpoilerEnabled", enabled ? "true" : "false");
  storage.setItem("whaSpoilerChapter", String(clampSpoilerChapter(chapter ?? SPOILER_MAX_CHAPTER)));
}
