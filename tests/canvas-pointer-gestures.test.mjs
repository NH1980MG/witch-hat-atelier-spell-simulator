import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const interactions = await readFile(new URL("../symbol-interactions.mjs", import.meta.url), "utf8");

test("le clic gauche du mode selection deplace la toile sans creer de rectangle", () => {
  const selectBranch = app.match(/if \(state\.tool === "select"\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert.match(app, /function beginLeftPan\(/);
  assert.match(app, /function moveLeftPan\(/);
  assert.match(app, /function finishLeftPan\(/);
  assert.match(selectBranch, /beginLeftPan\(event, point\)/);
  assert.doesNotMatch(selectBranch, /beginSelectionDrag\(event, point\)/);
  assert.match(app, /state\.leftPan\?\.pointerId === event\.pointerId/);
  assert.match(app, /topmostSelectableIndexAtPoint\(state\.actions, point\)/);
});

test("le panoramique gauche conserve le clic tactile simple pour selectionner", () => {
  assert.match(app, /leftPan: null/);
  assert.match(app, /drag\.moved = Math\.hypot\(dx, dy\) > 4/);
  assert.match(app, /if \(!drag\.moved\)[\s\S]*?topmostSelectableIndexAtPoint\(state\.actions, point\)/);
  assert.match(app, /beginPanGesture\(\)[\s\S]*?state\.leftPan = null/);
});

test("le rectangle droit selectionne les objets deja presents dans sa zone", () => {
  assert.match(app, /event\.button === 2[\s\S]*?beginRightSelection/);
  assert.match(app, /state\.selectedActionIndices = selectableIndicesInRect\(state\.actions/);
  assert.match(app, /state\.rightSelection\?\.pointerId === event\.pointerId[\s\S]*?finishRightSelection\(event\)/);
  assert.match(app, /state\.rightSelection\?\.pointerId === event\.pointerId[\s\S]*?cancelRightSelection\(event, true\)/);
  assert.match(interactions, /boundsIntersect\(bounds, selectionBounds\)/);
});

test("le relachement hors toile termine aussi le rectangle droit", () => {
  assert.match(app, /window\.addEventListener\("pointerup", onPointerUp\)/);
  assert.match(app, /window\.addEventListener\("pointercancel", onPointerCancel\)/);
});
