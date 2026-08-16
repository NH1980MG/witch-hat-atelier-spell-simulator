import assert from "node:assert/strict";
import test from "node:test";

import { buildSpellPreviewDataUrl } from "../spell-preview.mjs";

test("un ancien sort sans raster obtient un apercu image a partir de ses actions", () => {
  const preview = buildSpellPreviewDataUrl([
    { type: "ring", cx: 100, cy: 100, radius: 80, width: 3, color: "#201a16" },
    { type: "glyph", x: 100, y: 100, size: 24, width: 2, color: "#201a16", rune: "EA" },
  ]);

  assert.match(preview, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.match(decodeURIComponent(preview), /<circle/);
  assert.match(decodeURIComponent(preview), />EA<\/text>/);
});

test("un sort vide n'affiche pas un faux apercu", () => {
  assert.equal(buildSpellPreviewDataUrl([]), null);
});
