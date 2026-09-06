# Experimental Local Symbol Models

## Final integrated validation, 2026-09-06 UTC

The repeated release validation exited successfully with the original thresholds
unchanged. Earlier concurrent stress runs failed the latency gate; those failures
were not used to relax it. Latest measured photo/canvas warm latency p95 was
514/315 ms (first call 1156/45 ms). Each network evaluated 483 held-out synthetic
known examples and 300 distinct unknown masks. Accepted coverage was 79.5%/88.2%,
accepted accuracy 100%, false accepts 0/300 each, and maximum accepted orientation
error 5/4 degrees. These remain synthetic-only results, not measured real-world
accuracy or guaranteed mobile performance.

The main app was also opened on loopback with the real browser. Both selectors
defaulted to classic. Importing a water/flower/crystal circle and activating it
showed the six recognized symbols, the sequenced-flower final effect and a
nonblank 3D environment. This exposed a pre-existing CSP block on Rapier WASM;
the narrow `wasm-unsafe-eval` permission was added, without `unsafe-eval`.

## Release Position

These are two genuinely trained local neural classifiers, not mock networks or
lookup tables presented as learned weights. They are **experimental**. The classic
recognizer remains the default, controlled by the separate application integration.
No real user handwriting/photo corpus was available. Synthetic catalog accuracy
does not establish real-world reliability, and the confidence field is not an
empirically calibrated probability of correctness.

This report covers only the assigned neural modules, model assets, training and
validation scripts, and their tests. Grouping, application/UI integration, and the
classic recognizer are maintained separately and were not edited for this work.

## Integration Contract

```js
import { recognizePhotoSymbol } from './photo-symbol-recognition-model.mjs';
import { recognizeCanvasSymbol } from './canvas-symbol-recognition-model.mjs';

const photoResult = recognizePhotoSymbol(mask, width, height, symbolPaths);
const canvasResult = recognizeCanvasSymbol(actions, symbolPaths);
```

- Both functions are synchronous browser ES modules. Lazy-import the adapter first.
- `mask` is a flat ink mask: zero is background, positive values are ink. Dimensions
  must be positive integers with at most 4,194,304 pixels.
- Canvas input is an array of `{ type: 'free', points: [{ x, y }], width }` actions.
  There are limits of 512 strokes, 24,000 points, and bounded rasterization work.
- Both return `{ status, candidates, confidence, orientation, sourceKind,
  modelVersion, experimental, orientationAmbiguous, orientationPeriod }`.
- Status is `accepted`, `review`, `unknown`, or `fallback`. `fallback` is a technical
  failure signal, not an instruction to guess when a model returns `unknown`.
- Candidate fields are `{ name, score, rotation, neuralScore, geometryScore }`.
  **Candidate `score` is 0-100.** `confidence`, `neuralScore`, and `geometryScore`
  are 0-1. Only the first is intended for the existing percentage-style UI.
- Rotation is radians clockwise in canvas/image coordinates, normalized to a full
  turn. It is the source pose, not the inverse deskewing angle.
- For detected rotational symmetry, `orientation` is an equivalent representative
  modulo `orientationPeriod`; `orientationAmbiguous` is true. Do not label it a true,
  unique orientation. Candidate rotation also represents an equivalent source pose.
- For non-equivalent competing poses, the result exposes `orientationAlternatives`
  and `orientationAmbiguity: 'competing-poses'`, and cannot be auto-accepted.
- Empty/invalid results have no candidates, zero confidence, ambiguous orientation,
  and a null period. Never use their zero orientation as an observed pose.
- Sources are `imported-image` and `canvas-strokes`. Versions are respectively
  `photo-symbol-net-v1-experimental` and `canvas-symbol-net-v1-experimental`.

`createPhotoRecognitionSample({ mask, width, height })` also accepts a browser-like
RGBA `{ data, width, height }` object. `createCanvasRecognitionSample(actions)`
provides the native-stroke adapter. The high-level photo function uses the exact
four-argument mask API requested by the application integrator.

## Architecture And Training

Each source has a separate **97 -> 64 ReLU -> 69 softmax MLP**, with 10,757 trainable
parameters. Every dense weight and bias is optimized by cross-entropy
backpropagation, mini-batch SGD, momentum 0.9, and weight decay. There is no random
frozen feature network or substituted template identity output.

Input descriptors contain smoothed radial Fourier magnitudes, pair-distance
histograms, and ink density. Center-of-ink/radial normalization and these descriptors
reduce rotation sensitivity; they do not estimate pose. This small architecture is
appropriate for the constrained vector-template training corpus and static browser
deployment. It is not evidence that it generalizes to unconstrained handwriting.

Photo training uses rasterized, independently width-varied paths, mild affine
distortion/shear and pixel dropout. Canvas training uses native polylines with
point jitter, width variation and mild anisotropic distortion. Both include the
entire catalog. Stroke direction/order is not a learned feature in this simplified
architecture. Raw camera backgrounds, illumination and perspective are not modeled.

| Training Detail | Photo | Canvas |
| --- | ---: | ---: |
| Seed | 381901 | 782303 |
| Labels | 69 | 69 |
| Training samples | 4,968 | 4,968 |
| Epochs / batch size | 65 / 32 | 65 / 32 |
| Initial epoch cross-entropy | 0.8421 | 0.8297 |
| Final epoch cross-entropy | 0.0016 | 0.0015 |

Training angles are 0, 10, ..., 350 degrees, with two source-specific augmentations
per angle/label. Feature normalization statistics come only from training samples.
Calibration angles are 15, 75, 135, 195, 255, 315 degrees. Held-out angles are
5, 55, 115, 175, 235, 285, 335 degrees, with disjoint deterministic seeds.
The separate 280-degree regression is not represented as held-out because that
angle is in the training grid.

The neural top eight labels are geometrically verified at 72 angles over the full
circle, followed by one-degree local refinement of the leading four candidates.
The geometry reuses `rasterizeTemplate` and `distanceTransform` from `photo-import`;
its radial normalization intentionally differs from bounding-box normalization in
`normalizeComponentMask`. The score follows the symmetric distance/density principles
of `rasterMatchScore`, using continuous distances for sub-grid pose refinement.
Adapters depend on pure helpers; there is no reverse import from those helpers to
the adapters. Models are not imported by the classic path.

Acceptance requires geometric score >= 0.83, fused margin >= 0.035, neural softmax
agreement >= 0.80, and no non-equivalent competing poses. Fusion is 90% geometry
plus 10% square-root neural score. A geometric score below 0.64 yields `unknown`;
other unresolved matches yield `review`. These are explicit conservative policies,
not a real-world confidence calibration. The strong-neural gate and competing-pose
handling were selected using calibration diagnostics, before the held-out run.

## Validation

The final validator enforces neural accuracy >= 75%, hybrid accuracy >= 90%,
accepted coverage >= 40%, accepted identity accuracy >= 98%, unknown false accepts
<= 1%, pose p95 <= 10 degrees, **maximum accepted pose error <= 10 degrees**, and
warm p95 < 1 second on the validation host. Rejecting everything cannot pass.

The final unknown suite contains 300 distinct masks per source, generated with
seed 1770001, separate from calibration and optimization. It contains random thick
scribbles, irregular parallel-bar groups, and varying spirals. The validator checks
for duplicate normalized masks. An earlier 60-case diagnostic included duplicate
spiral/grid fixtures; it is superseded and must not be used as the final unknown
sample count. The acceptance policy was not tuned on the expanded unknown set.

The expanded saved-asset check passed without changing acceptance thresholds:

| Held-Out Metric | Photo | Canvas |
| --- | ---: | ---: |
| Known samples / labels | 483 / 69 | 483 / 69 |
| Standalone neural top-1 | 100% | 100% |
| Hybrid top-1 | 100% | 100% |
| Accepted count / coverage | 384 / 79.50% | 426 / 88.20% |
| Accepted identity accuracy | 100% | 100% |
| Distinct unknown masks | 300 | 300 |
| Unknown false accepts | 0 / 300 (0%) | 0 / 300 (0%) |
| Unknown review results | 99 | 103 |
| Pose median | 1 degree | 0 degrees |
| Pose p95 | 3 degrees | 2 degrees |
| Accepted pose p95 | 3 degrees | 2 degrees |
| Maximum accepted pose error, final rerun | 5 degrees | 4 degrees |
| Warm latency median, shared loaded host | 69.48 ms | 80.41 ms |
| Warm latency p95, shared loaded host | 548.19 ms | 438.90 ms |
| Maximum observed latency, shared loaded host | 1823.47 ms | 1462.22 ms |

The p95 latency target passed, but maxima exceeded one second on this loaded host.
This is not a guaranteed one-second deadline. The earlier less-loaded saved check
observed p95 19.46 ms / 13.71 ms and maxima 81.56 ms / 37.02 ms; those faster values
must not replace the loaded-run measurements. Browser smoke figures are separate.

A subsequent full rerun passed all identity, coverage, 300-unknown and maximum
accepted-pose gates, but **failed the timing assertion** as shared load increased.
Photo p95/max were 416.08/959.90 ms; canvas p95/max were 1257.55/2157.20 ms.
The host reported load averages near 27; a separate cold Node probe took 3.312 s.
No threshold was loosened to hide this failure. A serial performance rerun after
other workers' CPU-heavy tests is required before claiming the latency gate passes
consistently. The final check's nonzero exit is a performance failure, not a
classification, unknown-rejection, or accepted-orientation failure.

The first held-out known-symbol run produced 100% standalone and hybrid identity
accuracy on 483 samples per source. Photo accepted 384/483 (79.50%); canvas accepted
426/483 (88.20%), with no accepted identity errors. Pose p95 was 3 degrees for photo
and 2 degrees for canvas. These counts describe synthetic inputs only.

Large pose outliers must not be hidden by percentiles: the photo run selected an
alternative pose for `Vent sous pied` at 335 degrees (179-degree error), `Fleur` at
55 degrees (73-degree error), `Vent tourbillonnant` at 5 degrees (120-degree error),
and `Pluie` at 5 degrees (90-degree error). Canvas had the same `Pluie` outlier.
**All were review results with explicit competing-pose ambiguity**, not accepted
placements. Their alternatives included the original intended inclination.

## Reproduction And Integrity

```sh
node scripts/train-symbol-recognition-models.mjs
node scripts/train-symbol-recognition-models.mjs --check
node scripts/validate-symbol-recognition-models.mjs
node --test tests/symbol-neural-runtime.test.mjs tests/symbol-recognition-models.test.mjs
```

The first command intentionally rewrites the two generated model modules. Both
networks were trained twice in this implementation run; serialized weight/bias
hashes matched exactly. The `--check` path imports saved assets and evaluates them;
it does not optimize, rewrite, or refresh models. Asset hashes and modification
times were compared before and after a check and were unchanged.

Weight/bias SHA-256, over JSON `[w1, b1, w2, b2]`:

- Photo: `8c27c8320a354749d0e234c39061de3e13ef987eb505a599b06404e202249407`
- Canvas: `6bbc8d4ed2f8026aa6103189622e3a86446aeea2ddcfbd7add0adbc0c410fd40`

Saved module SHA-256:

- Photo: `7cd4832136658a2143431855e01ebcedcc6337c2137be36654015a6003fac303`
- Canvas: `1e080484d86e438ed128b9a23688dd2b94281cd3c3d374138fde40c2d2edd26b`

Combined asset size is 231,866 bytes (about 226.4 KiB), below the combined 1.5 MiB
limit. Runtime and training require no npm packages, remote services or network
calls. Only Node built-ins are used by the offline scripts.

## Browser And Limitations

`tests/symbol-recognition-browser.html` was served on loopback and executed in the
in-app Chromium browser. Both synchronous modules accepted `Eau` at 280 degrees
with 2-degree pose error; blank canvas input remained unknown. Observed browser
times were 32.9 ms cold photo and 18.2 ms warm canvas. These are individual smoke
measurements, not cross-device latency guarantees. Earlier concurrent CPU-heavy
runs had substantially higher timing outliers; host scheduling matters.

No end-to-end UI/3D, grouping, camera-photo or real freehand quality claim is made
from the model metrics. All samples share catalog vector origins, including held-out ones;
the held-out split measures augmentation/angle generalization, not writer or camera
domain generalization. Unknowns span only three procedural families. Real symbol
fragments, erased strokes, neighboring glyphs, adversarial lookalikes and real
paper artifacts can still be falsely accepted. Continue to offer confirmation and
classic recognition, and gather consented real examples before considering neural
recognition a reliable default.

### Additional Main-UI Smoke

At the integrator's request, the actual `index.html` was opened in the same browser
on port 8768. Port 8124 returned connection refused in this worker. Navigation and
DOM inspection initially timed out, but the loaded page subsequently became
inspectable; screenshot capture verified the parchment, toolbar and settings.
Console warning/error inspection returned an empty list.

Both `canvasRecognitionMode` and `photoRecognitionMode` had `classic` selected.
Both were switched to `neural` using real select controls. The user-provided
78,059-byte WHA JSON attachment was pasted into the UI's JSON import textarea;
the app displayed `Circle recreated from JSON: Imported WHA Spell Maker circle.`
Read and Activate were exercised. The review dialog displayed two distinct groups
of 55 occurrences, both `To confirm`, with 72/100 leading suggestions and group
apply/keep-unknown controls. This is a UI-flow observation, not a claim that those
suggestions are correct identities.

`Keep unknown` was clicked for each group; both changed to `Unknown`. Closing the
dialog and activating again produced `Activation: Crystal.` The browser control
channel then timed out on further screenshot/DOM operations. Therefore the
**post-activation 3D view was not visually verified**. No main application files
were edited for this smoke test.

The successful browser method was selecting the browser with `cua.getBrowser`,
then using `browser.tabs.new()`, `tab.goto()`, `tab.playwright.domSnapshot()`,
`tab.playwright` locators and `tab.screenshot()`. The visibility wrapper in
`cua.createBrowserTab` was unsupported in this worker context. A standalone smoke
page attached reliably; the large main page needed recovery after initial timeouts.
