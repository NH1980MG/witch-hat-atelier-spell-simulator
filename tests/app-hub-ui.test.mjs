import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { translate } from "../i18n.mjs";

test("the public atelier opens directly on the drawing workshop", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<body class="simulator-page">/);
  assert.match(html, /<section class="workspace" data-i18n-aria-label="atelier\.region"/);
  assert.doesNotMatch(html, /app-home-page/);
  assert.doesNotMatch(html, /data-app-hub/);
  assert.doesNotMatch(html, /appHubGalleryGrid/);
  assert.doesNotMatch(html, /index\.html\?view=atelier/);
  assert.doesNotMatch(html, /id="practiceToggleButton"/);
});

test("the personal gallery is rendered from saved spells instead of library seeds", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function renderAppHubGallery\(\)/);
  assert.match(app, /loadMySpells\(localStorage\)/);
  assert.match(app, /spellPreviewSource\(spell\)/);
  assert.match(app, /buildSpellPreviewDataUrl/);
  assert.match(app, /appHubGalleryGrid\.append/);
  assert.doesNotMatch(app, /LIBRARY_CIRCLES\.map\([^\n]*appHubGalleryGrid/);
});

test("the app hub labels are bilingual", () => {
  const keys = [
    "appHub.eyebrow",
    "appHub.title",
    "appHub.description",
    "appHub.galleryTitle",
    "appHub.galleryDescription",
    "appHub.newCanvas",
    "appHub.emptyGallery",
    "appHub.canvases",
    "appHub.workshop",
    "appHub.library",
    "appHub.commons",
    "appHub.tutorial",
    "appHub.mods",
    "appHub.multiplayer",
    "appHub.adventure",
    "appHub.comingSoon",
  ];

  for (const key of keys) {
    assert.notEqual(translate("en", key), key, `${key} missing in English`);
    assert.notEqual(translate("fr", key), key, `${key} missing in French`);
  }
});

test("the public shell does not hide the drawing workshop behind app mode", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.app-home-page \.workspace\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /\.workspace\s*\{/);
});
