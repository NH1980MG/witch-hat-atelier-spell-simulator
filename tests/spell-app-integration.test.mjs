import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const palette = await readFile(new URL("../symbol-palette-data.mjs", import.meta.url), "utf8");

test("the app shares the canonical primary-sigil decision", () => {
  assert.match(app, /from "\.\/spell-model\.mjs"/);
  const primary = app.match(/function primaryElementNameFromModel\(model\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(primary, /selectPrimarySigil\(model\?\.sigilCounts\)/);
  assert.doesNotMatch(primary, /score|charge/);
});

test("support behavior comes from the composed recipe", () => {
  assert.match(app, /model\.recipe\.supportPlan/);
});

test("runtime presentation keeps elemental mixtures composed", () => {
  assert.match(app, /createElementalMixturePresentation/);
  const labels = app.match(/function localizedRecipeLabel\(recipe\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(labels, /recipe\.elementalMixture/);
  assert.match(labels, /mixture\.labelFr\.slice/);

  const drawing = app.match(/function drawElementEffect\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(drawing, /drawElementalMixtureEffect2d/);

  const stateUpdate = app.match(/function updateSpellState\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(stateUpdate, /materialPresentationDisplayName\(runtimeMaterialPresentation\(model\)\)/);

  const usedMarks = app.match(/function updateUsedList\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(usedMarks, /actionDisplayLabel\(action\)/);

  const reading = app.match(/function analyzeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(reading, /status\.reading[\s\S]*localizedRecipeLabel\(model\.recipe\)/);
  assert.match(reading, /localizedArchitectureStatusLines\(model\.recipe/);
  assert.doesNotMatch(reading, /getLocale\(\) === "fr" \? spell/);
});

test("shoe summaries receive the composed recipe during model construction", () => {
  const call = app.match(/supportEffectNames\(\{([\s\S]*?)\}\)\)/)?.[1] || "";
  assert.match(call, /\brecipe\b/);

  const profile = app.match(/function shoeEffectProfile\(model\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(profile, /createElementalMixturePresentation\(model\.recipe\.elementalMixture\)/);
  assert.match(profile, /supportPlan\.effectIds/);
  assert.match(profile, /stable:\s*supportPlan\.stable/);
  assert.match(profile, /hazard:\s*supportPlan\.hazard/);

  const stability = app.match(/function supportStabilityBonus\(model = signModel\(\)\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(stability, /model\.recipe\.supportPlan/);
  assert.doesNotMatch(stability, /shoeEffectProfile\(model\)/);
});

test("the details drawer exposes structured fidelity information", () => {
  for (const id of ["fidelityLevel", "fidelityRules", "fidelityWarnings", "architectureStages", "architectureSymbols"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`#${id}`));
  }
  assert.match(html, /data-i18n=["']details\.architecture["']/);
  assert.match(html, /data-i18n=["']details\.symbolArchitecture["']/);
  assert.match(app, /updateArchitectureDetails\(model\.recipe\)/);
});

test("selection state supports multiple drawing actions", () => {
  assert.match(app, /selectedActionIndices:\s*\[\]/);
  assert.match(app, /function normalizeSelection\(/);
  assert.match(app, /function selectionBounds\(/);
  assert.match(app, /function drawSelection\(/);
  assert.match(app, /function drawSelectionMarquee\(/);
  assert.doesNotMatch(app, /selectedGlyphIndex:/);
});

test("right-button selection uses the full pointer lifecycle", () => {
  assert.match(app, /event\.button === 2[\s\S]*beginRightSelection/);
  assert.match(app, /moveRightSelection\(event/);
  assert.match(app, /finishRightSelection\(event/);
  assert.match(app, /cancelRightSelection\(event/);
  assert.match(app, /canvas\.setPointerCapture\(event\.pointerId\)/);
  assert.match(app, /contextmenu[\s\S]*event\.preventDefault\(\)/);
});

test("short right-click exposes Scratch-like actions for one targeted object", () => {
  assert.match(html, /id=["']selectionContextMenu["'][^>]+role=["']menu["']/);
  for (const action of ["select", "duplicate", "delete", "front", "back"]) {
    assert.match(html, new RegExp(`data-selection-action=["']${action}["']`));
  }
  assert.match(app, /state\.selectedActionIndices\s*=\s*\[index\]/);
  assert.match(app, /if \(event\.button !== 2 && handle && bounds\)/);
  assert.match(app, /openSelectionContextMenu\(/);
  assert.match(app, /reorderSelectedActions\(/);
});

test("trackpad wheel gestures control the viewport, never selection size", () => {
  const wheel = app.match(/function onCanvasWheel\(event\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(wheel, /event\.ctrlKey[\s\S]*setCanvasScale/);
  assert.doesNotMatch(wheel, /scaleSelectedActions/);
  assert.match(app, /pinchDistance/);
});

test("marquee selection is limited to drawing actions", () => {
  assert.match(app, /selectableIndicesInRect\(state\.actions/);
  assert.doesNotMatch(app, /selectableIndicesInRect\([^,]*guide/i);
});

test("the 3D renderer does not invent a radial power effect", () => {
  assert.doesNotMatch(app, /has\(["']temper["']\)/);
  assert.doesNotMatch(app, /calmRing/);
});

test("the 3D renderer consumes structured targeting semantics", () => {
  assert.match(app, /recipe\.effectPlan\?\.targeting/);
  assert.match(app, /targetPlan\.directional/);
  assert.match(app, /targetPlan\.shortEndsPointToTarget/);
});

test("air creation and movement use distinct 3D layers", () => {
  assert.match(app, /recipe\.effectPlan\?\.materialCapabilities/);
  assert.match(app, /createsAir/);
  assert.match(app, /movesAir/);
});

test("circle drawing geometry is passed into composed spell recipes", () => {
  assert.match(app, /function analyzeCircleGeometry\(/);
  assert.match(app, /nestedCircleCount/);
  assert.match(app, /semicircleCount/);
  assert.match(app, /joinableSemicircleCount/);
  assert.match(app, /const circleGeometry = analyzeCircleGeometry\(\{[\s\S]*rings[\s\S]*closedCircles[\s\S]*freeSeals[\s\S]*hasBoundary/);
  assert.match(app, /geometry:\s*\{\s*\.\.\.geometry,\s*\.\.\.circleGeometry\s*\}/);
});

test("radial is described as unresolved in both interface languages", () => {
  assert.match(app, /englishSignMeanings\[element\.name\]/);
  assert.match(app, /\bRadial:\s*["']Function unresolved/);
  assert.match(palette, /Radial["'][^\n]+fonction reste inconnue/i);
  assert.doesNotMatch(palette, /Radial["'][^\n]+tempere la puissance/i);
});
