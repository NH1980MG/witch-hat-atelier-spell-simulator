import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pages = ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"];

test("all public pages use the canonical brand mark", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /assets\/brand\/atelier-mark\.svg/);
    assert.match(html, /rel="icon"[^>]+atelier-mark\.svg/);
  }
});

test("all public pages publish both PNG brand icon sizes", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /atelier-mark-180\.png/);
    assert.match(html, /atelier-mark-512\.png/);
  }
});
