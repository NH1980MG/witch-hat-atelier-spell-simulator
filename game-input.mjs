const KEY_BINDINGS = Object.freeze({
  KeyW: ["move", "y", -1],
  ArrowUp: ["move", "y", -1],
  KeyS: ["move", "y", 1],
  ArrowDown: ["move", "y", 1],
  KeyA: ["move", "x", -1],
  ArrowLeft: ["move", "x", -1],
  KeyD: ["move", "x", 1],
  ArrowRight: ["move", "x", 1],
});

const ACTION_KEYS = new Set([
  "Space", "KeyF", "KeyG", "ShiftLeft", "ShiftRight", "KeyE", "Enter", "Escape",
]);

function clampAxis(value) {
  return Math.max(-1, Math.min(1, Number(value) || 0));
}

function targetPoint(event, target) {
  const rect = typeof target?.getBoundingClientRect === "function"
    ? target.getBoundingClientRect()
    : { left: 0, top: 0, width: target?.innerWidth || 1, height: target?.innerHeight || 1 };
  return {
    x: clampAxis(((Number(event.clientX) - rect.left) / Math.max(1, rect.width)) * 2 - 1),
    y: clampAxis(((Number(event.clientY) - rect.top) / Math.max(1, rect.height)) * 2 - 1),
  };
}

function isInterfaceControl(event) {
  return typeof event?.target?.closest === "function"
    && Boolean(event.target.closest("button, input, textarea, select, summary, details, #drawingCanvas"));
}

export function createGameInput({ target = globalThis } = {}) {
  const heldKeys = new Set();
  const heldPointers = new Map();
  const queuedPointerActions = new Set();
  let aim = { x: 0, y: 0 };

  function prevent(event) {
    if (typeof event.preventDefault === "function") event.preventDefault();
  }

  function onKeyDown(event) {
    const code = event.code || event.key;
    if (KEY_BINDINGS[code] || ACTION_KEYS.has(code)) {
      heldKeys.add(code);
      prevent(event);
    }
  }

  function onKeyUp(event) {
    heldKeys.delete(event.code || event.key);
  }

  function releasePointer(pointerId) {
    heldPointers.delete(pointerId);
    if (typeof target.releasePointerCapture === "function") {
      try { target.releasePointerCapture(pointerId); } catch { /* capture may already be released */ }
    }
  }

  function onPointerDown(event) {
    if (isInterfaceControl(event)) return;
    const pointerId = Number.isFinite(event.pointerId) ? event.pointerId : "primary";
    const action = event.button === 2 ? "dodge" : event.button === 1 ? "guard" : "cast";
    heldPointers.set(pointerId, action);
    queuedPointerActions.add(action);
    aim = targetPoint(event, target);
    if (typeof target.setPointerCapture === "function" && Number.isFinite(event.pointerId)) {
      try { target.setPointerCapture(event.pointerId); } catch { /* optional browser capability */ }
    }
    prevent(event);
  }

  function onPointerMove(event) {
    aim = targetPoint(event, target);
  }

  function onPointerUp(event) {
    releasePointer(Number.isFinite(event.pointerId) ? event.pointerId : "primary");
  }

  function reset() {
    heldKeys.clear();
    heldPointers.clear();
    queuedPointerActions.clear();
    aim = { x: 0, y: 0 };
  }

  const listeners = [
    ["keydown", onKeyDown], ["keyup", onKeyUp],
    ["pointerdown", onPointerDown], ["pointermove", onPointerMove],
    ["pointerup", onPointerUp], ["pointercancel", onPointerUp],
    ["blur", reset], ["visibilitychange", reset],
  ];
  listeners.forEach(([type, listener]) => target?.addEventListener?.(type, listener));

  return {
    readCommand({ gamepad = null, context = null } = {}) {
      const move = { x: 0, y: 0 };
      for (const [code, [group, axis, amount]] of Object.entries(KEY_BINDINGS)) {
        if (group === "move" && heldKeys.has(code)) move[axis] += amount;
      }
      if (gamepad?.axes) {
        move.x += Number(gamepad.axes[0]) || 0;
        move.y += Number(gamepad.axes[1]) || 0;
      }
      const pointerActions = new Set(heldPointers.values());
      const command = {
        move: { x: clampAxis(move.x), y: clampAxis(move.y) },
        aim: { ...aim },
        cast: heldKeys.has("Space") || heldKeys.has("KeyF") || pointerActions.has("cast") || queuedPointerActions.has("cast") || Boolean(gamepad?.buttons?.[0]?.pressed),
        dodge: heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight") || pointerActions.has("dodge") || queuedPointerActions.has("dodge") || Boolean(gamepad?.buttons?.[1]?.pressed),
        guard: heldKeys.has("KeyG") || pointerActions.has("guard") || queuedPointerActions.has("guard") || Boolean(gamepad?.buttons?.[4]?.pressed),
      };
      queuedPointerActions.clear();
      if (context) {
        command.openDrawing = heldKeys.has("KeyE");
        command.confirmDrawing = heldKeys.has("Enter");
        command.cancelDrawing = heldKeys.has("Escape");
      }
      return command;
    },
    reset,
    dispose() {
      listeners.forEach(([type, listener]) => target?.removeEventListener?.(type, listener));
      reset();
    },
  };
}
