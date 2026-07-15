# Repository Guidelines

## Project Structure & Module Organization
This repository is a static browser app, not a package-managed build. The main entry points live at the repository root: `index.html`, `bibliotheque.html`, `parametres.html`, and `tutoriel.html`. Shared behavior and rendering logic live in `app.js`, `spell-grammar.mjs`, and `symbol-catalog.mjs`. Styling is centralized in `styles.css`.

Supporting material is split by purpose:
- `assets/` for reusable static assets.
- `docs/` for design, QA, architecture, and release notes.
- `scripts/` for local server, validation, and macOS launch-agent helpers.
- `logs/` for local runtime output.
- Private study material and reference-derived screenshots should stay out of
  any public branch.

## Build, Test, and Development Commands
There is no `package.json` or build pipeline. Use these commands directly:
- `python3 -m http.server 8000 --bind 127.0.0.1` starts the local static server.
- `scripts/start-local-server.sh` launches the same server through the project helper.
- `node --check app.js` validates the main script syntax.
- `node --check symbol-catalog.mjs` and `node --check spell-grammar.mjs` validate the shared modules.
- `node scripts/validate-spell-matrix.mjs` checks spell-combination coverage.

## Coding Style & Naming Conventions
Use plain browser-compatible JavaScript and keep changes consistent with the existing codebase. Prefer descriptive file names in `kebab-case` for new scripts or docs. Keep HTML, CSS, and JS edits focused and minimal; the app currently relies on direct DOM logic rather than a framework. Match the existing 2-space indentation style where files already use it.

## Testing Guidelines
The project relies on syntax checks and deterministic validation scripts rather than a formal test runner. Run the `node --check` commands above after editing core logic, then run `node scripts/validate-spell-matrix.mjs` when touching spell rules or symbol data. If you change visuals or layout, verify the affected pages in a browser at `http://127.0.0.1:8000/index.html`.

## Commit & Pull Request Guidelines
No Git history is available in this workspace, so follow short, imperative commit subjects such as `fix activation bounds` or `update spell matrix`. Pull requests should describe the user-visible change, list the files or screens affected, and include screenshots for any UI updates. Link any related issue or release checklist item when applicable.

## Security & Release Notes
This is a static client-only project. Do not add server-side storage or assume remote persistence. Before public release, follow `SECURITY.md` and `docs/release-checklist.md`, and keep private reference assets out of public builds.
