import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";

test("les symboles corriges utilisent les nouveaux traces partages", () => {
  assert.equal(SYMBOL_PATHS["Vent sous pied"].length, 4);
  assert.match(SYMBOL_PATHS["Vent sous pied"][0], /M24 5 C31 5/);
  assert.equal(SYMBOL_PATHS.Vent.length, 2);
  assert.match(SYMBOL_PATHS.Vent[0], /M28 13 C31 10/);
  assert.match(SYMBOL_PATHS.Vent[1], /M13 17 L8 12/);
  assert.equal(SYMBOL_PATHS.Aeriforme.length, 6);
  assert.match(SYMBOL_PATHS.Aeriforme[0], /M24 7 C18 7/);
  assert.equal(SYMBOL_PATHS.Eau.length, 3);
  assert.match(SYMBOL_PATHS.Eau[1], /M27 5 C21 6/);
});

test("le navigateur charge la nouvelle version du catalogue partage", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(app, /symbol-catalog\.mjs\?v=20260716-sigil-audit-v2/);
  assert.match(html, /app\.js\?v=20260716-sigil-audit-v2/);
});
