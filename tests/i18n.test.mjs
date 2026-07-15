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
