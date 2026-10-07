import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceReactionState,
  applyMaterialReaction,
  createReactionState,
} from "../combat-reactions.mjs";

test("fire propagation is bounded and water extinguishes it", () => {
  let state = createReactionState({ maxAffectedObjects: 2 });
  state = applyMaterialReaction(state, { sourceId: "player", material: "fire", targetIds: ["a", "b", "c"], duration: 1 });
  assert.equal(state.statuses.filter((status) => status.type === "ignite").length, 2);
  state = applyMaterialReaction(state, { sourceId: "player", material: "water", targetIds: ["a"], duration: 2 });
  assert.equal(state.statuses.some((status) => status.type === "ignite" && status.targetId === "a"), false);
  assert.equal(state.events.some((event) => event.type === "extinguish" && event.targetId === "a"), true);
  assert.equal(state.statuses.some((status) => status.type === "wet" && status.targetId === "a"), true);
});

test("crystal fracture, wind push, and timed cleanup are explicit bounded events", () => {
  let state = createReactionState();
  state = applyMaterialReaction(state, { sourceId: "player", material: "crystal", targetIds: ["target"], duration: 1 });
  assert.equal(state.statuses[0].type, "crystallize");
  state = applyMaterialReaction(state, { sourceId: "player", material: "fracture", targetIds: ["target"], duration: 0.5 });
  assert.equal(state.events.some((event) => event.type === "fracture"), true);
  state = applyMaterialReaction(state, { sourceId: "player", material: "wind", targetIds: ["target"], duration: 0.25, impulse: 4 });
  assert.equal(state.events.some((event) => event.type === "push" && event.impulse === 4), true);
  state = advanceReactionState(state, 2);
  assert.deepEqual(state.statuses, []);
});
