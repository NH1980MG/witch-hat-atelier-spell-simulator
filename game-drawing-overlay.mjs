const DEFAULT_MAX_POINTS = 256;
const DEFAULT_MAX_STROKES = 12;

function clone(value) {
  return value === undefined || value === null ? value : JSON.parse(JSON.stringify(value));
}

function boundedPoint(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

function idleResult(spell, reason) {
  return { accepted: false, spell: clone(spell), reason };
}

export function createDrawingSession(options = {}) {
  const maxPoints = Math.max(2, Math.floor(Number(options.maxPoints) || DEFAULT_MAX_POINTS));
  const maxStrokes = Math.max(1, Math.floor(Number(options.maxStrokes) || DEFAULT_MAX_STROKES));
  const previousSpell = clone(options.previousSpell) || null;
  let activeSpell = clone(previousSpell);
  let points = [];
  let strokeCount = 0;
  let currentStroke = [];
  let status = "idle";
  let disposed = false;

  function beginDrawing() {
    if (disposed) return idleResult(activeSpell, "disposed");
    points = [];
    strokeCount = 0;
    currentStroke = [];
    status = "drawing";
    return { accepted: true, points: [] };
  }

  function beginStroke(point) {
    if (disposed) return idleResult(activeSpell, "disposed");
    if (status !== "drawing") return idleResult(activeSpell, "not-drawing");
    if (strokeCount >= maxStrokes || currentStroke.length > 0) {
      return { accepted: false, reason: "stroke-limit", points: clone(points) };
    }
    const bounded = boundedPoint(point);
    if (!bounded) return { accepted: false, reason: "invalid-point", points: clone(points) };
    currentStroke = [bounded];
    return { accepted: true, points: clone(points), currentStroke: clone(currentStroke) };
  }

  function appendStrokePoint(point) {
    if (disposed) return idleResult(activeSpell, "disposed");
    if (status !== "drawing") return idleResult(activeSpell, "not-drawing");
    if (currentStroke.length === 0) return { accepted: false, reason: "stroke-not-started" };
    if (points.length + currentStroke.length >= maxPoints) {
      return { accepted: false, reason: "point-limit", points: clone(points), currentStroke: clone(currentStroke) };
    }
    const bounded = boundedPoint(point);
    if (!bounded) return { accepted: false, reason: "invalid-point", points: clone(points), currentStroke: clone(currentStroke) };
    currentStroke.push(bounded);
    return { accepted: true, points: clone(points), currentStroke: clone(currentStroke) };
  }

  function endStroke() {
    if (disposed) return idleResult(activeSpell, "disposed");
    if (status !== "drawing") return idleResult(activeSpell, "not-drawing");
    if (currentStroke.length === 0) return { accepted: false, reason: "stroke-not-started", points: clone(points) };
    points.push(...currentStroke.slice(0, Math.max(0, maxPoints - points.length)));
    strokeCount += 1;
    currentStroke = [];
    return { accepted: true, points: clone(points), strokeCount };
  }

  function appendDrawingStroke(stroke) {
    if (disposed) return idleResult(activeSpell, "disposed");
    if (status !== "drawing") return idleResult(activeSpell, "not-drawing");
    if (!Array.isArray(stroke) || strokeCount >= maxStrokes) {
      return { accepted: false, reason: "stroke-limit", points: clone(points) };
    }

    strokeCount += 1;
    for (const point of stroke) {
      if (points.length >= maxPoints) break;
      const bounded = boundedPoint(point);
      if (bounded) points.push(bounded);
    }
    return { accepted: true, points: clone(points) };
  }

  function completeDrawing() {
    if (disposed) return idleResult(activeSpell, "disposed");
    if (status !== "drawing") return idleResult(activeSpell, "not-drawing");
    if (currentStroke.length > 0) endStroke();
    if (points.length < 2) {
      status = "idle";
      return { ...idleResult(activeSpell, "insufficient-points"), points: clone(points) };
    }

    const completedPoints = clone(points);
    activeSpell = {
      id: "drawn-spell",
      name: "Sort dessiné",
      actions: [{ type: "stroke", points: completedPoints }],
    };
    status = "idle";
    return { accepted: true, points: completedPoints, spell: clone(activeSpell) };
  }

  function cancelDrawing(reason = "cancelled") {
    if (disposed) return idleResult(activeSpell, "disposed");
    points = [];
    strokeCount = 0;
    currentStroke = [];
    status = "idle";
    return idleResult(activeSpell, reason);
  }

  return {
    beginDrawing,
    beginStroke,
    appendStrokePoint,
    endStroke,
    appendDrawingStroke,
    completeDrawing,
    cancelDrawing,
    getSnapshot() {
      return { status, points: clone(points), strokeCount, currentStroke: clone(currentStroke), spell: clone(activeSpell) };
    },
    dispose() {
      points = [];
      strokeCount = 0;
      currentStroke = [];
      status = "idle";
      disposed = true;
    },
  };
}
