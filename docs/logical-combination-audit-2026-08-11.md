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

Verdict after implementation: the audited internal logic defects are resolved.
The remaining limits are interpretation limits, not data-shape or material
composition bugs.

Final verification:

| Check | Result |
| --- | --- |
| Public matrix recipes checked | 65,600 |
| Runtime exceptions | 0 |
| Material family mismatches inside indexed matrix | 0 |
| Missing manifestation labels | 0 |
| Non-finite 3D numbers | 0 |
| 3D `undefined` element metadata | 0 |
| Free mixture-plus-non-base-sigil failures | 0 / 275 |
| Family-gated signs falsely uncertain on compatible mixtures | 0 |
| Unsupported ignored signs | 0 |
| Phase-incompatible signs ignored intentionally | 7,440 |
| Fire shoe hazard misses | 0 |

Resolved findings:

| Priority | Problem | Resolution |
| --- | --- | --- |
| P1 | Mixed materials exposed `["undefined"]` as 3D element metadata | Fixed in `0473f13` |
| P1 | Free mixtures broke when a non-base sigil was added | Fixed in `2e5402c` |
| P2 | Element-family signs became uncertain even when their element existed in the mixture | Fixed in `430ddf9` |
| Regression coverage | No exhaustive guard covered all three bug classes | Added in `4f8d06e` |

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

These rows now mean the material family is right and the downstream
manifestation metadata keeps the expected base element ids.

## Resolved P1: Mixed Elements Lost Their Element List In 3D

Before `0473f13`, `composeSpellRecipe` correctly chose the material family, but
`manifestation-synthesis.mjs` reads `elementalMixture.elements` as if every
entry were an object with a `.name` field. The array actually contains strings
such as `"Eau"` and `"Terre"`.

Old observed result for every indexed mixture recipe:

```text
Eau + Terre -> material family: mud
3D material elements: ["undefined"]
```

This affected all 18,040 public matrix recipes that use one of the 11 indexed
mixtures:

```text
11 mixture signatures * 820 sign pairs * 2 supports = 18,040 recipes
```

Current result:

```text
["Eau", "Terre"] -> ["eau", "terre"]
3D undefined element metadata: 0
```

## Resolved P1: Extra Non-Element Sigils Broke Base-Element Mixtures

Before `2e5402c`, pure `Eau + Terre` produced `boue`, but
`Eau + Terre + Lumiere` fell back to a single primary sigil. This happened
because `composeElementalMixture` rejected the whole mixture as soon as any
non-base sigil was present.

The stress test checked every indexed mixture plus every non-base sigil:

```text
11 mixtures * 25 non-base sigils = 275 free workshop cases
```

Old examples:

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

Current behavior:

- Base-element mixture inference ignores unrelated non-base sigils for the
  material base.
- Extra sigils remain visible as secondary symbols.
- The recipe exposes `secondarySigils`.
- Free mixture-plus-non-base-sigil failures: 0 / 275.

## Resolved P2: Element-Family Signs Were Too Strict On Mixtures

Before `430ddf9`, some signs documented for a base family were compared only
against the final mixture family. This made a logically compatible sign look
uncertain.

Old examples:

| Input | Current warning | Why this is suspect |
| --- | --- | --- |
| `Eau + Terre + Crush` | `Crush est documente pour earth; son effet sur boue reste une interpretation.` | `boue` contains `Terre`, so earth-state operations should be eligible. |
| `Eau + Vent + Signe de vent` | wind sign is treated as uncertain on `brume` | `brume` contains `Vent`. |
| `Eau + Vent + Aeriforme defini` | air/wind modifier is treated as uncertain on `brume` | `brume` contains `Vent` and a gas phase. |
| `Terre + Vent + Signe de vent` | wind sign is treated as uncertain on `poussiere` | `poussiere` contains `Vent`. |

Current behavior:

- Family-gated signs accept an elemental mixture when the mixture contains one
  of the required base families.
- The warning remains when the required family is absent.
- The sign's profile fidelity still controls final confidence; the fix does not
  promote inferred or experimental rules to documented.
- Family-gated signs falsely uncertain on compatible mixtures: 0.

## Remaining Interpretation Limit: Phase-Incompatible Signs

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

Recommended future UX improvement:

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

Completed:

1. Fixed `elementNames()` so 3D receives real element ids for all mixtures.
2. Changed `composeElementalMixture()` so non-base sigils do not cancel base
   mixtures.
3. Added regression tests for:
   - `Eau + Terre -> mud` and 3D elements `["eau", "terre"]`.
   - `Eau + Terre + Lumiere -> mud`, with `Lumiere` treated separately.
   - Every indexed mixture plus one non-base sigil still keeps its base material.
4. Updated family compatibility so signs documented for `earth`, `wind`,
   `water`, or `fire` recognize mixtures containing those elements.

Remaining follow-up:

1. Improve UI warnings for phase-incompatible signs.

## Audit Commands

The key audit was run with `node --input-type=module` against
`elemental-mixtures.mjs`, `spell-grammar.mjs`, and
`manifestation-synthesis.mjs`. It found:

```text
65,600 / 65,600 public matrix recipes evaluated without exception.
0 material family mismatches inside the indexed public matrix.
0 mixture recipes expose ["undefined"] as 3D element metadata.
0 / 275 free mixture-plus-non-base-sigil stress cases break the base mixture.
0 family-gated sign cases are probably too uncertain on mixtures.
7,440 phase-incompatible sign cases are ignored intentionally.
```
