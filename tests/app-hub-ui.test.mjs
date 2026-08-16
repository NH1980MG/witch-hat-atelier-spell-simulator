import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { translate } from "../i18n.mjs";

test("the atelier opens with a non-interactive app hub mockup", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<body class="simulator-page app-home-page" data-app-view-title="Atelier">/);
  assert.match(html, /<section class="app-hub app-hub-home" data-app-hub/);
  assert.match(html, /<div class="app-hub-topbar">/);
  assert.match(html, /<div class="app-hub-shortcuts" aria-hidden="false">/);
  assert.match(html, /<section class="app-hub-gallery" aria-labelledby="appHubGalleryTitle">/);
  assert.match(html, /<div class="app-hub-gallery-grid" id="appHubGalleryGrid"/);
  assert.match(html, /<div class="app-hub-gallery-empty"/);
  assert.match(html, /<a class="app-hub-new-canvas" href="index\.html\?view=atelier"/);
  assert.match(html, /data-i18n="appHub\.newCanvas"/);
  assert.doesNotMatch(html, /app-hub-spell-card/);
  assert.doesNotMatch(html, /assets\/library-schematics\//);
  assert.doesNotMatch(html, /app-hub-showcase/);
  assert.doesNotMatch(html, /ancient-light-beacon\.png/);
  assert.match(html, /<a class="app-hub-shortcut app-hub-shortcut-primary" href="index\.html"[\s\S]*data-i18n="appHub\.canvases"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.workshop"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.library"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.commons"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.tutorial"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.mods"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.multiplayer"/);
  assert.match(html, /<button class="app-hub-shortcut" type="button" disabled[\s\S]*data-i18n="appHub\.adventure"/);
  assert.doesNotMatch(html, /class="app-hub-card[^"]*" href=/);
  assert.match(html, /data-app-view-title="Atelier"/);
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

test("the app hub has a responsive designed shell", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.app-home-page \.app-shell\s*\{/);
  assert.match(css, /\.app-home-page \.workspace\s*\{[\s\S]*?display:\s*none/);
  assert.match(css, /\.app-hub\s*\{/);
  assert.match(css, /\.app-hub-home\s*\{[\s\S]*?min-height:\s*calc\(100dvh - 68px\)/);
  assert.match(css, /\.app-hub-topbar\s*\{/);
  assert.match(css, /\.app-hub-shortcuts\s*\{/);
  assert.match(css, /\.app-hub-gallery-grid\s*\{/);
  assert.match(css, /\.app-hub-gallery-empty\s*\{/);
  assert.match(css, /\.app-hub-new-canvas\s*\{/);
  assert.match(css, /\.app-hub-shortcut:disabled/);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.app-hub-shortcuts/);
  assert.match(css, /html\[data-app-view="atelier"\][\s\S]*?\.app-hub/);
});
