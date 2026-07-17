import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";

test("les symboles corriges utilisent les nouveaux traces partages", () => {
  assert.equal(SYMBOL_PATHS["Vent sous pied"].length, 7);
  assert.match(SYMBOL_PATHS["Vent sous pied"][0], /M24 7 C13 7/);
  assert.match(SYMBOL_PATHS["Vent sous pied"][4], /A 7 7/);
  assert.match(SYMBOL_PATHS["Vent sous pied"][6], /M24 18 C18 21/);
  assert.equal(SYMBOL_PATHS.Vent.length, 2);
  assert.match(SYMBOL_PATHS.Vent[0], /M28 13 C31 10/);
  assert.match(SYMBOL_PATHS.Vent[1], /M13 17 L8 12/);
  assert.equal(SYMBOL_PATHS.Aeriforme.length, 6);
  assert.match(SYMBOL_PATHS.Aeriforme[0], /M24 7 C18 7/);
  assert.equal(SYMBOL_PATHS.Eau.length, 3);
  assert.match(SYMBOL_PATHS.Eau[1], /M27 5 C21 6/);
});

test("les planches validees restent la source des sigils audites", () => {
  assert.equal(SYMBOL_PATHS.Cristal.length, 6);
  assert.match(SYMBOL_PATHS.Cristal[0], /M8 8 L40 40/);
  assert.match(SYMBOL_PATHS.Cristal[5], /M8 30 L18 40/);

  assert.match(SYMBOL_PATHS.Terre[2], /A 0\.9 0\.9/);
  assert.match(SYMBOL_PATHS.Terre[3], /A 0\.9 0\.9/);

  assert.match(SYMBOL_PATHS["Chat-hibou"].join(" "), /M16 22 C12 25/);
  assert.match(SYMBOL_PATHS["Chat-hibou"].join(" "), /M11 27 C18 25/);

  assert.match(SYMBOL_PATHS["Arret temporel"][2], /A 0\.9 0\.9/);
  assert.match(SYMBOL_PATHS["Flammes sans chaleur"][1], /M6 16 H10 V20 H6 Z/);
  assert.match(SYMBOL_PATHS["Flammes sans chaleur"][1], /M6 16 L10 20/);
});

test("le navigateur charge la nouvelle version du catalogue partage", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(app, /symbol-catalog\.mjs\?v=20260716-sigil-audit-v4/);
  assert.match(html, /app\.js\?v=20260716-unified-symbols-v3/);
});
