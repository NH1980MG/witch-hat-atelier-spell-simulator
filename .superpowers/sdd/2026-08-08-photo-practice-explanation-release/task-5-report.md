# Task 5 Report: Editable Photo Review And Two Import Outputs

## Status

DONE_WITH_CONCERNS

Implementation, automated verification, staged-diff review, and commit are complete. Browser verification is intentionally deferred to Task 7 per user direction.

## Files

- Created `photo-placement.mjs` with `photoContentBounds(analysis)` and `mapPhotoAnalysis(analysis, target)`.
- Created `tests/photo-placement.test.mjs` for complete ring/symbol extents, uniform contain scaling, candidate confirmation, and empty recreation output.
- Modified `index.html`, `app.js`, and `styles.css` for corrected-crop review, one row per region, top-three ambiguous candidate correction, separate recreation/guide actions, responsive layout, and raster guide rendering.
- Modified `guide-storage.mjs` and `tests/guide-storage.test.mjs` for sanitized raster-only personal guides with no drawing actions.
- Modified `i18n.mjs`, `site-i18n.mjs`, and `tests/photo-import-ui.test.mjs` for bilingual review/output behavior and the new cache revision.
- Modified `tests/i18n-runtime.test.mjs`, `tests/support-illustrations.test.mjs`, `tests/symbol-catalog.test.mjs`, and `tests/symbol-palette-ui.test.mjs` only to update exact cache-contract assertions from prior revisions to `20260808-photo-review-v1`.

No `minecraft-mod/` file was edited or staged.

## Commit

`feat: review and reuse imported circles` (this commit)

## Exact Red, Green, And Full Tests

### Red

- Command: `node --test tests/photo-placement.test.mjs tests/photo-import-ui.test.mjs tests/guide-storage.test.mjs`
- Result: 5 passed, 8 failed.
- Expected failures: `photo-placement.mjs` did not exist, raster-only guides were rejected, the legacy single confirmation button remained, candidate review/corrected-crop patterns were absent, and new i18n keys were absent.

### Focused Green

- Command: `node --test tests/photo-placement.test.mjs tests/photo-import-ui.test.mjs tests/guide-storage.test.mjs`
- Result: 17 passed, 0 failed.

### Syntax

- Command: `node --check app.js`
- Result: exit 0.

### First Full Run

- Command: `node --test tests/*.test.mjs`
- Result: 311 passed, 4 failed.
- Cause: four stale cache-version assertions after the required asset revision bump. No Task 5 runtime or behavior test failed.

### Cache Contract Green

- Command: `node --test tests/i18n-runtime.test.mjs tests/support-illustrations.test.mjs tests/symbol-catalog.test.mjs tests/symbol-palette-ui.test.mjs`
- Result: 28 passed, 0 failed.

### Final Fresh Verification

- Command: `node --test tests/photo-placement.test.mjs tests/photo-import-ui.test.mjs tests/guide-storage.test.mjs`
- Result: 17 passed, 0 failed.
- Command: `node --check app.js`
- Result: exit 0.
- Command: `node --test tests/*.test.mjs`
- Result: 315 passed, 0 failed.
- Command: `git diff --check`
- Result: exit 0.

## Self-Review

- Confirmed Task 4 confidence statuses and thresholds are untouched; Task 5 only records explicit ambiguous-region confirmation through `selectedName`.
- Confirmed unconfirmed ambiguous and all unreadable regions are excluded from recreation.
- Confirmed placement uses complete ring radii and symbol extents with one uniform contain scale.
- Confirmed overlays use corrected-crop coordinates and the preview uses `object-fit: contain`.
- Confirmed raster guide creation calls `createUserGuide([], { raster: ... })`, does not call `recordHistory`, and does not mutate `state.actions`.
- Confirmed raster guide rendering and resize calculations preserve aspect ratio.
- Confirmed storage failure keeps a session-only guide and reports that persistence failed.
- Confirmed raster source validation accepts only base64 PNG/JPEG/WebP data URLs with positive dimensions.
- Confirmed all four auxiliary changed test files contain only necessary cache-contract revision updates.
- Confirmed the complete changed-file scope contains no `minecraft-mod/` path.

## Concerns

- Browser verification was not run in Task 5 and is deferred to Task 7, which owns end-to-end smoke testing of both output actions, ambiguous correction, non-circle input, and mobile layout.
- Raster guides use browser local storage and can exceed browser quota for complex images. The implementation keeps the guide usable for the current session and reports the persistence failure.
