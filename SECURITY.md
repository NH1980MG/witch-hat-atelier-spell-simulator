# Security Policy

This project is a static browser prototype. It has no backend, account system,
cookies, database, or server-side storage.

## Supported Version

The maintained entry point is:

```text
http://127.0.0.1:8000/index.html
```

For public hosting, serve the same static files from the project root.

## Current Browser Protections

- The pages include a restrictive Content Security Policy.
- The simulator stores only local display preferences in `localStorage`.
- The app does not send drawings, settings, or exported PNG files to a server.
- The 3D runtime is currently loaded from `https://unpkg.com/three@0.165.0/`.

## Before Public Release

- Replace or remove copied reference screenshots before publishing a public
  repository or public website.
- Keep `Whitch hat/` and `assets/reference-panels/` private.
- If the site needs to work offline or avoid CDN dependency, vendor Three.js or
  add a small package-managed build step.
- Re-run the checks listed in `docs/release-checklist.md`.

## Reporting

For now, report issues directly in the project discussion or issue tracker once
the repository is published.
