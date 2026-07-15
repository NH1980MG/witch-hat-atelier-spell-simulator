# Sign Reference

Research checkpoint: 2026-07-14.

This document separates visible source evidence from simulator interpretation.
The 42 local captures are catalogued in `docs/local-reference-audit.md`. Public
descriptions help with terminology, but uncertain effects remain marked as
uncertain instead of being presented as canon.

## Sources Reviewed

- Magic overview: https://witch-hat-atelier.fandom.com/wiki/Magic
- Telepedia Magic page used for seal geometry, with cited manga references:
  https://witchhatatelier.telepedia.net/wiki/Magic
- Sign catalogue: https://witch-hat-atelier.fandom.com/wiki/Signs_Explained
- Spell catalogue: https://witch-hat-atelier.fandom.com/wiki/Spells
- Earlier Telepedia snapshots supplied locally in `Whitch hat/`.
- Official world-guide listing, which confirms that magic circles are covered:
  https://mag-s.jp/en/products/witch-hat-atelier-ja

The wikis are independent fan references. Their inferred descriptions are not
treated as official facts without visual or cited story evidence.

## Core Grammar

- A central sigil defines the element or material, but the outer ring alone can
  release raw energy. The sigil is not mandatory for a spell to manifest.
- Signs modify supply, state, form, motion, target, scope, relations or power.
- `radial` means a drawing faces inward/outward around the seal.
- `directional` means its orientation changes the physical trajectory.
- Those two properties are deliberately separate in the code.
- The size and placement of directional signs produce pressure. Equal signs
  placed symmetrically cancel their lateral pressure; a larger sign has more
  influence and deflects the manifestation toward its sector.
- Tilting signs adds rotation. More common tilt increases spin while reducing
  reach. Opposite tilts can cancel one another.
- Closing the outer ring activates the spell.
- A sigil or sign contributes only when it is inside the ring or connected to
  it. Disconnected marks are retained in the drawing but ignored by the spell.
- Only signs whose inversion has a documented or strongly supported result are
  treated as invertible.
- Linked and nested glyphs compose complete pipelines rather than replacing
  one another.

## Drawing And Mechanic Audit

| Simulator ID | Reference name | Visual check | Class | Implemented behavior | Confidence |
| --- | --- | --- | --- | --- | --- |
| `Colonne` | Column | stem with short base | Directional | column/beam; imbalance sets its lean | High |
| `Dispersion` | Dispersion | stem, base and lower arc | Semi-directional/unclear | continuous outward leak, not a beam | High behavior; inversion unknown |
| `Levitation` | Levitation | single arrow | Directional | lifts magic or moves the carrier | High |
| `Traction` | Pull | stem with two chevrons | Directional | pulls matching material; angled signs twist | High; push is inferred |
| `Region` | Region | open chevron | Directional | chooses the manifestation sector | High |
| `Convergence` | Convergence | closed inverted triangle | Semi-directional | focuses to one point, compacts loose matter | High |
| `Collection` | Collection | open hourglass/funnel | Radial, not a movement vector | collects usable material around/above seal | High |
| `Nuage` | Billow | four-lobed clover | Non-directional | converts compatible collected matter to cloud | Medium/high |
| `Crush` | Crush | five-point zigzag | Semi-directional | disintegrates/reforms earth | High for earth only |
| `Pantin` | Puppet | ring with eight command hooks | Asymmetric | controlled movement based on the material | Medium |
| `Flottement` | Float | two vertical waves | Non-directional | makes the carrier float | High, with retcon caveat |
| `Etirement` | Stretch/Weave | open omega arch | Non-directional | turns solid matter into flexible ribbon | High |
| `Spire physique` | Coil | crossed double curve | Non-directional | coils physical solids only | High |
| `Refroidissement` | Cool | stem with four dots | Non-directional | cools and can condense | High |
| `Renforcement` | Strengthen | triangle with crossbar | Semi-directional | increases strength and durability | High |
| `Cible` | Focus/Sights Set | arrow with lower diamond | Directional | selects a precise point/target | High |
| `Enlacement` | Entwine | stem with four corner hooks | Semi-directional | wraps a solid form around another object | Medium |
| `Signe de vent` | Sign of Wind | asymmetric curled stroke | Asymmetric | wind-related modifier, exact role unknown | Low |
| `Aeriforme defini` | Aeriforms Defined | three downward strokes | Semi-directional | defines air more strictly | Medium |
| `Rassemblement` | Gather | stacked inward chevrons | Directional/semi | actively brings nearby material inward | Medium |
| `Glaives` | Glaives | long stem with a shallow three-pronged fork | Semi-directional | controls how deeply magic embeds | Low/restricted |
| `Solidification` | Solidify | two linked circles | Semi-directional | makes connected magic more solid | Medium/high |
| `Lien` | Link | inverted triangle over woven bands | Semi-directional | links magic between same-origin objects | Medium |
| `Arret` | Bind | two nested arches | Semi-directional | binds material so it moves as one | Medium |
| `Enveloppe` | Envelop | straight stem with opposed end hooks | Semi-directional | surrounds the selected object | Medium/high |
| `Dissimulation` | Conceal | eight rays, four cardinal eyes | Asymmetric | conceals a light/shadow target | Medium |
| `Reflection` | Reflect | hourglass | Non-directional | targets a reflected image | Medium/low |
| `Diamant` | Diamond | diamond outline | Non-directional | probably selects nearby objects | Low |
| `Fenetre` | Window | square crossed by plus | Non-directional | probably selects the carrier | Low |
| `Agrandissement` | Enlarge | four triple nested corner brackets | Semi-directional | grows outward; shrinks when inverted | High |
| `Viseur` | Crosshair | four separated cross arms | Non-directional | matching target/area selector | Low |
| `Radial` | Radial | two nested arches | Non-directional | tempers output, e.g. fire into heat | Medium/low |
| `Projectile` | Bolt | vertical stem and diamond | Non-directional | forms fast projectiles; needs direction to aim | High |
| `Pluie` | Rain | concave framed center with grouped orthogonal rays | Semi-directional | rainfall-like output in the immediate area | High for water |
| `Orbe` | Orb | circle crossed by vertical stem | Non-directional | spherical collection volume affected by gravity | High |
| `Purification` | Purify | asymmetric inward spiral hook | Asymmetric | separates impurities | Medium/high |
| `Immobilite` | Stillness | central stem, two crossbars and opposed curved forks | Non-directional | holds magic static in one place | Medium/high |
| `Projection` | Project | open-bottom rectangular arch | Directional | projects an image/effect outward | Medium |

The nine central entries (`Feu`, `Eau`, `Terre`, `Vent`, `Lumiere`, `Cristal`,
`Aeriforme`, `Vent sous pied`, `Repetition`) are also drawn from the same shared
vector catalogue. `Repetition` uses the eye-shaped mark from capture `131740`
and is treated as a central sigil because the local reference says its
classification was revised. The exact local capture suffix for every entry is
stored in `SYMBOL_REFERENCE_SUFFIX` beside its vector.

## Recognition Rules

- Nearby freehand strokes are clustered before classification.
- A stem, crossbar and arrowhead form one Levitation sign.
- A stem and crossbar without an arrowhead form Column.
- Four radial Levitation signs are four signs, not twelve separate strokes.
- Candidate scores must clear both a minimum score and an ambiguity gap.
- Unknown outer marks remain unknown. They are not silently converted to
  Region, Column or Sign of Wind.
- Closed outer marks become Orb or Target only when internal strokes support
  that reading.
- The central recognition area is smaller than the modifier ring, preventing
  outer arrowheads from being absorbed into the sigil.
- Water requires its flowing center and side drops to distinguish it from Wind
  and Aeriform.
- Manual picker symbols use the same SVG paths as canvas and 3D ink and remain
  the exact, highest-confidence input method.
- Dragging while placing a manual directional sign changes both its size and
  tilt, allowing the balance and rotation rules to be tested deliberately.

## Combination Policy

The engine does not keep a hand-written picture for every pair. It composes a
deterministic pipeline:

```text
material -> supply/state -> form -> motion -> target/scope -> relation -> power
```

Examples:

- Column + Dispersion: a diffuse column.
- Column + Levitation: a rising platform.
- Levitation + Float: stabilized hover.
- Bolt + Target/Region: directed projectiles.
- Rain + Orb: contained rain.
- Collection + Billow: collected cloud material.
- Collection + Convergence: compacted supply.
- Envelop + Solidify: solid shell.
- Link + Weave/Project: linked manifestation.
- Stillness + motion: manifestation occurs, then freezes.
- Orb + Dispersion: a leaking shell, explicitly marked as interpretation.
- Radial + Fire: heat is retained while open flame is tempered.

The validation script currently checks 6,669 unique two-sign recipes (9 sigils
times all 741 unordered pairs with repetition), producing 6,144 distinct
executable effect plans. The remaining recipes intentionally collapse to an
existing plan when an incompatible sign is ignored with a warning. Every recipe
still has a deterministic ID, finite simulation parameters and an explicit
confidence state.

## Remaining Unknowns

- Diamond, Window, Crosshair, Sign of Wind and Glaives lack enough examples for
  definitive general behavior.
- Dispersion and Column have visible inverted forms, but the exact differences
  are not fully documented.
- Crush is confirmed with earth; other materials remain simulations, not canon.
- Some early-volume glyphs were revised. Newer documented forms take priority.
