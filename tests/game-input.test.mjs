import assert from "node:assert/strict";
import test from "node:test";

import { createGameInput } from "../game-input.mjs";

function event(type, values = {}) {
  const result = new Event(type);
  Object.assign(result, values);
  return result;
}

test("maps keyboard controls to movement, cast, dodge, and guard commands", () => {
  const target = new EventTarget();
  const input = createGameInput({ target });

  target.dispatchEvent(event("keydown", { code: "KeyW", preventDefault() {} }));
  target.dispatchEvent(event("keydown", { code: "ArrowRight", preventDefault() {} }));
  target.dispatchEvent(event("keydown", { code: "Space", preventDefault() {} }));
  target.dispatchEvent(event("keydown", { code: "ShiftLeft", preventDefault() {} }));
  target.dispatchEvent(event("keydown", { code: "KeyG", preventDefault() {} }));

  assert.deepEqual(input.readCommand(), {
    move: { x: 1, y: -1 },
    aim: { x: 0, y: 0 },
    cast: true,
    dodge: true,
    guard: true,
  });

  input.dispose();
});

test("pointer cancellation and window blur release held actions", () => {
  const target = new EventTarget();
  const input = createGameInput({ target });

  target.dispatchEvent(event("pointerdown", {
    button: 0,
    pointerId: 7,
    clientX: 900,
    clientY: 100,
    preventDefault() {},
  }));
  assert.equal(input.readCommand().cast, true);
  assert.notDeepEqual(input.readCommand().aim, { x: 0, y: 0 });

  target.dispatchEvent(event("pointercancel", { pointerId: 7 }));
  assert.equal(input.readCommand().cast, false);

  target.dispatchEvent(event("keydown", { code: "KeyG", preventDefault() {} }));
  assert.equal(input.readCommand().guard, true);
  target.dispatchEvent(event("blur"));
  assert.deepEqual(input.readCommand(), {
    move: { x: 0, y: 0 },
    aim: { x: 0, y: 0 },
    cast: false,
    dodge: false,
    guard: false,
  });

  input.dispose();
});

test("a complete pointer click queues one cast for the next frame", () => {
  const target = new EventTarget();
  const input = createGameInput({ target });

  target.dispatchEvent(event("pointerdown", {
    button: 0,
    pointerId: 8,
    clientX: 400,
    clientY: 200,
    preventDefault() {},
  }));
  target.dispatchEvent(event("pointerup", { pointerId: 8 }));

  assert.equal(input.readCommand().cast, true);
  assert.equal(input.readCommand().cast, false);
  input.dispose();
});

test("maps drawing context controls to open, confirm, and cancel commands", () => {
  const target = new EventTarget();
  const input = createGameInput({ target });

  target.dispatchEvent(event("keydown", { code: "KeyE", preventDefault() {} }));
  assert.equal(input.readCommand({ context: "combat" }).openDrawing, true);
  target.dispatchEvent(event("keyup", { code: "KeyE" }));
  target.dispatchEvent(event("keydown", { code: "Enter", preventDefault() {} }));
  assert.equal(input.readCommand({ context: "drawing" }).confirmDrawing, true);
  target.dispatchEvent(event("keyup", { code: "Enter" }));
  target.dispatchEvent(event("keydown", { code: "Escape", preventDefault() {} }));
  assert.equal(input.readCommand({ context: "drawing" }).cancelDrawing, true);

  input.dispose();
});

test("clicking a UI control does not become a combat pointer action", () => {
  const target = new EventTarget();
  const input = createGameInput({ target });
  const button = { closest: (selector) => selector.includes("button") };

  const pointerEvent = event("pointerdown", {
    button: 0,
    pointerId: 9,
    preventDefault() {},
  });
  Object.defineProperty(pointerEvent, "target", { value: button });
  target.dispatchEvent(pointerEvent);

  assert.equal(input.readCommand().cast, false);
  input.dispose();
});
