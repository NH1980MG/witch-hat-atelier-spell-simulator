# Sequenced Flower / Crystal Manifestation QA

## Integrated release check, 2026-09-06 UTC

Main reran the full suite (704 passing), matrix (65,600 unique deterministic
recipes and plans), security audit and public artifact audit. The real browser
imported a water/flower/crystal/enlargement/crush/dispersion circle and activated
the sequenced recipe. The main 3D environment, petal formation and released
fragments were visible on replay. A CSP block discovered during this check was
fixed with `wasm-unsafe-eval` only; no further WASM compilation failure appeared
after navigation. Rapier's pre-existing initialization deprecation remains.

The observations below are the earlier isolated-module checks, not a substitute
for these integration results. Touch-device and real-photo validation is limited.

## Scope and status

Implemented in `manifestation-timeline.mjs`, `flower-crystal-manifestation.mjs`,
`manifestation-synthesis.mjs`, `immersive-3d.mjs`, and the explicitly delegated
3D sections of `app.js`. No commits, runtime dependencies, remote models, or
spell-file-specific exceptions. Main has connected grammar counts, canonical
spell identity and separate target/release axes to synthesis.

The renderer uses original closed, curved, tapered petal geometry in two
instanced meshes: smooth translucent water and flat-faceted crystal. A UV
shader mask reveals crystal from the petal centre to its tip. Petals grow in
two radial layers, enlarge, fracture once, and release seeded shard instances.

## Integration contract

`synthesizeManifestation` accepts its existing input plus `spellId`,
`sigilCounts`, `signCounts`, `quality`, and `reducedMotion`. Counts must already
be accepted canonical semantics, not candidates or unconfirmed image labels.

- `Fleur` count or `form.flower` enables real flower geometry.
- `Cristal` count or `state.crystallize` enables crystallization.
- `state.resize` (also `enlarge`) enables enlargement. The existing
  Agrandissement count/axis count controls its bounded strength.
- `state.crush` enables fracture. Sign counts control strength, but do not
  resurrect an operation rejected by grammar.
- `form.dispersion` enables release; `target.aim` / `crosshair` biases it.
- Removing Cristal does not remove the flower. Removing Crush creates no
  fragments. Removing Dispersion produces local fracture without launch.
- `geometry.targetAxes` and `geometry.releaseAxes` accept arrays of local 3D
  vectors (`[x, y, z]` or `{ x, y, z }`). Preserve opposed axes individually;
  do not average them. Up to 16 axes are retained. `geometry.vector` is the
  fallback target axis. Canvas-to-world coordinate conversion belongs to main.
- `geometry.relativeSymbolSize` contributes bounded enlargement strength.

The result has `form.id === "flower"`, `timeline`, `flower`, `geometry`, and
`spellId`. The full water/crystal/fracture specialization is
`water.crystal-flower-fracture`, even if Fleur or Cristal was the primary sigil
when canonical counts also contain Eau. A caller-supplied canonical spell ID
seeds petals and fragments; the standalone synthesis fallback hashes normalized
material/operation/geometry inputs deterministically.

`buildManifestationTimeline` returns deeply frozen stages with millisecond
`start`/`duration`, consumed operations, material transitions, and stage-specific
strength. Unsupported operations remain in `secondaryOperations`. Targeting is
consumed by the final `directed-dispersion` stage rather than a later separate
stage, so it influences release impulses at release time.

```js
const controller = createFlowerManifestation3d({
  THREE,
  plan: recipe.manifestationPlan,
  radius: auraRadius,
  origin: { y: baseY },
  quality: "high", // "mobile" lowers geometry/body caps
  reducedMotion,
});
parent.add(controller.group);
controller.update(elapsedSeconds * 1000);
controller.setPhysics({ RAPIER, world: runtime.world });
controller.dispose();
```

App wiring is present in `addManifestationPlanEffect3d` and
`rebuildThreeSpell`. Flower effects bypass legacy base-material, grammar,
generic-core, particle, rotation and tilt overlays. Their origin stays fixed.
The active duration is extended, within 30 seconds, to include timeline and
fragment expiry. The async physics bridge attaches the existing runtime world;
its normal frame loop remains the only world stepper.

`disposeObject3d` collects custom disposal hooks before invoking them, then
traverses remaining generic resources. The controller removes its own subtree,
shard bodies, instanced-mesh buffers, geometries, and materials exactly once.
Replacement, clear, expiry, and close already use that shared app disposer.
Rewinding `update` removes existing shard bodies and allows deterministic replay.

## Bounds and deliberate simplifications

- High quality: at most 24 petals and 160 live shard bodies; mobile: 12/72;
  reduced motion: at most 48 shards, no angular velocity, softer release and
  gravity. The visual fracture transition is at most 240 ms in reduced motion.
- Growth is capped at 2.5x. Fragment lifetime is at most 4200 ms, or 1800 ms
  for reduced plans. Droplets are visual points and vanish before fracture.
- Fragments are seeded faceted primitives sampled along each petal, not a
  runtime Voronoi/cell decomposition. This avoids a geometry dependency and
  keeps allocation predictable while preserving visible origin correspondence.
- Each physical shard uses a small ball collider, CCD, bounded mass, friction,
  restitution and damping. It collides with the existing world/targets. The
  controller does not step/free the borrowed world or remove unrelated bodies.
- Without Rapier, deterministic analytic trajectories settle on a local floor
  and expire. This fallback does not collide with arbitrary environment props.
- Generic area forces are disabled for this flower specialization: they would
  prematurely wet/crystallize and radially push every nearby target, bypassing
  the sequence and doubling shard impulses. Physical collision impulses work;
  shard-contact-driven wetness/frost material-state propagation is not added.
- Extra unsupported operations are retained as timeline metadata rather than
  adding simultaneous legacy effects. No fluid solver or camera/bloom effects
  are introduced.

## Validation

Focused checks cover ordered/optional stages, immutable deterministic plans,
count-sensitive bounds, finite geometry, opposed axes, actual vendored Three
meshes, growth and material sweep state, one-shot fracture, real Rapier bodies,
pre-release zero velocity, expiry, replay, external-body preservation, mobile
and reduced-motion caps, and instance/geometry/material disposal.

`tests/flower-app-3d.test.mjs` executes the actual app manifestation creation
and cleanup function bodies against vendored Three.js without a WebGL context.
It verifies milliseconds conversion, real petal instances, generic-particle
bypass, and no duplicate disposal. It also checks the app bridge wiring.

```sh
node --check app.js
node --test tests/manifestation-timeline.test.mjs tests/flower-crystal-manifestation.test.mjs tests/manifestation-synthesis.test.mjs tests/manifestation-synthesis-flower.test.mjs tests/immersive-flower.test.mjs tests/flower-app-3d.test.mjs tests/immersive-3d.test.mjs tests/manifestation-lifecycle.test.mjs tests/particle-physics.test.mjs tests/rapier-physics-world.test.mjs tests/activation-snapshot.test.mjs
node scripts/validate-spell-matrix.mjs
```

Matrix validation passed with 65,600 tested, unique, deterministic recipes and
60,702 distinct plans. The final focused 3D/lifecycle/physics/synthesis suite
passed 80/80 tests, including two main-integration regressions. A fresh real
`composeSpellRecipe` call produces `water.crystal-flower-fracture`, the six
expected stages, and no ignored signs. Additional regressions cover that real
grammar path, opposed axes, and WHA annular crystal semantics. Main owns the
final whole-repository suite and matrix rerun. The vendored Rapier initializer
emits an existing deprecation warning; no initialization failure.

## Browser QA

Open `tests/flower-sequence-browser.html` through a loopback static server.
It imports only local modules and offers stage snapshots, replay, reduced
motion, mobile quality and clear. It shows active shard/body counts and GPU
geometry counts. The ground is one unrelated fixed body, so after clear the
body count should be one and only the floor geometry should remain allocated.

Observed in the isolated WebGL page: visible nonblank curved flower petals,
growth, enlargement, a white faceted centre with blue water tips during the
crystal sweep, partial fracture into discrete shards, and no shader errors.
Static stage snapshots freeze world stepping; use Replay to inspect flight
and ground collisions. The main app also opened without console errors and
successfully imported a minimal WHA Flower document as an editable seal/sigil,
reporting "Fleur en croissance". Full multi-symbol imported-document activation
and recognition UI smoke testing remain with main. This worker did not claim
the full app crystal sequence was visually verified.
