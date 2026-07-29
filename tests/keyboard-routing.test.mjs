import test from "node:test";
import assert from "node:assert/strict";
import { resolveKeyCommand } from "../keyboard-routing.mjs";

const IDLE = Object.freeze({
  isTyping: false,
  searchOpen: false,
  view3dOpen: false,
  drawerOpen: false,
  hasSelection: false,
  guideSelected: false,
  armed: false,
});

const press = (key, overrides = {}, context = {}) =>
  resolveKeyCommand(
    { key, metaKey: false, ctrlKey: false, shiftKey: false, ...overrides },
    { ...IDLE, ...context },
  );

test("la superposition ouverte neutralise toute la carte des raccourcis", () => {
  const context = { searchOpen: true, hasSelection: true };
  for (const [key, overrides] of [
    ["Escape", {}],
    ["z", { metaKey: true }],
    ["s", { metaKey: true }],
    ["d", { metaKey: true }],
    ["a", {}],
    ["l", {}],
    ["Delete", {}],
    ["Backspace", {}],
    ["+", {}],
  ]) {
    assert.equal(
      press(key, overrides, context).command,
      "none",
      `${key} doit etre neutralise pendant que la superposition est ouverte`,
    );
  }
});

test("la porte modale precede le garde de saisie et le bloc modificateur", () => {
  assert.equal(press("z", { metaKey: true }, { searchOpen: true, isTyping: false }).command, "none");
  assert.equal(press("z", { metaKey: true }).command, "undo");
});

test("les nouveaux raccourcis sont relies et neutralisent le navigateur", () => {
  assert.deepEqual(press("k", { metaKey: true }), { command: "openSearch", preventDefault: true });
  assert.deepEqual(press("k", { ctrlKey: true }), { command: "openSearch", preventDefault: true });
  assert.deepEqual(press("D", { metaKey: true }), { command: "duplicate", preventDefault: true });
});

test("Cmd+Z et Maj+Cmd+Z restent distincts", () => {
  assert.equal(press("z", { metaKey: true }).command, "undo");
  assert.equal(press("z", { metaKey: true, shiftKey: true }).command, "redo");
});

test("Echap desarme le pointeur avant de toucher au dessin", () => {
  assert.equal(press("Escape", {}, { armed: true }).command, "disarm");
  assert.equal(press("Escape", {}, { armed: true, hasSelection: true }).command, "disarm");
});

test("chaque etat d'Echap est bien relie", () => {
  assert.equal(press("Escape", {}, { view3dOpen: true }).command, "close3d");
  assert.equal(press("Escape", {}, { drawerOpen: true }).command, "closeDrawer");
  assert.equal(press("Escape", {}, { hasSelection: true }).command, "clearSelection");
  assert.equal(press("Escape", {}, { guideSelected: true }).command, "clearGuide");
  assert.equal(press("Escape").command, "clearCanvas");
});

test("l'ordre de repli d'Echap est preserve quand plusieurs etats sont vrais", () => {
  // Un seul drapeau par assertion ne prouve pas l'ordre: intervertir deux
  // branches passerait quand meme. Chaque cas ci-dessous active DEUX etats et
  // n'a qu'une seule bonne reponse, celle de la branche la plus haute.
  const chain = [
    ["view3dOpen", "drawerOpen", "close3d"],
    ["drawerOpen", "armed", "closeDrawer"],
    ["armed", "hasSelection", "disarm"],
    ["hasSelection", "guideSelected", "clearSelection"],
  ];
  for (const [higher, lower, expected] of chain) {
    assert.equal(
      press("Escape", {}, { [higher]: true, [lower]: true }).command,
      expected,
      `${higher} doit primer sur ${lower}`,
    );
  }
  assert.equal(press("Escape", {}, { guideSelected: true, hasSelection: true }).command, "clearSelection");
});

test("tous les raccourcis modificateurs survivent a la saisie, pas seulement Cmd+S", () => {
  // La version precedente ne testait que Cmd+S: une regression qui aurait
  // deplace z/k/d sous le garde isTyping serait passee inapercue.
  const typing = { isTyping: true };
  assert.equal(press("z", { metaKey: true }, typing).command, "undo");
  assert.equal(press("z", { metaKey: true, shiftKey: true }, typing).command, "redo");
  assert.equal(press("s", { metaKey: true }, typing).command, "save");
  assert.equal(press("k", { metaKey: true }, typing).command, "openSearch");
  assert.equal(press("d", { metaKey: true }, typing).command, "duplicate");
  // Negatif: les cles non-modifiees sont toujours neutralisees en saisie
  assert.equal(press("a", {}, typing).command, "none");
  assert.equal(press("Escape", {}, typing).command, "none");
});

test("Supprimer n'agit que sur une selection", () => {
  assert.equal(press("Delete", {}, { hasSelection: true }).command, "delete");
  assert.equal(press("Delete").command, "none");
});
