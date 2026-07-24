# Complete Symbol Board Audit

Date: 2026-07-17

## Scope

This pass audits all 64 editable entries: 26 central sigils and 38 modifier
signs. The 63 entries covered by generated sheets use extracted board masks in
the picker, drag preview and drawing canvas. Wind keeps its capture-derived
vector because no generated sheet contains that distinct sigil.

## Source Priority

1. Supplied local captures and the archived main/auxiliary spell boards define
   the geometry.
2. Existing generated sheets cover 25 central sigils; Wind comes directly from
   local capture 10 because it has no generated-board cell.
3. Ten new DALL-E sheets provide consistent review cards for the 38 modifier
   signs. They are comparison aids, not geometric authority.

## New Modifier-Sign Boards

| Board | Entries |
| --- | --- |
| `signs-directional-i-dalle-v1.png` | Column, Dispersion, Levitation, Pull |
| `signs-directional-ii-dalle-v1.png` | Region, Convergence, Collection, Billow |
| `signs-force-motion-dalle-v1.png` | Crush, Puppet, Float, Stretch |
| `signs-state-target-dalle-v1.png` | Physical Coil, Cool, Strengthen, Sights Set |
| `signs-relation-air-dalle-v1.png` | Entwine, Wind Sign, Aeriforms Defined, Gather |
| `signs-structure-dalle-v1.png` | Glaives, Solidify, Bind, Envelop |
| `signs-perception-scope-dalle-v1.png` | Conceal, Reflection, Diamond, Window |
| `signs-scale-projectile-dalle-v1.png` | Enlarge, Crosshair, Radial, Bolt |
| `signs-weather-purify-dalle-v1.png` | Rain, Orb, Purify, Stillness |
| `signs-link-project-flower-dalle-v1.png` | Link, Project, Flower |

## Implementation Controls

- `SYMBOL_BOARD_TRACE` owns the precise board cell, extracted asset and paired
  editable paths.
- `SYMBOL_BOARD_ASSET` is shared by the picker and drawing canvas.
- `SYMBOL_PATHS` remains the geometry source for recognition and 3D sampling.
- All 18 symbol sheets are represented by at least one runtime entry.
- All 63 board-backed entries have a committed transparent mask.
- Wind records its direct capture provenance instead of claiming a false cell.
- Catalogue key order matches the provenance mapping key order.
- Duplicate path drawings are rejected by automated tests.
- Corrected signs have topology assertions derived from the supplied captures.
- The complete audit page renders all 64 vectors in one review grid.

## Copyright Boundary

The public repository contains original vector reconstructions and generated
comparison sheets. Supplied screenshots remain private and are represented in
the repository only by a subject inventory and SHA-256 hashes.
