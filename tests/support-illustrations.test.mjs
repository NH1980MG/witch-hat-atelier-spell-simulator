import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("the no-support card uses a centered astrolabe drawing", () => {
  assert.match(app, /M29 23 H59 V60 H29 Z/);
  assert.match(app, /cx="44" cy="41" r="11"/);
  assert.match(app, /M33 41 H55 M44 30 V52/);
});

test("the shoe card uses the flat transparent support artwork", async () => {
  assert.match(app, /assets\/supports\/flying-shoes-v2\.png/);
  assert.match(app, /support\.shoe\.imageAlt/);
  const image = await stat(new URL("../assets/supports/flying-shoes-v2.png", import.meta.url));
  assert.ok(image.size > 50_000);
});

test("the browser loads the refined support artwork version", () => {
  assert.match(html, /app\.js\?v=20260815-sigil-composition-stage-v1/);
});
