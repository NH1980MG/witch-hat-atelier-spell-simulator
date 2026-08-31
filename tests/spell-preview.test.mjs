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

test("les annotations restent visibles dans l'apercu sans injecter leur texte", () => {
  const preview = decodeURIComponent(buildSpellPreviewDataUrl([
    { type: "annotation", kind: "text", x: 20, y: 30, size: 18, text: "note <test>", color: "#6b4f2a", width: 2 },
    { type: "annotation", kind: "drawing", points: [{ x: 10, y: 10 }, { x: 30, y: 20 }], color: "#6b4f2a", width: 2 },
  ]));
  assert.match(preview, /note &lt;test&gt;/);
  assert.match(preview, /stroke-dasharray="3 4"/);
});
