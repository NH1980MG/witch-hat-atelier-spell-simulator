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

## Non-Goals

- Claiming that the manga contains exactly 13,338 spells.
- Treating fan explanations as canon.
- Assigning undocumented elemental affinities to shoe materials.
- Explaining the inconsistent heel motif as a confirmed mechanism.
- Adding every possible multi-sigil, three-sign, linked, or nested seal to this
  matrix.
- Copying or publishing manga panels and wiki artwork.

## Completion Criteria

The work is complete when:

- the executable validator reports exactly 13,338 deterministic recipes;
- support behavior is part of the tested recipe plan, not a label-only suffix;
- all known audit discrepancies listed above are fixed or explicitly reported
  as deferred with a reason;
- the fidelity report covers existing mechanics as well as the new support
  variants;
- automated tests, syntax checks, browser checks, and 3D visual checks pass;
- the public GitHub Pages build contains the updated simulator and report.
