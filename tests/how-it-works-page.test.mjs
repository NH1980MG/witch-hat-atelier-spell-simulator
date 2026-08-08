import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the explanation page covers the complete workshop workflow", async () => {
  const html = await readFile(new URL("../fonctionnement.html", import.meta.url), "utf8");

  for (const id of ["drawing", "selection", "reading", "photo", "practice", "guides", "activation", "fidelity", "limits"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  for (const key of [
    "how.drawing.tools",
    "how.drawing.actions",
    "how.drawing.symbolPlacement",
    "how.selection.rectangle",
    "how.selection.resize",
    "how.reading.boundary",
    "how.reading.sigils",
    "how.reading.signs",
    "how.reading.support",
    "how.reading.metrics",
    "how.photo.pipeline",
    "how.photo.ringOutput",
    "how.photo.symbolsOutput",
    "how.photo.guideOutput",
    "how.photo.uncertain",
    "how.practice.knownTarget",
    "how.practice.noRing",
    "how.practice.diagnostics",
    "how.guides.resize",
    "how.activation.requirements",
    "how.activation.view3d",
    "how.fidelity.body",
    "how.limits.local",
  ]) {
    assert.match(html, new RegExp(`data-i18n="${key.replaceAll(".", "\\.")}"`), `missing ${key}`);
  }
});

test("every public page links to the explanation page", async () => {
  for (const page of ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /href="fonctionnement\.html"/, `${page}: missing explanation-page link`);
    assert.match(html, /data-i18n="nav\.howItWorks"/, `${page}: missing translated navigation label`);
  }
});
