export const MAX_CIRCLE_ACTIONS = 500;

const ACTION_TYPES = new Set(["free", "circle", "ring", "ray", "glyph", "spiral"]);

export function parseCircleShare(input, options = {}) {
  if (!isRecord(input) || input.version !== 1) throw new TypeError("Unsupported circle version");
  if (!Array.isArray(input.actions) || input.actions.length > MAX_CIRCLE_ACTIONS) {
    throw new TypeError("Circle actions exceed the supported limit");
  }
  const locale = input.locale === "fr" ? "fr" : input.locale === "en" ? "en" : null;
  if (!locale) throw new TypeError("Circle locale must be en or fr");
  const title = text(input.title, 120, "Circle title");
  const canvas = parseCanvas(input.canvas);
  const actions = input.actions.map((action) => parseAction(action, options.glyphNames));
  return { version: 1, locale, title, canvas, actions };
}

export function encodeCircleShare(input) {
  const json = JSON.stringify(parseCircleShare(input));
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeCircleShare(encoded, options = {}) {
  if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 1_500_000) {
    throw new TypeError("Circle payload is invalid");
  }
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return parseCircleShare(JSON.parse(new TextDecoder().decode(bytes)), options);
}

export function buildCommunityComposeUrl(baseUrl, handoffId) {
  const url = new URL("/posts/new", baseUrl);
  if (typeof handoffId === "string" && handoffId.length <= 100) url.searchParams.set("handoff", handoffId);
  return url.href;
}

export function fitCircleShare(circle, targetCanvas) {
  const parsed = parseCircleShare(circle);
  const width = positive(targetCanvas?.width, "target canvas");
  const height = positive(targetCanvas?.height, "target canvas");
  const scale = Math.min(width / parsed.canvas.width, height / parsed.canvas.height);
  const offsetX = (width - parsed.canvas.width * scale) / 2;
  const offsetY = (height - parsed.canvas.height * scale) / 2;
  const point = ({ x, y }) => ({ x: x * scale + offsetX, y: y * scale + offsetY });
  return parsed.actions.map((action) => {
    if (action.type === "free") return { ...action, width: action.width * scale, points: action.points.map(point) };
    if (action.type === "ray") {
      const start = point({ x: action.cx, y: action.cy });
      const end = point({ x: action.x, y: action.y });
      return { ...action, cx: start.x, cy: start.y, x: end.x, y: end.y, width: action.width * scale };
    }
    const center = point(action);
    if (action.type === "glyph") return { ...action, ...center, size: action.size * scale };
    return { ...action, cx: center.x, cy: center.y, radius: action.radius * scale, width: action.width * scale };
  });
}

function parseAction(value, glyphNames) {
  if (!isRecord(value) || !ACTION_TYPES.has(value.type)) throw new TypeError("Unsupported circle action");
  const width = optionalPositive(value.width, 2, "stroke width");
  const ritualFields = parseRitualFields(value);
  if (value.type === "free") {
    if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 2000) {
      throw new TypeError("Freehand points are invalid");
    }
    return { type: "free", width, points: value.points.map(parsePoint), ...ritualFields };
  }
  if (value.type === "ray") {
    return { type: "ray", cx: finite(value.cx), cy: finite(value.cy), x: finite(value.x), y: finite(value.y), width, ...ritualFields };
  }
  if (value.type === "glyph") {
    const element = text(value.element, 80, "Glyph element");
    if (glyphNames && !glyphNames.has(element)) throw new TypeError("Unknown glyph element");
    const kind = value.kind === "sign" ? "sign" : "sigil";
    return {
      type: "glyph",
      element,
      kind,
      ...parsePoint(value),
      size: positive(value.size, "glyph size"),
      rotation: value.rotation === undefined ? 0 : finite(value.rotation),
      ...ritualFields,
    };
  }
  const result = {
    type: value.type,
    cx: finite(value.cx),
    cy: finite(value.cy),
    radius: positive(value.radius, "radius"),
    width,
    ...ritualFields,
  };
  if (value.type === "circle") result.closed = value.closed !== false;
  if (value.type === "spiral") result.turns = optionalPositive(value.turns, 3, "spiral turns");
  return result;
}

function parseRitualFields(value) {
  const fields = {};
  if (value.ritualId === "opening-petrification") fields.ritualId = "opening-petrification";
  if (value.sealPatternId === "opening-petrification-seal") fields.sealPatternId = "opening-petrification-seal";
  return fields;
}

function parseCanvas(value) {
  if (!isRecord(value)) throw new TypeError("Circle canvas is required");
  const width = positive(value.width, "canvas width");
  const height = positive(value.height, "canvas height");
  if (width > 4096 || height > 4096) throw new RangeError("Canvas is outside supported bounds");
  return { width, height };
}

function parsePoint(value) {
  if (!isRecord(value)) throw new TypeError("Point coordinates are invalid");
  return { x: finite(value.x), y: finite(value.y) };
}

function finite(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError("Coordinate must be finite");
  if (Math.abs(value) > 100_000) throw new RangeError("Coordinate is outside supported bounds");
  return value;
}

function positive(value, label) {
  const number = finite(value);
  if (number <= 0) throw new RangeError(`${label} must be positive`);
  return number;
}

function optionalPositive(value, fallback, label) {
  return value === undefined ? fallback : positive(value, label);
}

function text(value, max, label) {
  if (typeof value !== "string") throw new TypeError(`${label} is required`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new RangeError(`${label} is invalid`);
  return normalized;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
