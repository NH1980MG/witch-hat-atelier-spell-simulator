import assert from "node:assert/strict";
import test from "node:test";

import { classifySymbolDragGesture } from "../symbol-drag-gesture.mjs";

test("mouse and pen pointers start dragging immediately", () => {
  assert.equal(classifySymbolDragGesture("mouse", 0, 0), "drag");
  assert.equal(classifySymbolDragGesture("pen", 0, 0), "drag");
});

test("a short touch movement remains pending", () => {
  assert.equal(classifySymbolDragGesture("touch", 3, 4), "pending");
});

test("a vertical touch movement scrolls the palette", () => {
  assert.equal(classifySymbolDragGesture("touch", 4, 14), "scroll");
  assert.equal(classifySymbolDragGesture("touch", -2, -18), "scroll");
});

test("a horizontal touch movement starts dragging the symbol", () => {
  assert.equal(classifySymbolDragGesture("touch", 14, 4), "drag");
  assert.equal(classifySymbolDragGesture("touch", -18, -3), "drag");
});
