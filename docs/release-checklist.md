# Release Checklist

Use this before pushing to GitHub or publishing a static site.

## Code Checks

- Run `node --check` on `app.js`, `symbol-catalog.mjs`,
  `spell-grammar.mjs`, and `scripts/validate-spell-matrix.mjs`.
- Run `node scripts/validate-spell-matrix.mjs`; require 47 drawings, 6,669
  unique recipes, 6,144 executable plans, and 19 semantic checks.
- Parse all HTML pages to catch broken tags.
- Search for risky browser APIs: `eval`, `new Function`, `document.write`,
  remote scripts, secrets, and unexpected `file://` links.
- Confirm that Three.js is served from `vendor/three/` and that its MIT license
  is present; do not restore a runtime CDN dependency.

## Manual Smoke Test

- Open `http://127.0.0.1:8000/index.html`.
- Confirm the default support is `Aucun lien`.
- Draw a closed circle with a central sigil.
- Draw or place signs around the circle.
- Compare four equal directional signs with one enlarged sign; the latter must
  visibly deflect the manifestation and lower the balance reading.
- Tilt several directional signs in the same direction; rotation must increase
  while reach decreases.
- Place one mark outside the ring and confirm that `Lire` reports it as ignored.
- Activate a complete ring without a sigil and confirm a short raw-energy
  discharge instead of a material effect.
- Press `Lire` and confirm signs appear as signs, not only as plume strokes.
- Confirm the central sigil is not counted as repeated `Region`, `Colonne`, or
  `Signe de vent` entries.
- Combine two signs, such as `Projectile + Region` or `Pluie + Orbe`, and
  confirm the readout lists a combined effect.
- Press `Activer` and confirm the 3D view opens.
- Confirm the 3D view is nonblank, the paper touches the table, shadows render,
  and the combined effect is visible.
- Compare two frames and confirm an active effect changes before its duration
  ends, then stops when the spell dissipates.
- Test 1280 x 720 and 390 x 844; require no horizontal overflow, clipped text,
  off-screen visible control, or displacement of the circle after resizing.
- Open `Sigils et signes`; require 47 unique non-empty drawings and no clipped
  row text.
- Select the flying shoe support, activate again, and confirm the shoes are
  visible under the paper.
- Test `Bibliotheque`, `Tutoriel`, and `Parametres`, then return to the main
  menu from each page title.

## Public Asset Check

- Do not publish copied manga/anime panels as public-safe assets.
- Remove private study material and reference-derived screenshots from any
  public branch.
- Replace any temporary reference-derived imagery with original or clearly
  permitted assets before release.

## Deployment Notes

- The public site is maintained in the history-clean repository
  `NH1980MG/witch-hat-atelier-simulator`; do not make this private research
  repository public.
- Public URL: `https://nh1980mg.github.io/witch-hat-atelier-simulator/`.
- The public repository serves its `main` root through GitHub Pages and keeps
  `.nojekyll` present.
- Three.js is vendored locally under `vendor/three/`; no runtime CDN is needed.
