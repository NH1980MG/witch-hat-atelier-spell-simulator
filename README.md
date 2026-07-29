# Witch Hat Atelier Spell Simulator

A bilingual, fan-made magic-circle editor and 3D spell simulator inspired by
the visual grammar of *Witch Hat Atelier*. Draw a closed ring, place a central
sigil and modifier signs, read the result, then activate a live Three.js scene.

The public site is designed as both a workshop and a small wiki. Its library
contains 33 tightly cropped reference circles and a searchable catalog of exactly
54,834 deterministic, support-aware recipes:

```text
38 * 39 / 2 = 741 unordered sign pairs with repetition
26 single sigils + 11 balanced base-element mixtures = 37 material signatures
37 material signatures * 741 pairs = 27,417 recipes
27,417 recipes * 2 support modes = 54,834 variants
```

The two support modes are paper only and a small paper fixed under a shoe. This
count is a simulator validation matrix, not a claim that the manga names 54,834
spells. The 11 indexed mixtures use only Feu, Eau, Terre and Vent; their pair
and triple interpretations are inferred, and the four-element mixture is
experimental, not manga-confirmed. Arbitrary repeated base sigils are evaluated
at runtime as dominance and intensity rather than exhaustively indexed. Three-
sign, linked, nested and arbitrary freehand variants also remain outside the
finite public matrix. Every profiled sigil available in the editor is included
in this public contract.

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

Dans l'interface francaise, fais glisser une carte comme dans Scratch jusqu'au
parchemin depuis `Sigils and signs`. A dotted preview confirms a valid drop
position before the symbol is added.

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

The matrix validator must report 64 drawings, 26 single sigils, 11 balanced
base-element mixtures, 37 material signatures, 38 signs, 54,834
tested/unique/deterministic variants, a 27,417/27,417 support split and all
semantic checks passing.

## Project Map

- `index.html`, `styles.css`, `app.js`: main drawing and 3D workshop.
- `bibliotheque.html`, `library-explorer.mjs`: wiki and variant explorer.
- `tutoriel.html`, `parametres.html`: bilingual guide and settings reference.
- `symbol-catalog.mjs`: shared vector drawings for the editor and renderer.
- `spell-grammar.mjs`, `spell-model.mjs`: deterministic mechanics and snapshots.
- `elemental-mixtures.mjs`: finite base-element profiles and runtime dominance.
- `variant-catalog.mjs`, `variant-index-worker.mjs`: 54,834-recipe index.
- `support-policy.mjs`, `support-geometry.mjs`: support limits and 3D placement.
- `assets/library-schematics/`: 33 local PNG crops containing only the named reference circles.
- `docs/`: architecture, fidelity, QA, release and research provenance notes.

## Public Release Policy

The public build contains original simulator artwork plus 33 spell-circle crops
from archived Witch Hat Atelier Wiki gallery captures supplied for this fan
project. Full screenshots, surrounding wiki text, and manga/anime panels are not
included. Three.js is vendored under `vendor/three/` with its MIT license and no
runtime CDN dependency.

This is an unofficial fan project. *Witch Hat Atelier* and related names belong
to their respective rights holders.

## Local Minecraft AI Builder

The unpublished `minecraft-mod/ai-builder` subproject is a Fabric 1.21.1,
Java 21 development tool for constructing deterministic test scenery from
local JSON plans. It does not use an API key, a remote service, or natural
language.

Run the development client:

```bash
cd minecraft-mod
GRADLE_USER_HOME=$PWD/.gradle-user-home \
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
./gradlew :ai-builder:runClient
```

The example is installed automatically at
`run/config/witchhat-ai-builder/plans/test_platform.json`. In a creative local
world with operator permission, use:

```text
/whabuilder list
/whabuilder preview test_platform
/whabuilder build test_platform
/whabuilder pause
/whabuilder resume
/whabuilder cancel
/whabuilder undo
/whabuilder status
```

Ghost outlines are green for replaceable blocks, amber for occupied blocks,
and red for protected blocks. Builds are progressive and save
`run/config/witchhat-ai-builder/history/latest.json` before changing the world.
Existing block entities such as chests and signs are treated as protected so
their inventories and NBT data cannot be lost by a build or undo.

## Local Minecraft Magic Mod

The unpublished `minecraft-mod/witch-hat-magic` subproject is a separate Fabric
1.21.1 mod. Its first playable milestone provides a persistent magic-circle
notebook with bounded pages, native circular drawing, pen and eraser tools,
undo/redo, zoom, bilingual labels, server-authoritative saves, and the complete
64-entry symbol catalogue generated from the web simulator. Workshop mode
supports placement, right-click selection, selection rectangles, grouped
movement, proportional corner resizing, deletion, and undo.

Build the local JAR:

```bash
cd minecraft-mod
GRADLE_USER_HOME=$PWD/.gradle-user-home \
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
./gradlew :witch-hat-magic:test :witch-hat-magic:build
```

The playable JAR is written to
`witch-hat-magic/build/libs/witch-hat-magic-0.1.0-local.jar`. Advanced page
operations, tracing guides, spell details, and in-world spell preview remain
separate implementation phases. The magic mod does not depend on AI Builder.
