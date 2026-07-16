import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_EXPLORER_STATE,
  ENGLISH_ELEMENT_NAMES,
  VARIANT_PAGE_SIZE,
  buildVariantIndex,
  getVariantDetail,
  normalizeSearchText,
  parseExplorerState,
  queryVariants,
  serializeExplorerState,
} from "../variant-catalog.mjs";
import { MATRIX_SIGIL_NAMES } from "../spell-grammar.mjs";

const records = buildVariantIndex();

test("every indexed sigil has an English library label", () => {
  for (const sigil of MATRIX_SIGIL_NAMES) {
    assert.ok(ENGLISH_ELEMENT_NAMES[sigil], `${sigil} needs an English label`);
  }
});

test("the explorer indexes exactly 38,532 deterministic variants", () => {
  assert.equal(records.length, 38_532);
  assert.equal(new Set(records.map(({ id }) => id)).size, 38_532);
  assert.equal(records.filter(({ supportId }) => supportId === "none").length, 19_266);
  assert.equal(records.filter(({ supportId }) => supportId === "shoe").length, 19_266);
});

test("every record opens a deterministic documented detail", () => {
  for (const record of records) {
    const detail = getVariantDetail(record);
    assert.equal(detail.id, record.id);
    assert.ok(detail.ruleIds.length > 0);
    assert.ok(["documented", "inferred", "experimental"].includes(detail.fidelity));
    assert.deepEqual(detail, getVariantDetail(record));
  }
});

test("combined effects expose stable identifiers for localization", () => {
  const record = records.find(({ sigil, signs }) => sigil === "Eau" && signs.includes("Colonne") && signs.includes("Levitation"));
  const detail = getVariantDetail(record);
  assert.deepEqual(detail.combinationIds, ["rising-column"]);
});

test("search normalization handles accents punctuation prefixes aliases and typos", () => {
  assert.equal(normalizeSearchText("  Lévitation—Eau  "), "levitation eau");

  for (const search of ["levit water", "eau lévitation", "water levtation"]) {
    const result = queryVariants(records, { ...DEFAULT_EXPLORER_STATE, search });
    assert.ok(result.filtered > 0, `${search} should find variants`);
    assert.ok(result.records.every(({ sigil, signs }) => sigil === "Eau" && signs.includes("Levitation")));
  }
});

test("filters sorting and pagination cover stable non-overlapping pages", () => {
  const state = {
    ...DEFAULT_EXPLORER_STATE,
    sign: "Levitation",
    support: "shoe",
    fidelity: "all",
    warnings: "all",
    sort: "id",
  };
  const first = queryVariants(records, state);
  const second = queryVariants(records, { ...state, page: 2 });

  assert.equal(first.records.length, VARIANT_PAGE_SIZE);
  assert.ok(first.records.every((record) => record.signs.includes("Levitation") && record.supportId === "shoe"));
  assert.equal(new Set([...first.records, ...second.records].map(({ id }) => id)).size, first.records.length + second.records.length);
  assert.equal(first.total, 38_532);
});

test("URL state round-trips and sanitizes invalid values", () => {
  const state = parseExplorerState(new URLSearchParams("q=water+orb&sigil=Eau&support=shoe&page=3&sort=fidelity"));
  assert.equal(state.search, "water orb");
  assert.equal(state.sigil, "Eau");
  assert.equal(state.support, "shoe");
  assert.equal(state.page, 3);
  assert.deepEqual(parseExplorerState(serializeExplorerState(state)), state);

  const invalid = parseExplorerState(new URLSearchParams("sigil=Invented&support=table&page=-4&sort=random"));
  assert.equal(invalid.sigil, "all");
  assert.equal(invalid.support, "all");
  assert.equal(invalid.page, 1);
  assert.equal(invalid.sort, "relevance");
});
