# Local recognition implementation, 2026-09-05

User approved public simulator implementation, two independent local networks,
classic/neural choice, rotation validation, and grouped correction.

## Implementation decisions

- Keep independent canvas and photo choices, persisted on this device.
- Classic is the default while there is no independently collected real-world
  photo/handwriting corpus. Neural mode is explicitly experimental.
- Synthetic validation must report accepted coverage as well as accuracy and
  false acceptance; rejecting everything cannot count as success.
- A compact trained network with a full-angle geometric verifier is acceptable
  if it measures better than the originally proposed tiny CNN. Actual trained
  weights and reproducible generation are required.
- Recognition runs on read/activation or explicit review, never per frame.
- Cross-collection imports retain placement kind and add semanticKind.
- The local application/Minecraft demo is outside this release.

## Work allocation

1. Neural runtime, source adapters, training and held-out validation: Ohm.
2. Repeated image grouping, semantic propagation and local cache: Harvey.
3. Procedural flower and ordered manifestation: Lorentz.
4. Mode controls, grouped review, importer and activation integration: main.
5. Integrated tests and independent review completed. Release gates passed;
   public publication is authorized by the user's approved website plan.

## Release verification

- Complete suite: 704 tests passed, zero failures. Two subsequently added narrow
  WASM CSP regressions passed separately; public artifact tests also passed.
- Synthetic neural validator passed with unchanged thresholds; see the model
  validation report for acceptance coverage, pose limits and real-world caveats.
- Matrix: 65,600 unique deterministic recipes, 69 symbol drawings, status ok.
- Security audit, syntax check and public packaging audit passed. Packaging
  explicitly requires both local model assets and their runtime dependencies.
- Independent review fixed stale-result fallback, conflicting image semantics,
  missing boundary invalidation, aggregate cache bounds, and stable scene asset
  identities. Confirmed metadata is not silently overwritten by a prediction.
- Browser: classic defaults and separate neural selections work. Imported native
  glyphs activate the complete flower recipe. Main 3D environment, petals and
  released fragments are visible. After the narrow CSP fix, no new Rapier WASM
  compilation failure was logged; its existing deprecation warning remains.
- Two actual imported custom assets were displayed as two groups of 55, not
  110 independent corrections. Their suggestions still require confirmation.
- Browser automation was intermittent; a full touch-device interaction pass
  and independent real-photo/handwriting corpus remain future validation work.
- GitHub's connected OAuth credential cannot update workflow files. The existing
  deployment workflow is preserved unchanged. Its full tests, matrix, security
  and artifact audits still run; the separate full neural validation script was
  run locally rather than added as an extra workflow step.
