import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { translate } from "../i18n.mjs";
import { PALETTE_ELEMENTS } from "../symbol-palette-data.mjs";

const repoFiles = Object.freeze([
  "app.js",
  "docs/community-mechanics-audit-2026-08-08.md",
  "docs/mechanics-fidelity-report.md",
  "docs/progress-tracker.md",
  "docs/spell-effect-catalog.md",
  "spell-grammar.mjs",
  "symbol-palette-data.mjs",
  "tutoriel.html",
]);

const readRepoFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("crosshair catalogue text defines long and short sides without reversing the target side", () => {
  const crosshair = PALETTE_ELEMENTS.find((element) => element.name === "Viseur");

  assert.ok(crosshair);
  assert.match(crosshair.meaning, /cote long/i);
  assert.match(crosshair.meaning, /cote court/i);
  assert.match(crosshair.meaning, /cote court.*cible/i);
});

test("crosshair tutorial copy defines the targeting side in English and French", () => {
  const english = `${translate("en", "tutorial.step8.body")} ${translate("en", "tutorial.step8.examples")}`;
  const french = `${translate("fr", "tutorial.step8.body")} ${translate("fr", "tutorial.step8.examples")}`;

  assert.match(english, /long side/i);
  assert.match(english, /short side/i);
  assert.match(english, /short side.*target/i);
  assert.match(french, /cote long/i);
  assert.match(french, /cote court/i);
  assert.match(french, /cote court.*cible/i);
});

test("tracked crosshair documentation does not claim that the long side targets", async () => {
  for (const path of repoFiles) {
    const text = await readRepoFile(path);
    assert.doesNotMatch(text, /long (?:side|ends?) (?:point|points|face|faces|aim|aims|target|targets) (?:at |toward |the )?(?:target|cible)/i, path);
    assert.doesNotMatch(text, /cote long (?:pointe|vise) (?:vers |la |le )?cible/i, path);
  }
});
