# Library, Tutorial And 3D QA Results

Date: 2026-07-16

| Surface | Viewport / language | Result |
| --- | --- | --- |
| Library | 1280 x 720, EN and FR | 33 images loaded, 0 broken, 0 clipped, no horizontal overflow |
| Library | 390 x 844, FR | 33 images loaded, minimum card width 148.5 px, 0 clipped, no horizontal overflow |
| Tutorial | 1280 x 720, FR | 5 new sections, exact 13,338 total, 0 clipped |
| Tutorial | 390 x 844, FR | No clipped content or horizontal overflow |
| Raw ring | 1280 x 720, FR | 3D view opens, canvas is nonblank, exterior scene visible |
| Water + shoe | 1280 x 720, FR | Grounded separated shoes, paper and puddle below soles, 0 console errors |

Additional checks:

- The product title returns to the main atelier.
- Switching to French updates the heading, image alternatives, categories and
  fidelity labels.
- Browser QA exposed a missing recipe handoff in shoe activation; a regression
  test was added before fixing it.

Captured evidence:

- `docs/qa/screenshots/2026-07-16-library-desktop.png`
- `docs/qa/screenshots/2026-07-16-library-mobile.png`
- `docs/qa/screenshots/2026-07-16-tutorial-desktop.png`
- `docs/qa/screenshots/2026-07-16-tutorial-mobile.png`
- `docs/qa/screenshots/2026-07-16-3d-ring.png`
- `docs/qa/screenshots/2026-07-16-3d-shoe-water.png`
