# Wiki Variant Explorer And Search Visibility Design

Date: 2026-07-16

## Goal

Turn the library and tutorial into a bilingual wiki-style reference where every
one of the simulator's 13,338 validated variants can be found and inspected.
English mode must contain no French user-facing text. The public site and GitHub
repository must also clearly identify themselves as a Witch Hat Atelier spell
simulator and magic-circle maker for search engines and GitHub search.

## Scope

This release covers:

- a complete searchable variant explorer;
- structured wiki navigation for the library and tutorial;
- flexible bilingual search and filters;
- a full English-mode text audit;
- public search metadata and GitHub repository discoverability;
- automated and browser verification.

It does not claim that all 13,338 variants are named or directly shown in the
manga. The existing `documented`, `inferred`, and `experimental` labels remain
mandatory and visible.

## Information Architecture

### Library

The library becomes the main reference hub with these sections:

1. Overview
2. Known circle schematics
3. Variant explorer
4. Central sigils
5. Modifier signs
6. Supports
7. Fidelity and limitations

Desktop uses a restrained sticky table of contents beside the main content.
Mobile uses a compact collapsible table of contents. Section links use stable
anchors and remain keyboard accessible.

The existing 33 original simulator schematics remain grouped by their current
research categories. They are not presented as exact official reproductions.

### Tutorial

The tutorial is reorganized into wiki chapters instead of one long sequence of
equal cards:

1. Quick start
2. Anatomy of a seal
3. Sigils and signs
4. Geometry, balance, and rotation
5. Supports and physical limits
6. Reading fidelity
7. Using the variant explorer
8. Controls and shortcuts

The exact 13,338 formula and its exclusions remain near the beginning and are
linked to the explorer.

## Complete Variant Explorer

The explorer represents exactly:

```text
9 central sigils * 741 unordered sign pairs * 2 support modes = 13,338
```

A module worker generates the lightweight search index from the canonical spell
grammar. This avoids duplicating a large static JSON file and keeps the page
responsive while the matrix is prepared. The worker returns paged summaries;
the main thread renders only the current page.

Each variant summary contains:

- stable recipe identifier;
- central sigil;
- first and second modifier sign;
- support mode;
- effect category and execution plan;
- fidelity level;
- warning state.

Opening a result shows:

- localized display names;
- semantic operation order;
- simulated outcome;
- applied rule identifiers and explanations;
- ignored or incompatible operations;
- support behavior;
- assumptions and warnings;
- physical size restrictions;
- `documented`, `inferred`, or `experimental` provenance.

The interface always displays the total indexed count and the filtered count.
The completed state must report exactly 13,338 indexed variants, 6,669 for no
support and 6,669 for shoe support.

## Search And Filters

Search is token-based rather than exact character-for-character matching. It
normalizes case, accents, apostrophes, punctuation, spaces, and hyphens. English
and French names and curated aliases are indexed together, so the current UI
language does not prevent discovery.

For words of at least four characters, a small edit distance is allowed to
handle ordinary typing mistakes. Prefix matching supports partial terms such as
`levit`. Tokens may appear in any order. Relevance prioritizes exact names,
then aliases, prefixes, and finally fuzzy matches.

Filters:

- central sigil;
- first or second sign;
- sign role/category;
- support (`none` or `shoe`);
- fidelity level;
- warnings (`all`, `without warnings`, `with warnings`);
- effect category.

Sorting:

- relevance;
- sigil and signs;
- fidelity;
- stable identifier.

Results use pages of 50 items. Search and filters are reflected in URL query
parameters so a result set can be bookmarked or shared. A clear-all command
restores the complete 13,338-variant index.

## English-Mode Integrity

All user-facing text must come from the translation catalogue, including:

- status console messages;
- recognition results;
- activation errors and warnings;
- dynamic variant summaries and details;
- filter labels, empty states, counters, and pagination;
- tooltips, titles, alternative text, and ARIA labels;
- 3D and support feedback.

English remains the default. Changing language updates the currently visible
results and details without rebuilding or losing filters. Recipe identities and
effect identifiers remain language-neutral.

The audit specifically covers the status shown in the reported screenshot:
English mode must display `Closed seal detected. Press Activate to awaken the
ritual.` and French mode may display its French equivalent.

## Search-Engine And GitHub Discoverability

The public pages use natural, descriptive metadata rather than keyword stuffing:

- primary title: `Witch Hat Atelier Spell Simulator | Magic Circle Maker`;
- concise descriptions containing `WHA spell simulator`, `spell maker`, and
  `magic circle simulator` where grammatically appropriate;
- canonical GitHub Pages URLs;
- Open Graph metadata;
- `WebApplication` structured data on the simulator;
- `CollectionPage` structured data on the library;
- `robots.txt` and `sitemap.xml` covering the four public pages;
- descriptive README heading and opening paragraph;
- GitHub repository description, homepage, and relevant topics.

Recommended GitHub topics:

- `witch-hat-atelier`
- `spell-simulator`
- `magic-circle`
- `spell-maker`
- `threejs`
- `fan-project`
- `bilingual`

Search indexing and ranking remain controlled by GitHub and search engines, so
the release verifies crawlability and metadata but does not promise a ranking.

## Accessibility And Responsive Behavior

- One `h1` per page and a logical heading hierarchy.
- Search has an explicit visible label and a search landmark.
- Filter controls are native selects or checkboxes with localized labels.
- Result updates use a polite live region.
- Details use an accessible dialog or equivalent labelled region.
- Every control has visible keyboard focus.
- No horizontal overflow or clipped text at 390 x 844 and 1280 x 720.
- The table of contents never hides the active content on mobile.
- Reduced-motion preferences disable nonessential transitions.

## Error And Loading States

- While the worker builds the index, the page shows localized progress.
- If worker startup fails, generation falls back to the main thread and reports
  a localized warning without losing the 33 known schematics.
- Empty searches explain which filters are active and provide a clear-all
  command.
- An invalid URL filter is ignored and replaced by the nearest valid state.
- A variant that cannot be recomposed is shown as unavailable instead of
  displaying stale or invented information.

## Testing

Automated tests must prove:

- exactly 13,338 unique explorer records;
- exact 6,669/6,669 support split;
- every result opens a deterministic detail;
- search normalization, bilingual aliases, token reordering, prefixes, and
  typo tolerance;
- every filter and sort mode;
- pagination covers the complete filtered set without duplicates or omissions;
- URL state round-trips safely;
- English-mode keys and dynamic messages are English;
- library and tutorial contain the required wiki sections and navigation;
- metadata, canonical URLs, sitemap, robots, and structured data are valid;
- the Pages publication artifact includes every required module and asset.

Browser QA covers English and French at desktop and mobile sizes, flexible
search examples, combined filters, one documented/inferred/experimental detail,
the console status, no clipped text, and no console errors.

## Public Release

The implementation is committed to `main`, passes the complete Node test suite
and spell-matrix validator, deploys through the existing GitHub Pages workflow,
and is verified at both the local HTTP URL and the public GitHub Pages URL.
