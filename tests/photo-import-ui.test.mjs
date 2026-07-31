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

test("les chaines de l'import photo existent dans les deux locales", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  for (const key of [
    "photo.toggle", "photo.previewTitle", "photo.confirm", "photo.cancel",
    "photo.result.ring", "photo.result.symbol", "photo.result.ignored",
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
