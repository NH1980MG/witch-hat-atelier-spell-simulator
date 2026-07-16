# Security Policy

This project is a static browser prototype. It has no backend, account system,
cookies, database, or server-side storage.

## Supported Version

The maintained public entry point is:

```text
https://nh1980mg.github.io/witch-hat-atelier-spell-simulator/
```

For local development, use `http://127.0.0.1:8000/index.html`.

## Current Browser Protections

- The pages include a restrictive Content Security Policy.
- The simulator stores only local display preferences in `localStorage`.
- The app does not send drawings, settings, or exported PNG files to a server.
- The 3D runtime uses the vendored Three.js `0.165.0` modules in
  `vendor/three/`; the browser does not execute code from a third-party CDN.

## Release Controls

- Run `node scripts/security-audit.mjs` and the complete test suite.
- Audit the generated Pages directory with
  `node scripts/validate-public-artifact.mjs public`.
- Replace or remove copied reference screenshots before publishing.
- Keep private study material and reference-derived screenshots out of the
  public branch.
- Keep the vendored Three.js version and its MIT license together when updating
  the 3D runtime.
- Re-run the checks listed in `docs/release-checklist.md`.

## Reporting

Report vulnerabilities privately through GitHub Security Advisories when
available. Do not post credentials, private references or exploit details in a
public issue.
