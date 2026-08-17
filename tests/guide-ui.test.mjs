import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("l'atelier expose le tiroir de guides et la sauvegarde d'exemple", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  for (const id of [
    "guideToggleButton",
    "guideDrawer",
    "guideLibraryList",
    "guidePersonalList",
    "guideVisibleInput",
    "guideOpacityInput",
    "clearGuideButton",
    "saveExampleButton",
  ]) {
    assert.match(html, new RegExp(`id=[\"']${id}[\"']`));
  }
});

test("l'application cable les guides officiels et personnels sous le dessin", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /LIBRARY_CIRCLES/);
  assert.match(app, /loadUserGuides/);
  assert.match(app, /function drawActiveGuide\(/);
  assert.match(app, /function saveCurrentCircleAsGuide\(/);
  assert.match(app, /guide\.raster\?\.src \|\| buildSpellPreviewDataUrl\(guide\.actions\)/);
  assert.match(app, /import \{ buildSpellPreviewDataUrl \} from "\.\/spell-preview\.mjs"/);
  assert.match(app, /function deletePersonalGuide\(/);
  assert.match(app, /function drawSelectedGuide\(/);
  assert.match(app, /function beginGuideResize\(/);
  assert.match(app, /function moveGuideResize\(/);
  assert.match(app, /drawActiveGuide\([\s\S]*for \(const action of state\.actions\)/);
});

test("les guides possedent des styles de carte, d'onglet et d'etat actif", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.guide-island/);
  assert.match(css, /\.guide-tabs/);
  assert.match(css, /\.guide-card\.is-active/);
  assert.match(css, /\.guide-controls/);
});

test("tout le tiroir des guides defile sans zone de defilement imbriquee", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const drawerRules = [...css.matchAll(/(?:^|\n)\s*\.guide-drawer\s*\{([^}]*)\}/g)].map((match) => match[1]);
  const listRule = css.match(/\.guide-list\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.ok(drawerRules.length >= 2, "le breakpoint mobile doit retablir le defilement du tiroir");
  for (const drawerRule of drawerRules) {
    assert.match(drawerRule, /overflow-y:\s*auto/);
  }
  assert.match(drawerRules[0], /overscroll-behavior:\s*contain/);
  assert.doesNotMatch(listRule, /overflow-y:\s*(?:auto|scroll)/);
  assert.doesNotMatch(listRule, /flex:\s*1\s+1\s+auto/);
});
