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

function selectedCandidate(region) {
  const candidates = Array.isArray(region?.candidates) ? region.candidates : [];
  if (region?.status === "accepted") {
    return candidates[0] || null;
  }
  if (region?.status !== "ambiguous" || typeof region.selectedName !== "string") {
    return null;
  }
  return candidates.find((candidate) => candidate.name === region.selectedName) || null;
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
    return { rings: [], symbols: [] };
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
    ...mapPoint(region.cx, region.cy),
    size: (region.size * scale) / 2,
    width: (finite(region.width) ? region.width : region.size) * scale,
    height: (finite(region.height) ? region.height : region.size) * scale,
  }));
  return { rings, symbols };
}
