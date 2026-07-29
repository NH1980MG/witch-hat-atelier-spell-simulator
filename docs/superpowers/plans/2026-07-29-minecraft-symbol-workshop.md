# Minecraft Symbol Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the complete web symbol catalogue, persistent placed glyphs, and right-button selection transforms to the native Minecraft notebook.

**Architecture:** The common notebook model stores bounded `PlacedSymbol` records and validates identifiers against a generated catalogue. A deterministic Node export script converts `symbol-catalog.mjs` into Minecraft metadata and original transparent textures. The client session owns pure placement and transform operations; `MagicNotebookScreen` only maps pointer input and renders the resulting state.

**Tech Stack:** Minecraft Java 1.21.1, Fabric Loader 0.19.3, Fabric API 0.116.14+1.21.1, Java 21, JUnit 5, Node.js, Sharp.

## Global Constraints

- Keep `witch_hat_magic` independent from `witchhat_ai_builder`.
- Keep all geometry normalized and server validated.
- Support at most 128 placed symbols per page.
- Use the existing 64-entry web catalogue as the only symbol source.
- Keep English and French labels.
- Do not publish the Minecraft branch or JARs.

---

### Task 1: Persistent Placed Symbols

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/PlacedSymbol.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookPage.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookLimits.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookDataTest.java`

**Interfaces:**
- Produces: `PlacedSymbol(String symbolId, NormalizedPoint center, float size, float rotationDegrees)`.
- Produces: `NotebookPage.symbols()` with codec default `[]`.

- [ ] Write failing tests for symbol round-trip, immutable lists, bounds, count, size, rotation, and invalid identifiers.
- [ ] Run `./gradlew :witch-hat-magic:test --tests '*NotebookDataTest'` and confirm the new tests fail.
- [ ] Implement codecs, stream codecs, limits, and backward-compatible empty symbol lists.
- [ ] Re-run the focused tests and commit the green model.

### Task 2: Generated Catalogue Assets

**Files:**
- Create: `scripts/export-minecraft-symbols.mjs`
- Create: `minecraft-mod/witch-hat-magic/src/main/generated/.../MagicSymbolCatalog.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/generated/resources/assets/witch_hat_magic/textures/symbol/*.png`
- Modify: `minecraft-mod/witch-hat-magic/build.gradle`
- Test: `tests/minecraft-symbol-export.test.mjs`

**Interfaces:**
- Consumes: `SYMBOL_PATHS` and public catalogue entries from `symbol-catalog.mjs`.
- Produces: stable Java entries with `id`, source name, category, English label, and French label.
- Produces: one 48x48 transparent texture for every catalogue entry.

- [ ] Write a failing Node test requiring one-to-one IDs, metadata, paths, and texture destinations for all 64 symbols.
- [ ] Run the focused Node test and confirm the exporter is missing.
- [ ] Implement deterministic slugging, Java generation, and SVG-to-PNG generation with Sharp.
- [ ] Run the exporter, Node test, Java compilation, and commit generated assets with their source script.

### Task 3: Pure Editor Placement and Selection

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/SymbolSelection.java`
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSession.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSessionTest.java`

**Interfaces:**
- Produces: `placeSymbol`, `selectSymbolAt`, `moveSelection`, `resizeSelection`, `deleteSelection`, and `selectedSymbolIndices`.
- Consumes: normalized pointer coordinates and `PlacedSymbol` records.

- [ ] Write failing tests for placement, topmost right-click selection, empty-click clearing, movement clamping, proportional corner resizing, deletion, and undo.
- [ ] Run the focused client-session tests and confirm the new tests fail.
- [ ] Implement bounded immutable operations as single history commits.
- [ ] Re-run tests and commit the green editor domain.

### Task 4: Native Workshop Panel

**Files:**
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/MagicNotebookScreen.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/en_us.json`
- Modify: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/fr_fr.json`

**Interfaces:**
- Consumes: generated catalogue textures and editor-session operations.
- Produces: scrollable catalogue, click-to-place workflow, right-button selection, move drag, four resize handles, delete key, and selection rendering.

- [ ] Add the catalogue panel and texture rendering without changing simple drawing mode.
- [ ] Route left placement and right selection gestures through `NotebookEditorSession`.
- [ ] Render selected bounds and corner handles; localize visible labels and tooltips.
- [ ] Run all 24+ magic tests, all 22 AI Builder tests, clean builds, dedicated-server smoke, and client startup smoke.
- [ ] Commit locally and update the progress tracker without pushing.
