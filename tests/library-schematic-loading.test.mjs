import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("library preview links request the exact displayed schematic", async () => {
  const source = await readFile(new URL("../library-schematic-preview.mjs", import.meta.url), "utf8");
  assert.match(source, /libraryId:\s*circle\.id/);
});

test("the atelier draws the selected library schematic instead of synthetic recipe marks", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /librarySchematicId:\s*null/);
  assert.match(source, /function drawLoadedLibrarySchematic/);
  assert.match(source, /action\.librarySynthetic/);
  assert.match(source, /librarySchematicId:\s*state\.librarySchematicId/);
  assert.match(source, /new THREE\.TextureLoader\(\)/);
});
