# Dual Local Symbol Networks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independent, browser-local neural symbol classifiers: one for imported photos and raster assets, and one for native freehand canvas strokes.

**Architecture:** A shared bounded neural runtime executes two separately versioned quantized models. Source-specific adapters produce different channels, while grouping, geometric verification, confidence policy, semantic metadata, and user correction are shared. Existing deterministic recognition remains the fallback and final verifier.

**Tech Stack:** Browser ES modules, typed arrays, Canvas 2D image data, deterministic Node.js model-generation scripts, `node:test`, localStorage, existing `SYMBOL_PATHS` catalogue.

**Spec:** `docs/superpowers/specs/2026-09-04-local-neural-symbol-recognition-flower-sequence-design.md`

## Global Constraints

- The deployed application remains a static client-only site.
- Two independent models are required: `photo-symbol-net-v1` and `canvas-symbol-net-v1`.
- Recognition sends no image, stroke, correction, or model input to an external service.
- Runtime inference consumes no API credits or AI tokens.
- Existing deterministic recognition remains available if either model fails.
- Unknown symbols stay unknown unless confidence is verified or the user confirms a catalogue identity.
- Repeated equivalent symbols are analysed and corrected once per group.
- Placement rotation remains separate from the intrinsic recognition correction.
- Combined model data and metadata must remain below 1.5 MiB.
- No package manager, bundler, remote script, or runtime CDN is introduced.

---

## File Structure

- Create `symbol-recognition-sample.mjs`: normalized sample validation, raster channels, native-stroke channels, geometry features.
- Create `symbol-recognition-groups.mjs`: source-aware fingerprints, repeated-occurrence grouping, cache keys, correction propagation.
- Create `symbol-neural-runtime.mjs`: bounded quantized convolution and dense inference with model validation.
- Create `photo-symbol-model-data.mjs`: generated photo-model weights and metadata.
- Create `canvas-symbol-model-data.mjs`: generated canvas-model weights and metadata.
- Create `photo-symbol-recognition-model.mjs`: photo model adapter and failure isolation.
- Create `canvas-symbol-recognition-model.mjs`: native-stroke model adapter and failure isolation.
- Create `symbol-recognition-hybrid.mjs`: geometric rescoring, source-specific thresholds, unknown rejection.
- Create `symbol-recognition-cache.mjs`: safe localStorage persistence and model-version invalidation.
- Create `scripts/train-symbol-recognition-models.mjs`: deterministic generation, training, quantization, validation, and model-module output.
- Modify `photo-preprocessing.mjs`: expose local contrast and edge channels without duplicating image analysis.
- Modify `photo-import.mjs`: accept hybrid candidates while retaining deterministic output and review flow.
- Modify `drawing-recognition.mjs`: expose native-stroke samples and canvas-model recognition.
- Modify `wha-spell-maker-import.mjs`: preserve group identity and optional semantic metadata on custom images.
- Modify `circle-share.mjs`: validate and preserve optional recognized semantics.
- Modify `app.js`: run the correct model for each source, show grouped review, and preserve fallbacks.
- Modify `index.html`, `styles.css`, `i18n.mjs`: grouped recognition review and reduced-mode messages.
- Modify `.github/workflows/pages.yml`, `scripts/validate-public-artifact.mjs`: include and validate both model modules.

### Task 1: Shared Recognition Samples

**Files:**
- Create: `symbol-recognition-sample.mjs`
- Modify: `photo-preprocessing.mjs`
- Test: `tests/symbol-recognition-sample.test.mjs`
- Test: `tests/photo-preprocessing.test.mjs`

**Interfaces:**
- Consumes: `{ mask, width, height }`, browser-like `ImageData`, and native freehand actions shaped as `{ type: "free", points, width }`.
- Produces: `createPhotoRecognitionSample(input, options)`, `createCanvasRecognitionSample(actions, options)`, and `validateRecognitionSample(sample)`.

- [ ] **Step 1: Write failing tests for source-specific channels**

```js
test("photo samples contain ink contrast and edge channels", () => {
  const sample = createPhotoRecognitionSample(photoWithDarkCross(48, 48));
  assert.equal(sample.sourceKind, "imported-image");
  assert.deepEqual(sample.channelNames, ["ink", "contrast", "edge"]);
  assert.equal(sample.channels.length, 48 * 48 * 3);
});

test("canvas samples retain direction endpoints and junctions", () => {
  const sample = createCanvasRecognitionSample(crossingFreehandActions());
  assert.equal(sample.sourceKind, "canvas-strokes");
  assert.deepEqual(sample.channelNames, ["ink", "direction-x", "direction-y", "topology"]);
  assert.ok(sample.geometry.endpointCount >= 4);
  assert.ok(sample.geometry.junctionCount >= 1);
});
```

- [ ] **Step 2: Run the sample tests and verify the missing-module failure**

Run: `node --test tests/symbol-recognition-sample.test.mjs tests/photo-preprocessing.test.mjs`

Expected: FAIL because `symbol-recognition-sample.mjs` and the new channel exports do not exist.

- [ ] **Step 3: Implement validated shared samples and source adapters**

```js
export function createPhotoRecognitionSample(imageData, { size = 48, sourceId = "photo", placementRotation = 0 } = {}) {
  const channels = photoFeatureChannels(imageData, size);
  return validateRecognitionSample({
    mask: channels.mask,
    channels: channels.values,
    channelNames: ["ink", "contrast", "edge"],
    width: size,
    height: size,
    sourceKind: "imported-image",
    sourceId,
    placementRotation,
    geometry: topologyFromMask(channels.mask, size, size),
  });
}

export function createCanvasRecognitionSample(actions, { size = 48, sourceId = "canvas", placementRotation = 0 } = {}) {
  const normalized = rasterizeNativeStrokes(actions, size);
  return validateRecognitionSample({
    ...normalized,
    channelNames: ["ink", "direction-x", "direction-y", "topology"],
    width: size,
    height: size,
    sourceKind: "canvas-strokes",
    sourceId,
    placementRotation,
  });
}
```

Validate finite dimensions, exact channel length, bounded input size, finite rotations, and supported source kinds. Preserve native point order until direction channels are built.

- [ ] **Step 4: Run tests and syntax checks**

Run: `node --test tests/symbol-recognition-sample.test.mjs tests/photo-preprocessing.test.mjs && node --check symbol-recognition-sample.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the sample layer**

```bash
git add symbol-recognition-sample.mjs photo-preprocessing.mjs tests/symbol-recognition-sample.test.mjs tests/photo-preprocessing.test.mjs
git commit -m "feat: add source-specific recognition samples"
```

### Task 2: Repeated-Symbol Grouping

**Files:**
- Create: `symbol-recognition-groups.mjs`
- Test: `tests/symbol-recognition-groups.test.mjs`

**Interfaces:**
- Consumes: recognition samples and action placements.
- Produces: `fingerprintRecognitionSample(sample)`, `groupRecognitionOccurrences(occurrences)`, and `applyGroupSemantic(actions, group, semantic)`.

- [ ] **Step 1: Write failing grouping tests**

```js
test("fifty-five repeated raster actions become one group", () => {
  const groups = groupRecognitionOccurrences(repeatedRasterOccurrences(55));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].occurrenceCount, 55);
  assert.equal(groups[0].placements.length, 55);
});

test("canvas grouping ignores equivalent rotation but keeps placements", () => {
  const groups = groupRecognitionOccurrences(rotatedCanvasOccurrences());
  assert.equal(groups.length, 1);
  assert.notEqual(groups[0].placements[0].rotation, groups[0].placements[1].rotation);
});
```

- [ ] **Step 2: Run the tests and verify they fail for the missing grouping API**

Run: `node --test tests/symbol-recognition-groups.test.mjs`

Expected: FAIL with missing exports.

- [ ] **Step 3: Implement bounded source-aware grouping**

```js
export function recognitionCacheKey({ sourceKind, fingerprint, modelVersion }) {
  return `${sourceKind}:${modelVersion}:${fingerprint}`;
}

export function groupRecognitionOccurrences(occurrences, { maxOccurrences = 500 } = {}) {
  if (!Array.isArray(occurrences) || occurrences.length > maxOccurrences) {
    throw new RangeError("Recognition occurrence limit exceeded");
  }
  // Group by source kind and normalized content fingerprint while retaining
  // every original transform in placements.
}
```

Use decoded pixel content for imported images, not filenames or action count. Use a rotation-normalized perceptual mask fingerprint for freehand repetitions.

- [ ] **Step 4: Run grouping tests**

Run: `node --test tests/symbol-recognition-groups.test.mjs`

Expected: PASS, including collision, limit, and correction propagation cases.

- [ ] **Step 5: Commit grouping**

```bash
git add symbol-recognition-groups.mjs tests/symbol-recognition-groups.test.mjs
git commit -m "feat: group repeated recognition symbols"
```

### Task 3: Bounded Quantized Neural Runtime

**Files:**
- Create: `symbol-neural-runtime.mjs`
- Test: `tests/symbol-neural-runtime.test.mjs`

**Interfaces:**
- Consumes: a validated model `{ version, sourceKind, input, layers, labels, calibration }` and a recognition sample.
- Produces: `validateNeuralModel(model)` and `runNeuralInference(model, sample)` returning `{ candidates, unknownScore, orientation, modelVersion, sourceKind }`.

- [ ] **Step 1: Write failing runtime tests**

```js
test("quantized convolution and dense layers produce deterministic logits", () => {
  const first = runNeuralInference(tinyFixtureModel(), tinyFixtureSample());
  const second = runNeuralInference(tinyFixtureModel(), tinyFixtureSample());
  assert.deepEqual(first, second);
  assert.deepEqual(first.candidates.map(({ name }) => name), ["Eau", "Fleur"]);
});

test("runtime rejects malformed or oversized models", () => {
  assert.throws(() => validateNeuralModel({ layers: [{ weights: [Infinity] }] }), /finite/i);
  assert.throws(() => validateNeuralModel(oversizedFixtureModel()), /limit/i);
});
```

- [ ] **Step 2: Run runtime tests and observe the expected missing-module failure**

Run: `node --test tests/symbol-neural-runtime.test.mjs`

Expected: FAIL because the runtime does not exist.

- [ ] **Step 3: Implement the minimal inference operators**

```js
export function runNeuralInference(model, sample) {
  const safeModel = validateNeuralModel(model);
  validateRecognitionSampleForModel(sample, safeModel);
  let tensor = dequantizeInput(sample.channels, safeModel.input);
  for (const layer of safeModel.layers) tensor = runLayer(layer, tensor);
  return decodeOutputs(tensor, safeModel);
}
```

Support only the architecture emitted by the training script: quantized `conv2d`, `relu`, `averagePool`, `globalAveragePool`, and `dense`. Bound tensor elements to 262,144, labels to the catalogue size, layers to 12, and reject non-finite scales or outputs.

- [ ] **Step 4: Run runtime tests and syntax checks**

Run: `node --test tests/symbol-neural-runtime.test.mjs && node --check symbol-neural-runtime.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the runtime**

```bash
git add symbol-neural-runtime.mjs tests/symbol-neural-runtime.test.mjs
git commit -m "feat: add bounded local neural runtime"
```

### Task 4: Deterministic Training and Two Model Assets

**Files:**
- Create: `scripts/train-symbol-recognition-models.mjs`
- Create: `photo-symbol-model-data.mjs`
- Create: `canvas-symbol-model-data.mjs`
- Create: `tests/fixtures/symbol-recognition-unknowns.mjs`
- Test: `tests/symbol-model-data.test.mjs`

**Interfaces:**
- Consumes: `SYMBOL_PATHS`, `rasterizeTemplate`, deterministic source-specific augmentations, and a fixed seed.
- Produces: two independently trained and calibrated model modules exporting `PHOTO_SYMBOL_MODEL` and `CANVAS_SYMBOL_MODEL`.

- [ ] **Step 1: Write failing model-contract tests**

```js
test("photo and canvas models are independent and catalogue complete", () => {
  assert.equal(PHOTO_SYMBOL_MODEL.sourceKind, "imported-image");
  assert.equal(CANVAS_SYMBOL_MODEL.sourceKind, "canvas-strokes");
  assert.notEqual(PHOTO_SYMBOL_MODEL.version, CANVAS_SYMBOL_MODEL.version);
  assert.deepEqual(PHOTO_SYMBOL_MODEL.labels, CANVAS_SYMBOL_MODEL.labels);
  assert.equal(PHOTO_SYMBOL_MODEL.labels.length, Object.keys(SYMBOL_PATHS).length);
  assert.notDeepEqual(PHOTO_SYMBOL_MODEL.layers, CANVAS_SYMBOL_MODEL.layers);
});
```

- [ ] **Step 2: Run model tests and verify missing model modules**

Run: `node --test tests/symbol-model-data.test.mjs`

Expected: FAIL because neither model module exists.

- [ ] **Step 3: Implement deterministic synthetic datasets and training**

```js
const MODEL_CONFIGS = Object.freeze({
  photo: { version: "photo-symbol-net-v1", channels: 3, seed: 0x50484f54 },
  canvas: { version: "canvas-symbol-net-v1", channels: 4, seed: 0x43414e56 },
});

for (const [source, config] of Object.entries(MODEL_CONFIGS)) {
  const train = buildAugmentedDataset(SYMBOL_PATHS, source, config.seed, 18);
  const validation = buildAugmentedDataset(SYMBOL_PATHS, source, config.seed + 1, 6);
  const trained = trainCompactConvClassifier(train, config);
  const calibrated = calibrateUnknownThresholds(trained, validation, UNKNOWN_FIXTURES[source]);
  await writeModelModule(source, quantizeModel(calibrated));
}
```

Use the architecture `48x48 source channels -> conv 5x5/8 -> ReLU -> average pool -> conv 3x3/12 -> ReLU -> global average pool -> dense catalogue logits + unknown + sin(angle) + cos(angle)`. Photo augmentation adds shadows, blur, perspective, grid remnants, colour/contrast shifts, transparent margins, and block artefacts. Canvas augmentation adds stroke gaps, reordered strokes, pressure-width variation, overlap, endpoint jitter, and local erasure.

- [ ] **Step 4: Generate both models and run held-out validation**

Run: `node scripts/train-symbol-recognition-models.mjs --write`

Expected: exits zero, writes both modules, reports independent false-automatic-classification rates below 1%, and reports combined bytes below 1,572,864.

- [ ] **Step 5: Run model and runtime tests**

Run: `node --test tests/symbol-model-data.test.mjs tests/symbol-neural-runtime.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the trainer and both generated models**

```bash
git add scripts/train-symbol-recognition-models.mjs photo-symbol-model-data.mjs canvas-symbol-model-data.mjs tests/fixtures/symbol-recognition-unknowns.mjs tests/symbol-model-data.test.mjs
git commit -m "feat: train independent photo and canvas symbol networks"
```

### Task 5: Source Model Adapters and Hybrid Verification

**Files:**
- Create: `photo-symbol-recognition-model.mjs`
- Create: `canvas-symbol-recognition-model.mjs`
- Create: `symbol-recognition-hybrid.mjs`
- Test: `tests/photo-symbol-recognition-model.test.mjs`
- Test: `tests/canvas-symbol-recognition-model.test.mjs`
- Test: `tests/symbol-recognition-hybrid.test.mjs`

**Interfaces:**
- Produces: `recognizePhotoSymbol(sample)`, `recognizeCanvasSymbol(sample)`, and `verifyRecognitionCandidate({ neural, sample, symbolPaths, calibration })`.
- Returns: `{ status: "accepted" | "review" | "unknown" | "fallback", candidates, semantic, confidence, orientation, symmetryPeriod, modelVersion, sourceKind }`.

- [ ] **Step 1: Write failing source-isolation and rotation tests**

```js
test("the photo adapter uses only the photo model", () => {
  const result = recognizePhotoSymbol(rotatedPhotoSample("Cristal", 280));
  assert.equal(result.sourceKind, "imported-image");
  assert.equal(result.modelVersion, "photo-symbol-net-v1");
  assert.equal(result.candidates[0].name, "Cristal");
  assert.ok(angleDistanceDegrees(result.orientation, 280) <= 8);
});

test("canvas failure cannot disable photo recognition", () => {
  disableCanvasModelForTest();
  assert.equal(recognizePhotoSymbol(photoSample("Eau")).candidates[0].name, "Eau");
});
```

- [ ] **Step 2: Run adapter tests and verify missing exports**

Run: `node --test tests/photo-symbol-recognition-model.test.mjs tests/canvas-symbol-recognition-model.test.mjs tests/symbol-recognition-hybrid.test.mjs`

Expected: FAIL because adapters and hybrid verifier are absent.

- [ ] **Step 3: Implement independent adapters and confidence fusion**

```js
export function verifyRecognitionCandidate({ neural, sample, symbolPaths, calibration }) {
  const verified = rescoreTopCandidates(neural.candidates.slice(0, 3), sample, symbolPaths);
  const confidence = fuseScores(neural, verified, sample.geometry);
  const status = confidence >= calibration.accept
    ? "accepted"
    : confidence >= calibration.review
      ? "review"
      : "unknown";
  return freezeRecognitionResult({ ...neural, ...verified, confidence, status });
}
```

The photo adapter imports only `PHOTO_SYMBOL_MODEL`; the canvas adapter imports only `CANVAS_SYMBOL_MODEL`. Catch model validation or inference errors within the matching adapter and return `fallback` without mutating the other adapter.

- [ ] **Step 4: Run all adapter tests**

Run: `node --test tests/photo-symbol-recognition-model.test.mjs tests/canvas-symbol-recognition-model.test.mjs tests/symbol-recognition-hybrid.test.mjs`

Expected: PASS for full rotation, symmetry, unknown rejection, disagreement review, and isolated failure.

- [ ] **Step 5: Commit adapters and hybrid verification**

```bash
git add photo-symbol-recognition-model.mjs canvas-symbol-recognition-model.mjs symbol-recognition-hybrid.mjs tests/photo-symbol-recognition-model.test.mjs tests/canvas-symbol-recognition-model.test.mjs tests/symbol-recognition-hybrid.test.mjs
git commit -m "feat: verify dual neural symbol recognition"
```

### Task 6: Recognition Cache and Semantic Persistence

**Files:**
- Create: `symbol-recognition-cache.mjs`
- Modify: `wha-spell-maker-import.mjs`
- Modify: `circle-share.mjs`
- Test: `tests/symbol-recognition-cache.test.mjs`
- Test: `tests/wha-spell-maker-import.test.mjs`
- Test: `tests/circle-share.test.mjs`

**Interfaces:**
- Produces: `readRecognitionDecision(storage, key)`, `writeRecognitionDecision(storage, key, semantic)`, and `validateRecognitionSemantic(value)`.
- Semantic shape: `{ element, kind, source, confidence, recognizer, modelVersion, intrinsicRotation }`.

- [ ] **Step 1: Write failing persistence tests**

```js
test("photo and canvas corrections use independent cache versions", () => {
  const photoKey = recognitionCacheKey({ sourceKind: "imported-image", fingerprint: "abc", modelVersion: "photo-symbol-net-v1" });
  const canvasKey = recognitionCacheKey({ sourceKind: "canvas-strokes", fingerprint: "abc", modelVersion: "canvas-symbol-net-v1" });
  assert.notEqual(photoKey, canvasKey);
});

test("WHA repeated custom images keep one group id and individual transforms", () => {
  const result = convertWhaSpellMakerDocument(repeatedCustomImageDocument(55));
  const images = result.circle.actions.filter(({ type }) => type === "image");
  assert.equal(new Set(images.map(({ recognitionGroupId }) => recognitionGroupId)).size, 1);
  assert.equal(new Set(images.map(({ rotation }) => rotation)).size, 55);
});
```

- [ ] **Step 2: Run persistence tests and confirm failures**

Run: `node --test tests/symbol-recognition-cache.test.mjs tests/wha-spell-maker-import.test.mjs tests/circle-share.test.mjs`

Expected: FAIL because cache helpers and semantic fields are missing.

- [ ] **Step 3: Implement safe persistence and optional action semantics**

```js
export function validateRecognitionSemantic(value, catalogue) {
  if (!value || !catalogue[value.element]) return null;
  if (!['photo', 'canvas', 'confirmed'].includes(value.recognizer)) return null;
  return Object.freeze({
    element: value.element,
    kind: catalogue[value.element].kind,
    source: value.source === "confirmed" ? "confirmed" : "verified",
    confidence: clamp01(value.confidence),
    recognizer: value.recognizer,
    modelVersion: String(value.modelVersion).slice(0, 64),
    intrinsicRotation: finiteAngle(value.intrinsicRotation),
  });
}
```

Limit stored decisions to 256 entries, validate every read, and evict oldest entries deterministically. Preserve legacy documents that lack semantic fields.

- [ ] **Step 4: Run persistence and import tests**

Run: `node --test tests/symbol-recognition-cache.test.mjs tests/wha-spell-maker-import.test.mjs tests/circle-share.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit cache and semantics**

```bash
git add symbol-recognition-cache.mjs wha-spell-maker-import.mjs circle-share.mjs tests/symbol-recognition-cache.test.mjs tests/wha-spell-maker-import.test.mjs tests/circle-share.test.mjs
git commit -m "feat: persist grouped symbol semantics"
```

### Task 7: Photo and Canvas Integration

**Files:**
- Modify: `photo-import.mjs`
- Modify: `drawing-recognition.mjs`
- Modify: `app.js`
- Test: `tests/photo-import.test.mjs`
- Test: `tests/drawing-recognition.test.mjs`
- Test: `tests/activation-snapshot.test.mjs`

**Interfaces:**
- `recognizePhotoGroups(groups, options)` runs only the photo adapter.
- `recognizeCanvasGroups(actions, options)` runs only the canvas adapter.
- `buildRecognitionSnapshot(actions)` returns immutable accepted semantics and unresolved review groups before recipe composition.

- [ ] **Step 1: Write failing end-to-end recognition tests**

```js
test("photo import analyses one representative for repeated custom images", () => {
  const result = recognizePhotoGroups(twoAssetsRepeated55Times());
  assert.equal(result.groups.length, 2);
  assert.equal(result.inferenceCount, 2);
});

test("activation recognizes native freehand with the canvas model", () => {
  const snapshot = recognizeCanvasGroups(rotatedFreehandSymbol("Eau", 1.1));
  assert.equal(snapshot.accepted[0].element, "Eau");
  assert.equal(snapshot.accepted[0].recognizer, "canvas");
});
```

- [ ] **Step 2: Run integration tests and verify failures**

Run: `node --test tests/photo-import.test.mjs tests/drawing-recognition.test.mjs tests/activation-snapshot.test.mjs`

Expected: FAIL because the two adapters are not connected to their source flows.

- [ ] **Step 3: Connect each source to its own model before recipe composition**

```js
export function recognizeCanvasGroups(actions, options = {}) {
  return recognizeGroupedSources(
    segmentNativeFreehand(actions),
    createCanvasRecognitionSample,
    recognizeCanvasSymbol,
    options,
  );
}
```

In `activateCircle`, capture a complete recognition snapshot before `signModel()` and `createActivationSnapshot()`. Reuse exact placed glyphs directly. Use photo semantics only for image actions, canvas semantics only for freehand groups, and deterministic fallback results only when their existing thresholds pass.

- [ ] **Step 4: Run integration tests and the full recognition subset**

Run: `node --test tests/photo-*.test.mjs tests/drawing-recognition.test.mjs tests/activation-snapshot.test.mjs tests/wha-spell-maker-import.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit source-flow integration**

```bash
git add photo-import.mjs drawing-recognition.mjs app.js tests/photo-import.test.mjs tests/drawing-recognition.test.mjs tests/activation-snapshot.test.mjs
git commit -m "feat: activate photo and canvas recognition models"
```

### Task 8: Grouped Review UI and Reduced Modes

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `i18n.mjs`
- Test: `tests/photo-import-ui.test.mjs`
- Test: `tests/symbol-recognition-ui.test.mjs`

**Interfaces:**
- Consumes: review groups with representative preview, occurrence count, three candidates, confidence, and orientation.
- Produces: one accessible review card per group and confirmation events carrying `{ groupId, element | null }`.

- [ ] **Step 1: Write failing static UI contract tests**

```js
test("group review exposes occurrence confidence and orientation", () => {
  assert.match(app, /recognitionGroup\.occurrenceCount/);
  assert.match(app, /recognitionGroup\.orientation/);
  assert.match(html, /recognitionReviewGroups/);
  assert.match(css, /\.recognition-group-card/);
});

test("both reduced modes have bilingual messages", () => {
  assert.match(i18n, /recognition\.photoReduced/);
  assert.match(i18n, /recognition\.canvasReduced/);
});
```

- [ ] **Step 2: Run UI tests and verify missing contracts**

Run: `node --test tests/photo-import-ui.test.mjs tests/symbol-recognition-ui.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement grouped confirmation and independent failure notices**

```js
function renderRecognitionGroup(group) {
  const card = recognitionGroupTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.groupId = group.id;
  card.querySelector("[data-preview]").src = group.representative.previewUrl;
  card.querySelector("[data-occurrences]").textContent = t("recognition.occurrences", { count: group.occurrenceCount });
  card.querySelector("[data-confidence]").textContent = `${Math.round(group.confidence * 100)}%`;
  card.querySelector("[data-orientation]").textContent = `${Math.round(group.orientation)}deg`;
  renderRecognitionCandidates(card, group.candidates.slice(0, 3));
  return card;
}
```

Render `Confirm`, `Search catalogue`, and `Keep unknown` as native buttons. Confirmation calls `applyGroupSemantic`, updates every occurrence, records one reversible cache decision, and closes only that card. Use `role="status"` for reduced mode and do not open a modal for accepted high-confidence results.

- [ ] **Step 4: Run UI and accessibility-oriented tests**

Run: `node --test tests/photo-import-ui.test.mjs tests/symbol-recognition-ui.test.mjs tests/i18n.test.mjs tests/i18n-runtime.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the grouped review UI**

```bash
git add index.html styles.css app.js i18n.mjs tests/photo-import-ui.test.mjs tests/symbol-recognition-ui.test.mjs
git commit -m "feat: review repeated symbol recognition once"
```

### Task 9: Release Validation and Browser Smoke Test

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `scripts/validate-public-artifact.mjs`
- Modify: `README.md`
- Test: `tests/public-artifact.test.mjs`
- Test: `tests/current-docs.test.mjs`

**Interfaces:**
- Produces: a public artifact containing both model modules and documentation stating that both models run locally.

- [ ] **Step 1: Write failing artifact tests for both models**

```js
test("the public artifact requires both local model modules", async () => {
  assert.match(validator, /photo-symbol-model-data\.mjs/);
  assert.match(validator, /canvas-symbol-model-data\.mjs/);
  assert.match(workflow, /train-symbol-recognition-models\.mjs --check/);
});
```

- [ ] **Step 2: Run artifact tests and verify failure**

Run: `node --test tests/public-artifact.test.mjs tests/current-docs.test.mjs`

Expected: FAIL until the workflow and validator include both model files.

- [ ] **Step 3: Add deterministic model checks to release validation**

```yaml
- name: Validate local recognition models
  run: node scripts/train-symbol-recognition-models.mjs --check

- name: Validate public build
  run: |
    node --test tests/*.test.mjs
    node scripts/validate-spell-matrix.mjs
    node scripts/security-audit.mjs
```

The check compares generated hashes with committed models, reports held-out metrics, rejects a combined payload larger than 1,572,864 bytes, and performs no network access.

- [ ] **Step 4: Run complete automated verification**

Run: `node --check app.js && node --test tests/*.test.mjs && node scripts/train-symbol-recognition-models.mjs --check && node scripts/validate-spell-matrix.mjs && node scripts/security-audit.mjs`

Expected: all commands exit zero; matrix output remains 69 drawings and 65,600 regular variants plus the structured ritual variant.

- [ ] **Step 5: Smoke-test both paths in the browser**

Run: `./scripts/start-local-server.sh`

Verify at `http://127.0.0.1:8000/index.html`:

- Import a rotated photo symbol and confirm the photo model version is reported.
- Draw the same symbol freehand and confirm the canvas model version is reported.
- Import 55 repeated copies and confirm only one review card appears.
- Disable one model through the test hook and confirm the other still recognizes.
- Activate the resulting circle and confirm the canvas and 3D views remain nonblank.

- [ ] **Step 6: Commit release validation**

```bash
git add .github/workflows/pages.yml scripts/validate-public-artifact.mjs README.md tests/public-artifact.test.mjs tests/current-docs.test.mjs
git commit -m "test: validate both local recognition models"
```
