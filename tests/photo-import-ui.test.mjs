import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("l'atelier expose l'import photo complet", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="circleImportButton"/);
  assert.match(html, /id="circleJsonExportButton"/);
  assert.match(html, /id="circleImportPhotoButton"/);
  assert.match(html, /id="circleJsonInput"/);
  assert.match(html, /id="circleJsonImportButton"/);
  assert.match(html, /id="circleJsonExportDialog"/);
  assert.match(html, /id="circleJsonExportText"/);
  assert.match(html, /id="circleJsonCopyButton"/);
  assert.match(html, /id="circleJsonDownloadButton"/);
  assert.match(html, /id="circleJsonCopyLinkButton"/);
  assert.match(html, /id="photoFileInput"/);
  assert.match(html, /id="photoImportDialog"/);
  assert.match(html, /id="photoPreviewImage"/);
  assert.match(html, /id="photoImportResults"/);
  assert.match(html, /id="photoRecreateButton"/);
  assert.match(html, /id="photoGuideButton"/);
  assert.match(html, /data-i18n="import.toggle"/);
  assert.match(html, /data-i18n="import.exportJson"/);
  assert.match(html, /data-i18n="import.photoChoice"/);
  assert.match(html, /data-i18n="import.jsonChoice"/);
  assert.match(html, /data-i18n="import.exportTitle"/);
  assert.match(html, /data-i18n="import.copyJson"/);
  assert.match(html, /data-i18n="import.downloadJson"/);
  assert.match(html, /data-i18n="import.copyLink"/);
  assert.match(html, /data-i18n="photo\.recreate"/);
  assert.match(html, /data-i18n="photo\.guide"/);
});

test("l'atelier importe l'analyse photo", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const photoSource = await readFile(new URL("../photo-import.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ analyzePhoto \} from "\.\/photo-import\.mjs\?v=20260809-handoff-layout-v2"/);
  assert.match(source, /from "\.\/guide-storage\.mjs\?v=20260809-handoff-layout-v2"/);
  assert.match(source, /createPhotoRegionFromBounds,\s+mapPhotoAnalysis,\s+selectPhotoSymbol,\s+setPhotoRegionBounds,\s+setPhotoRegionPosition,\s+sourceCropForAnalysis,\s+\} from "\.\/photo-placement\.mjs\?v=20260811-photo-edit-v1"/);
  assert.match(source, /createImageBitmap/);
  assert.match(source, /serializeCircleShare/);
  assert.match(source, /parseCircleShareText/);
  assert.match(source, /importCircleShareText/);
  assert.match(source, /openCircleJsonExportDialog/);
  assert.match(source, /downloadCircleJsonFromDialog/);
  assert.match(source, /copyCircleJsonFromDialog/);
  assert.match(source, /copyCircleJsonLinkFromDialog/);
  assert.match(source, /recreatePhotoImport/);
  assert.match(source, /savePhotoAsGuide/);
  assert.match(photoSource, /from "\.\/stroke-matcher\.mjs\?v=20260809-handoff-layout-v2"/);
  assert.match(source, /type: "circle"/);
  assert.doesNotMatch(source, /const ringAction = \{\s*type: "ring"/);
});

test("la boite de dialogue affiche le recadrage corrige et chaque region une fois", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(source, /drawDetectionOverlay/);
  assert.match(source, /analysis\.cropBounds/);
  assert.match(source, /context\.translate\(-cropBounds\.left, -cropBounds\.top\)/);
  assert.match(source, /for \(const region of analysis\.regions \|\| \[\]\)/);
  assert.match(source, /photoPreviewOverlay/);
  assert.match(source, /renderPhotoRegionOverlay/);
  assert.match(source, /startPhotoRegionDrag/);
  assert.match(source, /createPhotoRegionFromBounds/);
  assert.match(source, /setPhotoRegionBounds/);
  assert.match(source, /openPhotoRegionSearch\(index\)/);
  assert.match(source, /selectPhotoSymbol\(pendingPhotoImport\.analysis, photoEditRegionIndex, element\)/);
  assert.match(source, /setPhotoRegionPosition\(/);
  assert.match(source, /photo-region-edit/);
  assert.match(source, /photo-region-position/);
  assert.match(source, /photoScoreTier/);
  assert.match(source, /photo-import-row/);
  assert.match(source, /photo-import-meter/);
  assert.match(source, /elementIconMarkup\(element\)/);
  assert.match(css, /\.photo-import-row/);
  assert.match(css, /\.photo-import-meter/);
  assert.match(css, /data-tier="high"/);
  assert.match(css, /\.photo-preview-overlay/);
  assert.match(css, /\.photo-region-box/);
  assert.match(css, /\.photo-region-handle/);
  assert.match(css, /\.photo-region-edit/);
  assert.match(css, /\.photo-region-position/);
  assert.match(css, /\.photo-dialog-actions > button/);
  assert.match(css, /\.photo-dialog-actions > form\s*\{[^}]*flex:/s);
  assert.match(css, /\.photo-dialog-actions > form \.dialog-close\s*\{[^}]*width:\s*100%/s);
});

test("le guide photo conserve le raster corrige sans ajouter d'actions", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /createUserGuide\(\[\], \{/);
  assert.match(source, /raster: \{/);
  assert.match(source, /src: pending\.cropDataUrl/);
  assert.match(source, /sourceCropForAnalysis/);
  assert.match(source, /drawImage\(\s*bitmap,/);
  assert.match(source, /toDataURL\("image\/webp", 0\.82\)/);
  assert.match(source, /drawImage\(image, scaledBounds\.left, scaledBounds\.top, scaledBounds\.width, scaledBounds\.height\)/);
});

test("les chaines de l'import photo existent dans les deux locales", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  for (const key of [
    "photo.toggle", "photo.previewTitle", "photo.recreate", "photo.guide", "photo.cancel",
    "photo.result.ring", "photo.result.noRing", "photo.result.accepted",
    "photo.result.ambiguous", "photo.result.unreadable", "photo.result.choose",
    "photo.result.change", "photo.result.position", "photo.result.x", "photo.result.y",
    "photo.status.imported", "photo.status.guideSaved", "photo.status.guideUnsaved",
    "photo.status.nothing", "photo.status.error",
    "import.toggle", "import.exportJson", "import.photoChoice", "import.jsonChoice",
    "import.jsonLabel", "import.jsonPlaceholder", "import.status.exported",
    "import.exportTitle", "import.copyJson", "import.downloadJson", "import.copyLink",
    "import.closeExport", "import.status.copiedJson", "import.status.copiedLink",
    "import.status.linkTooLong",
    "import.status.importedJson", "import.status.invalidJson",
  ]) {
    const occurrences = source.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} doit exister en fr et en`);
  }
});

test("l'export JSON ouvre une fenetre centrale avec copie telechargement et lien", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(source, /circleJsonExportDialog/);
  assert.match(source, /circleJsonExportText\.value = json/);
  assert.match(source, /encodeCircleShare\(circle\)/);
  assert.match(source, /new URL\(window\.location\.href\)/);
  assert.match(source, /searchParams\.set\("communityCircle"/);
  assert.match(source, /circleJsonExportDialog\.showModal\(\)/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /circleJsonExportButton\?\.\addEventListener\("click", openCircleJsonExportDialog\)/);
  assert.doesNotMatch(source, /circleJsonExportButton\?\.\addEventListener\("click", downloadCircleJson\)/);
  assert.match(css, /\.circle-json-export-dialog/);
  assert.match(css, /\.circle-json-export-actions/);
  assert.match(css, /\.circle-json-export-text/);
});

test("la detection conserve le candidat visible et reste modifiable", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /return region\?\.candidates\?\.\[0\] \|\| null/);
  assert.match(source, /label\.textContent = element \? elementDisplayName\(element\) : candidate\?\.name/);
  assert.doesNotMatch(source, /photo\.result\.possible/);
  assert.doesNotMatch(source, /photo\.result\.confirmed/);
});

test("les chaines francaises de l'import photo restent sans accents", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  const entries = source.match(/"photo\.[^"]+": "[^"]*"/g) || [];
  const accented = entries.filter((entry) => /[àâäéèêëîïôöùûüçœæ]/i.test(entry));
  assert.deepEqual(accented, []);
});
