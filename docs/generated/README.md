# Generated Sigil Reference Archive

This directory keeps nineteen generated reference sheets used to reconstruct
and audit the editable vector catalog against the supplied research captures.
Eighteen symbol sheets are linked case by case to the runtime vectors in
`SYMBOL_BOARD_TRACE`; the support sheet is used by the support interface.

## Generated Sheets

1. `wind-water-symbol-reference.png`: Wind underfoot, Aeriforms, Whorling Wind,
   and Water.
2. `earth-fire-light-symbol-reference.png`: Earth, Fire, Light, and Unburning
   Flames.
3. `decorative-creatures-i-symbol-reference.png`: Valance Leech, Frillram,
   Scalewolf, and Torchstag.
4. `decorative-creatures-ii-symbol-reference.png`: Owlcat, Dragon, Horse, and
   Bird B.
5. `utility-state-symbol-reference.png`: Crystallize, Smoke, Stop, and
   Repetition.
6. `audited-sigils-state-v2.png`: second-pass Earth, Repetition, Stop, and
   Owlcat Head audit.
7. `audited-sigils-decorative-v2.png`: second-pass Valance Leech, Frillram,
   Sword, and Liongoat audit.
8. `audited-sigils-dragon-bird-v2.png`: second-pass Dragon and Bird A audit.
9. `support-cards-dalle-v1.png`: visual refinement reference for the no-link
   and flying-shoe support cards.
10. `signs-directional-i-dalle-v1.png`: Column, Dispersion, Levitation, and
    Pull.
11. `signs-directional-ii-dalle-v1.png`: Region, Convergence, Collection, and
    Billow.
12. `signs-force-motion-dalle-v1.png`: Crush, Puppet, Float, and Stretch.
13. `signs-state-target-dalle-v1.png`: Physical Coil, Cool, Strengthen, and
    Sights Set.
14. `signs-relation-air-dalle-v1.png`: Entwine, Wind Sign, Aeriforms Defined,
    and Gather.
15. `signs-structure-dalle-v1.png`: Glaives, Solidify, Bind, and Envelop.
16. `signs-perception-scope-dalle-v1.png`: Conceal, Reflection, Diamond, and
    Window.
17. `signs-scale-projectile-dalle-v1.png`: Enlarge, Crosshair, Radial, and
    Bolt.
18. `signs-weather-purify-dalle-v1.png`: Rain, Orb, Purify, and Stillness.
19. `signs-link-project-flower-dalle-v1.png`: Link, Project, and Flower.

The second-pass sheets were generated with the built-in DALL-E image workflow.
Each accepted cell is extracted into a transparent monochrome mask under
`assets/symbol-glyphs/`. These masks are now the visual source used by the
symbol picker and by symbols placed on the parchment. The editable 48 by 48
vectors remain available for recognition, geometry and 3D line sampling.

`SYMBOL_BOARD_TRACE` records the exact sheet, cell, extracted asset, tracing
method and vector paths for every editable entry. `SYMBOL_BOARD_ASSET` is
consumed by both the picker and the drawing canvas. All eighteen symbol sheets
and all 63 cells they provide are covered by an automated runtime test. The
Wind sigil is the documented exception: capture 10 is its direct vector source
because no generated sheet contains that distinct sigil.

## Supplied Capture Inventory

The twelve raw wiki screenshots are retained only in the ignored local research
folder `docs/references/wiki-captures/`. They are not copied into the public
repository. Their hashes provide a stable inventory without redistributing the
source pages.

| Capture | Subject | SHA-256 |
| --- | --- | --- |
| 01 | Misc: Crystallize and Smoke | `932d4d116038851cbaf5a90b2e145a4a6697af613b323ceac721692fe1d7a2e7` |
| 02 | Valance Leech, Frillram, and Sword | `7522de42cf7b453d86f2ec636ca30115b4970ac2273f48fb47c4d71048a6f870` |
| 03 | Scalewolf, Torchstag, and Liongoat | `0a1725ab1544db62c8c40b90d108b4af2d90b8afb47009b66d32357b01176f3f` |
| 04 | Owlcat, Owlcat Head, and Scalewolf | `ece7a83b1f8ef59aba1f4609d95f480706e486ce3a8a0c2fbe99f24a7fcaa7ae` |
| 05 | Dragon, Flower, and Horse | `d9951aa7f8cc33a984ce635fddd8e26fc3eaef577b0de8554f545df7973ccc9b` |
| 06 | Decorative Birds A and B | `3ffe9c8127776f7848683e9815a54ab7d71ff0c92c8cc331d0671f11a88f2240` |
| 07 | Stop | `fe5f226f08a556460ae3a2abd008481f03d41b53d218b7df9a65f8a720535226` |
| 08 | Repetition | `955f0d67df886ad5faddd8cdf415f22e0541eae5ea59bb39b228a44311d637d4` |
| 09 | Aeriforms, Wind Underfoot, and Whorling Wind | `fbf4e020b6c02f10122870adf2a0e4b17923939e9729c916596dbc2811f1f8e3` |
| 10 | Earth and Wind | `d08e6d79bb1c9ffb1ee9c59ec5dc979182925d9b6a29de787f38bd85756a1cb7` |
| 11 | Light and Water | `2d9c8624cd0b77f603091e4f24e0d02179da0ab02d0277c4464f11002ea41d43` |
| 12 | Fire and Unburning Flames | `39b93a0e1938220cc96f7cf2a69a64332c4b8b0576426b98a59f84378f28f36b` |

## Provenance Boundary

The generated sheets are visual research aids, not claims of canonical artwork.
Behavior, names, bilingual descriptions and drag-and-drop use the shared
catalogue metadata. The picker and parchment use the extracted board masks;
recognition and 3D rendering use the paired editable vector geometry.
