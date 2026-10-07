const PLAYER_SPEED = 4;
const DODGE_DURATION = 0.35;
export const PLAYER_MAX_ENERGY = 100;
export const PLAYER_ENERGY_REGEN = 12;

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
  return value;
}

function nonNegativeNumber(value, label) {
  finiteNumber(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative`);
  }
  return value;
}

function cloneState(state) {
  return {
    ...state,
    actors: Object.fromEntries(Object.entries(state.actors).map(([id, actor]) => [
      id,
      { ...actor, cooldowns: { ...actor.cooldowns } },
    ])),
    effects: state.effects.map((effect) => ({ ...effect })),
    events: state.events.map((event) => ({ ...event })),
  };
}

export function createCombatState({ arena = { width: 18, depth: 12 } } = {}) {
  const width = nonNegativeNumber(arena.width, "arena.width");
  const depth = nonNegativeNumber(arena.depth, "arena.depth");
  return {
    time: 0,
    arena: { width, depth },
    actors: {
      player: {
        id: "player",
        x: 0,
        y: 0,
        z: 0,
        energy: PLAYER_MAX_ENERGY,
        health: 100,
        cooldowns: {},
        invulnerableUntil: 0,
      },
    },
    effects: [],
    events: [],
  };
}

export function advanceCombat(state, command = {}, delta = 0) {
  nonNegativeNumber(delta, "delta");
  const move = command.move ?? { x: 0, y: 0 };
  const moveX = finiteNumber(move.x ?? 0, "move.x");
  const moveZ = finiteNumber(move.y ?? move.z ?? 0, "move.y");
  const next = cloneState(state);
  const player = next.actors.player;
  const step = Math.min(delta, 0.1);
  const length = Math.hypot(moveX, moveZ);
  const scale = length > 1 ? 1 / length : 1;
  player.x += moveX * scale * PLAYER_SPEED * delta;
  player.z += moveZ * scale * PLAYER_SPEED * delta;
  const halfWidth = Math.max(0, next.arena.width / 2 - 0.75);
  const halfDepth = Math.max(0, next.arena.depth / 2 - 0.75);
  player.x = Math.max(-halfWidth, Math.min(halfWidth, player.x));
  player.z = Math.max(-halfDepth, Math.min(halfDepth, player.z));
  player.energy = Math.min(
    PLAYER_MAX_ENERGY,
    Math.max(0, player.energy + PLAYER_ENERGY_REGEN * delta),
  );
  next.time += step;
  if (command.dodge) {
    player.invulnerableUntil = Math.max(player.invulnerableUntil, next.time + DODGE_DURATION);
  }
  next.effects = next.effects.filter((effect) => effect.expiresAt > next.time);
  return next;
}

export function castCombatAbility(state, { spellId, cost = 0, cooldown = 0 } = {}) {
  if (typeof spellId !== "string" || !spellId.trim()) {
    throw new TypeError("spellId must be a non-empty string");
  }
  nonNegativeNumber(cost, "cost");
  nonNegativeNumber(cooldown, "cooldown");
  const next = cloneState(state);
  const player = next.actors.player;
  if ((player.cooldowns[spellId] ?? 0) > next.time) {
    return { accepted: false, reason: "cooldown", state };
  }
  if (player.energy < cost) {
    return { accepted: false, reason: "energy", state };
  }
  player.energy -= cost;
  player.cooldowns[spellId] = next.time + cooldown;
  next.events.push({ type: "cast", actorId: player.id, spellId, time: next.time });
  return { accepted: true, state: next };
}

export function attachCombatEffect(state, { id, type, targetId, duration } = {}) {
  if (typeof id !== "string" || !id.trim()) throw new TypeError("id must be a non-empty string");
  if (typeof type !== "string" || !type.trim()) throw new TypeError("type must be a non-empty string");
  if (typeof targetId !== "string" || !targetId.trim()) throw new TypeError("targetId must be a non-empty string");
  nonNegativeNumber(duration, "duration");
  const next = cloneState(state);
  next.effects.push({ id, type, targetId, startedAt: next.time, expiresAt: next.time + duration });
  return next;
}

export function resetCombatState(state = {}) {
  return createCombatState({ arena: state.arena });
}
