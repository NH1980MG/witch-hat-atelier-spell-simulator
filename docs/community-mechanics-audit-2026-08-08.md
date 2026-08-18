# Community Mechanics Audit

Date: 2026-08-08

## Purpose

This audit records mechanics reviewed in Witch Hat Atelier community
discussions and the Conjuring Ink Gallery. Community interpretations are useful
for finding inconsistencies and plausible compositions, but they are not canon
by themselves. The simulator therefore maps each conclusion to one of three
levels: documented, inferred or experimental.

## Accepted Corrections

| Mechanic | Simulator rule | Fidelity |
| --- | --- | --- |
| Sigil size | Research indicates that relative size can change intensity. The simulator currently models repeated central sigils; freehand sigil-size weighting remains deferred. | inferred |
| Convergence | Concentrates and densifies without adding elemental power | inferred |
| Aeriforme | Creates/manipulates air but does not move it | documented |
| Vent | Moves/manipulates existing air but does not create it | documented |
| Viseur | Long side forms the sight line; short side faces the intended target | inferred |
| Cible | Adds a target lock; without it aiming remains manual | inferred |
| Enveloppe | Shapes the material around a target | inferred |
| Arret | Holds material together/in place; no undocumented inverse is generated | inferred |
| Enlacement / Spire physique | Produces winding, wrapping or spiral behavior on compatible solid material | inferred |
| Purification | Separates impurities from manipulated matter | inferred |
| Radial | Function remains unresolved; no power change is applied | experimental |

## Geometry Rules

- Unequal directional signs create unequal pressure and lateral drift.
- Symmetry averages directional pressure and improves stability.
- Sign tilt introduces rotation while reducing reach.
- Region signs participate in spatial direction, but the precise mapping from
  every inward/outward arrangement remains underdetermined.
- A disconnected sign does not contribute to the spell.
- A custom closed mark may be a new sign rather than a stylized known sign;
  freehand recognition must therefore prefer unknown over a forced match.

## Composition Rules

- Effects are applied as a pipeline: material, supply/state, form, motion,
  target/scope, then relations.
- Multiple sigils may be executed as a composition instead of being collapsed
  into one label.
- Gallery examples such as rockets, glass traps and clothes-creation diagrams
  remain experimental unless an independent reference confirms the rule.
- Speculative support suggestions, including extra pushers or stabilizers, are
  not promoted to documented behavior.

## Implemented In This Audit

- Radial changed from a fictional `temper` operation to `unknown-radial`.
- Radial now emits an explicit fidelity warning and no 3D power rings.
- Convergence retains concentration/density changes with a neutral power
  modifier.
- Viseur is directional and combines with Cible as `locked-directional`.
- Aeriforme and Vent expose separate air-creation and air-motion capabilities.
- The 3D renderer composes a static air volume and moving streams according to
  those capabilities.

## Source Handling

The research set includes the independent Witch Hat Atelier wiki Magic pages,
the user's archived project captures, and signed-in community discussions.
Exact manga panels and community artwork are not redistributed in the public
repository. Claims without stable attribution remain inferred or experimental.
