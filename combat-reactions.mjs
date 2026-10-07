function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function nonNegativeNumber(value, label) {
  finiteNumber(value, label);
  if (value < 0) throw new RangeError(`${label} must be non-negative`);
  return value;
}

function cloneReactionState(state) {
  return {
    ...state,
    statuses: state.statuses.map((status) => ({ ...status })),
    events: state.events.map((event) => ({ ...event })),
  };
}

export function createReactionState({ maxAffectedObjects = 32 } = {}) {
  nonNegativeNumber(maxAffectedObjects, "maxAffectedObjects");
  return { time: 0, maxAffectedObjects, statuses: [], events: [] };
}

function setStatus(state, status) {
  state.statuses = state.statuses.filter((entry) => !(entry.targetId === status.targetId && entry.type === status.type));
  state.statuses.push(status);
}

export function applyMaterialReaction(state, { sourceId, material, targetIds = [], duration = 0, radius = 0, impulse = 0 } = {}) {
  if (typeof sourceId !== "string" || !sourceId) throw new TypeError("sourceId must be a non-empty string");
  if (typeof material !== "string" || !material) throw new TypeError("material must be a non-empty string");
  if (!Array.isArray(targetIds)) throw new TypeError("targetIds must be an array");
  nonNegativeNumber(duration, "duration");
  nonNegativeNumber(radius, "radius");
  nonNegativeNumber(impulse, "impulse");
  const next = cloneReactionState(state);
  const boundedTargets = [...new Set(targetIds.filter((id) => typeof id === "string" && id))].slice(0, next.maxAffectedObjects);
  for (const targetId of boundedTargets) {
    const expiresAt = next.time + duration;
    if (material === "fire") {
      setStatus(next, { type: "ignite", sourceId, targetId, startedAt: next.time, expiresAt });
      next.events.push({ type: "ignite", sourceId, targetId, radius, time: next.time });
    } else if (material === "water") {
      const wasIgnited = next.statuses.some((status) => status.type === "ignite" && status.targetId === targetId);
      next.statuses = next.statuses.filter((status) => !(status.targetId === targetId && status.type === "ignite"));
      if (wasIgnited) next.events.push({ type: "extinguish", sourceId, targetId, time: next.time });
      setStatus(next, { type: "wet", sourceId, targetId, startedAt: next.time, expiresAt });
      next.events.push({ type: "wet", sourceId, targetId, time: next.time });
    } else if (material === "crystal") {
      setStatus(next, { type: "crystallize", sourceId, targetId, startedAt: next.time, expiresAt });
      next.events.push({ type: "crystallize", sourceId, targetId, time: next.time });
    } else if (material === "fracture") {
      next.statuses = next.statuses.filter((status) => !(status.type === "crystallize" && status.targetId === targetId));
      next.events.push({ type: "fracture", sourceId, targetId, time: next.time });
    } else if (material === "wind") {
      setStatus(next, { type: "push", sourceId, targetId, impulse, startedAt: next.time, expiresAt });
      next.events.push({ type: "push", sourceId, targetId, impulse, time: next.time });
    } else {
      throw new RangeError(`Unsupported material reaction: ${material}`);
    }
  }
  return next;
}

export function advanceReactionState(state, delta) {
  nonNegativeNumber(delta, "delta");
  const next = cloneReactionState(state);
  next.time += delta;
  next.statuses = next.statuses.filter((status) => status.expiresAt > next.time);
  return next;
}
