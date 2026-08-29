export const GUIDE_TRANSFORM_STORAGE_KEY = "whaGuideTransformsV1";
export const MIN_GUIDE_TRANSFORM_SCALE = 0.25;

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function normalizeGuideTransform(transform = {}) {
  return {
    x: finite(transform.x),
    y: finite(transform.y),
    rotation: finite(transform.rotation),
    scale: Math.max(MIN_GUIDE_TRANSFORM_SCALE, finite(transform.scale, 1)),
  };
}

export function readGuideTransforms(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(GUIDE_TRANSFORM_STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([id, transform]) => typeof id === "string" && transform && typeof transform === "object" && !Array.isArray(transform))
      .map(([id, transform]) => [id.slice(0, 120), normalizeGuideTransform(transform)]));
  } catch {
    return {};
  }
}

export function writeGuideTransforms(storage = globalThis.localStorage, transforms = {}) {
  const normalized = Object.fromEntries(Object.entries(transforms)
    .filter(([id]) => typeof id === "string")
    .map(([id, transform]) => [id.slice(0, 120), normalizeGuideTransform(transform)]));
  storage?.setItem(GUIDE_TRANSFORM_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function translateGuideTransform(transform, dx, dy) {
  const current = normalizeGuideTransform(transform);
  return normalizeGuideTransform({ ...current, x: current.x + finite(dx), y: current.y + finite(dy) });
}

export function scaleGuideTransform(transform, factor) {
  const current = normalizeGuideTransform(transform);
  return normalizeGuideTransform({ ...current, scale: current.scale * Math.max(0.01, finite(factor, 1)) });
}

export function rotateGuideTransform(transform, radians) {
  const current = normalizeGuideTransform(transform);
  return normalizeGuideTransform({ ...current, rotation: current.rotation + finite(radians) });
}

export function guideTransformPoint(point, transform, center) {
  const current = normalizeGuideTransform(transform);
  const cosine = Math.cos(current.rotation);
  const sine = Math.sin(current.rotation);
  const dx = (point.x - center.x) * current.scale;
  const dy = (point.y - center.y) * current.scale;
  return {
    x: center.x + dx * cosine - dy * sine + current.x,
    y: center.y + dx * sine + dy * cosine + current.y,
  };
}

export function inverseGuideTransformPoint(point, transform, center) {
  const current = normalizeGuideTransform(transform);
  const cosine = Math.cos(current.rotation);
  const sine = Math.sin(current.rotation);
  const dx = point.x - center.x - current.x;
  const dy = point.y - center.y - current.y;
  return {
    x: center.x + (dx * cosine + dy * sine) / current.scale,
    y: center.y + (-dx * sine + dy * cosine) / current.scale,
  };
}
