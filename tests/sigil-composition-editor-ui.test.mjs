import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("la composition expose un editeur de sceaux et un inspecteur", () => {
  for (const id of [
    "compositionSealList",
    "compositionInspector",
    "addCompositionSealButton",
    "detectCompositionSymbolsButton",
    "calibrateCompositionButton",
    "compositionTextureKind",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("les catalogues sigils et signes restent caches jusqu'a leur bouton", () => {
  for (const id of [
    "addCompositionRingButton",
    "openCompositionSigilPickerButton",
    "openCompositionSignPickerButton",
    "compositionSymbolPicker",
    "compositionSymbolPickerClose",
    "compositionSigilTray",
    "compositionSignTray",
    "compositionSymbolSearch",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /id=["']compositionSymbolPicker["'][^>]*hidden/);
});

test("l'inspecteur propose les controles parametriques et le joystick horizontal", () => {
  assert.match(app, /compositionRangeField/);
  assert.match(app, /repeatCount/);
  assert.match(app, /orbitRadius/);
  assert.match(app, /ringRotation/);
  assert.match(app, /composition-orientation-joystick/);
  assert.match(app, /openCompositionSymbolPicker/);
});

test("l’application branche l’editeur sur le modele de composition", () => {
  assert.match(app, /extractCompositionDocument/);
  assert.match(app, /compileCompositionDocument/);
  assert.match(app, /calibrateCompositionElement/);
  assert.match(app, /applyCompositionTexture/);
  assert.match(app, /detectCompositionSymbolsButton\?\.addEventListener\("click", openCircleImportDialog\)/);
  assert.match(app, /renderCompositionDocumentStage/);
});
