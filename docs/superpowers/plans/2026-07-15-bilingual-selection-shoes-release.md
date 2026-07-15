# Bilingual Selection And Shoes Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete English/French interface with English by default, an explicit symbol Selection tool, recognizable procedural shoes, and an Earth support that stays connected to the desk.

**Architecture:** Add a DOM-free translation catalog and a small shared page controller, keeping all spell and symbol IDs canonical. Extend the existing pure interaction module for selection movement and add a pure support-geometry module for grounded Earth coordinates; `app.js` remains the integration and Three.js rendering layer.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node.js built-in test runner, Three.js 0.165.0 vendored locally, GitHub Pages.

## Global Constraints

- English is the initial locale when no saved preference exists.
- `EN | FR` is available on all four pages and the choice persists in `localStorage` under `whaLocale`.
- Translation must not change canonical sigil, sign, support, or effect IDs.
- Selection applies only to placed `glyph` actions.
- Two-pointer panning retains priority over symbol manipulation.
- The Earth mound base stays at `THREE_TABLE_SURFACE_Y` for the full animation.
- Shoes and Earth remain procedural Three.js geometry with no downloaded model or copied reference asset.
- No package manager, framework, remote CDN, private screenshot, or research file is added to the public release.

---

### Task 1: Translation Core

**Files:**
- Create: `i18n.mjs`
- Create: `tests/i18n.test.mjs`

**Interfaces:**
- Produces: `DEFAULT_LOCALE`, `SUPPORTED_LOCALES`, `catalogs`, `resolveLocale(value)`, `translate(locale, key, params)`, `catalogKeys(locale)`.

- [ ] **Step 1: Write failing locale and catalog tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  catalogKeys,
  resolveLocale,
  translate,
} from "../i18n.mjs";

test("English is the default and invalid locales fall back", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(resolveLocale(null), "en");
  assert.equal(resolveLocale("fr"), "fr");
  assert.equal(resolveLocale("de"), "en");
});

test("English and French expose identical keys", () => {
  assert.deepEqual(catalogKeys("en"), catalogKeys("fr"));
});

test("translation interpolates parameters", () => {
  assert.equal(translate("en", "status.symbolPrepared", { name: "Water" }), "Water symbol ready.");
  assert.equal(translate("fr", "status.symbolPrepared", { name: "Eau" }), "Symbole Eau prepare.");
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `node --test tests/i18n.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `i18n.mjs`.

- [ ] **Step 3: Implement the translation API and complete parallel catalogs**

```js
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.freeze(["en", "fr"]);

export const catalogs = Object.freeze({
  en: Object.freeze({
    "language.label": "Language",
    "status.symbolPrepared": "{name} symbol ready.",
  }),
  fr: Object.freeze({
    "language.label": "Langue",
    "status.symbolPrepared": "Symbole {name} prepare.",
  }),
});

export function resolveLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function translate(locale, key, params = {}) {
  const message = catalogs[resolveLocale(locale)][key] ?? catalogs.en[key] ?? key;
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(params[name] ?? ""));
}

export function catalogKeys(locale) {
  return Object.keys(catalogs[resolveLocale(locale)]).sort();
}
```

Expand both catalogs together for shared navigation, all four pages, tools,
settings, support text, spell states, status messages, 47 symbols, and dynamic
reading labels. Keep the two key sets identical.

- [ ] **Step 4: Run the translation tests**

Run: `node --test tests/i18n.test.mjs`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the translation core**

```bash
git add i18n.mjs tests/i18n.test.mjs
git commit -m "add bilingual translation catalog"
```

---

### Task 2: Shared Language Control And Static Pages

**Files:**
- Create: `site-i18n.mjs`
- Create: `tests/i18n-html.test.mjs`
- Modify: `index.html`
- Modify: `bibliotheque.html`
- Modify: `tutoriel.html`
- Modify: `parametres.html`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `resolveLocale` and `translate` from `i18n.mjs`.
- Produces: `getLocale()`, `setLocale(locale)`, `t(key, params)`, `applyDocumentTranslations(root)`, and `wha:localechange`.

- [ ] **Step 1: Write failing HTML coverage tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { catalogs } from "../i18n.mjs";

const pages = ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"];

test("every page exposes the bilingual control", async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /class="language-switcher"/);
    assert.match(html, /data-locale="en"/);
    assert.match(html, /data-locale="fr"/);
    assert.match(html, /site-i18n\.mjs/);
  }
});

test("all static translation attributes exist in both catalogs", async () => {
  const keys = new Set(Object.keys(catalogs.en));
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    for (const match of html.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)) {
      assert.ok(keys.has(match[1]), `${page}: missing ${match[1]}`);
    }
  }
});
```

- [ ] **Step 2: Run and verify the control test fails**

Run: `node --test tests/i18n-html.test.mjs`

Expected: FAIL because `.language-switcher` is absent.

- [ ] **Step 3: Implement the shared controller**

```js
import { DEFAULT_LOCALE, resolveLocale, translate } from "./i18n.mjs";

let currentLocale = DEFAULT_LOCALE;
try {
  currentLocale = resolveLocale(localStorage.getItem("whaLocale"));
} catch {}

export const getLocale = () => currentLocale;
export const t = (key, params) => translate(currentLocale, key, params);

export function applyDocumentTranslations(root = document) {
  document.documentElement.lang = currentLocale;
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const node of root.querySelectorAll("[data-i18n-aria-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  }
}
```

Add `setLocale` persistence, button state, page-title translation, initial
application, and the `wha:localechange` event.

- [ ] **Step 4: Add the same semantic segmented control to every header**

```html
<div class="language-switcher" role="group" data-i18n-aria-label="language.label">
  <button type="button" data-locale="en" aria-pressed="true">EN</button>
  <button type="button" data-locale="fr" aria-pressed="false">FR</button>
</div>
```

Change static English fallback copy and mark every translated text, tooltip,
and accessibility label with a catalog key. Load `site-i18n.mjs` on all pages.

- [ ] **Step 5: Style a compact responsive segmented control**

Use 44-pixel minimum touch targets, fixed `EN`/`FR` widths, existing ink/gold
tokens, visible focus, and one-unit wrapping in `.header-nav`.

- [ ] **Step 6: Run static translation tests**

Run: `node --test tests/i18n.test.mjs tests/i18n-html.test.mjs`

Expected: PASS with identical catalogs and no missing HTML key.

- [ ] **Step 7: Commit the shared bilingual pages**

```bash
git add site-i18n.mjs index.html bibliotheque.html tutoriel.html parametres.html styles.css tests/i18n-html.test.mjs i18n.mjs
git commit -m "add language switcher to every page"
```

---

### Task 3: Dynamic Simulator Translation

**Files:**
- Modify: `app.js`
- Modify: `i18n.mjs`
- Create: `tests/i18n-runtime.test.mjs`

**Interfaces:**
- Consumes: `getLocale`, `t`, and `wha:localechange` from `site-i18n.mjs`.
- Produces: localized symbol/support render helpers and locale-safe status output.

- [ ] **Step 1: Write failing runtime-key tests**

Test that `app.js` imports `site-i18n.mjs`, contains no direct French calls to
`setStatus`, and every `t("...")` key exists in both catalogs.

```js
assert.match(app, /from "\.\/site-i18n\.mjs"/);
assert.doesNotMatch(app, /setStatus\("[^"\n]*(Aucun|Symbole|Trace|Support|Activer)/);
```

- [ ] **Step 2: Run and verify the runtime test fails**

Run: `node --test tests/i18n-runtime.test.mjs`

Expected: FAIL because `app.js` still contains direct French messages.

- [ ] **Step 3: Add canonical translation keys to metadata**

Keep `element.name` unchanged for grammar and recognition. Add `i18nKey` to
each element and support, and render localized names through:

```js
function elementDisplayName(element) {
  return t(`${element.i18nKey}.name`);
}
```

- [ ] **Step 4: Replace generated interface copy with message keys**

Convert tool labels, drawer groups, confidence labels, support descriptions,
reading lists, size warnings, selection text, activation errors, state values,
and keyboard status output to `t(key, params)`.

- [ ] **Step 5: Rerender dynamic UI on language changes**

```js
window.addEventListener("wha:localechange", () => {
  renderInkList();
  renderPlacementList();
  renderSupportList();
  updateUsedList();
  updateSpellState();
  updateToolButtons();
});
```

Preserve the action list, selected glyph, active support, current drawing, and
active 3D spell.

- [ ] **Step 6: Run translation and existing tests**

Run: `node --test tests/i18n*.test.mjs tests/symbol-interactions.test.mjs tests/symbol-palette-ui.test.mjs`

Expected: PASS with no missing catalog keys.

- [ ] **Step 7: Commit runtime translation**

```bash
git add app.js i18n.mjs tests/i18n-runtime.test.mjs
git commit -m "translate simulator runtime"
```

---

### Task 4: Explicit Selection Tool

**Files:**
- Modify: `symbol-interactions.mjs`
- Modify: `tests/symbol-interactions.test.mjs`
- Modify: `tests/symbol-palette-ui.test.mjs`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `i18n.mjs`

**Interfaces:**
- Produces: `clampGlyphCenter(point, size, bounds)` and selection-drag state `{ index, origin, startPoint, moved }`.

- [ ] **Step 1: Add failing movement-bound tests**

```js
test("clampGlyphCenter keeps the complete glyph inside bounds", () => {
  const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
  assert.deepEqual(clampGlyphCenter({ x: -5, y: 110 }, 20, bounds), { x: 20, y: 80 });
});
```

- [ ] **Step 2: Run and verify the missing export failure**

Run: `node --test tests/symbol-interactions.test.mjs`

Expected: FAIL because `clampGlyphCenter` is not exported.

- [ ] **Step 3: Implement the pure clamp helper**

```js
export function clampGlyphCenter(point, size, bounds) {
  return {
    x: Math.max(bounds.left + size, Math.min(bounds.right - size, point.x)),
    y: Math.max(bounds.top + size, Math.min(bounds.bottom - size, point.y)),
  };
}
```

- [ ] **Step 4: Add the Selection button as the first toolbar tool**

Use `data-tool="select"`, a cursor-arrow symbol, translated tooltip, and the
same fixed dimensions as existing tool buttons. Keep `data-tool="free"`
initially active.

- [ ] **Step 5: Implement select, move, cancel, and delete behavior**

On selection pointer-down, record the original actions once. On movement,
clamp the selected glyph. On pointer-up, push exactly one undo snapshot if the
position changed. On pointer-cancel, restore the original position. Make empty
canvas clear selection and let two-pointer pan supersede the drag.

Handle `Delete` and `Backspace` only when the event target is not an input,
textarea, select, or editable element.

- [ ] **Step 6: Verify render/export separation**

Keep the selection indicator in the edit `render()` path behind
`!state.exporting`. Do not add it to `buildThreeSpell()`.

- [ ] **Step 7: Run selection tests**

Run: `node --test tests/symbol-interactions.test.mjs tests/symbol-palette-ui.test.mjs`

Expected: PASS, including toolbar order, move bounds, keyboard deletion, and
export exclusion assertions.

- [ ] **Step 8: Commit the Selection tool**

```bash
git add symbol-interactions.mjs tests/symbol-interactions.test.mjs tests/symbol-palette-ui.test.mjs index.html styles.css app.js i18n.mjs
git commit -m "add explicit symbol selection tool"
```

---

### Task 5: Grounded Earth Geometry And Recognizable Shoes

**Files:**
- Create: `support-geometry.mjs`
- Create: `tests/support-geometry.test.mjs`
- Modify: `app.js`
- Modify: `docs/spell-effect-catalog.md`

**Interfaces:**
- Produces: `earthMoundPose(progress, options)` returning `{ baseY, height, topY, shoeGroupY }`.

- [ ] **Step 1: Write failing grounded-pose tests**

```js
test("Earth mound stays on the desk while it grows", () => {
  for (const progress of [0, 0.5, 1]) {
    const pose = earthMoundPose(progress, {
      tableY: 0.024,
      minHeight: 0.18,
      maxHeight: 0.62,
      shoeSoleBottomY: 0.662,
      clearance: 0.008,
    });
    assert.equal(pose.baseY, 0.024);
    assert.equal(pose.topY, pose.baseY + pose.height);
    assert.equal(pose.shoeGroupY + 0.662, pose.topY + 0.008);
  }
});
```

- [ ] **Step 2: Run and verify the missing-module failure**

Run: `node --test tests/support-geometry.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement clamped grounded geometry**

```js
export function earthMoundPose(progress, options) {
  const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const height = options.minHeight + (options.maxHeight - options.minHeight) * value;
  const baseY = options.tableY;
  const topY = baseY + height;
  return {
    baseY,
    height,
    topY,
    shoeGroupY: topY + options.clearance - options.shoeSoleBottomY,
  };
}
```

- [ ] **Step 4: Replace shoe primitives with a layered procedural model**

Build a shaped outsole with `THREE.Shape` and `ExtrudeGeometry`, then add toe,
sloped instep, heel, ankle opening, mirrored side panels, piping, tread bars,
seams, laces, paper patches, and underside runes. Tag relevant meshes in
`userData` for browser geometry checks.

- [ ] **Step 5: Rebuild the Earth support as a desk-connected mound**

Use one tapered central mound plus irregular overlapping rock lobes. Every
frame reads `earthMoundPose`; set each mound component from `baseY` upward and
set `supportProp.position.y = shoeGroupY`. Never add an independent Earth lift
offset to the shoe group.

- [ ] **Step 6: Improve support camera framing**

Frame the complete pair and the desk contact point from below and in front,
without clipping cuffs or hiding paper patches.

- [ ] **Step 7: Run geometry and spell tests**

Run: `node --test tests/support-geometry.test.mjs tests/symbol-interactions.test.mjs && node scripts/validate-spell-matrix.mjs`

Expected: PASS; 6,669 unique spell recipes remain valid.

- [ ] **Step 8: Commit the support correction**

```bash
git add support-geometry.mjs tests/support-geometry.test.mjs app.js docs/spell-effect-catalog.md
git commit -m "ground earth shoe support"
```

---

### Task 6: Full Verification And GitHub Pages Release

**Files:**
- Modify: `README.md`
- Modify: `docs/progress-tracker.md`
- Modify: `docs/release-checklist.md`
- Public repository: copy only deployable root files, tests, scripts required
  for validation, and vendored Three.js license/code.

**Interfaces:**
- Consumes: all completed tasks.
- Produces: updated private development branch and public GitHub Pages release.

- [ ] **Step 1: Run the complete automated suite**

```bash
node --check app.js
node --check i18n.mjs
node --check site-i18n.mjs
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node --check symbol-interactions.mjs
node --check support-geometry.mjs
node --test tests/*.test.mjs
node scripts/validate-spell-matrix.mjs
```

Expected: all tests pass and the matrix reports status `ok`, 47 drawings, and
6,669 unique recipes.

- [ ] **Step 2: Verify locally in the in-app browser**

At desktop and mobile widths:

- confirm English is shown with empty `whaLocale`;
- switch to French and navigate through all four pages;
- reload and confirm French persists;
- switch back to English;
- use Selection to select, move, resize, delete, undo, and redo a sign;
- activate Earth with the shoe support;
- confirm the 3D canvas is nonblank, the pair reads as shoes, both paper patches
  are under the soles, and the mound visibly touches the desk;
- check that no visible text overlaps or leaves its container.

- [ ] **Step 3: Update release documentation and commit**

```bash
git add README.md docs/progress-tracker.md docs/release-checklist.md
git commit -m "document bilingual editor release"
```

- [ ] **Step 4: Push and merge the private development PR**

Push the feature branch, open a GitHub pull request against private `main`,
confirm the intended file list, and merge only after checks are green.

- [ ] **Step 5: Publish the history-clean public repository**

Copy the verified deployable files into a clean public checkout, inspect the
diff for private assets or research paths, commit, and push public `main`.

- [ ] **Step 6: Verify GitHub Pages**

Open `https://nh1980mg.github.io/witch-hat-atelier-simulator/`, repeat the
language, Selection, and Earth-shoe smoke tests, and retain the public page as
the final deliverable tab.
