# Structured Shoe Support Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active 3D support consume the structured recipe plan, keep the paper and seal attached under the soles, and render grounded, deterministic support effects.

**Architecture:** Keep Three.js construction inside `app.js`, but move all numeric pose calculations into `support-geometry.mjs`. Capture one immutable recipe snapshot at activation and render from `activeSpell.recipe.supportPlan`; translated effect labels never act as internal IDs.

**Tech Stack:** Existing vendored Three.js, plain ES modules, Node.js built-in tests, in-app browser visual verification.

## Global Constraints

- Requires completion of `2026-07-16-spell-matrix-core.md` Tasks 1-4.
- The default support remains `none`.
- Shoe seals remain limited to 35 cm.
- Paper and ink remain under the soles and move with the shoe pair.
- Earth growth always touches the desk.
- No fireball is rendered without a form or levitation rule that requests it.
- Animations stop when the active spell expires.
- Rendering consumes structured effect IDs, never localized French or English labels.
- Do not add a downloaded 3D model or copied reference asset.

---

### Task 1: Immutable Activation Snapshot

**Files:**
- Modify: `app.js`
- Create: `tests/activation-snapshot.test.mjs`

**Interfaces:**
- Consumes: `createActivationSnapshot(value)` from `spell-model.mjs` and `signModel().recipe` from the core plan.
- Produces: `state.activation.snapshot` and `state.activeSpell.recipe`, both detached from mutable UI state.

- [ ] **Step 1: Write the failing snapshot integration test**

Create a source inspection test requiring `createActivationSnapshot`, a snapshot created inside `activateCircle()`, and no call to `signModel()` inside `rebuildThreeSpell()`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("activation captures an immutable recipe snapshot", () => {
  assert.match(app, /createActivationSnapshot/);
  const activation = app.match(/function activateCircle\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(activation, /snapshot:\s*createActivationSnapshot/);
});

test("3D rebuilding uses the active snapshot", () => {
  const rebuild = app.match(/function rebuildThreeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(rebuild, /signModel\(\)/);
  assert.match(rebuild, /state\.activeSpell\.recipe/);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/activation-snapshot.test.mjs`

Expected: FAIL because activation stores only `startedAt` and rebuilding rereads `signModel()`.

- [ ] **Step 3: Capture and propagate the snapshot**

In `activateCircle()`, build `model` once and store:

```js
const snapshot = createActivationSnapshot({
  recipe: model.recipe,
  elementName: primaryElementNameFromModel(model),
  supportId: currentSupport().id,
  diameter,
  center: { ...state.circleCenter },
  actions: cloneActions(state.actions),
});
state.activation = { startedAt: performance.now(), snapshot };
```

When the activation delay completes, copy `snapshot.recipe`, `snapshot.actions`, `snapshot.supportId`, and `snapshot.elementName` into `state.activeSpell`. Rebuild Three.js exclusively from that data. Changing support, signs, or language after activation must not mutate the running spell.

- [ ] **Step 4: Run snapshot and existing interaction tests**

Run: `node --test tests/activation-snapshot.test.mjs tests/symbol-interactions.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the activation snapshot**

```bash
git add app.js tests/activation-snapshot.test.mjs
git commit -m "fix: freeze active spell state"
```

### Task 2: Shared Shoe Pose Geometry

**Files:**
- Modify: `support-geometry.mjs`
- Modify: `tests/support-geometry.test.mjs`

**Interfaces:**
- Consumes: normalized progress, table height, sole height, support-plan mode,
  and support-plan effect IDs.
- Produces: `shoeSupportPose(progress, options)` returning finite table, paper, ink, sole, carrier, and manifestation heights.

- [ ] **Step 1: Add failing pose tests**

Extend `tests/support-geometry.test.mjs`:

```js
import { earthMoundPose, shoeSupportPose } from "../support-geometry.mjs";

test("shoe paper and ink remain attached below the sole", () => {
  for (const progress of [0, 0.5, 1]) {
    const pose = shoeSupportPose(progress, { mode: "carrier-lift", effectIds: ["water-carrier-lift"], tableY: 0.024, soleBottomY: 0.08 });
    assert.ok(pose.paperY < pose.soleBottomY);
    assert.ok(pose.inkY >= pose.paperY);
    assert.equal(pose.paperY - pose.carrierY, pose.paperLocalY);
  }
});

test("surface manifestations stay on the desk", () => {
  const pose = shoeSupportPose(1, { mode: "surface-manifestation", effectIds: ["water-puddle"], tableY: 0.024, soleBottomY: 0.08 });
  assert.equal(pose.manifestationY, 0.028);
  assert.equal(pose.carrierOffsetY, 0);
});

test("Earth growth stays grounded and supports the shoes", () => {
  const pose = shoeSupportPose(1, { mode: "surface-manifestation", effectIds: ["earth-grounded-growth"], tableY: 0.024, soleBottomY: 0.08 });
  assert.equal(pose.earth.bottomY, 0.024);
  assert.equal(pose.soleBottomY, pose.earth.topY + pose.earth.clearance);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/support-geometry.test.mjs`

Expected: FAIL because `shoeSupportPose` is missing.

- [ ] **Step 3: Implement the shared pose helper**

Add `shoeSupportPose(progress, options)` using `earthMoundPose` for Earth, `clamp01` for progress, and these constants unless explicitly overridden: paper gap `0.006`, ink lift `0.0015`, desk effect lift `0.004`, carrier maximum lift `0.18`. Return only finite numbers and an `earth` pose or `null`.

For `surface-manifestation`, carrier offset is zero unless `effectIds` contains
`earth-grounded-growth`; that effect uses the Earth pose's `shoeOffsetY`. For
`carrier-lift` and `sylph-flight`, apply eased lift. Derive `paperY` and `inkY`
from the moved sole, never from a world-space constant.

- [ ] **Step 4: Run geometry tests**

Run: `node --test tests/support-geometry.test.mjs`

Expected: all support geometry tests PASS.

- [ ] **Step 5: Commit shared geometry**

```bash
git add support-geometry.mjs tests/support-geometry.test.mjs
git commit -m "feat: unify shoe support poses"
```

### Task 3: Structured Shoe Rendering

**Files:**
- Modify: `app.js`
- Create: `tests/shoe-render-policy.test.mjs`

**Interfaces:**
- Consumes: `state.activeSpell.recipe.supportPlan`, `shoeSupportPose`, snapshot actions, and recipe layers.
- Produces: shoe carrier group, under-sole paper/ink group, and effect renderers selected by stable effect IDs.

- [ ] **Step 1: Add failing renderer-policy tests**

Create `tests/shoe-render-policy.test.mjs` that reads `app.js` and asserts:

```js
assert.doesNotMatch(app, /has\("table mouillee"\)/);
assert.doesNotMatch(app, /has\("chaussures propulsees"\)/);
assert.match(app, /supportPlan\.effectIds/);
assert.match(app, /water-puddle/);
assert.match(app, /fire-scorch/);
assert.match(app, /earth-grounded-growth/);
assert.match(app, /wind-lift/);
assert.match(app, /supportProp\.add\(sealCarrier\)/);
```

Also require that the body of the generic element renderer contains no unreachable shoe-only branch after an early `supportId !== "none"` return.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/shoe-render-policy.test.mjs`

Expected: FAIL because rendering parses French labels and the paper/ink group is not parented to the shoes.

- [ ] **Step 3: Create one movable seal carrier**

In `rebuildThreeSpell()`, create `sealCarrier = new THREE.Group()`. Put the shoe parchment, snapshot action lines, and under-sole circle lines inside it. For shoe mode, parent it to `supportProp`; for no support, parent it directly to the spell group:

```js
const sealCarrier = new THREE.Group();
sealCarrier.add(makeParchmentBase3d(auraRadius, supportId));
for (const action of state.activeSpell.actions) {
  for (const points of actionLines3d(action, bounds, scale, supportId)) {
    const line = addLine(points, action.seal ? elementColor : new THREE.Color(colors.paper), action.seal ? 0.96 : 0.82);
    if (line) sealCarrier.add(line);
  }
}
if (supportProp) supportProp.add(sealCarrier);
else group.add(sealCarrier);
```

Convert shoe paper and ink positions to local coordinates from `shoeSupportPose`. Confirm the sole, paper, and ink remain in this parent hierarchy during every animation.

- [ ] **Step 4: Render from stable effect IDs**

Replace `addShoeSupportEffects3d(group, supportProp, effects, ...)` with `addShoeSupportEffects3d(group, supportProp, supportPlan, ...)`. Branch on `supportPlan.effectIds` values such as `water-puddle`, `water-carrier-lift`, `fire-scorch`, `fire-carrier-lift`, `earth-grounded-growth`, and `wind-lift`.

Keep continuous animations:

- `water-puddle`: a desk-level irregular disc that expands monotonically until spell expiry;
- `water-carrier-lift`: a growing water cushion or focused jets according to recipe operations;
- `fire-scorch`: desk-level heat and scorch growth, no floating sphere;
- `fire-carrier-lift`: upward jets when focused, a sphere only when the support plan explicitly contains a levitating orb/form rule;
- `earth-grounded-growth`: a tapered irregular mound whose bottom remains exactly on the desk;
- `wind-lift`: visible airflow below the soles and upward carrier movement;
- unsupported effect IDs: a visible desk-level neutral pulse, never an unexplained shoe flight.

Stop all motion when `state.activeSpell` expires. Remove the unreachable generic shoe branch and do not parse localized labels.

- [ ] **Step 5: Run renderer and syntax tests**

Run:

```bash
node --test tests/support-geometry.test.mjs tests/activation-snapshot.test.mjs tests/shoe-render-policy.test.mjs
node --check app.js
```

Expected: all tests PASS and syntax is valid.

- [ ] **Step 6: Commit structured rendering**

```bash
git add app.js tests/shoe-render-policy.test.mjs
git commit -m "refactor: render structured shoe effects"
```

### Task 4: 3D Browser Verification

**Files:**
- Modify: `docs/qa-plan.md`
- Modify: `docs/progress-tracker.md`
- Create: `docs/qa/2026-07-16-support-rendering-results.md`

**Interfaces:**
- Consumes: finished core and rendering implementation.
- Produces: reproducible visual evidence and updated QA instructions.

- [ ] **Step 1: Start the local site**

Run: `scripts/start-local-server.sh`

Expected: `http://127.0.0.1:8000/index.html` returns HTTP 200.

- [ ] **Step 2: Verify representative support scenes**

Use the in-app browser at desktop `1280 x 720` and mobile `390 x 844`. Test no support and shoe support for Water, Fire, Earth, and Wind. For each scene confirm the 2D canvas and 3D canvas are nonblank, capture two frames, and confirm animation pixels change before expiration.

Required visual outcomes:

- default support is none;
- shoes are recognizable from below;
- paper and complete seal are visible under the soles;
- Water without movement spreads on the desk;
- Fire without movement scorches at desk level without a fireball;
- Earth touches the desk while lifting the shoes;
- Wind produces visible under-sole lift;
- the effect and movement stop when the spell duration ends;
- no text overflows or controls overlap the 3D view.

- [ ] **Step 3: Record exact results**

Create `docs/qa/2026-07-16-support-rendering-results.md` with tested URL, viewport, recipe, support-plan mode, screenshot path, sampled nonblank result, animation-difference result, console errors, and pass/fail for every fixture.

- [ ] **Step 4: Run final rendering checks**

Run:

```bash
node --test tests/*.test.mjs
node --check app.js
node scripts/validate-spell-matrix.mjs
git diff --check
```

Expected: all checks PASS and the matrix remains exactly 13,338.

- [ ] **Step 5: Commit visual QA documentation**

```bash
git add docs/qa-plan.md docs/progress-tracker.md docs/qa/2026-07-16-support-rendering-results.md
git commit -m "docs: verify structured support rendering"
```
