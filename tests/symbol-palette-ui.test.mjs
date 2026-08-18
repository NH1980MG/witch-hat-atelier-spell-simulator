import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("la page expose un seul tiroir de symboles sans les anciens outils de taille", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of [
    "symbolToggleButton",
    "symbolDrawer",
    "symbolDrawerTabs",
    "directPaletteTab",
    "sigilCompositionTab",
    "inkList",
    "sigilCompositionPanel",
    "compositionSigilTray",
    "compositionSignTray",
    "compositionStage",
    "clearSigilCompositionButton",
    "applySigilCompositionButton",
    "closeSymbolsButton",
    "symbolDragGhost",
    "selectToolButton",
    "alignmentToggleButton",
    "toolbarCompactButton",
  ]) {
    assert.match(html, new RegExp("id=[\\\"']" + id + "[\\\"']"));
  }
  assert.doesNotMatch(html, /id=["'](?:shrinkSelectionButton|growSelectionButton)["']/);
  assert.doesNotMatch(html, /id=["']placement(?:ToggleButton|Drawer|List)["']/);
  assert.doesNotMatch(html, /id=["']closePlacementButton["']/);
  assert.doesNotMatch(html, /id=["']composition(?:Sigil|FirstSign|SecondSign)Select["']/);
  assert.match(html, /styles\.css\?v=20260818-grimoire-toggle-v1/);
  assert.match(html, /app\.js\?v=\d{8}-[^"']+/);
});

test("l'aide d'alignement et la barre reduite sont cablees dans l'atelier", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /alignmentAssist:\s*localStorage\.getItem\("whaAlignmentAssist"\) === "true"/);
  assert.match(app, /toolbarCompact:\s*localStorage\.getItem\("whaToolbarCompact"\) === "true"/);
  assert.match(app, /function toggleAlignmentAssist\(/);
  assert.match(app, /function toggleToolbarCompact\(/);
  assert.match(app, /whaToolbarDock/);
  assert.match(app, /function applyToolbarDockPosition\(/);
  assert.match(app, /const minTop = Math\.min\(TOOLBAR_TOP_INSET, maxTop\)/);
  assert.match(app, /function beginToolbarDrag\(/);
  assert.match(app, /setPointerCapture\(event\.pointerId\)/);
  assert.match(app, /function finishToolbarDrag\(/);
  assert.match(app, /new ResizeObserver\(applyToolbarDockPosition\)/);
  assert.match(app, /toolbarDockResizeObserver\?\.observe\(canvasWrap\)/);
  assert.match(app, /side:\s*centerX < bounds\.width \/ 2 \? "left" : "right"/);
  assert.match(app, /snapDeltaForSelection/);
  assert.match(app, /document\.body\.classList\.toggle\("alignment-assist-on"/);
  assert.match(app, /document\.body\.classList\.toggle\("toolbar-compact"/);
  assert.match(css, /\.simulator-page\.alignment-assist-on #magicCanvas/);
  assert.match(css, /\.simulator-page\.toolbar-compact \.floating-tools/);
  assert.match(css, /\.tool-button\.toolbar-keep/);
});

test("le tiroir unique et le transport sont styles", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const compositionPanelRule = css.match(/\.sigil-composition-panel\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(css, /\.simulator-page\.symbols-open/);
  assert.match(css, /\.symbol-drawer-tabs/);
  assert.match(css, /\.sigil-composition-panel/);
  assert.match(css, /\.ink-list\[hidden\]/);
  assert.match(compositionPanelRule, /overflow-y:\s*auto/);
  assert.match(compositionPanelRule, /min-height:\s*0/);
  assert.match(compositionPanelRule, /overscroll-behavior:\s*contain/);
  assert.match(compositionPanelRule, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(css, /\.composition-stage/);
  assert.match(css, /\.composition-slot/);
  assert.match(css, /\.composition-chip/);
  assert.match(css, /\.symbol-drag-ghost/);
  assert.match(css, /\.ink-button/);
  assert.match(css, /\.symbol-mark path,[\s\S]*stroke-width: 2\.2/);
  assert.match(css, /\.simulator-page\.symbols-open\.is-dragging-symbol \.symbol-drawer/);
  assert.doesNotMatch(css, /\.placement-(?:island|drawer|list|card)/);
});

test("l'interface utilise la police serif historique", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const bodyRule = css.match(/(?:^|\n\n)body\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(bodyRule, /font-family:\s*Georgia, "Times New Roman", serif/);
  assert.match(css, /\.header-link > span\[aria-hidden="true"\]/);
  assert.match(css, /\.symbol-island > span\[aria-hidden="true"\]/);
  assert.doesNotMatch(css, /\.header-link span\s*\{/);
  assert.doesNotMatch(css, /\.symbol-island span,/);
});

test("l'application cable la selection contextuelle et son historique", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /contextmenu/);
  assert.match(app, /selectedActionIndices/);
  assert.match(app, /undoStack/);
  assert.doesNotMatch(app, /function resizeSelectedGlyph/);
  assert.match(app, /function beginRightSelection\(/);
  assert.match(app, /function moveRightSelection\(/);
  assert.match(app, /function finishRightSelection\(/);
  const restoreBody = app.match(/function restoreActions\(snapshot\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(restoreBody, /selectedActionIndices = \[\]/);
  assert.match(app, /function onPointerCancel\(event\)/);
  assert.match(app, /addEventListener\("pointercancel", onPointerCancel\)/);
});

test("la palette cable le transport Scratch jusqu'au canevas", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  for (const functionName of [
    "renderInkList",
    "renderSigilCompositionPanel",
    "setSymbolDrawerMode",
    "selectCompositionSlot",
    "setCompositionSlotElement",
    "resolveSigilCompositionAnchor",
    "applySigilComposition",
    "startSymbolDrag",
    "moveSymbolDrag",
    "finishSymbolDrag",
    "cancelSymbolDrag",
  ]) {
    assert.match(app, new RegExp("function " + functionName + "\\("));
  }
  const renderBody = app.match(/function renderInkList\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(renderBody, /startSymbolDrag\(event, element\)/);
  assert.doesNotMatch(app, /function renderPlacementList\(/);
  assert.doesNotMatch(app, /setPlacementDrawer/);
  assert.match(app, /canDropGlyph/);
  assert.match(app, /selectedActionIndices[\s\S]*isCompleteSeal/);
  assert.match(app, /buildSigilCompositionPlacements/);
  assert.match(app, /state\.circleCenter/);
  assert.match(app, /state\.exporting = true/);
  assert.match(app, /state\.exporting = false/);
  assert.match(readme, /glisser.*Scratch/i);
});

test("la composition sigillaire possede ses libelles bilingues", async () => {
  const { translate } = await import("../i18n.mjs");

  for (const key of [
    "symbols.mode.directPalette",
    "symbols.mode.sigilComposition",
    "composition.sigil",
    "composition.firstSign",
    "composition.secondSign",
    "composition.sigilTray",
    "composition.signTray",
    "composition.apply",
    "composition.clear",
    "composition.emptySign",
    "composition.preview",
    "composition.slot.center",
    "composition.slot.north",
    "composition.slot.east",
    "composition.slot.south",
    "composition.slot.west",
    "status.sigilCompositionApplied",
  ]) {
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
});

test("la composition expose le mode du sceau, sa taille et l'action du clic droit", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of [
    "compositionDraftMode",
    "compositionCircleSizeInput",
    "compositionCircleSizeValue",
    "cancelSigilCompositionButton",
  ]) {
    assert.match(html, new RegExp("id=[\\\"']" + id + "[\\\"']"));
  }
  assert.match(html, /data-selection-action=["']composition["']/);
});

test("les libelles du nouveau sceau et de la taille existent en anglais et en francais", async () => {
  const { translate } = await import("../i18n.mjs");
  for (const key of [
    "composition.newSeal",
    "composition.selectedSeal",
    "composition.circleSize",
    "composition.cancel",
    "selectionMenu.composition",
  ]) {
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
});

test("l'editeur ouvre un brouillon ou le sceau selectionne depuis le clic droit", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /createDefaultSigilComposition/);
  assert.match(app, /extractSigilComposition/);
  assert.match(app, /function openSigilCompositionEditor\(/);
  assert.match(app, /selectedCompositionAnchorIndex/);
  assert.match(app, /function isCompositionCircleCandidate\(/);
  assert.match(app, /selectedIndices\.find\(\(index\) => isCompositionCircleCandidate/);
  assert.match(app, /data-selection-action.*composition|composition.*data-selection-action/);
  assert.match(app, /isCompleteSeal/);
});

test("le defilement tactile vertical ne demarre pas le transport d'un symbole", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const inkButtonRule = css.match(/\.ink-button\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(app, /classifySymbolDragGesture/);
  assert.match(app, /symbolDragIntent/);
  assert.match(app, /function resolveSymbolDragIntent\(/);
  assert.match(inkButtonRule, /touch-action:\s*pan-y/);
  assert.doesNotMatch(inkButtonRule, /touch-action:\s*none/);
});

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

test("le bouton glyphe de la barre d'outils arme, il ne selectionne pas seulement", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  // Deux boucles iterent toolButtons: celle d'updateToolButtons et celle qui
  // relie les clics. Seule la seconde nous interesse, d'ou l'ancrage sur
  // addEventListener.
  const loop =
    app.match(/for \(const button of toolButtons\) \{\s*\n\s*button\.addEventListener\("click"[\s\S]*?\n\}/)?.[0] ?? "";

  assert.notEqual(loop, "", "la boucle de clic des boutons d'outils doit rester reperable");
  // Revue Important #2: un setTool("glyph") nu laisse ghostOwner a null, donc
  // renderGhost n'affiche aucun apercu et la chaine Echap ne desarme pas -
  // l'outil est actif, invisible, sans autre sortie que l'effacement du
  // dessin. Le bouton doit passer par armSymbol, qui pose la propriete.
  assert.match(loop, /button\.dataset\.tool === "glyph"/);
  assert.match(loop, /armSymbol\(state\.element\)/);
});

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
  assert.match(css, /\.symbol-drawer-hint/);
});
