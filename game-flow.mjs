export const GAME_PHASES = Object.freeze([
  "preparation",
  "ready-check",
  "countdown",
  "combat",
  "drawing-overlay",
  "spell-resolution",
  "victory",
  "defeat",
]);

const DEFAULT_DRAWING_SLOWDOWN = 40;

function clone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function normalizeMatchSettings(input = {}) {
  const raw = Number(input.drawingSlowdown);
  const drawingSlowdown = Number.isFinite(raw)
    ? Math.round(Math.max(0, Math.min(80, raw)))
    : DEFAULT_DRAWING_SLOWDOWN;

  return {
    drawingSlowdown,
    drawingTimeScale: Number((1 - drawingSlowdown / 100).toFixed(2)),
  };
}

export function createGameFlow(options = {}) {
  return {
    phase: "preparation",
    settings: normalizeMatchSettings(options.settings),
    customSpell: clone(options.customSpell) || null,
  };
}

function nextState(state, phase, event = {}) {
  return {
    ...state,
    phase,
    ...(event.customSpell !== undefined ? { customSpell: clone(event.customSpell) } : {}),
  };
}

function invalid(state) {
  return { accepted: false, state, reason: "invalid-phase" };
}

export function transitionGameFlow(state, event = {}) {
  if (!state || !GAME_PHASES.includes(state.phase)) {
    return { accepted: false, state, reason: "invalid-state" };
  }

  const type = event.type;
  if (type === "reset") {
    return { accepted: true, state: nextState(state, "preparation"), reason: "reset" };
  }

  const transitions = {
    preparation: { ready: "ready-check" },
    "ready-check": { "countdown-start": "countdown" },
    countdown: { "countdown-complete": "combat" },
    combat: { "open-drawing": "drawing-overlay" },
    "drawing-overlay": {
      "drawing-complete": "spell-resolution",
      "drawing-cancelled": "combat",
      interrupted: "combat",
    },
    "spell-resolution": { "resolution-complete": "combat" },
    victory: {},
    defeat: {},
  };

  const phaseTransitions = transitions[state.phase] || {};
  if (!Object.prototype.hasOwnProperty.call(phaseTransitions, type)) return invalid(state);

  return {
    accepted: true,
    state: nextState(state, phaseTransitions[type], event),
    reason: type,
  };
}

export function drawingTimeScale(state) {
  if (state?.phase !== "drawing-overlay") return 1;
  const scale = Number(state.settings?.drawingTimeScale);
  return Number.isFinite(scale) ? Math.max(0.2, Math.min(1, scale)) : 0.6;
}
