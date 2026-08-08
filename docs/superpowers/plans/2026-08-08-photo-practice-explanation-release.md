# Photo, Practice, and Explanation Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a branded GitHub Pages release with correctly framed photo imports, editable recognition results, reliable circle recreation, improved Practice scoring, and a bilingual explanation page.

**Architecture:** Keep the dependency-free static application and extract only pure recognition and placement helpers from `app.js`. Photo analysis groups nearby connected strokes before catalogue matching and returns explicit accepted, ambiguous, and unreadable regions. Practice reuses one-to-one shape matching while the UI, translations, and navigation remain in the existing page architecture.

**Tech Stack:** HTML, CSS, browser JavaScript modules, Canvas 2D, Node.js built-in test runner, GitHub Pages.

## Global Constraints

- GitHub remains the canonical simulator source and GitHub Pages remains its host.
- Do not add a framework, package manager, server dependency, or remote recognition API.
- Preserve English and French UI support and the established serif visual language.
- The emblem must be an original vector interpretation, not a pixel trace.
- Never stage or commit `minecraft-mod/`.
- Low-confidence photo regions must not be silently converted into symbols.
- Existing drawing, selection, guide, library, and 3D behavior must remain functional.

---

### Task 1: Original Brand Asset And Navigation

**Files:**
- Create: `assets/brand/atelier-mark.svg`
- Create: `assets/brand/atelier-mark-180.png`
- Create: `assets/brand/atelier-mark-512.png`
- Modify: `index.html`
- Modify: `bibliotheque.html`
- Modify: `tutoriel.html`
- Modify: `parametres.html`
- Modify: `styles.css`
- Test: `tests/brand-assets.test.mjs`
- Test: `tests/seo.test.mjs`

**Interfaces:**
- Produces: reusable `/assets/brand/atelier-mark.svg` browser asset and header markup class `.brand-logo-image`.
- Consumes: existing `--ink`, `--gold`, and `--paper` visual tokens.

- [ ] **Step 1: Write failing asset and metadata tests**

```js
test("all public pages use the canonical brand mark", async () => {
  for (const page of ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /assets\/brand\/atelier-mark\.svg/);
    assert.match(html, /rel="icon"[^>]+atelier-mark\.svg/);
  }
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/brand-assets.test.mjs tests/seo.test.mjs`
Expected: FAIL because the canonical assets and links do not exist.

- [ ] **Step 3: Create the original SVG, render PNG sizes, and replace duplicated inline logos**

The SVG uses a `0 0 96 96` viewBox, navy background, cream nib/hat fill, gold outer stroke, a dark central joint, and three dark support strokes. Add SVG favicon and 180/512 PNG icon links to each page head. Keep text labels unchanged.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/brand-assets.test.mjs tests/seo.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/brand index.html bibliotheque.html tutoriel.html parametres.html styles.css tests/brand-assets.test.mjs tests/seo.test.mjs
git commit -m "feat: add canonical atelier identity"
```

### Task 2: Bilingual How-It-Works Page

**Files:**
- Create: `fonctionnement.html`
- Modify: `index.html`
- Modify: `bibliotheque.html`
- Modify: `tutoriel.html`
- Modify: `parametres.html`
- Modify: `i18n.mjs`
- Modify: `styles.css`
- Modify: `sitemap.xml`
- Test: `tests/how-it-works-page.test.mjs`
- Test: `tests/i18n-html.test.mjs`
- Test: `tests/seo.test.mjs`

**Interfaces:**
- Produces: public route `fonctionnement.html` and translation keys under `how.*` and `nav.howItWorks`.
- Consumes: existing `site-i18n.mjs` attribute translation behavior and wiki-style page classes.

- [ ] **Step 1: Write failing structure and bilingual-copy tests**

```js
test("the explanation page documents deterministic recognition", async () => {
  const html = await readFile(new URL("../fonctionnement.html", import.meta.url), "utf8");
  for (const id of ["drawing", "photo", "practice", "reading", "guides", "limits"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-i18n="how\.photo\.pipeline"/);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/how-it-works-page.test.mjs tests/i18n-html.test.mjs tests/seo.test.mjs`
Expected: FAIL because the page, navigation item, sitemap entry, and keys are absent.

- [ ] **Step 3: Add the page and navigation**

Use the established header and wiki table-of-contents layout. Explain that recognition is local deterministic geometry/template comparison, show the two photo outputs, explain confidence and correction, and state that Practice has a known target and does not require a ring.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/how-it-works-page.test.mjs tests/i18n-html.test.mjs tests/seo.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fonctionnement.html index.html bibliotheque.html tutoriel.html parametres.html i18n.mjs styles.css sitemap.xml tests/how-it-works-page.test.mjs tests/i18n-html.test.mjs tests/seo.test.mjs
git commit -m "feat: explain how the simulator works"
```

### Task 3: Photo Preprocessing And Content Framing

**Files:**
- Create: `photo-preprocessing.mjs`
- Modify: `photo-import.mjs`
- Test: `tests/photo-preprocessing.test.mjs`
- Test: `tests/photo-import.test.mjs`

**Interfaces:**
- Produces: `estimateInkMask(imageData): Uint8Array`, `inkBounds(mask, width, height, marginRatio = 0.06): Bounds | null`, and `cropImageData(imageData, bounds): ImageDataLike`.
- Consumes: `{ data: Uint8ClampedArray, width: number, height: number }` images.
- `Bounds` is `{ left: number, top: number, right: number, bottom: number, width: number, height: number }` with inclusive source edges.

- [ ] **Step 1: Write failing tests for uneven light, noise, and full-content bounds**

```js
test("ink bounds include the entire ring radius and a safe margin", () => {
  const photo = gradientPaper(500, 300);
  inkCircle(photo, 250, 150, 110, 5);
  const mask = estimateInkMask(photo);
  const bounds = inkBounds(mask, 500, 300);
  assert.ok(bounds.left <= 130 && bounds.right >= 370);
  assert.ok(bounds.top <= 30 && bounds.bottom >= 270);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/photo-preprocessing.test.mjs tests/photo-import.test.mjs`
Expected: FAIL because the preprocessing module does not exist.

- [ ] **Step 3: Implement local contrast normalization and safe cropping**

Compute grayscale luminance, estimate a coarse local paper background, classify ink from local contrast plus a global Otsu fallback, remove isolated one-pixel noise, and return padded non-empty bounds. Keep `toInkMask` as a compatibility wrapper around `estimateInkMask`.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/photo-preprocessing.test.mjs tests/photo-import.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add photo-preprocessing.mjs photo-import.mjs tests/photo-preprocessing.test.mjs tests/photo-import.test.mjs
git commit -m "fix: normalize and frame imported photos"
```

### Task 4: Grouped Glyph Recognition And Candidate Confidence

**Files:**
- Modify: `photo-import.mjs`
- Test: `tests/photo-import.test.mjs`

**Interfaces:**
- Produces: `groupComponents(components, imageWidth, imageHeight, rings): ComponentGroup[]` and `recognizeGroup(groupMask, width, height, symbolPaths): Recognition`.
- `Recognition` is `{ status: "accepted" | "ambiguous" | "unreadable", candidates: Array<{ name: string, score: number }>, scoreMargin: number }`.
- `analyzePhoto` returns `{ rings, ring, regions, symbols, ignored, cropBounds, imageWidth, imageHeight }`; `symbols` contains accepted regions only for backward compatibility.

- [ ] **Step 1: Add failing multi-stroke grouping and ambiguity tests**

```js
test("disconnected strokes of one water sigil form one recognition region", () => {
  const photo = blankPhoto(240, 240);
  inkGlyphWithDisconnectedStrokes(photo, "Eau", 50, 50, 140);
  const result = analyzePhoto(photo, SYMBOL_PATHS);
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].candidates[0].name, "Eau");
});
```

- [ ] **Step 2: Run the photo tests and verify failure**

Run: `node --test tests/photo-import.test.mjs`
Expected: FAIL because disconnected strokes are analyzed independently.

- [ ] **Step 3: Implement grouping, bounded rotation scoring, and confidence margins**

Group components whose expanded boxes overlap at a threshold derived from the median stroke span, prevent groups from crossing a detected ring boundary, rasterize each group as one candidate, and score rotations `[-12, -6, 0, 6, 12]` degrees. Mark accepted only when score is at least 58 and the top-two margin is at least 7; mark ambiguous at score 42 or greater; otherwise mark unreadable.

- [ ] **Step 4: Run photo tests**

Run: `node --test tests/photo-import.test.mjs`
Expected: PASS, including existing synthetic catalogue fixtures.

- [ ] **Step 5: Commit**

```bash
git add photo-import.mjs tests/photo-import.test.mjs
git commit -m "fix: recognize grouped photo glyphs"
```

### Task 5: Editable Photo Review And Two Import Outputs

**Files:**
- Create: `photo-placement.mjs`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `i18n.mjs`
- Test: `tests/photo-placement.test.mjs`
- Test: `tests/photo-import-ui.test.mjs`
- Test: `tests/guide-storage.test.mjs`

**Interfaces:**
- Produces: `photoContentBounds(analysis): Bounds | null` and `mapPhotoAnalysis(analysis, target): { rings, symbols }`.
- Produces UI actions `#photoRecreateButton` and `#photoGuideButton`, and one `<select data-photo-region>` for every ambiguous region.
- Consumes: `analyzePhoto` result from Task 4 and existing `createUserGuide`/`saveUserGuides` APIs.

- [ ] **Step 1: Write failing bounds, candidate-editing, and output-choice tests**

```js
test("placement bounds include ring edges instead of only centers", () => {
  const bounds = photoContentBounds({ ring: { cx: 100, cy: 80, radius: 60 }, rings: [], regions: [] });
  assert.deepEqual(bounds, { left: 40, top: 20, right: 160, bottom: 140, width: 120, height: 120 });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/photo-placement.test.mjs tests/photo-import-ui.test.mjs tests/guide-storage.test.mjs`
Expected: FAIL because placement uses centers and only one confirmation action exists.

- [ ] **Step 3: Implement candidate correction, complete preview framing, recreation, and guide import**

Draw overlays in corrected-crop coordinates, list each region once, expose its top three candidates, disable recreation when no accepted or user-confirmed content exists, and use full ring/symbol extents for target scaling. Guide import stores the corrected crop as a personal raster guide with aspect ratio preserved and does not add drawing actions.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/photo-placement.test.mjs tests/photo-import-ui.test.mjs tests/guide-storage.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add photo-placement.mjs index.html app.js styles.css i18n.mjs tests/photo-placement.test.mjs tests/photo-import-ui.test.mjs tests/guide-storage.test.mjs
git commit -m "feat: review and reuse imported circles"
```

### Task 6: One-To-One Practice Scoring And Feedback

**Files:**
- Modify: `stroke-matcher.mjs`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `i18n.mjs`
- Test: `tests/stroke-matcher.test.mjs`
- Test: `tests/practice-mode.test.mjs`

**Interfaces:**
- Produces: `analyzeStrokeMatch(userStrokes, templatePaths): { score, coverage, extraPenalty, proportionScore, orientationScore, missingStrokes, extraStrokes }`.
- Preserves: `scoreStrokeMatch(userStrokes, templatePaths): number` as `analyzeStrokeMatch(...).score`.
- Produces: `#practiceFeedback` live region with localized diagnostic text.

- [ ] **Step 1: Write failing one-to-one and diagnostic tests**

```js
test("one user stroke cannot satisfy multiple template strokes", () => {
  const template = ["M 0 0 L 10 0", "M 0 10 L 10 10"];
  const result = analyzeStrokeMatch([[[0, 0], [10, 0]]], template);
  assert.equal(result.missingStrokes, 1);
  assert.ok(result.score < 80);
});
```

- [ ] **Step 2: Run matcher and Practice tests and verify failure**

Run: `node --test tests/stroke-matcher.test.mjs tests/practice-mode.test.mjs`
Expected: FAIL because greedy matching reuses a user stroke and no diagnostics exist.

- [ ] **Step 3: Implement minimum-cost one-to-one pairing and feedback**

Build all template/user stroke distances, greedily select the globally shortest unused pair, measure unmatched strokes separately, compare normalized bounding-box proportions, and estimate orientation from principal axes. Keep the percentage stable for existing perfect and translated fixtures.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/stroke-matcher.test.mjs tests/practice-mode.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stroke-matcher.mjs app.js index.html styles.css i18n.mjs tests/stroke-matcher.test.mjs tests/practice-mode.test.mjs
git commit -m "fix: make Practice scoring diagnostic"
```

### Task 7: Full Regression, Browser Smoke Test, And GitHub Publication

**Files:**
- Modify: `README.md`
- Modify: `docs/release-checklist.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: tested `main` branch and public GitHub Pages release.

- [ ] **Step 1: Document the two photo outputs and recognition limits**

Add concise English and French-facing usage notes without promising perfect recognition.

- [ ] **Step 2: Run syntax and full automated tests**

Run: `node --check app.js && node --test tests/*.test.mjs`
Expected: all tests PASS.

- [ ] **Step 3: Start or reuse the local server and smoke-test the browser**

Open `http://127.0.0.1:8000/index.html`. Verify desktop and narrow mobile layouts, logo, navigation, nonblank canvas, photo recreation, photo guide import, ambiguous correction, non-circle handling, Practice feedback, and nonblank 3D view after activation.

- [ ] **Step 4: Verify commit scope**

Run: `git status --short && git diff --check origin/main...HEAD && git diff --name-only origin/main...HEAD`
Expected: no `minecraft-mod/` path and no unrelated file.

- [ ] **Step 5: Commit documentation and push**

```bash
git add README.md docs/release-checklist.md
git commit -m "docs: document photo recognition workflow"
git push origin main
```

Expected: GitHub accepts `main`; verify the public `index.html` and `fonctionnement.html` return HTTP 200 after Pages deployment.
