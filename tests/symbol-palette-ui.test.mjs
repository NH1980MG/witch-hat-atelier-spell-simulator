import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("la page expose la palette et les outils de taille", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of [
    "placementToggleButton",
    "placementDrawer",
    "placementList",
    "closePlacementButton",
    "shrinkSelectionButton",
    "growSelectionButton",
    "symbolDragGhost",
    "selectToolButton",
  ]) {
    assert.match(html, new RegExp("id=[\\\"']" + id + "[\\\"']"));
  }
  assert.match(html, /styles\.css\?v=20260716-serif-labels-v1/);
  assert.match(html, /app\.js\?v=20260715-[^"']+/);
});

test("les etats de palette et de transport sont styles", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.simulator-page\.placement-open/);
  assert.match(css, /\.symbol-drag-ghost/);
  assert.match(css, /\.placement-card/);
  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(42px, 1fr\)\)/);
  assert.match(css, /\.simulator-page\.placement-open\.is-dragging-symbol \.placement-drawer/);
});

test("l'interface utilise la police serif historique", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const bodyRule = css.match(/(?:^|\n\n)body\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(bodyRule, /font-family:\s*Georgia, "Times New Roman", serif/);
  assert.match(css, /\.header-link > span\[aria-hidden="true"\]/);
  assert.match(css, /\.symbol-island > span\[aria-hidden="true"\]/);
  assert.doesNotMatch(css, /\.header-link span\s*\{/);
  assert.doesNotMatch(css, /\.symbol-island span,/);
});

test("l'application cable la selection contextuelle et son historique", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /contextmenu/);
  assert.match(app, /selectedGlyphIndex/);
  assert.match(app, /undoStack/);
  assert.match(app, /resizeSelectedGlyph/);
  assert.match(app, /function beginSelectionDrag\(/);
  assert.match(app, /function moveSelectionDrag\(/);
  assert.match(app, /function finishSelectionDrag\(/);
  const restoreBody = app.match(/function restoreActions\(snapshot\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(restoreBody, /selectedGlyphIndex = null/);
  assert.match(app, /function onPointerCancel\(event\)/);
  assert.match(app, /addEventListener\("pointercancel", onPointerCancel\)/);
});

test("la palette cable le transport Scratch jusqu'au canevas", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  for (const functionName of [
    "renderPlacementList",
    "startSymbolDrag",
    "moveSymbolDrag",
    "finishSymbolDrag",
    "cancelSymbolDrag",
  ]) {
    assert.match(app, new RegExp("function " + functionName + "\\("));
  }
  assert.match(app, /canDropGlyph/);
  assert.match(app, /state\.exporting = true/);
  assert.match(app, /state\.exporting = false/);
  assert.match(readme, /glisser.*Scratch/i);
});
