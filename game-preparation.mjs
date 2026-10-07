import { normalizeMatchSettings } from "./game-flow.mjs";
import { createFreeCompositionBattleMode, isValidCombatSpell } from "./combat-modes.mjs";

function clone(value) {
  return value === undefined || value === null ? value : JSON.parse(JSON.stringify(value));
}

export function createPreparationModel(options = {}) {
  const mode = createFreeCompositionBattleMode({
    presets: options.presets || options.presetSpells || options.mode?.presetSpells,
  });
  const customSpell = isValidCombatSpell(options.customSpell)
    ? clone(options.customSpell)
    : null;
  const settings = normalizeMatchSettings(options.settings);

  return {
    modeId: mode.modeId,
    presets: clone(mode.presetSpells),
    customSpell,
    settings,
    speedLabel: `${Math.round(settings.drawingTimeScale * 100)}%`,
  };
}

export function validatePreparation(model) {
  const state = createPreparationModel(model);
  if (!isValidCombatSpell(state.customSpell)) {
    return { accepted: false, reason: "custom-spell-required", model: state };
  }
  return { accepted: true, model: state };
}
