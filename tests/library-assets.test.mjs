import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
import { LIBRARY_CIRCLES } from "../library-circle-data.mjs";

test("the gallery keeps the 33 classified spells", () => {
  assert.equal(LIBRARY_CIRCLES.length, 33);
  assert.deepEqual(
    Object.fromEntries(
      ["vision", "mixed", "niche", "ancient-forbidden", "ancient-non-forbidden"]
        .map((category) => [category, LIBRARY_CIRCLES.filter((circle) => circle.category === category).length]),
    ),
    { vision: 3, mixed: 5, niche: 20, "ancient-forbidden": 3, "ancient-non-forbidden": 2 },
  );
});

test("every gallery entry has a local nonblank SVG", async () => {
  for (const circle of LIBRARY_CIRCLES) {
    const url = new URL(`../assets/library-schematics/${circle.id}.svg`, import.meta.url);
    assert.ok((await stat(url)).size > 250, circle.id);
    const svg = await readFile(url, "utf8");
    assert.match(svg, /^<svg[^>]+viewBox="0 0 240 240"/);
    assert.match(svg, /<title>/);
    assert.doesNotMatch(svg, /<image\b|(?:href|src)=["'](?:https?:|data:)/);
  }
});

test("every entry has bilingual accessible text and fidelity", () => {
  for (const circle of LIBRARY_CIRCLES) {
    assert.ok(circle.alt.en && circle.alt.fr, circle.id);
    assert.ok(["documented", "inferred", "experimental"].includes(circle.fidelity), circle.id);
  }
});

test("the public library renders all schematics as local accessible images", async () => {
  const html = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article class="circle-card">([\s\S]*?)<\/article>/g)];

  assert.equal(cards.length, 33);
  for (const [, card] of cards) {
    const image = card.match(/<img\s+[^>]*src="([^"]+)"[^>]*>/);
    assert.ok(image, "every circle card needs an image");
    assert.match(image[1], /^assets\/library-schematics\/[a-z0-9-]+\.svg$/);
    assert.doesNotMatch(image[1], /assets\/library-circles|https?:|data:/);
    assert.match(image[0], /alt="[^"]+"/);
    assert.match(image[0], /data-i18n-alt="library\.circleAlt"/);
  }
});
