export const SIGIL_COMPOSITION_SLOTS = Object.freeze([
  Object.freeze({
    id: "center",
    kind: "sigil",
    labelKey: "composition.slot.center",
    stageX: 50,
    stageY: 50,
    distance: 0,
    angleDeg: 0,
    size: 30,
  }),
  Object.freeze({
    id: "north",
    kind: "sign",
    labelKey: "composition.slot.north",
    stageX: 50,
    stageY: 18,
    distance: 0.82,
    angleDeg: -90,
    size: 20,
  }),
  Object.freeze({
    id: "east",
    kind: "sign",
    labelKey: "composition.slot.east",
    stageX: 82,
    stageY: 50,
    distance: 0.82,
    angleDeg: 0,
    size: 20,
  }),
  Object.freeze({
    id: "south",
    kind: "sign",
    labelKey: "composition.slot.south",
    stageX: 50,
    stageY: 82,
    distance: 0.82,
    angleDeg: 90,
    size: 20,
  }),
  Object.freeze({
    id: "west",
    kind: "sign",
    labelKey: "composition.slot.west",
    stageX: 18,
    stageY: 50,
    distance: 0.82,
    angleDeg: 180,
    size: 20,
  }),
]);

export const DEFAULT_COMPOSITION_DIAMETER = 240;
export const MIN_COMPOSITION_DIAMETER = 80;

export function normalizeCompositionCircleSize(
  value,
  { min = MIN_COMPOSITION_DIAMETER, max = Number.POSITIVE_INFINITY } = {},
) {
  const lower = Math.max(1, Number(min) || MIN_COMPOSITION_DIAMETER);
  const upper = Math.max(lower, Number(max) || lower);
  const numeric = Number.isFinite(Number(value)) ? Number(value) : lower;
  return Math.round(Math.max(lower, Math.min(upper, numeric)));
}

function emptyCompositionSlots() {
  return Object.fromEntries(SIGIL_COMPOSITION_SLOTS.map((slot) => [slot.id, null]));
}

function actionCenter(action) {
  if (Number.isFinite(action?.cx) && Number.isFinite(action?.cy)) {
    return { x: action.cx, y: action.cy };
  }
  if (Number.isFinite(action?.x) && Number.isFinite(action?.y)) {
    return { x: action.x, y: action.y };
  }
  return null;
}

function distanceBetween(left, right) {
  return left && right ? Math.hypot(left.x - right.x, left.y - right.y) : Number.POSITIVE_INFINITY;
}

function slotForSign(center, point, slots) {
  const angle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
  const normalized = (angle + 360) % 360;
  const ordered = normalized >= 315 || normalized < 45
    ? ["east", "north", "south", "west"]
    : normalized < 135
      ? ["south", "east", "west", "north"]
      : normalized < 225
        ? ["west", "south", "north", "east"]
        : ["north", "west", "east", "south"];
  return ordered.find((slotId) => !slots[slotId]) || null;
}

export function createDefaultSigilComposition({
  width = 900,
  height = 600,
  diameter = DEFAULT_COMPOSITION_DIAMETER,
} = {}) {
  const safeWidth = Math.max(1, Number(width) || 900);
  const safeHeight = Math.max(1, Number(height) || 600);
  const maxDiameter = Math.max(MIN_COMPOSITION_DIAMETER, Math.min(safeWidth, safeHeight) * 0.82);
  const size = normalizeCompositionCircleSize(diameter, {
    min: MIN_COMPOSITION_DIAMETER,
    max: maxDiameter,
  });
  return {
    id: null,
    mode: "new",
    anchorIndex: null,
    center: { x: safeWidth / 2, y: safeHeight / 2 },
    radius: size / 2,
    diameter: size,
    rotation: 0,
    scale: 1,
    rings: [],
    sigils: [],
    signs: [],
    lines: [],
    slots: emptyCompositionSlots(),
    slotActionIndices: emptyCompositionSlots(),
  };
}

function isCircleAnchor(action) {
  return ["circle", "ring", "spiral"].includes(action?.type)
    && Number.isFinite(action?.cx)
    && Number.isFinite(action?.cy)
    && Number.isFinite(action?.radius);
}

function actionBelongsToAnchor(action, anchor, anchorIndex, actions) {
  if (!action || action === anchor) return false;
  if (action.sealId && anchor.sealId) return action.sealId === anchor.sealId;
  if (action.sealId && !anchor.sealId) return false;
  if (isCircleAnchor(action)) {
    return distanceBetween(actionCenter(action), actionCenter(anchor)) <= 4
      && action.radius <= anchor.radius * 1.08;
  }
  const center = actionCenter(action);
  if (action.type === "glyph" && center) {
    const tolerance = Math.max(10, Number(action.size) || 0);
    return distanceBetween(center, actionCenter(anchor)) <= anchor.radius + tolerance;
  }
  if (action.type === "free" && Array.isArray(action.points) && action.points.length > 0) {
    return action.points.every((point) => distanceBetween(point, actionCenter(anchor)) <= anchor.radius + 8);
  }
  return false;
}

export function extractSigilComposition({ actions = [], anchorIndex = -1 } = {}) {
  const anchor = actions[anchorIndex];
  if (!isCircleAnchor(anchor)) {
    return createDefaultSigilComposition();
  }
  const center = actionCenter(anchor);
  const slots = emptyCompositionSlots();
  const slotActionIndices = emptyCompositionSlots();
  const members = actions
    .map((action, index) => ({ action, index }))
    .filter(({ action, index }) => index === anchorIndex || actionBelongsToAnchor(action, anchor, anchorIndex, actions));
  const rings = members
    .filter(({ action }) => isCircleAnchor(action))
    .map(({ action, index }) => ({
      actionIndex: index,
      radius: action.radius,
      width: action.width,
      visible: action.visible !== false,
    }));
  const sigils = members
    .filter(({ action }) => action.type === "glyph" && action.kind === "sigil")
    .sort(({ action: left }, { action: right }) => distanceBetween(actionCenter(left), center) - distanceBetween(actionCenter(right), center))
    .map(({ action, index }) => ({
      actionIndex: index,
      name: action.element,
      x: action.x,
      y: action.y,
      size: action.size,
      rotation: action.rotation || 0,
      visible: action.visible !== false,
    }));
  const signs = members
    .filter(({ action }) => action.type === "glyph" && action.kind === "sign")
    .map(({ action, index }) => {
      const point = actionCenter(action);
      const radialDistance = distanceBetween(point, center);
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      return {
        actionIndex: index,
        name: action.element,
        x: action.x,
        y: action.y,
        size: action.size,
        rotation: action.rotation || 0,
        radialDistance,
        angle,
        visible: action.visible !== false,
      };
    });
  for (const sigil of sigils) {
    if (!slots.center) {
      slots.center = sigil.name;
      slotActionIndices.center = sigil.actionIndex;
    }
  }
  for (const sign of signs) {
    const slotId = slotForSign(center, { x: sign.x, y: sign.y }, slots);
    if (slotId) {
      slots[slotId] = sign.name;
      slotActionIndices[slotId] = sign.actionIndex;
    }
  }
  return {
    id: anchor.sealId || `seal-${anchorIndex + 1}`,
    mode: "existing",
    anchorIndex,
    center,
    radius: anchor.radius,
    diameter: anchor.radius * 2,
    rotation: anchor.rotation || 0,
    scale: 1,
    rings,
    sigils,
    signs,
    lines: members
      .filter(({ action }) => action.type === "free")
      .map(({ index, action }) => ({ actionIndex: index, visible: action.visible !== false })),
    slots,
    slotActionIndices,
  };
}

export function compositionSlotPoint(anchor, slot) {
  if (!anchor?.center || !slot) {
    return null;
  }
  if (slot.distance === 0) {
    return { x: anchor.center.x, y: anchor.center.y };
  }
  const angle = (slot.angleDeg * Math.PI) / 180;
  const distance = anchor.radius * slot.distance;
  return {
    x: Math.round(anchor.center.x + Math.cos(angle) * distance),
    y: Math.round(anchor.center.y + Math.sin(angle) * distance),
  };
}

export function buildSigilCompositionPlacements({ anchor, slots }) {
  const placements = [];
  if (!anchor?.center || !Number.isFinite(anchor.radius)) {
    return placements;
  }
  if (!anchor.hasSeal && slots?.center) {
    placements.push({
      type: "ring",
      slotId: "seal",
      x: anchor.center.x,
      y: anchor.center.y,
      radius: anchor.radius,
    });
  }
  for (const slot of SIGIL_COMPOSITION_SLOTS) {
    const name = slots?.[slot.id];
    if (!name) continue;
    const point = compositionSlotPoint(anchor, slot);
    if (!point) continue;
    placements.push({
      type: "glyph",
      slotId: slot.id,
      name,
      kind: slot.kind,
      x: point.x,
      y: point.y,
      size: slot.size,
    });
  }
  return placements;
}

export function buildSigilCompositionCommitPlan({ draft, slots }) {
  const placements = buildSigilCompositionPlacements({
    anchor: {
      center: draft?.center,
      radius: draft?.radius,
      hasSeal: draft?.mode === "existing",
    },
    slots,
  }).map((placement) => placement.type === "glyph"
    ? { ...placement, position: { x: placement.x, y: placement.y } }
    : placement);
  return {
    mode: draft?.mode || "new",
    anchorIndex: Number.isInteger(draft?.anchorIndex) ? draft.anchorIndex : null,
    center: draft?.center || null,
    radius: draft?.radius || 0,
    placements,
  };
}
