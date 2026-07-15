# Bilingual Interface Design

## Objective

Add a complete English and French interface to Witch Hat Atelier Simulator.
English is the initial language for a new visitor. A visitor can switch between
`EN` and `FR` from every page, and the selected language persists while moving
between pages or returning later.

The translation covers the simulator, library, tutorial, settings, generated
spell readings, validation messages, accessibility labels, tooltips, support
descriptions, symbol descriptions, and browser page titles.

## User Experience

- A compact `EN | FR` segmented control appears in the header on every page.
- English is selected when no preference has been saved.
- Selecting a language updates the current page immediately without navigation
  or reload.
- The selected language is saved in `localStorage` and reused on every page.
- The active language is visually distinct and exposed through
  `aria-pressed`.
- The document `lang` attribute changes to `en` or `fr` with the interface.
- The control remains usable with a keyboard and fits the existing desktop and
  mobile header layouts without forcing labels outside their containers.

## Architecture

Create one DOM-free module, `i18n.mjs`, as the translation source of truth. It
exports:

- the supported locales and default locale;
- the English and French message catalogs;
- a safe locale resolver;
- a translation function with interpolation support;
- catalog validation helpers used by automated tests.

Both catalogs use stable semantic keys such as `nav.library`,
`commands.activate`, and `status.circleTooLarge`. English and French must expose
the same keys.

Each HTML page loads a small shared `site-i18n.mjs` controller. Static elements
declare translation keys with attributes:

```html
<span data-i18n="nav.library">Library</span>
```

Dedicated attributes cover non-text content:

```html
<a data-i18n-aria-label="nav.openLibrary"
   data-i18n-title="nav.library"></a>
```

The controller resolves the saved locale, applies all static translations,
updates the document language and title, manages the language control, and
emits a `wha:localechange` event.

`app.js` imports the translation function for runtime messages. It stores
canonical internal IDs for sigils, signs, supports, tools, effect roles, and
spell state. UI labels are translated only when rendered. Recognition,
combination rules, recipe selection, saved canvas actions, and 3D effect logic
continue using their existing canonical IDs.

## Translation Scope

### Shared navigation

- Page titles and browser titles.
- Main-menu links, tooltips, and accessibility labels.
- Language selector labels and state.

### Simulator

- Drawing tools and selection controls.
- Drawer titles, descriptions, close buttons, and generated lists.
- Sigil and sign names, confidence labels, mechanics, and reference-status
  labels.
- Support names, descriptions, limits, and warnings.
- Grimoire settings, commands, spell state, status messages, and measurements.
- Reading output, activation errors, recognition output, and PNG export text.
- 3D view labels and any user-visible effect text.

### Static pages

- Library headings, descriptions, categories, and notes.
- Tutorial steps, examples, warnings, and controls.
- Settings sections, values, and explanatory text.

Proper names and established spell names may remain unchanged when translating
them would make them less recognizable. Their surrounding category and
description text is still translated.

## Data Flow

1. The shared controller reads `whaLocale` from `localStorage`.
2. An unsupported or missing value resolves to `en`.
3. The controller applies the catalog to the current document before normal
   interaction begins.
4. `app.js` renders dynamic content with the same resolved locale.
5. Selecting `EN` or `FR` saves the locale, reapplies static content, and emits
   `wha:localechange`.
6. The simulator rerenders its dynamic lists and current status from state;
   drawing actions and the active spell remain unchanged.

## Failure Handling

- Missing translation keys fall back to English and are reported by the test
  suite.
- Invalid saved locale values are ignored and replaced with English.
- If `localStorage` is unavailable, the current session still switches
  language without persistence.
- Interpolation leaves no raw placeholder visible. Tests cover every declared
  parameterized message.
- Translation never rewrites untrusted HTML. Text uses `textContent`; the few
  structured templates keep their markup fixed and translate only their text.

## Visual Design

The selector follows the existing ink-and-parchment interface. It is one
compact segmented control, not an additional card. `EN` and `FR` are short,
stable-width buttons with a clear selected state, visible keyboard focus, and
at least a 44-pixel touch target on mobile. It sits at the end of the header
navigation and wraps as one unit when space is limited.

## Testing

Automated tests verify:

- English is the default locale.
- A saved French preference resolves to French.
- Invalid locale values resolve to English.
- English and French catalogs contain exactly the same keys.
- Interpolation works and never leaks placeholders.
- Every `data-i18n`, `data-i18n-title`, and `data-i18n-aria-label` key in the
  four HTML pages exists in both catalogs.
- All user-visible runtime message keys referenced by `app.js` exist.
- Canonical symbol and support IDs do not change when locale changes.

Browser verification covers all four pages in both languages at desktop and
mobile widths. It checks header fit, language persistence during navigation,
keyboard operation, translated dynamic simulator messages, a nonblank drawing
canvas, and a nonblank 3D view after activation.

## Release

The feature is implemented in the private development repository, validated,
then copied into the history-clean public repository. GitHub Pages is checked
at the public URL after deployment. The release does not include private
reference images, research notes, or generated logs.
