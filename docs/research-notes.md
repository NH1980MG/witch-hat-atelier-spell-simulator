# Research Notes

Research checkpoint: 2026-07-14.

## Source Types

Use sources in this order:

1. Official material: manga publisher pages, official anime site, trailers, and
   licensed episode previews.
2. Local reference screenshots: only as private research material unless rights
   are clear.
3. Fan wiki summaries: useful for terminology and sign names, but verify against
   official or local visual references before encoding behavior.
4. Original project interpretation: acceptable when labeled as such.

## Useful Links

- Official anime site: https://tongari-anime.com/
- Kodansha series page: https://kodansha.us/series/witch-hat-atelier/
- Fan reference already linked in the app:
  https://witchhatatelier.telepedia.net/wiki/Signs_Explained
- Fan reference already linked in the app:
  https://witchhatatelier.telepedia.net/wiki/Magic
- Three.js documentation: https://threejs.org/docs/

## Copyright And Reference Policy

The goal is to use the anime and manga as design reference, not as copied
runtime assets.

Allowed for this project:

- Original SVG diagrams that encode observed sign roles.
- Original 3D models, shaders, particles, and animations.
- Short source citations and research notes.
- Private reference folders for study during development.

Avoid in public builds:

- Direct screenshots from anime episodes or manga pages.
- Exact traced copies of panels or frame compositions.
- Runtime assets lifted from fan wikis, trailers, or scans.
- Marketing that implies official affiliation.

Recommended wording:

> Fan-made interactive study tool inspired by Witch Hat Atelier. Not official.

## Canon Model To Capture

From the current repo, local screenshots, and public reference summaries, the
project should model these broad concepts:

- A central sigil establishes the material or domain: water, fire, earth, wind,
  light, crystal, aeriform, etc.
- Signs around the seal modify behavior: direction, region, column, levitation,
  orb, projectile, crush, bind, strengthen, repetition, and so on.
- The boundary circle matters. It stabilizes and closes the spell formula.
- Orientation matters for directional signs.
- Size, symmetry, and balance should affect strength, stability, and duration.

July 2026 sign-reading notes from the Telepedia sign/sigil articles:

- Sigils are usually central and define the spell type or material.
- Signs are modifier components that alter the spell's form.
- Directional signs such as Column and Pull use direction, size, and balance to
  influence where the effect manifests.
- Semi-directional signs can invert; size changes strength more than direction.
- Non-directional signs such as Float, Crosshair, and Orb act without a facing
  direction.
- Bolt paired with Region gives directed high-speed projectiles.
- Rain surrounds the central sigil and creates rainfall-like behavior in the
  immediate area.
- Orb creates a spherical space above the seal where controlled material can
  collect.
- Crush can pulverize material; for water this is interpreted as spray or mist
  in the simulator.
- Directional signs keep the same identity when rotated. Their orientation and
  balance control where the material travels.
- Rings stabilize and activate a formula; they do not imply Dispersion.
- The light sigil defines light as the material. It does not imply Column unless
  a column sign is also present.
- Collection and Billowing are a documented functional pair: Collection
  supplies compatible matter and Billowing turns it into cloud-like material.

The full sign-by-sign confidence table and simulator mapping now live in
`docs/sign-reference.md`.

## Decor Direction

The 3D scene should read as Qifrey-style atelier study space rather than a
generic fantasy table. External summaries describe Qifrey's atelier as a remote
place where he teaches child witches who do not fit older school structures.
That supports these environment choices:

- interior: warm workbench, books, ink, quills, scrolls, rune charts, arched
  windows, hanging herbs, pointed hat, lamps, stone/wood construction, exposed
  beams, apothecary shelves, ladders, and hanging notes;
- exterior: isolated training clearing, surrounding trees, stones, small
  atelier buildings with steep roofs, timber frames, cobbled paths, mountains,
  clouds, lanterns, flowers, and layered mist.

Official anime and publisher references emphasize warm craft spaces, hand-drawn
magic diagrams, rural/remote teaching locations, and a storybook palette rather
than generic castle fantasy. Implementation should therefore use warm interior
lantern light, muted plaster/wood/stone, blue-green atmospheric haze outside,
and procedural props that suggest workshop use.

Implementation note: keep these as original low-poly/procedural props, not
copied screenshots or traced backgrounds.

## Reference Library Direction

The library should not invent spell diagrams. It currently displays isolated
circle crops extracted from the Telepedia reference panels supplied by the user.
The source panels remain stored locally in `assets/reference-panels/`, and the
display crops live in `assets/library-circles/`.

Implementation note: these panels and crops are local research references only.
Before a public release, replace them with licensed, original, or explicitly
permitted assets.

## Object Support Direction

Public summaries and fan reference pages describe the magic system as drawn
formulas/signs that can be applied through objects, while the story includes
portable enchanted items such as flying shoes. For the simulator, this is
currently a small object-support layer:

- no link: the circle acts from the paper alone;
- shoe: good match for wind, foot-lift, float, and levitation formulas. Without
  a wind/levitation link, the simulator treats the shoe as unstable short hops
  instead of true flight.

Implementation note: other support ideas can return later, but they are not
active options now. Treat selectable supports as original 3D props. Do not copy a
specific anime frame or manga panel as an asset.

## Translation Into Simulation

The app should not attempt to decide every canon detail. Instead, it should use
a clear game-like grammar:

```text
central sigil = material
boundary = can activate
modifier signs = effect family
rays/arrows = direction vector
rings/spirals = stability and duration
stroke quality = precision and duration
intensity slider = energy input
```

## Reference Manifest Needed

Create a structured manifest before adding many more effects:

```json
{
  "id": "water-orb-reference-001",
  "sourceType": "local-screenshot",
  "sourcePath": "Whitch hat/example.png",
  "publicUse": false,
  "observedSigns": ["Eau", "Orbe", "Colonne"],
  "observedBehavior": "water gathers into a suspended orb",
  "implementationNotes": "Use original shader, particles, and geometry."
}
```

This keeps research separate from shipped art.

## Open Research Questions

- Which exact signs should be treated as canonical versus project-specific
  approximations?
- Which anime shots best show water motion, column motion, and levitation?
- Are any official guidebooks or bonus materials available that clarify sign
  behavior?
- Should the app include English labels, French labels, or a language toggle?
- Should freehand recognition attempt exact symbol recognition, or should the
  first production version rely on placed signs for reliable effect output?
