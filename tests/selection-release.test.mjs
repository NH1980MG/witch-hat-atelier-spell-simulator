import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const functionSource = (name) => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))?.[0];

for (const button of [0, 2]) {
  test(`releasing a marquee keeps the object frame and handles (button ${button})`, () => {
    const state = {
      rightSelection: { mode: "marquee", pointerId: 7 },
      selectedActionIndices: [1, 3],
      pointerDown: true,
      start: { x: 1, y: 2 },
    };
    const rectangles = [];
    const handles = [];
    const bounds = { left: 10, top: 20, right: 50, bottom: 60, width: 40, height: 40 };
    const context = vm.createContext({
      state,
      colors: { gold: "gold" },
      visibleLineWidth: (width) => width,
      selectionBounds: () => state.selectedActionIndices.length ? bounds : null,
      selectionRotateHandle: () => ({ x: 30, y: 0 }),
      ctx: new Proxy({}, {
        get: (_, name) => (...args) => {
          if (name === "strokeRect" || name === "fillRect") rectangles.push([name, ...args]);
          if (name === "arc") handles.push(args);
        },
      }),
      canvas: { style: {} },
      moveRightSelection() {},
      setSelectionStatus() {},
      updateSelectionControls() {},
      render() {},
    });
    vm.runInContext(`${functionSource("finishRightSelection")}\n${functionSource("drawSelection")}\n${functionSource("drawSelectionMarquee")}\nfinishRightSelection({ pointerId: 7, button: ${button} }); drawSelectionMarquee(); drawSelection();`, context);
    assert.equal(state.rightSelection, null);
    assert.equal(state.pointerDown, false);
    assert.deepEqual(state.selectedActionIndices, [1, 3]);
    assert.deepEqual(rectangles, [["strokeRect", 10, 20, 40, 40]]);
    assert.equal(handles.length, 5);
    rectangles.length = 0;
    handles.length = 0;
    state.selectedActionIndices = [];
    vm.runInContext("drawSelection(); drawSelectionMarquee();", context);
    assert.equal(rectangles.length, 0);
    assert.equal(handles.length, 0);
  });
}
