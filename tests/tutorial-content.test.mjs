import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { translate } from "../i18n.mjs";

const html = await readFile(new URL("../tutoriel.html", import.meta.url), "utf8");

test("tutorial covers the final matrix and fidelity model", () => {
  for (const key of [
    "tutorial.matrix.title",
    "tutorial.matrix.formula",
    "tutorial.fidelity.title",
    "tutorial.balance.title",
    "tutorial.supportScope.title",
    "tutorial.activationWarnings.title",
    "tutorial.placement.title",
    "tutorial.placement.drag",
    "tutorial.placement.select",
    "tutorial.placement.resize",
    "tutorial.placement.moveDelete",
  ]) {
    assert.match(html, new RegExp(`data-i18n="${key.replaceAll(".", "\\.")}"`));
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
  assert.equal(translate("en", "tutorial.matrix.total"), "13,338 tested variants");
  assert.equal(translate("fr", "tutorial.matrix.total"), "13 338 variantes testees");
  assert.match(html, /id="placing-symbols"/);
  assert.match(html, /href="#placing-symbols"/);
  assert.match(translate("en", "tutorial.placement.select"), /right-click/i);
  assert.match(translate("fr", "tutorial.placement.select"), /clic droit/i);
});
