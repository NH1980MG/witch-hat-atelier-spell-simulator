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
