import {
  loadStrokeSmoothing,
  saveStrokeSmoothing,
} from "./stroke-smoothing.mjs?v=20260831-sigil-composition-dialog-v1";

const input = document.querySelector("#strokeSmoothingInput");
const output = document.querySelector("#strokeSmoothingValue");

function render(value) {
  if (output) output.textContent = `${value}%`;
  input?.setAttribute("aria-valuenow", String(value));
}

if (input) {
  const current = loadStrokeSmoothing(localStorage);
  input.value = String(current);
  render(current);
  input.addEventListener("input", () => render(saveStrokeSmoothing(localStorage, input.value)));
}
