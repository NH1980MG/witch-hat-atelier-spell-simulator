# Complete Symbol Board Audit

Date: 2026-07-17

## Scope

This pass audits all 64 editable entries in the shared vector catalogue: 26
central sigils and 38 modifier signs. The same `SYMBOL_PATHS` geometry is used
by the picker, drag preview, drawing canvas, recognition display and spell
recipe model.

## Source Priority

1. Supplied local captures and the archived main/auxiliary spell boards define
   the geometry.
2. Existing generated sheets cover the 26 central sigils.
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

- `SYMBOL_GENERATED_BOARD` maps every editable entry to a checked PNG sheet.
- Catalogue key order matches the board mapping key order.
- Duplicate path drawings are rejected by automated tests.
- Corrected signs have topology assertions derived from the supplied captures.
- The complete audit page renders all 64 vectors in one review grid.

## Copyright Boundary

The public repository contains original vector reconstructions and generated
comparison sheets. Supplied screenshots remain private and are represented in
the repository only by a subject inventory and SHA-256 hashes.
