import { MAX_CIRCLE_ACTIONS, parseCircleShare } from "./circle-share.mjs";
import { PALETTE_ELEMENTS } from "./symbol-palette-data.mjs";

const CANVAS = Object.freeze({ width: 900, height: 900 });
const CENTER = Object.freeze({ x: CANVAS.width / 2, y: CANVAS.height / 2 });
const MAX_SEALS = 128;
const MAX_POINTS = 2000;

const CATALOG = new Map(PALETTE_ELEMENTS.map((entry) => [normalize(entry.name), entry]));

const ALIASES = new Map([
  ["aeriforms", "Aeriforme"], ["birda", "Oiseau A"], ["birdb", "Oiseau B"],
  ["crystalize", "Cristal"], ["crystallize", "Cristal"], ["earth", "Terre"],
  ["fire", "Feu"], ["flowerclean", "Fleur"], ["flower", "Fleur"],
  ["guidance", "Guidage"], ["horse", "Cheval"], ["light", "Lumiere"],
  ["liongoat", "Chevre-lion"], ["owlcathead", "Tete de chat-hibou"],
  ["owlcat", "Chat-hibou"], ["repetition", "Repetition"], ["scalewolf", "Loup-ecaille"],
  ["smoke", "Fumee"], ["stop", "Arret temporel"], ["timestop", "Arret temporel"],
  ["sword", "Epee"], ["torchstag", "Cerf-torche"], ["unburningflames", "Flammes sans chaleur"],
  ["valanceleech", "Sangsue-valance"], ["water", "Eau"], ["whorlingwinds", "Vent tourbillonnant"],
  ["windclean", "Vent"], ["windunderfoot", "Vent sous pied"], ["wind", "Vent"],
  ["aeriformsdefined", "Aeriforme defini"], ["billow", "Nuage"], ["bind", "Arret"],
  ["bolt", "Projectile"], ["coil", "Spire physique"], ["collection", "Collection"],
  ["column", "Colonne"], ["conceal", "Dissimulation"], ["convergence", "Convergence"],
  ["cool", "Refroidissement"], ["crosshair", "Cible"], ["crush", "Crush"],
  ["diamond", "Diamant"], ["dispersion", "Dispersion"], ["empower", "Renforcement"],
  ["enlarge", "Agrandissement"], ["enlargeinverted", "Agrandissement"],
  ["entwine", "Enlacement"], ["envelop", "Enveloppe"], ["eye", "Viseur"], ["float", "Flottement"],
  ["focus", "Convergence"], ["gather", "Rassemblement"], ["glaives", "Glaives"],
  ["levitation", "Levitation"], ["link", "Lien"], ["orb", "Orbe"],
  ["project", "Projection"], ["pull", "Traction"], ["puppet", "Pantin"],
  ["purify", "Purification"], ["radial", "Radial"], ["rain", "Pluie"],
  ["raininverted", "Pluie"], ["reflect", "Reflection"], ["region", "Region"],
  ["signofwind", "Signe de vent"], ["solidify", "Solidification"], ["stability", "Renforcement"],
  ["stillness", "Immobilite"], ["stretch", "Etirement"], ["vision", "Viseur"],
  ["window", "Fenetres"],
]);

export function isWhaSpellMakerDocument(value) {
  return isRecord(value) && Array.isArray(value.seals) && value.version === undefined;
}

export async function decodeWhaSpellMakerLink(value) {
  const url = new URL(String(value));
  const encoded = url.searchParams.get("spell");
  if (!encoded || encoded.length > 1_500_000) throw new TypeError("WHA Spell Maker link is invalid");
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (typeof DecompressionStream === "undefined") throw new Error("Deflate decoding is unavailable");
  const stream = new Response(bytes).body.pipeThrough(new DecompressionStream("deflate-raw"));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

export function convertWhaSpellMakerDocument(input, options = {}) {
  if (!isRecord(input) || !Array.isArray(input.seals)) {
    throw new TypeError("WHA Spell Maker JSON must contain a seals array");
  }
  if (input.seals.length > MAX_SEALS) throw new RangeError("WHA seal count exceeds the supported limit");

  const warnings = [];
  const actions = [];
  const stats = { seals: input.seals.length, rings: 0, sigils: 0, signs: 0, lines: 0, actions: 0 };
  const customImages = input.customImages ?? input.custom?.images;
  if (Array.isArray(customImages) && customImages.length > 0) {
    warnOnce(warnings, "Custom images were not imported; remote or embedded image data is never fetched automatically.");
  }

  input.seals.forEach((sealValue, sealIndex) => {
    if (!isRecord(sealValue)) throw new TypeError(`Seal ${sealIndex + 1} is invalid`);
    if (sealValue.visible === false) {
      warnOnce(warnings, `Seal ${sealIndex + 1} was hidden and was skipped.`);
      return;
    }
    const transform = createTransform(sealValue);
    const rings = arrayOrEmpty(sealValue.rings);
    const sigils = arrayOrEmpty(sealValue.sigils);
    const signs = arrayOrEmpty(sealValue.signs);
    const lines = arrayOrEmpty(sealValue.lines);

    rings.forEach((ringValue, index) => {
      if (!isRecord(ringValue)) throw new TypeError(`Ring ${index + 1} is invalid`);
      if (ringValue.visible === false) {
        warnOnce(warnings, "Hidden rings were skipped.");
        return;
      }
      const radius = scaledNumber(ringValue.radius, 450, transform.scale, "ring radius");
      const width = scaledNumber(ringValue.weight ?? ringValue.lineWeight, 10, transform.scale, "ring line weight");
      const openingSize = number(ringValue.openingSize, 0, "ring opening size");
      const openingAngle = number(ringValue.openingAngle, 0, "ring opening angle");
      const point = transform.point(ringOffset(ringValue));
      addAction(actions, {
        type: "circle",
        cx: point.x,
        cy: point.y,
        radius,
        width,
        closed: openingSize <= 0,
        ...(openingSize > 0 ? { openingSize, openingAngle } : {}),
      });
      stats.rings += 1;
      if (ringValue.filled === true) warnOnce(warnings, "Filled rings were imported as outlines because the simulator uses vector strokes.");
    });

    sigils.forEach((sigilValue, index) => {
      const action = convertGlyph(sigilValue, "sigil", transform, warnings, index);
      if (!action) return;
      addAction(actions, action);
      stats.sigils += 1;
    });

    signs.forEach((signValue, index) => {
      const converted = convertSign(signValue, index, transform, warnings);
      if (!converted) return;
      for (const action of converted) addAction(actions, action);
      stats.signs += 1;
    });

    lines.forEach((lineValue, index) => {
      const action = convertLine(lineValue, transform, warnings, index);
      if (!action) return;
      addAction(actions, action);
      stats.lines += 1;
    });
  });

  stats.actions = actions.length;
  const locale = options.locale === "fr" ? "fr" : "en";
  const title = textOrFallback(input.name, "Imported WHA Spell Maker circle");
  const circle = parseCircleShare({ version: 1, locale, title, canvas: CANVAS, actions }, {
    glyphNames: new Set(PALETTE_ELEMENTS.map((entry) => entry.name)),
  });
  return { circle, warnings, stats };
}

function convertGlyph(value, requestedKind, transform, warnings, index) {
  if (!isRecord(value)) throw new TypeError(`${requestedKind} ${index + 1} is invalid`);
  if (value.visible === false) {
    warnOnce(warnings, `Hidden ${requestedKind}s were skipped.`);
    return null;
  }
  const rawName = value.name ?? value.symbol ?? value.id;
  const entry = resolveElement(rawName);
  if (!entry) {
    warnOnce(warnings, `Unknown ${requestedKind} "${String(rawName ?? "")}" was skipped.`);
    return null;
  }
  if (entry.kind !== requestedKind) {
    warnOnce(warnings, `The ${requestedKind} "${String(rawName)}" was mapped to the catalogue kind "${entry.kind}".`);
  }
  const center = transform.point({
    x: number(value.offsetX, 0, `${requestedKind} horizontal offset`),
    y: number(value.offsetY, 0, `${requestedKind} vertical offset`),
  });
  const angle = number(value.angle, 0, `${requestedKind} angle`);
  const size = scaledNumber(value.size, requestedKind === "sigil" ? 400 : 200, transform.scale, `${requestedKind} size`) / 2;
  if (value.tinted === true) warnOnce(warnings, "Tinted WHA symbols use the simulator catalogue color.");
  return {
    type: "glyph",
    element: entry.name,
    kind: requestedKind,
    x: center.x,
    y: center.y,
    size,
    rotation: transform.angle + degrees(angle),
  };
}

function convertSign(value, index, transform, warnings) {
  if (!isRecord(value)) throw new TypeError(`Sign ${index + 1} is invalid`);
  if (value.visible === false) {
    warnOnce(warnings, "Hidden signs were skipped.");
    return null;
  }
  const entry = resolveElement(value.name ?? value.symbol ?? value.id);
  if (!entry) {
    warnOnce(warnings, `Unknown sign "${String(value.name ?? value.symbol ?? "")}" was skipped.`);
    return null;
  }
  if (entry.kind !== "sign") warnOnce(warnings, `The sign "${String(value.name)}" was mapped to the catalogue kind "${entry.kind}".`);
  const symmetry = integer(value.amount ?? value.circleSymmetry, 8, "sign circle symmetry");
  if (symmetry < 1 || symmetry > 64) throw new RangeError("Sign circle symmetry is outside supported bounds");
  const skipped = integer(value.amountSkip ?? value.signsSkipped, 0, "signs skipped");
  if (skipped < 0 || skipped > symmetry) throw new RangeError("Signs skipped is outside supported bounds");
  const radius = scaledNumber(value.radius ?? value.circleRadius, 325, transform.scale, "sign circle radius");
  const offsetX = number(value.offsetX ?? value.circleHorizontalOffset, 0, "sign circle horizontal offset");
  const offsetY = number(value.offsetY ?? value.circleVerticalOffset, 0, "sign circle vertical offset");
  const rotation = degrees(number(value.rotation ?? value.circleRotation, 0, "sign circle rotation"));
  const strafe = scaledNumber(value.offsetStrafe ?? value.strafeOffset, 0, transform.scale, "sign strafe offset");
  const angle = degrees(number(value.angle, 0, "sign angle"));
  const size = scaledNumber(value.size, 200, transform.scale, "sign size") / 2;
  const actions = [];
  const copyCount = symmetry - skipped;
  for (let copy = 0; copy < copyCount; copy += 1) {
    const theta = rotation + copy * (Math.PI * 2 / symmetry);
    const radial = {
      x: Math.sin(theta) * radius,
      y: -Math.cos(theta) * radius,
    };
    const tangent = { x: Math.cos(theta) * strafe, y: Math.sin(theta) * strafe };
    const point = transform.point({ x: offsetX + radial.x + tangent.x, y: offsetY + radial.y + tangent.y });
    actions.push({
      type: "glyph",
      element: entry.name,
      kind: "sign",
      x: point.x,
      y: point.y,
      size,
      rotation: transform.angle + theta + angle,
    });
  }
  return actions;
}

function convertLine(value, transform, warnings, index) {
  if (!isRecord(value)) throw new TypeError(`Line ${index + 1} is invalid`);
  if (value.visible === false) {
    warnOnce(warnings, "Hidden lines were skipped.");
    return null;
  }
  if (!Array.isArray(value.points)) throw new TypeError(`Line ${index + 1} points are invalid`);
  if (value.points.length === 0 || value.points.every((point) => isEmptyPoint(point))) {
    warnOnce(warnings, "Empty default lines were skipped.");
    return null;
  }
  if (value.points.length > MAX_POINTS) throw new RangeError("Line point count exceeds the supported limit");
  const points = value.points.map((point, pointIndex) => {
    return transform.point(parseExternalPoint(point, `line ${index + 1} point ${pointIndex + 1}`));
  });
  if (points.length < 2) {
    warnOnce(warnings, "Lines with fewer than two points were skipped.");
    return null;
  }
  return { type: "free", width: scaledNumber(value.weight ?? value.lineWeight, 10, transform.scale, "line weight"), points };
}

function createTransform(seal) {
  const scale = number(seal.scale, 100, "seal scale") / 100;
  if (scale <= 0 || scale > 100) throw new RangeError("Seal scale is outside supported bounds");
  const angle = degrees(number(seal.angle, 0, "seal angle"));
  const offset = { x: number(seal.offsetX, 0, "seal horizontal offset"), y: number(seal.offsetY, 0, "seal vertical offset") };
  return {
    scale,
    angle,
    point(value) {
      const x = CENTER.x + number(value.x, 0, "x") * scale;
      const y = CENTER.y + number(value.y, 0, "y") * scale;
      const rotatedX = CENTER.x + Math.cos(angle) * (x - CENTER.x) - Math.sin(angle) * (y - CENTER.y);
      const rotatedY = CENTER.y + Math.sin(angle) * (x - CENTER.x) + Math.cos(angle) * (y - CENTER.y);
      return { x: rotatedX + offset.x, y: rotatedY + offset.y };
    },
  };
}

function ringOffset(value) {
  return {
    x: number(value.offsetX ?? value.horizontalOffset, 0, "ring horizontal offset"),
    y: number(value.offsetY ?? value.verticalOffset, 0, "ring vertical offset"),
  };
}

function resolveElement(rawName) {
  if (typeof rawName !== "string") return null;
  const stripped = rawName.replace(/^(sigil|sign)[_-]/i, "");
  const canonical = ALIASES.get(normalize(stripped)) ?? stripped;
  return CATALOG.get(normalize(canonical)) ?? null;
}

function addAction(actions, action) {
  if (actions.length >= MAX_CIRCLE_ACTIONS) throw new RangeError("Converted circle actions exceed the supported limit");
  actions.push(action);
}

function arrayOrEmpty(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError("WHA drawable collection must be an array");
  return value;
}

function parseExternalPoint(value, label) {
  if (Array.isArray(value)) {
    if (value.length < 2) throw new TypeError(`${label} is incomplete`);
    return { x: finite(value[0], `${label} x`), y: finite(value[1], `${label} y`) };
  }
  if (!isRecord(value)) throw new TypeError(`${label} is invalid`);
  return {
    x: number(value.x, 0, `${label} x`),
    y: number(value.y, 0, `${label} y`),
  };
}

function isEmptyPoint(value) {
  return isRecord(value) && value.x === undefined && value.y === undefined;
}

function scaledNumber(value, fallback, scale, label) {
  return number(value, fallback, label) * scale;
}

function integer(value, fallback, label) {
  const result = number(value, fallback, label);
  if (!Number.isInteger(result)) throw new TypeError(`${label} must be an integer`);
  return result;
}

function number(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  return finite(value, label);
}

function finite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  if (Math.abs(value) > 100_000) throw new RangeError(`${label} is outside supported bounds`);
  return value;
}

function degrees(value) {
  return value * Math.PI / 180;
}

function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : fallback;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function warnOnce(warnings, message) {
  if (!warnings.includes(message)) warnings.push(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
