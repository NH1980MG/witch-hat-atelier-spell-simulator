import test from "node:test";
import assert from "node:assert/strict";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import {
  PHOTO_IMPORT_MIN_SCORE,
  analyzePhoto,
  connectedComponents,
  isRingComponent,
  otsuThreshold,
  rasterizeTemplate,
  recognizeComponent,
  ringCenterFill,
  toInkMask,
} from "../photo-import.mjs";

function blankPhoto(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = 244;
    data[i * 4 + 1] = 238;
    data[i * 4 + 2] = 220;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function inkRect(photo, left, top, right, bottom) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const i = (y * photo.width + x) * 4;
      photo.data[i] = 30;
      photo.data[i + 1] = 30;
      photo.data[i + 2] = 40;
    }
  }
}

function inkDisc(photo, cx, cy, radius) {
  const r = Math.ceil(radius);
  for (let y = cy - r; y <= cy + r; y += 1) {
    for (let x = cx - r; x <= cx + r; x += 1) {
      if (x < 0 || y < 0 || x >= photo.width || y >= photo.height) continue;
      if (Math.hypot(x - cx, y - cy) <= radius) {
        const i = (y * photo.width + x) * 4;
        photo.data[i] = 30;
        photo.data[i + 1] = 30;
        photo.data[i + 2] = 40;
      }
    }
  }
}

// Dessine un glyphe du catalogue dans la photo a la position/taille voulue.
function inkGlyph(photo, name, left, top, boxSize) {
  const scale = boxSize / 48;
  const size = 48;
  const mask = rasterizeTemplate(SYMBOL_PATHS[name], size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!mask[y * size + x]) continue;
      const px = Math.round(left + x * scale);
      const py = Math.round(top + y * scale);
      inkDisc(photo, px, py, Math.max(1.2, scale * 0.45));
    }
  }
}

test("Otsu separe l'encre du papier sur une image bimodale", () => {
  const photo = blankPhoto(40, 40);
  inkRect(photo, 10, 10, 20, 20);
  const mask = toInkMask(photo);
  let ink = 0;
  for (const value of mask) ink += value;
  assert.equal(ink, 11 * 11);
});

test("les petites taches sont ignorees, la grosse composante gardee", () => {
  const photo = blankPhoto(120, 120);
  inkDisc(photo, 10, 10, 1);
  inkDisc(photo, 100, 100, 1);
  inkRect(photo, 40, 40, 80, 80);
  const mask = toInkMask(photo);
  const { components } = connectedComponents(mask, 120, 120, { minSize: 20 });
  assert.equal(components.length, 1);
  assert.equal(components[0].width, 41);
});

test("un anneau dessine est detecte comme anneau", () => {
  const photo = blankPhoto(300, 300);
  const cx = 150;
  const cy = 150;
  const radius = 110;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.004) {
    inkDisc(photo, Math.round(cx + radius * Math.cos(angle)), Math.round(cy + radius * Math.sin(angle)), 3);
  }
  const mask = toInkMask(photo);
  const { components } = connectedComponents(mask, 300, 300, { minSize: 20 });
  assert.equal(components.length, 1);
  assert.ok(isRingComponent(components[0], 300, 300, ringCenterFill(components[0], mask, 300)), "la grande couronne doit etre un anneau");
});

test("un glyphe photographie est reconnu comme le bon symbole", () => {
  for (const name of ["Colonne", "Feu", "Lancement"]) {
    const photo = blankPhoto(200, 200);
    inkGlyph(photo, name, 40, 40, 120);
    const result = analyzePhoto(photo, SYMBOL_PATHS);
    assert.equal(result.symbols.length, 1, `${name}: ${result.symbols.length} symbole(s)`);
    assert.equal(result.symbols[0].name, name, `${name} reconnu en ${result.symbols[0].name} (${result.symbols[0].score})`);
    assert.ok(result.symbols[0].score >= PHOTO_IMPORT_MIN_SCORE);
  }
});

test("deux glyphes separes donnent deux symboles aux bonnes positions", () => {
  const photo = blankPhoto(400, 200);
  inkGlyph(photo, "Feu", 30, 40, 120);
  inkGlyph(photo, "Viseur", 240, 40, 120);
  const result = analyzePhoto(photo, SYMBOL_PATHS);
  assert.equal(result.symbols.length, 2);
  const feu = result.symbols.find((symbol) => symbol.name === "Feu");
  const viseur = result.symbols.find((symbol) => symbol.name === "Viseur");
  assert.ok(feu && viseur, `attendu Feu+Viseur, obtenu ${result.symbols.map((s) => s.name).join(",")}`);
  assert.ok(feu.cx < 200 && viseur.cx > 200, "les positions relatives sont conservees");
});

test("la reconnaissance reste stable sous un leger bruit de fond", () => {
  const photo = blankPhoto(220, 220);
  inkGlyph(photo, "Selection", 50, 50, 120);
  // Quelques poussieres isolees : sous le seuil d'emprise, elles sont ignorees.
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 10; i += 1) {
    inkDisc(photo, Math.floor(rand() * 220), Math.floor(rand() * 220), 1);
  }
  const result = analyzePhoto(photo, SYMBOL_PATHS);
  assert.equal(result.symbols.length, 1);
  assert.equal(result.symbols[0].name, "Selection");
});

test("un gribouillis ne produit jamais de reconnaissance confiante", () => {
  const photo = blankPhoto(200, 200);
  // Amas irregulier qui ne ressemble a aucun glyphe. La v1 peut proposer des
  // candidats faibles (la boite de dialogue les affiche pour validation) mais
  // aucun ne doit atteindre une confiance haute.
  for (let i = 0; i < 60; i += 1) {
    const angle = i * 0.7;
    inkDisc(photo, Math.round(100 + 30 * Math.cos(angle) + (i % 5) * 3), Math.round(100 + 30 * Math.sin(angle * 1.3)), 4);
  }
  const result = analyzePhoto(photo, SYMBOL_PATHS);
  const best = Math.max(0, ...result.symbols.map((symbol) => symbol.score));
  assert.ok(best < 75, `meilleur score ${best} doit rester < 75`);
});

test("histogramme vide ou uniforme: seuil stable", () => {
  assert.equal(otsuThreshold(new Array(256).fill(0)), 128);
  const uniform = new Array(256).fill(0);
  uniform[200] = 100;
  assert.equal(typeof otsuThreshold(uniform), "number");
});

test("la reconnaissance directe prefere le bon modele a un autre", () => {
  const mask = rasterizeTemplate(SYMBOL_PATHS["Signe de vent"], 48);
  const candidates = recognizeComponent(mask, 48, 48, SYMBOL_PATHS);
  assert.equal(candidates[0].name, "Signe de vent");
  assert.ok(candidates[0].score - candidates[1].score >= 1, "le meilleur candidat se detache");
});
