import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../local-demo/effect-editor/index.html", import.meta.url);
const styleUrl = new URL("../local-demo/effect-editor/effect-editor.css", import.meta.url);
const readmeUrl = new URL("../local-demo/effect-editor/README.md", import.meta.url);

test("exposes the two creation modes and required editor controls", async () => {
  const html = await readFile(pageUrl, "utf8");
  for (const id of [
    "createModeTab", "composeModeTab", "createModePanel", "composeModePanel", "editorStatus",
    "symbolNameInput", "symbolKindSelect", "symbolRoleSelect", "symbolDrawingSurface",
    "undoStrokeButton", "clearCanvasButton", "saveSymbolButton", "savedSymbolsList",
    "catalogSymbolSelect", "componentRoleSelect", "addComponentButton", "compositionList",
    "effectPreview", "resetLocalDataButton",
    "effectWorkbench", "fullscreenEffect", "toggleEffectTools", "partType", "partTransforms",
    "shapeOutlinePad", "extrudeOutline", "motionPad", "motionCoordinates", "pathPlayback",
    "mixtureControls", "elementBalanceControls", "estimatedDamage", "estimatedSpeed",
  ]) {
    assert.match(html, new RegExp(`\\bid=[\"']${id}[\"']`), `missing #${id}`);
  }
  assert.match(html, /Créer un symbole/);
  assert.match(html, /Composer un effet/);
  assert.match(html, /type=["']module["'][^>]*src=["']\.\/effect-editor-ui\.mjs(?:\?v=[\w-]+)?["']/);
});

test("links the effect editor to the simulator and its animation sample", async () => {
  const html = await readFile(pageUrl, "utf8");
  assert.match(html, /href="\.\.\/\.\.\/index\.html"/);
  assert.match(html, /assets\/animations\/frappe-corps-entier\.glb/);
});

test("keeps page styles scoped and responsive", async () => {
  const css = await readFile(styleUrl, "utf8");
  assert.match(css, /\.effect-editor-demo\s*\{/);
  assert.match(css, /\.effect-editor-demo\s+\[role=["']tab["']\]:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#newCompositionButton\s*\{[^}]*margin-top:\s*18px/);
  assert.match(css, /:fullscreen/);
  assert.doesNotMatch(css, /(?:^|\})\s*(?:body|button|section|input)\s*\{/m);
});

test("documents local launch and demo limitations", async () => {
  const readme = await readFile(readmeUrl, "utf8");
  assert.match(readme, /python3 -m http\.server 8000 --bind 127\.0\.0\.1/);
  assert.match(readme, /\/local-demo\/effect-editor\//);
  assert.match(readme, /localStorage|stockées dans ce navigateur/i);
  assert.match(readme, /pas un effet 3D|ne valide pas.*3D/i);
});
