import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { MATRIX_SIGIL_NAMES, SIGIL_PROFILES, validateSpellMatrix } from "../spell-grammar.mjs";
import { SYMBOL_PATHS } from "../symbol-catalog.mjs";

const expectedSigils = [
  "Feu", "Eau", "Terre", "Vent", "Lumiere", "Cristal", "Aeriforme",
  "Vent sous pied", "Repetition", "Fumee", "Sangsue-valance", "Frillram",
  "Epee", "Loup-ecaille", "Cerf-torche", "Chevre-lion", "Chat-hibou",
  "Tete de chat-hibou", "Dragon", "Fleur", "Cheval", "Oiseau A",
  "Oiseau B", "Arret temporel", "Vent tourbillonnant",
  "Flammes sans chaleur",
];

test("the shared catalogue exposes all 26 editable sigils", () => {
  assert.deepEqual(Object.keys(SIGIL_PROFILES), expectedSigils);
  for (const name of expectedSigils) {
    assert.ok(SYMBOL_PATHS[name]?.length > 0, `${name} needs editable vector paths`);
  }
});

test("Aeriforms and Whorling Wind keep their distinct canonical drawings", () => {
  assert.match(SYMBOL_PATHS.Aeriforme.join(" "), /M24 7 C18 7/);
  assert.match(SYMBOL_PATHS.Aeriforme.join(" "), /M4 24 H14/);
  assert.equal(SYMBOL_PATHS["Vent tourbillonnant"].length, 7);
  assert.match(SYMBOL_PATHS["Vent tourbillonnant"][0], /M24 17 L15 31 L33 31 Z/);
});

test("every new sigil has French content and an English catalogue entry", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  for (const name of expectedSigils) {
    assert.match(app, new RegExp(`name: ["']${name}["']`), `${name} needs French catalogue content`);
    assert.match(app, new RegExp(`["']${name}["']:\\s*["']`), `${name} needs an English entry`);
  }
});

test("decorative sigils stay editable without enlarging the canonical matrix", () => {
  const result = validateSpellMatrix();

  assert.equal(Object.keys(SIGIL_PROFILES).length, 26);
  assert.equal(MATRIX_SIGIL_NAMES.length, 9);
  assert.equal(result.sigils, 9);
  assert.equal(result.tested, 13_338);
  assert.equal(result.unique, 13_338);
  assert.equal(result.deterministic, 13_338);
  assert.deepEqual(result.supports, { none: 6_669, shoe: 6_669 });
});
