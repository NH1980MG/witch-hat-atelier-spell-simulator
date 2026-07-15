# Reference Manifest

This document tracks source material used to understand signs, diagrams, and
animated spell behavior. It is not a license grant. It is a research ledger.

## Policy

- `publicUse: true` means the asset or information can be shown in a public app
  or public documentation.
- `publicUse: false` means private study only. Do not ship the asset in the
  public runtime.
- Local screenshots should be treated as `publicUse: false` by default.
- Original project diagrams and procedural 3D assets may be `publicUse: true`
  when they are not copied or traced from protected material.

## Current Inventory

| ID | Type | Location | Public use | Notes |
| --- | --- | --- | --- | --- |
| `local-screenshots-folder` | local reference images | `Whitch hat/` | false | 42 image files, about 16 MB. Every file is mapped in `docs/local-reference-audit.md`. |
| `official-anime-site` | official web reference | https://tongari-anime.com/ | true for link/citation only | Use for official naming, presentation, and release context. Do not copy media assets. |
| `kodansha-series-page` | official publisher reference | https://kodansha.us/series/witch-hat-atelier/ | true for link/citation only | Use for series attribution and publisher context. |
| `fan-signs-explained` | fan wiki reference | https://witchhatatelier.telepedia.net/wiki/Signs_Explained | true for link/citation only | Useful terminology source. Verify behavior against official/local visual reference before implementing. |
| `fan-magic-page` | fan wiki reference | https://witchhatatelier.telepedia.net/wiki/Magic | true for link/citation only | Useful broad magic-system summary. Verify before treating as canonical. |
| `three-docs` | technical documentation | https://threejs.org/docs/ | true | Rendering engine documentation. |
| `telepedia-reference-panels` | local reference screenshots | `assets/reference-panels/` | false | User-supplied Telepedia spell panels used as local-only sources for crop extraction. Do not treat as public-safe assets. |
| `telepedia-circle-crops` | local extracted crops | `assets/library-circles/` | false | Isolated circle crops generated from the supplied panels so the library does not show complete website screenshots. Do not treat as public-safe assets. |

## Per-Reference Template

```json
{
  "id": "water-orb-reference-001",
  "type": "local-screenshot",
  "location": "Whitch hat/<filename>.png",
  "publicUse": false,
  "sourceUrl": "",
  "sourceDate": "2026-06-29",
  "observedDiagram": ["Eau", "Orbe", "Colonne"],
  "observedBehavior": "water gathers into a suspended orb",
  "implementationTarget": "water.orb",
  "notes": "Use as motion/structure reference only. Do not copy image."
}
```

## Required Cleanup Before Public Release

1. Keep the completed 42-file audit synchronized when references change.
2. Exclude the `Whitch hat/` folder from the public deployment/repository unless
   the rights holder explicitly permits redistribution.
3. Before public release, replace direct copied visual references with licensed,
   original, or clearly permitted assets.
4. Add fan-made/unofficial wording to public-facing pages if the app is shared.
