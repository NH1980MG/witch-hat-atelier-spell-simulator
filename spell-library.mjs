// spell-library.mjs
// Bibliotheque personnelle de sorts : sauvegarde le cercle courant (actions +
// reglages) dans localStorage pour le recharger plus tard, a l'identique du
// patron de guide-storage.mjs. Module pur, stockage injecte, testable sous Node.

export const SPELL_LIBRARY_STORAGE_KEY = "whaMySpellsV1";
export const MAX_MY_SPELLS = 24;

const DRAWING_ACTION_TYPES = new Set(["free", "circle", "ring", "ray", "glyph", "spiral"]);
const ACTION_KEYS = [
  "type", "label", "element", "charge", "color", "width", "x", "y", "cx", "cy",
  "radius", "turns", "size", "rotation", "kind", "category", "rune", "closed",
  "seal", "boundary", "userAdjusted",
];

function sanitizePoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    return null;
  }
  return { x: point.x, y: point.y };
}

function sanitizeAction(action) {
  if (!DRAWING_ACTION_TYPES.has(action?.type)) {
    return null;
  }
  const clean = {};
  for (const key of ACTION_KEYS) {
    const value = action[key];
    if (typeof value === "string" || typeof value === "boolean" || Number.isFinite(value)) {
      clean[key] = value;
    }
  }
  if (Number.isFinite(action?.sector)) {
    clean.sector = action.sector;
  }
  if (action.type === "free") {
    clean.points = Array.isArray(action.points) ? action.points.map(sanitizePoint).filter(Boolean) : [];
    if (clean.points.length < 2) {
      return null;
    }
  }
  return clean;
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeSpell(spell) {
  if (!spell || typeof spell.id !== "string" || !Array.isArray(spell.actions)) {
    return null;
  }
  const actions = spell.actions.map(sanitizeAction).filter(Boolean);
  if (actions.length === 0) {
    return null;
  }
  return {
    id: spell.id.slice(0, 100),
    name: String(spell.name || "Sort").slice(0, 80),
    createdAt: Number.isFinite(spell.createdAt) ? spell.createdAt : Date.now(),
    intensity: clampInt(spell.intensity, 1, 5, 3),
    stroke: clampInt(spell.stroke, 1, 8, 3),
    actions,
  };
}

export function createSpell({ name, actions, intensity, stroke }, options = {}) {
  const spell = normalizeSpell({
    id: options.id || `spell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: options.createdAt ?? Date.now(),
    intensity,
    stroke,
    actions,
  });
  if (!spell) {
    throw new TypeError("A spell requires at least one valid drawing action");
  }
  return spell;
}

export function loadMySpells(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(SPELL_LIBRARY_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeSpell).filter(Boolean).slice(0, MAX_MY_SPELLS);
  } catch {
    return [];
  }
}

export function saveMySpells(storage = globalThis.localStorage, spells = []) {
  const normalized = spells.map(normalizeSpell).filter(Boolean).slice(0, MAX_MY_SPELLS);
  storage?.setItem(SPELL_LIBRARY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function deleteMySpell(spells, id) {
  return spells.filter((spell) => spell.id !== id);
}
