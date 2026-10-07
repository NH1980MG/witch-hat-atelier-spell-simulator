import { PALETTE_ELEMENTS } from "../../symbol-palette-data.mjs";
import { normalizeEffect } from "./effect-runtime-model.mjs";

export const EDITOR_STORAGE_KEY = "circleCommons.effectEditor.v1";
export const SYMBOL_KINDS = Object.freeze(["sign", "sigil"]);
export const SYMBOL_ROLES = Object.freeze([
  "material",
  "direction",
  "form",
  "transformation",
  "trigger",
  "modifier",
]);

const ROLE_LABELS = Object.freeze({
  material: "Matière",
  direction: "Direction",
  form: "Forme",
  transformation: "Transformation",
  trigger: "Déclencheur",
  modifier: "Modificateur",
});
const BUILT_IN_SYMBOL_IDS = new Set(PALETTE_ELEMENTS.map((element) => element.name));

let generatedId = 0;

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  generatedId += 1;
  return `${prefix}-${Date.now().toString(36)}-${generatedId.toString(36)}`;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function normalizePoint(point) {
  if (!isPlainObject(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError("Chaque point doit avoir des coordonnées finies.");
  }
  return { x: clamp(point.x), y: clamp(point.y) };
}

export function createCustomSymbol({ id, name, kind, role, strokes, effect } = {}) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 32) {
    throw new TypeError("Le nom doit contenir de 1 à 32 caractères.");
  }
  if (!SYMBOL_KINDS.includes(kind)) throw new TypeError("Type de symbole invalide.");
  if (!SYMBOL_ROLES.includes(role)) throw new TypeError("Rôle sémantique invalide.");
  if (!Array.isArray(strokes) || strokes.length === 0 || strokes.length > 64) {
    throw new TypeError("Le symbole doit contenir de 1 à 64 traits.");
  }

  const normalizedStrokes = strokes.map((stroke) => {
    if (!Array.isArray(stroke) || stroke.length === 0 || stroke.length > 256) {
      throw new TypeError("Chaque trait doit contenir de 1 à 256 points.");
    }
    return stroke.map(normalizePoint);
  });

  return {
    id: typeof id === "string" && id.trim() ? id.trim() : createId("symbol"),
    name: name.trim(),
    kind,
    role,
    strokes: normalizedStrokes,
    ...(effect ? { effect: normalizeEffect(effect) } : {}),
  };
}

function normalizeComponent(component, customSymbolIds) {
  if (!isPlainObject(component)
    || typeof component.symbolId !== "string"
    || !component.symbolId
    || !SYMBOL_ROLES.includes(component.role)
    || !["catalog", "custom"].includes(component.source)) return null;
  if (component.source === "custom" && !customSymbolIds.has(component.symbolId)) return null;
  if (component.source === "catalog" && !BUILT_IN_SYMBOL_IDS.has(component.symbolId)) return null;
  return {
    id: typeof component.id === "string" && component.id ? component.id : createId("component"),
    symbolId: component.symbolId,
    source: component.source,
    role: component.role,
  };
}

export function normalizeEditorState(value) {
  const state = isPlainObject(value) ? value : {};
  const symbols = [];
  const seenSymbolIds = new Set();
  for (const rawSymbol of Array.isArray(state.symbols) ? state.symbols : []) {
    try {
      const symbol = createCustomSymbol(rawSymbol);
      if (!seenSymbolIds.has(symbol.id)) {
        seenSymbolIds.add(symbol.id);
        symbols.push(symbol);
      }
    } catch {
      // Invalid saved symbols are isolated instead of preventing editor startup.
    }
  }

  const compositions = [];
  const seenCompositionIds = new Set();
  for (const rawComposition of Array.isArray(state.compositions) ? state.compositions : []) {
    if (!isPlainObject(rawComposition)
      || typeof rawComposition.id !== "string"
      || !rawComposition.id
      || seenCompositionIds.has(rawComposition.id)) continue;
    const components = [];
    const seenComponentIds = new Set();
    for (const rawComponent of Array.isArray(rawComposition.components) ? rawComposition.components : []) {
      const component = normalizeComponent(rawComponent, seenSymbolIds);
      if (component && !seenComponentIds.has(component.id)) {
        seenComponentIds.add(component.id);
        components.push(component);
      }
    }
    seenCompositionIds.add(rawComposition.id);
    compositions.push({
      id: rawComposition.id,
      name: typeof rawComposition.name === "string" ? rawComposition.name.slice(0, 64) : "",
      components,
      ...(isPlainObject(rawComposition.effectOverrides) ? { effectOverrides: Object.fromEntries(
        Object.entries(normalizeEffect(rawComposition.effectOverrides)).filter(([key]) => Object.hasOwn(rawComposition.effectOverrides, key)),
      ) } : {}),
    });
  }

  return {
    version: 1,
    symbols,
    compositions,
    activeCompositionId: compositions.some((composition) => composition.id === state.activeCompositionId)
      ? state.activeCompositionId
      : null,
  };
}

export function readEditorState(storage) {
  try {
    return normalizeEditorState(JSON.parse(storage.getItem(EDITOR_STORAGE_KEY) || "null"));
  } catch {
    return normalizeEditorState(null);
  }
}

export function writeEditorState(storage, state) {
  try {
    storage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(normalizeEditorState(state)));
    return true;
  } catch {
    return false;
  }
}

export function addCompositionComponent(composition, component) {
  if (!isPlainObject(composition) || !Array.isArray(composition.components)) {
    throw new TypeError("Composition invalide.");
  }
  const normalized = normalizeComponent(component, new Set([component?.symbolId]));
  if (!normalized) throw new TypeError("Composant invalide.");
  if (composition.components.some((item) => item.id === normalized.id)) {
    normalized.id = createId("component");
  }
  return { ...composition, components: [...composition.components, normalized] };
}

export function moveCompositionComponent(composition, componentId, delta) {
  if (!Array.isArray(composition?.components) || !Number.isFinite(delta)) return composition;
  const components = [...composition.components];
  const from = components.findIndex((component) => component.id === componentId);
  if (from < 0) return composition;
  const to = Math.max(0, Math.min(components.length - 1, from + Math.trunc(delta)));
  if (from === to) return composition;
  const [component] = components.splice(from, 1);
  components.splice(to, 0, component);
  return { ...composition, components };
}

export function removeCompositionComponent(composition, componentId) {
  if (!Array.isArray(composition?.components)) return composition;
  const components = composition.components.filter((component) => component.id !== componentId);
  return components.length === composition.components.length
    ? composition
    : { ...composition, components };
}

function resolveSymbol(symbolIndex, id) {
  if (symbolIndex instanceof Map) return symbolIndex.get(id) || null;
  if (Array.isArray(symbolIndex)) return symbolIndex.find((symbol) => symbol.id === id) || null;
  return isPlainObject(symbolIndex) ? symbolIndex[id] || null : null;
}

export function interpretComposition(composition, symbolIndex) {
  const components = Array.isArray(composition?.components) ? composition.components : [];
  const resolved = components.map((component) => ({
    component,
    symbol: resolveSymbol(symbolIndex, component.symbolId),
  }));
  const names = resolved.map(({ symbol }) => symbol?.name || "Symbole indisponible");
  const materialCount = components.filter((component) => component.role === "material").length;
  const hasMissingSymbol = resolved.some(({ symbol }) => !symbol);
  let status = "preview";
  if (components.length === 0 || materialCount === 0 || hasMissingSymbol) status = "incomplete";
  else if (materialCount > 1) status = "experimental";

  return {
    status,
    title: typeof composition?.name === "string" && composition.name.trim()
      ? composition.name.trim()
      : "Aperçu de l’effet",
    summary: components.length
      ? `Aperçu expérimental : ${names.join(" → ")}. Cette lecture démontre la composition et ne valide pas un effet 3D.`
      : "Ajoute des symboles pour commencer la composition.",
    roleSummary: resolved.map(({ component, symbol }) =>
      `${ROLE_LABELS[component.role] || "Rôle"} : ${symbol?.name || "Symbole indisponible"}`),
    componentCount: components.length,
  };
}
