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

test("the archive inventories twelve supplied captures without publishing them", () => {
  const hashes = manifest.match(/`[a-f0-9]{64}`/g) || [];

  assert.equal(hashes.length, 12);
  assert.match(manifest, /not copied into the public\s+repository/i);
});
