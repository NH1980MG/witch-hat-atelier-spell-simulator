# Task 7 Documentation Report

## Scope

This documentation-only step records the photo-recognition workflow and the
release gate for the remaining regression, browser, scope, and GitHub Pages
checks. Product code, `minecraft-mod/`, browser testing, and publication were
not changed or run in this step.

## Documented behavior

- Photo import offers an editable recreation or the original image as an
  onion-skin guide.
- Recognition runs locally and works best with a complete, well-lit circle.
- Ambiguous regions can be corrected; unreadable regions are reported and are
  not auto-converted. Recognition is not promised to be perfect.
- Practice reports score, coverage, proportion, orientation, missing strokes,
  extra strokes, and penalty diagnostics.
- The `Functionnement` page is documented as the workflow reference.

## Changed files

- `README.md`
- `docs/release-checklist.md`
- `.superpowers/sdd/2026-08-08-photo-practice-explanation-release/task-7-report.md`

## Verification and commit

- `git diff --check`: passed.
- Browser and publication checklist items remain unchecked for controller
  verification.
- Commit: `docs: document photo recognition workflow`
- Commit hash: `17541ca`

## Controller verification

- `node --check app.js`: passed.
- `node --test tests/*.test.mjs`: 322 passed, 0 failed.
- Desktop and 390 x 844 mobile layouts were exercised in the in-app browser.
- The supplied partial-circle screenshot was rejected for editable recreation
  but saved and rendered as a resizable personal guide.
- A closed nested-circle PNG exposed and then verified a ring-detection fix;
  selecting the ambiguous Water candidate recreated one ring and one symbol.
- Practice produced a 49% score with coverage, missing/extra stroke,
  proportion, orientation, and penalty feedback.
- Right-click selection enabled the selection resizing controls.
- Activation opened a nonblank animated 3D scene after its ritual duration.
- `fonctionnement.html` rendered its English and French headings correctly.
- The short desktop viewport exposed and then verified a compact three-column
  tool layout so the Pen remains clickable below the header.
