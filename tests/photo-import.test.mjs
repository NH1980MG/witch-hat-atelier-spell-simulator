import test from "node:test";
import assert from "node:assert/strict";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import { estimateInkMask } from "../photo-preprocessing.mjs";
import {
  PHOTO_IMPORT_MIN_SCORE,
  analyzePhoto,
  connectedComponents,
  groupComponents,
  isRingComponent,
  otsuThreshold,
  rasterizeTemplate,
  recognizeComponent,
  recognizeGroup,
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

function inkGlyphWithDisconnectedStrokes(photo, name, left, top, boxSize, rotation = 0) {
  const scale = boxSize / 48;
  const radians = rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  for (const path of SYMBOL_PATHS[name]) {
    const mask = rasterizeTemplate([path], 48);
    for (let y = 0; y < 48; y += 1) {
      for (let x = 0; x < 48; x += 1) {
        if (!mask[y * 48 + x]) continue;
        const dx = x - 24;
        const dy = y - 24;
        const px = Math.round(left + (24 + dx * cosine - dy * sine) * scale);
        const py = Math.round(top + (24 + dx * sine + dy * cosine) * scale);
        inkDisc(photo, px, py, Math.max(1.2, scale * 0.45));
      }
    }
  }
}

function trimMask(mask, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  const outWidth = right - left + 1;
  const outHeight = bottom - top + 1;
  const out = new Uint8Array(outWidth * outHeight);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      out[(y - top) * outWidth + x - left] = mask[y * width + x];
    }
  }
  return { mask: out, width: outWidth, height: outHeight };
}

test("Otsu separe l'encre du papier sur une image bimodale", () => {
  const photo = blankPhoto(40, 40);
  inkRect(photo, 10, 10, 20, 20);
  const mask = toInkMask(photo);
  let ink = 0;
  for (const value of mask) ink += value;
  assert.equal(ink, 11 * 11);
});

test("toInkMask reste le wrapper de compatibilite de estimateInkMask", () => {
  const photo = blankPhoto(40, 40);
  inkRect(photo, 10, 10, 20, 20);
  assert.deepEqual(toInkMask(photo), estimateInkMask(photo));
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
    assert.equal(result.regions.length, 1);
    assert.equal(result.regions[0].status, "accepted");
    assert.equal(result.symbols[0].name, result.regions[0].candidates[0].name);
    assert.ok(result.cropBounds);
  }
});

test("les traits deconnectes d'un sigil d'eau forment une seule region", () => {
  const photo = blankPhoto(240, 240);
  inkGlyphWithDisconnectedStrokes(photo, "Eau", 50, 50, 140);
  const result = analyzePhoto(photo, SYMBOL_PATHS);
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].candidates[0].name, "Eau");
});

test("le regroupement ne traverse pas la frontiere d'un anneau", () => {
  const components = [
    { id: 1, size: 40, left: 144, top: 96, right: 151, bottom: 103, width: 8, height: 8 },
    { id: 2, size: 40, left: 153, top: 96, right: 160, bottom: 103, width: 8, height: 8 },
  ];
  assert.equal(groupComponents(components, 200, 200, []).length, 1);
  assert.equal(groupComponents(components, 200, 200, [{ cx: 100, cy: 100, radius: 50 }]).length, 2);
});

test("le regroupement utilise les etendues quand les centres partagent la meme zone d'anneau", () => {
  const components = [
    { id: 1, size: 45, left: 135, top: 96, right: 143, bottom: 104, width: 9, height: 9 },
    { id: 2, size: 45, left: 145, top: 96, right: 153, bottom: 104, width: 9, height: 9 },
  ];
  assert.equal(groupComponents(components, 200, 200, []).length, 1);
  assert.equal(groupComponents(components, 200, 200, [{ cx: 100, cy: 100, radius: 50 }]).length, 2);
});

test("la reconnaissance couvre les bornes de rotation de moins douze a douze degres", () => {
  for (const degrees of [-12, 12]) {
    const photo = blankPhoto(240, 240);
    inkGlyphWithDisconnectedStrokes(photo, "Eau", 50, 50, 140, degrees);
    const result = analyzePhoto(photo, SYMBOL_PATHS);
    assert.equal(result.regions.length, 1);
    assert.equal(result.regions[0].status, "accepted", `${degrees} degres: ${JSON.stringify(result.regions[0])}`);
    assert.equal(result.regions[0].candidates[0].name, "Eau");
  }
  const outsidePhoto = blankPhoto(240, 240);
  inkGlyphWithDisconnectedStrokes(outsidePhoto, "Eau", 50, 50, 140, 24);
  assert.notEqual(analyzePhoto(outsidePhoto, SYMBOL_PATHS).regions[0].status, "accepted");
});

test("deux meilleurs candidats egaux rendent la region ambigue", () => {
  const paths = {
    Alpha: ["M8 8 V40 H36"],
    Beta: ["M8 8 V40 H36"],
  };
  const source = trimMask(rasterizeTemplate(paths.Alpha, 48), 48, 48);
  const recognition = recognizeGroup(source.mask, source.width, source.height, paths);
  assert.equal(recognition.status, "ambiguous");
  assert.equal(recognition.scoreMargin, 0);
  assert.deepEqual(recognition.candidates.slice(0, 2).map(({ name }) => name), ["Alpha", "Beta"]);
});

test("symbols reste limite aux regions acceptees", () => {
  const paths = {
    Alpha: ["M8 8 V40 H36"],
    Beta: ["M8 8 V40 H36"],
  };
  const photo = blankPhoto(180, 180);
  const mask = rasterizeTemplate(paths.Alpha, 48);
  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < 48; x += 1) {
      if (mask[y * 48 + x]) inkDisc(photo, 50 + x * 2, 50 + y * 2, 1.2);
    }
  }
  const result = analyzePhoto(photo, paths);
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].status, "ambiguous");
  assert.deepEqual(result.symbols, []);
});

test("un masque illisible conserve des candidats sans etre accepte", () => {
  const recognition = recognizeGroup(
    new Uint8Array(48 * 48).fill(1),
    48,
    48,
    { Trait: ["M24 8 V40"] },
  );
  assert.equal(recognition.status, "unreadable");
  assert.equal(recognition.candidates[0].name, "Trait");
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

test("deux glyphes proches restent deux regions acceptees", () => {
  const photo = blankPhoto(360, 200);
  inkGlyph(photo, "Feu", 30, 40, 120);
  inkGlyph(photo, "Viseur", 155, 40, 120);
  const result = analyzePhoto(photo, SYMBOL_PATHS);
  assert.equal(result.regions.length, 2);
  assert.deepEqual(result.regions.map(({ status }) => status), ["accepted", "accepted"]);
  assert.deepEqual(result.symbols.map(({ name }) => name).sort(), ["Feu", "Viseur"]);
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
