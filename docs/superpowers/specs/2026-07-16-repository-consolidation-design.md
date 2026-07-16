# Repository Consolidation Design

Date: 2026-07-16

## Goal

Consolidate the two public simulator repositories into one canonical project:

- display name: `Witch Hat Atelier Spell Simulator`;
- repository slug: `witch-hat-atelier-spell-simulator`;
- public site: `https://nh1980mg.github.io/witch-hat-atelier-spell-simulator/`.

After consolidation there is one maintained codebase and one active simulator.
The former public address redirects visitors to the canonical site.

## Existing Repositories

### Advanced Repository

`NH1980MG/fan-made-Witch-hat-atelier-simulator`

This repository is the technical source of truth because it contains the latest
spell model, 13,338-variant validation, support policy, 3D rendering, illustrated
library, fidelity reporting, release workflow, and broader test suite.

### Historical Repository

`NH1980MG/witch-hat-atelier-simulator`

This repository contains the historical public URL and an older bilingual
release. It is not used as a wholesale code source because its runtime and test
coverage are behind the advanced repository. Individual differences are audited
before consolidation so a genuinely better drawing, translation, interaction,
or responsive rule is not lost.

## Consolidation Strategy

The advanced repository remains the Git history and issue-tracking base. This
preserves the most complete development history and avoids manufacturing a
third unrelated repository.

The historical repository is compared at the level of common runtime files:

- `app.js`;
- `symbol-catalog.mjs`;
- `spell-grammar.mjs`;
- `support-geometry.mjs`;
- `i18n.mjs` and `site-i18n.mjs`;
- public HTML pages;
- `styles.css`;
- tests and documentation.

Each historical difference receives one disposition:

- `already superseded`;
- `preserve from historical repository`;
- `combine manually`;
- `reject with reason`.

Only reviewed differences are copied. The older application is never allowed to
replace the canonical spell model, support policy, activation snapshot, library
assets, or test suite as a whole.

## Rename And URLs

After the combined branch passes verification, the advanced GitHub repository
is renamed from `fan-made-Witch-hat-atelier-simulator` to
`witch-hat-atelier-spell-simulator`.

The local `origin` URL is refreshed to the renamed repository. All project
references are updated in one change:

- visible product title;
- HTML titles and descriptions;
- README and documentation;
- `SECURITY.md`;
- GitHub Pages workflow;
- canonical and Open Graph URLs;
- sitemap and robots files;
- local start scripts and LaunchAgent labels where applicable;
- QA references.

The GitHub repository description, homepage, and topics are updated to match
the canonical name and public site.

## Historical Site Redirect

The historical repository is reduced to a minimal static redirect only after
the new canonical Pages site returns HTTP 200 and its core assets load.

Its redirect page:

- explains the project moved;
- contains a normal clickable link;
- uses a canonical link to the new site;
- performs a short client-side redirect;
- contains no simulator runtime or duplicated application assets.

The historical repository is then archived. Archiving occurs last, after the
redirect deployment is verified. The old site remains a navigation bridge, not
a second maintained version.

The former `fan-made-Witch-hat-atelier-simulator` repository URL is handled by
GitHub's repository rename redirect. Old GitHub Pages paths are removed from
documentation and search metadata because Pages redirects are not guaranteed
after a repository rename.

## Branch And Publication Safety

- No force push is used.
- Existing unmerged work is identified before repository writes.
- Consolidation happens on a named feature branch.
- The combined branch is merged into the advanced repository's current `main`.
- Tests are rerun on the merged `main` before rename.
- The repository is renamed only after the merged commit is present remotely.
- GitHub Pages is redeployed and verified after the rename.
- The historical repository remains untouched until the canonical site works.
- The old repository is archived only after its redirect works.

If the rename or Pages deployment fails, the advanced repository remains
available under its previous name and the historical site is unchanged.

## Validation

Before the rename:

- complete Node test suite passes;
- spell-matrix validator reports exactly 13,338 deterministic variants;
- 6,669 no-support and 6,669 shoe-support variants are present;
- all public modules pass syntax checks;
- 33 library schematics load locally;
- English and French browser smoke tests pass;
- no private reference screenshot enters the public artifact;
- static credential and dangerous-code checks pass.

After the rename:

- Git remote resolves to the new repository;
- GitHub `main` matches local `main`;
- GitHub Pages workflow succeeds;
- canonical root, tutorial, library, settings, one JavaScript module, and one
  library SVG return HTTP 200;
- metadata and sitemap use only the new canonical URL;
- local `http://127.0.0.1:8000/` still serves the same commit.

After historical redirect publication:

- old root returns HTTP 200;
- old page identifies the new project and links to it;
- redirect reaches the canonical site;
- historical repository is archived;
- neither README nor metadata describes the old repository as maintained.

## Follow-Up Feature Work

The searchable wiki, complete 13,338-variant explorer, flexible filters,
English-mode audit, and search-engine metadata defined in
`2026-07-16-wiki-variant-explorer-seo-design.md` are implemented only in the
canonical repository after consolidation. This prevents another split while a
large user-facing feature is being developed.
