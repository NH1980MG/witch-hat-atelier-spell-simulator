import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("the no-support card uses a centered astrolabe drawing", () => {
  assert.match(app, /M29 23 H59 V60 H29 Z/);
  assert.match(app, /cx="44" cy="41" r="11"/);
  assert.match(app, /M33 41 H55 M44 30 V52/);
});

test("the shoe card keeps clean mirrored silhouettes and linked seals", () => {
  assert.match(app, /M24 20 C17 25 15 42 20 58 C23 68 31 73 38 68/);
  assert.match(app, /M64 20 C71 25 73 42 68 58 C65 68 57 73 50 68/);
  assert.match(app, /M43 41 C44 39 44 39 45 41/);
  assert.match(app, /M20 68 C27 75 36 76 44 69 C52 76 61 75 68 68/);
});

test("the browser loads the refined support artwork version", () => {
  assert.match(html, /app\.js\?v=20260718-onion-guides-v2/);
});
