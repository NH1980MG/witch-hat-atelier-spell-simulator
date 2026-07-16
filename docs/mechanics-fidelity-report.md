# Mechanics Fidelity Report

Date: 2026-07-16

## Scope

The validated matrix contains one of 9 central sigils, one unordered pair from
38 signs with repetition, and one of 2 support modes:

```text
38 * 39 / 2 = 741 sign pairs
26 * 741 = 19,266 recipes per support
19,266 * 2 = 38,532 tested variants
```

This is a simulator validation matrix, not a claim that the manga contains
38,532 named spells. Three-sign, multi-sigil, linked, nested and arbitrary
freehand-geometry variants are outside this count.

## Fidelity Levels

- `documented`: a rule or fixture is directly supported by the research set.
- `inferred`: a documented rule is composed into a combination not shown
  directly.
- `experimental`: a simulator-coherent result where research does not define
  one.

The Details drawer exposes the level, applied rules, ignored marks and warnings.

## Implemented Rules

- A closed ring carries energy; an open ring cannot activate.
- Disconnected marks are ignored.
- Relative sign size and placement affect pressure, direction and balance.
- Sign tilt adds rotation while reducing reach.
- Only documented inversions are applied.
- Operations follow a stable order.
- Unknown support identifiers are rejected.
- With no support, paper rests on the surface.
- Shoe support uses a small paper under the sole and accepts circles up to
  35 cm; the global physical limits remain 5 cm to 5 m.
- The documented wind-underfoot fixture has the highest support fidelity.
  Arbitrary shoe combinations are explicitly marked inferred or experimental.

## 3D And Activation

Activation freezes the exact recipe, drawing, support, dimensions and geometry.
The 3D view uses that snapshot and stable identifiers instead of translated
labels. Shoe paper is parented below the carrier; water and fire surface effects
start on the desk, while earth starts at the desk and supports the sole.

## Public Library

The library contains 33 deterministic original simulator schematics. It does
not embed official reproductions, local reference screenshots or remote images.
Spell names and categories are research labels; the schematic drawing itself is
marked experimental.

## Remaining Limits

- Freehand recognition is heuristic.
- Many combinations are inferred or experimental rather than directly shown.
- The matrix validates semantic plans, not every possible freehand geometry.
- Browser QA is documented but is not yet an automated screenshot-diff service.
