// photo-import.mjs
// Import d'une photo de cercle dessine a la main : binarisation (Otsu),
// composantes connexes, detection d'anneau et reconnaissance des glyphes par
// comparaison raster (distance de chamfer symetrique + IoU) contre les modeles
// du catalogue. Aucune dependance, tout est deterministe et testable sous Node.

import { flattenSvgPath } from "./stroke-matcher.mjs?v=20260809-handoff-layout-v2";
import { estimateInkMask, inkBounds } from "./photo-preprocessing.mjs";

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

function estimateStrokeWidth(pixelIndices, imageWidth, left, top, componentWidth, componentHeight) {
  const localMask = new Uint8Array(componentWidth * componentHeight);
  for (const index of pixelIndices) {
    const x = index % imageWidth;
    const y = (index - x) / imageWidth;
    localMask[(y - top) * componentWidth + x - left] = 1;
  }
  const horizontalRuns = new Uint16Array(localMask.length);
  const verticalRuns = new Uint16Array(localMask.length);
  for (let y = 0; y < componentHeight; y += 1) {
    let x = 0;
    while (x < componentWidth) {
      if (!localMask[y * componentWidth + x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < componentWidth && localMask[y * componentWidth + x]) x += 1;
      for (let runX = start; runX < x; runX += 1) {
        horizontalRuns[y * componentWidth + runX] = x - start;
      }
    }
  }
  for (let x = 0; x < componentWidth; x += 1) {
    let y = 0;
    while (y < componentHeight) {
      if (!localMask[y * componentWidth + x]) {
        y += 1;
        continue;
      }
      const start = y;
      while (y < componentHeight && localMask[y * componentWidth + x]) y += 1;
      for (let runY = start; runY < y; runY += 1) {
        verticalRuns[runY * componentWidth + x] = y - start;
      }
    }
  }
  const localWidths = [];
  for (let index = 0; index < localMask.length; index += 1) {
    if (localMask[index]) localWidths.push(Math.min(horizontalRuns[index], verticalRuns[index]));
  }
  localWidths.sort((a, b) => a - b);
  // Le corps du trait reste au-dessus des pixels de bord amincis par l'aliasing.
  return localWidths[Math.floor((localWidths.length - 1) * 0.8)] || 1;
}

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
    const pixelIndices = [];
    queue.push(start);
    labels[start] = id;
    while (queue.length) {
      const index = queue.pop();
      size += 1;
      pixelIndices.push(index);
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
      const componentWidth = right - left + 1;
      const componentHeight = bottom - top + 1;
      components.push({
        id,
        size,
        left,
        top,
        right,
        bottom,
        width: componentWidth,
        height: componentHeight,
        strokeWidth: estimateStrokeWidth(pixelIndices, width, left, top, componentWidth, componentHeight),
      });
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
  const localMask = mask.length === component.width * component.height;
  const x0 = Math.round(component.left + component.width * 0.3);
  const x1 = Math.round(component.left + component.width * 0.7);
  const y0 = Math.round(component.top + component.height * 0.3);
  const y1 = Math.round(component.top + component.height * 0.7);
  let ink = 0;
  let total = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      total += 1;
      const index = localMask
        ? (y - component.top) * component.width + (x - component.left)
        : y * imageWidth + x;
      ink += mask[index];
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

function ringEdgeFit(component, componentMask) {
  const cx = (component.width - 1) / 2;
  const cy = (component.height - 1) / 2;
  const radius = (component.width + component.height) / 4;
  const tolerance = Math.max(2, Math.min(component.strokeWidth * 1.5, radius * 0.14));
  let ink = 0;
  let edgeInk = 0;
  for (let y = 0; y < component.height; y += 1) {
    for (let x = 0; x < component.width; x += 1) {
      if (!componentMask[y * component.width + x]) continue;
      ink += 1;
      if (Math.abs(Math.hypot(x - cx, y - cy) - radius) <= tolerance) edgeInk += 1;
    }
  }
  return ink ? edgeInk / ink : 0;
}

function boxesWithinGap(a, b, maxGap) {
  const horizontalGap = Math.max(0, a.left - b.right - 1, b.left - a.right - 1);
  const verticalGap = Math.max(0, a.top - b.bottom - 1, b.top - a.bottom - 1);
  return Math.hypot(horizontalGap, verticalGap) <= maxGap;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function combinedBounds(a, b) {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function boundsCrossRing(bounds, ring) {
  const nearestX = Math.max(bounds.left, Math.min(ring.cx, bounds.right));
  const nearestY = Math.max(bounds.top, Math.min(ring.cy, bounds.bottom));
  const minRadius = Math.hypot(nearestX - ring.cx, nearestY - ring.cy);
  const maxRadius = Math.max(
    Math.hypot(bounds.left - ring.cx, bounds.top - ring.cy),
    Math.hypot(bounds.right - ring.cx, bounds.top - ring.cy),
    Math.hypot(bounds.left - ring.cx, bounds.bottom - ring.cy),
    Math.hypot(bounds.right - ring.cx, bounds.bottom - ring.cy),
  );
  return minRadius <= ring.radius && maxRadius >= ring.radius;
}

// Le petit ecart autorise suit l'epaisseur mediane de l'encre, avec une borne
// dure liee a l'image pour ne pas fusionner deux glyphes voisins. Une fusion
// proposee ne peut traverser un rayon d'anneau, meme si les centres des
// composantes sont du meme cote.
export function groupComponents(components, imageWidth, imageHeight, rings) {
  if (!components.length) return [];
  const imageGapCap = Math.max(3, Math.min(12, Math.round(Math.min(imageWidth, imageHeight) * 0.05)));
  const medianStrokeWidth = median(components.map(({ strokeWidth }) => (
    Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth : 1
  )));
  const maxGap = Math.min(imageGapCap, Math.max(3, Math.round(medianStrokeWidth * 2)));
  const parents = components.map((_, index) => index);
  const boundsByRoot = components.map((component) => ({
    left: component.left,
    top: component.top,
    right: component.right,
    bottom: component.bottom,
  }));
  const find = (index) => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  const unite = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return;
    const proposedBounds = combinedBounds(boundsByRoot[rootA], boundsByRoot[rootB]);
    if (rings.some((ring) => boundsCrossRing(proposedBounds, ring))) return;
    parents[rootB] = rootA;
    boundsByRoot[rootA] = proposedBounds;
  };
  for (let i = 0; i < components.length; i += 1) {
    for (let j = i + 1; j < components.length; j += 1) {
      if (boxesWithinGap(components[i], components[j], maxGap)) {
        unite(i, j);
      }
    }
  }
  const grouped = new Map();
  for (let index = 0; index < components.length; index += 1) {
    const root = find(index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(components[index]);
  }
  return [...grouped.values()].map((members) => {
    const left = Math.min(...members.map((component) => component.left));
    const top = Math.min(...members.map((component) => component.top));
    const right = Math.max(...members.map((component) => component.right));
    const bottom = Math.max(...members.map((component) => component.bottom));
    return {
      components: members,
      left,
      top,
      right,
      bottom,
      width: right - left + 1,
      height: bottom - top + 1,
      size: members.reduce((sum, component) => sum + component.size, 0),
    };
  }).sort((a, b) => a.top - b.top || a.left - b.left);
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

// En reduction, un simple echantillon au centre peut supprimer un trait fin.
// Cette variante conserve un pixel cible des qu'une partie de sa zone source
// contient de l'encre; le squelette ci-dessous neutralise ensuite l'epaisseur.
function normalizeGroupMask(mask, componentWidth, componentHeight, size = TEMPLATE_SIZE) {
  const scale = (size * 0.82) / Math.max(componentWidth, componentHeight);
  const outWidth = Math.max(1, Math.round(componentWidth * scale));
  const outHeight = Math.max(1, Math.round(componentHeight * scale));
  const offsetX = Math.round((size - outWidth) / 2);
  const offsetY = Math.round((size - outHeight) / 2);
  const out = new Float32Array(size * size);
  for (let y = offsetY; y < offsetY + outHeight; y += 1) {
    for (let x = offsetX; x < offsetX + outWidth; x += 1) {
      const sourceLeft = Math.max(0, Math.floor((x - offsetX) / scale));
      const sourceRight = Math.min(componentWidth - 1, Math.ceil((x + 1 - offsetX) / scale) - 1);
      const sourceTop = Math.max(0, Math.floor((y - offsetY) / scale));
      const sourceBottom = Math.min(componentHeight - 1, Math.ceil((y + 1 - offsetY) / scale) - 1);
      let hasInk = false;
      for (let sy = sourceTop; sy <= sourceBottom && !hasInk; sy += 1) {
        for (let sx = sourceLeft; sx <= sourceRight; sx += 1) {
          if (mask[sy * componentWidth + sx]) {
            hasInk = true;
            break;
          }
        }
      }
      if (hasInk) out[y * size + x] = 1;
    }
  }
  return out;
}

// Amincissement de Zhang-Suen : compare la geometrie des traits plutot que
// l'epaisseur variable produite par une photo et sa mise a l'echelle.
function skeletonizeMask(mask, size = TEMPLATE_SIZE) {
  const out = Uint8Array.from(mask);
  const neighbors = (x, y) => [
    out[(y - 1) * size + x],
    out[(y - 1) * size + x + 1],
    out[y * size + x + 1],
    out[(y + 1) * size + x + 1],
    out[(y + 1) * size + x],
    out[(y + 1) * size + x - 1],
    out[y * size + x - 1],
    out[(y - 1) * size + x - 1],
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (let phase = 0; phase < 2; phase += 1) {
      const removals = [];
      for (let y = 1; y < size - 1; y += 1) {
        for (let x = 1; x < size - 1; x += 1) {
          const index = y * size + x;
          if (!out[index]) continue;
          const adjacent = neighbors(x, y);
          const count = adjacent.reduce((sum, value) => sum + value, 0);
          const transitions = adjacent.reduce(
            (sum, value, neighborIndex) => sum + (!value && adjacent[(neighborIndex + 1) % adjacent.length] ? 1 : 0),
            0,
          );
          if (count < 2 || count > 6 || transitions !== 1) continue;
          const [north, , east, , south, , west] = adjacent;
          const blocksFirstPhase = north * east * south || east * south * west;
          const blocksSecondPhase = north * east * west || north * south * west;
          if (phase === 0 ? blocksFirstPhase : blocksSecondPhase) continue;
          removals.push(index);
        }
      }
      if (removals.length) {
        changed = true;
        for (const index of removals) out[index] = 0;
      }
    }
  }
  return Float32Array.from(out);
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

// Cache des modeles rasterises par catalogue et par taille.
const templateCache = new WeakMap();

export function templateMasks(symbolPaths, size = TEMPLATE_SIZE) {
  if (!templateCache.has(symbolPaths)) templateCache.set(symbolPaths, new Map());
  const cacheBySize = templateCache.get(symbolPaths);
  if (!cacheBySize.has(size)) {
    const entries = Object.entries(symbolPaths).map(([name, paths]) => {
      const mask = rasterizeTemplate(paths, size);
      const skeleton = skeletonizeMask(mask, size);
      return {
        name,
        mask,
        dist: distanceTransform(mask, size),
        skeleton,
        skeletonDist: distanceTransform(skeleton, size),
      };
    });
    cacheBySize.set(size, entries);
  }
  return cacheBySize.get(size);
}

// Reconnait une composante : retourne les meilleurs candidats tries. Les
// cercles de reference complets produisent parfois des regions denses ou
// partielles; garder plus de candidats donne une correction manuelle utile sans
// accepter automatiquement une correspondance faible.
const PHOTO_IMPORT_CANDIDATE_LIMIT = 8;

export function recognizeComponent(componentMask, componentWidth, componentHeight, symbolPaths) {
  const normalized = normalizeComponentMask(componentMask, componentWidth, componentHeight);
  const candidates = templateMasks(symbolPaths).map(({ name, mask, dist }) => ({
    name,
    score: rasterMatchScore(normalized, mask, dist),
  }));
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, PHOTO_IMPORT_CANDIDATE_LIMIT);
}

const GROUP_ROTATIONS = [-12, -6, 0, 6, 12];
const PHOTO_IMPORT_ACCEPTED_SCORE = 58;
const PHOTO_IMPORT_ACCEPTED_MARGIN = 6;

function rotateMask(mask, degrees, size = TEMPLATE_SIZE) {
  if (degrees === 0) return mask;
  const out = new Float32Array(size * size);
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const sourceX = Math.round(center + dx * cosine + dy * sine);
      const sourceY = Math.round(center - dx * sine + dy * cosine);
      if (sourceX >= 0 && sourceY >= 0 && sourceX < size && sourceY < size) {
        out[y * size + x] = mask[sourceY * size + sourceX];
      }
    }
  }
  return out;
}

export function recognizeGroup(groupMask, width, height, symbolPaths) {
  const normalized = skeletonizeMask(normalizeGroupMask(groupMask, width, height));
  const rotations = GROUP_ROTATIONS.map((degrees) => ({
    degrees,
    mask: rotateMask(normalized, degrees),
  }));
  const candidates = templateMasks(symbolPaths).map(({ name, skeleton, skeletonDist }) => {
    const matches = rotations.map(({ degrees, mask }) => ({
      degrees,
      score: rasterMatchScore(mask, skeleton, skeletonDist),
    }));
    matches.sort((a, b) => b.score - a.score || Math.abs(a.degrees) - Math.abs(b.degrees));
    return {
      name,
      score: matches[0].score,
      // `degrees` aligne la photo sur le modele; l'action recreee reprend
      // l'angle inverse, c'est-a-dire l'orientation originale du dessin.
      rotation: -matches[0].degrees * Math.PI / 180,
    };
  });
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, PHOTO_IMPORT_CANDIDATE_LIMIT);
  const bestScore = topCandidates[0]?.score || 0;
  const secondScore = topCandidates[1]?.score || 0;
  const scoreMargin = bestScore - secondScore;
  let status = "unreadable";
  if (bestScore >= PHOTO_IMPORT_ACCEPTED_SCORE && scoreMargin >= PHOTO_IMPORT_ACCEPTED_MARGIN) {
    status = "accepted";
  } else if (bestScore >= PHOTO_IMPORT_MIN_SCORE) {
    status = "ambiguous";
  }
  return { status, candidates: topCandidates, scoreMargin };
}

// --- pipeline complet ------------------------------------------------------

export const PHOTO_IMPORT_MIN_SCORE = 42;

function eraseDetectedRings(mask, width, height, rings) {
  const out = Uint8Array.from(mask);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!out[index]) continue;
      if (rings.some((ring) => (
        Math.abs(Math.hypot(x - ring.cx, y - ring.cy) - ring.radius) <= ring.eraseTolerance
      ))) {
        out[index] = 0;
      }
    }
  }
  return out;
}

function componentNearErasedRing(component, ring) {
  const farthestRadius = Math.max(
    Math.hypot(component.left - ring.cx, component.top - ring.cy),
    Math.hypot(component.right - ring.cx, component.top - ring.cy),
    Math.hypot(component.left - ring.cx, component.bottom - ring.cy),
    Math.hypot(component.right - ring.cx, component.bottom - ring.cy),
  );
  const allowance = ring.eraseTolerance + component.strokeWidth + 2;
  return farthestRadius >= ring.radius - allowance;
}

function cropCenter(cropBounds, width, height) {
  const crop = cropBounds || { left: 0, top: 0, width, height };
  return {
    cx: crop.left + crop.width / 2,
    cy: crop.top + crop.height / 2,
    span: Math.max(crop.width, crop.height, 1),
    aspect: crop.width / Math.max(1, crop.height),
  };
}

function hasInkNear(mask, width, height, x, y, tolerance) {
  const left = Math.max(0, Math.floor(x - tolerance));
  const right = Math.min(width - 1, Math.ceil(x + tolerance));
  const top = Math.max(0, Math.floor(y - tolerance));
  const bottom = Math.min(height - 1, Math.ceil(y + tolerance));
  const toleranceSquared = tolerance * tolerance;
  for (let yy = top; yy <= bottom; yy += 1) {
    for (let xx = left; xx <= right; xx += 1) {
      if (mask[yy * width + xx] && (xx - x) ** 2 + (yy - y) ** 2 <= toleranceSquared) {
        return true;
      }
    }
  }
  return false;
}

function circularCoverage(mask, width, height, cx, cy, radius, tolerance) {
  const samples = 180;
  let hits = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    const angle = (sample / samples) * Math.PI * 2;
    if (hasInkNear(
      mask,
      width,
      height,
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      tolerance,
    )) {
      hits += 1;
    }
  }
  return hits / samples;
}

function annularDensity(mask, width, height, cx, cy, minRadius, maxRadius, startAngle = 0, endAngle = Math.PI * 2) {
  let ink = 0;
  let total = 0;
  const left = Math.max(0, Math.floor(cx - maxRadius));
  const right = Math.min(width - 1, Math.ceil(cx + maxRadius));
  const top = Math.max(0, Math.floor(cy - maxRadius));
  const bottom = Math.min(height - 1, Math.ceil(cy + maxRadius));
  const twoPi = Math.PI * 2;
  const normalizedStart = ((startAngle % twoPi) + twoPi) % twoPi;
  const normalizedEnd = ((endAngle % twoPi) + twoPi) % twoPi;
  const inArc = (angle) => (
    normalizedStart <= normalizedEnd
      ? angle >= normalizedStart && angle <= normalizedEnd
      : angle >= normalizedStart || angle <= normalizedEnd
  );
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < minRadius || distance > maxRadius) continue;
      if (endAngle - startAngle < twoPi - 0.001) {
        const angle = (Math.atan2(y - cy, x - cx) + twoPi) % twoPi;
        if (!inArc(angle)) continue;
      }
      total += 1;
      ink += mask[y * width + x];
    }
  }
  return total ? ink / total : 0;
}

function sectorPresence(mask, width, height, cx, cy, radius, sectorCount, tolerance) {
  let present = 0;
  for (let index = 0; index < sectorCount; index += 1) {
    const angle = (index / sectorCount) * Math.PI * 2;
    const start = angle - Math.PI / sectorCount;
    const end = angle + Math.PI / sectorCount;
    const density = annularDensity(mask, width, height, cx, cy, radius * 0.72, radius * 0.98, start, end);
    if (density > 0.006 || hasInkNear(mask, width, height, cx + Math.cos(angle) * radius * 0.84, cy + Math.sin(angle) * radius * 0.84, tolerance * 3)) {
      present += 1;
    }
  }
  return present / sectorCount;
}

function detectOpeningPetrificationSeal(mask, width, height, cropBounds, rings) {
  const crop = cropCenter(cropBounds, width, height);
  const span = rings[0]?.radius ? rings[0].radius * 2 : crop.span;
  const aspect = crop.aspect;
  if (aspect < 0.78 || aspect > 1.28 || span < Math.min(width, height) * 0.45) {
    return null;
  }
  const cx = rings[0]?.cx || crop.cx;
  const cy = rings[0]?.cy || crop.cy;
  const outerRadius = rings[0]?.radius || span * 0.47;
  if (outerRadius < Math.min(width, height) * 0.22) {
    return null;
  }
  const tolerance = Math.max(3, outerRadius * 0.018);
  const outerCoverage = Math.max(
    circularCoverage(mask, width, height, cx, cy, outerRadius, tolerance * 1.35),
    circularCoverage(mask, width, height, cx, cy, span * 0.47, tolerance * 1.35),
  );
  const middleCoverage = Math.max(
    circularCoverage(mask, width, height, cx, cy, outerRadius * 0.34, tolerance),
    circularCoverage(mask, width, height, cx, cy, outerRadius * 0.42, tolerance),
  );
  const innerCoverage = circularCoverage(mask, width, height, cx, cy, outerRadius * 0.16, tolerance);
  const centralRingCoverage = Math.max(
    circularCoverage(mask, width, height, cx, cy, outerRadius * 0.34, tolerance),
    circularCoverage(mask, width, height, cx, cy, outerRadius * 0.38, tolerance),
    circularCoverage(mask, width, height, cx, cy, outerRadius * 0.42, tolerance),
  );
  const outerSpokeCoverage = circularCoverage(mask, width, height, cx, cy, outerRadius * 0.72, tolerance);
  const outerModuleCoverage = circularCoverage(mask, width, height, cx, cy, outerRadius * 0.82, tolerance);
  const outerPanelCoverage = circularCoverage(mask, width, height, cx, cy, outerRadius * 0.9, tolerance);
  const centralDensity = annularDensity(mask, width, height, cx, cy, 0, outerRadius * 0.22);
  const modulePresence = sectorPresence(mask, width, height, cx, cy, outerRadius * 0.78, 6, tolerance);
  const panelDensity = annularDensity(mask, width, height, cx, cy, outerRadius * 0.48, outerRadius * 0.92);
  const radialBand = annularDensity(mask, width, height, cx, cy, outerRadius * 0.22, outerRadius * 0.58);
  const ringCountScore = Math.min(1, (Number(outerCoverage > 0.55) + Number(middleCoverage > 0.42) + Number(innerCoverage > 0.28) + Math.min(rings.length, 2)) / 4);
  const score = Math.round(
    outerCoverage * 28
    + ringCountScore * 18
    + Math.min(1, centralDensity / 0.035) * 20
    + modulePresence * 18
    + Math.min(1, panelDensity / 0.028) * 10
    + Math.min(1, radialBand / 0.025) * 6
  );
  if (
    score < 72
    || outerCoverage < 0.45
    || centralDensity < 0.018
    || modulePresence < 0.34
    || centralRingCoverage < 0.18
    || outerSpokeCoverage < 0.35
    || outerModuleCoverage < 0.33
    || outerPanelCoverage < 0.58
  ) {
    return null;
  }
  return {
    id: "opening-petrification-seal",
    ritualId: "opening-petrification",
    label: "Opening petrification seal",
    score,
    cx,
    cy,
    radius: outerRadius,
    bounds: {
      left: cx - outerRadius,
      top: cy - outerRadius,
      right: cx + outerRadius,
      bottom: cy + outerRadius,
    },
    features: {
      outerCoverage: Math.round(outerCoverage * 100),
      middleCoverage: Math.round(middleCoverage * 100),
      innerCoverage: Math.round(innerCoverage * 100),
      modulePresence: Math.round(modulePresence * 100),
      centralRingCoverage: Math.round(centralRingCoverage * 100),
      outerSpokeCoverage: Math.round(outerSpokeCoverage * 100),
      outerModuleCoverage: Math.round(outerModuleCoverage * 100),
      outerPanelCoverage: Math.round(outerPanelCoverage * 100),
    },
  };
}

function addArchitecturalSymbol(symbols, name, score, source, reason) {
  const normalizedScore = Math.max(1, Math.min(100, Math.round(score)));
  const existing = symbols.get(name);
  const sourcePriority = {
    "candidate-support": 5,
    "ritual-pattern": 5,
    "ring-topology": 4,
    "balanced-pairing": 4,
    "radial-symmetry": 3,
    "radial-flow": 3,
    "perception-family": 3,
    "matter-family": 3,
    "creature-family": 3,
    "semantic-neighbor": 2,
    "derived-architecture": 1,
  };
  const existingPriority = existing ? sourcePriority[existing.source] || 0 : 0;
  const sourceRank = sourcePriority[source] || 0;
  if (
    !existing
    || normalizedScore > existing.score
    || (normalizedScore === existing.score && sourceRank > existingPriority)
  ) {
    symbols.set(name, {
      name,
      score: normalizedScore,
      source,
      reason,
      status: "architectural-hint",
    });
  }
}

const ARCHITECTURAL_NEIGHBORS = Object.freeze({
  "Aeriforme": ["Flottement", "Signe de vent", "Agrandissement"],
  "Aeriforme defini": ["Aeriforme", "Flottement", "Signe de vent"],
  Appel: ["Guidage", "Cible", "Lancement"],
  "Arret temporel": ["Arret", "Enveloppe", "Immobilite"],
  Cible: ["Selection", "Guidage"],
  Collection: ["Lien", "Repetition", "Cible"],
  Colonne: ["Lancement", "Projection"],
  Cristal: ["Lumiere", "Solidification", "Terre"],
  Dissimulation: ["Lumiere", "Enveloppe", "Reflection", "Selection"],
  Dispersion: ["Nuage", "Fumee", "Agrandissement"],
  Eau: ["Orbe", "Pluie"],
  Enveloppe: ["Region", "Lien", "Arret", "Fenetres"],
  Etirement: ["Projection", "Terre"],
  Feu: ["Fumee", "Lumiere"],
  Fenetres: ["Lumiere", "Projection", "Lien", "Reflection"],
  Flottement: ["Aeriforme", "Orbe"],
  Fumee: ["Nuage", "Dispersion"],
  Guidage: ["Selection", "Cible", "Lancement"],
  Immobilite: ["Arret", "Solidification", "Terre"],
  Lancement: ["Projection", "Guidage"],
  Levitation: ["Flottement", "Orbe", "Aeriforme"],
  Lien: ["Collection", "Repetition"],
  "Loup-ecaille": ["Projection", "Lien"],
  Lumiere: ["Reflection", "Fenetres", "Selection", "Dissimulation"],
  "Lumiere vacillante": ["Lumiere", "Lancement"],
  Nuage: ["Fumee", "Dispersion"],
  Orbe: ["Eau", "Flottement"],
  Pantin: ["Projection", "Lien"],
  Pluie: ["Eau", "Region", "Orbe"],
  Projectile: ["Projection", "Lancement"],
  Projection: ["Lancement", "Guidage", "Pantin"],
  Refroidissement: ["Eau", "Immobilite"],
  Reflection: ["Lumiere", "Selection", "Dissimulation", "Fenetres"],
  Region: ["Enveloppe", "Etirement"],
  Renforcement: ["Agrandissement", "Appel"],
  Repetition: ["Lien", "Collection"],
  Selection: ["Reflection", "Guidage", "Cible"],
  "Signe de vent": ["Aeriforme", "Flottement"],
  Solidification: ["Terre", "Immobilite"],
  "Spire physique": ["Orbe", "Agrandissement", "Flottement"],
  "Tete de chat-hibou": ["Chat-hibou", "Projection"],
  Terre: ["Solidification", "Etirement"],
  "Vent sous pied": ["Aeriforme", "Flottement", "Agrandissement"],
  Viseur: ["Selection", "Reflection", "Cible"],
});

function inferArchitecturalSymbols({ mask, width, height, rings, regions, sealPatterns, cropBounds }) {
  const hints = new Map();
  const candidateScores = new Map();
  for (const region of regions) {
    for (const candidate of region.candidates || []) {
      const existing = candidateScores.get(candidate.name) || 0;
      candidateScores.set(candidate.name, Math.max(existing, candidate.score || 0));
    }
  }

  for (const [name, score] of candidateScores) {
    addArchitecturalSymbol(hints, name, Math.max(36, score), "candidate-support", "Visible region resembles this glyph family.");
    for (const neighbor of ARCHITECTURAL_NEIGHBORS[name] || []) {
      addArchitecturalSymbol(
        hints,
        neighbor,
        Math.max(52, score - 4),
        "semantic-neighbor",
        `${name} shares a spell-function family with ${neighbor}.`,
      );
    }
  }

  const propagateArchitecturalNeighbors = (source) => {
    for (const neighbor of ARCHITECTURAL_NEIGHBORS[source.name] || []) {
      addArchitecturalSymbol(
        hints,
        neighbor,
        Math.max(PHOTO_IMPORT_MIN_SCORE, source.score - 14),
        "derived-architecture",
        `${source.name} implies a compatible ${neighbor} function in the same architecture.`,
      );
    }
  };
  for (const hint of [...hints.values()]) propagateArchitecturalNeighbors(hint);

  const { cx, cy, span } = cropCenter(cropBounds, width, height);
  const outerRadius = rings[0]?.radius || span * 0.47;
  const hasOuterRing = rings.length > 0 || circularCoverage(mask, width, height, cx, cy, outerRadius, Math.max(3, outerRadius * 0.03)) > 0.45;
  if (hasOuterRing) {
    addArchitecturalSymbol(hints, "Region", 62, "ring-topology", "A closed outer ring defines the spell region.");
    addArchitecturalSymbol(hints, "Enveloppe", 58, "ring-topology", "A bounded seal can contain or wrap the manifestation.");
  }

  const centralDensity = annularDensity(mask, width, height, cx, cy, 0, outerRadius * 0.22);
  const middleDensity = annularDensity(mask, width, height, cx, cy, outerRadius * 0.22, outerRadius * 0.58);
  const outerModulePresence = sectorPresence(mask, width, height, cx, cy, outerRadius * 0.78, 8, Math.max(2, outerRadius * 0.018));
  const bilateralPresence = sectorPresence(mask, width, height, cx, cy, outerRadius * 0.62, 2, Math.max(2, outerRadius * 0.02));
  const radialPresence = sectorPresence(mask, width, height, cx, cy, outerRadius * 0.62, 4, Math.max(2, outerRadius * 0.02));

  if (outerModulePresence >= 0.5) {
    addArchitecturalSymbol(hints, "Repetition", 60 + outerModulePresence * 18, "radial-symmetry", "Repeated modules around the seal act as repeated instructions.");
    addArchitecturalSymbol(hints, "Collection", 54 + outerModulePresence * 16, "radial-symmetry", "Repeated outer modules can gather or distribute the same instruction.");
  }
  if (outerModulePresence >= 0.72 && centralDensity < 0.006 && middleDensity < 0.01) {
    addArchitecturalSymbol(hints, "Lien", 66, "woven-ring", "An interlocked empty ring reads as a linked boundary.");
    addArchitecturalSymbol(hints, "Fenetres", 62, "woven-ring", "A linked hollow ring can open a window-like passage.");
    addArchitecturalSymbol(hints, "Lumiere", 56, "woven-ring", "Window seals use light-family visibility and passage cues.");
  }
  if (
    hasOuterRing
    && candidateScores.has("Orbe")
    && candidateScores.has("Pluie")
    && (candidateScores.has("Aeriforme") || candidateScores.has("Vent"))
  ) {
    addArchitecturalSymbol(hints, "Lien", 62, "hollow-ring-family", "A hollow circular seal with repeated flowing marks links two spaces.");
    addArchitecturalSymbol(hints, "Fenetres", 60, "hollow-ring-family", "A hollow linked seal can act as a window or passage.");
  }
  if ((candidateScores.has("Repetition") || outerModulePresence >= 0.6) && hasOuterRing) {
    addArchitecturalSymbol(hints, "Arret", 56, "closed-repeat", "Repeated instructions inside a closed seal can hold or stop the active state.");
  }
  if (radialPresence >= 0.5) {
    addArchitecturalSymbol(hints, "Projection", 58 + radialPresence * 16, "radial-flow", "Radial strokes point the manifestation away from the seal center.");
    addArchitecturalSymbol(hints, "Lancement", 52 + radialPresence * 14, "radial-flow", "Directional spokes can launch a spell action.");
  }
  if (bilateralPresence >= 0.75 && hasOuterRing) {
    addArchitecturalSymbol(hints, "Lien", 58, "balanced-pairing", "Paired marks across the ring imply linked endpoints or anchors.");
  }
  if (centralDensity > 0.025 && middleDensity > 0.012) {
    addArchitecturalSymbol(hints, "Lumiere", 58, "central-focus", "A dense centered sigil acts like an activating focus.");
  }
  if (candidateScores.has("Nuage") || candidateScores.has("Dispersion") || candidateScores.has("Aeriforme") || candidateScores.has("Aeriforme defini")) {
    addArchitecturalSymbol(hints, "Fumee", 60, "matter-family", "Airy or dispersive forms can manifest as smoke-like matter.");
  }
  if (candidateScores.has("Fumee") && candidateScores.has("Arret temporel")) {
    addArchitecturalSymbol(hints, "Feu", 55, "matter-family", "Heat-retention marks can be read as a fire-family source.");
  }
  if (candidateScores.has("Pluie") || candidateScores.has("Refroidissement") || candidateScores.has("Orbe") || candidateScores.has("Flottement")) {
    addArchitecturalSymbol(hints, "Eau", 60, "matter-family", "Rain, cooling, floating drops, or orbs indicate water-family matter.");
  }
  if (candidateScores.has("Solidification") || candidateScores.has("Immobilite") || candidateScores.has("Etirement") || candidateScores.has("Crush")) {
    addArchitecturalSymbol(hints, "Terre", 58, "matter-family", "Solid, stretching, or crushing geometry indicates earth-family matter.");
  }
  if (candidateScores.has("Reflection") || candidateScores.has("Viseur") || candidateScores.has("Fenetres") || candidateScores.has("Lumiere vacillante")) {
    addArchitecturalSymbol(hints, "Lumiere", 62, "perception-family", "Reflection, windows, targeting, and flicker are light-family operations.");
  }
  if (candidateScores.has("Tete de chat-hibou")) {
    addArchitecturalSymbol(hints, "Chat-hibou", 70, "creature-family", "The head glyph is the editable form of the owlcat creature sigil.");
  }
  if (candidateScores.has("Pantin") && candidateScores.has("Repetition")) {
    addArchitecturalSymbol(hints, "Loup-ecaille", 52, "creature-family", "Repeated animated-body marks indicate a creature-control family.");
  }

  for (const pattern of sealPatterns || []) {
    if (pattern.ritualId === "opening-petrification") {
      addArchitecturalSymbol(hints, "Terre", pattern.score, "ritual-pattern", "The petrification seal uses earth-family matter.");
      addArchitecturalSymbol(hints, "Solidification", pattern.score, "ritual-pattern", "The petrification seal fixes matter into stone.");
      addArchitecturalSymbol(hints, "Immobilite", pattern.score, "ritual-pattern", "The petrification seal stops motion.");
    }
  }

  for (const hint of [...hints.values()]) propagateArchitecturalNeighbors(hint);

  const sourcePriority = {
    "candidate-support": 5,
    "ritual-pattern": 5,
    "ring-topology": 4,
    "balanced-pairing": 4,
    "radial-symmetry": 3,
    "radial-flow": 3,
    "perception-family": 3,
    "matter-family": 3,
    "creature-family": 3,
    "semantic-neighbor": 2,
    "derived-architecture": 1,
  };
  return [...hints.values()]
    .filter((hint) => (
      hint.score >= 52
      || hint.source === "candidate-support"
      || hint.source === "semantic-neighbor"
      || hint.source === "ring-topology"
      || hint.source === "balanced-pairing"
      || hint.source === "ritual-pattern"
      || hint.source === "perception-family"
      || hint.source === "matter-family"
    ))
    .sort((a, b) => (
      (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0)
      || b.score - a.score
      || a.name.localeCompare(b.name)
    ));
}

export function analyzePhoto(imageData, symbolPaths) {
  const { width, height } = imageData;
  const mask = toInkMask(imageData);
  const cropBounds = inkBounds(mask, width, height);
  const minSize = Math.max(10, Math.round((width * height) * 0.0002));
  const initialComponents = connectedComponents(mask, width, height, { minSize });
  // Un glyphe a une emprise significative dans le cadre ; en dessous, c'est du
  // bruit (poussiere du papier, taches) qu'on ignore sans tenter de reconnaitre.
  const minSpan = Math.max(18, Math.round(Math.min(width, height) * 0.03));
  const rings = [];
  let ignored = 0;
  const contentWidth = cropBounds?.width || width;
  const contentHeight = cropBounds?.height || height;
  for (const component of initialComponents.components) {
    if (Math.max(component.width, component.height) < minSpan) continue;
    const ownMask = initialComponents.componentMask(component);
    if (
      isRingComponent(component, contentWidth, contentHeight, ringCenterFill(component, ownMask, component.width))
      && Math.max(component.width, component.height) >= Math.max(contentWidth, contentHeight) * 0.68
      && ringEdgeFit(component, ownMask) >= 0.78
    ) {
      rings.push({
        cx: component.left + component.width / 2,
        cy: component.top + component.height / 2,
        radius: (component.width + component.height) / 4,
        eraseTolerance: Math.max(2, component.strokeWidth * 0.85),
      });
    }
  }
  rings.sort((a, b) => b.radius - a.radius);
  const sealPatterns = [detectOpeningPetrificationSeal(mask, width, height, cropBounds, rings)].filter(Boolean);
  const glyphMask = eraseDetectedRings(mask, width, height, rings);
  const residualComponents = connectedComponents(glyphMask, width, height, { minSize });
  const glyphComponents = residualComponents.components.filter((component) => {
    if (Math.max(component.width, component.height) >= minSpan) return true;
    const shortAttachedSpan = Math.max(5, Math.round(minSpan * 0.3));
    if (
      Math.max(component.width, component.height) >= shortAttachedSpan
      && rings.some((ring) => componentNearErasedRing(component, ring))
    ) {
      return true;
    }
    ignored += 1;
    return false;
  });
  const groups = groupComponents(glyphComponents, width, height, rings);
  const regions = groups.map((group) => {
    const groupMask = new Uint8Array(group.width * group.height);
    for (const component of group.components) {
      const localMask = residualComponents.componentMask(component);
      const offsetX = component.left - group.left;
      const offsetY = component.top - group.top;
      for (let y = 0; y < component.height; y += 1) {
        for (let x = 0; x < component.width; x += 1) {
          if (localMask[y * component.width + x]) {
            groupMask[(offsetY + y) * group.width + offsetX + x] = 1;
          }
        }
      }
    }
    const recognition = recognizeGroup(groupMask, group.width, group.height, symbolPaths);
    if (recognition.status === "unreadable") ignored += 1;
    return {
      ...recognition,
      cx: group.left + group.width / 2,
      cy: group.top + group.height / 2,
      size: Math.max(group.width, group.height),
      left: group.left,
      top: group.top,
      right: group.right,
      bottom: group.bottom,
      width: group.width,
      height: group.height,
    };
  });
  const symbols = regions
    .filter((region) => region.status === "accepted")
    .map((region) => ({
      name: region.candidates[0].name,
      score: region.candidates[0].score,
      candidates: region.candidates,
      cx: region.cx,
      cy: region.cy,
      size: region.size,
    }));
  const architecturalSymbols = inferArchitecturalSymbols({
    mask,
    width,
    height,
    rings,
    regions,
    sealPatterns,
    cropBounds,
  });
  return {
    rings,
    ring: rings[0] || null,
    sealPatterns,
    regions,
    symbols,
    architecturalSymbols,
    ignored,
    cropBounds: inkBounds(mask, width, height),
    imageWidth: width,
    imageHeight: height,
  };
}
