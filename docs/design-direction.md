# Design Direction

## Experience Tone

The app should feel like a practical atelier, not a marketing landing page. The
first screen should remain the usable parchment workspace. Controls should stay
compact, legible, and close to the drawing flow.

## Visual Language

Current direction:

- Parchment canvas.
- Dark ink and gold accents.
- Floating tool island.
- Grimoire controls at the bottom.
- 3D scene as an activation result.

Keep:

- The calm workbench feeling.
- The parchment grid and visible drawing surface.
- The compact tool controls.
- The idea that the 3D view appears only after activation.

Improve:

- Make signs visually closer to a coherent internal glyph language.
- Separate central sigils from modifier signs more clearly.
- Make active/selected symbols easier to compare.
- Add small preview thumbnails for effect recipes once recipes exist.

## Interaction Principles

- Drawing should be immediate and forgiving.
- Placed signs should produce reliable results.
- Freehand recognition should be treated as an advanced input mode until it is
  robust.
- `Lire` should explain the interpretation.
- `Activer` should show the result, not just restate the spell.
- Visual differences should be obvious: orb, column, projectile, field, shield,
  and levitation should not look interchangeable.

## 3D Direction

The 3D output should be procedural and stylized:

- Ink lines rise slightly from the drawn circle.
- The central sigil controls material color and particle behavior.
- Modifier signs control geometry and motion.
- The camera should frame the effect automatically.
- The result should feel handmade and diagram-driven, not generic particle spam.

## Water Motion Language

Water should feel:

- Transparent but readable.
- Bound by the spell geometry.
- Pulled from the circle into a shape.
- Alive with ripples, droplets, and surface shimmer.

Water variants:

- `Eau + Orbe`: suspended sphere, orbiting droplets, slow internal swirl.
- `Eau + Colonne`: vertical rising column, splash crown, upward stream lines.
- `Eau + Levitation`: lifted disk or orb, gentle upward force, stable hover.
- `Eau + Projectile`: forward jets or beads along the direction vector.
- `Eau + Pluie`: falling droplets inside the target region.
- `Eau + Refroidissement`: mist, ice tint, slower movement.

## Animation Rules

Each effect should have three phases:

1. Read: the diagram glows and recognized signs pulse.
2. Gather: material accumulates from the circle into the target form.
3. Manifest: the final effect loops for the spell duration.

This phase model keeps effects comparable and easier to implement.

## Accessibility And Layout

- Buttons need labels or tooltips.
- Keyboard shortcuts should remain documented in-app.
- Mobile layout must keep the canvas usable and avoid overlapping the tool
  island, symbol drawer, and bottom controls.
- 3D view needs an obvious close button and should respect reduced-motion if
  that is later added.

