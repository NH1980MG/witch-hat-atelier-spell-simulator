export const STROKE_SMOOTHING_STORAGE_KEY = "whaStrokeSmoothing";
export const DEFAULT_STROKE_SMOOTHING = 0;
export const MAX_STROKE_SMOOTHING = 100;

export function normalizeStrokeSmoothing(value, fallback = DEFAULT_STROKE_SMOOTHING) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(0, Math.min(MAX_STROKE_SMOOTHING, Math.round(number)));
}

export function loadStrokeSmoothing(storage = globalThis.localStorage) {
  return normalizeStrokeSmoothing(storage?.getItem(STROKE_SMOOTHING_STORAGE_KEY));
}

export function saveStrokeSmoothing(storage = globalThis.localStorage, value) {
  const normalized = normalizeStrokeSmoothing(value);
  storage?.setItem(STROKE_SMOOTHING_STORAGE_KEY, String(normalized));
  return normalized;
}

export function smoothStroke(points, smoothing = DEFAULT_STROKE_SMOOTHING) {
  if (!Array.isArray(points)) {
    return [];
  }
  const normalized = points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map(({ x, y }) => ({ x, y }));
  const amount = normalizeStrokeSmoothing(smoothing);
  if (amount === 0 || normalized.length < 3) {
    return normalized;
  }
  const radius = Math.max(1, Math.round(amount / 20));
  return normalized.map((point, index) => {
    if (index === 0 || index === normalized.length - 1) {
      return { ...point };
    }
    const start = Math.max(0, index - radius);
    const end = Math.min(normalized.length - 1, index + radius);
    const window = normalized.slice(start, end + 1);
    return {
      x: window.reduce((sum, item) => sum + item.x, 0) / window.length,
      y: window.reduce((sum, item) => sum + item.y, 0) / window.length,
    };
  });
}
