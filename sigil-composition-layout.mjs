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
