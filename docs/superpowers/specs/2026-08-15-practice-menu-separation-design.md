# Practice Menu Separation

## Goal

Make tracing practice a standalone workshop feature in the navigation menu instead of a ritual command.

## Design

- Remove the `Practice` button from the ritual command grid.
- Add a translated `Entrainement` / `Practice` link next to `Tutoriel` in every public page menu.
- Use `index.html#practice` as the stable destination. On the simulator page, the existing practice bar opens from that hash; on other pages, the link takes the user back to the simulator and opens it there.
- Keep the existing practice state, scoring, target selection, and close button unchanged.

## Verification

- Static tests verify the menu link exists on every public page and the ritual command grid no longer contains the practice button.
- A source check verifies opening practice does not depend on the removed command button.
- Run the focused menu/practice tests, then the full test suite and JavaScript syntax checks.
