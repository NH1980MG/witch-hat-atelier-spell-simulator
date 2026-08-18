# Photo Detection Segmentation Design

## Goal

Produce one editable detection region per drawn symbol while keeping the magic
circle as a ring, even when the photographed ring is thick or touches nearby
marks.

## Root Cause

The recognizer tests only rotations from -12 to +12 degrees even though signs
are commonly arranged around a circle at quarter turns or diagonal angles.
Those signs therefore receive unrelated candidates. Small disconnected strokes
are also discarded before grouping, so a Crosshair-like mark can disappear or
be split. A regression case confirmed that thick-ring removal itself already
works and must be preserved.

## Design

- Compare each grouped symbol over a deterministic full-turn rotation sweep.
  A 12-degree step limits angular error to 6 degrees while preserving speed.
- Keep small but meaningful components until after spatial grouping, then apply
  the existing minimum span to the combined group.
- Keep the existing stroke-width grouping cap and ring-crossing guard so nearby
  complete glyphs remain separate.
- Keep unreadable regions editable, but prevent residual ring arcs from forming
  oversized regions.
- Preserve deterministic, dependency-free browser and Node behavior.

## Acceptance Criteria

- A thick ring is detected once and does not create quadrant-sized regions.
- A disconnected Crosshair is grouped as one region.
- Symbols rotated by -90, +90, and 180 degrees retain their identity and angle.
- Two nearby complete glyphs remain separate.
- Existing photo import, placement, and recognition tests continue to pass.
