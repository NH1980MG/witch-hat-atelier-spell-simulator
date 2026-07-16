# 38,532 Matrix Correction

Date: 2026-07-16

## Cause

The previous public release indexed only 9 of the 26 mechanically profiled
central sigils. The remaining 17 profiles were incorrectly treated as editor-
only decoration, reducing the published total from 38,532 to 13,338.

## Correct Formula

```text
38 * 39 / 2 = 741 unordered sign pairs with repetition
26 profiled central sigils * 741 = 19,266 recipes per support
19,266 * 2 support modes = 38,532 variants
```

## Implemented Correction

- The public matrix now derives its sigil list from all `SIGIL_PROFILES`.
- The explorer indexes all 26 profiled sigils and all 38 signs.
- Each support mode contains exactly 19,266 variants.
- All 26 indexed sigils have English library labels and bilingual search terms.
- Library metadata, JSON-LD, tutorial text, README, architecture, release checks,
  fidelity documentation and progress tracking use the corrected total.

## Verification

- 38,532 tested, unique and deterministic recipe identities.
- 34,932 distinct executable plans.
- 19,266 paper-only and 19,266 shoe-support variants.
- 64 unique shared drawings and 64 visual reference identifiers.
- 19 semantic mechanics checks.
- 90 automated tests passed with zero failures.
- Security audit, syntax checks and whitespace checks passed.
- HTTP 200 confirmed for the workshop, library, tutorial, catalog module and
  worker module; served HTML contains the corrected formula and metadata.

The count remains a simulator validation matrix. It is not a claim that the
source material names 38,532 individual spells.
