import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCombat,
  attachCombatEffect,
  castCombatAbility,
  createCombatState,
  resetCombatState,
} from "../combat-model.mjs";

test("combat movement, energy, cooldowns, dodge invulnerability, and reset are deterministic", () => {
  let state = createCombatState();
  state = advanceCombat(state, { move: { x: 1, y: 0 } }, 0.5);
  assert.equal(state.actors.player.x, 2);

  const cast = castCombatAbility(state, { spellId: "fire", cost: 20, cooldown: 1 });
  assert.equal(cast.accepted, true);
  state = cast.state;
  assert.equal(state.actors.player.energy, 80);
  assert.equal(castCombatAbility(state, { spellId: "fire", cost: 20, cooldown: 1 }).reason, "cooldown");

  state = advanceCombat(state, { dodge: true, move: { x: 0, y: 0 } }, 0.1);
  assert.equal(state.actors.player.invulnerableUntil > state.time, true);
  state = attachCombatEffect(state, { id: "burn-1", type: "ignite", targetId: "player", duration: 2 });
  const reset = resetCombatState(state);
  assert.deepEqual(reset.actors.player, createCombatState().actors.player);
  assert.deepEqual(reset.effects, []);
  assert.deepEqual(reset.events, []);
});

test("energy regenerates over time but never exceeds its maximum", () => {
  let state = createCombatState();
  state = castCombatAbility(state, { spellId: "fire", cost: 20 }).state;

  state = advanceCombat(state, {}, 1);
  assert.equal(state.actors.player.energy, 92);

  state = advanceCombat(state, {}, 10);
  assert.equal(state.actors.player.energy, 100);
});

test("combat rejects non-finite values and negative durations", () => {
  assert.throws(() => advanceCombat(createCombatState(), { move: { x: Infinity, y: 0 } }, 0.1), /finite/i);
  assert.throws(() => castCombatAbility(createCombatState(), { spellId: "bad", cost: -1, cooldown: 1 }), /cost/i);
  assert.throws(() => attachCombatEffect(createCombatState(), { id: "bad", type: "hit", targetId: "player", duration: -1 }), /duration/i);
});
