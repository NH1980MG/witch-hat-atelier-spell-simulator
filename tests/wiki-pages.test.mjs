import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const tutorial = await readFile(new URL("../tutoriel.html", import.meta.url), "utf8");
const library = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");

test("each wiki page has one h1 and stable chapter anchors", () => {
  assert.equal((tutorial.match(/<h1\b/g) || []).length, 1);
  assert.equal((library.match(/<h1\b/g) || []).length, 1);
  for (const id of ["quick-start", "anatomy", "sigils-signs", "geometry", "supports-limits", "fidelity", "variant-explorer", "controls"]) {
    assert.match(tutorial, new RegExp(`id="${id}"`));
    assert.match(tutorial, new RegExp(`href="#${id}"`));
  }
});

test("the tutorial links directly to the complete variant explorer", () => {
  assert.match(tutorial, /bibliotheque\.html#variants/);
  assert.match(tutorial, /38,532 tested variants/);
});
