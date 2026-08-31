import assert from "node:assert/strict";
import test from "node:test";
import {
  isAnnotationAction,
  isSpellAction,
  spellActions,
  toggleSelectedCommentState,
} from "../action-semantics.mjs";
import { createSpell, loadMySpells, saveMySpells } from "../spell-library.mjs";
import { createUserGuide, loadUserGuides, saveUserGuides } from "../guide-storage.mjs";
import { decodeCircleShare, encodeCircleShare } from "../circle-share.mjs";
import {
  combinedSelectionBounds,
  rotateSelectedActions,
  scaleSelectedActions,
  styleSelectedActions,
  topmostSelectableIndexAtPoint,
  translateSelectedActions,
} from "../symbol-interactions.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const annotation = {
  type: "annotation",
  kind: "text",
  text: "zone a tester",
  x: 120,
  y: 80,
  size: 18,
  color: "#6b4f2a",
  width: 2,
  rotation: 0,
};
const drawingAnnotation = {
  type: "annotation",
  kind: "drawing",
  points: [{ x: 10, y: 10 }, { x: 25, y: 20 }, { x: 40, y: 10 }],
  color: "#6b4f2a",
  width: 2,
};
const circle = { type: "circle", cx: 100, cy: 100, radius: 60, closed: true, width: 3 };

test("une annotation est visible mais n'appartient pas au sort", () => {
  assert.equal(isAnnotationAction(annotation), true);
  assert.equal(isSpellAction(annotation), false);
  assert.deepEqual(spellActions([annotation, circle]), [circle]);
});

test("un objet ou un groupe peut devenir commentaire puis redevenir un element du sort", () => {
  const actions = [circle, { type: "glyph", x: 180, y: 120, rotation: 0 }];
  const commented = toggleSelectedCommentState(actions, [0, 1]);

  assert.equal(commented[0].comment, true);
  assert.equal(commented[1].comment, true);
  assert.deepEqual(spellActions(commented), []);

  const restored = toggleSelectedCommentState(commented, [0, 1]);
  assert.equal(restored[0].comment, undefined);
  assert.equal(restored[1].comment, undefined);
  assert.deepEqual(spellActions(restored), restored);
});

test("une selection mixte est convertie sans perdre la geometrie des objets", () => {
  const actions = [
    { ...circle, comment: true },
    { type: "ray", x1: 20, y1: 30, x2: 80, y2: 90, width: 4 },
    annotation,
  ];
  const commented = toggleSelectedCommentState(actions, [0, 1, 2]);

  assert.deepEqual(commented[0], { ...circle, comment: true });
  assert.deepEqual(commented[1], { ...actions[1], comment: true });
  assert.deepEqual(commented[2], annotation);

  const restored = toggleSelectedCommentState(commented, [0, 1, 2]);
  assert.equal(restored[0].comment, undefined);
  assert.equal(restored[1].comment, undefined);
  assert.deepEqual(restored[2], annotation);
});

test("une annotation reste manipulable comme un objet visuel", () => {
  const actions = [annotation, drawingAnnotation];
  assert.equal(topmostSelectableIndexAtPoint(actions, { x: 126, y: 76 }), 0);
  assert.equal(topmostSelectableIndexAtPoint(actions, { x: 25, y: 18 }), 1);
  assert.ok(combinedSelectionBounds(actions, [0, 1]).width > 0);
  const moved = translateSelectedActions(actions, [0], 10, 5);
  assert.deepEqual([moved[0].x, moved[0].y], [130, 85]);
  const scaled = scaleSelectedActions(actions, [0], { x: 120, y: 80 }, 2);
  assert.equal(scaled[0].size, 36);
  const rotated = rotateSelectedActions(actions, [0], { x: 120, y: 80 }, Math.PI / 2);
  assert.equal(rotated[0].rotation, Math.PI / 2);
});

test("le poids du texte est modifiable sans changer les autres types d'objet", () => {
  const styled = styleSelectedActions([annotation, circle], [0, 1], { fontWeight: 900, color: "#123456" });
  assert.equal(styled[0].fontWeight, 900);
  assert.equal(styled[0].color, "#123456");
  assert.equal(styled[1].fontWeight, undefined);
  assert.equal(styled[1].color, "#123456");
});

test("les annotations texte et dessin traversent les trois formats de sauvegarde", () => {
  const spellStorage = memoryStorage();
  const spell = createSpell({ name: "Notes", actions: [circle, annotation, drawingAnnotation], intensity: 3, stroke: 3 });
  saveMySpells(spellStorage, [spell]);
  assert.deepEqual(loadMySpells(spellStorage)[0].actions.slice(1), [annotation, drawingAnnotation]);

  const guideStorage = memoryStorage();
  const guide = createUserGuide([circle, annotation, drawingAnnotation], { id: "guide-annotations" });
  saveUserGuides(guideStorage, [guide]);
  assert.deepEqual(loadUserGuides(guideStorage)[0].actions.slice(1), [annotation, drawingAnnotation]);

  const shared = { version: 1, locale: "fr", title: "Notes", canvas: { width: 400, height: 300 }, actions: [circle, annotation, drawingAnnotation] };
  assert.deepEqual(decodeCircleShare(encodeCircleShare(shared)), shared);
});
