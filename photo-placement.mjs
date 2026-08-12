function finite(value) {
  return Number.isFinite(value);
}

export function sourceCropForAnalysis(cropBounds, analysisWidth, analysisHeight, sourceWidth, sourceHeight) {
  const scaleX = sourceWidth / analysisWidth;
  const scaleY = sourceHeight / analysisHeight;
  const left = Math.max(0, Math.round(cropBounds.left * scaleX));
  const top = Math.max(0, Math.round(cropBounds.top * scaleY));
  const right = Math.min(sourceWidth, Math.round((cropBounds.left + cropBounds.width) * scaleX));
  const bottom = Math.min(sourceHeight, Math.round((cropBounds.top + cropBounds.height) * scaleY));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    scaleX,
    scaleY,
  };
}

function analysisRings(analysis) {
  if (Array.isArray(analysis?.rings) && analysis.rings.length > 0) {
    return analysis.rings;
  }
  return analysis?.ring ? [analysis.ring] : [];
}

function analysisPatterns(analysis) {
  return Array.isArray(analysis?.sealPatterns) ? analysis.sealPatterns : [];
}

function selectedCandidate(region) {
  const candidates = Array.isArray(region?.candidates) ? region.candidates : [];
  if (region?.selectedCandidate && region.selectedName === region.selectedCandidate.name) {
    return region.selectedCandidate;
  }
  if (region?.status === "ambiguous" && typeof region.selectedName === "string") {
    return candidates.find((candidate) => candidate.name === region.selectedName) || null;
  }
  if (region?.status === "accepted") {
    return candidates[0] || null;
  }
  return null;
}

export function selectPhotoCandidate(analysis, regionIndex, selectedName) {
  const region = analysis?.regions?.[regionIndex];
  if (region?.status !== "ambiguous") {
    return null;
  }
  const candidate = (region.candidates || []).find(({ name }) => name === selectedName);
  region.selectedName = candidate?.name || null;
  return region.selectedName;
}

export function selectPhotoSymbol(analysis, regionIndex, element) {
  const region = analysis?.regions?.[regionIndex];
  if (!region || !element?.name) {
    return null;
  }
  const candidate = (region.candidates || []).find(({ name }) => name === element.name);
  region.selectedName = element.name;
  region.selectedCandidate = candidate || {
    name: element.name,
    score: 0,
    rotation: 0,
  };
  return region.selectedName;
}

export function setPhotoRegionPosition(analysis, regionIndex, offsetX, offsetY) {
  const region = analysis?.regions?.[regionIndex];
  if (!region) {
    return null;
  }
  const clampOffset = (value) => Math.max(-0.5, Math.min(0.5, Number(value) || 0));
  region.offsetX = clampOffset(offsetX);
  region.offsetY = clampOffset(offsetY);
  return { x: region.offsetX, y: region.offsetY };
}

function analysisLimit(analysis, axis) {
  const fallback = axis === "x" ? analysis?.cropBounds?.width : analysis?.cropBounds?.height;
  const direct = axis === "x" ? analysis?.imageWidth : analysis?.imageHeight;
  return Math.max(1, Number(direct) || Number(fallback) || 1);
}

function normalizePhotoRegionBounds(analysis, bounds) {
  const imageWidth = analysisLimit(analysis, "x");
  const imageHeight = analysisLimit(analysis, "y");
  const rawLeft = Number(bounds?.left) || 0;
  const rawTop = Number(bounds?.top) || 0;
  const rawRight = finite(bounds?.right) ? Number(bounds.right) : rawLeft + (Number(bounds?.width) || 0);
  const rawBottom = finite(bounds?.bottom) ? Number(bounds.bottom) : rawTop + (Number(bounds?.height) || 0);
  const minSize = 4;
  const left = Math.max(0, Math.min(imageWidth - minSize, Math.min(rawLeft, rawRight)));
  const top = Math.max(0, Math.min(imageHeight - minSize, Math.min(rawTop, rawBottom)));
  const right = Math.max(left + minSize, Math.min(imageWidth, Math.max(rawLeft, rawRight)));
  const bottom = Math.max(top + minSize, Math.min(imageHeight, Math.max(rawTop, rawBottom)));
  const width = right - left;
  const height = bottom - top;
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    cx: left + width / 2,
    cy: top + height / 2,
    size: Math.max(width, height),
  };
}

export function setPhotoRegionBounds(analysis, regionIndex, bounds) {
  const region = analysis?.regions?.[regionIndex];
  if (!region) {
    return null;
  }
  const normalized = normalizePhotoRegionBounds(analysis, bounds);
  Object.assign(region, normalized, { offsetX: 0, offsetY: 0 });
  return normalized;
}

export function createPhotoRegionFromBounds(analysis, bounds) {
  if (!analysis) {
    return -1;
  }
  if (!Array.isArray(analysis.regions)) {
    analysis.regions = [];
  }
  const normalized = normalizePhotoRegionBounds(analysis, bounds);
  analysis.regions.push({
    status: "ambiguous",
    candidates: [],
    selectedName: null,
    selectedCandidate: null,
    userCreated: true,
    offsetX: 0,
    offsetY: 0,
    ...normalized,
  });
  return analysis.regions.length - 1;
}

function defaultPhotoSquareBounds(analysis) {
  const imageWidth = analysisLimit(analysis, "x");
  const imageHeight = analysisLimit(analysis, "y");
  const size = Math.max(16, Math.min(imageWidth, imageHeight) * 0.5);
  return {
    left: imageWidth / 2 - size / 2,
    top: imageHeight / 2 - size / 2,
    width: size,
    height: size,
  };
}

export function createPhotoCircleRegion(analysis, bounds = null) {
  if (!analysis) {
    return -1;
  }
  if (!Array.isArray(analysis.rings)) {
    analysis.rings = [];
  }
  const normalized = normalizePhotoRegionBounds(analysis, bounds || defaultPhotoSquareBounds(analysis));
  const radius = Math.max(2, Math.min(normalized.width, normalized.height) / 2);
  analysis.rings.push({
    cx: normalized.cx,
    cy: normalized.cy,
    radius,
    userCreated: true,
  });
  return analysis.rings.length - 1;
}

export function createPhotoSquareRegion(analysis, bounds = null) {
  const normalized = normalizePhotoRegionBounds(analysis, bounds || defaultPhotoSquareBounds(analysis));
  const size = Math.max(normalized.width, normalized.height);
  return createPhotoRegionFromBounds(analysis, {
    left: normalized.cx - size / 2,
    top: normalized.cy - size / 2,
    width: size,
    height: size,
  });
}

function importableRegions(analysis) {
  if (Array.isArray(analysis?.regions)) {
    return analysis.regions
      .map((region) => ({ region, candidate: selectedCandidate(region) }))
      .filter(({ candidate }) => candidate);
  }
  return (analysis?.symbols || []).map((symbol) => ({
    region: symbol,
    candidate: {
      name: symbol.name,
      score: symbol.score,
    },
  }));
}

function regionBounds(region) {
  if (!finite(region?.cx) || !finite(region?.cy) || !finite(region?.size)) {
    if (![region?.left, region?.top, region?.right, region?.bottom].every(finite)) {
      return null;
    }
    return {
      left: region.left,
      top: region.top,
      right: region.right,
      bottom: region.bottom,
    };
  }
  const half = region.size / 2;
  const componentLeft = finite(region.left) ? region.left : region.cx - half;
  const componentTop = finite(region.top) ? region.top : region.cy - half;
  const componentRight = finite(region.width)
    ? componentLeft + region.width
    : finite(region.right) ? region.right : region.cx + half;
  const componentBottom = finite(region.height)
    ? componentTop + region.height
    : finite(region.bottom) ? region.bottom : region.cy + half;
  return {
    left: Math.min(componentLeft, region.cx - half),
    top: Math.min(componentTop, region.cy - half),
    right: Math.max(componentRight, region.cx + half),
    bottom: Math.max(componentBottom, region.cy + half),
  };
}

export function photoContentBounds(analysis) {
  const bounds = [];
  for (const ring of analysisRings(analysis)) {
    if (!finite(ring?.cx) || !finite(ring?.cy) || !finite(ring?.radius) || ring.radius < 0) {
      continue;
    }
    bounds.push({
      left: ring.cx - ring.radius,
      top: ring.cy - ring.radius,
      right: ring.cx + ring.radius,
      bottom: ring.cy + ring.radius,
    });
  }
  for (const { region } of importableRegions(analysis)) {
    const bound = regionBounds(region);
    if (bound) bounds.push(bound);
  }
  for (const pattern of analysisPatterns(analysis)) {
    if (finite(pattern?.cx) && finite(pattern?.cy) && finite(pattern?.radius) && pattern.radius >= 0) {
      bounds.push({
        left: pattern.cx - pattern.radius,
        top: pattern.cy - pattern.radius,
        right: pattern.cx + pattern.radius,
        bottom: pattern.cy + pattern.radius,
      });
    } else if (pattern?.bounds && [pattern.bounds.left, pattern.bounds.top, pattern.bounds.right, pattern.bounds.bottom].every(finite)) {
      bounds.push(pattern.bounds);
    }
  }
  if (bounds.length === 0) {
    return null;
  }
  const left = Math.min(...bounds.map((bound) => bound.left));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const right = Math.max(...bounds.map((bound) => bound.right));
  const bottom = Math.max(...bounds.map((bound) => bound.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function mapPhotoAnalysis(analysis, target) {
  const source = photoContentBounds(analysis);
  const targetWidth = Number(target?.width) || 0;
  const targetHeight = Number(target?.height) || 0;
  if (!source || targetWidth <= 0 || targetHeight <= 0) {
    return { rings: [], symbols: [], patterns: [] };
  }
  const sourceWidth = Math.max(1, source.width);
  const sourceHeight = Math.max(1, source.height);
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const sourceCx = (source.left + source.right) / 2;
  const sourceCy = (source.top + source.bottom) / 2;
  const targetCx = (Number(target.left) || 0) + targetWidth / 2;
  const targetCy = (Number(target.top) || 0) + targetHeight / 2;
  const mapPoint = (x, y) => ({
    cx: targetCx + (x - sourceCx) * scale,
    cy: targetCy + (y - sourceCy) * scale,
  });

  const rings = analysisRings(analysis)
    .filter((ring) => finite(ring?.cx) && finite(ring?.cy) && finite(ring?.radius) && ring.radius >= 0)
    .map((ring) => ({
      ...mapPoint(ring.cx, ring.cy),
      radius: ring.radius * scale,
    }));
  const symbols = importableRegions(analysis).map(({ region, candidate }) => ({
    name: candidate.name,
    score: candidate.score,
    rotation: finite(candidate.rotation) ? candidate.rotation : 0,
    candidates: region.candidates || [candidate],
    status: region.status || "accepted",
    ...mapPoint(
      region.cx + (finite(region.offsetX) ? region.offsetX * sourceWidth : 0),
      region.cy + (finite(region.offsetY) ? region.offsetY * sourceHeight : 0),
    ),
    size: (region.size * scale) / 2,
    width: (finite(region.width) ? region.width : region.size) * scale,
    height: (finite(region.height) ? region.height : region.size) * scale,
  }));
  const patterns = analysisPatterns(analysis)
    .filter((pattern) => finite(pattern?.cx) && finite(pattern?.cy) && finite(pattern?.radius) && pattern.radius >= 0)
    .map((pattern) => ({
      id: pattern.id,
      ritualId: pattern.ritualId,
      score: pattern.score,
      ...mapPoint(pattern.cx, pattern.cy),
      radius: pattern.radius * scale,
    }));
  return { rings, symbols, patterns };
}
