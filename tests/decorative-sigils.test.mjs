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
  assert.match(SYMBOL_PATHS.Aeriforme.join(" "), /M25 6 C19 6/);
  assert.match(SYMBOL_PATHS.Aeriforme.join(" "), /M4 24 H15/);
  assert.equal(SYMBOL_PATHS["Vent tourbillonnant"].length, 7);
  assert.match(SYMBOL_PATHS["Vent tourbillonnant"][0], /M24 17 L15 31 L33 31 Z/);
});

test("the ten audited sigils keep the topology visible in the references", () => {
  const expectedFragments = {
    Terre: ["M10 8 H38", "M11 41 H37"],
    Repetition: ["M5 28 C9 15", "M13 24 C18 17"],
    "Sangsue-valance": ["M4 25 L14 26", "M18 34 L11 37"],
    Frillram: ["M5 9 H18", "M43 8 L41 42"],
    Epee: ["M22 5 V43", "M14 5 V18"],
    "Chevre-lion": ["M7 11 L11 7", "M14 42 C20 47"],
    "Tete de chat-hibou": ["M17 9 L24 27", "M12 24 L6 22"],
    Dragon: ["M4 25 C4 33", "M36 29 L44 31"],
    "Oiseau A": ["M21 7 C21 12", "M27 7 C27 12"],
    "Arret temporel": ["M24 5 V10", "M5 24 H10"],
  };

  for (const [name, fragments] of Object.entries(expectedFragments)) {
    const drawing = SYMBOL_PATHS[name].join(" ");
    for (const fragment of fragments) {
      assert.ok(drawing.includes(fragment), `${name} must include ${fragment}`);
    }
  }
});

test("every new sigil has French content and an English catalogue entry", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  for (const name of expectedSigils) {
    assert.match(app, new RegExp(`name: ["']${name}["']`), `${name} needs French catalogue content`);
    assert.match(app, new RegExp(`["']${name}["']:\\s*["']`), `${name} needs an English entry`);
  }
});

test("every editable profiled sigil is included in the public matrix", () => {
  const result = validateSpellMatrix();

  assert.equal(Object.keys(SIGIL_PROFILES).length, 26);
  assert.equal(MATRIX_SIGIL_NAMES.length, 26);
  assert.deepEqual(MATRIX_SIGIL_NAMES, Object.keys(SIGIL_PROFILES));
  assert.equal(result.sigils, 26);
  assert.equal(result.tested, 38_532);
  assert.equal(result.unique, 38_532);
  assert.equal(result.deterministic, 38_532);
  assert.deepEqual(result.supports, { none: 19_266, shoe: 19_266 });
});
