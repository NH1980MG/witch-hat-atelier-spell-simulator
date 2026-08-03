import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("l'atelier expose l'import photo complet", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="photoImportButton"/);
  assert.match(html, /id="photoFileInput"/);
  assert.match(html, /id="photoImportDialog"/);
  assert.match(html, /id="photoPreviewImage"/);
  assert.match(html, /id="photoImportResults"/);
  assert.match(html, /id="photoImportConfirm"/);
  assert.match(html, /data-i18n="photo\.toggle"/);
  assert.match(html, /data-i18n="photo\.confirm"/);
});

test("l'atelier importe l'analyse photo", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /import \{ analyzePhoto \} from "\.\/photo-import\.mjs\?v=/);
  assert.match(source, /createImageBitmap/);
  assert.match(source, /confirmPhotoImport/);
});

test("la boite de dialogue affiche icones, jauges et cadres de detection", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(source, /drawDetectionOverlay/);
  assert.match(source, /photoScoreTier/);
  assert.match(source, /photo-import-row/);
  assert.match(source, /photo-import-meter/);
  assert.match(source, /elementIconMarkup\(element\)/);
  assert.match(css, /\.photo-import-row/);
  assert.match(css, /\.photo-import-meter/);
  assert.match(css, /data-tier="high"/);
  assert.match(css, /\.photo-dialog-actions > button/);
});

test("les chaines de l'import photo existent dans les deux locales", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  for (const key of [
    "photo.toggle", "photo.previewTitle", "photo.confirm", "photo.cancel",
    "photo.result.ring", "photo.result.ignored",
    "photo.status.imported", "photo.status.nothing", "photo.status.error",
  ]) {
    const occurrences = source.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} doit exister en fr et en`);
  }
});

test("les chaines francaises de l'import photo restent sans accents", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  const entries = source.match(/"photo\.[^"]+": "[^"]*"/g) || [];
  const accented = entries.filter((entry) => /[àâäéèêëîïôöùûüçœæ]/i.test(entry));
  assert.deepEqual(accented, []);
});
