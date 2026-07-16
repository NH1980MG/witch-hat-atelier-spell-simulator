# Witch Hat Atelier Spell Simulator

A bilingual, fan-made magic-circle editor and 3D spell simulator inspired by
the visual grammar of *Witch Hat Atelier*. Draw a closed ring, place a central
sigil and modifier signs, read the result, then activate a live Three.js scene.

The public site is designed as both a workshop and a small wiki. Its library
contains 33 original vector schematics and a searchable catalog of exactly
13,338 deterministic, support-aware recipes:

```text
38 * 39 / 2 = 741 unordered sign pairs with repetition
9 canonical central sigils * 741 pairs = 6,669 recipes
6,669 recipes * 2 support modes = 13,338 variants
```

The two support modes are paper only and a small paper fixed under a shoe. This
count is a simulator validation matrix, not a claim that the manga names 13,338
spells. Three-sign, multi-sigil, nested and arbitrary freehand variants remain
outside the indexed matrix. The editor also keeps decorative sigils that do not
change this public contract.

## Features

- Freehand drawing, geometric tools, undo/redo, PNG export and movable grid.
- Scratch-like placement and selection of 64 shared vector symbols.
- Separate recognition of central sigils and modifier signs.
- Geometry-aware balance, direction, tilt, rotation and ring connectivity.
- Physical diameter from 5 cm to 5 m; one grid cell represents 5 cm.
- No support by default, plus proportional under-sole shoe support for circles
  up to 35 cm.
- Composable, animated 3D effects rendered from an immutable activation recipe.
- English and French interface on every page, with English as the default.
- Flexible variant search, filters, sorting, pagination and shareable URLs.
- Fidelity labels that distinguish documented, inferred and experimental rules.

## Run Locally

```bash
./scripts/start-local-server.sh
```

Open `http://127.0.0.1:8000/index.html`. The maintained application is the HTTP
site; `file://` is not a second version.

## Verify

```bash
node --check app.js
node --check symbol-catalog.mjs
node --check spell-grammar.mjs
node --check variant-catalog.mjs
node --check library-explorer.mjs
node --check variant-index-worker.mjs
node --test tests/*.test.mjs
node scripts/validate-spell-matrix.mjs
node scripts/security-audit.mjs
```

The matrix validator must report 64 drawings, 9 indexed sigils, 38 signs,
13,338 tested/unique/deterministic variants, a 6,669/6,669 support split and all
semantic checks passing.

## Project Map

- `index.html`, `styles.css`, `app.js`: main drawing and 3D workshop.
- `bibliotheque.html`, `library-explorer.mjs`: wiki and variant explorer.
- `tutoriel.html`, `parametres.html`: bilingual guide and settings reference.
- `symbol-catalog.mjs`: shared vector drawings for the editor and renderer.
- `spell-grammar.mjs`, `spell-model.mjs`: deterministic mechanics and snapshots.
- `variant-catalog.mjs`, `variant-index-worker.mjs`: 13,338-recipe index.
- `support-policy.mjs`, `support-geometry.mjs`: support limits and 3D placement.
- `assets/library-schematics/`: 33 original public SVG schematics.
- `docs/`: architecture, fidelity, QA, release and research provenance notes.

## Public Release Policy

The public build contains original simulator artwork only. Local study captures,
copied manga/anime panels and private reference material must never be added to
the GitHub Pages artifact. Three.js is vendored under `vendor/three/` with its
MIT license and no runtime CDN dependency.

This is an unofficial fan project. *Witch Hat Atelier* and related names belong
to their respective rights holders.
