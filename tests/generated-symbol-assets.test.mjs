import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
  SYMBOL_BOARD_ASSET,
  SYMBOL_BOARD_TRACE,
} from "../symbol-catalog.mjs";

test("chaque cellule de planche possede un masque visuel runtime", async () => {
  const boardEntries = Object.entries(SYMBOL_BOARD_TRACE).filter(([, trace]) => trace.board);

  assert.equal(boardEntries.length, 63);
  assert.deepEqual(Object.keys(SYMBOL_BOARD_ASSET), Object.keys(SYMBOL_BOARD_TRACE));

  for (const [name, trace] of boardEntries) {
    const asset = SYMBOL_BOARD_ASSET[name];
    assert.match(asset, /^assets\/symbol-glyphs\/[a-z0-9-]+\.png$/);
    await access(new URL(`../${asset}`, import.meta.url));
    assert.equal(trace.asset, asset);
  }

  assert.equal(SYMBOL_BOARD_ASSET.Vent, null);
});

test("le selecteur et le parchemin utilisent les masques issus des planches", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /SYMBOL_BOARD_ASSET/);
  assert.match(app, /class="symbol-board-glyph"/);
  assert.match(app, /function symbolBoardImage\(/);
  assert.match(app, /ctx\.drawImage\(tintedGlyph/);
  assert.match(css, /\.symbol-board-glyph\s*\{/);
  assert.match(css, /mask-image:\s*var\(--symbol-mask\)/);
});
