function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}

const REACTION_VISUALS = Object.freeze({
  pushed: { kind: "impact", color: "#d4b26d", source: "motion" },
  heated: { kind: "heat-haze", color: "#ef9c52", source: "heatExposure" },
  scorched: { kind: "scorch", color: "#5c2f24", source: "heatExposure" },
  burning: { kind: "flame", color: "#ff6a2a", source: "heatExposure" },
  wet: { kind: "water", color: "#58b8d8", source: "wetness" },
  extinguished: { kind: "steam", color: "#d7e9e6", source: "wetness" },
  frosted: { kind: "frost", color: "#b9e8f5", source: "crystalExposure" },
  crystallized: { kind: "crystal", color: "#91d9f4", source: "crystalExposure" },
  damped: { kind: "drag", color: "#927143", source: "adhesion" },
  stuck: { kind: "adhesion", color: "#6f552f", source: "adhesion" },
  loaded: { kind: "weight", color: "#50463a", source: "adhesion" },
  illuminated: { kind: "light", color: "#ffe385", source: "illumination" },
  restored: { kind: "restore", color: "#a6db9d", source: "restoration" },
});

export function reactionVisualProfile(snapshot = {}) {
  const state = String(snapshot.reactionState || "idle");
  const visual = REACTION_VISUALS[state];
  if (!visual) return null;
  const raw = visual.source === "motion"
    ? 0.5
    : visual.source === "restoration"
      ? 0.75
      : snapshot[visual.source];
  return Object.freeze({
    state,
    kind: visual.kind,
    color: visual.color,
    intensity: clamp(0.15 + clamp(raw) * 0.85, 0.15, 1),
  });
}

export const CAMERA_MODES = Object.freeze(["orbit", "tabletop", "firstPerson", "photo"]);

const INTERIOR_CAMERAS = Object.freeze({
  orbit: { position: [0, 4.2, 7.2], target: [0, 0.65, 0], fov: 48 },
  tabletop: { position: [0, 1.15, 5.6], target: [0, 0.35, 0], fov: 52 },
  firstPerson: { position: [0, 1.62, 3.9], target: [0, 0.72, 0], fov: 64 },
  photo: { position: [0, 7.8, 0.15], target: [0, 0, 0], fov: 34 },
});

const EXTERIOR_CAMERAS = Object.freeze({
  orbit: { position: [0, 6.8, 10.8], target: [0, 0.7, 0], fov: 48 },
  tabletop: { position: [0, 2.4, 9.4], target: [0, 0.45, 0], fov: 54 },
  firstPerson: { position: [0, 1.72, 7.2], target: [0, 0.8, 0], fov: 66 },
  photo: { position: [0, 14.5, 0.2], target: [0, 0, 0], fov: 38 },
});

export function cameraPreset(mode = "orbit", environment = "interior") {
  const safeMode = CAMERA_MODES.includes(mode) ? mode : "orbit";
  const source = environment === "exterior" ? EXTERIOR_CAMERAS : INTERIOR_CAMERAS;
  const preset = source[safeMode];
  return Object.freeze({
    mode: safeMode,
    position: Object.freeze([...preset.position]),
    target: Object.freeze([...preset.target]),
    fov: preset.fov,
  });
}

export function nextCameraMode(mode) {
  const index = CAMERA_MODES.indexOf(mode);
  return CAMERA_MODES[(index + 1) % CAMERA_MODES.length] || "orbit";
}

export function canManipulateTarget(target) {
  return Boolean(target && target.anchored === false);
}

export const WORKSHOP_EXPERIMENTS = Object.freeze([
  Object.freeze({ id: "extinguish", titleKey: "atelier.experiment.extinguish", targetKind: "candle" }),
  Object.freeze({ id: "lift", titleKey: "atelier.experiment.lift", targetKind: "stone" }),
  Object.freeze({ id: "protect", titleKey: "atelier.experiment.protect", targetKind: "plant" }),
  Object.freeze({ id: "restore", titleKey: "atelier.experiment.restore", targetKind: "book" }),
]);

function experimentComplete(experiment, targets) {
  const candidates = targets.filter((target) => target.kind === experiment.targetKind);
  if (experiment.id === "extinguish") {
    return candidates.some((target) => target.reactionState === "extinguished");
  }
  if (experiment.id === "lift") {
    return candidates.some((target) => (
      Number(target.position?.y || 0) - Number(target.initialPosition?.y || 0) >= 0.35
    ));
  }
  if (experiment.id === "protect") {
    return candidates.some((target) => ["wet", "frosted", "crystallized", "restored"].includes(target.reactionState));
  }
  return candidates.some((target) => target.reactionState === "restored");
}

export function evaluateWorkshopExperiments(targets = []) {
  const safeTargets = Array.isArray(targets) ? targets : [];
  return WORKSHOP_EXPERIMENTS.map((experiment) => Object.freeze({
    ...experiment,
    complete: experimentComplete(experiment, safeTargets),
  }));
}
