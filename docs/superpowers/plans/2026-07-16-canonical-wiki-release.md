# Canonical Wiki Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one canonical `Witch Hat Atelier Spell Simulator` repository with a bilingual wiki, a searchable explorer for exactly 13,338 support-aware recipes, complete English runtime text, restored illustrated schematics, and production-ready GitHub Pages metadata.

**Architecture:** Keep the current advanced static application as the source of truth. A pure `variant-catalog.mjs` module builds and queries the canonical 9-sigil matrix; a module worker owns the full index while `library-explorer.mjs` renders only one 50-result page. Existing decorative sigils remain available to the editor but are excluded from the published 13,338-recipe contract by an explicit canonical matrix export.

**Tech Stack:** Static HTML/CSS, browser JavaScript modules, Web Worker, Node.js built-in test runner, vendored Three.js, GitHub Pages and GitHub CLI.

## Global Constraints

- The canonical matrix is exactly `9 * 741 * 2 = 13,338` unique deterministic records, split into `6,669` with no support and `6,669` with shoe support.
- Decorative/editor-only sigils must not silently enlarge the documented matrix.
- English is the default and English mode contains no French user-facing runtime text.
- The 33 existing original SVG schematics remain visible and locally hosted.
- Search supports English and French aliases, accent/punctuation normalization, token reordering, prefixes, and one small typo for words of at least four characters.
- Results are paginated at 50 and filters/search state round-trip through URL parameters.
- No framework, package manager, external CDN, copied manga panel, private reference screenshot, force push, or duplicated maintained simulator is introduced.
- The final repository slug is `witch-hat-atelier-spell-simulator` and the public URL is `https://nh1980mg.github.io/witch-hat-atelier-spell-simulator/`.

---

### Task 1: Synchronize And Establish The Canonical Matrix Boundary

**Files:**
- Modify: `spell-grammar.mjs`
- Modify: `scripts/validate-spell-matrix.mjs`
- Modify: `tests/spell-grammar.test.mjs`
- Modify: `tests/decorative-sigils.test.mjs`
- Create: `docs/repository-consolidation-audit.md`

**Interfaces:**
- Produces: `MATRIX_SIGIL_NAMES: readonly string[]` containing exactly the 9 recipe sigils.
- Produces: `MATRIX_SIGN_NAMES: readonly string[]` containing exactly the 38 modifier signs.
- Produces: `validateSpellMatrix(): { tested, unique, deterministic, supports, distinctPlans }` with the exact 13,338 contract.

- [ ] **Step 1: Fetch and integrate the latest remote main without discarding branch commits**

Run `git fetch origin` and inspect `git log --left-right --oneline HEAD...origin/main`. If remote commits exist, merge `origin/main` into the feature base and resolve by preserving the canonical spell model, current symbol drawings, and both approved design specs.

- [ ] **Step 2: Write the failing canonical-boundary tests**

Add assertions equivalent to:

```js
import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
  SIGIL_PROFILES,
  validateSpellMatrix,
} from "../spell-grammar.mjs";

assert.equal(MATRIX_SIGIL_NAMES.length, 9);
assert.equal(MATRIX_SIGN_NAMES.length, 38);
assert.ok(Object.keys(SIGIL_PROFILES).length >= MATRIX_SIGIL_NAMES.length);
assert.deepEqual(validateSpellMatrix().supports, { none: 6669, shoe: 6669 });
assert.equal(validateSpellMatrix().tested, 13338);
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `node --test tests/spell-grammar.test.mjs tests/decorative-sigils.test.mjs`

Expected: FAIL because the matrix still iterates every decorative sigil and reports 38,532.

- [ ] **Step 4: Export explicit matrix lists and constrain validation**

Keep all existing `SIGIL_PROFILES` for the editor. Define the exact nine canonical recipe sigils in `MATRIX_SIGIL_NAMES`, derive `MATRIX_SIGN_NAMES` from the 38 modifier profiles, and make `validateSpellMatrix()` iterate only those exports, unordered sign pairs with repetition, and `none`/`shoe` supports.

- [ ] **Step 5: Update the executable validator and audit the historical repository**

Require exact values `13338`, `6669`, and `6669` in the validation script. Compare every common runtime file in the historical repository and record one of `already superseded`, `preserve`, `combine manually`, or `reject` with a concrete reason in `docs/repository-consolidation-audit.md`.

- [ ] **Step 6: Run focused and full matrix verification**

Run:

```bash
node --test tests/spell-grammar.test.mjs tests/decorative-sigils.test.mjs
node scripts/validate-spell-matrix.mjs
```

Expected: PASS; JSON reports `tested: 13338`, `unique: 13338`, `deterministic: 13338`, and exact support split.

- [ ] **Step 7: Commit**

```bash
git add spell-grammar.mjs scripts/validate-spell-matrix.mjs tests/spell-grammar.test.mjs tests/decorative-sigils.test.mjs docs/repository-consolidation-audit.md
git commit -m "fix: restore canonical 13338 recipe matrix"
```

### Task 2: Build The Deterministic Variant Catalog

**Files:**
- Create: `variant-catalog.mjs`
- Create: `tests/variant-catalog.test.mjs`

**Interfaces:**
- Consumes: `MATRIX_SIGIL_NAMES`, `MATRIX_SIGN_NAMES`, and `composeSpellRecipe()`.
- Produces: `buildVariantIndex(): VariantRecord[]`.
- Produces: `normalizeSearchText(value: string): string`.
- Produces: `queryVariants(records, state): { total, filtered, page, pageCount, records }`.
- Produces: `getVariantDetail(record): VariantDetail`.
- Produces: `parseExplorerState(params)` and `serializeExplorerState(state)`.

- [ ] **Step 1: Write failing index-size and detail tests**

Test all records have unique stable IDs, deterministic details, required provenance/warning fields, and exact support split:

```js
const records = buildVariantIndex();
assert.equal(records.length, 13338);
assert.equal(new Set(records.map(({ id }) => id)).size, 13338);
assert.equal(records.filter(({ supportId }) => supportId === "none").length, 6669);
assert.equal(records.filter(({ supportId }) => supportId === "shoe").length, 6669);
assert.deepEqual(getVariantDetail(records[0]), getVariantDetail(records[0]));
```

- [ ] **Step 2: Run index tests and verify RED**

Run: `node --test tests/variant-catalog.test.mjs`

Expected: FAIL because `variant-catalog.mjs` does not exist.

- [ ] **Step 3: Implement the lightweight records and details**

Generate unordered sign pairs with repetition. Store only stable ID, neutral profile names, support, effect category, execution plan key, fidelity, warning count, and pre-normalized bilingual search terms. Recompose a full recipe only when `getVariantDetail()` is called.

- [ ] **Step 4: Write failing flexible-search, filter, pagination, and URL tests**

Cover `levit`, `lévitation eau`, `water levtation`, reordered tokens, each filter, all sort modes, 50-record pages without overlaps, invalid query sanitization, and parse/serialize round-trip.

- [ ] **Step 5: Run query tests and verify RED**

Run: `node --test tests/variant-catalog.test.mjs`

Expected: FAIL on missing normalization, typo tolerance, filters, sorting, pagination, and URL state.

- [ ] **Step 6: Implement search and query behavior**

Normalize with Unicode NFD plus diacritic removal, lowercase, punctuation-to-space, and token compaction. Score exact names above aliases, aliases above prefixes, and prefixes above Levenshtein distance 1 for tokens of length 4 or more. Sanitize filter values against exported option sets and keep page size fixed at 50.

- [ ] **Step 7: Run tests and commit**

```bash
node --test tests/variant-catalog.test.mjs
git add variant-catalog.mjs tests/variant-catalog.test.mjs
git commit -m "feat: index and query 13338 spell variants"
```

### Task 3: Add Worker-Backed Explorer UI

**Files:**
- Create: `variant-index-worker.mjs`
- Create: `library-explorer.mjs`
- Create: `tests/variant-worker.test.mjs`
- Create: `tests/library-explorer-ui.test.mjs`
- Modify: `bibliotheque.html`
- Modify: `styles.css`

**Interfaces:**
- Worker accepts `{ type: "init", locale }`, `{ type: "query", state }`, and `{ type: "detail", id }`.
- Worker returns `{ type: "ready", total }`, `{ type: "results", payload }`, `{ type: "detail", payload }`, or `{ type: "error", messageKey }`.
- `library-explorer.mjs` falls back to the same pure catalog functions if worker creation fails.

- [ ] **Step 1: Write failing worker protocol and HTML structure tests**

Assert the worker imports the canonical catalog, the library has a visible search label, search landmark, filter controls, result live region, pager, details dialog, loading state, clear command, and module script.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/variant-worker.test.mjs tests/library-explorer-ui.test.mjs`

Expected: FAIL because the worker, controls, and explorer controller are absent.

- [ ] **Step 3: Implement the worker protocol and fallback controller**

Keep the full index inside the worker. Return only the current 50 summaries and requested detail. Debounce text input, update URL via `history.replaceState`, preserve state during locale changes, trap focus in the detail dialog, and expose worker failure as a localized non-blocking warning.

- [ ] **Step 4: Implement restrained wiki/explorer styling**

Use a responsive two-column wiki layout with a sticky table of contents on desktop and collapsible navigation on mobile. Keep filters as native form controls, use a dense unframed results region, prevent horizontal overflow at 390 px, and honor reduced motion.

- [ ] **Step 5: Run focused tests and commit**

```bash
node --test tests/variant-worker.test.mjs tests/library-explorer-ui.test.mjs
git add variant-index-worker.mjs library-explorer.mjs bibliotheque.html styles.css tests/variant-worker.test.mjs tests/library-explorer-ui.test.mjs
git commit -m "feat: add searchable spell variant explorer"
```

### Task 4: Rebuild Library And Tutorial As Bilingual Wiki Pages

**Files:**
- Modify: `bibliotheque.html`
- Modify: `tutoriel.html`
- Modify: `library-circle-data.mjs`
- Modify: `i18n.mjs`
- Modify: `styles.css`
- Modify: `tests/library-assets.test.mjs`
- Modify: `tests/tutorial-content.test.mjs`
- Create: `tests/wiki-pages.test.mjs`

**Interfaces:**
- Library anchors: `overview`, `schematics`, `variants`, `sigils`, `signs`, `supports`, `fidelity`.
- Tutorial anchors: `quick-start`, `anatomy`, `sigils-signs`, `geometry`, `supports-limits`, `fidelity`, `variant-explorer`, `controls`.

- [ ] **Step 1: Write failing wiki-section and image-restoration tests**

Assert both pages have one `h1`, all required anchors and localized navigation labels, and that all 33 `assets/library-schematics/*.svg` entries appear as `<img>` elements with localized alt text.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/library-assets.test.mjs tests/tutorial-content.test.mjs tests/wiki-pages.test.mjs`

Expected: FAIL on missing wiki sections, stale matrix copy, and incomplete navigation.

- [ ] **Step 3: Reorganize the library and tutorial**

Retain the original local schematics and their current research categories. Add compact explanatory sections for canonical central sigils, modifier sign roles, two support modes, physical limits, fidelity labels, geometry/balance/rotation, and the explorer. State clearly that 13,338 is a simulator validation matrix rather than 13,338 manga-canonical spells.

- [ ] **Step 4: Add complete matching English and French keys**

Every new heading, paragraph, list item, image alternative, navigation label, support note, search label, result label, dialog field, and empty/loading/error state receives a key in both catalogs. Keep English and French key sets exactly equal.

- [ ] **Step 5: Run wiki tests and commit**

```bash
node --test tests/library-assets.test.mjs tests/tutorial-content.test.mjs tests/wiki-pages.test.mjs tests/i18n.test.mjs
git add bibliotheque.html tutoriel.html library-circle-data.mjs i18n.mjs styles.css tests/library-assets.test.mjs tests/tutorial-content.test.mjs tests/wiki-pages.test.mjs
git commit -m "docs: publish bilingual spell wiki and tutorial"
```

### Task 5: Complete The Runtime English Audit

**Files:**
- Modify: `app.js`
- Modify: `i18n.mjs`
- Modify: `site-i18n.mjs`
- Modify: `index.html`
- Modify: `parametres.html`
- Modify: `tests/i18n-runtime.test.mjs`
- Create: `tests/english-mode.test.mjs`

**Interfaces:**
- All `setStatus()` calls consume `t(key, params)` or already-localized list items.
- Locale change re-renders visible runtime state without clearing drawings, filters, or active detail.

- [ ] **Step 1: Write failing static/runtime English tests**

Assert `app.js` has no direct French status literal and that:

```js
assert.equal(
  translate("en", "status.closedSealDetected"),
  "Closed seal detected. Press Activate to awaken the ritual.",
);
```

Also scan English translations for known French interface terms and verify all dynamic status keys exist in both catalogs.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/i18n-runtime.test.mjs tests/english-mode.test.mjs`

Expected: FAIL on the hard-coded `Sceau ferme detecte...` runtime message and any untranslated dynamic strings.

- [ ] **Step 3: Replace direct user-facing literals with translation keys**

Cover closed-ring recognition, activation errors, support limits, symbol recognition, details, 3D feedback, archive messages, keyboard feedback, tooltips, titles, alt text, and ARIA labels. Preserve neutral internal identifiers and recipe IDs.

- [ ] **Step 4: Re-render current state on locale change**

Update visible status, support label, details, recognition lists, and open panels from stored neutral state instead of replacing them with a generic language-changed message.

- [ ] **Step 5: Run i18n tests and commit**

```bash
node --test tests/i18n*.test.mjs tests/english-mode.test.mjs
git add app.js i18n.mjs site-i18n.mjs index.html parametres.html tests/i18n-runtime.test.mjs tests/english-mode.test.mjs
git commit -m "fix: translate all English runtime feedback"
```

### Task 6: Add Canonical SEO, Public Artifact, And Security Checks

**Files:**
- Modify: `index.html`
- Modify: `bibliotheque.html`
- Modify: `tutoriel.html`
- Modify: `parametres.html`
- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `.github/workflows/pages.yml`
- Create: `robots.txt`
- Create: `sitemap.xml`
- Create: `tests/seo.test.mjs`
- Create: `tests/public-artifact.test.mjs`
- Create: `scripts/security-audit.mjs`

**Interfaces:**
- Canonical base URL: `https://nh1980mg.github.io/witch-hat-atelier-spell-simulator/`.
- Product title: `Witch Hat Atelier Spell Simulator | Magic Circle Maker`.

- [ ] **Step 1: Write failing SEO and artifact tests**

Require unique titles/descriptions, canonical and Open Graph URLs, `WebApplication` JSON-LD on the app, `CollectionPage` JSON-LD on the library, four sitemap URLs, permissive crawler rules, required worker/modules/assets in the Pages copy list, and no private reference paths.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/seo.test.mjs tests/public-artifact.test.mjs`

Expected: FAIL because canonical metadata, sitemap, robots, and artifact coverage are incomplete.

- [ ] **Step 3: Implement metadata and public artifact coverage**

Use natural descriptions containing `WHA spell simulator`, `spell maker`, and `magic circle simulator` without keyword stuffing. Copy `robots.txt`, `sitemap.xml`, worker modules, all 33 SVGs, and vendored Three.js into the Pages artifact.

- [ ] **Step 4: Add a static security audit**

Make `scripts/security-audit.mjs` fail on committed credentials, `eval`/`new Function`, remote executable scripts, private reference material in tracked/public files, missing CSP, missing Three.js license, or unsafe `target="_blank"` links without `rel="noopener noreferrer"`.

- [ ] **Step 5: Update public documentation**

Rewrite the README heading/opening in clear English, document bilingual use, exact 13,338 scope, fidelity labels, local/public URLs, tests, license/fan-project status, and repository structure. Update security/reporting and release instructions to the final repository name.

- [ ] **Step 6: Run checks and commit**

```bash
node --test tests/seo.test.mjs tests/public-artifact.test.mjs
node scripts/security-audit.mjs
git add index.html bibliotheque.html tutoriel.html parametres.html README.md SECURITY.md .github/workflows/pages.yml robots.txt sitemap.xml tests/seo.test.mjs tests/public-artifact.test.mjs scripts/security-audit.mjs
git commit -m "chore: prepare canonical GitHub Pages release"
```

### Task 7: Full Automated And Browser Verification

**Files:**
- Modify: `docs/qa-plan.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/progress-tracker.md`
- Create: `docs/qa/2026-07-16-canonical-wiki-release-results.md`
- Create: `docs/qa/screenshots/2026-07-16-explorer-desktop-en.png`
- Create: `docs/qa/screenshots/2026-07-16-explorer-mobile-fr.png`
- Create: `docs/qa/screenshots/2026-07-16-tutorial-mobile-en.png`

**Interfaces:**
- Verification report records exact commands, counts, viewport sizes, URLs, and any residual limitations.

- [ ] **Step 1: Run complete automated verification**

```bash
node --check app.js
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node --check variant-catalog.mjs
node --check library-explorer.mjs
node --check variant-index-worker.mjs
node --test tests/*.test.mjs
node scripts/validate-spell-matrix.mjs
node scripts/security-audit.mjs
git diff --check
```

Expected: all checks PASS, exactly 13,338 unique deterministic records and no security audit findings.

- [ ] **Step 2: Start the local server and perform desktop/mobile browser QA**

Verify index, library, tutorial, and settings in English and French at 1280x720 and 390x844. Exercise flexible search, typo search, filters, pagination, URL reload, documented/inferred/experimental details, language switching, restored images, closed-seal English status, keyboard focus, and no console errors or clipped text.

- [ ] **Step 3: Verify the 3D canvas remains nonblank**

Activate no-support and shoe recipes, confirm Three.js produces nonblank canvas pixels, paper remains grounded, shoe rendering remains recognizable/proportional, and the wiki work has not regressed drawing, selection, activation, or effects.

- [ ] **Step 4: Record evidence and commit**

```bash
git add docs/qa-plan.md docs/release-checklist.md docs/progress-tracker.md docs/qa/2026-07-16-canonical-wiki-release-results.md docs/qa/screenshots/2026-07-16-explorer-desktop-en.png docs/qa/screenshots/2026-07-16-explorer-mobile-fr.png docs/qa/screenshots/2026-07-16-tutorial-mobile-en.png
git commit -m "test: verify canonical wiki release"
```

### Task 8: Publish, Rename, Verify, And Retire The Duplicate

**Files:**
- Modify: GitHub repository settings for the advanced repository.
- Modify: historical repository root `index.html` and `.nojekyll` only.

**Interfaces:**
- Final repository: `NH1980MG/witch-hat-atelier-spell-simulator`.
- Final site: `https://nh1980mg.github.io/witch-hat-atelier-spell-simulator/`.
- Historical bridge: `https://nh1980mg.github.io/witch-hat-atelier-simulator/`.

- [ ] **Step 1: Rebase/merge the verified feature branch into current main without force push**

Fetch once more, integrate any new remote main commit, rerun the full automated verification, push the feature branch, merge it to `main`, then verify local and remote `main` point to the same commit.

- [ ] **Step 2: Rename and configure the advanced repository**

Rename it to `witch-hat-atelier-spell-simulator`, refresh local `origin`, set description to `Bilingual Witch Hat Atelier spell simulator and magic circle maker with 13,338 support-aware variants`, set homepage to the final Pages URL, and set topics `witch-hat-atelier`, `spell-simulator`, `magic-circle`, `spell-maker`, `threejs`, `fan-project`, and `bilingual`.

- [ ] **Step 3: Verify the canonical Pages deployment**

Wait for the Pages workflow to succeed. Require HTTP 200 for the root, tutorial, library, settings, `variant-catalog.mjs`, `variant-index-worker.mjs`, and one schematic SVG. Confirm the live source contains the final canonical URL and reports 13,338.

- [ ] **Step 4: Replace the historical site with a minimal redirect**

Only after Step 3 succeeds, publish one accessible page in the historical repository with a visible move notice, normal canonical link, `<link rel="canonical">`, and short client-side redirect to the final site. Remove its duplicated runtime/assets from the branch.

- [ ] **Step 5: Verify and archive the historical repository**

Require HTTP 200 at the old site, confirm the link and redirect reach the canonical site, then archive `NH1980MG/witch-hat-atelier-simulator`.

- [ ] **Step 6: Final public verification**

Confirm repository URL, Pages URL, GitHub topics/description/homepage, workflow success, canonical metadata, sitemap, redirect, and local server. Report the final commit, exact test totals, public URLs, and any search-indexing delay that remains under GitHub/search-engine control.

---

## Self-Review

- Spec coverage: all library/tutorial sections, exact matrix, flexible bilingual search, filters/sorts/paging/URL state, worker fallback, English runtime, accessibility, SEO, security, GitHub rename, Pages verification, redirect, and archive have an owning task.
- Placeholder scan: no deferred implementation step remains; every behavioral task defines failing tests, implementation boundaries, commands, and expected results.
- Type consistency: Tasks 2 and 3 use the same catalog/query/detail/state interfaces; Tasks 4 and 5 use the shared `i18n.mjs` catalogue; Tasks 6 through 8 consistently use the final slug and canonical URL.
