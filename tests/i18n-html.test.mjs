import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { catalogs } from "../i18n.mjs";

const pages = ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"];

test("every page exposes the bilingual control", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /class="language-switcher"/, `${page}: missing language switcher`);
    assert.match(html, /data-locale="en"/, `${page}: missing English button`);
    assert.match(html, /data-locale="fr"/, `${page}: missing French button`);
    assert.match(html, /site-i18n\.mjs/, `${page}: missing shared language controller`);
  }
});

test("all static translation attributes exist in both catalogs", async () => {
  const englishKeys = new Set(Object.keys(catalogs.en));
  const frenchKeys = new Set(Object.keys(catalogs.fr));

  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    for (const match of html.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)) {
      assert.ok(englishKeys.has(match[1]), `${page}: missing English key ${match[1]}`);
      assert.ok(frenchKeys.has(match[1]), `${page}: missing French key ${match[1]}`);
    }
  }
});
