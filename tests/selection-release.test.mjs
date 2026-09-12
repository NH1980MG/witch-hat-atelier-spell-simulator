import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const functionSource = (name) => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))?.[0];

for (const button of [0, 2]) {
  test(`releasing a marquee hides the rectangle and keeps the selection (button ${button})`, () => {
    const state = {
      rightSelection: { mode: "marquee", pointerId: 7 },
      selectedActionIndices: [1, 3],
      selectionFrameVisible: true,
      pointerDown: true,
      start: { x: 1, y: 2 },
    };
    const context = vm.createContext({
      state,
      canvas: { style: {} },
      moveRightSelection() {},
      setSelectionStatus() {},
      updateSelectionControls() {},
      render() {},
    });
    vm.runInContext(`${functionSource("shouldKeepSelectionFrameAfterPointer")}\n${functionSource("finishRightSelection")}\nfinishRightSelection({ pointerId: 7, button: ${button} });`, context);
    assert.equal(state.rightSelection, null);
    assert.equal(state.selectionFrameVisible, false);
    assert.equal(state.pointerDown, false);
    assert.deepEqual(state.selectedActionIndices, [1, 3]);
  });
}
