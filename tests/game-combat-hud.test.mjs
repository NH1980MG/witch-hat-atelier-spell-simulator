import assert from "node:assert/strict";
import test from "node:test";

import { renderCombatHud } from "../game-combat-hud.mjs";

function createRoot() {
  let html = "";
  const buttons = [];
  return {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = String(value);
      this.textContent = html.replace(/<[^>]+>/g, " ");
    },
    textContent: "",
    querySelectorAll(selector) {
      if (selector !== "[data-combat-slot]") return [];
      if (buttons.length === 0) this.registerButtons();
      return buttons;
    },
    registerButtons() {
      if (buttons.length > 0) return;
      buttons.splice(0, buttons.length, ...[...html.matchAll(/data-combat-slot="([^"]+)"/g)].map((match) => {
        const listeners = {};
        return {
          dataset: { combatSlot: match[1] },
          addEventListener(type, handler) { listeners[type] = handler; },
          click() { listeners.click?.(); },
        };
      }));
    },
  };
}

test("combat HUD renders three presets and one custom slot", () => {
  const root = createRoot();

  renderCombatHud(root, {
    actor: { health: 82 },
    combat: { actors: { player: { energy: 64 } } },
    target: { health: 70 },
    reactions: { statuses: [{ type: "ignite", targetId: "training-target" }] },
  }, {
    presetSpells: [{ name: "A" }, { name: "B" }, { name: "C" }],
    customSpell: { name: "Libre" },
    activeSlot: "custom",
  });

  assert.equal(root.querySelectorAll("[data-combat-slot]").length, 4);
  assert.match(root.textContent, /82/);
  assert.match(root.textContent, /64/);
  assert.match(root.textContent, /enflammée/i);
});

test("combat HUD reports crystallization and bounded event history", () => {
  const root = createRoot();

  renderCombatHud(root, {
    actor: { health: 100 },
    combat: { actors: { player: { energy: 100 } } },
    target: { health: 25 },
    reactions: { statuses: [{ type: "crystallize", targetId: "training-target" }] },
    events: Array.from({ length: 8 }, (_, index) => ({ type: "event", index })),
  }, {
    presetSpells: [{ name: "A" }, { name: "B" }, { name: "C" }],
    customSpell: null,
    activeSlot: "preset-1",
  });

  assert.match(root.textContent, /cristallisée/i);
  assert.equal((root.innerHTML.match(/class="game-combat-event"/g) || []).length, 5);
});

test("combat HUD dispatches the selected preset and custom slot", () => {
  const root = createRoot();
  const selected = [];
  let drawn = 0;

  renderCombatHud(root, {}, {
    presetSpells: [{ name: "A" }, { name: "B" }, { name: "C" }],
    customSpell: { name: "Libre" },
  }, {
    onSelect: (slot) => selected.push(slot),
    onDraw: () => { drawn += 1; },
  });
  root.registerButtons();
  root.querySelectorAll("[data-combat-slot]")[0].click();
  root.querySelectorAll("[data-combat-slot]")[3].click();

  assert.deepEqual(selected, ["preset-1"]);
  assert.equal(drawn, 1);
});
