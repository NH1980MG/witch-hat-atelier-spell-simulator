// stroke-matcher.mjs
// Comparaison generique entre des traits dessines a main levee et les modeles
// vectoriels du catalogue (SYMBOL_PATHS). Sert au mode entrainement : on note
// la ressemblance entre le geste de l'utilisateur et le glyphe cible.
//
// Approche inspiree du recognizer $1 : aplatissement des courbes en polylignes,
// re-echantillonnage equidistant, normalisation (centroide + echelle), distance
// moyenne point a point. L'orientation reste significative (un signe dessine a
// l'envers n'est pas le meme signe), mais chaque trait peut etre parcouru dans
// les deux sens.

const RESAMPLE_COUNT = 32;

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function quadraticPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

// Conversion arc SVG (endpoint) -> parametrisation centrale (spec F.6.5).
function arcToCenter(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
  if (rx === 0 || ry === 0) {
    return null;
  }
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
    rxSq = rx * rx;
    rySq = ry * ry;
  }
  const sign = largeArc === sweep ? -1 : 1;
  const numerator = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  const factor = sign * Math.sqrt(Math.max(0, numerator / (rxSq * y1pSq + rySq * x1pSq)));
  const cxp = factor * (rx * y1p) / ry;
  const cyp = factor * -(ry * x1p) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const clamped = Math.min(1, Math.max(-1, dot / len));
    return (ux * vy - uy * vx < 0 ? -1 : 1) * Math.acos(clamped);
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  return { cx, cy, rx, ry, phi, theta1, delta };
}

function flattenArc(seg, x0, y0, out) {
  const center = arcToCenter(x0, y0, seg.rx, seg.ry, (seg.rotation * Math.PI) / 180, seg.largeArc, seg.sweep, seg.x, seg.y);
  if (!center) {
    out.push([seg.x, seg.y]);
    return;
  }
  const steps = Math.max(4, Math.ceil(Math.abs(center.delta) / (Math.PI / 18)));
  for (let i = 1; i <= steps; i += 1) {
    const theta = center.theta1 + (center.delta * i) / steps;
    const cosPhi = Math.cos(center.phi);
    const sinPhi = Math.sin(center.phi);
    const x = center.cx + center.rx * Math.cos(theta) * cosPhi - center.ry * Math.sin(theta) * sinPhi;
    const y = center.cy + center.rx * Math.cos(theta) * sinPhi + center.ry * Math.sin(theta) * cosPhi;
    out.push([x, y]);
  }
}

// Aplatis une chaine de commandes SVG (M L H V C Q Z A) en sous-polylignes.
export function flattenSvgPath(d) {
  const tokens = String(d).match(/[MLHVCQZA]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const subpaths = [];
  let current = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let cmd = "";
  const num = () => Number.parseFloat(tokens[i++]);
  const push = () => {
    if (current.length) {
      subpaths.push(current);
      current = [];
    }
  };
  while (i < tokens.length) {
    if (/^[MLHVCQZA]$/i.test(tokens[i])) {
      cmd = tokens[i++].toUpperCase();
      if (cmd === "Z") {
        current.push([startX, startY]);
        x = startX;
        y = startY;
        push();
        continue;
      }
    }
    if (cmd === "M") {
      x = num();
      y = num();
      startX = x;
      startY = y;
      current.push([x, y]);
      cmd = "L";
    } else if (cmd === "L") {
      x = num();
      y = num();
      current.push([x, y]);
    } else if (cmd === "H") {
      x = num();
      current.push([x, y]);
    } else if (cmd === "V") {
      y = num();
      current.push([x, y]);
    } else if (cmd === "C") {
      const x1 = num();
      const y1 = num();
      const x2 = num();
      const y2 = num();
      const x3 = num();
      const y3 = num();
      for (let step = 1; step <= 20; step += 1) {
        const t = step / 20;
        current.push([cubicPoint(x, x1, x2, x3, t), cubicPoint(y, y1, y2, y3, t)]);
      }
      x = x3;
      y = y3;
    } else if (cmd === "Q") {
      const x1 = num();
      const y1 = num();
      const x2 = num();
      const y2 = num();
      for (let step = 1; step <= 16; step += 1) {
        const t = step / 16;
        current.push([quadraticPoint(x, x1, x2, t), quadraticPoint(y, y1, y2, t)]);
      }
      x = x2;
      y = y2;
    } else if (cmd === "A") {
      const seg = { rx: num(), ry: num(), rotation: num(), largeArc: num(), sweep: num(), x: num(), y: num() };
      flattenArc(seg, x, y, current);
      x = seg.x;
      y = seg.y;
    } else {
      i += 1;
    }
  }
  push();
  return subpaths;
}

function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return length;
}

// Re-echantillonne une polyligne en n points equidistants.
export function resamplePoints(points, n = RESAMPLE_COUNT) {
  if (points.length === 0) {
    return [];
  }
  const total = pathLength(points);
  if (total === 0) {
    return Array.from({ length: n }, () => [...points[0]]);
  }
  const interval = total / (n - 1);
  const out = [[...points[0]]];
  let carry = 0;
  let segStart = points[0];
  for (let i = 1; i < points.length && out.length < n; i += 1) {
    const curr = points[i];
    let segLen = Math.hypot(curr[0] - segStart[0], curr[1] - segStart[1]);
    while (segLen > 0 && carry + segLen >= interval && out.length < n) {
      const t = (interval - carry) / segLen;
      const next = [segStart[0] + t * (curr[0] - segStart[0]), segStart[1] + t * (curr[1] - segStart[1])];
      out.push(next);
      segStart = next;
      segLen = Math.hypot(curr[0] - segStart[0], curr[1] - segStart[1]);
      carry = 0;
    }
    carry += segLen;
    segStart = curr;
  }
  while (out.length < n) {
    out.push([...points[points.length - 1]]);
  }
  return out;
}

// Normalise un ensemble de traits : centroide a l'origine, echelle max = 1.
export function normalizeStrokes(strokes) {
  const all = strokes.flat();
  if (all.length === 0) {
    return strokes;
  }
  let cx = 0;
  let cy = 0;
  for (const [x, y] of all) {
    cx += x;
    cy += y;
  }
  cx /= all.length;
  cy /= all.length;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of all) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const scale = Math.max(maxX - minX, maxY - minY) || 1;
  return strokes.map((stroke) => stroke.map(([x, y]) => [(x - cx) / scale, (y - cy) / scale]));
}

function strokeDistance(left, right) {
  const n = Math.min(left.length, right.length);
  if (n === 0) {
    return 1;
  }
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += Math.hypot(left[i][0] - right[i][0], left[i][1] - right[i][1]);
  }
  return sum / n;
}

function bestStrokeDistance(template, candidate) {
  const forward = strokeDistance(template, candidate);
  const backward = strokeDistance(template, [...candidate].reverse());
  return Math.min(forward, backward);
}

function clampPercentage(value) {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function shapeProportions(strokes) {
  const points = strokes.flat();
  if (!points.length) {
    return [0, 0];
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const scale = Math.max(width, height) || 1;
  return [width / scale, height / scale];
}

function proportionSimilarity(left, right) {
  const [leftWidth, leftHeight] = shapeProportions(left);
  const [rightWidth, rightHeight] = shapeProportions(right);
  const difference = (Math.abs(leftWidth - rightWidth) + Math.abs(leftHeight - rightHeight)) / 2;
  return clampPercentage((1 - difference) * 100);
}

function principalAxis(strokes) {
  const points = strokes.flat();
  if (points.length < 2) {
    return { angle: 0, strength: 0 };
  }
  const center = points.reduce(
    (sum, [x, y]) => [sum[0] + x / points.length, sum[1] + y / points.length],
    [0, 0],
  );
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const [x, y] of points) {
    const dx = x - center[0];
    const dy = y - center[1];
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const spread = xx + yy;
  const anisotropy = Math.hypot(xx - yy, 2 * xy);
  return {
    angle: 0.5 * Math.atan2(2 * xy, xx - yy),
    strength: spread > 0 ? anisotropy / spread : 0,
  };
}

function orientationSimilarity(left, right) {
  const leftAxis = principalAxis(left);
  const rightAxis = principalAxis(right);
  // A nearly round drawing has no stable principal direction.
  if (leftAxis.strength < 0.05 || rightAxis.strength < 0.05) {
    return 100;
  }
  let difference = Math.abs(leftAxis.angle - rightAxis.angle) % Math.PI;
  difference = Math.min(difference, Math.PI - difference);
  return clampPercentage((1 - difference / (Math.PI / 2)) * 100);
}

function pairStrokes(templateStrokes, userStrokes) {
  const distances = [];
  for (let templateIndex = 0; templateIndex < templateStrokes.length; templateIndex += 1) {
    for (let userIndex = 0; userIndex < userStrokes.length; userIndex += 1) {
      distances.push({
        distance: bestStrokeDistance(templateStrokes[templateIndex], userStrokes[userIndex]),
        templateIndex,
        userIndex,
      });
    }
  }
  distances.sort((left, right) => left.distance - right.distance);

  const usedTemplates = new Set();
  const usedUsers = new Set();
  const pairs = [];
  for (const candidate of distances) {
    if (usedTemplates.has(candidate.templateIndex) || usedUsers.has(candidate.userIndex)) {
      continue;
    }
    usedTemplates.add(candidate.templateIndex);
    usedUsers.add(candidate.userIndex);
    pairs.push(candidate);
  }
  return pairs;
}

// Diagnostic 0-100 entre les traits utilisateur et les chemins SVG du modele.
export function analyzeStrokeMatch(userStrokes, templatePaths) {
  const templateStrokes = templatePaths.flatMap((d) => flattenSvgPath(d)).map((points) => resamplePoints(points));
  const user = userStrokes.filter((stroke) => stroke.length > 0).map((points) => resamplePoints(points));
  if (user.length === 0 || templateStrokes.length === 0) {
    return {
      score: 0,
      coverage: 0,
      extraPenalty: user.length ? Math.min(35, user.length * 12) : 0,
      proportionScore: 0,
      orientationScore: 0,
      missingStrokes: templateStrokes.length,
      extraStrokes: user.length,
    };
  }
  const normalizedUser = normalizeStrokes(user);
  const normalizedTemplate = normalizeStrokes(templateStrokes);
  const pairs = pairStrokes(normalizedTemplate, normalizedUser);
  const missingStrokes = normalizedTemplate.length - pairs.length;
  const extraStrokes = normalizedUser.length - pairs.length;
  const coverage = clampPercentage((pairs.length / normalizedTemplate.length) * 100);
  const meanDistance = pairs.length
    ? pairs.reduce((sum, pair) => sum + pair.distance, 0) / pairs.length
    : 1;
  const shapeScore = clampPercentage((1 - meanDistance / 0.5) * 100);
  const extraPenalty = Math.min(35, extraStrokes * 12);
  const proportionScore = proportionSimilarity(user, templateStrokes);
  const orientationScore = orientationSimilarity(user, templateStrokes);
  const score = clampPercentage(
    shapeScore * 0.65
      + coverage * 0.2
      + proportionScore * 0.1
      + orientationScore * 0.05
      - extraPenalty,
  );

  return {
    score,
    coverage,
    extraPenalty,
    proportionScore,
    orientationScore,
    missingStrokes,
    extraStrokes,
  };
}

// API historique conservee pour les consommateurs qui n'ont besoin que du score.
export function scoreStrokeMatch(userStrokes, templatePaths) {
  return analyzeStrokeMatch(userStrokes, templatePaths).score;
}
