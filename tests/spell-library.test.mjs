import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_MY_SPELLS,
  SPELL_LIBRARY_STORAGE_KEY,
  createSpell,
  deleteMySpell,
  loadMySpells,
  saveMySpells,
} from "../spell-library.mjs";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

const SAMPLE_ACTIONS = [
  { type: "ring", label: "Anneau", element: "Structure", charge: 0, color: "#243044", width: 2, cx: 100, cy: 100, radius: 80 },
  { type: "glyph", label: "Glyphe", element: "Feu", charge: 1, kind: "sigil", category: "Sigil", color: "#243044", width: 2, x: 100, y: 60, size: 24, rune: "feu", rotation: 0, sector: 6 },
  { type: "free", color: "#243044", width: 2, points: [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }] },
];

test("aller-retour sauvegarde puis chargement", () => {
  const storage = fakeStorage();
  const spell = createSpell({ name: "Torche", actions: SAMPLE_ACTIONS, intensity: 4, stroke: 5 });
  saveMySpells(storage, [spell]);
  const loaded = loadMySpells(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].name, "Torche");
  assert.equal(loaded[0].intensity, 4);
  assert.equal(loaded[0].stroke, 5);
  assert.equal(loaded[0].actions.length, 3);
  assert.equal(loaded[0].actions[1].rune, "feu");
  assert.equal(loaded[0].actions[1].sector, 6);
  assert.equal(loaded[0].actions[2].points.length, 3);
});

test("les actions invalides et les cles superflues sont ecartees", () => {
  const storage = fakeStorage();
  const spell = createSpell({
    name: "Propre",
    actions: [
      { type: "unknown", x: 1 },
      { type: "glyph", element: "Eau", x: 5, y: 5, size: 20, onpointerdown: "evil()", points: "not-an-array" },
      { type: "free", points: [{ x: 0, y: 0 }] },
    ],
    intensity: 99,
    stroke: -3,
  });
  saveMySpells(storage, [spell]);
  const [loaded] = loadMySpells(storage);
  assert.equal(loaded.actions.length, 1, "une seule action valide");
  assert.equal(loaded.actions[0].onpointerdown, undefined);
  assert.equal(loaded.actions[0].points, undefined, "pas de points sur un glyph");
  assert.equal(loaded.intensity, 5, "intensite bornee a 5");
  assert.equal(loaded.stroke, 1, "trait borne a 1");
});

test("un sort sans action valide est refuse", () => {
  assert.throws(() => createSpell({ name: "Vide", actions: [{ type: "nope" }] }), TypeError);
});

test("la capacite est bornee et les plus anciens sortent", () => {
  const storage = fakeStorage();
  const spells = [];
  for (let i = 0; i < MAX_MY_SPELLS + 3; i += 1) {
    spells.push(createSpell({ name: `Sort ${i}`, actions: SAMPLE_ACTIONS, intensity: 3, stroke: 3 }));
  }
  const saved = saveMySpells(storage, spells);
  assert.equal(saved.length, MAX_MY_SPELLS);
  assert.equal(saved[saved.length - 1].name, `Sort ${MAX_MY_SPELLS - 1}`);
});

test("suppression par identifiant", () => {
  const storage = fakeStorage();
  const keep = createSpell({ name: "Garder", actions: SAMPLE_ACTIONS, intensity: 3, stroke: 3 }, { id: "spell-a" });
  const drop = createSpell({ name: "Jeter", actions: SAMPLE_ACTIONS, intensity: 3, stroke: 3 }, { id: "spell-b" });
  saveMySpells(storage, [keep, drop]);
  const remaining = deleteMySpell(loadMySpells(storage), "spell-b");
  saveMySpells(storage, remaining);
  const loaded = loadMySpells(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, "spell-a");
});

test("un contenu localStorage corrompu retourne une liste vide", () => {
  const storage = fakeStorage();
  storage.setItem(SPELL_LIBRARY_STORAGE_KEY, "{casse");
  assert.deepEqual(loadMySpells(storage), []);
  storage.setItem(SPELL_LIBRARY_STORAGE_KEY, JSON.stringify({ not: "array" }));
  assert.deepEqual(loadMySpells(storage), []);
  storage.setItem(SPELL_LIBRARY_STORAGE_KEY, JSON.stringify([{ id: "x", actions: [] }, null, { id: "y", actions: SAMPLE_ACTIONS }]));
  const loaded = loadMySpells(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, "y");
});

test("le nom est borne et defaut applique", () => {
  const spell = createSpell({ name: `  ${"tres".repeat(40)} long  `, actions: SAMPLE_ACTIONS, intensity: 3, stroke: 3 });
  assert.ok(spell.name.length <= 80);
  const unnamed = createSpell({ actions: SAMPLE_ACTIONS, intensity: 3, stroke: 3 });
  assert.equal(unnamed.name, "Sort");
});
