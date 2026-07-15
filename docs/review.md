# Repo Review

Reviewed on 2026-07-06.

## Executive Summary

This repository is a promising static prototype for a Witch Hat Atelier-inspired
magic circle simulator. It already has the main user loop: draw or place signs,
read the resulting spell, activate it, and view a 3D scene. The next goal,
however, is larger than the current structure supports. To produce anime-like 3D
results from reference diagrams, the project needs a clearer data model, effect
recipe layer, asset policy, and visual QA workflow.

No syntax blocker was found in the current JavaScript or legacy Python files.

## Current Strengths

- Static deployment is simple: the same files can be served locally or by a
  static host such as GitHub Pages.
- The app already includes drawing tools, a symbol dictionary, spell metrics,
  activation, undo/redo, PNG export, and a Three.js overlay.
- The UI has a coherent parchment/workbench style and clear separation between
  simulator, library, tutorial, and settings pages.
- The local reference folder contains many source screenshots that can help
  build a structured reference catalog.

## Main Risks

### P0: No formal reference and rights policy

The repository contains 42 image files in `Whitch hat/`, about 16 MB total.
They appear to be reference screenshots from external Witch Hat Atelier pages.
They are useful privately, but public shipping of copied screenshots, frames, or
panel traces is a copyright risk.

Recommended action:

- Keep reference images out of public runtime paths.
- Add source notes for each reference.
- Use original diagrams and procedural 3D effects in the app.
- If this becomes public, either remove the reference screenshot folder from the
  published branch or move it into a clearly private research workspace.

### P1: `app.js` is too large for the next phase

`app.js` is currently a large single file and contains data, UI wiring, drawing,
symbol recognition, spell scoring, Three.js scene construction, and effect
selection. That is workable for a prototype, but it will slow down effect work.

Recommended action:

- Extract sign data into a data module.
- Extract spell parsing/scoring into a pure core module.
- Extract 3D effects into recipe modules by element.
- Keep UI code as the thin layer that connects DOM events to core state.

### P1: Effects are rule-based but not yet recipe-driven

The app has rules like `Eau + Orbe = orbe d'eau` and a Three.js scene renderer,
but there is no explicit effect recipe format. The desired behavior needs a
stable bridge:

`diagram -> recognized signs -> spell intent -> effect recipe -> 3D animation`

Recommended action:

- Create an effect recipe registry.
- Start with water as the vertical slice.
- Make each recipe specify geometry, materials, particles, timing, camera, and
  completion criteria.

### P1: External dependency is loaded from CDN

`index.html` imports Three.js and OrbitControls from `unpkg.com`. That is fine
for quick experiments, but it means the app depends on network availability and
the exact CDN path. Local development should use the single supported entry
point, `http://127.0.0.1:8000/index.html`, so module loading and browser
security rules are closer to deployment.

Recommended action:

- For stable releases, introduce a lightweight package setup or vendor the
  needed Three.js files.
- If staying static-only, document the dependency and test the published URL.

### P2: No automated visual QA

The 3D experience is the product differentiator, but there is no browser smoke
test, screenshot test, or canvas nonblank check.

Recommended action:

- Add a small local test workflow that opens `index.html`, draws/places a water
  spell, activates it, and checks that the 2D and 3D canvases are nonblank.
- Capture screenshots for desktop and mobile widths.

### P2: Reference pages are static content only

`bibliotheque.html`, `tutoriel.html`, and `parametres.html` are useful, but they
are not yet generated from the same source data as the simulator. That creates
drift risk as signs and effects evolve.

Recommended action:

- Move sign definitions and spell examples into structured data.
- Render the simulator symbol list and documentation cards from the same data.

### P2: Mixed language and naming consistency

The user-facing app is French, while the project request and most future
planning are in English. The project was renamed to
`witch-hat-atelier-simulator` and the public title is now
`Witch Hat Atelier Simulator`.

Recommended action:

- Keep the app UI French unless intentionally localized.
- Write engineering docs in English for now.
- Rename only when convenient, because folder renames can disrupt local paths
  and deployment links.

## Security And Privacy Notes

- The app does not use a backend, account system, cookies, or remote storage.
- `localStorage` is only used for local display preferences such as scale,
  parchment pan, and the diameter counter.
- `innerHTML` is currently populated from static in-code symbol data. This is
  low risk today, but should be changed to DOM construction or sanitized output
  if symbol data ever comes from external files or user input.
- The HTML pages now include a restrictive Content Security Policy. The policy
  still permits inline script/style because the current static pages use an
  inline file-protocol redirect, an import map, and inline CSS variables.
- The `.gitignore` now keeps private reference screenshots out of a normal
  first public commit.

## Validation Performed

- JavaScript syntax check: `node --check app.js`
- Text scan for common hazards: external URLs, `localStorage`, `innerHTML`,
  `fetch`, debug statements, and TODO markers.

## Recommended Next Order

1. Adopt the docs in this folder as the project source of truth.
2. Create a reference manifest for signs and screenshots.
3. Build the water vertical slice as a recipe-driven 3D effect.
4. Modularize `app.js` only around the parts needed for that slice.
5. Add visual QA before expanding to fire, wind, earth, light, and crystal.
