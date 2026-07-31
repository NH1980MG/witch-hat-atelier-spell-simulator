import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import { queryVariants } from "../variant-catalog.mjs";
import {
  SPOILER_MAX_CHAPTER,
  SYMBOL_FIRST_CHAPTER,
  clampSpoilerChapter,
  isSymbolVisibleAtChapter,
  isVariantVisibleAtChapter,
  readSpoilerChapter,
  writeSpoilerChapter,
} from "../symbol-chapters.mjs";

test("chaque symbole du catalogue possede un chapitre documente ou null", () => {
  assert.deepEqual(
    Object.keys(SYMBOL_FIRST_CHAPTER).sort(),
    Object.keys(SYMBOL_PATHS).sort(),
  );
  for (const [name, chapter] of Object.entries(SYMBOL_FIRST_CHAPTER)) {
    if (chapter === null) continue;
    assert.ok(Number.isInteger(chapter), `${name}: chapitre entier attendu`);
    assert.ok(chapter >= 1 && chapter <= SPOILER_MAX_CHAPTER, `${name}: chapitre ${chapter} hors bornes`);
  }
  // Symboles non datables (anime/artbook/reseau uniquement) : toujours visibles.
  assert.deepEqual(
    Object.entries(SYMBOL_FIRST_CHAPTER).filter(([, chapter]) => chapter === null).map(([name]) => name).sort(),
    ["Chat-hibou", "Epee", "Frillram", "Spire physique"],
  );
});

test("la visibilite respecte les bornes et les symboles non dates", () => {
  assert.equal(isSymbolVisibleAtChapter("Selection", 36), false);
  assert.equal(isSymbolVisibleAtChapter("Selection", 37), true);
  assert.equal(isSymbolVisibleAtChapter("Selection", 94), true);
  assert.equal(isSymbolVisibleAtChapter("Frillram", 1), true);
  assert.equal(isSymbolVisibleAtChapter("Fumee", 90), false);
  assert.equal(isSymbolVisibleAtChapter("Fumee", 91), true);
  // Filtre inactif : tout est visible, meme les symboles tardifs.
  assert.equal(isSymbolVisibleAtChapter("Immobilite", null), true);
  assert.equal(isSymbolVisibleAtChapter("Immobilite", undefined), true);
});

test("une variante est masquee des qu'un symbole est trop tardif", () => {
  const early = { sigils: ["Feu"], signs: ["Colonne"] };
  const late = { sigils: ["Feu"], signs: ["Purification"] };
  const mixed = { sigils: ["Frillram"], signs: ["Glaives"] };
  assert.equal(isVariantVisibleAtChapter(early, 10), true);
  assert.equal(isVariantVisibleAtChapter(late, 10), false);
  assert.equal(isVariantVisibleAtChapter(mixed, 62), false);
  assert.equal(isVariantVisibleAtChapter(mixed, 63), true);
  assert.equal(isVariantVisibleAtChapter(late, null), true);
});

test("le reglage localStorage est borne et reversible", () => {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
  assert.equal(readSpoilerChapter(storage), null);
  writeSpoilerChapter(storage, true, 29);
  assert.equal(readSpoilerChapter(storage), 29);
  writeSpoilerChapter(storage, true, 999);
  assert.equal(readSpoilerChapter(storage), SPOILER_MAX_CHAPTER);
  writeSpoilerChapter(storage, false, 29);
  assert.equal(readSpoilerChapter(storage), null);
  assert.equal(storage.getItem("whaSpoilerChapter"), "29");
});

test("le chapitre est normalise dans les bornes du manga", () => {
  assert.equal(clampSpoilerChapter(0), 1);
  assert.equal(clampSpoilerChapter(-5), 1);
  assert.equal(clampSpoilerChapter(999), SPOILER_MAX_CHAPTER);
  assert.equal(clampSpoilerChapter("29"), 29);
  assert.equal(clampSpoilerChapter("abc"), 1);
});

test("queryVariants filtre les recettes au-dela du chapitre declare", () => {
  const records = [
    { id: "a", sigils: ["Feu"], signs: ["Colonne"], roles: ["form"], supportId: "none", fidelity: "documented", warningCount: 0, effectCategory: "colonne", planKey: "a" },
    { id: "b", sigils: ["Feu"], signs: ["Selection"], roles: ["form"], supportId: "none", fidelity: "documented", warningCount: 0, effectCategory: "selection", planKey: "b" },
    { id: "c", sigils: ["Frillram"], signs: ["Fenetres"], roles: ["relation"], supportId: "none", fidelity: "documented", warningCount: 0, effectCategory: "portail", planKey: "c" },
  ];
  assert.equal(queryVariants(records, { chapter: "all" }).filtered, 3);
  assert.equal(queryVariants(records, { chapter: 29 }).filtered, 2);
  assert.equal(queryVariants(records, { chapter: 10 }).filtered, 1);
  assert.deepEqual(queryVariants(records, { chapter: 36 }).records.map(({ id }) => id), ["a", "c"]);
});

test("les controles anti-spoiler sont presents dans l'atelier et la bibliotheque", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const library = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");
  assert.match(index, /id="spoilerToggle"/);
  assert.match(index, /id="spoilerChapterRange"/);
  assert.match(index, /data-i18n="spoiler\.toggle"/);
  assert.match(library, /id="spoilerChapterInput"/);
  assert.match(library, /data-i18n="explorer\.chapter"/);
});

test("les chaines anti-spoiler existent dans les deux locales", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  for (const key of [
    "spoiler.toggle", "spoiler.rangeLabel", "spoiler.note",
    "explorer.chapter", "explorer.chapterPlaceholder", "explorer.chapterHint",
    "settings.spoiler.title", "settings.spoiler.body",
  ]) {
    const occurrences = source.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} doit exister en fr et en`);
  }
});
