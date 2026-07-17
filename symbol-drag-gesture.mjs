const TOUCH_DRAG_THRESHOLD = 10;

export function classifySymbolDragGesture(pointerType, deltaX, deltaY) {
  if (pointerType !== "touch") {
    return "drag";
  }

  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  if (Math.hypot(horizontalDistance, verticalDistance) < TOUCH_DRAG_THRESHOLD) {
    return "pending";
  }

  return verticalDistance > horizontalDistance ? "scroll" : "drag";
}
