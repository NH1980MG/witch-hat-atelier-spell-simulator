# Spell Matrix And Fidelity Audit Design

## Objective

Expand the simulator's controlled recipe matrix from 6,669 no-support recipes
to exactly 13,338 support-aware variants, while correcting known divergences
between the grammar, recognition model, shoe policy, and Three.js rendering.

The release must also produce a complete fidelity report for the mechanics that
already exist. The report must distinguish documented rules from reasonable
inferences and simulator-only experiments. It must not describe every generated
recipe as canonical.

## Meaning Of 13,338

The matrix is a deterministic validation surface, not the total number of
possible spells in the Witch Hat Atelier setting.

The project currently contains:

- 9 selectable sigils;
- 38 selectable signs;
- 2 signs per matrix recipe, with repetition allowed and order ignored;
- 2 support modes: `none` and `shoe`.

The exact count is:

```text
unordered sign pairs with repetition = 38 * 39 / 2 = 741
recipes per support = 9 * 741 = 6,669
support-aware variants = 6,669 * 2 = 13,338
```

Each matrix entry therefore means one sigil, one unordered pair of signs, one
fixed reference direction, and one support. It does not cover three or more
signs, multiple sigils, nested rings, linked seals, split seals, or arbitrary
drawn geometry.

## Source Hierarchy

Fidelity decisions use this order:

1. manga panels and official material supplied by the user;
2. chapter-referenced material on the independent Witch Hat Atelier wiki;
3. the older Fandom wiki when it adds a useful reference;
4. forum discussions only to identify uncertainty or competing readings.

Primary research pages:

- [Magic](https://witchhatatelier.telepedia.net/wiki/Magic)
- [Signs Explained](https://witchhatatelier.telepedia.net/wiki/Signs_Explained)
- [Sigils Explained](https://witchhatatelier.telepedia.net/wiki/Sigils_Explained)
- [Sylph Shoes](https://witchhatatelier.telepedia.net/wiki/Sylph_Shoes)
- [Sylph Shoes Seal](https://witchhatatelier.telepedia.net/wiki/Sylph_Shoes_Seal)

The existing conversation captures remain visual references for sign balance,
sign rotation, ring closure, the shoe underside, and the project's current sign
icons. Those temporary images are not committed to the public repository.

## Fidelity Levels

Every sign profile, special interaction, and support adaptation receives one of
three provenance levels:

- `documented`: supported by a cited panel, official material, or a wiki rule
  with a precise manga reference;
- `inferred`: follows consistently from documented mechanics but is not stated
  as a complete rule;
- `experimental`: a deterministic simulator behavior used where the source
  material does not establish an answer.

Generated shoe variants remain activatable so the matrix contains 13,338
usable results. Non-documented behavior must be visibly labelled `inferred` or
`experimental`; it must never silently fall back to `documented`.

Warnings, provenance, and supporting rule IDs are part of the recipe output and
of its determinism checks.

## Canonical Mechanical Core

The implementation treats the following as the reliable model:

- a sigil determines the material, aspect, or family of the spell;
- signs modify form, movement, target, scope, state, or relationship;
- size generally increases power;
- drawing accuracy generally increases stability and duration;
- directional sign size and placement contribute pressure vectors;
- balanced directional signs produce a stable result;
- deliberate imbalance redirects the result toward the stronger pressure;
- tilting directional signs adds rotation while reducing reach;
- non-directional signs do not gain an invented rotation response;
- signs outside, or not connected to, the active ring do not contribute;
- a complete outer ring is required for normal activation;
- a ring without sigil or signs produces an uncontrolled discharge;
- documented inversions produce their opposite operation;
- linked, nested, and split-ring seals are valid concepts but are not part of
  the 13,338 count.

The audit will not invent numeric canon for power, duration, stability, or
pressure. Project values are simulation coefficients and will be documented as
such.

## Support Semantics

`none` means the seal acts from its paper without attaching its result to a
carrier object.

`shoe` means a small seal is fixed under a pair of shoes. The support changes
where the seal is carried, how its ring may be closed, and whether a movement or
targeting sign acts on the shoes. The shoe material does not add elemental
power or replace the sigil's effect.

The documented Sylph-shoe reference is the high-confidence special case:

- the main seal is divided across the soles and activates when the feet meet;
- Wind Underfoot supplies the aspect;
- convergence and levitation participate in the known seal;
- the length and straightness of the relevant column geometry influence speed;
- the purpose of the inconsistent heel motif remains unknown.

The simulator will not label heel stabilization, braking, or independent
levitation as canon. Such behavior may appear only as an explicitly
experimental safety interpretation.

For arbitrary shoe recipes:

- carrier-targeting and movement signs may move or orient the shoes;
- material effects still originate at the seal under the soles;
- an effect that has no carrier relationship affects the space or surface below
  the shoes instead of transforming the shoes without evidence;
- dangerous combinations retain their danger instead of receiving a stability
  bonus merely because a shoe is selected;
- the existing maximum shoe-seal diameter remains enforced independently of
  the recipe matrix.

## Model Boundaries

The current implementation duplicates key decisions across `app.js` and
`spell-grammar.mjs`. The change introduces small DOM-free modules rather than a
full application rewrite.

### `spell-model.mjs`

Owns normalized recognized spell data:

- one deterministic dominant-sigil rule shared by text and rendering;
- connected and ignored sign sets;
- pressure vectors, symmetry, tilt, rotation, and reach;
- exact semantic values used to identify a recipe;
- an immutable activation snapshot.

### `support-policy.mjs`

Owns support behavior:

- supported IDs and fallback validation;
- size limits;
- carrier relationship and activation mode;
- shoe effect policy from structured sign operations;
- stability, danger, provenance, and warnings;
- a structured support plan that rendering can consume without parsing French
  effect labels.

### `spell-grammar.mjs`

Remains the pure recipe composer:

- combines normalized sigil and sign operations;
- applies compatibility and inversion rules;
- retains ignored-operation warnings;
- builds collision-resistant IDs from all semantic inputs;
- emits fidelity metadata and rule references;
- validates both support modes in the 13,338 matrix.

### `app.js`

Remains responsible for UI and Three.js orchestration, but consumes the shared
model and support plan. It no longer chooses a different dominant element,
recomputes shoe semantics from translated strings, or rereads mutable drawing
state during an active animation.

## Known Corrections Included

The implementation must correct the following audit findings:

- recipe IDs currently round geometry too aggressively and omit semantic
  fields, allowing different recipes to collide;
- the grammar and renderer currently use different dominant-sigil tie breaks;
- shoe behavior is outside the matrix and therefore is not genuinely tested by
  simply doubling the loop;
- inversion changes text but often does not change the operation;
- ignored incompatible operations can incorrectly restore `documented`
  confidence;
- the matrix script accepts any count above 1,000 instead of requiring 13,338;
- distinct-plan fingerprints currently omit support;
- determinism checks omit warnings, provenance, effects, and mechanics;
- one traction/rotation interaction uses different sign requirements in the UI
  and grammar;
- active shoe effects reread mutable UI state instead of using the activation
  snapshot;
- the real drawn seal and paper do not always follow the sole support in 3D;
- an unreachable support branch remains in the generic element renderer;
- dangerous and stable shoe flags can currently produce the wrong stability
  result.

## Recipe Identity And Determinism

Recipe identity uses a stable canonical serialization rather than rounded
display text. It includes:

- normalized sigil IDs and counts;
- normalized sign IDs and counts;
- connected and ignored signs;
- direction and inversion state;
- support ID;
- exact normalized geometry coefficients used by the recipe;
- rule-set version.

Display rounding must never affect identity. Two semantically equal inputs must
produce the same ID, regardless of input order. Two semantically different
inputs must not share an ID.

The matrix compares the complete recipe result across repeated composition:
ID, label, effects, mechanics, operations, parameters, warnings, provenance,
support plan, and rule references.

## Interface

The details panel shows a compact fidelity block for the current result:

- fidelity level;
- support mode;
- documented rules that contributed;
- inferred or experimental assumptions;
- ignored or incompatible signs;
- balance, direction, rotation, and reach summary.

The wording is available in French and English. The interface does not display
13,338 cards. The total is shown as a tested recipe count in the appropriate
information or tutorial section.

## Tutorial Update

The bilingual tutorial is revised in the same release so it describes the
implemented model rather than the previous simplified behavior.

It explains:

- what the 13,338 count includes and, just as importantly, what it excludes;
- the difference between a documented, inferred, and experimental result;
- the roles of the sigil, signs, and outer ring;
- connected versus ignored marks;
- balance, deliberate imbalance, size, placement, tilt, rotation, and reach;
- documented inversion versus an unsupported inverse;
- how the no-support and shoe variants differ;
- the documented Sylph-shoe construction and the simulator's experimental
  behavior for arbitrary shoe recipes;
- the 5 cm to 5 m global diameter range and the smaller shoe-support limit;
- how to read fidelity warnings before activation.

Tutorial examples use project-generated diagrams and interface captures only.
They do not embed manga panels or copied wiki artwork.

## Illustrated Library

The public gallery regains an image for every listed circle. The historical 33
PNG crops found in Git history are not restored to the public branch because
they were extracted from manga or wiki reference panels.

Instead, the gallery uses original, project-owned schematic thumbnails:

- one local SVG per listed spell, with no remote hotlinking;
- a common square view box, transparent or parchment-colored background, and
  thin ink-like strokes that remain sharp at every card size;
- geometry generated from the simulator's canonical sigil and sign vocabulary;
- distinct compositions derived from each spell's documented or inferred
  mechanics, without tracing the protected reference image;
- descriptive bilingual alternative text;
- the same Vision, Mixed, Niche, Ancient Forbidden, and Ancient Non-Forbidden
  categories already present in the gallery;
- a visible fidelity badge so a schematic is not mistaken for an official
  reproduction.

The page copy states that the thumbnails are simulator reconstructions. The
source links remain available for research, but the public gallery is entirely
self-contained and remains compatible with its restrictive Content Security
Policy.

## Fidelity Report

Create `docs/mechanics-fidelity-report.md` with:

- scope and source hierarchy;
- exact matrix calculation;
- one row for every current sigil and sign profile;
- documented function and source where available;
- the project's simulated interpretation;
- confidence level and unresolved questions;
- support behavior and Sylph-shoe exceptions;
- ring, balance, placement, rotation, inversion, linking, nesting, size,
  precision, and duration audit;
- every corrected discrepancy, with the affected file or module;
- remaining experimental behaviors and explicitly deferred mechanics.

The public report links to research pages but does not embed copied manga panels
or wiki screenshots.

## Testing

Automated validation must cover:

- exact matrix total `13,338`;
- exact split `6,669 none` and `6,669 shoe`;
- unique IDs across the matrix;
- stable complete output across repeated composition;
- sign-pair order invariance;
- support-sensitive plan fingerprints;
- rejection of unknown support IDs;
- geometry cases that previously collided;
- shared dominant-sigil decisions;
- documented inversions and honest unsupported inversions;
- confidence never rising after an incompatible operation is ignored;
- balanced, unbalanced, and tilted directional-sign fixtures;
- disconnected signs being ignored;
- bare-ring discharge and incomplete-ring rejection;
- documented Sylph-shoe fixture;
- representative inferred and experimental shoe fixtures;
- shoe size rejection;
- immutable activation snapshots;
- finite and grounded Three.js support geometry.

Browser verification covers French and English details, support switching,
representative no-support and shoe recipes, and activation warnings. Three.js
screenshots and canvas-pixel checks cover at least Water, Fire, Wind, and Earth
with and without the shoe support. The shoe view must show the paper fixed under
the soles and any grounded Earth geometry touching the desk.

Library and tutorial verification additionally covers:

- every library card has one local original SVG that returns HTTP 200;
- every thumbnail has a non-empty bilingual accessible name;
- no library asset is byte-identical to a removed historical PNG crop;
- no library or tutorial page loads a remote image;
- the five category counts and spell names remain unchanged;
- the tutorial contains the exact 13,338 calculation in both languages;
- the tutorial distinguishes documented, inferred, and experimental behavior;
- desktop and mobile screenshots contain no empty image boxes, overflow, or
  clipped text.

## Non-Goals

- Claiming that the manga contains exactly 13,338 spells.
- Treating fan explanations as canon.
- Assigning undocumented elemental affinities to shoe materials.
- Explaining the inconsistent heel motif as a confirmed mechanism.
- Adding every possible multi-sigil, three-sign, linked, or nested seal to this
  matrix.
- Copying or publishing manga panels and wiki artwork.
- Restoring the historical library PNG crops to the public GitHub Pages build.

## Completion Criteria

The work is complete when:

- the executable validator reports exactly 13,338 deterministic recipes;
- support behavior is part of the tested recipe plan, not a label-only suffix;
- all known audit discrepancies listed above are fixed or explicitly reported
  as deferred with a reason;
- the fidelity report covers existing mechanics as well as the new support
  variants;
- the bilingual tutorial documents the final mechanics and matrix scope;
- every public library card contains an original local schematic thumbnail;
- automated tests, syntax checks, browser checks, and 3D visual checks pass;
- the public GitHub Pages build contains the updated simulator and report.
