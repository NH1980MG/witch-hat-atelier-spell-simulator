# Element Search and Pointer Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the workshop a `Cmd/Ctrl+K` element search that arms the pointer so canvas clicks stamp the chosen symbol, plus `Cmd/Ctrl+D` duplication of the current selection.

**Architecture:** `app.js` cannot be imported under Node (`import('./app.js')` throws `ReferenceError: document is not defined`), so every piece of logic worth testing moves into a DOM-free `.mjs` module that both `app.js` and the tests import. Stage 1 creates those seams — palette data, the search matcher, the duplication primitive, the keyboard router — and centralizes tool transitions behind a single `setTool`. Stage 2 wires the native `<dialog>` overlay, the ghost lifecycle, the duplicate button, and the localized strings.

**Tech Stack:** Plain browser JavaScript, ES modules, no bundler, no `package.json`. Node.js built-in test runner (`node --test`). Python static HTTP server for manual runs.

**Spec:** `docs/superpowers/specs/2026-07-27-element-search-placement-design.md` (revision 3)
**Stress test:** `docs/stress-tests/2026-07-27-element-search-placement.md` (14 cases)

## Global Constraints

- **Test command is `node --test tests/*.test.mjs`.** Baseline before any change: 170 tests, 170 pass, 0 fail. Every task ends green.
- **Test names and assertion messages are written in French** in `tests/symbol-interactions.test.mjs` and `tests/symbol-palette-ui.test.mjs`, and in English in `tests/i18n.test.mjs` and `tests/i18n-html.test.mjs`. Match the file you are editing; do not convert either way.
- **No new runtime dependency.** There is no `package.json`. Modules import each other by relative path with the `.mjs` extension spelled out.
- **Source has no accented characters in identifiers or palette names.** Palette names are stored unaccented (`Fumee`, `Lumiere`, `Repetition`). Do not add accents to stored data; folding is a query-side concern only.
- **Every new i18n key goes into BOTH catalogues in `i18n.mjs`** (`en` starting at line 4, `fr` starting near line 494). `tests/i18n.test.mjs` asserts `catalogKeys("en")` deep-equals `catalogKeys("fr")` and will fail on a one-sided addition.
- **Cache-bust strings.** New values for this release: `styles.css?v=20260729-element-search-v1` and `app.js?v=20260729-element-search-v1`. They are bumped once, in Task 7, together with the four test rows that pin them. `symbol-catalog.mjs?v=20260723-board-assets-v1` does not change.
- **Commit message discipline.** `feat:` only when the diff contains source; docs-only or test-only changes are `docs:` / `test:`. Never add `Co-authored-by` or any vendor/model attribution.
- **Nothing assigns `state.tool` directly after Task 5.** The single assignment lives inside `setTool`.

---

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `symbol-palette-data.mjs` | create | The 64-element array and the English display-name table, DOM-free. Sole source both `app.js` and the tests read. |
| `symbol-search.mjs` | create | `buildSymbolSearchIndex` / `searchSymbols`. Pure matcher over the palette data. |
| `keyboard-routing.mjs` | create | `resolveKeyCommand(event, context)` — decides which canvas command a keydown maps to, including the modal gate. Returns a command name; performs nothing. |
| `symbol-interactions.mjs` | modify | Gains `planDuplication(actions, indices, dx, dy)`, the pure half of group duplication. |
| `app.js` | modify | Imports the seams; gains `setTool`, `armSymbol`, `disarmSymbol`, `renderGhost`, `duplicateSelectedActions`, overlay wiring. Loses `elements`, `englishElementNames`, and four of its five `state.tool` assignments. |
| `index.html` | modify | Overlay `<dialog>`, duplicate button, bumped `?v=` strings. |
| `styles.css` | modify | Overlay and duplicate-button styles, armed-ghost class. |
| `i18n.mjs` | modify | Ten new keys in both catalogues. |
| `tests/symbol-palette-data.test.mjs` | create | Seam coverage: 64 elements, a display name for each. |
| `tests/symbol-search.test.mjs` | create | Matcher coverage. |
| `tests/keyboard-routing.test.mjs` | create | Router coverage, including the modal gate. |
| `tests/symbol-interactions.test.mjs` | modify | Duplication coverage. |
| `tests/symbol-palette-ui.test.mjs` | modify | Static markup and CSS assertions; cache-bust row. |
| `tests/symbol-catalog.test.mjs` | modify | Cache-bust rows. |
| `tests/support-illustrations.test.mjs` | modify | Cache-bust row. |
| `tests/i18n-html.test.mjs` | modify | Attribute regex extended to `-placeholder`. |
| `tests/i18n.test.mjs` | modify | Direct assertions on the runtime-constructed status keys. |
| `tests/browser/escape-during-search.mjs` | create | The one browser smoke test. |

---

# Stage 1 — Seams

Everything in this stage is testable under Node. No user-visible change ships until Stage 2.

---

### Task 1: Extract the palette data seam

**Files:**
- Create: `symbol-palette-data.mjs`
- Modify: `app.js:50-148` (the `elements` array), `app.js:150-217` (the `englishElementNames` table)
- Test: `tests/symbol-palette-data.test.mjs` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `export const PALETTE_ELEMENTS` — a frozen array of 64 objects, each `{ name: string, color: string, rune: string, charge: number, kind: string, category: string, meaning: string }`. `export const ENGLISH_DISPLAY_NAMES` — a frozen object mapping French palette name to English label; 66 entries (the 64 palette keys plus `Energie brute` and `Aucun`).

- [ ] **Step 1: Write the failing test**

Create `tests/symbol-palette-data.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from "../symbol-palette-data.mjs";

test("la palette expose exactement 64 elements figes", () => {
  assert.equal(PALETTE_ELEMENTS.length, 64);
  assert.ok(Object.isFrozen(PALETTE_ELEMENTS));
  for (const element of PALETTE_ELEMENTS) {
    assert.equal(typeof element.name, "string");
    assert.match(element.rune, /^[A-Z]{2}$/);
    assert.match(element.color, /^#[0-9a-f]{6}$/i);
  }
});

test("chaque element de la palette possede un nom anglais", () => {
  const missing = PALETTE_ELEMENTS.filter((element) => !ENGLISH_DISPLAY_NAMES[element.name]);
  assert.deepEqual(missing, [], `elements sans nom anglais: ${missing.map((e) => e.name).join(", ")}`);
});

test("les runes sont uniques, sinon la recherche par rune est ambigue", () => {
  const runes = PALETTE_ELEMENTS.map((element) => element.rune);
  assert.equal(new Set(runes).size, runes.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/symbol-palette-data.test.mjs`
Expected: FAIL — `Cannot find module .../symbol-palette-data.mjs`

- [ ] **Step 3: Create the seam module**

Create `symbol-palette-data.mjs`. Move the array literal currently at `app.js:50-148` and the object literal at `app.js:150-217` verbatim — do not retype the data, cut and paste it, then rename and export:

```js
// symbol-palette-data.mjs
// DOM-free palette data. app.js cannot be imported under Node, so both the app
// and the tests read the tables from here rather than from app.js.

export const PALETTE_ELEMENTS = Object.freeze([
  { name: "Feu", color: "#a94a38", rune: "FE", charge: 2, kind: "sigil", category: "Sigil", meaning: "Cree et manipule les flammes ou la chaleur." },
  // ... the remaining 63 entries, moved verbatim from app.js:50-148 ...
]);

export const ENGLISH_DISPLAY_NAMES = Object.freeze({
  "Feu": "Fire",
  // ... the remaining 65 entries, moved verbatim from app.js:150-217 ...
});
```

- [ ] **Step 4: Point `app.js` at the seam**

At the top of `app.js`, alongside the existing module imports, add:

```js
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from "./symbol-palette-data.mjs";
```

Then replace the two deleted declarations with local aliases, so the ~200 existing references in `app.js` keep working unchanged:

```js
const elements = PALETTE_ELEMENTS;
const englishElementNames = ENGLISH_DISPLAY_NAMES;
```

- [ ] **Step 5: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 173 tests (170 baseline + 3 new).

- [ ] **Step 6: Verify the data actually moved, not copied**

Run: `grep -c 'rune: "' app.js`
Expected: `0`. A non-zero count means the array was duplicated rather than moved, which reintroduces exactly the drift this seam exists to prevent.

- [ ] **Step 7: Commit**

```bash
git add symbol-palette-data.mjs app.js tests/symbol-palette-data.test.mjs
git commit -m "refactor: extract palette data into a DOM-free seam

app.js cannot be imported under Node, so the 64-element array and the
English display-name table move into symbol-palette-data.mjs. Both the
app and the tests now read the same source, which makes the join
between the two tables verifiable for the first time."
```

---

### Task 2: The pure search matcher

**Files:**
- Create: `symbol-search.mjs`
- Test: `tests/symbol-search.test.mjs` (create)

**Interfaces:**
- Consumes: `PALETTE_ELEMENTS`, `ENGLISH_DISPLAY_NAMES` from Task 1; `normalizeSearchText` from `variant-catalog.mjs:60`.
- Produces:
  - `buildSymbolSearchIndex(elements, englishNames)` → frozen array of frozen records `{ element, order: number, frenchName: string, englishName: string, rune: string }` where the three string fields are already normalized.
  - `searchSymbols(index, query, limit = 64)` → array of `element` objects, ranked. Empty/whitespace query returns every element in palette order.

- [ ] **Step 1: Write the failing test**

Create `tests/symbol-search.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from "../symbol-palette-data.mjs";
import { buildSymbolSearchIndex, searchSymbols } from "../symbol-search.mjs";

const index = buildSymbolSearchIndex(PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES);

const names = (results) => results.map((element) => element.name);

test("l'index couvre les 64 elements et reste fige", () => {
  assert.equal(index.length, 64);
  assert.ok(Object.isFrozen(index));
  assert.ok(Object.isFrozen(index[0]));
});

test("une requete anglaise trouve les deux elements de vent", () => {
  assert.deepEqual(names(searchSymbols(index, "wind")), ["Vent", "Vent sous pied"]);
});

test("la requete francaise equivalente donne le meme resultat", () => {
  assert.deepEqual(names(searchSymbols(index, "vent")), ["Vent", "Vent sous pied"]);
});

test("les accents de la requete sont replies sur les noms stockes", () => {
  assert.deepEqual(names(searchSymbols(index, "fumee")), ["Fumee"]);
  assert.deepEqual(names(searchSymbols(index, "fumée")), ["Fumee"]);
});

test("une rune exacte passe devant les correspondances par prefixe", () => {
  const results = searchSymbols(index, "fe");
  assert.equal(results[0].name, "Feu", "la rune FE doit primer sur les prefixes en fe");
});

test("une requete vide rend les 64 elements dans l'ordre de la palette", () => {
  const results = searchSymbols(index, "");
  assert.equal(results.length, 64);
  assert.deepEqual(names(results), PALETTE_ELEMENTS.map((element) => element.name));
  assert.deepEqual(names(searchSymbols(index, "   ")), names(results));
});

test("une requete absurde ne rend rien", () => {
  assert.deepEqual(searchSymbols(index, "zzzzqx"), []);
});

test("la limite tronque sans changer l'ordre", () => {
  const results = searchSymbols(index, "", 5);
  assert.deepEqual(names(results), PALETTE_ELEMENTS.slice(0, 5).map((element) => element.name));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/symbol-search.test.mjs`
Expected: FAIL — `Cannot find module .../symbol-search.mjs`

- [ ] **Step 3: Write the matcher**

Create `symbol-search.mjs`:

```js
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
```

- [ ] **Step 4: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 181 tests.

If the rune test fails, read the failure before changing the code: it asserts a design property (exact beats prefix), and the fix belongs in `scoreRecord`, not in the assertion.

- [ ] **Step 5: Commit**

```bash
git add symbol-search.mjs tests/symbol-search.test.mjs
git commit -m "feat: add the pure element search matcher

Matches on the French name, the English display name, and the rune,
scoring exact above prefix and breaking ties by palette order so the
result list is stable between keystrokes. Query text is folded through
the existing normalizeSearchText, so an accented query matches the
unaccented stored names."
```

---

### Task 3: The duplication primitive

**Files:**
- Modify: `symbol-interactions.mjs` (append after `translateSelectedActions`, `symbol-interactions.mjs:200-215`)
- Test: `tests/symbol-interactions.test.mjs` (append)

**Interfaces:**
- Consumes: `cloneActions` and `translateSelectedActions`, both already exported from `symbol-interactions.mjs`.
- Produces: `planDuplication(actions, indices, dx, dy)` → `{ actions, indices }`. `actions` is a new array with the clones appended; `indices` are the positions of the appended clones. When `indices` is empty, or when `dx` and `dy` are both `0`, it returns `{ actions, indices: [] }` and appends nothing.

The caller owns the clamp. This function never reads canvas bounds — that is what keeps it Node-testable.

- [ ] **Step 1: Write the failing test**

Append to `tests/symbol-interactions.test.mjs`. Add `planDuplication` to the existing import list at the top of that file, then:

```js
const duplicationFixture = () => [
  { type: "glyph", x: 100, y: 100, size: 40, element: { name: "Feu" } },
  { type: "circle", x: 200, y: 150, radius: 50 },
  { type: "pen", points: [{ x: 10, y: 10 }] },
];

test("la duplication ajoute autant d'actions qu'il y en avait de selectionnees", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0, 1], 12, 12);

  assert.equal(result.actions.length, 5);
  assert.equal(result.indices.length, 2);
});

test("ce sont les copies, pas les originaux, qui restent selectionnees", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0, 1], 12, 12);

  assert.deepEqual(result.indices, [3, 4]);
  assert.equal(result.actions[0].x, 100, "l'original ne bouge pas");
  assert.equal(result.actions[3].x, 112, "la copie est decalee");
});

test("un delta partage preserve l'espacement relatif d'une selection mixte", () => {
  const actions = duplicationFixture();
  const before = actions[1].x - actions[0].x;
  const result = planDuplication(actions, [0, 1], 25, -10);
  const after = result.actions[4].x - result.actions[3].x;

  assert.equal(after, before, "un clamp par action deformerait le groupe");
  assert.equal(result.actions[4].y - result.actions[3].y, actions[1].y - actions[0].y);
});

test("un delta nul est un non-evenement et n'empile rien", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0, 1], 0, 0);

  assert.equal(result.actions.length, 3);
  assert.deepEqual(result.indices, []);
});

test("une selection vide ne duplique rien", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [], 12, 12);

  assert.equal(result.actions.length, 3);
  assert.deepEqual(result.indices, []);
});

test("les originaux non selectionnes sont laisses intacts", () => {
  const actions = duplicationFixture();
  const result = planDuplication(actions, [0], 12, 12);

  assert.deepEqual(result.actions[2], actions[2], "le trait a main levee n'est pas touche");
  assert.equal(result.actions.length, 4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/symbol-interactions.test.mjs`
Expected: FAIL — `SyntaxError: The requested module '../symbol-interactions.mjs' does not provide an export named 'planDuplication'`

- [ ] **Step 3: Implement the primitive**

Append to `symbol-interactions.mjs`:

```js
export function planDuplication(actions, indices, dx, dy) {
  const ordered = [...indices].sort((a, b) => a - b);
  if (ordered.length === 0 || (dx === 0 && dy === 0)) {
    return { actions, indices: [] };
  }
  const copies = cloneActions(ordered.map((index) => actions[index]));
  const appended = [...actions, ...copies];
  const appendedIndices = copies.map((_, offset) => actions.length + offset);
  return {
    actions: translateSelectedActions(appended, appendedIndices, dx, dy),
    indices: appendedIndices,
  };
}
```

- [ ] **Step 4: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 187 tests.

- [ ] **Step 5: Commit**

```bash
git add symbol-interactions.mjs tests/symbol-interactions.test.mjs
git commit -m "feat: add the group duplication primitive

One shared translation across the whole selection rather than a clamp
per action, which would distort the relative spacing of a mixed
glyph/circle/ring group. A zero delta appends nothing, so pressing
duplicate against a canvas edge cannot build an invisible stack of
exact overlapping copies."
```

---

### Task 4: Extract the keyboard router

**Files:**
- Create: `keyboard-routing.mjs`
- Test: `tests/keyboard-routing.test.mjs` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveKeyCommand(key, context)` → `{ command: string, preventDefault: boolean }`.
  - `key` is `{ key: string, metaKey: boolean, ctrlKey: boolean, shiftKey: boolean }`.
  - `context` is `{ isTyping: boolean, searchOpen: boolean, view3dOpen: boolean, drawerOpen: boolean, hasSelection: boolean, guideSelected: boolean, armed: boolean }`.
  - `command` is one of: `"none"`, `"undo"`, `"redo"`, `"save"`, `"delete"`, `"close3d"`, `"closeDrawer"`, `"openSearch"`, `"duplicate"`, `"disarm"`, `"activateCircle"`, `"analyzeSpell"`, `"zoomOut"`, `"zoomReset"`, `"zoomIn"`, `"clearSelection"`, `"clearGuide"`, `"clearCanvas"`.

This function decides. It performs nothing and touches no state. Task 5 makes `app.js` dispatch on its return value.

**Ordering is the contract.** The modal gate is the first branch, ahead of the modifier block and ahead of the `isTyping` guard — the reverse of the current handler, where `Cmd+Z` and `Cmd+S` are checked first.

- [ ] **Step 1: Write the failing test**

Create `tests/keyboard-routing.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { resolveKeyCommand } from "../keyboard-routing.mjs";

const IDLE = Object.freeze({
  isTyping: false,
  searchOpen: false,
  view3dOpen: false,
  drawerOpen: false,
  hasSelection: false,
  guideSelected: false,
  armed: false,
});

const press = (key, overrides = {}, context = {}) =>
  resolveKeyCommand(
    { key, metaKey: false, ctrlKey: false, shiftKey: false, ...overrides },
    { ...IDLE, ...context },
  );

test("la superposition ouverte neutralise toute la carte des raccourcis", () => {
  const context = { searchOpen: true, hasSelection: true };
  for (const [key, overrides] of [
    ["Escape", {}],
    ["z", { metaKey: true }],
    ["s", { metaKey: true }],
    ["d", { metaKey: true }],
    ["a", {}],
    ["l", {}],
    ["Delete", {}],
    ["Backspace", {}],
    ["+", {}],
  ]) {
    assert.equal(
      press(key, overrides, context).command,
      "none",
      `${key} doit etre neutralise pendant que la superposition est ouverte`,
    );
  }
});

test("la porte modale precede le garde de saisie et le bloc modificateur", () => {
  assert.equal(press("z", { metaKey: true }, { searchOpen: true, isTyping: false }).command, "none");
  assert.equal(press("z", { metaKey: true }).command, "undo");
});

test("les nouveaux raccourcis sont relies et neutralisent le navigateur", () => {
  assert.deepEqual(press("k", { metaKey: true }), { command: "openSearch", preventDefault: true });
  assert.deepEqual(press("k", { ctrlKey: true }), { command: "openSearch", preventDefault: true });
  assert.deepEqual(press("D", { metaKey: true }), { command: "duplicate", preventDefault: true });
});

test("Cmd+Z et Maj+Cmd+Z restent distincts", () => {
  assert.equal(press("z", { metaKey: true }).command, "undo");
  assert.equal(press("z", { metaKey: true, shiftKey: true }).command, "redo");
});

test("la saisie dans un champ ne laisse passer que les raccourcis modificateurs", () => {
  assert.equal(press("a", {}, { isTyping: true }).command, "none");
  assert.equal(press("Escape", {}, { isTyping: true }).command, "none");
  assert.equal(press("s", { metaKey: true }, { isTyping: true }).command, "save");
});

test("Echap desarme le pointeur avant de toucher au dessin", () => {
  assert.equal(press("Escape", {}, { armed: true }).command, "disarm");
  assert.equal(press("Escape", {}, { armed: true, hasSelection: true }).command, "disarm");
});

test("l'ordre de repli d'Echap est preserve pour les etats existants", () => {
  assert.equal(press("Escape", {}, { view3dOpen: true }).command, "close3d");
  assert.equal(press("Escape", {}, { drawerOpen: true }).command, "closeDrawer");
  assert.equal(press("Escape", {}, { hasSelection: true }).command, "clearSelection");
  assert.equal(press("Escape", {}, { guideSelected: true }).command, "clearGuide");
  assert.equal(press("Escape").command, "clearCanvas");
});

test("Supprimer n'agit que sur une selection", () => {
  assert.equal(press("Delete", {}, { hasSelection: true }).command, "delete");
  assert.equal(press("Delete").command, "none");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/keyboard-routing.test.mjs`
Expected: FAIL — `Cannot find module .../keyboard-routing.mjs`

- [ ] **Step 3: Write the router**

Create `keyboard-routing.mjs`:

```js
// keyboard-routing.mjs
// Decides which canvas command a keydown maps to. Performs nothing and reads
// no state, so the whole shortcut map is testable under Node.

const NONE = Object.freeze({ command: "none", preventDefault: false });

const act = (command, preventDefault = false) => ({ command, preventDefault });

export function resolveKeyCommand(key, context) {
  // The modal gate is first. While the overlay is open, every canvas command is
  // suppressed - not just Escape. Cmd+D, Cmd+Z, Cmd+S and the bare letters A and
  // L would otherwise mutate a canvas the player cannot see.
  if (context.searchOpen) {
    return NONE;
  }

  const modifier = key.metaKey || key.ctrlKey;
  const lower = key.key.length === 1 ? key.key.toLowerCase() : key.key;

  if (modifier && lower === "z") {
    return act(key.shiftKey ? "redo" : "undo", true);
  }
  if (modifier && lower === "s") {
    return act("save", true);
  }
  if (modifier && lower === "k") {
    return act("openSearch", true);
  }
  if (modifier && lower === "d") {
    return act("duplicate", true);
  }

  if (context.isTyping) {
    return NONE;
  }

  if ((key.key === "Delete" || key.key === "Backspace") && context.hasSelection) {
    return act("delete", true);
  }

  if (key.key === "Escape") {
    if (context.view3dOpen) return act("close3d", true);
    if (context.drawerOpen) return act("closeDrawer", true);
    if (context.armed) return act("disarm", true);
    if (context.hasSelection) return act("clearSelection");
    if (context.guideSelected) return act("clearGuide");
    return act("clearCanvas");
  }

  if (lower === "a") return act("activateCircle");
  if (lower === "l") return act("analyzeSpell");
  if (key.key === "-" || key.key === "_") return act("zoomOut", true);
  if (key.key === "=") return act("zoomReset", true);
  if (key.key === "+" || key.key === "Add") return act("zoomIn", true);

  return NONE;
}
```

- [ ] **Step 4: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 195 tests.

- [ ] **Step 5: Commit**

```bash
git add keyboard-routing.mjs tests/keyboard-routing.test.mjs
git commit -m "feat: extract the keyboard command router

The whole shortcut map becomes a pure decision function, which makes
the modal gate unit-testable rather than reachable only through a
browser. The gate is the first branch, ahead of the modifier block and
the typing guard, so an open overlay suppresses every canvas command
and not merely Escape."
```

---

### Task 5: Centralize tool transitions and dispatch the router

**Files:**
- Modify: `app.js:7231` (`beginRightSelection`), `app.js:7857` (drawer Enter), `app.js:8081` (`selectGuide`), `app.js:8176` (guide creation), `app.js:8795-8801` (toolbar loop), `app.js:8898-8969` (keydown handler), `app.js:7844` (drawer click)
- Test: `tests/symbol-palette-ui.test.mjs` (append a source-shape assertion)

**Interfaces:**
- Consumes: `resolveKeyCommand` from Task 4.
- Produces, inside `app.js` (not exported — `app.js` exposes exactly one `export` across 9019 lines and this task does not change that):
  - `setTool(nextTool, options = {})` — the only place `state.tool` is assigned. `options.element` optionally sets `state.element` in the same transition.
  - `armSymbol(element)` — `setTool("glyph", { element })`, closes any open drawer, sets ghost ownership.
  - `disarmSymbol()` — `setTool(state.previousTool || "select")`, releases ghost ownership.

**The five assignment sites are measured, not assumed.** `grep -c 'state\.tool = ' app.js` returns 5 today. Three of them force `"select"` from paths earlier revisions of the spec never listed, and each one strands the armed ghost if left unrouted.

- [ ] **Step 1: Write the failing test**

Append to `tests/symbol-palette-ui.test.mjs`:

```js
test("une seule affectation de state.tool subsiste, dans setTool", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const assignments = app.match(/state\.tool = /g) || [];

  assert.equal(
    assignments.length,
    1,
    "toute transition d'outil doit passer par setTool, sinon l'apercu arme survit a un changement d'outil",
  );
  assert.match(app, /function setTool\(/);
  assert.match(app, /function armSymbol\(/);
  assert.match(app, /function disarmSymbol\(/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/symbol-palette-ui.test.mjs`
Expected: FAIL — `Expected values to be strictly equal: 5 !== 1`

- [ ] **Step 3: Add the state fields**

In the `state` initializer near `app.js:419`, add:

```js
  previousTool: "select",
  ghostOwner: null,
  ghostOwnerBeforeDrag: null,
```

Do **not** add a `searchOpen` field. Overlay openness is derived in Task 8 from `dialog.open`; a mirrored flag makes a permanent, silent Escape suppression reachable from any future close path.

- [ ] **Step 4: Write `setTool`, `armSymbol`, `disarmSymbol`**

Place these immediately above `beginRightSelection` (currently `app.js:7230`), so they precede every caller:

```js
function setTool(nextTool, options = {}) {
  const previous = state.tool;
  if (Object.prototype.hasOwnProperty.call(options, "element") && options.element) {
    state.element = options.element;
  }
  // Edge-triggered: only a transition INTO glyph from something else records the
  // return tool. Arming while already armed must not overwrite it, or Escape
  // restores glyph and can never disarm.
  if (nextTool === "glyph" && previous !== "glyph") {
    state.previousTool = previous;
  }
  state.tool = nextTool;
  if (previous === "glyph" && nextTool !== "glyph") {
    state.ghostOwner = state.ghostOwner === "armed" ? null : state.ghostOwner;
  }
  updateToolButtons();
  updateInkSelection();
  renderGhost();
}

function armSymbol(element) {
  setTool("glyph", { element });
  // A live drag keeps the ghost element until it tears down; arming during one
  // records the intent and Task 9's teardown restores "armed" afterwards.
  if (state.ghostOwner !== "drag") {
    state.ghostOwner = "armed";
  } else {
    state.ghostOwnerBeforeDrag = "armed";
  }
  setOpenDrawer(null);
  renderGhost();
  setStatus(t("status.symbolArmed", { name: elementDisplayName(element) }));
}

function disarmSymbol() {
  const returnTool = state.previousTool || "select";
  state.ghostOwner = null;
  setTool(returnTool);
  setStatus(t("status.symbolDisarmed"));
}
```

`renderGhost` is written in Task 9. For this task, add a temporary no-op stub near the other ghost helpers so `app.js` parses; Task 9 replaces its body:

```js
function renderGhost() {
  // Body implemented in Task 9 (ghost ownership).
}
```

- [ ] **Step 5: Route all five assignment sites**

Replace each direct assignment with a `setTool` call. The three `select`-forcing sites keep their surrounding logic unchanged; only the assignment line moves:

| Line | Before | After |
| --- | --- | --- |
| `app.js:7231` (`beginRightSelection`) | `state.tool = "select";` | `setTool("select");` |
| `app.js:7857` (drawer Enter) | `state.element = element;` then `state.tool = "glyph";` | `armSymbol(element);` |
| `app.js:8081` (`selectGuide`) | `state.tool = "select";` | `setTool("select");` |
| `app.js:8176` (guide creation) | `state.tool = "select";` | `setTool("select");` |
| `app.js:8798` (toolbar loop) | `state.tool = button.dataset.tool;` | `setTool(button.dataset.tool);` |

At `app.js:7857` the drawer Enter handler currently also calls `updateInkSelection()`, `updateToolButtons()`, and `setSymbolDrawer(false)` — `armSymbol` and `setTool` now do all three, so delete those three lines. Keep the `event.preventDefault()`.

At `app.js:7844` the drawer **click** handler sets `state.element` but never `state.tool`, so it currently prepares a symbol without arming — the dead end this feature removes. Replace its body:

```js
      button.addEventListener("click", () => {
        armSymbol(element);
      });
```

At `app.js:8798` the toolbar loop's `setStatus` call reads `state.tool` after the assignment; it still works, because `setTool` has assigned by the time the next line runs. Leave it.

- [ ] **Step 6: Dispatch the keydown handler through the router**

Add the import at the top of `app.js`:

```js
import { resolveKeyCommand } from "./keyboard-routing.mjs";
```

Replace the whole handler at `app.js:8898-8969` with a dispatcher. Every command body is lifted verbatim from the branch it replaces:

```js
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const { command, preventDefault } = resolveKeyCommand(event, {
    isTyping: target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement,
    searchOpen: searchOpen(),
    view3dOpen: !view3dPanel.hidden,
    drawerOpen:
      document.body.classList.contains("symbols-open") ||
      document.body.classList.contains("details-open") ||
      document.body.classList.contains("support-open") ||
      document.body.classList.contains("guides-open"),
    hasSelection: state.selectedActionIndices.length > 0,
    guideSelected: state.guideSelected,
    armed: state.tool === "glyph" && state.ghostOwner === "armed",
  });

  if (command === "none") {
    return;
  }
  if (preventDefault) {
    event.preventDefault();
  }

  switch (command) {
    case "undo": undo(); break;
    case "redo": redo(); break;
    case "save": saveCanvas(); break;
    case "delete": deleteSelectedActions(); break;
    case "close3d": close3dView(); setStatus(t("status.view3dClosed")); break;
    case "closeDrawer": setOpenDrawer(null); setStatus(t("status.drawerClosed")); break;
    case "openSearch": openSymbolSearch(); break;
    case "duplicate": duplicateSelectedActions(); break;
    case "disarm": disarmSymbol(); break;
    case "activateCircle": activateCircle(); break;
    case "analyzeSpell": analyzeSpell(); break;
    case "zoomOut": setCanvasScale(state.canvasScale - 10); break;
    case "zoomReset": setCanvasScale(100); break;
    case "zoomIn": setCanvasScale(state.canvasScale + 10); break;
    case "clearSelection":
      state.selectedActionIndices = [];
      updateSelectionControls();
      setStatus(t("status.selectionCleared"));
      render();
      break;
    case "clearGuide":
      state.guideSelected = false;
      state.guideResize = null;
      setStatus(t("status.selectionCleared"));
      render();
      break;
    case "clearCanvas": clearCanvas(); break;
  }
});
```

`searchOpen()`, `openSymbolSearch()`, and `duplicateSelectedActions()` do not exist yet. Add these three stubs above the handler; Tasks 6 and 8 replace them:

```js
function searchOpen() {
  return false;
}

function openSymbolSearch() {
  // Body implemented in Task 8 (overlay wiring).
}
```

`duplicateSelectedActions` is implemented in Task 6, which is the next task, so no stub is needed if Tasks 5 and 6 land in that order. If you are executing out of order, add `function duplicateSelectedActions() {}` and delete it in Task 6.

- [ ] **Step 7: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 196 tests.

- [ ] **Step 8: Verify the assignment count by hand**

Run: `grep -n 'state\.tool = ' app.js`
Expected: exactly one line, inside `setTool`. This is the invariant the whole "no parallel armed flag" decision rests on; the test asserts it, but confirm the one surviving line is the right one.

- [ ] **Step 9: Manual smoke check**

Run: `python3 -m http.server 8000 --bind 127.0.0.1`, open `http://127.0.0.1:8000/index.html`.
Confirm: the tool buttons still switch tools, the symbol drawer still opens, `Cmd+Z` still undoes, and `Escape` on an empty canvas still clears. The overlay does not exist yet — `Cmd+K` correctly does nothing visible.

- [ ] **Step 10: Commit**

```bash
git add app.js tests/symbol-palette-ui.test.mjs
git commit -m "refactor: centralize tool transitions and dispatch keydown

All five direct state.tool assignments route through one setTool. Three
of them force select from paths that were never on the arming list -
right-drag marquee, guide selection, guide creation - and each one
would otherwise leave the armed preview following a cursor whose tool
no longer stamps. The keydown handler now dispatches on the extracted
router rather than carrying the shortcut map inline."
```

---

### Task 6: Wire duplication into the app

**Files:**
- Modify: `app.js` (add `duplicateSelectedActions` beside `deleteSelectedActions` at `app.js:7412`)
- Test: covered by Task 3's primitive tests plus the i18n assertions in Task 10

**Interfaces:**
- Consumes: `planDuplication` from Task 3; `combinedSelectionBounds` from `symbol-interactions.mjs:149`; `clampSelectionDelta` at `app.js:7290`.
- Produces: `duplicateSelectedActions()` → `boolean`, mirroring `deleteSelectedActions()`'s signature and shape.

- [ ] **Step 1: Add `planDuplication` to the app's import list**

`app.js` already imports from `symbol-interactions.mjs`. Add `planDuplication` and `combinedSelectionBounds` to that import if either is absent.

- [ ] **Step 2: Implement the function**

Insert immediately after `deleteSelectedActions` ends (currently `app.js:7430`). The offset of 16 device pixels matches the visual step the drawing already uses for a nudge:

```js
const DUPLICATE_OFFSET = 16;

function duplicateSelectedActions() {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    setStatus(t("status.duplicateNoSelection"));
    return false;
  }
  const bounds = combinedSelectionBounds(state.actions, indices);
  if (!bounds) {
    setStatus(t("status.duplicateNoSelection"));
    return false;
  }
  // One shared clamped delta, never a clamp per action: a mixed
  // glyph/circle/ring selection would otherwise have its relative spacing
  // distorted by copies that each hit the limit at a different offset.
  const { dx, dy } = clampSelectionDelta(bounds, DUPLICATE_OFFSET, DUPLICATE_OFFSET);
  if (dx === 0 && dy === 0) {
    setStatus(t("status.duplicateBlocked"));
    return false;
  }
  recordHistory();
  const result = planDuplication(state.actions, indices, dx, dy);
  state.actions = result.actions;
  state.selectedActionIndices = result.indices;
  state.activeSpell = null;
  refreshCircleCenter();
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.duplicated", { count: result.indices.length }));
  render();
  return true;
}
```

`recordHistory()` runs after the zero-delta check, so a blocked duplication records no undo snapshot — one snapshot per actual duplication, as the spec requires.

- [ ] **Step 3: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 196 tests. The four new `t()` keys resolve to visible `[status.duplicated]`-style diagnostics until Task 10 adds them; that is the catalogue's designed fallback and breaks nothing.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: duplicate the selection with one shared clamped delta

Duplication takes combinedSelectionBounds through the existing
clampSelectionDelta and applies a single translation, so a mixed
selection keeps its relative spacing. A zero delta reports a blocked
status and records no undo snapshot rather than appending an exact
overlapping copy."
```

---

# Stage 2 — UI

---

### Task 7: Overlay markup, styles, and the cache-bust bump

**Files:**
- Modify: `index.html:34` (styles link), `index.html:44` (app script), `index.html:114-120` (tool strip), `index.html:311` (beside the ghost)
- Modify: `styles.css`
- Modify: `tests/symbol-catalog.test.mjs:155-156`, `tests/symbol-palette-ui.test.mjs:21`, `tests/support-illustrations.test.mjs:22`
- Test: `tests/symbol-palette-ui.test.mjs` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: element ids `symbolSearchDialog`, `symbolSearchInput`, `symbolSearchResults`, `symbolSearchStatus`, `closeSymbolSearchButton`, `duplicateSelectionButton`. Task 8 queries all six by id.

- [ ] **Step 1: Write the failing test**

Append to `tests/symbol-palette-ui.test.mjs`:

```js
test("la superposition de recherche et le bouton dupliquer sont dans la page", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of [
    "symbolSearchDialog",
    "symbolSearchInput",
    "symbolSearchResults",
    "symbolSearchStatus",
    "closeSymbolSearchButton",
    "duplicateSelectionButton",
  ]) {
    assert.match(html, new RegExp("id=[\\\"']" + id + "[\\\"']"));
  }
  assert.match(html, /id=["']symbolSearchResults["'][^>]*role=["']listbox["']/);
  assert.match(html, /id=["']symbolSearchStatus["'][^>]*aria-live=["']polite["']/);
  assert.match(html, /data-i18n-placeholder=["']search\.placeholder["']/);
});

test("la superposition de recherche est stylee", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.symbol-search-dialog/);
  assert.match(css, /\.symbol-search-result/);
  assert.match(css, /\.symbol-search-result\[aria-selected="true"\]/);
  assert.match(css, /\.symbol-drag-ghost\.is-armed/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/symbol-palette-ui.test.mjs`
Expected: FAIL — the `symbolSearchDialog` assertion.

- [ ] **Step 3: Add the dialog markup**

Insert into `index.html` immediately before the ghost div at line 311, following the `<dialog>` pattern already used at `bibliotheque.html:194`:

```html
    <dialog class="symbol-search-dialog" id="symbolSearchDialog" aria-labelledby="symbolSearchTitle">
      <form method="dialog" class="symbol-search-head">
        <h2 id="symbolSearchTitle" data-i18n="search.title">Find an element</h2>
        <button class="symbol-search-close" id="closeSymbolSearchButton" type="submit" value="cancel" data-i18n-aria-label="search.close" aria-label="Close the element search">&times;</button>
      </form>
      <input
        class="symbol-search-input"
        id="symbolSearchInput"
        type="search"
        autocomplete="off"
        role="combobox"
        aria-expanded="true"
        aria-controls="symbolSearchResults"
        data-i18n-placeholder="search.placeholder"
        placeholder="Name or rune"
      >
      <ul class="symbol-search-results" id="symbolSearchResults" role="listbox" data-i18n-aria-label="search.title" aria-label="Find an element"></ul>
      <p class="symbol-search-status" id="symbolSearchStatus" aria-live="polite"></p>
    </dialog>
```

- [ ] **Step 4: Add the duplicate button**

Insert into the tool strip in `index.html`, immediately after the `growSelectionButton` block that ends at line 119, matching the two existing selection tools exactly:

```html
            <button class="tool-button selection-tool" id="duplicateSelectionButton" type="button" data-i18n-aria-label="tool.duplicate" data-i18n-title="tool.duplicate" aria-label="Duplicate the selection" title="Duplicate the selection" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
            </button>
```

- [ ] **Step 5: Add the styles**

Append to `styles.css`, matching the existing serif-and-parchment palette (`--parchment`, `--ink`, `--line` are already declared at the top of the file; reuse them rather than inventing hex values):

```css
.symbol-search-dialog {
  width: min(520px, 92vw);
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--parchment);
  color: var(--ink);
  font-family: Georgia, "Times New Roman", serif;
}

.symbol-search-dialog::backdrop {
  background: rgba(32, 26, 22, 0.45);
}

.symbol-search-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 0 12px;
}

.symbol-search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
}

.symbol-search-results {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
}

.symbol-search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.symbol-search-result[aria-selected="true"] {
  background: rgba(159, 133, 88, 0.28);
}

.symbol-search-result .symbol-search-rune {
  margin-left: auto;
  opacity: 0.65;
  font-variant: small-caps;
}

.symbol-search-status {
  margin: 10px 0 0;
  font-size: 0.85rem;
  opacity: 0.75;
}

.symbol-drag-ghost.is-armed {
  opacity: 0.55;
}
```

- [ ] **Step 6: Bump the cache-bust strings**

Five edits, all in the same commit:

| File | Line | From | To |
| --- | --- | --- | --- |
| `index.html` | 34 | `styles.css?v=20260727-elemental-mixtures-v1` | `styles.css?v=20260729-element-search-v1` |
| `index.html` | 44 | `app.js?v=20260727-mixture-marquee-v1` | `app.js?v=20260729-element-search-v1` |
| `tests/symbol-catalog.test.mjs` | 155 | `/app\.js\?v=20260727-mixture-marquee-v1/` | `/app\.js\?v=20260729-element-search-v1/` |
| `tests/symbol-catalog.test.mjs` | 156 | `/styles\.css\?v=20260727-elemental-mixtures-v1/` | `/styles\.css\?v=20260729-element-search-v1/` |
| `tests/symbol-palette-ui.test.mjs` | 21 | `/styles\.css\?v=20260727-elemental-mixtures-v1/` | `/styles\.css\?v=20260729-element-search-v1/` |
| `tests/support-illustrations.test.mjs` | 22 | `/app\.js\?v=20260727-mixture-marquee-v1/` | `/app\.js\?v=20260729-element-search-v1/` |

Leave `tests/symbol-catalog.test.mjs:154` alone — it pins `symbol-catalog.mjs?v=20260723-board-assets-v1`, and that module is untouched. Leave `tests/symbol-palette-ui.test.mjs:22` alone — it matches `app\.js\?v=\d{8}-[^"']+` and survives any bump.

- [ ] **Step 7: Confirm no pinned value was missed**

Run: `grep -rn "20260727-mixture-marquee-v1\|20260727-elemental-mixtures-v1" index.html tests/`
Expected: no output. Any hit is a test that will fail or, worse, an asset reference left stale.

- [ ] **Step 8: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 198 tests.

`tests/i18n-html.test.mjs` will fail here if you ran Step 3 before Task 8 extends its regex — the `data-i18n="search.title"` attribute resolves against a catalogue that has no such key yet. If it does, the two remaining i18n keys land in Task 10; either land Task 10 before committing this one, or accept the temporary red and note it. Prefer landing Task 10 first if you are executing out of order.

- [ ] **Step 9: Commit**

```bash
git add index.html styles.css tests/symbol-catalog.test.mjs tests/symbol-palette-ui.test.mjs tests/support-illustrations.test.mjs
git commit -m "feat: add the element search overlay markup and duplicate button

Native dialog with a listbox result list, following the pattern the
variant dialog already uses. Both cache-bust strings are bumped and all
four tests that pin their exact values move in the same commit."
```

---

### Task 8: Wire the overlay behaviour

**Files:**
- Modify: `app.js` (replace the Task 5 stubs `searchOpen` and `openSymbolSearch`)
- Test: covered by Tasks 2 and 4 plus Task 11's browser smoke test

**Interfaces:**
- Consumes: `buildSymbolSearchIndex` / `searchSymbols` (Task 2), `armSymbol` (Task 5), the six element ids (Task 7).
- Produces: `searchOpen()` → boolean, read by the keydown dispatcher; `openSymbolSearch()`, called on the `openSearch` command.

- [ ] **Step 1: Import the matcher and build the index once**

At the top of `app.js`:

```js
import { buildSymbolSearchIndex, searchSymbols } from "./symbol-search.mjs";
```

Near the other module-level constants:

```js
const symbolSearchIndex = buildSymbolSearchIndex(PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES);
```

- [ ] **Step 2: Grab the elements**

Beside the other `document.getElementById` lookups:

```js
const symbolSearchDialog = document.getElementById("symbolSearchDialog");
const symbolSearchInput = document.getElementById("symbolSearchInput");
const symbolSearchResults = document.getElementById("symbolSearchResults");
const symbolSearchStatus = document.getElementById("symbolSearchStatus");
```

- [ ] **Step 3: Replace the `searchOpen` stub with a derived read**

```js
// Derived, never mirrored. A boolean field would have to be synchronized on
// every close path, and a stale true suppresses Escape permanently and
// silently. dialog.open is the browser's own state and cannot drift.
function searchOpen() {
  return symbolSearchDialog?.open === true;
}
```

- [ ] **Step 4: Render the result list**

```js
let symbolSearchMatches = [];
let symbolSearchActiveIndex = 0;

function renderSymbolSearchResults() {
  symbolSearchMatches = searchSymbols(symbolSearchIndex, symbolSearchInput.value);
  // Every query change resets the active index. The list rebuilds on each
  // keystroke, so an index held across a rebuild can point at a detached node:
  // nothing is announced and Enter confirms a stale record.
  symbolSearchActiveIndex = 0;
  symbolSearchResults.innerHTML = "";

  symbolSearchMatches.forEach((element, position) => {
    const item = document.createElement("li");
    item.className = "symbol-search-result";
    item.id = `symbolSearchResult-${position}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", position === 0 ? "true" : "false");
    item.innerHTML = `
      <span class="symbol-icon" style="--symbol-color:${element.color}">${elementIconMarkup(element)}</span>
      <span class="symbol-search-name">${elementDisplayName(element)}</span>
      <span class="symbol-search-rune">${element.rune}</span>
    `;
    item.addEventListener("click", () => confirmSymbolSearch(position));
    symbolSearchResults.append(item);
  });

  if (symbolSearchMatches.length === 0) {
    symbolSearchInput.removeAttribute("aria-activedescendant");
    symbolSearchStatus.textContent = t("search.empty");
    return;
  }
  symbolSearchInput.setAttribute("aria-activedescendant", "symbolSearchResult-0");
  symbolSearchStatus.textContent = t("search.results", { count: symbolSearchMatches.length });
}

function setSymbolSearchActive(nextIndex) {
  if (symbolSearchMatches.length === 0) {
    return;
  }
  const count = symbolSearchMatches.length;
  symbolSearchActiveIndex = ((nextIndex % count) + count) % count;
  for (const [position, item] of [...symbolSearchResults.children].entries()) {
    item.setAttribute("aria-selected", position === symbolSearchActiveIndex ? "true" : "false");
  }
  symbolSearchInput.setAttribute("aria-activedescendant", `symbolSearchResult-${symbolSearchActiveIndex}`);
  symbolSearchResults.children[symbolSearchActiveIndex]?.scrollIntoView({ block: "nearest" });
}

function confirmSymbolSearch(position = symbolSearchActiveIndex) {
  const element = symbolSearchMatches[position];
  if (!element) {
    return;
  }
  symbolSearchDialog.close();
  armSymbol(element);
}
```

- [ ] **Step 5: Replace the `openSymbolSearch` stub**

```js
function openSymbolSearch() {
  if (!symbolSearchDialog || symbolSearchDialog.open) {
    return;
  }
  symbolSearchInput.value = "";
  renderSymbolSearchResults();
  symbolSearchDialog.showModal();
  symbolSearchInput.focus();
}
```

- [ ] **Step 6: Bind the overlay's own keys**

Focus stays in the input and the active option is tracked with `aria-activedescendant`; focus never moves between results.

```js
symbolSearchInput?.addEventListener("input", renderSymbolSearchResults);

symbolSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setSymbolSearchActive(symbolSearchActiveIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setSymbolSearchActive(symbolSearchActiveIndex - 1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    confirmSymbolSearch();
  }
  // Escape is deliberately not handled here. The dialog closes itself, and the
  // document dispatcher sees searchOpen() === true on the same keydown and
  // suppresses the canvas command - which is the whole point of the gate.
});
```

- [ ] **Step 7: Add the discoverability hint**

In the symbol drawer heading in `index.html` (inside `#symbolDrawer`, which starts at line 144), append a hint span to the existing heading:

```html
<span class="symbol-drawer-hint" data-i18n="search.hint">Cmd+K</span>
```

Add `search.hint` to the Task 10 key list.

- [ ] **Step 8: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 198 tests.

- [ ] **Step 9: Manual check**

Serve the page. Press `Cmd+K`: the overlay opens with all 64 elements listed. Type `wind`: two results. Arrow down, press Enter: the overlay closes and the status reports the symbol armed. Click the parchment twice: two copies of that symbol are stamped.

- [ ] **Step 10: Commit**

```bash
git add app.js index.html
git commit -m "feat: wire the element search overlay

Overlay openness is read from dialog.open rather than mirrored into a
state field. Focus stays in the input and the active option is tracked
with aria-activedescendant, reset to the first result on every query
change so a rebuilt list cannot strand the pointer on a detached node."
```

---

### Task 9: Ghost ownership

**Files:**
- Modify: `app.js:8012-8013` (`cancelSymbolDrag` teardown), the Task 5 `renderGhost` stub, `finishSymbolDrag`, `startSymbolDrag`
- Test: covered by Task 11's browser smoke test and the Task 5 source assertion

**Interfaces:**
- Consumes: `state.ghostOwner` (added in Task 5).
- Produces: `renderGhost()` — the single place the ghost element and the `is-dragging-symbol` body class are written.

The armed preview and the transient drawer-drag preview share `#symbolDragGhost`. `cancelSymbolDrag()` clears both unconditionally today, so a drawer drag started while armed leaves the glyph tool active with no visible preview.

- [ ] **Step 1: Implement `renderGhost`**

Replace the Task 5 stub:

```js
function renderGhost() {
  if (!symbolDragGhost) {
    return;
  }
  if (state.ghostOwner === "drag") {
    return; // the drag path owns the element while a drag is in flight
  }
  if (state.ghostOwner === "armed" && state.element) {
    symbolDragGhost.innerHTML = `<span class="symbol-icon" style="--symbol-color:${state.element.color}">${elementIconMarkup(state.element)}</span>`;
    symbolDragGhost.classList.add("is-armed");
    return;
  }
  symbolDragGhost.innerHTML = "";
  symbolDragGhost.classList.remove("is-armed");
}
```

- [ ] **Step 2: Take and restore ownership around a drag**

In `startSymbolDrag`, before the existing body:

```js
  state.ghostOwnerBeforeDrag = state.ghostOwner;
  state.ghostOwner = "drag";
```

- [ ] **Step 3: Route both teardown paths through `renderGhost`**

In `cancelSymbolDrag` (`app.js:8012-8013`), replace the two unconditional clears:

```js
  symbolDragGhost.innerHTML = "";
  document.body.classList.remove("is-dragging-symbol", "is-valid-drop");
```

with:

```js
  document.body.classList.remove("is-dragging-symbol", "is-valid-drop");
  state.ghostOwner = state.ghostOwnerBeforeDrag ?? null;
  state.ghostOwnerBeforeDrag = null;
  renderGhost();
```

Apply the identical three-line restore to `finishSymbolDrag`, so a drop and a cancel behave the same. `ghostOwnerBeforeDrag` was already added to the `state` initializer in Task 5.

- [ ] **Step 4: Make the armed ghost follow the cursor**

The ghost is positioned in `moveSymbolDrag` (`app.js:7964-7965`), which is bound to `window` only for the duration of a drag. The armed ghost needs its own always-on listener. Add it beside the canvas listeners near the bottom of `app.js`:

```js
window.addEventListener("pointermove", (event) => {
  if (state.ghostOwner !== "armed") {
    return; // a live drag owns positioning through moveSymbolDrag
  }
  symbolDragGhost.style.left = event.clientX + "px";
  symbolDragGhost.style.top = event.clientY + "px";
});
```

`moveSymbolDrag` is untouched: while a drag is in flight `state.ghostOwner` is `"drag"`, so this listener returns immediately and the two never fight over the same style properties.

- [ ] **Step 5: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 198 tests.

- [ ] **Step 6: Manual check — the two covered cases**

Serve the page.
1. Arm a symbol with `Cmd+K`. Reopen the drawer, start dragging a different symbol, then press Escape mid-drag to cancel. The armed ghost must come back, not vanish.
2. Arm a symbol. Reopen the drawer, drag a different symbol onto the parchment and drop it. The pointer must still be armed afterwards and the ghost must be visible — a drop must not leave the glyph tool active with no preview, which is the exact state armed and never-chosen are supposed to be distinguishable by.

- [ ] **Step 7: Commit**

```bash
git add app.js
git commit -m "feat: give the symbol ghost a single owner

The armed preview and the drawer-drag preview share one element, and
the drag teardown cleared it unconditionally - so a drag started while
armed left the glyph tool active with no visible preview, which is the
one state the preview exists to distinguish. Both teardown paths now
restore ownership and re-render rather than clearing."
```

---

### Task 10: Localized strings

**Files:**
- Modify: `i18n.mjs` (both catalogues), `app.js` (duplicate button wiring)
- Test: `tests/i18n.test.mjs` (append), `tests/i18n-html.test.mjs:24` (extend the regex)

**Interfaces:**
- Consumes: nothing.
- Produces: ten keys in both catalogues.

- [ ] **Step 1: Extend the attribute scan**

In `tests/i18n-html.test.mjs`, line 24:

```js
// current
for (const match of html.matchAll(/data-i18n(?:-title|-aria-label|-alt)?="([^"]+)"/g)) {

// replace with
for (const match of html.matchAll(/data-i18n(?:-title|-aria-label|-alt|-placeholder)?="([^"]+)"/g)) {
```

This also brings the existing `data-i18n-placeholder` use at `bibliotheque.html:95` under test for the first time. If that key is missing from a catalogue, the test will now say so — fix the catalogue, do not narrow the regex back.

- [ ] **Step 2: Write the failing test**

Append to `tests/i18n.test.mjs`. These keys are constructed at runtime in `app.js`, so neither the parity test nor the HTML scan can reach them; each needs a direct assertion:

```js
test("the element search and duplication keys resolve in both locales", () => {
  for (const key of [
    "search.title",
    "search.placeholder",
    "search.close",
    "search.empty",
    "search.hint",
    "tool.duplicate",
  ]) {
    assert.notMatch(translate("en", key), /^\[/, `missing English ${key}`);
    assert.notMatch(translate("fr", key), /^\[/, `missing French ${key}`);
  }

  assert.equal(translate("en", "search.results", { count: 2 }), "2 results");
  assert.equal(translate("fr", "search.results", { count: 2 }), "2 resultats");
  assert.equal(translate("en", "status.symbolArmed", { name: "Fire" }), "Fire armed. Click the parchment to stamp it.");
  assert.equal(translate("fr", "status.symbolArmed", { name: "Feu" }), "Feu arme. Clique sur le parchemin pour l'apposer.");
  assert.equal(translate("en", "status.symbolDisarmed"), "Pointer released.");
  assert.equal(translate("fr", "status.symbolDisarmed"), "Pointeur relache.");
  assert.equal(translate("en", "status.duplicated", { count: 3 }), "3 copies added.");
  assert.equal(translate("fr", "status.duplicated", { count: 3 }), "3 copies ajoutees.");
  assert.equal(translate("en", "status.duplicateNoSelection"), "Select something before duplicating.");
  assert.equal(translate("fr", "status.duplicateNoSelection"), "Selectionne quelque chose avant de dupliquer.");
  assert.equal(translate("en", "status.duplicateBlocked"), "No room to place a copy here.");
  assert.equal(translate("fr", "status.duplicateBlocked"), "Pas de place pour poser une copie ici.");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/i18n.test.mjs`
Expected: FAIL — `missing English search.title`

- [ ] **Step 4: Add the English keys**

In the `en` catalogue in `i18n.mjs`, beside `"tool.grow"` at line 41:

```js
  "tool.duplicate": "Duplicate the selection",
```

And beside `"status.symbolClickToPlace"` at line 152:

```js
  "search.title": "Find an element",
  "search.placeholder": "Name or rune",
  "search.close": "Close the element search",
  "search.empty": "No element matches.",
  "search.results": "{count} results",
  "search.hint": "Cmd+K",
  "status.symbolArmed": "{name} armed. Click the parchment to stamp it.",
  "status.symbolDisarmed": "Pointer released.",
  "status.duplicated": "{count} copies added.",
  "status.duplicateNoSelection": "Select something before duplicating.",
  "status.duplicateBlocked": "No room to place a copy here.",
```

- [ ] **Step 5: Add the French keys**

In the `fr` catalogue, beside `"tool.grow"` at line 531:

```js
  "tool.duplicate": "Dupliquer la selection",
```

And beside `"status.symbolClickToPlace"` at line 642:

```js
  "search.title": "Trouver un element",
  "search.placeholder": "Nom ou rune",
  "search.close": "Fermer la recherche d'element",
  "search.empty": "Aucun element ne correspond.",
  "search.results": "{count} resultats",
  "search.hint": "Cmd+K",
  "status.symbolArmed": "{name} arme. Clique sur le parchemin pour l'apposer.",
  "status.symbolDisarmed": "Pointeur relache.",
  "status.duplicated": "{count} copies ajoutees.",
  "status.duplicateNoSelection": "Selectionne quelque chose avant de dupliquer.",
  "status.duplicateBlocked": "Pas de place pour poser une copie ici.",
```

No accented characters — the catalogues are written unaccented throughout, and `tests/i18n.test.mjs` compares exact strings.

- [ ] **Step 6: Wire the duplicate button**

In `app.js`, beside the `shrinkSelectionButton` / `growSelectionButton` lookups:

```js
const duplicateSelectionButton = document.getElementById("duplicateSelectionButton");
duplicateSelectionButton?.addEventListener("click", () => duplicateSelectedActions());
```

And in `updateSelectionControls` (`app.js:6593`), beside the two existing guards:

```js
  if (duplicateSelectionButton) {
    duplicateSelectionButton.disabled = !hasSelection;
  }
```

- [ ] **Step 7: Run the full suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 199 tests.

- [ ] **Step 8: Verify catalogue parity directly**

Run: `node --test tests/i18n.test.mjs`
Expected: PASS, including `English and French expose identical keys`. That test is what catches a one-sided addition; confirm it ran rather than assuming the suite covered it.

- [ ] **Step 9: Commit**

```bash
git add i18n.mjs app.js tests/i18n.test.mjs tests/i18n-html.test.mjs
git commit -m "feat: localize the element search and duplication strings

Ten keys in both catalogues, each with a direct assertion because the
parity test and the HTML attribute scan cannot reach a key constructed
at runtime. The attribute scan now covers data-i18n-placeholder, which
also brings the existing use in the library page under test."
```

---

### Task 11: The browser smoke test

**Files:**
- Create: `tests/browser/escape-during-search.mjs`

**Interfaces:**
- Consumes: the served app.
- Produces: nothing importable.

This covers the highest-severity case in the design, and there is no static substitute for it: a keydown of Escape dispatched inside an open `<dialog>` reaches a listener bound on `document`, and the canvas is cleared *before* the dialog's `cancel` event fires. The keyboard gate is unit-tested in Task 4, so this is a confirmation that the gate is actually wired, not the only coverage.

- [ ] **Step 1: Write the test**

Create `tests/browser/escape-during-search.mjs`. It is not picked up by `node --test tests/*.test.mjs` (that glob does not recurse), which is deliberate — it needs a served page and a browser:

```js
// Manual browser smoke test.
// Run: python3 -m http.server 8000 --bind 127.0.0.1
// Then paste this into the DevTools console on http://127.0.0.1:8000/index.html
//
// Asserts the single highest-severity case in the design: Escape while the
// search overlay is open must close the overlay and leave the drawing intact.

(async () => {
  const dialog = document.getElementById("symbolSearchDialog");
  const canvas = document.getElementById("canvas");

  // Place three symbols so there is something to lose.
  document.querySelector('[data-tool="glyph"]').click();
  for (let i = 0; i < 3; i += 1) {
    const point = { clientX: 300 + i * 40, clientY: 300 };
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0 }));
  }
  const before = document.getElementById("usedList").children.length;
  console.assert(before > 0, "setup failed: nothing was placed");

  // Open the overlay and press Escape from inside it.
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  console.assert(dialog.open === true, "overlay did not open on Cmd+K");
  dialog.querySelector("#symbolSearchInput").dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));

  const after = document.getElementById("usedList").children.length;
  console.assert(after === before, `REGRESSION: Escape destroyed the drawing (${before} -> ${after})`);
  console.log(after === before ? "PASS: drawing intact after Escape" : "FAIL");
})();
```

- [ ] **Step 2: Run it**

Run: `python3 -m http.server 8000 --bind 127.0.0.1`, open `http://127.0.0.1:8000/index.html`, paste the script into the DevTools console.
Expected: `PASS: drawing intact after Escape`, no console assertion failures.

If it reports the regression, the fault is in the dispatcher wiring from Task 5 — `searchOpen()` is returning `false` at handler time — not in the router, which Task 4 already proves in isolation.

- [ ] **Step 3: Run the full Node suite one last time**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 199 tests, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add tests/browser/escape-during-search.mjs
git commit -m "test: add the escape-during-search browser smoke test

The one case with no static substitute: Escape inside an open dialog
reaches the document listener and the canvas is cleared before the
dialog's cancel event fires, so a listener on cancel would be too late."
```

---

## Coverage Check

| Spec section | Task |
| --- | --- |
| Opening and searching | 2, 7, 8 |
| Arming and placing | 5, 8, 9 |
| Duplicating | 3, 6, 10 |
| `symbol-palette-data.mjs` seam | 1 |
| `symbol-search.mjs` | 2 |
| Overlay markup | 7 |
| `app.js` wiring (`setTool`, `armSymbol`, `disarmSymbol`) | 5 |
| State (`previousTool`, derived `searchOpen`, `ghostOwner`) | 5, 8, 9 |
| Ghost Ownership | 9 |
| Keyboard Map + modal gate | 4, 5 |
| Duplication Policy (shared clamped delta, zero-delta no-op) | 3, 6 |
| Accessibility (listbox, `aria-activedescendant` reset) | 7, 8 |
| Testing — pure | 2 |
| Testing — seam | 1 |
| Testing — duplication | 3 |
| Testing — browser | 11 |
| Testing — static assertions | 5, 7 |
| Localisation | 10 |
| Discoverability | 7, 8, 10 |
| Hazard: cache-bust pins | 7 |
| Hazard: placeholder scan | 10 |
| Hazard: runtime-constructed keys | 10 |
| Hazard: name-table labels | 1 |

## Deferred, not in this plan

- The footer keyboard legend. Explicitly out of scope in the spec.
- Fuzzy matching, `meaning` search, recent/favourite ordering. Explicitly out of scope.
- A visible toolbar button that opens the overlay. Explicitly out of scope; the drawer hint from Task 8 is the discoverability surface.
