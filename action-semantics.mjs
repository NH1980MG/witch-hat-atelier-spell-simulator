import { validateImageSemantic } from "./symbol-recognition-groups.mjs";

export const ANNOTATION_ACTION_TYPE = "annotation";
export const ANNOTATION_KINDS = Object.freeze(["drawing", "text"]);
export const COMMENTABLE_ACTION_TYPES = Object.freeze(["free", "circle", "ring", "ray", "glyph", "spiral"]);

export function isAnnotationAction(action) {
  return action?.type === ANNOTATION_ACTION_TYPE || action?.comment === true;
}

export function isSpellAction(action) {
  return Boolean(action) && !isAnnotationAction(action);
}

export function spellActions(actions = []) {
  return actions.filter(isSpellAction);
}

export function annotationKind(action) {
  return ANNOTATION_KINDS.includes(action?.kind) ? action.kind : "drawing";
}

export function isCommentableAction(action) {
  return COMMENTABLE_ACTION_TYPES.includes(action?.type);
}

/**
 * Return a semantic projection, never a replacement drawing action. Catalogue
 * is the app's [{name, kind}] list. Image ink retains its placement rotation;
 * this effective rotation is only for grammar/direction calculations. Native
 * imported glyphs may explicitly separate semanticKind from placement kind.
 */
export function resolveGlyphSemantic(action, catalogue) {
  if (!isSpellAction(action) || !Array.isArray(catalogue)) return null;
  const placementRotation = action.rotation === undefined ? 0 : action.rotation;
  if (!Number.isFinite(placementRotation)) return null;
  if (action.type === "image") {
    let semantic;
    try {
      semantic = validateImageSemantic(action.semantic);
    } catch {
      return null;
    }
    const entry = catalogue.find((entry) => entry?.name === semantic.element);
    if (!entry || entry.kind !== semantic.kind) return null;
    const rotation = placementRotation + semantic.rotationCorrection;
    return Number.isFinite(rotation) ? { element: semantic.element, kind: semantic.kind, rotation } : null;
  }
  if (action.type !== "glyph") return null;
  const entry = catalogue.find((entry) => entry?.name === action.element);
  if (!entry) return null;
  const kind = action.semanticKind ?? action.kind ?? entry.kind;
  if (kind !== "sigil" && kind !== "sign") return null;
  return { element: action.element, kind, rotation: placementRotation };
}

export function toggleSelectedCommentState(actions = [], indices = []) {
  const selected = new Set(indices.filter((index) => Number.isInteger(index)));
  const commentable = actions.filter((action, index) => selected.has(index) && isCommentableAction(action));
  if (commentable.length === 0) return actions;

  const restoreToSpell = commentable.every((action) => action.comment === true);
  return actions.map((action, index) => {
    if (!selected.has(index) || !isCommentableAction(action)) return action;
    if (restoreToSpell) {
      const restored = { ...action };
      delete restored.comment;
      return restored;
    }
    return { ...action, comment: true };
  });
}
