import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");

test("the library exposes the complete wiki navigation", () => {
  for (const id of ["overview", "schematics", "variants", "sigils", "signs", "supports", "fidelity"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});

test("the explorer has accessible search filters results pagination and details", () => {
  assert.match(html, /role="search"/);
  assert.match(html, /<label[^>]+for="variantSearch"/);
  for (const id of ["variantSearch", "sigilFilter", "signFilter", "roleFilter", "supportFilter", "fidelityFilter", "warningFilter", "effectFilter", "sortFilter"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="variantResults"[^>]+aria-live="polite"/);
  assert.match(html, /id="variantPager"/);
  assert.match(html, /<dialog[^>]+id="variantDialog"/);
  assert.match(html, /library-explorer\.mjs/);
});
