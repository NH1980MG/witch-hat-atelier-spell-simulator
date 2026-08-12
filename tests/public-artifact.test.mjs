import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const artifactValidator = await readFile(new URL("../scripts/validate-public-artifact.mjs", import.meta.url), "utf8");
const securityAudit = await readFile(new URL("../scripts/security-audit.mjs", import.meta.url), "utf8");

test("Pages validation includes security and public artifact audits", () => {
  assert.match(workflow, /node scripts\/security-audit\.mjs/);
  assert.match(workflow, /node scripts\/validate-public-artifact\.mjs/);
});

test("Pages artifact includes discovery files and excludes private references", () => {
  assert.match(workflow, /cp robots\.txt sitemap\.xml public\//);
  assert.doesNotMatch(workflow, /cp\s+-R\s+["']?(Witch hat|docs\/research|reference)/i);
  assert.match(workflow, /cp -R assets\/library-schematics public\/assets\/library-schematics/);
  assert.match(workflow, /cp -R assets\/symbol-glyphs public\/assets\/symbol-glyphs/);
  assert.match(workflow, /cp -R assets\/brand public\/assets\/brand/);
});

test("the public build keeps all runtime modules", () => {
  assert.match(workflow, /cp \.\/\*\.html \.\/\*\.css \.\/\*\.js \.\/\*\.mjs public\//);
});

test("the artifact audit requires every generated symbol glyph", () => {
  assert.match(artifactValidator, /SYMBOL_BOARD_ASSET/);
  assert.match(artifactValidator, /Object\.values\(SYMBOL_BOARD_ASSET\)/);
  assert.match(artifactValidator, /fonctionnement\.html/);
  assert.match(artifactValidator, /assets\/brand\/atelier-mark-180\.png/);
  assert.match(artifactValidator, /assets\/brand\/atelier-mark-512\.png/);
  assert.match(artifactValidator, /assets\/brand\/atelier-mark\.svg/);
});

test("public and security audits require vendored physics runtime licenses", () => {
  assert.match(artifactValidator, /vendor\/rapier\/LICENSE/);
  assert.match(securityAudit, /vendor", "rapier", "LICENSE"/);
  assert.match(securityAudit, /relative === path\.join\("vendor", "rapier", "rapier3d-compat\.module\.js"\)/);
  assert.match(securityAudit, /isVendoredRapier && label === "dynamic Function constructor"/);
});
