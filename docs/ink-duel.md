# Duel d'encre

Entry point: `ink-duel.html`. Standalone solo game; no account, network opponent,
saved-canvas mutation, or changes to editor physics. All dependencies are local.
Game balance values are original gameplay choices, not canonical measurements.

## Rules

- 30 seconds preparation, 5 minutes combat, 60 seconds overtime on a tie.
- Destroy the opposing inkwell (300 HP). Otherwise higher remaining HP wins;
  equal HP after overtime is a draw.
- Start with 100 ink, regenerate 3/second, maximum 150.
- Build in your own half. Up to three active circles; one-second activation.
- A circle costs its recipe plus the perimeter (2 ink/unit).
- Free strokes cost 2 ink/unit times thickness. They are notation, not walls.
- Standard local segments have 100 HP. Continuous standard fire does 5 HP/s;
  thickness multiplies both cost and HP. Damage is localized.
- A broken ring or symbol stops emission. Repair costs 4 ink/s for 8 HP/s;
  recent incoming damage interrupts repair. Reactivation remains manual.
- Base range 8; Projection extends it to 12. Inkwells are 18 units apart.
- Collection consumes finite nearby matter. Repetition never heals inkwells
  or generates ink. Earth construction needs a compatible resource pool.

## Controls

Select a quick composition or choose a sigil and up to six compatible signs.
The circle tool places it; preparation defers activation until combat begins.
Selection loads an existing recipe. Stop it before applying composition changes;
re-inscription costs ink and does not repair its ring.
Aim selects a target; orientation turns the effect. Freehand draws ink strokes.
Hold Repair over damaged notation. Camera has a separate tool, middle-button
drag, wheel zoom, and explicit zoom/reset controls. Pause is available in solo;
leaving the tab also pauses. Three quick recipes are stored locally.

## Catalogue Policy

`ink-duel-catalog.mjs` accounts for all 29 sigils and 40 signs from the existing
catalogue. Unsupported entries are disabled, never converted to generic attacks.
Creature/flower forms without a defined combat behavior, Appel, Lumiere
vacillante, Glaives, Radial, Aeriforme defini and Signe de vent are unavailable.
Unconfirmed operations require the experimental setting on a new match.

Implemented systems include fire/water interaction, moving streams, zones,
rain, attraction/repulsion, cooling/solidification, finite earth resources,
projected solids, lift, binding, linked bodies, concealment/revelation,
restoration and bounded experimental time stop. Compatibility errors are
displayed before inscription. The catalogue is the executable policy source.

## Architecture and Limits

Pure fixed-step engine with seeded opponent commands, fixed-distance stroke
sampling, bounded effect/object counts; Rapier handles solid-body collisions.
Three.js renders glyphs, modeled inkwells, solids, particles and impact rings.
Reduced motion and adaptive particle density do not change gameplay damage.
No bloom/distortion postprocessing or sound in this version.

The opponent uses legal commands and the same ink and repair rules but is a
simple scripted opponent, not a competitive planner. Glyph damage uses local
symbol hit regions; only ring/freehand strokes fracture segment by segment.
Envelopes use a simplified solid collider, not a hollow shell simulation.
No multiplayer synchronization, arbitrary drawn-glyph recognition, or creature AI.

## Checks

`node --test tests/ink-duel.test.mjs` covers catalogue policy, modifiers,
localized damage, repair, match timing, matter, deterministic full battles,
and real Rapier collisions. Browser QA is required for rendering and controls.
