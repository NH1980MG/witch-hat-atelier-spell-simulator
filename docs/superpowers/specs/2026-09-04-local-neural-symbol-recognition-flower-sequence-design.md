# Local Neural Symbol Recognition and Sequenced Flower Manifestation

Date: 2026-09-04

## Objective

Improve symbol recognition for both imported photos or WHA Spell Maker JSON
and symbols drawn directly on the simulator canvas. Two specialized local
neural networks must operate entirely in the browser: one for raster/photo
sources and one for native canvas strokes at activation. Both classifiers must
classify repeated symbols as one group, tolerate arbitrary symbol rotation,
and never depend on an external AI service.

Use the resulting semantic symbols to execute a deterministic transformation
timeline. The first complete vertical slice is the imported composition:

```text
water -> flower -> enlarge -> crystallize -> fracture -> disperse/aim
```

The 3D result must visibly grow as a water flower, become crystalline, and
break into directed fragments instead of collapsing into a generic particle
effect.

## Constraints

- The deployed application remains a static client-only site.
- Recognition and inference do not send images, strokes, or corrections to a
  server.
- Runtime recognition consumes no API credits or AI tokens.
- The photo model, canvas model, and their metadata are versioned static
  assets with independent confidence calibration.
- Existing deterministic recognition remains available as a fallback.
- Unknown custom symbols remain unknown until the user confirms a catalogue
  meaning. The application must not invent magical semantics.
- One correction applies to every repeated occurrence of the same source
  symbol.
- Existing circles, native glyphs, imported raster images, and saved circle
  documents remain backward compatible.

## Current Gaps

The current WHA importer preserves two custom source images as two assets and
places 110 image actions around the circle. The effect analyser ignores those
actions because they have no catalogue identity.

The current photo analyser already provides deterministic preprocessing,
connected-component grouping, ring detection, raster templates, chamfer
distance, and intersection-over-union scoring. It does not provide a shared
semantic mapping for repeated image assets, and its classification is not
reliably invariant across arbitrary rotations.

The normal canvas recognizer currently analyses freehand geometry with
deterministic rules. It does not have a classifier specialized for native
stroke direction, endpoints, junctions, incomplete strokes, or drawing-order
variation at activation time.

WHA Spell Maker can place a catalogue sigil such as `sigil_Crystalize` in its
`signs` collection to repeat it around an annulus. The current importer keeps
the source collection as the action kind. The four rendered `Cristal` glyphs
therefore remain signs and are ignored by the sigil grammar.

The current manifestation plan describes operations as a set of layers. It
does not expose a visible, ordered timeline for water taking a flower shape,
growing, crystallizing, fracturing, and dispersing. The 3D renderer also lacks
a procedural flower geometry.

## Considered Recognition Approaches

### 1. Existing template matcher only

Rotate each input through multiple angles and retain the lowest chamfer
distance. This is small and deterministic, but becomes expensive across every
symbol and remains fragile when drawings are incomplete.

### 2. Rotation-invariant geometric descriptors

Classify Hu moments, radial signatures, contour intersections, and topology.
This is fast and useful for rejecting impossible candidates, but similar runes
can share the same coarse geometry.

### 3. Local neural classifier only

Run a compact convolutional classifier over normalized symbol masks. This is
more tolerant of imperfect strokes but can make confident-looking mistakes
without geometric validation.

### 4. External vision model

Send each image to an online multimodal model. This is rejected because it
adds recurring cost, latency, privacy exposure, availability risk, and
non-deterministic answers.

### 5. Manual mapping only

Ask the user to identify every custom symbol. Grouping makes this usable, but
it wastes the catalogue and recognition code already available.

### 6. Selected hybrid

Use deterministic preprocessing and geometry to segment and reject candidates,
two compact local neural networks to rank catalogue identities for their
respective source types, and the existing template matcher to verify each
neural result. Ask for one grouped confirmation when confidence is
insufficient and remember that decision locally.

This combines the useful parts of approaches 1, 2, 3, and 5 while avoiding the
cost and privacy problems of approach 4.

## Recognition Architecture

### Shared input contract

Both imported custom images and freehand canvas groups are converted into a
shared recognition sample:

```js
{
  mask,             // normalized monochrome raster
  channels,         // source-specific normalized tensor channels
  geometry,         // endpoints, junctions, holes, and bounds
  width,
  height,
  sourceKind,       // imported-image or canvas-strokes
  sourceId,
  placementRotation
}
```

The shared preprocessing stage removes transparent margins, estimates ink,
preserves the original placement angle, centres the ink bounds, and scales the
longest dimension into the model frame without changing aspect ratio. A
source adapter then builds photo channels from local contrast and edges, or
canvas channels from native stroke direction, endpoints, and junctions. A
canvas sample must retain the native action list until those channels have
been derived; it must not be reduced to pixels prematurely.

### Grouping

Imported images are grouped by decoded pixel fingerprint, not by action count
or filename. All actions referencing equivalent image content share one group.
The supplied document therefore creates two recognition groups, not 110
prompts.

Freehand groups are clustered from normalized masks after segmentation. A
rotation-normalized perceptual fingerprint groups visually equivalent repeated
drawings while retaining each occurrence's placement and angle.

Each recognition group contains:

```js
{
  fingerprint,
  sourceIds,
  actionIds,
  occurrenceCount,
  representative,
  placements
}
```

A correction updates the group semantic identity. Individual actions continue
to keep independent position, scale, and rotation values.

### Two specialized neural classifiers

The application ships two small quantized convolutional networks trained only
on the public simulator catalogue. They share catalogue labels and output
contracts but use separate weights, input channels, augmentation profiles,
confidence thresholds, and model versions.

The photo classifier handles pasted photographs, uploaded photographs,
screenshots, and custom raster images embedded in WHA Spell Maker JSON. Its
input channels describe normalized ink, local contrast, and edges so it can
tolerate paper shadows, blur, perspective changes, compression, transparent
margins, and antialiasing.

The canvas classifier handles freehand strokes drawn directly in the normal
simulator. Its input channels describe normalized ink, stroke direction, and
endpoints/junctions derived from the native action list. It runs when the user
reads or activates a hand-drawn circle and is optimized for incomplete,
uneven, overlapping, or differently ordered pen strokes.

Each network outputs catalogue logits plus an unknown score and an orientation
estimate. Neither network delegates inference to the other. The shared hybrid
layer can compare their results only when a source genuinely provides both
raster and native-stroke representations.

Training data for both networks is generated from the catalogue's canonical
vector paths with deterministic augmentation. Shared augmentation includes:

- rotations covering the complete 0-359 degree range;
- scale and translation variation;
- line-width changes;
- small missing segments and added ink noise;
- mild affine and elastic deformation;
- mild aliasing variation.

The photo dataset additionally includes photographed-paper contrast, blur,
perspective, shadows, grid remnants, colour casts, compression artefacts, and
transparent raster margins. The canvas dataset additionally includes stroke
order changes, velocity-dependent width, endpoint gaps, overlapping strokes,
local erasures, and uneven pen pressure.

The training tool runs locally during model maintenance. Only the two compact
weight files, shared labels, individual model versions, validation metrics,
and normalization metadata are deployed. Runtime inference uses browser
JavaScript and typed arrays, with no network request and no training in the
user's browser.

### Rotation handling

Orientation is not discarded. The network estimates the canonical angle while
the deterministic verifier compares a small angle window around that estimate.
For rotationally symmetric symbols, the result records the smallest equivalent
angle and a symmetry period. Placement rotation remains independent from the
intrinsic correction angle.

The final angle used by the canvas is:

```text
placement rotation + intrinsic recognition correction
```

This permits semantic recognition without visually rotating all repeated
instances into one direction.

### Confidence and verification

Each network's top candidates are rescored using chamfer distance, IoU, aspect
ratio, endpoint count, junction count, and hole count. Photo and canvas model
metadata contain separate calibrated accept and review thresholds derived from
their respective held-out test sets.

- Above the accept threshold, the best candidate is applied automatically.
- Between accept and review thresholds, one grouped confirmation is shown.
- Below the review threshold, the group remains an unknown custom symbol.
- A large disagreement between neural and geometric scores always requires
  confirmation.

Threshold calibration must target a false automatic classification rate below
one percent on the held-out set. Unknown rejection is more important than
maximizing automatic coverage.

### Grouped confirmation

The confirmation interface displays one card per uncertain fingerprint with:

- the representative source image;
- occurrence count;
- best three catalogue candidates;
- confidence and detected orientation;
- choices to confirm a candidate, search the catalogue, or keep it unknown.

Confirming a candidate applies its semantic identity to every occurrence in
the group. A reversible correction is stored in local browser storage under
the source type, content fingerprint, and corresponding model version.
Changing either model version causes only decisions from that model to be
revalidated rather than silently discarded or blindly trusted.

## Semantic Action Model

Raster appearance and magical meaning remain separate. An imported image
action keeps its original asset for rendering and receives an optional
semantic reference:

```js
{
  type: "image",
  assetId: "wha-custom-1",
  semantic: {
    element: "Solidification",
    kind: "sign",
    source: "confirmed",
    confidence: 1,
    recognizer: "photo",
    modelVersion: "photo-symbol-net-v1"
  }
}
```

The grammar consumes confirmed semantics and high-confidence verified
semantics. It ignores unknown and unconfirmed candidates. The renderer still
draws every image regardless of semantic status.

For known external catalogue names, the importer records the catalogue kind as
the semantic kind even when WHA Spell Maker stores the symbol in another
collection for radial placement. Thus `sigil_Crystalize` can remain visually
repeated as an annular placement while all four instances contribute `Cristal`
sigil semantics.

Native share parsing and serialization preserve the optional semantic object
with strict catalogue validation. Legacy documents without semantic metadata
continue to work unchanged.

## Canvas Activation Flow

At activation time, the application follows this order:

1. Detect the active spell boundary and nested rings.
2. Use existing vector actions directly when their catalogue identity is
   already known.
3. Segment freehand strokes into candidate symbol groups.
4. Retrieve cached group decisions by source type, fingerprint, and model
   version.
5. Run the canvas neural network only for unresolved unique freehand groups.
6. Run the photo neural network only for unresolved photo or raster groups.
7. Verify candidates geometrically and apply the confidence policy.
8. Request grouped confirmation for uncertain groups.
9. Build the canonical spell recipe from confirmed semantics.
10. Produce an ordered manifestation timeline.
11. Activate the 3D renderer only after the recipe snapshot is complete.

Inference is not performed every animation frame. Results are cached until the
source strokes, imported asset, or model version changes.

If one neural model fails to load or the browser lacks a required operation,
the deterministic matcher remains available for that source type and the UI
reports which recognition mode is reduced. Failure of the photo model does not
disable canvas recognition, and failure of the canvas model does not disable
photo recognition. Activation never fails solely because either neural
classifier is unavailable.

## Ordered Transformation Timeline

The grammar gains a serializable `timeline` generated from semantic roles,
material compatibility, and explicit combination rules. Operations are not
merely sorted by their current storage order. The canonical transformation
stages are:

```text
material acquisition
shape formation
scale transformation
phase/state transformation
fracture or subdivision
release and motion
targeting and spatial propagation
stabilization/lifecycle
```

Each stage contains an identifier, duration fraction, consumed operations,
input material, output material, form, and visual transition. Unsupported or
contradictory stages produce warnings and remain visible in the ritual details.

The selected flower-crystal rule activates when the confirmed recipe includes
`Eau`, `Fleur`, and `Cristal` with `Agrandissement`, `Crush`, and `Dispersion`.
`Solidification` strengthens the crystalline stage and `Cible` controls the
principal release axes, but neither is required to identify the base recipe.

The timeline is:

1. Gather or create water.
2. Form water into a radial flower with discrete petals.
3. Grow the flower according to Agrandissement count and relative symbol size.
4. Solidify and crystallize the water from the centre toward petal tips.
5. Fracture petals according to Crush count and symmetry.
6. Release fragments according to Dispersion positions.
7. Bias trajectories toward Cible/Viseur directions.
8. Fade, settle, or collide through the existing material particle lifecycle.

The rule is count-sensitive rather than hard-coded to one JSON file. Other
circles using the same semantic combination receive the same family of effect
with parameters derived from their geometry and symbol weights.

## Procedural 3D Flower

The manifestation renderer gains a procedural flower effect driven entirely
by the timeline. It does not use a copied illustration or a remote model.

The flower is built from instanced petal geometry around a central core. Petal
count and radial layers are bounded by quality settings rather than matching
the raw action count one-for-one. This keeps mobile rendering stable.

Visual phases:

- Water formation uses translucent blue material, soft surface motion, and
  droplets following petal curves.
- Enlargement scales petal length, width, and radial reach without changing
  the spell origin.
- Crystallization sweeps outward, increasing opacity, angular faceting,
  refraction colour, and material rigidity.
- Fracture replaces petal instances with bounded shard bodies and particle
  fragments.
- Dispersion and targeting apply impulses from the analysed sign geometry.
- Existing material collision and environment-response systems handle impacts,
  settling, and lifetime cleanup.

The effect uses deterministic seeded variation from the canonical spell ID so
replaying the same circle produces the same petal layout and fracture pattern.

Reduced-motion mode skips rapid camera or bloom changes and shortens the
fracture transition without removing the semantic stages.

## Module Boundaries

The implementation should introduce focused modules rather than adding all
logic to `app.js`:

```text
photo-symbol-recognition-model.mjs
  photo/raster model loading, quantized inference, orientation output

canvas-symbol-recognition-model.mjs
  native-stroke model loading, quantized inference, orientation output

symbol-neural-runtime.mjs
  shared bounded tensor operations, labels, and model validation

symbol-recognition-groups.mjs
  fingerprints, imported-asset grouping, freehand clustering, cached decisions

symbol-recognition-hybrid.mjs
  neural/geometric score fusion, confidence policy, unknown rejection

manifestation-timeline.mjs
  pure ordered stage construction from a canonical recipe

flower-crystal-manifestation.mjs
  deterministic procedural petal and fracture parameters
```

`photo-import.mjs` and `drawing-recognition.mjs` expose shared preprocessing and
template verification functions. `wha-spell-maker-import.mjs` adds semantic
kind metadata for known cross-collection symbols. `spell-grammar.mjs` consumes
confirmed semantic image actions and creates the timeline. `immersive-3d.mjs`
or its existing effect registry instantiates the flower renderer. `app.js`
coordinates the UI but does not own model math or timeline rules.

## Error Handling and Safety

- Reject malformed photo or canvas model files, non-finite weights, invalid
  class counts, incompatible input channels, and unsupported model versions.
- Bound decoded image dimensions, masks, occurrence counts, inference batches,
  petal counts, and shard counts.
- Continue enforcing safe embedded PNG, JPEG, and WebP data URLs.
- Never fetch a custom image URL during recognition.
- Never execute data from imported metadata.
- Treat all model outputs as untrusted candidates until catalogue validation.
- Keep uncertain recognition visible and reversible.
- Fall back to deterministic matching when model initialization or inference
  fails.

## Performance Targets

- Analyse each unique imported image once, regardless of occurrence count.
- Cache recognition by source type, content fingerprint, and the corresponding
  photo or canvas model version.
- Complete inference and verification within 150 ms per unique group on a
  typical desktop and within 500 ms on a mid-range mobile device.
- Perform no recognition work inside the 3D animation loop.
- Keep both neural weight files and their shared metadata below 1.5 MiB
  combined.
- Bound the flower effect to 24 visible petals and 160 active shard/particle
  bodies on high quality, with lower mobile quality caps.

## Testing

### Recognition tests

- Every catalogue symbol is classified by both networks across the full
  rotation range using source-appropriate held-out distortions not used to
  generate training batches.
- Photo and canvas orientation estimates respect each symbol's rotational
  symmetry.
- Automatic false classifications remain below one percent independently on
  both held-out sets.
- Unknown scribbles and ambiguous partial symbols are rejected.
- Photo-model failure preserves canvas-model recognition and activates the
  photo fallback.
- Canvas-model failure preserves photo-model recognition and activates the
  canvas fallback.
- No recognition test performs a network request.

### Grouping tests

- Fifty-five repeated references to one image create one recognition group and
  one confirmation.
- A correction updates all occurrences while preserving their individual
  transforms.
- Two different source images create two groups even when filenames collide.
- Identical decoded pixels with different filenames reuse one group.
- Cached decisions are revalidated after a model-version change.

### Import and grammar tests

- `sigil_Crystalize` inside a WHA `signs` collection renders in its original
  annular positions and contributes `Cristal` sigil semantics.
- Existing external signs remain signs and existing native JSON remains valid.
- The supplied complex JSON keeps all 132 drawable actions.
- Its four Crystalize occurrences are no longer reported as ignored signs.
- Unknown custom images remain drawable but do not modify the spell recipe.

### Timeline tests

- The selected recipe produces stages in the exact order water, flower,
  enlarge, crystallize, fracture, disperse, target.
- Stage parameters remain finite, bounded, deterministic, and count-sensitive.
- Removing Crystal disables crystalline material without removing the flower.
- Removing Crush preserves the enlarged crystalline flower instead of
  fracturing it.
- Removing Dispersion fractures petals locally without launching them.
- Opposed targeting signs produce balanced opposite release axes.

### Browser and 3D tests

- Imported custom groups show one confirmation card per unique fingerprint.
- Canvas activation recognizes rotated freehand symbols.
- Desktop and mobile views remain responsive during inference.
- The flower is visibly watery before crystallization and visibly faceted
  afterward.
- Fragment bodies disperse, collide, settle or expire, and are fully disposed
  when the effect stops.
- Reduced-motion mode remains usable and visually understandable.
- Existing water, fire, wind, earth, support, gallery, and editor flows do not
  regress.

Run the complete Node test suite, syntax checks, spell matrix validation,
security audit, public artifact audit, and a real-browser smoke test with the
supplied JSON before publication.

## Release Boundary

The feature is complete when:

- imported/photo and freehand sources use two specialized local neural models
  behind one grouped hybrid recognition pipeline;
- repeated images require at most one user correction per unique symbol;
- arbitrary placement rotation no longer prevents catalogue recognition;
- neither neural model uses an external AI service or recurring credit;
- `sigil_Crystalize` contributes correct sigil semantics from WHA imports;
- the selected recipe produces an ordered transformation timeline;
- the 3D view visibly performs the water-flower-crystal-fracture sequence;
- unknown symbols remain safe, visible, and explicitly unresolved;
- all automated and browser validations pass.

This release does not claim to infer the magical meaning of a genuinely new
symbol that has no catalogue equivalent or user-provided label.
