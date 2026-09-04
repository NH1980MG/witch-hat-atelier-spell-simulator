export const MAX_CIRCLE_ACTIONS = 500;

const ACTION_TYPES = new Set(["free", "circle", "ring", "ray", "glyph", "image", "spiral", "annotation"]);
const MAX_IMAGE_ASSETS = 32;
const MAX_IMAGE_ASSET_BYTES = 512_000;
const MAX_IMAGE_ASSET_BYTES_TOTAL = 1_200_000;

export function circleStrokeArc(action) {
  if (action?.closed) return [0, Math.PI * 2];
  if (Number.isFinite(action?.openingSize) && Number.isFinite(action?.openingAngle)) {
    const openingSize = Math.max(0, Math.min(360, action.openingSize));
    if (openingSize >= 360) return null;
    return [
      ((action.openingAngle + openingSize / 2) * Math.PI) / 180,
      ((action.openingAngle - openingSize / 2 + 360) * Math.PI) / 180,
    ];
  }
  return [Math.PI * 0.1, Math.PI * 1.85];
}

export function parseCircleShare(input, options = {}) {
  if (!isRecord(input) || input.version !== 1) throw new TypeError("Unsupported circle version");
  if (!Array.isArray(input.actions) || input.actions.length > MAX_CIRCLE_ACTIONS) {
    throw new TypeError("Circle actions exceed the supported limit");
  }
  const locale = input.locale === "fr" ? "fr" : input.locale === "en" ? "en" : null;
  if (!locale) throw new TypeError("Circle locale must be en or fr");
  const title = text(input.title, 120, "Circle title");
  const canvas = parseCanvas(input.canvas);
  const assets = parseAssets(input.assets);
  const assetIds = new Set(assets.map(({ id }) => id));
  const actions = input.actions.map((action) => parseAction(action, options.glyphNames, assetIds));
  return {
    version: 1,
    locale,
    title,
    canvas,
    ...(assets.length > 0 ? { assets } : {}),
    actions,
  };
}

export function serializeCircleShare(input, options = {}) {
  return `${JSON.stringify(parseCircleShare(input, options), null, 2)}\n`;
}

export function parseCircleShareText(textValue, options = {}) {
  const text = String(textValue || "").trim();
  if (!text || text.length > 1_500_000) throw new TypeError("Circle JSON is invalid");
  try {
    const url = new URL(text);
    const encoded = url.searchParams.get("communityCircle");
    if (encoded) return decodeCircleShare(encoded, options);
    if (url.protocol === "data:") {
      const [, payload = ""] = text.split(",", 2);
      return parseCircleShare(JSON.parse(decodeURIComponent(payload)), options);
    }
    throw new TypeError("Circle JSON link is invalid");
  } catch (error) {
    if (error instanceof TypeError && /json/i.test(error.message) && !text.startsWith("{")) throw error;
  }
  return parseCircleShare(JSON.parse(text), options);
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
    if (action.type === "annotation") {
      if (action.kind === "drawing") {
        return { ...action, width: action.width * scale, points: action.points.map(point) };
      }
      const position = point(action);
      return { ...action, ...position, size: action.size * scale, width: action.width * scale };
    }
    if (action.type === "free") return { ...action, width: action.width * scale, points: action.points.map(point) };
    if (action.type === "ray") {
      const start = point({ x: action.cx, y: action.cy });
      const end = point({ x: action.x, y: action.y });
      return { ...action, cx: start.x, cy: start.y, x: end.x, y: end.y, width: action.width * scale };
    }
    if (action.type === "glyph" || action.type === "image") {
      const position = point(action);
      return { ...action, ...position, size: action.size * scale };
    }
    const center = point({ x: action.cx, y: action.cy });
    return { ...action, cx: center.x, cy: center.y, radius: action.radius * scale, width: action.width * scale };
  });
}

function parseAction(value, glyphNames, assetIds) {
  if (!isRecord(value) || !ACTION_TYPES.has(value.type)) throw new TypeError("Unsupported circle action");
  const width = optionalPositive(value.width, 2, "stroke width");
  const ritualFields = parseRitualFields(value);
  const visualFields = parseVisualFields(value);
  if (value.type === "free") {
    if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 2000) {
      throw new TypeError("Freehand points are invalid");
    }
    return { type: "free", width, points: value.points.map(parsePoint), ...visualFields, ...ritualFields };
  }
  if (value.type === "annotation") {
    const kind = value.kind === "text" ? "text" : value.kind === "drawing" ? "drawing" : null;
    if (!kind) throw new TypeError("Annotation kind is invalid");
    if (kind === "text") {
      return {
        type: "annotation",
        kind,
        text: text(value.text, 500, "Annotation text"),
        x: finite(value.x),
        y: finite(value.y),
        size: positive(value.size, "annotation size"),
        rotation: value.rotation === undefined ? 0 : finite(value.rotation),
        ...(value.fontWeight === undefined ? {} : { fontWeight: optionalFontWeight(value.fontWeight) }),
        ...visualFields,
        width,
      };
    }
    if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 2000) {
      throw new TypeError("Annotation points are invalid");
    }
    return {
      type: "annotation",
      kind,
      width,
      ...visualFields,
      points: value.points.map(parsePoint),
      ...ritualFields,
    };
  }
  if (value.type === "ray") {
    return {
      type: "ray",
      cx: finite(value.cx),
      cy: finite(value.cy),
      x: finite(value.x),
      y: finite(value.y),
      width,
      ...visualFields,
      ...ritualFields,
    };
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
      ...visualFields,
      ...(value.tinted === true ? { tinted: true } : {}),
      ...(optionalShortText(value.prefix, 80) ? { prefix: optionalShortText(value.prefix, 80) } : {}),
      ...(value.texture === undefined ? {} : { texture: parseTexture(value.texture) }),
      ...ritualFields,
    };
  }
  if (value.type === "image") {
    const assetId = text(value.assetId, 80, "Image asset id");
    if (!assetIds?.has(assetId)) throw new TypeError("Image action references an unknown asset");
    return {
      type: "image",
      assetId,
      name: text(value.name, 80, "Image name"),
      kind: value.kind === "sigil" ? "sigil" : "sign",
      ...parsePoint(value),
      size: positive(value.size, "image size"),
      rotation: value.rotation === undefined ? 0 : finite(value.rotation),
      ...visualFields,
      ...(value.tinted === true ? { tinted: true } : {}),
    };
  }
  const result = {
    type: value.type,
    cx: finite(value.cx),
    cy: finite(value.cy),
    radius: positive(value.radius, "radius"),
    width,
    ...visualFields,
    ...ritualFields,
  };
  if (value.type === "circle") {
    result.closed = value.closed !== false;
    if (value.filled === true) result.filled = true;
    if (optionalColor(value.fillColor)) result.fillColor = optionalColor(value.fillColor);
    if (value.openingSize !== undefined) {
      result.openingSize = bounded(value.openingSize, 0, 360, "circle opening size");
    }
    if (value.openingAngle !== undefined) {
      result.openingAngle = finite(value.openingAngle);
    }
  }
  if (value.type === "spiral") result.turns = optionalPositive(value.turns, 3, "spiral turns");
  return result;
}

function parseAssets(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_IMAGE_ASSETS) {
    throw new TypeError("Image assets exceed the supported limit");
  }
  const ids = new Set();
  let totalBytes = 0;
  return value.map((asset) => {
    if (!isRecord(asset)) throw new TypeError("Image asset is invalid");
    const id = text(asset.id, 80, "Image asset id");
    if (ids.has(id)) throw new TypeError("Image asset ids must be unique");
    ids.add(id);
    const src = embeddedRasterDataUrl(asset.src);
    const payload = src.slice(src.indexOf(",") + 1);
    const bytes = Math.floor(payload.length * 3 / 4) - (payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0);
    if (bytes > MAX_IMAGE_ASSET_BYTES) throw new RangeError("Image asset is too large");
    totalBytes += bytes;
    if (totalBytes > MAX_IMAGE_ASSET_BYTES_TOTAL) throw new RangeError("Image assets are too large");
    return { id, src };
  });
}

function embeddedRasterDataUrl(value) {
  if (typeof value !== "string") throw new TypeError("Image asset source is invalid");
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/]+={0,2})$/i);
  if (!match || match[2].length % 4 !== 0) throw new TypeError("Image asset must be an embedded PNG, JPEG, or WebP");
  try {
    atob(match[2]);
  } catch {
    throw new TypeError("Image asset base64 is invalid");
  }
  return value;
}

function parseVisualFields(value) {
  return {
    ...(value.visible === false ? { visible: false } : {}),
    ...(optionalColor(value.color) ? { color: optionalColor(value.color) } : {}),
  };
}

function parseTexture(value) {
  if (!isRecord(value)) throw new TypeError("Glyph texture is invalid");
  const supported = new Set(["solid", "zigzag", "double", "dashed", "dotted", "hatch", "wave"]);
  if (!supported.has(value.kind)) throw new TypeError("Glyph texture kind is invalid");
  return {
    kind: value.kind,
    ...(value.spacing === undefined ? {} : { spacing: bounded(value.spacing, 1, 64, "texture spacing") }),
    ...(value.amplitude === undefined ? {} : { amplitude: bounded(value.amplitude, 0, 32, "texture amplitude") }),
    ...(value.thickness === undefined ? {} : { thickness: bounded(value.thickness, 1, 32, "texture thickness") }),
    ...(value.angle === undefined ? {} : { angle: finite(value.angle) }),
    ...(optionalColor(value.color) ? { color: optionalColor(value.color) } : {}),
    ...(optionalColor(value.secondaryColor) ? { secondaryColor: optionalColor(value.secondaryColor) } : {}),
  };
}

function parseRitualFields(value) {
  const fields = {};
  if (value.ritualId === "opening-petrification") fields.ritualId = "opening-petrification";
  if (value.sealPatternId === "opening-petrification-seal") fields.sealPatternId = "opening-petrification-seal";
  if (value.comment === true) fields.comment = true;
  return fields;
}

function optionalFontWeight(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("Annotation font weight is invalid");
  return Math.max(100, Math.min(900, Math.round(number / 100) * 100));
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

function bounded(value, minimum, maximum, label) {
  const number = finite(value);
  if (number < minimum || number > maximum) throw new RangeError(`${label} is outside supported bounds`);
  return number;
}

function text(value, max, label) {
  if (typeof value !== "string") throw new TypeError(`${label} is required`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new RangeError(`${label} is invalid`);
  return normalized;
}

function optionalShortText(value, max) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function optionalColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
