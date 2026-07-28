# Stress Test: Element Search and Pointer Placement

Adversarial cases for the design in
`docs/superpowers/specs/2026-07-27-element-search-placement-design.md`.
Cases marked measured were reproduced against the running app on 2026-07-27.
Cases marked reasoned are argued from source and still need a test.

## 1. Escape dismisses the overlay and destroys the drawing (measured)

A player opens the search overlay, changes their mind, and presses Escape. The
native dialog closes, but the same keydown continues to the document listener.
With nothing selected and no drawer open, the existing chain falls through to
`clearCanvas()`. Measured twice: a keydown of Escape dispatched inside an open
`<dialog>` reached a listener bound on `document`, and Escape under those state
conditions emptied a drawing of three placed sigils and set the status to
`Blank parchment.` The work is recoverable through undo, because `clearCanvas`
records history first, but the player has no reason to expect that Escape was
destructive at all. This is the single highest-severity case in the design and
it requires an explicit early return guarded on overlay state, plus a test that
asserts the action count is unchanged after the press.

## 2. Armed pointer is indistinguishable from never having chosen (measured)

`state.element` initialises to `elements[0]`, so the glyph tool always carries a
symbol. Measured: selecting the glyph tool with no symbol ever chosen and
clicking three times placed three Fire sigils and reported `Sigil: Fire x3`.
A player who opens the search overlay, dismisses it without confirming, then
clicks the parchment will therefore stamp Fire rather than nothing. The ghost
preview is what separates these two states, which makes it load bearing rather
than decorative. The disarm path must also decide whether it clears the carried
element or only restores the previous tool, because those differ in what the
next canvas click does.

## 3. Diverging English name tables (measured; FALSIFIED, downgraded)

**This case as originally written was wrong, and the correction is the point.**

The original claim: `app.js` defines `englishElementNames` with 66 entries while
`variant-catalog.mjs` exports `ENGLISH_ELEMENT_NAMES` with 64, three keys
differ, so importing the wrong one silently drops entries from search results.

Codex refuted it and an executed re-check on this side agreed. Both tables cover
**all 64 palette keys**; neither drops any. The 66 are the 64 plus two
non-palette entries, `Energie brute` and `Aucun`. Exactly one palette label
differs: `Etirement` is `Stretch / Weave` in `app.js` and `Stretch Weave` in
`variant-catalog.mjs`.

The real case is smaller: the app table is the display-label source of truth, so
using the other yields one wrong label. Severity P2, not a trap.

The methodological failure is worth keeping on the record. A count mismatch
(66 versus 64) and a list of three differing keys were treated as evidence of a
consequence (dropped results) without checking whether those three keys were
even in the palette. They were not. This is conclusion-favouring measurement:
the discovery signal was real, the classification drawn from it was invented.
The mitigation still stands on its own merits - assert the built index covers
all 64 elements rather than that some query returns some result.

## 4. Cache-bust bump breaks four unrelated test files (reasoned)

`index.html` carries `?v=` strings on both `app.js` and `styles.css`, and four
separate test files pin their exact values: `tests/symbol-catalog.test.mjs`
lines 155 and 156, `tests/symbol-palette-ui.test.mjs` line 21, and
`tests/support-illustrations.test.mjs` line 22. This change edits both assets,
so shipping without bumping leaves stale cached assets for returning players,
and bumping without updating all four leaves a red suite. The failure is in a
file whose name suggests no relationship to search, so the connection is easy to
miss during review.

## 5. Duplicate near the parchment edge escapes the drawing limit (reasoned)

`translateSelectedActions` applies its offset unconditionally and performs no
bounds check. Duplicating a symbol already close to the boundary therefore
places a copy partially or wholly outside the drawing limit, where the existing
placement path would have refused to put it. Worse, duplicating repeatedly
walks copies further out on each press.

The original mitigation named `clampGlyphCenter` and `canDropGlyph`. Codex
refuted that too: both express a single glyph centre and size, so clamping each
copy of a mixed glyph/circle/ring selection against its own bounds distorts the
group's relative spacing. `app.js:7290` already has the correct primitive,
`clampSelectionDelta(bounds, dx, dy)`, used for group moves at `app.js:7326`.
Duplication takes one shared delta from `combinedSelectionBounds`.

That correction exposes a further case the original missed: against an edge the
clamp can return zero on both axes, appending an exact overlapping copy on every
press and building an invisible stack. Zero delta is therefore a no-op with
localized feedback. The test must assert relative spacing is preserved across a
mixed selection, not merely that the action count increased.

## 6. Duplicate silently ignores most of what is on the canvas (reasoned)

`isSelectableAction` admits only `glyph`, `circle`, and `ring`. A player who has
drawn freehand strokes, rays, and spirals and presses the duplicate shortcut
sees either nothing happen or only part of their work copied, with no
explanation. The behaviour is correct with respect to the existing selection
model, but the absence of feedback is not. Either the status line explains what
was and was not duplicated, or the button state makes the limit visible before
the press.

## 7. Modal focus trap versus the armed pointer (reasoned)

`showModal()` moves focus into the dialog and traps it. After confirming a
result the overlay closes and the pointer is armed, but focus has to land
somewhere that keeps the subsequent shortcuts working. The canvas carries no
`tabindex`, so focus most likely returns to `body`. If it instead lands on a
form control, the `isTyping` guard suppresses the bare-letter shortcuts and
Escape no longer disarms, stranding the player in an armed state they cannot
exit by keyboard.

## 8. Shortcuts collide with browser defaults on first press (reasoned)

`Cmd/Ctrl+D` is bookmark and `Cmd/Ctrl+K` is a search or address bar focus in
several browsers. Both need `preventDefault()`, and the call has to happen on
the same keydown that performs the action rather than a later handler. A missed
`preventDefault` produces a bookmark dialog over the workshop, which reads as a
broken app rather than a shortcut conflict.

## 9. Query-side folding is asymmetric with stored names (reasoned)

Every palette name is stored unaccented in source, so folding matters only for
what the player types. A French player searching for an accented spelling must
match, but the reverse case of stored accents does not exist and should not be
designed for. The risk is over-engineering here, adding a normalization pass
over stored names that is dead code, or under-testing by only asserting on
unaccented queries and never proving the fold runs at all.

## 10. Empty query renders all 64 rows on every keystroke (reasoned)

Backspacing to an empty field re-renders the full list. At 64 rows this is
cheap, but the result list rebuilds on each input event and the elements carry
inline SVG icons. If the implementation re-parses icon markup per keystroke
rather than reusing nodes, the overlay will feel sluggish while deleting a
query even though the dataset is trivially small.
