# Symbol Palette Drag And Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Ajouter une palette complete de sigils et signes transportables comme des blocs Scratch, puis permettre leur selection au clic droit et leur redimensionnement.

**Architecture:** Extraire les calculs sans DOM dans \`symbol-interactions.mjs\` afin de les tester avec \`node:test\`. Conserver l’orchestration DOM, Pointer Events, canevas et historique dans \`app.js\`, en reutilisant les actions \`glyph\` et le catalogue vectoriel existants.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Canvas 2D, Pointer Events, \`node:test\`, Three.js existant.

## Global Constraints

- Aucun framework, bundler, gestionnaire de paquets ou service distant.
- Les 47 dessins restent fournis par \`symbol-catalog.mjs\`.
- Le depot fonctionne a la souris, au stylet et au doigt.
- Seules les actions \`glyph\` sont selectionnables et redimensionnables.
- Taille bornee entre 12 et 120 unites, avec facteurs 0,9 et 1,1.
- Toute mutation terminee reste compatible avec \`Defaire\` et \`Refaire\`.
- Les textes visibles restent en francais et le style atelier/parchemin est preserve.

---

### Task 1: Calculs purs de glyphe et historique

**Files:**
- Create: \`symbol-interactions.mjs\`
- Create: \`tests/symbol-interactions.test.mjs\`

**Interfaces:**
- Produces: \`resizeGlyphSize(size, direction): number\`
- Produces: \`topmostGlyphIndexAtPoint(actions, point, padding?): number\`
- Produces: \`canDropGlyph(point, size, bounds): boolean\`
- Produces: \`cloneActions(actions): Action[]\`

- [ ] **Step 1: Ecrire les tests qui echouent**

\`\`\`js
import test from "node:test";
import assert from "node:assert/strict";
import {
  canDropGlyph,
  cloneActions,
  resizeGlyphSize,
  topmostGlyphIndexAtPoint,
} from "../symbol-interactions.mjs";

test("resizeGlyphSize applique le pas et les limites", () => {
  assert.equal(resizeGlyphSize(20, "grow"), 22);
  assert.equal(resizeGlyphSize(20, "shrink"), 18);
  assert.equal(resizeGlyphSize(119, "grow"), 120);
  assert.equal(resizeGlyphSize(12, "shrink"), 12);
});

test("topmostGlyphIndexAtPoint ignore les traits et choisit le glyphe superieur", () => {
  const actions = [
    { type: "glyph", x: 50, y: 50, size: 20 },
    { type: "circle", cx: 50, cy: 50, radius: 30 },
    { type: "glyph", x: 52, y: 50, size: 12 },
  ];
  assert.equal(topmostGlyphIndexAtPoint(actions, { x: 51, y: 50 }), 2);
  assert.equal(topmostGlyphIndexAtPoint(actions, { x: 200, y: 200 }), -1);
});

test("canDropGlyph exige que le glyphe entier reste dans les limites", () => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
  assert.equal(canDropGlyph({ x: 50, y: 50 }, 20, bounds), true);
  assert.equal(canDropGlyph({ x: 10, y: 50 }, 20, bounds), false);
});

test("cloneActions copie aussi les points de trace", () => {
  const source = [{ type: "free", points: [{ x: 1, y: 2 }] }];
  const clone = cloneActions(source);
  clone[0].points[0].x = 9;
  assert.equal(source[0].points[0].x, 1);
});
\`\`\`

- [ ] **Step 2: Executer les tests et confirmer l’echec**

Run: \`node --test tests/symbol-interactions.test.mjs\`
Expected: FAIL avec \`ERR_MODULE_NOT_FOUND\` pour \`symbol-interactions.mjs\`.

- [ ] **Step 3: Implementer le module minimal**

\`\`\`js
export const MIN_GLYPH_SIZE = 12;
export const MAX_GLYPH_SIZE = 120;

export function resizeGlyphSize(size, direction) {
  const factor = direction === "shrink" ? 0.9 : 1.1;
  return Math.max(MIN_GLYPH_SIZE, Math.min(MAX_GLYPH_SIZE, Math.round(size * factor * 10) / 10));
}

export function topmostGlyphIndexAtPoint(actions, point, padding = 10) {
  for (let index = actions.length - 1; index >= 0; index -= 1) {
    const action = actions[index];
    if (action.type === "glyph" && Math.hypot(point.x - action.x, point.y - action.y) <= action.size + padding) {
      return index;
    }
  }
  return -1;
}

export function canDropGlyph(point, size, bounds) {
  return point.x - size >= bounds.left &&
    point.x + size <= bounds.right &&
    point.y - size >= bounds.top &&
    point.y + size <= bounds.bottom;
}

export function cloneActions(actions) {
  return actions.map((action) => ({
    ...action,
    points: action.points?.map((point) => ({ ...point })),
  }));
}
\`\`\`

- [ ] **Step 4: Executer les tests et confirmer la reussite**

Run: \`node --test tests/symbol-interactions.test.mjs\`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

\`\`\`bash
git add symbol-interactions.mjs tests/symbol-interactions.test.mjs
git commit -m "add tested glyph interaction helpers"
\`\`\`

---

### Task 2: Contrat HTML et styles de la palette

**Files:**
- Create: \`tests/symbol-palette-ui.test.mjs\`
- Modify: \`index.html\`
- Modify: \`styles.css\`

**Interfaces:**
- Produces: elements \`#placementToggleButton\`, \`#placementDrawer\`, \`#placementList\`, \`#closePlacementButton\`, \`#shrinkSelectionButton\`, \`#growSelectionButton\`, \`#symbolDragGhost\`.
- Consumes: classes d’etat \`placement-open\`, \`is-dragging-symbol\`, \`is-valid-drop\`.

- [ ] **Step 1: Ecrire le test de contrat UI qui echoue**

\`\`\`js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("la page expose la palette et les outils de taille", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of [
    "placementToggleButton",
    "placementDrawer",
    "placementList",
    "closePlacementButton",
    "shrinkSelectionButton",
    "growSelectionButton",
    "symbolDragGhost",
  ]) {
    assert.match(html, new RegExp(\`id=["']\${id}["']\`));
  }
});

test("les etats de palette et de transport sont styles", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.simulator-page\.placement-open/);
  assert.match(css, /\.symbol-drag-ghost/);
  assert.match(css, /\.placement-card/);
});
\`\`\`

- [ ] **Step 2: Executer le test et confirmer l’echec**

Run: \`node --test tests/symbol-palette-ui.test.mjs\`
Expected: FAIL car \`placementToggleButton\` est absent.

- [ ] **Step 3: Ajouter le balisage minimal**

Dans la barre \`.floating-tools\`, ajouter les boutons \`shrinkSelectionButton\` et \`growSelectionButton\`, desactives par defaut. Apres \`symbolToggleButton\`, ajouter \`placementToggleButton\`. Ajouter un tiroir \`placementDrawer\` avec \`placementList\`, puis un element flottant \`symbolDragGhost\` avec \`aria-hidden="true"\`.

- [ ] **Step 4: Ajouter les styles cibles**

Etendre les selecteurs des ilots et tiroirs existants a \`.placement-island\` et \`.placement-drawer\`. Ajouter une vignette flottante en \`position: fixed\`, \`pointer-events: none\`, avec contour dore, ainsi que les cartes transportables et les etats de depot valide. Faire passer la barre mobile de 7 a 9 colonnes et garder des boutons d’au moins 40 px.

- [ ] **Step 5: Executer le test et confirmer la reussite**

Run: \`node --test tests/symbol-palette-ui.test.mjs\`
Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

\`\`\`bash
git add index.html styles.css tests/symbol-palette-ui.test.mjs
git commit -m "add symbol placement palette shell"
\`\`\`

---

### Task 3: Historique, selection et redimensionnement

**Files:**
- Modify: \`app.js\`
- Test: \`tests/symbol-interactions.test.mjs\`

**Interfaces:**
- Consumes: \`cloneActions\`, \`resizeGlyphSize\`, \`topmostGlyphIndexAtPoint\`.
- Produces: \`recordHistory()\`, \`restoreActions(snapshot)\`, \`selectGlyphAt(point)\`, \`resizeSelectedGlyph(direction)\`.

- [ ] **Step 1: Ajouter un test de limite pour une direction inconnue**

\`\`\`js
test("resizeGlyphSize refuse une direction inconnue", () => {
  assert.throws(() => resizeGlyphSize(20, "sideways"), /direction/);
});
\`\`\`

- [ ] **Step 2: Executer le test et confirmer l’echec**

Run: \`node --test tests/symbol-interactions.test.mjs\`
Expected: FAIL car \`sideways\` agrandit au lieu de lever une erreur.

- [ ] **Step 3: Durcir le helper puis integrer l’historique**

Faire lever \`TypeError("Unknown resize direction")\` hors de \`grow|shrink\`. Dans \`app.js\`, remplacer \`redoStack\` par \`undoStack\` et \`redoStack\` d’instantanes complets. Appeler \`recordHistory()\` avant \`commitAction\`, \`eraseAt\`, \`clearCanvas\` et toute taille effectivement modifiee. Restaurer les instantanes dans \`undo()\` et \`redo()\`.

- [ ] **Step 4: Integrer la selection et la taille**

Ajouter \`selectedGlyphIndex\` au state. Sur \`contextmenu\`, neutraliser le menu du canevas et appeler \`selectGlyphAt(pointFromEvent(event))\`. Dessiner un cadre dore autour du glyphe selectionne dans \`render()\`. Relier les boutons a \`resizeSelectedGlyph("shrink")\` et \`resizeSelectedGlyph("grow")\`, mettre a jour leurs etats desactives et retirer la selection lorsqu’elle n’existe plus.

- [ ] **Step 5: Ajouter l’appui long tactile**

Au \`pointerdown\` tactile, armer un temporisateur de 500 ms. L’annuler si le pointeur se deplace de plus de 8 unites ecran ou se releve. Lorsqu’il se declenche, annuler l’action courante et selectionner le glyphe sous le point.

- [ ] **Step 6: Executer les tests**

Run: \`node --test tests/symbol-interactions.test.mjs tests/symbol-palette-ui.test.mjs\`
Expected: 7 tests PASS.

- [ ] **Step 7: Commit**

\`\`\`bash
git add app.js symbol-interactions.mjs tests/symbol-interactions.test.mjs
git commit -m "add glyph selection and resize history"
\`\`\`

---

### Task 4: Transport façon Scratch et validation finale

**Files:**
- Modify: \`app.js\`
- Modify: \`index.html\`
- Modify: \`styles.css\`
- Modify: \`README.md\`

**Interfaces:**
- Consumes: \`canDropGlyph(point, size, bounds)\`.
- Produces: \`renderPlacementList()\`, \`startSymbolDrag(event, element)\`, \`moveSymbolDrag(event)\`, \`finishSymbolDrag(event)\`, \`cancelSymbolDrag()\`.

- [ ] **Step 1: Ecrire un test de contrat pour les evenements**

Ajouter au test UI des assertions recherchant \`pointerdown\`, \`pointermove\`, \`pointerup\` et \`contextmenu\` dans \`app.js\`, ainsi que le texte visible \`Symboles a placer\` dans \`index.html\`.

- [ ] **Step 2: Executer le test et confirmer l’echec**

Run: \`node --test tests/symbol-palette-ui.test.mjs\`
Expected: FAIL car le nouveau transport n’est pas encore cable.

- [ ] **Step 3: Construire la palette depuis le catalogue existant**

Factoriser les quatre groupes deja utilises par \`renderInkList()\`. Pour chaque symbole, creer une \`.placement-card\` qui affiche \`elementIconMarkup(element)\`, porte \`aria-label="Glisser <nom> vers le parchemin"\` et demarre le transport sur \`pointerdown\`. Sur \`Enter\`, selectionner l’element, activer l’outil \`glyph\` et fermer le tiroir pour permettre un placement clavier.

- [ ] **Step 4: Implementer le transport global**

Pendant le transport, capturer le pointeur, deplacer \`#symbolDragGhost\` avec \`clientX/clientY\`, calculer le point logique avec \`pointFromEvent\`, puis affecter a \`state.preview\` une action \`glyph\` seulement si \`canDropGlyph\` accepte ses limites. Sur \`pointerup\`, committer une copie de la previsualisation valide; sinon annoncer l’annulation. Toujours nettoyer capture, classes, vignette et previsualisation.

- [ ] **Step 5: Integrer les tiroirs et documenter**

Etendre \`setOpenDrawer\` au mode \`placement\`, annuler un transport lorsqu’un autre tiroir s’ouvre et conserver le panneau ouvert apres un depot valide. Ajouter au README les gestes de glisser-deposer, clic droit/appui long et boutons de taille.

- [ ] **Step 6: Executer toutes les verifications automatiques**

\`\`\`bash
node --test tests/*.test.mjs
node --check app.js
node --check symbol-interactions.mjs
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node scripts/validate-spell-matrix.mjs
\`\`\`

Expected: tous les tests PASS, aucune erreur de syntaxe, puis 47 dessins, 6 669 recettes uniques, 6 144 plans executables et 19 regles logiques validees.

- [ ] **Step 7: Faire les essais navigateur**

Tester a 1280x800 et 390x844: ouverture du nouveau tiroir, transport visible jusqu’au canevas, annulation hors zone, depot valide, selection du glyphe superieur au clic droit/appui long, limites de taille, defaire/refaire, canevas non vide et vue 3D non vide apres activation.

- [ ] **Step 8: Commit**

\`\`\`bash
git add app.js index.html styles.css README.md tests/symbol-palette-ui.test.mjs
git commit -m "implement scratch-style symbol placement"
\`\`\`
