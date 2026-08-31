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
