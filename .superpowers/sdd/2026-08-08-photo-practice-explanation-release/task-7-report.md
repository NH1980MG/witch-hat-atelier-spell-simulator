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
- Commit hash: `PENDING_UNTIL_COMMIT`
