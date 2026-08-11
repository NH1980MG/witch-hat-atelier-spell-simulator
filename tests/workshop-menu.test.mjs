import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publicPages = [
  "index.html",
  "bibliotheque.html",
  "tutoriel.html",
  "fonctionnement.html",
  "parametres.html",
  "suggestions.html",
];

test("every public page exposes the compact workshop navigation", async () => {
  for (const page of publicPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /data-workshop-menu/, `${page}: missing workshop menu`);
    assert.match(html, /id="workshopMenuToggle"/, `${page}: missing menu toggle`);
    assert.match(html, /data-i18n="nav.menu"/, `${page}: missing translated menu label`);
    assert.match(html, /site-nav.mjs/, `${page}: missing shared menu runtime`);
  }
});

test("the workshop menu runtime keeps the collapsed state accessible and persistent", async () => {
  const source = await readFile(new URL("../site-nav.mjs", import.meta.url), "utf8");
  assert.match(source, /aria-expanded/);
  assert.match(source, /localStorage/);
  assert.match(source, /Escape/);
  assert.match(source, /hidden/);
});

test("the menu stylesheet preserves a visible rail and a bounded open panel", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.workshop-menu-toggle[\s\S]*?width:\s*56px/);
  assert.match(css, /\.workshop-menu\.is-open[\s\S]*?width:\s*min\(280px/);
  assert.match(css, /\.workshop-menu-panel[\s\S]*?max-width:\s*calc\(100vw\s*-\s*24px\)/);
  assert.match(css, /\.view3d-panel[\s\S]*?z-index:\s*120/);
});
