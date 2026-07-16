import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("the app shares the canonical primary-sigil decision", () => {
  assert.match(app, /from "\.\/spell-model\.mjs"/);
  const primary = app.match(/function primaryElementNameFromModel\(model\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(primary, /selectPrimarySigil\(model\?\.sigilCounts\)/);
  assert.doesNotMatch(primary, /score|charge/);
});

test("support behavior comes from the composed recipe", () => {
  assert.match(app, /model\.recipe\.supportPlan/);
});

test("shoe summaries receive the composed recipe during model construction", () => {
  const call = app.match(/supportEffectNames\(\{([\s\S]*?)\}\)\)/)?.[1] || "";
  assert.match(call, /\brecipe\b/);
});

test("the details drawer exposes structured fidelity information", () => {
  for (const id of ["fidelityLevel", "fidelityRules", "fidelityWarnings"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`#${id}`));
  }
});
