# Logical Combination Audit

Date: 2026-08-11

## Scope

This audit checks whether simulator spell combinations keep a coherent material
result. `Eau + Terre -> boue` is only the reference example; the audit covers
the full public recipe matrix plus a separate free-sigil stress test.

The checked surface is:

- 40 indexed material signatures: 29 single sigils plus 11 base-element
  mixtures.
- 820 unordered sign pairs per material signature.
- 2 support modes: paper and shoe.
- 65,600 public matrix recipes.
- 275 free workshop stress cases: every indexed mixture plus one non-base
  sigil.
- Runtime spell composition through `composeSpellRecipe`.
- 3D manifestation synthesis through `synthesizeManifestation`.
- Phase-gated and family-gated signs.

## Summary

Verdict: not every combination is fully logical yet.

The exhaustive matrix has good baseline stability:

| Check | Result |
| --- | --- |
| Public matrix recipes checked | 65,600 |
| Runtime exceptions | 0 |
| Material family mismatches inside indexed matrix | 0 |
| Missing manifestation labels | 0 |
| Non-finite 3D numbers | 0 |
| Unsupported ignored signs | 0 |
| Fire shoe hazard misses | 0 |
| Distinct manifestation ids generated | 1,840 |

But the audit found three logic problems:

| Priority | Problem | Count |
| --- | --- | --- |
| P1 | Mixed materials expose `["undefined"]` as 3D element metadata | 18,040 |
| P1 | Free mixtures break when a non-base sigil is added | 275 / 275 stress cases |
| P2 | Element-family signs become uncertain even when their element exists in the mixture | 1,722 |

The indexed pure element mixtures are still logically mapped at the material
family level:

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

These rows mean the material family is right. They do not mean every downstream
3D field, warning, or free workshop composition is right.

## P1: Mixed Elements Lose Their Element List In 3D

`composeSpellRecipe` correctly chooses the material family, but
`manifestation-synthesis.mjs` reads `elementalMixture.elements` as if every
entry were an object with a `.name` field. The array actually contains strings
such as `"Eau"` and `"Terre"`.

Observed result for every indexed mixture recipe:

```text
Eau + Terre -> material family: mud
3D material elements: ["undefined"]
```

This affects all 18,040 public matrix recipes that use one of the 11 indexed
mixtures:

```text
11 mixture signatures * 820 sign pairs * 2 supports = 18,040 recipes
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

The stress test checked every indexed mixture plus every non-base sigil:

```text
11 mixtures * 25 non-base sigils = 275 free workshop cases
275 / 275 broke the expected base mixture
```

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

## P2: Element-Family Signs Are Too Strict On Mixtures

Some signs are documented for a base family, but the current compatibility check
only compares against the final mixture family. This makes a logically compatible
sign look uncertain.

Examples:

| Input | Current warning | Why this is suspect |
| --- | --- | --- |
| `Eau + Terre + Crush` | `Crush est documente pour earth; son effet sur boue reste une interpretation.` | `boue` contains `Terre`, so earth-state operations should be eligible. |
| `Eau + Vent + Signe de vent` | wind sign is treated as uncertain on `brume` | `brume` contains `Vent`. |
| `Eau + Vent + Aeriforme defini` | air/wind modifier is treated as uncertain on `brume` | `brume` contains `Vent` and a gas phase. |
| `Terre + Vent + Signe de vent` | wind sign is treated as uncertain on `poussiere` | `poussiere` contains `Vent`. |

The exhaustive matrix found 1,722 such cases. They do not usually break the
final material, but they lower confidence and add misleading warnings.

Required correction:

Family-gated signs should accept an elemental mixture when the mixture contains
one of the required base families. The warning should only remain when the sign
targets a family that is absent from the mixture.

## P3: Some Signs Are Correctly Ignored, But Need Clearer User Feedback

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

## Not Flagged As Material Bugs

The audit did not flag these cases as illogical:

- Phase-incompatible signs ignored intentionally: 7,440 occurrences.
- Contradictory signs such as `Orbe + Dispersion` and `Immobilite + Levitation`
  are allowed when warnings describe the sequencing or conflict.
- Shoe support with fire-containing materials keeps hazard handling.
- All indexed material signatures keep their expected material family in the
  public 65,600-recipe matrix.

## Recommended Fix Order

1. Fix `elementNames()` so 3D receives real element ids for all mixtures.
2. Change `composeElementalMixture()` so non-base sigils do not cancel base
   mixtures.
3. Add regression tests for:
   - `Eau + Terre -> mud` and 3D elements `["eau", "terre"]`.
   - `Eau + Terre + Lumiere -> mud`, with `Lumiere` treated separately.
   - Every indexed mixture plus one non-base sigil still keeps its base material.
4. Update family compatibility so signs documented for `earth`, `wind`, `water`,
   or `fire` recognize mixtures containing those elements.
5. Improve UI warnings for phase-incompatible signs.

## Audit Commands

The key audit was run with `node --input-type=module` against
`elemental-mixtures.mjs`, `spell-grammar.mjs`, and
`manifestation-synthesis.mjs`. It found:

```text
65,600 / 65,600 public matrix recipes evaluated without exception.
0 material family mismatches inside the indexed public matrix.
18,040 mixture recipes expose ["undefined"] as 3D element metadata.
275 / 275 free mixture-plus-non-base-sigil stress cases break the base mixture.
1,722 family-gated sign cases are probably too uncertain on mixtures.
7,440 phase-incompatible sign cases are ignored intentionally.
```
