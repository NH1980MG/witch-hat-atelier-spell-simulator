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

test("la saisie dans un champ ne laisse passer que les raccourcis modificateurs", () => {
  assert.equal(press("a", {}, { isTyping: true }).command, "none");
  assert.equal(press("Escape", {}, { isTyping: true }).command, "none");
  assert.equal(press("s", { metaKey: true }, { isTyping: true }).command, "save");
});

test("Echap desarme le pointeur avant de toucher au dessin", () => {
  assert.equal(press("Escape", {}, { armed: true }).command, "disarm");
  assert.equal(press("Escape", {}, { armed: true, hasSelection: true }).command, "disarm");
});

test("l'ordre de repli d'Echap est preserve pour les etats existants", () => {
  assert.equal(press("Escape", {}, { view3dOpen: true }).command, "close3d");
  assert.equal(press("Escape", {}, { drawerOpen: true }).command, "closeDrawer");
  assert.equal(press("Escape", {}, { hasSelection: true }).command, "clearSelection");
  assert.equal(press("Escape", {}, { guideSelected: true }).command, "clearGuide");
  assert.equal(press("Escape").command, "clearCanvas");
});

test("Supprimer n'agit que sur une selection", () => {
  assert.equal(press("Delete", {}, { hasSelection: true }).command, "delete");
  assert.equal(press("Delete").command, "none");
});
