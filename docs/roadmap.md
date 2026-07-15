# Roadmap

Last updated: 2026-07-14.

This roadmap consolidates the current progress tracker and product brief into a
single view of what is happening now, what comes next, and what should stay in
scope.

## Now

- Finish automating the manual browser smoke test.
- Continue extracting effect layers from `app.js` into smaller modules.
- Keep the current static architecture.

## Next

### M1: Reference Catalog

- Keep the private reference inventory synchronized with
  the current reference inventory when captures change.
- Preserve the public/private asset boundary before any release work.

Exit criteria:

- Every local screenshot has a source note or is removed from the project.
- Public build policy is explicit.

### M2: Effect Recipe Engine

- Extract operation layers into small recipe modules.
- Add fixture recipes for browser regression tests.

Exit criteria:

- `Lire` and `Activer` use the same grammar result.
- Every sign pair receives a deterministic effect plan.

### M3: Water Vertical Slice

- Move the implemented water behaviors into named recipe modules.
- Add visual QA screenshots.

Exit criteria:

- At least three water diagrams create visibly different 3D results.
- The effect can be tested from a stable example diagram.

## Later

### M4: Library Becomes Interactive

- Move spell examples into structured data.
- Add "load into atelier" behavior from the library page.
- Keep library examples aligned with effect recipes.

Exit criteria:

- A user can open the library, load Water Orb, activate it, and see the
  effect.

### M5: Broader Element Pass

- Fire: flame, projectile, dispersion.
- Wind: current, traction, platform.
- Earth: wall, crush, solidify.
- Light: beam, lamp, projection.
- Crystal: structure, ribbon, focus.

Exit criteria:

- Each major element has at least one distinct 3D effect.

## Risks

- The public release needs a firm decision on copied reference material versus
  original recreations.
- The project still relies on a large `app.js`; extraction work needs to stay
  incremental to avoid regressions.
- Visual regression coverage is not automated yet.
- The docs and UI are currently split between English engineering notes and a
  French interface, so language strategy should be decided before broader
  release work.

## Source Docs

- [Progress tracker](progress-tracker.md)
- [Product brief](product-brief.md)
- [Release checklist](release-checklist.md)
- [QA plan](qa-plan.md)
