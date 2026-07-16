const paths = (...items) => Object.freeze(items);

const circle = (cx, cy, radius) =>
  `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}`;

const ellipse = (cx, cy, rx, ry) =>
  `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;

// Original vector reconstructions based on the local research captures. The
// same paths are used in the picker and on the drawing canvas so the visible
// sign can no longer drift from the sign that is actually placed.
export const SYMBOL_PATHS = Object.freeze({
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
    "M11 8 H37 M24 8 V36 L16 29 M24 36 L32 29",
    "M17 18 L10 24 L17 30 M31 18 L38 24 L31 30",
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
    "M7 12 L24 31 L41 12 M7 36 L24 17 L41 36",
    "M15 6 L33 42 M33 6 L15 42",
  ),
  Aeriforme: paths(
    "M24 17 L15 31 L33 31 Z",
    circle(24, 17, 2.4),
    circle(15, 31, 2.4),
    circle(33, 31, 2.4),
    "M24 14 C22 9 23 5 27 5 C31 5 31 9 28 10",
    "M12 32 C8 36 4 36 4 32 C4 29 7 28 9 30",
    "M36 32 C40 34 43 37 41 41 C39 44 35 42 36 39",
  ),
  "Vent sous pied": paths(
    "M24 5 C31 5 35 10 35 16 C35 22 30 26 24 26 C18 26 13 21 13 15 C13 9 18 5 24 5 C29 5 31 9 31 13 C31 17 28 20 24 20 C20 20 18 17 18 14 C18 11 20 9 23 9 C26 9 27 11 27 13",
    "M24 43 C17 43 13 38 13 32 C13 26 18 22 24 22 C30 22 35 27 35 33 C35 39 30 43 24 43 C19 43 17 39 17 35 C17 31 20 28 24 28 C28 28 30 31 30 34 C30 37 28 39 25 39 C22 39 21 37 21 35",
    "M16 12 C8 14 7 22 10 28 C12 33 17 36 21 36",
    "M32 12 C40 14 41 22 38 28 C36 33 31 36 27 36",
  ),
  Repetition: paths(
    "M5 25 C12 12 36 12 43 25 C35 38 13 38 5 25 Z",
    "M2 29 L7 24 M46 21 L41 26 M12 25 H36",
    ellipse(24, 25, 9, 6),
    circle(24, 25, 2.2),
  ),

  // Directional and semi-directional signs are drawn facing upward. The app
  // rotates them radially when they are placed around a seal.
  Colonne: paths("M24 7 V41 M12 41 H36"),
  Dispersion: paths("M24 7 V31 M12 31 H36 M12 36 Q24 45 36 36"),
  Levitation: paths("M24 41 V9 M14 19 L24 9 L34 19"),
  Traction: paths("M24 6 V39 M13 22 L24 33 L35 22 M13 29 L24 40 L35 29"),
  Region: paths("M9 35 L24 14 L39 35"),
  Convergence: paths("M10 12 H38 L24 38 Z"),
  Collection: paths("M10 10 H38 L24 24 L10 40 M24 24 L38 40"),
  Nuage: paths(
    "M24 8 C32 8 32 18 24 24 C16 18 16 8 24 8",
    "M24 40 C16 40 16 30 24 24 C32 30 32 40 24 40",
    "M8 24 C8 16 18 16 24 24 C18 32 8 32 8 24",
    "M40 24 C40 32 30 32 24 24 C30 16 40 16 40 24",
  ),
  Crush: paths("M7 30 L15 19 L24 30 L33 19 L41 30"),
  Pantin: paths(
    circle(24, 24, 11),
    "M19 14 L15 8 L10 12 M29 14 L33 8 L38 12 M19 34 L15 40 L10 36 M29 34 L33 40 L38 36",
    "M14 19 L8 15 L5 21 M34 19 L40 15 L43 21 M14 29 L8 33 L5 27 M34 29 L40 33 L43 27",
    "M17 13 Q24 8 31 13 M17 35 Q24 40 31 35 M13 17 Q8 24 13 31 M35 17 Q40 24 35 31",
  ),
  Flottement: paths(
    "M17 8 C8 20 27 25 17 40",
    "M31 8 C22 20 41 25 31 40",
  ),
  Etirement: paths("M9 40 L15 34 A13 13 0 1 1 33 34 L39 40"),
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
    "M24 7 V41",
    "M24 14 H12 V7 M24 14 H36 V7",
    "M24 34 H12 V41 M24 34 H36 V41",
  ),
  "Signe de vent": paths("M31 7 C15 10 32 22 19 29 C11 34 19 43 31 38"),
  "Aeriforme defini": paths("M13 36 L18 13 M24 39 V9 M35 36 L30 13"),
  Rassemblement: paths("M24 40 V11 M12 23 L24 11 L36 23 M12 40 L24 28 L36 40"),
  Glaives: paths(
    "M24 7 V42",
    "M13 7 V15 C13 22 18 25 24 25 C30 25 35 22 35 15 V7",
  ),
  Solidification: paths(circle(24, 13, 7), circle(24, 35, 7), "M24 20 V28"),
  Lien: paths(
    "M14 9 H34 L24 19 Z",
    "M7 17 L17 27 L29 15 L41 27",
    "M7 27 L17 37 L29 25 L39 35 L43 31",
  ),
  Arret: paths("M9 27 Q24 10 39 27 M15 36 Q24 25 33 36"),
  Enveloppe: paths("M24 7 V41 M24 7 L35 18 M24 41 L13 30"),
  Dissimulation: paths(
    "M24 8 V40 M8 24 H40",
    "M11 11 L37 37 M37 11 L11 37",
    ellipse(24, 8, 5, 3),
    ellipse(24, 40, 5, 3),
    ellipse(8, 24, 3, 5),
    ellipse(40, 24, 3, 5),
  ),
  Reflection: paths("M12 8 H36 L24 24 L36 40 H12 L24 24 Z"),
  Diamant: paths("M24 7 L38 24 L24 41 L10 24 Z"),
  Fenetre: paths("M14 14 H34 V34 H14 Z M24 7 V41 M7 24 H41"),
  Agrandissement: paths(
    "M5 18 V5 H18 M30 5 H43 V18 M43 30 V43 H30 M18 43 H5 V30",
    "M10 18 V10 H18 M30 10 H38 V18 M38 30 V38 H30 M18 38 H10 V30",
    "M15 18 V15 H18 M30 15 H33 V18 M33 30 V33 H30 M18 33 H15 V30",
  ),
  Viseur: paths("M24 7 V18 M24 30 V41 M7 24 H18 M30 24 H41"),
  Radial: paths("M10 40 V24 C10 7 38 7 38 24 V40 M17 40 V25 C17 16 31 16 31 25 V40"),
  Projectile: paths("M24 5 V43 M24 16 L33 24 L24 32 L15 24 Z"),
  Pluie: paths(
    "M13 13 Q24 17 35 13 Q31 24 35 35 Q24 31 13 35 Q17 24 13 13 Z",
    "M20 5 V12 M24 3 V12 M28 5 V12 M20 36 V43 M24 36 V45 M28 36 V43 M5 20 H12 M3 24 H12 M5 28 H12 M36 20 H43 M36 24 H45 M36 28 H43",
  ),
  Orbe: paths(circle(24, 24, 14), "M24 7 V41"),
  Purification: paths(
    "M14 7 C27 9 34 20 33 30 C32 39 25 43 18 41 C12 39 10 34 12 30 C14 26 18 25 22 27 C26 29 27 33 24 36 C22 38 19 38 17 36",
  ),
  Immobilite: paths(
    "M24 7 V41",
    "M11 7 V14 C11 21 16 23 24 23 C32 23 37 21 37 14 V7",
    "M11 41 V34 C11 27 16 25 24 25 C32 25 37 27 37 34 V41",
    "M14 21 H34 M14 27 H34",
  ),
  Projection: paths("M8 34 V15 H40 V34"),
});

// Timestamp suffix of the local capture used to review each drawing. Keeping
// this mapping beside the vectors makes the visual audit reproducible without
// shipping any copyrighted reference image as a runtime asset.
export const SYMBOL_REFERENCE_SUFFIX = Object.freeze({
  Feu: "130049",
  Eau: "130116",
  Terre: "130226",
  Vent: "130246",
  Lumiere: "130313",
  Cristal: "130336",
  Aeriforme: "130246",
  "Vent sous pied": "130246",
  Repetition: "131740",
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
