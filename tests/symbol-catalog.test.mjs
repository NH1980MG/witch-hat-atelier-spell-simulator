import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  SYMBOL_BOARD_TRACE,
  SYMBOL_GENERATED_BOARD,
  SYMBOL_PATHS,
} from "../symbol-catalog.mjs";

const correctedReferencePaths = Object.freeze({
  Aeriforme: [
    "M25 6 C19 6 17 11 19 16 C21 21 29 23 30 29 C32 35 28 42 22 42 C17 42 14 38 16 34 C18 30 22 29 25 31 C28 33 27 37 24 38",
    "M4 24 H15 M8 18 L15 24 L8 30 M5 16 L11 20 M5 32 L11 28",
    "M44 24 H33 M40 18 L33 24 L40 30 M43 16 L37 20 M43 32 L37 28",
  ],
  Repetition: [
    "M5 28 C9 15 19 9 29 11 C36 12 41 18 43 24 M5 20 C10 31 20 36 30 33 C37 31 41 26 43 20",
    "M5 28 L6 20 L13 24 M43 20 L42 28 L35 24",
    "M13 24 C18 17 29 17 35 24 C29 31 18 31 13 24 Z",
    "M20 24 C21 19 29 19 30 24 C31 28 26 30 23 28 C20 27 20 24 22 22 C24 20 27 21 27 24",
  ],
  Fumee: [
    "M17 31 C10 31 6 26 6 20 C6 14 11 10 17 11 C17 6 22 4 27 5 C33 6 36 11 34 17 C39 15 44 17 46 22 C48 28 45 34 40 36 C37 37 34 36 32 34",
    "M15 22 C22 17 31 20 35 25 C39 31 37 38 32 42 C26 46 18 43 15 38 C12 33 15 28 20 28 C25 28 28 32 27 36 C26 39 21 40 19 37 C18 35 19 33 21 32",
  ],
  "Sangsue-valance": [
    "M4 25 L14 26 L18 34 L33 29 L37 18 L26 11 L15 17 Z",
    "M15 17 L12 10 L17 7 M26 11 L27 5 M37 18 H44 M40 18 V24 M18 34 L11 37 M11 34 V41 H19 M33 29 L39 35",
  ],
  Frillram: [
    "M5 9 H18 M13 9 V15 C13 22 17 24 22 24 M22 24 C22 29 18 31 15 34 C11 38 13 42 19 42 H41",
    "M22 15 H31 V22 C31 28 34 30 39 30 H43 M39 15 V35 C39 39 37 41 33 41 H28",
    "M43 8 L41 42",
  ],
  "Cerf-torche": [
    "M7 9 Q16 17 25 9 M16 14 V28 M5 25 L15 20 L22 27 L29 21 Q38 18 43 27 L35 37",
    "M5 25 L11 29 M35 37 L32 42 M12 39 H18 M31 43 H37",
  ],
  "Chat-hibou": [
    "M16 13 A8 8 0 1 0 32 13 A8 8 0 1 0 16 13",
    "M19 6 L17 1 M29 6 L31 1 M24 11 V16",
    "M16 21 C12 20 9 18 5 18 L7 29 M32 21 C36 20 39 18 43 18 L41 29",
    "M16 21 Q24 25 32 21 M16 21 L24 30 L32 21 M24 30 V44 M24 36 L17 43 M24 36 L31 43",
    "M8 22 H4 M8 25 H4 M40 22 H44 M40 25 H44",
  ],
  Cheval: [
    "M8 8 H15 V22 H36 V39 M15 22 V39 M15 31 H24 V22 M28 22 V31 H36",
    "M7 8 H14 M6 41 H17 M31 41 H41",
  ],
  "Aeriforme defini": ["M14 36 L19 16 M24 39 V9 M34 36 L29 16"],
  Purification: [
    "M16 8 C26 12 31 22 28 32 C26 40 16 43 11 37 C7 32 10 26 16 26 C21 26 23 30 22 34 C21 37 17 38 14 36",
  ],
});

test("les glyphes cibles correspondent aux captures et planches de reference", () => {
  for (const [name, expected] of Object.entries(correctedReferencePaths)) {
    assert.deepEqual(SYMBOL_PATHS[name], expected, `${name} doit garder le trace valide`);
  }
});

test("Smoke provient explicitement de la case superieure droite de sa planche", () => {
  assert.deepEqual(SYMBOL_BOARD_TRACE.Fumee, {
    board: "utility-state-symbol-reference.png",
    cell: "top-right",
    method: "manual-vector-trace",
  });
  assert.equal(SYMBOL_GENERATED_BOARD.Fumee, SYMBOL_BOARD_TRACE.Fumee.board);
});

test("Smoke garde un trait fin et lisible dans le catalogue", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\[data-symbol="Fumee"\] \.symbol-mark path\s*\{\s*stroke-width: 2\.25;/);
});

test("les symboles corriges utilisent les nouveaux traces partages", () => {
  assert.equal(SYMBOL_PATHS["Vent sous pied"].length, 4);
  assert.match(SYMBOL_PATHS["Vent sous pied"][0], /M24 5 C31 5/);
  assert.equal(SYMBOL_PATHS.Vent.length, 2);
  assert.match(SYMBOL_PATHS.Vent[0], /M28 13 C31 10/);
  assert.match(SYMBOL_PATHS.Vent[1], /M13 17 L8 12/);
  assert.equal(SYMBOL_PATHS.Aeriforme.length, 3);
  assert.match(SYMBOL_PATHS.Aeriforme[0], /M25 6 C19 6/);
  assert.equal(SYMBOL_PATHS.Eau.length, 3);
  assert.match(SYMBOL_PATHS.Eau[1], /M27 5 C21 6/);
});

test("le navigateur charge la nouvelle version du catalogue partage", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(app, /symbol-catalog\.mjs\?v=20260718-refined-smoke-v2/);
  assert.match(html, /app\.js\?v=20260718-guides-smoke-v2/);
  assert.match(html, /styles\.css\?v=20260718-guides-smoke-v3/);
});

test("chaque glyphe partage possede une planche d'audit generee", () => {
  assert.equal(Object.keys(SYMBOL_PATHS).length, 64);
  assert.deepEqual(Object.keys(SYMBOL_GENERATED_BOARD), Object.keys(SYMBOL_PATHS));

  for (const [name, board] of Object.entries(SYMBOL_GENERATED_BOARD)) {
    assert.match(board, /\.png$/, `${name} doit pointer vers une planche PNG`);
  }
});

test("les 64 glyphes restent visuellement distincts", () => {
  const drawings = Object.entries(SYMBOL_PATHS).map(([name, paths]) => [name, paths.join(" ")]);
  const unique = new Map();

  for (const [name, drawing] of drawings) {
    assert.ok(!unique.has(drawing), `${name} ne doit pas reutiliser ${unique.get(drawing)}`);
    unique.set(drawing, name);
  }
});

test("les signes corriges gardent la topologie des captures", () => {
  const expectedFragments = {
    Dispersion: ["M24 7 V30", "Q24 43 36 34"],
    Collection: ["M10 10 H38", "M24 24 L38 40"],
    "Signe de vent": ["M30 8 C20 6", "M20 14 C18 24"],
    Rassemblement: ["M24 42 V11", "M24 28 L14 42"],
    Dissimulation: ["M24 8 V40", "circle"],
    Fenetre: ["M17 8 H31", "M8 17 H40"],
    Purification: ["M16 8 C26 12", "C7 32 10 26"],
    Immobilite: ["M24 7 V41", "M14 21 H34"],
  };

  for (const [name, fragments] of Object.entries(expectedFragments)) {
    const drawing = SYMBOL_PATHS[name].join(" ");
    for (const fragment of fragments) {
      if (fragment === "circle") {
        assert.equal(SYMBOL_PATHS[name].length, 10);
      } else {
        assert.ok(drawing.includes(fragment), `${name} doit inclure ${fragment}`);
      }
    }
  }
});
