import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { translate } from "../i18n.mjs";

const html = await readFile(new URL("../tutoriel.html", import.meta.url), "utf8");

test("tutorial covers the final matrix and fidelity model", () => {
  for (const key of [
    "tutorial.matrix.title",
    "tutorial.matrix.formula",
    "tutorial.matrix.elements",
    "tutorial.matrix.pairs",
    "tutorial.matrix.triples",
    "tutorial.matrix.dominance",
    "tutorial.fidelity.title",
    "tutorial.balance.title",
    "tutorial.supportScope.title",
    "tutorial.activationWarnings.title",
    "tutorial.placement.title",
    "tutorial.placement.drag",
    "tutorial.placement.select",
    "tutorial.placement.resize",
    "tutorial.placement.moveDelete",
    "tutorial.guides.title",
    "tutorial.guides.library",
    "tutorial.guides.controls",
    "tutorial.guides.personal",
  ]) {
    assert.match(html, new RegExp(`data-i18n="${key.replaceAll(".", "\\.")}"`));
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
  assert.equal(translate("en", "tutorial.matrix.total"), "54,834 tested variants");
  assert.equal(translate("fr", "tutorial.matrix.total"), "54 834 variantes testees");
  assert.match(translate("en", "tutorial.matrix.elements"), /Fire, Water, Earth, and Wind/);
  assert.match(translate("fr", "tutorial.matrix.elements"), /Feu, Eau, Terre et Vent/);
  assert.match(translate("en", "tutorial.matrix.dominance"), /repeated base sigil/i);
  assert.match(translate("fr", "tutorial.matrix.dominance"), /sigil de base repete/i);
  assert.match(translate("en", "tutorial.matrix.exclusions"), /not pre-enumerated/i);
  assert.match(translate("fr", "tutorial.matrix.exclusions"), /ne sont pas pre-enumeres/i);
  assert.match(translate("en", "tutorial.fidelity.inferred"), /not manga-confirmed/i);
  assert.match(translate("fr", "tutorial.fidelity.inferred"), /pas confirmes par le manga/i);
  assert.match(html, /id="placing-symbols"/);
  assert.match(html, /href="#placing-symbols"/);
  assert.match(html, /id="tracing-guides"/);
  assert.match(html, /href="#tracing-guides"/);
  assert.match(translate("en", "tutorial.placement.select"), /right-click/i);
  assert.match(translate("fr", "tutorial.placement.select"), /clic droit/i);
});
