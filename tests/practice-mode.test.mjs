import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("l'atelier expose le mode entrainement complet", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="practiceToggleButton"/);
  assert.match(html, /id="practiceBar"/);
  assert.match(html, /id="practiceTargetSelect"/);
  assert.match(html, /id="practiceVerifyButton"/);
  assert.match(html, /id="practiceScore"/);
  assert.match(html, /id="practiceCloseButton"/);
  assert.match(html, /data-i18n="practice\.toggle"/);
  assert.match(html, /data-i18n="practice\.target"/);
  assert.match(html, /data-i18n="practice\.verify"/);
});

test("l'atelier importe le comparateur de traits", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /import \{ scoreStrokeMatch \} from "\.\/stroke-matcher\.mjs\?v=/);
  assert.match(source, /practiceStartIndex/);
  assert.match(source, /verifyPracticeStroke/);
});

test("les chaines du mode entrainement existent dans les deux locales", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  for (const key of [
    "practice.toggle", "practice.region", "practice.target", "practice.verify",
    "practice.close", "practice.status.empty", "practice.status.excellent",
    "practice.status.good", "practice.status.retry",
  ]) {
    const occurrences = source.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} doit exister en fr et en`);
  }
});

test("les chaines francaises du mode entrainement restent sans accents", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  const frenchKeys = source.match(/"practice\.[^"]+": "[^"]*"/g) || [];
  // Deux locales: la moitie des entrees est francaise, et aucune ne doit
  // contenir de caractere accentue (convention du projet).
  const accented = frenchKeys.filter((entry) => /[àâäéèêëîïôöùûüçœæ]/i.test(entry));
  assert.deepEqual(accented, []);
});
