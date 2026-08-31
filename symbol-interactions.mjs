export const MIN_GLYPH_SIZE = 12;
export const GLYPH_SELECTION_SCALE = 1.18;
export const MIN_GUIDE_SCALE = 0.25;

export function scaledGuideBounds(bounds, scale = 1) {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const width = Math.max(1, bounds.width) * scale;
  const height = Math.max(1, bounds.height) * scale;
  return {
    left: centerX - width / 2,
    right: centerX + width / 2,
    top: centerY - height / 2,
    bottom: centerY + height / 2,
    width,
    height,
  };
}

export function guideResizeHandleAtPoint(bounds, point, tolerance = 10) {
  const handles = [
    ["nw", bounds.left, bounds.top],
    ["ne", bounds.right, bounds.top],
    ["se", bounds.right, bounds.bottom],
    ["sw", bounds.left, bounds.bottom],
  ];
  return handles.find(([, x, y]) => Math.hypot(point.x - x, point.y - y) <= tolerance)?.[0] || null;
}

export function resizeGuideScaleFromCorner(baseBounds, point) {
  const centerX = (baseBounds.left + baseBounds.right) / 2;
  const centerY = (baseBounds.top + baseBounds.bottom) / 2;
  const halfWidth = Math.max(0.5, baseBounds.width / 2);
  const halfHeight = Math.max(0.5, baseBounds.height / 2);
  const scale = Math.max(
    Math.abs(point.x - centerX) / halfWidth,
    Math.abs(point.y - centerY) / halfHeight,
  );
  return Math.max(MIN_GUIDE_SCALE, Math.round(scale * 100) / 100);
}

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
  return Math.max(MIN_GLYPH_SIZE, Math.round(nextSize * 10) / 10);
}

export function resizeGlyphSize(size, direction) {
  if (!["grow", "shrink"].includes(direction)) {
    throw new TypeError("Unknown resize direction");
  }
  const factor = direction === "shrink" ? 0.9 : 1.1;
  const nextSize = Math.round(size * factor * 10) / 10;
  return Math.max(MIN_GLYPH_SIZE, nextSize);
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

export function isSelectableAction(action) {
  return ["glyph", "circle", "ring", "free", "ray", "spiral", "annotation"].includes(action?.type);
}

function stableCoordinate(value) {
  return Math.round(value * 10_000) / 10_000;
}

export function selectableActionBounds(action) {
  if (!isSelectableAction(action)) {
    return null;
  }
  if (action.type === "glyph") {
    const half = action.size * GLYPH_SELECTION_SCALE;
    return {
      left: stableCoordinate(action.x - half),
      right: stableCoordinate(action.x + half),
      top: stableCoordinate(action.y - half),
      bottom: stableCoordinate(action.y + half),
      width: stableCoordinate(half * 2),
      height: stableCoordinate(half * 2),
    };
  }
  if (action.type === "free" || (action.type === "annotation" && action.kind === "drawing")) {
    if (!Array.isArray(action.points) || action.points.length === 0) {
      return null;
    }
    const xs = action.points.map((point) => point.x);
    const ys = action.points.map((point) => point.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    return {
      left: stableCoordinate(left),
      right: stableCoordinate(right),
      top: stableCoordinate(top),
      bottom: stableCoordinate(bottom),
      width: stableCoordinate(right - left),
      height: stableCoordinate(bottom - top),
    };
  }
  if (action.type === "annotation" && action.kind === "text") {
    const size = Math.max(12, Number(action.size) || 18);
    const width = Math.max(size, String(action.text || "").length * size * 0.58);
    return {
      left: stableCoordinate(action.x),
      right: stableCoordinate(action.x + width),
      top: stableCoordinate(action.y - size),
      bottom: stableCoordinate(action.y + size * 0.25),
      width: stableCoordinate(width),
      height: stableCoordinate(size * 1.25),
    };
  }
  if (action.type === "ray") {
    const left = Math.min(action.cx, action.x);
    const right = Math.max(action.cx, action.x);
    const top = Math.min(action.cy, action.y);
    const bottom = Math.max(action.cy, action.y);
    return {
      left: stableCoordinate(left),
      right: stableCoordinate(right),
      top: stableCoordinate(top),
      bottom: stableCoordinate(bottom),
      width: stableCoordinate(right - left),
      height: stableCoordinate(bottom - top),
    };
  }
  return {
    left: action.cx - action.radius,
    right: action.cx + action.radius,
    top: action.cy - action.radius,
    bottom: action.cy + action.radius,
    width: action.radius * 2,
    height: action.radius * 2,
  };
}

function normalizedBounds(bounds) {
  const left = Math.min(bounds.left, bounds.right);
  const right = Math.max(bounds.left, bounds.right);
  const top = Math.min(bounds.top, bounds.bottom);
  const bottom = Math.max(bounds.top, bounds.bottom);
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

export function boundsIntersect(first, second) {
  const a = normalizedBounds(first);
  const b = normalizedBounds(second);
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function combinedSelectionBounds(actions, indices) {
  const bounds = [...new Set(indices)]
    .map((index) => selectableActionBounds(actions[index]))
    .filter(Boolean);
  if (bounds.length === 0) {
    return null;
  }
  const left = Math.min(...bounds.map((item) => item.left));
  const right = Math.max(...bounds.map((item) => item.right));
  const top = Math.min(...bounds.map((item) => item.top));
  const bottom = Math.max(...bounds.map((item) => item.bottom));
  return {
    left,
    right,
    top,
    bottom,
    width: stableCoordinate(right - left),
    height: stableCoordinate(bottom - top),
  };
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function topmostSelectableIndexAtPoint(actions, point, padding = 10) {
  for (let index = actions.length - 1; index >= 0; index -= 1) {
    const action = actions[index];
    if (!isSelectableAction(action)) {
      continue;
    }
    if (action.type === "glyph") {
      const local = pointInGlyphSpace(action, point);
      const half = action.size * GLYPH_SELECTION_SCALE + padding;
      if (Math.abs(local.x) <= half && Math.abs(local.y) <= half) {
        return index;
      }
      continue;
    }
    if (action.type === "free" || (action.type === "annotation" && action.kind === "drawing")) {
      const points = Array.isArray(action.points) ? action.points : [];
      if (points.length === 1 && Math.hypot(point.x - points[0].x, point.y - points[0].y) <= padding) {
        return index;
      }
      const hit = points.some((start, pointIndex) => {
        if (pointIndex === points.length - 1) return false;
        return distanceToSegment(point, start, points[pointIndex + 1]) <= padding;
      });
      if (hit) {
        return index;
      }
      continue;
    }
    if (action.type === "annotation" && action.kind === "text") {
      const bounds = selectableActionBounds(action);
      if (bounds && point.x >= bounds.left - padding && point.x <= bounds.right + padding &&
        point.y >= bounds.top - padding && point.y <= bounds.bottom + padding) {
        return index;
      }
      continue;
    }
    if (action.type === "ray") {
      if (distanceToSegment(point, { x: action.cx, y: action.cy }, { x: action.x, y: action.y }) <= padding) {
        return index;
      }
      continue;
    }
    // circle, ring, spiral — le clic ne touche que le bord extérieur
    const ringDistance = Math.abs(Math.hypot(point.x - action.cx, point.y - action.cy) - action.radius);
    if (ringDistance <= padding) {
      return index;
    }
  }
  return -1;
}

export function selectableIndicesInRect(actions, rect) {
  const selectionBounds = normalizedBounds(rect);
  return actions
    .map((action, index) => ({ index, bounds: selectableActionBounds(action) }))
    .filter(({ bounds }) => bounds && boundsIntersect(bounds, selectionBounds))
    .map(({ index }) => index);
}

export function translateSelectedActions(actions, indices, dx, dy) {
  const selected = new Set(indices);
  return cloneActions(actions).map((action, index) => {
    if (!selected.has(index) || !isSelectableAction(action)) {
      return action;
    }
    if (action.type === "glyph") {
      action.x += dx;
      action.y += dy;
    } else if (action.type === "free" || (action.type === "annotation" && action.kind === "drawing")) {
      action.points = action.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    } else if (action.type === "annotation" && action.kind === "text") {
      action.x += dx;
      action.y += dy;
    } else if (action.type === "ray") {
      action.cx += dx;
      action.cy += dy;
      action.x += dx;
      action.y += dy;
    } else {
      action.cx += dx;
      action.cy += dy;
    }
    return action;
  });
}

function snapOneAxis(value, targets, threshold) {
  let closest = value;
  let closestDistance = Infinity;
  for (const target of targets) {
    const distance = Math.abs(target - value);
    if (distance < closestDistance) {
      closest = target;
      closestDistance = distance;
    }
  }
  return closestDistance <= threshold ? closest : value;
}

export function snapDeltaForSelection(actions, indices, dx, dy, {
  enabled = false,
  gridSize = 34,
  canvasWidth = 0,
  canvasHeight = 0,
  threshold = 6,
} = {}) {
  if (!enabled) {
    return { dx, dy, snappedX: false, snappedY: false };
  }
  const bounds = combinedSelectionBounds(actions, indices);
  if (!bounds) {
    return { dx, dy, snappedX: false, snappedY: false };
  }
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const targetsX = [];
  const targetsY = [];

  if (Number.isFinite(gridSize) && gridSize > 0) {
    for (let x = 0; x <= canvasWidth; x += gridSize) targetsX.push(x);
    for (let y = 0; y <= canvasHeight; y += gridSize) targetsY.push(y);
  }
  if (canvasWidth > 0) targetsX.push(canvasWidth / 2);
  if (canvasHeight > 0) targetsY.push(canvasHeight / 2);

  const nextX = centerX + dx;
  const nextY = centerY + dy;
  const snappedCenterX = snapOneAxis(nextX, targetsX, threshold);
  const snappedCenterY = snapOneAxis(nextY, targetsY, threshold);
  return {
    dx: stableCoordinate(snappedCenterX - centerX),
    dy: stableCoordinate(snappedCenterY - centerY),
    snappedX: snappedCenterX !== nextX,
    snappedY: snappedCenterY !== nextY,
  };
}

export function planDuplication(actions, indices, dx, dy) {
  const ordered = [...indices].sort((a, b) => a - b);
  if (ordered.length === 0 || (dx === 0 && dy === 0)) {
    return { actions, indices: [] };
  }
  const copies = cloneActions(ordered.map((index) => actions[index]));
  const appended = [...actions, ...copies];
  const appendedIndices = copies.map((_, offset) => actions.length + offset);
  return {
    actions: translateSelectedActions(appended, appendedIndices, dx, dy),
    indices: appendedIndices,
  };
}

export function reorderSelectedActions(actions, indices, placement) {
  if (!["front", "back"].includes(placement)) {
    throw new TypeError("Unknown layer placement");
  }
  const selected = new Set(indices.filter((index) => index >= 0 && index < actions.length));
  const picked = actions.filter((_, index) => selected.has(index));
  const remaining = actions.filter((_, index) => !selected.has(index));
  const ordered = placement === "front" ? [...remaining, ...picked] : [...picked, ...remaining];
  const start = placement === "front" ? remaining.length : 0;
  return {
    actions: ordered,
    indices: picked.map((_, index) => start + index),
  };
}

export function scaleSelectedActions(actions, indices, origin, scale) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new TypeError("A finite positive selection scale is required");
  }
  const selected = new Set(indices);
  return cloneActions(actions).map((action, index) => {
    if (!selected.has(index) || !isSelectableAction(action)) {
      return action;
    }
    if (action.type === "glyph") {
      action.x = origin.x + (action.x - origin.x) * scale;
      action.y = origin.y + (action.y - origin.y) * scale;
      action.size = Math.max(MIN_GLYPH_SIZE, action.size * scale);
      action.userAdjusted = true;
    } else if (action.type === "free" || (action.type === "annotation" && action.kind === "drawing")) {
      action.points = action.points.map((point) => ({
        x: origin.x + (point.x - origin.x) * scale,
        y: origin.y + (point.y - origin.y) * scale,
      }));
    } else if (action.type === "annotation" && action.kind === "text") {
      action.x = origin.x + (action.x - origin.x) * scale;
      action.y = origin.y + (action.y - origin.y) * scale;
      action.size = Math.max(MIN_GLYPH_SIZE, (Number(action.size) || 18) * scale);
    } else if (action.type === "ray") {
      action.cx = origin.x + (action.cx - origin.x) * scale;
      action.cy = origin.y + (action.cy - origin.y) * scale;
      action.x = origin.x + (action.x - origin.x) * scale;
      action.y = origin.y + (action.y - origin.y) * scale;
    } else {
      action.cx = origin.x + (action.cx - origin.x) * scale;
      action.cy = origin.y + (action.cy - origin.y) * scale;
      action.radius = Math.max(1, action.radius * scale);
    }
    return action;
  });
}

export function styleSelectedActions(actions, indices, style) {
  if (style.width !== undefined && (!Number.isFinite(style.width) || style.width <= 0)) {
    throw new TypeError("A finite positive selection width is required");
  }
  if (style.color !== undefined && !/^#[0-9a-f]{6}$/i.test(style.color)) {
    throw new TypeError("A six-digit hexadecimal selection color is required");
  }
  if (style.fontWeight !== undefined && (!Number.isFinite(style.fontWeight) || style.fontWeight < 300 || style.fontWeight > 900)) {
    throw new TypeError("A bounded annotation font weight is required");
  }
  const selected = new Set(indices);
  return cloneActions(actions).map((action, index) => {
    if (!selected.has(index) || !isSelectableAction(action)) {
      return action;
    }
    if (style.width !== undefined) action.width = style.width;
    if (style.color !== undefined) action.color = style.color;
    if (style.fontWeight !== undefined && action.type === "annotation" && action.kind === "text") {
      action.fontWeight = Math.round(style.fontWeight / 100) * 100;
    }
    return action;
  });
}

export function rotateSelectedActions(actions, indices, origin, angleDelta) {
  if (!Number.isFinite(angleDelta)) {
    throw new TypeError("A finite rotation angle is required");
  }
  const selected = new Set(indices);
  const cosine = Math.cos(angleDelta);
  const sine = Math.sin(angleDelta);
  const rotate = (x, y) => ({
    x: origin.x + (x - origin.x) * cosine - (y - origin.y) * sine,
    y: origin.y + (x - origin.x) * sine + (y - origin.y) * cosine,
  });
  return cloneActions(actions).map((action, index) => {
    if (!selected.has(index) || !isSelectableAction(action)) {
      return action;
    }
    action.rotation = (Number(action.rotation) || 0) + angleDelta;
    if (action.type === "glyph") {
      const position = rotate(action.x, action.y);
      action.x = position.x;
      action.y = position.y;
      action.userAdjusted = true;
    } else if (action.type === "free" || (action.type === "annotation" && action.kind === "drawing")) {
      action.points = action.points.map((point) => rotate(point.x, point.y));
    } else if (action.type === "annotation" && action.kind === "text") {
      const position = rotate(action.x, action.y);
      action.x = position.x;
      action.y = position.y;
    } else if (action.type === "ray") {
      const center = rotate(action.cx, action.cy);
      const tip = rotate(action.x, action.y);
      action.cx = center.x;
      action.cy = center.y;
      action.x = tip.x;
      action.y = tip.y;
    } else {
      // circle, ring, spiral — seul le centre tourne (groupe rigide)
      const center = rotate(action.cx, action.cy);
      action.cx = center.x;
      action.cy = center.y;
    }
    return action;
  });
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

export function isDoubleTap(previous, current, maxDelay = 360, maxDistance = 24) {
  if (!previous || !current) return false;
  const delay = current.time - previous.time;
  return delay >= 0 && delay <= maxDelay && Math.hypot(current.x - previous.x, current.y - previous.y) <= maxDistance;
}

export function shouldDeferTouchTool(pointerType, tool) {
  return pointerType === "touch" && ["glyph", "eraser"].includes(tool);
}

export function cloneActions(actions) {
  return actions.map((action) => {
    const clone = { ...action };
    if (action.points) {
      clone.points = action.points.map((point) => ({ ...point }));
    }
    return clone;
  });
}
