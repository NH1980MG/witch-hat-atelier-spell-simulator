export const MIN_GLYPH_SIZE = 12;
export const MAX_GLYPH_SIZE = 120;

export function resizeGlyphSize(size, direction) {
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

export function cloneActions(actions) {
  return actions.map((action) => ({
    ...action,
    points: action.points?.map((point) => ({ ...point })),
  }));
}
