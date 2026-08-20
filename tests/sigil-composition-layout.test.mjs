import test from "node:test";
import assert from "node:assert/strict";

import {
  SIGIL_COMPOSITION_SLOTS,
  buildSigilCompositionCommitPlan,
  buildSigilCompositionPlacements,
  createDefaultSigilComposition,
  extractSigilComposition,
  normalizeCompositionCircleSize,
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

test("un nouveau sceau utilise le centre de la toile et une taille bornee", () => {
  const draft = createDefaultSigilComposition({ width: 900, height: 600 });
  assert.deepEqual(draft.center, { x: 450, y: 300 });
  assert.equal(draft.mode, "new");
  assert.ok(draft.radius > 0);
  assert.equal(normalizeCompositionCircleSize(240, { min: 80, max: 400 }), 240);
  assert.equal(normalizeCompositionCircleSize(20, { min: 80, max: 400 }), 80);
  assert.equal(normalizeCompositionCircleSize(900, { min: 80, max: 400 }), 400);
});

test("un sceau existant regroupe uniquement ses actions geometriques", () => {
  const draft = extractSigilComposition({
    actions: [
      { type: "circle", cx: 300, cy: 300, radius: 120, closed: true },
      { type: "glyph", element: "Feu", kind: "sigil", x: 300, y: 300, size: 24 },
      { type: "glyph", element: "Viseur", kind: "sign", x: 300, y: 204, size: 18 },
      { type: "circle", cx: 700, cy: 300, radius: 100, closed: true },
      { type: "glyph", element: "Eau", kind: "sigil", x: 700, y: 300, size: 24 },
    ],
    anchorIndex: 0,
  });
  assert.equal(draft.mode, "existing");
  assert.equal(draft.radius, 120);
  assert.deepEqual(draft.sigils.map((item) => item.name), ["Feu"]);
  assert.deepEqual(draft.signs.map((item) => item.name), ["Viseur"]);
});

test("un cercle graphique selectionne peut devenir une composition", () => {
  const draft = extractSigilComposition({
    actions: [
      { type: "circle", cx: 300, cy: 300, radius: 120, closed: false },
      { type: "glyph", element: "Feu", kind: "sigil", x: 300, y: 300, size: 24 },
    ],
    anchorIndex: 0,
  });

  assert.equal(draft.mode, "existing");
  assert.equal(draft.anchorIndex, 0);
  assert.equal(draft.slots.center, "Feu");
});

test("le plan d'inscription respecte la taille du nouveau cercle", () => {
  const plan = buildSigilCompositionCommitPlan({
    draft: {
      mode: "new",
      center: { x: 450, y: 300 },
      radius: 180,
      anchorIndex: null,
    },
    slots: {
      center: "Feu",
      north: "Viseur",
      east: null,
      south: null,
      west: null,
    },
  });
  assert.equal(plan.mode, "new");
  assert.equal(plan.placements.find((item) => item.type === "ring").radius, 180);
  assert.deepEqual(
    plan.placements.find((item) => item.slotId === "north").position,
    { x: 450, y: 152 },
  );
});

test("le plan d'inscription d'un sceau existant ne recree pas son anneau", () => {
  const plan = buildSigilCompositionCommitPlan({
    draft: {
      mode: "existing",
      center: { x: 300, y: 300 },
      radius: 120,
      anchorIndex: 4,
    },
    slots: { center: "Eau", north: null, east: null, south: null, west: null },
  });
  assert.equal(plan.mode, "existing");
  assert.equal(plan.anchorIndex, 4);
  assert.equal(plan.placements.some((item) => item.type === "ring"), false);
});
