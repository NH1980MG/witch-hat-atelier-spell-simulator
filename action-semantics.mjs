export const ANNOTATION_ACTION_TYPE = "annotation";
export const ANNOTATION_KINDS = Object.freeze(["drawing", "text"]);

export function isAnnotationAction(action) {
  return action?.type === ANNOTATION_ACTION_TYPE;
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
