import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from "../symbol-palette-data.mjs";

test("la palette expose exactement 64 elements figes", () => {
  assert.equal(PALETTE_ELEMENTS.length, 64);
  assert.ok(Object.isFrozen(PALETTE_ELEMENTS));
  for (const element of PALETTE_ELEMENTS) {
    assert.equal(typeof element.name, "string");
    assert.match(element.rune, /^[A-Z]{2}$/);
    assert.match(element.color, /^#[0-9a-f]{6}$/i);
  }
});

test("chaque element de la palette possede un nom anglais", () => {
  const missing = PALETTE_ELEMENTS.filter((element) => !ENGLISH_DISPLAY_NAMES[element.name]);
  assert.deepEqual(missing, [], `elements sans nom anglais: ${missing.map((e) => e.name).join(", ")}`);
});

test("les runes sont uniques a l'interieur de chaque famille", () => {
  const byKind = new Map();
  for (const element of PALETTE_ELEMENTS) {
    if (!byKind.has(element.kind)) byKind.set(element.kind, []);
    byKind.get(element.kind).push(element.rune);
  }
  for (const [kind, runes] of byKind) {
    assert.equal(
      new Set(runes).size,
      runes.length,
      `deux ${kind} partagent une rune, ce que la recherche ne peut pas departager`,
    );
  }
  // Six runes sont partagees entre un sigil et un signe (SV, FR, CL, CH, FL,
  // CV). La recherche les departage par ordre de palette, donc ce n'est pas un
  // defaut - mais une collision a l'interieur d'une meme famille en serait un.
  const all = PALETTE_ELEMENTS.map((element) => element.rune);
  assert.equal(new Set(all).size, 58);
});
