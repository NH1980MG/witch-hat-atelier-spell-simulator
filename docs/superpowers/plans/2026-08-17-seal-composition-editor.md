# Seal Composition Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WHA Spell Maker-style seal composition editor that creates a default circle without a selection, edits an existing circle from the right-click menu, and exposes a bounded circle-size control.

**Architecture:** Keep the app's flat action list as the persistence format and add a focused composition module that extracts a normalized seal draft from an anchor circle, including legacy geometry fallback. The UI edits a draft, previews it, and commits one history transaction that updates existing actions or creates a new circle and glyphs.

**Tech Stack:** Static HTML, browser JavaScript modules, CSS, Node built-in test runner, existing canvas action model and i18n catalog.

## Global Constraints

- Preserve unrelated user changes in the main checkout and excluded untracked files.
- Keep the existing five-slot composition board and scrolling behavior unless the new editor requires a focused extension.
- Do not add a dependency or a new magical rule; spell reading continues through existing grammar and model code.
- Use ASCII source text and existing two-space formatting.
- Every production behavior is introduced after a failing test.

---

### Task 1: Add red tests for the normalized seal draft

**Files:**
- Modify: `tests/sigil-composition-layout.test.mjs`
- Test: `tests/sigil-composition-layout.test.mjs`

**Interfaces:**
- Consumes: existing `SIGIL_COMPOSITION_SLOTS` and `buildSigilCompositionPlacements`.
- Produces: required contracts for `createDefaultSigilComposition`, `extractSigilComposition`, `normalizeCompositionCircleSize`, and `buildSigilCompositionPlacements` with an explicit radius.

- [ ] **Step 1: Write the failing tests**

Add tests for these exact behaviors:

```js
test("un nouveau sceau utilise le centre de la toile et une taille bornée", () => {
  const draft = createDefaultSigilComposition({ width: 900, height: 600 });
  assert.deepEqual(draft.center, { x: 450, y: 300 });
  assert.equal(draft.mode, "new");
  assert.ok(draft.radius > 0);
  assert.equal(normalizeCompositionCircleSize(240, { min: 80, max: 400 }), 240);
  assert.equal(normalizeCompositionCircleSize(20, { min: 80, max: 400 }), 80);
  assert.equal(normalizeCompositionCircleSize(900, { min: 80, max: 400 }), 400);
});

test("un sceau existant regroupe uniquement ses actions geometriques", () => {
  const draft = extractSigilComposition({
    actions: [
      { type: "circle", cx: 300, cy: 300, radius: 120, closed: true },
      { type: "glyph", element: "Feu", kind: "sigil", x: 300, y: 300, size: 24 },
      { type: "glyph", element: "Viseur", kind: "sign", x: 300, y: 204, size: 18 },
      { type: "circle", cx: 700, cy: 300, radius: 100, closed: true },
      { type: "glyph", element: "Eau", kind: "sigil", x: 700, y: 300, size: 24 },
    ],
    anchorIndex: 0,
  });
  assert.equal(draft.mode, "existing");
  assert.equal(draft.radius, 120);
  assert.deepEqual(draft.sigils.map((item) => item.name), ["Feu"]);
  assert.deepEqual(draft.signs.map((item) => item.name), ["Viseur"]);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/sigil-composition-layout.test.mjs`

Expected: FAIL because the three new exports do not exist yet.

- [ ] **Step 3: Commit the red tests**

Run: `git add tests/sigil-composition-layout.test.mjs && git commit -m "test: define seal composition drafts"`

### Task 2: Implement the composition draft model

**Files:**
- Modify: `sigil-composition-layout.mjs`
- Test: `tests/sigil-composition-layout.test.mjs`

**Interfaces:**
- Consumes: flat action records with circle/ring/glyph/free fields.
- Produces: `createDefaultSigilComposition({ width, height })`, `extractSigilComposition({ actions, anchorIndex })`, `normalizeCompositionCircleSize(value, { min, max })`, and placement calculations that honor `draft.radius`.

- [ ] **Step 1: Implement the smallest passing model**

Implement normalized size bounds, default center/radius, circle anchor extraction, and legacy geometric membership. Preserve action indices so the UI can update existing actions. Classify glyphs at the anchor center as sigils and glyphs within the anchor circle as signs; leave unrelated-circle actions out.

- [ ] **Step 2: Run the focused tests**

Run: `node --test tests/sigil-composition-layout.test.mjs`

Expected: PASS with all layout and draft tests passing.

- [ ] **Step 3: Commit the model**

Run: `git add sigil-composition-layout.mjs tests/sigil-composition-layout.test.mjs && git commit -m "feat: model existing seal compositions"`

### Task 3: Add the UI contract and translations

**Files:**
- Modify: `index.html`
- Modify: `i18n.mjs`
- Modify: `styles.css`
- Modify: `tests/symbol-palette-ui.test.mjs`

**Interfaces:**
- Consumes: existing composition drawer and context menu.
- Produces: `compositionDraftMode`, `compositionCircleSizeInput`, `compositionCircleSizeValue`, `compositionCancelButton`, and translated right-click labels.

- [ ] **Step 1: Write failing UI assertions**

Assert that the composition panel contains a new/existing status, a numeric or range size control, a cancel control, and a context-menu item with `data-selection-action="composition"`. Assert that English and French translations exist for the new keys.

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `node --test tests/symbol-palette-ui.test.mjs`

Expected: FAIL because the new controls and menu item are absent.

- [ ] **Step 3: Add the minimal HTML, CSS, and catalog entries**

Add compact size controls to the composition panel, retain scrolling for the symbol trays and board, add the context-menu item hidden by default, and add English/French labels for new seal, selected seal, size, cancel, and edit actions.

- [ ] **Step 4: Run the UI test to verify it passes**

Run: `node --test tests/symbol-palette-ui.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the UI contract**

Run: `git add index.html styles.css i18n.mjs tests/symbol-palette-ui.test.mjs && git commit -m "feat: add seal composition controls"`

### Task 4: Open the correct draft from the tab or right-click menu

**Files:**
- Modify: `app.js`
- Modify: `tests/symbol-palette-ui.test.mjs`

**Interfaces:**
- Consumes: `createDefaultSigilComposition`, `extractSigilComposition`, existing selection state and `selectionContextMenu`.
- Produces: `openSigilCompositionEditor(anchorIndex = null)`, `selectedCompositionAnchorIndex`, conditional `composition` menu behavior, and draft reset on cancel.

- [ ] **Step 1: Write failing source assertions**

Assert that the app imports and calls both draft functions, tracks an anchor index, exposes an editor opener, and conditionally enables the composition menu action only when `isCompleteSeal` or a member action is found.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/symbol-palette-ui.test.mjs`

Expected: FAIL because the editor opener and conditional menu handling do not exist.

- [ ] **Step 3: Implement draft opening**

When the composition tab is selected without a valid seal anchor, create a default draft from `canvasSize()` and clear the staged slots. When opened from a selection, extract the selected circle and populate all detected slots without replacing them with defaults. Update the menu visibility whenever selection changes.

- [ ] **Step 4: Wire cancel and close behavior**

Cancel restores the prior draft state, closes the composition mode if it came from the context menu, and leaves `state.actions` unchanged. Opening the tab without selection remains available and does not mutate history.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/symbol-palette-ui.test.mjs tests/sigil-composition-layout.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the editor entry points**

Run: `git add app.js tests/symbol-palette-ui.test.mjs && git commit -m "feat: open composition for selected seals"`

### Task 5: Apply size and symbol edits as one transaction

**Files:**
- Modify: `app.js`
- Modify: `sigil-composition-layout.mjs`
- Test: `tests/sigil-composition-layout.test.mjs`

**Interfaces:**
- Consumes: normalized draft, size control, existing `recordHistory`, `createGlyphAction`, and the five-slot board.
- Produces: draft size updates, existing-action updates, new-circle creation, and one-step undo/redo behavior.

- [ ] **Step 1: Write failing model tests**

Add assertions that a draft radius changes placement distance, an existing action index is preserved during edits, and a new draft produces one circle plus the selected glyphs with the same center and configured radius.

- [ ] **Step 2: Run the model tests to verify they fail**

Run: `node --test tests/sigil-composition-layout.test.mjs`

Expected: FAIL because application still always resolves the last seal and ignores draft size.

- [ ] **Step 3: Implement draft size updates**

Read the size control, clamp it to the drawing limit, update `state.sigilCompositionDraft.radius`, and rerender the board without writing actions.

- [ ] **Step 4: Implement existing-seal application**

On apply, record history once, update the anchored circle/ring radius and each detected glyph's relative position, size, and rotation, then add only newly occupied slots. Do not touch actions belonging to another circle.

- [ ] **Step 5: Implement new-seal application**

On apply from a new draft, create one circle at the draft center and add the selected central sigil and signs using the configured radius. Select all created actions and refresh spell reading.

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/sigil-composition-layout.test.mjs tests/symbol-palette-ui.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit the application behavior**

Run: `git add app.js sigil-composition-layout.mjs tests/sigil-composition-layout.test.mjs tests/symbol-palette-ui.test.mjs && git commit -m "feat: create and resize composition seals"`

### Task 6: Document, smoke-test, and validate

**Files:**
- Modify: `tutoriel.html`
- Modify: `README.md`
- Modify: relevant translation/catalogue tests if copy changes require them

**Interfaces:**
- Consumes: final UI labels and behavior.
- Produces: user-facing instructions for creating a new seal, opening an existing seal from right-click, and resizing it.

- [ ] **Step 1: Add documentation assertions**

Assert that the tutorial mentions both entry paths and that the size control is translated.

- [ ] **Step 2: Update English and French documentation**

Explain that the tab creates a default draft without selection, while right-click edits a selected circle and preserves detected symbols.

- [ ] **Step 3: Run the complete validation suite**

Run:

```bash
node --check app.js
node --check sigil-composition-layout.mjs
git diff --check
node --test tests/sigil-composition-layout.test.mjs tests/symbol-palette-ui.test.mjs tests/i18n-runtime.test.mjs tests/tutorial-content.test.mjs
node --test $(git ls-files 'tests/**/*.mjs' 'tests/*.mjs' ':!:tests/browser/**')
```

Expected: all commands exit 0 and the complete versioned suite reports zero failures.

- [ ] **Step 4: Run the browser smoke test**

Start the project server on an available port, open the Atelier, enter Composition sigillaire with no selection, verify the default board and size control, draw/select a circle, open the right-click menu, verify the conditional composition action, open it, verify detected symbols, change size, cancel, reopen, apply, and verify the created or updated circle remains on the canvas.

- [ ] **Step 5: Commit documentation and final validation changes**

Run: `git add README.md tutoriel.html tests && git commit -m "docs: explain seal composition editing"`
