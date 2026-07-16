# Support-Aware Spell Matrix Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, provenance-aware spell model and validate exactly 13,338 recipes across no-support and shoe-support modes.

**Architecture:** Add two DOM-free modules: `spell-model.mjs` owns canonical identity, geometry normalization, dominant-sigil selection, and immutable activation snapshots; `support-policy.mjs` owns support validation and structured shoe behavior. `spell-grammar.mjs` composes these outputs, while `app.js` consumes the same primary-sigil and fidelity decisions.

**Tech Stack:** Plain ES modules, browser JavaScript, Node.js built-in test runner, static HTML/CSS, existing i18n catalogs.

## Global Constraints

- The exact matrix is `9 sigils * 741 unordered sign pairs * 2 supports = 13,338`.
- The exact support split is `6,669 none` and `6,669 shoe`.
- `13,338` is a simulator validation matrix, not a claim about the total number of canon spells.
- Fidelity values are exactly `documented`, `inferred`, or `experimental`.
- Unknown support IDs throw instead of silently falling back.
- Display rounding never affects recipe identity.
- Do not add a package manager, framework, remote runtime dependency, or server-side component.
- User-facing strings remain bilingual in English and French.
- Reference-derived screenshots remain outside the public repository.

---

### Task 1: Canonical Spell Model

**Files:**
- Create: `spell-model.mjs`
- Create: `tests/spell-model.test.mjs`

**Interfaces:**
- Produces: `SUPPORTED_SUPPORT_IDS`, `selectPrimarySigil(sigilCounts)`, `normalizeSpellGeometry(geometry)`, `canonicalSpellIdentity(input)`, `hashSpellIdentity(identity)`, and `createActivationSnapshot(value)`.
- Consumes: plain objects only; this module must not import the DOM, Three.js, or `app.js`.

- [ ] **Step 1: Write the failing model tests**

Create `tests/spell-model.test.mjs` with fixtures that require input-order-independent dominant-sigil selection, exact geometry identity, support validation, and a deeply immutable snapshot:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSpellIdentity,
  createActivationSnapshot,
  hashSpellIdentity,
  normalizeSpellGeometry,
  selectPrimarySigil,
} from "../spell-model.mjs";

test("primary sigil selection is deterministic", () => {
  assert.equal(selectPrimarySigil({ Eau: 1, Feu: 2 }), "Feu");
  assert.equal(selectPrimarySigil({ Feu: 1, Eau: 1 }), "Eau");
  assert.equal(selectPrimarySigil({ Eau: 1, Feu: 1 }), "Eau");
});

test("semantic geometry differences keep distinct identities", () => {
  const base = {
    sigilCounts: { Eau: 1 },
    signCounts: { Colonne: 2 },
    invertedSigns: [],
    direction: "up",
    supportId: "none",
  };
  const first = canonicalSpellIdentity({ ...base, geometry: { balance: 0.84, pressure: 0.16, spin: 0, reach: 1, connectedCount: 2, ignoredCount: 0 } });
  const second = canonicalSpellIdentity({ ...base, geometry: { balance: 0.81, pressure: 0.19, spin: 0, reach: 1, connectedCount: 2, ignoredCount: 0 } });
  assert.notEqual(first, second);
  assert.notEqual(hashSpellIdentity(first), hashSpellIdentity(second));
});

test("unknown supports are rejected", () => {
  assert.throws(() => canonicalSpellIdentity({ sigilCounts: {}, signCounts: {}, supportId: "cloak" }), /support/i);
});

test("activation snapshots are detached and immutable", () => {
  const source = { supportId: "shoe", recipe: { effects: ["lift"] } };
  const snapshot = createActivationSnapshot(source);
  source.recipe.effects.push("changed");
  assert.deepEqual(snapshot.recipe.effects, ["lift"]);
  assert.throws(() => snapshot.recipe.effects.push("mutate"), TypeError);
});

test("geometry normalization preserves semantic precision", () => {
  assert.deepEqual(normalizeSpellGeometry({ balance: 0.834, pressure: 0.166, spin: 2, reach: -1, connectedCount: 2.8, ignoredCount: -2 }), {
    balance: 0.834,
    pressure: 0.166,
    spin: 1,
    reach: 0,
    connectedCount: 2,
    ignoredCount: 0,
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/spell-model.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `spell-model.mjs`.

- [ ] **Step 3: Implement the canonical model helpers**

Create `spell-model.mjs`. Use sorted count entries, a stable JSON payload, exact normalized coefficients, a 64-bit FNV-1a hash, and recursive freezing. The public functions must have these signatures:

```js
export const SUPPORTED_SUPPORT_IDS = Object.freeze(["none", "shoe"]);

export function selectPrimarySigil(sigilCounts = {}) {
  return Object.entries(sigilCounts)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0], "fr"))[0]?.[0] || null;
}

export function normalizeSpellGeometry(geometry = {}) {
  const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
  return {
    balance: clamp(geometry.balance, 0, 1, 1),
    pressure: clamp(geometry.pressure, 0, 1, 0),
    spin: clamp(geometry.spin, -1, 1, 0),
    reach: clamp(geometry.reach, 0, 1, 1),
    connectedCount: Math.max(0, Math.floor(Number(geometry.connectedCount) || 0)),
    ignoredCount: Math.max(0, Math.floor(Number(geometry.ignoredCount) || 0)),
  };
}
```

`canonicalSpellIdentity(input)` must validate `input.supportId`, sort count maps and inverted signs, add `rulesVersion: 2`, and return `JSON.stringify(payload)`. `hashSpellIdentity(identity)` must hash `new TextEncoder().encode(identity)` with FNV-1a constants `0xcbf29ce484222325n` and `0x100000001b3n`. `createActivationSnapshot(value)` must use `structuredClone` when available, fall back to JSON cloning for these plain data objects, recursively freeze arrays and objects, and return the clone.

- [ ] **Step 4: Run the model tests**

Run: `node --test tests/spell-model.test.mjs`

Expected: 5 tests PASS.

- [ ] **Step 5: Commit the canonical model**

```bash
git add spell-model.mjs tests/spell-model.test.mjs
git commit -m "feat: add canonical spell model"
```

### Task 2: Structured Support Policy

**Files:**
- Create: `support-policy.mjs`
- Create: `tests/support-policy.test.mjs`

**Interfaces:**
- Consumes: `{ supportId, primarySigil, operations, diameter }` where `operations` is a flat array of operation IDs.
- Produces: `SUPPORT_LIMITS`, `getSupportPolicy(id)`, and `composeSupportPlan(input)` returning `{ supportId, carrier, activation, origin, mode, movesCarrier, stable, hazard, fidelity, ruleIds, effectIds, valid, issue }`.

- [ ] **Step 1: Write failing support-policy tests**

Cover no support, the documented Sylph fixture, arbitrary surface manifestation, carrier motion, hazard precedence, size rejection, and unknown IDs:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { composeSupportPlan } from "../support-policy.mjs";

test("no support keeps the manifestation on paper", () => {
  const plan = composeSupportPlan({ supportId: "none", primarySigil: "Eau", operations: ["dispersion"], diameter: 0.8 });
  assert.equal(plan.origin, "paper");
  assert.equal(plan.movesCarrier, false);
  assert.equal(plan.valid, true);
});

test("the documented Sylph-shoe fixture is recognized", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Vent sous pied", operations: ["focus", "lift"], diameter: 0.2 });
  assert.equal(plan.mode, "sylph-flight");
  assert.equal(plan.fidelity, "documented");
  assert.deepEqual(plan.ruleIds, ["shoe.split-ring", "shoe.wind-underfoot", "shoe.convergence-levitation"]);
});

test("unsupported shoe recipes remain explicit experiments", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Eau", operations: ["dispersion"], diameter: 0.2 });
  assert.equal(plan.mode, "surface-manifestation");
  assert.equal(plan.movesCarrier, false);
  assert.equal(plan.fidelity, "experimental");
  assert.ok(plan.effectIds.includes("water-puddle"));
});

test("movement signs can move the carrier without changing the element", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Eau", operations: ["lift"], diameter: 0.2 });
  assert.equal(plan.movesCarrier, true);
  assert.equal(plan.mode, "carrier-lift");
  assert.equal(plan.fidelity, "inferred");
});

test("hazards never receive a stable support bonus", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Feu", operations: ["focus"], diameter: 0.2 });
  assert.equal(plan.hazard, true);
  assert.equal(plan.stable, false);
});

test("shoe seals above 35 cm are invalid", () => {
  const plan = composeSupportPlan({ supportId: "shoe", primarySigil: "Vent sous pied", operations: ["focus", "lift"], diameter: 0.36 });
  assert.equal(plan.valid, false);
  assert.equal(plan.issue, "shoe-diameter");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/support-policy.test.mjs`

Expected: FAIL because `support-policy.mjs` does not exist.

- [ ] **Step 3: Implement the support policy**

Create `support-policy.mjs` with `SUPPORT_LIMITS = { shoeMaxDiameter: 0.35 }`. Reject unknown support IDs. For `none`, emit `origin: "paper"`, `carrier: "none"`, and `activation: "closed-ring"`. For `shoe`, emit `origin: "under-sole-paper"`, `carrier: "shoe-pair"`, and `activation: "split-sole-ring"`.

Use these ordered rules:

```js
const has = (operations, id) => operations.includes(id);

if (primarySigil === "Vent sous pied" && has(operations, "focus") && has(operations, "lift")) {
  return shoePlan("sylph-flight", {
    movesCarrier: true,
    stable: true,
    fidelity: "documented",
    ruleIds: ["shoe.split-ring", "shoe.wind-underfoot", "shoe.convergence-levitation"],
    effectIds: ["wind-lift"],
  });
}
if (has(operations, "lift") || has(operations, "float") || has(operations, "carrier")) {
  return shoePlan("carrier-lift", {
    movesCarrier: true,
    stable: primarySigil !== "Feu",
    hazard: primarySigil === "Feu",
    fidelity: "inferred",
    ruleIds: ["support.carrier-target"],
    effectIds: [`${familyId(primarySigil)}-carrier-lift`],
  });
}
return shoePlan("surface-manifestation", {
  movesCarrier: false,
  stable: primarySigil !== "Feu",
  hazard: primarySigil === "Feu",
  fidelity: "experimental",
  ruleIds: ["support.surface-origin"],
  effectIds: [surfaceEffectId(primarySigil)],
});
```

Map `Eau`, `Feu`, `Terre`, `Vent`, `Lumiere`, `Cristal`, `Aeriforme`, `Vent sous pied`, and `Repetition` to stable ASCII family IDs. `surfaceEffectId` must return `water-puddle`, `fire-scorch`, `earth-grounded-growth`, `wind-surface-flow`, `light-halo`, `crystal-growth`, `air-cushion`, `wind-lift`, or `repetition-pulse` respectively.

- [ ] **Step 4: Run support-policy tests**

Run: `node --test tests/support-policy.test.mjs`

Expected: 6 tests PASS.

- [ ] **Step 5: Commit the support policy**

```bash
git add support-policy.mjs tests/support-policy.test.mjs
git commit -m "feat: add structured support policy"
```

### Task 3: Grammar Fidelity, Inversion, And Identity

**Files:**
- Modify: `spell-grammar.mjs`
- Create: `tests/spell-grammar.test.mjs`
- Modify: `scripts/validate-spell-matrix.mjs`

**Interfaces:**
- Consumes: canonical identity helpers from Task 1 and `composeSupportPlan` from Task 2.
- Produces: `composeSpellRecipe(input)` with `identity`, `id`, `fidelity`, `ruleIds`, `supportPlan`, and complete deterministic output; `validateSpellMatrix()` with support counts.

- [ ] **Step 1: Add failing grammar regression tests**

Create `tests/spell-grammar.test.mjs` with these exact assertions:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { composeSpellRecipe, validateSpellMatrix } from "../spell-grammar.mjs";

test("support changes the semantic plan", () => {
  const input = { sigils: ["Eau"], signs: ["Dispersion", "Levitation"], direction: "up" };
  const paper = composeSpellRecipe({ ...input, supportId: "none" });
  const shoe = composeSpellRecipe({ ...input, supportId: "shoe" });
  assert.notEqual(paper.id, shoe.id);
  assert.notDeepEqual(paper.supportPlan, shoe.supportPlan);
});

test("documented inversions change the operation", () => {
  const pull = composeSpellRecipe({ sigils: ["Eau"], signs: ["Traction"], invertedSigns: ["Traction"] });
  assert.ok(pull.operations.motion.includes("push"));
  const resize = composeSpellRecipe({ sigils: ["Terre"], signs: ["Agrandissement"], invertedSigns: ["Agrandissement"] });
  assert.ok(resize.operations.state.includes("shrink"));
});

test("unsupported inversions are warned and not invented", () => {
  const result = composeSpellRecipe({ sigils: ["Eau"], signs: ["Colonne"], invertedSigns: ["Colonne"] });
  assert.ok(result.operations.form.includes("column"));
  assert.ok(result.warnings.some((warning) => warning.includes("inversion")));
  assert.notEqual(result.fidelity, "documented");
});

test("ignored incompatibilities cannot restore documented fidelity", () => {
  const result = composeSpellRecipe({ sigils: ["Eau"], signs: ["Spire physique"] });
  assert.ok(result.ignoredSigns.includes("Spire physique"));
  assert.notEqual(result.fidelity, "documented");
});

test("the exact support-aware matrix is deterministic", () => {
  const result = validateSpellMatrix();
  assert.equal(result.tested, 13338);
  assert.equal(result.unique, 13338);
  assert.equal(result.deterministic, 13338);
  assert.deepEqual(result.supports, { none: 6669, shoe: 6669 });
  assert.ok(result.distinctPlans > 0);
});
```

- [ ] **Step 2: Run the grammar tests and capture failures**

Run: `node --test tests/spell-grammar.test.mjs`

Expected: FAIL on missing support plans, nominal inversion, confidence restoration, and the 6,669 total.

- [ ] **Step 3: Add explicit provenance and inverse operations**

In `SIGN_PROFILES`, add `fidelity` and `ruleIds` to every entry. Replace boolean-only inversion with explicit `inverseOperation` for documented inverses:

```js
Traction: profile({
  role: "motion",
  operation: "pull",
  inverseOperation: "push",
  fidelity: "inferred",
  ruleIds: ["sign.pull"],
  // retain the existing display fields
}),
Crush: profile({
  role: "state",
  operation: "crush",
  inverseOperation: "restore",
  fidelity: "documented",
  ruleIds: ["sign.crush", "sign.crush.inverse"],
  families: ["earth"],
}),
Agrandissement: profile({
  role: "state",
  operation: "resize",
  inverseOperation: "shrink",
  fidelity: "documented",
  ruleIds: ["sign.enlarge"],
}),
```

Use `experimental` for rules described by the source as unknown or for simulator-only behavior. Use `inferred` when the behavior is plausible but not directly stated. An attempted inversion without `inverseOperation` keeps the normal operation, adds an inversion warning, and lowers aggregate fidelity to at least `inferred`.

- [ ] **Step 4: Replace rounded IDs with canonical identity hashes**

Import from `spell-model.mjs`, select the primary sigil through `selectPrimarySigil`, normalize geometry once, and construct:

```js
const identity = canonicalSpellIdentity({
  sigilCounts: Object.fromEntries(sigilCounts),
  signCounts: Object.fromEntries(signCounts),
  invertedSigns: [...inverted],
  direction,
  supportId,
  geometry: normalizedGeometry,
});
const id = `spell-v2-${hashSpellIdentity(identity)}`;
```

Compose `supportPlan` from the final flat operations and include it in the returned recipe and plan fingerprint. Aggregate fidelity with the order `documented < inferred < experimental`; ignored, incompatible, unknown, or unsupported-inverse signs must lower rather than raise confidence.

- [ ] **Step 5: Expand and harden the exact matrix**

In `validateSpellMatrix()`, add an outer loop over `const supportIds = ["none", "shoe"]`. Keep one sigil and one unordered pair of signs with repetition. Compare complete repeated outputs with `assert.deepEqual` semantics through stable serialization. Count every support and include `supportPlan` in distinct plan fingerprints.

Return exactly:

```js
return {
  tested,
  unique: identities.size,
  deterministic,
  distinctPlans: planFingerprints.size,
  supports: Object.fromEntries(supportCounts),
};
```

Update `scripts/validate-spell-matrix.mjs` to require exact values rather than `> 1000`:

```js
expectLogic(result.tested === 13338, "La matrice doit contenir exactement 13 338 variantes.");
expectLogic(result.unique === 13338, "Chaque variante doit avoir une identite unique.");
expectLogic(result.deterministic === 13338, "Chaque variante doit etre entierement deterministe.");
expectLogic(result.supports.none === 6669, "Le support aucun doit couvrir 6 669 variantes.");
expectLogic(result.supports.shoe === 6669, "Le support chaussure doit couvrir 6 669 variantes.");
```

- [ ] **Step 6: Run grammar and matrix checks**

Run:

```bash
node --test tests/spell-model.test.mjs tests/support-policy.test.mjs tests/spell-grammar.test.mjs
node scripts/validate-spell-matrix.mjs
```

Expected: all tests PASS; validator JSON contains `tested: 13338`, `unique: 13338`, and the exact support split.

- [ ] **Step 7: Commit the grammar integration**

```bash
git add spell-grammar.mjs scripts/validate-spell-matrix.mjs tests/spell-grammar.test.mjs
git commit -m "feat: validate 13338 support-aware recipes"
```

### Task 4: Shared App Decisions And Fidelity Readout

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `i18n.mjs`
- Modify: `tests/i18n-runtime.test.mjs`
- Create: `tests/spell-app-integration.test.mjs`

**Interfaces:**
- Consumes: `selectPrimarySigil` and complete `recipe` objects from Tasks 1-3.
- Produces: one primary-element decision in text and rendering, plus a bilingual fidelity block in the Details drawer.

- [ ] **Step 1: Write failing integration tests**

Create `tests/spell-app-integration.test.mjs` that reads `app.js` and `index.html` and requires imports from `spell-model.mjs`, removal of the local weighted tie-break, use of `model.recipe.supportPlan`, and the new details IDs `fidelityLevel`, `fidelityRules`, and `fidelityWarnings`.

Add bilingual key assertions to `tests/i18n-runtime.test.mjs` for:

```js
for (const key of [
  "details.fidelity",
  "details.fidelity.documented",
  "details.fidelity.inferred",
  "details.fidelity.experimental",
  "details.ruleSources",
  "details.assumptions",
]) {
  assert.notEqual(translate("en", key), key);
  assert.notEqual(translate("fr", key), key);
}
```

- [ ] **Step 2: Run and confirm integration failures**

Run: `node --test tests/spell-app-integration.test.mjs tests/i18n-runtime.test.mjs`

Expected: FAIL because the shared model and fidelity elements are not wired.

- [ ] **Step 3: Use the shared primary-sigil rule**

Import `selectPrimarySigil` from `spell-model.mjs`. Replace the weighted local body of `primaryElementNameFromModel(model)` with:

```js
function primaryElementNameFromModel(model) {
  return selectPrimarySigil(model?.sigilCounts) || dominantElement()?.name || null;
}
```

Ensure `effectiveElement(model)`, the readout, `activeSpell.elementName`, and Three.js all consume this result.

- [ ] **Step 4: Add the fidelity readout**

Add an unframed fidelity subsection to the Details drawer. Render translated fidelity, rule IDs, support mode, assumptions, ignored signs, and geometry summary from `model.recipe`. Use a list for multiple warnings, never one long paragraph. Do not expose internal identity hashes in the interface.

Add matching English and French i18n keys. Keep text within the existing drawer width and reuse existing detail-row/list styles.

- [ ] **Step 5: Run app and i18n tests**

Run:

```bash
node --test tests/i18n.test.mjs tests/i18n-html.test.mjs tests/i18n-runtime.test.mjs tests/spell-app-integration.test.mjs
node --check app.js
```

Expected: all tests PASS and syntax is valid.

- [ ] **Step 6: Commit shared app decisions**

```bash
git add app.js index.html i18n.mjs tests/i18n-runtime.test.mjs tests/spell-app-integration.test.mjs
git commit -m "feat: show spell fidelity details"
```

### Task 5: Mechanics Fidelity Report And Core Verification

**Files:**
- Create: `docs/mechanics-fidelity-report.md`
- Modify: `docs/architecture.md`
- Modify: `docs/spell-effect-catalog.md`
- Modify: `docs/qa-plan.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/progress-tracker.md`

**Interfaces:**
- Consumes: final profile metadata, source rule IDs, support plans, and validator output.
- Produces: an auditable public report and updated engineering documentation.

- [ ] **Step 1: Write the complete fidelity report**

Create `docs/mechanics-fidelity-report.md` with source hierarchy, exact matrix formula, a table containing all 9 sigils and all 38 signs, support rules, ring/balance/rotation/inversion findings, corrected discrepancies, experimental behaviors, and deferred linked/nested/multi-sign mechanics. Every row must include `Project behavior`, `Fidelity`, `Source`, and `Open question` columns.

Link to the public research pages; do not embed reference images. Explicitly state that numeric power, stability, and duration values are simulator coefficients.

- [ ] **Step 2: Update architecture and effect documentation**

Document `spell-model.mjs`, `support-policy.mjs`, recipe identity version 2, exact 13,338 coverage, and the boundary between grammar and rendering. Replace all release-check references to 6,669 and 6,144 with the final validator values.

- [ ] **Step 3: Run the complete core test suite**

Run:

```bash
node --test tests/*.test.mjs
node --check app.js
node --check spell-model.mjs
node --check support-policy.mjs
node --check spell-grammar.mjs
node --check scripts/validate-spell-matrix.mjs
node scripts/validate-spell-matrix.mjs
git diff --check
```

Expected: every test passes; syntax checks are silent; validator reports exactly 13,338; `git diff --check` is silent.

- [ ] **Step 4: Commit the report and core documentation**

```bash
git add docs/mechanics-fidelity-report.md docs/architecture.md docs/spell-effect-catalog.md docs/qa-plan.md docs/release-checklist.md docs/progress-tracker.md
git commit -m "docs: report spell mechanics fidelity"
```
