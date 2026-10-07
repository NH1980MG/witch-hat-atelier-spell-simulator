import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameFlow,
  drawingTimeScale,
  normalizeMatchSettings,
  transitionGameFlow,
} from "../game-flow.mjs";

test("match settings default to a 40 percent drawing slowdown", () => {
  const settings = normalizeMatchSettings();

  assert.deepEqual(settings, { drawingSlowdown: 40, drawingTimeScale: 0.6 });
});

test("match settings clamp invalid slowdown values without non-finite output", () => {
  assert.equal(normalizeMatchSettings({ drawingSlowdown: -1 }).drawingSlowdown, 0);
  assert.equal(normalizeMatchSettings({ drawingSlowdown: 81 }).drawingSlowdown, 80);
  assert.equal(normalizeMatchSettings({ drawingSlowdown: Infinity }).drawingSlowdown, 40);
  assert.equal(normalizeMatchSettings({ drawingSlowdown: 40.8 }).drawingSlowdown, 41);
});

test("drawing slowdown applies only during the drawing phase", () => {
  const preparation = createGameFlow({ settings: { drawingSlowdown: 80 } });
  assert.equal(drawingTimeScale(preparation), 1);

  const readyCheck = transitionGameFlow(preparation, { type: "ready" }).state;
  const countdown = transitionGameFlow(readyCheck, { type: "countdown-start" }).state;
  const activeCombat = transitionGameFlow(countdown, { type: "countdown-complete" }).state;
  const drawing = transitionGameFlow(activeCombat, { type: "open-drawing" }).state;

  assert.equal(drawingTimeScale(drawing), 0.2);
});

test("invalid phase events preserve state and return a reason", () => {
  const state = createGameFlow();
  const result = transitionGameFlow(state, { type: "countdown-complete" });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "invalid-phase");
  assert.deepEqual(result.state, state);
});

test("drawing cancellation preserves the previous custom spell", () => {
  const customSpell = { id: "spell-1", name: "Essai", actions: [{ type: "glyph" }] };
  let state = createGameFlow({ customSpell });
  state = transitionGameFlow(state, { type: "ready" }).state;
  state = transitionGameFlow(state, { type: "countdown-start" }).state;
  state = transitionGameFlow(state, { type: "countdown-complete" }).state;
  state = transitionGameFlow(state, { type: "open-drawing" }).state;

  const result = transitionGameFlow(state, { type: "drawing-cancelled", reason: "damage" });

  assert.equal(result.accepted, true);
  assert.equal(result.state.phase, "combat");
  assert.deepEqual(result.state.customSpell, customSpell);
});
