import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildRecipeHref, parseRecipeParams, RECIPE_LINK_LIMITS } from "../recipe-link.mjs";
import { MATRIX_SIGIL_NAMES, MATRIX_SIGN_NAMES, composeSpellRecipe } from "../spell-grammar.mjs";
import { buildVariantIndex, getVariantDetail } from "../variant-catalog.mjs";
import { translate } from "../i18n.mjs";

const allowed = { sigilNames: MATRIX_SIGIL_NAMES, signNames: MATRIX_SIGN_NAMES };

test("buildRecipeHref encodes sigils signs support and activation", () => {
  const href = buildRecipeHref({ sigils: ["Eau"], signs: ["Orbe", "Levitation"], supportId: "shoe", activate: true });
  const parsed = new URL(href, "https://example.test/");
  assert.equal(parsed.pathname, "/index.html");
  assert.equal(parsed.searchParams.get("sigils"), "Eau");
  assert.equal(parsed.searchParams.get("signs"), "Orbe,Levitation");
  assert.equal(parsed.searchParams.get("support"), "shoe");
  assert.equal(parsed.searchParams.get("activate"), "1");
});

test("buildRecipeHref handles spaces and omits defaults", () => {
  const href = buildRecipeHref({ sigils: ["Vent sous pied"], signs: [], supportId: "none", activate: false });
  const parsed = new URL(href, "https://example.test/");
  assert.equal(parsed.searchParams.get("sigils"), "Vent sous pied");
  assert.equal(parsed.searchParams.get("signs"), null);
  assert.equal(parsed.searchParams.get("support"), null);
  assert.equal(parsed.searchParams.get("activate"), null);
});

test("buildRecipeHref requires at least one sigil", () => {
  assert.throws(() => buildRecipeHref({ sigils: [] }), TypeError);
  assert.throws(() => buildRecipeHref({}), TypeError);
});

test("parseRecipeParams round-trips a built href", () => {
  const href = buildRecipeHref({ sigils: ["Feu", "Eau"], signs: ["Pluie", "Pluie"], supportId: "shoe", activate: true });
  const parsed = parseRecipeParams(new URL(href, "https://example.test/").search, allowed);
  assert.deepEqual([...parsed.sigils], ["Feu", "Eau"]);
  assert.deepEqual([...parsed.signs], ["Pluie", "Pluie"]);
  assert.equal(parsed.supportId, "shoe");
  assert.equal(parsed.activate, true);
});

test("parseRecipeParams returns null without a valid sigil", () => {
  assert.equal(parseRecipeParams("", allowed), null);
  assert.equal(parseRecipeParams("?signs=Orbe", allowed), null);
  assert.equal(parseRecipeParams("?sigils=Dragon%20rouge", allowed), null);
});

test("parseRecipeParams drops unknown names and caps list sizes", () => {
  const manySigils = [...MATRIX_SIGIL_NAMES.slice(0, RECIPE_LINK_LIMITS.maxSigils + 2)];
  const manySigns = [...MATRIX_SIGN_NAMES.slice(0, RECIPE_LINK_LIMITS.maxSigns + 2)];
  const parsed = parseRecipeParams(`?sigils=${manySigils.join(",")},Inconnu&signs=${manySigns.join(",")},Inconnu`, allowed);
  assert.equal(parsed.sigils.length, RECIPE_LINK_LIMITS.maxSigils);
  assert.equal(parsed.signs.length, RECIPE_LINK_LIMITS.maxSigns);
  assert.ok(![...parsed.sigils, ...parsed.signs].includes("Inconnu"));
});

test("parseRecipeParams keeps repeated signs used by the matrix", () => {
  const parsed = parseRecipeParams("?sigils=Eau&signs=Orbe,Orbe", allowed);
  assert.deepEqual([...parsed.signs], ["Orbe", "Orbe"]);
});

test("parseRecipeParams defaults support to none and activate to false", () => {
  const parsed = parseRecipeParams("?sigils=Eau&support=coffre&activate=oui", allowed);
  assert.equal(parsed.supportId, "none");
  assert.equal(parsed.activate, false);
});

test("every matrix sigil and sign is accepted by the parser", () => {
  const sigilParsed = parseRecipeParams(`?sigils=${MATRIX_SIGIL_NAMES.join(",")}`, allowed);
  assert.deepEqual([...sigilParsed.sigils], [...MATRIX_SIGIL_NAMES.slice(0, RECIPE_LINK_LIMITS.maxSigils)]);
  for (const sign of MATRIX_SIGN_NAMES) {
    const parsed = parseRecipeParams(`?sigils=Eau&signs=${sign}`, allowed);
    assert.deepEqual([...parsed.signs], [sign]);
  }
});

test("every matrix name exists in the atelier element list with the same kind", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const entries = [...app.matchAll(/\{ name: "([^"]+)",[^\n]*kind: "(sigil|sign)"/g)];
  const kinds = new Map(entries.map(([, name, kind]) => [name, kind]));
  for (const sigil of MATRIX_SIGIL_NAMES) {
    assert.equal(kinds.get(sigil), "sigil", `sigil ${sigil} missing from the atelier`);
  }
  for (const sign of MATRIX_SIGN_NAMES) {
    assert.equal(kinds.get(sign), "sign", `sign ${sign} missing from the atelier`);
  }
});

test("explorer links recompose the exact same recipe in the atelier", () => {
  const index = buildVariantIndex();
  const samples = [
    index.find((record) => record.sigils.join("+") === "Eau" && record.signs.join("+") === "Levitation+Orbe" && record.supportId === "none"),
    index.find((record) => record.sigils.length > 1 && record.supportId === "shoe"),
    index.find((record) => record.signs[0] === record.signs[1] && record.supportId === "none"),
    index[0],
    index[index.length - 1],
  ];
  assert.ok(samples.every(Boolean));
  for (const record of samples) {
    const detail = getVariantDetail(record);
    const href = buildRecipeHref({ sigils: detail.sigils, signs: detail.signs, supportId: detail.supportId, activate: true });
    const parsed = parseRecipeParams(new URL(href, "https://example.test/").search, allowed);
    const recomposed = composeSpellRecipe({
      sigils: [...parsed.sigils],
      signs: [...parsed.signs],
      supportId: parsed.supportId,
      direction: "vers le haut",
    });
    assert.equal(recomposed.id, record.id, `recipe identity mismatch for ${record.id}`);
  }
});

test("the explorer exposes the load-in-atelier action", async () => {
  const explorer = await readFile(new URL("../library-explorer.mjs", import.meta.url), "utf8");
  assert.match(explorer, /buildRecipeHref/);
  assert.match(explorer, /explorer\.loadInAtelier/);
  assert.match(explorer, /variant-result-actions/);
  assert.match(explorer, /variant-dialog-action/);
});

test("the atelier loads recipes from URL parameters", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /parseRecipeParams/);
  assert.match(app, /loadRecipeFromUrl/);
  assert.match(app, /status\.recipeLoaded/);
  assert.match(app, /recipe-link\.mjs/);
});

test("recipe loading labels are translated in both locales", () => {
  for (const locale of ["en", "fr"]) {
    assert.notEqual(translate(locale, "explorer.loadInAtelier"), "explorer.loadInAtelier");
    assert.notEqual(translate(locale, "status.recipeLoaded"), "status.recipeLoaded");
  }
  assert.equal(translate("fr", "explorer.loadInAtelier"), "Charger dans l'atelier");
  assert.match(translate("en", "status.recipeLoaded", { name: "Eau" }), /Eau/);
  assert.match(translate("fr", "status.recipeLoaded", { name: "Eau" }), /Eau/);
});

test("the mobile layout keeps the recipe actions full width", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.variant-result-actions/);
  const mobileBlock = css.slice(css.lastIndexOf("@media (max-width: 620px)"));
  assert.match(mobileBlock, /\.variant-result-actions button,\s*\.variant-result-actions a\.variant-action\s*\{[^}]*min-height:\s*44px/s);
});
