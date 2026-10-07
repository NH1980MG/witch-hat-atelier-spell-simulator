import assert from "node:assert/strict";
import test from "node:test";

import {
  createFreeCompositionBattleMode,
  disposeCustomSpell,
  installCustomSpell,
  selectActiveSpell,
} from "../combat-modes.mjs";

const customSpell = {
  id: "custom-water-flower",
  name: "Water Flower",
  actions: [{ type: "glyph", element: "Eau", kind: "sigil", x: 0, y: 0, size: 30 }],
};

test("free composition always exposes three presets and one custom slot", () => {
  const mode = createFreeCompositionBattleMode();

  assert.equal(mode.modeId, "free-composition");
  assert.equal(mode.presetSpells.length, 3);
  assert.equal(mode.customSpell, null);
  assert.equal(mode.activeSlot, "preset-1");
  assert.deepEqual(mode.compositionPolicy, {
    presetCount: 3,
    customSlots: 1,
    requiresDisposalBeforeReplacement: true,
  });
});

test("invalid custom spells are rejected without changing the presets", () => {
  const mode = createFreeCompositionBattleMode();
  const result = installCustomSpell(mode, { name: "broken", actions: "not-an-array" });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "invalid-spell");
  assert.equal(result.state.customSpell, null);
  assert.equal(result.state.presetSpells.length, 3);
});

test("custom replacement requires disposal and preserves the three presets", () => {
  let mode = createFreeCompositionBattleMode();
  mode = installCustomSpell(mode, customSpell).state;
  const blocked = installCustomSpell(mode, { ...customSpell, id: "second" });

  assert.equal(blocked.accepted, false);
  assert.equal(blocked.reason, "custom-slot-busy");
  assert.equal(blocked.state.customSpell.id, "custom-water-flower");

  mode = disposeCustomSpell(mode);
  mode = installCustomSpell(mode, { ...customSpell, id: "second" }).state;
  mode = selectActiveSpell(mode, "custom");
  assert.equal(mode.customSpell.id, "second");
  assert.equal(mode.activeSlot, "custom");
  assert.equal(mode.presetSpells.length, 3);
});
