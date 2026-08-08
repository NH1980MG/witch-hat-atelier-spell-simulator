import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the explanation page documents deterministic recognition", async () => {
  const html = await readFile(new URL("../fonctionnement.html", import.meta.url), "utf8");

  for (const id of ["drawing", "photo", "practice", "reading", "guides", "limits"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(html, /data-i18n="how\.photo\.pipeline"/);
  assert.match(html, /data-i18n="how\.photo\.ringOutput"/);
  assert.match(html, /data-i18n="how\.photo\.symbolsOutput"/);
  assert.match(html, /data-i18n="how\.reading\.confidence"/);
  assert.match(html, /data-i18n="how\.practice\.knownTarget"/);
  assert.match(html, /data-i18n="how\.practice\.noRing"/);
  assert.match(html, /data-i18n="how\.limits\.local"/);
});

test("every public page links to the explanation page", async () => {
  for (const page of ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /href="fonctionnement\.html"/, `${page}: missing explanation-page link`);
    assert.match(html, /data-i18n="nav\.howItWorks"/, `${page}: missing translated navigation label`);
  }
});
