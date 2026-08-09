import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSuggestionIssueUrl,
  normalizeSuggestionInput,
  openSuggestionIssue,
} from "../suggestion-form.mjs";

test("buildSuggestionIssueUrl encodes bilingual free-form feedback", () => {
  const url = new URL(buildSuggestionIssueUrl({
    locale: "fr",
    category: "reconnaissance",
    title: "L'eau n'est pas reconnue",
    body: "Quand je dessine vite, le signe ressemble plutôt à l'aéroforme.",
  }));

  assert.equal(url.origin + url.pathname, "https://github.com/NH1980MG/witch-hat-atelier-spell-simulator/issues/new");
  assert.equal(url.searchParams.get("labels"), "suggestion,simulator");
  assert.equal(url.searchParams.get("title"), "[Suggestion] L'eau n'est pas reconnue");
  assert.match(url.searchParams.get("body"), /Catégorie : reconnaissance/);
  assert.match(url.searchParams.get("body"), /Langue : fr/);
  assert.match(url.searchParams.get("body"), /aéroforme/);
});

test("normalizeSuggestionInput bounds fields and falls back safely", () => {
  const normalized = normalizeSuggestionInput({
    locale: "xx",
    category: "<script>",
    title: `  ${"A".repeat(180)}  `,
    body: `  ${"B".repeat(5000)}  `,
  });

  assert.equal(normalized.locale, "en");
  assert.equal(normalized.category, "other");
  assert.equal(normalized.title.length, 120);
  assert.equal(normalized.body.length, 3000);
  assert.doesNotMatch(JSON.stringify(normalized), /<script>/);
});

test("openSuggestionIssue reports success and severs the opener", () => {
  const openedWindow = { opener: "workshop" };
  const calls = [];
  const opened = openSuggestionIssue("https://example.com", (...args) => {
    calls.push(args);
    return openedWindow;
  });

  assert.equal(opened, true);
  assert.deepEqual(calls, [["https://example.com", "_blank"]]);
  assert.equal(openedWindow.opener, null);
});

test("openSuggestionIssue reports a blocked popup", () => {
  assert.equal(openSuggestionIssue("https://example.com", () => null), false);
});
