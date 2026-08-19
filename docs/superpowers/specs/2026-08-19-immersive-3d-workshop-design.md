# Immersive 3D Workshop Design

## Goal

Turn the current 3D spell preview into an interactive workshop while preserving
the deterministic spell model, the existing visual language, and mobile access.
The Minecraft application demo is explicitly out of scope.

## Experience

- Every Rapier reaction state has a visible consequence: push, heat, scorch,
  fire, water, extinguishing, frost, crystal, adhesion, light, and restoration.
- The consequence follows the target, reflects accumulated intensity, and is
  removed or replaced when the material state changes.
- An Interact mode lets the user select a scene object, inspect its material and
  state, move unanchored props across the surface, and reset one object or the
  complete scene. Anchored scenery remains inspectable but cannot be dragged.
- Moving or rotating the spell updates its Rapier field continuously.
- Four camera presets are available: orbit, tabletop, first-person, and photo.
- Generated spatial audio and optional mobile vibration provide restrained
  feedback without external media files. Both respect user/browser preferences.
- Four guided experiments teach collision and material consequences.
- Procedural decorative creatures use recognizable silhouettes; Scalewolf keeps
  its detailed renderer and other creature families receive dedicated profiles.

## Architecture

`immersive-3d.mjs` owns DOM-free reaction metadata, camera presets, experiment
progress, and interaction-state helpers. `rapier-physics-world.mjs` remains the
source of physical/material truth. `app.js` maps these pure descriptions to
Three.js objects and UI behavior. Existing scene builders and deterministic
activation snapshots remain unchanged.

## Constraints

- Plain HTML, CSS, JavaScript modules, Three.js, and vendored Rapier only.
- No network-loaded 3D, audio, or image assets.
- English and French interface parity.
- Mouse, touch, iPad, and phone controls remain usable.
- No changes under `minecraft-mod/` or to any application-demo artifact.

## Publication

Run syntax, focused, full, and browser smoke checks, then publish the web-only
commit to the GitHub repository used by GitHub Pages.
