function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function earthMoundPose(progress, options = {}) {
  const tableY = Number.isFinite(options.tableY) ? options.tableY : 0;
  const soleBottomY = Number.isFinite(options.soleBottomY) ? options.soleBottomY : tableY;
  const minimumHeight = Number.isFinite(options.minimumHeight) ? Math.max(0.001, options.minimumHeight) : 0.022;
  const maximumHeight = Number.isFinite(options.maximumHeight) ? Math.max(minimumHeight, options.maximumHeight) : 0.24;
  const clearance = Number.isFinite(options.clearance) ? Math.max(0, options.clearance) : 0.004;
  const normalized = clamp01(progress);
  const eased = 1 - Math.pow(1 - normalized, 3);
  const height = minimumHeight + (maximumHeight - minimumHeight) * eased;
  const bottomY = tableY;
  const topY = bottomY + height;
  return {
    bottomY,
    centerY: bottomY + height / 2,
    topY,
    height,
    clearance,
    shoeOffsetY: topY + clearance - soleBottomY,
  };
}

export function shoeSupportPose(progress, options = {}) {
  const normalized = clamp01(progress);
  const eased = 1 - Math.pow(1 - normalized, 3);
  const tableY = Number.isFinite(options.tableY) ? options.tableY : 0;
  const initialSoleBottomY = Number.isFinite(options.soleBottomY) ? options.soleBottomY : tableY + 0.056;
  const paperGap = Number.isFinite(options.paperGap) ? Math.max(0.002, options.paperGap) : 0.006;
  const inkLift = Number.isFinite(options.inkLift) ? Math.max(0, options.inkLift) : 0.0015;
  const deskEffectLift = Number.isFinite(options.deskEffectLift) ? Math.max(0, options.deskEffectLift) : 0.004;
  const carrierMaximumLift = Number.isFinite(options.carrierMaximumLift) ? Math.max(0, options.carrierMaximumLift) : 0.18;
  const effectIds = new Set(options.effectIds || []);
  const earth = effectIds.has("earth-grounded-growth")
    ? earthMoundPose(normalized, {
      tableY,
      soleBottomY: initialSoleBottomY,
      minimumHeight: options.earthMinimumHeight,
      maximumHeight: options.earthMaximumHeight,
      clearance: options.earthClearance,
    })
    : null;

  let carrierOffsetY = 0;
  if (earth) {
    carrierOffsetY = earth.shoeOffsetY;
  } else if (options.mode === "carrier-lift" || options.mode === "sylph-flight") {
    carrierOffsetY = carrierMaximumLift * eased;
  }

  const carrierY = carrierOffsetY;
  const soleBottomY = initialSoleBottomY + carrierOffsetY;
  const paperLocalY = initialSoleBottomY - paperGap;
  const paperY = carrierY + paperLocalY;
  const inkY = paperY + Math.min(inkLift, paperGap * 0.75);

  return {
    tableY,
    carrierY,
    carrierOffsetY,
    soleBottomY,
    paperLocalY,
    paperY,
    inkY,
    manifestationY: tableY + deskEffectLift,
    earth,
  };
}

export function shoeCameraPose() {
  return {
    position: { x: 1.45, y: 0.3, z: 1.5 },
    target: { x: 0, y: 0.59, z: 0 },
  };
}
