# Scalewolf 3D And Library Priority Design

Date: 2026-08-11
Status: approved

## Scope

- Redraw the 2D workshop immediately after leaving the 3D view so no activation
  aura remains frozen behind the closed overlay.
- Replace the placeholder scalewolf silhouette with a readable procedural wolf:
  tapered body, chest, neck, angular head, muzzle, nose, ears, articulated legs,
  paws, curved tail, eyes, and dorsal scales.
- Derive a bounded creature motion profile from every sign pair. Form, motion,
  state, target, scope, relation, and power operations alter the same creature
  instead of replacing it with unrelated generic geometry.
- When the library filters one sigil, rank recipes containing only that sigil
  before elemental mixtures containing it. Existing filters and explicit sort
  modes remain deterministic.

## Validation

- A lifecycle regression test requires a 2D redraw after 3D cleanup.
- Catalog tests require exact single-sigil results before mixtures.
- Every Scalewolf sign pair, with and without shoe support, must produce a
  finite bounded creature profile.
- Renderer policy tests require the improved anatomical parts and profile use.
- Browser smoke tests cover activation, the improved creature, and closing 3D.
