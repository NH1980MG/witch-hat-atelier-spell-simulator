import assert from "node:assert/strict";
import test from "node:test";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import {
  buildMinecraftSymbolManifest,
  minecraftSymbolId,
} from "../scripts/export-minecraft-symbols.mjs";

test("Minecraft export covers every web symbol with stable unique ids", () => {
  const manifest = buildMinecraftSymbolManifest();
  const webNames = Object.keys(SYMBOL_PATHS);

  assert.equal(manifest.length, 69);
  assert.deepEqual(manifest.map(({ frenchName }) => frenchName), webNames);
  assert.equal(new Set(manifest.map(({ id }) => id)).size, manifest.length);
  assert.equal(minecraftSymbolId("Vent sous pied"), "vent_sous_pied");
  assert.equal(minecraftSymbolId("Épée"), "epee");
});

test("every Minecraft symbol exposes renderable paths and bilingual metadata", () => {
  for (const entry of buildMinecraftSymbolManifest()) {
    assert.match(entry.id, /^[a-z0-9_]+$/);
    assert.ok(entry.englishName);
    assert.ok(entry.frenchName);
    assert.ok(entry.category === "sigil" || entry.category === "sign");
    assert.ok(entry.paths.length > 0);
    assert.equal(entry.texture, `textures/symbol/${entry.id}.png`);
  }
});
