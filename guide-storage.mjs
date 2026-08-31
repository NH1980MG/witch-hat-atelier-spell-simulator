export const USER_GUIDE_STORAGE_KEY = "whaUserGuidesV1";
export const MAX_USER_GUIDES = 24;
export const MAX_USER_GUIDE_STORAGE_CHARS = 2_500_000;

const DRAWING_ACTION_TYPES = new Set(["free", "circle", "ring", "ray", "glyph", "spiral", "annotation"]);
const ACTION_KEYS = [
  "type", "label", "element", "charge", "color", "width", "x", "y", "cx", "cy",
  "radius", "turns", "size", "rotation", "kind", "closed", "seal", "boundary", "userAdjusted", "text",
];

function sanitizePoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    return null;
  }
  return { x: point.x, y: point.y };
}

function sanitizeAction(action) {
  if (!DRAWING_ACTION_TYPES.has(action?.type)) {
    return null;
  }
  const clean = {};
  for (const key of ACTION_KEYS) {
    const value = action[key];
    if (typeof value === "string" || typeof value === "boolean" || Number.isFinite(value)) {
      clean[key] = value;
    }
  }
  if (action.type === "free") {
    clean.points = Array.isArray(action.points) ? action.points.map(sanitizePoint).filter(Boolean) : [];
    if (clean.points.length < 2) {
      return null;
    }
  }
  if (action.type === "annotation") {
    if (!["drawing", "text"].includes(clean.kind)) return null;
    if (clean.kind === "text") {
      clean.text = typeof action.text === "string" ? action.text.trim().slice(0, 500) : "";
      if (!clean.text || !Number.isFinite(clean.x) || !Number.isFinite(clean.y)) return null;
    } else {
      clean.points = Array.isArray(action.points) ? action.points.map(sanitizePoint).filter(Boolean).slice(0, 2000) : [];
      if (clean.points.length < 2) return null;
    }
  }
  return clean;
}

function sanitizeRaster(raster) {
  if (!raster || typeof raster.src !== "string" ||
      !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(raster.src) ||
      !Number.isFinite(raster.width) || raster.width <= 0 ||
      !Number.isFinite(raster.height) || raster.height <= 0) {
    return null;
  }
  return {
    src: raster.src,
    width: raster.width,
    height: raster.height,
  };
}

function normalizeGuide(guide) {
  if (!guide || typeof guide.id !== "string" || !Array.isArray(guide.actions)) {
    return null;
  }
  const actions = guide.actions.map(sanitizeAction).filter(Boolean);
  const raster = sanitizeRaster(guide.raster);
  if (actions.length === 0 && !raster) {
    return null;
  }
  const normalized = {
    id: guide.id.slice(0, 100),
    name: String(guide.name || "Example").slice(0, 80),
    createdAt: Number.isFinite(guide.createdAt) ? guide.createdAt : Date.now(),
    actions,
  };
  if (raster) normalized.raster = raster;
  return normalized;
}

export function createUserGuide(actions, options = {}) {
  const guide = normalizeGuide({
    id: options.id || `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: options.name || "Example",
    createdAt: options.createdAt ?? Date.now(),
    actions,
    raster: options.raster,
  });
  if (!guide) {
    throw new TypeError("A guide requires at least one valid drawing action");
  }
  return guide;
}

export function loadUserGuides(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(USER_GUIDE_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeGuide).filter(Boolean).slice(0, MAX_USER_GUIDES);
  } catch {
    return [];
  }
}

export function saveUserGuides(storage = globalThis.localStorage, guides = []) {
  const normalized = guides.map(normalizeGuide).filter(Boolean).slice(0, MAX_USER_GUIDES);
  const fitted = [];
  for (const guide of normalized) {
    const candidate = [...fitted, guide];
    if (JSON.stringify(candidate).length <= MAX_USER_GUIDE_STORAGE_CHARS) {
      fitted.push(guide);
    }
  }
  storage?.setItem(USER_GUIDE_STORAGE_KEY, JSON.stringify(fitted));
  return fitted;
}

export function deleteUserGuide(guides, id) {
  return guides.filter((guide) => guide.id !== id);
}
