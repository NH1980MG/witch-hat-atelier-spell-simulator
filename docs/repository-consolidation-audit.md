# Repository Consolidation Audit

Date: 2026-07-16

Compared repositories:

- canonical source: `NH1980MG/fan-made-Witch-hat-atelier-simulator`;
- historical source: `NH1980MG/witch-hat-atelier-simulator`.

## Decision Summary

The advanced repository remains the canonical codebase. It contains 106 tracked
files, 15 test files, the deterministic spell model, support policy, 3D
activation snapshots, 33 local SVG schematics, broader bilingual content, and
the GitHub Pages validation workflow. The historical repository contains 26
tracked files and 6 tests. It is not a safe wholesale replacement.

| Area | Disposition | Reason |
| --- | --- | --- |
| `app.js` | Already superseded | The canonical file includes immutable activation recipes, richer support effects, selection tools, panning, grounded paper, and broader i18n hooks. |
| `spell-grammar.mjs` | Already superseded | The canonical grammar has provenance, ordered operations, geometry balance/rotation, warnings, support plans, and deterministic identities. |
| `spell-model.mjs` | Preserve canonical | No equivalent immutable identity/snapshot boundary exists in the historical repository. |
| `support-policy.mjs` | Preserve canonical | The historical implementation does not provide the structured none/shoe policy or physical limits. |
| `symbol-catalog.mjs` | Combine manually, completed | The useful Wind/Water redraw was already merged. Decorative sigils remain distinct from recipe-matrix sigils. Older duplicate/ambiguous paths are rejected. |
| `support-geometry.mjs` | Already superseded | Current grounded desk, under-sole paper, realistic shoe camera, and clamping tests are newer. |
| `i18n.mjs` and `site-i18n.mjs` | Combine manually | Keep the canonical catalog and locale controller, then complete the remaining hard-coded runtime translations in this release. |
| Public HTML | Combine manually | Keep the canonical language switcher, CSP, complete controls, local assets, and add the new wiki/SEO structure. |
| `styles.css` | Already superseded | Current responsive controls, palette, support panels, and wiki-compatible layout are broader. |
| Library assets | Preserve canonical | The canonical repository has 33 original local SVG schematics; the historical repository has no stronger complete asset set. |
| Tests | Preserve canonical | Canonical coverage is substantially broader and includes mechanics, i18n, assets, geometry, and 3D integration. |
| `.nojekyll` | Preserve behavior | The historical tracked file is useful only as deployment behavior; the canonical workflow already generates it in the Pages artifact. |
| Runtime duplication | Reject | Maintaining two full simulators caused the reported divergence. The historical site will become a redirect after canonical deployment succeeds. |

## Matrix Boundary

The editor keeps 26 editable sigils, including decorative shapes. The published
variant explorer deliberately indexes the nine established central recipe
sigils and all 38 modifier signs:

```text
9 sigils * (38 * 39 / 2 sign pairs) * 2 supports = 13,338 variants
```

This boundary prevents decorative forms from silently changing the documented
contract while keeping them available for freehand creation.
