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
    ["a", { metaKey: true }],
    ["c", { metaKey: true }],
    ["v", { metaKey: true }],
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

test("les raccourcis presse-papiers amont passent par le repartiteur", () => {
  // Amont les avait relies en ligne dans app.js; le repartiteur les avalait
  // en silence. Aucun test de suite ne voit un raccourci perdu, d'ou ceux-ci.
  assert.deepEqual(press("a", { metaKey: true }), { command: "selectAll", preventDefault: true });
  assert.deepEqual(press("c", { metaKey: true }), { command: "copySelection", preventDefault: true });
  assert.deepEqual(press("v", { metaKey: true }), { command: "pasteSelection", preventDefault: true });
  assert.equal(press("A", { ctrlKey: true }).command, "selectAll");
  assert.equal(press("V", { ctrlKey: true }).command, "pasteSelection");
});

test("Cmd+A prime sur le 'a' nu qui active le cercle", () => {
  // Deplacer la regle selectAll sous `lower === "a"` la rendrait inatteignable
  // sans faire echouer aucune autre assertion. Ce couple fixe l'ordre.
  assert.equal(press("a", { metaKey: true }).command, "selectAll");
  assert.equal(press("a").command, "activateCircle");
});

test("Cmd+A/C/V rendent la main au navigateur pendant la saisie", () => {
  // Contrairement a z/s/k/d, ceux-ci sont SOUS le garde isTyping: dans un
  // champ texte, selectionner et coller du texte doit rester possible.
  const typing = { isTyping: true };
  assert.equal(press("a", { metaKey: true }, typing).command, "none");
  assert.equal(press("c", { metaKey: true }, typing).command, "none");
  assert.equal(press("v", { metaKey: true }, typing).command, "none");
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
  // deepEqual et non equal: close3d et closeDrawer neutralisent le navigateur,
  // les trois branches basses non. Ne comparer que `command` laissait ces
  // drapeaux libres de basculer sans qu'aucune assertion ne rougisse.
  assert.deepEqual(press("Escape", {}, { view3dOpen: true }), { command: "close3d", preventDefault: true });
  assert.deepEqual(press("Escape", {}, { drawerOpen: true }), { command: "closeDrawer", preventDefault: true });
  assert.deepEqual(press("Escape", {}, { hasSelection: true }), { command: "clearSelection", preventDefault: false });
  assert.deepEqual(press("Escape", {}, { guideSelected: true }), { command: "clearGuide", preventDefault: false });
  assert.deepEqual(press("Escape"), { command: "clearCanvas", preventDefault: false });
});

test("la carte complete est verrouillee, drapeau preventDefault compris", () => {
  // Mesure du 2026-07-30: supprimer les branches `l`, `-`, `=`, `+` laissait la
  // suite verte, tout comme intervertir zoomIn/zoomOut ou retirer
  // preventDefault de undo/redo/save/delete/close3d. Les raccourcis herites
  // etaient assertes sur `.command` seul; un Cmd+S sans preventDefault ouvre le
  // dialogue Enregistrer du navigateur au lieu d'exporter le PNG, sans signal.
  // Ce tableau couvre les dix-neuf commandes ET leur drapeau.
  const map = [
    ["z", { metaKey: true }, {}, "undo", true],
    ["z", { metaKey: true, shiftKey: true }, {}, "redo", true],
    ["s", { metaKey: true }, {}, "save", true],
    ["k", { metaKey: true }, {}, "openSearch", true],
    ["d", { metaKey: true }, {}, "duplicate", true],
    ["a", { metaKey: true }, {}, "selectAll", true],
    ["c", { metaKey: true }, {}, "copySelection", true],
    ["v", { metaKey: true }, {}, "pasteSelection", true],
    ["Delete", {}, { hasSelection: true }, "delete", true],
    ["Backspace", {}, { hasSelection: true }, "delete", true],
    ["Escape", {}, { view3dOpen: true }, "close3d", true],
    ["Escape", {}, { drawerOpen: true }, "closeDrawer", true],
    ["Escape", {}, { armed: true }, "disarm", true],
    ["Escape", {}, { hasSelection: true }, "clearSelection", false],
    ["Escape", {}, { guideSelected: true }, "clearGuide", false],
    ["Escape", {}, {}, "clearCanvas", false],
    ["a", {}, {}, "activateCircle", false],
    ["l", {}, {}, "analyzeSpell", false],
    ["L", {}, {}, "analyzeSpell", false],
    ["-", {}, {}, "zoomOut", true],
    ["_", {}, {}, "zoomOut", true],
    ["=", {}, {}, "zoomReset", true],
    ["+", {}, {}, "zoomIn", true],
    ["Add", {}, {}, "zoomIn", true],
    ["q", {}, {}, "none", false],
  ];
  for (const [key, overrides, context, command, preventDefault] of map) {
    assert.deepEqual(
      press(key, overrides, context),
      { command, preventDefault },
      `${key} ${JSON.stringify(overrides)} ${JSON.stringify(context)}`,
    );
  }
  // Vingt commandes reelles + "none" = vingt-et-une etiquettes distinctes.
  // Le compte echoue si une branche est ajoutee sans ligne de tableau.
  assert.equal(new Set(map.map(([, , , command]) => command)).size, 21);
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
