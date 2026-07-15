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
- The 3D runtime uses the vendored Three.js `0.165.0` modules in
  `vendor/three/`; the browser does not execute code from a third-party CDN.

## Before Public Release

- Replace or remove copied reference screenshots before publishing a public
  repository or public website.
- Keep private study material and reference-derived screenshots out of the
  public branch.
- Keep the vendored Three.js version and its MIT license together when updating
  the 3D runtime.
- Re-run the checks listed in `docs/release-checklist.md`.

## Reporting

For now, report issues directly in the project discussion or issue tracker once
the repository is published.
