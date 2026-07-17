import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

const generatedDirectory = new URL("../docs/generated/", import.meta.url);
const manifest = await readFile(new URL("README.md", generatedDirectory), "utf8");

test("the generated sigil archive keeps exactly five reference sheets", async () => {
  const files = (await readdir(generatedDirectory))
    .filter((name) => name.endsWith("-symbol-reference.png"));

  assert.equal(files.length, 5);
  for (const file of files) {
    assert.match(manifest, new RegExp(`\\b${file.replaceAll(".", "\\.")}\\b`));
  }
});

test("the archive keeps the three DALL-E audit sheets for the corrected drawings", async () => {
  const files = await readdir(generatedDirectory);
  const auditedSheets = [
    "audited-sigils-state-v2.png",
    "audited-sigils-decorative-v2.png",
    "audited-sigils-dragon-bird-v2.png",
  ];

  for (const file of auditedSheets) {
    assert.ok(files.includes(file), `${file} must be archived`);
    assert.match(manifest, new RegExp(`\\b${file.replaceAll(".", "\\.")}\\b`));
  }
});

test("the archive inventories twelve supplied captures without publishing them", () => {
  const hashes = manifest.match(/`[a-f0-9]{64}`/g) || [];

  assert.equal(hashes.length, 12);
  assert.match(manifest, /not copied into the public\s+repository/i);
});
