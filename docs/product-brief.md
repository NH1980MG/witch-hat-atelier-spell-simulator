# Product Brief

## Intent

Build an interactive magic circle atelier inspired by Witch Hat Atelier. Users
draw or compose a diagram on parchment, the app reads the diagram as a spell,
then generates a 3D animated result that communicates the spell effect.

The important product promise is:

> The diagram is not decoration. The diagram drives the effect.

Example: a water sigil plus an orb sign should produce a floating water sphere;
a water sigil plus a column sign should produce a rising water column or jet.

## Audience

- Fans who want to experiment with the magic system visually.
- Learners who want to understand how sigils, signs, rings, and direction marks
  combine.
- Builders/designers who want a small creative coding project around diagrams,
  particle effects, and 3D animation.

## Primary Loop

1. Choose or draw a central sigil.
2. Add boundary rings, direction marks, and modifier signs.
3. Press `Lire` to inspect the interpreted spell.
4. Press `Activer` to see the 3D manifestation.
5. Adjust the diagram and compare the result.
6. Export the parchment as PNG.

## Product Goals

- Make spell diagrams feel functional and legible.
- Produce readable 3D effects for the major elements: water, fire, wind, earth,
  light, crystal, aeriform, and repetition.
- Let the same sign change the effect in predictable ways.
- Keep the app static and easy to publish.
- Keep reference material documented without copying protected artwork into the
  runtime experience.

## Non-Goals

- This is not a full game.
- This is not a complete simulation of canon rules.
- This is not a frame-accurate anime recreation.
- This should not ship copied anime frames, manga panels, or exact traced
  diagrams unless rights are cleared.

## Success Criteria

The first meaningful milestone is the water vertical slice:

- A user can create at least three water diagrams.
- The app recognizes the difference between water orb, water column, and water
  projectile/flow.
- The 3D output is visually different for each diagram.
- The animation reads clearly without explanatory text.
- The result runs smoothly on a normal laptop browser.

## Future Experience

Longer term, the app can become a small "spell lab":

- Side-by-side comparison of two diagrams.
- A library where examples can be loaded into the canvas.
- A spell recipe editor for adding signs and effects.
- Optional capture/export of the 3D animation as a short clip.
- Difficulty modes: guided composition, free drawing, and advanced recognition.

