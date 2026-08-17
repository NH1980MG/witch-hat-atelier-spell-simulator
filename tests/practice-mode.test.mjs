import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  collectPracticeAttempts,
  reconcilePracticeStartIndex,
  updatePracticeDiagnostic,
} from "../practice-session.mjs";

test("la version app retire le mode entrainement des commandes de rituel", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const commandGrid = html.match(/<div class="command-grid">[\s\S]*?<\/div>/)?.[0] || "";
  assert.doesNotMatch(commandGrid, /practiceToggleButton/);
  assert.match(html, /id="practiceBar"/);
  assert.match(html, /id="practiceTargetSelect"/);
  assert.match(html, /id="practiceVerifyButton"/);
  assert.match(html, /id="practiceScore"/);
  assert.match(html, /id="practiceFeedback"[^>]*role="status"[^>]*aria-live="polite"/);
  const scoreMarkup = html.match(/<output id="practiceScore"[^>]*>/)?.[0] || "";
  assert.doesNotMatch(scoreMarkup, /aria-live/);
  assert.match(html, /id="practiceCloseButton"/);
  assert.match(html, /href="index\.html#practice"/);
  assert.match(html, /data-i18n="nav\.practice"/);
  assert.match(html, /data-i18n="practice\.target"/);
  assert.match(html, /data-i18n="practice\.verify"/);
});

test("l'atelier importe le comparateur de traits", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(source, /import \{ analyzeStrokeMatch \} from "\.\/stroke-matcher\.mjs\?v=20260809-handoff-layout-v2"/);
  assert.match(source, /practiceStartIndex/);
  assert.match(source, /verifyPracticeStroke/);
  assert.match(source, /state\.practiceStartIndex = reconcilePracticeStartIndex\(state\.practiceStartIndex, state\.actions\.length\)/);
  assert.match(source, /updatePracticeDiagnostic\(practiceScore, practiceFeedback, analysis, t\)/);
});

test("ouvrir, noter, annuler et redessiner conserve le nouvel essai", () => {
  const freeStroke = (offset) => ({
    type: "free",
    points: Array.from({ length: 4 }, (_, index) => ({ x: index + offset, y: offset })),
  });
  let actions = [];
  let practiceStartIndex = actions.length;

  actions.push(freeStroke(0));
  assert.equal(collectPracticeAttempts(actions, practiceStartIndex).length, 1);
  practiceStartIndex = actions.length;

  actions = [];
  practiceStartIndex = reconcilePracticeStartIndex(practiceStartIndex, actions.length);
  actions.push(freeStroke(20));

  const replacementAttempt = collectPracticeAttempts(actions, practiceStartIndex);
  assert.equal(replacementAttempt.length, 1);
  assert.deepEqual(replacementAttempt[0][0], [20, 20]);
});

test("la verification met a jour le score visible et le diagnostic annonce", () => {
  const scoreOutput = { value: "" };
  const feedbackOutput = { textContent: "" };
  let translated = null;
  const analysis = {
    score: 73,
    coverage: 80,
    missingStrokes: 1,
    extraStrokes: 2,
    extraPenalty: 24,
    proportionScore: 91,
    orientationScore: 87,
  };

  updatePracticeDiagnostic(scoreOutput, feedbackOutput, analysis, (key, params) => {
    translated = { key, params };
    return "localized diagnostic";
  });

  assert.equal(scoreOutput.value, "73%");
  assert.equal(feedbackOutput.textContent, "localized diagnostic");
  assert.deepEqual(translated, {
    key: "practice.feedback.summary",
    params: {
      coverage: 80,
      missing: 1,
      extra: 2,
      penalty: 24,
      proportion: 91,
      orientation: 87,
    },
  });
});

test("les chaines du mode entrainement existent dans les deux locales", async () => {
  const source = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");
  for (const key of [
    "practice.toggle", "practice.region", "practice.target", "practice.verify",
    "practice.close", "practice.status.empty", "practice.status.excellent",
    "practice.status.good", "practice.status.retry", "practice.feedback.empty",
    "practice.feedback.summary",
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
