import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const activeCurrentDocs = [
  "README.md",
  "docs/architecture.md",
  "docs/qa-plan.md",
  "docs/release-checklist.md",
  "docs/progress-tracker.md",
  "docs/spell-effect-catalog.md",
];

test("active documentation uses the 65,600 finite index contract", async () => {
  for (const file of activeCurrentDocs) {
    const content = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, /38[, ]532/, `${file} must not publish the obsolete matrix total`);
    assert.match(content, /65[, ]600/, `${file} must publish the current matrix total`);
  }
});

test("release documentation checks the elemental mixture module", async () => {
  const checklist = await readFile(new URL("../docs/release-checklist.md", import.meta.url), "utf8");
  assert.match(checklist, /node --check elemental-mixtures\.mjs/);
});

test("dated QA reports retain their historical matrix totals", async () => {
  const historicalReport = await readFile(new URL("../docs/qa/2026-07-16-38532-matrix-correction.md", import.meta.url), "utf8");
  assert.match(historicalReport, /38,532/);
});
