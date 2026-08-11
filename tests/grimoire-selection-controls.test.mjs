import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const i18n = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");

test("le grimoire remplace la force et les boutons d'echelle par des controles de style", () => {
  assert.doesNotMatch(html, /id=["']intensityInput["']/);
  assert.match(html, /id=["']strokeInput["'][^>]+type=["']range["']/);
  assert.match(html, /id=["']inkColorInput["'][^>]+type=["']color["']/);
  assert.match(html, /id=["']selectionScaleInput["'][^>]+type=["']range["']/);
  assert.match(html, /id=["']selectionScaleValue["']>x1</);
  assert.doesNotMatch(html, /id=["'](?:zoomOutButton|zoomResetButton|zoomInButton)["']/);
});

test("epaisseur et couleur modifient la selection ou les prochains traits", () => {
  assert.match(app, /styleSelectedActions/);
  assert.match(app, /function applySelectedStyle\(/);
  assert.match(app, /strokeInput\.addEventListener\("input"/);
  assert.match(app, /inkColorInput\?\.addEventListener\("input"/);
  assert.match(app, /state\.drawingColor/);
  const widthBody = app.match(/function lineWidth\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(widthBody, /state\.strokeSize/);
  assert.doesNotMatch(widthBody, /intensity/);
});

test("l'echelle est relative a la selection et reste le zoom sans selection", () => {
  assert.match(app, /selectionScaleRatio:\s*1/);
  assert.match(app, /function syncSelectionGrimoire\(/);
  assert.match(app, /function applyScaleSliderDelta\(/);
  assert.match(app, /scaleSelectedActions/);
  assert.match(app, /setCanvasScaleAround/);
});

test("la rotation rapide est disponible pres de la selection", () => {
  for (const id of ["selectionRotationDock", "selectionRotationValue", "rotateSelectionQuarterLeftButton", "rotateSelectionQuarterRightButton"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`const ${id} = document\\.querySelector\\("#${id}"\\)`));
  }
  assert.match(html, /id=["']selectionRotationValue["'][^>]*>0deg</);
  assert.match(app, /function selectionRotationDegrees\(/);
  assert.match(app, /selectionRotationValue\.textContent = `\$\{selectionRotationDegrees\(indices\)\}deg`/);
  assert.match(app, /function syncSelectionRotationDock\(/);
  assert.match(app, /rotateSelectionQuarterLeftButton\?\.addEventListener\("click", \(\) => rotateSelection\(-SELECTION_QUARTER_TURN\)\)/);
  assert.match(app, /rotateSelectionQuarterRightButton\?\.addEventListener\("click", \(\) => rotateSelection\(SELECTION_QUARTER_TURN\)\)/);
});

test("la puissance est derivee du diametre", () => {
  assert.match(app, /function diameterPowerLevel\(/);
  const metrics = app.match(/function spellMetrics\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(metrics, /diameterPowerLevel\(diameter\)/);
  assert.doesNotMatch(metrics, /state\.intensity/);
});

test("les libelles de couleur et d'echelle relative existent dans les deux langues", () => {
  for (const key of ["grimoire.inkColor", "grimoire.objectScale", "status.selectionStyleUpdated", "tool.rotateQuarterLeft", "tool.rotateQuarterRight"]) {
    assert.equal(i18n.split(`"${key}"`).length - 1, 2, key);
  }
});
