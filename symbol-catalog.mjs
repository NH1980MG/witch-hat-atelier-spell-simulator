const paths = (...items) => Object.freeze(items);

const circle = (cx, cy, radius) =>
  `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}`;

// Editable traces reconstructed from the exact cells listed in
// SYMBOL_BOARD_CELL below. Vent is the sole exception: its source capture has
// no generated-board cell, so it keeps an explicit capture provenance.
const BOARD_TRACED_PATHS = Object.freeze({
  Feu: paths(
    "M24 6 L10 35 L38 35 Z",
    "M14 23 L6 19 M34 23 L42 19 M24 35 L24 44",
  ),
  Eau: paths(
    "M10 34 C6 29 10 20 14 12 C18 21 20 29 16 34 C14 37 11 37 10 34 Z",
    "M27 5 C21 6 20 12 22 18 C24 24 29 29 27 35 C26 40 22 43 18 43",
    "M36 35 C31 28 31 20 34 14 C36 10 41 11 42 16 C43 22 39 29 36 35 Z",
  ),
  Terre: paths(
    "M10 8 H38 M24 8 V36 L8 24 L15 17 M24 36 L40 24 L33 17",
    "M11 41 H37",
    circle(5, 24, 2.2),
    circle(43, 24, 2.2),
  ),
  Vent: paths(
    "M28 13 C31 10 30 6 26 6 C20 6 18 12 20 17 C22 22 30 23 32 28 C35 35 30 42 23 42 C18 42 15 38 16 34 C17 30 21 28 25 30 C28 32 28 36 25 38",
    "M13 17 L8 12 M12 24 H5 M13 31 L8 36 M35 17 L40 12 M36 24 H43 M35 31 L40 36",
  ),
  Lumiere: paths(
    "M14 14 H34 V34 H14 Z",
    "M24 8 V40 M8 24 H40 M24 12 L36 24 L24 36 L12 24 Z",
  ),
  Cristal: paths(
    "M6 10 L24 29 L42 10 M6 38 L24 19 L42 38",
    "M13 6 L35 42 M35 6 L13 42",
    "M6 24 H42 M10 16 L32 40 M38 16 L16 40",
  ),
  Aeriforme: paths(
    "M25 6 C19 6 17 11 19 16 C21 21 29 23 30 29 C32 35 28 42 22 42 C17 42 14 38 16 34 C18 30 22 29 25 31 C28 33 27 37 24 38",
    "M4 24 H15 M8 18 L15 24 L8 30 M5 16 L11 20 M5 32 L11 28",
    "M44 24 H33 M40 18 L33 24 L40 30 M43 16 L37 20 M43 32 L37 28",
  ),
  "Vent sous pied": paths(
    "M24 5 C31 5 35 10 35 16 C35 22 30 26 24 26 C18 26 13 21 13 15 C13 9 18 5 24 5 C29 5 31 9 31 13 C31 17 28 20 24 20 C20 20 18 17 18 14 C18 11 20 9 23 9 C26 9 27 11 27 13",
    "M24 43 C17 43 13 38 13 32 C13 26 18 22 24 22 C30 22 35 27 35 33 C35 39 30 43 24 43 C19 43 17 39 17 35 C17 31 20 28 24 28 C28 28 30 31 30 34 C30 37 28 39 25 39 C22 39 21 37 21 35",
    "M16 12 C8 14 7 22 10 28 C12 33 17 36 21 36",
    "M32 12 C40 14 41 22 38 28 C36 33 31 36 27 36",
  ),
  Repetition: paths(
    "M5 28 C9 15 19 9 29 11 C36 12 41 18 43 24 M5 20 C10 31 20 36 30 33 C37 31 41 26 43 20",
    "M5 28 L6 20 L13 24 M43 20 L42 28 L35 24",
    "M13 24 C18 17 29 17 35 24 C29 31 18 31 13 24 Z",
    "M20 24 C21 19 29 19 30 24 C31 28 26 30 23 28 C20 27 20 24 22 22 C24 20 27 21 27 24",
  ),
  Fumee: paths(
    "M15 34 C9 34 5 29 5 23 C5 17 10 12 16 13 C18 7 24 5 30 7 C36 9 39 15 37 21 C42 19 47 23 47 29 C47 35 42 39 36 39 C33 39 31 38 29 36",
    "M12 25 C18 20 28 21 34 27 C40 34 35 43 28 44 C22 45 16 42 15 37 C14 32 18 28 23 29 C28 30 29 36 26 39 C23 42 19 39 20 36 C21 34 23 34 25 35",
  ),
  "Sangsue-valance": paths(
    "M4 25 L14 26 L18 34 L33 29 L37 18 L26 11 L15 17 Z",
    "M15 17 L12 10 L17 7 M26 11 L27 5 M37 18 H44 M40 18 V24 M18 34 L11 37 M11 34 V41 H19 M33 29 L39 35",
  ),
  Frillram: paths(
    "M5 9 H18 M13 9 V15 C13 22 17 24 22 24 M22 24 C22 29 18 31 15 34 C11 38 13 42 19 42 H41",
    "M22 15 H31 V22 C31 28 34 30 39 30 H43 M39 15 V35 C39 39 37 41 33 41 H28",
    "M43 8 L41 42",
  ),
  Epee: paths(
    "M22 5 V43",
    "M14 5 V18 C14 24 17 27 22 30",
    "M22 28 C30 31 34 36 34 43",
  ),
  "Loup-ecaille": paths(
    "M24 4 V9 M19 9 L24 15 L29 9 Z M16 17 H32 L24 27 Z M18 17 L24 37 L30 17",
    "M12 24 L7 29 L12 34 L16 29 Z M36 24 L41 29 L36 34 L32 29 Z M24 37 L18 43 L24 48 L30 43 Z",
    "M7 22 L4 19 M9 37 L5 41 M41 22 L44 19 M39 37 L43 41",
  ),
  "Cerf-torche": paths(
    "M7 9 Q16 17 25 9 M16 14 V28 M5 25 L15 20 L22 27 L29 21 Q38 18 43 27 L35 37",
    "M5 25 L11 29 M35 37 L32 42 M12 39 H18 M31 43 H37",
  ),
  "Chevre-lion": paths(
    "M7 11 L11 7 L18 14 C21 18 22 23 24 31 C26 23 27 18 30 14 L37 7 L41 11",
    "M8 24 C11 13 20 12 24 20 C28 12 37 13 40 24",
    "M8 24 H40 M8 21 V27 M40 21 V27",
    "M8 32 C13 39 18 37 21 31 M40 32 C35 39 30 37 27 31",
    "M14 42 C20 47 28 47 34 42 M16 46 H19 M29 46 H32",
  ),
  "Chat-hibou": paths(
    "M16 13 A8 8 0 1 0 32 13 A8 8 0 1 0 16 13",
    "M19 6 L17 1 M29 6 L31 1 M24 11 V16",
    "M16 21 C12 20 9 18 5 18 L7 29 M32 21 C36 20 39 18 43 18 L41 29",
    "M16 21 Q24 25 32 21 M16 21 L24 30 L32 21 M24 30 V44 M24 36 L17 43 M24 36 L31 43",
    "M8 22 H4 M8 25 H4 M40 22 H44 M40 25 H44",
  ),
  "Tete de chat-hibou": paths(
    circle(24, 24, 12),
    "M17 9 L24 27 L31 9",
    "M21 27 H27",
    "M12 24 L6 22 L3 31 M7 23 L5 32",
    "M36 24 L42 22 L45 31 M41 23 L43 32",
  ),
  Dragon: paths(
    "M4 25 C4 33 11 36 17 32 C20 30 20 27 17 25",
    "M9 24 H31 L37 29 L42 27",
    "M13 21 H30 M15 18 H28 M17 15 H26 M19 12 H24",
    "M17 25 L24 16 L32 29 L28 38 M21 22 L34 20 M25 25 L37 22",
    "M30 29 L34 39 M33 29 L39 35",
    "M36 29 L44 31 L39 37 Z",
  ),
  Fleur: paths(
    "M24 15 L33 22 L30 34 H18 L15 22 Z",
    "M24 15 V5 M15 22 L6 18 M33 22 L42 18 M18 34 L12 42 M30 34 L36 42",
  ),
  Cheval: paths(
    "M8 8 H15 V22 H36 V39 M15 22 V39 M15 31 H24 V22 M28 22 V31 H36",
    "M7 8 H14 M6 41 H17 M31 41 H41",
  ),
  "Oiseau A": paths(
    "M21 7 C21 12 18 15 14 15 C10 15 8 19 9 23 C10 27 10 33 7 39",
    "M27 7 C27 12 30 15 34 15 C38 15 40 19 39 23 C38 27 38 33 41 39",
    "M10 20 L5 16 M10 24 L4 22 M10 28 L5 31 M12 18 L8 13",
    "M38 20 L43 16 M38 24 L44 22 M38 28 L43 31 M36 18 L40 13",
  ),
  "Oiseau B": paths(
    "M24 8 V39 M24 16 L15 24 L7 19 M24 16 L33 24 L41 19",
    "M7 19 L4 23 M10 21 L7 25 M41 19 L44 23 M38 21 L41 25 M24 39 L17 45 M24 39 L31 45",
  ),
  "Arret temporel": paths(
    circle(24, 24, 19),
    circle(24, 24, 8),
    circle(24, 24, 2.3),
    "M24 5 V10 L20 16 M24 10 L28 16",
    "M24 43 V38 L20 32 M24 38 L28 32",
    "M5 24 H10 L16 20 M10 24 L16 28",
    "M43 24 H38 L32 20 M38 24 L32 28",
    "M11 11 H16 V6 M37 11 H32 V6 M11 37 H16 V42 M37 37 H32 V42",
  ),
  "Vent tourbillonnant": paths(
    "M24 17 L15 31 L33 31 Z",
    circle(24, 17, 2.4),
    circle(15, 31, 2.4),
    circle(33, 31, 2.4),
    "M24 14 C22 9 23 5 27 5 C31 5 31 9 28 10",
    "M12 32 C8 36 4 36 4 32 C4 29 7 28 9 30",
    "M36 32 C40 34 43 37 41 41 C39 44 35 42 36 39",
  ),
  "Flammes sans chaleur": paths(
    "M24 9 L13 34 H35 Z M17 25 L8 18 M31 25 L40 18 M24 34 V43",
    "M5 15 H11 V21 H5 Z M37 15 H43 V21 H37 Z M21 40 H27 V46 H21 Z",
  ),

  // Directional and semi-directional signs are drawn facing upward. The app
  // rotates them radially when they are placed around a seal.
  Colonne: paths("M24 7 V40 M12 40 H36"),
  Dispersion: paths(
    "M24 6 V25",
    "M11 27 Q24 37 37 27",
    "M11 34 Q24 44 37 34",
  ),
  Levitation: paths("M24 40 V8 M14 18 L24 8 L34 18", "M12 40 H36"),
  Traction: paths("M24 7 V40", "M14 23 L24 33 L34 23", "M14 30 L24 40 L34 30"),
  Region: paths("M9 35 L24 14 L39 35"),
  Convergence: paths("M10 12 H38 L24 38 Z"),
  Collection: paths("M10 10 H38 L24 24 Z", "M10 40 L24 24 L38 40"),
  Nuage: paths(
    "M24 8 C32 8 32 18 24 24 C16 18 16 8 24 8",
    "M24 40 C16 40 16 30 24 24 C32 30 32 40 24 40",
    "M8 24 C8 16 18 16 24 24 C18 32 8 32 8 24",
    "M40 24 C40 32 30 32 24 24 C30 16 40 16 40 24",
  ),
  Crush: paths("M7 30 L15 19 L24 30 L33 19 L41 30"),
  Pantin: paths(
    "M15 24 C15 13 19 8 24 8 C29 8 33 13 33 24 C33 35 29 40 24 40 C19 40 15 35 15 24 Z",
    "M20 9 V5 C20 2 16 2 14 4 M28 9 V5 C28 2 32 2 34 4",
    "M16 17 L11 14 C8 12 7 8 9 6 M16 20 L10 19 C6 18 5 15 6 12",
    "M32 17 L37 14 C40 12 41 8 39 6 M32 20 L38 19 C42 18 43 15 42 12",
    "M16 31 L11 34 C8 36 7 40 9 42 M16 28 L10 29 C6 30 5 33 6 36",
    "M32 31 L37 34 C40 36 41 40 39 42 M32 28 L38 29 C42 30 43 33 42 36",
  ),
  Flottement: paths(
    "M17 8 C8 20 27 25 17 40",
    "M31 8 C22 20 41 25 31 40",
  ),
  Etirement: paths("M8 41 L14 35 A14 14 0 1 1 34 35 L40 41"),
  "Spire physique": paths(
    "M17 6 C33 16 15 32 31 42",
    "M31 6 C15 16 33 32 17 42",
  ),
  Refroidissement: paths(
    "M24 7 V41",
    circle(14, 16, 2),
    circle(34, 16, 2),
    circle(14, 32, 2),
    circle(34, 32, 2),
  ),
  Renforcement: paths("M24 8 L10 37 H38 Z M13 26 H35"),
  Cible: paths(
    "M24 42 V7 M14 17 L24 7 L34 17",
    "M24 29 L17 36 L24 43 L31 36 Z",
  ),
  Enlacement: paths(
    "M24 8 V40",
    "M24 14 H12 V7 M12 14 H18",
    "M24 14 H36 V7 M36 14 H30",
    "M24 34 H12 V41 M12 34 H18",
    "M24 34 H36 V41 M36 34 H30",
  ),
  "Signe de vent": paths(
    "M30 8 C20 6 17 12 19 18 C21 24 30 23 30 17 C30 12 24 11 20 14",
    "M20 14 C18 24 20 34 28 41",
  ),
  "Aeriforme defini": paths("M14 36 L19 16 M24 39 V9 M34 36 L29 16"),
  Rassemblement: paths(
    "M24 42 V11 M13 22 L24 11 L35 22",
    "M24 28 L14 42 M24 28 L34 42",
  ),
  Glaives: paths(
    "M24 14 V42",
    "M13 7 V13 C13 20 18 23 24 23 C30 23 35 20 35 13 V7",
    "M24 7 V23",
  ),
  Solidification: paths(circle(24, 13, 7), circle(24, 35, 7), "M24 20 V28"),
  Lien: paths(
    "M14 8 H34 L24 18 Z",
    "M7 18 L17 28 L29 16 L41 28",
    "M7 28 L17 38 L29 26 L39 36 L43 32",
  ),
  Arret: paths("M9 27 Q24 10 39 27 M15 36 Q24 25 33 36"),
  Enveloppe: paths("M24 7 V41 M24 7 L35 18 M24 41 L13 30"),
  Dissimulation: paths(
    "M24 8 V40 M8 24 H40",
    "M11 11 L37 37 M37 11 L11 37",
    "M19 8 Q24 3 29 8 Q24 13 19 8 Z",
    "M19 40 Q24 35 29 40 Q24 45 19 40 Z",
    "M8 19 Q3 24 8 29 Q13 24 8 19 Z",
    "M40 19 Q35 24 40 29 Q45 24 40 19 Z",
    circle(24, 8, 1.2),
    circle(24, 40, 1.2),
    circle(8, 24, 1.2),
    circle(40, 24, 1.2),
  ),
  Reflection: paths("M12 8 H36 L24 24 L36 40 H12 L24 24 Z"),
  Diamant: paths("M24 7 L38 24 L24 41 L10 24 Z"),
  Fenetre: paths("M17 8 H31 V40 H17 Z", "M8 17 H40 V31 H8 Z"),
  Agrandissement: paths(
    "M5 18 V5 H18 M30 5 H43 V18 M43 30 V43 H30 M18 43 H5 V30",
    "M10 18 V10 H18 M30 10 H38 V18 M38 30 V38 H30 M18 38 H10 V30",
    "M15 18 V15 H18 M30 15 H33 V18 M33 30 V33 H30 M18 33 H15 V30",
  ),
  Viseur: paths("M24 7 V18 M24 30 V41 M7 24 H18 M30 24 H41"),
  Radial: paths("M10 40 V24 C10 7 38 7 38 24 V40 M17 40 V25 C17 16 31 16 31 25 V40"),
  Projectile: paths("M24 5 V43 M24 16 L33 24 L24 32 L15 24 Z"),
  Pluie: paths(
    "M9 10 Q24 17 39 10 Q32 24 39 38 Q24 31 9 38 Q16 24 9 10 Z",
    "M20 4 V13 M24 2 V13 M28 4 V13 M20 35 V44 M24 35 V46 M28 35 V44 M4 20 H13 M2 24 H13 M4 28 H13 M35 20 H44 M35 24 H46 M35 28 H44",
  ),
  Orbe: paths(circle(24, 24, 14), "M24 7 V41"),
  Purification: paths(
    "M16 8 C26 12 31 22 28 32 C26 40 16 43 11 37 C7 32 10 26 16 26 C21 26 23 30 22 34 C21 37 17 38 14 36",
  ),
  Immobilite: paths(
    "M24 17 V31",
    "M13 5 V12 C13 19 18 22 24 22 C30 22 35 19 35 12 V5",
    "M13 43 V36 C13 29 18 26 24 26 C30 26 35 29 35 36 V43",
    "M14 19 H34 M14 25 H34 M14 31 H34",
  ),
  Projection: paths("M8 34 V15 H40 V34"),
});

// Generated audit sheet selected for each runtime vector. Vent deliberately
// has no generated sheet: its exact geometry comes from capture 10.
export const SYMBOL_GENERATED_BOARD = Object.freeze({
  Feu: "earth-fire-light-symbol-reference.png",
  Eau: "wind-water-symbol-reference.png",
  Terre: "earth-fire-light-symbol-reference.png",
  Vent: null,
  Lumiere: "earth-fire-light-symbol-reference.png",
  Cristal: "utility-state-symbol-reference.png",
  Aeriforme: "wind-water-symbol-reference.png",
  "Vent sous pied": "wind-water-symbol-reference.png",
  Repetition: "utility-state-symbol-reference.png",
  Fumee: "utility-state-symbol-reference.png",
  "Sangsue-valance": "decorative-creatures-i-symbol-reference.png",
  Frillram: "decorative-creatures-i-symbol-reference.png",
  Epee: "audited-sigils-decorative-v2.png",
  "Loup-ecaille": "decorative-creatures-i-symbol-reference.png",
  "Cerf-torche": "decorative-creatures-i-symbol-reference.png",
  "Chevre-lion": "audited-sigils-decorative-v2.png",
  "Chat-hibou": "decorative-creatures-ii-symbol-reference.png",
  "Tete de chat-hibou": "audited-sigils-state-v2.png",
  Dragon: "audited-sigils-dragon-bird-v2.png",
  Fleur: "signs-link-project-flower-dalle-v1.png",
  Cheval: "decorative-creatures-ii-symbol-reference.png",
  "Oiseau A": "audited-sigils-dragon-bird-v2.png",
  "Oiseau B": "decorative-creatures-ii-symbol-reference.png",
  "Arret temporel": "audited-sigils-state-v2.png",
  "Vent tourbillonnant": "wind-water-symbol-reference.png",
  "Flammes sans chaleur": "earth-fire-light-symbol-reference.png",
  Colonne: "signs-directional-i-dalle-v1.png",
  Dispersion: "signs-directional-i-dalle-v1.png",
  Levitation: "signs-directional-i-dalle-v1.png",
  Traction: "signs-directional-i-dalle-v1.png",
  Region: "signs-directional-ii-dalle-v1.png",
  Convergence: "signs-directional-ii-dalle-v1.png",
  Collection: "signs-directional-ii-dalle-v1.png",
  Nuage: "signs-directional-ii-dalle-v1.png",
  Crush: "signs-force-motion-dalle-v1.png",
  Pantin: "signs-force-motion-dalle-v1.png",
  Flottement: "signs-force-motion-dalle-v1.png",
  Etirement: "signs-force-motion-dalle-v1.png",
  "Spire physique": "signs-state-target-dalle-v1.png",
  Refroidissement: "signs-state-target-dalle-v1.png",
  Renforcement: "signs-state-target-dalle-v1.png",
  Cible: "signs-state-target-dalle-v1.png",
  Enlacement: "signs-relation-air-dalle-v1.png",
  "Signe de vent": "signs-relation-air-dalle-v1.png",
  "Aeriforme defini": "signs-relation-air-dalle-v1.png",
  Rassemblement: "signs-relation-air-dalle-v1.png",
  Glaives: "signs-structure-dalle-v1.png",
  Solidification: "signs-structure-dalle-v1.png",
  Lien: "signs-link-project-flower-dalle-v1.png",
  Arret: "signs-structure-dalle-v1.png",
  Enveloppe: "signs-structure-dalle-v1.png",
  Dissimulation: "signs-perception-scope-dalle-v1.png",
  Reflection: "signs-perception-scope-dalle-v1.png",
  Diamant: "signs-perception-scope-dalle-v1.png",
  Fenetre: "signs-perception-scope-dalle-v1.png",
  Agrandissement: "signs-scale-projectile-dalle-v1.png",
  Viseur: "signs-scale-projectile-dalle-v1.png",
  Radial: "signs-scale-projectile-dalle-v1.png",
  Projectile: "signs-scale-projectile-dalle-v1.png",
  Pluie: "signs-weather-purify-dalle-v1.png",
  Orbe: "signs-weather-purify-dalle-v1.png",
  Purification: "signs-weather-purify-dalle-v1.png",
  Immobilite: "signs-weather-purify-dalle-v1.png",
  Projection: "signs-link-project-flower-dalle-v1.png",
});

const SYMBOL_BOARD_CELL = Object.freeze({
  Feu: "top-right",
  Eau: "bottom-right",
  Terre: "top-left",
  Vent: "capture-10-wind",
  Lumiere: "bottom-left",
  Cristal: "top-left",
  Aeriforme: "top-right",
  "Vent sous pied": "top-left",
  Repetition: "bottom-right",
  Fumee: "top-right",
  "Sangsue-valance": "top-left",
  Frillram: "top-right",
  Epee: "bottom-left",
  "Loup-ecaille": "bottom-left",
  "Cerf-torche": "bottom-right",
  "Chevre-lion": "bottom-right",
  "Chat-hibou": "top-left",
  "Tete de chat-hibou": "bottom-right",
  Dragon: "left",
  Fleur: "bottom-left",
  Cheval: "bottom-left",
  "Oiseau A": "right",
  "Oiseau B": "bottom-right",
  "Arret temporel": "bottom-left",
  "Vent tourbillonnant": "bottom-left",
  "Flammes sans chaleur": "bottom-right",
  Colonne: "top-left",
  Dispersion: "top-right",
  Levitation: "bottom-left",
  Traction: "bottom-right",
  Region: "top-left",
  Convergence: "top-right",
  Collection: "bottom-left",
  Nuage: "bottom-right",
  Crush: "top-left",
  Pantin: "top-right",
  Flottement: "bottom-left",
  Etirement: "bottom-right",
  "Spire physique": "top-left",
  Refroidissement: "top-right",
  Renforcement: "bottom-left",
  Cible: "bottom-right",
  Enlacement: "top-left",
  "Signe de vent": "top-right",
  "Aeriforme defini": "bottom-left",
  Rassemblement: "bottom-right",
  Glaives: "top-left",
  Solidification: "top-right",
  Lien: "top-left",
  Arret: "bottom-left",
  Enveloppe: "bottom-right",
  Dissimulation: "top-left",
  Reflection: "top-right",
  Diamant: "bottom-left",
  Fenetre: "bottom-right",
  Agrandissement: "top-left",
  Viseur: "top-right",
  Radial: "bottom-left",
  Projectile: "bottom-right",
  Pluie: "top-left",
  Orbe: "top-right",
  Purification: "bottom-left",
  Immobilite: "bottom-right",
  Projection: "top-right",
});

function symbolBoardAssetPath(name, board) {
  if (!board) {
    return null;
  }
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `assets/symbol-glyphs/${slug}.png`;
}

export const SYMBOL_BOARD_ASSET = Object.freeze(Object.fromEntries(
  Object.entries(SYMBOL_GENERATED_BOARD).map(([name, board]) => [
    name,
    symbolBoardAssetPath(name, board),
  ]),
));

// This is the runtime provenance table, not a documentation-only index. Each
// entry owns the exact paths consumed by both the picker and the canvas.
export const SYMBOL_BOARD_TRACE = Object.freeze(Object.fromEntries(
  Object.entries(BOARD_TRACED_PATHS).map(([name, tracedPaths]) => {
    const board = SYMBOL_GENERATED_BOARD[name];
    return [name, Object.freeze({
      board,
      cell: SYMBOL_BOARD_CELL[name],
      method: board ? "manual-vector-trace" : "manual-capture-trace",
      paths: tracedPaths,
      asset: SYMBOL_BOARD_ASSET[name],
    })];
  }),
));

// Public runtime catalog derived from the provenance table above. Keeping this
// derivation here guarantees that the picker and placed symbol cannot fall
// back to an unrelated drawing.
export const SYMBOL_PATHS = Object.freeze(Object.fromEntries(
  Object.entries(SYMBOL_BOARD_TRACE).map(([name, trace]) => [name, trace.paths]),
));

// Timestamp suffix of the local capture used to review each drawing. Keeping
// this mapping beside the vectors makes the visual audit reproducible without
// shipping any copyrighted reference image as a runtime asset.
export const SYMBOL_REFERENCE_SUFFIX = Object.freeze({
  Feu: "130049",
  Eau: "130116",
  Terre: "20260716-audit-v2-state",
  Vent: "130246",
  Lumiere: "130313",
  Cristal: "130336",
  Aeriforme: "reference-09-air-sigils",
  "Vent sous pied": "130246",
  Repetition: "reference-08-repetition",
  Fumee: "reference-01-crystallize-smoke",
  "Sangsue-valance": "reference-02-valance-frillram-sword",
  Frillram: "reference-02-valance-frillram-sword",
  Epee: "20260716-audit-v2-decorative",
  "Loup-ecaille": "20260716-generated-04",
  "Cerf-torche": "reference-03-scalewolf-torchstag-liongoat",
  "Chevre-lion": "20260716-audit-v2-decorative",
  "Chat-hibou": "reference-04-owlcat-head-scalewolf",
  "Tete de chat-hibou": "20260716-audit-v2-state",
  Dragon: "20260716-audit-v2-dragon-bird",
  Fleur: "20260716-generated-05",
  Cheval: "reference-05-dragon-flower-horse",
  "Oiseau A": "20260716-audit-v2-dragon-bird",
  "Oiseau B": "20260716-generated-05",
  "Arret temporel": "20260716-audit-v2-state",
  "Vent tourbillonnant": "20260716-generated-02",
  "Flammes sans chaleur": "20260716-generated-05",
  Colonne: "131258",
  Dispersion: "131324",
  Levitation: "131350",
  Traction: "131511",
  Region: "131646",
  Convergence: "131711",
  Collection: "131711",
  Nuage: "131711",
  Crush: "131529",
  Pantin: "131606",
  Flottement: "131606",
  Etirement: "131740",
  "Spire physique": "131740",
  Refroidissement: "131740",
  Renforcement: "131802",
  Cible: "131802",
  Enlacement: "131802",
  "Signe de vent": "131850",
  "Aeriforme defini": "131850",
  Rassemblement: "131850",
  Glaives: "131920",
  Solidification: "131920",
  Lien: "132156",
  Arret: "131920",
  Enveloppe: "131948",
  Dissimulation: "131948",
  Reflection: "131948",
  Diamant: "132010",
  Fenetre: "132010",
  Agrandissement: "132010",
  Viseur: "132038",
  Radial: "132100",
  Projectile: "132100",
  Pluie: "132100",
  Orbe: "132128",
  Purification: "132128",
  Immobilite: "132156",
  Projection: "132216",
});

export const SYMBOL_AUDIT = Object.freeze({
  observed: Object.freeze([
    "Colonne", "Dispersion", "Levitation", "Traction", "Region", "Convergence",
    "Collection", "Nuage", "Crush", "Flottement", "Etirement", "Spire physique",
    "Refroidissement", "Renforcement", "Cible", "Enlacement", "Signe de vent",
    "Aeriforme defini", "Rassemblement", "Glaives", "Solidification", "Lien",
    "Arret", "Enveloppe", "Dissimulation", "Reflection", "Diamant", "Fenetre",
    "Agrandissement", "Viseur", "Radial", "Projectile", "Pluie", "Orbe",
    "Purification", "Immobilite", "Projection",
  ]),
  interpreted: Object.freeze(["Pantin"]),
});

export function hasSymbolDrawing(name) {
  return Array.isArray(SYMBOL_PATHS[name]) && SYMBOL_PATHS[name].length > 0;
}
