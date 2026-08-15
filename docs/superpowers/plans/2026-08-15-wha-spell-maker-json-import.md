# WHA Spell Maker JSON Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import WHA Spell Maker JSON into the simulator's native editable circle actions without changing the existing share format.

**Architecture:** Add a DOM-free `wha-spell-maker-import.mjs` converter that detects and validates the external schema, maps canonical external names to the palette, and returns a native circle-share object plus warnings. Keep `app.js` responsible only for choosing the parser, replacing the canvas, and presenting localized status text.

**Tech Stack:** Plain browser JavaScript modules, Node's built-in test runner, existing `circle-share.mjs`, existing i18n catalogs.

## Global Constraints

- Preserve the existing simulator `version: 1` JSON format.
- Do not fetch external URLs or transmit imported JSON.
- Keep the existing 1,500,000-character and `MAX_CIRCLE_ACTIONS` limits.
- Do not modify unrelated dirty-worktree files.
- Unknown external symbols must be reported, never silently substituted.

### Task 1: Converter Contract and Tests

**Files:**
- Create: `wha-spell-maker-import.mjs`
- Test: `tests/wha-spell-maker-import.test.mjs`

**Interfaces:**
- Produces `isWhaSpellMakerDocument(value): boolean`.
- Produces `convertWhaSpellMakerDocument(value, options): { circle, warnings, stats }`.
- `circle` is accepted by `parseCircleShare` and uses `{ version: 1, locale, title, canvas, actions }`.

- [ ] **Step 1: Write failing tests** for root detection, metadata, rings, sigils, signs, lines, sparse defaults, unknown symbols, custom-image warnings, malformed values, and action limits.
- [ ] **Step 2: Run `node --test tests/wha-spell-maker-import.test.mjs` and verify the missing-module failure is expected.
- [ ] **Step 3: Implement bounded parsing, alias resolution, coordinate normalization, visibility filtering, and warning collection in `wha-spell-maker-import.mjs`.
- [ ] **Step 4: Run the converter tests and verify all pass.
- [ ] **Step 5: Run the existing circle-share tests to prove the native parser contract remains intact.

### Task 2: Import Dialog Integration

**Files:**
- Modify: `app.js` import handler and imports.
- Modify: `index.html` only if the existing JSON status region needs an accessible target.
- Modify: `site-i18n.mjs` for English and French import status strings.
- Test: `tests/wha-spell-maker-import.test.mjs` for parser selection behavior.

**Interfaces:**
- Consumes `isWhaSpellMakerDocument` and `convertWhaSpellMakerDocument`.
- Produces a single import path where native simulator JSON, links, and WHA JSON are distinguished without changing native behavior.

- [ ] **Step 1: Add a failing parser-selection test showing WHA JSON is accepted while native JSON still uses `parseCircleShareText`.
- [ ] **Step 2: Run the focused test and verify it fails before app integration.
- [ ] **Step 3: Detect WHA JSON after parsing the textarea input and call the converter before `replaceCircleFromShare`.
- [ ] **Step 4: Display imported counts and warnings through the existing localized status output.
- [ ] **Step 5: Run focused import and localization tests.

### Task 3: Verification and Local Smoke Test

**Files:**
- Modify: no unrelated files.

- [ ] **Step 1: Run `node --check app.js` and `git diff --check`.
- [ ] **Step 2: Run `node --test tests/*.mjs`.
- [ ] **Step 3: Start or reuse the local server and open `http://127.0.0.1:8000/index.html`.
- [ ] **Step 4: Paste a WHA sample JSON and confirm the dialog reports imported objects without console errors.
- [ ] **Step 5: Review the final diff and report exactly what was changed and verified.
