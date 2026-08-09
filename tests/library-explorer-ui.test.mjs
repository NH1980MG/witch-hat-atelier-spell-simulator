import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { translate } from "../i18n.mjs";

const html = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");

test("the library exposes the complete wiki navigation", () => {
  for (const id of ["overview", "schematics", "variants", "sigils", "signs", "supports", "fidelity"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});

test("the explorer has accessible search filters results pagination and details", () => {
  assert.match(html, /role="search"/);
  assert.match(html, /<label[^>]+for="variantSearch"/);
  for (const id of ["variantSearch", "sigilFilter", "signFilter", "roleFilter", "supportFilter", "fidelityFilter", "warningFilter", "effectFilter", "sortFilter"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="variantResults"[^>]+aria-live="polite"/);
  assert.match(html, /id="variantPager"/);
  assert.match(html, /<dialog[^>]+id="variantDialog"/);
  assert.match(html, /library-explorer\.mjs/);
});

test("the library advertises the 65,600-variant explorer in both locales", () => {
  assert.match(html, /Explore 65,600 variants/);
  assert.equal(translate("en", "explorer.title"), "Explore 65,600 variants");
  assert.equal(translate("fr", "explorer.title"), "Explorer 65 600 variantes");
  assert.match(translate("en", "explorer.empty"), /65,600/);
  assert.match(translate("fr", "explorer.empty"), /65 600/);
  assert.match(translate("en", "explorer.description"), /29 profiled central sigils/);
  assert.match(translate("en", "explorer.description"), /40 signs/);
  assert.match(translate("fr", "explorer.description"), /29 sigils centraux profiles/);
  assert.match(translate("fr", "explorer.description"), /40 signes/);
});

test("variant fidelity labels never expose translation keys", () => {
  for (const locale of ["en", "fr"]) {
    for (const level of ["documented", "inferred", "experimental"]) {
      const key = `library.fidelity.${level}`;
      assert.notEqual(translate(locale, key), key);
    }
  }
});

test("English recipe details derive combined-effect labels from stable IDs", async () => {
  const explorer = await readFile(new URL("../library-explorer.mjs", import.meta.url), "utf8");
  assert.match(explorer, /detail\.combinationIds/);
  assert.match(explorer, /humanizeEffectId/);
  assert.match(explorer, /localizePipeline/);
});

test("the explorer renders every material component and elemental fidelity", async () => {
  const explorer = await readFile(new URL("../library-explorer.mjs", import.meta.url), "utf8");
  assert.match(explorer, /record\.sigils/);
  assert.match(explorer, /detail\.sigils/);
  assert.match(explorer, /detail\.elementalMixture/);
});
