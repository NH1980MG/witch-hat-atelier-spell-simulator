# Spell Effect Catalog

This document defines the bridge between diagrams and 3D results.

## Effect Grammar

```text
material -> supply/state -> form -> motion -> target/scope -> relation -> power
```

| Axis | Examples | Responsibility |
| --- | --- | --- |
| Material | water, fire, earth, wind, light, crystal | substance and base surface behavior |
| Supply | Collection, Gather | where usable matter comes from |
| State | Cool, Solidify, Strengthen, Purify, Stillness | physical/temporal condition |
| Form | Orb, Column, Rain, Bolt, Cloud, Coil, Envelop | geometry of manifestation |
| Motion | Levitation, Pull, Float, Puppet | movement after formation |
| Target | Focus, Crosshair, Diamond, Window, Reflect | what is affected |
| Scope | Region, Glaives | where and how deeply it applies |
| Relation | Link, Bind, Entwine | connection to other objects/forms |
| Power | Radial | tempers the output |

Every recognized sign keeps its own operation. The renderer adds layers for
all operations instead of replacing the whole result with a single canned
animation. Counts adjust density, spread, focus, lift, speed, containment and
stability. This is how repeated signs and different pairs remain visibly and
mechanically distinct.

## Seal Geometry

The operation list is combined with a geometric pass based on the Magic page
of the independent Witch Hat Atelier wiki.

- Every connected directional sign receives a weight from its relative size.
- Its radial placement contributes a pressure vector. Symmetric equal weights
  cancel; a longer sign shifts the output toward itself.
- Its angle relative to the radial axis contributes signed spin. Similar tilts
  accumulate; opposite tilts cancel.
- Increasing absolute tilt decreases reach.
- Marks outside and disconnected from the complete ring are drawn but excluded
  from the recipe.
- A complete ring without a sigil uses the `raw-energy` material profile and
  produces a short expanding discharge rather than inventing an element.

In 3D, the parchment and support remain stationary. Pressure tilts and offsets
only the manifestation group; spin rotates that group; reach scales its height.

Current automatic coverage:

```text
9 central sigils x 741 unordered two-sign pairs (repetition allowed)
= 6,669 deterministic recipes and 6,144 distinct executable plans
```

Some recipes share a plan because a physically incompatible sign is ignored.
For example, a solid-only Coil does not invent a new liquid behavior; it emits
a warning and leaves the compatible layers unchanged.

## Recognition Rules

The app separates the central sigil from modifier signs.

- Freehand strokes near the center of the boundary are interpreted as the sigil
  candidate.
- Freehand strokes near the outer ring are interpreted as modifier signs.
- Strokes too close to the center are not counted as signs, which prevents the
  central sigil from becoming false `Region`, `Colonne`, or `Signe de vent`
  detections.
- Repeated freehand signs are deduplicated by sign type and radial sector, so a
  single messy symbol does not become many identical signs.
- Multi-stroke signs are clustered before classification. A stem, crossbar and
  arrowhead therefore count as one sign instead of three unrelated marks.
- Rotation changes a directional sign's output direction, not its identity.
- Size, radial position and tilt are preserved as separate geometry values;
  they determine balance, lateral pressure, spin and reach.
- Semi-directional signs are rotated visually but do not contribute to the
  physical motion vector unless their reference behavior is spatial.
- Unknown marks stay unknown; `Region` is no longer the fallback for every
  unclassified curve or line.
- Manual placed glyphs remain exact and take priority over freehand inference.

## Combined Sign Effects

Signs can combine when their effects make sense together:

- `Colonne + Dispersion`: column spreads outward as a diffuse cone.
- `Colonne + Levitation`: the spell creates a rising platform or lift stack.
- `Levitation + Flottement`: the lifted object becomes more stable and buoyant.
- `Projectile + Viseur/Region`: projectiles are directed rather than fired
  loosely.
- `Pluie + Orbe`: rainfall is contained inside a spherical volume.
- `Crush + Eau`: water becomes mist or spray.
- `Convergence + Levitation`: the active core concentrates while suspended.
- `Aeriforme/Vent + Levitation`: air ribbons stabilize the lift.
- `Immobilite/Bind + Column/Orb/Rain`: the effect is visually anchored.
- `Collection + Nuage`: collected material becomes a billowing cloud.
- `Collection + Convergence`: gathered matter compacts into a stable core.
- `Etirement + Terre/Cristal`: matter becomes a flexible ribbon.
- `Projection + Cible`: the projection receives a clear direction.
- `Pluie + Refroidissement`: droplets condense into a colder, denser rain.
- `Traction + Spire`: the intake twists around the seal.
- `Orbe + Dispersion`: a contained shell leaks outward; this is marked as a
  logical interpretation, not confirmed behavior.
- `Immobilite + motion/form`: the manifestation forms, then its animation
  freezes after the initial phase.
- `Enveloppe + target/Region`: the shell surrounds the selected target/sector.
- `Lien + Etirement/Projection`: the output is repeated between linked objects.
- `Radial + Feu`: visible flame is tempered toward retained heat.

## Generic 3D Layers

The 3D renderer now has visible procedural layers for every current operation:

- inward spiraling motes for Pull;
- translucent clusters for Billow;
- command crown and control lines for Puppet;
- hover rings for Float;
- physical helix for Coil;
- defined air streams for wind modifiers;
- depth gauge for Glaives;
- wire shell for Envelop;
- refractive veil for Conceal;
- calm power rings for Radial;
- collection, strengthening, cooling, solidification, targeting, linking,
  purification, reflection and stillness layers;
- the existing element-specific column, dispersion, levitation, crush, rain,
  orb, projectile and projection effects.

Stillness clamps the animation clock after the initial manifestation. Removing
or expiring a spell removes its group and therefore stops every live effect.

## Priority: Water Vertical Slice

Water should be implemented first because it exercises several useful 3D
techniques: transparent material, particles, surface motion, droplets, columns,
and projectiles.

### Recipe: `water.orb`

Diagram:

```text
Eau + Orbe + closed boundary
optional: Colonne, Levitation, ring
```

3D result:

- The circle glows blue.
- Droplets rise from the boundary.
- A transparent water sphere forms above the seal.
- Small droplets orbit the sphere.
- A subtle internal swirl shows contained motion.

Quality effects:

- Higher precision makes the orb smoother and more stable.
- Higher force increases orb size and droplet count.
- Higher stability reduces jitter and splash leakage.

### Recipe: `water.column`

Diagram:

```text
Eau + Colonne + closed boundary
optional: ray direction, ring
```

3D result:

- A vertical stream rises from the seal.
- The stream has spiral line highlights.
- A small splash crown forms at the top.
- If a direction vector exists, the column leans or projects slightly.

Quality effects:

- Low stability causes spray and flicker.
- Higher force raises the column.
- Rings make the column narrower and cleaner.

### Recipe: `water.levitation`

Diagram:

```text
Eau + Levitation
or Eau + Vent sous pied
closed boundary required
```

3D result:

- Water gathers into a floating disk or orb.
- The shape hovers above the circle.
- The orb grows progressively while the spell is active.
- Thin lift lines connect the circle to the water mass.
- The hover height scales with force.
- Growth stops when the spell duration ends and the 3D spell group is removed.

### Recipe: `water.projectile`

Diagram:

```text
Eau + Projectile
or Eau + ray direction
closed boundary required
```

3D result:

- Water beads or jets leave the circle along the direction vector.
- The circle emits a short pulse with each projectile.
- Projectiles should be stylized and looped, not physically exact.

### Recipe: `water.rain`

Diagram:

```text
Eau + Pluie
optional: Region, Orbe
```

3D result:

- A small region forms above the circle.
- Droplets fall inside the region.
- Orbe constrains rain into a spherical volume.

### Recipe: `water.puddle`

Diagram:

```text
Eau + closed boundary
no shape/motion sign
```

3D result:

- Water remains low on the paper/table.
- The main visible form is a contained puddle with flat ripples.
- The puddle keeps spreading outward for the full active duration of the spell.
- No floating core, orb, vertical column, rain, or projectile appears unless a
  matching sign is present.

## Other Elements

Default rule for every element:

- If the diagram has a central sigil and a closed boundary but no levitation,
  orb, projectile, column, rain, convergence, traction, free motion sign, ray,
  or spiral, the effect stays low on the paper/table.
- In that default state, the 3D renderer must show a surface manifestation:
  contained flame, wet puddle, grounded dust/pebbles, low wind ribbons, flat
  light glow, crystal chips, or looping surface marks.
- No floating core or fire ball should appear unless a levitation/orb-style
  modifier is explicitly present.

### Fire

Likely recipes:

- `fire.flame`: contained flame.
- `fire.projectile`: fire bolts.
- `fire.dispersion`: outward flame burst.
- `fire.column`: vertical beam of flame.

Visual language:

- Warm emissive meshes.
- Sparks and heat shimmer.
- Strong directionality when rays are present.

### Wind

Likely recipes:

- `wind.current`: visible air ribbons.
- `wind.traction`: pull/push flow.
- `wind.platform`: lift under the seal.
- `wind.wall`: defensive curved gust.

Visual language:

- Thin translucent ribbons.
- Leaves/dust motes for readability.
- Direction arrows converted into flow vectors.

### Earth

Likely recipes:

- `earth.anchor`: grounded seal.
- `earth.wall`: raised barrier.
- `earth.crush`: fragments and dust.
- `earth.solidify`: stones lock into structure.

Visual language:

- Rock fragments and dust points.
- Heavier movement with slower easing.
- More stable with rings and strengthening signs.

### Light

Likely recipes:

- `light.beam`: column or directed ray.
- `light.lamp`: floating glow.
- `light.projection`: image-like plane.
- `light.conceal`: shimmer/illusion shell.

Visual language:

- Emissive gold/white lines.
- Lens-like arcs.
- Low geometry, high clarity.

### Crystal

Likely recipes:

- `crystal.structure`: faceted formation.
- `crystal.ribbon`: flexible crystal band.
- `crystal.focus`: convergence prism.
- `crystal.fragment`: shards.

Visual language:

- Faceted transparent meshes.
- Sharp highlights.
- More symmetry than water or wind.

## Support: Flying Shoes

The shoe support is intentionally limited to small circles so the spell can
fit under a real sole. Current rule: 5 cm minimum from the global circle rules,
35 cm maximum for the shoe support.

The support does not replace the central sigil. It receives the element and
modifiers from the spell model:

- Fire: burns nearby table objects slowly.
- Fire + Convergence: focused fire jets under the soles.
- Fire + Levitation: forms a fire ball and bursts briefly.
- Water: makes a contained wet table/puddle effect.
- Water + Levitation: creates a bouncing water cushion between table and soles.
- Water + Convergence: behaves like water jets under the soles.
- Wind or Wind under foot: vertical propulsion.
- Earth: grows a mound or column of earth below the shoes.
- Light: guiding halo below the soles.
- Crystal: small crystal skids below the soles.
- Aeriform: short air cushion.

The 3D view should show the paper and magic circle under the soles, with an
underside camera angle when this support is active.

## Recipe Selection Rules

Selection should prefer specific modifiers over generic element effects:

1. Element + named modifier recipe.
2. Element + direction/projectile recipe.
3. Element + motion recipe.
4. Element default contained effect.

Example:

```text
Eau + Orbe + Projectile
```

Preferred result: `water.orb_projectile` if implemented. Otherwise, choose
`water.orb` and add projectile as a secondary behavior.

## Implementation Notes

- Start with placed glyphs, not freehand recognition, for reliable effect tests.
- Keep recipes deterministic enough for visual regression.
- Use quality/stability/force as recipe parameters rather than one-off globals.
- The effect catalog should eventually be data-driven so the library and 3D
  renderer agree.
