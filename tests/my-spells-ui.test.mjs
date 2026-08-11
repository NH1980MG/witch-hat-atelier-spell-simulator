import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("l'atelier expose l'onglet Mes sorts et le bouton d'enregistrement", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="guideSpellsTab"[^>]*aria-controls="guideSpellsList"/);
  assert.match(html, /data-i18n="guides\.spells"/);
  assert.match(html, /id="guideSpellsList"[^>]*hidden/);
  assert.match(html, /id="saveSpellButton"[^>]*data-i18n="commands\.saveSpell"/);
  assert.match(html, /id="spellSaveDialog"/);
  assert.match(html, /id="spellNameInput"/);
  assert.match(html, /id="spellSaveConfirm"/);
});

test("app.js branche la bibliotheque de sorts", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /from "\.\/spell-library\.mjs"/);
  assert.match(source, /mySpells: loadMySpells\(localStorage\)/);
  assert.match(source, /function renderSpellList\(\)/);
  assert.match(source, /function saveCurrentSpell\(\)/);
  assert.match(source, /function confirmSaveSpell\(\)/);
  assert.match(source, /function loadMySpell\(id\)/);
  assert.match(source, /function removeMySpell\(id\)/);
  assert.match(source, /state\.guideTab = \["library", "personal", "spells"\]/);
  assert.match(source, /guideSpellsTab\?\.addEventListener\("click", \(\) => setGuideTab\("spells"\)\)/);
  assert.match(source, /saveSpellButton\?\.addEventListener\("click", saveCurrentSpell\)/);
  assert.match(source, /recordHistory\(\);/);
});

test("un sort enregistre peut servir de guide sans remplacer le dessin", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /function activeVectorGuide\(\)/);
  assert.match(source, /state\.activeGuide\.source === "spell"/);
  assert.match(source, /selectGuide\("spell", spell\.id\)/);
  assert.match(source, /guideButton\.dataset\.guideAction = "use"/);
  assert.match(source, /loadButton\.dataset\.guideAction = "load"/);
});

test("le chargement restaure actions et reglages", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const loadBlock = source.slice(source.indexOf("function loadMySpell"));
  assert.match(loadBlock, /state\.actions = structuredClone\(spell\.actions\)/);
  assert.match(loadBlock, /state\.strokeSize = spell\.stroke/);
  assert.doesNotMatch(loadBlock, /intensityInput\.value/);
});

test("les cles spells existent dans les deux locales, fr sans accents", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  const keys = [
    "guides.spells", "commands.saveSpell", "spells.dialogTitle", "spells.nameLabel",
    "spells.confirm", "spells.cancel", "spells.empty", "spells.defaultName",
    "spells.meta", "spells.load", "spells.delete", "spells.deleteNamed",
    "spells.status.saved", "spells.status.loaded", "spells.status.deleted",
  ];
  for (const key of keys) {
    assert.equal(source.split(`"${key}"`).length - 1, 2, key);
  }
  assert.match(source, /"guides\.spells": "Mes sorts"/);
  assert.match(source, /"commands\.saveSpell": "Enregistrer le sort"/);
});
