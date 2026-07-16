import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../variant-index-worker.mjs", import.meta.url), "utf8");

test("the worker owns the catalog and supports init query and detail messages", () => {
  assert.match(worker, /buildVariantIndex/);
  assert.match(worker, /queryVariants/);
  assert.match(worker, /getVariantDetail/);
  assert.match(worker, /case "init"/);
  assert.match(worker, /case "query"/);
  assert.match(worker, /case "detail"/);
});
