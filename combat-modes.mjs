const MAX_ACTIONS_PER_SPELL = 256;

const DEFAULT_PRESETS = Object.freeze([
  Object.freeze({
    id: "preset-1",
    name: "Trait de braise",
    actions: Object.freeze([{ type: "glyph", element: "Feu", kind: "sigil", x: 0, y: 0, size: 30 }]),
  }),
  Object.freeze({
    id: "preset-2",
    name: "Vague de verre",
    actions: Object.freeze([{ type: "glyph", element: "Eau", kind: "sigil", x: 0, y: 0, size: 30 }, { type: "glyph", element: "Cristal", kind: "sign", x: 0, y: -80, size: 20 }]),
  }),
  Object.freeze({
    id: "preset-3",
    name: "Vent ascendant",
    actions: Object.freeze([{ type: "glyph", element: "Vent", kind: "sigil", x: 0, y: 0, size: 30 }, { type: "glyph", element: "Colonne", kind: "sign", x: 0, y: -80, size: 20 }]),
  }),
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteAction(action) {
  if (!action || typeof action !== "object" || typeof action.type !== "string") return false;
  return Object.values(action).every((value) => {
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(finiteActionValue);
    return true;
  });
}

function finiteActionValue(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteActionValue);
  if (value && typeof value === "object") return Object.values(value).every(finiteActionValue);
  return true;
}

export function isValidCombatSpell(spell) {
  return Boolean(spell)
    && typeof spell === "object"
    && typeof spell.id === "string"
    && spell.id.length > 0
    && typeof spell.name === "string"
    && spell.name.length > 0
    && Array.isArray(spell.actions)
    && spell.actions.length > 0
    && spell.actions.length <= MAX_ACTIONS_PER_SPELL
    && spell.actions.every(finiteAction);
}

function normalizedSpell(spell) {
  return {
    id: spell.id,
    name: spell.name,
    actions: clone(spell.actions),
  };
}

function normalizedPresets(presets) {
  const valid = Array.isArray(presets) ? presets.filter(isValidCombatSpell) : [];
  return Array.from({ length: 3 }, (_, index) => normalizedSpell(valid[index] || DEFAULT_PRESETS[index]));
}

function normalizedState(mode) {
  return {
    modeId: "free-composition",
    presetSpells: normalizedPresets(mode?.presetSpells),
    customSpell: isValidCombatSpell(mode?.customSpell) ? normalizedSpell(mode.customSpell) : null,
    activeSlot: mode?.activeSlot === "custom" && isValidCombatSpell(mode?.customSpell)
      ? "custom"
      : /^preset-[123]$/.test(mode?.activeSlot || "") ? mode.activeSlot : "preset-1",
    compositionPolicy: {
      presetCount: 3,
      customSlots: 1,
      requiresDisposalBeforeReplacement: true,
    },
  };
}

export function createFreeCompositionBattleMode({ presets } = {}) {
  return normalizedState({ presetSpells: presets });
}

export function installCustomSpell(mode, spell) {
  const state = normalizedState(mode);
  if (!isValidCombatSpell(spell)) return { accepted: false, reason: "invalid-spell", state };
  if (state.customSpell) return { accepted: false, reason: "custom-slot-busy", state };
  return {
    accepted: true,
    state: { ...state, customSpell: normalizedSpell(spell), activeSlot: "custom" },
  };
}

export function disposeCustomSpell(mode) {
  const state = normalizedState(mode);
  return { ...state, customSpell: null, activeSlot: "preset-1" };
}

export function selectActiveSpell(mode, slot) {
  const state = normalizedState(mode);
  if (slot === "custom" && state.customSpell) return { ...state, activeSlot: "custom" };
  if (/^preset-[123]$/.test(slot)) return { ...state, activeSlot: slot };
  return state;
}

export function activeCombatSpell(mode) {
  const state = normalizedState(mode);
  if (state.activeSlot === "custom") return state.customSpell;
  return state.presetSpells[Number(state.activeSlot.slice(-1)) - 1] || state.presetSpells[0];
}
