import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
import { LIBRARY_CIRCLES } from "../library-circle-data.mjs";
import { composeSpellRecipe } from "../spell-grammar.mjs";

test("the gallery keeps the 33 classified references and 50 generated community recipes", () => {
  assert.equal(LIBRARY_CIRCLES.length, 83);
  assert.deepEqual(
    Object.fromEntries(
      ["vision", "mixed", "niche", "ancient-forbidden", "ancient-non-forbidden", "community-inferred"]
        .map((category) => [category, LIBRARY_CIRCLES.filter((circle) => circle.category === category).length]),
    ),
    { vision: 3, mixed: 5, niche: 20, "ancient-forbidden": 3, "ancient-non-forbidden": 2, "community-inferred": 50 },
  );
});

test("every reference gallery entry has a local square reference crop", async () => {
  for (const circle of LIBRARY_CIRCLES.filter((entry) => entry.assetKind === "reference-crop")) {
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
    assert.ok(["reference-crop", "generated-recipe"].includes(circle.assetKind), circle.id);
    if (circle.assetKind === "reference-crop") {
      assert.match(circle.alt.en, /Reference circle/);
      assert.match(circle.alt.fr, /Cercle de reference/);
    } else {
      assert.match(circle.alt.en, /Generated community recipe/);
      assert.match(circle.alt.fr, /Recette communautaire generee/);
      assert.ok(circle.effect, circle.id);
    }
  }
});

test("every library card has a safe simulator reconstruction", () => {
  for (const circle of LIBRARY_CIRCLES) {
    assert.ok(circle.preview?.sigils?.length > 0, circle.id);
    assert.equal(circle.preview.activate, true, circle.id);
  }
});

test("the opening petrification reference previews the dedicated forbidden effect", () => {
  const petrification = LIBRARY_CIRCLES.find((circle) => circle.id === "petrification");
  assert.ok(petrification);

  const recipe = composeSpellRecipe(petrification.preview);

  assert.equal(recipe.manifestationPlan.id, "ancient.petrification-field");
  assert.equal(recipe.manifestationPlan.labelEn, "Forbidden petrification field");
});

test("every generated community recipe has a local svg schematic", async () => {
  for (const circle of LIBRARY_CIRCLES.filter((entry) => entry.assetKind === "generated-recipe")) {
    const url = new URL(`../assets/library-schematics/${circle.id}.svg`, import.meta.url);
    const svg = await readFile(url, "utf8");
    assert.match(svg, /^<svg /, circle.id);
    assert.match(svg, /<title>/, circle.id);
    assert.match(svg, /<circle /, circle.id);
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
  assert.match(html, /library-schematic-preview\.mjs/);
});
