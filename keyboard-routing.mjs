// keyboard-routing.mjs
// Decides which canvas command a keydown maps to. Performs nothing and reads
// no state, so the whole shortcut map is testable under Node.

const NONE = Object.freeze({ command: "none", preventDefault: false });

const act = (command, preventDefault = false) => ({ command, preventDefault });

export function resolveKeyCommand(key, context) {
  // The modal gate is first. While the overlay is open, every canvas command is
  // suppressed - not just Escape. Cmd+D, Cmd+Z, Cmd+S and the bare letters A and
  // L would otherwise mutate a canvas the player cannot see.
  if (context.searchOpen) {
    return NONE;
  }

  const modifier = key.metaKey || key.ctrlKey;
  const lower = key.key.length === 1 ? key.key.toLowerCase() : key.key;

  if (modifier && lower === "z") {
    return act(key.shiftKey ? "redo" : "undo", true);
  }
  if (modifier && lower === "s") {
    return act("save", true);
  }
  if (modifier && lower === "k") {
    return act("openSearch", true);
  }
  if (modifier && lower === "d") {
    return act("duplicate", true);
  }

  if (context.isTyping) {
    return NONE;
  }

  if ((key.key === "Delete" || key.key === "Backspace") && context.hasSelection) {
    return act("delete", true);
  }

  if (key.key === "Escape") {
    if (context.view3dOpen) return act("close3d", true);
    if (context.drawerOpen) return act("closeDrawer", true);
    if (context.armed) return act("disarm", true);
    if (context.hasSelection) return act("clearSelection");
    if (context.guideSelected) return act("clearGuide");
    return act("clearCanvas");
  }

  if (lower === "a") return act("activateCircle");
  if (lower === "l") return act("analyzeSpell");
  if (key.key === "-" || key.key === "_") return act("zoomOut", true);
  if (key.key === "=") return act("zoomReset", true);
  if (key.key === "+" || key.key === "Add") return act("zoomIn", true);

  return NONE;
}
