import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("la composition sigillaire possede un bouton et une fenetre dedies", () => {
  assert.match(html, /id=["']compositionToggleButton["']/);
  assert.match(html, /aria-controls=["']sigilCompositionDialog["']/);
  assert.match(html, /<dialog[^>]+id=["']sigilCompositionDialog["'][^>]+class=["'][^"']*sigil-composition-dialog/);
  assert.match(html, /id=["']closeSigilCompositionButton["']/);
  assert.doesNotMatch(html, /id=["']sigilCompositionTab["']/);
  assert.match(app, /function openSigilCompositionDialog\(/);
  assert.match(app, /compositionToggleButton\?\.addEventListener\("click"/);
  assert.match(app, /sigilCompositionDialog\?\.addEventListener\("close"/);
  assert.match(css, /\.sigil-composition-dialog\s*\{/);
});
