import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const readDock = app.match(/function readToolbarDock\(\) \{[\s\S]*?\n\}/)[0];

for (const saved of [null, {version: 2, layout: "top", yRatio: 0}, {layout: "side", side: "right", yRatio: 0.75}]) {
  test(`toolbar remains vertical with preference ${JSON.stringify(saved)}`, () => {
    const result = vm.runInNewContext(`${readDock}; readToolbarDock()`, {
      localStorage: { getItem: () => JSON.stringify(saved) },
    });
    assert.equal(result.layout, "side");
    assert.equal(result.yRatio, saved?.yRatio ?? 0);
    assert.equal(result.side, saved?.side ?? "left");
  });
}

test("invalid stored toolbar preferences still open vertically", () => {
  const result = vm.runInNewContext(`${readDock}; readToolbarDock()`, {
    localStorage: { getItem: () => "invalid json" },
  });
  assert.equal(result.layout, "side");
  assert.equal(result.yRatio, 0);
});
