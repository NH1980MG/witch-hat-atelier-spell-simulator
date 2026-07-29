# Element Search and Pointer Placement Design

> Revision 3, 2026-07-29. Revision 2 was amended after review by an independent
> reviewer (second model) (thread
> `WITCH-HAT-ATELIER-SPELL-SIMULATOR-SPEC-221826-dd5`, verdict request-changes,
> P1=6 P2=2). Revision 3 adds four self-review findings against revision 2's own
> new contracts. Changes are listed under Review History.

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
- One shared arming path for the search overlay, drawer clicks, drawer Enter
  presses, and the direct glyph toolbar button.
- `Cmd/Ctrl+D` duplication of the current selection, plus a toolbar button so
  the same action is reachable without a keyboard.
- A modal keyboard gate that suppresses every canvas command while the overlay
  is open.
- A DOM-free palette-data seam, so the runtime join between the element list
  and the display-name table is testable.

Out of scope, deliberately:

- Fuzzy or typo-tolerant matching.
- Searching the descriptive `meaning` text.
- Recent, favourite, or most-used ordering.
- A visible toolbar button that opens the search overlay.
- The footer keyboard legend, which is separate work.

## Interaction

### Opening and searching

`Cmd/Ctrl+K` opens a modal overlay with a text input focused. Escape, the close
button, or a click outside closes it without changing anything.

Typing filters the 64 elements. An empty query lists all of them in palette
order, so the overlay doubles as a fast full list. Arrow keys move the active
option, `Enter` confirms it, and confirming closes the overlay.

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

Confirming a result arms the pointer: the element becomes the carried element,
the tool becomes `glyph`, any open drawer closes, and a ghost preview follows
the cursor over the canvas.

Clicking the parchment places the symbol. The pointer stays armed, so repeated
clicks stamp repeatedly. This is stamp mode, and it is the behaviour the glyph
tool already has today; this design makes it visible and reversible rather than
inventing it.

`Escape` disarms and restores the tool the user was in before arming.

Drag-to-size and drag-to-rotate on placement are unchanged.

### Duplicating

`Cmd/Ctrl+D` duplicates every selected action as one group, offsetting the
copies by a single shared translation and leaving the copies selected so a
follow-up drag moves them together. One undo snapshot is recorded per
duplication.

A duplicate button joins the existing shrink and grow buttons in the floating
tool strip, disabled when nothing is selected, so touch users reach the same
action.

Only `glyph`, `circle`, and `ring` actions are selectable, so only those can be
duplicated. Freehand strokes, rays, and spirals are unaffected. This matches the
existing selection model rather than extending it.

## Architecture

### symbol-palette-data.mjs (new, DOM-free seam)

The 64-element array and the English display-name table move out of `app.js`
into a module with no DOM access, re-exported for `app.js` to consume.

This exists because of a testability constraint, not for tidiness: `app.js`
cannot be imported under Node (verified - `import('./app.js')` throws
`ReferenceError: document is not defined`), and both tables are currently
private `const`s in it. Without this seam, no test can prove the running app
joined the correct tables; a fixture copy would only prove the fixture.

### symbol-search.mjs

A module with no DOM access.

- `buildSymbolSearchIndex(elements, englishNames)` returns frozen records
  pairing each element with its normalized French name, English name, and rune.
- `searchSymbols(index, query, limit)` returns ranked matches, or every record
  in palette order when the query is empty.

It imports `normalizeSearchText` from `variant-catalog.mjs`, and its inputs come
from `symbol-palette-data.mjs`. No new dependency is introduced.

### Overlay markup

A native `<dialog id="symbolSearchDialog">` in `index.html` holding a search
input and a `role="listbox"` result list, opened with `showModal()`. This
follows the pattern already used by the variant dialog in `bibliotheque.html`.

### app.js wiring

- `setTool(nextTool, { element })` is the single centralized tool transition.
  Every path that changes the tool routes through it: the toolbar buttons at
  `app.js:8795-8801`, drawer click, drawer Enter, drag completion, and search
  confirmation. Nothing assigns `state.tool` directly.
- `armSymbol(element)` calls `setTool("glyph", { element })`, closes any open
  drawer, and takes ghost ownership.
- `disarmSymbol()` restores the recorded return tool and releases ghost
  ownership.
- `duplicateSelectedActions()` follows the shape of the existing
  `deleteSelectedActions()`: record history, clone, append, translate once,
  reselect the appended range, refresh circle-derived state, render.
- The ghost reuses the existing `#symbolDragGhost` element under the ownership
  rules below.

Placement itself needs no new code. The existing glyph branch in
`onPointerDown` already builds the action.

## State

No new "armed" flag. `state.tool === "glyph"` already means the pointer is
carrying an element, and a parallel flag would be a second source of truth.

**This is only safe under two invariants, both of which the first revision of
this design failed to state:**

1. **Centralized transitions.** Every write to `state.tool` goes through
   `setTool`. There are five direct writes today, not one - `grep -c
   "state\.tool = " app.js` returns 5, at lines 7231, 7857, 8081, 8176, 8798.
   Two are the paths this design already names (8798, the generic toolbar loop;
   7857, the drawer Enter handler). The other three force `"select"` from paths
   the first two revisions never mentioned: `beginRightSelection` (7231),
   `selectGuide` (8081), and personal guide creation (8176). All five route
   through `setTool`. The three `select`-forcing paths matter for ghost
   ownership rather than arming: without them, right-dragging a marquee or
   picking a guide while armed leaves the ghost following a cursor whose tool
   no longer stamps.
2. **Edge-triggered capture.** `state.previousTool` is recorded only on a
   transition from a non-glyph tool into `glyph`. Arming again while already
   armed must not overwrite it, or Escape restores `glyph` and cannot disarm.

Additions:

- `state.previousTool` - the tool to restore on disarm. Written only on the
  non-glyph-to-glyph edge.
- Overlay openness is **derived, never mirrored**: `searchOpen()` reads
  `symbolSearchDialog?.open === true`. No `state.searchOpen` field exists. A
  mirrored flag would have to be synchronized on every close path, and a stale
  `true` suppresses Escape permanently and silently - a failure any future
  sixth close path would reintroduce. `dialog.open` is the browser's own state
  and cannot drift. The Verified Constraints below establish that the document
  handler runs before `cancel` and `close` fire, so the guard reads the dialog
  at handler time either way.
- `state.ghostOwner` - `null`, `"armed"`, or `"drag"`. See Ghost Ownership.

Selection-only changes stay out of history, consistent with the marquee design.
Each duplication records exactly one snapshot.

## Ghost Ownership

The persistent armed preview and the transient drawer-drag preview share
`#symbolDragGhost` and the `is-dragging-symbol` body class.
`cancelSymbolDrag()` clears both unconditionally (verified at
`app.js:8012-8013`), so a drawer drag started while armed leaves the glyph tool
active with no visible preview - which silently breaks the invariant that armed
and never-chosen are distinguishable.

Rules:

- `state.ghostOwner` is set to `"drag"` when a drawer drag begins and restored
  to its previous value when the drag ends by any path.
- Drag teardown calls a single `renderGhost()` rather than clearing the element
  directly. `renderGhost()` draws the armed preview when the owner is `"armed"`
  and clears when the owner is `null`.
- Covered cases: reopen drawer while armed then cancel the drag; reopen drawer
  while armed then drop the drag.

## Keyboard Map

| Keys | Before | After |
| --- | --- | --- |
| `Cmd/Ctrl+K` | unbound | Open element search |
| `Cmd/Ctrl+D` | unbound | Duplicate selection |
| Any key, overlay open | Reaches the canvas handler | **Suppressed** except the overlay's own keys |
| `Escape`, pointer armed | Falls through to clear canvas | Disarm, restore return tool |
| `Escape`, otherwise | Unchanged | Unchanged |

**The modal gate is the whole shortcut map, not just Escape.** When
`searchOpen()` is true, the document handler returns immediately after handling
the overlay's own keys. It is the first branch in the handler, ahead of the
modifier block and ahead of the `isTyping` guard. Scoping the guard to Escape
alone would leave `Cmd/Ctrl+D`, `Cmd/Ctrl+Z`, `Cmd/Ctrl+S`, and the bare
letters `A` and `L` able to mutate a canvas the user cannot see.

**Armed and open at once.** `Cmd/Ctrl+K` while already armed is legal - the
player wants a different symbol - so the overlay-open and pointer-armed rows
can both apply to the same press. The overlay wins: Escape closes the overlay
and leaves the pointer armed exactly as it was. Disarming takes a second
Escape. This is stated because the edge-triggered `previousTool` rule means
that second press restores a tool chosen several interactions earlier, and
picking the other reading would make one keystroke do both.

Both new bindings call `preventDefault()`, because browsers bind `Cmd/Ctrl+D`
to bookmarking and may bind `Cmd/Ctrl+K` to a search or address bar.

## Duplication Policy

One shared clamped translation, never per-action clamping. A selection may mix
glyphs, circles, and rings; clamping each copy independently against its own
bounds would distort the group's relative spacing.

`app.js` already has the right primitive: `clampSelectionDelta(bounds, dx, dy)`
at `app.js:7290`, used for group moves at `app.js:7326`. It clamps a single
delta against `drawingLimitBounds` using combined bounds. Duplication uses
`combinedSelectionBounds` plus `clampSelectionDelta`, then one call to
`translateSelectedActions` over the appended indices.

The earlier draft named `clampGlyphCenter` and `canDropGlyph`. Those express a
single glyph centre and size and are the wrong tool for a heterogeneous group.

**Zero legal delta.** Against an edge, the clamp can return `dx = dy = 0`, which
would append an exact overlapping copy on every press and build an invisible
stack. When the clamped delta is zero in both axes, duplication is a no-op and
reports a localized blocked status. No alternate direction is attempted; a
deterministic fallback is more surface than the case warrants.

Duplication also refreshes circle-derived state, since copying a circle or ring
can move the spell centre.

## Accessibility

The listbox keeps DOM focus in the search input and tracks the active option
with `aria-activedescendant`, rather than moving focus between results.

- Each result carries a stable id and `role="option"` with `aria-selected`.
- **Every query change resets the active index to 0** and rewrites
  `aria-activedescendant` to the first result, clearing it when there are no
  results. The list rebuilds on each keystroke, so an active id held across a
  rebuild can point at a detached node: nothing is announced and `Enter`
  confirms a stale record. This needs an assertion in the static UI test - the
  pure search tests cannot see the DOM, and the browser smoke test covers
  Escape rather than filtering.
- The result count is announced through a localized live region on change.
- Cancelling restores focus to the control that opened the overlay.
- Confirming closes the overlay and leaves pointer placement intact; the canvas
  is not a focus target and gains no `tabindex`.

## Verified Constraints

Confirmed by running the app on 2026-07-27, not inferred from reading. The
first four are this side's; the fifth is the independent reviewer's
reproduction.

- Selecting the glyph tool and dispatching three canvas clicks placed three
  symbols and reported `Sigil: Fire x3`. Stamp mode already exists.
- With no symbol chosen, those clicks placed Fire, because the carried element
  initialises to the first palette entry. Armed and never-chosen are
  indistinguishable today, which is why the ghost preview is required rather
  than cosmetic.
- Pressing `Escape` with three symbols placed, nothing selected, and no drawer
  open emptied the drawing and set the status to `Blank parchment.`
- A keydown of `Escape` dispatched inside an open native `<dialog>` reached a
  listener bound on `document`.
- The independent reviewer reproduced the same case in a real browser with a
  dialog button focused and recorded the ordering: dialog `keydown`, then the
  app status changing to `Blank parchment.`, then dialog `cancel`, then dialog
  `close`. **The canvas is already cleared before `cancel` fires**, so the
  guard must live on the document handler. Listening for the dialog's `cancel`
  event is too late.

Also verified: `import('./app.js')` under Node throws `ReferenceError: document
is not defined`, and `app.js` exposes exactly one `export` across 9019 lines.

## Hazards

**English name tables differ by one label, and one is authoritative.** `app.js`
defines `englishElementNames` with 66 entries; `variant-catalog.mjs` exports
`ENGLISH_ELEMENT_NAMES` with 64. An executed comparison shows **both cover all
64 palette keys** - neither drops any. The 66 are the 64 plus two non-palette
entries, `Energie brute` and `Aucun`. Exactly one palette label differs:
`Etirement` is `Stretch / Weave` in `app.js` and `Stretch Weave` in
`variant-catalog.mjs`. The app table is the display-label source of truth, so
the search index uses it; substituting the other yields one wrong label, not
missing results. Revision 1 of this document claimed silent entry loss. That
was wrong.

**Cache-bust strings are pinned by tests.** `index.html` carries `?v=` query
strings on `app.js` and `styles.css`. Four test files assert their exact
values: `tests/symbol-catalog.test.mjs` lines 155 and 156,
`tests/symbol-palette-ui.test.mjs` line 21, and
`tests/support-illustrations.test.mjs` line 22. This change touches both
assets, so both versions must be bumped and all four tests updated in the same
commit.

**Placeholder translations escape the bilingual check.** The attribute scan in
`tests/i18n-html.test.mjs` line 24 covers `data-i18n`, `-title`,
`-aria-label`, and `-alt`, but not `-placeholder`. The search input needs a
translated placeholder, so that regex must be extended. Doing so also brings
the existing use in `bibliotheque.html` under test for the first time.

**The catalogue-parity test cannot see dynamic keys.** `tests/i18n.test.mjs`
asserts the two catalogues expose identical key sets, and `i18n-html` asserts
declared HTML attributes resolve. Neither reaches a key constructed in
`app.js` at runtime. Every new status message needs a test that asserts the key
directly.

## Testing

### Pure tests

`tests/symbol-search.test.mjs`:

- `wind` returns Wind and Wind underfoot.
- `vent` returns the same two elements, confirming both name fields match.
- `fumee` matches Fumee, and so does the same query typed with an acute accent
  on the second `e`, confirming the query-side diacritic fold.
- `SV` ranks Sangsue-valance first, confirming rune matching outranks prefixes.
- An empty query returns all 64 records in palette order.
- A nonsense query returns nothing.

### Seam tests

The index must be built from `symbol-palette-data.mjs`, which both `app.js` and
the tests import. A test asserts the seam exports exactly 64 elements and a
display-name entry for every one of them. This is what makes the join
verifiable; without the seam it is not testable at all, and revision 1 of this
document specified a test that could not have been written.

### Duplication tests

Extending `tests/symbol-interactions.test.mjs`, which already covers the
neighbouring selection helpers:

- Duplicating appends the same number of actions.
- The appended copies, not the originals, end up selected.
- A mixed glyph, circle, and ring selection preserves relative spacing, proving
  one shared delta rather than per-action clamping.
- A selection with no legal delta is a no-op and appends nothing.
- Non-selectable action types are left untouched.

### Browser test

One browser smoke test, which the current Node-only suite cannot express: with
the search overlay open and a symbol placed, pressing Escape closes the overlay
and **leaves the drawing intact**. This covers the highest-severity case in the
design and there is no static substitute for it. The keyboard-routing gate is
additionally extracted far enough to be unit-testable, so the browser test is a
confirmation rather than the only coverage.

### Static assertions

Extending `tests/symbol-palette-ui.test.mjs` in its existing style: the overlay
and duplicate-button element IDs exist in `index.html`, and the new classes
exist in `styles.css`.

## Localisation

New keys, added to both catalogues in `i18n.mjs`:

Search overlay - `search.title`, `search.placeholder`, `search.empty`,
`search.results`.

Arming - `status.symbolArmed`, `status.symbolDisarmed`.

Duplication - `tool.duplicate` (button accessible name and tooltip, matching
how the existing shrink and grow controls each carry a `tool.` key),
`status.duplicated`, `status.duplicateNoSelection`, `status.duplicateBlocked`.

Each status key gets a direct assertion, because the existing parity and HTML
scans cannot reach a key constructed at runtime.

## Discoverability

A small `Cmd+K` hint in the symbol drawer heading, so the overlay is findable
from where players already look for symbols. The duplicate button carries a
tooltip naming its shortcut, matching the existing tool buttons.

## Implementation Staging

One product unit, one user-facing release, two internal stages. The first
stage carries the risk and is independently testable.

1. **Seams.** Extract `symbol-palette-data.mjs`; centralize tool transitions
   behind `setTool`; extract the keyboard-routing gate; implement group
   duplication on `clampSelectionDelta`. All testable under Node.
2. **UI.** Wire the overlay markup, the ghost lifecycle, the duplicate button,
   and the localized strings. Add the browser smoke test.

## Review History

Revision 2 amends revision 1 (`b823ac6`) after review by an independent
reviewer (second model) at pin `d3e49e7`. Finding ids are the reviewer's, with
the vendor prefix removed; the numbering is unchanged. Every source citation
below was re-verified on this side before being accepted.

| Finding | Change |
| --- | --- |
| spec-001 (P2) | Name-table hazard rewritten. Revision 1 claimed silent entry loss; both tables cover all 64 keys and only the `Etirement` label differs. |
| spec-002 (P1) | New centralized `setTool` contract and edge-triggered `previousTool`. The direct toolbar path bypassed arming entirely. |
| spec-003 (P1) | Modal gate widened from Escape to the entire canvas shortcut map, with close-path synchronization. |
| spec-004 (P1) | Duplication respecified on `combinedSelectionBounds` plus the existing `clampSelectionDelta`, with a zero-delta no-op. |
| spec-005 (P1) | New Ghost Ownership section; drag teardown must restore the armed preview. |
| spec-006 (P1) | New DOM-free palette-data seam. Revision 1's keystone test could not have been written. |
| spec-007 (P1) | Duplicate control and status keys enumerated; runtime-key assertions required. |
| spec-008 (P2) | New Accessibility section fixing the listbox focus model. |

The reviewer confirmed unchanged: the matching design (names plus rune, exact
then prefix, no fuzzy) as appropriately lean for 64 records, the decision to
keep fuzzy matching and meaning search out of scope, and this remaining one
product unit.

Revision 3 amends revision 2 (`a710525`). The second-model meta-review of
revision 2's new contracts was declined, so these are self-review findings,
recorded in `docs/stress-tests/2026-07-27-element-search-placement.md` as cases
11-14. They carry the weaker warrant that implies: one side found them.

| Finding | Change |
| --- | --- |
| self-011 (P1, measured) | `setTool` inventory corrected from one site to five. `grep -c "state\.tool = " app.js` returns 5; three `select`-forcing paths (`beginRightSelection` 7231, `selectGuide` 8081, guide creation 8176) were unlisted, and each strands the armed ghost. |
| self-012 (P2, reasoned) | Keyboard Map now states the armed-and-overlay-open reading: Escape closes the overlay only, disarming takes a second press. |
| self-013 (P1, reasoned) | `state.searchOpen` replaced by a derived `searchOpen()` read of `dialog.open`. A mirrored flag makes a permanent, silent Escape suppression reachable from any future close path. |
| self-014 (P2, reasoned) | Accessibility now requires resetting the active index and `aria-activedescendant` on every query change; a rebuilt list can leave the pointer on a detached node. |

Revision 3 changes no scope, adds no user-facing surface, and removes one state
field.
