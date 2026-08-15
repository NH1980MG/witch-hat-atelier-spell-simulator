import test from "node:test";
import assert from "node:assert/strict";

import {
  SIGIL_COMPOSITION_SLOTS,
  buildSigilCompositionPlacements,
} from "../sigil-composition-layout.mjs";

test("la composition convertit les slots en positions relatives au cercle actif", () => {
  const placements = buildSigilCompositionPlacements({
    anchor: { center: { x: 400, y: 200 }, radius: 100, hasSeal: true },
    slots: {
      center: "Feu",
      north: "Viseur",
      east: "Projectile",
      west: null,
      south: "",
    },
  });

  assert.deepEqual(placements, [
    { type: "glyph", slotId: "center", name: "Feu", kind: "sigil", x: 400, y: 200, size: 30 },
    { type: "glyph", slotId: "north", name: "Viseur", kind: "sign", x: 400, y: 118, size: 20 },
    { type: "glyph", slotId: "east", name: "Projectile", kind: "sign", x: 482, y: 200, size: 20 },
  ]);
});

test("la composition ajoute un anneau quand aucun cercle actif n'existe", () => {
  const placements = buildSigilCompositionPlacements({
    anchor: { center: { x: 120, y: 160 }, radius: 80, hasSeal: false },
    slots: { center: "Eau" },
  });

  assert.deepEqual(placements[0], {
    type: "ring",
    slotId: "seal",
    x: 120,
    y: 160,
    radius: 80,
  });
  assert.equal(placements[1].name, "Eau");
});

test("les slots de composition exposent une scene centrale et des signes autour", () => {
  assert.deepEqual(SIGIL_COMPOSITION_SLOTS.map((slot) => slot.id), [
    "center",
    "north",
    "east",
    "south",
    "west",
  ]);
  assert.equal(SIGIL_COMPOSITION_SLOTS[0].kind, "sigil");
  assert.equal(SIGIL_COMPOSITION_SLOTS.filter((slot) => slot.kind === "sign").length, 4);
});
