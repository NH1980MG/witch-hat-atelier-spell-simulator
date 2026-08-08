// photo-import.mjs
// Import d'une photo de cercle dessine a la main : binarisation (Otsu),
// composantes connexes, detection d'anneau et reconnaissance des glyphes par
// comparaison raster (distance de chamfer symetrique + IoU) contre les modeles
// du catalogue. Aucune dependance, tout est deterministe et testable sous Node.

import { flattenSvgPath } from "./stroke-matcher.mjs";
import { estimateInkMask } from "./photo-preprocessing.mjs";

export const TEMPLATE_SIZE = 48;

// Seuil d'Otsu sur les luminances 0-255 (encre sombre sur papier clair).
export function otsuThreshold(histogram) {
  const total = histogram.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return 128;
  }
  let sum = 0;
  for (let i = 0; i < 256; i += 1) {
    sum += i * histogram[i];
  }
  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = -1;
  let bestThreshold = 128;
  for (let i = 0; i < 256; i += 1) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = i;
    }
  }
  return bestThreshold;
}

// imageData : { data: Uint8ClampedArray RGBA, width, height }.
// Retourne un masque Uint8Array (1 = encre).
export function toInkMask(imageData) {
  return estimateInkMask(imageData);
}

// --- composantes connexes --------------------------------------------------

export function connectedComponents(mask, width, height, { minSize = 12 } = {}) {
  const labels = new Int32Array(mask.length).fill(-1);
  const components = [];
  const queue = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start] !== -1) continue;
    const id = components.length;
    let size = 0;
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    queue.push(start);
    labels[start] = id;
    while (queue.length) {
      const index = queue.pop();
      size += 1;
      const x = index % width;
      const y = (index - x) / width;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (mask[neighbor] && labels[neighbor] === -1) {
            labels[neighbor] = id;
            queue.push(neighbor);
          }
        }
      }
    }
    if (size >= minSize) {
      components.push({ id, size, left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 });
    }
  }
  // maskByComponent ne garde que les composantes retenues.
  const keep = new Set(components.map(({ id }) => id));
  return {
    components,
    componentMask(component) {
      const out = new Uint8Array(component.width * component.height);
      for (let y = component.top; y <= component.bottom; y += 1) {
        for (let x = component.left; x <= component.right; x += 1) {
          const index = y * width + x;
          if (mask[index] && keep.has(labels[index]) && labels[index] === component.id) {
            out[(y - component.top) * component.width + (x - component.left)] = 1;
          }
        }
      }
      return out;
    },
  };
}

// --- detection d'anneau ----------------------------------------------------

// Part d'encre dans la zone centrale (30%-70%) de la boite : un anneau a le
// centre creux, un glyphe l'occupe.
export function ringCenterFill(component, mask, imageWidth) {
  const x0 = Math.round(component.left + component.width * 0.3);
  const x1 = Math.round(component.left + component.width * 0.7);
  const y0 = Math.round(component.top + component.height * 0.3);
  const y1 = Math.round(component.top + component.height * 0.7);
  let ink = 0;
  let total = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      total += 1;
      ink += mask[y * imageWidth + x];
    }
  }
  return total ? ink / total : 1;
}

// Un anneau dessine : tres grande emprise quasiment carree, faible remplissage
// global (le trait ne couvre qu'une fraction de la boite) et centre creux.
export function isRingComponent(component, imageWidth, imageHeight, centerFill) {
  const span = Math.min(imageWidth, imageHeight);
  const boxSpan = Math.max(component.width, component.height);
  if (boxSpan < span * 0.55) return false;
  const aspect = component.width / component.height;
  if (aspect < 0.7 || aspect > 1.43) return false;
  const fill = component.size / (component.width * component.height);
  return fill < 0.45 && centerFill < 0.08;
}

// --- rasterisation des modeles --------------------------------------------

// Rasterise les commandes SVG d'un modele dans un carre `size` (masque 0/1).
export function rasterizeTemplate(pathsData, size = TEMPLATE_SIZE) {
  const scale = size / 48; // les modeles vivent dans un viewBox 48x48
  const mask = new Float32Array(size * size);
  const radius = Math.max(1, 0.9 * scale);
  const stamp = (cx, cy) => {
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(size - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(size - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (Math.hypot(x - cx, y - cy) <= radius) {
          mask[y * size + x] = 1;
        }
      }
    }
  };
  for (const d of pathsData) {
    for (const polyline of flattenSvgPath(d)) {
      // Tamponne le long des segments (pas ~0.5px) : les longs segments droits
      // restent des traits continus, pas une pointille d'echantillons.
      for (let i = 0; i < polyline.length; i += 1) {
        const [ax, ay] = polyline[i];
        const [bx, by] = polyline[Math.min(i + 1, polyline.length - 1)];
        const length = Math.hypot((bx - ax) * scale, (by - ay) * scale);
        const steps = Math.max(1, Math.ceil(length / 0.5));
        for (let s = 0; s <= steps; s += 1) {
          const t = s / steps;
          stamp((ax + (bx - ax) * t) * scale, (ay + (by - ay) * t) * scale);
        }
      }
    }
  }
  return mask;
}

// Normalise le masque d'une composante dans un carre `size` (aspect conserve,
// marge de 12 % comme les modeles qui respirent dans leur viewBox).
export function normalizeComponentMask(mask, componentWidth, componentHeight, size = TEMPLATE_SIZE) {
  const scale = (size * 0.82) / Math.max(componentWidth, componentHeight);
  const outWidth = Math.max(1, Math.round(componentWidth * scale));
  const outHeight = Math.max(1, Math.round(componentHeight * scale));
  const offsetX = Math.round((size - outWidth) / 2);
  const offsetY = Math.round((size - outHeight) / 2);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx = Math.floor((x - offsetX) / scale);
      const sy = Math.floor((y - offsetY) / scale);
      if (sx >= 0 && sy >= 0 && sx < componentWidth && sy < componentHeight && mask[sy * componentWidth + sx]) {
        out[y * size + x] = 1;
      }
    }
  }
  return out;
}

// --- comparaison raster ----------------------------------------------------

// Transformee en distance (deux passes, distance de city-block ponderee).
export function distanceTransform(mask, size = TEMPLATE_SIZE) {
  const infinity = size * size;
  const dist = new Float32Array(size * size).fill(infinity);
  for (let i = 0; i < size * size; i += 1) {
    if (mask[i]) dist[i] = 0;
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
      if (y > 0) dist[i] = Math.min(dist[i], dist[i - size] + 1);
      if (x > 0 && y > 0) dist[i] = Math.min(dist[i], dist[i - size - 1] + 1.5);
      if (x < size - 1 && y > 0) dist[i] = Math.min(dist[i], dist[i - size + 1] + 1.5);
    }
  }
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = size - 1; x >= 0; x -= 1) {
      const i = y * size + x;
      if (x < size - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
      if (y < size - 1) dist[i] = Math.min(dist[i], dist[i + size] + 1);
      if (x < size - 1 && y < size - 1) dist[i] = Math.min(dist[i], dist[i + size + 1] + 1.5);
      if (x > 0 && y < size - 1) dist[i] = Math.min(dist[i], dist[i + size - 1] + 1.5);
    }
  }
  return dist;
}

function meanDistanceOverInk(inkMask, dist) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < inkMask.length; i += 1) {
    if (inkMask[i]) {
      sum += dist[i];
      count += 1;
    }
  }
  return count ? sum / count : 12;
}

// Score 0-100 : chamfer asymetrique (le pire des deux sens), IoU et densite
// d'encre. La densite est decisive : un glyphe photographie garde une encre en
// traits fins proche du modele (~20 % de remplissage), la ou une tache pleine
// depasse 60 % — sans elle n'importe quel blob "ressemble" a un glyphe compact.
export function rasterMatchScore(componentMask, templateMask, templateDist) {
  const componentDist = distanceTransform(componentMask);
  const forward = meanDistanceOverInk(templateMask, componentDist);
  const backward = meanDistanceOverInk(componentMask, templateDist);
  const chamfer = Math.max(forward, backward);
  let intersection = 0;
  let union = 0;
  let componentInk = 0;
  let templateInk = 0;
  for (let i = 0; i < componentMask.length; i += 1) {
    const a = componentMask[i] > 0;
    const b = templateMask[i] > 0;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
    if (a) componentInk += 1;
    if (b) templateInk += 1;
  }
  const iou = union ? intersection / union : 0;
  const fillA = componentInk / componentMask.length;
  const fillB = templateInk / templateMask.length;
  const densitySim = Math.max(0, 1 - 1.6 * (Math.abs(fillA - fillB) / Math.max(fillA, fillB, 1e-6)));
  const chamferScore = Math.max(0, 1 - chamfer / 5);
  return Math.round((0.5 * chamferScore + 0.3 * iou + 0.2 * densitySim) * 100);
}

// Cache des modeles rasterises (par taille).
const templateCache = new Map();

export function templateMasks(symbolPaths, size = TEMPLATE_SIZE) {
  const key = `${size}`;
  if (!templateCache.has(key)) {
    const entries = Object.entries(symbolPaths).map(([name, paths]) => {
      const mask = rasterizeTemplate(paths, size);
      return { name, mask, dist: distanceTransform(mask, size) };
    });
    templateCache.set(key, entries);
  }
  return templateCache.get(key);
}

// Reconnait une composante : retourne les 3 meilleurs candidats tries.
export function recognizeComponent(componentMask, componentWidth, componentHeight, symbolPaths) {
  const normalized = normalizeComponentMask(componentMask, componentWidth, componentHeight);
  const candidates = templateMasks(symbolPaths).map(({ name, mask, dist }) => ({
    name,
    score: rasterMatchScore(normalized, mask, dist),
  }));
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3);
}

// --- pipeline complet ------------------------------------------------------

export const PHOTO_IMPORT_MIN_SCORE = 42;

export function analyzePhoto(imageData, symbolPaths) {
  const { width, height } = imageData;
  const mask = toInkMask(imageData);
  const { components, componentMask } = connectedComponents(mask, width, height, {
    minSize: Math.max(10, Math.round((width * height) * 0.0002)),
  });
  // Un glyphe a une emprise significative dans le cadre ; en dessous, c'est du
  // bruit (poussiere du papier, taches) qu'on ignore sans tenter de reconnaitre.
  const minSpan = Math.max(18, Math.round(Math.min(width, height) * 0.03));
  const rings = [];
  const symbols = [];
  let ignored = 0;
  for (const component of components) {
    if (Math.max(component.width, component.height) < minSpan) {
      ignored += 1;
      continue;
    }
    if (isRingComponent(component, width, height, ringCenterFill(component, mask, width))) {
      rings.push({
        cx: component.left + component.width / 2,
        cy: component.top + component.height / 2,
        radius: (component.width + component.height) / 4,
      });
      continue;
    }
    const candidates = recognizeComponent(componentMask(component), component.width, component.height, symbolPaths);
    const best = candidates[0];
    if (best && best.score >= PHOTO_IMPORT_MIN_SCORE) {
      symbols.push({
        name: best.name,
        score: best.score,
        candidates,
        cx: component.left + component.width / 2,
        cy: component.top + component.height / 2,
        size: Math.max(component.width, component.height),
      });
    } else {
      ignored += 1;
    }
  }
  rings.sort((a, b) => b.radius - a.radius);
  return { ring: rings[0] || null, symbols, ignored, imageWidth: width, imageHeight: height };
}
