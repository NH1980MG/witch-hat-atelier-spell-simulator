export const MIN_GLYPH_SIZE = 12;
export const MAX_GLYPH_SIZE = 120;
export const GLYPH_SELECTION_SCALE = 1.18;

function pointInGlyphSpace(action, point) {
  const rotation = Number(action.rotation) || 0;
  const dx = point.x - action.x;
  const dy = point.y - action.y;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    x: dx * cosine + dy * sine,
    y: -dx * sine + dy * cosine,
  };
}

export function glyphResizeHandleAtPoint(action, point, tolerance = 10) {
  if (action?.type !== "glyph") {
    return null;
  }
  const local = pointInGlyphSpace(action, point);
  const half = action.size * GLYPH_SELECTION_SCALE;
  const handles = [
    ["nw", -half, -half],
    ["ne", half, -half],
    ["se", half, half],
    ["sw", -half, half],
  ];
  return handles.find(([, x, y]) => Math.hypot(local.x - x, local.y - y) <= tolerance)?.[0] || null;
}

export function resizeGlyphFromCorner(action, point) {
  if (action?.type !== "glyph") {
    throw new TypeError("A glyph action is required");
  }
  const local = pointInGlyphSpace(action, point);
  const nextSize = Math.max(Math.abs(local.x), Math.abs(local.y)) / GLYPH_SELECTION_SCALE;
  return Math.max(MIN_GLYPH_SIZE, Math.min(MAX_GLYPH_SIZE, Math.round(nextSize * 10) / 10));
}

export function resizeGlyphSize(size, direction) {
  if (!["grow", "shrink"].includes(direction)) {
    throw new TypeError("Unknown resize direction");
  }
  const factor = direction === "shrink" ? 0.9 : 1.1;
  const nextSize = Math.round(size * factor * 10) / 10;
  return Math.max(MIN_GLYPH_SIZE, Math.min(MAX_GLYPH_SIZE, nextSize));
}

export function topmostGlyphIndexAtPoint(actions, point, padding = 10) {
  for (let index = actions.length - 1; index >= 0; index -= 1) {
    const action = actions[index];
    if (
      action.type === "glyph" &&
      Math.hypot(point.x - action.x, point.y - action.y) <= action.size + padding
    ) {
      return index;
    }
  }
  return -1;
}

export function canDropGlyph(point, size, bounds) {
  return (
    point.x - size >= bounds.left &&
    point.x + size <= bounds.right &&
    point.y - size >= bounds.top &&
    point.y + size <= bounds.bottom
  );
}

export function clampGlyphCenter(point, size, bounds) {
  const margin = Math.max(0, Number(size) || 0);
  return {
    x: Math.max(bounds.left + margin, Math.min(bounds.right - margin, point.x)),
    y: Math.max(bounds.top + margin, Math.min(bounds.bottom - margin, point.y)),
  };
}

export function shouldArmLongPress(pointerType, button, activePointerCount) {
  return pointerType === "touch" && button === 0 && activePointerCount === 1;
}

export function shouldDeferTouchTool(pointerType, tool) {
  return pointerType === "touch" && ["glyph", "eraser"].includes(tool);
}

export function cloneActions(actions) {
  return actions.map((action) => ({
    ...action,
    points: action.points?.map((point) => ({ ...point })),
  }));
}
