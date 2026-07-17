# Symbol Fidelity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct every simulator sigil or sign that conflicts with the three supplied reference boards while preserving a single shared vector drawing in the picker, canvas, recognition preview and 3D renderer.

**Architecture:** Keep `symbol-catalog.mjs` as the sole runtime source for 48 by 48 SVG paths. Expand its audit metadata so every one of the 64 mechanical symbols has an explicit visual source and confidence status, while private reference images remain outside the public repository. Use deterministic Node tests for catalogue integrity and Playwright browser inspection for visual layout.

**Tech Stack:** Plain browser JavaScript, ES modules, SVG path data, Node.js built-in test runner, Python static HTTP server, Playwright through the Codex browser runtime.

## Global Constraints

- Do not embed or publish the supplied screenshots, manga panels or wiki images.
- Do not invent a replacement when a name-to-cell mapping cannot be confirmed.
- Keep exactly 26 profiled sigils and 38 profiled signs in the runtime catalogue.
- Preserve the existing 48 by 48 path coordinate system.
- Keep directional signs in their canonical orientation; placement logic owns rotation.
- Do not change spell effects, support behavior or the 38,532-variant matrix in this visual pass.
- Keep the application framework-free and package-manager-free.
- Preserve bilingual French and English behavior.

---

### Task 1: Archive References And Establish The Audit Contract

**Files:**
- Copy privately: `/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/2026-07-16-user-main-spell-board.png`
- Copy privately: `/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/2026-07-16-user-signs-board.png`
- Copy privately: `/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/2026-07-16-user-auxiliary-spell-board.png`
- Modify: `symbol-catalog.mjs:244-322`
- Modify: `tests/symbol-catalog.test.mjs`
- Create: `docs/qa/2026-07-16-symbol-fidelity-audit.md`

**Interfaces:**
- Consumes: `SIGIL_PROFILES` and `SIGN_PROFILES` key order from `spell-grammar.mjs`.
- Produces: `SYMBOL_AUDIT.sources[name]` with `{ reference, cell, status }`, where status is `confirmed`, `corrected` or `unresolved`.

- [ ] **Step 1: Copy the three supplied boards into the private research folder**

```bash
cp /var/folders/bw/3ybq_v757y70yxsw5gm2x_8m0000gp/T/codex-clipboard-6a35f761-8b13-4bc3-ae0e-e5c829bd0d39.png \
  '/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/2026-07-16-user-main-spell-board.png'
cp /var/folders/bw/3ybq_v757y70yxsw5gm2x_8m0000gp/T/codex-clipboard-82c5208f-d8a8-4c01-96af-45b8a169292a.png \
  '/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/2026-07-16-user-signs-board.png'
cp /var/folders/bw/3ybq_v757y70yxsw5gm2x_8m0000gp/T/codex-clipboard-2522d753-7e98-4970-a338-b427f315f8b0.png \
  '/Users/nathanh/Projets/witch-hat-atelier-simulator/Whitch hat/2026-07-16-user-auxiliary-spell-board.png'
```

Expected: all three destination files exist, and `git status --short` remains unchanged because the private folder is outside the public worktree.

- [ ] **Step 2: Write the failing audit coverage test**

Add to `tests/symbol-catalog.test.mjs`:

```js
import { SIGN_PROFILES, SIGIL_PROFILES } from "../spell-grammar.mjs";
import { SYMBOL_AUDIT, SYMBOL_PATHS } from "../symbol-catalog.mjs";

test("every mechanical glyph has a structured visual audit", () => {
  const expected = [...Object.keys(SIGIL_PROFILES), ...Object.keys(SIGN_PROFILES)];
  assert.deepEqual(Object.keys(SYMBOL_PATHS), expected);
  assert.deepEqual(Object.keys(SYMBOL_AUDIT.sources), expected);

  for (const name of expected) {
    const entry = SYMBOL_AUDIT.sources[name];
    assert.match(entry.reference, /^(user-(main|signs|auxiliary)|local)-[a-z0-9-]+$/);
    assert.match(entry.cell, /^(r\d{2}c\d{2}|capture-\d{6}|reference-\d{2})$/);
    assert.ok(["confirmed", "corrected", "unresolved"].includes(entry.status));
  }
});
```

- [ ] **Step 3: Run the test and confirm the schema is missing**

Run:

```bash
node --test tests/symbol-catalog.test.mjs
```

Expected: FAIL because `SYMBOL_AUDIT.sources` is undefined.

- [ ] **Step 4: Audit the three boards and existing private captures**

For every key in `SYMBOL_PATHS`, record one row in
`docs/qa/2026-07-16-symbol-fidelity-audit.md` with these exact columns:

```markdown
| Catalogue name | Kind | Reference | Cell | Result | Notes |
| --- | --- | --- | --- | --- | --- |
```

Use board cells `r01c01`, `r01c02`, continuing from top to bottom and left to
right. Use `confirmed` when the current path matches, `corrected` when this
pass replaces it, and `unresolved` when the supplied sources do not establish
a reliable mapping. The report must contain 64 data rows.

- [ ] **Step 5: Add structured source metadata**

Extend `SYMBOL_AUDIT` without removing the compatibility arrays:

```js
export const SYMBOL_AUDIT = Object.freeze({
  observed: Object.freeze([
    "Colonne", "Dispersion", "Levitation", "Traction", "Region",
    "Convergence", "Collection", "Nuage", "Crush", "Flottement",
    "Etirement", "Spire physique", "Refroidissement", "Renforcement",
    "Cible", "Enlacement", "Signe de vent", "Aeriforme defini",
    "Rassemblement", "Glaives", "Solidification", "Lien", "Arret",
    "Enveloppe", "Dissimulation", "Reflection", "Diamant", "Fenetre",
    "Agrandissement", "Viseur", "Radial", "Projectile", "Pluie", "Orbe",
    "Purification", "Immobilite", "Projection",
  ]),
  interpreted: Object.freeze(["Pantin"]),
  sources: Object.freeze(Object.fromEntries(
    Object.keys(SYMBOL_PATHS).map((name) => [name, Object.freeze({
      reference: "local-existing-capture",
      cell: `capture-${SYMBOL_REFERENCE_SUFFIX[name]}`,
      status: "unresolved",
    })]),
  )),
});
```

Replace each generated fallback in `sources` with the exact board or local
capture entry established by the 64-row audit. Do not mark an entry confirmed
until its row is visually checked.

- [ ] **Step 6: Run the audit test**

Run:

```bash
node --test tests/symbol-catalog.test.mjs
```

Expected: PASS with no missing audit entry.

- [ ] **Step 7: Commit the private-reference audit contract**

```bash
git add symbol-catalog.mjs tests/symbol-catalog.test.mjs docs/qa/2026-07-16-symbol-fidelity-audit.md
git commit -m "test: establish symbol fidelity audit"
```

---

### Task 2: Correct The Confirmed Central Sigils

**Files:**
- Modify: `tests/symbol-catalog.test.mjs`
- Modify: `tests/decorative-sigils.test.mjs`
- Modify: `symbol-catalog.mjs:12-179`
- Modify: `docs/qa/2026-07-16-symbol-fidelity-audit.md`

**Interfaces:**
- Consumes: confirmed `Kind = sigil` rows from the audit report.
- Produces: corrected `SYMBOL_PATHS[name]` arrays for the 26 sigil profiles.

- [ ] **Step 1: Replace brittle historical fingerprints with structural tests**

Add this helper and test to `tests/symbol-catalog.test.mjs`:

```js
const coordinates = (paths) => paths
  .flatMap((path) => [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0])));

test("all vector drawings remain inside the shared 48 by 48 view box", () => {
  for (const [name, paths] of Object.entries(SYMBOL_PATHS)) {
    const values = coordinates(paths);
    assert.ok(values.length >= 4, `${name} must contain drawable geometry`);
    assert.ok(values.every((value) => value >= 0 && value <= 48), `${name} clips the view box`);
  }
});
```

Keep exact fingerprints only for glyphs visually confirmed by the new boards.
Remove assertions that preserve an acknowledged incorrect historical path.

- [ ] **Step 2: Run the structural test before redrawing**

Run:

```bash
node --test tests/symbol-catalog.test.mjs tests/decorative-sigils.test.mjs
```

Expected: the structural test passes; any new board-specific fingerprint test
fails until its corresponding path is replaced.

- [ ] **Step 3: Redraw each confirmed mismatched sigil**

For each confirmed sigil row, replace only its `paths(...)` value. Use these
construction rules consistently:

```js
// Open strokes: separate M commands, no artificial closing segment.
Vent: paths(
  "M24 7 C18 7 17 13 20 18 C23 23 29 25 29 31 C29 37 24 41 19 39",
  "M8 17 L13 20 M5 24 H12 M8 31 L13 28 M40 17 L35 20 M43 24 H36 M40 31 L35 28",
),

// Closed cells: use Z only when the board shows a closed polygon.
Lumiere: paths(
  "M14 14 H34 V34 H14 Z",
  "M24 8 V40 M8 24 H40 M24 12 L36 24 L24 36 L12 24 Z",
),
```

The snippets define the required path style, not permission to retain them if
the audit says their geometry conflicts with a supplied cell. Curves should
use `C` or `Q`; polygonal signs should use `L`, `H` and `V`. Keep a 4-unit
minimum visual margin unless the reference visibly reaches farther.

- [ ] **Step 4: Mark every changed sigil row corrected**

Update both `SYMBOL_AUDIT.sources[name].status` and the audit report row to
`corrected`. Leave visually matching paths as `confirmed`; leave uncertain
ones untouched as `unresolved`.

- [ ] **Step 5: Run sigil tests**

Run:

```bash
node --test tests/symbol-catalog.test.mjs tests/decorative-sigils.test.mjs
node scripts/validate-spell-matrix.mjs
```

Expected: all tests pass, 26 sigils remain profiled, and the validator reports
`drawings: 64`, `tested: 38532`, `unique: 38532`.

- [ ] **Step 6: Commit the sigil corrections**

```bash
git add symbol-catalog.mjs tests/symbol-catalog.test.mjs tests/decorative-sigils.test.mjs docs/qa/2026-07-16-symbol-fidelity-audit.md
git commit -m "fix: align sigils with visual references"
```

---

### Task 3: Correct The Confirmed Main And Auxiliary Signs

**Files:**
- Modify: `tests/symbol-catalog.test.mjs`
- Modify: `tests/symbol-interactions.test.mjs`
- Modify: `symbol-catalog.mjs:181-238`
- Modify: `docs/qa/2026-07-16-symbol-fidelity-audit.md`

**Interfaces:**
- Consumes: confirmed `Kind = sign` rows and their `user-signs-*` or `user-auxiliary-*` cells.
- Produces: corrected paths for the 38 sign profiles without changing their mechanical names.

- [ ] **Step 1: Add uniqueness and category tests before path replacement**

Add to `tests/symbol-catalog.test.mjs`:

```js
test("sigils and signs keep distinct shared drawings", () => {
  const fingerprints = new Map();
  for (const [name, paths] of Object.entries(SYMBOL_PATHS)) {
    const fingerprint = paths.join("|").replaceAll(/\s+/g, " ").trim();
    assert.equal(fingerprints.has(fingerprint), false, `${name} duplicates ${fingerprints.get(fingerprint)}`);
    fingerprints.set(fingerprint, name);
  }
  assert.equal(fingerprints.size, 64);
});
```

Add to `tests/symbol-interactions.test.mjs`:

```js
test("the palette keeps central sigils separate from modifier signs", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /type:\s*["']sigil["']/);
  assert.match(app, /type:\s*["']sign["']/);
  assert.doesNotMatch(app, /SIGIL_PROFILES\s*=\s*SIGN_PROFILES/);
});
```

- [ ] **Step 2: Run the focused tests**

Run:

```bash
node --test tests/symbol-catalog.test.mjs tests/symbol-interactions.test.mjs
```

Expected: existing category behavior passes; newly recorded path fingerprints
fail only for entries still carrying old geometry.

- [ ] **Step 3: Redraw signs in board order**

Process `user-signs` cells from top-left to bottom-right, then process
`user-auxiliary` cells. For each cell:

1. verify the wiki section name and category;
2. compare the existing path to the board;
3. replace the path only when the mapping is confirmed;
4. preserve open endpoints, dot count, symmetry and orientation;
5. run the focused tests after each completed board row.

Use shared helpers for geometry that is actually circular:

```js
Orbe: paths(circle(24, 24, 14), "M24 7 V41"),
Diamant: paths("M24 7 L38 24 L24 41 L10 24 Z"),
Fenetre: paths("M14 14 H34 V34 H14 Z", "M24 7 V41", "M7 24 H41"),
```

Do not merge visually similar cells. In particular, `Colonne`, `Dispersion`,
`Levitation`, `Traction`, `Region`, `Convergence`, `Rassemblement`, `Glaives`,
`Purification`, `Immobilite` and `Projection` must retain separate fingerprints.

- [ ] **Step 4: Update provenance and audit results for every sign**

Set `reference` to `user-signs-board` or `user-auxiliary-spell-board`, set the
exact `rNNcNN` cell, and set `status` to `confirmed` or `corrected`. If the two
boards show the same cell, use the clearer board as the primary reference and
mention the second in the report notes.

- [ ] **Step 5: Run sign and matrix tests**

Run:

```bash
node --test tests/symbol-catalog.test.mjs tests/symbol-interactions.test.mjs tests/spell-grammar.test.mjs tests/spell-model.test.mjs
node scripts/validate-spell-matrix.mjs
```

Expected: all tests pass; there are 64 unique drawings, 38 signs and 38,532
deterministic variants.

- [ ] **Step 6: Commit the sign corrections**

```bash
git add symbol-catalog.mjs tests/symbol-catalog.test.mjs tests/symbol-interactions.test.mjs docs/qa/2026-07-16-symbol-fidelity-audit.md
git commit -m "fix: align signs with visual references"
```

---

### Task 4: Refresh Runtime Imports And Verify Shared Rendering

**Files:**
- Modify: `app.js:3`
- Modify: `index.html` script version reference
- Modify: `tests/symbol-catalog.test.mjs`
- Modify: `tests/symbol-palette-ui.test.mjs`

**Interfaces:**
- Consumes: final `SYMBOL_PATHS` and `SYMBOL_AUDIT` exports.
- Produces: cache-busted browser imports that expose the same corrected vectors in all UI surfaces.

- [ ] **Step 1: Write a failing cache-version test**

Replace the old version assertion in `tests/symbol-catalog.test.mjs` with:

```js
test("the browser loads the fidelity-audited shared catalogue", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /symbol-catalog\.mjs\?v=20260716-symbol-fidelity-v2/);
  assert.match(html, /app\.js\?v=20260716-symbol-fidelity-v2/);
});
```

- [ ] **Step 2: Confirm the old cache key fails**

Run:

```bash
node --test tests/symbol-catalog.test.mjs
```

Expected: FAIL because runtime imports still use
`20260716-decorative-sigils-v1`.

- [ ] **Step 3: Update both cache keys**

In `app.js`:

```js
import { SYMBOL_AUDIT, SYMBOL_PATHS } from "./symbol-catalog.mjs?v=20260716-symbol-fidelity-v2";
```

In `index.html`, change the `app.js` query string to:

```html
<script type="module" src="app.js?v=20260716-symbol-fidelity-v2"></script>
```

- [ ] **Step 4: Run catalogue and palette tests**

Run:

```bash
node --test tests/symbol-catalog.test.mjs tests/symbol-palette-ui.test.mjs tests/spell-app-integration.test.mjs
```

Expected: PASS; picker placement and application integration still import the
shared catalogue.

- [ ] **Step 5: Commit the runtime refresh**

```bash
git add app.js index.html tests/symbol-catalog.test.mjs tests/symbol-palette-ui.test.mjs
git commit -m "chore: refresh corrected symbol catalogue"
```

---

### Task 5: Complete Automated And Visual QA

**Files:**
- Modify: `docs/qa/2026-07-16-symbol-fidelity-audit.md`
- Modify: `docs/progress-tracker.md`
- Modify: `docs/release-checklist.md`

**Interfaces:**
- Consumes: the complete corrected catalogue and runtime cache version.
- Produces: reproducible test evidence and desktop/mobile screenshots without committing private references.

- [ ] **Step 1: Run syntax, test and matrix validation**

```bash
node --check app.js
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node --test tests/*.test.mjs
node scripts/validate-spell-matrix.mjs
git diff --check
```

Expected: zero syntax errors, zero failing tests, no whitespace errors,
`drawings: 64`, `visualReferences: 64`, `tested: 38532`, `unique: 38532`.

- [ ] **Step 2: Start the static server**

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Expected: server listens on `http://127.0.0.1:8000/index.html`.

- [ ] **Step 3: Inspect desktop rendering with Playwright**

At a 1440 by 1000 viewport:

1. open the workshop;
2. open `Sigils et signes`;
3. screenshot the complete sigil list and complete sign list;
4. place at least `Eau`, `Vent`, `Purification`, `Colonne` and `Levitation`;
5. verify the picker thumbnail and placed path have matching `d` values;
6. verify no glyph clips its button and no text overflows.

Expected: all five samples are centered and visually match their audited cells.

- [ ] **Step 4: Inspect mobile rendering with Playwright**

Repeat the palette check at 390 by 844. Scroll the entire drawer and verify
every glyph remains visible, selectable and contained within its preview box.

Expected: no overlap, clipping, horizontal page overflow or unreadable icon.

- [ ] **Step 5: Confirm private images are excluded**

Run:

```bash
git ls-files | rg -i 'whitch hat|user-(main|signs|auxiliary).*\.png' && exit 1 || true
```

Expected: no output.

- [ ] **Step 6: Record final QA evidence**

In `docs/qa/2026-07-16-symbol-fidelity-audit.md`, add:

```markdown
## Verification

- Catalogue entries: 64
- Unique vector fingerprints: 64
- Private reference boards published: 0
- Spell variants preserved: 38,532
- Desktop palette QA: passed at 1440 x 1000
- Mobile palette QA: passed at 390 x 844
- Automated test failures: 0
```

Update `docs/progress-tracker.md` and `docs/release-checklist.md` with the same
verified facts.

- [ ] **Step 7: Commit the QA report**

```bash
git add docs/qa/2026-07-16-symbol-fidelity-audit.md docs/progress-tracker.md docs/release-checklist.md
git commit -m "docs: record symbol fidelity verification"
```

---

## Self-Review

- Spec coverage: reference storage, all 64 audit entries, non-invention rule,
  vector correction, shared rendering, regression checks and visual QA are
  each assigned to a task.
- Placeholder scan: the plan contains no deferred implementation markers.
- Type consistency: all tasks use `SYMBOL_PATHS[name]` arrays and
  `SYMBOL_AUDIT.sources[name]` objects with the same `reference`, `cell` and
  `status` fields.
- Scope: spell mechanics, supports and combination counts are validation-only
  in this work and are not redesigned.
