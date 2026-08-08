import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("la bibliotheque expose la carte du sort du jour", async () => {
  const html = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");
  assert.match(html, /id="dailySpellCard"/);
  assert.match(html, /id="dailySpellDate"/);
  assert.match(html, /id="dailySpellRecipe"/);
  assert.match(html, /id="dailySpellMeta"/);
  assert.match(html, /id="dailySpellLink"/);
  assert.match(html, /data-i18n="daily\.title"/);
  // La carte precede les filtres de l'explorateur.
  assert.ok(html.indexOf('id="dailySpellCard"') < html.indexOf('id="variantFilters"'), "carte avant les filtres");
});

test("l'explorateur branche le tirage du jour", async () => {
  const source = await readFile(new URL("../library-explorer.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ dailyPick \} from "\.\/daily-spell\.mjs"/);
  assert.match(source, /dailyPick\(\)/);
  assert.match(source, /dailySpellLink/);
  assert.match(source, /buildRecipeHref\(\{ sigils: \[\.\.\.pick\.sigils\]/);
});

test("la cle du sort du jour existe dans les deux locales, fr sans accents", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  assert.equal(source.split('"daily.title"').length - 1, 2);
  assert.match(source, /"daily\.title": "Sort du jour"/);
  assert.match(source, /"daily\.title": "Spell of the day"/);
});

test("la carte du sort du jour est stylee", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.daily-spell-card \{/);
  assert.match(css, /\.daily-spell-recipe/);
  assert.match(css, /\.daily-spell-date/);
});
