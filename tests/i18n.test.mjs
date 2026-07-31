import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  catalogKeys,
  resolveLocale,
  translate,
} from "../i18n.mjs";

test("English is the default and invalid locales fall back", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "fr"]);
  assert.equal(resolveLocale(null), "en");
  assert.equal(resolveLocale(""), "en");
  assert.equal(resolveLocale("fr"), "fr");
  assert.equal(resolveLocale("de"), "en");
});

test("English and French expose identical keys", () => {
  assert.deepEqual(catalogKeys("en"), catalogKeys("fr"));
});

test("translation interpolates parameters and falls back to English", () => {
  assert.equal(translate("en", "status.symbolPrepared", { name: "Water" }), "Water symbol ready.");
  assert.equal(translate("fr", "status.symbolPrepared", { name: "Eau" }), "Symbole Eau prepare.");
  assert.equal(translate("de", "status.symbolPrepared", { name: "Water" }), "Water symbol ready.");
});

test("unknown keys remain visible for diagnostics", () => {
  assert.equal(translate("en", "missing.example"), "missing.example");
});

test("the element search and duplication keys resolve in both locales", () => {
  for (const key of [
    "search.title",
    "search.placeholder",
    "search.close",
    "search.empty",
    "search.hint",
    "tool.duplicate",
  ]) {
    assert.ok(!translate("en", key).startsWith("["), `missing English ${key}`);
    assert.ok(!translate("fr", key).startsWith("["), `missing French ${key}`);
  }

  // The rest are constructed at runtime in app.js, so neither the parity test
  // nor the HTML attribute scan can reach them. Assert the exact strings.
  assert.equal(translate("en", "search.results", { count: 2 }), "2 results");
  assert.equal(translate("fr", "search.results", { count: 2 }), "2 resultats");
  assert.equal(translate("en", "status.symbolArmed", { name: "Fire" }), "Fire armed. Click the parchment to stamp it.");
  assert.equal(translate("fr", "status.symbolArmed", { name: "Feu" }), "Feu arme. Clique sur le parchemin pour l'apposer.");
  assert.equal(translate("en", "status.symbolDisarmed"), "Pointer released.");
  assert.equal(translate("fr", "status.symbolDisarmed"), "Pointeur relache.");
  assert.equal(translate("en", "status.duplicated", { count: 3 }), "3 copies added.");
  assert.equal(translate("fr", "status.duplicated", { count: 3 }), "3 copies ajoutees.");
  assert.equal(translate("en", "status.duplicateNoSelection"), "Select something before duplicating.");
  assert.equal(translate("fr", "status.duplicateNoSelection"), "Selectionne quelque chose avant de dupliquer.");
  assert.equal(translate("en", "status.duplicateBlocked"), "No room to place a copy here.");
  assert.equal(translate("fr", "status.duplicateBlocked"), "Pas de place pour poser une copie ici.");
});
