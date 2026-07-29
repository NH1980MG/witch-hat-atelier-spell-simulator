// symbol-search.mjs
// Pure matcher over the palette. No DOM access, no state.

import { normalizeSearchText } from "./variant-catalog.mjs";

const SCORE_EXACT = 12;
const SCORE_PREFIX = 8;

export function buildSymbolSearchIndex(elements, englishNames) {
  return Object.freeze(
    elements.map((element, order) =>
      Object.freeze({
        element,
        order,
        frenchName: normalizeSearchText(element.name),
        englishName: normalizeSearchText(englishNames[element.name] || element.name),
        rune: normalizeSearchText(element.rune),
      }),
    ),
  );
}

function scoreRecord(record, query) {
  if (record.rune === query || record.frenchName === query || record.englishName === query) {
    return SCORE_EXACT;
  }
  if (
    record.rune.startsWith(query) ||
    record.frenchName.startsWith(query) ||
    record.englishName.startsWith(query)
  ) {
    return SCORE_PREFIX;
  }
  return 0;
}

export function searchSymbols(index, query, limit = 64) {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return index.slice(0, limit).map((record) => record.element);
  }
  return index
    .map((record) => ({ record, score: scoreRecord(record, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.record.order - b.record.order)
    .slice(0, limit)
    .map((entry) => entry.record.element);
}
