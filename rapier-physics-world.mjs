export const RAPIER_COMPAT_VERSION = "0.19.3";
export const RAPIER_COMPAT_MODULE = "./vendor/rapier/rapier3d-compat.module.js";

let rapierLoadPromise = null;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function vector3(value = {}, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: finiteNumber(value.x, fallback.x),
    y: finiteNumber(value.y, fallback.y),
    z: finiteNumber(value.z, fallback.z),
  };
}

function roundVector3(value = {}) {
  return {
    x: roundPhysicsValue(finiteNumber(value.x, 0)),
    y: roundPhysicsValue(finiteNumber(value.y, 0)),
    z: roundPhysicsValue(finiteNumber(value.z, 0)),
  };
}

function roundQuaternion(value = {}) {
  return {
    x: roundPhysicsValue(finiteNumber(value.x, 0)),
    y: roundPhysicsValue(finiteNumber(value.y, 0)),
    z: roundPhysicsValue(finiteNumber(value.z, 0)),
    w: roundPhysicsValue(finiteNumber(value.w, 1)),
  };
}

function forceMagnitude(force) {
  return Math.max(0, finiteNumber(force.physicalImpulse, finiteNumber(force.magnitude, 0)));
}

function massForTarget(target = {}) {
  return Math.max(0.1, finiteNumber(target.mass, 1));
}

function roundPhysicsValue(value) {
  return Math.round(value * 1000) / 1000;
}

function colliderForTarget(RAPIER, target = {}) {
  const collider = target.collider || {};
  if (collider.type === "cuboid") {
    const halfExtents = vector3(collider.halfExtents, { x: 0.5, y: 0.5, z: 0.5 });
    return RAPIER.ColliderDesc.cuboid(
      Math.max(0.01, halfExtents.x),
      Math.max(0.01, halfExtents.y),
      Math.max(0.01, halfExtents.z),
    );
  }
  if (collider.type === "capsule" && typeof RAPIER.ColliderDesc.capsule === "function") {
    return RAPIER.ColliderDesc.capsule(
      Math.max(0.01, finiteNumber(collider.halfHeight, 0.5)),
      Math.max(0.01, finiteNumber(collider.radius, 0.2)),
    );
  }
  return RAPIER.ColliderDesc.ball(Math.max(0.01, finiteNumber(collider.radius, 0.35)));
}

function makeBodyDesc(RAPIER, target = {}) {
  const position = vector3(target.position, { x: 0, y: 0.35, z: 0 });
  const desc = target.anchored ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
  return desc.setTranslation(position.x, position.y, position.z);
}

function applyForceToBody(body, force, baseMass) {
  if (!body || !force) return;
  if (force.type === "adhesion-damping" && typeof body.setLinearDamping === "function") {
    body.setLinearDamping(Math.max(0, finiteNumber(force.damping, 0)) * 10);
    return;
  }
  if (force.type === "mass-load" && typeof body.setAdditionalMass === "function") {
    body.setAdditionalMass(roundPhysicsValue(baseMass * (1 + Math.max(0, finiteNumber(force.massLoad, 0)))));
    return;
  }
  if (typeof body.applyImpulse !== "function") return;
  const direction = vector3(force.direction, { x: 0, y: 0, z: -1 });
  const magnitude = forceMagnitude(force);
  body.applyImpulse({
    x: direction.x * magnitude,
    y: direction.y * magnitude,
    z: direction.z * magnitude,
  }, true);
}

function distanceXZ(a = {}, b = {}) {
  return Math.hypot(finiteNumber(a.x, 0) - finiteNumber(b.x, 0), finiteNumber(a.z, 0) - finiteNumber(b.z, 0));
}

function forceAffectsTarget(force = {}, target = {}) {
  const radius = finiteNumber(force.radiusMeters, Infinity);
  if (!Number.isFinite(radius)) return true;
  const origin = vector3(force.origin, { x: 0, y: 0, z: 0 });
  const position = vector3(target.position, { x: 0, y: 0, z: 0 });
  return distanceXZ(origin, position) <= radius + Math.max(0, finiteNumber(target.radius, 0));
}

function reactionStateForForce(force = {}) {
  if (force.type === "adhesion-damping") return "damped";
  if (force.type === "mass-load") return "loaded";
  if (force.type === "thermal-field") return "heated";
  if (force.type === "radiant-pulse" || force.type === "radiant-field") return "illuminated";
  return "pushed";
}

const COMBUSTIBLE_MATERIALS = new Set(["cloth", "paper", "plant", "wax", "wood"]);

function forceWetsTarget(force = {}) {
  return force.type === "water-field"
    || force.type === "wetting-field"
    || (force.channels || []).includes("wetting");
}

function thermalReaction(entry, forces, deltaSeconds) {
  if (forces.some(forceWetsTarget)) {
    entry.wetness = Math.min(1, entry.wetness + deltaSeconds * 2.5);
    if (entry.heatExposure > 0 || ["heated", "scorched", "burning"].includes(entry.reactionState)) {
      entry.heatExposure = 0;
      entry.reactionState = "extinguished";
    } else {
      entry.reactionState = "wet";
    }
    return true;
  }

  const heat = forces.reduce((maximum, force) => (
    force.type === "thermal-field" ? Math.max(maximum, finiteNumber(force.heat, force.magnitude)) : maximum
  ), 0);
  if (heat <= 0) return false;
  entry.wetness = Math.max(0, entry.wetness - deltaSeconds * heat);
  entry.heatExposure += heat * deltaSeconds * (1 - entry.wetness * 0.75);
  if (!COMBUSTIBLE_MATERIALS.has(entry.material)) {
    entry.reactionState = "heated";
  } else if (entry.heatExposure >= 0.45) {
    entry.reactionState = "burning";
  } else if (entry.heatExposure >= 0.2) {
    entry.reactionState = "scorched";
  } else {
    entry.reactionState = "heated";
  }
  return true;
}

export async function loadRapier3dCompat({ importer = (specifier) => import(specifier) } = {}) {
  if (!rapierLoadPromise) {
    rapierLoadPromise = importer(RAPIER_COMPAT_MODULE).then(async (module) => {
      const RAPIER = module.default || module;
      if (typeof RAPIER.init === "function") {
        await RAPIER.init({});
      }
      return RAPIER;
    });
  }
  return rapierLoadPromise;
}

export function createSpellPhysicsRuntime(RAPIER, options = {}) {
  if (!RAPIER?.World || !RAPIER?.RigidBodyDesc || !RAPIER?.ColliderDesc) {
    throw new TypeError("Rapier runtime is missing World, RigidBodyDesc, or ColliderDesc.");
  }

  const gravity = vector3(options.gravity, { x: 0, y: -9.81, z: 0 });
  const world = new RAPIER.World(gravity);
  const targets = new Map();
  const colliderTargets = new Map();
  let spellField = null;
  let contacts = new Set();

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(80, 0.05, 80), groundBody);

  for (const target of options.targets || []) {
    const id = target.id || `target-${targets.size + 1}`;
    const body = world.createRigidBody(makeBodyDesc(RAPIER, target));
    const mass = massForTarget(target);
    if (!target.anchored && typeof body.setAdditionalMass === "function") {
      body.setAdditionalMass(mass);
    }
    const collider = world.createCollider(colliderForTarget(RAPIER, target), body);
    const entry = {
      body,
      collider,
      target,
      mass,
      material: target.material || "generic",
      reactionState: "idle",
      settled: true,
      heatExposure: 0,
      wetness: 0,
    };
    targets.set(id, entry);
    colliderTargets.set(collider, id);
    if (collider?.handle !== undefined) colliderTargets.set(collider.handle, id);
  }

  function targetIdsInsideSpellField() {
    if (!spellField) return new Set();
    const hits = new Set();
    if (typeof world.intersectionsWithShape === "function" && typeof RAPIER.Ball === "function") {
      const shape = new RAPIER.Ball(spellField.radiusMeters);
      world.intersectionsWithShape(
        spellField.position,
        { x: 0, y: 0, z: 0, w: 1 },
        shape,
        (collider) => {
          const id = colliderTargets.get(collider) ?? colliderTargets.get(collider?.handle);
          if (id) hits.add(id);
          return true;
        },
      );
      return hits;
    }
    for (const [id, entry] of targets) {
      const current = entry.body.translation?.() || entry.target.position;
      const distance = Math.hypot(
        finiteNumber(current.x) - spellField.position.x,
        finiteNumber(current.y) - spellField.position.y,
        finiteNumber(current.z) - spellField.position.z,
      );
      if (distance <= spellField.radiusMeters + Math.max(0, finiteNumber(entry.target.radius, 0))) hits.add(id);
    }
    return hits;
  }

  function applySpellContacts(deltaSeconds) {
    if (!spellField) return;
    const nextContacts = targetIdsInsideSpellField();
    for (const id of nextContacts) {
      const entry = targets.get(id);
      if (!entry) continue;
      const isNewContact = !contacts.has(id);
      const reactedThermally = thermalReaction(entry, spellField.forces, deltaSeconds);
      for (const force of spellField.forces) {
        if (force.type === "thermal-field" || forceWetsTarget(force)) continue;
        if (isNewContact && !entry.target.anchored) applyForceToBody(entry.body, force, entry.mass);
        if (!reactedThermally) entry.reactionState = reactionStateForForce(force);
      }
      entry.settled = false;
    }
    contacts = nextContacts;
  }

  return Object.freeze({
    world,
    targets,
    applySpellForces(forces = []) {
      for (const entry of targets.values()) {
        if (entry.target.anchored) continue;
        for (const force of forces) {
          if (!forceAffectsTarget(force, entry.target)) continue;
          applyForceToBody(entry.body, force, entry.mass);
          entry.reactionState = reactionStateForForce(force);
          entry.settled = false;
        }
      }
    },
    setSpellField(field = {}) {
      spellField = {
        position: vector3(field.position, { x: 0, y: 0, z: 0 }),
        radiusMeters: Math.max(0.05, finiteNumber(field.radiusMeters, 0.5)),
        forces: [...(field.forces || [])],
      };
      contacts = new Set();
    },
    setSpellFieldPosition(position = {}) {
      if (spellField) spellField.position = vector3(position, spellField.position);
    },
    step(deltaSeconds = 1 / 60) {
      const delta = Math.max(1 / 240, Math.min(1 / 20, finiteNumber(deltaSeconds, 1 / 60)));
      world.timestep = delta;
      world.step();
      applySpellContacts(delta);
    },
    snapshot() {
      return {
        targets: [...targets].map(([id, entry]) => ({
          id,
          material: entry.material,
          position: roundVector3(entry.body.translation?.() || entry.target.position),
          rotation: roundQuaternion(entry.body.rotation?.()),
          reactionState: entry.reactionState,
          heatExposure: roundPhysicsValue(entry.heatExposure),
          wetness: roundPhysicsValue(entry.wetness),
          settled: entry.settled,
        })),
        contacts: [...contacts],
      };
    },
  });
}
