import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { translate } from "../i18n.mjs";

test("the public entry opens on the local app gallery with a new-canvas link", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<body class="simulator-page toolbar-side app-home-page"/);
  assert.match(html, /<section class="workspace" data-i18n-aria-label="atelier\.region"/);
  assert.match(html, /data-app-hub/);
  assert.match(html, /appHubGalleryGrid/);
  assert.match(html, /index\.html\?view=atelier/);
  const hub = html.split('data-app-hub')[1].split('<section class="workspace"')[0];
  assert.doesNotMatch(hub, /data-i18n="appHub\.(mods|adventure|tutorial|workshop)"/);
  assert.match(hub, /href="bibliotheque\.html"/);
  assert.match(hub, /href="https:\/\/circle-commons-atelier[^" ]+\/gallery"/);
  assert.doesNotMatch(html, /id="practiceToggleButton"/);
});

test("the personal gallery is rendered from saved spells instead of library seeds", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function renderAppHubGallery\(\)/);
  assert.match(app, /loadMySpells\(localStorage\)/);
  assert.match(app, /spellPreviewSource\(spell\)/);
  assert.match(app, /buildSpellPreviewDataUrl/);
  assert.match(app, /appHubGalleryGrid\.append/);
  assert.match(app, /card\.href = savedSpellHref\(spell\.id\)/);
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
