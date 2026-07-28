# Element Search and Pointer Placement Design

## Objective

Give the workshop a keyboard route from "I want the Push sign" to "it is on the
parchment" without scrolling a 64-entry drawer. Pressing `Cmd/Ctrl+K` opens a
search overlay, typing filters the palette, and confirming a result arms the
pointer so canvas clicks stamp that symbol. Add `Cmd/Ctrl+D` to duplicate the
current selection.

The drawer keeps working exactly as it does today for drag placement. This
design removes a dead end in it rather than replacing it.

## Scope

In scope:

- A search overlay over the 64 palette elements, opened with `Cmd/Ctrl+K`.
- A visible armed-pointer state with a ghost preview that follows the cursor.
- One shared arming path for the search overlay, drawer clicks, and drawer
  Enter presses.
- `Cmd/Ctrl+D` duplication of the current selection, plus a toolbar button so
  the same action is reachable without a keyboard.
- An `Escape` guard that stops the existing clear-canvas fallback from firing
  while the overlay is open.

Out of scope, deliberately:

- Fuzzy or typo-tolerant matching.
- Searching the descriptive `meaning` text.
- Recent, favourite, or most-used ordering.
- A visible toolbar button that opens the search overlay.
- The footer keyboard legend, which is separate work.

## Interaction

### Opening and searching

`Cmd/Ctrl+K` opens a modal overlay with a text input focused. `Escape` or a
click outside closes it without changing anything.

Typing filters the 64 elements. An empty query lists all of them in palette
order, so the overlay doubles as a fast full list. Arrow keys move the
highlighted result, `Enter` confirms it, and confirming closes the overlay.

Matching runs against three fields per element: the canonical French name, the
English display name, and the two-letter rune. Queries are folded with
`normalizeSearchText` from `variant-catalog.mjs`, so a French user typing
`fumee` matches `Fumee`.

Ranking mirrors the tiering already used by the variant explorer:

| Tier | Condition | Score |
| --- | --- | --- |
| Exact | Query equals rune or a name | 12 |
| Prefix | A name or rune starts with the query | 8 |
| None | Neither | excluded |

Ties resolve by palette order, which keeps results stable between keystrokes.

### Arming and placing

Confirming a result arms the pointer: the element becomes `state.element`, the
tool becomes `glyph`, any open drawer closes, and a ghost preview follows the
cursor over the canvas.

Clicking the parchment places the symbol. The pointer stays armed, so repeated
clicks stamp repeatedly. This is stamp mode, and it is the behaviour the glyph
tool already has today; this design makes it visible rather than inventing it.

`Escape` disarms and restores the previously active tool.

Drag-to-size and drag-to-rotate on placement are unchanged.

### Duplicating

`Cmd/Ctrl+D` duplicates every selected action, offsetting the copies slightly
and leaving the copies selected so a follow-up drag moves them as a group. One
undo snapshot is recorded per duplication.

A duplicate button joins the existing shrink and grow buttons in the floating
tool strip, disabled when nothing is selected, so touch users reach the same
action.

Only `glyph`, `circle`, and `ring` actions are selectable, so only those can be
duplicated. Freehand strokes, rays, and spirals are unaffected. This matches the
existing selection model rather than extending it.

## Architecture

### symbol-search.mjs

A new module with no DOM access, so its behaviour is testable under
`node:test` without a browser.

- `buildSymbolSearchIndex(elements, englishNames)` returns frozen records
  pairing each element with its normalized French name, English name, and rune.
- `searchSymbols(index, query, limit)` returns ranked matches, or every record
  in palette order when the query is empty.

It imports `normalizeSearchText` from `variant-catalog.mjs`. No new dependency
is introduced.

The index must be built from the `elements` array in `app.js` joined with that
file's `englishElementNames` table. The similarly named `ENGLISH_ELEMENT_NAMES`
exported by `variant-catalog.mjs` is a different set and must not be
substituted. See Hazards.

### Overlay markup

A native `<dialog id="symbolSearchDialog">` in `index.html` holding a search
input and a `role="listbox"` result list, opened with `showModal()`. This
follows the pattern already used by the variant dialog in `bibliotheque.html`.

### app.js wiring

- `armSymbol(element)` sets the element, records the outgoing tool in
  `state.previousTool`, switches to the glyph tool, closes any open drawer, and
  shows the ghost.
- `disarmSymbol()` restores `state.previousTool` and hides the ghost.
- `duplicateSelectedActions()` follows the shape of the existing
  `deleteSelectedActions()`: record history, clone, append, offset, reselect,
  refresh, render.
- The ghost reuses the existing `#symbolDragGhost` element, repositioned on
  pointer move while the glyph tool is active. Today that element only appears
  during a drawer drag; this gives it a second, longer-lived role.

Placement itself needs no new code. The existing glyph branch in
`onPointerDown` already builds the action.

## State

No new "armed" flag. `state.tool === "glyph"` already means the pointer is
carrying `state.element`, and adding a parallel flag would create a second
source of truth that can drift out of sync.

Two additions only:

- `state.previousTool`, so `Escape` can restore the tool the user was in.
- `state.searchOpen`, so the global key handler can bail out while the overlay
  has focus.

Selection-only changes stay out of history, consistent with the marquee design.
Each duplication records exactly one snapshot.

## Keyboard Map

| Keys | Before | After |
| --- | --- | --- |
| `Cmd/Ctrl+K` | unbound | Open element search |
| `Cmd/Ctrl+D` | unbound | Duplicate selection |
| `Escape`, overlay open | Falls through to clear canvas | Close overlay only |
| `Escape`, pointer armed | Falls through to clear canvas | Disarm, restore tool |
| `Escape`, otherwise | Unchanged | Unchanged |

Both new bindings call `preventDefault()`, because browsers bind `Cmd/Ctrl+D`
to bookmarking and may bind `Cmd/Ctrl+K` to a search or address bar.

Both are registered beside the existing `Cmd+Z` and `Cmd+S` handlers, ahead of
the `isTyping` guard, matching how those two are already wired.

## Verified Constraints

These were confirmed by running the app on 2026-07-27, not inferred from
reading:

- Selecting the glyph tool and dispatching three canvas clicks placed three
  symbols and reported `Sigil: Fire x3`. Stamp mode already exists.
- With no symbol chosen, those clicks placed Fire, because `state.element`
  initialises to `elements[0]`. Armed and never-chosen are indistinguishable
  today, which is why the ghost preview is required rather than cosmetic.
- Pressing `Escape` with three symbols placed, nothing selected, and no drawer
  open emptied the drawing and set the status to `Blank parchment.`
- A keydown of `Escape` dispatched inside an open native `<dialog>` reached a
  listener bound on `document`.

The last two combine into the single most important requirement in this design:
without an explicit guard, dismissing the search overlay destroys the drawing.

## Hazards

**English name tables diverge.** `app.js` defines `englishElementNames` with 66
entries. `variant-catalog.mjs` exports `ENGLISH_ELEMENT_NAMES` with 64, and the
keys `Etirement`, `Energie brute`, and `Aucun` differ between them. They look
interchangeable. Building the index from the wrong one silently drops entries
from search results.

**Cache-bust strings are pinned by tests.** `index.html` carries `?v=` query
strings on `app.js` and `styles.css`. Four test files assert their exact
values: `tests/symbol-catalog.test.mjs` lines 155 and 156,
`tests/symbol-palette-ui.test.mjs` line 21, and
`tests/support-illustrations.test.mjs` line 22. This change touches both
assets, so both versions must be bumped and all four tests updated in the same
commit.

**Placeholder translations escape the bilingual check.** The attribute scan in
`tests/i18n-html.test.mjs` covers `data-i18n`, `-title`, `-aria-label`, and
`-alt`, but not `-placeholder`. The search input needs a translated
placeholder, so that regex should be extended to cover it. Doing so also brings
the existing use in `bibliotheque.html` under test for the first time.

**Duplication does not clamp.** `translateSelectedActions` applies an offset
without bounding it, so a duplicate of a symbol near the edge can land outside
the drawing limit. The duplication path must clamp with the existing
`clampGlyphCenter` and `canDropGlyph` helpers.

## Testing

New pure tests in `tests/symbol-search.test.mjs`:

- `wind` returns Wind and Wind underfoot.
- `vent` returns the same two elements, confirming both name fields match.
- `fumee` matches Fumee, and so does the same query typed with an acute accent
  on the second `e`, confirming the query-side diacritic fold.
- `SV` ranks Sangsue-valance first, confirming rune matching outranks prefixes.
- An empty query returns all 64 records in palette order.
- A nonsense query returns nothing.
- The index built from `elements` covers all 64 entries. This is the guard
  against the diverging name tables described above.

New behavioural tests for duplication in `tests/symbol-interactions.test.mjs`,
which already covers the neighbouring selection helpers:

- Duplicating a selection appends the same number of actions.
- The copies, not the originals, end up selected.
- Non-selectable action types are left untouched.
- A duplicate near the boundary stays inside the drawing limit.

A regression test asserting that the drawing survives an `Escape` press while
the search overlay is open. This is the one test that must not be skipped; it
covers the failure mode described under Verified Constraints.

Static assertions extend `tests/symbol-palette-ui.test.mjs` in its existing
style: the overlay and duplicate-button element IDs exist in `index.html`, and
the new classes exist in `styles.css`.

No new i18n test is required. `tests/i18n.test.mjs` already asserts the English
and French catalogues expose identical keys, and `tests/i18n-html.test.mjs`
already checks that every translation attribute resolves in both.

## Localisation

Six new keys, added to both catalogues in `i18n.mjs`: `search.title`,
`search.placeholder`, `search.empty`, `search.results`, `status.symbolArmed`,
and `status.symbolDisarmed`. Duplication reuses the existing status-message
conventions.

## Discoverability

A small `Cmd+K` hint in the symbol drawer heading, so the overlay is findable
from where players already look for symbols. The duplicate button carries a
tooltip naming its shortcut, matching the existing tool buttons.
