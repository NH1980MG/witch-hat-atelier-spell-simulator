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
  ]) {
    assert.match(html, new RegExp("id=[\\\"']" + id + "[\\\"']"));
  }
});

test("les etats de palette et de transport sont styles", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.simulator-page\.placement-open/);
  assert.match(css, /\.symbol-drag-ghost/);
  assert.match(css, /\.placement-card/);
});
