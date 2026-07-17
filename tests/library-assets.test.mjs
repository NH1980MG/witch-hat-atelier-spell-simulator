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

test("every gallery entry has a local square reference crop", async () => {
  for (const circle of LIBRARY_CIRCLES) {
    const url = new URL(`../assets/library-schematics/${circle.id}.png`, import.meta.url);
    assert.ok((await stat(url)).size > 1_000, circle.id);
    const png = await readFile(url);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], circle.id);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.equal(width, height, circle.id);
    assert.ok(width >= 180, circle.id);
  }
});

test("every entry has bilingual accessible text and fidelity", () => {
  for (const circle of LIBRARY_CIRCLES) {
    assert.ok(circle.alt.en && circle.alt.fr, circle.id);
    assert.ok(["documented", "inferred", "experimental"].includes(circle.fidelity), circle.id);
    assert.equal(circle.assetKind, "reference-crop", circle.id);
    assert.match(circle.alt.en, /Reference circle/);
    assert.match(circle.alt.fr, /Cercle de reference/);
  }
});

test("the public library renders all schematics as local accessible images", async () => {
  const html = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article class="circle-card">([\s\S]*?)<\/article>/g)];

  assert.equal(cards.length, 33);
  for (const [, card] of cards) {
    const image = card.match(/<img\s+[^>]*src="([^"]+)"[^>]*>/);
    assert.ok(image, "every circle card needs an image");
    assert.match(image[1], /^assets\/library-schematics\/[a-z0-9-]+\.png$/);
    assert.doesNotMatch(image[1], /assets\/library-circles|https?:|data:/);
    assert.match(image[0], /alt="[^"]+"/);
    assert.match(image[0], /data-i18n-alt="library\.circleAlt"/);
    assert.match(card, /data-i18n="library\.fidelity\.reference"/);
  }
});
