# QA Plan

The core risk is visual: a spell may parse correctly but produce a blank,
unclear, or wrong 3D result. QA needs to check behavior and rendering.

## Current Manual Checks

- Open `http://127.0.0.1:8000/index.html` in a browser.
- Draw or place a central sigil.
- Add a closed boundary.
- Press `Lire`.
- Press `Activer`.
- Confirm the 3D panel opens and the effect is visible.
- Try undo, redo, clear, and PNG export.

## Current Automated Checks

These checks have been run manually from the project folder:

```bash
node --check app.js
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node scripts/validate-spell-matrix.mjs
```

The matrix check must report:

- 47 drawings;
- 9 central sigils;
- 38 modifier signs;
- exactly 13,338 tested, unique and deterministic variants;
- exactly 6,669 recipes for `none` and 6,669 for `shoe`;
- 12,288 structured executable plans (plans may be fewer than identities when
  incompatible signs are ignored);
- no missing drawing, duplicate drawing, unknown drawing, nondeterministic
  result or non-finite simulation parameter.
- all 19 semantic invariants pass, including radial/directional separation,
  incompatible material filtering, staged stillness, target-conflict warnings
  repeated-sign scaling, bare-ring energy, balance, tilt and disconnected marks.

Also parse `index.html`, `bibliotheque.html`, `tutoriel.html`, and
`parametres.html` with an HTML parser before publishing.

## Browser Smoke Test

The latest browser pass succeeded on 2026-07-16. Detailed measurements and
screenshots are recorded in `docs/qa/2026-07-16-library-tutorial-results.md`.

1. Opens the simulator.
2. Selects or creates a water spell.
3. Activates it.
4. Confirms the 2D canvas is nonblank.
5. Confirms the 3D canvas is nonblank.
6. Captures screenshots at desktop and mobile widths.
7. Opens `Sigils et signes` and confirms all icon canvases are nonblank.
8. Places four rotated Levitation signs and confirms they remain Levitation,
   not Column/Region fragments.
9. Reads a combination and confirms the status is a list containing execution
   stages, confidence and any uncertainty warnings.

Observed results:

- 47 unique symbols, 47 non-empty SVGs, zero duplicate path sets.
- `Eau + Orbe + Levitation` remained three separate traces and produced the
  ordered pipeline `matiere -> forme -> mouvement`.
- The 3D screenshot contained 11,222 sampled colors with non-zero luminance
  variance; a later frame changed 1,307 pixels, confirming live animation.
- Desktop 1280 x 720 and mobile 390 x 844 had no horizontal overflow, clipped
  visible text or visible element outside the viewport.
- A circle drawn at mobile size remained centered after changing to desktop and
  back to mobile.
- Browser console warnings/errors: none.
- The no-support raw ring and Water + shoe scenarios both opened a nonblank 3D
  scene. The latter kept the paper below grounded, recognizable shoes.

## Water Vertical Slice Acceptance

The water slice is acceptable when:

- `Eau + Orbe` creates a floating sphere.
- `Eau + Colonne` creates a vertical stream or jet.
- `Eau + Levitation` creates a lifted water mass.
- At least one directional water spell moves along the direction vector.
- Low and high force values are visibly different.
- Low and high stability values are visibly different.
- The 3D panel can be opened and closed without leaving stale animation state.
- Stillness freezes a formed effect while Bind and Solidify remain distinct.
- Orb + Dispersion reports its interpretation warning and shows both
  containment and leakage.

## Visual Regression Targets

Use stable example diagrams for screenshots:

- `water-orb-basic`
- `water-column-basic`
- `water-levitation-basic`
- `fire-projectile-basic` once fire is implemented
- `wind-traction-basic` once wind is implemented

Each screenshot should confirm:

- Canvas is not blank.
- 3D effect is centered and visible.
- Controls do not overlap important content.
- Text fits at desktop and mobile widths.
- Symbol names and confidence labels remain inside their picker rows.
- The symbol shown in the picker matches the symbol placed on the canvas.
