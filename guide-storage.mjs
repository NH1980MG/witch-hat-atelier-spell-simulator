export const USER_GUIDE_STORAGE_KEY = "whaUserGuidesV1";
export const MAX_USER_GUIDES = 24;

const DRAWING_ACTION_TYPES = new Set(["free", "circle", "ring", "ray", "glyph", "spiral"]);
const ACTION_KEYS = [
  "type", "label", "element", "charge", "color", "width", "x", "y", "cx", "cy",
  "radius", "turns", "size", "rotation", "kind", "closed", "seal", "boundary", "userAdjusted",
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
  return clean;
}

function normalizeGuide(guide) {
  if (!guide || typeof guide.id !== "string" || !Array.isArray(guide.actions)) {
    return null;
  }
  const actions = guide.actions.map(sanitizeAction).filter(Boolean);
  if (actions.length === 0) {
    return null;
  }
  return {
    id: guide.id.slice(0, 100),
    name: String(guide.name || "Example").slice(0, 80),
    createdAt: Number.isFinite(guide.createdAt) ? guide.createdAt : Date.now(),
    actions,
  };
}

export function createUserGuide(actions, options = {}) {
  const guide = normalizeGuide({
    id: options.id || `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: options.name || "Example",
    createdAt: options.createdAt ?? Date.now(),
    actions,
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
  storage?.setItem(USER_GUIDE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function deleteUserGuide(guides, id) {
  return guides.filter((guide) => guide.id !== id);
}
