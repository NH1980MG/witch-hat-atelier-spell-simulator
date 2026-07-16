# Tutorial And Illustrated Library Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore an illustrated public library with 33 original local schematics and update the bilingual tutorial to explain the final 13,338-variant mechanics accurately.

**Architecture:** Define gallery metadata once in `library-circle-data.mjs`, generate static local SVG thumbnails through a deterministic Node script, and render those assets in the existing static library page. Tutorial and gallery copy use the existing i18n catalogs and restrictive CSP.

**Tech Stack:** Static HTML/CSS, plain ES modules, Node.js filesystem APIs for asset generation, Node.js built-in tests, existing site i18n.

## Global Constraints

- Historical PNG crops from manga/wiki panels must not return to the public branch.
- Every one of the 33 existing cards gets one original local SVG thumbnail.
- No remote images, inline remote scripts, data collection, or new framework.
- Category membership and spell names remain unchanged.
- Thumbnails are simulator reconstructions, not official reproductions.
- The tutorial is complete in English and French.
- The tutorial states that 13,338 covers one sigil, one unordered pair of signs, and one of two supports.
- Desktop and mobile layouts must contain no empty image boxes, clipped text, or horizontal overflow.

---

### Task 1: Deterministic Gallery Data And SVG Generation

**Files:**
- Create: `library-circle-data.mjs`
- Create: `scripts/generate-library-thumbnails.mjs`
- Create: `tests/library-assets.test.mjs`
- Create: `assets/library-schematics/*.svg` (33 generated files)

**Interfaces:**
- Produces: `LIBRARY_CIRCLES`, `LIBRARY_CATEGORIES`, and deterministic local files at `assets/library-schematics/<id>.svg`.
- Consumes: no browser APIs; SVG generation uses only Node.js built-ins.

- [ ] **Step 1: Write the failing asset inventory test**

Create `tests/library-assets.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
import { LIBRARY_CIRCLES } from "../library-circle-data.mjs";

test("the gallery keeps the 33 classified spells", () => {
  assert.equal(LIBRARY_CIRCLES.length, 33);
  assert.deepEqual(
    Object.fromEntries(["vision", "mixed", "niche", "ancient-forbidden", "ancient-non-forbidden"].map((category) => [category, LIBRARY_CIRCLES.filter((circle) => circle.category === category).length])),
    { vision: 3, mixed: 5, niche: 20, "ancient-forbidden": 3, "ancient-non-forbidden": 2 },
  );
});

test("every gallery entry has a local nonblank SVG", async () => {
  for (const circle of LIBRARY_CIRCLES) {
    const url = new URL(`../assets/library-schematics/${circle.id}.svg`, import.meta.url);
    assert.ok((await stat(url)).size > 250, circle.id);
    const svg = await readFile(url, "utf8");
    assert.match(svg, /^<svg[^>]+viewBox="0 0 240 240"/);
    assert.match(svg, /<title>/);
    assert.doesNotMatch(svg, /<image|https?:|data:/);
  }
});

test("every entry has bilingual accessible text and fidelity", () => {
  for (const circle of LIBRARY_CIRCLES) {
    assert.ok(circle.alt.en && circle.alt.fr, circle.id);
    assert.ok(["documented", "inferred", "experimental"].includes(circle.fidelity), circle.id);
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/library-assets.test.mjs`

Expected: FAIL because the data module and SVG assets do not exist.

- [ ] **Step 3: Define the exact 33-entry data catalog**

Create `library-circle-data.mjs`. Export five categories and these exact IDs/names:

```js
export const LIBRARY_CIRCLES = Object.freeze([
  ["gathering-shadows", "Gathering Shadows", "vision"],
  ["light-reducing-spell", "Light-Reducing Spell", "vision"],
  ["makeover-mask-spell", "Makeover Mask Spell", "vision"],
  ["beast-repellent", "Beast Repellent", "mixed"],
  ["cloak-spell", "Cloak Spell", "mixed"],
  ["floating-drops", "Floating Drops", "mixed"],
  ["warmth-retention-seal", "Warmth-Retention Seal", "mixed"],
  ["frozen-path", "Frozen Path", "mixed"],
  ["billow-cluster", "Billow Cluster", "niche"],
  ["cookpot-lid", "Cookpot Lid", "niche"],
  ["fish-guidance", "Fish Guidance", "niche"],
  ["floating-expansion", "Floating Expansion", "niche"],
  ["lockwax", "Lockwax", "niche"],
  ["mirror-spell", "Mirror Spell", "niche"],
  ["sand-bridge", "Sand Bridge", "niche"],
  ["tracking-spell", "Tracking Spell", "niche"],
  ["smokesculpting-seal", "Smokesculpting Seal", "niche"],
  ["windowway-spell", "Windowway Spell", "niche"],
  ["enchanted-doorknob-seal", "Enchanted Doorknob Seal", "niche"],
  ["smoke-cloud", "Smoke Cloud", "niche"],
  ["beldaruits-illusion-cloak", "Beldaruit's Illusion Cloak", "niche"],
  ["advanced-beastwarding", "Advanced Beastwarding", "niche"],
  ["amplification-scroll", "Amplification Scroll", "niche"],
  ["garment-glimpse-glasses", "Garment-Glimpse Glasses", "niche"],
  ["handheld-windowway", "Handheld Windowway", "niche"],
  ["owlcat-projection", "Owlcat Projection", "niche"],
  ["rain-guard", "Rain Guard", "niche"],
  ["pouch-guidance", "Pouch Guidance", "niche"],
  ["petrification", "Petrification", "ancient-forbidden"],
  ["scalewolf-curse", "Scalewolf Curse", "ancient-forbidden"],
  ["illusory-labyrinth", "Illusory Labyrinth", "ancient-forbidden"],
  ["twinned-bottles-spell", "Twinned Bottles' Spell", "ancient-non-forbidden"],
  ["ancient-light-beacon", "Ancient Light Beacon", "ancient-non-forbidden"],
].map(([id, name, category], index) => Object.freeze({
  id,
  name,
  category,
  fidelity: "experimental",
  alt: {
    en: `Original simulator schematic for ${name}`,
    fr: `Schema original du simulateur pour ${name}`,
  },
  seed: index + 1,
})));
```

All thumbnail badges remain `experimental` because the drawings themselves are
original simulator reconstructions, even when the named spell is documented.
Do not change IDs, names, or categories.

- [ ] **Step 4: Implement deterministic original SVG generation**

Create `scripts/generate-library-thumbnails.mjs`. Generate a parchment square, two or three concentric rings, one center sigil selected from a small original geometry vocabulary, and repeated modifier marks derived from `seed`. Use only `<path>`, `<circle>`, `<line>`, `<polyline>`, `<polygon>`, `<g>`, and `<title>`. Create `assets/library-schematics/` with `mkdir(..., { recursive: true })` before writing.

The generator must:

```js
for (const circle of LIBRARY_CIRCLES) {
  const svg = renderCircleSvg(circle);
  await writeFile(new URL(`../assets/library-schematics/${circle.id}.svg`, import.meta.url), svg, "utf8");
}
```

Use stroke `#7d1f1a`, background `#fffaf0`, `stroke-linecap="round"`, `stroke-linejoin="round"`, and `vector-effect="non-scaling-stroke"`. Derive rotations and radii mathematically from the stable seed so every output is reproducible. Do not read or compare historical reference PNG pixels while drawing.

- [ ] **Step 5: Generate assets and run tests**

Run:

```bash
node scripts/generate-library-thumbnails.mjs
node --test tests/library-assets.test.mjs
```

Expected: 33 SVG files generated and 3 tests PASS.

- [ ] **Step 6: Commit gallery data and assets**

```bash
git add library-circle-data.mjs scripts/generate-library-thumbnails.mjs tests/library-assets.test.mjs assets/library-schematics
git commit -m "feat: add original circle schematics"
```

### Task 2: Restore Illustrated Library Cards

**Files:**
- Modify: `bibliotheque.html`
- Modify: `styles.css`
- Modify: `i18n.mjs`
- Modify: `tests/i18n-html.test.mjs`
- Modify: `tests/library-assets.test.mjs`

**Interfaces:**
- Consumes: generated SVG paths and existing card order.
- Produces: accessible illustrated cards with bilingual copy and fidelity badges.

- [ ] **Step 1: Add failing HTML assertions**

Extend `tests/library-assets.test.mjs` to read `bibliotheque.html`, require exactly 33 `<img>` elements under `.circle-card`, require every `src` to begin `assets/library-schematics/`, and reject `assets/library-circles`, remote URLs, `data:` images, and empty alt text.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/library-assets.test.mjs tests/i18n-html.test.mjs`

Expected: FAIL because current cards have no images.

- [ ] **Step 3: Add the original images and fidelity badges**

For each existing article, add the matching generated image before the title:

```html
<article class="circle-card">
  <img src="assets/library-schematics/gathering-shadows.svg" data-i18n-alt="library.circle.gatheringShadows.alt" alt="Original simulator schematic for Gathering Shadows">
  <span>Gathering Shadows</span>
  <small data-i18n="library.category.vision">Vision</small>
  <em class="fidelity-badge fidelity-inferred" data-i18n="fidelity.inferred">Inferred reconstruction</em>
</article>
```

Apply the matching path, alt key, category key, and fidelity class to all 33 cards. Update the introductory copy to state that the images are original simulator reconstructions and retain source links as research citations only.

Extend `site-i18n.mjs` to translate `[data-i18n-alt]` into the `alt` attribute, matching the existing title and aria-label loops.

- [ ] **Step 4: Style a stable responsive card grid**

Keep cards at no more than 8 px radius. Give images a fixed square aspect ratio, `object-fit: contain`, and protected internal padding. Use a small non-pill fidelity line or corner label that wraps without covering the image. At 390 px width, cards must remain at least 140 px wide or fall to one column; names and badges must wrap instead of clipping.

- [ ] **Step 5: Run HTML, asset, i18n, and syntax tests**

Run:

```bash
node --test tests/library-assets.test.mjs tests/i18n.test.mjs tests/i18n-html.test.mjs
node --check site-i18n.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the illustrated page**

```bash
git add bibliotheque.html styles.css i18n.mjs site-i18n.mjs tests/i18n-html.test.mjs tests/library-assets.test.mjs
git commit -m "feat: restore illustrated circle library"
```

### Task 3: Rewrite The Bilingual Tutorial

**Files:**
- Modify: `tutoriel.html`
- Modify: `i18n.mjs`
- Create: `tests/tutorial-content.test.mjs`

**Interfaces:**
- Consumes: final terminology and fidelity levels from the core plan.
- Produces: bilingual tutorial sections that describe the actual matrix and mechanics.

- [ ] **Step 1: Write the failing tutorial-content test**

Create `tests/tutorial-content.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { translate } from "../i18n.mjs";

const html = await readFile(new URL("../tutoriel.html", import.meta.url), "utf8");

test("tutorial covers the final matrix and fidelity model", () => {
  for (const key of [
    "tutorial.matrix.title",
    "tutorial.matrix.formula",
    "tutorial.fidelity.title",
    "tutorial.balance.title",
    "tutorial.supportScope.title",
    "tutorial.activationWarnings.title",
  ]) {
    assert.match(html, new RegExp(`data-i18n="${key.replaceAll(".", "\\.")}"`));
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
  assert.equal(translate("en", "tutorial.matrix.total"), "13,338 tested variants");
  assert.equal(translate("fr", "tutorial.matrix.total"), "13 338 variantes testees");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/tutorial-content.test.mjs`

Expected: FAIL because the new sections and keys are absent.

- [ ] **Step 3: Add the matrix and fidelity sections**

Add compact tutorial sections after the initial sigil/sign/ring explanation. Include:

- `38 * 39 / 2 = 741` unordered sign pairs with repetition;
- `9 * 741 = 6,669` recipes per support;
- `6,669 * 2 = 13,338` tested variants;
- explicit exclusions: three-sign, multi-sigil, linked, nested, and arbitrary geometry variants;
- documented/inferred/experimental definitions;
- balance and deliberate imbalance;
- tilt adding spin and reducing reach;
- disconnected signs being ignored;
- documented inversion only;
- no-support versus shoe-support behavior;
- the documented Sylph-shoe fixture and experimental status of arbitrary shoe recipes;
- global 5 cm to 5 m limits and 35 cm shoe limit;
- reading fidelity warnings before activation.

Use flat bullet lists for multi-part explanations. Do not add feature-description marketing copy or external images.

- [ ] **Step 4: Add exact bilingual keys**

Add matching English and French entries in `i18n.mjs`. Keep the English catalog first and preserve identical key sets. Use the exact totals `13,338` in English and `13 338` in French.

- [ ] **Step 5: Run tutorial and i18n tests**

Run:

```bash
node --test tests/tutorial-content.test.mjs tests/i18n.test.mjs tests/i18n-html.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the updated tutorial**

```bash
git add tutoriel.html i18n.mjs tests/tutorial-content.test.mjs
git commit -m "docs: teach support-aware spell mechanics"
```

### Task 4: Responsive Browser QA And Release Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/qa-plan.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/progress-tracker.md`
- Create: `docs/qa/2026-07-16-library-tutorial-results.md`

**Interfaces:**
- Consumes: finished library assets and tutorial.
- Produces: verified local pages and updated public-release instructions.

- [ ] **Step 1: Start the local server and verify asset responses**

Run:

```bash
scripts/start-local-server.sh
curl -I --max-time 5 http://127.0.0.1:8000/bibliotheque.html
curl -I --max-time 5 http://127.0.0.1:8000/assets/library-schematics/gathering-shadows.svg
```

Expected: both responses return HTTP 200.

- [ ] **Step 2: Verify desktop and mobile layouts**

Use the in-app browser at `1280 x 720` and `390 x 844`. On the library page, confirm all 33 images load, every category is visible, cards have no empty space caused by missing media, and no text clips. Switch English/French and confirm alt text, descriptions, category labels, and fidelity labels update.

On the tutorial page, confirm the matrix formula, fidelity section, support scope, and warnings render in both languages without horizontal overflow. Click the page title and confirm it returns to `index.html`.

- [ ] **Step 3: Record QA results**

Create `docs/qa/2026-07-16-library-tutorial-results.md` with page, viewport, locale, loaded-image count, broken-image count, horizontal overflow, clipped text, console errors, and screenshot path.

- [ ] **Step 4: Run the full static verification**

Run:

```bash
node --test tests/*.test.mjs
node --check app.js
node --check i18n.mjs
node --check site-i18n.mjs
node --check library-circle-data.mjs
node --check scripts/generate-library-thumbnails.mjs
node scripts/validate-spell-matrix.mjs
git diff --check
```

Expected: all checks PASS; validator reports 13,338; no diff whitespace errors.

- [ ] **Step 5: Update public documentation and commit**

Update the README, QA plan, release checklist, and tracker to describe original schematic assets, the exact matrix, and the public asset rule. Commit:

```bash
git add README.md docs/qa-plan.md docs/release-checklist.md docs/progress-tracker.md docs/qa/2026-07-16-library-tutorial-results.md
git commit -m "docs: verify tutorial and gallery restoration"
```
