# Logical Combination Audit

Date: 2026-08-11

## Scope

This audit checks whether simulator spell combinations keep a coherent material
result. The reference example is `Eau + Terre`: the expected material is
`boue`, not plain water, plain earth, or a generic effect.

The checked surface is:

- 11 indexed base-element mixtures.
- Runtime spell composition through `composeSpellRecipe`.
- 3D manifestation synthesis through `synthesizeManifestation`.
- Phase-gated signs that are ignored when the material cannot support them.

## Summary

The indexed pure element mixtures are logically mapped:

| Combination | Current material | Logical status |
| --- | --- | --- |
| `Eau + Terre` | `boue` | OK |
| `Feu + Eau` | `vapeur` | OK |
| `Eau + Vent` | `brume` | OK |
| `Feu + Terre` | `terre chauffee` | OK |
| `Feu + Vent` | `flamme entrainee` | OK |
| `Terre + Vent` | `poussiere` | OK |
| `Eau + Terre + Vent` | `boue mouvante` | OK |
| `Feu + Eau + Vent` | `vapeur sous pression` | OK |
| `Feu + Eau + Terre` | `boue chauffee` | OK |
| `Feu + Terre + Vent` | `cendre` | OK |
| `Feu + Eau + Terre + Vent` | `melange elementaire instable` | OK, but experimental |

Two logic problems remain.

## P1: Mixed Elements Lose Their Element List In 3D

`composeSpellRecipe` correctly chooses the material family, but
`manifestation-synthesis.mjs` reads `elementalMixture.elements` as if every
entry were an object with a `.name` field. The array actually contains strings
such as `"Eau"` and `"Terre"`.

Observed result for every indexed mixture:

```text
Eau + Terre -> material family: mud
3D material elements: ["undefined"]
```

Impact:

- The visible label can still say `Boue`.
- The underlying 3D material metadata is wrong.
- Any future 3D rule that checks `water`, `earth`, `fire`, or `wind` through
  the element list can fail even when the material family is correct.

Required correction:

`elementNames()` should accept string entries directly:

```text
["Eau", "Terre"] -> ["eau", "terre"]
```

## P1: Extra Non-Element Sigils Break Base-Element Mixtures

Pure `Eau + Terre` produces `boue`, but `Eau + Terre + Lumiere` currently falls
back to a single primary sigil. This happens because `composeElementalMixture`
rejects the whole mixture as soon as any non-base sigil is present.

Examples:

| Input | Expected material | Current material |
| --- | --- | --- |
| `Eau + Terre + Lumiere` | `boue` plus light modifier or warning | `eau` |
| `Feu + Eau + Lumiere` | `vapeur` plus light modifier or warning | `eau` |
| `Eau + Vent + Lumiere` | `brume` plus light modifier or warning | `eau` |
| `Feu + Terre + Lumiere` | `terre chauffee` plus light modifier or warning | `feu` |
| `Feu + Vent + Lumiere` | `flamme entrainee` plus light modifier or warning | `feu` |
| `Terre + Vent + Lumiere` | `poussiere` plus light modifier or warning | `lumiere` |
| `Eau + Terre + Vent + Lumiere` | `boue mouvante` plus light modifier or warning | `eau` |
| `Feu + Eau + Vent + Lumiere` | `vapeur sous pression` plus light modifier or warning | `eau` |
| `Feu + Eau + Terre + Lumiere` | `boue chauffee` plus light modifier or warning | `eau` |
| `Feu + Terre + Vent + Lumiere` | `cendre` plus light modifier or warning | `feu` |
| `Feu + Eau + Terre + Vent + Lumiere` | `melange elementaire instable` plus light modifier or warning | `eau` |

Impact:

- User-created circles with an elemental mixture and an extra sigil can produce
  a result that looks illogical.
- The library matrix is safe because it indexes pure material signatures, but
  the workshop is not safe because users can place arbitrary sigils together.

Required correction:

Base-element mixture inference should ignore unrelated non-base sigils for the
material base, then report the extra sigils as secondary, uncertain, or
competing modifiers.

## P2: Some Signs Are Correctly Ignored, But Need Clearer User Feedback

The simulator already ignores solid-only signs on gas or aerosol mixtures:

| Material | Ignored signs | Current status |
| --- | --- | --- |
| `vapeur` | `Etirement`, `Spire physique`, `Enlacement` | Logical |
| `brume` | `Etirement`, `Spire physique`, `Enlacement` | Logical |
| `flamme entrainee` | `Etirement`, `Spire physique`, `Enlacement` | Logical |
| `vapeur sous pression` | `Etirement`, `Spire physique`, `Enlacement` | Logical |

This is not a material bug: stretching, coiling, and entwining require a solid
phase. The weak point is presentation. A user can read this as "the spell did
nothing" instead of "this sign cannot act on this phase".

Required correction:

Keep the ignore behavior, but surface it more strongly in the Details drawer and
library detail page.

## Recommended Fix Order

1. Fix `elementNames()` so 3D receives real element ids for all mixtures.
2. Change `composeElementalMixture()` so non-base sigils do not cancel base
   mixtures.
3. Add regression tests for:
   - `Eau + Terre -> mud` and 3D elements `["eau", "terre"]`.
   - `Eau + Terre + Lumiere -> mud`, with `Lumiere` treated separately.
   - Every indexed mixture plus one non-base sigil still keeps its base material.
4. Improve UI warnings for phase-incompatible signs.

## Audit Commands

The key audit was run with `node --input-type=module` against
`elemental-mixtures.mjs`, `spell-grammar.mjs`, and
`manifestation-synthesis.mjs`. It found:

```text
11 / 11 pure indexed mixtures keep the expected material family.
11 / 11 pure indexed mixtures expose ["undefined"] as 3D element metadata.
11 / 11 indexed mixtures break when the same test adds Lumiere.
12 phase-incompatible sign cases are ignored intentionally.
```
