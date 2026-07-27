# Elemental Mixtures And Glyph Weight Design

## Goal

Make every central sigil as visually legible as the modifier signs, then add
deterministic multi-sigil recipes for the four base elements without
enumerating an impractical global combination space.

## Scope

- Match the perceived stroke weight of the 26 central sigils to the existing
  modifier-sign assets.
- Preserve the geometry, proportions, internal openings, colors, and reference
  provenance of every glyph.
- Support mixtures made only from `Feu`, `Eau`, `Terre`, and `Vent`.
- Index all 11 distinct mixtures of two, three, or four base elements in the
  public variant explorer.
- Keep the other 22 sigils on the existing primary-sigil behavior when more
  than one is drawn.
- Keep French and English content complete and equivalent.

## Glyph Weight

The current generated assets have an average measured stroke width of
approximately 3.97 pixels for central sigils and 6.26 pixels for modifier
signs. Central sigil assets will be regenerated toward the modifier-sign
median of approximately 6.4 pixels at the existing 192 by 192 resolution.

Only the 25 raster central sigils will be dilated. The vector-only `Vent`
sigil will receive the corresponding vector stroke adjustment. Modifier signs
will remain unchanged. A verification report will record source and output
hashes, measured widths, dimensions, and preserved transparent openings.

The picker and canvas must continue to use the same canonical glyph source so
that a selected symbol does not change appearance after placement.

## Elemental Composition Model

The mixture engine recognizes the set of distinct base elements in a recipe.
There are 15 non-empty sets in total: four existing single-element materials
and 11 new mixtures. Counts do not create new material classes; they determine
dominance, intensity, and balance within the selected class.

The six pair profiles are:

| Elements | Material interpretation |
| --- | --- |
| Eau + Terre | mud, clay, or wet sediment |
| Eau + Feu | steam or hot mist |
| Eau + Vent | driven mist, spray, or rain |
| Feu + Terre | heated earth, fired clay, or molten mineral |
| Feu + Vent | driven flame or fire vortex |
| Terre + Vent | dust, sand, or moving debris |

The four triple profiles combine those physical behaviors without inventing a
new canon name:

- Eau + Terre + Vent: moving mud, rain-driven sediment, or wet debris.
- Eau + Feu + Vent: pressurized steam or hot vapor.
- Eau + Feu + Terre: heated mud, ceramic transformation, or mineral slurry.
- Feu + Terre + Vent: ash, hot dust, or projected molten mineral.

The four-element profile is an unstable elemental mixture whose exact
manifestation is selected by the modifier signs and dominance values.

These interpretations are marked `inferred` or `experimental` unless an
existing documented rule directly supports the resulting behavior. Every
recipe exposes its contributing elements, dominant element, balance,
mechanics, warnings, and stable rule identifiers.

## Dominance And Repetition

The element with the largest count is dominant. Equal counts are balanced.
Dominance affects labels, color blending, physical emphasis, and effect-plan
parameters, but the canonical identity retains every count. Repeating a base
sigil therefore changes a recipe without creating another hard-coded material
profile.

## Signs And Supports

Modifier signs apply after the elemental material is composed. Existing sign
roles and geometry rules remain authoritative:

1. supply;
2. state;
3. form;
4. motion;
5. target;
6. scope;
7. relation;
8. power.

Support behavior remains a separate final stage. `none` and `shoe` therefore
produce distinct identities and plans for every mixture. No mixture is treated
as canon solely because it has a support.

## Variant Explorer

The explorer will add the 11 distinct base-element mixtures to the existing 26
single-sigil entries. Each mixture is combined with the current 741 unordered
sign pairs and two supports:

`11 mixtures * 741 sign pairs * 2 supports = 16,302 new indexed variants`

The documented explorer total becomes:

`38,532 existing variants + 16,302 mixture variants = 54,834 variants`

Records store the small elemental signature and derive detailed recipes on
demand. Search accepts French and English element names and physical aliases
such as `boue`, `mud`, `vapeur`, and `steam`. Filters must find a mixture by
any participating element.

The simulator itself remains open-ended: arbitrary sign counts, orientation,
placement, and base-element repetitions are evaluated at activation time and
are not all pre-enumerated in the explorer.

## Validation

- All 25 raster central sigils reach the modifier-sign visual weight band
  without losing required transparent openings.
- The vector `Vent` sigil visually matches the raster central sigils.
- Picker and canvas use identical glyph definitions.
- Every one of the 11 elemental mixtures has a deterministic profile.
- Element order does not change recipe identity or output.
- Repetition changes dominance while preserving all component counts.
- Non-base multi-sigil recipes keep existing behavior.
- The explorer contains exactly 54,834 unique deterministic records.
- French and English labels, searches, tutorial text, metadata, and totals are
  synchronized.
- Existing unit tests, JavaScript syntax checks, browser smoke tests, and
  security checks pass.
