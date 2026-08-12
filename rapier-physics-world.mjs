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

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(80, 0.05, 80), groundBody);

  for (const target of options.targets || []) {
    const id = target.id || `target-${targets.size + 1}`;
    const body = world.createRigidBody(makeBodyDesc(RAPIER, target));
    const mass = massForTarget(target);
    if (!target.anchored && typeof body.setAdditionalMass === "function") {
      body.setAdditionalMass(mass);
    }
    world.createCollider(colliderForTarget(RAPIER, target), body);
    targets.set(id, { body, target, mass });
  }

  return Object.freeze({
    world,
    targets,
    applySpellForces(forces = []) {
      for (const entry of targets.values()) {
        if (entry.target.anchored) continue;
        for (const force of forces) {
          applyForceToBody(entry.body, force, entry.mass);
        }
      }
    },
    step(deltaSeconds = 1 / 60) {
      world.timestep = Math.max(1 / 240, Math.min(1 / 20, finiteNumber(deltaSeconds, 1 / 60)));
      world.step();
    },
  });
}
