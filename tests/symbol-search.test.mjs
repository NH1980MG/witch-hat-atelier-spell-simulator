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
  // deux autres sont des prefixes (8), departages par ordre de palette.
  assert.deepEqual(names(searchSymbols(index, "wind")), [
    "Vent",
    "Vent sous pied",
    "Signe de vent",
  ]);
});

test("le faux positif 'window' a disparu avec le renommage amont", () => {
  // Ce test verrouillait autrefois un faux positif reel du choix de conception
  // (prefixe, pas de fuzzy): l'element FW s'appelait "Fenetre" / "Window", donc
  // il repondait a "wind". Amont l'a renomme Selection / SE pour coller au wiki
  // Telepedia, ce qui supprime la collision. On verrouille l'absence, sinon un
  // retour en arriere sur les donnees repasserait inapercu.
  assert.deepEqual(names(searchSymbols(index, "window")), []);
  assert.ok(!names(searchSymbols(index, "wind")).includes("Selection"));
  assert.deepEqual(names(searchSymbols(index, "se")), ["Selection"]);
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
  // FE est la rune de Feu et n'est partagee avec rien. Depuis le renommage
  // amont de Fenetre en Selection, plus aucun nom ne commence par "fe", donc
  // la rune exacte est seule.
  assert.deepEqual(names(searchSymbols(index, "fe")), ["Feu"]);
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

test("le departage utilise l'ordre de palette, pas l'ordre du tableau", () => {
  // L'index reel est toujours construit dans l'ordre de la palette, donc le tri
  // stable de JavaScript donnerait le bon resultat meme sans terme de
  // departage. On construit ici un index volontairement desordonne: seul le
  // comparateur peut alors rendre l'ordre de palette.
  const shuffled = [...index].reverse();
  const results = searchSymbols(shuffled, "sv");

  assert.deepEqual(
    results.map((element) => element.name),
    ["Sangsue-valance", "Signe de vent"],
    "sans le terme a.record.order - b.record.order, l'ordre inverse ressortirait",
  );
});

test("la limite s'applique aussi aux resultats classes", () => {
  assert.deepEqual(names(searchSymbols(index, "vent", 2)), ["Vent", "Vent sous pied"]);
});
