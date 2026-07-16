# Progress Tracker

Last updated: 2026-07-16.

## Current Status

The project is in advanced prototype stage. The static simulator has a shared
symbol catalogue, grouped freehand recognition, a deterministic spell grammar
and a composable 3D activation view. The current manual browser regression pass
is complete; the next target is automating it and gradually extracting the
remaining large `app.js` sections.

## Done

- Static browser app with `index.html`, `styles.css`, and `app.js`.
- Shared `symbol-catalog.mjs` with 47 audited vector drawings used by the
  picker, 2D canvas and sampled 3D ink.
- All 47 drawings are mapped to their local capture suffix; the latest pass
  corrected Repetition, Glaives, Envelop, Enlarge, Rain, Purify and Stillness.
- Pure `spell-grammar.mjs` with separate material, supply, state, form, motion,
  target, scope, relation and power axes.
- Automatic validation of 13,338 unique two-sign/support variants: 6,669 with
  paper only and 6,669 with shoe support. The matrix contains 12,288 distinct
  executable plans plus 19 semantic regression checks.
- Canonical spell identities now preserve exact geometry, support and recipe
  state. Activation freezes an immutable snapshot so reading, activation and
  the 3D view cannot silently disagree.
- Seal geometry now accounts for relative sign size, radial balance, signed
  tilt/rotation, reduced reach and disconnected marks. A bare complete ring
  produces a short raw-energy discharge.
- Browser smoke test at 1280 x 720 and 390 x 844: no console warning/error,
  horizontal overflow, clipped visible text or off-screen visible control.
- Browser audit confirms 47 unique non-empty SVG drawings with no duplicate
  path set and no overflow in the symbol drawer.
- End-to-end `Eau + Orbe + Levitation` test confirms separate sigil/sign traces,
  an ordered `matiere -> forme -> mouvement` reading, a nonblank 3D scene and
  measurable frame-to-frame animation.
- The parchment compensates viewport-size changes so an existing circle stays
  centered when moving between desktop and mobile layouts.
- Radial placement is separate from physical direction, preventing
  semi-directional signs from becoming false movement vectors.
- Parchment drawing canvas.
- Tool island: plume, seal, double ring, ray, glyph, spiral, eraser.
- Symbol drawer with central sigils and modifier signs.
- Spell state metrics: element, precision, duration, stability, force.
- Diameter readout, optional on-canvas counter, one grid cell equals 5 cm, and
  activation blocked below 5 cm or above 5 m while still showing the true value
  in red.
- Object support drawer reduced to no-link default and flying shoe only.
- Flying shoe support is limited to small circles, uses an underside semelle
  view, and has element-specific live effects for fire, water, wind, earth,
  light, crystal, aeriform, levitation, and convergence.
- Default support is reset to no-link on each new page load.
- Freehand modifier signs around the circle are classified as separate
  modifiers instead of remaining only as plume strokes or replacing the central
  sigil.
- Freehand recognition now uses a stricter center-vs-ring split: the central
  sigil is no longer counted as repeated `Region`, `Colonne`, or wind signs.
- Multi-stroke modifier signs are grouped before recognition, and rotation now
  controls direction without changing the sign identity.
- Water recognition uses its side drops to avoid confusion with Wind and
  Aeriform, while unknown outer marks stay unclassified instead of becoming
  false `Region` signs.
- Signs can combine into compound effects such as diffuse column, rising
  platform, directed projectiles, contained rain, water mist, collected cloud,
  compacted matter, material ribbon, cold rain, and rotating intake.
- Every current sign operation has a composable 3D layer or an element-specific
  manifestation; duplicate signs scale the calculated effect parameters.
- Stillness freezes a completed manifestation instead of being confused with
  Bind or Solidify.
- The 3D view has improved depth cues: soft shadows, table seams, paper shadow,
  clearer rings, brighter atelier lighting, filmic tone mapping, richer
  materials, and combined sign effects that replace conflicting primitive
  overlays.
- Sign drawings and sign icons were refined for Column, Levitation, Region,
  Rain, Orb, and Sign of Wind.
- Flying shoe 3D support is proportional to a real shoe, keeps the paper under
  the sole, and animates its support effect directly.
- Added `SECURITY.md`, release checklist, CSP headers, and public-asset ignore
  rules for GitHub preparation.
- Two-finger trackpad/touch panning moves the parchment grid and drawing
  together.
- Central sigil recognition is separated from modifier signs.
- HTTP local URL is the only supported entry point for the site.
- Scale control now behaves like visual zoom from x0.5 to x2 while preserving
  the physical circle size and compensating stroke visibility.
- Manual and auto activation modes.
- Undo, redo, clear, keyboard shortcuts, and PNG export.
- Three.js 3D view with richer atelier/exterior environments.
- Library page restored with 33 local, original SVG simulator schematics,
  stable categories and bilingual labels. No remote or copied panel image is
  required by the public build.
- Tutorial updated in French and English with the exact 13,338-variant matrix,
  ring, balance, rotation, support and physical-size rules.
- Desktop and mobile browser QA completed for the library and tutorial, plus
  nonblank raw-ring and water-on-shoe 3D activation scenes.
- Tutorial and settings pages.
- Legacy Python prototype removed; the HTTP static site is the only maintained
  version.
- Initial review and documentation set.
- Reference manifest scaffold.
- QA plan scaffold.

## In Progress

- Automating the completed manual browser smoke test.
- Extracting effect layers from `app.js` without adding a build system.

## Next Milestones

### M1: Reference Catalog

Status: complete for the current reference set.

Tasks:

- Keep the reference inventory synchronized when references change.

Exit criteria:

- Every local screenshot has a source note or is removed from the project.
- Public build policy is clear.

### M2: Effect Recipe Engine

Status: implemented in the current static architecture.

Tasks:

- Continue extracting operation layers into small modules.
- Add fixture recipes for browser regression tests.

Exit criteria:

- `Lire` and `Activer` use the same grammar result.
- Every sign pair receives a deterministic effect plan.

### M3: Water Vertical Slice

Status: partial prototype.

Tasks:

- Move the implemented `water.orb`, `water.column`, `water.levitation`,
  `water.projectile`, `water.rain`, puddle, and mist behaviors into named recipe
  modules.
- Add visual QA screenshots.

Exit criteria:

- At least three different water diagrams create visibly different 3D results.
- The effect can be tested from a stable example diagram.

### M4: Library Becomes Interactive

Status: not started.

Tasks:

- Move spell examples into structured data.
- Add "load into atelier" behavior from the library page.
- Keep library examples aligned with effect recipes.

Exit criteria:

- A user can open the library, load Water Orb, activate it, and see the effect.

### M5: Broader Element Pass

Status: not started.

Tasks:

- Fire: flame, projectile, dispersion.
- Wind: current, traction, platform.
- Earth: wall, crush, solidify.
- Light: beam, lamp, projection.
- Crystal: structure, ribbon, focus.

Exit criteria:

- Each major element has at least one distinct 3D effect.

## Backlog

- Add visual regression tests.
- Add reduced-motion handling.
- Continue expanding the bilingual catalogue as new mechanics are documented.
- Keep the public project name as `Witch Hat Atelier Simulator`.
- Decide whether to use a package manager or continue static ES modules.
- Add official/fan disclaimer in UI or README before public promotion.
- Consider short 3D animation export after effects stabilize.

## Decisions

- 2026-06-29: Keep app runtime static for now.
- 2026-06-29: Treat anime and manga visuals as references, not copied assets.
- 2026-06-29: Use water as the first effect-system vertical slice.
- 2026-06-29: Keep engineering docs in English while the current UI remains
  French.
