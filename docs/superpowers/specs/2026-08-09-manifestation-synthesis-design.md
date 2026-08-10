# Manifestation Synthesis Design

Date: 2026-08-09
Status: implemented, pending publication verification

## Objective

Replace the current accumulation of independent visual layers with one coherent
physical manifestation whenever a recipe combines compatible sigils and signs.
The simulator must show what the complete spell does, not a stack of unrelated
water, fire, wind, earth, and sign effects.

The implementation remains deterministic, static-hosting compatible, and
bounded enough to run smoothly in the existing Three.js scene.

## Fidelity Rules

Every manifestation rule carries one of the existing fidelity levels:

- `documented`: supported by the project references or a stable published
  source;
- `inferred`: a physically consistent interpretation of incomplete material or
  a clearly identified community idea;
- `experimental`: a useful simulator behavior for an unresolved mechanic.

Community ideas may influence inferred recipes, but the interface and
documentation must never present them as canon. The renderer must not invent a
new sigil meaning merely to make a combination visually interesting.

## Selected Architecture

Add a pure manifestation-synthesis module between `spell-grammar.mjs` and the
Three.js renderer.

```text
recognized drawing
  -> spell grammar and geometry analysis
  -> material signature
  -> manifestation synthesis
  -> primary physical manifestation + independent secondary layers
  -> activation snapshot
  -> Three.js renderer
```

The module receives only serializable recipe data and returns a frozen,
serializable plan. It has no DOM, canvas, or Three.js dependency.

## Synthesis Model

The material stage selects the substance or physical carrier:

- water;
- fire or heat;
- soil, stone, sand, or mud;
- existing or created air;
- steam, mist, dust, magma, crystal fragments, or another documented mixture;
- raw ring energy when no sigil supplies a material.

Signs then transform that material in a fixed order:

```text
supply -> state -> form -> motion -> pressure -> direction -> scope -> target
```

The result contains:

```js
{
  id: "mud.dense-projection",
  fidelity: "inferred",
  material: { id: "mud", phase: "slurry", density: 1.35 },
  form: { id: "column", scale: 1 },
  motion: { id: "project", vector: [0, 1, 0], spin: 0 },
  lifecycle: { growth: "continuous", stop: "dispose" },
  consumedOperations: ["material.water", "material.earth", "pressure.crush"],
  secondaryOperations: [],
  supportInteraction: { mode: "surface", transfersForce: true }
}
```

`consumedOperations` records the layers already represented by the synthesized
manifestation. The renderer must not draw these operations again. Only
operations in `secondaryOperations` can produce additional visual layers.

## Geometry and Balance

Placement remains part of the spell rather than a cosmetic detail:

- relative sign size changes its contribution strength;
- radial position determines the point at which pressure or direction enters
  the spell;
- sign rotation changes direction and can introduce spin;
- bilateral or radial symmetry improves balance and stability;
- unequal directional signs create lateral drift toward the stronger side;
- disconnected marks do not contribute;
- an incomplete outer ring prevents activation;
- secondary rings can act as a regulator, barrier, protector, or propulsion
  stage when the recognized operations support that role.

These properties are normalized into finite parameters before synthesis. No
renderer may infer geometry directly from translated labels.

## Primary Recipes

The four base elements receive explicit pair and multi-material families so the
most common combinations have recognizable behavior:

| Inputs | Primary manifestation |
| --- | --- |
| Water + Earth | Mud, slurry, wet sand, or compact clay according to density and pressure |
| Water + Fire | Steam, boiling spray, or heated water according to supply and confinement |
| Water + Wind | Mist, spray, rain, or a pressurized jet according to concentration and direction |
| Earth + Fire | Heated stone, molten material, ash, or vitrified fragments according to intensity |
| Earth + Wind | Dust, sand stream, debris field, or compact projectile according to form |
| Fire + Wind | Directed flame, fire vortex, heated current, or dispersed sparks according to rotation |

Three- and four-material inputs use the same stages and dominant-material rules
rather than an exhaustive combinatorial table. This keeps the runtime finite
without pretending that every theoretical combination has a canonical result.

Required examples:

- Water + Earth + Crush becomes one dense mud projection.
- Water + Wind + Concentration becomes one pressurized mist jet.
- Crystal + Crush + Column becomes propelled fragments and may gain a
  protective barrier from a compatible secondary ring.
- Fire + Wind + Rotation becomes one flame vortex without separate wind
  zigzags.
- Water + Levitation becomes a suspended water mass that grows while active and
  disappears when activation ends.

## Generic Synthesis

Recipes without a specialized family use a generic resolver:

1. choose the dominant material and compatible secondary material;
2. resolve state changes before shape;
3. combine compatible motion operations into one vector field;
4. reject or warn on contradictory operations;
5. consume every operation represented in the primary result;
6. preserve only physically independent operations as secondary layers;
7. attach fidelity and warning metadata to uncertain outcomes.

The resolver must prefer a conservative unknown or weak result over a visually
confident but unsupported interpretation.

## Supports

A support changes contact, scale, force transfer, and carrier movement. It does
not replace the spell's manifestation.

No support remains the default. Shoe support remains restricted to physically
small circles and keeps the parchment under the sole. A support-aware plan can
move the shoes, transfer force to the table, wet or burn nearby material, or
remain grounded according to the synthesized manifestation. It cannot silently
add levitation, wind, or propulsion that the recipe does not contain.

## Runtime Lifecycle

Every manifestation implements the same lifecycle:

- `build`: allocate meshes, materials, particles, and lights;
- `update`: advance deterministic animation from elapsed activation time;
- `stop`: stop growth, emission, and motion immediately;
- `dispose`: remove scene objects and dispose geometry, materials, and textures.

Continuous water spread and levitating-mass growth are bounded by scene limits
and activation duration. Deactivation, recipe replacement, closing the 3D view,
or navigation must stop and dispose every active manifestation.

## User Interface

The Details and Read surfaces show:

- the synthesized manifestation name;
- its material, form, motion, and support interaction;
- independent secondary effects only;
- fidelity level and concise warnings;
- stability and drift resulting from geometry.

The interface must not list consumed signs as separate visible effects. Their
contribution remains visible in the recipe explanation.

## Performance Boundaries

- Reuse shared geometries and materials where practical.
- Cap particle counts per manifestation and scale density through sampling.
- Avoid one mesh per theoretical variant; plans are data, not prebuilt scenes.
- Keep update loops allocation-free after `build`.
- Dispose all GPU resources owned by a manifestation.
- Maintain the current static deployment and local Three.js dependency.

## Validation

Automated tests must cover:

- deterministic plans for identical recipes;
- all specialized base-element families;
- generic synthesis for the remaining validated matrix;
- consumed operations never appearing as duplicate renderer layers;
- contradictory and unknown operations producing warnings;
- size, rotation, placement, symmetry, and secondary-ring parameters;
- support interaction without support-created magic;
- complete stop and disposal on deactivation;
- finite numbers and bounded particle counts for every plan;
- bilingual manifestation labels and fidelity notices.

Browser validation must compare representative 3D captures for water, mud,
steam, mist, dust, magma, crystal fragments, and flame vortex scenes on desktop
and mobile. Canvas and 3D pixel checks must confirm that each scene is nonblank
and that no stale effect remains after stopping a spell.

## Scope Boundaries

This design does not attempt to enumerate arbitrary combinations of every
sigil. It does not introduce a general-purpose fluid or rigid-body physics
engine. It does not classify community interpretations as official lore. It
provides a finite physical synthesis layer that can be extended recipe by
recipe without changing the core grammar.
