function clamp(value, minimum, maximum) {
  const finite = Number.isFinite(value) ? value : minimum;
  return Math.max(minimum, Math.min(maximum, finite));
}

function operationEntries(recipe) {
  const axes = Object.values(recipe?.axes || {}).flat();
  if (axes.length > 0) {
    return axes.flatMap(({ operation, count = 1 }) => Array.from({ length: count }, () => operation)).filter(Boolean);
  }
  return Object.values(recipe?.operations || {}).flat().filter(Boolean);
}

export function createScalewolfMotionProfile(recipe) {
  const operationList = operationEntries(recipe);
  const operationNames = new Set(operationList);
  const has = (...names) => names.some((name) => operationNames.has(name));
  const roleLoads = Object.freeze(Object.fromEntries(
    Object.entries(recipe?.axes || recipe?.operations || {}).map(([role, values]) => [
      role,
      values.reduce((total, value) => total + (Number(value?.count) || 1), 0),
    ]),
  ));
  const ignoredSigns = Object.freeze([...(recipe?.ignoredSigns || [])]);
  const ignoredCount = ignoredSigns.reduce(
    (total, signName) => total + (Number(recipe?.signCounts?.[signName]) || 1),
    0,
  );
  const parameters = recipe?.effectPlan?.parameters || {};
  const still = has("still");
  const speed = clamp(parameters.speed, 0, 2.4);
  const lift = clamp(parameters.lift, 0, 0.8);
  const pressure = clamp(parameters.pressure, 0, 1.6);
  const reach = clamp(parameters.reach, 0.55, 2.4);
  const focusAmount = clamp(parameters.focus, 0.55, 1.8);
  const repetition = clamp(parameters.repetition, 0, 3);
  const containment = clamp(parameters.containment, 0, 1.5);
  const spin = clamp(parameters.spin, -1.2, 1.2);

  return Object.freeze({
    operations: Object.freeze([...operationList]),
    roleLoads,
    ignoredSigns,
    ignoredCount,
    pace: still ? 0 : clamp(1.4 + speed * 3.4, 0.7, 6.2),
    stride: still ? 0 : clamp(0.1 + speed * 0.11 + (has("pull", "wind-modifier") ? 0.04 : 0), 0.08, 0.36),
    hover: has("lift", "float") ? clamp(0.2 + lift * 0.7, 0.2, 0.8) : 0,
    crouch: clamp(pressure * 0.08 + containment * 0.06 + (still ? 0.1 : 0), 0, 0.24),
    lunge: has("project", "bolt", "column", "burst")
      ? clamp(0.38 + speed * 0.16 + pressure * 0.12, 0.32, 1.2)
      : has("pull") ? 0.18 : 0,
    spin: has("coil") ? clamp(spin || 0.34, -1.2, 1.2) : spin,
    reach: clamp(reach + (has("depth", "region", "nearby", "resize") ? 0.18 : 0), 0.55, 2.4),
    focus: has("focus") ? clamp(1 + focusAmount * 0.14, 1.06, 1.4) : 1,
    powerScale: clamp(1 + (roleLoads.power || 0) * 0.08 + (roleLoads.form || 0) * 0.015, 1, 1.22),
    aura: clamp(0.18 + (roleLoads.supply || 0) * 0.1 + (roleLoads.state || 0) * 0.06 + (roleLoads.relation || 0) * 0.04, 0.18, 0.5),
    pulse: has("reflection") || repetition > 0 ? clamp(0.04 + repetition * 0.035, 0.04, 0.16) : 0,
    brace: still || has("strengthen", "solidify"),
    targetLock: has("aim", "crosshair"),
    linked: has("link", "bind", "entwine", "carrier", "puppet"),
    concealed: has("conceal"),
    supportLift: recipe?.supportId === "shoe" ? 0.08 : 0,
  });
}
