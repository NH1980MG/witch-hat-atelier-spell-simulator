const COMPOSITION_VERSION = 1;

const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positiveOr = (value, fallback) => Math.max(1, finiteOr(value, fallback));
const clone = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

function actionCenter(action) {
  if (Number.isFinite(action?.cx) && Number.isFinite(action?.cy)) {
    return { x: action.cx, y: action.cy };
  }
  if (Number.isFinite(action?.x) && Number.isFinite(action?.y)) {
    return { x: action.x, y: action.y };
  }
  return null;
}

function isRingAction(action) {
  return ["circle", "ring", "spiral"].includes(action?.type)
    && Number.isFinite(action?.cx)
    && Number.isFinite(action?.cy)
    && Number.isFinite(action?.radius);
}

function distance(left, right) {
  return left && right ? Math.hypot(left.x - right.x, left.y - right.y) : Number.POSITIVE_INFINITY;
}

function belongsToSeal(action, anchor, actionIndex, anchorIndex) {
  if (!action || actionIndex === anchorIndex) return true;
  if (action.sealId && anchor.sealId) return action.sealId === anchor.sealId;
  if (action.sealId && !anchor.sealId) return false;
  if (isRingAction(action)) {
    return distance(actionCenter(action), actionCenter(anchor)) <= 4
      && action.radius <= anchor.radius * 1.08;
  }
  const center = actionCenter(action);
  if (action.type === "glyph" && center) {
    return distance(center, actionCenter(anchor)) <= anchor.radius + Math.max(10, Number(action.size) || 0);
  }
  if (action.type === "free" && Array.isArray(action.points) && action.points.length > 0) {
    return action.points.every((point) => distance(point, actionCenter(anchor)) <= anchor.radius + 8);
  }
  return false;
}

function sourceAware(item, sourceAction, sourceIndex) {
  return {
    ...item,
    sourceIndex,
    ...(sourceAction ? { sourceAction: clone(sourceAction) } : {}),
  };
}

function ringFromAction(action, sourceIndex) {
  return sourceAware({
    id: action.id || `ring-${sourceIndex + 1}`,
    type: "ring",
    visible: action.visible !== false,
    name: action.name || "",
    color: action.color || "#201a16",
    filled: action.filled === true,
    radius: positiveOr(action.radius, 1),
    lineWeight: positiveOr(action.width, 1),
    openingSize: finiteOr(action.openingSize, 0),
    openingAngle: finiteOr(action.openingAngle, 0),
    offsetX: finiteOr(action.offsetX, 0),
    offsetY: finiteOr(action.offsetY, 0),
  }, action, sourceIndex);
}

function sigilFromAction(action, sourceIndex) {
  return sourceAware({
    id: action.id || `sigil-${sourceIndex + 1}`,
    type: "sigil",
    visible: action.visible !== false,
    tinted: action.tinted === true,
    prefix: action.prefix || "",
    symbol: action.element || action.symbol || "",
    x: finiteOr(action.x, 0),
    y: finiteOr(action.y, 0),
    size: positiveOr(action.size, 1),
    rotation: finiteOr(action.rotation, 0),
    color: action.color || null,
    texture: action.texture || null,
  }, action, sourceIndex);
}

function signFromAction(action, sourceIndex, center) {
  const point = actionCenter(action) || center || { x: 0, y: 0 };
  const radialDistance = distance(point, center);
  return sourceAware({
    id: action.id || `sign-${sourceIndex + 1}`,
    type: "sign",
    visible: action.visible !== false,
    tinted: action.tinted === true,
    prefix: action.prefix || "",
    symbol: action.element || action.symbol || "",
    x: finiteOr(action.x, point.x),
    y: finiteOr(action.y, point.y),
    size: positiveOr(action.size, 1),
    rotation: finiteOr(action.rotation, 0),
    strafeOffset: finiteOr(action.strafeOffset, 0),
    circleRadius: finiteOr(action.circleRadius, radialDistance),
    angle: Math.atan2(point.y - center.y, point.x - center.x),
    circleSymmetry: Math.max(1, Math.round(finiteOr(action.circleSymmetry, 8))),
    skipped: Math.max(0, Math.round(finiteOr(action.skipped, 0))),
    circleRotation: finiteOr(action.circleRotation, 0),
    offsetX: finiteOr(action.offsetX, 0),
    offsetY: finiteOr(action.offsetY, 0),
    color: action.color || null,
    texture: action.texture || null,
  }, action, sourceIndex);
}

function lineFromAction(action, sourceIndex) {
  return sourceAware({
    id: action.id || `line-${sourceIndex + 1}`,
    type: "line",
    visible: action.visible !== false,
    name: action.name || "",
    color: action.color || "#201a16",
    lineWeight: positiveOr(action.width, 1),
    points: Array.isArray(action.points)
      ? action.points.map((point) => ({ x: finiteOr(point?.x, 0), y: finiteOr(point?.y, 0) }))
      : [],
  }, action, sourceIndex);
}

function sealFromMembers(anchor, members) {
  const center = actionCenter(anchor) || { x: 0, y: 0 };
  const rings = members
    .filter(({ action }) => isRingAction(action))
    .map(({ action, index }) => ringFromAction(action, index));
  const sigils = members
    .filter(({ action }) => action.type === "glyph" && action.kind === "sigil")
    .map(({ action, index }) => sigilFromAction(action, index));
  const signs = members
    .filter(({ action }) => action.type === "glyph" && action.kind === "sign")
    .map(({ action, index }) => signFromAction(action, index, center));
  const lines = members
    .filter(({ action }) => action.type === "free")
    .map(({ action, index }) => lineFromAction(action, index));
  return {
    id: anchor.sealId || anchor.id || `seal-${members[0]?.index + 1 || 1}`,
    visible: anchor.visible !== false,
    name: anchor.name || "",
    angle: finiteOr(anchor.angle, 0),
    scale: positiveOr(anchor.scale, 1),
    offsetX: finiteOr(anchor.offsetX, 0),
    offsetY: finiteOr(anchor.offsetY, 0),
    center,
    radius: positiveOr(anchor.radius, 1),
    rings,
    sigils,
    signs,
    lines,
  };
}

export function extractCompositionDocument({ actions = [], anchorIndex = null, metadata = {} } = {}) {
  const safeActions = Array.isArray(actions) ? actions : [];
  const firstAnchor = Number.isInteger(anchorIndex)
    ? anchorIndex
    : safeActions.findIndex((action) => isRingAction(action));
  const seals = [];
  const claimed = new Set();
  if (firstAnchor >= 0 && safeActions[firstAnchor]) {
    const anchor = safeActions[firstAnchor];
    const members = safeActions
      .map((action, index) => ({ action, index }))
      .filter(({ action, index }) => belongsToSeal(action, anchor, index, firstAnchor));
    members.forEach(({ index }) => claimed.add(index));
    seals.push(sealFromMembers(anchor, members));
  }
  return {
    version: COMPOSITION_VERSION,
    title: metadata.title || "",
    author: metadata.author || "",
    description: metadata.description || "",
    background: metadata.background !== false,
    backgroundColor: metadata.backgroundColor || "#ffffff",
    customImages: Array.isArray(metadata.customImages) ? clone(metadata.customImages) : [],
    seals,
    unclassified: safeActions
      .map((action, index) => ({ action: clone(action), sourceIndex: index }))
      .filter((_, index) => !claimed.has(index)),
  };
}

function normalizeRing(ring = {}) {
  return {
    id: ring.id || `ring-${cryptoRandomId()}`,
    type: "ring",
    visible: ring.visible !== false,
    name: ring.name || "",
    color: ring.color || "#201a16",
    filled: ring.filled === true,
    radius: positiveOr(ring.radius, 1),
    lineWeight: positiveOr(ring.lineWeight ?? ring.width, 1),
    openingSize: finiteOr(ring.openingSize, 0),
    openingAngle: finiteOr(ring.openingAngle, 0),
    offsetX: finiteOr(ring.offsetX, 0),
    offsetY: finiteOr(ring.offsetY, 0),
    ...("sourceIndex" in ring ? { sourceIndex: ring.sourceIndex } : {}),
    ...("sourceAction" in ring ? { sourceAction: clone(ring.sourceAction) } : {}),
  };
}

function normalizeSymbol(symbol = {}, type = "sigil") {
  const normalized = {
    id: symbol.id || `${type}-${cryptoRandomId()}`,
    type,
    visible: symbol.visible !== false,
    tinted: symbol.tinted === true,
    prefix: symbol.prefix || "",
    symbol: symbol.symbol || symbol.element || "",
    x: finiteOr(symbol.x, 0),
    y: finiteOr(symbol.y, 0),
    size: positiveOr(symbol.size, 1),
    rotation: finiteOr(symbol.rotation, 0),
    color: symbol.color || null,
    texture: symbol.texture ? normalizeTexture(symbol.texture) : null,
    ...("sourceIndex" in symbol ? { sourceIndex: symbol.sourceIndex } : {}),
    ...("sourceAction" in symbol ? { sourceAction: clone(symbol.sourceAction) } : {}),
  };
  if (type === "sign") {
    normalized.strafeOffset = finiteOr(symbol.strafeOffset, 0);
    normalized.circleRadius = finiteOr(symbol.circleRadius, 0);
    normalized.circleSymmetry = Math.max(1, Math.round(finiteOr(symbol.circleSymmetry, 8)));
    normalized.skipped = Math.max(0, Math.round(finiteOr(symbol.skipped, 0)));
    normalized.circleRotation = finiteOr(symbol.circleRotation, 0);
    normalized.offsetX = finiteOr(symbol.offsetX, 0);
    normalized.offsetY = finiteOr(symbol.offsetY, 0);
  }
  return normalized;
}

function normalizeLine(line = {}) {
  return {
    id: line.id || `line-${cryptoRandomId()}`,
    type: "line",
    visible: line.visible !== false,
    name: line.name || "",
    color: line.color || "#201a16",
    lineWeight: positiveOr(line.lineWeight ?? line.width, 1),
    points: Array.isArray(line.points)
      ? line.points.map((point) => ({ x: finiteOr(point?.x, 0), y: finiteOr(point?.y, 0) }))
      : [],
    ...("sourceIndex" in line ? { sourceIndex: line.sourceIndex } : {}),
    ...("sourceAction" in line ? { sourceAction: clone(line.sourceAction) } : {}),
  };
}

function normalizeTexture(texture = {}) {
  const supported = ["solid", "zigzag", "double", "dashed", "dotted", "hatch", "wave"];
  return {
    kind: supported.includes(texture.kind) ? texture.kind : "solid",
    spacing: Math.max(1, Math.min(64, finiteOr(texture.spacing, 8))),
    amplitude: Math.max(0, Math.min(32, finiteOr(texture.amplitude, 3))),
    thickness: Math.max(1, Math.min(32, finiteOr(texture.thickness, 2))),
    angle: finiteOr(texture.angle, 0),
    color: texture.color || null,
    secondaryColor: texture.secondaryColor || null,
  };
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeCompositionDocument(document = {}) {
  return {
    ...document,
    version: COMPOSITION_VERSION,
    title: document.title || "",
    author: document.author || "",
    description: document.description || "",
    background: document.background !== false,
    backgroundColor: document.backgroundColor || "#ffffff",
    customImages: Array.isArray(document.customImages) ? clone(document.customImages) : [],
    seals: (Array.isArray(document.seals) ? document.seals : []).map((seal = {}) => ({
      id: seal.id || `seal-${cryptoRandomId()}`,
      visible: seal.visible !== false,
      name: seal.name || "",
      angle: finiteOr(seal.angle, 0),
      scale: positiveOr(seal.scale, 1),
      offsetX: finiteOr(seal.offsetX, 0),
      offsetY: finiteOr(seal.offsetY, 0),
      center: {
        x: finiteOr(seal.center?.x, 0),
        y: finiteOr(seal.center?.y, 0),
      },
      radius: positiveOr(seal.radius, 1),
      rings: (Array.isArray(seal.rings) ? seal.rings : []).map(normalizeRing),
      sigils: (Array.isArray(seal.sigils) ? seal.sigils : []).map((item) => normalizeSymbol(item, "sigil")),
      signs: (Array.isArray(seal.signs) ? seal.signs : []).map((item) => normalizeSymbol(item, "sign")),
      lines: (Array.isArray(seal.lines) ? seal.lines : []).map(normalizeLine),
    })),
    unclassified: (Array.isArray(document.unclassified) ? document.unclassified : [])
      .map((entry) => ({
        action: clone(entry.action || entry),
        ...(Number.isInteger(entry.sourceIndex) ? { sourceIndex: entry.sourceIndex } : {}),
      })),
  };
}

function sourceOr(item, type) {
  const action = item.sourceAction ? clone(item.sourceAction) : { type };
  if (item.id) action.id = item.id;
  return action;
}

function compileRing(item) {
  const action = sourceOr(item, "circle");
  const hasSource = Boolean(item.sourceAction);
  action.type ||= "circle";
  action.cx = finiteOr(action.cx, 0) + finiteOr(item.offsetX, 0);
  action.cy = finiteOr(action.cy, 0) + finiteOr(item.offsetY, 0);
  action.radius = positiveOr(item.radius, 1);
  action.width = positiveOr(item.lineWeight, 1);
  if (!hasSource || item.visible === false || "visible" in action) action.visible = item.visible !== false;
  if (item.color && (!hasSource || ("color" in action && item.color !== action.color))) action.color = item.color;
  if (item.filled || "filled" in action) action.filled = item.filled === true;
  if (item.openingSize || "openingSize" in action) action.openingSize = finiteOr(item.openingSize, 0);
  if (item.openingAngle || "openingAngle" in action) action.openingAngle = finiteOr(item.openingAngle, 0);
  return action;
}

function compileSymbol(item, kind, seal = null) {
  const action = sourceOr(item, "glyph");
  const hasSource = Boolean(item.sourceAction);
  Object.assign(action, {
    type: "glyph",
    element: item.symbol,
    kind,
    x: finiteOr(item.x, 0),
    y: finiteOr(item.y, 0),
    size: positiveOr(item.size, 1),
  });
  if (!hasSource || item.rotation || "rotation" in action) action.rotation = finiteOr(item.rotation, 0);
  if (!hasSource || item.visible === false || "visible" in action) action.visible = item.visible !== false;
  if (!hasSource || item.tinted || "tinted" in action) action.tinted = item.tinted === true;
  if (!hasSource || item.prefix || "prefix" in action) action.prefix = item.prefix || "";
  if (kind === "sign") {
    const currentAngle = Number.isFinite(item.angle)
      ? item.angle
      : Math.atan2(finiteOr(item.y, 0) - finiteOr(seal?.center?.y, 0), finiteOr(item.x, 0) - finiteOr(seal?.center?.x, 0));
    const radius = finiteOr(item.circleRadius, 0);
    if (seal && radius > 0) {
      const angle = currentAngle + finiteOr(item.circleRotation, 0);
      action.x = seal.center.x + Math.cos(angle) * radius + finiteOr(item.offsetX, 0);
      action.y = seal.center.y + Math.sin(angle) * radius + finiteOr(item.offsetY, 0);
    }
    if (!hasSource || item.circleRadius || "circleRadius" in action) action.circleRadius = radius;
    if (!hasSource || item.circleSymmetry !== 8 || "circleSymmetry" in action) action.circleSymmetry = Math.max(1, Math.round(finiteOr(item.circleSymmetry, 8)));
    if (!hasSource || item.skipped || "skipped" in action) action.skipped = Math.max(0, Math.round(finiteOr(item.skipped, 0)));
    if (!hasSource || item.circleRotation || "circleRotation" in action) action.circleRotation = finiteOr(item.circleRotation, 0);
  }
  if (item.texture) action.texture = normalizeTexture(item.texture);
  else if ("texture" in action) delete action.texture;
  return action;
}

function compileLine(item) {
  const action = sourceOr(item, "free");
  const hasSource = Boolean(item.sourceAction);
  Object.assign(action, {
    type: "free",
    points: (item.points || []).map((point) => ({ x: point.x, y: point.y })),
    width: positiveOr(item.lineWeight, 1),
  });
  if (item.color && (!hasSource || item.color !== action.color)) action.color = item.color;
  if (!hasSource || item.visible === false || "visible" in action) action.visible = item.visible !== false;
  return action;
}

export function compileCompositionDocument(document = {}) {
  const normalized = normalizeCompositionDocument(document);
  const ordered = [];
  normalized.seals.forEach((seal) => {
    const items = [
      ...seal.rings,
      ...seal.sigils,
      ...seal.signs,
      ...seal.lines,
    ].sort((left, right) => {
      const leftIndex = Number.isInteger(left.sourceIndex) ? left.sourceIndex : Number.MAX_SAFE_INTEGER;
      const rightIndex = Number.isInteger(right.sourceIndex) ? right.sourceIndex : Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
    items.forEach((item) => {
      const action = item.type === "ring"
        ? compileRing(item)
        : item.type === "line"
          ? compileLine(item)
          : compileSymbol(item, item.type, seal);
      if (!item.sourceAction) action.sealId = seal.id;
      ordered.push(action);
    });
  });
  normalized.unclassified
    .slice()
    .sort((left, right) => (left.sourceIndex ?? Number.MAX_SAFE_INTEGER) - (right.sourceIndex ?? Number.MAX_SAFE_INTEGER))
    .forEach(({ action }) => ordered.push(clone(action)));
  return ordered;
}

export function calibrateCompositionElement(element = {}, calibration = {}) {
  return {
    ...element,
    x: finiteOr(calibration.center?.x, finiteOr(element.x, 0)),
    y: finiteOr(calibration.center?.y, finiteOr(element.y, 0)),
    size: positiveOr(calibration.size, positiveOr(element.size, 1)),
    rotation: finiteOr(calibration.rotation, finiteOr(element.rotation, 0)),
  };
}

export function applyCompositionTexture(element = {}, texture = {}) {
  return {
    ...element,
    texture: normalizeTexture(texture),
  };
}

export { normalizeTexture };
