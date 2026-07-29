import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from "../symbol-palette-data.mjs";
import { buildSymbolSearchIndex, searchSymbols } from "../symbol-search.mjs";

const index = buildSymbolSearchIndex(PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES);

const names = (results) => results.map((element) => element.name);

test("l'index couvre les 64 elements et reste fige", () => {
  assert.equal(index.length, 64);
  assert.ok(Object.isFrozen(index));
  assert.ok(Object.isFrozen(index[0]));
});

test("une requete anglaise trouve les elements de vent, exact d'abord", () => {
  // Mesure contre les donnees reelles, pas devinee: Wind est exact (12), les
  // trois autres sont des prefixes (8), departages par ordre de palette.
  assert.deepEqual(names(searchSymbols(index, "wind")), [
    "Vent",
    "Vent sous pied",
    "Signe de vent",
    "Fenetre",
  ]);
});

test("Fenetre repond a 'wind' parce que Window commence par wind", () => {
  // Faux positif reel du choix de conception (prefixe, pas de fuzzy): le nom
  // anglais de Fenetre est "Window". Le test le verrouille pour qu'un
  // changement de classement le rend visible plutot que surprenant.
  assert.ok(names(searchSymbols(index, "wind")).includes("Fenetre"));
  assert.deepEqual(names(searchSymbols(index, "window")), ["Fenetre"]);
});

test("la requete francaise trouve les elements dont le nom commence par vent", () => {
  assert.deepEqual(names(searchSymbols(index, "vent")), [
    "Vent",
    "Vent sous pied",
    "Vent tourbillonnant",
  ]);
});

test("les accents de la requete sont relies sur les noms stockes", () => {
  assert.deepEqual(names(searchSymbols(index, "fumee")), ["Fumee"]);
  assert.deepEqual(names(searchSymbols(index, "fumée")), ["Fumee"]);
});

test("une rune exacte passe devant les correspondances par prefixe", () => {
  // FE est la rune de Feu et n'est partagee avec rien. Fenetre suit par
  // prefixe uniquement.
  assert.deepEqual(names(searchSymbols(index, "fe")), ["Feu", "Fenetre"]);
});

test("une rune partagee rend les deux elements, departages par ordre de palette", () => {
  // Six runes sont partagees entre un sigil et un signe. SV en fait partie:
  // Sangsue-valance (index 10) et Signe de vent (index 43) marquent toutes
  // deux exact, donc l'ordre de palette tranche. Une rune n'identifie pas
  // toujours un seul element.
  assert.deepEqual(names(searchSymbols(index, "sv")), ["Sangsue-valance", "Signe de vent"]);
});

test("une requete vide rend les 64 elements dans l'ordre de la palette", () => {
  const results = searchSymbols(index, "");
  assert.equal(results.length, 64);
  assert.deepEqual(names(results), PALETTE_ELEMENTS.map((element) => element.name));
  assert.deepEqual(names(searchSymbols(index, "   ")), names(results));
});

test("une requete absurde ne rend rien", () => {
  assert.deepEqual(searchSymbols(index, "zzzzqx"), []);
});

test("la limite tronque sans changer l'ordre", () => {
  const results = searchSymbols(index, "", 5);
  assert.deepEqual(names(results), PALETTE_ELEMENTS.slice(0, 5).map((element) => element.name));
});
