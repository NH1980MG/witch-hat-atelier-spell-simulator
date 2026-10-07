import assert from "node:assert/strict";
import test from "node:test";

import {
  addCompositionComponent,
  createCustomSymbol,
  interpretComposition,
  moveCompositionComponent,
  normalizeEditorState,
  readEditorState,
  removeCompositionComponent,
  writeEditorState,
} from "../local-demo/effect-editor/effect-editor-model.mjs";

const component = (id, symbolId, role, source = "catalog") => ({ id, symbolId, source, role });

test("validates custom symbols and clamps points to normalized bounds", () => {
  assert.throws(() => createCustomSymbol({ name: "  ", kind: "sign", role: "form", strokes: [] }), TypeError);
  assert.throws(() => createCustomSymbol({ name: "Rune", kind: "sign", role: "form", strokes: [[{ x: NaN, y: 0.2 }]] }), TypeError);
  const symbol = createCustomSymbol({ name: "  Rune  ", kind: "sign", role: "form", strokes: [[{ x: 2, y: -1 }]] });
  assert.equal(symbol.name, "Rune");
  assert.deepEqual(symbol.strokes, [[{ x: 1, y: 0 }]]);
});

test("rejects unsupported kinds, roles and oversized stroke data", () => {
  const strokes = Array.from({ length: 65 }, () => [{ x: 0, y: 0 }]);
  assert.throws(() => createCustomSymbol({ name: "Rune", kind: "unknown", role: "form", strokes: [] }), TypeError);
  assert.throws(() => createCustomSymbol({ name: "Rune", kind: "sign", role: "unknown", strokes: [] }), TypeError);
  assert.throws(() => createCustomSymbol({ name: "Rune", kind: "sign", role: "form", strokes }), TypeError);
});

test("recovers a malformed editor state as an empty versioned state", () => {
  assert.deepEqual(normalizeEditorState(null), {
    version: 1,
    symbols: [],
    compositions: [],
    activeCompositionId: null,
  });
  const state = normalizeEditorState({
    version: 99,
    symbols: [{ id: "valid", name: "Rune", kind: "sign", role: "form", strokes: [[{ x: 0.2, y: 0.3 }]] }, { id: "bad" }],
    compositions: [{ id: "spell", name: "Spell", components: [component("one", "valid", "form", "custom"), component("bad", "missing", "form", "custom")] }],
    activeCompositionId: "not-found",
  });
  assert.equal(state.version, 1);
  assert.deepEqual(state.symbols.map((symbol) => symbol.id), ["valid"]);
  assert.deepEqual(state.compositions[0].components.map((item) => item.id), ["one"]);
  assert.equal(state.activeCompositionId, null);
});

test("reads malformed or unavailable storage without throwing", () => {
  assert.equal(readEditorState({ getItem: () => "{" }).symbols.length, 0);
  assert.equal(readEditorState({ getItem: () => { throw new Error("blocked"); } }).compositions.length, 0);
});

test("writes versioned state under the dedicated local key and reports failures", () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };
  const state = normalizeEditorState(null);
  assert.equal(writeEditorState(storage, state), true);
  assert.deepEqual(JSON.parse(values.get("circleCommons.effectEditor.v1")), state);
  assert.equal(writeEditorState({ setItem: () => { throw new Error("blocked"); } }, state), false);
});

test("adds, reorders and removes components immutably using stable IDs", () => {
  const initial = { id: "spell", name: "Spell", components: [component("first", "Eau", "material")] };
  const added = addCompositionComponent(initial, component("second", "Fleur", "form"));
  assert.deepEqual(initial.components.map((item) => item.id), ["first"]);
  assert.deepEqual(added.components.map((item) => item.id), ["first", "second"]);
  const moved = moveCompositionComponent(added, "second", -1);
  assert.deepEqual(moved.components.map((item) => item.id), ["second", "first"]);
  assert.deepEqual(removeCompositionComponent(moved, "second").components.map((item) => item.id), ["first"]);
});

test("marks empty and material-less compositions incomplete", () => {
  const symbols = [{ id: "column", name: "Colonne", kind: "sign" }];
  assert.equal(interpretComposition({ components: [] }, symbols).status, "incomplete");
  assert.equal(interpretComposition({ components: [component("one", "column", "direction")] }, symbols).status, "incomplete");
});

test("returns the same ordered role preview and flags multiple materials", () => {
  const symbols = [
    { id: "water", name: "Eau", kind: "sigil" },
    { id: "flower", name: "Fleur", kind: "sigil" },
    { id: "column", name: "Colonne", kind: "sign" },
  ];
  const composition = {
    name: "Fleur d'eau",
    components: [component("a", "water", "material"), component("b", "flower", "form"), component("c", "column", "direction")],
  };
  const first = interpretComposition(composition, symbols);
  assert.deepEqual(first, interpretComposition(composition, symbols));
  assert.equal(first.status, "preview");
  assert.deepEqual(first.roleSummary, ["Matière : Eau", "Forme : Fleur", "Direction : Colonne"]);
  const ambiguous = interpretComposition({ components: [component("a", "water", "material"), component("b", "flower", "material")] }, symbols);
  assert.equal(ambiguous.status, "experimental");
});
