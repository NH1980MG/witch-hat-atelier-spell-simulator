import test from "node:test";
import assert from "node:assert/strict";
import {
  boundsIntersect,
  canDropGlyph,
  clampGlyphCenter,
  cloneActions,
  combinedSelectionBounds,
  glyphResizeHandleAtPoint,
  guideResizeHandleAtPoint,
  isSelectableAction,
  planDuplication,
  reorderSelectedActions,
  resizeGuideScaleFromCorner,
  scaledGuideBounds,
  resizeGlyphFromCorner,
  resizeGlyphSize,
  rotateSelectedActions,
  scaleSelectedActions,
  selectableActionBounds,
  selectableIndicesInRect,
  shouldArmLongPress,
  shouldDeferTouchTool,
  topmostSelectableIndexAtPoint,
  topmostGlyphIndexAtPoint,
  translateSelectedActions,
} from "../symbol-interactions.mjs";

test("le guide conserve son centre et ses proportions pendant le redimensionnement", () => {
  const base = { left: 20, right: 120, top: 30, bottom: 80, width: 100, height: 50 };
  const scaled = scaledGuideBounds(base, 2);

  assert.deepEqual(scaled, { left: -30, right: 170, top: 5, bottom: 105, width: 200, height: 100 });
  assert.equal(guideResizeHandleAtPoint(scaled, { x: 170, y: 105 }, 2), "se");
  assert.equal(resizeGuideScaleFromCorner(base, { x: 170, y: 105 }), 2);
  assert.equal(resizeGuideScaleFromCorner(base, { x: 500, y: 500 }), 17.8);
});

test("les quatre poignees suivent la rotation du glyphe", () => {
  const action = { type: "glyph", x: 50, y: 40, size: 20, rotation: Math.PI / 2 };
  const half = action.size * 1.18;

  assert.equal(glyphResizeHandleAtPoint(action, { x: 50 + half, y: 40 + half }, 2), "ne");
  assert.equal(glyphResizeHandleAtPoint(action, { x: 50, y: 40 }, 2), null);
});

test("tirer un coin redimensionne proportionnellement autour du centre", () => {
  const action = { type: "glyph", x: 50, y: 50, size: 20, rotation: 0 };

  assert.equal(resizeGlyphFromCorner(action, { x: 85.4, y: 85.4 }), 30);
  assert.equal(resizeGlyphFromCorner(action, { x: 500, y: 500 }), 381.4);
  assert.equal(resizeGlyphFromCorner(action, { x: 51, y: 51 }), 12);
});

test("resizeGlyphSize applique le pas sans plafond superieur", () => {
  assert.equal(resizeGlyphSize(20, "grow"), 22);
  assert.equal(resizeGlyphSize(20, "shrink"), 18);
  assert.equal(resizeGlyphSize(120, "grow"), 132);
  assert.equal(resizeGlyphSize(12, "shrink"), 12);
});

test("resizeGlyphSize refuse une direction inconnue", () => {
  assert.throws(() => resizeGlyphSize(20, "sideways"), /direction/);
});

test("topmostGlyphIndexAtPoint ignore les traits et choisit le glyphe superieur", () => {
  const actions = [
    { type: "glyph", x: 50, y: 50, size: 20 },
    { type: "circle", cx: 50, cy: 50, radius: 30 },
    { type: "glyph", x: 52, y: 50, size: 12 },
  ];

  assert.equal(topmostGlyphIndexAtPoint(actions, { x: 51, y: 50 }), 2);
  assert.equal(topmostGlyphIndexAtPoint(actions, { x: 200, y: 200 }), -1);
});

test("canDropGlyph exige que le glyphe entier reste dans les limites", () => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };

  assert.equal(canDropGlyph({ x: 50, y: 50 }, 20, bounds), true);
  assert.equal(canDropGlyph({ x: 10, y: 50 }, 20, bounds), false);
});

test("clampGlyphCenter garde tout le glyphe dans le parchemin", () => {
  const bounds = { left: 0, right: 100, top: 0, bottom: 80 };
  assert.deepEqual(clampGlyphCenter({ x: -10, y: 95 }, 12, bounds), { x: 12, y: 68 });
  assert.deepEqual(clampGlyphCenter({ x: 50, y: 40 }, 12, bounds), { x: 50, y: 40 });
});

test("cloneActions copie aussi les points de trace", () => {
  const source = [{ type: "free", points: [{ x: 1, y: 2 }] }];
  const clone = cloneActions(source);

  clone[0].points[0].x = 9;
  assert.equal(source[0].points[0].x, 1);
});

test("le clic long est reserve a un seul doigt principal", () => {
  assert.equal(shouldArmLongPress("touch", 0, 1), true);
  assert.equal(shouldArmLongPress("pen", 0, 1), false);
  assert.equal(shouldArmLongPress("mouse", 0, 1), false);
  assert.equal(shouldArmLongPress("touch", 0, 2), false);
  assert.equal(shouldArmLongPress("touch", 2, 1), false);
});

test("les outils tactiles irreversibles attendent la fin du clic long", () => {
  assert.equal(shouldDeferTouchTool("touch", "glyph"), true);
  assert.equal(shouldDeferTouchTool("touch", "eraser"), true);
  assert.equal(shouldDeferTouchTool("touch", "free"), false);
  assert.equal(shouldDeferTouchTool("pen", "glyph"), false);
});

test("la selection de groupe accepte tous les types de traces mais exclut les guides", () => {
  assert.equal(isSelectableAction({ type: "glyph" }), true);
  assert.equal(isSelectableAction({ type: "circle" }), true);
  assert.equal(isSelectableAction({ type: "ring" }), true);
  assert.equal(isSelectableAction({ type: "free" }), true);
  assert.equal(isSelectableAction({ type: "ray" }), true);
  assert.equal(isSelectableAction({ type: "spiral" }), true);
  assert.equal(isSelectableAction({ type: "guide" }), false);
});

test("selectableActionBounds calcule les limites visuelles des glyphes et cercles", () => {
  assert.deepEqual(
    selectableActionBounds({ type: "glyph", x: 50, y: 40, size: 10 }),
    { left: 38.2, right: 61.8, top: 28.2, bottom: 51.8, width: 23.6, height: 23.6 },
  );
  assert.deepEqual(
    selectableActionBounds({ type: "circle", cx: 30, cy: 40, radius: 20 }),
    { left: 10, right: 50, top: 20, bottom: 60, width: 40, height: 40 },
  );
  assert.equal(selectableActionBounds({ type: "free", points: [] }), null);
});

test("boundsIntersect accepte les recouvrements partiels et les bords", () => {
  const first = { left: 10, right: 30, top: 10, bottom: 30 };

  assert.equal(boundsIntersect(first, { left: 25, right: 40, top: 25, bottom: 40 }), true);
  assert.equal(boundsIntersect(first, { left: 30, right: 40, top: 30, bottom: 40 }), true);
  assert.equal(boundsIntersect(first, { left: 31, right: 40, top: 31, bottom: 40 }), false);
});

test("le rectangle selectionne les elements touches quelle que soit sa direction", () => {
  const actions = [
    { type: "glyph", x: 20, y: 20, size: 5 },
    { type: "free", points: [{ x: 30, y: 30 }] },
    { type: "circle", cx: 60, cy: 50, radius: 15 },
    { type: "ring", cx: 100, cy: 100, radius: 10 },
  ];

  assert.deepEqual(
    selectableIndicesInRect(actions, { left: 75, right: 10, top: 70, bottom: 10 }),
    [0, 1, 2],
  );
  assert.deepEqual(
    selectableIndicesInRect(actions, { left: 200, right: 150, top: 200, bottom: 150 }),
    [],
  );
});

test("le clic choisit le dernier element selectionnable sous la souris", () => {
  const actions = [
    { type: "circle", cx: 50, cy: 50, radius: 20 },
    { type: "glyph", x: 70, y: 50, size: 8 },
    { type: "free", points: [{ x: 70, y: 50 }] },
  ];

  assert.equal(topmostSelectableIndexAtPoint(actions, { x: 70, y: 50 }, 2), 2);
  assert.equal(topmostSelectableIndexAtPoint(actions, { x: 50, y: 30 }, 2), 0);
  assert.equal(topmostSelectableIndexAtPoint(actions, { x: 140, y: 140 }, 2), -1);
});

test("combinedSelectionBounds ignore les indices invalides et reunit le groupe", () => {
  const actions = [
    { type: "glyph", x: 20, y: 20, size: 10 },
    { type: "free", points: [] },
    { type: "circle", cx: 70, cy: 50, radius: 20 },
  ];

  assert.deepEqual(combinedSelectionBounds(actions, [2, 99, 0, 0]), {
    left: 8.2,
    right: 90,
    top: 8.2,
    bottom: 70,
    width: 81.8,
    height: 61.8,
  });
  assert.equal(combinedSelectionBounds(actions, [1]), null);
});

test("translateSelectedActions deplace uniquement les elements selectionnes", () => {
  const source = [
    { type: "glyph", x: 20, y: 30, size: 10 },
    { type: "circle", cx: 50, cy: 60, radius: 20 },
    { type: "ring", cx: 90, cy: 90, radius: 10 },
  ];
  const moved = translateSelectedActions(source, [0, 1], 5, -10);

  assert.deepEqual(moved[0], { type: "glyph", x: 25, y: 20, size: 10 });
  assert.deepEqual(moved[1], { type: "circle", cx: 55, cy: 50, radius: 20 });
  assert.deepEqual(moved[2], source[2]);
  assert.notEqual(moved, source);
});

test("scaleSelectedActions conserve la disposition relative autour du coin oppose", () => {
  const source = [
    { type: "glyph", x: 20, y: 30, size: 10 },
    { type: "circle", cx: 50, cy: 60, radius: 20 },
    { type: "ring", cx: 90, cy: 90, radius: 10 },
  ];
  const scaled = scaleSelectedActions(source, [0, 1], { x: 10, y: 10 }, 2);

  assert.deepEqual(scaled[0], { type: "glyph", x: 30, y: 50, size: 20, userAdjusted: true });
  assert.deepEqual(scaled[1], { type: "circle", cx: 90, cy: 110, radius: 40 });
  assert.deepEqual(scaled[2], source[2]);
});

// Glyphs carry x/y; circles and rings carry cx/cy. `translateSelectedActions`
// branches on exactly that (`symbol-interactions.mjs:206-212`), so a circle
// written with x/y silently produces NaN coordinates and null bounds. Measured,
// not assumed.
const duplicationFixture = () => [
  { type: "glyph", x: 100, y: 100, size: 40, element: { name: "Feu" } },
  { type: "circle", cx: 200, cy: 150, radius: 50 },
  { type: "pen", points: [{ x: 10, y: 10 }] },
];

test("la duplication ajoute autant d'actions qu'il y en avait de selectionnees", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0, 1], 12, 12);

  assert.equal(result.actions.length, 5);
  assert.equal(result.indices.length, 2);
});

test("ce sont les copies, pas les originaux, qui restent selectionnees", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0, 1], 12, 12);

  assert.deepEqual(result.indices, [3, 4]);
  assert.equal(result.actions[0].x, 100, "le glyphe original ne bouge pas");
  assert.equal(result.actions[1].cx, 200, "le cercle original ne bouge pas");
  assert.equal(result.actions[3].x, 112, "la copie du glyphe est decalee");
  assert.equal(result.actions[4].cx, 212, "la copie du cercle est decalee du meme delta");
});

test("un delta partage preserve l'espacement relatif d'une selection mixte", () => {
  const actions = duplicationFixture();
  // Le glyphe expose son centre en x/y, le cercle en cx/cy. On compare bien
  // deux centres; seul le nom du champ differe.
  const spacingX = actions[1].cx - actions[0].x;
  const spacingY = actions[1].cy - actions[0].y;
  const result = planDuplication(actions, [0, 1], 25, -10);

  assert.equal(result.actions[3].x, 125);
  assert.equal(result.actions[3].y, 90);
  assert.equal(result.actions[4].cx, 225);
  assert.equal(result.actions[4].cy, 140);
  assert.equal(
    result.actions[4].cx - result.actions[3].x,
    spacingX,
    "un clamp par action deformerait le groupe",
  );
  assert.equal(result.actions[4].cy - result.actions[3].y, spacingY);
});

test("un delta nul est un non-evenement et n'empile rien", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0, 1], 0, 0);

  assert.equal(result.actions.length, 3);
  assert.deepEqual(result.indices, []);
});

test("une selection vide ne duplique rien", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [], 12, 12);

  assert.equal(result.actions.length, 3);
  assert.deepEqual(result.indices, []);
});

test("les originaux non selectionnes sont laisses intacts", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0], 12, 12);

  assert.deepEqual(result.actions[2], actions[2], "le trait a main levee n'est pas touche");
  assert.equal(result.actions.length, 4);
});

test("selectableActionBounds encadre les traces libres, rayons et spirales", () => {
  assert.deepEqual(
    selectableActionBounds({ type: "free", points: [{ x: 10, y: 20 }, { x: 30, y: 5 }, { x: 15, y: 40 }] }),
    { left: 10, right: 30, top: 5, bottom: 40, width: 20, height: 35 },
  );
  assert.deepEqual(
    selectableActionBounds({ type: "ray", cx: 50, cy: 60, x: 20, y: 80 }),
    { left: 20, right: 50, top: 60, bottom: 80, width: 30, height: 20 },
  );
  assert.deepEqual(
    selectableActionBounds({ type: "spiral", cx: 30, cy: 40, radius: 20, turns: 2 }),
    { left: 10, right: 50, top: 20, bottom: 60, width: 40, height: 40 },
  );
});

test("le clic detecte les traces libres, rayons et spirales", () => {
  const free = { type: "free", points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }] };
  const ray = { type: "ray", cx: 100, cy: 100, x: 160, y: 100 };
  const spiral = { type: "spiral", cx: 200, cy: 200, radius: 30, turns: 2 };

  assert.equal(topmostSelectableIndexAtPoint([free], { x: 20, y: 3 }, 5), 0);
  assert.equal(topmostSelectableIndexAtPoint([free], { x: 20, y: 20 }, 5), -1);
  assert.equal(topmostSelectableIndexAtPoint([ray], { x: 130, y: 102 }, 5), 0);
  assert.equal(topmostSelectableIndexAtPoint([ray], { x: 170, y: 100 }, 5), -1);
  assert.equal(topmostSelectableIndexAtPoint([spiral], { x: 230, y: 200 }, 5), 0);
  assert.equal(topmostSelectableIndexAtPoint([spiral], { x: 200, y: 200 }, 5), -1);
});

test("le rectangle selectionne aussi les traces libres, rayons et spirales partiellement touches", () => {
  const actions = [
    { type: "free", points: [{ x: 5, y: 5 }, { x: 50, y: 50 }] },
    { type: "ray", cx: 90, cy: 90, x: 120, y: 90 },
    { type: "spiral", cx: 300, cy: 300, radius: 20, turns: 2 },
  ];

  assert.deepEqual(
    selectableIndicesInRect(actions, { left: 0, right: 100, top: 0, bottom: 100 }),
    [0, 1],
  );
  assert.deepEqual(
    selectableIndicesInRect(actions, { left: 280, right: 320, top: 280, bottom: 320 }),
    [2],
  );
});

test("translateSelectedActions deplace les traces libres, rayons et spirales", () => {
  const source = [
    { type: "free", points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    { type: "ray", cx: 20, cy: 20, x: 40, y: 30 },
    { type: "spiral", cx: 50, cy: 50, radius: 15, turns: 2 },
  ];
  const moved = translateSelectedActions(source, [0, 1, 2], 5, -5);

  assert.deepEqual(moved[0], { type: "free", points: [{ x: 5, y: -5 }, { x: 15, y: 5 }] });
  assert.deepEqual(moved[1], { type: "ray", cx: 25, cy: 15, x: 45, y: 25 });
  assert.deepEqual(moved[2], { type: "spiral", cx: 55, cy: 45, radius: 15, turns: 2 });
});

test("scaleSelectedActions met a l'echelle les traces libres, rayons et spirales", () => {
  const source = [
    { type: "free", points: [{ x: 10, y: 10 }, { x: 20, y: 30 }] },
    { type: "ray", cx: 20, cy: 20, x: 40, y: 30 },
    { type: "spiral", cx: 50, cy: 50, radius: 15, turns: 2 },
  ];
  const scaled = scaleSelectedActions(source, [0, 1, 2], { x: 0, y: 0 }, 2);

  assert.deepEqual(scaled[0], { type: "free", points: [{ x: 20, y: 20 }, { x: 40, y: 60 }] });
  assert.deepEqual(scaled[1], { type: "ray", cx: 40, cy: 40, x: 80, y: 60 });
  assert.deepEqual(scaled[2], { type: "spiral", cx: 100, cy: 100, radius: 30, turns: 2 });
});

test("scaleSelectedActions ne borne pas la croissance des glyphes", () => {
  const source = [
    { type: "glyph", x: 10, y: 10, size: 100 },
    { type: "free", points: [{ x: 10, y: 10 }] },
  ];
  const scaled = scaleSelectedActions(source, [0, 1], { x: 0, y: 0 }, 2);

  assert.equal(scaled[0].size, 200);
  assert.deepEqual(scaled[1].points, [{ x: 20, y: 20 }]);
});

test("reorderSelectedActions preserve l'ordre relatif au premier et arriere plan", () => {
  const actions = [
    { type: "free", label: "back", points: [{ x: 0, y: 0 }] },
    { type: "glyph", label: "first", x: 10, y: 10, size: 12 },
    { type: "circle", label: "middle", cx: 20, cy: 20, radius: 10 },
    { type: "glyph", label: "last", x: 30, y: 30, size: 12 },
  ];

  const front = reorderSelectedActions(actions, [1, 3], "front");
  assert.deepEqual(front.actions.map((action) => action.label), ["back", "middle", "first", "last"]);
  assert.deepEqual(front.indices, [2, 3]);

  const back = reorderSelectedActions(actions, [1, 3], "back");
  assert.deepEqual(back.actions.map((action) => action.label), ["first", "last", "back", "middle"]);
  assert.deepEqual(back.indices, [0, 1]);
  assert.throws(() => reorderSelectedActions(actions, [1], "side"), /placement/);
});

test("rotateSelectedActions pivote un glyphe et sa rotation propre", () => {
  const source = [{ type: "glyph", x: 10, y: 0, size: 10, rotation: 0.5 }];
  const rotated = rotateSelectedActions(source, [0], { x: 0, y: 0 }, Math.PI / 2);

  assert.ok(Math.abs(rotated[0].x - 0) < 1e-9);
  assert.ok(Math.abs(rotated[0].y - 10) < 1e-9);
  assert.ok(Math.abs(rotated[0].rotation - (0.5 + Math.PI / 2)) < 1e-9);
  assert.equal(rotated[0].userAdjusted, true);
  assert.notEqual(rotated, source);
  assert.equal(source[0].x, 10);
});

test("rotateSelectedActions attribue un angle aux glyphes sans rotation", () => {
  const source = [{ type: "glyph", x: 0, y: 10, size: 10 }];
  const rotated = rotateSelectedActions(source, [0], { x: 0, y: 0 }, 0.25);

  assert.equal(rotated[0].rotation, 0.25);
});

test("rotateSelectedActions pivote les traces libres et les deux bouts des rayons", () => {
  const source = [
    { type: "free", points: [{ x: 10, y: 0 }, { x: 20, y: 0 }] },
    { type: "ray", cx: 10, cy: 0, x: 20, y: 0 },
  ];
  const rotated = rotateSelectedActions(source, [0, 1], { x: 0, y: 0 }, Math.PI / 2);

  assert.ok(Math.abs(rotated[0].points[0].x) < 1e-9 && Math.abs(rotated[0].points[0].y - 10) < 1e-9);
  assert.ok(Math.abs(rotated[0].points[1].x) < 1e-9 && Math.abs(rotated[0].points[1].y - 20) < 1e-9);
  assert.ok(Math.abs(rotated[1].cx) < 1e-9 && Math.abs(rotated[1].cy - 10) < 1e-9);
  assert.ok(Math.abs(rotated[1].x) < 1e-9 && Math.abs(rotated[1].y - 20) < 1e-9);
});

test("rotateSelectedActions ne pivote que le centre des cercles et spirales", () => {
  const source = [
    { type: "circle", cx: 10, cy: 0, radius: 5 },
    { type: "ring", cx: 10, cy: 0, radius: 8 },
    { type: "spiral", cx: 10, cy: 0, radius: 15, turns: 2 },
  ];
  const rotated = rotateSelectedActions(source, [0, 1, 2], { x: 0, y: 0 }, Math.PI / 2);

  for (const action of rotated) {
    assert.ok(Math.abs(action.cx) < 1e-9);
    assert.ok(Math.abs(action.cy - 10) < 1e-9);
  }
  assert.equal(rotated[0].radius, 5);
  assert.equal(rotated[1].radius, 8);
  assert.equal(rotated[2].radius, 15);
  assert.equal(rotated[2].turns, 2);
});

test("rotateSelectedActions ignore les non selectionnes et refuse un angle invalide", () => {
  const source = [
    { type: "glyph", x: 10, y: 0, size: 10 },
    { type: "glyph", x: 20, y: 0, size: 10 },
  ];
  const rotated = rotateSelectedActions(source, [0], { x: 0, y: 0 }, Math.PI / 2);

  assert.deepEqual(rotated[1], source[1]);
  assert.throws(
    () => rotateSelectedActions(source, [0], { x: 0, y: 0 }, Number.NaN),
    TypeError,
  );
});

test("combinedSelectionBounds reunit glyphes, traces libres et rayons", () => {
  const actions = [
    { type: "glyph", x: 20, y: 20, size: 10 },
    { type: "free", points: [{ x: 50, y: 10 }, { x: 70, y: 30 }] },
    { type: "ray", cx: 0, cy: 0, x: 10, y: 5 },
  ];

  assert.deepEqual(combinedSelectionBounds(actions, [0, 1, 2]), {
    left: 0,
    right: 70,
    top: 0,
    bottom: 31.8,
    width: 70,
    height: 31.8,
  });
});
