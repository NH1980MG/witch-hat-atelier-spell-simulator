# 3D Environment Long-Term Report

## Decision

Keep the current procedural Three.js scene as the fallback, then migrate props one by one to local `.glb` assets.

This avoids a paid dependency and keeps the simulator fast: no external network call is needed, and each asset can be loaded only when the 3D view opens.

## Asset Contract

The file `three-environment-assets.mjs` defines the first long-term asset contract:

- `lightHouse`: proportional light house, with sway, roof lift, and uproot states.
- `windTree`: taller tree, with sway, bend, and uproot states.
- `woodCrate`: crate, with slide, tip, and splinter states.
- `fieldStone`: low stone, with nudge, roll, and crack states.
- `grassDust`: ground patch, with ripple, dust, and scorch states.

Each asset has a future local `.glb` path, real-world dimensions in meters, and a procedural fallback builder name.

## Short-Term Bridge

The simulator can continue using its existing built-in geometry until files exist under:

```text
assets/3d/environment/
```

When the `.glb` loader is added, the runtime should attempt:

1. Load the local `.glb`.
2. Apply the manifest dimensions and scale.
3. Register reaction anchors for spell effects.
4. Fall back to the procedural builder if the asset is missing or too heavy.

## Performance Rules

- Load assets only when the 3D panel opens.
- Cache loaded models in memory during the session.
- Keep mobile fallback available for low-end devices.
- Prefer low-poly `.glb` files with compressed textures.
- Do not add physics for everything; use deterministic reaction states for house, tree, crate, stone, and grass first.

## Next Implementation Step

Add a small local GLB loader module when real model files are available, then wire `lightHouse` and `windTree` first because they are the most visible for wind spells.
